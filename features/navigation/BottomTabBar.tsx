import { BlurView } from 'expo-blur';
import { Layers, LayoutGrid } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as haptics from '../../platform/haptics';
import { Caption } from '../../ui/primitives/Typography';
import { theme } from '../../ui/theme';

export type TabKey = 'review' | 'duplicates';

const TABS: { key: TabKey; label: string; Icon: React.ComponentType<{ color: string; size: number }> }[] = [
    { key: 'review', label: 'Sweep', Icon: Layers },
    { key: 'duplicates', label: 'Duplicates', Icon: LayoutGrid },
];

interface BottomTabBarProps {
    active: TabKey;
    onChange: (tab: TabKey) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ active, onChange }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom || theme.spacing.s }]}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.row}>
                {TABS.map(({ key, label, Icon }) => {
                    const isActive = key === active;
                    const color = isActive ? theme.colors.systemBlue : theme.colors.secondaryLabel;
                    return (
                        <Pressable
                            key={key}
                            style={styles.item}
                            onPress={() => {
                                if (!isActive) {
                                    haptics.selection();
                                }
                                onChange(key);
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isActive }}
                            accessibilityLabel={label}
                        >
                            <Icon color={color} size={26} />
                            <Caption style={[styles.label, { color }]}>{label}</Caption>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.separator,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        paddingTop: theme.spacing.s,
    },
    item: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        paddingVertical: theme.spacing.xs,
        minHeight: 44,
    },
    label: {
        fontSize: 10,
        lineHeight: 13,
    },
});
