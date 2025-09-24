import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEWED_IDS_KEY = 'reviewed_ids';
const MARKED_FOR_DELETE_IDS_KEY = 'marked_for_delete_ids';
const LAST_SEEN_ASSET_ID_KEY = 'last_seen_asset_id';

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
};
