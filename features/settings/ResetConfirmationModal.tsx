import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useModal } from '../../providers/ModalProvider';
import { GlassCard } from '../../ui/glass/GlassCard';
import { DialogButton } from '../../ui/primitives/DialogButton';
import { Spacer } from '../../ui/primitives/Layout';
import { Body, Title } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';

type Props = {
    onConfirm: () => void;
};

export const ResetConfirmationModal: React.FC<Props> = ({ onConfirm }) => {
    const { hideModal } = useModal();

    return (
        <GlassCard style={styles.card}>
            <View style={styles.content}>
                <Title>Reset reviewed photos?</Title>
                <Spacer size={theme.spacing.m} />
                <Body>
                    This clears local references (Kept, To Delete, and progress). Your photos are not deleted. Next time you
                    review, all photos will be shown.
                </Body>
            </View>
            <View style={styles.actions}>
                <DialogButton title="Cancel" onPress={hideModal} isFirst />
                <DialogButton
                    title="Reset"
                    onPress={onConfirm}
                    variant="destructive"
                    accessibilityLabel="Confirm reset"
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
