# Drain Care: Rain-ready homes, together

Team **RUN!** · Sime Darby Property University Hackathon 2026, *Township of Tomorrow*

A clickable phone prototype of a new **Home Care** feature inside a township resident app. It helps residents keep their private drains clear (roof gutters, balcony floor traps, porch and backyard drains) by:

- **reminding them before heavy rain**, so water doesn’t back up into the house,
- **reminding them after heavy rain**, when standing water lets Aedes mosquitoes breed,
- **letting neighbours on the same street book one cleaner together**, so everyone pays less and the cleaner makes one trip,
- **tracking each job** from booking to an after photo and a public review.

**Live demo:** https://whale311.github.io/SDC_Run-/

The whole app is a single HTML file with no build step. People, prices and time slots are sample data.

## Quick start

1. Open the live demo, or download the repo and open `index.html` in a browser.
2. The app appears in a 390 × 844 phone frame. On a real phone it fills the screen.
3. Use the grey bar at the top to pick the weather and run the demos.

To start in a given weather scenario, add a parameter to the address:

| Address ending | Scenario |
|---|---|
| `?weather=storm` | Heavy rain 2 and 3 days from today |
| `?weather=aedes` | Dry spell after a storm |
| `?weather=calm` | Calm week, nothing to do |

## The grey demo bar

| Control | What it does |
|---|---|
| **Weather** dropdown | Live forecast, or one of the three demo scenarios. Switching it updates every screen. |
| **Demo push** | Slides a lock-screen style notification into the phone, built from the current alerts. Tap it to jump to the right page. |
| **Play demo flow** | Plays the whole scene for screen recording: the notification appears, is tapped, and the app opens the Book page on the last day before the heavy rain. |

Live mode uses the real forecast, which may be calm. Pick a demo scenario when you need a predictable result.

## Using the app as a resident

The demo resident is Aina at No. 12, Jalan Cemara 3. The tabs along the bottom are:

- **Home**: the 7-day rain strip, alert cards, an invitation to join your street’s group run, and your bookings with their status.
- **My home**: five drain points with when each was last cleaned and a status of OK, Due soon or Clean now. Tap **Mark cleaned** when you clear one yourself.
- **Rain**: the next 7 days with rainfall and chance of rain, and how the alerts work.
- **Book**: choose roof gutters (RM 70) or a full home check (RM 120), pick a day (heavy-rain days are marked), then **Book alone** or **Start group**. You can also open a group run on your street and **Join**. In a group page, **Demo: a neighbour joins** adds a neighbour so you can see the price fall.
- **Reviews**: completed bookings waiting for your review, the average rating, and every review from all residents.

### Group pricing

The price per home drops as more homes join, and everyone pays the lowest price the group reaches.

| Homes in the run | Price per home (roof gutters) |
|---|---|
| 1 | RM 70 |
| 2 to 3 | RM 60 |
| 4 to 5 | RM 53 |
| 6 (maximum) | RM 50 |

### Order status

Each booking has a four-step tracker:

1. **Booked**: waiting for more homes to join (group runs only).
2. **Confirmed**: enough homes joined, or you booked alone.
3. **On the way**: the cleaner has set off.
4. **Cleaned**: the cleaner uploaded the after photo. You can now leave a review.

## Using the app as a cleaner

Switch with **Resident / Cleaner** at the top. The cleaner is Hafiz Drain Care.

- **Runs**: each run with its stops in order, arrival times and earnings. When a run is confirmed, tap **I’m on my way**. At each stop, upload an **After photo** to mark that home as done.
- **Slots**: add open time slots that residents can book.

## Full demo in one minute

1. Choose **Demo: heavy rain** and press **Play demo flow**.
2. Go to **Home**, open your street’s group run and tap **Join**. The run is confirmed and the price drops.
3. Tap **Demo: a neighbour joins** to see it drop again.
4. Switch to **Cleaner**, tap **I’m on my way**, then upload an after photo for No. 12.
5. Switch back to **Resident**, tap **Cleaned, review**, and submit a rating.

## How alerts work

All thresholds are in `RULES` near the top of the script, so they can be tuned with real data.

| Rule | Value |
|---|---|
| Heavy rain | 20 mm in a day |
| Look ahead for the “before heavy rain” alert | 3 days |
| Wet past 3 days (for the “after rain” alert) | 30 mm |
| Dry day | under 2 mm |

A cleaner needs about 45 minutes per home.

## Data and services

- **Weather**: [Open-Meteo](https://open-meteo.com) (free, no key) for the coordinates in `HOME.lat` and `HOME.lon`. The request times out after 6 seconds. If it fails, the app falls back to sample data and says so on the rain card. Demo scenarios are in `SCENARIOS`.
- **Reviews**: stored in a Supabase table `service_reviews` (`run_id`, `resident_id`, `rating`, `review_text`, `created_at`). The page uses the publishable key only. Never put a `service_role` or secret key in this file.
- Booking ids are new on every page load, so the review flow can be demoed again after a refresh.

## Project layout

```
index.html   the whole app: styles, markup and script
README.md    this file
```

## Limitations

- No backend for bookings: groups, bookings and order status live in the page and reset on reload. Only reviews are saved.
- One demo resident and one demo cleaner; a real version would use resident accounts.
- People, prices and time slots are sample data, to be calibrated with resident and cleaner interviews.