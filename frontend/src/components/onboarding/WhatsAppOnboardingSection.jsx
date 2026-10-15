'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '@/lib/api';
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
import WhatsAppSetupHero from './WhatsAppSetupHero';
import WhatsAppSetupChecklist from './WhatsAppSetupChecklist';
import TwoFactorModal from './TwoFactorModal';
import BusinessVerificationModal from './BusinessVerificationModal';

export default function WhatsAppOnboardingSection({
  workspaceId,
  onStatusChange,
}) {
  const [onboardingData, setOnboardingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHeroDismissed, setIsHeroDismissed] = useState(false);

  const [isStep2ModalOpen, setIsStep2ModalOpen] = useState(false);
  const [isStep3ModalOpen, setIsStep3ModalOpen] = useState(false);

  const fetchStatus = useCallback(async (silent = false) => {
    if (!workspaceId) return;
    if (!silent) setLoading(true);
    try {
      const data = await api.getOnboardingStatus(workspaceId);
      setOnboardingData(data);
      setIsHeroDismissed(Boolean(data?.onboarding_dismissed));
      if (onStatusChange) {
        onStatusChange({
          isActive: !data?.onboarding_completed,
          isCompleted: Boolean(data?.onboarding_completed),
          data,
        });
      }
    } catch (err) {
      console.warn('Failed to load onboarding status:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [workspaceId, onStatusChange]);

  const { isConnecting, startWhatsAppSignup } = useWhatsAppConnection({
    workspaceId,
    onSuccess: () => {
      fetchStatus(true);
    },
  });

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Listen for visibility and channel status changes
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus(true);
      }
    };

    const handleChannelChange = () => {
      fetchStatus(true);
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('channel-status-changed', handleChannelChange);
    window.addEventListener('onboarding-status-changed', handleChannelChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('channel-status-changed', handleChannelChange);
      window.removeEventListener('onboarding-status-changed', handleChannelChange);
    };
  }, [fetchStatus]);

  const handleDismissHero = async () => {
    setIsHeroDismissed(true);
    try {
      await api.dismissOnboarding(workspaceId, true);
    } catch (e) {
      console.warn('Failed to persist onboarding dismissal:', e);
    }
  };

  const handleReopenHero = async () => {
    setIsHeroDismissed(false);
    try {
      await api.dismissOnboarding(workspaceId, false);
    } catch (e) {
      console.warn('Failed to persist onboarding reopen:', e);
    }
  };

  const handleModalStatusUpdated = (updatedStatus) => {
    setOnboardingData((prev) => ({
      ...prev,
      ...updatedStatus,
    }));
    if (onStatusChange) {
      onStatusChange({
        isActive: !updatedStatus?.onboarding_completed,
        isCompleted: Boolean(updatedStatus?.onboarding_completed),
        data: updatedStatus,
      });
    }
  };

  // If loading and no previous data, render invisible spacer to prevent flicker
  if (loading && !onboardingData) {
    return (
      <div className="w-full h-36 rounded-2xl bg-white/[0.02] border border-white/[0.05] animate-pulse" />
    );
  }

  // 1. If all 3 steps are complete: Completely hide onboarding UI
  if (onboardingData?.onboarding_completed) {
    return null;
  }

  const isWhatsAppConnected = Boolean(onboardingData?.whatsapp_connected);

  return (
    <>
      <div className="w-full">
        <AnimatePresence mode="wait">
          {/* STATE A: WhatsApp NOT Connected yet */}
          {!isWhatsAppConnected && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5 items-stretch">
              {/* If NOT dismissed: Large Hero Card takes 2/3 width */}
              {!isHeroDismissed && (
                <div className="xl:col-span-2">
                  <WhatsAppSetupHero
                    onboardingData={onboardingData}
                    onConnectWhatsApp={startWhatsAppSignup}
                    isConnectingWhatsApp={isConnecting}
                    onDismiss={handleDismissHero}
                    onOpenStep2={() => setIsStep2ModalOpen(true)}
                    onOpenStep3={() => setIsStep3ModalOpen(true)}
                  />
                </div>
              )}

              {/* Compact Checklist Card takes 1/3 width, or full width if hero dismissed */}
              <div className={!isHeroDismissed ? 'xl:col-span-1 h-full' : 'xl:col-span-3'}>
                <WhatsAppSetupChecklist
                  onboardingData={onboardingData}
                  onOpenStep1={startWhatsAppSignup}
                  onOpenStep2={() => setIsStep2ModalOpen(true)}
                  onOpenStep3={() => setIsStep3ModalOpen(true)}
                  isHeroDismissed={isHeroDismissed}
                  onReopenHero={handleReopenHero}
                />
              </div>
            </div>
          )}

          {/* STATE B: WhatsApp IS Connected, but Step 2 or Step 3 is incomplete */}
          {isWhatsAppConnected && (
            <div className="w-full">
              <WhatsAppSetupChecklist
                onboardingData={onboardingData}
                onOpenStep1={startWhatsAppSignup}
                onOpenStep2={() => setIsStep2ModalOpen(true)}
                onOpenStep3={() => setIsStep3ModalOpen(true)}
                isHeroDismissed={true}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Step 2 Modal */}
      <TwoFactorModal
        isOpen={isStep2ModalOpen}
        onClose={() => setIsStep2ModalOpen(false)}
        workspaceId={workspaceId}
        isCompleted={Boolean(onboardingData?.two_factor_enabled)}
        onStatusUpdated={handleModalStatusUpdated}
      />

      {/* Step 3 Modal */}
      <BusinessVerificationModal
        isOpen={isStep3ModalOpen}
        onClose={() => setIsStep3ModalOpen(false)}
        workspaceId={workspaceId}
        currentStatus={onboardingData?.business_verification_status || 'not_verified'}
        onStatusUpdated={handleModalStatusUpdated}
      />
    </>
  );
}
