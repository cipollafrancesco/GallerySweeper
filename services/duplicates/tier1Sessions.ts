/**
 * Tier 1 — metadata collection. Pages the whole library into lightweight
 * metadata records. The pure session-bucketing logic lives in `./sessions`.
 */
import * as MediaAccess from '../../platform/mediaAccess';
import type { AssetMeta, CancelToken } from './types';

export { buildSessions, SESSION_GAP_MS } from './sessions';

/**
 * Pages every photo in the library into lightweight metadata records.
 *
 * `onPage` (if given) is awaited after each page is mapped and before the next
 * page is fetched — this is what lets a streaming scan start hashing a page
 * while later pages are still being collected, instead of waiting for the
 * whole library to page in first.
 */
export async function collectAssets(
    onProgress?: (collected: number, total: number) => void,
    cancel?: CancelToken,
    onPage?: (page: AssetMeta[]) => Promise<void>,
): Promise<AssetMeta[]> {
    const all: AssetMeta[] = [];
    let after: string | undefined;
    let hasNextPage = true;

    while (hasNextPage) {
        if (cancel?.cancelled) break;
        const res = await MediaAccess.list({ after, first: 100 });
        const page: AssetMeta[] = res.assets.map((asset) => ({
            id: asset.id,
            uri: asset.uri,
            creationTime: asset.creationTime,
            modificationTime: asset.modificationTime,
            width: asset.width,
            height: asset.height,
            filename: asset.filename,
            mediaSubtypes: asset.mediaSubtypes ?? [],
        }));
        all.push(...page);
        after = res.endCursor;
        hasNextPage = res.hasNextPage;
        // Paging heartbeat. `hasNextPage: true` with a missing/stale cursor is the
        // one genuine infinite-loop risk here, so log the cursor's presence too.
        console.log('[duplicates] page', {
            got: page.length,
            total: all.length,
            of: res.totalCount ?? null,
            hasNextPage,
            hasCursor: res.endCursor != null,
        });
        onProgress?.(all.length, res.totalCount ?? all.length);
        await onPage?.(page);
    }

    return all;
}
