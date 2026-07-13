import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = () => Platform.OS === 'ios' || Platform.OS === 'android';

export const impact = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
    if (!supported()) {
        return;
    }

    try {
        await Haptics.impactAsync(style);
    } catch (e) {
        // Ignore errors on unsupported devices
    }
};

export const notification = async (
    type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success,
) => {
    if (!supported()) {
        return;
    }

    try {
        await Haptics.notificationAsync(type);
    } catch (e) {
        // Ignore errors on unsupported devices
    }
};

export const selection = async () => {
    if (!supported()) {
        return;
    }

    try {
        await Haptics.selectionAsync();
    } catch (e) {
        // Ignore errors on unsupported devices
    }
};

// Semantic helpers so feature code never has to import expo-haptics enums directly.
export const light = () => impact(Haptics.ImpactFeedbackStyle.Light);
export const medium = () => impact(Haptics.ImpactFeedbackStyle.Medium);
export const success = () => notification(Haptics.NotificationFeedbackType.Success);
export const warning = () => notification(Haptics.NotificationFeedbackType.Warning);
export const error = () => notification(Haptics.NotificationFeedbackType.Error);
