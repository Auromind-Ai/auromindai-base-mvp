'use client';

import React, { useState, useEffect } from 'react';
import {
  PenLine,
  FileText,
  Sparkles,
  Smile,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Code2,
  ChevronDown,
  UploadCloud,
  X,
  Plus,
  Info,
  CheckCircle,
  AlertCircle,
  Search,
} from 'lucide-react';
import WhatsAppPreview from '../WhatsAppPreview';
import QuickTips from '../QuickTips';
import { fetchApprovedTemplates } from '@/lib/api/marketing';

export const VARIABLES_LIST = [
  { tag: '{{name}}', label: 'Contact Name' },
  { tag: '{{phone}}', label: 'Phone Number' },
  { tag: '{{email}}', label: 'Email Address' },
  { tag: '{{company}}', label: 'Company Name' },
  { tag: '{{city}}', label: 'City / Location' },
  { tag: '{{coupon_code}}', label: 'Promo / Coupon Code' },
];

export default function MessageStep({ data, updateData, onNext, onBack, workspaceId }) {
  const [activeTab, setActiveTab] = useState(data.messageMode || 'type'); // 'type' | 'template' | 'ai'
  const [message, setMessage] = useState(data.messageBody || '');
  const [hasMedia, setHasMedia] = useState(Boolean(data.mediaUrl));
  const [mediaName, setMediaName] = useState(data.mediaName || '');
  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('ALL');
  const [selectedTemplateId, setSelectedTemplateId] = useState(data.selectedTemplateId || '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isVarDropdownOpen, setIsVarDropdownOpen] = useState(false);
  const [customVarName, setCustomVarName] = useState('');
  const [showCustomVarModal, setShowCustomVarModal] = useState(false);
  const [error, setError] = useState('');

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const displayedVariables = React.useMemo(() => {
    if (selectedTemplate?.variables && Array.isArray(selectedTemplate.variables) && selectedTemplate.variables.length > 0) {
      const tplVars = selectedTemplate.variables.map((tag, idx) => ({
        tag,
        label: `Template Var {{${idx + 1}}}`,
      }));
      const existingTags = new Set(tplVars.map((v) => v.tag));
      const otherDefaults = VARIABLES_LIST.filter((v) => !existingTags.has(v.tag));
      return [...tplVars, ...otherDefaults];
    }
    return VARIABLES_LIST;
  }, [selectedTemplate]);

  useEffect(() => {
    let isMounted = true;
    const targetWsId = workspaceId || data?.workspaceId;
    fetchApprovedTemplates(targetWsId)
      .then((tpls) => {
        if (isMounted) {
          setTemplates(tpls || []);
          setIsLoadingTemplates(false);
        }
      })
      .catch((err) => {
        console.warn('Failed to load real templates:', err);
        if (isMounted) {
          setTemplates([]);
          setIsLoadingTemplates(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [workspaceId, data?.workspaceId]);

  const handleInsertVariable = (varTag) => {
    setMessage((prev) => prev + (prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' ') + varTag);
    updateData({ messageBody: message + ' ' + varTag });
  };

  const handleAddCustomVar = () => {
    if (!customVarName.trim()) return;
    const clean = customVarName.trim().replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    const tag = `{{${clean}}}`;
    handleInsertVariable(tag);
    setCustomVarName('');
    setShowCustomVarModal(false);
  };

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    const bodyContent = tpl.body || tpl.content || '';
    setMessage(bodyContent);
    updateData({
      selectedTemplateId: tpl.id,
      templateName: tpl.name,
      messageBody: bodyContent,
      templateCategory: tpl.category,
    });
  };

  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    setTimeout(() => {
      const generated = `Hi {{name}},\n\n🌟 Exclusive announcement from OrbionAgents! Based on "${aiPrompt}", you've unlocked a special promo code: {{coupon_code}}.\n\nVisit: {{website}} to explore today!\n\nBest regards,\nTeam OrbionAgents`;
      setMessage(generated);
      updateData({ messageBody: generated, messageMode: 'ai' });
      setIsAiGenerating(false);
    }, 900);
  };

  const handleProceed = () => {
    if (!message.trim()) {
      setError('Please write or select a message content.');
      return;
    }
    updateData({
      messageBody: message,
      messageMode: activeTab,
      mediaUrl: hasMedia ? (data.mediaUrl || null) : null,
      mediaName: hasMedia ? (mediaName || 'Attachment') : null,
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
          Create Your Message
        </h3>
        <p className="text-xs text-[#8c88a6] mt-0.5">
          Write your message or use a template. Personalize it with variables to make it more engaging.
        </p>
      </div>

      {/* 3 Mode Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[#080a12] border border-[#1b2238] max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('type')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
            activeTab === 'type'
              ? 'bg-[#635BFF] text-white shadow-[0_0_12px_rgba(99,91,255,0.4)]'
              : 'text-[#8c94a6] hover:text-white'
          }`}
        >
          <PenLine size={13} />
          <span>Type Message</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('template')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
            activeTab === 'template'
              ? 'bg-[#635BFF] text-white shadow-[0_0_12px_rgba(99,91,255,0.4)]'
              : 'text-[#8c88a6] hover:text-white'
          }`}
        >
          <FileText size={13} />
          <span>Use Template</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
            activeTab === 'ai'
              ? 'bg-[#635BFF] text-white shadow-[0_0_12px_rgba(99,91,255,0.4)]'
              : 'text-[#8c88a6] hover:text-white'
          }`}
        >
          <Sparkles size={13} className="text-amber-300" />
          <span>AI Generate</span>
        </button>
      </div>

      {/* Main Grid: Editor + Variables + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start">
        {/* Left Column (7 cols): Message Editor / Templates / AI prompt */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-5">
          {/* TAB 1: TYPE MESSAGE */}
          {activeTab === 'type' && (
            <div className="space-y-4">
              {/* Textarea container */}
              <div className="rounded-xl bg-[#080a12] border border-[#1b2238] overflow-hidden focus-within:border-[#635BFF] transition-all">
                <textarea
                  rows={6}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    updateData({ messageBody: e.target.value });
                  }}
                  placeholder="Write your WhatsApp message here..."
                  className="w-full p-3.5 bg-transparent text-xs sm:text-sm text-white placeholder-[#586174] outline-none resize-none leading-relaxed"
                />

                {/* Toolbar & Character Count */}
                <div className="px-3 py-2 bg-[#0d101c] border-t border-[#1b2238] flex flex-wrap items-center justify-between gap-2">
                  {/* Text Formatting Controls */}
                  <div className="flex items-center gap-1 text-[#8c94a6]">
                    <button
                      type="button"
                      onClick={() => setMessage((p) => p + ' 😊')}
                      className="p-1.5 rounded hover:bg-[#1a2136] hover:text-white transition-colors"
                      title="Insert Emoji"
                    >
                      <Smile size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessage((p) => p + ' *bold text*')}
                      className="p-1.5 rounded hover:bg-[#1a2136] hover:text-white transition-colors"
                      title="Bold"
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessage((p) => p + ' _italic text_')}
                      className="p-1.5 rounded hover:bg-[#1a2136] hover:text-white transition-colors"
                      title="Italic"
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessage((p) => p + '\n• Bullet point')}
                      className="p-1.5 rounded hover:bg-[#1a2136] hover:text-white transition-colors"
                      title="Bullet list"
                    >
                      <List size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessage((p) => p + '\n1. List item')}
                      className="p-1.5 rounded hover:bg-[#1a2136] hover:text-white transition-colors"
                      title="Numbered list"
                    >
                      <ListOrdered size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessage((p) => p + ' https://yourwebsite.com')}
                      className="p-1.5 rounded hover:bg-[#1a2136] hover:text-white transition-colors"
                      title="Add Link"
                    >
                      <Link2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertVariable('{{name}}')}
                      className="p-1.5 rounded hover:bg-[#1a2136] hover:text-white transition-colors"
                      title="Add Variable"
                    >
                      <Code2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-[#6b768c]">
                      {message.length}/1024 characters
                    </span>

                    {/* Add Variable Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsVarDropdownOpen(!isVarDropdownOpen)}
                        className="px-2.5 py-1 rounded-lg bg-[#16132d] border border-[#635BFF]/30 text-[#a78bfa] text-xs font-medium flex items-center gap-1 hover:bg-[#635BFF]/20 transition-all"
                      >
                        <span>Add Variable</span>
                        <ChevronDown size={12} />
                      </button>

                      {isVarDropdownOpen && (
                        <div className="absolute right-0 bottom-full mb-1 w-44 bg-[#0f1322] border border-[#1e2740] rounded-xl shadow-2xl p-1 z-30 space-y-0.5">
                          {displayedVariables.map((v) => (
                            <button
                              key={v.tag}
                              type="button"
                              onClick={() => {
                                handleInsertVariable(v.tag);
                                setIsVarDropdownOpen(false);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded text-xs text-white/90 hover:bg-[#635BFF]/20 hover:text-white flex items-center justify-between"
                            >
                              <span className="text-[11px] text-[#a78bfa]">{v.tag}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Media Section */}
              <div className="space-y-2">
                <div>
                  <h4 className="text-xs font-semibold text-white">
                    Add Media (Optional)
                  </h4>
                  <p className="text-[11px] text-[#8c94a6]">
                    Images, videos or documents (Max 16MB)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Upload Box */}
                  <div
                    onClick={() => setHasMedia(true)}
                    className="p-4 rounded-xl border border-dashed border-[#1e253b] bg-[#080a12] hover:border-[#635BFF] hover:bg-[#16132d] transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#16132d] flex items-center justify-center text-[#635BFF] group-hover:scale-110 transition-transform mb-1.5">
                      <UploadCloud size={16} />
                    </div>
                    <span className="text-xs font-medium text-white">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-[10px] text-[#6b768c] mt-0.5">
                      JPG, PNG, MP4, PDF (Max 16MB)
                    </span>
                  </div>

                  {/* Uploaded Media Preview */}
                  {hasMedia ? (
                    <div className="p-3 rounded-xl border border-[#635BFF]/30 bg-[#16132d] flex items-center justify-between relative group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#635BFF]/20 border border-[#635BFF]/30 flex items-center justify-center text-[#a78bfa] shadow-md">
                          <UploadCloud size={18} />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-white block">
                            {mediaName || 'Attached Media'}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-medium">
                            ✓ Ready to attach
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setHasMedia(false)}
                        className="p-1 rounded-full bg-[#1b2238] text-[#8c94a6] hover:text-white hover:bg-rose-500/30 transition-colors"
                        title="Remove Media"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-[#1b2238] bg-[#0a0d17] flex items-center justify-center text-[#6b768c] text-xs">
                      No media attached
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USE TEMPLATE */}
          {activeTab === 'template' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#635BFF]/10 border border-[#635BFF]/20 text-xs text-[#a78bfa] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={15} className="text-emerald-400 shrink-0" />
                  <span>Showing official Meta-approved message templates for high deliverability.</span>
                </div>
                <span className="text-[11px] font-semibold text-[#a78bfa]">
                  {templates.length} Active
                </span>
              </div>

              {/* Filter and Search Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b768c]" />
                  <input
                    type="text"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    placeholder="Search templates by name or text..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#080a12] border border-[#1b2238] text-xs text-white placeholder-[#586174] outline-none focus:border-[#635BFF]"
                  />
                  {templateSearch && (
                    <button
                      type="button"
                      onClick={() => setTemplateSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8c94a6] hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-[#080a12] p-1 rounded-lg border border-[#1b2238]">
                  {['ALL', 'MARKETING', 'UTILITY'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTemplateCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                        templateCategoryFilter === cat
                          ? 'bg-[#635BFF] text-white'
                          : 'text-[#8c94a6] hover:text-white'
                      }`}
                    >
                      {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Templates List */}
              {isLoadingTemplates ? (
                <div className="p-8 text-center rounded-xl bg-[#080a12] border border-[#1b2238] text-xs text-[#8c94a6]">
                  Loading official templates from database...
                </div>
              ) : templates.filter((tpl) => {
                const matchesCat =
                  templateCategoryFilter === 'ALL' ||
                  tpl.category?.toUpperCase() === templateCategoryFilter;
                const matchesSearch =
                  !templateSearch.trim() ||
                  tpl.name?.toLowerCase().includes(templateSearch.toLowerCase()) ||
                  tpl.body?.toLowerCase().includes(templateSearch.toLowerCase()) ||
                  tpl.header?.toLowerCase().includes(templateSearch.toLowerCase());
                return matchesCat && matchesSearch;
              }).length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-[#1e253b] bg-[#080a12] text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#635BFF]/10 border border-[#635BFF]/20 flex items-center justify-center text-[#a78bfa]">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">
                      {templates.length === 0 ? 'No Templates Available in Workspace' : 'No Matching Templates Found'}
                    </h4>
                    <p className="text-[11px] text-[#8c94a6] max-w-xs mt-1">
                      {templates.length === 0
                        ? 'Create WhatsApp templates in Template Studio to get Meta approval for bulk campaigns.'
                        : 'Try adjusting your search terms or filter selection.'}
                    </p>
                  </div>
                  {templates.length === 0 ? (
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href="/user/admin/templates/create"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#635BFF] text-white text-xs font-semibold hover:bg-[#5248e8] flex items-center gap-1"
                      >
                        <Plus size={13} />
                        <span>Create in Studio</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setActiveTab('type')}
                        className="px-3 py-1.5 rounded-lg bg-[#16132d] text-[#a78bfa] text-xs font-medium hover:bg-[#201b42]"
                      >
                        Type Message
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTemplateSearch('');
                        setTemplateCategoryFilter('ALL');
                      }}
                      className="text-xs text-[#635BFF] hover:underline"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                  {templates
                    .filter((tpl) => {
                      const matchesCat =
                        templateCategoryFilter === 'ALL' ||
                        tpl.category?.toUpperCase() === templateCategoryFilter;
                      const matchesSearch =
                        !templateSearch.trim() ||
                        tpl.name?.toLowerCase().includes(templateSearch.toLowerCase()) ||
                        tpl.body?.toLowerCase().includes(templateSearch.toLowerCase()) ||
                        tpl.header?.toLowerCase().includes(templateSearch.toLowerCase());
                      return matchesCat && matchesSearch;
                    })
                    .map((tpl) => {
                      const isSelected = selectedTemplateId === tpl.id;
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => handleSelectTemplate(tpl)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[#16132d] border-[#635BFF] shadow-[0_0_15px_rgba(99,91,255,0.25)]'
                              : 'bg-[#0a0d17] border-[#1b2238] hover:border-[#283250]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white tracking-tight">{tpl.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                tpl.category === 'MARKETING'
                                  ? 'bg-[#635BFF]/20 text-[#a78bfa] border-[#635BFF]/30'
                                  : 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                              }`}>
                                {tpl.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isSelected && (
                                <CheckCircle size={14} className="text-[#a78bfa]" />
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                {tpl.status || 'APPROVED'}
                              </span>
                            </div>
                          </div>

                          {tpl.header && (
                            <div className="text-[11px] font-semibold text-slate-200 mb-1">
                              {tpl.header}
                            </div>
                          )}

                          <p className="text-xs text-[#a8a3c2] leading-relaxed line-clamp-3">
                            {tpl.body}
                          </p>

                          {(tpl.footer || (tpl.variables && tpl.variables.length > 0)) && (
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1b2238] text-[10px] text-[#6b768c]">
                              <span>{tpl.footer || 'Meta Verified Template'}</span>
                              {tpl.variables && tpl.variables.length > 0 && (
                                <span className="text-[#a78bfa] font-medium">
                                  Variables: {tpl.variables.join(', ')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AI GENERATE */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0a0d17] border border-[#1b2238] space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#635BFF]" />
                  <h4 className="text-xs font-semibold text-white">
                    AI WhatsApp Campaign Copywriter
                  </h4>
                </div>

                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe your campaign goals, target audience, and key messaging (e.g. Special weekend discount for loyal customers)..."
                  className="w-full p-3 rounded-lg bg-[#080a12] border border-[#1b2238] text-xs text-white placeholder-[#586174] outline-none focus:border-[#635BFF]"
                />

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#8c94a6]">
                    ✨ Powered by Orbion AI Engine
                  </span>

                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={isAiGenerating || !aiPrompt.trim()}
                    className="px-4 py-1.5 rounded-lg bg-[#635BFF] text-white text-xs font-semibold hover:bg-[#5248e8] disabled:opacity-50 flex items-center gap-1.5 shadow"
                  >
                    {isAiGenerating ? (
                      <span>Generating copy...</span>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Generate Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Editable generated preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#d1d5db] block">
                  Generated Message (Review & Edit):
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-[#080a12] border border-[#1b2238] text-xs text-white outline-none focus:border-[#635BFF]"
                />
              </div>
            </div>
          )}

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        {/* Middle/Side Column (5 cols): Variables Panel + Quick Tips + Preview */}
        <div className="lg:col-span-5 space-y-4">
          {/* Variables Click-to-Add Box */}
          <div className="rounded-xl bg-[#0a0d17] border border-[#1a2136] p-4 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-semibold text-white">Message Variables</h4>
            </div>
            <p className="text-[11px] text-[#8c94a6] mb-3">
              Click to add variable in your message.
            </p>

            <div className="space-y-1.5">
              {displayedVariables.map((item) => (
                <div
                  key={item.tag}
                  onClick={() => handleInsertVariable(item.tag)}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#080a12] border border-[#1b2238] hover:border-[#635BFF] hover:bg-[#16132d] cursor-pointer transition-all group select-none"
                >
                  <span className="text-xs font-semibold text-[#a78bfa] group-hover:text-white">
                    {item.tag}
                  </span>
                  <span className="text-[11px] text-[#8c94a6]">
                    {item.label}
                  </span>
                </div>
              ))}

              {/* Custom Variable trigger */}
              <button
                type="button"
                onClick={() => setShowCustomVarModal(true)}
                className="w-full mt-2 py-2 rounded-lg border border-dashed border-[#1e253b] text-xs font-medium text-[#a78bfa] hover:border-[#635BFF] hover:bg-[#16132d] transition-all flex items-center justify-center gap-1.5"
              >
                <Plus size={13} />
                <span>Add Custom Variable</span>
              </button>
            </div>
          </div>

          {/* Quick Tips */}
          <QuickTips
            tips={[
              'Keep your message short and clear',
              'Use variables to personalize',
              'Add media to increase engagement',
              'Include a clear call-to-action',
              'Avoid spammy words',
            ]}
          />

          {/* Dynamic WhatsApp Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-[#8c94a6] flex items-center gap-1">
                Message Preview <Info size={11} className="text-[#635BFF]" />
              </span>
              <span className="text-[10px] text-[#6b768c]">Live rendering</span>
            </div>
            <WhatsAppPreview
              businessName={data.name || 'Your Business'}
              messageText={message}
              mediaUrl={hasMedia ? (data.mediaUrl || null) : null}
              mediaName={hasMedia ? (mediaName || 'Attachment') : ''}
            />
          </div>
        </div>
      </div>

      {/* Custom Variable Modal Dialog */}
      {showCustomVarModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0d101c] border border-[#1e253b] p-5 shadow-2xl space-y-4">
            <h4 className="text-sm font-semibold text-white">
              Add Custom Variable
            </h4>
            <p className="text-xs text-[#8c94a6]">
              Enter a variable identifier (e.g. order_id, delivery_date).
            </p>
            <input
              type="text"
              value={customVarName}
              onChange={(e) => setCustomVarName(e.target.value)}
              placeholder="e.g. loyalty_points"
              className="w-full px-3 py-2 rounded-xl bg-[#080a12] border border-[#1b2238] text-xs text-white outline-none focus:border-[#635BFF]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomVarModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#8c94a6] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomVar}
                className="px-4 py-1.5 rounded-lg bg-[#635BFF] text-white text-xs font-semibold hover:bg-[#5248e8]"
              >
                Insert Variable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-6 mt-4 border-t border-[#1b2238] flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-medium text-white/80 bg-[#101424] border border-[#1e263c] hover:bg-[#181e34] hover:text-white transition-all"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={handleProceed}
          className="px-6 py-2.5 sm:px-7 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#635BFF] hover:bg-[#5248e8] shadow-[0_0_18px_rgba(99,91,255,0.4)] flex items-center gap-2 transition-all active:scale-[0.98]"
        >
          <span>Next</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
