# Leave Planner

Plan your annual leave around Singapore public holidays. Tap work days to book full or half days of leave, block days you cannot take off, and see how many days off each break gives you.

Live at: https://danilpalma.com/leave-planner/

## What it does

- **Calendar for 2026 and 2027** with Singapore public holidays (from the Ministry of Manpower) and suggested leave days that join holidays to weekends.
- **Book leave:** tap a work day to cycle Full, Half, Clear. **Block dates:** mark work days you cannot take off.
- **Leave balance per year**, editable.
- **Your breaks:** a list of each break you have booked, for example "23 to 31 May: 9 days off for 4 days of leave".
- **Undo** the last tap.
- **Sign in with Google** to tie your planner to your account, so you can open it on any device and nobody else can.
- **Backups:** download a backup file, restore from it, or add your leave to Google, Apple or Outlook calendar (.ics file).
- **Works offline:** changes made offline sync when you are back online.

## The bug that wiped planners, and the fix

The old app had a dangerous habit: whenever it could not find your planner straight away, it saved a **blank planner over it**. That happens when you open the link on a weak or no connection (for example on the MRT, or a phone waking up after weeks). Firebase first answers from the phone's memory ("nothing here yet"), and the app treated that as "this planner is empty" and saved an empty one, which then replaced your real one as soon as the phone reconnected.

The new app:

1. **Never saves a whole planner when opening one.** If it cannot reach the server it says "Waiting for a connection" and changes nothing.
2. **Saves one day at a time**, so an old open tab or a second device cannot overwrite your other bookings.
3. **Keeps a safety copy on each device.** If a planner ever opens empty but the device has a copy, it offers to restore it.
4. **Uses permanent security rules.** New Firebase projects start in "test mode", which locks the database after 30 days.
5. **Shows clear messages** (offline, not found, private) instead of an empty calendar.
6. **Shows the full planner ID.** The old app showed only 8 characters, which opened a new empty planner if typed into "Load ID".

## One-time setup in Firebase (do this before publishing)

Open https://console.firebase.google.com and choose **leave-planner-2026-d0f0f**.

1. **Security rules:** Build > Firestore Database > Rules. Replace everything with the contents of [`firestore.rules`](firestore.rules) and press **Publish**. These rules also work with the old app, so this is safe to do first.
2. **Turn on Google sign-in:** Build > Authentication > Sign-in method > Add new provider > Google > Enable > Save. Keep **Anonymous** enabled too.
3. **Allow your website:** Authentication > Settings > Authorized domains > Add domain > `danilpalma.com`.
4. *(Recommended)* **Daily backups:** Firestore Database > Disaster recovery (or "Backups"): turn on daily backups. This needs the pay-as-you-go plan; see costs below. Skip it if you want to stay on the free plan; the in-app backup file still works.

## One-time setup in GitHub (to publish the Angular version)

The app is now built with Angular, so GitHub has to build it before publishing.

1. On GitHub open this repo > **Settings > Pages**.
2. Under **Build and deployment > Source**, choose **GitHub Actions**.
3. From then on, every change merged into `main` is tested and published automatically (see the **Actions** tab). It takes about 3 minutes.

## How sign-in works

| Situation | Who can open the planner |
|---|---|
| Not signed in (link only) | Anyone with the link. Keep the link private. |
| Signed in with Google | Only you, on any device, after signing in. The old link stops working for anyone else. |

When you sign in for the first time, the planner you have open becomes your account's planner. If your account already has a planner, that one opens instead (the other planner is still reachable by its link).

## Running it on a computer (for developers)

You need Node.js 24 and Java 21 (for the Firebase emulator).

```bash
npm install
npm run emulators      # terminal 1: a pretend Firebase on your computer, never real data
npm start              # terminal 2: then open http://localhost:4200
```

Checks:

```bash
npm run lint           # code style and accessibility checks
npm test               # leave maths, data clean-up, exports
npm run test:rules     # security rules, against the emulator
npm run build          # production build
```

## What it costs to run

- **Firebase Spark (free) plan** covers this app easily: up to 50,000 reads and 20,000 writes per day, and 1 GB of storage.
- **GitHub Pages** is free.
- Turning on Firestore daily backups needs the **Blaze (pay-as-you-go)** plan. For a planner this size it costs a few cents a month at most. If you switch to Blaze, set a budget alert (Google Cloud console > Billing > Budgets & alerts), for example at USD 1.

## Data shapes

Stored in Firestore:

**`planners/{plannerId}`**: one planner. The planner ID is what appears in your link after `?uid=`.

| Field | Meaning |
|---|---|
| `ownerUid` | The Google account that owns it, or empty if it is link-only |
| `totals` | Leave allowance per year, e.g. `{ "2026": 21, "2027": 21 }` |
| `leaves` | Every booked day: `1` full day, `0.5` half day, `-1` blocked. E.g. `{ "2026-05-28": 1 }` |
| `schemaVersion`, `updatedAt` | Housekeeping |

Planners saved by the old app (with a single `total` field) are read correctly and keep working.

**`users/{googleAccountId}`**: `{ plannerId }`, remembers which planner belongs to a Google account.

## Adding a new year

Edit [`src/app/data/holidays.ts`](src/app/data/holidays.ts): copy a year block, update the dates from the Ministry of Manpower's announcement, and pick some suggested days. The year switcher picks it up automatically.

## Project layout

```
src/app/
  models/        data shapes (planner.model.ts)
  data/          public holidays and suggested days
  services/      everything that talks to Firebase, plus the leave maths (calendar.ts)
  features/      the planner screen and its parts (calendar, balance, breaks, menus)
firestore.rules  who can see or change what
tests/           security rules tests
```

## Known limits

- The Google sign-in pop-up itself could not be tested in the build environment (it blocks Google's sign-in script). The account-linking logic was tested with Firebase's emulator, and the real pop-up should be checked once after publishing.
- Firestore daily backups depend on step 4 above.
