import { RefreshCw } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AssetMeta, DuplicateGroup } from '../../services/duplicates/types';
import { GlassButton } from '../../ui/glass/GlassButton';
import { Body, Caption, Title } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';
import { GroupRow } from './GroupRow';

interface GroupsReviewScreenProps {
    groups: DuplicateGroup[];
    metaById: Map<string, AssetMeta>;
    selection: Map<string, Set<string>>;
    deleteCount: number;
    onToggle: (groupId: string, assetId: string) => void;
    onDelete: () => void;
    onRescan: () => void;
}

export const GroupsReviewScreen: React.FC<GroupsReviewScreenProps> = ({
    groups,
    metaById,
    selection,
    deleteCount,
    onToggle,
    onDelete,
    onRescan,
}) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + theme.spacing.s }]}>
                <Title style={styles.title}>Duplicates</Title>
                <Pressable onPress={onRescan} style={styles.closeButton} accessibilityLabel="Rescan library">
                    <RefreshCw color={theme.colors.icon} size={22} />
                </Pressable>
            </View>

            {groups.length === 0 ? (
                <View style={styles.empty}>
                    <Title style={styles.emptyTitle}>No duplicates found</Title>
                    <Body style={styles.emptyBody}>Your library looks clean. Nothing to review.</Body>
                </View>
            ) : (
                <>
                    <Caption style={styles.subheader}>
                        {groups.length} {groups.length === 1 ? 'group' : 'groups'} found · tap a photo to keep or delete it
                    </Caption>
                    <ScrollView
                        contentContainerStyle={[
                            styles.list,
                            { paddingBottom: 112 },
                        ]}
                    >
                        {groups.map((group) => (
                            <GroupRow
                                key={group.id}
                                group={group}
                                metaById={metaById}
                                markedForDelete={selection.get(group.id) ?? new Set()}
                                onToggle={(assetId) => onToggle(group.id, assetId)}
                            />
                        ))}
                    </ScrollView>

                    <View style={[styles.footer, { paddingBottom: theme.spacing.m }]}>
                        <GlassButton
                            title={deleteCount > 0 ? `Delete selected (${deleteCount})` : 'Nothing selected'}
                            variant="delete"
                            size="large"
                            disabled={deleteCount === 0}
                            onPress={onDelete}
                            style={deleteCount === 0 ? styles.disabled : undefined}
                            accessibilityLabel="Delete selected photos"
                        />
                    </View>
                </>
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
    emptyBody: {
        color: theme.colors.secondaryLabel,
        textAlign: 'center',
        marginTop: theme.spacing.s,
    },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: theme.spacing.l,
        paddingTop: theme.spacing.m,
        backgroundColor: theme.colors.systemBackground,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.separator,
    },
    disabled: {
        opacity: 0.5,
    },
});
