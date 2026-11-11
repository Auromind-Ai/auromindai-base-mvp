'use client';

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Upload,
  Globe,
  FileText,
  Sparkles,
  Bot,
  RotateCcw,
  AlertCircle,
  Calendar,
  Mail,
  Loader2,
  CheckCircle2,
  X,
  Database,
  ChevronDown,
  Key,
  Eye,
  EyeOff,
  ExternalLink

} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { validateBrainDocumentUpload } from '@/lib/fileValidation';

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Channels' },
  { id: 3, label: 'AI Configuration' },
  { id: 4, label: 'Knowledge' },
  { id: 5, label: 'Review' },
];

const TONE_OPTIONS = [
  'Friendly & Professional',
  'Casual & Conversational',
  'Sales & Persuasive',
  'Empathetic & Supportive',
  'Concise & Direct',
  'Formal & Authoritative',
];

const AGENT_TYPES = [
  {
    id: 'sales_assistant',
    title: 'Sales Assistant',
    description: 'Answer questions, capture leads & close sales',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: 'customer_support',
    title: 'Customer Support',
    description: 'Handle support queries and resolve issues',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      </svg>
    ),
  },
  {
    id: 'lead_generation',
    title: 'Lead Generation',
    description: 'Collect information and qualify leads',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="m16 12-4-4-4 4" />
        <path d="M12 16V8" />
      </svg>
    ),
  },
  {
    id: 'appointment_booker',
    title: 'Appointment Booker',
    description: 'Book meetings and manage schedules',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    id: 'custom_agent',
    title: 'Custom Agent',
    description: 'Create your own from scratch',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
      </svg>
    ),
  },
];

const DEFAULT_AI_CONFIG = {
  provider: 'groq',
  model: 'openai/gpt-oss-120b',
  temperature: 0.3,
  max_tokens: 1024,
  top_p: 1.0,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
  response_format: 'markdown',
  max_response_time: 'normal',
  stream_response: true,
  structured_output: false,
  function_calling: false,
  tone: 'Friendly & Professional',
  system_prompt: '',
  example_user_message: '',
};

export default function CreateAgentWizard() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[#070b13] text-zinc-400 text-xs">
        <Loader2 size={24} className="animate-spin text-purple-500 mr-2" />
        <span>Loading wizard...</span>
      </div>
    }>
      <CreateAgentWizardContent />
    </Suspense>
  );
}

function CreateAgentWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('editId');
  const { workspaceId } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form State
  const [formData, setFormData] = useState(() => ({
    // Step 1: Basic Info
    agent_type: 'sales_assistant',
    name: '',
    description: '',
    avatar_url: '',
    language: 'English (India)',
    tone_of_voice: 'Friendly & Professional',
    business_name: '',
    website_url: '',

    // Step 2: Channels (only WhatsApp, Instagram, and Twilio supported)
    channels_config: {},
    channel_settings: {
      auto_reply: true,
      sync_crm: true,
      channel_specific_tone: true,
      channel_tones: {
        whatsapp: 'Friendly & Professional',
        instagram: 'Casual & Conversational',
        twilio: 'Concise & Direct',
      },
    },

    // Step 3: AI Configuration
    ai_config: { ...DEFAULT_AI_CONFIG },

    // Step 4: Knowledge Base
    knowledge_config: {
      collection: `agent_${Math.random().toString(36).substring(2, 10)}`,
      files: [],
      website_urls: [],
      faqs: [],
      integrations: [],
      settings: {
        use_knowledge_base: true,
        web_search: false,
      },
    },
  }));

  // Providers & models metadata from backend
  const [providersData, setProvidersData] = useState([]);
  const [channelsData, setChannelsData] = useState([]);
  const [knowledgeTab, setKnowledgeTab] = useState('upload');
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [showAddFaqModal, setShowAddFaqModal] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [isKnowledgeBusy, setIsKnowledgeBusy] = useState(false);
  const [knowledgeFeedback, setKnowledgeFeedback] = useState({ message: '', type: '' });
  const fileInputRef = useRef(null);

  // Load models, channels metadata, and existing agent or draft on mount
  useEffect(() => {
    let isMounted = true;
    async function initWizard() {
      if (!workspaceId) return;
      try {
        const [modelsRes, channelsRes, agentOrDraftRes] = await Promise.allSettled([
          api.getSupportedModels(workspaceId),
          api.getAgentChannelsStatus(workspaceId),
          editId ? api.getAgent(editId, workspaceId) : api.getAgentDraft(workspaceId),
        ]);

        if (!isMounted) return;

        // 1. Process Channels Metadata
        let chList = [];
        if (channelsRes.status === 'fulfilled' && channelsRes.value?.channels) {
          chList = channelsRes.value.channels;
          setChannelsData(chList);
        }

        // Helper to resolve channels config:
        // Rule: If connected, default to ON (enabled: true) unless user_disabled is explicitly true.
        // If not connected, MUST be OFF (enabled: false).
        const resolveChannelsConfig = (existingConfig = {}) => {
          const result = {};
          chList.forEach((c) => {
            if (!c.connected) {
              result[c.id] = { enabled: false };
            } else {
              // Channel is connected: default to ON (enabled: true)!
              const wasExplicitlyDisabled = existingConfig[c.id]?.user_disabled === true;
              result[c.id] = {
                ...existingConfig[c.id],
                enabled: !wasExplicitlyDisabled,
              };
            }
          });
          return result;
        };

        // 2. Process Providers & Models Metadata
        let selectedProvider = 'groq';
        let selectedModel = '';
        if (modelsRes.status === 'fulfilled' && modelsRes.value?.providers?.length > 0) {
          const provs = modelsRes.value.providers.filter(
            (p) => p.provider === 'google' || p.provider === 'groq'
          );
          setProvidersData(provs);
          const activeP = provs.find((p) => p.hasPlatformKey && p.models?.length > 0) || provs[0];
          selectedProvider = activeP?.provider || 'groq';
          const recM = activeP?.models?.find((m) => m.isRecommended) || activeP?.models?.[0];
          selectedModel = recM?.id || '';
        }

        // 3. Process Edit Mode (Existing Agent)
        if (editId && agentOrDraftRes.status === 'fulfilled' && agentOrDraftRes.value?.agent) {
          const a = agentOrDraftRes.value.agent;
          const resolvedChannels = resolveChannelsConfig(a.channels_config || {});

          setFormData({
            agent_type: a.agent_type || 'sales_assistant',
            name: a.name || '',
            description: a.description || '',
            avatar_url: a.avatar_url || '',
            language: a.language || 'English (India)',
            tone_of_voice: a.tone_of_voice || 'Friendly & Professional',
            business_name: a.business_name || '',
            website_url: a.website_url || '',
            channels_config: resolvedChannels,
            channel_settings: {
              auto_reply: true,
              sync_crm: true,
              channel_specific_tone: true,
              channel_tones: {
                whatsapp: 'Friendly & Professional',
                instagram: 'Casual & Conversational',
                twilio: 'Concise & Direct',
              },
              ...(a.channel_settings || {}),
            },
            ai_config: { ...DEFAULT_AI_CONFIG, ...(a.ai_config || {}) },
            knowledge_config: {
              collection: a.knowledge_config?.collection || `agent_${Math.random().toString(36).substring(2, 10)}`,
              files: a.knowledge_config?.files || [],
              website_urls: a.knowledge_config?.website_urls || [],
              faqs: a.knowledge_config?.faqs || [],
              integrations: a.knowledge_config?.integrations || [],
              settings: a.knowledge_config?.settings || {
                use_knowledge_base: true,
                web_search: false,
              },
            },
          });
          return;
        }

        // 4. Process Create Mode (with Draft if exists)
        if (!editId && agentOrDraftRes.status === 'fulfilled' && agentOrDraftRes.value?.draft) {
          const draft = agentOrDraftRes.value.draft;
          const resolvedChannels = resolveChannelsConfig(draft.channels_config || {});

          setFormData((prev) => ({
            ...prev,
            ...draft,
            channels_config: resolvedChannels,
            channel_settings: {
              auto_reply: true,
              sync_crm: true,
              channel_specific_tone: true,
              channel_tones: {
                whatsapp: 'Friendly & Professional',
                instagram: 'Casual & Conversational',
                twilio: 'Concise & Direct',
              },
              ...(draft.channel_settings || {}),
            },
          }));
          return;
        }

        // 5. Fresh Create Mode (No Draft)
        if (!editId) {
          const resolvedChannels = resolveChannelsConfig({});
          setFormData((prev) => ({
            ...prev,
            channels_config: resolvedChannels,
            ai_config: {
              ...prev.ai_config,
              provider: selectedProvider || prev.ai_config.provider,
              model: selectedModel || prev.ai_config.model,
            },
          }));
        }
      } catch (err) {
        console.warn("Failed to initialize wizard metadata:", err);
      }
    }
    initWizard();
    return () => { isMounted = false; };
  }, [workspaceId, editId]);

  // Persist draft to backend on step transition
  const persistDraft = async (updatedData) => {
    if (!workspaceId || editId) return;
    try {
      await api.saveAgentDraft(updatedData, workspaceId);
    } catch (e) {
      console.warn("Draft auto-save warning:", e);
    }
  };

  // Validation per step
  const validateStep = (step) => {
    setErrorMessage('');
    if (step === 1) {
      if (!formData.name.trim()) {
        setErrorMessage('Agent name is required.');
        return false;
      }
      if (formData.name.trim().length < 2) {
        setErrorMessage('Agent name must be at least 2 characters.');
        return false;
      }
    }
    if (step === 2) {
      const anyEnabled = Object.entries(formData.channels_config).some(
        ([chId, cfg]) => {
          const backendChannel = channelsData.find((c) => c.id === chId);
          return (backendChannel ? backendChannel.connected : true) && cfg?.enabled;
        }
      );
      if (!anyEnabled) {
        setErrorMessage('Please select at least one channel for your agent.');
        return false;
      }
    }
    if (step === 3) {
      if (!formData.ai_config?.model) {
        setErrorMessage('The selected provider is currently not available. Please select an active provider or contact administrator.');
        return false;
      }
      if (!formData.ai_config?.system_prompt?.trim()) {
        setErrorMessage('Custom System Prompt is required. Please define how your AI agent should interact and operate.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    persistDraft(formData);
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setErrorMessage('');
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Final Agent Creation or Update
  const handleCreateAgent = async () => {
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep(2)) {
      setCurrentStep(2);
      return;
    }
    if (!validateStep(3)) {
      setCurrentStep(3);
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const payload = {
        name: formData.name.trim(),
        description: formData.description,
        agent_type: formData.agent_type,
        avatar_url: formData.avatar_url,
        language: formData.language,
        tone_of_voice: formData.tone_of_voice,
        business_name: formData.business_name,
        website_url: formData.website_url,
        channels_config: formData.channels_config,
        channel_settings: formData.channel_settings,
        ai_config: formData.ai_config,
        knowledge_config: formData.knowledge_config,
        is_draft: false,
      };

      if (editId) {
        await api.updateAgent(editId, payload, workspaceId);
        router.push(`/ai-agents/test?agentId=${editId}`);
      } else {
        const res = await api.createAgent(payload, workspaceId);
        const newAgentId = res?.agent?.id;
        await api.clearAgentDraft(workspaceId).catch(() => {});
        if (newAgentId) {
          router.push(`/ai-agents/test?agentId=${newAgentId}`);
        } else {
          router.push('/ai-agents');
        }
      }
    } catch (err) {
      console.error("Agent creation/update failed:", err);
      setErrorMessage(
        err?.response?.data?.detail || err?.message || 'Failed to save AI agent. Please check required fields.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for step jump from Review
  const jumpToStep = (stepNumber) => {
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // File Upload Handler (Direct Vector DB Chunking with Collection Tag)
  const handleFileUpload = async (e) => {
    const fileList = Array.from(e.target.files || []);
    if (!fileList.length) return;

    setIsKnowledgeBusy(true);
    setKnowledgeFeedback({ message: '', type: '' });

    const collectionTag = formData.knowledge_config.collection || `agent_${Math.random().toString(36).substring(2, 10)}`;

    for (const f of fileList) {
      const validation = validateBrainDocumentUpload(f);
      if (!validation.valid) {
        setKnowledgeFeedback({ message: `"${f.name}": ${validation.error}`, type: 'error' });
        continue;
      }
      const tempId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newFileObj = {
        id: tempId,
        entry_id: null,
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        time: 'Indexing chunks...',
        status: 'Indexing',
      };

      setFormData((prev) => ({
        ...prev,
        knowledge_config: {
          ...prev.knowledge_config,
          collection: collectionTag,
          files: [...prev.knowledge_config.files, newFileObj],
        },
      }));

      try {
        if (workspaceId) {
          const res = await api.uploadDocument(f, workspaceId, collectionTag);
          const entryId = res?.entry_id || res?.id || tempId;
          setFormData((prev) => ({
            ...prev,
            knowledge_config: {
              ...prev.knowledge_config,
              files: prev.knowledge_config.files.map((item) =>
                item.id === tempId
                  ? { ...item, id: entryId, entry_id: entryId, status: 'Indexed', time: 'Indexed in Vector DB' }
                  : item
              ),
            },
          }));
          setKnowledgeFeedback({ message: `"${f.name}" indexed successfully into collection ${collectionTag}!`, type: 'success' });
        } else {
          setFormData((prev) => ({
            ...prev,
            knowledge_config: {
              ...prev.knowledge_config,
              files: prev.knowledge_config.files.map((item) =>
                item.id === tempId ? { ...item, status: 'Processed', time: 'Ready' } : item
              ),
            },
          }));
        }
      } catch (err) {
        console.error('File vector upload error:', err);
        const errDetail = err?.response?.data?.detail || err?.message || 'Failed to index file.';
        setKnowledgeFeedback({ message: `Error indexing "${f.name}": ${errDetail}`, type: 'error' });
        setFormData((prev) => ({
          ...prev,
          knowledge_config: {
            ...prev.knowledge_config,
            files: prev.knowledge_config.files.map((item) =>
              item.id === tempId ? { ...item, status: 'Error', time: 'Failed to index' } : item
            ),
          },
        }));
      }
    }

    setIsKnowledgeBusy(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Delete File Handler (Removes from Vector DB if entry exists)
  const handleDeleteFile = async (fileItem) => {
    const fileId = typeof fileItem === 'object' ? fileItem.id : fileItem;
    const entryId = typeof fileItem === 'object' ? (fileItem.entry_id || fileItem.id) : fileItem;

    setFormData((prev) => ({
      ...prev,
      knowledge_config: {
        ...prev.knowledge_config,
        files: prev.knowledge_config.files.filter((f) => f.id !== fileId),
      },
    }));

    if (workspaceId && entryId && !String(entryId).startsWith('file-') && !String(entryId).startsWith('local-')) {
      try {
        await api.deleteBrainEntry(entryId, workspaceId);
      } catch (e) {
        console.warn('Vector entry deletion notice:', e);
      }
    }
  };

  // Add FAQ Handler (Indexes into Vector DB under Agent Collection Tag)
  const handleAddFaq = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    setIsKnowledgeBusy(true);
    setKnowledgeFeedback({ message: '', type: '' });

    const q = newFaq.question.trim();
    const a = newFaq.answer.trim();
    const collectionTag = formData.knowledge_config.collection || `agent_${Math.random().toString(36).substring(2, 10)}`;
    const tempId = `faq-${Date.now()}`;

    let entryId = null;
    if (workspaceId) {
      try {
        const res = await api.addTextKnowledge(
          `FAQ: ${q}`,
          `Question: ${q}\nAnswer: ${a}`,
          workspaceId,
          collectionTag
        );
        entryId = res?.entry_id || res?.id || null;
        setKnowledgeFeedback({ message: 'FAQ indexed into Vector DB collection!', type: 'success' });
      } catch (err) {
        console.warn('FAQ Vector indexing deferred:', err);
      }
    }

    const faqItem = {
      id: entryId || tempId,
      entry_id: entryId,
      question: q,
      answer: a,
    };

    setFormData((prev) => ({
      ...prev,
      knowledge_config: {
        ...prev.knowledge_config,
        collection: collectionTag,
        faqs: [...prev.knowledge_config.faqs, faqItem],
      },
    }));

    setNewFaq({ question: '', answer: '' });
    setShowAddFaqModal(false);
    setIsKnowledgeBusy(false);
  };

  // Delete FAQ Handler (Deletes from Vector DB if indexed)
  const handleDeleteFaq = async (faqItem) => {
    const faqId = typeof faqItem === 'object' ? faqItem.id : faqItem;
    const entryId = typeof faqItem === 'object' ? (faqItem.entry_id || faqItem.id) : faqItem;

    setFormData((prev) => ({
      ...prev,
      knowledge_config: {
        ...prev.knowledge_config,
        faqs: prev.knowledge_config.faqs.filter((f) => f.id !== faqId),
      },
    }));

    if (workspaceId && entryId && !String(entryId).startsWith('faq-')) {
      try {
        await api.deleteBrainEntry(entryId, workspaceId);
      } catch (e) {
        console.warn('FAQ vector deletion notice:', e);
      }
    }
  };

  // Add Website URL Handler (Syncs URL into Vector DB with Agent Collection Tag)
  const handleAddWebsiteUrl = async () => {
    if (!newWebsiteUrl.trim()) return;
    const url = newWebsiteUrl.trim();

    const currentUrls = (formData.knowledge_config.website_urls || []).map((u) =>
      typeof u === 'string' ? u : u.url
    );
    if (currentUrls.includes(url)) {
      setKnowledgeFeedback({ message: `"${url}" has already been added.`, type: 'error' });
      return;
    }

    setIsKnowledgeBusy(true);
    setKnowledgeFeedback({ message: '', type: '' });

    const collectionTag = formData.knowledge_config.collection || `agent_${Math.random().toString(36).substring(2, 10)}`;
    const tempId = `web-${Date.now()}`;
    const newFileEntry = {
      id: tempId,
      entry_id: null,
      name: url,
      size: 'Website link',
      time: 'Syncing & vectorizing...',
      status: 'Syncing',
    };

    setFormData((prev) => ({
      ...prev,
      knowledge_config: {
        ...prev.knowledge_config,
        collection: collectionTag,
        website_urls: [...(prev.knowledge_config.website_urls || []), url],
        files: [...prev.knowledge_config.files, newFileEntry],
      },
    }));

    try {
      if (workspaceId) {
        const res = await api.syncURL(url, workspaceId, collectionTag);
        const entryId = res?.entry_id || res?.id || tempId;
        setFormData((prev) => ({
          ...prev,
          knowledge_config: {
            ...prev.knowledge_config,
            files: prev.knowledge_config.files.map((item) =>
              item.id === tempId
                ? { ...item, id: entryId, entry_id: entryId, status: 'Synced', time: 'Indexed in Vector DB' }
                : item
            ),
          },
        }));
        setKnowledgeFeedback({ message: `"${url}" indexed into collection ${collectionTag}!`, type: 'success' });
      } else {
        setFormData((prev) => ({
          ...prev,
          knowledge_config: {
            ...prev.knowledge_config,
            files: prev.knowledge_config.files.map((item) =>
              item.id === tempId ? { ...item, status: 'Synced', time: 'Synced' } : item
            ),
          },
        }));
      }
      setNewWebsiteUrl('');
    } catch (err) {
      console.error('URL sync failed:', err);
      const errDetail = err?.response?.data?.detail || err?.message || 'Failed to sync URL.';
      setKnowledgeFeedback({ message: `Error syncing URL: ${errDetail}`, type: 'error' });
      setFormData((prev) => ({
        ...prev,
        knowledge_config: {
          ...prev.knowledge_config,
          files: prev.knowledge_config.files.map((item) =>
            item.id === tempId ? { ...item, status: 'Error', time: 'Failed to sync' } : item
          ),
        },
      }));
    } finally {
      setIsKnowledgeBusy(false);
    }
  };

  // Delete Website URL Handler
  const handleDeleteWebsiteUrl = async (urlToDelete, entryId) => {
    setFormData((prev) => ({
      ...prev,
      knowledge_config: {
        ...prev.knowledge_config,
        website_urls: (prev.knowledge_config.website_urls || []).filter((u) => {
          const uStr = typeof u === 'string' ? u : u.url;
          return uStr !== urlToDelete;
        }),
        files: (prev.knowledge_config.files || []).filter(
          (f) => f.name !== urlToDelete && f.id !== entryId && f.entry_id !== entryId
        ),
      },
    }));

    if (workspaceId && entryId && !String(entryId).startsWith('web-')) {
      try {
        await api.deleteBrainEntry(entryId, workspaceId);
      } catch (e) {
        console.warn('Vector entry deletion notice:', e);
      }
    }
    setKnowledgeFeedback({ message: `Removed "${urlToDelete}" from website links.`, type: 'success' });
  };

  // Synced website URLs list
  const websiteUrlsList = useMemo(() => {
    const rawUrls = formData.knowledge_config.website_urls || [];
    const files = formData.knowledge_config.files || [];

    const list = rawUrls.map((item, idx) => {
      const urlStr = typeof item === 'string' ? item : item.url || item.name;
      const matchingFile = files.find(
        (f) => f.name === urlStr || (f.size === 'Website link' && f.name === urlStr)
      );
      return {
        id: matchingFile?.id || `web-url-${idx}`,
        entry_id: matchingFile?.entry_id || matchingFile?.id || null,
        url: urlStr,
        status: matchingFile?.status || 'Synced',
        time: matchingFile?.time || 'Indexed in Vector DB',
      };
    });

    files.forEach((f) => {
      if ((f.size === 'Website link' || f.name?.startsWith('http://') || f.name?.startsWith('https://')) &&
          !list.some((l) => l.url === f.name)) {
        list.push({
          id: f.id,
          entry_id: f.entry_id || f.id,
          url: f.name,
          status: f.status || 'Synced',
          time: f.time || 'Indexed in Vector DB',
        });
      }
    });

    return list;
  }, [formData.knowledge_config.website_urls, formData.knowledge_config.files]);

  // Uploaded document files (exclude website link entries)
  const uploadedDocumentFiles = useMemo(() => {
    return (formData.knowledge_config.files || []).filter(
      (f) => f.size !== 'Website link' && !f.name?.startsWith('http://') && !f.name?.startsWith('https://')
    );
  }, [formData.knowledge_config.files]);

  // Reset AI Config
  const handleResetAIConfig = () => {
    setFormData((prev) => ({
      ...prev,
      ai_config: { ...DEFAULT_AI_CONFIG },
    }));
  };



  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#070b13] text-white">
      {/* Wizard Header Bar */}
      <header className="px-8 py-5 border-b border-white/[0.08] flex items-center justify-between bg-[#080d16]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={currentStep === 1 ? () => router.push('/ai-agents') : handleBack}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>{editId ? 'Edit AI Agent' : 'Create AI Agent'}</span>
            </h1>
            <p className="text-xs text-zinc-400">
              Set up your AI agent to handle conversations and grow your business.
            </p>
          </div>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="hidden lg:flex items-center gap-2">
          {STEPS.map((s, index) => {
            const isPassed = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <div key={s.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => jumpToStep(s.id)}
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      isCurrent
                        ? 'bg-purple-600 text-white ring-4 ring-purple-600/20 shadow-md shadow-purple-900/50'
                        : isPassed
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[#121927] text-zinc-400 border border-white/10 group-hover:border-purple-500/50'
                    }`}
                  >
                    {isPassed ? <Check size={13} strokeWidth={2.5} /> : s.id}
                  </div>
                  <span
                    className={`text-xs font-medium transition-colors ${
                      isCurrent ? 'text-white' : isPassed ? 'text-zinc-300' : 'text-zinc-500 group-hover:text-zinc-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className="w-8 h-px bg-white/15 mx-2" />
                )}
              </div>
            );
          })}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/ai-agents"
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
          >
            Cancel
          </Link>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCreateAgent}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving Agent...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>{editId ? 'Save Changes' : 'Create AI Agent'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {errorMessage && (
        <div className="max-w-5xl mx-auto w-full px-8 pt-4">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="text-red-400 hover:text-red-300"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-8 py-8">
        <AnimatePresence mode="wait">
          {/* ============================================================ */}
          {/* SCREEN 2 — STEP 1: BASIC INFORMATION */}
          {/* ============================================================ */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Agent Type */}
              <div className="lg:col-span-5 space-y-3">
                <h2 className="text-sm font-semibold text-white mb-2">Agent Type</h2>
                <div className="space-y-2.5">
                  {AGENT_TYPES.map((type) => {
                    const isSelected = formData.agent_type === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, agent_type: type.id }))
                        }
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#15132d] border-purple-500/60 shadow-lg shadow-purple-900/20 ring-1 ring-purple-500/40'
                            : 'bg-[#0c1220]/70 border-white/[0.08] hover:border-white/20 hover:bg-[#0c1220]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                                : 'bg-white/5 text-zinc-400 border border-white/5'
                            }`}
                          >
                            {type.icon}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">{type.title}</div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">{type.description}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Basic Information Form */}
              <div className="lg:col-span-7 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] p-6 space-y-4">
                <h2 className="text-sm font-semibold text-white pb-3 border-b border-white/5">
                  Basic Information
                </h2>

                {/* Agent Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                    <span>Agent Name <span className="text-red-400">*</span></span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sales Assistant"
                    className="w-full bg-[#121927] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
                    <span>Description</span>
                    <span className="text-[10px] text-zinc-500">
                      {formData.description.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this agent does..."
                    className="w-full bg-[#121927] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                  />
                </div>

                {/* Profile Image */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Profile Image</label>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/30 overflow-hidden relative border border-purple-400/30 shrink-0">
                      {formData.avatar_url ? (
                        <img
                          src={formData.avatar_url}
                          alt="Agent Profile Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Bot size={28} />
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="avatar-upload"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const previewUrl = URL.createObjectURL(file);
                            setFormData((prev) => ({ ...prev, avatar_url: previewUrl }));

                            try {
                              const res = await api.uploadFile(file, workspaceId);
                              if (res?.url) {
                                setFormData((prev) => ({ ...prev, avatar_url: res.url }));
                              }
                            } catch (err) {
                              console.warn("Avatar upload warning, using local preview:", err);
                            }
                          }
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="avatar-upload"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer transition-colors"
                        >
                          <Upload size={13} />
                          <span>{formData.avatar_url ? 'Change Image' : 'Upload Image'}</span>
                        </label>
                        {formData.avatar_url && (
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, avatar_url: '' }))}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 text-xs font-medium text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Recommended: 256x256 PNG or JPG
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid: Language & Tone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Primary Language</label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full bg-[#121927] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                    >
                      <option value="English (India)">English (India)</option>
                      <option value="English (US)">English (US)</option>
                      <option value="English (UK)">English (UK)</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Tamil">Tamil</option>
                      <option value="Spanish">Spanish</option>
                      <option value="German">German</option>
                      <option value="French">French</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Tone of Voice</label>
                    <select
                      value={formData.tone_of_voice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tone_of_voice: e.target.value,
                          ai_config: { ...formData.ai_config, tone: e.target.value },
                        })
                      }
                      className="w-full bg-[#121927] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                    >
                      <option value="Friendly & Professional">Friendly & Professional</option>
                      <option value="Casual & Conversational">Casual & Conversational</option>
                      <option value="Sales & Persuasive">Sales & Persuasive</option>
                      <option value="Empathetic & Supportive">Empathetic & Supportive</option>
                      <option value="Concise & Direct">Concise & Direct</option>
                      <option value="Formal & Authoritative">Formal & Authoritative</option>
                    </select>
                  </div>
                </div>

                {/* Grid: Business Name & Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Business Name</label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-[#121927] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Website (Optional)</label>
                    <input
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                      placeholder="https://www.example.com"
                      className="w-full bg-[#121927] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* SCREEN 3 — STEP 2: SELECT CHANNELS */}
          {/* ============================================================ */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Select Channels</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Choose the channels where your agent will be active.
                </p>
              </div>

              {/* Channels 3-column Grid (WhatsApp, Instagram, Twilio) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    id: 'whatsapp',
                    name: 'WhatsApp Business',
                    description: 'Connect your WhatsApp Business account',
                    iconBg: 'bg-emerald-500',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    ),
                  },
                  {
                    id: 'instagram',
                    name: 'Instagram',
                    description: 'Connect your Instagram Business account',
                    iconBg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                    ),
                  },
                  {
                    id: 'twilio',
                    name: 'Twilio SMS',
                    description: 'Connect Twilio for SMS & phone messaging',
                    iconBg: 'bg-red-500',
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    ),
                  },
                ].map((channel) => {
                  const backendChannel = channelsData.find((c) => c.id === channel.id);
                  const isConnected = Boolean(backendChannel?.connected);
                  const isEnabled = isConnected && (
                    formData.channels_config[channel.id]?.enabled !== undefined
                      ? Boolean(formData.channels_config[channel.id]?.enabled)
                      : true
                  );

                  return (
                    <div
                      key={channel.id}
                      className="p-4 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] hover:border-white/15 transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 ${channel.iconBg}`}
                        >
                          {channel.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-semibold text-white">{channel.name}</h3>
                          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{channel.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                isConnected
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                              }`}
                            >
                              <span
                                className={`w-1 h-1 rounded-full ${
                                  isConnected ? 'bg-emerald-400' : 'bg-zinc-500'
                                }`}
                              />
                              <span>{isConnected ? 'Connected' : 'Not Connected'}</span>
                            </span>
                            {!isConnected && (
                              <button
                                type="button"
                                onClick={() => router.push('/user/admin/channels')}
                                className="text-[10px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                              >
                                Connect →
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-[11px] text-zinc-400">Enable on Agent</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isConnected) {
                              setErrorMessage(`Please connect ${channel.name} in Growth > Channels before enabling it.`);
                              return;
                            }
                            setErrorMessage('');
                            setFormData((prev) => {
                              const currentEnabled = isEnabled;
                              const nextEnabled = !currentEnabled;
                              return {
                                ...prev,
                                channels_config: {
                                  ...prev.channels_config,
                                  [channel.id]: {
                                    ...prev.channels_config[channel.id],
                                    enabled: nextEnabled,
                                    user_disabled: !nextEnabled,
                                  },
                                },
                              };
                            });
                          }}
                          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                            isEnabled ? 'bg-purple-600' : 'bg-zinc-700'
                          }`}
                        >
                          <motion.div
                            animate={{ x: isEnabled ? 20 : 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="w-5 h-5 rounded-full bg-white shadow-md"
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Channel Settings Section */}
              <div className="rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] p-5 space-y-4">
                <h3 className="text-xs font-semibold text-white tracking-wide uppercase">
                  Channel Settings
                </h3>

                <div className="space-y-3">
                  {[
                    {
                      key: 'auto_reply',
                      title: 'Auto reply on all channels',
                      description: 'Automatically respond to new messages as soon as they arrive on WhatsApp, Instagram, and Twilio.',
                    },
                    {
                      key: 'sync_crm',
                      title: 'Sync all conversations to CRM',
                      description: 'Save all customer inquiries, messages, and captured leads directly into CRM.',
                    },
                    {
                      key: 'channel_specific_tone',
                      title: 'Use channel specific tone',
                      description: 'Customize different tone presets individually for WhatsApp, Instagram, and Twilio.',
                    },
                  ].map((setting) => {
                    const isChecked = Boolean(formData.channel_settings[setting.key]);
                    return (
                      <div key={setting.key} className="flex items-center justify-between gap-4 py-1">
                        <div>
                          <div className="text-xs font-medium text-white">{setting.title}</div>
                          <div className="text-[11px] text-zinc-400">{setting.description}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              channel_settings: {
                                ...prev.channel_settings,
                                [setting.key]: !isChecked,
                              },
                            }));
                          }}
                          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                            isChecked ? 'bg-purple-600' : 'bg-zinc-700'
                          }`}
                        >
                          <motion.div
                            animate={{ x: isChecked ? 20 : 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className="w-5 h-5 rounded-full bg-white shadow-md"
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Per-Channel Tone Selection Accordion (visible when channel_specific_tone is true) */}
                <AnimatePresence>
                  {formData.channel_settings?.channel_specific_tone && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden pt-3 border-t border-white/[0.08]"
                    >
                      <div className="p-4 rounded-xl bg-[#101726]/80 border border-purple-500/20 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-purple-300 uppercase tracking-wide">
                            Channel Tone Customization
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            Customizes the agent&apos;s communication tone per channel
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                          {/* WhatsApp Tone */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              WhatsApp Tone
                            </label>
                            <div className="relative">
                              <select
                                value={formData.channel_settings?.channel_tones?.whatsapp || 'Friendly & Professional'}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    channel_settings: {
                                      ...prev.channel_settings,
                                      channel_tones: {
                                        ...prev.channel_settings.channel_tones,
                                        whatsapp: e.target.value,
                                      },
                                    },
                                  }))
                                }
                                className="w-full h-9 px-3 pr-8 rounded-lg bg-[#0c1220] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
                              >
                                {TONE_OPTIONS.map((t) => (
                                  <option key={t} value={t} className="bg-[#0c1220] text-white">
                                    {t}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                            </div>
                          </div>

                          {/* Instagram Tone */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-pink-500" />
                              Instagram Tone
                            </label>
                            <div className="relative">
                              <select
                                value={formData.channel_settings?.channel_tones?.instagram || 'Casual & Conversational'}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    channel_settings: {
                                      ...prev.channel_settings,
                                      channel_tones: {
                                        ...prev.channel_settings.channel_tones,
                                        instagram: e.target.value,
                                      },
                                    },
                                  }))
                                }
                                className="w-full h-9 px-3 pr-8 rounded-lg bg-[#0c1220] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
                              >
                                {TONE_OPTIONS.map((t) => (
                                  <option key={t} value={t} className="bg-[#0c1220] text-white">
                                    {t}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                            </div>
                          </div>

                          {/* Twilio Tone */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-medium text-zinc-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              Twilio SMS Tone
                            </label>
                            <div className="relative">
                              <select
                                value={formData.channel_settings?.channel_tones?.twilio || 'Concise & Direct'}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    channel_settings: {
                                      ...prev.channel_settings,
                                      channel_tones: {
                                        ...prev.channel_settings.channel_tones,
                                        twilio: e.target.value,
                                      },
                                    },
                                  }))
                                }
                                className="w-full h-9 px-3 pr-8 rounded-lg bg-[#0c1220] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
                              >
                                {TONE_OPTIONS.map((t) => (
                                  <option key={t} value={t} className="bg-[#0c1220] text-white">
                                    {t}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* SCREEN 4 — STEP 3: AI CONFIGURATION */}
          {/* ============================================================ */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">AI Model Configuration</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Choose the AI model and fine-tune parameters for your agent.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetAIConfig}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Reset to Default</span>
                </button>
              </div>

              {/* Model Provider Chips */}
              {(() => {
                const defaultProvidersList = [
                  { provider: 'google', displayName: 'Google', hasPlatformKey: false, models: [] },
                  { provider: 'groq', displayName: 'Groq', hasPlatformKey: false, models: [] },
                ];
                const activeProvidersList = (providersData.length > 0 ? providersData : defaultProvidersList)
                  .filter((p) => p.provider === 'google' || p.provider === 'groq');
                const currentProviderObj = activeProvidersList.find((p) => p.provider === formData.ai_config.provider) || activeProvidersList[0];
                const availableModels = currentProviderObj?.models || [];
                const isAvailable = Boolean(currentProviderObj?.hasPlatformKey && availableModels.length > 0);
                const currentModelObj = availableModels.find((m) => m.id === formData.ai_config.model) || availableModels[0] || {
                  id: formData.ai_config.model || '',
                  name: formData.ai_config.model || (isAvailable ? 'No model selected' : 'Not available'),
                  description: isAvailable
                    ? 'AI model configured for this agent.'
                    : 'This provider is currently unavailable. Please contact administrator.',
                  contextWindow: 128000,
                  maxTokensLimit: 4096,
                  supportsTools: true,
                  supportsStructuredOutput: true,
                  isRecommended: false
                };

                return (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-300">Model Provider</label>
                        <span className="text-[11px] text-zinc-400">
                          {activeProvidersList.length} providers available
                        </span>
                      </div>

                      {/* Provider Chips */}
                      <div className="flex flex-wrap gap-2.5">
                        {activeProvidersList.map((p) => {
                          const isSelected = formData.ai_config.provider === p.provider;
                          const hasLiveModels = Boolean(p.hasPlatformKey && p.models && p.models.length > 0);
                          return (
                            <button
                              key={p.provider}
                              type="button"
                              onClick={() => {
                                const fallback = p.models?.[0]?.id || '';
                                setFormData((prev) => ({
                                  ...prev,
                                  ai_config: { ...prev.ai_config, provider: p.provider, model: fallback },
                                }));
                              }}
                              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center gap-2 ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/30'
                                  : 'bg-[#101726] text-zinc-400 border-white/10 hover:text-white hover:border-white/20'
                              }`}
                            >
                              <span>{p.displayName || p.provider}</span>
                              {hasLiveModels ? (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" title="Available on platform" />
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-rose-400/80" title="Not available - contact administrator" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Status Banner when Provider is NOT configured on platform */}
                      {!isAvailable && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-start gap-3">
                          <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="font-semibold text-amber-300">
                              {currentProviderObj?.displayName} is currently not available
                            </div>
                            <p className="text-[11px] text-amber-200/80 leading-relaxed">
                              This provider is currently unavailable. Please contact administrator or select an active provider above.
                            </p>
                          </div>
                        </div>
                      )}


                    </div>

                    {/* Model Selection & Capabilities Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-zinc-300">Model</label>
                          {isAvailable && currentModelObj.isRecommended && (
                            <span className="text-[10px] text-emerald-400 font-medium">✓ Recommended</span>
                          )}
                        </div>

                        {isAvailable ? (
                          <select
                            value={formData.ai_config.model}
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const modelObj = availableModels.find((m) => m.id === selectedId);
                              setFormData({
                                ...formData,
                                ai_config: {
                                  ...formData.ai_config,
                                  model: selectedId,
                                  max_tokens: Math.min(formData.ai_config.max_tokens, modelObj?.maxTokensLimit || 4096)
                                },
                              });
                            }}
                            className="w-full bg-[#121927] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                          >
                            {availableModels.map((m) => (
                              <option key={m.id} value={m.id} className="bg-[#121927] text-white">
                                {m.name || m.id} {m.isRecommended ? '— Recommended' : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="p-3 rounded-xl bg-[#121927]/60 border border-dashed border-zinc-700 text-zinc-400 text-xs flex items-center justify-between">
                            <span className="italic">Not available — Contact administrator</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">Disabled</span>
                          </div>
                        )}

                      </div>

                      <div className="p-4 rounded-xl bg-[#121927] border border-white/10 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-purple-300">Model Description</span>
                          <span className="text-[10px] text-zinc-400 capitalize">{currentProviderObj?.displayName || formData.ai_config.provider}</span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {isAvailable
                            ? (currentModelObj.description || 'Configured AI model for reasoning, conversation, and knowledge retrieval.')
                            : 'This provider is currently unavailable. Please contact administrator.'}
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Generation Parameters */}
              <div className="rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white tracking-wide uppercase">
                    Generation Parameters
                  </h3>
                  <span className="text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                    Fine-tune AI responses
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Temperature */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-300">Temperature</span>
                        <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded font-normal">
                          Recommended: 0.3
                        </span>
                      </div>
                      <span className="text-purple-300 font-mono">{formData.ai_config.temperature}</span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      value={formData.ai_config.temperature}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ai_config: { ...formData.ai_config, temperature: parseFloat(e.target.value) },
                        })
                      }
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>↓ Decrease (0.0): Strict, factual & deterministic</span>
                      <span>↑ Increase (1.0): Creative & varied (higher hallucination risk)</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-300">Max Tokens</span>
                        <span className="text-[10px] bg-white/[0.06] text-zinc-400 border border-white/[0.08] px-1.5 py-0.5 rounded font-normal">
                          Default: 1024
                        </span>
                      </div>
                      <span className="text-purple-300 font-mono">{formData.ai_config.max_tokens}</span>
                    </div>
                    <input
                      type="range"
                      min={128}
                      max={4096}
                      step={64}
                      value={formData.ai_config.max_tokens}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ai_config: { ...formData.ai_config, max_tokens: parseInt(e.target.value) },
                        })
                      }
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>Maximum length of the response (128 - 4,096 tokens)</span>
                    </div>
                  </div>

                  {/* Top P, Frequency & Presence Penalty */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {/* Top P */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-300">Top P</span>
                          <span className="text-[9px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1 py-0.5 rounded font-normal">
                            Rec: 1.0
                          </span>
                        </div>
                        <span className="text-purple-300 font-mono">{formData.ai_config.top_p}</span>
                      </div>
                      <input
                        type="number"
                        step={0.05}
                        min={0.1}
                        max={1.0}
                        value={formData.ai_config.top_p}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ai_config: { ...formData.ai_config, top_p: parseFloat(e.target.value) },
                          })
                        }
                        className="w-full bg-[#121927] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                      />
                      <p className="text-[10px] text-zinc-400 leading-tight">
                        <span className="text-zinc-300">↓ Decrease:</span> Focused vocabulary<br/>
                        <span className="text-zinc-300">↑ Increase:</span> Broader word pool
                      </p>
                    </div>

                    {/* Frequency Penalty */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-300">Frequency Penalty</span>
                          <span className="text-[9px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1 py-0.5 rounded font-normal">
                            Rec: 0.0
                          </span>
                        </div>
                        <span className="text-purple-300 font-mono">{formData.ai_config.frequency_penalty}</span>
                      </div>
                      <input
                        type="number"
                        step={0.1}
                        min={-2.0}
                        max={2.0}
                        value={formData.ai_config.frequency_penalty}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ai_config: { ...formData.ai_config, frequency_penalty: parseFloat(e.target.value) },
                          })
                        }
                        className="w-full bg-[#121927] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                      />
                      <p className="text-[10px] text-zinc-400 leading-tight">
                        <span className="text-zinc-300">↑ Increase:</span> Reduces word repetition<br/>
                        <span className="text-zinc-300">↓ Decrease:</span> Allows repetition
                      </p>
                    </div>

                    {/* Presence Penalty */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-300">Presence Penalty</span>
                          <span className="text-[9px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1 py-0.5 rounded font-normal">
                            Rec: 0.0
                          </span>
                        </div>
                        <span className="text-purple-300 font-mono">{formData.ai_config.presence_penalty}</span>
                      </div>
                      <input
                        type="number"
                        step={0.1}
                        min={-2.0}
                        max={2.0}
                        value={formData.ai_config.presence_penalty}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ai_config: { ...formData.ai_config, presence_penalty: parseFloat(e.target.value) },
                          })
                        }
                        className="w-full bg-[#121927] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                      />
                      <p className="text-[10px] text-zinc-400 leading-tight">
                        <span className="text-zinc-300">↑ Increase:</span> Introduces new topics<br/>
                        <span className="text-zinc-300">↓ Decrease:</span> Stays on current topic
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Response Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Response Format</label>
                  <select
                    value={formData.ai_config.response_format}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ai_config: { ...formData.ai_config, response_format: e.target.value },
                      })
                    }
                    className="w-full bg-[#121927] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  >
                    <option value="markdown">Markdown (Rich text)</option>
                    <option value="plain_text">Plain text</option>
                    <option value="json">Structured JSON</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Max Response Time</label>
                  <select
                    value={formData.ai_config.max_response_time}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ai_config: { ...formData.ai_config, max_response_time: e.target.value },
                      })
                    }
                    className="w-full bg-[#121927] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  >
                    <option value="normal">Normal (5–10 seconds)</option>
                    <option value="fast">Fast (&lt;5 seconds)</option>
                    <option value="relaxed">Relaxed (10–30 seconds)</option>
                  </select>
                </div>
              </div>

              {/* System Prompt Customizer (Required) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">
                    Custom System Prompt <span className="text-purple-400 font-semibold">* (Required)</span>
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {formData.ai_config.system_prompt?.length || 0} characters
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={formData.ai_config.system_prompt}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ai_config: { ...formData.ai_config, system_prompt: e.target.value },
                    })
                  }
                  placeholder={`You are ${formData.name}, a helpful AI assistant representing ${formData.business_name || 'our company'}. Respond politely and accurately...`}
                  className="w-full bg-[#121927] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50 resize-y leading-relaxed font-mono"
                />
                <div className="flex items-center justify-between text-[10px] text-zinc-500">
                  <span>Define greeting style, qualification questions, and escalation policies.</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* SCREEN 5 — STEP 4: KNOWLEDGE BASE */}
          {/* ============================================================ */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Top Header Card with Global Toggles */}
              <div className="p-5 md:p-6 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <Database size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white tracking-tight">Knowledge Base</h2>
                      <p className="text-xs text-zinc-400">
                        Equip your agent with company documents, live website data, and custom answers.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Global Knowledge Toggles */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Use Knowledge Base Toggle */}
                  <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#121927] border border-white/5">
                    <span className="text-xs font-medium text-zinc-200">Use knowledge base</span>
                    <button
                      type="button"
                      onClick={() => {
                        const isChecked = formData.knowledge_config.settings.use_knowledge_base;
                        setFormData((prev) => ({
                          ...prev,
                          knowledge_config: {
                            ...prev.knowledge_config,
                            settings: {
                              ...prev.knowledge_config.settings,
                              use_knowledge_base: !isChecked,
                            },
                          },
                        }));
                      }}
                      className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                        formData.knowledge_config.settings.use_knowledge_base ? 'bg-purple-600' : 'bg-zinc-700'
                      }`}
                    >
                      <motion.div
                        animate={{ x: formData.knowledge_config.settings.use_knowledge_base ? 16 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-4 h-4 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>

                  {/* Web Search Toggle */}
                  <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#121927] border border-white/5">
                    <span className="text-xs font-medium text-zinc-200">Search Web (Live Data)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const isChecked = formData.knowledge_config.settings.web_search;
                        setFormData((prev) => ({
                          ...prev,
                          knowledge_config: {
                            ...prev.knowledge_config,
                            settings: {
                              ...prev.knowledge_config.settings,
                              web_search: !isChecked,
                            },
                          },
                        }));
                      }}
                      className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                        formData.knowledge_config.settings.web_search ? 'bg-purple-600' : 'bg-zinc-700'
                      }`}
                    >
                      <motion.div
                        animate={{ x: formData.knowledge_config.settings.web_search ? 16 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-4 h-4 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Disabled Knowledge Warning Banner */}
              {!formData.knowledge_config.settings.use_knowledge_base && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0 text-amber-400" />
                  <span>Knowledge Base is currently turned off. Turn on <b>Use knowledge base</b> above to let your agent answer questions using these sources.</span>
                </div>
              )}

              {/* Knowledge Base Activity or Error Banner */}
              {knowledgeFeedback.message && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                    knowledgeFeedback.type === 'error'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {knowledgeFeedback.type === 'error' ? (
                      <AlertCircle size={15} className="shrink-0" />
                    ) : (
                      <CheckCircle2 size={15} className="shrink-0" />
                    )}
                    <span>{knowledgeFeedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setKnowledgeFeedback({ message: '', type: '' })}
                    className="text-zinc-400 hover:text-white cursor-pointer ml-2"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {isKnowledgeBusy && (
                <div className="p-3.5 rounded-xl bg-purple-900/20 border border-purple-500/30 flex items-center gap-2 text-xs text-purple-200">
                  <Loader2 size={15} className="animate-spin text-purple-400 shrink-0" />
                  <span>Vector DB is indexing chunks into collection <b>{formData.knowledge_config.collection}</b>...</span>
                </div>
              )}

              {/* Segmented Navigation Tabs */}
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08]">
                {[
                  { id: 'upload', label: 'Upload Documents', count: uploadedDocumentFiles.length, icon: <Upload size={14} /> },
                  { id: 'website', label: 'Website Links', count: websiteUrlsList.length, icon: <Globe size={14} /> },
                  { id: 'faq', label: 'Custom FAQs', count: formData.knowledge_config.faqs.length, icon: <FileText size={14} /> },
                ].map((tab) => {
                  const isActive = knowledgeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setKnowledgeTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-900/30'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="shrink-0">{tab.icon}</span>
                      <span>{tab.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-400'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Tab: Upload Files */}
              {knowledgeTab === 'upload' && (
                <div className="space-y-6">
                  {/* Top Grid: Drop Zone + Guidance */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Drag and Drop Zone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="lg:col-span-8 p-8 min-h-[170px] rounded-2xl bg-[#0c1220]/80 border-2 border-dashed border-white/15 hover:border-purple-500/50 flex flex-col items-center justify-center text-center cursor-pointer transition-all group hover:bg-purple-950/10"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.txt,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform shadow-md">
                        <Upload size={22} />
                      </div>
                      <div className="text-xs font-semibold text-white">
                        Drag and drop files here, or <span className="text-purple-400 underline">click to browse</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Supports PDF, DOC, DOCX, TXT, CSV (Max 50MB per file)
                      </p>
                    </div>

                    {/* Content Suggestions Guide */}
                    <div className="lg:col-span-4 p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-white">💡 What to Upload?</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mb-3">
                          Upload high-quality business material for accurate agent responses:
                        </p>
                        <ul className="space-y-2 text-[11px] text-zinc-300">
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                            <span>Product catalogs & pricing sheets</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                            <span>Service packages & specifications</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                            <span>Refund, warranty & legal policies</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                            <span>Brochures, user manuals & guidelines</span>
                          </li>
                        </ul>
                      </div>
                      <div className="pt-2 border-t border-white/5 text-[10px] text-zinc-500">
                        Documents are chunked and embedded in Vector DB
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Files Section */}
                  <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>Uploaded Documents</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-semibold border border-purple-500/20">
                          {uploadedDocumentFiles.length}
                        </span>
                      </h3>
                      {uploadedDocumentFiles.length > 0 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                        >
                          + Upload More
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {uploadedDocumentFiles.length === 0 ? (
                        <div className="p-8 rounded-xl bg-[#0e1424]/40 border border-dashed border-white/10 text-center space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-white/5 mx-auto flex items-center justify-center text-zinc-500">
                            <FileText size={20} />
                          </div>
                          <div className="text-xs text-zinc-400 font-medium">No documents uploaded yet</div>
                          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                            Upload your documents above to give your agent proprietary domain knowledge.
                          </p>
                        </div>
                      ) : (
                        uploadedDocumentFiles.map((file) => (
                          <div
                            key={file.id}
                            className="p-3.5 rounded-xl bg-[#0e1424] border border-white/10 flex items-center justify-between gap-4 hover:border-purple-500/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                                <FileText size={17} />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-medium text-white truncate">{file.name}</div>
                                <div className="text-[10px] text-zinc-400 mt-0.5">
                                  {file.size} • {file.time}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span
                                className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${
                                  file.status === 'Synced'
                                    ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}
                              >
                                {file.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteFile(file)}
                                className="text-zinc-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                                title="Remove file"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Website Links */}
              {knowledgeTab === 'website' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] space-y-3">
                    <h3 className="text-xs font-semibold text-white">Sync Website URL</h3>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://yourwebsite.com/faq"
                        value={newWebsiteUrl}
                        onChange={(e) => setNewWebsiteUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddWebsiteUrl();
                          }
                        }}
                        className="flex-1 bg-[#121927] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                      />
                      <button
                        type="button"
                        disabled={isKnowledgeBusy || !newWebsiteUrl.trim()}
                        onClick={handleAddWebsiteUrl}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-purple-900/30"
                      >
                        {isKnowledgeBusy ? <Loader2 size={13} className="animate-spin" /> : null}
                        <span>+ Add URL</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      The agent will periodically crawl and index information on this website into this agent&apos;s private collection in Vector DB.
                    </p>
                  </div>

                  {/* Synced Website URLs List */}
                  <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>Synced Website URLs</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-semibold border border-purple-500/20">
                          {websiteUrlsList.length}
                        </span>
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {websiteUrlsList.length === 0 ? (
                        <div className="p-8 rounded-xl bg-[#0e1424]/40 border border-dashed border-white/10 text-center space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-white/5 mx-auto flex items-center justify-center text-zinc-500">
                            <Globe size={20} />
                          </div>
                          <div className="text-xs text-zinc-400 font-medium">No website URLs added yet</div>
                          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                            Enter a URL above and click &quot;+ Add URL&quot; to index your website or documentation pages.
                          </p>
                        </div>
                      ) : (
                        websiteUrlsList.map((urlItem) => (
                          <div
                            key={urlItem.id}
                            className="p-3.5 rounded-xl bg-[#0e1424] border border-white/10 flex items-center justify-between gap-4 hover:border-purple-500/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0 border border-sky-500/20">
                                <Globe size={16} />
                              </div>
                              <div className="truncate flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium text-white truncate">{urlItem.url}</span>
                                  <a
                                    href={urlItem.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zinc-400 hover:text-white transition-colors shrink-0"
                                    title="Open link"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                </div>
                                <div className="text-[10px] text-zinc-400 mt-0.5">
                                  {urlItem.time}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span
                                className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${
                                  urlItem.status === 'Synced' || urlItem.status === 'Indexed'
                                    ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                                    : urlItem.status === 'Syncing' || urlItem.status === 'Indexing'
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse'
                                    : urlItem.status === 'Error'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}
                              >
                                {urlItem.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteWebsiteUrl(urlItem.url, urlItem.entry_id || urlItem.id)}
                                className="text-zinc-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                                title="Remove URL"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: FAQs */}
              {knowledgeTab === 'faq' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div>
                        <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>Custom FAQs</span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-semibold border border-purple-500/20">
                            {formData.knowledge_config.faqs.length}
                          </span>
                        </h3>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Provide exact questions and answers for direct matching during customer chats.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddFaqModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-900/30 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Add FAQ</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {formData.knowledge_config.faqs.length === 0 ? (
                        <div className="p-8 rounded-xl bg-[#0e1424]/40 border border-dashed border-white/10 text-center space-y-2">
                          <div className="w-10 h-10 rounded-xl bg-white/5 mx-auto flex items-center justify-center text-zinc-500">
                            <FileText size={20} />
                          </div>
                          <div className="text-xs text-zinc-400 font-medium">No custom FAQs added yet</div>
                          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                            Click &quot;+ Add FAQ&quot; above to provide direct answers for common customer questions.
                          </p>
                        </div>
                      ) : (
                        formData.knowledge_config.faqs.map((faq) => (
                          <div
                            key={faq.id}
                            className="p-4 rounded-xl bg-[#0e1424] border border-white/10 flex items-start justify-between gap-4 hover:border-purple-500/30 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-white flex items-center gap-2">
                                <span className="text-purple-400 font-bold">Q:</span>
                                <span>{faq.question}</span>
                              </div>
                              <div className="text-xs text-zinc-400 pl-4">
                                <span className="text-emerald-400 font-bold mr-1">A:</span>
                                {faq.answer}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteFaq(faq)}
                              className="text-zinc-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
                              title="Delete FAQ"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer: Vector DB Isolation Info (Subtle & Professional) */}
              <div className="p-4 rounded-xl bg-[#080d16] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-400">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                    <Database size={13} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-zinc-300 font-medium">Vector DB Collection:</span>
                    <span className="text-purple-300 font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded border border-purple-500/20">
                      {formData.knowledge_config.collection || 'agent_collection'}
                    </span>
                    <span className="text-zinc-500 text-[11px] hidden sm:inline">• Chunks are partitioned under this tag</span>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500">Auto-managed vector isolation</span>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 6 — STEP 5: REVIEW & CREATE */}
          {/* ============================================================ */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Review & Create</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Review your configuration before creating your agent.
                </p>
              </div>

              {/* Review Sections Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Agent Summary */}
                <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Agent Summary
                    </h3>
                    <button
                      type="button"
                      onClick={() => jumpToStep(1)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-zinc-400">Profile Image</span>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white shadow-sm overflow-hidden border border-purple-400/30">
                        {formData.avatar_url ? (
                          <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <Bot size={16} />
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Name</span>
                      <span className="font-semibold text-white">{formData.name}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Type</span>
                      <span className="text-zinc-200 capitalize">
                        {formData.agent_type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Description</span>
                      <span className="text-zinc-300 text-right max-w-[240px] truncate">
                        {formData.description}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Language</span>
                      <span className="text-zinc-200">{formData.language}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Tone</span>
                      <span className="text-zinc-200">{formData.tone_of_voice}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Business</span>
                      <span className="text-zinc-200">{formData.business_name}</span>
                    </div>
                    {formData.website_url && (
                      <div className="flex justify-between py-0.5">
                        <span className="text-zinc-400">Website</span>
                        <span className="text-purple-300 truncate max-w-[200px]">
                          {formData.website_url}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Channels & Settings */}
                <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Selected Channels & Settings
                    </h3>
                    <button
                      type="button"
                      onClick={() => jumpToStep(2)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(formData.channels_config)
                      .filter(([, v]) => v?.enabled)
                      .map(([k]) => {
                        const channelLabel = k === 'whatsapp' ? 'WhatsApp Business' : k === 'instagram' ? 'Instagram' : k === 'twilio' ? 'Twilio SMS' : k;
                        const channelTone = formData.channel_settings?.channel_specific_tone
                          ? (formData.channel_settings?.channel_tones?.[k] || formData.tone_of_voice)
                          : formData.tone_of_voice;
                        return (
                          <div
                            key={k}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#121927] text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{channelLabel}</span>
                              <span className="text-[10px] text-purple-300/80 font-normal">• Tone: {channelTone}</span>
                            </div>
                            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Enabled
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                    <div>Auto Reply: <span className="text-white font-medium">{formData.channel_settings?.auto_reply ? 'Enabled' : 'Disabled'}</span></div>
                    <div>CRM Sync: <span className="text-white font-medium">{formData.channel_settings?.sync_crm ? 'Enabled' : 'Disabled'}</span></div>
                  </div>
                </div>

                {/* 3. AI Configuration */}
                <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      AI Configuration
                    </h3>
                    <button
                      type="button"
                      onClick={() => jumpToStep(3)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Model Provider</span>
                      <span className="text-white capitalize">{formData.ai_config.provider}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Model</span>
                      <span className="font-mono text-purple-300">{formData.ai_config.model}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Temperature</span>
                      <span className="font-mono text-zinc-200">{formData.ai_config.temperature}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Max Tokens</span>
                      <span className="font-mono text-zinc-200">{formData.ai_config.max_tokens}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Top P</span>
                      <span className="font-mono text-zinc-200">{formData.ai_config.top_p}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Tone</span>
                      <span className="text-purple-300 font-medium">{formData.tone_of_voice}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Format</span>
                      <span className="text-zinc-200 capitalize">{formData.ai_config.response_format}</span>
                    </div>
                    <div className="pt-2 border-t border-white/5 space-y-1">
                      <span className="text-zinc-400 text-[11px] block">System Prompt Preview</span>
                      <p className="text-[11px] text-zinc-300 font-mono bg-[#121927] p-2 rounded-lg line-clamp-3 leading-relaxed">
                        {formData.ai_config.system_prompt || 'No system prompt defined.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Knowledge Sources */}
                <div className="p-5 rounded-2xl bg-[#0c1220]/80 border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Knowledge Sources
                    </h3>
                    <button
                      type="button"
                      onClick={() => jumpToStep(4)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Vector Collection</span>
                      <span className="text-purple-300 font-mono text-[11px]">{formData.knowledge_config.collection || 'agent_default'}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Files Uploaded</span>
                      <span className="text-white">{uploadedDocumentFiles.length} files</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">Website URLs Synced</span>
                      <span className="text-purple-300">
                        {websiteUrlsList.length > 0 ? `${websiteUrlsList.length} URLs synced` : (formData.website_url || 'None')}
                      </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-zinc-400">FAQs Added</span>
                      <span className="text-white">{formData.knowledge_config.faqs.length} questions</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between pt-6 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 text-xs font-medium text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCreateAgent}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-900/30 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Saving Agent...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>{editId ? 'Save Changes' : 'Create AI Agent'}</span>
                      <ArrowRight size={14} className="ml-0.5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add FAQ Modal */}
      {showAddFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0f1523] border border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Add Custom FAQ</h3>
              <button
                type="button"
                onClick={() => setShowAddFaqModal(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-zinc-300">Question</label>
                <input
                  type="text"
                  placeholder="e.g. What are your delivery hours?"
                  value={newFaq.question}
                  onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                  className="w-full bg-[#121927] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-300">Answer</label>
                <textarea
                  rows={3}
                  placeholder="e.g. We deliver between 9 AM and 8 PM daily."
                  value={newFaq.answer}
                  onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                  className="w-full bg-[#121927] border border-white/10 rounded-xl px-3 py-2 text-xs text-white resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddFaqModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isKnowledgeBusy || !newFaq.question.trim() || !newFaq.answer.trim()}
                onClick={handleAddFaq}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                {isKnowledgeBusy ? <Loader2 size={13} className="animate-spin" /> : null}
                <span>Save FAQ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
