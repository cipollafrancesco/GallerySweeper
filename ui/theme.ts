export const colors = {
    keep: 'rgba(49, 191, 124, 1)',
    keepFaded: 'rgba(49, 191, 124, 0.2)',
    delete: 'rgba(252, 92, 84, 1)',
    deleteFaded: 'rgba(252, 92, 84, 0.2)',
    undo: 'rgba(150, 150, 150, 1)',
    icon: 'rgba(255, 255, 255, 0.9)',

    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',

    backgroundStart: '#263238', // Dark Slate Gray
    backgroundEnd: '#1a202c', // Darker Slate

    white: '#FFFFFF',
    black: '#000000',

    glassBg: 'rgba(255, 255, 255, 0.1)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',
};

export const typography = {
    h1: {
        fontSize: 28,
        fontWeight: '700' as const,
        color: colors.primary,
        fontFamily: 'System',
    },
    h2: {
        fontSize: 22,
        fontWeight: '600' as const,
        color: colors.primary,
        fontFamily: 'System',
    },
    body: {
        fontSize: 16,
        fontWeight: '400' as const,
        color: colors.secondary,
        fontFamily: 'System',
    },
    button: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: colors.primary,
        fontFamily: 'System',
    },
    caption: {
        fontSize: 12,
        fontWeight: '500' as const,
        color: colors.tertiary,
        fontFamily: 'System',
    },
    label: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: colors.primary,
        fontFamily: 'System',
        textTransform: 'uppercase' as const,
        letterSpacing: 1.2,
    },
};

export const spacing = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 40,
};

export const radii = {
    s: 4,
    m: 12,
    l: 24,
    xl: 40,
};

export const shadows = {
    subtle: {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 5,
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
