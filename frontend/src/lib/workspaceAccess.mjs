// Invited users work in their assigned workspaces, without a personal-workspace option.
export function getVisibleWorkspaces(workspaces) {
  const assigned = workspaces.filter(workspace => workspace.is_owner === false
    || (workspace.is_owner == null && ['member', 'team_member', 'admin'].includes((workspace.role || '').trim().toLowerCase())));
  return assigned.length ? assigned : workspaces;
}

export function resolveWorkspace(workspaces, currentId, savedId, defaultId, hiddenPersonalIds = []) {
  const visible = getVisibleWorkspaces(workspaces);
  const selectedId = currentId || savedId;
  if (selectedId) {
    const selected = visible.find(workspace => workspace.id === selectedId);
    if (selected) return selected;
    // Migrate only a known personal selection to the assigned workspace.
    // Unknown/removed selections still fail closed instead of changing tenants.
    if (hiddenPersonalIds.includes(selectedId) || workspaces.some(workspace => workspace.id === selectedId)) return visible[0] || null;
    return null;
  }
  return visible.find(workspace => workspace.id === defaultId) || visible[0] || null;
}

const routePermissions = {
  dashboard: 'dashboard.overview', inbox: 'inbox.conversations', leads: 'leads.view',
  crm: 'crm.view', ai: 'ai.chat', 'ai-control': 'ai.chat', automation: 'automation.manage',
  flows: 'automation.manage', templates: 'templates.manage', marketing: 'marketing.campaigns',
  channels: 'channels.manage', brain: 'brain.manage', credits: 'credits.view', billing: 'billing.manage',
  team: 'team.members', settings: 'settings.general', calendar: 'crm.view',
  email: 'channels.manage', followups: 'crm.view', promises: 'crm.view',
};

export function isWorkspacePageAllowed(pathname, hasPermission) {
  const routeSection = pathname?.split('/')[3];
  if (routeSection === 'settings') {
    return hasPermission('settings.general') || hasPermission('settings.notifications');
  }
  const requiredPermission = Object.hasOwn(routePermissions, routeSection)
    ? routePermissions[routeSection]
    : null;
  return Boolean(requiredPermission && hasPermission(requiredPermission));
}
