// Supabase Edge Function: generate-message
//
// Purpose: the "Smart Reason" agent. Takes structured facts about a resident's
// drain points, the rain forecast, and (for invites) a group-run, and asks
// an LLM to write a short, grounded, personalised message explaining WHY —
// instead of the app's static template strings.
//
// This function NEVER throws a hard error to the caller: on any failure
// (missing key, upstream error, bad response) it returns HTTP 200 with an
// `error` field and no `message`. The frontend treats "no message" as a
// signal to fall back to the existing static template, so a flaky network
// or an expired key during a live demo never breaks the app.
//
// Uses Google's Gemini API (free tier via aistudio.google.com, no credit
// card required) instead of a paid provider.
//
// Deploy:
//   supabase functions deploy generate-message
// Configure the secret once per project (get a free key at aistudio.google.com -> "Get API key"):
//   supabase secrets set GEMINI_API_KEY=AIza...
//
// Required secret: GEMINI_API_KEY.
// Never put this key in the frontend HTML — it only lives here, server-side.

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
// gemini-3.8-flash (the newest flagship) kept returning 503 "high demand" —
// switched to the "latest" lite alias: Google manages which concrete model
// version it points to, it's cheaper/lower-latency to serve (so less likely
// to be capacity-constrained), and it's more than enough quality for a
// 2-3 sentence notification.
const MODEL = "gemini-flash-lite-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

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

  if (!GEMINI_API_KEY) {
    // TEMPORARY DIAGNOSTIC: the secret shows as set via `supabase secrets
    // list`, but this function still can't see it. List every env var name
    // containing "GEMINI" (never the value) so we can see exactly what the
    // runtime actually has — catches a typo'd name, stray whitespace, etc.
    // Remove this debug_env_keys line once the real cause is found.
    const debugKeys = Object.keys(Deno.env.toObject()).filter((k) =>
      k.toUpperCase().includes("GEMINI")
    );
    return jsonResponse({ error: "not_configured", debug_env_keys: debugKeys });
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
    // Google is rolling out newer "auth key" API keys (prefixed "AQ.") that
    // replace the older "AIzaSy..." keys. The old ?key=... query-param auth
    // does not reliably work with the new key type — the current docs
    // (ai.google.dev/gemini-api/docs/generate-content/api-key) specify the
    // x-goog-api-key header instead, which works for both key formats.
    const resp = await fetch(GEMINI_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        // gemini-3.8-flash "thinks" before answering by default (thinkingLevel
        // defaults to "medium"), and those thinking tokens are deducted from
        // the same maxOutputTokens budget as the visible reply. At 200 tokens
        // thinking was eating almost the whole budget, so the real answer
        // came back cut off mid-sentence. Set thinking to "low" (the lowest
        // level this model supports) and give enough headroom for both.
        generationConfig: {
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return jsonResponse({ error: "upstream_error", detail: detail.slice(0, 300) });
    }

    const data = await resp.json();
    const message = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!message) {
      return jsonResponse({ error: "empty_response" });
    }

    return jsonResponse({ message });
  } catch (e) {
    return jsonResponse({ error: "exception", detail: String(e).slice(0, 300) });
  }
});
