/**
 * Thin wrapper around the local `background-guard` native module (iOS-only),
 * which exposes UIApplication's finite-length background task API. Used to
 * keep the duplicate-scan pipeline's JS loop alive for the brief window iOS
 * grants after the app is backgrounded, so an in-progress scan can persist a
 * checkpoint instead of freezing mid-hash. This is NOT real background
 * execution — it buys the pipeline a short tail (commonly ~30s, never
 * guaranteed), not a way to finish a scan while the phone stays locked. See
 * `platform/backgroundScan.ts` for the opportunistic long-running path.
 */
import BackgroundGuard from '../modules/background-guard';

/** Whether the native module is linked (iOS dev/prod build only — null in Expo Go/Android). */
export const isAvailable = (): boolean => BackgroundGuard !== null;

/**
 * Begins a finite-length background task, returning its identifier, or `null`
 * if the module is unavailable or the system refused the request (e.g.
 * background time is already exhausted for this app).
 */
export const beginTask = (): number | null => {
    if (!BackgroundGuard) return null;
    const id = BackgroundGuard.beginTask();
    return id === 0 ? null : id;
};

/** Ends a background task started with `beginTask`. Safe to call with `null`/an already-ended id. */
export const endTask = (id: number | null): void => {
    if (!BackgroundGuard || id === null) return;
    BackgroundGuard.endTask(id);
};

/**
 * Subscribes to the "about to be suspended" notification fired shortly before
 * iOS's background-task window closes. Callers must persist a checkpoint
 * synchronously-ish here — once this fires, the OS can suspend the app at any
 * moment. Returns a no-op unsubscribe when the module is unavailable.
 */
export const addExpirationListener = (listener: (id: number) => void): (() => void) => {
    if (!BackgroundGuard) return () => {};
    const subscription = BackgroundGuard.addListener('onExpiration', (event: { id: number }) => listener(event.id));
    return () => subscription.remove();
};
