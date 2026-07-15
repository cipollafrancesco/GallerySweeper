import React from 'react';
import { Pressable, PressableProps, StyleSheet } from 'react-native';

interface HeaderIconButtonProps extends Omit<PressableProps, 'style' | 'children'> {
    icon: React.ReactNode;
    accessibilityLabel: string;
}

/**
 * Shared bare (no fill) icon button for screen-header utility actions — used by
 * both Sweep (Settings) and Duplicates (Rescan/Stop, Reset, Settings) so every
 * header icon across the app looks and behaves the same. `hitSlop` extends the
 * tappable area invisibly rather than growing the icon's own layout box (22pt
 * icon + 12pt hitSlop on each side ≈ Apple's 44pt minimum touch target), and
 * the dim + slight scale on press supplies the tactile feedback a bare icon
 * has no background to otherwise convey.
 *
 * When placing more than one of these in a row, the row's gap must be at
 * least 2×hitSlop (24) or adjacent hitSlop zones overlap and a tap near the
 * boundary can register on the wrong icon — see `headerActions` in
 * GroupsReviewScreen.tsx.
 */
export const HeaderIconButton: React.FC<HeaderIconButtonProps> = ({ icon, ...props }) => (
    <Pressable
        {...props}
        style={({ pressed }) => [styles.container, pressed && styles.pressed]}
        accessibilityRole="button"
        hitSlop={12}
    >
        {icon}
    </Pressable>
);

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    pressed: {
        opacity: 0.4,
        transform: [{ scale: 0.96 }],
    },
});
