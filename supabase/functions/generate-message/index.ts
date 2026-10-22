// Supabase Edge Function: generate-message
//
// Purpose: the "Smart Reason" agent. Takes structured facts about a resident's
// drain points, the rain forecast, and (for invites) a group-run, and asks
// Claude to write a short, grounded, personalised message explaining WHY —
// instead of the app's static template strings.
//
// This function NEVER throws a hard error to the caller: on any failure
// (missing key, upstream error, bad response) it returns HTTP 200 with an
// `error` field and no `message`. The frontend treats "no message" as a
// signal to fall back to the existing static template, so a flaky network
// or an expired key during a live demo never breaks the app.
//
// Deploy:
//   supabase functions deploy generate-message
// Configure the secret once per project:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Required secret: ANTHROPIC_API_KEY (your own key from console.anthropic.com).
// Never put this key in the frontend HTML — it only lives here, server-side.

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5"; // fast + cheap, plenty for 2-3 sentence generation

const SYSTEM_PROMPT = `You write short, grounded notifications for a home-maintenance app used by homeowners in a Malaysian residential township.

Rules:
- Base every claim ONLY on the data given in the user message. Never invent facts, numbers, names, or risks that are not present in the input.
- Keep your reply to 2-3 short sentences. Plain, conversational English, suitable for a mobile notification or a WhatsApp message.
- Tone: a helpful, specific neighbour — not a corporate notice. No generic filler like "stay safe" or "thank you for using our app".
- Reply with the message text only. No preamble, no quotation marks, no markdown.`;

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

function buildPrompt(type: string, data: Record<string, unknown>): string | null {
  const { points = [], weather = [], service, run } = data as {
    points?: unknown[];
    weather?: unknown[];
    service?: string;
    run?: unknown;
  };

  if (type === "home_alert") {
    return `Service: ${service ?? "unknown"}
This resident's drain points (name, days overdue, near a tree): ${JSON.stringify(points)}
Upcoming rain forecast (day label, rain in mm): ${JSON.stringify(weather)}

Write a short alert telling this homeowner what to do about their drains. Reference the single most urgent point by name and, if a heavy rain day is coming up, when it is. If nothing is urgent, say so plainly and briefly.`;
  }

  if (type === "invite_message") {
    return `Service: ${service ?? "unknown"}
The sender's own drain points (name, days overdue, near a tree): ${JSON.stringify(points)}
Upcoming rain forecast: ${JSON.stringify(weather)}
Group run details (day, time, price per home now, homes joined so far, minimum to go ahead): ${JSON.stringify(run)}

Write a short WhatsApp message the sender can send to ONE neighbour, inviting them to join this group drain-cleaning run. Ground the "why now" in the sender's own overdue point(s) and the forecast above, not generic urgency. Mention that the price drops as more homes join. Do not address the neighbour by name since we don't have it.`;
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  if (!ANTHROPIC_API_KEY) {
    // Not configured yet — tell the caller plainly so it falls back silently.
    return jsonResponse({ error: "not_configured" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "bad_json" });
  }

  const type = String(body.type ?? "");
  const userPrompt = buildPrompt(type, body);
  if (!userPrompt) {
    return jsonResponse({ error: "unknown_type" });
  }

  try {
    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return jsonResponse({ error: "upstream_error", detail: detail.slice(0, 300) });
    }

    const data = await resp.json();
    const message = data?.content?.[0]?.text?.trim();
    if (!message) {
      return jsonResponse({ error: "empty_response" });
    }

    return jsonResponse({ message });
  } catch (e) {
    return jsonResponse({ error: "exception", detail: String(e).slice(0, 300) });
  }
});
