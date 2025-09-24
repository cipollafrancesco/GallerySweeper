import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { useQueue } from '../../domain/queueManager';
import { useModal } from '../../providers/ModalProvider';
import { Onboarding } from './Onboarding';
import { OnboardingModal } from './OnboardingModal';

const ONBOARDING_MODAL_SHOWN_KEY = 'onboarding_modal_shown';

export const OverlayManager: React.FC = () => {
    const { access, queue } = useQueue();
    const { showModal, hideModal } = useModal();
    const [onboardingModalShown, setOnboardingModalShown] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            const hasBeenShown = false; // await AsyncStorage.getItem(ONBOARDING_MODAL_SHOWN_KEY);
            setOnboardingModalShown(!!hasBeenShown);
        };
        checkStatus();
    }, []);

    const handleOnboardingModalDismiss = () => {
        AsyncStorage.setItem(ONBOARDING_MODAL_SHOWN_KEY, 'true');
        setOnboardingModalShown(true);
        hideModal();
    };

    const showPermissionOnboarding = access !== 'all' && queue.length === 0;
    const showDeletionOnboarding = access === 'all' && !onboardingModalShown;

    useEffect(() => {
        if (showPermissionOnboarding) {
            showModal(<Onboarding />);
        } else if (showDeletionOnboarding) {
            showModal(<OnboardingModal onDismiss={handleOnboardingModalDismiss} />);
        } else {
            hideModal();
        }
    }, [showPermissionOnboarding, showDeletionOnboarding]);

    return null;
};
