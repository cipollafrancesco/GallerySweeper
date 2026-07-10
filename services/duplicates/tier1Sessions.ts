/**
 * Tier 1 — metadata collection. Pages the whole library into lightweight
 * metadata records. The pure session-bucketing logic lives in `./sessions`.
 */
import * as MediaAccess from '../../platform/mediaAccess';
import type { AssetMeta, CancelToken } from './types';

export { buildSessions, SESSION_GAP_MS } from './sessions';

/** Pages every photo in the library into lightweight metadata records. */
export async function collectAssets(
    onProgress?: (collected: number) => void,
    cancel?: CancelToken,
): Promise<AssetMeta[]> {
    const all: AssetMeta[] = [];
    let after: string | undefined;
    let hasNextPage = true;

    while (hasNextPage) {
        if (cancel?.cancelled) break;
        const res = await MediaAccess.list({ after, first: 100 });
        for (const asset of res.assets) {
            all.push({
                id: asset.id,
                uri: asset.uri,
                creationTime: asset.creationTime,
                modificationTime: asset.modificationTime,
                width: asset.width,
                height: asset.height,
                filename: asset.filename,
                mediaSubtypes: asset.mediaSubtypes ?? [],
            });
        }
        after = res.endCursor;
        hasNextPage = res.hasNextPage;
        onProgress?.(all.length);
    }

    return all;
}
