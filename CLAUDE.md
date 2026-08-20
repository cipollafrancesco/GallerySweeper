# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

GallerySweeper is an Expo / React Native (New Architecture) app with two main features:

1. **Sweep** — a Tinder-style swipe deck over the device's camera roll: swipe right to keep, left to mark for deletion.
2. **Duplicates** — an on-device scan that finds duplicate/near-duplicate/similar photos and lets the user bulk-review and delete them.

Everything runs on-device; nothing is uploaded anywhere.

## Commands

```bash
npm run start        # expo start (Metro bundler)
npm run ios          # expo start --ios
npm run android       # expo start --android
npm run web           # expo start --web
npm run type-check    # tsc --noEmit — the only automated check in this repo
```

There is no test runner, lint config, or CI configured — `type-check` is the sole automated gate. Since native module code exists (`modules/apple-vision-similarity`), running on iOS requires a dev client / prebuild rather than Expo Go (`expo-module.config.json` restricts it to `ios`).

## Architecture

### State: one reducer, two consumers

`domain/queueManager.tsx` (`QueueProvider` / `useQueue`) is the single source of truth for the swipe review flow — permissions, the in-memory queue buffer, kept/deleted counts, and an LIFO `actionHistory` used for undo/"clear all pending". It's a plain `useReducer`, not Redux; read the `Action`/`QueueActionType` enum there before adding new queue behavior. Persistent state (reviewed ids, marked-for-delete ids, last-seen cursor, onboarding-shown flag) lives in `services/storage.ts`, an `AsyncStorage` wrapper with an in-memory cache — call `storage.loadAll()` before reading cached getters.

Pagination is manual: `MediaAccess.list` pages `expo-media-library` by cursor, and the queue's effect in `useQueue` keeps fetching pages and filtering out reviewed/marked/queued ids until it fills `BUFFER_SIZE` (10) unreviewed assets or the library is exhausted. `ensureBuffer()` is currently a no-op stub (the initial-load effect handles refills); don't assume it does pagination.

The Duplicates tab does **not** go through `queueManager` — it's a self-contained scan + review flow that only touches the queue system indirectly, by calling `storage.addReviewedId()` for deleted photos so they don't reappear in Sweep.

### Duplicate-detection pipeline (`services/duplicates/`)

`pipeline.ts#scanForDuplicates` orchestrates three tiers into one `UnionFind` and returns sorted `DuplicateGroup[]`:

- **Tier 1 — sessions** (`tier1Sessions.ts` + `sessions.ts`): pages all photo metadata (`collectAssets`), then buckets time-sorted assets into bursts (`buildSessions`, default 10s gap). Sessions only *scope* Tier 3 — time proximity alone is never treated as a duplicate signal.
- **Tier 2 — perceptual hash** (`perceptualHash.ts` + `hashCore.ts`): the cross-platform workhorse. `hashCore.ts` is deliberately RN-free/pure (dHash, Hamming distance, sharpness, cosine similarity) so it's reusable and easy to reason about in isolation; `perceptualHash.ts` is the only place that touches native pixels (`expo-image-manipulator` → tiny PNG → `upng-js` decode). Results are cached in `hashCache.ts` (JSON file, keyed by id + invalidated by `modificationTime`) so rescans only hash new/changed assets. On iOS, hashing needs `localUri` (not the `ph://` uri) — see `resolveHashUri` in `pipeline.ts`.
- **Tier 3 — semantic** (`semantic.ts`, iOS-only, opt-in via `enableSemantic`): wraps the local native module `modules/apple-vision-similarity` (Apple Vision `VNGenerateImageFeaturePrintRequest`, the same primitive Photos.app's own Duplicates album uses). The module lazily `require()`s and degrades to a no-op everywhere it's unavailable (Android, Expo Go) via `requireOptionalNativeModule` — always feature-detect with `isSemanticAvailable()` rather than assuming the module exists. Comparison (cosine similarity) happens in JS so Vision objects never need to be serialized across the bridge.

`grouping.ts` holds the `UnionFind`, LSH-style hash bucketing (`bandKeys`, to avoid O(n²) all-pairs comparison), and the "which asset to keep" heuristic (`pickKeeper`: real photo > screenshot, then resolution, then sharpness, then recency). This file and `hashCore.ts`/`sessions.ts` are pure/unit-testable by design (no RN imports) even though no test suite exists yet — keep new pure logic there rather than in components.

### UI structure

`App.tsx` renders both tab views simultaneously (`display: none` on the inactive one, not unmounted) so Sweep's swipe state and Duplicates' scan results both survive tab switches — except the Duplicates tab is deliberately mounted lazily on first visit (`duplicatesMounted`) so its scan doesn't fire at app launch.

- `features/deck/` — the swipeable card (`SwipeDeck`, gesture-driven via `react-native-reanimated` + `react-native-gesture-handler`) and the "nothing left" state (`EmptyDeck`).
- `features/hud/` — top/bottom chrome over the deck (counts, undo, settings entry, action buttons).
- `features/duplicates/` — `DuplicatesScreen` (stage machine: `idle` → `scanning` → `reviewing`), `GroupsReviewScreen`/`GroupRow` (grid + per-asset selection), `ScanProgressModal`.
- `features/onboarding/` — `OverlayManager` decides which onboarding overlay (if any) to show based on permission state and a persisted "shown" flag; it owns no UI itself, just drives `ModalProvider`.
- `features/settings/`, `features/navigation/` — settings modal/reset flow, bottom tab bar.
- `features/prefetch/` — pre-warms the next few images in the queue via `expo-image` so swiping feels instant.
- `providers/ModalProvider.tsx` — app-wide modal stack (supports `dialog` vs `custom` presentation) and toasts; a single native `Modal` renders whatever's on top of the stack. Use `useModal()` rather than ad hoc local modal state for anything that should overlay the whole app.
- `ui/glass/` and `ui/primitives/` — the shared "frosted glass" visual language (blur cards, buttons, toasts) and typography/layout primitives; `ui/theme.ts` is dark-mode-only iOS system colors/typography/spacing/radii/shadows. New UI should pull from `theme` rather than hardcoding colors.

### Platform access

All native/OS-adjacent calls go through thin wrappers in `platform/`, not direct `expo-*` imports in feature code: `mediaAccess.ts` (permissions, paging, delete), `haptics.ts`, `settingsLink.ts` (deep link to OS photo-permission settings). Follow this pattern for new native touchpoints so platform quirks (e.g. iOS `ph://` vs Android `file://` uris, `shouldDownloadFromNetwork: false` to avoid pulling iCloud originals) stay centralized.
