import { BlurView } from 'expo-blur';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../ui/theme';

const { height: screenHeight } = Dimensions.get('window');

// iOS-style instruction component
const Instruction: React.FC<{ icon: React.ElementType; text: string; color: string }> = ({ icon: Icon, text, color }) => (
    <View style={styles.instruction}>
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
            <Icon color={theme.colors.white} size={24} />
        </View>
        <Text style={styles.instructionText}>{text}</Text>
    </View>
);

interface OnboardingModalProps {
    onDismiss: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onDismiss }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            {/* Background Overlay */}
            <View style={styles.overlay} />

            {/* Modal Sheet */}
            <View style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing.xl }]}>
                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

                {/* Handle */}
                <View style={styles.handle} />

                {/* Content */}
                <View style={styles.content}>
                    <View>
                        <Text style={styles.title}>Welcome to Gallery Cleanup</Text>
                        <Text style={styles.subtitle}>Learn how to quickly organize your photos</Text>

                        <View style={styles.instructionsContainer}>
                            <Instruction
                                icon={ArrowRight}
                                text="Swipe right to Keep"
                                color={theme.colors.keep}
                            />
                            <Instruction
                                icon={ArrowLeft}
                                text="Swipe left to Mark for Delete"
                                color={theme.colors.delete}
                            />
                            <Instruction
                                icon={Check}
                                text="Commit deletions once to confirm in iOS"
                                color={theme.colors.systemBlue}
                            />
                        </View>
                    </View>

                    <View>
                        <Pressable style={styles.primaryButton} onPress={onDismiss}>
                            <Text style={styles.primaryButtonText}>Start Cleaning</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    sheet: {
        borderTopLeftRadius: theme.radii.l,
        borderTopRightRadius: theme.radii.l,
        overflow: 'hidden',
        minHeight: screenHeight * 0.5,
        maxHeight: screenHeight * 0.8,
        ...theme.shadows.large,
    },
    handle: {
        width: 36,
        height: 5,
        borderRadius: 3,
        backgroundColor: theme.colors.separator,
        alignSelf: 'center',
        marginTop: theme.spacing.s,
        marginBottom: theme.spacing.l,
    },
    content: {
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.l,
        flex: 1,
        justifyContent: 'space-between',
    },
    title: {
        ...theme.typography.title2,
        textAlign: 'center',
        marginBottom: theme.spacing.s,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.secondaryLabel,
        textAlign: 'center',
        marginBottom: theme.spacing.xxl,
    },
    instructionsContainer: {
        gap: theme.spacing.xl,
        marginBottom: theme.spacing.xxl,
    },
    instruction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.l,
    },
    iconContainer: {
        width: theme.spacing.xxxl,
        height: theme.spacing.xxxl,
        borderRadius: theme.radii.m,
        justifyContent: 'center',
        alignItems: 'center',
    },
    instructionText: {
        ...theme.typography.body,
        flex: 1,
    },
    primaryButton: {
        backgroundColor: theme.colors.systemBlue,
        borderRadius: theme.radii.l,
        paddingVertical: theme.spacing.l,
        paddingHorizontal: theme.spacing.xl,
        marginBottom: theme.spacing.xxl,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.small,
    },
    primaryButtonText: {
        ...theme.typography.headline,
        color: theme.colors.white,
        fontWeight: '600',
    },
});
