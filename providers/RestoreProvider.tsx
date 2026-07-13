/**
 * A tiny app-wide signal that a backup was just restored to disk, so the live UI
 * can reload from storage. `SettingsModal` (rendered inside the modal layer, above
 * `QueueProvider`) can't reach the queue directly, and `DuplicatesScreen` stays
 * mounted and only reads its cache on first scan — so restore bumps `restoreNonce`
 * here and the components that CAN reload (AppContent's sweep queue, DuplicatesScreen's
 * results cache) react to it. Placed above `ModalProvider` so modal content can call
 * `requestRestore`, and above `QueueProvider` so the consumers can too.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface RestoreContextType {
    /** Increments each time a backup is restored. Consumers reload when it changes. */
    restoreNonce: number;
    requestRestore: () => void;
}

const RestoreContext = createContext<RestoreContextType | undefined>(undefined);

export const RestoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [restoreNonce, setRestoreNonce] = useState(0);
    const requestRestore = useCallback(() => setRestoreNonce((n) => n + 1), []);
    const value = useMemo(() => ({ restoreNonce, requestRestore }), [restoreNonce, requestRestore]);
    return <RestoreContext.Provider value={value}>{children}</RestoreContext.Provider>;
};

export const useRestore = () => {
    const context = useContext(RestoreContext);
    if (!context) {
        throw new Error('useRestore must be used within a RestoreProvider');
    }
    return context;
};
