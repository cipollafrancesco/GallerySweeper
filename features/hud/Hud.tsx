import { Check, Trash2, Undo2 } from 'lucide-react-native';
import React from 'react';
import { useQueue } from '../../domain/queueManager';
import * as haptics from '../../platform/haptics';
import { ActionBar } from '../../ui/glass/ActionBar';
import { ActionButton } from '../../ui/glass/ActionButton';
import { theme } from '../../ui/theme';
import { SwipeDeckRef } from '../deck/SwipeDeck';

// Per-card bottom action bar (Keep / Undo / Delete). The global "Undo All" /
// "Delete (N)" toolbar lives in the in-flow SweepHeader now, not here — see
// features/hud/SweepHeader.tsx.
export const Hud: React.FC<{ deckRef: React.RefObject<SwipeDeckRef | null> }> = ({ deckRef }) => {
    const { actionHistory, undo } = useQueue();

    const onKeep = () => deckRef.current?.swipeRight();
    const onDelete = () => deckRef.current?.swipeLeft();
    const onUndo = () => {
        haptics.selection();
        undo();
    };

    return (
        <ActionBar style={{ paddingBottom: theme.spacing.m }}>
            <ActionButton title="Keep" onPress={onKeep} variant="keep" icon={<Check color={theme.colors.keep} size={24} />} />
            <ActionButton
                title="Undo"
                onPress={onUndo}
                disabled={actionHistory.length === 0}
                variant="undo"
                icon={<Undo2 color={actionHistory.length === 0 ? theme.colors.quaternaryLabel : theme.colors.label} size={24} />}
            />
            <ActionButton title="Delete" onPress={onDelete} variant="delete" icon={<Trash2 color={theme.colors.delete} size={24} />} />
        </ActionBar>
    );
};
