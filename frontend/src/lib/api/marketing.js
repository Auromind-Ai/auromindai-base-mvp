import client from './client';
import { getTemplates } from './templates';
import { parseScheduleDateTime } from '../campaignScheduleUtils';

// Initial Seed Data - empty defaults for clean production state
export const INITIAL_CAMPAIGNS = [];

export const INITIAL_CONTACT_LISTS = [];

const STORAGE_KEYS = {
  CAMPAIGNS: 'orbion_marketing_campaigns',
  CONTACT_LISTS: 'orbion_marketing_contact_lists',
  DRAFT: 'orbion_marketing_campaign_draft'
};

export function getStoredWorkspaceId() {
  if (typeof window === 'undefined') return null;
  try {
    const rawWs = localStorage.getItem('workspace');
    if (rawWs) {
      const parsed = JSON.parse(rawWs);
      if (parsed?.id) return String(parsed.id);
    }
    const wsId = localStorage.getItem('workspace_id');
    if (wsId) return String(wsId);
  } catch {}
  return null;
}

function getStoredItems(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStoredItems(key, data) {
  if (typeof window === 'undefined') return;
  try {
    // Strip heavy payload (e.g. recipients arrays) before saving to localStorage to prevent quota exhaustion
    let toStore = data;
    if (key === STORAGE_KEYS.CAMPAIGNS && Array.isArray(data)) {
      toStore = data.map((item) => {
        if (item && typeof item === 'object') {
          const { recipients, raw_recipients, ...rest } = item;
          return rest;
        }
        return item;
      });
    }
    localStorage.setItem(key, JSON.stringify(toStore));
  } catch (err) {
    // If quota is exceeded, clear old marketing caches safely without error popups
    try {
      localStorage.removeItem(STORAGE_KEYS.CAMPAIGNS);
      localStorage.removeItem(STORAGE_KEYS.CONTACT_LISTS);
    } catch {}
  }
}

function normalizeStatus(status) {
  if (!status) return 'Draft';
  const lower = String(status).toLowerCase();
  if (lower === 'in_progress' || lower === 'sending') return 'Sending';
  if (lower === 'draft' || lower === 'pending') return 'Draft';
  if (lower === 'scheduled') return 'Scheduled';
  if (lower === 'paused') return 'Paused';
  if (lower === 'completed' || lower === 'failed' || lower === 'cancelled') return 'Completed';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function parseScheduleDatetime(dateStr, timeStr) {
  if (!dateStr) return null;
  try {
    const d = parseScheduleDateTime(dateStr, timeStr || '10:00 AM');
    if (d && !isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch {}
  return null;
}

export function mapBackendCampaignToFrontend(c) {
  if (!c) return null;
  const sCount = c.sent_count ?? c.sentCount ?? c.accepted_count ?? 0;
  const rCount = c.read_count ?? c.repliesCount ?? 0;
  const dCount = c.delivered_count ?? c.deliveredCount ?? 0;
  const fCount = c.failed_count ?? c.failedCount ?? 0;
  const tRecipients = c.total_recipients ?? c.recipientsCount ?? 0;
  const vRecipients = c.valid_recipients ?? c.validRecipients ?? tRecipients;

  const dateStr = c.date || (c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : 'Today');

  let scheduleDateVal = null;
  let scheduleTimeVal = null;
  if (c.scheduled_at || c.scheduledAt) {
    try {
      const d = new Date(c.scheduled_at || c.scheduledAt);
      if (!isNaN(d.getTime())) {
        scheduleDateVal = d.toISOString().split('T')[0];
        scheduleTimeVal = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    } catch {}
  }

  let audienceTypeDisplay = 'Existing Contacts';
  const rawAudienceSrc = (c.audience_source || c.audienceType || '').toLowerCase();
  if (rawAudienceSrc.includes('csv')) audienceTypeDisplay = 'Upload CSV';
  else if (rawAudienceSrc.includes('segment')) audienceTypeDisplay = 'Smart Segment';
  else if (rawAudienceSrc.includes('manual')) audienceTypeDisplay = 'Manual Entry';

  return {
    id: String(c.id),
    workspaceId: c.workspace_id,
    name: c.name || 'Untitled Campaign',
    type: (c.campaign_type || c.type || 'Promotional').charAt(0).toUpperCase() + (c.campaign_type || c.type || 'Promotional').slice(1),
    category: c.category || 'marketing',
    whatsappNumber: c.whatsappNumber || c.phone_number_id || '',
    phoneNumberId: c.phone_number_id || c.whatsappNumber || '',
    goal: c.campaign_goal || c.goal || 'Increase sales',
    audienceType: audienceTypeDisplay,
    audience_source: c.audience_source,
    audienceListName: c.audienceListName || c.campaign_goal || 'Custom Audience',
    recipientsCount: tRecipients,
    validRecipients: vRecipients,
    invalidRecipients: c.invalid_recipients ?? c.invalidRecipients ?? 0,
    recipients: Array.isArray(c.recipients) ? c.recipients : [],
    sentCount: sCount,
    deliveredCount: dCount,
    failedCount: fCount,
    repliesCount: rCount,
    responseRate: c.responseRate || (sCount > 0 ? `${((rCount / sCount) * 100).toFixed(1)}%` : '0.0%'),
    status: normalizeStatus(c.status),
    date: dateStr,
    created_at: c.created_at || c.createdAt || null,
    createdAt: c.created_at || c.createdAt || null,
    scheduled_at: c.scheduled_at || c.scheduledAt || null,
    scheduledAt: c.scheduled_at || c.scheduledAt || null,
    selectedTemplateId: c.template_id || c.templateId || c.selectedTemplateId || null,
    messageMode: c.message_type === 'template' ? 'template' : (c.message_type === 'ai_generated' ? 'ai' : (c.messageMode || 'custom')),
    messageBody: c.message_content || c.messageBody || '',
    mediaUrl: c.media_url || c.mediaUrl || '',
    mediaType: c.media_type || c.mediaType || (c.media_url ? 'image' : null),
    variableMapping: c.variable_mapping || c.variableMapping || null,
    sendType: c.schedule_type === 'later' ? 'Schedule for Later' : (c.sendType || 'Send Now'),
    scheduleDate: scheduleDateVal || c.scheduleDate,
    scheduleTime: scheduleTimeVal || c.scheduleTime,
    sendGradually: c.send_gradually ?? c.sendGradually ?? true,
    sendingRate: c.messages_per_minute ?? c.sendingRate ?? 100,
    skipInvalid: c.skip_invalid_numbers ?? c.skipInvalid ?? true,
    stopOnFailure: c.stop_on_high_failure_rate ?? c.stopOnFailure ?? true,
    quietHours: c.quiet_hours_enabled ?? c.quietHours ?? true,
    quietHoursStart: c.quiet_hours_start || '22:00',
    quietHoursEnd: c.quiet_hours_end || '08:00',
    error_breakdown: c.error_breakdown || c.errorBreakdown || [],
    errorBreakdown: c.error_breakdown || c.errorBreakdown || [],
    sent_rate: c.sent_rate ?? (tRecipients > 0 ? Number(((sCount / tRecipients) * 100).toFixed(1)) : 0),
    delivery_rate: c.delivery_rate ?? (sCount > 0 ? Number(((dCount / sCount) * 100).toFixed(1)) : 0),
    failed_rate: c.failed_rate ?? (sCount > 0 ? Number(((fCount / sCount) * 100).toFixed(1)) : 0),
  };
}

export function mapCampaignCategory(val) {
  if (!val) return 'marketing';
  const str = String(val).trim().toLowerCase();
  if (str.includes('util') || str.includes('transact') || str.includes('order') || str.includes('bill') || str.includes('update') || str.includes('supp') || str.includes('reminder') || str.includes('follow')) return 'utility';
  if (str.includes('auth') || str.includes('otp')) return 'authentication';
  if (str.includes('serv') || str.includes('care')) return 'service';
  return 'marketing';
}

export function mapFrontendCampaignToBackend(c, workspaceId) {
  const wsId = workspaceId || getStoredWorkspaceId();
  const sendType = c.sendType === 'Schedule for Later' ? 'later' : 'now';
  const scheduledIso = sendType === 'later' ? parseScheduleDatetime(c.scheduleDate, c.scheduleTime) : null;

  const isDraft = Boolean(c.saveAsDraft || c.status === 'draft' || c.status === 'Draft');

  return {
    workspace_id: wsId,
    name: c.name || 'Untitled Campaign',
    campaign_type: (c.type || 'promotional').toLowerCase().replace(/\s+/g, '_'),
    category: mapCampaignCategory(c.templateCategory || c.category || c.type),
    campaign_goal: c.goal || null,
    phone_number_id: c.phoneNumberId || c.phone_number_id || c.whatsappNumber || null,
    whatsapp_number: c.whatsappNumber || null,
    status: isDraft ? 'draft' : (c.status ? String(c.status).toLowerCase() : undefined),
    audience_source: (c.audienceType || 'existing_contacts').toLowerCase().replace(/\s+/g, '_'),
    contact_list_ids: c.selectedListIds || c.contact_list_ids || [],
    lead_ids: c.selectedLeadIds || c.lead_ids || [],
    variable_mapping: c.variableMapping || null,
    message_type: c.messageMode === 'template' ? 'template' : (c.messageMode === 'ai' ? 'ai_generated' : 'custom'),
    template_id: c.selectedTemplateId || c.template_id || c.templateId || null,
    message_content: c.messageBody || '',
    media_url: c.mediaUrl || null,
    media_type: c.mediaType || (c.mediaUrl ? 'image' : null),
    schedule_type: sendType,
    scheduled_at: scheduledIso,
    timezone: 'Asia/Kolkata',
    send_gradually: Boolean(c.sendGradually ?? true),
    messages_per_minute: Number(c.sendingRate || 100),
    skip_invalid_numbers: Boolean(c.skipInvalid ?? true),
    stop_on_high_failure_rate: Boolean(c.stopOnFailure ?? true),
    failure_rate_threshold: 10.0,
    quiet_hours_enabled: Boolean(c.quietHours ?? true),
    quiet_hours_start: c.quietHoursStart || '22:00',
    quiet_hours_end: c.quietHoursEnd || '08:00',
    auto_launch: isDraft ? false : (c.autoLaunch !== undefined ? Boolean(c.autoLaunch) : (sendType === 'now')),
    estimated_cost: Number(c.estimatedCost || 0.0),
    segment: c.segment || null,
    recipients: (c.recipients || []).map((r) => {
      const recipientName = r.recipient_name || r.name || '';
      const recipientPhone = r.phone_number || r.phone || '';
      const vars = { ...(r.variables || {}) };

      if (c.variableMapping && typeof c.variableMapping === 'object') {
        Object.entries(c.variableMapping).forEach(([varKey, mapping]) => {
          const cleanKey = String(varKey).replace(/[{}]/g, '');
          let val = '';
          if (mapping?.source === 'custom') {
            val = mapping?.customValue || mapping?.fallback || '';
          } else {
            const col = mapping?.source;
            if (col) {
              val =
                vars[col] ||
                vars[col.toLowerCase()] ||
                vars[col.trim()] ||
                r[col] ||
                r[col.toLowerCase()] ||
                '';
              if (!val) {
                const lower = col.toLowerCase();
                if (lower.includes('name')) val = recipientName;
                else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact')) val = recipientPhone;
                else if (lower.includes('email')) val = r.email || '';
                else if (lower.includes('company')) val = r.company || '';
              }
            }
          }
          vars[cleanKey] = val || mapping?.fallback || 'Customer';
        });
      } else if (!vars['1'] && recipientName) {
        vars['1'] = recipientName;
      }

      return {
        lead_id: r.lead_id || r.id || null,
        phone_number: recipientPhone,
        phone: recipientPhone,
        recipient_name: recipientName,
        name: recipientName,
        variables: vars,
      };
    }),
  };
}

// API Service functions with live backend + persistent fallback
export async function getCampaigns(workspaceId) {
  const wsId = workspaceId || getStoredWorkspaceId();
  const cacheKey = wsId ? `${STORAGE_KEYS.CAMPAIGNS}_${wsId}` : STORAGE_KEYS.CAMPAIGNS;
  try {
    const url = wsId ? `/api/marketing/campaigns?workspace_id=${wsId}` : '/api/marketing/campaigns';
    const res = await client.get(url);
    const rawItems = res?.items || res?.data?.items || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : null));
    if (rawItems && Array.isArray(rawItems)) {
      const mapped = rawItems.map(mapBackendCampaignToFrontend);
      setStoredItems(cacheKey, mapped);
      return mapped;
    }
  } catch (e) {
    console.warn('Live getCampaigns notice, falling back to local store:', e.message || e);
  }
  return getStoredItems(cacheKey, INITIAL_CAMPAIGNS);
}

export async function getCampaignById(id) {
  try {
    const res = await client.get(`/api/marketing/campaigns/${id}`);
    const item = res?.data || res;
    if (item?.id) return mapBackendCampaignToFrontend(item);
  } catch (e) {
    console.warn('getCampaignById notice:', e);
  }
  const all = getStoredItems(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  return all.find(c => c.id === id) || null;
}

export async function getCampaignRecipients(id, { status = 'all', search = '', errorCode = '', page = 1, limit = 50 } = {}) {
  try {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (search && search.trim()) params.append('search', search.trim());
    if (errorCode && errorCode !== 'all') params.append('error_code', errorCode);
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));

    const res = await client.get(`/api/marketing/campaigns/${id}/recipients?${params.toString()}`);
    return res?.data || res;
  } catch (e) {
    console.warn('getCampaignRecipients API notice:', e.message || e);
    return null;
  }
}

export async function createCampaign(campaignData, workspaceId, options = {}) {
  const wsId = workspaceId || getStoredWorkspaceId();
  const isDraft = Boolean(options.saveAsDraft || campaignData.saveAsDraft);
  const payload = mapFrontendCampaignToBackend({
    ...campaignData,
    autoLaunch: isDraft ? false : (campaignData.sendType !== 'Schedule for Later'),
  }, wsId);

  const res = await client.post('/api/marketing/campaigns', payload);
  const result = res?.data || res;

  // If 'Send Now' and not saving as draft, trigger launch endpoint
  const campaignId = result?.campaign_id || result?.id;
  if (!isDraft && campaignId && payload.schedule_type === 'now' && !result?.campaign_status?.includes('progress')) {
    try {
      await client.post(`/api/marketing/campaigns/${campaignId}/launch`);
    } catch (lErr) {
      console.warn('Launch trigger notice:', lErr);
    }
  }

  clearCampaignDraft();
  return result;
}

export async function duplicateCampaign(id) {
  const res = await client.post(`/api/marketing/campaigns/${id}/duplicate`);
  return res?.data || res;
}

export async function updateCampaign(id, updateData, workspaceId) {
  const wsId = workspaceId || getStoredWorkspaceId();
  const payload = mapFrontendCampaignToBackend(updateData, wsId);
  try {
    const res = await client.patch(`/api/marketing/campaigns/${id}`, payload);
    const result = res?.data || res;
    clearCampaignDraft();
    return result;
  } catch (e) {
    console.warn('updateCampaign API notice, falling back:', e?.message || e);
    const existing = getStoredItems(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
    const updated = existing.map(c => c.id === id ? { ...c, ...updateData } : c);
    setStoredItems(STORAGE_KEYS.CAMPAIGNS, updated);
    return updated.find(c => c.id === id) || { id, ...updateData };
  }
}

export async function deleteCampaign(id) {
  try {
    await client.delete(`/api/marketing/campaigns/${id}`);
    const existing = getStoredItems(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
    const updated = existing.filter(c => c.id !== id);
    setStoredItems(STORAGE_KEYS.CAMPAIGNS, updated);
    return true;
  } catch (e) {
    // Attempt fallback cancel endpoint
    try {
      await client.post(`/api/marketing/campaigns/${id}/cancel`);
    } catch {}
  }
  const existing = getStoredItems(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  const updated = existing.filter(c => c.id !== id);
  setStoredItems(STORAGE_KEYS.CAMPAIGNS, updated);
  return true;
}

export async function pauseCampaign(id) {
  try {
    const res = await client.post(`/api/marketing/campaigns/${id}/pause`);
    return res?.data || res;
  } catch (e) {
    return updateCampaign(id, { status: 'Paused' });
  }
}

export async function resumeCampaign(id) {
  try {
    const res = await client.post(`/api/marketing/campaigns/${id}/resume`);
    return res?.data || res;
  } catch (e) {
    return updateCampaign(id, { status: 'Sending' });
  }
}

export async function getContactLists(workspaceId) {
  const wsId = workspaceId || getStoredWorkspaceId();
  try {
    const url = wsId ? `/api/marketing/audiences/lists?workspace_id=${wsId}` : '/api/marketing/audiences/lists';
    const res = await client.get(url);
    const lists = res?.data || res;
    if (Array.isArray(lists) && lists.length > 0) {
      setStoredItems(STORAGE_KEYS.CONTACT_LISTS, lists);
      return lists;
    }
  } catch (e) {
    console.warn('getContactLists notice:', e.message || e);
  }
  return getStoredItems(STORAGE_KEYS.CONTACT_LISTS, INITIAL_CONTACT_LISTS);
}

export async function uploadAudienceCSV(file, workspaceId, defaultCountryCode = '91') {
  const wsId = workspaceId || getStoredWorkspaceId();
  const formData = new FormData();
  formData.append('file', file);

  const url = `/api/marketing/audiences/upload-csv?workspace_id=${wsId || ''}&default_country_code=${defaultCountryCode}`;
  // Don't pass explicit Content-Type so fetch sets boundary automatically!
  const res = await client.post(url, formData);
  return res?.data || res;
}

export async function getMarketingLeads(workspaceId, segment = 'all', search = '', channel = 'whatsapp') {
  const wsId = workspaceId || getStoredWorkspaceId();
  try {
    const params = new URLSearchParams();
    if (wsId) params.append('workspace_id', wsId);
    if (segment) params.append('segment', segment);
    if (search) params.append('search', search);
    if (channel) params.append('channel', channel);
    const url = `/api/marketing/audiences/leads?${params.toString()}`;
    const res = await client.get(url);
    return res?.data || res || { total: 0, segment_counts: {}, leads: [] };
  } catch (e) {
    console.warn('getMarketingLeads notice:', e.message || e);
    return { total: 0, segment_counts: {}, leads: [] };
  }
}

export async function estimateCampaign(workspaceId, validRecipientsCount, category = 'marketing') {
  const wsId = workspaceId || getStoredWorkspaceId();
  const normalizedCategory = mapCampaignCategory(category);
  const defaultRate = normalizedCategory === 'utility' ? 0.18 : (normalizedCategory === 'service' ? 0.05 : 1.25);
  const defaultMeta = normalizedCategory === 'utility' ? 0.145 : (normalizedCategory === 'service' ? 0.0 : 1.09);
  const defaultFee = normalizedCategory === 'utility' ? 0.035 : (normalizedCategory === 'service' ? 0.05 : 0.16);

  if (!wsId) {
    return {
      estimated_cost: Number(validRecipientsCount || 0) * defaultRate,
      rate_per_message: defaultRate,
      customer_price: defaultRate,
      meta_rate: defaultMeta,
      platform_fee_rate: defaultFee,
      is_balance_sufficient: true,
      portfolio_tier_limit: 0,
      portfolio_used_today: 0,
      portfolio_remaining_today: 0,
      is_whatsapp_connected: false,
    };
  }

  try {
    const res = await client.post('/api/marketing/campaigns/estimate', {
      workspace_id: wsId,
      valid_recipients_count: Number(validRecipientsCount || 0),
      category: normalizedCategory,
    });
    return res?.data || res;
  } catch (e) {
    console.warn('estimateCampaign notice:', e.message || e);
    return {
      estimated_cost: Number(validRecipientsCount || 0) * defaultRate,
      rate_per_message: defaultRate,
      customer_price: defaultRate,
      meta_rate: defaultMeta,
      platform_fee_rate: defaultFee,
      is_balance_sufficient: true,
      portfolio_tier_limit: 0,
      portfolio_used_today: 0,
      portfolio_remaining_today: 0,
      is_whatsapp_connected: false,
    };
  }
}

export async function getTierInfo(workspaceId) {
  const wsId = workspaceId || getStoredWorkspaceId();
  try {
    const url = wsId ? `/api/marketing/tier-info?workspace_id=${wsId}` : '/api/marketing/tier-info';
    const res = await client.get(url);
    return res?.data || res;
  } catch (e) {
    return {
      display_phone: '',
      phone_number_id: '',
      is_connected: false,
      tier_limit: 0,
      used_today: 0,
      remaining_today: 0,
    };
  }
}

function mapTemplateRecord(t) {
  const bodyText = t.body || t.content || '';
  let vars = t.variables;
  if (!Array.isArray(vars) || vars.length === 0) {
    const matched = bodyText.match(/\{\{[^}]+\}\}/g);
    vars = matched ? Array.from(new Set(matched)) : [];
  }

  return {
    id: String(t.id),
    name: t.name,
    category: String(t.category || 'MARKETING').toUpperCase(),
    language: t.language || 'en_US',
    status: String(t.status || 'DRAFT').toUpperCase(),
    body: bodyText,
    content: bodyText,
    header: t.header || null,
    footer: t.footer || null,
    cta: t.cta || null,
    cta_btn_title: t.cta_btn_title || null,
    variables: vars,
  };
}

export async function fetchApprovedTemplates(workspaceId) {
  const wsId = workspaceId || getStoredWorkspaceId();

  try {
    const url = wsId ? `/api/marketing/templates?workspace_id=${wsId}&status=approved` : '/api/marketing/templates?status=approved';
    const res = await client.get(url);
    const list = res?.items || res?.templates || res?.data?.items || res?.data?.templates || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : null));
    if (Array.isArray(list) && list.length > 0) {
      return list.map(mapTemplateRecord).filter((t) => (t.status || '').toUpperCase() === 'APPROVED');
    }
  } catch (e) {
    console.warn('fetchApprovedTemplates /api/marketing/templates notice:', e.message || e);
  }

  try {
    const res2 = await getTemplates();
    const list2 = res2?.templates || res2?.items || res2?.data?.templates || res2?.data?.items || (Array.isArray(res2?.data) ? res2.data : (Array.isArray(res2) ? res2 : null));
    if (Array.isArray(list2) && list2.length > 0) {
      return list2.map(mapTemplateRecord).filter((t) => (t.status || '').toUpperCase() === 'APPROVED');
    }
  } catch (e2) {
    console.warn('fetchApprovedTemplates /api/templates notice:', e2.message || e2);
  }

  // Pure real data: return empty array if no templates exist in DB
  return [];
}

// Draft state persistence for form safety
export function getCampaignDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRAFT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      (String(parsed.name || '').toLowerCase().includes('diwali') ||
       parsed.recipientsCount === 2480 ||
       parsed.recipientsCount === 2430 ||
       (parsed.invalidRecipients === 50 && (!parsed.recipients || parsed.recipients.length === 0)) ||
       (Array.isArray(parsed.selectedListIds) && parsed.selectedListIds.includes('list_1')))
    ) {
      localStorage.removeItem(STORAGE_KEYS.DRAFT);
      return null;
    }
    // Sanitize any corrupt manual entry draft where invalidRecipients exists without manualInvalidList
    if (parsed && parsed.audienceType === 'Manual Entry') {
      if (!Array.isArray(parsed.manualInvalidList) || parsed.manualInvalidList.length === 0) {
        parsed.invalidRecipients = 0;
        if (!Array.isArray(parsed.recipients) || parsed.recipients.length === 0) {
          parsed.recipientsCount = 0;
          parsed.validRecipients = 0;
        }
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveCampaignDraft(draft) {
  if (typeof window === 'undefined') return;
  try {
    let toStore = draft;
    if (draft?.recipients && Array.isArray(draft.recipients) && draft.recipients.length > 100) {
      toStore = {
        ...draft,
        recipients: draft.recipients.slice(0, 50),
      };
    }
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(toStore));
  } catch (err) {
    try {
      localStorage.removeItem(STORAGE_KEYS.DRAFT);
    } catch {}
  }
}

export function clearCampaignDraft() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.DRAFT);
  } catch {}
}
