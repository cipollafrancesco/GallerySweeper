import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const impact = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        return;
    }

    try {
        await Haptics.impactAsync(style);
    } catch (e) {
        // Ignore errors on unsupported devices
    }
};
