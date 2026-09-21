'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Users,
  UploadCloud,
  Filter,
  Plus,
  Search,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  X,
  Flame,
  Zap,
  Sparkles,
  Award
} from 'lucide-react';
import AudienceSummary from '../AudienceSummary';
import ProTip from '../ProTip';
import {
  getContactLists,
  uploadAudienceCSV,
  estimateCampaign,
  getMarketingLeads
} from '@/lib/api/marketing';

const AUDIENCE_TYPES = [
  { id: 'Existing Contacts', label: 'Existing Contacts', desc: 'CRM contacts & saved lists', icon: Users },
  { id: 'Upload CSV', label: 'Upload CSV', desc: 'Import contacts from file', icon: UploadCloud },
  { id: 'Smart Segment', label: 'Smart Segment', desc: 'Target by lead score & status', icon: Filter },
  { id: 'Manual Entry', label: 'Manual Entry', desc: 'Add numbers manually or bulk paste', icon: Plus },
];

const SMART_SEGMENT_CONFIG = [
  {
    id: 'hot',
    title: 'Hot Leads',
    subtitle: 'Score ≥ 70 — High conversion intent',
    icon: Flame,
    color: 'text-rose-400',
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/10',
    activeBg: 'bg-rose-950/40 border-rose-500',
  },
  {
    id: 'warm',
    title: 'Warm Leads',
    subtitle: 'Score 40-69 — Engaged prospects',
    icon: Zap,
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    activeBg: 'bg-amber-950/40 border-amber-500',
  },
  {
    id: 'new',
    title: 'New Leads',
    subtitle: 'Newly captured contacts',
    icon: Sparkles,
    color: 'text-blue-400',
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/10',
    activeBg: 'bg-blue-950/40 border-blue-500',
  },
  {
    id: 'converted',
    title: 'Converted Customers',
    subtitle: 'Past buyers & active clients',
    icon: Award,
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    activeBg: 'bg-emerald-950/40 border-emerald-500',
  },
];

function normalizePhoneE164(raw, defaultCountry = '91') {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.substring(1);
  }
  if (digits.length === 10) {
    digits = `${defaultCountry}${digits}`;
  }
  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

export default function AudienceStep({ data, updateData, onNext, onBack, workspaceId }) {
  const [audienceType, setAudienceType] = useState(data.audienceType || 'Existing Contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  // 1. Existing Contacts State
  const [contactsSubTab, setContactsSubTab] = useState('leads'); // 'leads' or 'lists'
  const [contactLists, setContactLists] = useState([]);
  const [selectedListIds, setSelectedListIds] = useState(
    Array.isArray(data.selectedListIds) && !data.selectedListIds.includes('list_1') ? data.selectedListIds : []
  );
  const [crmLeads, setCrmLeads] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // 2. CSV Upload State
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(data.audienceListName?.endsWith('.csv') ? data.audienceListName : null);
  const [csvStats, setCsvStats] = useState(null);

  // 3. Smart Segments State
  const [activeSegment, setActiveSegment] = useState(data.segment || 'hot');
  const [segmentCounts, setSegmentCounts] = useState({ all: 0, hot: 0, warm: 0, new: 0, converted: 0 });
  const [segmentLeads, setSegmentLeads] = useState([]);
  const [isLoadingSegment, setIsLoadingSegment] = useState(false);

  // 4. Manual Entry State
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [manualRecipients, setManualRecipients] = useState(
    Array.isArray(data.recipients) && data.audienceType === 'Manual Entry' ? data.recipients : []
  );

  // 5. Preflight Estimation State
  const [estimate, setEstimate] = useState(null);

  // Load Contact Lists on mount / workspace change
  useEffect(() => {
    let isSubscribed = true;
    getContactLists(workspaceId)
      .then((lists) => {
        if (!isSubscribed) return;
        if (Array.isArray(lists) && lists.length > 0) {
          setContactLists(lists);
          if (selectedListIds.length === 0 && lists.some((l) => l.id === 'crm_all_leads')) {
            setSelectedListIds(['crm_all_leads']);
          }
        }
      })
      .catch((e) => {
        console.warn('Failed to load contact lists:', e);
      });

    return () => {
      isSubscribed = false;
    };
  }, [workspaceId]);

  // Load CRM Leads for Existing Contacts
  useEffect(() => {
    let isSubscribed = true;
    getMarketingLeads(workspaceId, 'all', searchQuery)
      .then((res) => {
        if (!isSubscribed) return;
        if (res) {
          const list = res.leads || [];
          setCrmLeads(list);
          if (res.segment_counts) {
            setSegmentCounts(res.segment_counts);
          }
          if (selectedLeadIds.length === 0 && list.length > 0) {
            setSelectedLeadIds(list.map((l) => l.id));
          }
        }
      })
      .catch((e) => console.warn('Failed to fetch CRM leads:', e));

    return () => {
      isSubscribed = false;
    };
  }, [workspaceId, searchQuery]);

  // Fetch Segment Leads when in Smart Segment mode
  useEffect(() => {
    if (audienceType !== 'Smart Segment') return;
    let isSubscribed = true;
    getMarketingLeads(workspaceId, activeSegment)
      .then((res) => {
        if (!isSubscribed) return;
        const list = res?.leads || [];
        setSegmentLeads(list);
        const formatted = list.map((l) => ({
          lead_id: l.id,
          phone_number: l.phone,
          normalized_phone: normalizePhoneE164(l.phone),
          recipient_name: l.name,
          variables: { name: l.name || 'Customer' },
        }));
        const segCfg = SMART_SEGMENT_CONFIG.find((s) => s.id === activeSegment);
        updateData({
          audienceType: 'Smart Segment',
          segment: activeSegment,
          audienceListName: `${segCfg?.title || 'Smart Segment'} (${list.length} contacts)`,
          recipientsCount: list.length,
          validRecipients: list.length,
          invalidRecipients: 0,
          recipients: formatted,
        });
      })
      .catch((e) => console.warn('Failed to fetch segment leads:', e));

    return () => {
      isSubscribed = false;
    };
  }, [audienceType, activeSegment, workspaceId]);

  // Refresh leads action
  const handleRefreshLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const res = await getMarketingLeads(workspaceId, 'all', searchQuery);
      if (res) {
        setCrmLeads(res.leads || []);
        if (res.segment_counts) setSegmentCounts(res.segment_counts);
      }
    } finally {
      setIsLoadingLeads(false);
    }
  };

  // Switch audience type
  const handleAudienceTypeChange = (typeId) => {
    setAudienceType(typeId);
    setError('');

    if (typeId === 'Existing Contacts') {
      if (contactsSubTab === 'leads') {
        const selected = crmLeads.filter((l) => selectedLeadIds.includes(l.id));
        const targetLeads = selected.length > 0 ? selected : crmLeads;
        const count = targetLeads.length;
        if (selectedLeadIds.length === 0 && crmLeads.length > 0) {
          setSelectedLeadIds(crmLeads.map((l) => l.id));
        }
        updateData({
          audienceType: 'Existing Contacts',
          audienceListName: `CRM Leads (${count} selected)`,
          recipientsCount: count,
          validRecipients: count,
          invalidRecipients: 0,
          recipients: targetLeads.map((l) => ({
            lead_id: l.id,
            phone_number: l.phone,
            normalized_phone: normalizePhoneE164(l.phone),
            recipient_name: l.name,
            variables: { name: l.name || 'Customer' },
          })),
        });
      } else {
        const selectedObj = contactLists.filter((l) => selectedListIds.includes(l.id));
        const total = selectedObj.reduce((acc, curr) => acc + (curr.totalContacts || curr.total_contacts || 0), 0);
        updateData({
          audienceType: 'Existing Contacts',
          audienceListName: selectedObj.map((s) => s.name).join(', ') || 'All CRM Contacts',
          recipientsCount: total,
          validRecipients: total,
          invalidRecipients: 0,
          recipients: [],
        });
      }
    } else if (typeId === 'Upload CSV') {
      if (csvStats) {
        updateData({
          audienceType: 'Upload CSV',
          audienceListName: uploadedFileName || 'Uploaded CSV',
          recipientsCount: csvStats.total,
          validRecipients: csvStats.valid_count,
          invalidRecipients: csvStats.invalid_count,
          recipients: csvStats.recipients || [],
        });
      } else {
        updateData({
          audienceType: 'Upload CSV',
          recipientsCount: 0,
          validRecipients: 0,
          invalidRecipients: 0,
          recipients: [],
        });
      }
    } else if (typeId === 'Manual Entry') {
      updateData({
        audienceType: 'Manual Entry',
        audienceListName: `Manual Entry (${manualRecipients.length} contacts)`,
        recipientsCount: manualRecipients.length,
        validRecipients: manualRecipients.length,
        invalidRecipients: 0,
        recipients: manualRecipients,
      });
    }
  };

  // Toggle single lead selection
  const toggleLeadSelect = (leadId) => {
    let next;
    if (selectedLeadIds.includes(leadId)) {
      next = selectedLeadIds.filter((id) => id !== leadId);
    } else {
      next = [...selectedLeadIds, leadId];
    }
    setSelectedLeadIds(next);

    const selectedLeads = crmLeads.filter((l) => next.includes(l.id));
    const formatted = selectedLeads.map((l) => ({
      lead_id: l.id,
      phone_number: l.phone,
      normalized_phone: normalizePhoneE164(l.phone),
      recipient_name: l.name,
      variables: { name: l.name || 'Customer' },
    }));

    updateData({
      selectedLeadIds: next,
      audienceListName: `CRM Leads (${selectedLeads.length} selected)`,
      recipientsCount: selectedLeads.length,
      validRecipients: selectedLeads.length,
      invalidRecipients: 0,
      recipients: formatted,
    });
  };

  // Select all or deselect all CRM leads
  const toggleSelectAllLeads = () => {
    if (selectedLeadIds.length === crmLeads.length) {
      setSelectedLeadIds([]);
      updateData({
        selectedLeadIds: [],
        recipientsCount: 0,
        validRecipients: 0,
        recipients: [],
        audienceListName: 'No leads selected',
      });
    } else {
      const allIds = crmLeads.map((l) => l.id);
      setSelectedLeadIds(allIds);
      const formatted = crmLeads.map((l) => ({
        lead_id: l.id,
        phone_number: l.phone,
        normalized_phone: normalizePhoneE164(l.phone),
        recipient_name: l.name,
        variables: { name: l.name || 'Customer' },
      }));
      updateData({
        selectedLeadIds: allIds,
        audienceListName: `All CRM Leads (${crmLeads.length})`,
        recipientsCount: crmLeads.length,
        validRecipients: crmLeads.length,
        invalidRecipients: 0,
        recipients: formatted,
      });
    }
  };

  // Toggle Contact List
  const toggleListSelect = (listId) => {
    let next;
    if (selectedListIds.includes(listId)) {
      next = selectedListIds.filter((id) => id !== listId);
    } else {
      next = [...selectedListIds, listId];
    }
    setSelectedListIds(next);

    const selectedObj = contactLists.filter((l) => next.includes(l.id));
    const total = selectedObj.reduce((acc, curr) => acc + (curr.totalContacts || curr.total_contacts || 0), 0);

    updateData({
      selectedListIds: next,
      audienceListName: selectedObj.map((s) => s.name).join(', ') || 'No list selected',
      recipientsCount: total,
      validRecipients: total,
      invalidRecipients: 0,
      recipients: [],
    });
  };

  // CSV Upload Handler
  const handleCsvFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a valid .csv file format.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const parsed = await uploadAudienceCSV(file, workspaceId);
      setUploadedFileName(file.name);
      setCsvStats(parsed);

      updateData({
        audienceType: 'Upload CSV',
        audienceListName: file.name,
        recipientsCount: parsed.total,
        validRecipients: parsed.valid_count,
        invalidRecipients: parsed.invalid_count,
        optedInCount: parsed.valid_count,
        optedOutCount: parsed.invalid_count,
        recipients: parsed.recipients || [],
      });
    } catch (err) {
      console.error('CSV upload failed:', err);
      setError(err?.response?.data?.detail || err.message || 'Failed to process CSV file.');
    } finally {
      setIsUploading(false);
    }
  };

  // Manual Entry: Add single contact
  const handleAddManualSingle = () => {
    if (!manualPhone.trim()) {
      setError('Please enter a WhatsApp phone number');
      return;
    }

    const normalized = normalizePhoneE164(manualPhone);
    if (!normalized) {
      setError('Invalid phone number. Must have at least 10 digits (e.g. 9840123456 or +919840123456)');
      return;
    }

    if (manualRecipients.some((r) => r.phone_number === normalized || r.normalized_phone === normalized)) {
      setError('This phone number has already been added.');
      return;
    }

    const newContact = {
      phone_number: normalized,
      normalized_phone: normalized,
      recipient_name: manualName.trim() || `Contact ${manualRecipients.length + 1}`,
      variables: { name: manualName.trim() || 'Customer' },
    };

    const nextList = [newContact, ...manualRecipients];
    setManualRecipients(nextList);
    setManualName('');
    setManualPhone('');
    setError('');

    updateData({
      audienceType: 'Manual Entry',
      audienceListName: `Manual Entry (${nextList.length} contacts)`,
      recipientsCount: nextList.length,
      validRecipients: nextList.length,
      invalidRecipients: 0,
      recipients: nextList,
    });
  };

  // Manual Entry: Parse bulk paste
  const handleAddManualBulk = () => {
    if (!bulkInput.trim()) {
      setError('Please paste one or more phone numbers');
      return;
    }

    const tokens = bulkInput.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const added = [];
    const duplicates = [];

    const existingPhones = new Set(manualRecipients.map((r) => r.normalized_phone || r.phone_number));

    tokens.forEach((raw) => {
      const norm = normalizePhoneE164(raw);
      if (norm) {
        if (existingPhones.has(norm)) {
          duplicates.push(raw);
        } else {
          existingPhones.add(norm);
          added.push({
            phone_number: norm,
            normalized_phone: norm,
            recipient_name: `Contact ${manualRecipients.length + added.length + 1}`,
            variables: { name: 'Customer' },
          });
        }
      }
    });

    if (added.length === 0) {
      if (duplicates.length > 0) {
        setError(`All ${duplicates.length} numbers were already in the list.`);
      } else {
        setError('No valid 10+ digit phone numbers could be extracted.');
      }
      return;
    }

    const nextList = [...manualRecipients, ...added];
    setManualRecipients(nextList);
    setBulkInput('');
    setError('');

    updateData({
      audienceType: 'Manual Entry',
      audienceListName: `Manual Entry (${nextList.length} contacts)`,
      recipientsCount: nextList.length,
      validRecipients: nextList.length,
      invalidRecipients: 0,
      recipients: nextList,
    });
  };

  // Manual Entry: Remove contact
  const handleRemoveManualContact = (phoneToRemove) => {
    const nextList = manualRecipients.filter((r) => r.normalized_phone !== phoneToRemove && r.phone_number !== phoneToRemove);
    setManualRecipients(nextList);

    updateData({
      audienceType: 'Manual Entry',
      audienceListName: `Manual Entry (${nextList.length} contacts)`,
      recipientsCount: nextList.length,
      validRecipients: nextList.length,
      invalidRecipients: 0,
      recipients: nextList,
    });
  };

  // Current valid count based on active audience mode
  const currentValidCount = useMemo(() => {
    if (audienceType === 'Upload CSV') {
      return csvStats?.valid_count ?? data.validRecipients ?? 0;
    }
    if (audienceType === 'Smart Segment') {
      return segmentLeads.length;
    }
    if (audienceType === 'Manual Entry') {
      return manualRecipients.length;
    }
    if (contactsSubTab === 'leads') {
      return selectedLeadIds.length;
    }
    return contactLists
      .filter((l) => selectedListIds.includes(l.id))
      .reduce((acc, curr) => acc + (curr.validContacts || curr.valid_contacts || curr.totalContacts || 0), 0);
  }, [audienceType, contactsSubTab, csvStats, data.validRecipients, segmentLeads, manualRecipients, selectedLeadIds, contactLists, selectedListIds]);

  const currentTotalCount = useMemo(() => {
    if (audienceType === 'Upload CSV') {
      return csvStats?.total ?? data.recipientsCount ?? 0;
    }
    if (audienceType === 'Smart Segment') {
      return segmentLeads.length;
    }
    if (audienceType === 'Manual Entry') {
      return manualRecipients.length;
    }
    if (contactsSubTab === 'leads') {
      return selectedLeadIds.length;
    }
    return contactLists
      .filter((l) => selectedListIds.includes(l.id))
      .reduce((acc, curr) => acc + (curr.totalContacts || curr.total_contacts || 0), 0);
  }, [audienceType, contactsSubTab, csvStats, data.recipientsCount, segmentLeads, manualRecipients, selectedLeadIds, contactLists, selectedListIds]);

  // Preflight cost estimation
  useEffect(() => {
    let isMounted = true;
    const count = currentValidCount || 0;
    estimateCampaign(workspaceId, count, 'marketing').then((res) => {
      if (isMounted && res) {
        setEstimate(res);
        updateData({
          estimatedCost: res.estimated_cost,
          ratePerMessage: res.rate_per_message,
          isBalanceSufficient: res.is_balance_sufficient,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [workspaceId, currentValidCount]);

  const handleProceed = () => {
    if (currentValidCount === 0) {
      if (audienceType === 'Upload CSV') {
        setError('Please upload a valid CSV file containing phone numbers.');
      } else if (audienceType === 'Smart Segment') {
        setError('The selected segment currently has 0 leads. Please select another segment.');
      } else if (audienceType === 'Manual Entry') {
        setError('Please enter at least one recipient phone number.');
      } else {
        setError('Please select at least one contact or list for your campaign.');
      }
      return;
    }
    onNext();
  };

  const filteredCrmLeads = useMemo(() => {
    if (!searchQuery.trim()) return crmLeads;
    const q = searchQuery.toLowerCase();
    return crmLeads.filter(
      (l) => (l.name || '').toLowerCase().includes(q) || (l.phone || '').toLowerCase().includes(q)
    );
  }, [crmLeads, searchQuery]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-10 items-start">
      {/* Left Column (7 cols): Audience Controls */}
      <div className="lg:col-span-7 xl:col-span-7 space-y-5">
        <div>
          <h3 className="text-base sm:text-lg font-medium text-white tracking-tight">
            Select Audience
          </h3>
          <p className="text-xs sm:text-sm text-[#c4c0db] mt-1 font-normal">
            Choose who you want to send this campaign to.
          </p>
        </div>

        {/* 4 Audience Mode Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {AUDIENCE_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = audienceType === type.id;

            return (
              <div
                key={type.id}
                onClick={() => handleAudienceTypeChange(type.id)}
                className={`p-3.5 sm:p-4 rounded-xl border border-white/[0.07] cursor-pointer transition-all duration-200 flex flex-col justify-between select-none min-h-[105px] ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#814AC8]/40 to-[#221253]/40 text-white'
                    : 'bg-[#0d0e17] hover:border-white/20 text-[#8e95ab] hover:text-white'
                }`}
              >
                <div className="mb-3">
                  <Icon
                    size={18}
                    className={isSelected ? 'text-white' : 'text-white/60'}
                  />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-white leading-tight">
                    {type.label}
                  </h4>
                  <p className={`text-xs sm:text-[13px] mt-1.5 leading-relaxed font-normal ${isSelected ? 'text-white/90' : 'text-[#c4c0db]'}`}>
                    {type.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODE 1: EXISTING CONTACTS */}
        {audienceType === 'Existing Contacts' && (
          <div className="space-y-3 pt-1">
            {/* Sub-tab toggle: CRM Leads vs Contact Lists */}
            <div className="flex items-center justify-between gap-2 border-b border-[#1b2238] pb-2">
              <div className="flex items-center gap-1.5 bg-[#080a12] p-1 rounded-xl border border-[#1b2238]">
                <button
                  type="button"
                  onClick={() => {
                    setContactsSubTab('leads');
                    const selected = crmLeads.filter((l) => selectedLeadIds.includes(l.id));
                    const list = selected.length > 0 ? selected : crmLeads;
                    updateData({
                      audienceListName: `CRM Leads (${list.length} selected)`,
                      recipientsCount: list.length,
                      validRecipients: list.length,
                      invalidRecipients: 0,
                      recipients: list.map((l) => ({
                        lead_id: l.id,
                        phone_number: l.phone,
                        normalized_phone: normalizePhoneE164(l.phone),
                        recipient_name: l.name,
                        variables: { name: l.name || 'Customer' },
                      })),
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    contactsSubTab === 'leads'
                      ? 'bg-[#814AC8] text-white shadow-sm'
                      : 'text-[#c4c0db] hover:text-white'
                  }`}
                >
                  CRM Leads ({crmLeads.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContactsSubTab('lists');
                    const selectedObj = contactLists.filter((l) => selectedListIds.includes(l.id));
                    const total = selectedObj.reduce((acc, curr) => acc + (curr.totalContacts || curr.total_contacts || 0), 0);
                    updateData({
                      audienceListName: selectedObj.map((s) => s.name).join(', ') || 'Saved Lists',
                      recipientsCount: total,
                      validRecipients: total,
                      invalidRecipients: 0,
                      recipients: [],
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    contactsSubTab === 'lists'
                      ? 'bg-[#814AC8] text-white shadow-sm'
                      : 'text-[#c4c0db] hover:text-white'
                  }`}
                >
                  Saved Lists ({contactLists.length})
                </button>
              </div>

              <button
                type="button"
                onClick={handleRefreshLeads}
                className="p-2 rounded-lg bg-[#0a0d17] border border-[#1b2238] text-[#c4c0db] hover:text-white hover:border-[#283250] transition-colors"
                title="Refresh leads"
              >
                <RefreshCw size={14} className={isLoadingLeads ? 'animate-spin text-[#814AC8]' : ''} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c88a6]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={contactsSubTab === 'leads' ? 'Search contacts by name or phone...' : 'Search lists...'}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#080a12] border border-[#1b2238] text-xs sm:text-sm text-white placeholder-[#716d8a] outline-none focus:border-[#814AC8] transition-colors font-normal"
              />
            </div>

            {/* CRM Leads Table */}
            {contactsSubTab === 'leads' ? (
              <div className="rounded-xl border border-[#1b2238] bg-[#080a12] overflow-hidden">
                <div className="px-3.5 py-2.5 bg-[#0d101c] border-b border-[#1b2238] flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={crmLeads.length > 0 && selectedLeadIds.length === crmLeads.length}
                      onChange={toggleSelectAllLeads}
                      className="w-4 h-4 rounded bg-[#080a12] border-[#1e253b] text-[#814AC8] accent-[#814AC8] cursor-pointer"
                    />
                    <span className="text-white/90 font-medium text-xs sm:text-[13px]">
                      Select All ({crmLeads.length} CRM Contacts)
                    </span>
                  </div>
                  <span className="text-xs text-[#c4c0db]">
                    <strong className="text-white font-medium">{selectedLeadIds.length}</strong> selected
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#0d101c]/80 border-b border-[#1b2238] text-[#c4c0db] text-xs uppercase font-medium">
                      <tr>
                        <th className="w-8 px-3 py-2 text-center"></th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Score</th>
                        <th className="px-3 py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#151b2e]">
                      {filteredCrmLeads.map((lead) => {
                        const isChecked = selectedLeadIds.includes(lead.id);
                        return (
                          <tr
                            key={lead.id}
                            onClick={() => toggleLeadSelect(lead.id)}
                            className={`cursor-pointer transition-colors ${
                              isChecked ? 'bg-[#814AC8]/15 text-white' : 'hover:bg-[#121626] text-white/90'
                            }`}
                          >
                            <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleLeadSelect(lead.id)}
                                className="w-3.5 h-3.5 rounded bg-[#080a12] border-[#1e253b] text-[#814AC8] accent-[#814AC8] cursor-pointer"
                              />
                            </td>
                            <td className="px-3 py-2 font-medium text-white">
                              {lead.name}
                            </td>
                            <td className="px-3 py-2 text-xs text-[#c4c0db] font-normal">
                              {lead.phone}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  (lead.score || 0) >= 70
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : (lead.score || 0) >= 40
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-zinc-500/20 text-zinc-300'
                                }`}
                              >
                                {lead.score || 0}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="px-2 py-0.5 rounded-md bg-[#161b2c] text-xs text-[#c4c0db] capitalize font-normal">
                                {lead.status || 'new'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCrmLeads.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-xs sm:text-sm text-[#c4c0db]">
                            No CRM leads found matching &ldquo;{searchQuery}&rdquo;.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Contact Lists Table */
              <div className="rounded-xl border border-[#1b2238] bg-[#080a12] overflow-hidden">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#0d101c] border-b border-[#1b2238] text-[#c4c0db] uppercase text-xs font-medium tracking-wider">
                    <tr>
                      <th className="w-10 px-3 py-2.5 text-center">Select</th>
                      <th className="px-3 py-2.5">List Name</th>
                      <th className="px-3 py-2.5">Contacts</th>
                      <th className="px-3 py-2.5 hidden sm:table-cell">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#151b2e]">
                    {contactLists.map((item) => {
                      const isChecked = selectedListIds.includes(item.id);
                      const contactsCount = item.totalContacts || item.total_contacts || 0;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => toggleListSelect(item.id)}
                          className={`cursor-pointer transition-colors ${
                            isChecked ? 'bg-[#814AC8]/15' : 'hover:bg-[#121626]'
                          }`}
                        >
                          <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleListSelect(item.id)}
                              className="w-4 h-4 rounded bg-[#080a12] border-[#1e253b] text-[#814AC8] accent-[#814AC8] cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-medium text-white">
                            {item.name}
                          </td>
                          <td className="px-3 py-2.5 text-white/90 font-medium">
                            {contactsCount.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-[#c4c0db] hidden sm:table-cell text-xs font-normal truncate max-w-[200px]">
                            {item.description}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: UPLOAD CSV */}
        {audienceType === 'Upload CSV' && (
          <div className="space-y-4 pt-1">
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-white">
                Upload Contacts CSV
              </h4>
              <p className="text-xs text-[#c4c0db] mt-0.5 font-normal leading-relaxed">
                Upload any CSV with phone numbers. Automatically normalizes to E.164 standard with country code.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleCsvFileSelect}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isUploading
                  ? 'border-[#814AC8] bg-[#814AC8]/10 animate-pulse'
                  : uploadedFileName
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-[#1e253b] bg-[#080a12] hover:border-[#814AC8]/50 hover:bg-[#16132d]'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-2.5">
                <div className="w-12 h-12 rounded-2xl bg-[#814AC8]/15 text-[#a78bfa] flex items-center justify-center">
                  {uploadedFileName ? <FileSpreadsheet size={24} className="text-emerald-400" /> : <UploadCloud size={24} />}
                </div>

                {isUploading ? (
                  <span className="text-xs sm:text-sm font-medium text-white">
                    Parsing CSV & validating numbers...
                  </span>
                ) : uploadedFileName ? (
                  <div className="space-y-1">
                    <span className="text-xs sm:text-sm font-medium text-white block">
                      {uploadedFileName}
                    </span>
                    <span className="text-xs text-emerald-400 font-medium">
                      ✓ Successfully parsed {(csvStats?.valid_count ?? data.validRecipients ?? 0).toLocaleString()} valid numbers
                    </span>
                    <p className="text-xs text-[#c4c0db] font-normal">Click to upload a different file</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs sm:text-sm font-medium text-white block">
                      Click to upload CSV or drag and drop
                    </span>
                    <span className="text-xs text-[#c4c0db] font-normal mt-0.5 block">
                      Supported headers: Phone, Mobile, Contact, Name, Email, Variables
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Invalid breakdown */}
            {csvStats?.invalid_sample && csvStats.invalid_sample.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs sm:text-sm space-y-1.5 font-normal">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertCircle size={15} className="text-amber-400 shrink-0" />
                  <span>{csvStats.invalid_count} numbers were excluded:</span>
                </div>
                <ul className="text-xs text-white/90 list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto custom-scrollbar font-normal">
                  {csvStats.invalid_sample.slice(0, 5).map((inv, idx) => (
                    <li key={idx}>
                      Row {inv.row}: &ldquo;{inv.raw_phone || 'Empty'}&rdquo; — {inv.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* MODE 3: SMART SEGMENT */}
        {audienceType === 'Smart Segment' && (
          <div className="space-y-4 pt-1">
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-white">
                Choose Smart Segment
              </h4>
              <p className="text-xs text-[#c4c0db] mt-0.5 font-normal leading-relaxed">
                Target high-intent segments dynamically calculated from CRM signals & lead scores.
              </p>
            </div>

            {/* Segment Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SMART_SEGMENT_CONFIG.map((seg) => {
                const Icon = seg.icon;
                const isSelected = activeSegment === seg.id;
                const count = segmentCounts[seg.id] ?? 0;

                return (
                  <div
                    key={seg.id}
                    onClick={() => setActiveSegment(seg.id)}
                    className={`p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                      isSelected
                        ? seg.activeBg + ' shadow-[0_0_16px_rgba(129,74,200,0.25)]'
                        : 'bg-[#0a0d17] border-[#1b2238] hover:border-[#283250]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${seg.bg} ${seg.color} mt-0.5`}>
                      <Icon size={17} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs sm:text-sm font-medium text-white truncate">
                          {seg.title}
                        </h5>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${seg.bg} ${seg.color}`}>
                          {count}
                        </span>
                      </div>
                      <p className="text-xs text-[#c4c0db] mt-1 leading-relaxed font-normal">
                        {seg.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Segment Leads Preview Table */}
            <div className="rounded-xl border border-[#1b2238] bg-[#080a12] overflow-hidden">
              <div className="px-3.5 py-2.5 bg-[#0d101c] border-b border-[#1b2238] flex items-center justify-between text-xs sm:text-sm">
                <span className="text-white font-medium">
                  Leads in &ldquo;{SMART_SEGMENT_CONFIG.find((s) => s.id === activeSegment)?.title}&rdquo;
                </span>
                <span className="text-xs text-[#c4c0db] font-normal">
                  {segmentLeads.length} contacts targeted
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto custom-scrollbar">
                {isLoadingSegment ? (
                  <div className="py-8 text-center text-xs sm:text-sm text-[#c4c0db] animate-pulse">
                    Loading segment contacts...
                  </div>
                ) : (
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#0d101c]/80 border-b border-[#1b2238] text-[#c4c0db] text-xs uppercase font-medium">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#151b2e]">
                      {segmentLeads.map((lead) => (
                        <tr key={lead.id} className="text-white/90">
                          <td className="px-3 py-2 font-medium text-white">{lead.name}</td>
                          <td className="px-3 py-2 text-xs text-[#c4c0db] font-normal">{lead.phone}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#16132d] text-[#a78bfa]">
                              {lead.score || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {segmentLeads.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-xs sm:text-sm text-[#c4c0db]">
                            No leads currently match this segment filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODE 4: MANUAL ENTRY */}
        {audienceType === 'Manual Entry' && (
          <div className="space-y-4 pt-1">
            <div>
              <h4 className="text-xs sm:text-sm font-medium text-white">
                Enter Phone Numbers
              </h4>
              <p className="text-xs text-[#c4c0db] mt-0.5 font-normal leading-relaxed">
                Add individual numbers or paste a bulk list of customer phones.
              </p>
            </div>

            {/* Single Contact Entry Form */}
            <div className="p-3.5 rounded-xl bg-[#0a0d17] border border-[#1b2238] space-y-2.5">
              <span className="text-xs sm:text-sm font-medium text-white block">
                Add Single Contact
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Customer Name (Optional)"
                  className="sm:col-span-5 px-3 py-2 rounded-xl bg-[#080a12] border border-[#1b2238] text-xs sm:text-sm text-white placeholder-[#716d8a] outline-none focus:border-[#814AC8] font-normal"
                />
                <input
                  type="text"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="Phone: 9840123456 or +91 98401..."
                  className="sm:col-span-5 px-3 py-2 rounded-xl bg-[#080a12] border border-[#1b2238] text-xs sm:text-sm text-white placeholder-[#716d8a] outline-none focus:border-[#814AC8] font-normal"
                />
                <button
                  type="button"
                  onClick={handleAddManualSingle}
                  className="sm:col-span-2 px-3 py-2 rounded-xl bg-[#814AC8] hover:bg-[#703db5] text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-1 transition-all"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {/* Bulk Paste Textarea */}
            <div className="p-3.5 rounded-xl bg-[#0a0d17] border border-[#1b2238] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-white">
                  Bulk Paste Numbers
                </span>
                <span className="text-xs text-[#c4c0db] font-normal">
                  Comma, newline, or space separated
                </span>
              </div>
              <textarea
                rows={2}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="e.g. 9840123456, 9840234567, +919840345678"
                className="w-full px-3 py-2 rounded-xl bg-[#080a12] border border-[#1b2238] text-xs sm:text-sm text-white placeholder-[#716d8a] outline-none focus:border-[#814AC8] custom-scrollbar font-normal"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddManualBulk}
                  className="px-3.5 py-1.5 rounded-xl bg-[#16132d] border border-[#814AC8]/30 hover:bg-[#814AC8]/20 text-white text-xs sm:text-sm font-medium transition-all"
                >
                  Parse & Add Numbers
                </button>
              </div>
            </div>

            {/* Added Manual Contacts List */}
            <div className="rounded-xl border border-[#1b2238] bg-[#080a12] overflow-hidden">
              <div className="px-3.5 py-2.5 bg-[#0d101c] border-b border-[#1b2238] flex items-center justify-between text-xs sm:text-sm">
                <span className="text-white font-medium">
                  Added Recipients ({manualRecipients.length})
                </span>
                {manualRecipients.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualRecipients([]);
                      updateData({ recipientsCount: 0, validRecipients: 0, recipients: [] });
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="max-h-52 overflow-y-auto custom-scrollbar divide-y divide-[#151b2e]">
                {manualRecipients.map((rec, idx) => (
                  <div
                    key={idx}
                    className="px-3.5 py-2 flex items-center justify-between text-xs sm:text-sm hover:bg-[#121626]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-[#814AC8]/20 text-[#a78bfa] flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                      </div>
                      <div>
                        <span className="text-white font-medium block leading-tight">
                          {rec.recipient_name}
                        </span>
                        <span className="text-xs text-[#c4c0db] font-normal">
                          {rec.normalized_phone || rec.phone_number}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveManualContact(rec.normalized_phone || rec.phone_number)}
                      className="p-1 rounded-md text-[#c4c0db] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {manualRecipients.length === 0 && (
                  <div className="py-6 text-center text-xs sm:text-sm text-[#c4c0db]">
                    No manual numbers added yet. Use the inputs above to add recipients.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs sm:text-sm text-rose-400 font-medium">{error}</p>
        )}
      </div>

      {/* Right Column (5 cols): Live Audience Summary & Pro Tip */}
      <div className="lg:col-span-5 xl:col-span-5 space-y-4">
        <AudienceSummary
          total={currentTotalCount}
          valid={currentValidCount}
          invalid={audienceType === 'Upload CSV' ? (csvStats?.invalid_count ?? 0) : 0}
          optedIn={currentValidCount}
          optedOut={0}
          estimatedCost={estimate?.estimated_cost}
          ratePerMessage={estimate?.rate_per_message || 0.8}
          isBalanceSufficient={estimate?.is_balance_sufficient ?? true}
          shortfall={estimate?.shortfall || 0}
          portfolioRemainingToday={estimate?.portfolio_remaining_today ?? 0}
          isWhatsAppConnected={estimate?.is_whatsapp_connected ?? false}
          estimatedMessages={`~ ${currentValidCount.toLocaleString()} messages`}
        />

        <ProTip message="Targeted audiences consistently achieve 2.4x higher response rates. Use Smart Segments or filter contacts by intent score." />
      </div>

      {/* Bottom Full-Width Action Buttons */}
      <div className="col-span-12 pt-6 mt-4 border-t border-[#1b2238] flex items-center justify-between">
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
