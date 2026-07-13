# GallerySweeper

A fast, private way to clean up your camera roll — entirely on-device. Nothing is ever uploaded.

GallerySweeper has two complementary tools:

- **Sweep** — a Tinder-style swipe deck over your photo library. Swipe right to keep, left to mark for deletion, then delete the marked batch in one go.
- **Duplicates** — an on-device scan that finds duplicate, near-duplicate, and visually similar photos and lets you bulk-review and delete them.

Everything runs locally on your phone. No account, no network, no cloud.

## Features

- 👆 **Swipe to triage** — gesture-driven deck with undo and a running Kept / To-Delete tally.
- 🔍 **Three-tier duplicate detection** — exact + near-duplicate perceptual hashing, time-based session bucketing, and (on iOS) semantic similarity via Apple Vision.
- ▶️ **Resumable scans** — the scan streams results as it finds them, keeps the screen awake, and resumes where it left off if you close and reopen the app.
- 💾 **Backup & restore** — export your review progress (kept / to-delete / reviewed duplicates) to a JSON file and restore it later, so a reinstall doesn't lose your work.
- 🔒 **Fully on-device** — photos never leave your phone; no analytics, no uploads.
- 🌙 **Dark, frosted-glass UI** — an iOS-native look built on a shared design system.

## Tech stack

- [Expo](https://expo.dev/) SDK 54 (New Architecture) + [React Native](https://reactnative.dev/) 0.81
- TypeScript
- `react-native-reanimated` + `react-native-gesture-handler` for the swipe deck
- `expo-media-library` for photo access, `expo-image` for fast image loading
- A local native module (`modules/apple-vision-similarity`) wrapping Apple Vision's `VNGenerateImageFeaturePrintRequest` (iOS only)

## Prerequisites

- Node.js 18+ and npm
- Xcode (for iOS) and/or Android Studio (for Android)
- A **development build** — GallerySweeper ships a custom native module, so it **cannot run in Expo Go**. You need a dev client / prebuild (see below).

## Getting started

```bash
npm install
```

Because the app includes native code, generate the native projects and run a development build rather than using Expo Go:

```bash
# Regenerate the native ios/ and android/ projects (they are gitignored)
npm run prebuild

# Build + install a dev client and start Metro
npm run ios            # iOS Simulator
npm run ios:device     # a connected physical iPhone (prompts for the device)
npm run android        # Android emulator/device
```

Once a dev build is installed, day-to-day work only needs the Metro bundler:

```bash
npm start
```

> **iOS permissions:** on first launch the app requests photo-library access. Grant "All Photos" for the full experience; with limited access only the selected photos are shown.

## Available scripts

| Script | What it does |
| --- | --- |
| `npm start` | Start the Metro bundler (`expo start`). |
| `npm run ios` | Build + run on the iOS Simulator. |
| `npm run ios:device` | Build + run on a connected physical iPhone. |
| `npm run android` | Build + run on Android. |
| `npm run web` | Run in the browser (Sweep only; native-only tiers degrade to no-ops). |
| `npm run prebuild` | Regenerate the native `ios/`/`android/` projects (`expo prebuild --clean`). |
| `npm run type-check` | `tsc --noEmit` — the project's sole automated gate. |

There is no test runner or lint config yet; `type-check` is the one automated check.

## Architecture

### State

`domain/queueManager.tsx` (`QueueProvider` / `useQueue`) is the single source of truth for the Sweep flow — permissions, the in-memory queue buffer, kept/deleted counts, and an undo history. Durable state (reviewed ids, marked-for-delete ids, last-seen cursor, onboarding flag) lives in `services/storage.ts`, an `AsyncStorage` wrapper with an in-memory cache.

The Duplicates tab is a self-contained scan + review flow; it only touches the Sweep system indirectly, by marking deleted photos as reviewed so they don't reappear in the deck.

### Duplicate-detection pipeline (`services/duplicates/`)

`pipeline.ts#scanForDuplicates` orchestrates three tiers into one clustering pass and returns sorted duplicate groups:

- **Tier 1 — sessions:** pages all photo metadata and buckets time-adjacent bursts. Time proximity only *scopes* Tier 3; it's never a duplicate signal on its own.
- **Tier 2 — perceptual hash:** the cross-platform workhorse (dHash + Hamming distance). Pure, RN-free hashing logic lives in `hashCore.ts`; results are cached (`hashCache.ts`, keyed by id + modification time) so rescans only hash new/changed photos.
- **Tier 3 — semantic (iOS-only, opt-in):** Apple Vision feature-print cosine similarity — the same primitive Photos.app's own Duplicates album uses. Degrades to a no-op wherever the native module is unavailable.

Completed scans and per-photo keep/delete decisions are persisted (`resultsCache.ts`) so reopening the app is instant, and partial progress is saved so an interrupted scan resumes instead of restarting.

### Platform access

All native / OS-adjacent calls go through thin wrappers in `platform/` (`mediaAccess.ts`, `haptics.ts`, `settingsLink.ts`, `backupFile.ts`) rather than direct `expo-*` imports in feature code, keeping platform quirks centralized.

### Project layout

```
App.tsx                  Root: renders both tabs, mounts Duplicates lazily
domain/                  Sweep queue reducer + context
features/
  deck/                  Swipeable card + empty state
  duplicates/            Scan stage machine, group review grid, detail viewer
  hud/                   Deck chrome (counts, undo, settings)
  settings/              Settings modal, reset + backup/restore flows
  onboarding/            Permission-aware onboarding overlays
  navigation/            Bottom tab bar
services/
  duplicates/            The three-tier pipeline (pure logic + native touchpoints)
  storage.ts             AsyncStorage-backed Sweep state
  backup.ts              Export/import of review state
platform/                Native wrappers (media, haptics, file share, links)
providers/               App-wide modal stack + restore signal
ui/                      Theme tokens, glass components, typography primitives
modules/                 Local native module: apple-vision-similarity (iOS)
```

## Privacy

GallerySweeper does not upload, transmit, or share your photos or any data derived from them. All scanning, hashing, and similarity comparison happen on-device. Deletions go through the OS photo library (on iOS, deleted photos land in "Recently Deleted").

## License

Private project — all rights reserved.
