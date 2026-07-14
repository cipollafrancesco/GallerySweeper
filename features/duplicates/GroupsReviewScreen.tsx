import { Eraser, RefreshCw, X } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AssetMeta, DuplicateGroup, PhotoDecision, ScanDiagnostics, ScanProgress } from '../../services/duplicates/types';
import { PillChip } from '../../ui/glass/PillChip';
import { Body, Caption, Title } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';
import { GroupRow } from './GroupRow';
import { ScanProgressBanner } from './ScanProgressBanner';

const EMPTY_DECISIONS = new Map<string, PhotoDecision>();

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
    onRescan: () => void;
    onCancelScan?: () => void;
    /** Flushes the on-device duplicate caches and forces a full re-scan from scratch. */
    onResetDiscovery: () => void;
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
    onRescan,
    onCancelScan,
    onResetDiscovery,
}) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + theme.spacing.s }]}>
                <Title style={styles.title}>Duplicates</Title>
                <View style={styles.headerActions}>
                    {!isScanning && deleteCount > 0 && (
                        <PillChip title={`Delete (${deleteCount})`} onPress={onDelete} variant="delete" />
                    )}
                    <Pressable
                        onPress={isScanning ? onCancelScan : onRescan}
                        style={styles.closeButton}
                        accessibilityLabel={isScanning ? 'Stop scan' : 'Rescan library'}
                    >
                        {isScanning ? (
                            <X color={theme.colors.icon} size={22} />
                        ) : (
                            <RefreshCw color={theme.colors.icon} size={22} />
                        )}
                    </Pressable>
                    <Pressable
                        onPress={onResetDiscovery}
                        style={styles.closeButton}
                        accessibilityLabel="Restart duplicate discovery"
                        accessibilityHint="Clears the on-device scan cache and rescans your library from scratch"
                    >
                        <Eraser color={theme.colors.icon} size={22} />
                    </Pressable>
                </View>
            </View>

            {groups.length > 0 ? (
                <>
                    {isScanning && <ScanProgressBanner progress={progress} />}
                    <Caption style={styles.subheader}>
                        {groups.length} {groups.length === 1 ? 'group' : 'groups'} found · tap a photo to take a closer
                        look
                    </Caption>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        paddingBottom: theme.spacing.s,
    },
    title: {
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.s,
    },
    closeButton: {
        padding: theme.spacing.s,
        margin: -theme.spacing.s,
    },
    subheader: {
        color: theme.colors.secondaryLabel,
        paddingHorizontal: theme.spacing.l,
        paddingBottom: theme.spacing.m,
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
