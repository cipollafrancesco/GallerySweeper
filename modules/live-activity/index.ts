import { requireOptionalNativeModule } from 'expo-modules-core';

export interface LiveActivityModule {
    /** Whether the user has Live Activities enabled system-wide (Settings > Face ID & Passcode / Focus). */
    areActivitiesEnabled(): boolean;
    /** Starts a new activity, returning its id — hold onto it to target update()/end(). */
    start(phase: string, processed: number, total: number, groupsFound: number): Promise<string>;
    /** No-ops for an unknown/already-ended id. */
    update(id: string, phase: string, processed: number, total: number, groupsFound: number): Promise<void>;
    end(id: string, phase: string, processed: number, total: number, groupsFound: number): Promise<void>;
}

/**
 * Resolves to `null` on Android, in Expo Go, and on iOS < 16.1 (where the
 * native module is not linked or the OS APIs it wraps don't exist), so
 * callers can feature-detect without try/catch.
 */
export default requireOptionalNativeModule<LiveActivityModule>('LiveActivity');
