'use client';

import React, { useState, useEffect } from 'react';
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

const INITIAL_DRAFT_STATE = {
  name: 'Diwali Offer 2025',
  type: 'Promotional',
  whatsappNumber: '+91 98765 43210',
  goal: 'Increase sales',
  audienceType: 'Existing Contacts',
  audienceListName: 'All Customers',
  selectedListIds: ['list_1'],
  recipientsCount: 2480,
  validRecipients: 2430,
  invalidRecipients: 50,
  optedInCount: 2430,
  optedOutCount: 50,
  messageMode: 'type',
  messageBody: `Hi {{name}},

This Diwali, get up to 50% OFF on our exclusive collection! 🎁
Use code {{coupon_code}} and make this festive season brighter with OrbionAgents.

Shop now: {{website}}

Regards,
Team OrbionAgents`,
  mediaUrl: '/images/diwali-banner.jpg',
  mediaName: 'Diwali Offer',
  sendType: 'Schedule for Later',
  scheduleDate: 'Oct 28, 2025',
  scheduleTime: '10:30 AM',
  timezone: '(GMT+05:30) Asia/Kolkata (IST)',
  sendGradually: true,
  sendingRate: 100,
  skipInvalid: true,
  stopOnFailure: false,
  quietHours: true,
};

export default function CreateCampaignModal({ isOpen, onClose, onSuccess }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignData, setCampaignData] = useState(() => {
    const saved = typeof window !== 'undefined' ? getCampaignDraft() : null;
    return saved ? { ...INITIAL_DRAFT_STATE, ...saved } : INITIAL_DRAFT_STATE;
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
      const res = await createCampaign(campaignData);
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-full max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-[#0b0a16] border border-[#2d244d] shadow-[0_20px_70px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Modal Top Header */}
        <div className="px-5 sm:px-7 pt-5 pb-3 border-b border-[#221c3b] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Create WhatsApp Campaign
            </h2>
            <p className="text-xs text-[#8c88a6] mt-0.5">
              Send personalized messages to your customers at scale.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[#8c88a6] hover:text-white hover:bg-[#1a1638] transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* 5-Step Stepper Bar */}
        <div className="px-5 sm:px-7 py-2.5 bg-[#0f0e1f] border-b border-[#221c3b] shrink-0">
          <CampaignStepper
            currentStep={currentStep}
            onStepClick={handleEditStep}
          />
        </div>

        {/* Scrollable Step Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              {currentStep === 1 && (
                <CampaignDetailsStep
                  data={campaignData}
                  updateData={updateData}
                  onNext={handleNext}
                  onCancel={onClose}
                />
              )}

              {currentStep === 2 && (
                <AudienceStep
                  data={campaignData}
                  updateData={updateData}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {currentStep === 3 && (
                <MessageStep
                  data={campaignData}
                  updateData={updateData}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {currentStep === 4 && (
                <ScheduleStep
                  data={campaignData}
                  updateData={updateData}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {currentStep === 5 && (
                <ReviewStep
                  data={campaignData}
                  onEditStep={handleEditStep}
                  onLaunch={handleLaunch}
                  onBack={handleBack}
                  isLaunching={isLaunching}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
