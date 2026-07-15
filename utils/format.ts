// Pure display formatters — no RN/Expo imports, safe to unit test in isolation.

export const formatCount = (n: number): string => n.toLocaleString();

export const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    const formatted = value >= 100 ? Math.round(value).toString() : value.toFixed(1);
    return `${formatted} ${units[unitIndex]}`;
};
