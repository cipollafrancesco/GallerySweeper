import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

export type PermissionStatus = 'granted' | 'undetermined' | 'denied';
export type AccessLevel = 'all' | 'limited' | 'none' | 'undetermined';

export interface PermissionResponse {
    status: PermissionStatus;
    access: AccessLevel;
    canAskAgain: boolean;
}

export const getPermission = async (): Promise<PermissionResponse> => {
    const { status, canAskAgain, accessPrivileges } = await MediaLibrary.getPermissionsAsync();

    let access: AccessLevel = 'undetermined';
    if (status === 'granted') {
        access = accessPrivileges === 'limited' ? 'limited' : 'all';
    } else if (status === 'denied') {
        access = 'none';
    }

    return {
        status,
        access,
        canAskAgain,
    };
};

export const requestPermission = async (): Promise<PermissionResponse> => {
    const { status, canAskAgain, accessPrivileges } = await MediaLibrary.requestPermissionsAsync();

    let access: AccessLevel = 'undetermined';
    if (status === 'granted') {
        access = accessPrivileges === 'limited' ? 'limited' : 'all';
    } else if (status === 'denied') {
        access = 'none';
    }

    return {
        status,
        access,
        canAskAgain,
    };
};

export type Asset = MediaLibrary.Asset;

export interface AssetListResponse {
    assets: Asset[];
    endCursor?: string;
    hasNextPage: boolean;
    /** Total assets matching the query, reported by the OS from the first page. */
    totalCount?: number;
}

export const list = async ({
    after,
    first = 100,
}: {
    after?: string;
    first?: number;
}): Promise<AssetListResponse> => {
    const { assets, endCursor, hasNextPage, totalCount } = await MediaLibrary.getAssetsAsync({
        after,
        first,
        sortBy: MediaLibrary.SortBy.creationTime,
        mediaType: MediaLibrary.MediaType.photo,
    });

    return {
        assets: assets,
        endCursor,
        hasNextPage,
        totalCount,
    };
};

export type AssetInfo = MediaLibrary.AssetInfo;

/**
 * Fetches extended asset info (localUri, EXIF, GPS, media subtypes). Comparatively
 * expensive, so call it lazily — only when pixels/metadata are actually needed.
 * `shouldDownloadFromNetwork: false` avoids pulling iCloud-only originals.
 */
export const getInfo = async (id: string): Promise<AssetInfo> => {
    return MediaLibrary.getAssetInfoAsync(id, { shouldDownloadFromNetwork: false });
};

export interface DeleteResponse {
    movedToTrash: boolean;
    requiresUserConfirm?: boolean;
}

export const deleteMany = async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return true;
    return MediaLibrary.deleteAssetsAsync(ids);
};

export const deleteOne = async (id: string): Promise<DeleteResponse> => {
    if (Platform.OS === 'android') {
        // Android's deleteAssetsAsync requires user confirmation
        // and might not move to a "trash" concept universally.
        // This will be handled in the Android-specific implementation.
    }

    const success = await MediaLibrary.deleteAssetsAsync([id]);
    return { movedToTrash: success };
};
