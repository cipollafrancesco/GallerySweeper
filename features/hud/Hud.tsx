import { BlurView } from 'expo-blur';
import { Check, Trash2, Undo2 } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueue } from '../../domain/queueManager';
import { useModal } from '../../providers/ModalProvider';
import { GlassButton } from '../../ui/glass/GlassButton';
import { Spacer } from '../../ui/primitives/Layout';
import { Body, Title } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';
import { SwipeDeckRef } from '../deck/SwipeDeck';
import { SettingsButton } from '../settings/SettingsButton';
import { SettingsModal } from '../settings/SettingsModal';

export const Hud: React.FC<{ deckRef: React.RefObject<SwipeDeckRef> }> = ({ deckRef }) => {
    const {
        markedForDelete,
        lastAction,
        undo,
        commitDeletions,
        clearMarkedForDelete,
    } = useQueue();
    const insets = useSafeAreaInsets();
    const { showModal } = useModal();

    const hasPendingDeletions = markedForDelete.size > 0;

    const onKeep = () => deckRef.current?.swipeRight();
    const onDelete = () => deckRef.current?.swipeLeft();

    const onOpenSettings = () => {
        showModal(<SettingsModal />);
    };


    return (
        <View style={styles.container} pointerEvents="box-none">
            {/* Top Bar */}
            <View style={[styles.top, { paddingTop: insets.top || theme.spacing.m }]}>
                <View style={styles.topBar}>
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    {hasPendingDeletions ? (
                        <View style={styles.commitContent}>
                            <Body>{markedForDelete.size} items to delete</Body>
                            <View style={styles.commitActions}>
                                <GlassButton title="Clear" onPress={clearMarkedForDelete} variant="undo" />
                                <Spacer size={theme.spacing.s} horizontal />
                                <GlassButton title="Commit" onPress={commitDeletions} variant="delete" />
                            </View>
                        </View>
                    ) : (
                        <View style={styles.headerContent}>
                            <Title style={styles.title}>Gallery Cleanup</Title>
                        </View>
                    )}
                </View>
                <SettingsButton onPress={onOpenSettings} />
            </View>

            {/* Action Bar */}
            <View style={[styles.bottom, { paddingBottom: insets.bottom || theme.spacing.m }]}>
                <View style={styles.actionBar}>
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    <GlassButton title="Keep" onPress={onKeep} variant="keep">
                        <Check color={theme.colors.keep} size={28} />
                    </GlassButton>
                    <GlassButton title="Undo" onPress={undo} disabled={!lastAction} variant="undo">
                        <Undo2 color={theme.colors.undo} size={28} />
                    </GlassButton>
                    <GlassButton title="Delete" onPress={onDelete} variant="delete">
                        <Trash2 color={theme.colors.delete} size={28} />
                    </GlassButton>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    // Top Bar
    top: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: theme.spacing.m,
    },
    topBar: {
        borderRadius: theme.radii.m,
        overflow: 'hidden',
        borderColor: theme.colors.glassBorder,
        borderWidth: 1,
        marginTop: theme.spacing.s,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        padding: theme.spacing.m,
        alignItems: 'center',
        flex: 1,
    },
    title: {
        ...theme.typography.h2,
        color: theme.colors.secondary,
    },

    // Bottom Action Bar
    bottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: theme.spacing.m,
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: theme.spacing.m,
        backgroundColor: 'transparent',
        borderRadius: theme.radii.l,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        overflow: 'hidden',
    },
    commitContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
    },
    commitActions: {
        flexDirection: 'row',
    },
});
