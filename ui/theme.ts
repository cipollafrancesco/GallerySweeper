export const colors = {
    // iOS System Colors (Dark Mode)
    keep: '#32D74B', // Brighter Green for Dark Mode
    keepFaded: 'rgba(50, 215, 75, 0.35)', // Increased opacity for better visibility
    delete: '#FF453A', // Brighter Red for Dark Mode
    deleteFaded: 'rgba(255, 69, 58, 0.35)', // Increased opacity for better visibility
    undo: '#8E8E93', // iOS System Gray (same as light)
    undoFaded: 'rgba(142, 142, 147, 0.15)',

    // iOS System Colors (Dark Mode)
    systemBlue: '#0A84FF',
    systemIndigo: '#5E5CE6',
    systemPurple: '#BF5AF2',
    systemTeal: '#64D2FF',
    systemCyan: '#70D7FF',
    systemMint: '#66D4CF',
    systemOrange: '#FF9F0A',
    systemYellow: '#FFD60A',
    systemPink: '#FF375F',

    // iOS Text Colors (Dark Mode)
    label: '#FFFFFF', // Primary text in dark mode
    secondaryLabel: 'rgba(235, 235, 245, 0.6)', // Secondary text
    tertiaryLabel: 'rgba(235, 235, 245, 0.3)', // Tertiary text
    quaternaryLabel: 'rgba(235, 235, 245, 0.18)', // Quaternary text

    // iOS Background Colors (Dark Mode)
    systemBackground: '#000000', // Primary background
    secondarySystemBackground: '#1C1C1E', // Secondary background
    tertiarySystemBackground: '#2C2C2E', // Tertiary background

    // iOS Fill Colors (Dark Mode)
    systemFill: 'rgba(120, 120, 128, 0.36)',
    secondarySystemFill: 'rgba(120, 120, 128, 0.32)',
    tertiarySystemFill: 'rgba(118, 118, 128, 0.24)',
    quaternarySystemFill: 'rgba(116, 116, 128, 0.18)',

    // iOS Grouped Background Colors (Dark Mode)
    systemGroupedBackground: '#000000',
    secondarySystemGroupedBackground: '#1C1C1E',
    tertiarySystemGroupedBackground: '#2C2C2E',

    // iOS Separator Colors (Dark Mode)
    separator: 'rgba(84, 84, 88, 0.6)',
    opaqueSeparator: '#38383A',

    // Material Colors for Blur Effects (Dark Mode)
    materialRegular: 'rgba(30, 30, 30, 0.8)',
    materialThick: 'rgba(30, 30, 30, 0.9)',
    materialThin: 'rgba(30, 30, 30, 0.7)',
    materialUltraThin: 'rgba(30, 30, 30, 0.5)',

    // Legacy aliases for backward compatibility
    primary: '#FFFFFF',
    secondary: 'rgba(235, 235, 245, 0.6)',
    tertiary: 'rgba(235, 235, 245, 0.3)',
    icon: 'rgba(235, 235, 245, 0.8)',

    // Background gradient for a subtle dark effect
    backgroundStart: '#1A1A1C',
    backgroundEnd: '#000000',

    white: '#FFFFFF',
    black: '#000000',

    // Glass effect colors - updated for dark theme
    glassBg: 'rgba(44, 44, 46, 0.8)',
    glassBorder: 'rgba(84, 84, 88, 0.6)',
};

export const typography = {
    // iOS Large Title
    largeTitle: {
        fontSize: 34,
        fontWeight: '700' as const, // Bold
        color: colors.label,
        fontFamily: 'SF Pro Display',
        lineHeight: 41,
    },
    // iOS Title 1
    title1: {
        fontSize: 28,
        fontWeight: '400' as const, // Regular
        color: colors.label,
        fontFamily: 'SF Pro Display',
        lineHeight: 34,
    },
    // iOS Title 2
    title2: {
        fontSize: 22,
        fontWeight: '700' as const, // Bold
        color: colors.label,
        fontFamily: 'SF Pro Text',
        lineHeight: 28,
    },
    // iOS Title 3
    title3: {
        fontSize: 20,
        fontWeight: '400' as const, // Regular
        color: colors.label,
        fontFamily: 'SF Pro Text',
        lineHeight: 25,
    },
    // iOS Headline
    headline: {
        fontSize: 17,
        fontWeight: '600' as const, // Semibold
        color: colors.label,
        fontFamily: 'SF Pro Text',
        lineHeight: 22,
    },
    // iOS Body
    body: {
        fontSize: 17,
        fontWeight: '400' as const, // Regular
        color: colors.label,
        fontFamily: 'SF Pro Text',
        lineHeight: 22,
    },
    // iOS Callout
    callout: {
        fontSize: 16,
        fontWeight: '400' as const, // Regular
        color: colors.label,
        fontFamily: 'SF Pro Text',
        lineHeight: 21,
    },
    // iOS Subheadline
    subheadline: {
        fontSize: 15,
        fontWeight: '400' as const, // Regular
        color: colors.label,
        fontFamily: 'SF Pro Text',
        lineHeight: 20,
    },
    // iOS Footnote
    footnote: {
        fontSize: 13,
        fontWeight: '400' as const, // Regular
        color: colors.label,
        fontFamily: 'SF Pro Text',
        lineHeight: 18,
    },
    // iOS Caption 1
    caption1: {
        fontSize: 12,
        fontWeight: '400' as const, // Regular
        color: colors.label,
        fontFamily: 'SF Pro Text',
        lineHeight: 16,
    },
    // iOS Caption 2
    caption2: {
        fontSize: 11,
        fontWeight: '400' as const, // Regular
        color: colors.label,
        fontFamily: 'SF Pro Text',
        lineHeight: 13,
    },
    // Legacy aliases for backward compatibility
    h1: {
        fontSize: 34,
        fontWeight: '700' as const,
        color: colors.label,
        fontFamily: 'SF Pro Display',
        lineHeight: 41,
    },
    h2: {
        fontSize: 22,
        fontWeight: '700' as const,
        color: colors.label,
        fontFamily: 'SF Pro Text',
        lineHeight: 28,
    },
    button: {
        fontSize: 17,
        fontWeight: '600' as const, // Semibold
        color: colors.systemBlue,
        fontFamily: 'SF Pro Text',
        lineHeight: 22,
    },
    caption: {
        fontSize: 12,
        fontWeight: '400' as const,
        color: colors.secondaryLabel,
        fontFamily: 'SF Pro Text',
        lineHeight: 16,
    },
    label: {
        fontSize: 17,
        fontWeight: '600' as const,
        color: colors.label,
        fontFamily: 'SF Pro Text',
        lineHeight: 22,
    },
};

export const spacing = {
    // iOS spacing values
    xs: 4,
    s: 8,
    m: 16,
    l: 20,
    xl: 24,
    xxl: 32,
    xxxl: 44, // Minimum touch target
};

export const radii = {
    // iOS corner radius values
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 20,
    xxl: 24,
    pill: 999, // For pill-shaped buttons
};

export const shadows = {
    // iOS-style shadows - more subtle
    none: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    subtle: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 8,
    },
};

export const theme = {
    colors,
    typography,
    spacing,
    radii,
    shadows,
};

export default theme;
