    "use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Mail,
  Shield,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Clock,
  AlertCircle,
  Loader2,
  Edit2,
  Power,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Inbox,
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
  X,
} from "lucide-react";
import { poppins } from "@/lib/fonts";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

// Definition of all 14 workspace sections and their granular sub-menu items aligned with actual codebase features
const PERMISSION_SECTIONS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      {
        id: "overview",
        label: "Overview & Metrics",
        desc: "Live statistics, leads charts, and metrics",
      },
    ],
  },
  {
    id: "inbox",
    label: "Inbox",
    icon: Inbox,
    items: [
      {
        id: "conversations",
        label: "Conversations",
        desc: "View, search, and reply to all conversations across channels",
      },
    ],
  },
  {
    id: "leads",
    label: "Leads",
    icon: Users,
    items: [
      {
        id: "view",
        label: "View & Manage Leads",
        desc: "Access leads pipeline, AI score breakdowns, add leads, and export CSV",
      },
    ],
  },
  {
    id: "crm",
    label: "CRM",
    icon: TrendingUp,
    items: [
      {
        id: "view",
        label: "CRM Contacts & Deals",
        desc: "Access CRM table, customer contacts, deals, and lifecycle stages",
      },
    ],
  },
  {
    id: "ai",
    label: "AI Workspace",
    icon: Sparkles,
    items: [
      {
        id: "chat",
        label: "AI Assistant & Copilot",
        desc: "Interact with AI assistant, copilot prompts, and test knowledge queries",
      },
    ],
  },
  {
    id: "automation",
    label: "Automations",
    icon: Zap,
    items: [
      {
        id: "manage",
        label: "Flow Builder & Automations",
        desc: "Build, edit, test, and publish conversational automation flows",
      },
    ],
  },
  {
    id: "templates",
    label: "Templates",
    icon: FileText,
    items: [
      {
        id: "manage",
        label: "Message Templates",
        desc: "Create, edit, preview, and submit WhatsApp & Email templates",
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    items: [
      {
        id: "campaigns",
        label: "Bulk Broadcast Campaigns",
        desc: "Create bulk messaging campaigns and view delivery analytics",
      },
    ],
  },
  {
    id: "channels",
    label: "Channels",
    icon: Share2,
    items: [
      {
        id: "manage",
        label: "Connected Accounts",
        desc: "Connect and manage WhatsApp QR/API, Instagram, Webchat, and Email",
      },
    ],
  },
  {
    id: "brain",
    label: "Brain (Knowledge Base)",
    icon: Brain,
    items: [
      {
        id: "manage",
        label: "Documents & Training Data",
        desc: "Upload documents, crawl website URLs, and sync AI knowledge",
      },
    ],
  },
  {
    id: "credits",
    label: "Credits & Wallet",
    icon: Coins,
    items: [
      {
        id: "view",
        label: "Credits & Recharges",
        desc: "View usage and balances, purchase AI credits, and recharge the WhatsApp wallet",
      },
    ],
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    items: [
      {
        id: "manage",
        label: "Plans & Invoices",
        desc: "View subscription plans, download invoices, and manage billing profile",
      },
    ],
  },
  {
    id: "team",
    label: "Team Management",
    icon: ShieldCheck,
    items: [
      {
        id: "members",
        label: "Members & Invitations",
        desc: "Manage team members, invitations, roles, permissions, and seats.",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
    items: [
      {
        id: "general",
        label: "Workspace Settings",
        desc: "Edit business profile, preferences, and security settings",
      },
      {
        id: "notifications",
        label: "Notification Alerts",
        desc: "Configure notification alerts and sound notifications",
      },
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
  if (!permissions || typeof permissions !== "object") return 0;
  return PERMISSION_SECTIONS.filter((sec) => {
    const secPerms = permissions[sec.id] || [];
    const validItemIds = sec.items.map((i) => i.id);
    return (
      Array.isArray(secPerms) &&
      secPerms.some((item) => validItemIds.includes(item))
    );
  }).length;
}

const subscribeHydration = () => () => {};

export default function TeamManagementSection() {
  const {
    workspaceId,
    user: currentUser,
    refreshPermissions,
    hasPermission,
    permissionsLoading,
  } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const mounted = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const canManage = !permissionsLoading && hasPermission("team.members");
  const canView = hasPermission("team.members");

  // Modal State for Add / Edit Member
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPermissions, setShowPermissions] = useState(false);
  const modalRef = useRef(null);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "member",
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

  const fetchTeamData = useCallback(async () => {
    if (!workspaceId || !canView) return;
    try {
      setLoading(true);
      const res = await api.getWorkspaceMembers(workspaceId);
      setData(res);
      refreshPermissions?.(workspaceId);
    } catch (err) {
      console.warn("Failed to load team members:", err);
      showToast(err?.message || "Failed to load team members", "error");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, canView, showToast, refreshPermissions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchTeamData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTeamData]);

  useEffect(() => {
    if (!isModalOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      modalRef.current?.querySelector("input:not(:disabled)")?.focus();
    });
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) setIsModalOpen(false);
      if (event.key !== "Tab") return;
      const elements = Array.from(
        modalRef.current?.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ) || [],
      );
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) {
        event.preventDefault();
        modalRef.current?.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !elements.includes(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !elements.includes(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [isModalOpen, isSubmitting]);

  // Open Modal for adding a new member
  const handleOpenAddModal = () => {
    setEditingMember(null);
    setFormError(null);
    setFormData({
      name: "",
      email: "",
      role: "member",
      permissions: {
        dashboard: ["overview"],
        inbox: ["conversations"],
        leads: ["view"],
        crm: ["view"],
        automation: ["manage"],
      },
      is_active: true,
    });
    setCollapsedSections({});
    setShowPermissions(false);
    setIsModalOpen(true);
  };

  // Open Modal for editing an existing member
  const handleOpenEditModal = (member) => {
    setEditingMember(member);
    setFormError(null);
    let memberPerms = member.permissions;
    if (member.role === "admin" || !memberPerms) {
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
        "leads.all_leads": ["leads", "view"],
        "leads.lead_settings": ["leads", "view"],
        "crm.contacts": ["crm", "view"],
        "crm.deals": ["crm", "view"],
        "crm.companies": ["crm", "view"],
        "ai_agents.agents": ["ai", "chat"],
        "ai_agents.agent_settings": ["ai", "chat"],
        "flows.all_flows": ["automation", "manage"],
        "flows.flow_settings": ["automation", "manage"],
        "marketing.templates": ["templates", "manage"],
        "marketing.campaigns": ["marketing", "campaigns"],
        "analytics.reports": ["credits", "view"],
        "knowledge_base.documents": ["brain", "manage"],
        "integrations.connected_accounts": ["channels", "manage"],
        "billing.plans": ["billing", "manage"],
        "billing.invoices": ["billing", "manage"],
      };

      if (Array.isArray(memberPerms)) {
        memberPerms.forEach((p) => {
          if (legacyMap[p]) {
            const [s, i] = legacyMap[p];
            addPerm(s, i);
          } else if (p.includes(".")) {
            const [sec, item] = p.split(".");
            addPerm(sec, item);
          }
        });
      } else if (typeof memberPerms === "object") {
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
      name: member.name || member.full_name || "",
      email: member.email || "",
      role: member.role || "member",
      permissions: memberPerms,
      is_active: member.is_active !== false,
    });
    setCollapsedSections({});
    setShowPermissions(false);
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
      const allSelected = allItemIds.every((id) =>
        currentSectionItems.includes(id),
      );

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

    const emailToSubmit = (formData.email || "").trim().toLowerCase();
    if (!emailToSubmit || !emailToSubmit.includes("@")) {
      const msg = "Please enter a valid email address.";
      setFormError(msg);
      showToast(msg, "error");
      return;
    }

    // Pre-validation for new invites
    if (!editingMember) {
      const isAlreadyMember = (data?.members || []).some(
        (m) => m.email && m.email.trim().toLowerCase() === emailToSubmit,
      );
      if (isAlreadyMember) {
        const msg = `${emailToSubmit} is already a member of this workspace.`;
        setFormError(msg);
        showToast(msg, "error");
        return;
      }

      const totalSeats = data?.total_member_seats ?? 0;
      const usedSeats = data?.used_member_seats || 0;
      if (
        formData.role === "member" &&
        totalSeats !== -1 &&
        usedSeats >= totalSeats
      ) {
        const msg = `You have reached the maximum allowed member seats (${totalSeats}) for your current plan. Please upgrade your plan or invite as Admin.`;
        setFormError(msg);
        showToast(msg, "error");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (editingMember) {
        await api.updateWorkspaceMember(workspaceId, editingMember.id, {
          name: formData.name.trim() || undefined,
          role: formData.role,
          permissions:
            formData.role === "admin"
              ? getDefaultFullPermissions()
              : formData.permissions,
          is_active: formData.is_active,
        });
        showToast(
          `Updated ${formData.name || emailToSubmit} successfully.`,
          "success",
        );
      } else {
        const result = await api.inviteWorkspaceMember(workspaceId, {
          name: formData.name.trim() || undefined,
          email: emailToSubmit,
          role: formData.role,
          permissions:
            formData.role === "admin"
              ? getDefaultFullPermissions()
              : formData.permissions,
        });
        showToast(
          result?.email_sent
            ? `Invitation sent to ${emailToSubmit}!`
            : "Invitation created, but email was not delivered. Copy the invitation link or retry sending.",
          result?.email_sent ? "success" : "warning",
        );
      }
      setIsModalOpen(false);
      setFormError(null);
      fetchTeamData();
    } catch (err) {
      const msg = err?.data?.detail || err?.message || "Failed to save member";
      setFormError(msg);
      showToast(msg, "error");
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
      showToast(
        `Member ${nextStatus ? "activated" : "deactivated"} successfully.`,
        "success",
      );
      fetchTeamData();
    } catch (err) {
      console.warn("Status toggle warning:", err);
      showToast(err?.message || "Failed to update member status", "error");
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleCopyLink = async (token) => {
    if (!token) return;
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const inviteUrl = `${origin}/accept-invite?token=${token}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedToken(token);
      showToast("Invitation link copied to clipboard!", "success");
      setTimeout(() => setCopiedToken(null), 3000);
    } catch {
      showToast("Unable to copy the invitation link.", "error");
    }
  };

  const handleResend = async (invitationId) => {
    try {
      setResendingId(invitationId);
      const result = await api.resendWorkspaceInvitation(
        workspaceId,
        invitationId,
      );
      showToast(
        result?.email_sent
          ? "Invitation email resent successfully!"
          : "Link refreshed, but email was not delivered. Copy the invitation link.",
        result?.email_sent ? "success" : "warning",
      );
      fetchTeamData();
    } catch (err) {
      console.warn("Resend notice:", err);
      showToast(err?.message || "Failed to resend invitation", "error");
    } finally {
      setResendingId(null);
    }
  };

  const handleCancelInvite = async (invitationId) => {
    try {
      setCancellingId(invitationId);
      await api.cancelWorkspaceInvitation(workspaceId, invitationId);
      showToast("Invitation revoked successfully.", "success");
      fetchTeamData();
    } catch (err) {
      console.warn("Cancel invite notice:", err);
      showToast(err?.message || "Failed to revoke invitation", "error");
    } finally {
      setCancellingId(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    try {
      setIsRemoving(true);
      await api.removeWorkspaceMember(workspaceId, memberToRemove.id);
      showToast(
        `${memberToRemove.email} removed. Workspace access revoked immediately.`,
        "success",
      );
      setMemberToRemove(null);
      fetchTeamData();
    } catch (err) {
      console.warn("Remove member notice:", err);
      showToast(err?.message || "Failed to remove member", "error");
    } finally {
      setIsRemoving(false);
    }
  };

  if (!permissionsLoading && !canView)
    return (
      <p className="p-4 text-zinc-400">
        You do not have access to team details.
      </p>
    );

  if (permissionsLoading || (loading && !data)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#814ac8] mb-3" />
        <p className="text-sm font-medium">Loading team & permissions...</p>
      </div>
    );
  }

  const members = data?.members || [];
  const invitations = canManage ? data?.invitations || [] : [];
  const query = searchQuery.trim().toLowerCase();
  const matchesSearch = (person) =>
    [person.name, person.full_name, person.email, person.role].some((value) =>
      value?.toLowerCase().includes(query),
    );
  const visibleMembers = members.filter(matchesSearch);
  const visibleInvitations = invitations.filter(matchesSearch);

  return (
    <div className={poppins.className + " @container min-h-[70vh] w-full min-w-0 bg-transparent text-zinc-300"}>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">User settings</h1>
        <p className="mt-1.5 text-sm text-white/65">Manage and invite team members to your Workspace.</p>
      </div>
      <div className="mb-8 h-px w-full bg-[#814ac8]/15" />
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
        {canManage && (
          <button onClick={handleOpenAddModal} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#814ac8] px-4 text-sm font-medium text-white transition-colors hover:bg-[#925ed3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#814ac8]">
            <span className="text-base leading-none">+</span> Add User
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="relative w-48 sm:w-[270px]">
            <Search className="pointer-events-none absolute left-3 top-3 h-[18px] w-[18px] text-zinc-400" />
            <input type="search" aria-label="Search users" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-10 w-full rounded-xl border border-white/15 bg-white/5 pl-10 pr-3 text-sm outline-none placeholder:text-zinc-500 focus:border-[#814ac8]" />
          </div>
          <button onClick={fetchTeamData} disabled={loading} aria-label="Refresh users" className="p-1 text-zinc-400 hover:text-white disabled:opacity-50"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /></button>
        </div>
      </div>
      <ul className="overflow-hidden rounded-2xl border border-white/20 divide-y divide-white/20" aria-label="Workspace members">
        {visibleMembers.map((member) => {
          const displayName = member.name || member.full_name || member.email.split("@")[0];
          const isCurrent = currentUser?.email?.toLowerCase() === member.email.toLowerCase();
          const isActive = member.is_active !== false;
          const protectedMember = !canManage || member.is_owner || isCurrent;
          return (
            <li key={member.id} className="flex min-h-[84px] flex-wrap items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#814ac8]/25 text-lg text-[#d9c5f3]">{displayName.charAt(0).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium text-white [overflow-wrap:anywhere]">{displayName}</p>
                <p className="mt-1 text-[13px] text-white/65 [overflow-wrap:anywhere]"><span className="capitalize">{member.is_owner ? "Owner" : member.role || "Member"}</span> - {member.email}</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                {!isActive && <button onClick={() => handleToggleMemberStatus(member)} disabled={protectedMember || togglingStatusId === member.id} className="text-sm text-zinc-200 disabled:opacity-50">Activate</button>}
                <button onClick={() => setMemberToRemove(member)} disabled={protectedMember} className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-white/90 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-[#814ac8] disabled:cursor-not-allowed disabled:text-white/50 disabled:hover:bg-transparent"><Power className="h-4 w-4" />Revoke</button>
                <button onClick={() => handleOpenEditModal(member)} disabled={!canManage || member.is_owner} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-zinc-200 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"><Edit2 className="h-4 w-4" />Edit</button>
              </div>
            </li>
          );
        })}
        {visibleMembers.length === 0 && <li className="py-8 text-center text-sm text-zinc-500">{query ? "No users match your search." : "No users yet."}</li>}
      </ul>

      {/* ─ PENDING INVITATIONS SECTION ─ */}
      {invitations.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Pending Invitations ({invitations.length})</span>
          </h3>

          {visibleInvitations.length === 0 && (
            <p className="py-4 text-sm text-zinc-500">
              No invitations match your search.
            </p>
          )}
          {/* Mobile Pending Cards (< 640px) */}
          <div className="block sm:hidden space-y-3">
            {visibleInvitations.map((inv) => {
              const isCopied = copiedToken === inv.token;
              const isResending = resendingId === inv.id;
              const isCancelling = cancellingId === inv.id;

              return (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-white truncate">
                        {inv.name || inv.email}
                      </p>
                      {inv.name && (
                        <p className="text-xs text-zinc-400 truncate">
                          {inv.email}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#814ac8]/10 text-[#c5a7eb] border border-[#814ac8]/20 capitalize shrink-0">
                      {inv.role === "admin" ? "Admin" : "Member"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-white/5">
                    <span>
                      Expires:{" "}
                      {inv.expires_at
                        ? new Date(inv.expires_at).toLocaleDateString()
                        : "7 days"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleCopyLink(inv.token)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                      <span>{isCopied ? "Copied" : "Copy Link"}</span>
                    </button>

                    <button
                      onClick={() => handleResend(inv.id)}
                      disabled={isResending}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
                      title="Resend email"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isResending ? "animate-spin text-[#b995e7]" : ""}`}
                      />
                    </button>

                    <button
                      onClick={() => handleCancelInvite(inv.id)}
                      disabled={isCancelling}
                      className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 cursor-pointer"
                      title="Revoke invitation"
                    >
                      {isCancelling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
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
                    <th className="py-3 px-4 whitespace-nowrap">
                      Invited User
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap">
                      Role & Access
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap">Expires</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">
                      Invite Link & Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visibleInvitations.map((inv) => {
                    const isCopied = copiedToken === inv.token;
                    const isResending = resendingId === inv.id;
                    const isCancelling = cancellingId === inv.id;

                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3.5 px-4 font-medium text-white">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="truncate block">
                                {inv.name || inv.email}
                              </span>
                              {inv.name && (
                                <p className="text-xs text-zinc-400 font-normal truncate">
                                  {inv.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#814ac8]/10 text-[#c5a7eb] border border-[#814ac8]/20 capitalize">
                            {inv.role === "admin"
                              ? "Admin (Full Access)"
                              : "Member (Custom Access)"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-zinc-400 whitespace-nowrap">
                          {inv.expires_at
                            ? new Date(inv.expires_at).toLocaleDateString()
                            : "7 days"}
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
                              <RefreshCw
                                className={`w-4 h-4 ${isResending ? "animate-spin text-[#b995e7]" : ""}`}
                              />
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
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isModalOpen && (
              <div className={poppins.className + " fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/75 p-4 sm:p-6 font-normal [&_button]:[font-family:inherit] [&_input]:[font-family:inherit] [&_select]:[font-family:inherit]"}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.18 }}
                  ref={modalRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="member-modal-title"
                  aria-describedby="member-modal-description"
                  tabIndex={-1}
                  className="w-full max-w-[680px] bg-[#0b111b] text-zinc-300 border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[calc(100dvh-4rem)] overflow-hidden"
                >
                  <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/15 px-5 sm:px-6">
                    <h3 id="member-modal-title" className="text-lg font-semibold">{editingMember ? "Edit User" : "Add User"}</h3>
                    <button type="button" aria-label="Close member form" disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="rounded p-1 text-zinc-400 hover:text-white disabled:opacity-40"><X className="h-4 w-4" /></button>
                  </div>

                  {/* Form Body (Scrollable) */}
                  <form
                    id="member-form"
                    onSubmit={handleSubmitMember}
                    className="px-5 pt-5 pb-3 sm:px-6 space-y-5 flex-1 min-h-0 overflow-y-auto"
                  >
                    <p id="member-modal-description" className="text-sm leading-[1.6] text-zinc-300">{editingMember ? 'Update this user’s access level and permissions.' : 'To add a user to this workspace write their email and access level and click "Add". The Access Level defines what the user can do on the workspace.'}</p>
                    {/* Inline Error Alert Banner */}
                    {formError && (
                      <div
                        role="alert"
                        className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start gap-2.5 text-sm text-red-200"
                      >
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-red-100">
                            Cannot Complete Action
                          </p>
                          <p className="mt-0.5 text-red-300 leading-relaxed">
                            {formError}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Dismiss error"
                          onClick={() => setFormError(null)}
                          className="text-red-400 hover:text-white p-0.5 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="space-y-4">
                      {editingMember && (
                      <div>
                        <label
                          htmlFor="member-name"
                          className="mb-2 block text-sm font-medium text-zinc-300"
                        >
                          Full name{" "}
                          <span className="font-normal text-zinc-500">
                            (optional)
                          </span>
                        </label>
                        <input
                          id="member-name"
                          type="text"
                          autoComplete="name"
                          disabled={isSubmitting}
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="e.g. Alex Smith"
                          className="h-11 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-zinc-400 focus:border-[#814ac8] focus:ring-2 focus:ring-[#814ac8]/15"
                        />
                      </div>
                      )}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="member-email"
                            className="mb-2 block text-sm font-medium text-zinc-300"
                          >
                            Email address{" "}
                            <span className="text-[#c5a7eb]">*</span>
                          </label>
                          <input
                            id="member-email"
                            type="email"
                            autoComplete="email"
                            required
                            disabled={Boolean(editingMember) || isSubmitting}
                            value={formData.email}
                            onChange={(e) => {
                              setFormError(null);
                              setFormData({
                                ...formData,
                                email: e.target.value,
                              });
                            }}
                            placeholder="Email Address"
                            className="h-11 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-zinc-400 focus:border-[#814ac8] focus:ring-2 focus:ring-[#814ac8]/15 disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="member-role"
                            className="mb-2 block text-sm font-medium text-zinc-300"
                          >
                            Access Level
                          </label>
                          <div className="relative">
                            <select
                              id="member-role"
                              disabled={isSubmitting}
                              value={formData.role}
                              onChange={(e) => {
                                setFormError(null);
                                setFormData({
                                  ...formData,
                                  role: e.target.value,
                                });
                              }}
                              className="h-11 w-full appearance-none rounded-md border border-[#814ac8] bg-[#0b111b] pl-3 pr-10 text-sm text-white outline-none focus:border-[#814ac8] focus:ring-2 focus:ring-[#814ac8]/15"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-zinc-500" />
                          </div>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-zinc-400">
                        {formData.role === "admin"
                          ? "Admins can access all modules within the workspace and have full control of the settings."
                          : "Members can only access the workspace features you choose."}
                      </p>
                    </div>
                    {/* Granular Permissions (Shown for Member Role) */}
                    {formData.role === "member" && showPermissions && (
                      <div id="member-permissions" className="space-y-3 pt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm sm:text-sm font-bold text-white flex items-center gap-2">
                              <Shield className="w-4 h-4 text-[#b995e7]" />
                              <span>Workspace permissions</span>
                            </h4>
                            <p className="text-[11px] sm:text-sm text-zinc-400">
                              Choose the features this member can access.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={handleSelectAllPermissions}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-[#c5a7eb] hover:text-white transition-colors cursor-pointer"
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              onClick={handleClearAllPermissions}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>

                        {/* Permissions Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                          {PERMISSION_SECTIONS.map((section) => {
                            const IconComponent = section.icon;
                            const selectedItems =
                              formData.permissions[section.id] || [];
                            const allSelected = section.items.every((i) =>
                              selectedItems.includes(i.id),
                            );
                            const someSelected =
                              selectedItems.length > 0 && !allSelected;
                            const isCollapsed = Boolean(
                              collapsedSections[section.id],
                            );

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
                                      onClick={() =>
                                        handleToggleSectionAll(section.id)
                                      }
                                      className="text-[#b995e7] hover:text-[#c5a7eb] focus:outline-none cursor-pointer shrink-0"
                                    >
                                      {allSelected ? (
                                        <CheckSquare className="w-4 h-4 text-[#814ac8] fill-[#814ac8]/20" />
                                      ) : someSelected ? (
                                        <MinusSquare className="w-4 h-4 text-[#b995e7]" />
                                      ) : (
                                        <Square className="w-4 h-4 text-zinc-500" />
                                      )}
                                    </button>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <IconComponent className="w-4 h-4 text-zinc-400 shrink-0" />
                                      <span className="text-sm font-bold text-white truncate">
                                        {section.label}
                                      </span>
                                    </div>
                                  </label>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-xs text-zinc-400">
                                      {selectedItems.length}/
                                      {section.items.length}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleSectionCollapse(section.id)
                                      }
                                      className="p-1 text-zinc-400 hover:text-white sm:hidden cursor-pointer"
                                    >
                                      {isCollapsed ? (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                      ) : (
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Sub-menu Checkboxes */}
                                {!isCollapsed && (
                                  <div className="pl-6 space-y-2 border-l border-white/10 ml-2 pt-1">
                                    {section.items.map((item) => {
                                      const isChecked = selectedItems.includes(
                                        item.id,
                                      );
                                      return (
                                        <label
                                          key={item.id}
                                          className="flex items-start gap-2.5 text-sm text-zinc-300 hover:text-white cursor-pointer select-none py-0.5 group"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() =>
                                              handleTogglePermission(
                                                section.id,
                                                item.id,
                                              )
                                            }
                                            className="rounded border-white/20 bg-black/40 accent-[#814ac8] focus:ring-[#814ac8] cursor-pointer w-3.5 h-3.5 shrink-0 mt-0.5"
                                          />
                                          <div className="min-w-0">
                                            <span className="font-normal text-zinc-300 block truncate">
                                              {item.label}
                                            </span>
                                            {item.desc && (
                                              <span className="text-xs text-zinc-400 group-hover:text-zinc-300 block leading-tight">
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

                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6">
                    {formData.role === "member" ? (
                      <button type="button" aria-expanded={showPermissions} aria-controls="member-permissions" onClick={() => setShowPermissions(!showPermissions)} className="text-sm text-[#b48adf] hover:text-[#cbb0ec]">{showPermissions ? "Hide permissions" : "Manage permissions"}</button>
                    ) : <span />}
                    <div className="flex items-center gap-2">
                      <button type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-40">Cancel</button>
                      <button type="submit" form="member-form" disabled={isSubmitting || !formData.email.trim()} className="inline-flex min-w-[76px] items-center justify-center gap-1.5 rounded-lg bg-[#814ac8] px-4 py-2.5 text-sm text-white hover:bg-[#925ed3] disabled:cursor-not-allowed disabled:bg-[#777777] disabled:text-zinc-400">
                        {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {isSubmitting ? "Saving..." : editingMember ? "Save" : "Add"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      {/* ─ REMOVE MEMBER CONFIRMATION DIALOG (RENDERED IN PORTAL) ─ */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {memberToRemove && (
              <div className={poppins.className + " fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-md p-5 sm:p-6 rounded-2xl bg-[#0b111b] border border-white/10 shadow-2xl space-y-4"
                >
                  <div className="flex items-center gap-3 text-red-400">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white">
                        Remove Team Member?
                      </h4>
                      <p className="text-xs text-zinc-400">
                        Immediate access revocation.
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    Are you sure you want to remove{" "}
                    <strong className="text-white">
                      {memberToRemove.email}
                    </strong>{" "}
                    from this workspace? Their workspace session and permissions
                    will be revoked immediately.
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
          document.body,
        )}
    </div>
  );
}
