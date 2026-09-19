import client from './client';
import { getTemplates } from './templates';

// Initial Seed Data matching reference screenshots
export const INITIAL_CAMPAIGNS = [
  {
    id: 'camp_001',
    name: 'Diwali Offer 2025',
    subtitle: 'Festive discount campaign',
    type: 'Promotional',
    whatsappNumber: '+91 98765 43210',
    goal: 'Increase sales',
    audienceType: 'Customers',
    audienceListName: 'Customers',
    audienceCount: 2500,
    recipientsCount: 2500,
    validRecipients: 2500,
    invalidRecipients: 68,
    sentCount: 2500,
    deliveredCount: 2432,
    deliveredPct: '97.3%',
    failedCount: 68,
    failedPct: '2.7%',
    repliesCount: 1248,
    responseRate: '9.7%',
    status: 'Completed',
    date: 'Oct 28, 2025',
    time: '10:30 AM',
    scheduledAt: '2025-10-28T10:30:00.000Z',
    messageType: 'Custom Message',
    messageBody: 'Hi {{name}}, This Diwali, get up to 50% OFF on our exclusive collection! 🎁 Use code {{coupon_code}} and make this festive season brighter with OrbionAgents. Shop now: {{website}}',
    mediaUrl: '/images/diwali-banner.jpg',
    mediaType: 'image',
    mediaName: 'Diwali Offer',
    variables: ['{{name}}', '{{coupon_code}}', '{{website}}'],
    sendType: 'Scheduled',
    timezone: 'Asia/Kolkata (IST)',
    sendGradually: true,
    sendingRate: 100,
    skipInvalid: true,
    stopOnFailure: false,
    quietHours: true,
  },
  {
    id: 'camp_002',
    name: 'New Product Launch',
    subtitle: 'Introducing our new collection',
    type: 'Promotional',
    whatsappNumber: '+91 98765 43210',
    goal: 'Increase sales',
    audienceType: 'Leads',
    audienceListName: 'Leads',
    audienceCount: 1200,
    recipientsCount: 1200,
    validRecipients: 1200,
    invalidRecipients: 96,
    sentCount: 1200,
    deliveredCount: 1104,
    deliveredPct: '92.0%',
    failedCount: 96,
    failedPct: '8.0%',
    repliesCount: 312,
    responseRate: '12.4%',
    status: 'Completed',
    date: 'Oct 25, 2025',
    time: '04:15 PM',
    scheduledAt: '2025-10-25T16:15:00.000Z',
    messageType: 'Template',
    templateName: 'new_product_launch',
    messageBody: 'Hey {{name}}, don\'t miss out on 24hr Flash Deals! Grab up to 40% OFF now with code {{coupon_code}}.',
    variables: ['{{name}}', '{{coupon_code}}'],
    sendType: 'Scheduled',
    timezone: 'Asia/Kolkata (IST)',
    sendGradually: true,
    sendingRate: 100,
    skipInvalid: true,
    statusBadge: 'completed'
  },
  {
    id: 'camp_003',
    name: 'Inactive Customers',
    subtitle: 'Win back campaign',
    type: 'Promotional',
    whatsappNumber: '+91 98765 43210',
    goal: 'Re-engage customers',
    audienceType: 'Segment',
    audienceListName: 'Segment',
    audienceCount: 3000,
    recipientsCount: 3000,
    validRecipients: 3000,
    invalidRecipients: 219,
    sentCount: 3000,
    deliveredCount: 2781,
    deliveredPct: '92.7%',
    failedCount: 219,
    failedPct: '7.3%',
    repliesCount: 420,
    responseRate: '15.2%',
    status: 'Completed',
    date: 'Oct 22, 2025',
    time: '11:00 AM',
    messageType: 'Template',
    statusBadge: 'completed'
  },
  {
    id: 'camp_004',
    name: 'Event Invitation',
    subtitle: 'Webinar invitation',
    type: 'Transactional',
    whatsappNumber: '+91 98765 43210',
    goal: 'Increase sales',
    audienceType: 'Contacts',
    audienceListName: 'Contacts',
    audienceCount: 850,
    recipientsCount: 850,
    validRecipients: 850,
    invalidRecipients: 58,
    sentCount: 850,
    deliveredCount: 792,
    deliveredPct: '93.2%',
    failedCount: 58,
    failedPct: '6.8%',
    repliesCount: 0,
    responseRate: '0.0%',
    status: 'Scheduled',
    date: 'Oct 20, 2025',
    time: '02:00 PM',
    scheduledAt: '2025-10-20T14:00:00.000Z',
    messageType: 'Template',
    statusBadge: 'scheduled'
  },
  {
    id: 'camp_005',
    name: 'Monthly Newsletter',
    subtitle: 'October edition',
    type: 'Promotional',
    whatsappNumber: '+91 98765 43210',
    goal: 'Re-engage customers',
    audienceType: 'Customers',
    audienceListName: 'Customers',
    audienceCount: 5000,
    recipientsCount: 5000,
    validRecipients: 5000,
    invalidRecipients: 379,
    sentCount: 5000,
    deliveredCount: 4621,
    deliveredPct: '92.4%',
    failedCount: 379,
    failedPct: '7.6%',
    repliesCount: 290,
    responseRate: '21.0%',
    status: 'Completed',
    date: 'Oct 18, 2025',
    time: '09:30 AM',
    statusBadge: 'completed'
  },
  {
    id: 'camp_006',
    name: 'Special Offers',
    subtitle: 'Exclusive deals for you',
    type: 'Promotional',
    whatsappNumber: '+91 98765 43210',
    goal: 'Increase sales',
    audienceType: 'VIP Customers',
    audienceListName: 'VIP Customers',
    audienceCount: 650,
    recipientsCount: 650,
    validRecipients: 650,
    invalidRecipients: 49,
    sentCount: 650,
    deliveredCount: 601,
    deliveredPct: '92.5%',
    failedCount: 49,
    failedPct: '7.5%',
    repliesCount: 88,
    responseRate: '4.5%',
    status: 'Paused',
    date: 'Oct 15, 2025',
    time: '03:45 PM',
    statusBadge: 'paused'
  }
];

export const INITIAL_CONTACT_LISTS = [
  {
    id: 'list_1',
    name: 'All Customers',
    totalContacts: 2480,
    validContacts: 2430,
    invalidContacts: 50,
    optedIn: 2430,
    optedOut: 50,
    description: 'All verified customers',
    createdOn: 'Jan 12, 2026'
  },
  {
    id: 'list_2',
    name: 'Recent Leads',
    totalContacts: 856,
    validContacts: 840,
    invalidContacts: 16,
    optedIn: 840,
    optedOut: 16,
    description: 'Leads from last 30 days',
    createdOn: 'Feb 3, 2026'
  },
  {
    id: 'list_3',
    name: 'Interested in Offers',
    totalContacts: 1120,
    validContacts: 1098,
    invalidContacts: 22,
    optedIn: 1098,
    optedOut: 22,
    description: 'Users who showed interest',
    createdOn: 'Feb 10, 2026'
  },
  {
    id: 'list_4',
    name: 'Repeat Customers',
    totalContacts: 642,
    validContacts: 640,
    invalidContacts: 2,
    optedIn: 640,
    optedOut: 2,
    description: 'Purchased more than 2 times',
    createdOn: 'Feb 15, 2026'
  },
  {
    id: 'list_5',
    name: 'Festival Campaign 2025',
    totalContacts: 1980,
    validContacts: 1900,
    invalidContacts: 80,
    optedIn: 1900,
    optedOut: 80,
    description: 'Diwali offer audience',
    createdOn: 'Feb 20, 2026'
  }
];

const STORAGE_KEYS = {
  CAMPAIGNS: 'orbion_marketing_campaigns',
  CONTACT_LISTS: 'orbion_marketing_contact_lists',
  DRAFT: 'orbion_marketing_campaign_draft'
};

function getStoredItems(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read ${key} from storage:`, err);
    return fallback;
  }
}

function setStoredItems(key, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to write ${key} to storage:`, err);
  }
}

// API Service functions with backend fallback & persistence
export async function getCampaigns() {
  try {
    const res = await client.get('/api/campaigns');
    if (res?.data && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (e) {
    // Graceful fallback to client storage
  }
  return getStoredItems(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
}

export async function getCampaignById(id) {
  try {
    const res = await client.get(`/api/campaigns/${id}`);
    if (res?.data) return res.data;
  } catch (e) {
    // Fallback
  }
  const all = getStoredItems(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  return all.find(c => c.id === id) || null;
}

export async function createCampaign(campaignData) {
  const newCampaign = {
    id: 'camp_' + Date.now(),
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    status: campaignData.sendType === 'Schedule for Later' ? 'Scheduled' : 'Sending',
    sentCount: campaignData.sendType === 'Schedule for Later' ? 0 : (campaignData.validRecipients || 2430),
    deliveredCount: campaignData.sendType === 'Schedule for Later' ? 0 : Math.floor((campaignData.validRecipients || 2430) * 0.98),
    failedCount: campaignData.invalidRecipients || 50,
    repliesCount: 0,
    responseRate: '0.0%',
    ...campaignData
  };

  try {
    const res = await client.post('/api/campaigns', newCampaign);
    if (res?.data) return res.data;
  } catch (e) {
    // Fallback to local storage update
  }

  const existing = getStoredItems(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  const updated = [newCampaign, ...existing];
  setStoredItems(STORAGE_KEYS.CAMPAIGNS, updated);
  clearCampaignDraft();
  return newCampaign;
}

export async function updateCampaign(id, updateData) {
  try {
    const res = await client.patch(`/api/campaigns/${id}`, updateData);
    if (res?.data) return res.data;
  } catch (e) {
    // Fallback
  }
  const existing = getStoredItems(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  const updated = existing.map(c => c.id === id ? { ...c, ...updateData } : c);
  setStoredItems(STORAGE_KEYS.CAMPAIGNS, updated);
  return updated.find(c => c.id === id);
}

export async function deleteCampaign(id) {
  try {
    await client.delete(`/api/campaigns/${id}`);
  } catch (e) {
    // Fallback
  }
  const existing = getStoredItems(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  const updated = existing.filter(c => c.id !== id);
  setStoredItems(STORAGE_KEYS.CAMPAIGNS, updated);
  return true;
}

export async function getContactLists() {
  try {
    const res = await client.get('/api/marketing/contact-lists');
    if (res?.data && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (e) {
    // Fallback
  }
  return getStoredItems(STORAGE_KEYS.CONTACT_LISTS, INITIAL_CONTACT_LISTS);
}

export async function fetchApprovedTemplates() {
  try {
    const res = await getTemplates();
    const list = res?.items || res?.data || res || [];
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
  } catch (e) {
    console.warn('Failed to fetch templates from /api/templates:', e);
  }
  return [
    {
      id: 'tpl_1',
      name: 'diwali_festive_offer',
      category: 'MARKETING',
      language: 'en_US',
      status: 'APPROVED',
      body: 'Hi {{1}}, get up to 50% OFF on our exclusive collection! 🎁 Use code {{2}} and celebrate Diwali with us.',
      variables: ['{{1}}', '{{2}}'],
    },
    {
      id: 'tpl_2',
      name: 'order_status_update',
      category: 'TRANSACTIONAL',
      language: 'en_US',
      status: 'APPROVED',
      body: 'Hi {{1}}, your order #{{2}} has been confirmed and is being processed.',
      variables: ['{{1}}', '{{2}}'],
    },
    {
      id: 'tpl_3',
      name: 'cart_reminder_discount',
      category: 'MARKETING',
      language: 'en_US',
      status: 'APPROVED',
      body: 'Hi {{1}}, items in your cart are waiting! Complete your purchase now and enjoy 15% off with code {{2}}.',
      variables: ['{{1}}', '{{2}}'],
    }
  ];
}

// Draft state persistence for form safety
export function getCampaignDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRAFT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCampaignDraft(draft) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(draft));
  } catch (err) {
    console.warn('Failed to save campaign draft:', err);
  }
}

export function clearCampaignDraft() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.DRAFT);
  } catch {}
}
