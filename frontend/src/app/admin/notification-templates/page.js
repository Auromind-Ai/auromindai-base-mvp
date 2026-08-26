"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Mail,
  Smartphone,
  Shield,
  CreditCard,
  Gauge,
  GitMerge,
  Users,
  Bot,
  Eye,
  X,
  Code,
  Clock,
  Calendar,
  Play,
  Check,
  ChevronRight,
  Layers,
  Globe,
  Sliders,
  Send,
  Zap,
  Sparkles,
  RotateCcw,
  Lock,
  Tag
} from "lucide-react";
import {
  getNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  toggleNotificationTemplate,
  testRenderNotificationTemplate,
  sendTestNotificationEmail,
  getSupportedNotificationTemplateKeys,
  getNotificationEventContracts,
  getNotificationRules,
  createNotificationRule,
  updateNotificationRule,
  deleteNotificationRule,
  getNotificationSchedules,
  updateNotificationSchedule,
  runNotificationScheduleNow,
  getEmailLogs,
  getEmailLogStats,
  retryEmailLog
} from "@/lib/api/admin";

const TABS = [
  { id: "templates", label: "Event Templates", icon: Mail },
  { id: "rules", label: "Event Rules & Routing", icon: GitMerge },
  { id: "schedules", label: "Notification Schedules", icon: Calendar },
  { id: "logs", label: "Delivery Logs", icon: Gauge }
];

const TIMEZONES = [
  "Asia/Kolkata", "UTC", "America/New_York", "America/Los_Angeles",
  "America/Chicago", "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"
];

const DAYS_OF_WEEK = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" }
];

const AVAILABLE_ROLES = [
  { value: "workspace_owner", label: "Workspace Owner / Founder" },
  { value: "assigned_agent", label: "Assigned Sales Agent" },
  { value: "billing_contact", label: "Billing Contact" },
  { value: "managers", label: "Managers & Admins" },
  { value: "technical_contact", label: "Technical Contact" },
  { value: "new_user", label: "New User / Recipient" }
];

const RULE_CATEGORIES = [
  {
    name: "User & Onboarding",
    events: ["user.signup", "user.verification_pending", "user.verification_reminder_24h", "plan.free_activated", "onboarding.inactivity_reminder"]
  },
  {
    name: "Payments & AI Credits",
    events: ["payment.succeeded", "ai_credits.purchased", "credits.purchased", "ai_credits.low_20", "ai_credits.low_10", "ai_credits.exhausted", "payment.failed", "payment.failed_reminder_24h", "payment.failed_reminder_72h", "subscription.expiring_7d", "subscription.expiring_3d"]
  },
  {
    name: "WhatsApp Wallet & WCC",
    events: ["wcc_wallet.recharged", "wcc_wallet.low_20", "wcc_wallet.low_10", "wcc_wallet.exhausted"]
  },
  {
    name: "Flow Executions & Automations",
    events: ["flow_pack.purchased", "flow_executions.low_20", "flow_executions.low_10", "flow_executions.exhausted", "broadcast.completed", "workflow.failed"]
  },
  {
    name: "Lead Management",
    events: ["lead.created", "lead.assigned", "lead.sla_breached", "lead.message_received", "lead.high_intent", "lead.converted", "lead.inactive_reminder", "contact.inquiry_received", "contact.inquiry_sales_alert",]
  },
  {
    name: "Automated Reports",
    events: ["report.daily_summary", "report.weekly_performance"]
  },
  {
    name: "Security & Authentication",
    events: ["security.new_device_login", "security.2fa_enabled", "security.2fa_disabled", "auth.otp_code"]
  }
];

const TEMPLATE_CATEGORIES = [
  "All", "User & Onboarding", "Payments & Credits", "Lead Management",
  "Broadcast & Workflow", "Reports", "Security"
];

export const buildActionUrl = (actionRoute, origin = "http://localhost:3000") => {
  if (!actionRoute) return `${origin}/user/admin/dashboard`;
  const trimmed = String(actionRoute).trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const route = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const publicPrefixes = ["/login", "/signup", "/verify-otp", "/reset-password", "/pricing"];
  for (const pub of publicPrefixes) {
    if (route === pub || route.startsWith(`${pub}?`) || route.startsWith(`${pub}/`)) {
      return `${origin}${route}`;
    }
  }
  if (route.startsWith("/user/admin")) return `${origin}${route}`;
  return `${origin}/user/admin${route}`;
};

export default function NotificationManagerPage() {
  const [activeTab, setActiveTab] = useState("templates");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState(null);

  // Schedules State
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [editScheduleModal, setEditScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    time_of_day: "08:00",
    day_of_week: "monday",
    default_timezone: "Asia/Kolkata",
    is_active: true,
    interval_minutes: 1
  });
  const [runNowModal, setRunNowModal] = useState(false);
  const [runNowDryRun, setRunNowDryRun] = useState(false);
  const [runningSchedule, setRunningSchedule] = useState(false);
  const [runNowResult, setRunNowResult] = useState(null);

  // Rules State
  const [rules, setRules] = useState([]);
  const [rulesSearch, setRulesSearch] = useState("");
  const [selectedRule, setSelectedRule] = useState(null);
  const [editRuleModal, setEditRuleModal] = useState(false);
  const [deleteRuleModal, setDeleteRuleModal] = useState(false);
  const [deletingRule, setDeletingRule] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    event_name: "",
    template_key: "",
    recipient_roles: [],
    channels: ["email"],
    conditions: {},
    delay_minutes: 0,
    dedup_window_seconds: 86400,
    is_active: true
  });

  // Templates State
  const [templates, setTemplates] = useState([]);
  const [templatesSearch, setTemplatesSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editTemplateModal, setEditTemplateModal] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "User & Onboarding",
    title: "",
    subject: "",
    message: "",
    channel: "both",
    is_active: true
  });

  // Event Contracts State
  const [eventContracts, setEventContracts] = useState({});

  // Preview & Test Render State
  const [testRenderModal, setTestRenderModal] = useState(false);
  const [testRenderVariables, setTestRenderVariables] = useState({});
  const [testRenderResult, setTestRenderResult] = useState(null);
  const [renderingTest, setRenderingTest] = useState(false);
  const [previewViewMode, setPreviewViewMode] = useState("html");
  const [testRecipientEmail, setTestRecipientEmail] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Logs State
  const [logs, setLogs] = useState([]);
  const [logStats, setLogStats] = useState(null);
  const [logsSearch, setLogsSearch] = useState("");
  const [logsStatusFilter, setLogsStatusFilter] = useState("ALL");
  const [viewLogModal, setViewLogModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [retryingLogId, setRetryingLogId] = useState(null);

  const showBanner = (type, message) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 6000);
  };

  const getContractForTemplate = (templateKey) => {
    return eventContracts[templateKey] || null;
  };

  const getSystemVariablesForContract = (contract) => {
    if (contract?.system_variables && Array.isArray(contract.system_variables) && contract.system_variables.length > 0) {
      return contract.system_variables;
    }
    const firstWithSys = Object.values(eventContracts).find(c => c?.system_variables?.length > 0);
    if (firstWithSys?.system_variables) {
      return firstWithSys.system_variables;
    }
    return [];
  };

  const getSampleVariablesForTemplate = (templateKey) => {
    const contract = eventContracts[templateKey];
    const sysCtx = contract?.system_context || {};
    const eventSamples = contract?.sample_payload || {};
    return {
      ...sysCtx,
      ...eventSamples
    };
  };

  const extractUsedPlaceholders = (text) => {
    if (!text) return [];
    const matches = text.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.replace(/[\{\}\s]/g, "")))];
  };

  const getInvalidPlaceholders = (templateKey, title, subject, message) => {
    const contract = eventContracts[templateKey];
    const eventAllowed = new Set((contract?.variables || []).map(v => v.key));
    if (contract?.sample_payload) {
      Object.keys(contract.sample_payload).forEach(k => eventAllowed.add(k));
    }
   
    // System variables strictly from DB contract
    const sysVars = getSystemVariablesForContract(contract);
    const systemKeys = new Set(sysVars.map(v => v.key));
   
    // ALLOWED PLACEHOLDERS = EVENT PAYLOAD KEYS ∪ DB SYSTEM VARIABLE KEYS
    const allowed = new Set([
      ...eventAllowed,
      ...systemKeys
    ]);

    const used = new Set([
      ...extractUsedPlaceholders(title),
      ...extractUsedPlaceholders(subject),
      ...extractUsedPlaceholders(message)
    ]);
    return [...used].filter(k => !allowed.has(k));
  };

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [schedRes, rulesRes, tplRes, logsRes, statsRes, contractsRes] = await Promise.allSettled([
        getNotificationSchedules(),
        getNotificationRules(),
        getNotificationTemplates(),
        getEmailLogs({ limit: 50 }),
        getEmailLogStats(),
        getNotificationEventContracts()
      ]);

      if (schedRes.status === "fulfilled") setSchedules(schedRes.value || []);
      if (rulesRes.status === "fulfilled") setRules(rulesRes.value || []);
      if (tplRes.status === "fulfilled") setTemplates(tplRes.value || []);
      if (logsRes.status === "fulfilled") setLogs(logsRes.value?.items || logsRes.value || []);
      if (statsRes.status === "fulfilled") setLogStats(statsRes.value || null);
      if (contractsRes.status === "fulfilled" && Array.isArray(contractsRes.value)) {
        const contractMap = {};
        contractsRes.value.forEach(c => {
          contractMap[c.template_key] = c;
        });
        setEventContracts(contractMap);
      }
    } catch (err) {
      console.error("Failed to load notification manager data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      if (isMounted) {
        await fetchData();
      }
    };
    initData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleQuickChannelChange = async (tpl, newChannel) => {
    try {
      await updateNotificationTemplate(tpl.id, { ...tpl, channel: newChannel });
      setTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, channel: newChannel } : t));
      showBanner("success", `Channel updated to '${newChannel}' for ${tpl.name}`);
    } catch (err) {
      showBanner("error", "Channel modification is not permitted for this event.");
    } 
  };

  const handleOpenEditSchedule = (sched) => {
    setSelectedSchedule(sched);
    setScheduleForm({
      time_of_day: sched.time_of_day || "08:00",
      day_of_week: sched.day_of_week || "monday",
      default_timezone: sched.default_timezone || "Asia/Kolkata",
      is_active: sched.is_active !== false,
      interval_minutes: sched.interval_minutes || 1
    });
    setEditScheduleModal(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    try {
      await updateNotificationSchedule(selectedSchedule.id, scheduleForm);
      showBanner("success", `Schedule '${selectedSchedule.display_name}' updated successfully.`);
      setEditScheduleModal(false);
      fetchData(true);
    } catch (err) {
      showBanner("error", err.message || "Failed to update schedule.");
    }
  };

  const handleToggleScheduleActive = async (sched) => {
    try {
      await updateNotificationSchedule(sched.id, { is_active: !sched.is_active });
      showBanner("success", `Schedule '${sched.display_name}' is now ${!sched.is_active ? "Active" : "Paused"}.`);
      fetchData(true);
    } catch (err) {
      showBanner("error", "Failed to update schedule status.");
    }
  };

  const handleOpenRunNow = (sched) => {
    setSelectedSchedule(sched);
    setRunNowDryRun(false);
    setRunNowResult(null);
    setRunNowModal(true);
  };

  const handleExecuteRunNow = async () => {
    if (!selectedSchedule) return;
    setRunningSchedule(true);
    try {
      const res = await runNotificationScheduleNow(selectedSchedule.id, { dry_run: runNowDryRun });
      setRunNowResult(res);
      showBanner("success", res.message || "Manual run triggered.");
      fetchData(true);
    } catch (err) {
      showBanner("error", err.message || "Failed to trigger schedule run.");
    } finally {
      setRunningSchedule(false);
    }
  };

  const handleOpenEditRule = (rule) => {
    setSelectedRule(rule);
    setRuleForm({
      event_name: rule.event_name,
      template_key: rule.template_key,
      recipient_roles: rule.recipient_roles || [],
      channels: rule.channels || ["email"],
      conditions: rule.conditions || {},
      delay_minutes: rule.delay_minutes || 0,
      dedup_window_seconds: rule.dedup_window_seconds || 86400,
      is_active: rule.is_active !== false
    });
    setEditRuleModal(true);
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!selectedRule) return;

    try {
      await updateNotificationRule(selectedRule.id, ruleForm);
      showBanner("success", `Rule '${selectedRule.event_name}' updated successfully.`);
      setEditRuleModal(false);
      fetchData(true);
    } catch (err) {
      showBanner("error", err.message || "Failed to update rule.");
    }
  };

  const handleToggleRuleActive = async (rule) => {
    try {
      await updateNotificationRule(rule.id, { is_active: !rule.is_active });
      showBanner("success", `Rule '${rule.event_name}' is now ${!rule.is_active ? "Active" : "Disabled"}.`);
      fetchData(true);
    } catch (err) {
      showBanner("error", "Failed to update rule status.");
    }
  };

  const handleDeleteRule = async () => {
    if (!selectedRule) return;
    setDeletingRule(true);
    try {
      await deleteNotificationRule(selectedRule.id);
      showBanner("success", `Rule for '${selectedRule.event_name}' deleted.`);
      setDeleteRuleModal(false);
      fetchData(true);
    } catch (err) {
      showBanner("error", err.message || "Failed to delete rule.");
    } finally {
      setDeletingRule(false);
    }
  };

  const renderTemplatePreview = async (templateKey, subject, message, title, variables, actionRoute, actionLabel) => {
    setRenderingTest(true);
    try {
      const res = await testRenderNotificationTemplate({
        template_key: templateKey,
        subject,
        message,
        title,
        action_route: actionRoute,
        action_label: actionLabel,
        variables
      });
      setTestRenderResult(res);
    } catch (err) {
      console.error("Test render failed:", err);
    } finally {
      setRenderingTest(false);
    }
  };

  const handleOpenEditTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    const contract = getContractForTemplate(tpl.template_key);
    const defRoute = contract?.action_route || (
      tpl.template_key?.includes("sales_alert") ? "/admin/inquiries" :
      tpl.template_key?.includes("inquiry") ? "/pricing" :
      tpl.template_key?.includes("verification") ? "/verify-otp" :
      tpl.template_key?.includes("payment") ? "/billing" :
      "/dashboard"
    );
    const defLabel = contract?.action_label || (
      tpl.template_key?.includes("sales_alert") ? "View Inquiries" :
      tpl.template_key?.includes("inquiry") ? "View Pricing" :
      tpl.template_key?.includes("verification") ? "Verify Email" :
      tpl.template_key?.includes("payment") ? "View Invoices" :
      "Open Dashboard"
    );
    setTemplateForm({
      name: tpl.name || "",
      category: tpl.category || "User & Onboarding",
      title: tpl.title || "",
      subject: tpl.subject || "",
      message: tpl.message || "",
      channel: tpl.channel || "both",
      is_active: tpl.is_active !== false,
      action_route: defRoute,
      action_label: defLabel
    });
    const sampleVars = getSampleVariablesForTemplate(tpl.template_key);
    setTestRenderVariables(sampleVars);
    setEditTemplateModal(true);
    renderTemplatePreview(tpl.template_key, tpl.subject, tpl.message, tpl.title, sampleVars, defRoute, defLabel);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    const invalidVars = getInvalidPlaceholders(selectedTemplate.template_key, templateForm.title, templateForm.subject, templateForm.message);
    if (invalidVars.length > 0) {
      showBanner("error", `Cannot save: Unknown placeholder(s) ${invalidVars.map(v => `{{${v}}}`).join(", ")} are not supported by the '${selectedTemplate.template_key}' event payload contract.`);
      return;
    }

    setSavingTemplate(true);
    try {
      await updateNotificationTemplate(selectedTemplate.id, templateForm);
      showBanner("success", `Template '${templateForm.name}' updated successfully.`);
      setEditTemplateModal(false);
      fetchData(true);
    } catch (err) {
      showBanner("error", err.response?.data?.detail || err.message || "Failed to update template.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleToggleTemplateActive = async (tpl) => {
    try {
      await toggleNotificationTemplate(tpl.id);
      showBanner("success", `Template '${tpl.name}' is now ${!tpl.is_active ? "Active" : "Disabled"}.`);
      fetchData(true);
    } catch (err) {
      showBanner("error", "Failed to toggle template status.");
    }
  };

  const handleOpenPreviewModal = async (tpl) => {
    setSelectedTemplate(tpl);
    const sampleVars = getSampleVariablesForTemplate(tpl.template_key);
    setTestRenderVariables(sampleVars);
    setTestRenderModal(true);
    renderTemplatePreview(tpl.template_key, tpl.subject, tpl.message, tpl.title, sampleVars);
  };

  const handleReRenderCurrentPreview = () => {
    if (editTemplateModal && selectedTemplate) {
      renderTemplatePreview(
        selectedTemplate.template_key,
        templateForm.subject,
        templateForm.message,
        templateForm.title,
        testRenderVariables
      );
    } else if (selectedTemplate) {
      renderTemplatePreview(
        selectedTemplate.template_key,
        selectedTemplate.subject,
        selectedTemplate.message,
        selectedTemplate.title,
        testRenderVariables
      );
    }
  };

  const handleInsertVariable = (varName) => {
    const tag = `{{${varName}}}`;
    setTemplateForm(prev => ({
      ...prev,
      message: prev.message ? `${prev.message} ${tag}` : tag
    }));
  };

  useEffect(() => {
    if (!editTemplateModal || !selectedTemplate) return;
    const timer = setTimeout(() => {
      renderTemplatePreview(
        selectedTemplate.template_key,
        templateForm.subject,
        templateForm.message,
        templateForm.title,
        testRenderVariables,
        templateForm.action_route,
        templateForm.action_label
      );
    }, 450);
    return () => clearTimeout(timer);
  }, [templateForm.subject, templateForm.message, templateForm.title, templateForm.action_route, templateForm.action_label, editTemplateModal, selectedTemplate, testRenderVariables]);

  const handleSendTestEmail = async () => {
    const recipient = testRecipientEmail.trim();
    if (!recipient || !recipient.includes("@")) {
      showBanner("error", "Please enter a valid recipient email address.");
      return;
    }

    if (!selectedTemplate) return;

    setSendingTestEmail(true);
    try {
      const res = await sendTestNotificationEmail({
        recipient_email: recipient,
        template_key: selectedTemplate.template_key,
        subject: editTemplateModal ? templateForm.subject : selectedTemplate.subject,
        message: editTemplateModal ? templateForm.message : selectedTemplate.message,
        title: editTemplateModal ? templateForm.title : selectedTemplate.title,
        action_route: editTemplateModal ? templateForm.action_route : undefined,
        action_label: editTemplateModal ? templateForm.action_label : undefined,
        variables: testRenderVariables
      });

      if (res.status === "SENT" || res.status === "SIMULATED") {
        showBanner("success", `✅ ${res.message || `Test email delivered to ${recipient}`}`);
      } else {
        showBanner("error", `❌ ${res.message || "Test email delivery failed."}`);
      }
      fetchData(true);
    } catch (err) {
      showBanner("error", err.message || "Failed to send test email.");
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleRetryLog = async (logId) => {
    setRetryingLogId(logId);
    try {
      await retryEmailLog(logId);
      showBanner("success", "Email scheduled for immediate re-delivery.");
      fetchData(true);
    } catch (err) {
      showBanner("error", err.message || "Failed to retry email delivery.");
    } finally {
      setRetryingLogId(null);
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesSearch = !templatesSearch.trim() ||
        tpl.name?.toLowerCase().includes(templatesSearch.toLowerCase()) ||
        tpl.template_key?.toLowerCase().includes(templatesSearch.toLowerCase()) ||
        tpl.subject?.toLowerCase().includes(templatesSearch.toLowerCase());
      const matchesCategory = selectedCategory === "All" || tpl.category?.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [templates, templatesSearch, selectedCategory]);

  const filteredRules = useMemo(() => {
    if (!rulesSearch.trim()) return rules;
    const q = rulesSearch.toLowerCase();
    return rules.filter(r =>
      r.event_name?.toLowerCase().includes(q) ||
      r.template_key?.toLowerCase().includes(q)
    );
  }, [rules, rulesSearch]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchStatus = logsStatusFilter === "ALL" || log.status === logsStatusFilter;
      const matchSearch = !logsSearch.trim() ||
        log.recipient_email?.toLowerCase().includes(logsSearch.toLowerCase()) ||
        log.subject?.toLowerCase().includes(logsSearch.toLowerCase()) ||
        log.event_name?.toLowerCase().includes(logsSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [logs, logsStatusFilter, logsSearch]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "Never / Pending";
    try {
      return new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const getCategoryIcon = (cat) => {
    switch (cat?.toLowerCase()) {
      case "security": return <Shield className="w-4 h-4 text-emerald-400" />;
      case "payments & credits":
      case "billing": return <CreditCard className="w-4 h-4 text-purple-400" />;
      case "lead management":
      case "crm": return <Users className="w-4 h-4 text-pink-400" />;
      case "broadcast & workflow":
      case "workflow": return <GitMerge className="w-4 h-4 text-blue-400" />;
      case "reports": return <Gauge className="w-4 h-4 text-amber-400" />;
      default: return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white font-sans flex flex-col overflow-hidden">
      {/* ================= FIXED TOP HEADER ================= */}
      <div className="px-6 py-5 border-b border-white/10 shrink-0 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">Notifications & Schedules</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Event-Driven Scope
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">
                Event-driven templates, rules, schedules, and delivery logs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium transition-all text-gray-300 hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Banner Toast */}
        {banner && (
          <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
            banner.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}>
            <div className="flex items-center gap-2.5 text-xs font-medium">
              {banner.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{banner.message}</span>
            </div>
            <button onClick={() => setBanner(null)} className="text-gray-400 hover:text-white p-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === "templates" ? templates.length :
                          tab.id === "rules" ? rules.length :
                          tab.id === "schedules" ? schedules.length : (logStats?.total ?? logs.length);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  isActive ? "bg-white/20 text-white" : "bg-white/5 text-gray-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= SCROLLABLE CONTENT BODY ================= */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* ========================================================================= */}
      {/* TAB 1: EMAIL TEMPLATES                                                    */}
      {/* ========================================================================= */}
      {activeTab === "templates" && (
        <div className="space-y-5">
          {/* Filter & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/[0.02] border border-white/10 p-3.5 rounded-2xl">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search templates by name, key, or subject..."
                value={templatesSearch}
                onChange={(e) => setTemplatesSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
              {TEMPLATE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-full py-16 text-center text-gray-500 bg-white/[0.02] border border-white/10 rounded-2xl">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                <p className="text-xs">Loading email templates...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="col-span-full py-16 text-center text-gray-500 bg-white/[0.02] border border-white/10 rounded-2xl space-y-3">
                <Mail className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-sm">No notification templates found.</p>
              </div>
            ) : (
              filteredTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`bg-white/[0.02] border rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-lg space-y-4 ${
                    tpl.is_active ? "border-white/10" : "border-white/5 opacity-60 bg-black/40"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(tpl.category)}
                          <h3 className="font-semibold text-sm sm:text-base text-white">{tpl.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {tpl.template_key}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tpl.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-gray-800 text-gray-400"
                          }`}>
                            {tpl.is_active ? "Active" : "Disabled"}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-gray-300 shrink-0">
                        {tpl.category}
                      </span>
                    </div>

                    {/* Subject Line Only — message body preview removed */}
                    <div className="text-xs text-gray-400 pt-1">
                      <strong className="text-gray-300">Subject:</strong> {tpl.subject || tpl.title || "(No Subject)"}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 text-xs">
                    {/* Interactive Channel Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500 text-[11px]">Channel:</span>
                      <select
                        value={tpl.channel || "both"}
                        onChange={(e) => handleQuickChannelChange(tpl, e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="both" className="bg-[#0f0f15]">Both (Email & In-App)</option>
                        <option value="email" className="bg-[#0f0f15]">Email Only</option>
                        <option value="in_app" className="bg-[#0f0f15]">In-App Only</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenPreviewModal(tpl)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-lg font-medium transition-all text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditTemplate(tpl)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded-lg font-semibold transition-all text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleToggleTemplateActive(tpl)}
                        className={`px-2.5 py-1.5 rounded-lg border font-medium transition-all text-xs ${
                          tpl.is_active
                            ? "bg-white/5 hover:bg-white/10 border-white/10 text-gray-400 hover:text-white"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        }`}
                      >
                        {tpl.is_active ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EVENT RULES & RECIPIENT ROUTING                                    */}
      {/* ========================================================================= */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          <div className="flex items-center bg-white/[0.02] border border-white/10 p-3.5 rounded-2xl max-w-md">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search event triggers or template keys..."
              value={rulesSearch}
              onChange={(e) => setRulesSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          <div className="space-y-5">
            {RULE_CATEGORIES.map((cat) => {
              const catRules = filteredRules.filter(r => cat.events.includes(r.event_name));
              if (catRules.length === 0) return null;

              return (
                <div key={cat.name} className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>{cat.name}</span>
                    <span className="text-gray-500 font-mono">({catRules.length})</span>
                  </h4>

                  <div className="grid grid-cols-1 gap-3">
                    {catRules.map((rule) => (
                      <div
                        key={rule.id}
                        className={`bg-white/[0.02] border rounded-xl p-4 transition-all shadow-md ${
                          rule.is_active ? "border-white/10 hover:border-indigo-500/30" : "border-white/5 opacity-60 bg-black/40"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="font-mono text-sm font-semibold text-white">{rule.event_name}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                              <span className="px-2 py-0.5 rounded text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                                Template: {rule.template_key}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                rule.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-gray-800 text-gray-400"
                              }`}>
                                {rule.is_active ? "Active" : "Disabled"}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-gray-500">Recipients:</span>
                              {rule.recipient_roles?.length > 0 ? (
                                rule.recipient_roles.map((r) => (
                                  <span key={r} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 font-medium">
                                    {r.replace("_", " ")}
                                  </span>
                                ))
                              ) : (
                                <span className="text-amber-400 italic">None assigned</span>
                              )}
                              <span className="text-gray-600">|</span>
                              <span className="text-gray-500">Delay:</span>
                              <span className="text-gray-300 font-mono">{rule.delay_minutes > 0 ? `${rule.delay_minutes}m` : "0m (Immediate)"}</span>
                              <span className="text-gray-600">|</span>
                              <span className="text-gray-500">Dedup:</span>
                              <span className="text-gray-300 font-mono">{rule.dedup_window_seconds ? `${Math.round(rule.dedup_window_seconds / 3600)}h` : "24h"}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                            <button
                              onClick={() => handleToggleRuleActive(rule)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                rule.is_active ? "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              }`}
                            >
                              {rule.is_active ? "Disable" : "Enable"}
                            </button>
                            <button
                              onClick={() => handleOpenEditRule(rule)}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Configure</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRule(rule);
                                setDeleteRuleModal(true);
                              }}
                              className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BUSINESS SCHEDULES                                                 */}
      {/* ========================================================================= */}
      {activeTab === "schedules" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {schedules.map((sched) => (
              <div
                key={sched.id}
                className={`bg-white/[0.02] border rounded-2xl p-5 transition-all shadow-lg ${
                  sched.is_active ? "border-white/10 hover:border-indigo-500/30" : "border-white/5 opacity-60 bg-black/40"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h4 className="text-sm font-semibold text-white">{sched.display_name}</h4>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/5 text-gray-300 border border-white/10">
                          {sched.event_name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          sched.is_active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {sched.is_active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{sched.description}</p>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
                          {sched.schedule_type === "daily" && `Daily at ${sched.time_of_day}`}
                          {sched.schedule_type === "weekly" && `Every ${sched.day_of_week?.toUpperCase()} at ${sched.time_of_day}`}
                          {sched.schedule_type === "interval_minutes" && `Every ${sched.interval_minutes} Minute(s)`}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 font-mono">
                          {sched.default_timezone}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300">
                          Next: <strong className="text-indigo-300">{formatDateTime(sched.next_run_at)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                    <button
                      onClick={() => handleToggleScheduleActive(sched)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        sched.is_active ? "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      }`}
                    >
                      {sched.is_active ? "Pause" : "Enable"}
                    </button>
                    <button
                      onClick={() => handleOpenRunNow(sched)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-medium transition-all"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Run Now</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditSchedule(sched)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Timing</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DELIVERY LOGS & DELIVERABILITY HEALTH                              */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <div className="space-y-5">
          {/* KPI Health Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Emails</p>
              <h3 className="text-xl font-bold text-white mt-1">{logStats?.total?.toLocaleString() ?? logs.length}</h3>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Delivered (Sent)</p>
              <h3 className="text-xl font-bold text-emerald-400 mt-1">{logStats?.sent?.toLocaleString() ?? 0}</h3>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Pending Outbox</p>
              <h3 className="text-xl font-bold text-amber-400 mt-1">{logStats?.pending?.toLocaleString() ?? 0}</h3>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
              <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Failed Emails</p>
              <h3 className="text-xl font-bold text-rose-400 mt-1">{logStats?.failed?.toLocaleString() ?? 0}</h3>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 col-span-2 md:col-span-1">
              <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Deliverability Rate</p>
              <h3 className="text-xl font-bold text-indigo-400 mt-1">{logStats?.deliverability_rate ?? "100%"}</h3>
            </div>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white/[0.02] border border-white/10 p-3.5 rounded-2xl">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search recipient, event, or subject..."
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
              {["ALL", "SENT", "SIMULATED", "PENDING", "FAILED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setLogsStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    logsStatusFilter === st
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="px-5 py-3">Recipient</th>
                    <th className="px-5 py-3">Event Trigger</th>
                    <th className="px-5 py-3">Subject Line</th>
                    <th className="px-5 py-3">Status & Details</th>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300 text-xs">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                        No delivery logs matching the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 font-medium text-white">{log.recipient_email}</td>
                        <td className="px-5 py-3 font-mono text-[11px] text-indigo-400">{log.event_name || log.event_key}</td>
                        <td className="px-5 py-3 max-w-xs truncate text-gray-300">{log.subject}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            log.status === "SENT" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            log.status === "SIMULATED" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                            log.status === "FAILED" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                            "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[11px] font-mono text-gray-400">
                          {formatDateTime(log.sent_at || log.created_at)}
                        </td>
                        <td className="px-5 py-3 text-right whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setViewLogModal(true);
                            }}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs transition-all"
                          >
                            View HTML
                          </button>
                          {log.status === "FAILED" && (
                            <button
                              onClick={() => handleRetryLog(log.id)}
                              disabled={retryingLogId === log.id}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <RotateCcw className={`w-3 h-3 ${retryingLogId === log.id ? "animate-spin" : ""}`} />
                              <span>{retryingLogId === log.id ? "Retrying..." : "Retry"}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      </div>
      {/* ================= END SCROLLABLE CONTENT BODY ================= */}

      {/* ========================================================================= */}
      {/* MODALS SECTION                                                            */}
      {/* ========================================================================= */}

      {/* MODAL: EDIT NOTIFICATION TEMPLATE + LIVE PREVIEW + SEND TEST EMAIL        */}
      {editTemplateModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0c0c12] border border-white/10 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Edit Template: {templateForm.name}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {selectedTemplate.template_key}
                  </span>
                </h3>
              </div>
              <button onClick={() => setEditTemplateModal(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
              {/* Left Column: Form & Placeholders */}
              <div className="lg:col-span-6 border-r border-white/10 p-4 space-y-3 overflow-y-auto">
                <form id="templateEditForm" onSubmit={handleSaveTemplate} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Display Name</label>
                      <input
                        type="text"
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Category</label>
                      <select
                        value={templateForm.category}
                        onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                      >
                        {TEMPLATE_CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c} className="bg-[#0f0f15]">{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Email Heading (Card Title)</label>
                      <input
                        type="text"
                        value={templateForm.title || ""}
                        onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                        onBlur={handleReRenderCurrentPreview}
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. AI Credits Added Successfully"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Email Subject</label>
                      <input
                        type="text"
                        value={templateForm.subject}
                        onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                        onBlur={handleReRenderCurrentPreview}
                        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. Credit Recharge Confirmed: {{credits_added}} Credits Added"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-gray-300 font-semibold">Message Content</label>
                      <span className="text-[10px] text-indigo-400 font-mono flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Event Contract Driven
                      </span>
                    </div>

                    {/* DYNAMIC CONTRACT VARIABLE PILLS & SYSTEM CONTEXT PILLS */}
                    {(() => {
                      const contract = getContractForTemplate(selectedTemplate?.template_key);
                      const invalidPlaceholders = getInvalidPlaceholders(
                        selectedTemplate?.template_key,
                        templateForm.title,
                        templateForm.subject,
                        templateForm.message
                      );

                      return (
                        <div className="space-y-2 mb-2">
                          {/* 1. Event-Specific Payload Variables */}
                          <div className="p-2.5 bg-indigo-950/20 border border-indigo-500/20 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-indigo-300 font-semibold flex items-center gap-1.5">
                                <Tag className="w-3 h-3 text-indigo-400" />
                                {contract?.event_name ? `Event Payload (${contract.event_name})` : "Event Payload Variables"}
                              </span>
                              <span className="text-[10px] text-gray-400">Click to insert</span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {contract && contract.variables && contract.variables.length > 0 ? (
                                contract.variables.map(v => (
                                  <button
                                    key={v.key}
                                    type="button"
                                    onClick={() => handleInsertVariable(v.key)}
                                    className="group px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-200 hover:text-white text-[11px] font-mono transition-all flex items-center gap-1.5 shadow-sm"
                                    title={`${v.description || v.key} (Sample: ${v.sample})`}
                                  >
                                    <span className="font-semibold">{`{{${v.key}}}`}</span>
                                    {v.sample !== undefined && (
                                      <span className="text-[9px] text-indigo-300/60 font-sans px-1 py-0.2 rounded bg-black/40 group-hover:text-indigo-200">
                                        {String(v.sample).slice(0, 15)}
                                      </span>
                                    )}
                                    <span className="text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform">+</span>
                                  </button>
                                ))
                              ) : (
                                <div className="text-[11px] text-indigo-300/50 italic py-0.5">
                                  No event-specific payload fields recorded yet. Emit runtime events to auto-discover variables.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 2. Platform System Context Variables */}
                          <div className="p-2.5 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                                <Globe className="w-3 h-3 text-cyan-400" />
                                System Variables (Global Platform Context)
                              </span>
                              <span className="text-[10px] text-gray-400">Available across all templates</span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {getSystemVariablesForContract(contract).length > 0 ? (
                                getSystemVariablesForContract(contract).map(v => (
                                  <button
                                    key={v.key}
                                    type="button"
                                    onClick={() => handleInsertVariable(v.key)}
                                    className="group px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200 hover:text-white text-[11px] font-mono transition-all flex items-center gap-1.5 shadow-sm"
                                    title={`${v.description || v.key} (Sample: ${v.sample})`}
                                  >
                                    <span className="font-semibold">{`{{${v.key}}}`}</span>
                                    {v.sample !== undefined && v.sample !== "" && (
                                      <span className="text-[9px] text-cyan-300/60 font-sans px-1 py-0.2 rounded bg-black/40 group-hover:text-cyan-200">
                                        {String(v.sample).slice(0, 15)}
                                      </span>
                                    )}
                                    <span className="text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">+</span>
                                  </button>
                                ))
                              ) : (
                                <div className="text-[11px] text-cyan-300/50 italic py-0.5">
                                  No system variables configured.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Real-time Placeholder Lint Warning Banner */}
                          {invalidPlaceholders.length > 0 && (
                            <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-[11px] flex items-start gap-2 animate-pulse">
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold block text-rose-200">Invalid Placeholder Detected:</span>
                                <span>
                                  {invalidPlaceholders.map(k => `{{${k}}}`).join(", ")} is neither an event payload variable nor a system variable. Unknown placeholders will be rejected on save.
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <textarea
                      rows={6}
                      value={templateForm.message}
                      onChange={(e) => setTemplateForm({ ...templateForm, message: e.target.value })}
                      className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none font-mono text-xs leading-relaxed"
                      required
                    />
                  </div>
                </form>

                {/* Send Test Email Section */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <label className="block text-xs font-bold text-gray-200 uppercase">Send Live Test Email</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder="recipient@example.com"
                      value={testRecipientEmail}
                      onChange={(e) => setTestRecipientEmail(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={sendingTestEmail}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all whitespace-nowrap"
                    >
                      <Send className="w-3 h-3" />
                      <span>{sendingTestEmail ? "Sending..." : "Send Test"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Rendered Preview */}
              <div className="lg:col-span-6 p-4 space-y-3 overflow-y-auto flex flex-col bg-white/[0.01]">
                {/* CTA Action Route & Destination Info Card (Editable) */}
                <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-200 font-semibold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-400" />
                      Email Call-To-Action (CTA) Button & Destination
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded font-semibold">
                      Editable Deep-Link
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] text-gray-400 font-semibold mb-1">Button Label (CTA Text)</label>
                      <input
                        type="text"
                        placeholder="e.g. Verify Email →"
                        value={templateForm.action_label || ""}
                        onChange={(e) => setTemplateForm({ ...templateForm, action_label: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-lg text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="sm:col-span-7">
                      <label className="block text-[11px] text-gray-400 font-semibold mb-1">Button Destination Route</label>
                      <input
                        type="text"
                        placeholder="e.g. /verify-otp or /dashboard"
                        value={templateForm.action_route || ""}
                        onChange={(e) => setTemplateForm({ ...templateForm, action_route: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-black/50 border border-white/10 rounded-lg text-emerald-300 font-mono text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">Resolved URL:</span>
                    <code className="text-[11px] font-mono text-cyan-300 bg-black/60 px-2 py-0.5 rounded border border-white/10 flex-1 truncate select-all">
                      {testRenderResult?.action_url || (typeof window !== "undefined" ? buildActionUrl(templateForm.action_route || selectedTemplate?.action_route || "/dashboard", window.location.origin) : "http://localhost:3000/dashboard")}
                    </code>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Rendered Subject</span>
                    <div className="text-xs font-semibold text-white">
                      {testRenderResult?.rendered_subject || templateForm.subject || "No subject specified"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setPreviewViewMode("html")}
                      className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                        previewViewMode === "html" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewMode("text")}
                      className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                        previewViewMode === "text" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Text
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-[260px] bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-inner flex flex-col">
                  {renderingTest ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span className="text-xs">Rendering preview...</span>
                    </div>
                  ) : previewViewMode === "html" ? (
                    testRenderResult?.rendered_html ? (
                      <div className="flex-1 p-4 bg-white text-slate-900 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: testRenderResult.rendered_html }} />
                      </div>
                    ) : (
                      <div className="flex-1 p-4 bg-white text-slate-900 overflow-y-auto">
                        <h4 className="font-bold text-sm border-b pb-2 mb-2">{testRenderResult?.rendered_title || templateForm.title || "Notification"}</h4>
                        <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{testRenderResult?.rendered_message || templateForm.message}</div>
                      </div>
                    )
                  ) : (
                    <div className="flex-1 p-4 text-gray-200 overflow-y-auto font-mono text-xs whitespace-pre-wrap leading-relaxed">
                      {testRenderResult?.rendered_message || templateForm.message}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 border-t border-white/10 flex items-center justify-end gap-3 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setEditTemplateModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="templateEditForm"
                disabled={savingTemplate}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savingTemplate ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: STANDALONE VISUAL PREVIEW                                          */}
      {/* ========================================================================= */}
      {testRenderModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c12] border border-white/10 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Preview: {selectedTemplate.name}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {selectedTemplate.template_key}
                </span>
              </h3>
              <button onClick={() => setTestRenderModal(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-white text-slate-900">
              {testRenderResult?.rendered_html ? (
                <div dangerouslySetInnerHTML={{ __html: testRenderResult.rendered_html }} />
              ) : (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm border-b pb-2">{testRenderResult?.rendered_title || selectedTemplate.title || selectedTemplate.subject}</h4>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{testRenderResult?.rendered_message || selectedTemplate.message}</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-white/10 flex justify-end bg-white/[0.02]">
              <button
                onClick={() => setTestRenderModal(false)}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-medium"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT EVENT RULE CONFIGURATION                                      */}
      {/* ========================================================================= */}
      {editRuleModal && selectedRule && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c12] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Configure Rule: {selectedRule.event_name}</h3>
              <button onClick={() => setEditRuleModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 uppercase mb-1.5 flex items-center justify-between">
                  <span>Linked Template Key</span>
                  <span className="text-[10px] text-indigo-400 font-normal flex items-center gap-1 normal-case">
                    <Lock className="w-3 h-3" /> System Contractual Pair
                  </span>
                </label>
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    <div>
                      <div className="font-mono text-xs text-white font-semibold">{ruleForm.template_key}</div>
                      <div className="text-[10px] text-gray-400">
                        {templates.find(t => t.template_key === ruleForm.template_key)?.name || "Standard Template"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const tpl = templates.find(t => t.template_key === ruleForm.template_key);
                      if (tpl) {
                        setEditRuleModal(false);
                        handleOpenEditTemplate(tpl);
                      }
                    }}
                    className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                    title="Edit the subject and email body for this template"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Template Text</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Event payload variables are mapped to this template. To customize the text or placeholders, click &ldquo;Edit Template Text&rdquo;.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 uppercase mb-1.5">Target Recipient Roles</label>
                <div className="grid grid-cols-1 gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                  {AVAILABLE_ROLES.map(role => (
                    <label key={role.value} className="flex items-center gap-2.5 text-gray-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={ruleForm.recipient_roles.includes(role.value)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...ruleForm.recipient_roles, role.value]
                            : ruleForm.recipient_roles.filter(r => r !== role.value);
                          setRuleForm({ ...ruleForm, recipient_roles: updated });
                        }}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                      <span>{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 uppercase mb-1.5">Delay (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={ruleForm.delay_minutes}
                    onChange={(e) => setRuleForm({ ...ruleForm, delay_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-300 uppercase mb-1.5">Dedup (Seconds)</label>
                  <input
                    type="number"
                    min="0"
                    value={ruleForm.dedup_window_seconds}
                    onChange={(e) => setRuleForm({ ...ruleForm, dedup_window_seconds: parseInt(e.target.value) || 86400 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditRuleModal(false)}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-md shadow-indigo-600/20"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT SCHEDULE TIMINGS                                              */}
      {/* ========================================================================= */}
      {editScheduleModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c12] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Configure Timing: {selectedSchedule.display_name}</h3>
              <button onClick={() => setEditScheduleModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-5 space-y-4 text-xs">
              {selectedSchedule.schedule_type !== "interval_minutes" && (
                <div>
                  <label className="block font-semibold text-gray-300 uppercase mb-1.5">Execution Time (24H)</label>
                  <input
                    type="time"
                    value={scheduleForm.time_of_day}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, time_of_day: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none"
                    required
                  />
                </div>
              )}

              {selectedSchedule.schedule_type === "weekly" && (
                <div>
                  <label className="block font-semibold text-gray-300 uppercase mb-1.5">Day of Week</label>
                  <select
                    value={scheduleForm.day_of_week}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none"
                  >
                    {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value} className="bg-[#0f0f15]">{d.label}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-300 uppercase mb-1.5">Default Timezone</label>
                <select
                  value={scheduleForm.default_timezone}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, default_timezone: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none"
                >
                  {TIMEZONES.map(tz => <option key={tz} value={tz} className="bg-[#0f0f15]">{tz}</option>)}
                </select>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditScheduleModal(false)}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-md shadow-indigo-600/20"
                >
                  Save Timing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RUN NOW CONFIRMATION                                               */}
      {/* ========================================================================= */}
      {runNowModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c12] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white">Manual Trigger: {selectedSchedule.display_name}</h3>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300">
              Executing this will immediately run the scheduled job handler.
            </div>

            <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
              <div>
                <span className="font-semibold text-gray-200 block">Dry-Run Mode</span>
                <span className="text-[11px] text-gray-500">Test logic without dispatching live emails</span>
              </div>
              <input
                type="checkbox"
                checked={runNowDryRun}
                onChange={(e) => setRunNowDryRun(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600"
              />
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRunNowModal(false)}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecuteRunNow}
                disabled={runningSchedule}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{runningSchedule ? "Executing..." : "Confirm & Run"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW RENDERED EMAIL LOG HTML                                       */}
      {/* ========================================================================= */}
      {viewLogModal && selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c12] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Rendered Email Outbox</h3>
              <button onClick={() => setViewLogModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs space-y-1">
                <div><strong className="text-gray-400">Recipient:</strong> {selectedLog.recipient_email}</div>
                <div><strong className="text-gray-400">Subject:</strong> {selectedLog.subject}</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-slate-900 overflow-hidden shadow-inner">
                {selectedLog.body_html ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedLog.body_html }} />
                ) : (
                  <pre className="text-xs font-mono whitespace-pre-wrap text-slate-800">
                    {selectedLog.body_text || "No HTML body found."}
                  </pre>
                )}
              </div>
            </div>
            <div className="p-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setViewLogModal(false)}
                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL: DELETE RULE CONFIRMATION                                           */}
      {/* ========================================================================= */}
      {deleteRuleModal && selectedRule && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c12] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Delete Event Rule: {selectedRule.event_name}?</h3>
            </div>
            <p className="text-xs text-gray-300">
              Are you sure you want to delete this event routing rule? This event will no longer trigger automatic emails.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteRuleModal(false)}
                disabled={deletingRule}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRule}
                disabled={deletingRule}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
              >
                {deletingRule ? "Deleting..." : "Delete Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}