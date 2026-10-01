from typing import Dict, List, Any, Optional

ALL_PERMISSIONS_TREE: Dict[str, Dict[str, Any]] = {
    "dashboard": {
        "label": "Dashboard",
        "icon": "LayoutDashboard",
        "items": {
            "overview": "Overview & Analytics",
        }
    },
    "inbox": {
        "label": "Omni-Inbox",
        "icon": "MessageSquare",
        "items": {
            "conversations": "Conversations",
        }
    },
    "leads": {
        "label": "Leads",
        "icon": "Users",
        "items": {
            "view": "View & Manage Leads",
        }
    },
    "crm": {
        "label": "CRM",
        "icon": "TrendingUp",
        "items": {
            "view": "CRM Contacts & Deals",
        }
    },
    "ai": {
        "label": "AI Workspace",
        "icon": "Bot",
        "items": {
            "chat": "AI Assistant & Copilot",
        }
    },
    "automation": {
        "label": "Automations",
        "icon": "Zap",
        "items": {
            "manage": "Flow Builder & Automations",
        }
    },
    "templates": {
        "label": "Templates",
        "icon": "FileText",
        "items": {
            "manage": "Message Templates",
        }
    },
    "marketing": {
        "label": "Marketing",
        "icon": "Megaphone",
        "items": {
            "campaigns": "Bulk Broadcast Campaigns",
        }
    },
    "channels": {
        "label": "Channels",
        "icon": "Share2",
        "items": {
            "manage": "Connected Accounts",
        }
    },
    "brain": {
        "label": "Brain (Knowledge Base)",
        "icon": "BookOpen",
        "items": {
            "manage": "Documents & Training Data",
        }
    },
    "credits": {
        "label": "Credits & Wallet",
        "icon": "Coins",
        "items": {
            "view": "Usage, Balances & Recharges",
        }
    },
    "billing": {
        "label": "Billing",
        "icon": "CreditCard",
        "items": {
            "manage": "Plans & Invoices",
        }
    },
    "team": {
        "label": "Team Management",
        "icon": "ShieldCheck",
        "items": {
            "members": "Manage Members, Invitations & Seats",
        }
    },
    "settings": {
        "label": "Settings",
        "icon": "Settings",
        "items": {
            "general": "Workspace Settings",
            "notifications": "Notification Alerts",
        }
    },
}

PERMISSION_ALIASES: Dict[str, List[str]] = {
    "leads.view": ["leads.all_leads", "leads.view", "leads.manage", "leads.*"],
    "leads.all_leads": ["leads.all_leads", "leads.view", "leads.manage", "leads.*"],
    "crm.view": ["crm.view", "crm.contacts", "crm.deals", "crm.companies", "crm.*"],
    "crm.contacts": ["crm.view", "crm.contacts", "crm.deals", "crm.companies", "crm.*"],
    "ai.chat": ["ai.chat", "ai_agents.agents", "ai_agents.agent_settings", "ai_agents.*", "ai.*"],
    "ai_agents.agents": ["ai.chat", "ai_agents.agents", "ai_agents.*", "ai.*"],
    "automation.manage": ["automation.manage", "flows.all_flows", "flows.flow_settings", "flows.manage", "flows.*", "automation.*"],
    "flows.all_flows": ["automation.manage", "flows.all_flows", "flows.flow_settings", "flows.manage", "flows.*", "automation.*"],
    "templates.manage": ["templates.manage", "marketing.templates", "templates.*"],
    "marketing.templates": ["templates.manage", "marketing.templates", "templates.*"],
    "channels.manage": ["channels.manage", "integrations.connected_accounts", "integrations.*", "channels.*"],
    "integrations.connected_accounts": ["channels.manage", "integrations.connected_accounts", "integrations.*", "channels.*"],
    "brain.manage": ["brain.manage", "knowledge_base.documents", "knowledge_base.*", "brain.*"],
    "knowledge_base.documents": ["brain.manage", "knowledge_base.documents", "knowledge_base.*", "brain.*"],
    "credits.view": ["credits.view", "analytics.reports", "credits.*", "analytics.*"],
    "analytics.reports": ["credits.view", "analytics.reports", "credits.*", "analytics.*"],
    "billing.manage": ["billing.manage", "billing.plans", "billing.invoices", "billing.*"],
    "billing.plans": ["billing.manage", "billing.plans", "billing.invoices", "billing.*"],
}


def get_full_permissions_dict() -> Dict[str, List[str]]:
    """Return dictionary with all sections and all sub-items enabled."""
    return {
        section_key: list(section_data["items"].keys())
        for section_key, section_data in ALL_PERMISSIONS_TREE.items()
    }


def normalize_permissions(permissions: Optional[Any]) -> Dict[str, List[str]]:
    """
    Normalizes a member's permissions dictionary or list against ALL_PERMISSIONS_TREE.
    Maps legacy aliases and removes any obsolete/invalid keys.
    """
    if not permissions:
        return {}

    clean_perms: Dict[str, List[str]] = {}

    legacy_to_canonical = {
        "leads.all_leads": ("leads", "view"),
        "leads.lead_settings": ("leads", "view"),
        "crm.contacts": ("crm", "view"),
        "crm.deals": ("crm", "view"),
        "crm.companies": ("crm", "view"),
        "ai_agents.agents": ("ai", "chat"),
        "ai_agents.agent_settings": ("ai", "chat"),
        "flows.all_flows": ("automation", "manage"),
        "flows.flow_settings": ("automation", "manage"),
        "marketing.templates": ("templates", "manage"),
        "marketing.campaigns": ("marketing", "campaigns"),
        "analytics.reports": ("credits", "view"),
        "knowledge_base.documents": ("brain", "manage"),
        "integrations.connected_accounts": ("channels", "manage"),
        "billing.plans": ("billing", "manage"),
        "billing.invoices": ("billing", "manage"),
    }

    def add_canonical(sec: str, item: str):
        legacy_sections = {"ai_agents": "ai", "flows": "automation", "integrations": "channels", "knowledge_base": "brain", "analytics": "credits"}
        sec = legacy_sections.get(sec, sec)
        if item == "*" and sec in ALL_PERMISSIONS_TREE:
            for child in ALL_PERMISSIONS_TREE[sec]["items"]:
                add_canonical(sec, child)
            return
        if sec in ALL_PERMISSIONS_TREE and item in ALL_PERMISSIONS_TREE[sec]["items"]:
            if sec not in clean_perms:
                clean_perms[sec] = []
            if item not in clean_perms[sec]:
                clean_perms[sec].append(item)

    if isinstance(permissions, list):
        for p in permissions:
            if isinstance(p, str):
                if p in legacy_to_canonical:
                    s, i = legacy_to_canonical[p]
                    add_canonical(s, i)
                elif "." in p:
                    s, i = p.split(".", 1)
                    add_canonical(s, i)
                else:
                    add_canonical(p, "*")
    elif isinstance(permissions, dict):
        for sec, items in permissions.items():
            if isinstance(items, list):
                for item in items:
                    full_key = f"{sec}.{item}"
                    if full_key in legacy_to_canonical:
                        s, i = legacy_to_canonical[full_key]
                        add_canonical(s, i)
                    else:
                        add_canonical(sec, item)
            elif isinstance(items, bool) and items:
                if sec in ALL_PERMISSIONS_TREE:
                    for itm in ALL_PERMISSIONS_TREE[sec]["items"].keys():
                        add_canonical(sec, itm)

    return clean_perms


def get_all_permission_keys() -> List[str]:
    """Return flat list of all permission keys in 'section.item' format."""
    keys = []
    for section_key, section_data in ALL_PERMISSIONS_TREE.items():
        for item_key in section_data["items"].keys():
            keys.append(f"{section_key}.{item_key}")
    return keys


def _check_single_perm(permissions: Any, perm: str) -> bool:
    """Helper to check if a single permission string is satisfied in dictionary or list."""
    if isinstance(permissions, dict):
        if "." in perm:
            sec, item = perm.split(".", 1)
            sec_items = permissions.get(sec, [])
            if isinstance(sec_items, list):
                return item in sec_items or "*" in sec_items
            elif isinstance(sec_items, bool):
                return sec_items
            return False
        else:
            sec_items = permissions.get(perm, [])
            if isinstance(sec_items, list):
                return len(sec_items) > 0
            elif isinstance(sec_items, bool):
                return sec_items
            return False

    if isinstance(permissions, list):
        if perm in permissions:
            return True
        if "." in perm:
            sec, _ = perm.split(".", 1)
            if f"{sec}.*" in permissions or sec in permissions:
                return True
        else:
            return any(p.startswith(f"{perm}.") or p == perm for p in permissions)

    return False


def has_workspace_permission(
    role: Optional[str],
    permissions: Optional[Any],
    required_permission: str
) -> bool:
    role_normalized = (role or "member").strip().lower()
    if role_normalized in ("admin", "founder", "owner", "platform_admin"):
        return True

    if not permissions:
        return False

    # 1. Direct check
    if _check_single_perm(permissions, required_permission):
        return True

    # 2. Check aliases
    aliases = PERMISSION_ALIASES.get(required_permission, [])
    for alias in aliases:
        if _check_single_perm(permissions, alias):
            return True

    # 3. If checking section-only e.g. "leads", also check old section names
    sec_map = {
        "ai": ["ai_agents"],
        "automation": ["flows"],
        "channels": ["integrations"],
        "brain": ["knowledge_base"],
        "credits": ["analytics"],
    }
    if required_permission in sec_map:
        for old_sec in sec_map[required_permission]:
            if _check_single_perm(permissions, old_sec):
                return True

    return False

