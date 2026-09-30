"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Sparkles,
  MessageSquare,
  Users,
  TrendingUp,
  Zap,
  FileText,
  Send,
  Share2,
  Brain,
  Coins,
  CreditCard,
  Settings,
  Shield,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const sectionsDefinition = [
  {
    title: "Workspace",
    items: [
      ["Dashboard", LayoutDashboard, "dashboard", "dashboard.overview"],
      ["AI Workspace", Sparkles, "ai", "ai.chat"],
    ],
  },
  {
    title: "Customers",
    items: [
      ["Omni-Inbox", MessageSquare, "inbox", "inbox.conversations"],
      ["Leads", Users, "leads", "leads.view"],
      ["CRM", TrendingUp, "crm", "crm.view"],
    ],
  },
  {
    title: "Automation",
    items: [
      ["Automations", Zap, "automation", "automation.manage"],
      ["Templates", FileText, "templates", "templates.manage"],
    ],
  },
  {
    title: "Growth",
    items: [
      ["Marketing", Send, "marketing", "marketing.campaigns"],
      ["Channels", Share2, "channels", "channels.manage"],
    ],
  },
  {
    title: "AI & Usage",
    items: [
      ["Brain", Brain, "brain", "brain.manage"],
      ["Credits & Wallet", Coins, "credits", "credits.view"],
      ["Billing", CreditCard, "billing", "billing.manage"],
    ],
  },
];

export default function WorkspaceNavigation({
  pathname,
  collapsed = false,
  isAdmin,
  onSettings,
  onNavigate,
  onExpand,
}) {
  const { hasPermission, currentRole } = useAuth();

  const marketingActive =
    pathname === "/user/admin/marketing" ||
    pathname?.startsWith("/user/admin/marketing/");

  // Filter sections based on permissions
  const visibleSections = sectionsDefinition
    .map((section) => {
      const allowedItems = section.items.filter(([label, , route, permKey]) => {
        if (!hasPermission) return true;
        if (route === "inbox") {
          return hasPermission("inbox.conversations") || hasPermission("inbox");
        }
        return hasPermission(permKey) || hasPermission(route);
      });
      return {
        ...section,
        items: allowedItems,
      };
    })
    .filter((section) => section.items.length > 0);

  const canAccessSettings = hasPermission ? hasPermission("settings.general") : true;

  return (
    <nav
      aria-label="Workspace navigation"
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-2.5 py-3 custom-scrollbar [@media(min-height:600px)]:overflow-clip lg:overflow-clip [@media(min-height:701px)_and_(max-height:880px)]:py-2 [@media(max-height:700px)]:py-1.5"
    >
      <div className="space-y-2 [@media(min-height:781px)_and_(max-height:880px)]:space-y-1.5 [@media(min-height:701px)_and_(max-height:780px)]:space-y-1 [@media(max-height:700px)]:space-y-0.5">
        {visibleSections.map((section) => (
          <section key={section.title} aria-label={section.title}>
            {!collapsed && (
              <h2 className="px-3 py-1 mb-1 [@media(min-height:781px)_and_(max-height:880px)]:py-0.5 [@media(min-height:701px)_and_(max-height:780px)]:py-px [@media(min-height:701px)_and_(max-height:780px)]:mb-0.5 [@media(max-height:700px)]:py-0 [@media(max-height:700px)]:mb-px text-[11px] font-medium uppercase tracking-wider text-[#787878]">
                {section.title}
              </h2>
            )}
            <div className="space-y-0.5 [@media(max-height:780px)]:space-y-px">
              {section.items.map(([label, Icon, route]) => {
                const href = `/user/admin/${route}`;
                const active =
                  pathname === href || pathname?.startsWith(`${href}/`);
                if (route === "marketing")
                  return (
                    <MarketingMenu
                      key={pathname}
                      {...{ collapsed, onExpand, onNavigate }}
                      active={marketingActive}
                    />
                  );
                return (
                  <Link
                    key={route}
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? label : undefined}
                    aria-label={collapsed ? label : undefined}
                    className={rowClass(active, collapsed)}
                  >
                    <Icon
                      size={16}
                      strokeWidth={2}
                      className={`shrink-0 ${active ? "text-white" : "text-[#7e7e7e] group-hover:text-white"}`}
                    />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <section aria-label="System">
          {!collapsed && (
            <h2 className="px-3 py-1 mb-1 [@media(min-height:781px)_and_(max-height:880px)]:py-0.5 [@media(min-height:701px)_and_(max-height:780px)]:py-px [@media(min-height:701px)_and_(max-height:780px)]:mb-0.5 [@media(max-height:700px)]:py-0 [@media(max-height:700px)]:mb-px text-[11px] font-medium uppercase tracking-wider text-[#787878]">
              System
            </h2>
          )}
          <div className="space-y-0.5 [@media(max-height:780px)]:space-y-px">
            <button
              type="button"
              onClick={() => {
                onNavigate?.();
                onSettings();
              }}
              title={collapsed ? "Settings" : undefined}
              aria-label={collapsed ? "Settings" : undefined}
              className={rowClass(false, collapsed)}
            >
              <Settings
                size={16}
                strokeWidth={2}
                className="shrink-0 text-[#7e7e7e] group-hover:text-white"
              />
              {!collapsed && <span>Settings</span>}
            </button>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={onNavigate}
                title={collapsed ? "Admin Console" : undefined}
                aria-label={collapsed ? "Admin Console" : undefined}
                className={rowClass(false, collapsed)}
              >
                <Shield
                  size={16}
                  strokeWidth={2}
                  className="shrink-0 text-[#7e7e7e] group-hover:text-white"
                />
                {!collapsed && <span>Admin Console</span>}
              </Link>
            )}
          </div>
        </section>
      </div>
    </nav>
  );
}

function rowClass(active, collapsed) {
  return `relative flex w-full items-center gap-2.5 py-[7px] [@media(min-height:781px)_and_(max-height:880px)]:py-[5px] [@media(min-height:701px)_and_(max-height:780px)]:py-1 [@media(max-height:700px)]:py-0.5 rounded-[6px] text-left text-sm group select-none transition-all duration-150 active:scale-[0.97] active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${collapsed ? "justify-center px-0" : "px-3"} ${active ? "bg-[var(--notion-hover)] text-white font-medium shadow-sm" : "text-[#9b9b9b] hover:bg-white/5 hover:text-white"}`;
}

function MarketingMenu({ collapsed, active, onExpand, onNavigate }) {
  const [open, setOpen] = useState(active);
  return (
    <div>
      <button
        type="button"
        aria-label="Marketing"
        aria-expanded={!collapsed && open}
        onClick={() => {
          if (collapsed) {
            onExpand?.();
            setOpen(true);
          } else setOpen((value) => !value);
        }}
        title={collapsed ? "Marketing" : undefined}
        className={rowClass(active, collapsed)}
      >
        <Send
          size={16}
          strokeWidth={2}
          className={`shrink-0 ${active ? "text-white" : "text-[#7e7e7e] group-hover:text-white"}`}
        />
        {!collapsed && (
          <>
            <span className="flex-1">Marketing</span>
            <ChevronDown
              size={15}
              className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>
      {!collapsed && open && (
        <div className="ml-5 mt-0.5 border-l border-white/10 pl-3">
          <Link
            href="/user/admin/marketing/bulkmessages"
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={rowClass(active, false)}
          >
            Bulk Messages
          </Link>
        </div>
      )}
    </div>
  );
}
