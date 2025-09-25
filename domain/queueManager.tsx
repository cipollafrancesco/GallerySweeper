import * as MediaLibrary from 'expo-media-library';
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import * as MediaAccess from '../platform/mediaAccess';
import { storage } from '../services/storage';

const BUFFER_SIZE = 10;

interface State {
    queue: MediaAccess.Asset[];
    endCursor?: string;
    hasNextPage: boolean;
    kept: number;
    deleted: number;
    markedForDelete: Set<string>;
    lastAction?: { type: 'keep' | 'delete'; asset: MediaAccess.Asset };
    access: MediaAccess.AccessLevel;
    canAskAgain: boolean;
    isRequestingPermission: boolean;
    loading: boolean;
    error?: Error;
}

type Action =
    | { type: 'INIT'; payload: { access: MediaAccess.AccessLevel; canAskAgain: boolean; markedForDelete: Set<string> } }
    | { type: 'RESET_REVIEW_STATE' }
    | { type: 'LOAD_MORE'; payload: MediaAccess.AssetListResponse }
    | { type: 'KEEP' }
    | { type: 'MARK_FOR_DELETE' }
    | { type: 'COMMIT_DELETE_START' }
    | { type: 'COMMIT_DELETE_OK'; payload: { deletedIds: string[] } }
    | { type: 'COMMIT_DELETE_ERR'; payload: Error }
    | { type: 'CLEAR_MARKED_FOR_DELETE' }
    | { type: 'UNDO' }
    | { type: 'PERMISSION_PROMPT_START' }
    | { type: 'PERMISSION_PROMPT_END'; payload: { access: MediaAccess.AccessLevel; canAskAgain: boolean } };

const initialState: State = {
    queue: [],
    hasNextPage: true,
    kept: 0,
    deleted: 0,
    markedForDelete: new Set(),
    access: 'undetermined',
    canAskAgain: true,
    isRequestingPermission: false,
    loading: false,
};

const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'INIT':
            return {
                ...initialState,
                access: action.payload.access,
                canAskAgain: action.payload.canAskAgain,
                markedForDelete: action.payload.markedForDelete,
            };
        case 'RESET_REVIEW_STATE':
            return {
                ...initialState,
                access: state.access,
                canAskAgain: state.canAskAgain,
            };
        case 'PERMISSION_PROMPT_START':
            return { ...state, isRequestingPermission: true };
        case 'PERMISSION_PROMPT_END':
            return {
                ...state,
                isRequestingPermission: false,
                access: action.payload.access,
                canAskAgain: action.payload.canAskAgain,
            };
        case 'LOAD_MORE':
            const newAssets = action.payload.assets.filter(
                (asset) => !storage.getReviewedIds().has(asset.id) && !state.markedForDelete.has(asset.id)
            );
            return {
                ...state,
                queue: [...state.queue, ...newAssets],
                endCursor: action.payload.endCursor,
                hasNextPage: action.payload.hasNextPage,
                loading: false,
            };
        case 'KEEP': {
            const [top, ...nextQueue] = state.queue;
            if (!top) return state;
            storage.addReviewedId(top.id);
            storage.setLastSeenAssetId(top.id);
            return {
                ...state,
                queue: nextQueue,
                kept: state.kept + 1,
                lastAction: { type: 'keep', asset: top },
            };
        }
        case 'MARK_FOR_DELETE': {
            const [top, ...nextQueue] = state.queue;
            if (!top) return state;
            const newMarkedForDelete = new Set(state.markedForDelete);
            newMarkedForDelete.add(top.id);
            storage.addMarkedForDeleteId(top.id);
            storage.setLastSeenAssetId(top.id);
            return {
                ...state,
                queue: nextQueue,
                markedForDelete: newMarkedForDelete,
                lastAction: { type: 'delete', asset: top },
            };
        }
        case 'COMMIT_DELETE_START':
            return { ...state, loading: true };
        case 'COMMIT_DELETE_OK': {
            const newMarkedForDelete = new Set(state.markedForDelete);
            action.payload.deletedIds.forEach((id) => newMarkedForDelete.delete(id));
            storage.clearMarkedForDelete();
            return {
                ...state,
                loading: false,
                markedForDelete: newMarkedForDelete,
                deleted: state.deleted + action.payload.deletedIds.length,
            };
        }
        case 'COMMIT_DELETE_ERR':
            return { ...state, loading: false, error: action.payload };
        case 'CLEAR_MARKED_FOR_DELETE':
            storage.clearMarkedForDelete();
            return { ...state, markedForDelete: new Set() };
        case 'UNDO': {
            if (!state.lastAction) return state;
            const { type, asset } = state.lastAction;
            if (type === 'keep') {
                storage.getReviewedIds().delete(asset.id); // This is not persisted, but will be overwritten on next add
                return {
                    ...state,
                    queue: [asset, ...state.queue],
                    kept: state.kept - 1,
                    lastAction: undefined,
                };
            } else {
                const newMarkedForDelete = new Set(state.markedForDelete);
                newMarkedForDelete.delete(asset.id);
                storage.removeMarkedForDeleteId(asset.id);
                return {
                    ...state,
                    queue: [asset, ...state.queue],
                    markedForDelete: newMarkedForDelete,
                    lastAction: undefined,
                };
            }
        }
        default:
            return state;
    }
};

const QueueContext = createContext<{
    state: State;
    dispatch: React.Dispatch<Action>;
}>({ state: initialState, dispatch: () => null });

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    return <QueueContext.Provider value={{ state, dispatch }}>{children}</QueueContext.Provider>;
};

export const useQueue = () => {
    const { state, dispatch } = useContext(QueueContext);

    useEffect(() => {
        const subscription = MediaLibrary.addListener(() => {
            // A simple way to handle library changes is to reload.
            // A more sophisticated approach could try to merge changes.
            loadInitial();
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const loadMore = async (after?: string) => {
        if (state.loading || !state.hasNextPage) return;
        const reviewedIds = storage.getReviewedIds();
        let finalAssets: MediaLibrary.Asset[] = [];
        let nextPage = after;
        let hasNext = true;

        while (finalAssets.length < BUFFER_SIZE && hasNext) {
            const result: MediaAccess.AssetListResponse = await MediaAccess.list({ after: nextPage });
            const freshAssets = result.assets.filter(asset => !reviewedIds.has(asset.id) && !state.markedForDelete.has(asset.id));
            finalAssets = [...finalAssets, ...freshAssets];
            nextPage = result.endCursor;
            hasNext = result.hasNextPage;
        }

        dispatch({
            type: 'LOAD_MORE',
            payload: { assets: finalAssets, endCursor: nextPage, hasNextPage: hasNext },
        });

    };

    const ensureBuffer = () => {
        if (state.queue.length < BUFFER_SIZE && state.hasNextPage && !state.loading) {
            loadMore(state.endCursor);
        }
    };

    const loadInitial = async () => {
        await storage.loadAll();
        const perm = await MediaAccess.getPermission();
        dispatch({
            type: 'INIT',
            payload: {
                access: perm.access,
                canAskAgain: perm.canAskAgain,
                markedForDelete: storage.getMarkedForDeleteIds(),
            },
        });

        if (perm.access === 'all') {
            const lastSeenAssetId = await storage.getLastSeenAssetId();
            loadMore(lastSeenAssetId || undefined);
        }
    };

    const keepTop = () => dispatch({ type: 'KEEP' });
    const markTopForDeletion = () => dispatch({ type: 'MARK_FOR_DELETE' });

    const commitDeletions = async () => {
        if (state.markedForDelete.size === 0) return;
        dispatch({ type: 'COMMIT_DELETE_START' });
        try {
            await MediaLibrary.deleteAssetsAsync([...state.markedForDelete]);
            dispatch({ type: 'COMMIT_DELETE_OK', payload: { deletedIds: [...state.markedForDelete] } });
        } catch (e) {
            dispatch({ type: 'COMMIT_DELETE_ERR', payload: e as Error });
        }
    };

    const clearMarkedForDelete = () => {
        dispatch({ type: 'CLEAR_MARKED_FOR_DELETE' });
    };

    const resolvePermissionRequest = async () => {
        const perm = await MediaAccess.requestPermission();
        dispatch({ type: 'PERMISSION_PROMPT_END', payload: { access: perm.access, canAskAgain: perm.canAskAgain } });
        if (perm.access === 'all') {
            loadInitial();
        }
    };

    const undo = () => {
        if (state.lastAction) {
            dispatch({ type: 'UNDO' });
        }
    };

    const resetReviewState = async () => {
        await storage.clearReviewState();
        dispatch({ type: 'RESET_REVIEW_STATE' });
        loadInitial();
    };

    return { ...state, loadInitial, ensureBuffer, keepTop, markTopForDeletion, undo, resolvePermissionRequest, commitDeletions, clearMarkedForDelete, resetReviewState };
};
