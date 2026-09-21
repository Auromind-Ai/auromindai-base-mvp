'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  X,
  Info,
  CheckCircle,
  Search,
} from 'lucide-react';
import WhatsAppPreview from '../WhatsAppPreview';
import QuickTips from '../QuickTips';
import { fetchApprovedTemplates } from '@/lib/api/marketing';

export default function MessageStep({ data, updateData, onNext, onBack, workspaceId }) {
  const [message, setMessage] = useState(data.messageBody || '');
  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('ALL');
  const [selectedTemplateId, setSelectedTemplateId] = useState(data.selectedTemplateId || '');
  const [error, setError] = useState('');

  // Fetch only official approved Meta templates
  useEffect(() => {
    let isMounted = true;
    const targetWsId = workspaceId || data?.workspaceId;
    fetchApprovedTemplates(targetWsId)
      .then((tpls) => {
        if (isMounted) {
          // Strictly filter out any draft or unapproved templates
          const approvedOnly = (tpls || []).filter(
            (t) => (t.status || '').toUpperCase() === 'APPROVED'
          );
          setTemplates(approvedOnly);
          setIsLoadingTemplates(false);

          // If the campaign had a selectedTemplateId that exists in approved templates, keep it
          if (data?.selectedTemplateId) {
            const found = approvedOnly.find((t) => String(t.id) === String(data.selectedTemplateId));
            if (found) {
              setSelectedTemplateId(found.id);
              if (!data.messageBody) {
                setMessage(found.body || found.content || '');
              }
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load approved templates:', err);
        if (isMounted) {
          setTemplates([]);
          setIsLoadingTemplates(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [workspaceId, data?.workspaceId, data?.selectedTemplateId, data?.messageBody]);

  const selectedTemplate = templates.find((t) => String(t.id) === String(selectedTemplateId));

  // Extract variables strictly from the currently selected template
  const displayedVariables = React.useMemo(() => {
    if (!selectedTemplate) return [];

    let vars = Array.isArray(selectedTemplate.variables) ? selectedTemplate.variables : [];
    if (vars.length === 0 && (selectedTemplate.body || selectedTemplate.content)) {
      const matched = (selectedTemplate.body || selectedTemplate.content).match(/\{\{[^}]+\}\}/g);
      vars = matched ? Array.from(new Set(matched)) : [];
    }

    return vars.map((tag) => {
      const normalized = tag.startsWith('{{') ? tag : `{{${tag}}}`;
      return {
        tag: normalized,
        label: `Template Var ${normalized}`,
      };
    });
  }, [selectedTemplate]);

  const handleInsertVariable = (varTag) => {
    setMessage((prev) => prev + (prev.endsWith(' ') || prev.endsWith('\n') ? '' : ' ') + varTag);
    updateData({ messageBody: message + ' ' + varTag });
  };

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setError('');
    const bodyContent = tpl.body || tpl.content || '';
    setMessage(bodyContent);
    updateData({
      selectedTemplateId: tpl.id,
      templateName: tpl.name,
      messageBody: bodyContent,
      templateCategory: tpl.category,
      messageMode: 'template',
    });
  };

  const handleProceed = () => {
    if (!selectedTemplateId) {
      setError('Please select an approved message template to proceed.');
      return;
    }
    updateData({
      messageBody: message,
      messageMode: 'template',
      selectedTemplateId,
      templateName: selectedTemplate?.name || data.templateName,
      templateCategory: selectedTemplate?.category || data.templateCategory,
    });
    onNext();
  };

  const filteredTemplates = templates.filter((tpl) => {
    // Extra safety: only approved templates
    if ((tpl.status || '').toUpperCase() !== 'APPROVED') return false;

    const matchesCat =
      templateCategoryFilter === 'ALL' ||
      tpl.category?.toUpperCase() === templateCategoryFilter;
    const matchesSearch =
      !templateSearch.trim() ||
      tpl.name?.toLowerCase().includes(templateSearch.toLowerCase()) ||
      tpl.body?.toLowerCase().includes(templateSearch.toLowerCase()) ||
      tpl.header?.toLowerCase().includes(templateSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">
          Select Message Template
        </h3>
        <p className="text-xs sm:text-sm text-[#c4c0db] mt-1 font-normal">
          Choose an official Meta-approved template for your campaign. Personalize it with variables to make it more engaging.
        </p>
      </div>

      {/* Mode Indicator: Use Template Only */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[#0f0e1c] border border-[#251f42] w-fit">
        <div className="py-2 px-3.5 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 bg-[#814AC8] text-white shadow-[0_0_12px_rgba(129,74,200,0.35)]">
          <FileText size={14} />
          <span>Use Template</span>
        </div>
      </div>

      {/* Main Grid: Template Selector + Variables + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column (7 cols): Templates List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs sm:text-sm text-[#e4e4e7] flex items-center justify-between font-normal">
            <div className="flex items-center gap-2.5">
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              <span>Showing official Meta-approved message templates for high deliverability.</span>
            </div>
            <span className="text-xs font-medium text-[#C49FE0] shrink-0 ml-2">
              {filteredTemplates.length} Active
            </span>
          </div>

          {/* Filter and Search Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c88a6]" />
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Search templates by name or text..."
                className="w-full pl-9 pr-7 py-2 rounded-xl bg-[#0c0b17] border border-[#251f42] text-xs sm:text-sm text-white placeholder-[#716d8a] outline-none focus:border-[#814AC8] font-normal"
              />
              {templateSearch && (
                <button
                  type="button"
                  onClick={() => setTemplateSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#c4c0db] hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-[#0c0b17] p-1 rounded-xl border border-[#251f42]">
              {['ALL', 'MARKETING', 'UTILITY'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTemplateCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    templateCategoryFilter === cat
                      ? 'bg-[#814AC8] text-white'
                      : 'text-[#c4c0db] hover:text-white'
                  }`}
                >
                  {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Templates List */}
          {isLoadingTemplates ? (
            <div className="p-8 text-center rounded-xl bg-[#0c0b17] border border-[#251f42] text-xs sm:text-sm text-[#c4c0db]">
              Loading official templates from database...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-[#2d2650] bg-[#0c0b17] text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[#C49FE0]">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-white">
                  {templates.length === 0 ? 'No Approved Templates Available' : 'No Matching Templates Found'}
                </h4>
                <p className="text-xs text-[#c4c0db] max-w-xs mt-1 font-normal leading-relaxed">
                  {templates.length === 0
                    ? 'Only Meta-approved templates can be used for WhatsApp campaigns. Create and submit templates in Template Studio.'
                    : 'Try adjusting your search terms or category filter.'}
                </p>
              </div>
              {templates.length === 0 ? (
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href="/user/admin/templates/create"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#814AC8] text-white text-xs sm:text-sm font-medium hover:bg-[#703db5]"
                  >
                    Create in Template Studio
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTemplateSearch('');
                    setTemplateCategoryFilter('ALL');
                  }}
                  className="text-xs sm:text-sm text-[#814AC8] hover:underline font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredTemplates.map((tpl) => {
                const isSelected = String(selectedTemplateId) === String(tpl.id);
                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`p-4 rounded-xl border border-white/[0.07] cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 text-white'
                        : 'bg-[#0d0e17] hover:border-white/20 text-[#8e95ab] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-medium text-white tracking-tight">{tpl.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                            tpl.category === 'MARKETING'
                              ? 'bg-[#814AC8]/20 text-[#C49FE0] border-[#814AC8]/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                          }`}
                        >
                          {tpl.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <CheckCircle size={15} className="text-white" />
                        )}
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          APPROVED
                        </span>
                      </div>
                    </div>

                    {tpl.header && (
                      <div className="text-xs sm:text-[13px] font-medium text-white mb-1.5">
                        {tpl.header}
                      </div>
                    )}

                    <p className={`text-xs sm:text-sm leading-relaxed line-clamp-3 font-normal ${isSelected ? 'text-white/90' : 'text-[#c4c0db]'}`}>
                      {tpl.body || tpl.content}
                    </p>

                    {(tpl.footer || (tpl.variables && tpl.variables.length > 0)) && (
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.07] text-xs text-[#c4c0db]">
                        <span className={isSelected ? 'text-white/80' : ''}>{tpl.footer || 'Meta Verified Template'}</span>
                        {tpl.variables && tpl.variables.length > 0 && (
                          <span className={isSelected ? 'text-white font-medium' : 'text-[#C49FE0] font-medium'}>
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

          {error && <p className="text-xs sm:text-sm text-rose-400 font-medium">{error}</p>}
        </div>

        {/* Right Column (5 cols): Variables Panel + Quick Tips + Preview */}
        <div className="lg:col-span-5 space-y-4">
          {/* Variables Box - Strictly Template Variables */}
          <div className="rounded-xl bg-[#0f0e1c] border border-[#251f42] p-4 sm:p-5 text-xs sm:text-sm">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-medium text-white text-sm sm:text-base">Message Variables</h4>
              {displayedVariables.length > 0 && (
                <span className="text-xs text-[#C49FE0] font-medium">
                  {displayedVariables.length} variable{displayedVariables.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-[#c4c0db] mb-3 font-normal">
              Click to add variable in your message.
            </p>

            {displayedVariables.length > 0 ? (
              <div className="space-y-2">
                {displayedVariables.map((item) => (
                  <div
                    key={item.tag}
                    onClick={() => handleInsertVariable(item.tag)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#141228] border border-[#251f42] hover:border-[#814AC8] hover:bg-[#1a1638] cursor-pointer transition-all group select-none"
                    title={`Click to add ${item.tag}`}
                  >
                    <span className="text-xs sm:text-sm font-medium text-[#C49FE0] group-hover:text-white">
                      {item.tag}
                    </span>
                    <span className="text-xs text-[#c4c0db] font-normal">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#141228]/60 border border-[#251f42]/60 text-center">
                <p className="text-xs text-[#c4c0db] font-normal">
                  {selectedTemplate
                    ? 'This template does not have any variables.'
                    : 'Select an approved template from the left to view its variables.'}
                </p>
              </div>
            )}
          </div>

          {/* Quick Tips */}
          <QuickTips
            tips={[
              'Only Meta-approved templates can be sent via WhatsApp Cloud API',
              'Personalize template variables with contact data',
              'Templates ensure highest delivery and avoid spam blocks',
              'Preview how your template appears on recipient devices',
            ]}
          />

          {/* Dynamic WhatsApp Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs sm:text-sm font-medium text-[#c4c0db] flex items-center gap-1.5">
                Message Preview <Info size={13} className="text-[#814AC8]" />
              </span>
              <span className="text-xs text-[#a1a1aa] font-normal">Live rendering</span>
            </div>
            <WhatsAppPreview
              businessName={data.name || 'Your Business'}
              messageText={message || (selectedTemplate ? (selectedTemplate.body || selectedTemplate.content) : 'Select a template to preview')}
              mediaUrl={data.mediaUrl || null}
              mediaName={data.mediaName || ''}
            />
          </div>
        </div>
      </div>

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
          className="px-6 py-2.5 sm:px-7 sm:py-3 rounded-xl text-xs sm:text-sm font-medium text-white bg-[#814AC8] hover:bg-[#703db5] shadow-[0_0_18px_rgba(129,74,200,0.4)] flex items-center gap-2 transition-all active:scale-[0.98]"
        >
          <span>Next</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
