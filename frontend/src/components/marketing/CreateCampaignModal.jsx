'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Bookmark, Trash2, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CampaignStepper from './CampaignStepper';
import CampaignDetailsStep from './steps/CampaignDetailsStep';
import AudienceStep from './steps/AudienceStep';
import MessageStep from './steps/MessageStep';
import ScheduleStep from './steps/ScheduleStep';
import ReviewStep from './steps/ReviewStep';
import {
  createCampaign,
  updateCampaign,
  getCampaignDraft,
  saveCampaignDraft,
  clearCampaignDraft,
} from '@/lib/api/marketing';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { getDefaultFutureSchedule, isFutureSchedule } from '@/lib/campaignScheduleUtils';

const getInitialDraftState = () => {
  const defaultSchedule = getDefaultFutureSchedule();
  return {
    id: null,
    name: '',
    type: 'Promotional',
    whatsappNumber: '',
    phoneNumberId: '',
    goal: 'Increase sales',
    audienceType: 'Existing Contacts',
    audienceListName: '',
    selectedListIds: [],
    selectedLeadIds: [],
    recipientsCount: 0,
    validRecipients: 0,
    invalidRecipients: 0,
    optedInCount: 0,
    optedOutCount: 0,
    recipients: [],
    csvStats: null,
    selectedTemplateId: null,
    messageMode: 'template',
    messageBody: '',
    mediaUrl: '',
    mediaName: '',
    mediaType: null,
    variableMapping: null,
    sendType: 'Send Now',
    scheduleDate: defaultSchedule.date,
    scheduleTime: defaultSchedule.time,
    timezone: '(GMT+05:30) Asia/Kolkata (IST)',
    sendGradually: true,
    sendingRate: 100,
    skipInvalid: true,
    stopOnFailure: true,
    quietHours: true,
  };
};

export default function CreateCampaignModal({
  isOpen,
  onClose,
  onSuccess,
  workspaceId,
  initialCampaign = null,
  existingCampaigns = [],
}) {
  const { workspaceId: authWsId } = useAuth();
  const activeWsId = workspaceId || authWsId;

  const [currentStep, setCurrentStep] = useState(1);
  const [campaignData, setCampaignData] = useState(() => {
    if (initialCampaign) {
      return { ...getInitialDraftState(), ...initialCampaign };
    }
    const initial = getInitialDraftState();
    const saved = typeof window !== 'undefined' ? getCampaignDraft() : null;
    if (
      saved &&
      (saved.name === 'Diwali Offer 2025' ||
       String(saved.name || '').toLowerCase().includes('diwali') ||
       saved.recipientsCount === 2480 ||
       (saved.invalidRecipients === 50 && (!saved.recipients || saved.recipients.length === 0)))
    ) {
      clearCampaignDraft();
      return initial;
    }
    if (saved) {
      if (saved.sendType === 'Schedule for Later' && !isFutureSchedule(saved.scheduleDate, saved.scheduleTime)) {
        const fresh = getDefaultFutureSchedule();
        return { ...initial, ...saved, scheduleDate: fresh.date, scheduleTime: fresh.time };
      }
      return { ...initial, ...saved };
    }
    return initial;
  });

  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const { showToast } = useToast();

  const updateData = useCallback((fields) => {
    setCampaignData((prev) => {
      const updated = { ...prev, ...fields };
      // Only cache in local storage if not editing an existing persisted campaign ID
      if (!updated.id) {
        saveCampaignDraft(updated);
      }
      return updated;
    });
  }, []);

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

  // Helper to check if any data was entered
  const hasEnteredData = () => {
    return Boolean(
      campaignData.id ||
      campaignData.name?.trim() ||
      campaignData.selectedTemplateId ||
      campaignData.messageBody?.trim() ||
      (campaignData.recipients && campaignData.recipients.length > 0) ||
      (campaignData.selectedListIds && campaignData.selectedListIds.length > 0) ||
      campaignData.mediaUrl
    );
  };

  // Close request handler: prompt for Save Draft vs Discard if data is present
  const handleRequestClose = () => {
    if (hasEnteredData()) {
      setShowExitPrompt(true);
    } else {
      clearCampaignDraft();
      onClose();
    }
  };

  // Save as Draft action
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const draftPayload = {
        ...campaignData,
        name: campaignData.name?.trim() || 'Untitled Draft Campaign',
        status: 'draft',
        saveAsDraft: true,
        autoLaunch: false,
      };

      let res;
      if (campaignData.id) {
        res = await updateCampaign(campaignData.id, draftPayload, activeWsId);
      } else {
        res = await createCampaign(draftPayload, activeWsId, { saveAsDraft: true });
      }

      showToast('Campaign saved as draft', 'success');
      clearCampaignDraft();
      setShowExitPrompt(false);
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      console.error('Save draft failed:', err);
      const detail = err?.response?.data?.detail || err?.message || 'Failed to save draft. Please try again.';
      showToast(detail, 'error');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Discard action
  const handleDiscard = () => {
    clearCampaignDraft();
    setShowExitPrompt(false);
    showToast('Draft changes discarded', 'info');
    onClose();
  };

  // Launch Campaign (Step 5)
  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      let res;
      if (campaignData.id) {
        res = await updateCampaign(campaignData.id, {
          ...campaignData,
          autoLaunch: true,
          status: campaignData.sendType === 'Schedule for Later' ? 'scheduled' : 'in_progress',
        }, activeWsId);
      } else {
        res = await createCampaign(campaignData, activeWsId);
      }

      showToast(
        campaignData.sendType === 'Schedule for Later'
          ? 'Campaign scheduled successfully!'
          : 'Campaign launched and queued successfully!',
        'success'
      );
      clearCampaignDraft();
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      console.error('Launch failed:', err);
      const detail = err?.response?.data?.detail || err?.message || 'Failed to launch campaign. Please try again.';
      showToast(detail, 'error');
    } finally {
      setIsLaunching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 md:p-8 overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl xl:max-w-6xl 2xl:max-w-[1240px] max-h-[92vh] flex flex-col rounded-2xl bg-[#0d101c] border border-[#1e253b] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
        
        {/* Modal Top Header */}
        <div className="px-6 sm:px-8 pt-5 pb-4 border-b border-[#1b2238] flex items-center justify-between shrink-0 bg-[#0d101c]">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight flex items-center gap-2">
              <span>{campaignData.id ? 'Edit WhatsApp Campaign' : 'Create WhatsApp Campaign'}</span>
              {campaignData.id && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 text-white">
                  Draft Mode
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-[#8c94a6] mt-0.5">
              Send personalized messages to your customers at scale.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isLaunching}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#C49FE0] bg-[#814AC8]/15 border border-[#814AC8]/30 hover:bg-[#814AC8]/25 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Save progress as draft"
            >
              {isSavingDraft ? (
                <>
                  <span className="w-3 h-3 border-2 border-[#C49FE0]/30 border-t-[#C49FE0] rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Bookmark size={13} />
                  <span>Save Draft</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleRequestClose}
              className="p-2 rounded-xl text-[#8c94a6] hover:text-white hover:bg-[#1a2136] transition-colors cursor-pointer"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
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
                  onCancel={handleRequestClose}
                  workspaceId={activeWsId}
                  existingCampaigns={existingCampaigns}
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
                  onSaveDraft={handleSaveDraft}
                  onBack={handleBack}
                  isLaunching={isLaunching}
                  isSavingDraft={isSavingDraft}
                  workspaceId={activeWsId}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Exit Confirmation Dialog (Save Draft / Discard / Keep Editing) */}
        {showExitPrompt && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl bg-[#0f1322] border border-[#262f4d] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] p-6 space-y-5 animate-in zoom-in-95 duration-150 text-left">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 flex items-center justify-center text-white shrink-0 shadow-[0_0_15px_rgba(129,74,200,0.3)]">
                  <Bookmark size={22} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    Save Campaign as Draft?
                  </h3>
                  <p className="text-xs sm:text-sm text-[#8c94a6] mt-1 leading-relaxed">
                    You have entered campaign information. Would you like to save your progress as a draft to resume later, or discard these changes?
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0a0c16] border border-[#1b2238] flex items-center justify-between text-xs">
                <span className="text-[#8c94a6]">Campaign:</span>
                <span className="text-white font-medium truncate max-w-[200px]">
                  {campaignData.name || 'Untitled Draft Campaign'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#814AC8] hover:bg-[#723db5] shadow-[0_0_18px_rgba(129,74,200,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingDraft ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving Draft...</span>
                    </>
                  ) : (
                    <>
                      <Bookmark size={14} />
                      <span>Save Draft</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={isSavingDraft}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Discard</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowExitPrompt(false)}
                  disabled={isSavingDraft}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs sm:text-sm font-medium text-white/70 bg-[#15192c] border border-[#222a42] hover:bg-[#1a2038] hover:text-white transition-all cursor-pointer"
                >
                  Keep Editing
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

