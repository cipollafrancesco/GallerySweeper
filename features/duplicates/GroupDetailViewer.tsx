import { Check, Sparkles, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as haptics from '../../platform/haptics';
import type { AssetMeta, DuplicateGroup, PhotoDecision } from '../../services/duplicates/types';
import { ActionBar } from '../../ui/glass/ActionBar';
import { ActionButton } from '../../ui/glass/ActionButton';
import { Caption } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';
import { ZoomableImage } from './ZoomableImage';

interface GroupDetailViewerProps {
    group: DuplicateGroup;
    metaById: Map<string, AssetMeta>;
    /** This group's keep/delete decisions so far. Absent id = undecided. */
    decisions: Map<string, PhotoDecision>;
    initialIndex: number;
    onDecide: (assetId: string, decision: PhotoDecision) => void;
    onClose: () => void;
}

/**
 * Full-screen, freely-navigable reviewer for one duplicate group. Swiping
 * pages between photos — it never commits a decision by itself, unlike the
 * Sweep deck's swipe-to-decide gesture — so the user can go back and forth to
 * compare before tapping Keep/Delete for whichever photo is on screen. Every
 * decision is reversible: tapping the already-active button clears it back to
 * undecided (the toggle-to-undo behavior lives in `handleDecide` upstream).
 */
export const GroupDetailViewer: React.FC<GroupDetailViewerProps> = ({
    group,
    metaById,
    decisions,
    initialIndex,
    onDecide,
    onClose,
}) => {
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    // Set (non-null) while any page reports itself zoomed in, so the pager's
    // own swipe-to-navigate gesture can be disabled — paging away while zoomed
    // would fight with panning the zoomed photo.
    const [zoomedAssetId, setZoomedAssetId] = useState<string | null>(null);

    const handleMomentumEnd = useCallback(
        (e: NativeSyntheticEvent<NativeScrollEvent>) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
            setCurrentIndex(Math.max(0, Math.min(index, group.assetIds.length - 1)));
        },
        [screenWidth, group.assetIds.length],
    );

    const currentAssetId = group.assetIds[currentIndex];
    const currentDecision = decisions.get(currentAssetId);
    const isSuggestedKeeper = currentAssetId === group.keeperId;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Pressable onPress={onClose} style={styles.headerSide} accessibilityLabel="Close">
                    <X color={theme.colors.icon} size={24} />
                </Pressable>
                <Caption style={styles.counter}>
                    {currentIndex + 1} of {group.assetIds.length}
                </Caption>
                <View style={styles.headerSide} />
            </View>

            {isSuggestedKeeper && (
                <View style={styles.suggestedPill}>
                    <Sparkles color={theme.colors.systemBlue} size={14} />
                    <Caption style={styles.suggestedText}>Suggested keep</Caption>
                </View>
            )}

            <FlatList
                data={group.assetIds}
                keyExtractor={(id) => id}
                horizontal
                pagingEnabled
                scrollEnabled={zoomedAssetId === null}
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={initialIndex}
                getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
                onMomentumScrollEnd={handleMomentumEnd}
                renderItem={({ item: assetId }) => {
                    const meta = metaById.get(assetId);
                    return (
                        <View style={[styles.page, { width: screenWidth }]}>
                            {meta && (
                                <ZoomableImage
                                    uri={meta.uri}
                                    onZoomChange={(zoomed) => setZoomedAssetId(zoomed ? assetId : null)}
                                />
                            )}
                        </View>
                    );
                }}
                style={styles.list}
            />

            <ActionBar style={{ paddingBottom: insets.bottom + theme.spacing.m }}>
                <ActionButton
                    title="Delete"
                    variant="delete"
                    style={currentDecision === 'keep' && styles.controlButtonDimmed}
                    onPress={() => {
                        haptics.selection();
                        onDecide(currentAssetId, 'delete');
                    }}
                    icon={<Trash2 color={theme.colors.delete} size={24} />}
                />
                <ActionButton
                    title="Keep"
                    variant="keep"
                    style={currentDecision === 'delete' && styles.controlButtonDimmed}
                    onPress={() => {
                        haptics.selection();
                        onDecide(currentAssetId, 'keep');
                    }}
                    icon={<Check color={theme.colors.keep} size={24} />}
                />
            </ActionBar>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.systemBackground,
        zIndex: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.l,
        paddingBottom: theme.spacing.s,
    },
    headerSide: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counter: {
        color: theme.colors.secondaryLabel,
    },
    suggestedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.colors.secondarySystemBackground,
        marginBottom: theme.spacing.s,
    },
    suggestedText: {
        color: theme.colors.systemBlue,
    },
    list: {
        flex: 1,
    },
    page: {
        flex: 1,
    },
    controlButtonDimmed: {
        opacity: 0.4,
    },
});
