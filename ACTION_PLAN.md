# ACTION_PLAN.md

## Role & Principles
You are an **expert React Native engineer** working in Cursor.  
Generate clean, production-ready code that follows these rules:

- Use **Expo managed workflow** with **TypeScript**  
- Apply **React Native best practices** (composition, hooks, controlled props)  
- Follow **DRY** and **KISS** principles  
- Use **Context + useReducer** for global state  
- Avoid bloated components; favor composition  
- No comments in code  
- Apply a **liquid glass design** (blur, translucency, depth, rounded corners)  
- Architecture must work for iOS MVP now and be **ready for Android** later  

---

## App Concept
- A Tinder-like app to clean the photo gallery  
- Flow:  
  1. Ask permission for Photos  
  2. Show photos in swipeable card deck  
  3. Swipe right → Keep  
  4. Swipe left → Delete (moves to Recently Deleted)  
  5. Show counters for kept/deleted  
  6. Undo last delete  
- Future: Android-ready with proper permission handling and delete semantics  

---

## Tech Stack
- `expo-media-library` → permissions, listing, deletion  
- `react-native-gesture-handler` + `react-native-reanimated` → swipe gestures & physics  
- `expo-image` → high-performance image rendering/caching  
- `expo-blur` → liquid glass surfaces  
- `expo-haptics` → swipe threshold feedback  
- React **Context + useReducer** → state  

---

## Folder Structure
```

/app                screen composition only
/features
/deck             swipe deck (RNGH + Reanimated)
/prefetch         prefetch next N images
/hud              counters, undo, banners
/onboarding       permission + education
/domain
queueManager      reducer + buffer logic + undo
/platform
mediaAccess       Photos API adapter
haptics           wrapper for expo-haptics
settingsLink      deep link to OS settings
/ui
glass             blurred cards, buttons, toasts
primitives        typography, spacing, layout

```

---

## Implementation Steps

### 1. Bootstrap project
**Prompt to Cursor:**
```

Create a new Expo TypeScript app named GallerySweeper.
Add dependencies: expo-media-library, expo-image, expo-blur, expo-haptics, react-native-gesture-handler, react-native-reanimated.
Configure the Reanimated plugin in babel.config.js.
Ensure react-native-gesture-handler is imported first in the entry file.
Add iOS InfoPlist: NSPhotoLibraryUsageDescription and PHPhotoLibraryPreventAutomaticLimitedAccessAlert=false.

```

### 2. Platform adapters
**Prompt to Cursor:**
```

Create /platform/mediaAccess.ts with:

* requestPermission() -> {status, access: 'all'|'limited'|'none', canAskAgain}
* list({after?, first}) -> {assets, endCursor?, hasNextPage}
* deleteOne(id) -> {movedToTrash: boolean, requiresUserConfirm?: boolean}
  Implement using expo-media-library for iOS. Stub Android differences for later.

```

**Prompt to Cursor:**
```

Create /platform/haptics.ts wrapping expo-haptics impactAsync.
Return noop on unsupported platforms.

```

**Prompt to Cursor:**
```

Create /platform/settingsLink.ts with:

* openPhotosSettings()
  On iOS: open Photos settings
  On Android: open App media permissions

```

### 3. Domain: Queue Manager
**Prompt to Cursor:**
```

Create /domain/queueManager.tsx:

* Context + useReducer
* State: {queue, endCursor?, hasNextPage, kept, deleted, lastDeleted?, access, loading, error}
* Actions: INIT, LOAD\_MORE, KEEP, TRASH\_START, TRASH\_OK, TRASH\_ERR, UNDO
* Expose hooks: useQueue(), keepTop(), trashTop(), undo(), ensureBuffer(), loadInitial()

```

### 4. Features

**Deck**
```

Create /features/deck/SwipeDeck.tsx:

* Card with expo-image full-screen
* Pan gesture with RNGH + Reanimated
* Threshold = 25% width
* Left swipe -> onLeft()
* Right swipe -> onRight()
* Add subtle rotation and opacity during drag
* Trigger haptics when threshold is crossed

```

**Prefetch**
```

Create /features/prefetch/Prefetcher.tsx:

* Accept URIs
* Render invisible expo-image elements to warm cache

```

**HUD**
```

Create /features/hud/Hud.tsx:

* Show counters (kept, deleted)
* Limited access banner if access === 'limited'
* Undo toast/snackbar when lastDeleted exists

```

**Onboarding**
```

Create /features/onboarding/Onboarding.tsx:

* Request Photos permission
* Show CTA to open settings if denied
* Liquid glass card with minimal copy

```

### 5. UI Components
**Glass primitives**
```

Create /ui/glass/GlassCard.tsx, GlassButton.tsx, GlassToast.tsx:

* Use expo-blur
* Rounded corners, translucency, subtle elevation

```

**Primitives**
```

Create /ui/primitives/Typography.tsx and Layout.tsx:

* Provide consistent text styles and spacing tokens

```

### 6. App Composition
**Prompt to Cursor:**
```

In App.tsx:

* Wrap with QueueProvider
* If permission not granted: show Onboarding
* Else: show SwipeDeck with top asset
* Render Hud
* Render Prefetcher with next 3–5 URIs

```

---

## Success Criteria
- First photo shown <1.5s on mid-range iPhone  
- Swipe gestures run at 60–120fps  
- Next card appears <50ms after dismiss  
- Queue never dips below 5 assets  
- Undo restores lastDeleted visually  
- Limited access clearly explained  
- Android build runs without code changes (basic stubs work)  

---