import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEWED_IDS_KEY = 'reviewed_ids';
const MARKED_FOR_DELETE_IDS_KEY = 'marked_for_delete_ids';
const LAST_SEEN_ASSET_ID_KEY = 'last_seen_asset_id';
const ONBOARDING_SHOWN_KEY = 'onboarding_modal_shown';
const LIFETIME_DELETED_COUNT_KEY = 'lifetime_deleted_count';
const LIFETIME_BYTES_SAVED_KEY = 'lifetime_bytes_saved';

// Simple in-memory cache to avoid reading from AsyncStorage repeatedly
let reviewedIdsCache: Set<string> = new Set();
let markedForDeleteIdsCache: Set<string> = new Set();

export const storage = {
    async loadAll() {
        try {
            const [reviewed, marked] = await AsyncStorage.multiGet([
                REVIEWED_IDS_KEY,
                MARKED_FOR_DELETE_IDS_KEY,
            ]);
            reviewedIdsCache = new Set(reviewed[1] ? JSON.parse(reviewed[1]) : []);
            markedForDeleteIdsCache = new Set(marked[1] ? JSON.parse(marked[1]) : []);
        } catch (e) {
            console.error('Failed to load data from storage', e);
        }
    },

    getReviewedIds: () => reviewedIdsCache,
    getMarkedForDeleteIds: () => markedForDeleteIdsCache,

    // Bulk overwrite the reviewed set — used when restoring a backup. Updates the
    // in-memory cache too so the app is consistent even before the follow-up reload.
    async setReviewedIds(ids: string[]) {
        reviewedIdsCache = new Set(ids);
        try {
            await AsyncStorage.setItem(REVIEWED_IDS_KEY, JSON.stringify([...reviewedIdsCache]));
        } catch (e) {
            console.error('Failed to set reviewed IDs', e);
        }
    },

    // Bulk overwrite the marked-for-delete set — used when restoring a backup.
    async setMarkedForDeleteIds(ids: string[]) {
        markedForDeleteIdsCache = new Set(ids);
        try {
            await AsyncStorage.setItem(MARKED_FOR_DELETE_IDS_KEY, JSON.stringify([...markedForDeleteIdsCache]));
        } catch (e) {
            console.error('Failed to set marked for delete IDs', e);
        }
    },

    async addReviewedId(id: string) {
        reviewedIdsCache.add(id);
        try {
            await AsyncStorage.setItem(REVIEWED_IDS_KEY, JSON.stringify([...reviewedIdsCache]));
        } catch (e) {
            console.error('Failed to save reviewed ID', e);
        }
    },

    async addMarkedForDeleteId(id: string) {
        markedForDeleteIdsCache.add(id);
        try {
            await AsyncStorage.setItem(MARKED_FOR_DELETE_IDS_KEY, JSON.stringify([...markedForDeleteIdsCache]));
        } catch (e) {
            console.error('Failed to save marked for delete ID', e);
        }
    },

    async removeMarkedForDeleteId(id: string) {
        markedForDeleteIdsCache.delete(id);
        try {
            await AsyncStorage.setItem(MARKED_FOR_DELETE_IDS_KEY, JSON.stringify([...markedForDeleteIdsCache]));
        } catch (e) {
            console.error('Failed to remove marked for delete ID', e);
        }
    },

    async clearMarkedForDelete() {
        markedForDeleteIdsCache.clear();
        try {
            await AsyncStorage.removeItem(MARKED_FOR_DELETE_IDS_KEY);
        } catch (e) {
            console.error('Failed to clear marked for delete IDs', e);
        }
    },

    async getLastSeenAssetId(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(LAST_SEEN_ASSET_ID_KEY);
        } catch (e) {
            console.error('Failed to get last seen asset ID', e);
            return null;
        }
    },

    async setLastSeenAssetId(id: string) {
        try {
            await AsyncStorage.setItem(LAST_SEEN_ASSET_ID_KEY, id);
        } catch (e) {
            console.error('Failed to set last seen asset ID', e);
        }
    },

    async clearLastSeenAssetId() {
        try {
            await AsyncStorage.removeItem(LAST_SEEN_ASSET_ID_KEY);
        } catch (e) {
            console.error('Failed to clear last seen asset ID', e);
        }
    },

    async clearReviewState() {
        reviewedIdsCache.clear();
        markedForDeleteIdsCache.clear();
        try {
            await AsyncStorage.multiRemove([
                REVIEWED_IDS_KEY,
                MARKED_FOR_DELETE_IDS_KEY,
                LAST_SEEN_ASSET_ID_KEY,
            ]);
        } catch (e) {
            console.error('Failed to clear review state from storage', e);
        }
    },

    async hasOnboardingBeenShown(): Promise<boolean> {
        try {
            const value = await AsyncStorage.getItem(ONBOARDING_SHOWN_KEY);
            return !!value;
        } catch (e) {
            console.error('Failed to check onboarding status', e);
            return false;
        }
    },

    async setOnboardingShown() {
        try {
            await AsyncStorage.setItem(ONBOARDING_SHOWN_KEY, 'true');
        } catch (e) {
            console.error('Failed to set onboarding shown', e);
        }
    },

    async clearOnboardingShown() {
        try {
            await AsyncStorage.removeItem(ONBOARDING_SHOWN_KEY);
        } catch (e) {
            console.error('Failed to clear onboarding shown', e);
        }
    },

    // Lifetime ("all time") impact stats — deliberately NOT cleared by clearReviewState(),
    // so they survive "Reset reviewed photos". Not cached: read fresh each time (deletions
    // are serial user actions, so there's no meaningful read-modify-write race in practice).
    async getLifetimeStats(): Promise<{ count: number; bytes: number }> {
        try {
            const [c, b] = await AsyncStorage.multiGet([LIFETIME_DELETED_COUNT_KEY, LIFETIME_BYTES_SAVED_KEY]);
            return { count: Number(c[1]) || 0, bytes: Number(b[1]) || 0 };
        } catch (e) {
            console.error('Failed to read lifetime stats', e);
            return { count: 0, bytes: 0 };
        }
    },

    // Additive; call after a confirmed deletion. `bytes` may be 0 if size was unmeasurable.
    async addDeletions(count: number, bytes: number) {
        if (count <= 0) return;
        try {
            const cur = await this.getLifetimeStats();
            await AsyncStorage.multiSet([
                [LIFETIME_DELETED_COUNT_KEY, String(cur.count + count)],
                [LIFETIME_BYTES_SAVED_KEY, String(cur.bytes + Math.max(0, bytes))],
            ]);
        } catch (e) {
            console.error('Failed to update lifetime stats', e);
        }
    },

    // Overwrite (not additive) — used when restoring a backup.
    async setLifetimeStats(count: number, bytes: number) {
        try {
            await AsyncStorage.multiSet([
                [LIFETIME_DELETED_COUNT_KEY, String(Math.max(0, count))],
                [LIFETIME_BYTES_SAVED_KEY, String(Math.max(0, bytes))],
            ]);
        } catch (e) {
            console.error('Failed to set lifetime stats', e);
        }
    },
};
