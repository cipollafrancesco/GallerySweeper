import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { GlassToast } from '../ui/glass/GlassToast';

interface ModalContextType {
    showModal: (content: React.ReactNode) => void;
    hideModal: () => void;
    showToast: (message: string, variant?: 'success' | 'error') => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [modalContent, setModalContent] = useState<React.ReactNode>(null);
    const [toastConfig, setToastConfig] = useState<{ message: string; variant: 'success' | 'error', key: number } | null>(null);


    const showModal = (content: React.ReactNode) => {
        setModalContent(content);
        setModalVisible(true);
    };

    const hideModal = () => {
        setModalVisible(false);
        setModalContent(null);
    };

    const showToast = useCallback((message: string, variant: 'success' | 'error' = 'success') => {
        setToastConfig({ message, variant, key: Date.now() });
    }, []);

    const hideToast = () => {
        setToastConfig(null);
    };

    return (
        <ModalContext.Provider value={{ showModal, hideModal, showToast }}>
            {children}
            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={hideModal}>
                <View style={styles.background} />
                <View style={styles.container} pointerEvents="box-none">
                    {modalContent}
                </View>
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
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
});
