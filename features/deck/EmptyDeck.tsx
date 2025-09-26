import { Image as ImageIcon, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../ui/theme';

interface EmptyDeckProps {
    onRefresh: () => void;
}

export const EmptyDeck: React.FC<EmptyDeckProps> = ({ onRefresh }) => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* SF Symbol-style icon */}
                <View style={styles.iconContainer}>
                    <ImageIcon size={64} color={theme.colors.tertiaryLabel} strokeWidth={1} />
                </View>

                <Text style={styles.title}>No more photos to review</Text>
                <Text style={styles.subtitle}>You've reviewed all available photos in your library.</Text>

                <Pressable style={styles.refreshButton} onPress={onRefresh}>
                    <RefreshCw size={20} color={theme.colors.systemBlue} />
                    <Text style={styles.refreshButtonText}>Refresh</Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
    },
    content: {
        alignItems: 'center',
        maxWidth: 300,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.tertiarySystemBackground,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    title: {
        ...theme.typography.title3,
        textAlign: 'center',
        marginBottom: theme.spacing.m,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.secondaryLabel,
        textAlign: 'center',
        marginBottom: theme.spacing.xxl,
        lineHeight: 22,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.secondarySystemFill,
        paddingVertical: theme.spacing.m,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.radii.pill,
        gap: theme.spacing.s,
        minWidth: 120,
    },
    refreshButtonText: {
        ...theme.typography.headline,
        color: theme.colors.systemBlue,
        fontWeight: '600',
    },
});
