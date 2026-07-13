import { Settings } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { theme } from '../../ui/theme';

type Props = {
    onPress: () => void;
};

export const SettingsButton: React.FC<Props> = ({ onPress }) => {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.container, pressed && styles.pressed]}
            accessibilityLabel="Settings"
            accessibilityRole="button"
            accessibilityHint="Opens app settings"
            hitSlop={8}
        >
            <Settings color={theme.colors.white} size={24} />
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        width: theme.spacing.xxxl,
        height: theme.spacing.xxxl,
        borderRadius: theme.radii.m,
        backgroundColor: theme.colors.secondarySystemFill,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pressed: {
        opacity: 0.6,
    },
});
