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
        >
            <Settings color={theme.colors.icon} size={24} />
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pressed: {
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
});
