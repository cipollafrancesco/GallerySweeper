import { Eraser, RefreshCw, Settings, X } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { AssetMeta, DuplicateGroup, PhotoDecision, ScanDiagnostics, ScanProgress } from '../../services/duplicates/types';
import { PillChip } from '../../ui/glass/PillChip';
import { HeaderIconButton } from '../../ui/primitives/HeaderIconButton';
import { ScreenHeader } from '../../ui/primitives/ScreenHeader';
import { Body, Caption, Title } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';
import { GroupRow } from './GroupRow';
import { ScanProgressBanner } from './ScanProgressBanner';

const EMPTY_DECISIONS = new Map<string, PhotoDecision>();

// Mirrors features/hud/SweepHeader.tsx's collapsible "Undo All" / "Delete (N)"
// toolbar exactly, so the two features feel like one coherent piece of chrome.
const TOOLBAR_HEIGHT = 48;
const TOOLBAR_ANIMATION_MS = 220;

interface GroupsReviewScreenProps {
    groups: DuplicateGroup[];
    metaById: Map<string, AssetMeta>;
    decisions: Map<string, Map<string, PhotoDecision>>;
    deleteCount: number;
    diagnostics?: ScanDiagnostics | null;
    /** A scan is currently streaming groups in. */
    isScanning?: boolean;
    progress?: ScanProgress | null;
    /** Opens the enlarged reviewer for this group, starting at the given photo index. */
    onOpenGroup: (groupId: string, index: number) => void;
    onDelete: () => void;
    /** Clears every keep/delete tag across all groups — the "Undo All" equivalent. */
    onClearAll: () => void;
    onRescan: () => void;
    onCancelScan?: () => void;
    /** Flushes the on-device duplicate caches and forces a full re-scan from scratch. */
    onResetDiscovery: () => void;
    onOpenSettings: () => void;
}

/** Explains why a scan hashed nothing, so an empty result isn't mistaken for a clean library. */
function summarizeStalledScan(diag: ScanDiagnostics): string {
    if (diag.skippedNoLocalUri > 0) {
        return 'Some of your photos aren’t downloaded to this device yet, so they couldn’t be analyzed. Turn on “Download and Keep Originals” in Settings, then scan again.';
    }
    return 'We couldn’t analyze your photos this time. Please try scanning again.';
}

export const GroupsReviewScreen: React.FC<GroupsReviewScreenProps> = ({
    groups,
    metaById,
    decisions,
    deleteCount,
    diagnostics,
    isScanning = false,
    progress = null,
    onOpenGroup,
    onDelete,
    onClearAll,
    onRescan,
    onCancelScan,
    onResetDiscovery,
    onOpenSettings,
}) => {
    // Whether any photo anywhere has a keep/delete tag — the single gate for the
    // toolbar's open/closed animation (subsumes deleteCount > 0 as a special case).
    const hasAnyDecision = useMemo(() => [...decisions.values()].some((group) => group.size > 0), [decisions]);

    const toolbarHeight = useSharedValue(0);
    useEffect(() => {
        toolbarHeight.value = withTiming(hasAnyDecision ? TOOLBAR_HEIGHT : 0, {
            duration: TOOLBAR_ANIMATION_MS,
            easing: Easing.out(Easing.cubic),
        });
    }, [hasAnyDecision, toolbarHeight]);
    const toolbarStyle = useAnimatedStyle(() => ({ height: toolbarHeight.value }));

    return (
        <View style={styles.container}>
            <ScreenHeader
                title="Duplicates"
                actions={
                    <>
                        <HeaderIconButton
                            onPress={isScanning ? onCancelScan : onRescan}
                            accessibilityLabel={isScanning ? 'Stop scan' : 'Rescan library'}
                            icon={
                                isScanning ? (
                                    <X color={theme.colors.icon} size={22} />
                                ) : (
                                    <RefreshCw color={theme.colors.icon} size={22} />
                                )
                            }
                        />
                        <HeaderIconButton
                            onPress={onResetDiscovery}
                            accessibilityLabel="Restart duplicate discovery"
                            accessibilityHint="Clears the on-device scan cache and rescans your library from scratch"
                            icon={<Eraser color={theme.colors.icon} size={22} />}
                        />
                        <HeaderIconButton
                            onPress={onOpenSettings}
                            accessibilityLabel="Settings"
                            accessibilityHint="Opens app settings"
                            icon={<Settings color={theme.colors.icon} size={22} />}
                        />
                    </>
                }
                caption={
                    groups.length > 0
                        ? `${groups.length} ${groups.length === 1 ? 'group' : 'groups'} found · tap a photo to take a closer look`
                        : undefined
                }
            />

            {groups.length > 0 ? (
                <>
                    {isScanning && <ScanProgressBanner progress={progress} />}
                    <View style={styles.subChrome}>
                        <Animated.View style={[styles.toolbar, toolbarStyle]}>
                            <View style={styles.toolbarRow}>
                                <View style={styles.toolbarSlot}>
                                    {hasAnyDecision && <PillChip title="Clear All" onPress={onClearAll} variant="ghost" />}
                                </View>
                                <View style={styles.toolbarSlot}>
                                    {!isScanning && deleteCount > 0 && (
                                        <PillChip title={`Delete (${deleteCount})`} onPress={onDelete} variant="destructive" />
                                    )}
                                </View>
                            </View>
                        </Animated.View>
                    </View>
                    <FlatList
                        data={groups}
                        keyExtractor={(group) => group.id}
                        renderItem={({ item }) => (
                            <GroupRow
                                group={item}
                                metaById={metaById}
                                decisions={decisions.get(item.id) ?? EMPTY_DECISIONS}
                                onOpenGroup={onOpenGroup}
                            />
                        )}
                        extraData={decisions}
                        contentContainerStyle={styles.list}
                    />
                </>
            ) : isScanning ? (
                <View style={styles.empty}>
                    <ActivityIndicator color={theme.colors.systemBlue} size="large" />
                    <Title style={[styles.emptyTitle, styles.emptyTitleSpaced]}>Scanning your library…</Title>
                    <Body style={styles.emptyBody}>Duplicates will appear here as they're found.</Body>
                    {/* Same banner as the streaming case, so a slow scan shows a live
                        phase + count instead of a featureless spinner. */}
                    <View style={styles.emptyBanner}>
                        <ScanProgressBanner progress={progress} />
                    </View>
                </View>
            ) : (
                <View style={styles.empty}>
                    <Title style={styles.emptyTitle}>No duplicates found</Title>
                    <Body style={styles.emptyBody}>Your library looks clean. Nothing to review.</Body>
                    {diagnostics && diagnostics.hashed === 0 && diagnostics.collected > 0 && (
                        <Caption style={styles.emptyDiagnostics}>{summarizeStalledScan(diagnostics)}</Caption>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.systemBackground,
    },
    // Wraps the toolbar in the same horizontal inset as ScreenHeader's own
    // padding — one source per region instead of each leaf style repeating
    // `paddingHorizontal: theme.spacing.l` independently.
    subChrome: {
        paddingHorizontal: theme.spacing.l,
    },
    toolbar: {
        overflow: 'hidden',
    },
    toolbarRow: {
        height: TOOLBAR_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toolbarSlot: {
        flexDirection: 'row',
    },
    list: {
        paddingTop: theme.spacing.s,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    emptyTitle: {
        textAlign: 'center',
    },
    emptyTitleSpaced: {
        marginTop: theme.spacing.l,
    },
    emptyBody: {
        color: theme.colors.secondaryLabel,
        textAlign: 'center',
        marginTop: theme.spacing.s,
    },
    emptyBanner: {
        alignSelf: 'stretch',
        marginTop: theme.spacing.xl,
    },
    emptyDiagnostics: {
        color: theme.colors.tertiaryLabel,
        textAlign: 'center',
        marginTop: theme.spacing.m,
    },
});
