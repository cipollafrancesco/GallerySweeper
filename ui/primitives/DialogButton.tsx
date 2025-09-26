import React from 'react';
import { Pressable, PressableProps, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

interface DialogButtonProps extends PressableProps {
    title: string;
    variant?: 'default' | 'destructive';
    isFirst?: boolean;
    isLast?: boolean;
}

export const DialogButton: React.FC<DialogButtonProps> = ({
    title,
    variant = 'default',
    isFirst = false,
    isLast = false,
    ...props
}) => {
    return (
        <Pressable style={styles.pressable} {...props}>
            {({ pressed }) => (
                <View
                    style={[
                        styles.container,
                        isFirst && styles.isFirst,
                        isLast && styles.isLast,
                        pressed && styles.pressed,
                    ]}
                >
                    <Text
                        style={[
                            styles.text,
                            variant === 'destructive' && styles.destructiveText,
                        ]}
                    >
                        {title}
                    </Text>
                </View>
            )}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    pressable: {
        flex: 1,
    },
    container: {
        padding: theme.spacing.m,
        alignItems: 'center',
        justifyContent: 'center',
        borderLeftWidth: StyleSheet.hairlineWidth,
        borderLeftColor: theme.colors.separator,
    },
    isFirst: {
        borderLeftWidth: 0,
    },
    isLast: {
        borderRightWidth: 0,
    },
    pressed: {
        backgroundColor: theme.colors.tertiarySystemFill,
    },
    text: {
        ...theme.typography.body,
        color: theme.colors.white,
        fontWeight: '600',
    },
    destructiveText: {
        color: theme.colors.delete,
    },
});
