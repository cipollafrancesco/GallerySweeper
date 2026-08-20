import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export interface BackgroundGuardEvents {
    /** Fired shortly before iOS suspends/terminates the app for exceeding its background-task window. */
    onExpiration: (event: { id: number }) => void;
}

export interface BackgroundGuardModule {
    /**
     * Begins a finite-length background task, returning its identifier (0 if
     * the request was refused — e.g. background time is already exhausted).
     * iOS grants a short window (commonly ~30s, never guaranteed) before
     * firing the `onExpiration` event and force-terminating the app if
     * `endTask` hasn't been called by then.
     */
    beginTask(): number;
    /** Ends a background task started with `beginTask`. Safe to call twice. */
    endTask(id: number): void;
    addListener<EventName extends keyof BackgroundGuardEvents>(
        eventName: EventName,
        listener: BackgroundGuardEvents[EventName],
    ): EventSubscription;
}

/**
 * Resolves to `null` on Android and in Expo Go (where the native module is not
 * linked), so callers can feature-detect without try/catch.
 */
export default requireOptionalNativeModule<BackgroundGuardModule>('BackgroundGuard');
