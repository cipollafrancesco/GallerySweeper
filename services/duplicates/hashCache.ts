/**
 * Incremental perceptual-hash cache, persisted as a JSON file in the document
 * directory. Keyed by asset id and invalidated by modificationTime, so rescans
 * only re-hash new or changed assets.
 */
import { File, Paths } from 'expo-file-system';
import type { AssetHash } from './types';

const CACHE_FILENAME = 'phash-cache.v1.json';

function cacheFile(): File {
    return new File(Paths.document, CACHE_FILENAME);
}

/** Loads the cached hashes; returns an empty map if the cache is missing/corrupt. */
export async function loadHashCache(): Promise<Map<string, AssetHash>> {
    try {
        const file = cacheFile();
        if (!file.exists) return new Map();
        const text = await file.text();
        const entries: AssetHash[] = JSON.parse(text);
        return new Map(entries.map((e) => [e.id, e]));
    } catch {
        return new Map();
    }
}

/** Persists the hash cache. Best-effort: failures are logged, never thrown. */
export async function saveHashCache(cache: Map<string, AssetHash>): Promise<void> {
    try {
        const file = cacheFile();
        if (!file.exists) file.create();
        file.write(JSON.stringify([...cache.values()]));
    } catch (e) {
        console.warn('Failed to persist perceptual-hash cache', e);
    }
}
