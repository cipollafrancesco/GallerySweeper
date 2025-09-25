import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useModal } from '../../providers/ModalProvider';
import { GlassButton } from '../../ui/glass/GlassButton';
import { GlassCard } from '../../ui/glass/GlassCard';
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
            <Title>Reset reviewed photos?</Title>
            <Spacer size={theme.spacing.m} />
            <Body>
                This clears local references (Kept, To Delete, and progress). Your photos are not deleted. Next time you
                review, all photos will be shown.
            </Body>
            <Spacer size={theme.spacing.l} />
            <View style={styles.actions}>
                <GlassButton title="Cancel" onPress={hideModal} variant="undo" style={styles.button} />
                <Spacer size={theme.spacing.m} horizontal />
                <GlassButton
                    title="Reset"
                    onPress={onConfirm}
                    variant="delete"
                    style={styles.button}
                    accessibilityLabel="Confirm reset"
                />
            </View>
        </GlassCard>
    );
};

const styles = StyleSheet.create({
    card: {
        width: '100%',
        maxWidth: 400,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    button: {
        flex: 1,
    }
});
