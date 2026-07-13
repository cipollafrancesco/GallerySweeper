/**
 * Thin wrapper around the local `live-activity` native module (iOS 16.1+
 * only), which bridges ActivityKit for the duplicate-scan Lock Screen /
 * Dynamic Island progress widget. No-op-safe everywhere else (Android, Expo
 * Go, older iOS, or Live Activities disabled system-wide).
 */
import LiveActivityNative from '../modules/live-activity';

export const isAvailable = (): boolean => LiveActivityNative !== null && LiveActivityNative.areActivitiesEnabled();

/** Returns the new activity's id, or `null` if unavailable/the request failed. */
export const start = async (phase: string, processed: number, total: number, groupsFound: number): Promise<string | null> => {
    if (!LiveActivityNative) return null;
    try {
        return await LiveActivityNative.start(phase, processed, total, groupsFound);
    } catch (e) {
        console.warn('[live-activity] start failed', e);
        return null;
    }
};

export const update = async (
    id: string | null,
    phase: string,
    processed: number,
    total: number,
    groupsFound: number,
): Promise<void> => {
    if (!LiveActivityNative || id === null) return;
    try {
        await LiveActivityNative.update(id, phase, processed, total, groupsFound);
    } catch (e) {
        console.warn('[live-activity] update failed', e);
    }
};

export const end = async (
    id: string | null,
    phase: string,
    processed: number,
    total: number,
    groupsFound: number,
): Promise<void> => {
    if (!LiveActivityNative || id === null) return;
    try {
        await LiveActivityNative.end(id, phase, processed, total, groupsFound);
    } catch (e) {
        console.warn('[live-activity] end failed', e);
    }
};
