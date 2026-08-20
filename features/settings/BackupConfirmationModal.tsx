import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useModal } from '../../providers/ModalProvider';
import type { BackupSummary } from '../../services/backup';
import { GlassCard } from '../../ui/glass/GlassCard';
import { DialogButton } from '../../ui/primitives/DialogButton';
import { Spacer } from '../../ui/primitives/Layout';
import { Body, Subtitle } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';

type Props = {
    summary: BackupSummary;
    onConfirm: () => void;
};

export const BackupConfirmationModal: React.FC<Props> = ({ summary, onConfirm }) => {
    const { hideModal } = useModal();
    const dupPart = summary.hasDuplicates ? ', plus your reviewed duplicates,' : '';

    return (
        <GlassCard style={styles.card}>
            <View style={styles.content}>
                <Subtitle>Restore from backup?</Subtitle>
                <Spacer size={theme.spacing.m} />
                <Body>
                    This replaces your current progress with {summary.reviewed} reviewed and {summary.marked} to-delete
                    photos{dupPart} from the backup. Your photos aren’t changed.
                </Body>
            </View>
            <View style={styles.actions}>
                <DialogButton title="Cancel" onPress={hideModal} isFirst />
                <DialogButton
                    title="Restore"
                    onPress={onConfirm}
                    variant="destructive"
                    accessibilityLabel="Confirm restore"
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
