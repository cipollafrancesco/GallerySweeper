import { Settings } from 'lucide-react-native';
import React from 'react';
import { HeaderIconButton } from '../../ui/primitives/HeaderIconButton';
import { theme } from '../../ui/theme';

type Props = {
    onPress: () => void;
};

export const SettingsButton: React.FC<Props> = ({ onPress }) => (
    <HeaderIconButton
        onPress={onPress}
        accessibilityLabel="Settings"
        accessibilityHint="Opens app settings"
        icon={<Settings color={theme.colors.icon} size={22} />}
    />
);
