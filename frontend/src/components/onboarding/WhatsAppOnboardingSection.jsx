'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '@/lib/api';
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
import { useWorkspaceEntitlements } from '@/hooks/useWorkspaceEntitlements';
import WhatsAppSetupHero from './WhatsAppSetupHero';
import WhatsAppSetupChecklist from './WhatsAppSetupChecklist';
import InstagramSetupHero from './InstagramSetupHero';
import InstagramSetupChecklist from './InstagramSetupChecklist';
import PlanLockedOnboardingHero from './PlanLockedOnboardingHero';
import TwoFactorModal from './TwoFactorModal';
import BusinessVerificationModal from './BusinessVerificationModal';

export default function WhatsAppOnboardingSection({
  workspaceId,
  onStatusChange,
  isForceOpen = false,
  onToggleOpen,
}) {
  const { allowedChannels, planName, loading: entLoading } = useWorkspaceEntitlements(workspaceId);
  const [onboardingData, setOnboardingData] = useState(null);
  const [channelsStatus, setChannelsStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHeroDismissed, setIsHeroDismissed] = useState(false);

  const [isStep2ModalOpen, setIsStep2ModalOpen] = useState(false);
  const [isStep3ModalOpen, setIsStep3ModalOpen] = useState(false);

  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const isFetchingRef = useRef(false);

  const isCreatorPlan = allowedChannels.length === 1 && allowedChannels[0] === 'instagram';
  const hasNoChannels = allowedChannels.length === 0;

  const fetchStatus = useCallback(async (silent = false) => {
    if (!workspaceId) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [onboardRes, channelRes] = await Promise.allSettled([
        api.getOnboardingStatus(workspaceId),
        api.getChannelsStatus ? api.getChannelsStatus(workspaceId) : api.getIntegrationStatus(),
      ]);

      const data = onboardRes.status === 'fulfilled' ? onboardRes.value : null;
      const cStatus = channelRes.status === 'fulfilled' ? channelRes.value : null;
      if (cStatus) setChannelsStatus(cStatus);

      const isLocalConnected = typeof window !== 'undefined' && localStorage.getItem('whatsapp_connected') === 'true';
      if (data && !data.whatsapp_connected && isLocalConnected) {
        data.whatsapp_connected = true;
        if (data.steps?.step_1) {
          data.steps.step_1.completed = true;
          data.steps.step_1.status = 'completed';
          data.steps.step_1.status_label = 'WhatsApp Business connected';
        }
        const cCount = 1 + (data.two_factor_enabled ? 1 : 0) + (data.business_verification_status === 'verified' ? 1 : 0);
        data.completed_count = cCount;
        data.progress_percentage = Math.round((cCount / 3) * 100);
      }

      setOnboardingData(data);
      setIsHeroDismissed(Boolean(data?.onboarding_dismissed));

      if (onStatusChangeRef.current) {
        const isIgConnected = Boolean(cStatus?.instagram?.connected) || (typeof window !== 'undefined' && localStorage.getItem('instagram_connected') === 'true');
        const isAnyConnected = Boolean(data?.whatsapp_connected) || isLocalConnected || isIgConnected;
        
        onStatusChangeRef.current({
          isActive: isCreatorPlan ? !isIgConnected : !data?.onboarding_completed,
          isCompleted: isCreatorPlan ? isIgConnected : Boolean(data?.onboarding_completed),
          data: {
            ...data,
            isCreatorPlan,
            isIgConnected,
            isAnyConnected,
          },
        });
      }
    } catch (err) {
      console.warn('Failed to load onboarding status:', err);
    } finally {
      isFetchingRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [workspaceId, isCreatorPlan]);

  const handleSuccess = useCallback(() => {
    fetchStatus(true);
  }, [fetchStatus]);

  const { isConnecting, startWhatsAppSignup } = useWhatsAppConnection({
    workspaceId,
    onSuccess: handleSuccess,
  });

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    let lastFetch = 0;
    const throttledFetch = () => {
      const now = Date.now();
      if (now - lastFetch < 1500) return;
      lastFetch = now;
      fetchStatus(true);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        throttledFetch();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('channel-status-changed', throttledFetch);
    window.addEventListener('onboarding-status-changed', throttledFetch);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('channel-status-changed', throttledFetch);
      window.removeEventListener('onboarding-status-changed', throttledFetch);
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
    if (onStatusChangeRef.current) {
      onStatusChangeRef.current({
        isActive: !updatedStatus?.onboarding_completed,
        isCompleted: Boolean(updatedStatus?.onboarding_completed),
        data: updatedStatus,
      });
    }
  };

  const isLocalConnected = typeof window !== 'undefined' && localStorage.getItem('whatsapp_connected') === 'true';
  const isWhatsAppConnected = Boolean(onboardingData?.whatsapp_connected) || isLocalConnected;

  const isIgConnected = Boolean(channelsStatus?.instagram?.connected) || (typeof window !== 'undefined' && localStorage.getItem('instagram_connected') === 'true');
  const igUsername = channelsStatus?.instagram?.username || '';

  const effectiveOnboardingData = useMemo(() => {
    if (!onboardingData) {
      if (isWhatsAppConnected) {
        return {
          whatsapp_connected: true,
          two_factor_enabled: false,
          business_verification_status: 'not_verified',
          completed_count: 1,
          progress_percentage: 33,
          steps: {
            step_1: { completed: true, status: 'completed', status_label: 'WhatsApp Business connected' },
            step_2: { completed: false, status: 'action_required', status_label: 'Action required' },
            step_3: { completed: false, status: 'action_required', status_label: 'Action required' },
          },
        };
      }
      return null;
    }
    if (isWhatsAppConnected && !onboardingData.whatsapp_connected) {
      const cCount = 1 + (onboardingData.two_factor_enabled ? 1 : 0) + (onboardingData.business_verification_status === 'verified' ? 1 : 0);
      return {
        ...onboardingData,
        whatsapp_connected: true,
        completed_count: cCount,
        progress_percentage: Math.round((cCount / 3) * 100),
        steps: {
          ...onboardingData.steps,
          step_1: {
            ...onboardingData.steps?.step_1,
            completed: true,
            status: 'completed',
            status_label: 'WhatsApp Business connected',
          },
        },
      };
    }
    return onboardingData;
  }, [onboardingData, isWhatsAppConnected]);

  const handleOpenStep2 = useCallback(() => {
    if (!isWhatsAppConnected) return;
    setIsStep2ModalOpen(true);
  }, [isWhatsAppConnected]);

  const handleOpenStep3 = useCallback(() => {
    if (!isWhatsAppConnected || !effectiveOnboardingData?.two_factor_enabled) return;
    setIsStep3ModalOpen(true);
  }, [isWhatsAppConnected, effectiveOnboardingData?.two_factor_enabled]);

  // Loading skeleton
  if ((loading || entLoading) && !onboardingData && !channelsStatus) {
    if (isLocalConnected || isIgConnected) {
      return null;
    }
    return (
      <div className="w-full h-36 rounded-2xl bg-white/[0.02] border border-white/[0.05] animate-pulse" />
    );
  }

  // Hide if completed (for WA or IG)
  if (effectiveOnboardingData?.onboarding_completed) {
    return null;
  }

  return (
    <>
      <div className="w-full">
        <AnimatePresence mode="wait">
          {/* SCENARIO 1: Plan has NO messaging channels allowed */}
          {hasNoChannels && (
            <div className="w-full">
              <PlanLockedOnboardingHero
                planName={planName}
                onDismiss={handleDismissHero}
              />
            </div>
          )}

          {/* SCENARIO 2: Creator Plan (Instagram only) */}
          {!hasNoChannels && isCreatorPlan && !isIgConnected && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5 items-stretch">
              {!isHeroDismissed && (
                <div className="xl:col-span-2 flex flex-col h-full">
                  <InstagramSetupHero
                    workspaceId={workspaceId}
                    isIgConnected={isIgConnected}
                    igUsername={igUsername}
                    onDismiss={handleDismissHero}
                  />
                </div>
              )}
              <div className={!isHeroDismissed ? 'xl:col-span-1 flex flex-col h-full' : 'xl:col-span-3'}>
                <InstagramSetupChecklist
                  isIgConnected={isIgConnected}
                  igUsername={igUsername}
                  isHeroDismissed={isHeroDismissed}
                  onReopenHero={handleReopenHero}
                />
              </div>
            </div>
          )}

          {/* SCENARIO 3: WhatsApp allowed — WhatsApp NOT Connected yet */}
          {!hasNoChannels && !isCreatorPlan && !isWhatsAppConnected && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5 items-stretch">
              {!isHeroDismissed && (
                <div className="xl:col-span-2 flex flex-col h-full">
                  <WhatsAppSetupHero
                    onboardingData={effectiveOnboardingData}
                    onConnectWhatsApp={startWhatsAppSignup}
                    isConnectingWhatsApp={isConnecting}
                    onDismiss={handleDismissHero}
                    onOpenStep2={handleOpenStep2}
                    onOpenStep3={handleOpenStep3}
                  />
                </div>
              )}

              <div className={!isHeroDismissed ? 'xl:col-span-1 flex flex-col h-full' : 'xl:col-span-3'}>
                <WhatsAppSetupChecklist
                  onboardingData={effectiveOnboardingData}
                  onOpenStep1={startWhatsAppSignup}
                  onOpenStep2={handleOpenStep2}
                  onOpenStep3={handleOpenStep3}
                  isHeroDismissed={isHeroDismissed}
                  onReopenHero={handleReopenHero}
                />
              </div>
            </div>
          )}

          {/* SCENARIO 4: WhatsApp Connected & Force Open by Pending Pill */}
          {!hasNoChannels && !isCreatorPlan && isWhatsAppConnected && isForceOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-5 items-stretch"
            >
              <div className="xl:col-span-2 flex flex-col h-full">
                <WhatsAppSetupHero
                  onboardingData={effectiveOnboardingData}
                  onConnectWhatsApp={startWhatsAppSignup}
                  isConnectingWhatsApp={isConnecting}
                  onDismiss={() => {
                    if (onToggleOpen) onToggleOpen(false);
                  }}
                  onOpenStep2={handleOpenStep2}
                  onOpenStep3={handleOpenStep3}
                />
              </div>

              <div className="xl:col-span-1 flex flex-col h-full">
                <WhatsAppSetupChecklist
                  onboardingData={effectiveOnboardingData}
                  onOpenStep1={startWhatsAppSignup}
                  onOpenStep2={handleOpenStep2}
                  onOpenStep3={handleOpenStep3}
                  isHeroDismissed={false}
                  onReopenHero={handleReopenHero}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Step 2 Modal */}
      <TwoFactorModal
        isOpen={isStep2ModalOpen}
        onClose={() => setIsStep2ModalOpen(false)}
        workspaceId={workspaceId}
        businessId={
          effectiveOnboardingData?.meta_business_id ||
          effectiveOnboardingData?.steps?.step_1?.business_id ||
          effectiveOnboardingData?.steps?.step_2?.business_id
        }
        metaUrl={effectiveOnboardingData?.two_factor_url || effectiveOnboardingData?.steps?.step_2?.meta_url}
        isCompleted={Boolean(onboardingData?.two_factor_enabled)}
        onStatusUpdated={handleModalStatusUpdated}
      />

      {/* Step 3 Modal */}
      <BusinessVerificationModal
        isOpen={isStep3ModalOpen}
        onClose={() => setIsStep3ModalOpen(false)}
        workspaceId={workspaceId}
        businessId={
          effectiveOnboardingData?.meta_business_id ||
          effectiveOnboardingData?.steps?.step_1?.business_id ||
          effectiveOnboardingData?.steps?.step_3?.business_id
        }
        metaUrl={effectiveOnboardingData?.verification_url || effectiveOnboardingData?.steps?.step_3?.meta_url}
        currentStatus={onboardingData?.business_verification_status || 'not_verified'}
        onStatusUpdated={handleModalStatusUpdated}
      />
    </>
  );
}
