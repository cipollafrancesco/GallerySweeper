import { Linking, Platform } from 'react-native';

export const openPhotosSettings = () => {
    if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:photos');
    } else if (Platform.OS === 'android') {
        Linking.openSettings();
    }
};
