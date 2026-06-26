# RaceLine — track, race & share your routes

A cross-platform (iOS + Android) app built with **Expo / React Native** for creating racing
tracks on a real map, recording your laps, saving your best times, and sharing the tracks you make.

## Features

- **Live GPS tracking** on a Mapbox map ("map images of where you are").
- **Create tracks two ways**: record by moving, or tap waypoints on the map.
- **Circuit** (round lap — start == finish) or **linear** (point A → point B) tracks.
- **Three modes**, each with the right routing:
  - **Running** — go anywhere walkable (free path / pedestrian).
  - **Bike** — snaps to roads & paths (cycling).
  - **Driving** — follows street directions and one-way / traffic orientation.
- **Two race-start modes**:
  - **Staged start** — drag-race red → yellow → green lights; the clock starts on green.
  - **Flying start** — the clock starts the instant you cross the start line (time-attack anywhere).
- **Best times** saved per track (fastest lap for circuits, fastest run for linear).
- **Share** a track via link, **QR code**, or **GPX export** — opening a `raceline://` link
  imports the track on another device.

## Architecture

```
src/
  app/                 # expo-router screens
    _layout.tsx        # navigation + deep-link import of shared tracks
    index.tsx          # saved tracks list + best times
    create.tsx         # create a track (mode, shape, record/draw, snap, save)
    track/[id].tsx     # detail: map, best times, share (link / QR / GPX)
    race/[id].tsx      # live race: start mode, timer, lap/finish detection vs PB
  components/          # MapCanvas, ModeSelector, TrackTypeSelector, StartLights, Timer, TrackCard
  lib/
    geo.ts             # distance, start/finish gates, crossing & lap detection, timing  (unit-tested)
    share.ts           # encode/decode, deep links, GPX export                           (unit-tested)
    mapbox.ts          # Map Matching (snap), Directions (route), Static Images (thumbnails)
    db.ts              # expo-sqlite repository (tracks + best_times)
    location.ts        # expo-location foreground + background tracking
    id.ts              # id helper
  state/store.ts       # zustand store (tracks, last mode)
  models/track.ts      # shared types
```

The pure logic in `lib/geo.ts` and `lib/share.ts` is covered by Jest tests in
`src/lib/__tests__/` — these run on plain Node with no device required.

## Setup

1. **Install dependencies**

   ```bash
   cd mobile
   npm install
   ```

2. **Add a Mapbox token.** Create a free account at https://account.mapbox.com, then copy
   `.env.example` to `.env` and fill in:

   ```
   MAPBOX_ACCESS_TOKEN=pk.xxxx  # public token — tiles, Directions, Static, Map Matching
   RNMAPBOX_DOWNLOAD_TOKEN=sk.xxxx  # secret token w/ DOWNLOADS:READ — fetches the native SDK at build time
   ```

   `app.config.ts` injects these so no secret is committed. In CI, set them as
   [EAS secrets](https://docs.expo.dev/build-reference/variables/) instead.

## Run on a device

`@rnmapbox/maps` ships native code, so the app needs a **development build** (it does **not**
run in Expo Go).

```bash
# generate native projects
npx expo prebuild

# run locally (needs Xcode / Android Studio)…
npx expo run:ios
npx expo run:android

# …or build in the cloud with EAS
npx eas build --profile development --platform all
```

Then start the dev server and open the build on your device:

```bash
npx expo start --dev-client
```

Grant **location** permission when prompted, then: create a track → open it → **Race this track**.

## Develop & verify

```bash
npm test         # Jest unit tests for geo + share logic
npm run typecheck # tsc --noEmit
npx expo-doctor   # validate the Expo config & dependency versions
```

> Tip: if you change the Expo SDK, run `npx expo install --fix` to realign native module versions.

## Notes & next steps (v2 ideas)

- Sharing is local-only (link / QR / GPX). A cloud backend could add accounts, cross-device sync,
  and public leaderboards.
- Background recording uses a foreground service; for long sessions verify OS battery settings.
