'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Crown,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Edit2,
  Power,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  MessageSquare,
  TrendingUp,
  Bot,
  Sparkles,
  Zap,
  FileText,
  Megaphone,
  Share2,
  Brain,
  Coins,
  CreditCard,
  Settings as SettingsIcon,
  ShieldCheck,
  CheckSquare,
  Square,
  MinusSquare,
  X
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

// Definition of all 14 workspace sections and their granular sub-menu items aligned with actual codebase features
const PERMISSION_SECTIONS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { id: 'overview', label: 'Overview & Metrics', desc: 'Live statistics, leads charts, and metrics' },
    ],
  },
  {
    id: 'inbox',
    label: 'Omni-Inbox',
    icon: MessageSquare,
    items: [
      { id: 'conversations', label: 'Conversations', desc: 'View, search, and reply to all conversations across channels' },
    ],
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: Users,
    items: [
      { id: 'view', label: 'View & Manage Leads', desc: 'Access leads pipeline, AI score breakdowns, add leads, and export CSV' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: TrendingUp,
    items: [
      { id: 'view', label: 'CRM Contacts & Deals', desc: 'Access CRM table, customer contacts, deals, and lifecycle stages' },
    ],
  },
  {
    id: 'ai',
    label: 'AI Workspace',
    icon: Sparkles,
    items: [
      { id: 'chat', label: 'AI Assistant & Copilot', desc: 'Interact with AI assistant, copilot prompts, and test knowledge queries' },
    ],
  },
  {
    id: 'automation',
    label: 'Automations',
    icon: Zap,
    items: [
      { id: 'manage', label: 'Flow Builder & Automations', desc: 'Build, edit, test, and publish conversational automation flows' },
    ],
  },
  {
    id: 'templates',
    label: 'Templates',
    icon: FileText,
    items: [
      { id: 'manage', label: 'Message Templates', desc: 'Create, edit, preview, and submit WhatsApp & Email templates' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    items: [
      { id: 'campaigns', label: 'Bulk Broadcast Campaigns', desc: 'Create bulk messaging campaigns and view delivery analytics' },
    ],
  },
  {
    id: 'channels',
    label: 'Channels',
    icon: Share2,
    items: [
      { id: 'manage', label: 'Connected Accounts', desc: 'Connect and manage WhatsApp QR/API, Instagram, Webchat, and Email' },
    ],
  },
  {
    id: 'brain',
    label: 'Brain (Knowledge Base)',
    icon: Brain,
    items: [
      { id: 'manage', label: 'Documents & Training Data', desc: 'Upload documents, crawl website URLs, and sync AI knowledge' },
    ],
  },
  {
    id: 'credits',
    label: 'Credits & Wallet',
    icon: Coins,
    items: [
      { id: 'view', label: 'Usage & Balances', desc: 'View AI credits, WhatsApp WCC wallet balance, and recharge history' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    items: [
      { id: 'manage', label: 'Plans & Invoices', desc: 'View subscription plans, download invoices, and manage billing profile' },
    ],
  },
  {
    id: 'team',
    label: 'Team Management',
    icon: ShieldCheck,
    items: [
      { id: 'members', label: 'Members & Invitations', desc: 'Invite teammates, manage roles, permissions, and seat allocations' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: SettingsIcon,
    items: [
      { id: 'general', label: 'Workspace Settings', desc: 'Edit business profile, preferences, and security settings' },
      { id: 'notifications', label: 'Notification Alerts', desc: 'Configure notification alerts and sound notifications' },
    ],
  },
];

function getDefaultFullPermissions() {
  const full = {};
  PERMISSION_SECTIONS.forEach((sec) => {
    full[sec.id] = sec.items.map((i) => i.id);
  });
  return full;
}

function getEnabledModulesCount(permissions) {
  if (!permissions || typeof permissions !== 'object') return 0;
  return PERMISSION_SECTIONS.filter((sec) => {
    const secPerms = permissions[sec.id] || [];
    const validItemIds = sec.items.map((i) => i.id);
    return Array.isArray(secPerms) && secPerms.some((item) => validItemIds.includes(item));
  }).length;
}

export default function TeamManagementSection() {
  const { workspaceId, user: currentUser, refreshPermissions } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Modal State for Add / Edit Member
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'member',
    permissions: getDefaultFullPermissions(),
    is_active: true,
  });
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  // Inline Actions State
  const [copiedToken, setCopiedToken] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTeamData = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const res = await api.getWorkspaceMembers(workspaceId);
      setData(res);
      refreshPermissions?.(workspaceId);
    } catch (err) {
      console.warn('Failed to load team members:', err);
      showToast('error', err?.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, showToast, refreshPermissions]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // Open Modal for adding a new member
  const handleOpenAddModal = () => {
    setEditingMember(null);
    setFormError(null);
    setFormData({
      name: '',
      email: '',
      role: 'member',
      permissions: {
        dashboard: ['overview'],
        inbox: ['conversations'],
        leads: ['view'],
        crm: ['view'],
        automation: ['manage'],
      },
      is_active: true,
    });
    setCollapsedSections({});
    setIsModalOpen(true);
  };

  // Open Modal for editing an existing member
  const handleOpenEditModal = (member) => {
    setEditingMember(member);
    setFormError(null);
    let memberPerms = member.permissions;
    if (member.role === 'admin' || !memberPerms) {
      memberPerms = getDefaultFullPermissions();
    } else {
      const dict = {};
      const addPerm = (sec, item) => {
        const validSection = PERMISSION_SECTIONS.find((s) => s.id === sec);
        if (validSection && validSection.items.some((i) => i.id === item)) {
          if (!dict[sec]) dict[sec] = [];
          if (!dict[sec].includes(item)) dict[sec].push(item);
        }
      };

      const legacyMap = {
        'leads.all_leads': ['leads', 'view'],
        'leads.lead_settings': ['leads', 'view'],
        'crm.contacts': ['crm', 'view'],
        'crm.deals': ['crm', 'view'],
        'crm.companies': ['crm', 'view'],
        'ai_agents.agents': ['ai', 'chat'],
        'ai_agents.agent_settings': ['ai', 'chat'],
        'flows.all_flows': ['automation', 'manage'],
        'flows.flow_settings': ['automation', 'manage'],
        'marketing.templates': ['templates', 'manage'],
        'marketing.campaigns': ['marketing', 'campaigns'],
        'analytics.reports': ['credits', 'view'],
        'knowledge_base.documents': ['brain', 'manage'],
        'integrations.connected_accounts': ['channels', 'manage'],
        'billing.plans': ['billing', 'manage'],
        'billing.invoices': ['billing', 'manage'],
      };

      if (Array.isArray(memberPerms)) {
        memberPerms.forEach((p) => {
          if (legacyMap[p]) {
            const [s, i] = legacyMap[p];
            addPerm(s, i);
          } else if (p.includes('.')) {
            const [sec, item] = p.split('.');
            addPerm(sec, item);
          }
        });
      } else if (typeof memberPerms === 'object') {
        Object.entries(memberPerms).forEach(([sec, items]) => {
          if (Array.isArray(items)) {
            items.forEach((item) => {
              const fullKey = `${sec}.${item}`;
              if (legacyMap[fullKey]) {
                const [s, i] = legacyMap[fullKey];
                addPerm(s, i);
              } else {
                addPerm(sec, item);
              }
            });
          }
        });
      }
      memberPerms = dict;
    }

    setFormData({
      name: member.name || member.full_name || '',
      email: member.email || '',
      role: member.role || 'member',
      permissions: memberPerms,
      is_active: member.is_active !== false,
    });
    setCollapsedSections({});
    setIsModalOpen(true);
  };

  // Toggle sub-item permission
  const handleTogglePermission = (sectionId, itemId) => {
    setFormData((prev) => {
      const currentSectionItems = prev.permissions[sectionId] || [];
      const hasItem = currentSectionItems.includes(itemId);
      const newItems = hasItem
        ? currentSectionItems.filter((i) => i !== itemId)
        : [...currentSectionItems, itemId];

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [sectionId]: newItems,
        },
      };
    });
  };

  // Toggle all items in a section
  const handleToggleSectionAll = (sectionId) => {
    const sec = PERMISSION_SECTIONS.find((s) => s.id === sectionId);
    if (!sec) return;

    setFormData((prev) => {
      const currentSectionItems = prev.permissions[sectionId] || [];
      const allItemIds = sec.items.map((i) => i.id);
      const allSelected = allItemIds.every((id) => currentSectionItems.includes(id));

      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [sectionId]: allSelected ? [] : allItemIds,
        },
      };
    });
  };

  // Toggle section collapse on mobile
  const handleToggleSectionCollapse = (sectionId) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Select All permissions across all sections
  const handleSelectAllPermissions = () => {
    setFormData((prev) => ({
      ...prev,
      permissions: getDefaultFullPermissions(),
    }));
  };

  // Clear all permissions
  const handleClearAllPermissions = () => {
    const empty = {};
    PERMISSION_SECTIONS.forEach((sec) => {
      empty[sec.id] = [];
    });
    setFormData((prev) => ({
      ...prev,
      permissions: empty,
    }));
  };

  // Submit Add or Edit Form
  const handleSubmitMember = async (e) => {
    e?.preventDefault();
    setFormError(null);

    const emailToSubmit = (formData.email || '').trim().toLowerCase();
    if (!emailToSubmit || !emailToSubmit.includes('@')) {
      const msg = 'Please enter a valid email address.';
      setFormError(msg);
      showToast('error', msg);
      return;
    }

    // Pre-validation for new invites
    if (!editingMember) {
      const isAlreadyMember = (data?.members || []).some(
        (m) => m.email && m.email.trim().toLowerCase() === emailToSubmit
      );
      if (isAlreadyMember) {
        const msg = `${emailToSubmit} is already a member of this workspace.`;
        setFormError(msg);
        showToast('error', msg);
        return;
      }

      const totalSeats = data?.total_member_seats || 3;
      const usedSeats = data?.used_member_seats || 0;
      if (formData.role === 'member' && usedSeats >= totalSeats) {
        const msg = `You have reached the maximum allowed member seats (${totalSeats}) for your current plan. Please upgrade your plan or invite as Admin.`;
        setFormError(msg);
        showToast('error', msg);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (editingMember) {
        await api.updateWorkspaceMember(workspaceId, editingMember.id, {
          name: formData.name.trim() || undefined,
          role: formData.role,
          permissions: formData.role === 'admin' ? getDefaultFullPermissions() : formData.permissions,
          is_active: formData.is_active,
        });
        showToast('success', `Updated ${formData.name || emailToSubmit} successfully.`);
      } else {
        await api.inviteWorkspaceMember(workspaceId, {
          name: formData.name.trim() || undefined,
          email: emailToSubmit,
          role: formData.role,
          permissions: formData.role === 'admin' ? getDefaultFullPermissions() : formData.permissions,
        });
        showToast('success', `Invitation sent to ${emailToSubmit}!`);
      }
      setIsModalOpen(false);
      setFormError(null);
      fetchTeamData();
    } catch (err) {
      const msg = err?.data?.detail || err?.message || 'Failed to save member';
      setFormError(msg);
      showToast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active/deactivated status directly
  const handleToggleMemberStatus = async (member) => {
    try {
      setTogglingStatusId(member.id);
      const nextStatus = !member.is_active;
      await api.updateWorkspaceMember(workspaceId, member.id, {
        is_active: nextStatus,
      });
      showToast('success', `Member ${nextStatus ? 'activated' : 'deactivated'} successfully.`);
      fetchTeamData();
    } catch (err) {
      console.warn('Status toggle warning:', err);
      showToast('error', err?.message || 'Failed to update member status');
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleCopyLink = (token) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = `${origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    showToast('success', 'Invitation link copied to clipboard!');
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const handleResend = async (invitationId) => {
    try {
      setResendingId(invitationId);
      await api.resendWorkspaceInvitation(workspaceId, invitationId);
      showToast('success', 'Invitation email resent successfully!');
      fetchTeamData();
    } catch (err) {
      console.warn('Resend notice:', err);
      showToast('error', err?.message || 'Failed to resend invitation');
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelInvite = async (invitationId) => {
    try {
      setCancellingId(invitationId);
      await api.cancelWorkspaceInvitation(workspaceId, invitationId);
      showToast('success', 'Invitation revoked successfully.');
      fetchTeamData();
    } catch (err) {
      console.warn('Cancel invite notice:', err);
      showToast('error', err?.message || 'Failed to revoke invitation');
    } finally {
      setCancellingId(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    try {
      setIsRemoving(true);
      await api.removeWorkspaceMember(workspaceId, memberToRemove.id);
      showToast('success', `${memberToRemove.email} removed. Workspace access revoked immediately.`);
      setMemberToRemove(null);
      fetchTeamData();
    } catch (err) {
      console.warn('Remove member notice:', err);
      showToast('error', err?.message || 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-3" />
        <p className="text-sm font-medium">Loading team & permissions...</p>
      </div>
    );
  }

  const members = data?.members || [];
  const invitations = data?.invitations || [];
  const totalMemberSeats = data?.total_member_seats || 3;
  const usedMemberSeats = data?.used_member_seats || 0;
  const availableMemberSeats = Math.max(0, totalMemberSeats - usedMemberSeats);
  const adminCount = members.filter((m) => ['admin', 'founder', 'owner'].includes(m.role?.toLowerCase())).length;

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-5xl mx-auto px-1 sm:px-0">
      {/* ─ HEADER SECTION ─ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400 shrink-0" />
            <span>Team Members & Permissions</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Manage workspace seats, configure granular role permissions, and invite teammates.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          <button
            onClick={fetchTeamData}
            title="Refresh team members"
            aria-label="Refresh team members"
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-medium shadow-lg shadow-violet-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* ─ SEATS ENTITLEMENT STATS CARDS ─ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Member Seats Used */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Member Seats</span>
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{usedMemberSeats}</span>
              <span className="text-xs text-zinc-400">/ {totalMemberSeats} Plan Seats</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-violet-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (usedMemberSeats / Math.max(1, totalMemberSeats)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Available Seats */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Available Seats</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-emerald-400">{availableMemberSeats}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Ready for new invites</p>
          </div>
        </div>

        {/* Admins & Full Access */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Admins (Full Access)</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-amber-300">{adminCount}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">No seat limit restriction</p>
          </div>
        </div>
      </div>

      {/* ─ ACTIVE MEMBERS SECTION ─ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Active Workspace Members ({members.length})</span>
          </h3>
        </div>

        {/* Mobile View: Responsive Member Cards (< 640px) */}
        <div className="block sm:hidden space-y-3">
          {members.map((member) => {
            const isCurrent = currentUser?.email && member.email.toLowerCase() === currentUser.email.toLowerCase();
            const displayName = member.name || member.full_name || member.email.split('@')[0];
            const initials = displayName.charAt(0).toUpperCase();
            const isAdminRole = ['admin', 'founder', 'owner'].includes(member.role?.toLowerCase()) || member.is_owner;
            const isActive = member.is_active !== false;
            const enabledSecCount = getEnabledModulesCount(member.permissions);

            return (
              <div
                key={member.id}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isAdminRole
                        ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                        : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-white truncate">{displayName}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            You
                          </span>
                        )}
                        {member.is_owner && (
                          <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Crown className="w-3 h-3" /> Owner
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Deactivated
                      </span>
                    )}
                  </div>
                </div>

                {/* Role & Access Info */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    {isAdminRole ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 capitalize">
                        <Crown className="w-3 h-3" /> {member.role || 'Admin'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 capitalize">
                        Member
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {isAdminRole ? 'Full Access' : `${enabledSecCount} / ${PERMISSION_SECTIONS.length} Modules`}
                  </span>
                </div>

                {/* Actions Bar */}
                {!member.is_owner && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleOpenEditModal(member)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {!isCurrent && (
                      <button
                        onClick={() => handleToggleMemberStatus(member)}
                        disabled={togglingStatusId === member.id}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer ${
                          isActive
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20'
                        }`}
                      >
                        {togglingStatusId === member.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                        <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    )}

                    {!isCurrent && (
                      <button
                        onClick={() => setMemberToRemove(member)}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                        title="Remove Member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop / Tablet View: Table (>= 640px) */}
        <div className="hidden sm:block rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-zinc-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Member</th>
                  <th className="py-3 px-4 whitespace-nowrap">Role</th>
                  <th className="py-3 px-4 whitespace-nowrap">Access Scope</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((member) => {
                  const isCurrent = currentUser?.email && member.email.toLowerCase() === currentUser.email.toLowerCase();
                  const displayName = member.name || member.full_name || member.email.split('@')[0];
                  const initials = displayName.charAt(0).toUpperCase();
                  const isAdminRole = ['admin', 'founder', 'owner'].includes(member.role?.toLowerCase()) || member.is_owner;
                  const isActive = member.is_active !== false;
                  const enabledSecCount = getEnabledModulesCount(member.permissions);

                  return (
                    <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isAdminRole
                              ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                              : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-white truncate">{displayName}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                                  You
                                </span>
                              )}
                              {member.is_owner && (
                                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  <Crown className="w-3 h-3" /> Owner
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 truncate">{member.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isAdminRole ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 capitalize">
                            <Crown className="w-3 h-3" /> {member.role || 'Admin'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 capitalize">
                            Member
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isAdminRole ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Full Access (All Modules)
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-300">
                            {enabledSecCount} / {PERMISSION_SECTIONS.length} Modules Enabled
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!member.is_owner && (
                            <button
                              onClick={() => handleOpenEditModal(member)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                              title="Edit Member Permissions"
                              aria-label="Edit Member Permissions"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {!member.is_owner && !isCurrent && (
                            <button
                              onClick={() => handleToggleMemberStatus(member)}
                              disabled={togglingStatusId === member.id}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isActive
                                  ? 'text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10'
                                  : 'text-amber-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                              title={isActive ? 'Deactivate Member' : 'Activate Member'}
                              aria-label={isActive ? 'Deactivate Member' : 'Activate Member'}
                            >
                              {togglingStatusId === member.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Power className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {!member.is_owner && !isCurrent && (
                            <button
                              onClick={() => setMemberToRemove(member)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Remove Member"
                              aria-label="Remove Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─ PENDING INVITATIONS SECTION ─ */}
      {invitations.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Pending Invitations ({invitations.length})</span>
          </h3>

          {/* Mobile Pending Cards (< 640px) */}
          <div className="block sm:hidden space-y-3">
            {invitations.map((inv) => {
              const isCopied = copiedToken === inv.token;
              const isResending = resendingId === inv.id;
              const isCancelling = cancellingId === inv.id;

              return (
                <div key={inv.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-white truncate">{inv.name || inv.email}</p>
                      {inv.name && <p className="text-xs text-zinc-400 truncate">{inv.email}</p>}
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20 capitalize shrink-0">
                      {inv.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-white/5">
                    <span>Expires: {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '7 days'}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleCopyLink(inv.token)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                      <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                    </button>

                    <button
                      onClick={() => handleResend(inv.id)}
                      disabled={isResending}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
                      title="Resend email"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin text-violet-400' : ''}`} />
                    </button>

                    <button
                      onClick={() => handleCancelInvite(inv.id)}
                      disabled={isCancelling}
                      className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 cursor-pointer"
                      title="Revoke invitation"
                    >
                      {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Pending Table (>= 640px) */}
          <div className="hidden sm:block rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-zinc-400 border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4 whitespace-nowrap">Invited User</th>
                    <th className="py-3 px-4 whitespace-nowrap">Role & Access</th>
                    <th className="py-3 px-4 whitespace-nowrap">Expires</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Invite Link & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {invitations.map((inv) => {
                    const isCopied = copiedToken === inv.token;
                    const isResending = resendingId === inv.id;
                    const isCancelling = cancellingId === inv.id;

                    return (
                      <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-medium text-white">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="truncate block">{inv.name || inv.email}</span>
                              {inv.name && <p className="text-xs text-zinc-400 font-normal truncate">{inv.email}</p>}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20 capitalize">
                            {inv.role === 'admin' ? 'Admin (Full Access)' : 'Member (Custom Access)'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-zinc-400 whitespace-nowrap">
                          {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '7 days'}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleCopyLink(inv.token)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                              title="Copy invitation link"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-green-400" />
                                  <span className="text-green-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleResend(inv.id)}
                              disabled={isResending}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                              title="Resend invitation email"
                            >
                              <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin text-violet-400' : ''}`} />
                            </button>

                            <button
                              onClick={() => handleCancelInvite(inv.id)}
                              disabled={isCancelling}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Revoke invitation"
                            >
                              {isCancelling ? (
                                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─ ADD / EDIT TEAM MEMBER MODAL (RENDERED IN PORTAL) ─ */}
      {mounted && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-2xl bg-[#0e1422] border border-white/15 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[88vh] overflow-hidden my-auto"
              >
                {/* Modal Header */}
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0e1422]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                      <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-white truncate">
                        {editingMember ? 'Edit Team Member' : 'Add Team Member'}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate">
                        {editingMember ? 'Update member role and permissions.' : 'Invite a member & configure sidebar access.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Body (Scrollable) */}
                <form id="member-form" onSubmit={handleSubmitMember} className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                  {/* Inline Error Alert Banner */}
                  {formError && (
                    <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-200">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-red-100">Cannot Complete Action</p>
                        <p className="mt-0.5 text-red-300 leading-relaxed">{formError}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormError(null)}
                        className="text-red-400 hover:text-white p-0.5 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Name & Email Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-[11px] sm:text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormError(null);
                          setFormData({ ...formData, name: e.target.value });
                        }}
                        placeholder="e.g. Alex Smith"
                        className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] sm:text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        disabled={Boolean(editingMember)}
                        value={formData.email}
                        onChange={(e) => {
                          setFormError(null);
                          setFormData({ ...formData, email: e.target.value });
                        }}
                        placeholder="colleague@company.com"
                        className="w-full px-3.5 py-2 sm:py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                      Role & Access Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      {/* Admin Role */}
                      <div
                        onClick={() => {
                          setFormError(null);
                          setFormData({ ...formData, role: 'admin' });
                        }}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          formData.role === 'admin'
                            ? 'bg-violet-600/15 border-violet-500 text-white shadow-lg shadow-violet-600/10'
                            : 'bg-white/[0.02] border-white/10 text-zinc-300 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm">
                            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Admin</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Full Access
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-zinc-400 mt-1.5 leading-relaxed">
                          Full access to all 13 sidebar modules & settings. Does not consume member seat quota.
                        </p>
                      </div>

                      {/* Member Role */}
                      <div
                        onClick={() => {
                          setFormError(null);
                          setFormData({ ...formData, role: 'member' });
                        }}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          formData.role === 'member'
                            ? 'bg-violet-600/15 border-violet-500 text-white shadow-lg shadow-violet-600/10'
                            : 'bg-white/[0.02] border-white/10 text-zinc-300 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm">
                            <Users className="w-4 h-4 text-violet-400 shrink-0" />
                            <span>Member</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20">
                            Custom Permissions
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-zinc-400 mt-1.5 leading-relaxed">
                          Granular permissions. Member only sees and accesses checked sidebar & sub-menu items.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Granular Permissions (Shown for Member Role) */}
                  {formData.role === 'member' && (
                    <div className="space-y-3 pt-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                            <Shield className="w-4 h-4 text-violet-400" />
                            <span>Sidebar & Sub-Menu Permissions</span>
                          </h4>
                          <p className="text-[11px] sm:text-xs text-zinc-400">
                            Check the sections and sub-menus this member can access.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={handleSelectAllPermissions}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-violet-300 hover:text-white transition-colors cursor-pointer"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={handleClearAllPermissions}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      {/* Permissions Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                        {PERMISSION_SECTIONS.map((section) => {
                          const IconComponent = section.icon;
                          const selectedItems = formData.permissions[section.id] || [];
                          const allSelected = section.items.every((i) => selectedItems.includes(i.id));
                          const someSelected = selectedItems.length > 0 && !allSelected;
                          const isCollapsed = Boolean(collapsedSections[section.id]);

                          return (
                            <div
                              key={section.id}
                              className="p-3 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all space-y-2"
                            >
                              {/* Master Checkbox Header */}
                              <div className="flex items-center justify-between gap-2">
                                <label className="flex items-center gap-2.5 cursor-pointer select-none min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSectionAll(section.id)}
                                    className="text-violet-400 hover:text-violet-300 focus:outline-none cursor-pointer shrink-0"
                                  >
                                    {allSelected ? (
                                      <CheckSquare className="w-4 h-4 text-violet-500 fill-violet-500/20" />
                                    ) : someSelected ? (
                                      <MinusSquare className="w-4 h-4 text-violet-400" />
                                    ) : (
                                      <Square className="w-4 h-4 text-zinc-500" />
                                    )}
                                  </button>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <IconComponent className="w-4 h-4 text-zinc-400 shrink-0" />
                                    <span className="text-xs font-bold text-white truncate">{section.label}</span>
                                  </div>
                                </label>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[10px] text-zinc-400">
                                    {selectedItems.length}/{section.items.length}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSectionCollapse(section.id)}
                                    className="p-1 text-zinc-400 hover:text-white sm:hidden cursor-pointer"
                                  >
                                    {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>

                              {/* Sub-menu Checkboxes */}
                              {!isCollapsed && (
                                <div className="pl-6 space-y-2 border-l border-white/10 ml-2 pt-1">
                                  {section.items.map((item) => {
                                    const isChecked = selectedItems.includes(item.id);
                                    return (
                                      <label
                                        key={item.id}
                                        className="flex items-start gap-2.5 text-xs text-zinc-300 hover:text-white cursor-pointer select-none py-0.5 group"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleTogglePermission(section.id, item.id)}
                                          className="rounded border-white/20 bg-black/40 text-violet-600 focus:ring-violet-500 cursor-pointer w-3.5 h-3.5 shrink-0 mt-0.5"
                                        />
                                        <div className="min-w-0">
                                          <span className="font-medium text-white block truncate">{item.label}</span>
                                          {item.desc && (
                                            <span className="text-[10px] text-zinc-400 group-hover:text-zinc-300 block leading-tight">
                                              {item.desc}
                                            </span>
                                          )}
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </form>

                {/* Modal Footer */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-white/10 bg-[#0b101b] flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs sm:text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="member-form"
                    disabled={isSubmitting || !formData.email}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-medium shadow-md shadow-violet-600/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : editingMember ? (
                      <span>Save Changes</span>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Member & Send Invitation</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─ REMOVE MEMBER CONFIRMATION DIALOG (RENDERED IN PORTAL) ─ */}
      {mounted && createPortal(
        <AnimatePresence>
          {memberToRemove && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md p-5 sm:p-6 rounded-2xl bg-[#0e1422] border border-white/10 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3 text-red-400">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white">Remove Team Member?</h4>
                    <p className="text-xs text-zinc-400">Immediate access revocation.</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  Are you sure you want to remove <strong className="text-white">{memberToRemove.email}</strong> from this workspace? Their workspace session and permissions will be revoked immediately.
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setMemberToRemove(null)}
                    disabled={isRemoving}
                    className="px-3.5 py-2 rounded-xl text-xs sm:text-sm text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmRemove}
                    disabled={isRemoving}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {isRemoving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Removing...</span>
                      </>
                    ) : (
                      <span>Remove Member</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
