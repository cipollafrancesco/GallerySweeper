import React, { useEffect, useState } from 'react';
import { useQueue } from '../../domain/queueManager';
import { useModal } from '../../providers/ModalProvider';
import { storage } from '../../services/storage';
import { Onboarding } from './Onboarding';
import { OnboardingModal } from './OnboardingModal';

export const OverlayManager: React.FC = () => {
    const { access, queue, loading } = useQueue();
    const { showModal, hideModal } = useModal();
    const [onboardingModalShown, setOnboardingModalShown] = useState(false);
    const [isValidated, setIsValidated] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            const hasBeenShown = await storage.hasOnboardingBeenShown();
            setOnboardingModalShown(hasBeenShown);
            setIsValidated(true);
        };
        checkStatus();
    }, []);

    const handleOnboardingModalDismiss = async () => {
        await storage.setOnboardingShown();
        setOnboardingModalShown(true);
        hideModal();
    };

    // Simple strategy: only show permission onboarding for undetermined access
    // This covers the main use case where users need to grant initial permissions
    const shouldShowPermissionOnboarding = isValidated && access === 'undetermined' && queue.length === 0 && !loading;
    const shouldShowDeletionOnboarding = isValidated && access === 'all' && !onboardingModalShown && !loading;

    useEffect(() => {
        if (!isValidated) return;

        if (shouldShowPermissionOnboarding) {
            showModal(<Onboarding />, { type: 'dialog' });
        } else if (shouldShowDeletionOnboarding) {
            showModal(<OnboardingModal onDismiss={handleOnboardingModalDismiss} />, { type: 'custom' });
        } else {
            hideModal();
        }
    }, [shouldShowPermissionOnboarding, shouldShowDeletionOnboarding, isValidated]);

    return null;
};
