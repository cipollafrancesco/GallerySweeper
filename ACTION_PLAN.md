# Action Plan: Settings & Data Reset

This document outlines the steps to implement a settings screen with functionality to reset the user's photo review state.

## 1. Foundational Work & Exploration
- [ ] **Analyze Storage Mechanism:** Investigate `services/storage.ts` to identify all keys related to review state (`reviewedIds`, `keptIds`, `pendingDeletes`, progress cursors, etc.).
- [ ] **Create Storage Helper:** Add a `clearReviewState()` function in `services/storage.ts` to encapsulate the logic for deleting all relevant keys from `AsyncStorage`.
- [ ] **Analyze State Management:** Examine `App.tsx` and `features/deck/SwipeDeck.tsx` to understand how review state is managed in memory (React state, context, etc.) and how data is fetched.
- [ ] **Plan State Reset:** Determine the best way to trigger a full state reset and data refetch after storage is cleared. This might involve a new context function or component remount.

## 2. UI Implementation: Settings Modal
- [ ] **Create `SettingsModal.tsx`:** Develop a new component in `features/settings/` for the settings screen.
- [ ] **Style the Modal:** Use existing `ui/glass` components to create a frosted glass modal that aligns with the app's aesthetic.
- [ ] **Add Header & Close Button:** Implement a "Settings" title and a close button (e.g., an 'X' icon) in the top-left corner.
- [ ] **Add "Reset" Option:** Create a list item for "Reset reviewed photos" with the specified subtitle. Style it to indicate a destructive action subtly.

## 3. UI Implementation: Entry Point & Header
- [ ] **Create `SettingsButton.tsx`:** Make a new component for the gear icon button to ensure it's reusable and has a proper hit target (≥ 44x44).
- [ ] **Integrate into `Hud.tsx`:** Add the `SettingsButton` to the top-right of the `Hud` component.
- [ ] **Wire up Modal:** Connect the `SettingsButton` to a function (likely from `ModalProvider`) that opens the `SettingsModal`.

## 4. UI Implementation: Confirmation Flow
- [ ] **Create `ResetConfirmationModal.tsx`:** Build a new component for the confirmation dialog.
- [ ] **Style Confirmation:** Style it as a frosted glass sheet with the specified title, body text, and two buttons ("Reset" and "Cancel").
- [ ] **Trigger Confirmation:** Tapping the "Reset" option in `SettingsModal` should open this confirmation modal.

## 5. Connecting Logic & UI
- [ ] **Implement Reset Action:** In `ResetConfirmationModal`, wire the "Reset" button to:
    1. Call the `clearReviewState()` function from `services/storage.ts`.
    2. Trigger the in-memory state reset.
    3. Close all modals.
    4. Show a `GlassToast` with the message: "Review state reset. All photos will be shown."
- [ ] **Update Data Fetching:** Ensure that after a reset, the photo fetching logic in `SwipeDeck.tsx` or `Prefetcher.tsx` starts from the beginning, without skipping any previously reviewed assets.

## 6. Final Polish & Accessibility
- [ ] **Add Accessibility Labels:** Ensure all new interactive elements (gear icon, buttons, etc.) have proper `accessible` and `accessibilityLabel` props.
- [ ] **Announce Toasts:** Configure the toast notification to be announced by screen readers.
- [ ] **Review & Refine:** Conduct a final review of the implementation to ensure it meets all UX, style, and performance requirements.
