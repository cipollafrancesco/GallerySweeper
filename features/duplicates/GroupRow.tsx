import { Image } from 'expo-image';
import { Check, Sparkles, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { AssetMeta, DuplicateGroup, PhotoDecision } from '../../services/duplicates/types';
import { Caption } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';

const THUMB_SIZE = 104;

interface GroupRowProps {
    group: DuplicateGroup;
    metaById: Map<string, AssetMeta>;
    /** This group's keep/delete decisions so far. Absent id = undecided. */
    decisions: Map<string, PhotoDecision>;
    /** Opens the enlarged reviewer for this group at the given photo index. */
    onOpenGroup: (groupId: string, index: number) => void;
}

const GroupRowComponent: React.FC<GroupRowProps> = ({ group, metaById, decisions, onOpenGroup }) => {
    const deleteCount = group.assetIds.filter((id) => decisions.get(id) === 'delete').length;
    const reasonLabel = group.reason === 'near-dup' ? 'Near-duplicates' : 'Similar shots';

    return (
        <View style={styles.container}>
            <Pressable
                style={styles.header}
                onPress={() => onOpenGroup(group.id, 0)}
                accessibilityRole="button"
                accessibilityLabel="Review this group"
            >
                <Caption style={styles.reason}>
                    {reasonLabel} · {group.assetIds.length} photos
                </Caption>
                {deleteCount > 0 && <Caption style={styles.deleteInfo}>{deleteCount} to delete</Caption>}
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                {group.assetIds.map((id, index) => {
                    const meta = metaById.get(id);
                    if (!meta) return null;
                    const decision = decisions.get(id);
                    const isSuggestedKeeper = id === group.keeperId;
                    const borderStyle =
                        decision === 'delete' ? styles.thumbDelete : decision === 'keep' ? styles.thumbKeep : styles.thumbUndecided;
                    return (
                        <Pressable
                            key={id}
                            onPress={() => onOpenGroup(group.id, index)}
                            style={[styles.thumbWrap, borderStyle]}
                            accessibilityLabel={
                                decision === 'delete'
                                    ? 'Marked for deletion, tap to review'
                                    : decision === 'keep'
                                      ? 'Marked to keep, tap to review'
                                      : 'Not yet reviewed, tap to review'
                            }
                        >
                            <Image
                                source={{ uri: meta.uri }}
                                style={[styles.thumb, decision === 'delete' && styles.thumbDimmed]}
                                contentFit="cover"
                            />
                            {isSuggestedKeeper && (
                                <View style={styles.suggestedBadge}>
                                    <Sparkles color={theme.colors.white} size={12} />
                                </View>
                            )}
                            {decision && (
                                <View style={[styles.badge, decision === 'delete' ? styles.badgeDelete : styles.badgeKeep]}>
                                    {decision === 'delete' ? (
                                        <Trash2 color={theme.colors.white} size={14} />
                                    ) : (
                                        <Check color={theme.colors.white} size={14} />
                                    )}
                                </View>
                            )}
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
};

/**
 * `assembleGroups` rebuilds a brand-new `DuplicateGroup` object on every
 * streamed snapshot, even for groups whose membership didn't change — so the
 * default reference-equality memo would re-render every row on every emit.
 * Compare by content instead: a row only needs to redraw when its own id,
 * membership, reason/keeper, or decisions actually changed.
 */
function areEqual(prev: GroupRowProps, next: GroupRowProps): boolean {
    if (prev.group.id !== next.group.id) return false;
    if (prev.group.reason !== next.group.reason) return false;
    if (prev.group.keeperId !== next.group.keeperId) return false;
    if (prev.decisions !== next.decisions) return false;
    if (prev.metaById !== next.metaById) return false;
    if (prev.onOpenGroup !== next.onOpenGroup) return false;
    if (prev.group.assetIds.length !== next.group.assetIds.length) return false;
    for (let i = 0; i < prev.group.assetIds.length; i++) {
        if (prev.group.assetIds[i] !== next.group.assetIds[i]) return false;
    }
    return true;
}

export const GroupRow = React.memo(GroupRowComponent, areEqual);

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.l,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        marginBottom: theme.spacing.s,
    },
    reason: {
        color: theme.colors.secondaryLabel,
    },
    deleteInfo: {
        color: theme.colors.delete,
    },
    strip: {
        paddingHorizontal: theme.spacing.l,
        gap: theme.spacing.s,
    },
    thumbWrap: {
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: theme.radii.m,
        overflow: 'hidden',
        borderWidth: 2,
    },
    thumbKeep: {
        borderColor: theme.colors.keep,
    },
    thumbDelete: {
        borderColor: theme.colors.delete,
    },
    thumbUndecided: {
        borderColor: theme.colors.separator,
    },
    thumb: {
        width: '100%',
        height: '100%',
    },
    thumbDimmed: {
        opacity: 0.45,
    },
    badge: {
        position: 'absolute',
        top: theme.spacing.xs,
        right: theme.spacing.xs,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeKeep: {
        backgroundColor: theme.colors.keep,
    },
    badgeDelete: {
        backgroundColor: theme.colors.delete,
    },
    /** Non-committal "algorithm suggests this one" hint — opposite corner from the status badge. */
    suggestedBadge: {
        position: 'absolute',
        top: theme.spacing.xs,
        left: theme.spacing.xs,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: theme.colors.systemBlue,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
