import { Image } from 'expo-image';
import { Check, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { AssetMeta, DuplicateGroup } from '../../services/duplicates/types';
import { Caption } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';

const THUMB_SIZE = 104;

interface GroupRowProps {
    group: DuplicateGroup;
    metaById: Map<string, AssetMeta>;
    markedForDelete: Set<string>;
    onToggle: (assetId: string) => void;
}

export const GroupRow: React.FC<GroupRowProps> = ({ group, metaById, markedForDelete, onToggle }) => {
    const deleteCount = group.assetIds.filter((id) => markedForDelete.has(id)).length;
    const reasonLabel = group.reason === 'near-dup' ? 'Near-duplicates' : 'Similar shots';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Caption style={styles.reason}>
                    {reasonLabel} · {group.assetIds.length} photos
                </Caption>
                {deleteCount > 0 && <Caption style={styles.deleteInfo}>{deleteCount} to delete</Caption>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
                {group.assetIds.map((id) => {
                    const meta = metaById.get(id);
                    if (!meta) return null;
                    const marked = markedForDelete.has(id);
                    return (
                        <Pressable
                            key={id}
                            onPress={() => onToggle(id)}
                            style={[styles.thumbWrap, marked ? styles.thumbDelete : styles.thumbKeep]}
                            accessibilityLabel={marked ? 'Marked for deletion, tap to keep' : 'Kept, tap to mark for deletion'}
                        >
                            <Image source={{ uri: meta.uri }} style={[styles.thumb, marked && styles.thumbDimmed]} contentFit="cover" />
                            <View style={[styles.badge, marked ? styles.badgeDelete : styles.badgeKeep]}>
                                {marked ? (
                                    <Trash2 color={theme.colors.white} size={14} />
                                ) : (
                                    <Check color={theme.colors.white} size={14} />
                                )}
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
};

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
});
