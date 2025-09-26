import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { GlassToast } from '../ui/glass/GlassToast';

interface ModalRecord {
    id: string;
    content: React.ReactNode;
    type: 'dialog' | 'custom';
}

interface ModalContextType {
    showModal: (content: React.ReactNode, options?: { type: 'dialog' | 'custom' }) => void;
    hideModal: () => void;
    hideAllModals: () => void;
    showToast: (message: string, variant?: 'success' | 'error') => void;
    isModalOpen: boolean;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [modalStack, setModalStack] = useState<ModalRecord[]>([]);
    const [toastConfig, setToastConfig] = useState<{ message: string; variant: 'success' | 'error', key: number } | null>(null);

    // Get the topmost modal to display
    const topModal = modalStack[modalStack.length - 1];

    const showModal = useCallback((content: React.ReactNode, options?: { type: 'dialog' | 'custom' }) => {
        const newModal: ModalRecord = {
            id: `modal-${Date.now()}-${Math.random()}`, // Simple unique ID
            content,
            type: options?.type || 'custom',
        };
        setModalStack(prev => [...prev, newModal]); // Add to stack
    }, []);

    const hideModal = useCallback(() => {
        setModalStack(prev => prev.slice(0, -1)); // Remove top modal from stack
    }, []);

    const hideAllModals = useCallback(() => {
        setModalStack([]); // Clear entire stack
    }, []);

    const showToast = useCallback((message: string, variant: 'success' | 'error' = 'success') => {
        setToastConfig({ message, variant, key: Date.now() });
    }, []);

    const hideToast = () => {
        setToastConfig(null);
    };

    return (
        <ModalContext.Provider value={{ showModal, hideModal, hideAllModals, showToast, isModalOpen: modalStack.length > 0 }}>
            {children}
            <Modal
                visible={!!topModal}
                transparent
                animationType="fade"
                onRequestClose={hideModal}
            >
                <View style={styles.background} />
                {topModal && (
                    topModal.type === 'dialog' ? (
                        <View style={styles.dialogContainer} pointerEvents="box-none">
                            {topModal.content}
                        </View>
                    ) : (
                        <View style={styles.customContainer} pointerEvents="box-none">
                            {topModal.content}
                        </View>
                    )
                )}
            </Modal>
            {toastConfig && (
                <GlassToast
                    key={toastConfig.key}
                    message={toastConfig.message}
                    visible={!!toastConfig}
                    onDismiss={hideToast}
                    variant={toastConfig.variant}
                />
            )}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

const styles = StyleSheet.create({
    background: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    dialogContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    customContainer: {
        ...StyleSheet.absoluteFillObject,
    },
});
