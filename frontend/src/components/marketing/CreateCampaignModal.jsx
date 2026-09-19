'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CampaignStepper from './CampaignStepper';
import CampaignDetailsStep from './steps/CampaignDetailsStep';
import AudienceStep from './steps/AudienceStep';
import MessageStep from './steps/MessageStep';
import ScheduleStep from './steps/ScheduleStep';
import ReviewStep from './steps/ReviewStep';
import { createCampaign, getCampaignDraft, saveCampaignDraft, clearCampaignDraft } from '@/lib/api/marketing';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

const getInitialDraftState = () => {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return {
    name: 'Diwali Offer 2025',
    type: 'Promotional',
    whatsappNumber: '+91 98765 43210',
    goal: 'Increase sales',
    audienceType: 'Existing Contacts',
    audienceListName: '',
    selectedListIds: [],
    recipientsCount: 0,
    validRecipients: 0,
    invalidRecipients: 0,
    optedInCount: 0,
    optedOutCount: 0,
    messageMode: 'type',
    messageBody: '',
    mediaUrl: '',
    mediaName: '',
    sendType: 'Send Now',
    scheduleDate: today,
    scheduleTime: '10:00 AM',
    timezone: '(GMT+05:30) Asia/Kolkata (IST)',
    sendGradually: true,
    sendingRate: 100,
    skipInvalid: true,
    stopOnFailure: false,
    quietHours: true,
  };
};

export default function CreateCampaignModal({ isOpen, onClose, onSuccess, workspaceId }) {
  const { workspaceId: authWsId } = useAuth();
  const activeWsId = workspaceId || authWsId;

  const [currentStep, setCurrentStep] = useState(1);
  const [campaignData, setCampaignData] = useState(() => {
    const initial = getInitialDraftState();
    const saved = typeof window !== 'undefined' ? getCampaignDraft() : null;
    return saved ? { ...initial, ...saved } : initial;
  });
  const [isLaunching, setIsLaunching] = useState(false);
  const { showToast } = useToast();

  const updateData = (fields) => {
    setCampaignData((prev) => {
      const updated = { ...prev, ...fields };
      saveCampaignDraft(updated);
      return updated;
    });
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleEditStep = (stepNumber) => {
    setCurrentStep(stepNumber);
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      const res = await createCampaign(campaignData, activeWsId);
      showToast('Campaign created and queued successfully!', 'success');
      clearCampaignDraft();
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      console.error('Launch failed:', err);
      showToast('Failed to launch campaign. Please try again.', 'error');
    } finally {
      setIsLaunching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-hidden animate-in fade-in duration-200">
      <div className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-[1240px] max-h-[92vh] flex flex-col rounded-2xl bg-[#0d101c] border border-[#1e253b] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-6 sm:px-8 pt-5 pb-4 border-b border-[#1b2238] flex items-center justify-between shrink-0 bg-[#0d101c]">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Create WhatsApp Campaign
            </h2>
            <p className="text-xs sm:text-sm text-[#8c94a6] mt-0.5">
              Send personalized messages to your customers at scale.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#8c94a6] hover:text-white hover:bg-[#1a2136] transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* 5-Step Stepper Bar */}
        <div className="px-6 sm:px-8 py-3 bg-[#0b0e1a] border-b border-[#1b2238] shrink-0">
          <CampaignStepper
            currentStep={currentStep}
            onStepClick={handleEditStep}
          />
        </div>

        {/* Scrollable Step Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-[#0d101c]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              {currentStep === 1 && (
                <CampaignDetailsStep
                  data={campaignData}
                  updateData={updateData}
                  onNext={handleNext}
                  onCancel={onClose}
                  workspaceId={activeWsId}
                />
              )}

              {currentStep === 2 && (
                <AudienceStep
                  data={campaignData}
                  updateData={updateData}
                  onNext={handleNext}
                  onBack={handleBack}
                  workspaceId={activeWsId}
                />
              )}

              {currentStep === 3 && (
                <MessageStep
                  data={campaignData}
                  updateData={updateData}
                  onNext={handleNext}
                  onBack={handleBack}
                  workspaceId={activeWsId}
                />
              )}

              {currentStep === 4 && (
                <ScheduleStep
                  data={campaignData}
                  updateData={updateData}
                  onNext={handleNext}
                  onBack={handleBack}
                  workspaceId={activeWsId}
                />
              )}

              {currentStep === 5 && (
                <ReviewStep
                  data={campaignData}
                  onEditStep={handleEditStep}
                  onLaunch={handleLaunch}
                  onBack={handleBack}
                  isLaunching={isLaunching}
                  workspaceId={activeWsId}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
