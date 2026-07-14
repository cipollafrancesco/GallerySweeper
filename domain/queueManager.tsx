import * as MediaLibrary from 'expo-media-library';
import React, { createContext, useContext, useEffect, useReducer } from 'react';
import * as MediaAccess from '../platform/mediaAccess';
import { clearScanResults } from '../services/duplicates/resultsCache';
import { storage } from '../services/storage';

const BUFFER_SIZE = 10;
// Cap on how many pages the "surface new photos first" pass will scan looking
// for the start of the already-reviewed block, so a reload never turns into an
// unbounded scan (e.g. if review state was cleared out-of-band).
const NEW_SCAN_PAGE_CAP = 5;

// Helper function to deduplicate assets by ID
const deduplicateAssets = (existingAssets: MediaAccess.Asset[], newAssets: MediaAccess.Asset[]): MediaAccess.Asset[] => {
    const existingIds = new Set(existingAssets.map(asset => asset.id));
    return newAssets.filter(asset => !existingIds.has(asset.id));
};

// Helper function to remove duplicates from a single array
const removeDuplicatesFromArray = (assets: MediaAccess.Asset[]): MediaAccess.Asset[] => {
    const seen = new Set<string>();
    return assets.filter(asset => {
        if (seen.has(asset.id)) {
            return false;
        }
        seen.add(asset.id);
        return true;
    });
};

// Action type enums for better type safety
export enum QueueActionType {
    RELOAD = 'RELOAD',
    INIT = 'INIT',
    RESET_REVIEW_STATE = 'RESET_REVIEW_STATE',
    LOAD_MORE = 'LOAD_MORE',
    KEEP = 'KEEP',
    MARK_FOR_DELETE = 'MARK_FOR_DELETE',
    COMMIT_DELETE_START = 'COMMIT_DELETE_START',
    COMMIT_DELETE_OK = 'COMMIT_DELETE_OK',
    COMMIT_DELETE_ERR = 'COMMIT_DELETE_ERR',
    CLEAR_MARKED_FOR_DELETE = 'CLEAR_MARKED_FOR_DELETE',
    CLEAR_ALL_PENDING = 'CLEAR_ALL_PENDING',
    UNDO = 'UNDO',
    PERMISSION_PROMPT_START = 'PERMISSION_PROMPT_START',
    PERMISSION_PROMPT_END = 'PERMISSION_PROMPT_END',
}

export enum ActionHistoryType {
    KEEP = 'keep',
    DELETE = 'delete',
}

interface ActionHistoryItem {
    type: ActionHistoryType;
    asset: MediaAccess.Asset;
}

interface State {
    queue: MediaAccess.Asset[];
    endCursor?: string;
    hasNextPage: boolean;
    kept: number;
    deleted: number;
    markedForDelete: Set<string>;
    actionHistory: ActionHistoryItem[];
    access: MediaAccess.AccessLevel;
    canAskAgain: boolean;
    isRequestingPermission: boolean;
    loading: boolean;
    error?: Error;
    reloadRequest?: { startFromBeginning: boolean };
}

type Action =
    | { type: QueueActionType.RELOAD; payload: { startFromBeginning: boolean } }
    | { type: QueueActionType.INIT; payload: { access: MediaAccess.AccessLevel; canAskAgain: boolean; markedForDelete: Set<string> } }
    | { type: QueueActionType.RESET_REVIEW_STATE }
    | { type: QueueActionType.LOAD_MORE; payload: MediaAccess.AssetListResponse }
    | { type: QueueActionType.KEEP }
    | { type: QueueActionType.MARK_FOR_DELETE }
    | { type: QueueActionType.COMMIT_DELETE_START }
    | { type: QueueActionType.COMMIT_DELETE_OK; payload: { deletedIds: string[] } }
    | { type: QueueActionType.COMMIT_DELETE_ERR; payload: Error }
    | { type: QueueActionType.CLEAR_MARKED_FOR_DELETE }
    | { type: QueueActionType.CLEAR_ALL_PENDING }
    | { type: QueueActionType.UNDO }
    | { type: QueueActionType.PERMISSION_PROMPT_START }
    | { type: QueueActionType.PERMISSION_PROMPT_END; payload: { access: MediaAccess.AccessLevel; canAskAgain: boolean } };

const initialState: State = {
    queue: [],
    hasNextPage: true,
    kept: 0,
    deleted: 0,
    markedForDelete: new Set(),
    actionHistory: [],
    access: 'undetermined',
    canAskAgain: true,
    isRequestingPermission: false,
    loading: false,
};

const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case QueueActionType.RELOAD:
            return {
                ...initialState,
                access: state.access,
                canAskAgain: state.canAskAgain,
                loading: true,
                reloadRequest: action.payload,
            };
        case QueueActionType.INIT:
            // This action now only sets permissions and loaded storage state.
            // It does not trigger any loading itself.
            return {
                ...state,
                access: action.payload.access,
                canAskAgain: action.payload.canAskAgain,
                markedForDelete: action.payload.markedForDelete,
            };
        case QueueActionType.RESET_REVIEW_STATE:
            return {
                ...initialState,
                access: state.access,
                canAskAgain: state.canAskAgain,
                loading: false, // Don't block loading, we'll set it in INIT
            };
        case QueueActionType.PERMISSION_PROMPT_START:
            return { ...state, isRequestingPermission: true };
        case QueueActionType.PERMISSION_PROMPT_END:
            return {
                ...state,
                isRequestingPermission: false,
                access: action.payload.access,
                canAskAgain: action.payload.canAskAgain,
            };
        case QueueActionType.LOAD_MORE:
            // Assets are already filtered in the fetching logic, but ensure no duplicates
            const deduplicatedAssets = deduplicateAssets(state.queue, action.payload.assets);
            const finalQueue = removeDuplicatesFromArray([...state.queue, ...deduplicatedAssets]);
            return {
                ...state,
                queue: finalQueue,
                endCursor: action.payload.endCursor,
                hasNextPage: action.payload.hasNextPage,
                loading: false,
                reloadRequest: undefined, // Clear the reload request once loading is complete
            };
        case QueueActionType.KEEP: {
            const [top, ...nextQueue] = state.queue;
            if (!top) return state;
            storage.addReviewedId(top.id);
            storage.setLastSeenAssetId(top.id);
            return {
                ...state,
                queue: nextQueue,
                kept: state.kept + 1,
                actionHistory: [...state.actionHistory, { type: ActionHistoryType.KEEP, asset: top }],
            };
        }
        case QueueActionType.MARK_FOR_DELETE: {
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
                actionHistory: [...state.actionHistory, { type: ActionHistoryType.DELETE, asset: top }],
            };
        }
        case QueueActionType.COMMIT_DELETE_START:
            return { ...state, loading: true };
        case QueueActionType.COMMIT_DELETE_OK: {
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
        case QueueActionType.COMMIT_DELETE_ERR:
            return { ...state, loading: false, error: action.payload };
        case QueueActionType.CLEAR_MARKED_FOR_DELETE:
            storage.clearMarkedForDelete();
            return { ...state, markedForDelete: new Set() };
        case QueueActionType.UNDO: {
            if (state.actionHistory.length === 0) return state;

            // Get the last action from history (LIFO - Last In, First Out)
            const lastAction = state.actionHistory[state.actionHistory.length - 1];
            const { type, asset } = lastAction;

            // Remove the last action from history
            const newActionHistory = state.actionHistory.slice(0, -1);

            if (type === ActionHistoryType.KEEP) {
                // Undo a keep action: remove from reviewed, decrease kept count, add back to queue
                storage.getReviewedIds().delete(asset.id); // This is not persisted, but will be overwritten on next add
                const deduplicatedQueue = deduplicateAssets([asset], state.queue);
                const finalQueue = removeDuplicatesFromArray([asset, ...deduplicatedQueue]);
                return {
                    ...state,
                    queue: finalQueue,
                    kept: state.kept - 1,
                    actionHistory: newActionHistory,
                };
            } else {
                // Undo a delete action: remove from marked for delete, add back to queue
                const newMarkedForDelete = new Set(state.markedForDelete);
                newMarkedForDelete.delete(asset.id);
                storage.removeMarkedForDeleteId(asset.id);
                const deduplicatedQueue = deduplicateAssets([asset], state.queue);
                const finalQueue = removeDuplicatesFromArray([asset, ...deduplicatedQueue]);
                return {
                    ...state,
                    queue: finalQueue,
                    markedForDelete: newMarkedForDelete,
                    actionHistory: newActionHistory,
                };
            }
        }
        case QueueActionType.CLEAR_ALL_PENDING: {
            // Undo all actions in reverse order (LIFO) to restore all reviewed assets back to queue
            // This clears both "keep" and "delete" actions, essentially resetting the review session
            const restoredAssets: MediaAccess.Asset[] = [];
            let keptCount = state.kept;
            const newMarkedForDelete = new Set<string>();

            // Process action history in reverse to restore assets to original state
            for (let i = state.actionHistory.length - 1; i >= 0; i--) {
                const action = state.actionHistory[i];
                const { type, asset } = action;

                if (type === ActionHistoryType.KEEP) {
                    // Undo keep action: remove from reviewed set and decrease kept count
                    storage.getReviewedIds().delete(asset.id);
                    keptCount -= 1;
                } else {
                    // Undo delete action: remove from marked for delete set
                    storage.removeMarkedForDeleteId(asset.id);
                }

                // Add asset back to front of queue (in original review order)
                restoredAssets.push(asset);
            }

            // Clear all marked for delete from persistent storage
            storage.clearMarkedForDelete();

            // Deduplicate restored assets against current queue
            const deduplicatedRestoredAssets = deduplicateAssets(state.queue, restoredAssets);
            const finalQueue = removeDuplicatesFromArray([...deduplicatedRestoredAssets, ...state.queue]);

            return {
                ...state,
                queue: finalQueue,
                kept: keptCount,
                markedForDelete: newMarkedForDelete,
                actionHistory: [],
            };
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
        const _loadAssets = async () => {
            if (!state.reloadRequest) return;

            try {
                // Always reload storage to get current persisted state
                await storage.loadAll();
                const perm = await MediaAccess.getPermission();
                dispatch({
                    type: QueueActionType.INIT,
                    payload: {
                        access: perm.access,
                        canAskAgain: perm.canAskAgain,
                        markedForDelete: storage.getMarkedForDeleteIds(),
                    },
                });

                if (perm.access !== 'all') {
                    dispatch({
                        type: QueueActionType.LOAD_MORE,
                        payload: { assets: [], endCursor: undefined, hasNextPage: false },
                    });
                    return;
                }

                const { startFromBeginning } = state.reloadRequest;
                const lastSeenAssetId = startFromBeginning ? undefined : await storage.getLastSeenAssetId();

                // Get current reviewed and marked IDs - these will be empty if we just reset
                const reviewedIds = storage.getReviewedIds();
                const markedForDeleteIds = storage.getMarkedForDeleteIds();

                // Also get current queue IDs to prevent duplicates
                const currentQueueIds = new Set(state.queue.map(asset => asset.id));

                // Pages the media library from `after`, dropping already reviewed/marked/queued
                // assets, until it collects `need` fresh ones, the library is exhausted, or
                // (stopWhenSeen) a previously-seen asset is encountered.
                const collectFresh = async ({
                    after,
                    need,
                    stopWhenSeen = false,
                    maxPages,
                }: {
                    after?: string;
                    need: number;
                    stopWhenSeen?: boolean;
                    maxPages?: number;
                }): Promise<{ assets: MediaLibrary.Asset[]; endCursor?: string; hasNextPage: boolean }> => {
                    let assets: MediaLibrary.Asset[] = [];
                    let nextPage: string | undefined = after;
                    let hasNext = true;
                    let iterationCount = 0;

                    while (assets.length < need && hasNext) {
                        iterationCount++;

                        let result: MediaAccess.AssetListResponse;
                        try {
                            result = await MediaAccess.list({ after: nextPage });
                        } catch (error: any) {
                            if (error.message?.includes('Couldn\'t find cursor') && nextPage) {
                                // The cursor is invalid (photo probably deleted), start from beginning
                                nextPage = undefined;
                                result = await MediaAccess.list({ after: undefined });
                            } else {
                                throw error; // Re-throw other errors
                            }
                        }

                        // Filter out already reviewed, marked, or queued assets
                        const freshAssets = result.assets.filter(
                            (asset) => !reviewedIds.has(asset.id) &&
                                !markedForDeleteIds.has(asset.id) &&
                                !currentQueueIds.has(asset.id)
                        );
                        const sawSeen = freshAssets.length < result.assets.length;

                        assets = [...assets, ...freshAssets];
                        nextPage = result.endCursor;
                        hasNext = result.hasNextPage;

                        if (stopWhenSeen) {
                            // The moment a page contains a previously-seen asset, the contiguous
                            // "newly added" block at the top of the roll has ended - stop here
                            // rather than paging further into the already-reviewed backlog.
                            if (sawSeen) break;
                            if (result.assets.length === 0) { hasNext = false; break; }
                            if (maxPages && iterationCount >= maxPages) break;
                            continue;
                        }

                        // If we got assets from the library but none passed the filter,
                        // and we haven't reached the end of the library, continue fetching
                        if (freshAssets.length === 0 && result.assets.length > 0 && hasNext) {
                            continue;
                        }

                        // If we got no assets from the library at all, we've reached the end
                        if (result.assets.length === 0) {
                            hasNext = false;
                            break;
                        }

                        // If we got some unreviewed assets, we can stop here
                        if (freshAssets.length > 0) {
                            break;
                        }

                        // Prevent infinite loops
                        if (iterationCount > 100) {
                            hasNext = false;
                            break;
                        }
                    }

                    return { assets, endCursor: nextPage, hasNextPage: hasNext };
                };

                let finalAssets: MediaLibrary.Asset[];
                let finalEndCursor: string | undefined;
                let finalHasNextPage: boolean;

                if (!lastSeenAssetId) {
                    // Fresh start (explicit reset, or no cursor yet): a single top-down pass.
                    const page = await collectFresh({ after: undefined, need: BUFFER_SIZE });
                    finalAssets = page.assets;
                    finalEndCursor = page.endCursor;
                    finalHasNextPage = page.hasNextPage;
                } else {
                    // Resume: first grab any newly-added photos sitting above the last-seen
                    // cursor (a short pass that stops as soon as it reaches the reviewed
                    // block), then fall back to the existing backlog cursor to fill the rest.
                    // This keeps new captures visible immediately without losing the
                    // lastSeenAssetId fast-forward for large reviewed histories.
                    const fresh = await collectFresh({
                        after: undefined,
                        need: BUFFER_SIZE,
                        stopWhenSeen: true,
                        maxPages: NEW_SCAN_PAGE_CAP,
                    });

                    if (fresh.assets.length >= BUFFER_SIZE) {
                        finalAssets = fresh.assets;
                        finalEndCursor = lastSeenAssetId; // backlog untouched - still resumes from here next time
                        finalHasNextPage = true;
                    } else {
                        const freshIds = new Set(fresh.assets.map((asset) => asset.id));
                        const backlog = await collectFresh({
                            after: lastSeenAssetId,
                            need: BUFFER_SIZE - fresh.assets.length,
                        });
                        const dedupedBacklog = backlog.assets.filter((asset) => !freshIds.has(asset.id));
                        finalAssets = [...fresh.assets, ...dedupedBacklog];
                        finalEndCursor = backlog.endCursor;
                        // Phase 1's hasNextPage reflects the library below wherever it stopped
                        // scanning (typically the already-reviewed region) - not whether the
                        // backlog itself has more, so only the backlog pass's value is authoritative.
                        finalHasNextPage = backlog.hasNextPage;
                    }
                }

                dispatch({
                    type: QueueActionType.LOAD_MORE,
                    payload: { assets: finalAssets, endCursor: finalEndCursor, hasNextPage: finalHasNextPage },
                });
            } catch (error) {
                // Ensure we always dispatch something to reset loading state
                dispatch({
                    type: QueueActionType.LOAD_MORE,
                    payload: { assets: [], endCursor: undefined, hasNextPage: false },
                });
            }
        };

        _loadAssets();
    }, [state.reloadRequest]);

    useEffect(() => {
        const subscription = MediaLibrary.addListener(() => {
            if (state.access === 'all') {
                dispatch({ type: QueueActionType.RELOAD, payload: { startFromBeginning: false } });
            }
        });

        return () => {
            subscription.remove();
        };
    }, [state.access]);

    const ensureBuffer = () => {
        if (state.queue.length < BUFFER_SIZE && state.hasNextPage && !state.loading) {
            // The main useEffect handles loading the initial buffer.
            // This function should handle subsequent pagination.
            // For simplicity in this refactor, we are letting the main useEffect handle all loading.
            // A future enhancement could be to add separate pagination logic here.
        }
    };

    const reload = (startFromBeginning: boolean) => {
        dispatch({ type: QueueActionType.RELOAD, payload: { startFromBeginning } });
    };

    const keepTop = () => dispatch({ type: QueueActionType.KEEP });
    const markTopForDeletion = () => dispatch({ type: QueueActionType.MARK_FOR_DELETE });

    const commitDeletions = async () => {
        if (state.markedForDelete.size === 0) return;
        dispatch({ type: QueueActionType.COMMIT_DELETE_START });
        try {
            await MediaLibrary.deleteAssetsAsync([...state.markedForDelete]);
            dispatch({ type: QueueActionType.COMMIT_DELETE_OK, payload: { deletedIds: [...state.markedForDelete] } });
        } catch (e) {
            dispatch({ type: QueueActionType.COMMIT_DELETE_ERR, payload: e as Error });
        }
    };

    const clearMarkedForDelete = () => {
        dispatch({ type: QueueActionType.CLEAR_MARKED_FOR_DELETE });
    };

    const clearAllPending = () => {
        dispatch({ type: QueueActionType.CLEAR_ALL_PENDING });
    };

    const resolvePermissionRequest = async () => {
        dispatch({ type: QueueActionType.PERMISSION_PROMPT_START });
        const perm = await MediaAccess.requestPermission();
        dispatch({
            type: QueueActionType.PERMISSION_PROMPT_END,
            payload: { access: perm.access, canAskAgain: perm.canAskAgain },
        });

        if (perm.access === 'all') {
            reload(false); // Continue from last position for permission flow
        }
    };

    const undo = () => {
        if (state.actionHistory.length > 0) {
            dispatch({ type: QueueActionType.UNDO });
        }
    };

    const resetReviewState = async () => {
        await storage.clearReviewState();
        // A full reset should leave no stale cached duplicate-scan results either.
        await clearScanResults();
        reload(true);
    };

    return {
        ...state,
        reload,
        ensureBuffer,
        keepTop,
        markTopForDeletion,
        undo,
        resolvePermissionRequest,
        commitDeletions,
        clearMarkedForDelete,
        clearAllPending,
        resetReviewState,
    };
};
