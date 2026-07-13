import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEWED_IDS_KEY = 'reviewed_ids';
const MARKED_FOR_DELETE_IDS_KEY = 'marked_for_delete_ids';
const LAST_SEEN_ASSET_ID_KEY = 'last_seen_asset_id';
const ONBOARDING_SHOWN_KEY = 'onboarding_modal_shown';

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
};
