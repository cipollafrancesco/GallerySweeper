import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useQueue } from '../../domain/queueManager';
import * as SettingsLink from '../../platform/settingsLink';
import { GlassButton } from '../../ui/glass/GlassButton';
import { GlassCard } from '../../ui/glass/GlassCard';
import { GlassToast } from '../../ui/glass/GlassToast';
import { Center, Spacer } from '../../ui/primitives/Layout';
import { Body, Subtitle } from '../../ui/primitives/Typography';

export const Hud: React.FC = () => {
    const { kept, deleted, markedForDelete, lastAction, access, undo, commitDeletions, clearMarkedForDelete } = useQueue();

    const hasPendingDeletions = markedForDelete.size > 0;

    return (
        <View style={styles.container} pointerEvents="box-none">
            <View style={styles.top}>
                <GlassCard>
                    <Subtitle>Kept: {kept}</Subtitle>
                    <Spacer size={10} />
                    <Subtitle>To Delete: {markedForDelete.size}</Subtitle>
                    <Spacer size={10} />
                    <Subtitle>Deleted: {deleted}</Subtitle>
                </GlassCard>

                {access === 'limited' && (
                    <TouchableOpacity onPress={SettingsLink.openPhotosSettings}>
                        <GlassCard style={styles.banner}>
                            <Body>Limited Access: Tap to Fix</Body>
                        </GlassCard>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.bottom} pointerEvents="box-none">
                {hasPendingDeletions && (
                    <GlassCard style={styles.commitBar}>
                        <Center>
                            <Body>{markedForDelete.size} items ready to delete</Body>
                        </Center>
                        <Spacer size={15} />
                        <View style={styles.commitActions}>
                            <GlassButton title="Clear" onPress={clearMarkedForDelete} />
                            <Spacer size={15} horizontal />
                            <GlassButton title="Commit Deletes" onPress={commitDeletions} primary />
                        </View>
                    </GlassCard>
                )}
                {lastAction && (
                    <View style={styles.toast} pointerEvents="auto">
                        <GlassToast message="Action recorded. Tap to undo." onPress={undo} />
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        padding: 20,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    top: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
        marginTop: 40,
    },
    bottom: {
        width: '100%',
        alignItems: 'center',
    },
    banner: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    commitBar: {
        width: '100%',
        padding: 15,
        alignItems: 'center',
    },
    commitActions: {
        flexDirection: 'row',
        width: '100%',
    },
    toast: {
        marginTop: 20,
        alignSelf: 'center',
    },
});
