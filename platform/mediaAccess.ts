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
    const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync(true);

    let access: AccessLevel = 'undetermined';
    if (status === 'granted') {
        const { accessPrivileges } = await MediaLibrary.getPermissionsAsync(false);
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
    const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync(true);

    let access: AccessLevel = 'undetermined';
    if (status === 'granted') {
        const { accessPrivileges } = await MediaLibrary.getPermissionsAsync(false);
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
}

export const list = async ({
    after,
    first = 100,
}: {
    after?: string;
    first?: number;
}): Promise<AssetListResponse> => {
    const { assets, endCursor, hasNextPage } = await MediaLibrary.getAssetsAsync({
        after,
        first,
        sortBy: MediaLibrary.SortBy.creationTime,
        mediaType: MediaLibrary.MediaType.photo,
    });

    return {
        assets: assets,
        endCursor,
        hasNextPage,
    };
};

export interface DeleteResponse {
    movedToTrash: boolean;
    requiresUserConfirm?: boolean;
}

export const deleteOne = async (id: string): Promise<DeleteResponse> => {
    if (Platform.OS === 'android') {
        // Android's deleteAssetsAsync requires user confirmation
        // and might not move to a "trash" concept universally.
        // This will be handled in the Android-specific implementation.
    }

    const success = await MediaLibrary.deleteAssetsAsync([id]);
    return { movedToTrash: success };
};
