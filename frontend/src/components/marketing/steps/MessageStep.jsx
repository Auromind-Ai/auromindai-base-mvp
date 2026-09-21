'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  X,
  Info,
  CheckCircle,
  Search,
  Sparkles,
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
  const [variableMapping, setVariableMapping] = useState(data.variableMapping || {});
  const [error, setError] = useState('');

  const mappingRef = useRef(variableMapping);
  mappingRef.current = variableMapping;

  // Extract actual column headers dynamically from uploaded CSV or audience
  const audienceColumns = useMemo(() => {
    // 1. Explicit headers from uploaded CSV (only when audienceType is CSV)
    if (
      data?.audienceType === 'Upload CSV' &&
      Array.isArray(data?.audienceHeaders) &&
      data.audienceHeaders.length > 0
    ) {
      return data.audienceHeaders;
    }

    // 2. Or dynamically extract keys from actual recipients with non-empty values
    if (Array.isArray(data?.recipients) && data.recipients.length > 0) {
      const detectedKeys = [];
      const lowerSeen = new Set();

      const addKey = (key) => {
        if (!key) return;
        const lower = key.toLowerCase();
        if (!lowerSeen.has(lower)) {
          lowerSeen.add(lower);
          detectedKeys.push(key);
        }
      };

      const sample = data.recipients.slice(0, 50);

      // Check name - only if present and non-empty
      const hasName = sample.some(
        (r) =>
          (r.recipient_name && String(r.recipient_name).trim().length > 0) ||
          (r.name && String(r.name).trim().length > 0) ||
          (r.variables?.name && String(r.variables.name).trim().length > 0)
      );
      if (hasName) addKey('name');

      // Check phone - only if present and non-empty
      const hasPhone = sample.some(
        (r) =>
          (r.phone_number && String(r.phone_number).trim().length > 0) ||
          (r.normalized_phone && String(r.normalized_phone).trim().length > 0) ||
          (r.phone && String(r.phone).trim().length > 0) ||
          (r.variables?.phone && String(r.variables.phone).trim().length > 0)
      );
      if (hasPhone) addKey('phone');

      // Check email - ONLY if actually present and not empty!
      const hasEmail = sample.some(
        (r) =>
          (r.email && String(r.email).trim().length > 0) ||
          (r.variables?.email && String(r.variables.email).trim().length > 0)
      );
      if (hasEmail) addKey('email');

      // Check company - ONLY if actually present and not empty!
      const hasCompany = sample.some(
        (r) =>
          (r.company && String(r.company).trim().length > 0) ||
          (r.variables?.company && String(r.variables.company).trim().length > 0)
      );
      if (hasCompany) addKey('company');

      // Check any other custom variables in variables object
      sample.forEach((r) => {
        if (r.variables && typeof r.variables === 'object') {
          Object.entries(r.variables).forEach(([k, val]) => {
            if (
              k &&
              !k.startsWith('_') &&
              !['name', 'phone', 'email', 'company'].includes(k.toLowerCase()) &&
              val !== null &&
              val !== undefined &&
              String(val).trim().length > 0
            ) {
              addKey(k);
            }
          });
        }
      });

      if (detectedKeys.length > 0) return detectedKeys;
    }

    // 3. Fallback only if no audience has been selected yet
    return [];
  }, [data?.audienceType, data?.audienceHeaders, data?.recipients]);

  // Dropdown options created dynamically from real CSV column headers
  const mappingOptions = useMemo(() => {
    const opts = [];

    // Add each actual column heading from the CSV
    audienceColumns.forEach((col) => {
      opts.push({
        id: col,
        label: col,
        isCustom: false,
      });
    });

    // Option for custom text
    opts.push({
      id: 'custom',
      label: 'Custom Text / Fixed Value',
      isCustom: true,
    });

    return opts;
  }, [audienceColumns]);

  // Automatically detect the best column for Variable 1 (e.g. name column)
  const defaultNameCol = useMemo(() => {
    if (!audienceColumns.length) return 'custom';
    return (
      audienceColumns.find((c) => {
        const l = c.toLowerCase();
        return l.includes('name') || l.includes('user') || l.includes('customer') || l.includes('client');
      }) || audienceColumns[0]
    );
  }, [audienceColumns]);

  // Fetch only official approved Meta templates
  useEffect(() => {
    let isMounted = true;
    const targetWsId = workspaceId || data?.workspaceId;
    setIsLoadingTemplates(true);
    fetchApprovedTemplates(targetWsId)
      .then((tpls) => {
        if (isMounted) {
          const approvedOnly = (tpls || []).filter(
            (t) => (t.status || '').toUpperCase() === 'APPROVED'
          );
          setTemplates(approvedOnly);
          setIsLoadingTemplates(false);

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
  const displayedVariables = useMemo(() => {
    if (!selectedTemplate) return [];

    let vars = Array.isArray(selectedTemplate.variables) ? selectedTemplate.variables : [];
    if (vars.length === 0 && (selectedTemplate.body || selectedTemplate.content)) {
      const matched = (selectedTemplate.body || selectedTemplate.content).match(/\{\{[^}]+\}\}/g);
      vars = matched ? Array.from(new Set(matched)) : [];
    }

    return vars.map((tag) => {
      const normalized = tag.startsWith('{{') ? tag : `{{${tag}}}`;
      const cleanKey = normalized.replace(/[{}]/g, '');
      return {
        tag: normalized,
        cleanKey,
        label: `Variable ${normalized}`,
      };
    });
  }, [selectedTemplate]);

  // Ensure initial mapping for any missing variables when selected template or audience changes
  useEffect(() => {
    if (!displayedVariables.length) return;

    let updated = false;
    const next = { ...mappingRef.current };
    displayedVariables.forEach(({ cleanKey }) => {
      if (!next[cleanKey]) {
        updated = true;
        if (cleanKey === '1') {
          next[cleanKey] = { source: defaultNameCol, fallback: 'Customer', customValue: '' };
        } else {
          next[cleanKey] = { source: 'custom', fallback: '', customValue: '' };
        }
      }
    });

    if (updated) {
      setVariableMapping(next);
      updateData({ variableMapping: next });
    }
  }, [displayedVariables, defaultNameCol, updateData]);

  const handleUpdateMapping = (cleanKey, updates) => {
    const current = mappingRef.current[cleanKey] || {
      source: cleanKey === '1' ? defaultNameCol : 'custom',
      fallback: cleanKey === '1' ? 'Customer' : '',
      customValue: '',
    };
    const next = {
      ...mappingRef.current,
      [cleanKey]: { ...current, ...updates },
    };
    setVariableMapping(next);
    updateData({ variableMapping: next });
  };

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setError('');
    const bodyContent = tpl.body || tpl.content || '';
    setMessage(bodyContent);

    let vars = Array.isArray(tpl.variables) ? tpl.variables : [];
    if (vars.length === 0 && bodyContent) {
      const matched = bodyContent.match(/\{\{[^}]+\}\}/g);
      vars = matched ? Array.from(new Set(matched)) : [];
    }

    const newMapping = {};
    vars.forEach((v) => {
      const clean = String(v).replace(/[{}]/g, '');
      if (clean === '1') {
        newMapping[clean] = { source: defaultNameCol, fallback: 'Customer', customValue: '' };
      } else {
        newMapping[clean] = { source: 'custom', fallback: '', customValue: '' };
      }
    });

    setVariableMapping(newMapping);

    updateData({
      selectedTemplateId: tpl.id,
      templateName: tpl.name,
      messageBody: bodyContent,
      templateCategory: tpl.category,
      messageMode: 'template',
      variableMapping: newMapping,
    });
  };

  // Compute live preview with mapped values directly from the first row of uploaded CSV
  const livePreviewText = useMemo(() => {
    const base = message || selectedTemplate?.body || selectedTemplate?.content || '';
    if (!base) return 'Select an approved template to preview your message.';

    const sampleRecipient = (data?.recipients && data.recipients.length > 0) ? data.recipients[0] : null;

    let rendered = base;
    displayedVariables.forEach(({ tag, cleanKey }) => {
      const map = variableMapping[cleanKey] || (cleanKey === '1' ? { source: defaultNameCol } : { source: 'custom', customValue: '' });
      let sampleVal = tag;

      if (map.source === 'custom') {
        sampleVal = map.customValue?.trim() || `[Value ${cleanKey}]`;
      } else {
        const colName = map.source;
        if (sampleRecipient) {
          sampleVal =
            sampleRecipient?.variables?.[colName] ||
            sampleRecipient?.variables?.[colName.toLowerCase()] ||
            sampleRecipient?.[colName] ||
            (colName.toLowerCase().includes('name') ? (sampleRecipient?.recipient_name || sampleRecipient?.name) : null) ||
            (colName.toLowerCase().includes('phone') ? (sampleRecipient?.phone_number || sampleRecipient?.phone) : null) ||
            `[${colName}]`;
        } else {
          sampleVal = `[${colName}]`;
        }
      }
      rendered = rendered.split(tag).join(sampleVal);
    });

    return rendered;
  }, [message, selectedTemplate, displayedVariables, variableMapping, defaultNameCol, data?.recipients]);

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
      variableMapping,
    });
    onNext();
  };

  const filteredTemplates = templates.filter((tpl) => {
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
        <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
          Select Message Template
        </h3>
        <p className="text-xs text-[#8c88a6] mt-0.5">
          Choose an official Meta-approved template for your campaign. Personalize it with variables to make it more engaging.
        </p>
      </div>

      {/* Mode Indicator: Use Template Only */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[#0f0e1c] border border-[#251f42] w-fit">
        <div className="py-2 px-3.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 bg-[#814AC8] text-white shadow-[0_0_12px_rgba(129,74,200,0.35)]">
          <FileText size={13} />
          <span>Use Template</span>
        </div>
      </div>

      {/* Main Grid: Template Selector + Variables Mapping + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column (7 cols): Templates List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-[#d8b4fe] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-400 shrink-0" />
              <span>Showing official Meta-approved message templates for high deliverability.</span>
            </div>
            <span className="text-[11px] font-semibold text-[#C49FE0]">
              {filteredTemplates.length} Active
            </span>
          </div>

          {/* Filter and Search Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6d688c]" />
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Search templates by name or text..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#0c0b17] border border-[#251f42] text-xs text-white placeholder-[#585375] outline-none focus:border-[#814AC8]"
              />
              {templateSearch && (
                <button
                  type="button"
                  onClick={() => setTemplateSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8c88a6] hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-[#0c0b17] p-1 rounded-lg border border-[#251f42]">
              {['ALL', 'MARKETING', 'UTILITY'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTemplateCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    templateCategoryFilter === cat
                      ? 'bg-[#814AC8] text-white'
                      : 'text-[#8c88a6] hover:text-white'
                  }`}
                >
                  {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Templates List */}
          {isLoadingTemplates ? (
            <div className="p-8 text-center rounded-xl bg-[#0c0b17] border border-[#251f42] text-xs text-[#8c88a6]">
              Loading official templates from database...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-[#2d2650] bg-[#0c0b17] text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[#C49FE0]">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">
                  {templates.length === 0 ? 'No Approved Templates Available' : 'No Matching Templates Found'}
                </h4>
                <p className="text-[11px] text-[#8c88a6] max-w-xs mt-1">
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
                    className="px-3 py-1.5 rounded-lg bg-[#814AC8] text-white text-xs font-semibold hover:bg-[#703db5]"
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
                  className="text-xs text-[#814AC8] hover:underline"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredTemplates.map((tpl) => {
                const isSelected = String(selectedTemplateId) === String(tpl.id);
                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#1a0f2e] border-[#814AC8] shadow-[0_0_15px_rgba(129,74,200,0.25)]'
                        : 'bg-[#0f0e1c] border-[#251f42] hover:border-[#382f61]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white tracking-tight">{tpl.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            tpl.category === 'MARKETING'
                              ? 'bg-[#814AC8]/20 text-[#C49FE0] border-[#814AC8]/30'
                              : 'bg-blue-500/15 text-blue-400 border-blue-500/25'
                          }`}
                        >
                          {tpl.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <CheckCircle size={14} className="text-[#C49FE0]" />
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          APPROVED
                        </span>
                      </div>
                    </div>

                    {tpl.header && (
                      <div className="text-[11px] font-semibold text-slate-200 mb-1">
                        {tpl.header}
                      </div>
                    )}

                    <p className="text-xs text-[#a8a3c2] leading-relaxed line-clamp-3">
                      {tpl.body || tpl.content}
                    </p>

                    {(tpl.footer || (tpl.variables && tpl.variables.length > 0)) && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#251f42]/60 text-[10px] text-[#6d688c]">
                        <span>{tpl.footer || 'Meta Verified Template'}</span>
                        {tpl.variables && tpl.variables.length > 0 && (
                          <span className="text-[#C49FE0] font-medium">
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

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        {/* Right Column (5 cols): Variable Mapping + Preview + Quick Tips */}
        <div className="lg:col-span-5 space-y-4">
          {/* Variable Mapping Box */}
          <div className="rounded-xl bg-[#0f0e1c] border border-[#251f42] p-4 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <span>Map Template Variables</span>
                  {displayedVariables.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#814AC8]/20 text-[#C49FE0] border border-[#814AC8]/30">
                      {displayedVariables.length} variable{displayedVariables.length > 1 ? 's' : ''}
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-[#8c88a6] mt-0.5">
                  Match each template variable with fields from your selected audience.
                </p>
              </div>
            </div>

            {/* Display detected audience column tags */}
            {audienceColumns.length > 0 && (
              <div className="p-2.5 rounded-lg bg-[#141228] border border-[#251f42]/80 space-y-1.5">
                <span className="text-[10px] text-[#8c88a6] block font-medium">
                  Detected columns in <span className="text-[#C49FE0] font-semibold">{data?.audienceListName || 'Audience'}</span>:
                </span>
                <div className="flex flex-wrap gap-1">
                  {audienceColumns.map((col) => (
                    <span
                      key={col}
                      className="px-2 py-0.5 rounded bg-[#1f193d] border border-[#3d3366] text-[10px] text-purple-200 font-mono"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {displayedVariables.length > 0 ? (
              <div className="space-y-2.5 pt-1">
                {displayedVariables.map(({ tag, cleanKey }) => {
                  const current = variableMapping[cleanKey] || {
                    source: cleanKey === '1' ? defaultNameCol : 'custom',
                    fallback: cleanKey === '1' ? 'Customer' : '',
                    customValue: '',
                  };

                  const isCustom = current.source === 'custom';

                  return (
                    <div
                      key={cleanKey}
                      className="p-3 rounded-xl bg-[#141228] border border-[#251f42] space-y-2.5 hover:border-[#3d3363] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#C49FE0] px-2 py-0.5 rounded bg-[#814AC8]/20 border border-[#814AC8]/40 font-mono">
                          {tag}
                        </span>
                        <span className="text-[10px] text-[#8c88a6] font-medium">
                          {isCustom ? 'Custom Text' : current.source}
                        </span>
                      </div>

                      {/* Dropdown selector for real CSV columns */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-[#8c88a6] uppercase tracking-wider block">
                          Fill with:
                        </label>
                        <select
                          value={current.source}
                          onChange={(e) => handleUpdateMapping(cleanKey, { source: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0c0b17] border border-[#2d2650] text-xs text-white outline-none focus:border-[#814AC8] cursor-pointer"
                        >
                          {mappingOptions.map((opt) => (
                            <option key={opt.id} value={opt.id} className="bg-[#121026] text-white">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Custom text input if custom value is selected */}
                      {isCustom && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-[#8c88a6] uppercase tracking-wider block">
                            Value for {tag}:
                          </label>
                          <input
                            type="text"
                            value={current.customValue || ''}
                            onChange={(e) => handleUpdateMapping(cleanKey, { customValue: e.target.value })}
                            placeholder="e.g. DIWALI25, 20% OFF, Special Pass"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0c0b17] border border-[#2d2650] text-xs text-white placeholder-[#585375] outline-none focus:border-[#814AC8]"
                          />
                        </div>
                      )}

                      {/* Fallback value for dynamic contact fields */}
                      {!isCustom && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-[#8c88a6]">
                            <span className="font-semibold uppercase tracking-wider">Fallback (if empty):</span>
                          </div>
                          <input
                            type="text"
                            value={current.fallback ?? ''}
                            onChange={(e) => handleUpdateMapping(cleanKey, { fallback: e.target.value })}
                            placeholder={current.source.toLowerCase().includes('name') ? 'e.g. Customer, Valued Member' : 'Default value'}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#0c0b17] border border-[#2d2650] text-xs text-white placeholder-[#585375] outline-none focus:border-[#814AC8]"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[#141228]/60 border border-[#251f42]/60 text-center">
                <p className="text-[11px] text-[#8c88a6]">
                  {selectedTemplate
                    ? 'This template does not have any variables.'
                    : 'Select an approved template from the left to map its variables.'}
                </p>
              </div>
            )}
          </div>

          {/* Dynamic WhatsApp Preview with live variable substitution from Row 1 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-[#8c88a6] flex items-center gap-1">
                Message Preview <Info size={11} className="text-[#814AC8]" />
              </span>
              {displayedVariables.length > 0 && (
                <span className="text-[10px] text-purple-400 font-medium flex items-center gap-1 truncate max-w-[200px]" title={data?.recipients?.[0] ? `Previewing with contact: ${data.recipients[0].recipient_name || data.recipients[0].name || data.recipients[0].phone_number}` : 'Live sample preview'}>
                  <Sparkles size={10} className="shrink-0" />
                  <span className="truncate">{data?.recipients?.[0] ? `Contact 1: ${data.recipients[0].recipient_name || data.recipients[0].name || 'Sample contact'}` : 'Live preview'}</span>
                </span>
              )}
            </div>
            <WhatsAppPreview
              businessName={data.name || 'Your Business'}
              messageText={livePreviewText}
              mediaUrl={data.mediaUrl || null}
              mediaName={data.mediaName || ''}
            />
          </div>

          {/* Quick Tips */}
          <QuickTips
            tips={[
              'Dropdown shows real fields detected from your selected audience',
              'Pick which contact field replaces {{1}}, {{2}}, etc. for every recipient',
              'Set a fallback value for any contacts where that field might be blank',
              'Templates ensure highest delivery and avoid spam blocks',
            ]}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-[#251f42]/70 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-xs font-medium text-[#9da3ae] bg-[#121024] border border-[#251f42] hover:text-white hover:border-[#3d3363] transition-all"
        >
          ← Back
        </button>

        <button
          type="button"
          onClick={handleProceed}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#814AC8] hover:bg-[#703db5] shadow-[0_0_20px_rgba(129,74,200,0.4)] hover:shadow-[0_0_25px_rgba(129,74,200,0.6)] flex items-center gap-1.5 transition-all"
        >
          <span>Next</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
