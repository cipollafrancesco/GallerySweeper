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

    // Show the permission overlay whenever we don't have usable photo access:
    // 'undetermined' (needs the initial prompt), 'limited' (needs Full Access for
    // one-tap deletion) and 'none' (denied). The Onboarding component renders the
    // right copy + "Open Settings" path per state; without this, limited/denied
    // users fall through to the misleading "No more photos to review" empty deck.
    const needsPermission = access === 'undetermined' || access === 'limited' || access === 'none';
    const shouldShowPermissionOnboarding = isValidated && needsPermission && queue.length === 0 && !loading;
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
