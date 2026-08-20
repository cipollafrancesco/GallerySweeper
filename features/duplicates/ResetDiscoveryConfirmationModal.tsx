import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useModal } from '../../providers/ModalProvider';
import { GlassCard } from '../../ui/glass/GlassCard';
import { DialogButton } from '../../ui/primitives/DialogButton';
import { Spacer } from '../../ui/primitives/Layout';
import { Body, Subtitle } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';

type Props = {
    onConfirm: () => void;
};

export const ResetDiscoveryConfirmationModal: React.FC<Props> = ({ onConfirm }) => {
    const { hideModal } = useModal();

    return (
        <GlassCard style={styles.card}>
            <View style={styles.content}>
                <Subtitle>Restart discovery?</Subtitle>
                <Spacer size={theme.spacing.m} />
                <Body>
                    This clears the on-device scan cache and re-scans your entire library from
                    scratch, including photos already analyzed. It can take longer than a normal
                    rescan. Your photo tags for this review session will be cleared — no photos
                    are deleted.
                </Body>
            </View>
            <View style={styles.actions}>
                <DialogButton title="Cancel" onPress={hideModal} isFirst />
                <DialogButton
                    title="Restart"
                    onPress={onConfirm}
                    variant="destructive"
                    accessibilityLabel="Confirm restart duplicate discovery"
                    isLast
                />
            </View>
        </GlassCard>
    );
};

const styles = StyleSheet.create({
    card: {
        maxWidth: 320,
        padding: 0,
        paddingTop: theme.spacing.l,
    },
    content: {
        paddingHorizontal: theme.spacing.l,
        paddingBottom: theme.spacing.l,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.separator,
    },
});
