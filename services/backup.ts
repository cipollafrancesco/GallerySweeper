/**
 * Backup & restore of the user's on-device review state as a single JSON file.
 *
 * Pure orchestration over `storage` (Sweep state) and `resultsCache` (duplicate
 * groups + keep/delete decisions) — no React Native / UI imports, so it stays
 * easy to reason about. The transport (share sheet / document picker) lives in
 * `platform/backupFile.ts`; the live-reload wiring lives in the UI layer.
 *
 * Scope note: MediaLibrary asset ids are device-/library-specific, so a backup
 * is meant to survive a reinstall/reset on the SAME device + photo library, not
 * to migrate progress to a different phone. Stale ids restored elsewhere are
 * harmless — they simply never match and get filtered out.
 */
import { Platform } from 'react-native';
import {
    exportRawScanResults,
    importRawScanResults,
} from './duplicates/resultsCache';
import { storage } from './storage';

const BACKUP_FORMAT = 'gallerysweeper-backup';
const BACKUP_VERSION = 1;
const APP_VERSION = '1.0.0';

export interface BackupEnvelopeV1 {
    /** Magic string, validated on import so foreign JSON is rejected. */
    format: typeof BACKUP_FORMAT;
    /** Envelope version — independent of the duplicate-results file version. */
    version: typeof BACKUP_VERSION;
    createdAt: number;
    app: { version: string; platform: typeof Platform.OS };
    sweep: {
        reviewedIds: string[];
        markedForDeleteIds: string[];
        lastSeenAssetId: string | null;
        onboardingShown: boolean;
    };
    /**
     * Opaque copy of the persisted duplicate-results payload (or null if no scan
     * has been saved). Kept as `unknown` so this module never depends on the
     * internal results shape and round-trips it verbatim.
     */
    duplicates: unknown | null;
}

export interface BackupSummary {
    reviewed: number;
    marked: number;
    hasDuplicates: boolean;
}

/** Gathers all current review state into a backup envelope. */
export async function buildBackup(): Promise<BackupEnvelopeV1> {
    await storage.loadAll();
    const [lastSeenAssetId, onboardingShown, duplicates] = await Promise.all([
        storage.getLastSeenAssetId(),
        storage.hasOnboardingBeenShown(),
        exportRawScanResults(),
    ]);
    return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        createdAt: Date.now(),
        app: { version: APP_VERSION, platform: Platform.OS },
        sweep: {
            reviewedIds: [...storage.getReviewedIds()],
            markedForDeleteIds: [...storage.getMarkedForDeleteIds()],
            lastSeenAssetId,
            onboardingShown,
        },
        duplicates,
    };
}

export function serializeBackup(env: BackupEnvelopeV1): string {
    return JSON.stringify(env);
}

/** Parses + validates backup text; returns null if it isn't a v1 GallerySweeper backup. */
export function parseBackup(text: string): BackupEnvelopeV1 | null {
    try {
        const parsed = JSON.parse(text) as Partial<BackupEnvelopeV1>;
        if (parsed?.format !== BACKUP_FORMAT || parsed.version !== BACKUP_VERSION) return null;
        if (typeof parsed.sweep !== 'object' || parsed.sweep === null) return null;
        const { reviewedIds, markedForDeleteIds } = parsed.sweep;
        if (!Array.isArray(reviewedIds) || !Array.isArray(markedForDeleteIds)) return null;
        return parsed as BackupEnvelopeV1;
    } catch {
        return null;
    }
}

export function summarizeBackup(env: BackupEnvelopeV1): BackupSummary {
    return {
        reviewed: env.sweep.reviewedIds.length,
        marked: env.sweep.markedForDeleteIds.length,
        hasDuplicates: env.duplicates != null,
    };
}

/**
 * Overwrites all local review state with the backup's contents. Callers are
 * responsible for triggering the in-app reload (Sweep queue + Duplicates cache)
 * afterwards so the live UI reflects the restored state.
 */
export async function applyBackup(env: BackupEnvelopeV1): Promise<void> {
    await storage.setReviewedIds(env.sweep.reviewedIds);
    await storage.setMarkedForDeleteIds(env.sweep.markedForDeleteIds);
    if (env.sweep.lastSeenAssetId) {
        await storage.setLastSeenAssetId(env.sweep.lastSeenAssetId);
    } else {
        await storage.clearLastSeenAssetId();
    }
    // Only ever force the flag on — never re-trigger onboarding on a restore.
    if (env.sweep.onboardingShown) await storage.setOnboardingShown();
    await importRawScanResults(env.duplicates);
}
