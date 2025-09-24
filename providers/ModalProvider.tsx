import React, { createContext, useContext, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

interface ModalContextType {
    showModal: (content: React.ReactNode) => void;
    hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [modalContent, setModalContent] = useState<React.ReactNode>(null);

    const showModal = (content: React.ReactNode) => {
        setModalContent(content);
        setModalVisible(true);
    };

    const hideModal = () => {
        setModalVisible(false);
        setModalContent(null);
    };

    return (
        <ModalContext.Provider value={{ showModal, hideModal }}>
            {children}
            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={hideModal}>
                <View style={styles.background} />
                <View style={styles.container} pointerEvents="box-none">
                    {modalContent}
                </View>
            </Modal>
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
