/**
 * Persisted duplicate-scan results, so reopening the app shows the last scan
 * instantly instead of re-scanning the whole library. Mirrors `hashCache.ts`:
 * a single JSON file in the document directory, best-effort on write, and
 * returns null/no-op on any read/write failure rather than throwing.
 */
import { File, Paths } from 'expo-file-system';
import type { AssetMeta, DuplicateGroup, PhotoDecision, ScanDiagnostics } from './types';

const RESULTS_FILENAME = 'dup-results.v1.json';
// v1 -> v2 added `decisions`. v2 -> v3 added `complete` (an interrupted scan
// persists partial groups with `complete: false` so it can resume on reopen).
// The loader below accepts v2 or v3 (v2 is a strict subset — its `complete` is
// backfilled to `true`) so upgrading users keep their groups/decisions; any
// older/unknown version just returns null and triggers a normal rescan.
const RESULTS_VERSION = 3;

/** Flat, JSON-serializable form of `Map<groupId, Map<assetId, PhotoDecision>>`. */
type SerializedDecisions = Array<{ groupId: string; assetId: string; decision: PhotoDecision }>;

interface PersistedScanResults {
    version: number;
    scannedAt: number;
    scanned: number;
    /** Whether the scan that produced these groups ran to completion. A `false`
     *  value means the scan was interrupted and should resume on next open. */
    complete: boolean;
    diagnostics: ScanDiagnostics;
    groups: DuplicateGroup[];
    /** Metadata for only the assets referenced by `groups`, to keep the file small. */
    meta: AssetMeta[];
    /** Per-photo keep/delete decisions made so far, so review progress survives a restart. */
    decisions: SerializedDecisions;
}

export interface LoadedScanResults {
    groups: DuplicateGroup[];
    metaById: Map<string, AssetMeta>;
    diagnostics: ScanDiagnostics;
    scanned: number;
    scannedAt: number;
    complete: boolean;
    decisions: Map<string, Map<string, PhotoDecision>>;
}

function resultsFile(): File {
    return new File(Paths.document, RESULTS_FILENAME);
}

function serializeDecisions(decisions: Map<string, Map<string, PhotoDecision>>): SerializedDecisions {
    const flat: SerializedDecisions = [];
    for (const [groupId, group] of decisions) {
        for (const [assetId, decision] of group) {
            flat.push({ groupId, assetId, decision });
        }
    }
    return flat;
}

function deserializeDecisions(flat: SerializedDecisions | undefined): Map<string, Map<string, PhotoDecision>> {
    const decisions = new Map<string, Map<string, PhotoDecision>>();
    for (const { groupId, assetId, decision } of flat ?? []) {
        let group = decisions.get(groupId);
        if (!group) {
            group = new Map();
            decisions.set(groupId, group);
        }
        group.set(assetId, decision);
    }
    return decisions;
}

/** Loads the last persisted scan, or null if there isn't one / it's unreadable. */
export async function loadScanResults(): Promise<LoadedScanResults | null> {
    try {
        const file = resultsFile();
        if (!file.exists) return null;
        const text = await file.text();
        const parsed: PersistedScanResults = JSON.parse(text);
        // Accept v2 (pre-`complete`) as well as v3, backfilling `complete: true`
        // so existing users keep their persisted groups/decisions on upgrade.
        if (parsed.version !== 2 && parsed.version !== 3) return null;
        return {
            groups: parsed.groups,
            metaById: new Map(parsed.meta.map((m) => [m.id, m])),
            diagnostics: parsed.diagnostics,
            scanned: parsed.scanned,
            scannedAt: parsed.scannedAt,
            complete: parsed.complete ?? true,
            decisions: deserializeDecisions(parsed.decisions),
        };
    } catch {
        return null;
    }
}

/** Persists scan groups plus review progress so far. `complete` distinguishes a
 *  finished scan from an interrupted one (which resumes on reopen). Best-effort: never throws. */
export async function saveScanResults(results: {
    groups: DuplicateGroup[];
    metaById: Map<string, AssetMeta>;
    diagnostics: ScanDiagnostics;
    scanned: number;
    complete: boolean;
    decisions: Map<string, Map<string, PhotoDecision>>;
}): Promise<void> {
    try {
        const referencedIds = new Set(results.groups.flatMap((g) => g.assetIds));
        const meta = [...results.metaById.values()].filter((m) => referencedIds.has(m.id));
        const payload: PersistedScanResults = {
            version: RESULTS_VERSION,
            scannedAt: Date.now(),
            scanned: results.scanned,
            complete: results.complete,
            diagnostics: results.diagnostics,
            groups: results.groups,
            meta,
            decisions: serializeDecisions(results.decisions),
        };
        const file = resultsFile();
        if (!file.exists) file.create();
        file.write(JSON.stringify(payload));
    } catch (e) {
        console.warn('Failed to persist duplicate-scan results', e);
    }
}

/** Clears the persisted scan (e.g. on a full app reset). Best-effort. */
export async function clearScanResults(): Promise<void> {
    try {
        const file = resultsFile();
        if (file.exists) file.delete();
    } catch (e) {
        console.warn('Failed to clear duplicate-scan results', e);
    }
}

/**
 * Returns the raw persisted scan payload verbatim (whatever version is on disk),
 * or null if there's nothing to read. Used by backup export — deliberately NOT
 * version-gated so a backup round-trips regardless of the current RESULTS_VERSION
 * (`loadScanResults` does the gating when the results are actually consumed).
 */
export async function exportRawScanResults(): Promise<unknown | null> {
    try {
        const file = resultsFile();
        if (!file.exists) return null;
        return JSON.parse(await file.text());
    } catch {
        return null;
    }
}

/**
 * Overwrites the persisted scan file with a payload from a restored backup.
 * `null` clears the file. Anything that isn't a plausible results object (an
 * object with a numeric `version`) is rejected so a malformed backup can't
 * corrupt the file. Best-effort: never throws.
 */
export async function importRawScanResults(payload: unknown | null): Promise<void> {
    try {
        if (payload == null) {
            await clearScanResults();
            return;
        }
        if (typeof payload !== 'object' || typeof (payload as { version?: unknown }).version !== 'number') {
            return;
        }
        const file = resultsFile();
        if (!file.exists) file.create();
        file.write(JSON.stringify(payload));
    } catch (e) {
        console.warn('Failed to import duplicate-scan results', e);
    }
}
