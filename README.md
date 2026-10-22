# SDC_Run-

A clickable phone prototype for the **Township of Tomorrow** hackathon. It helps residents of a township keep their drains clear (roof gutters, balcony floor traps, porch and backyard drains) by reminding them before heavy rain and after it, and by letting neighbours book a cleaner together at a lower price per home.

It is a single HTML file with no dependencies and no build step. All people, prices and bookings are sample data.

**Live demo:** https://cupidryan2-art.github.io/SDC_Run-/home-care-prototype.html

## Quick start

1. Download or clone the repo.
2. Open `home-care-prototype.html` in a browser. The app appears in a 390 × 844 phone frame. On a real phone it fills the screen.
3. Use the grey bar at the top of the page to pick the weather and run the demos (see below).

To start in a given weather scenario, add a parameter to the address:

| Address ending | Scenario |
|---|---|
| `home-care-prototype.html?weather=storm` | Heavy rain 2 and 3 days from today |
| `home-care-prototype.html?weather=aedes` | Dry spell after a storm |
| `home-care-prototype.html?weather=calm` | Calm week, nothing to do |

## The grey demo bar

| Control | What it does |
|---|---|
| **Weather** dropdown | Live forecast, or one of the three demo scenarios. Switching it updates every screen. |
| **Demo push** | Slides a lock-screen style notification down inside the phone, built from the current alerts. Tap it to jump to the right page. It hides itself after 4 seconds. In the calm scenario nothing is pushed. |
| **Play demo flow** | Plays the whole scene for screen recording: notification appears, is tapped automatically, and the app opens the Book page on the last day before the heavy rain. |

Tip: Live mode uses the real forecast, which may be calm. Pick a demo scenario when you need a predictable result.

## Using the app as a resident

The tabs along the bottom are **Home**, **My home**, **Rain** and **Book**.

- **Home**: your address, the 7-day rain strip, and alert cards. Before heavy rain you are asked to clear drains that are due. After heavy rain followed by two dry days you are reminded to check for standing water, where Aedes mosquitoes breed. Your bookings are listed here too.
- **My home**: five drain points with when each was last cleaned and a status of OK, Due soon or Clean now. Tap **Mark cleaned** when you clear one yourself.
- **Rain**: the next 7 days with rainfall and chance of rain, plus a short explanation of how the alerts work.
- **Book**: book a cleaner.
  1. Choose a service: roof gutters (RM 70) or a full home check (RM 120).
  2. Pick a day. Days with heavy rain are marked.
  3. Choose an open slot, then either **Book alone**, or **Start group** and choose how many homes are needed to go ahead.
  4. Or open an existing group run on your street and **Join**. The price per home drops as more homes join, and everyone pays the lowest price the group reaches.
  5. In a group page, **Demo: a neighbour joins** adds a neighbour so you can see the price fall and the run get confirmed.

### Order status

Each booking under **Your bookings** has a four-step tracker:

1. **Booked**: waiting for more homes to join (group runs only).
2. **Confirmed**: enough homes joined, or you booked alone.
3. **On the way**: the cleaner has set off.
4. **Cleaned**: the cleaner has uploaded the after photo for your home.

## Using the app as a cleaner

Switch with **Resident / Cleaner** at the top. The cleaner is Hafiz Drain Care.

- **Runs**: each booked run with its stops, arrival times and earnings. When a run is confirmed, tap **I'm on my way** and the resident's tracker moves to step 3. At each stop, upload an **After photo** to mark that home as done.
- **Slots**: add open time slots that residents can book.

A full demo of the order status: as a resident book an open Hafiz Drain Care slot, switch to Cleaner, tap **I'm on my way**, upload an after photo, then switch back to Resident.

## How alerts and prices work

All thresholds are in one place near the top of the script (`RULES`) so they can be tuned after interviews.

| Rule | Value |
|---|---|
| Heavy rain | 20 mm in a day |
| Look ahead for the "before heavy rain" alert | 3 days |
| Wet past 3 days (for the "after rain" alert) | 30 mm |
| Dry day | under 2 mm |

Group price per home (of the single-home price):

| Homes in the run | Price |
|---|---|
| 1 | 100% |
| 2 to 3 | 86% |
| 4 to 5 | 76% |
| 6 (maximum) | 72% |

A cleaner needs about 45 minutes per home.

## Weather data

The forecast comes from [Open-Meteo](https://open-meteo.com) (free, no key) for the coordinates in `HOME.lat` and `HOME.lon`. The request times out after 6 seconds and the response is checked before use. If it fails, the app falls back to sample data and says so on the Rain card. The demo scenarios are defined in `SCENARIOS`.

## Project layout

```
home-care-prototype.html   the whole app: styles, markup and script
README.md                  this file
```

## Limitations

- No backend. Bookings, groups and order status live in the page and reset when you reload.
- People, prices and time slots are sample data.
- Verified in Chromium only.
