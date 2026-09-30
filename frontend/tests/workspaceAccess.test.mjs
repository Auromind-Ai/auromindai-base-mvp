import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorkspace, isWorkspacePageAllowed, getVisibleWorkspaces } from '../src/lib/workspaceAccess.mjs';

const own = { id: 'own', name: 'Own workspace', role: 'founder', is_owner: true };
const member = { id: 'member', name: 'Member workspace', role: 'member', is_owner: false };
const workspaces = [own, member];

test('a full reload preserves the member workspace over the profile default', () => {
  assert.equal(resolveWorkspace(workspaces, null, 'member', 'own'), member);
});

test('old personal selections migrate to the assigned workspace', () => {
  assert.equal(resolveWorkspace(workspaces, 'own', 'member', 'own'), member);
  assert.equal(resolveWorkspace(workspaces, null, 'own', 'own'), member);
  assert.equal(resolveWorkspace(workspaces, 'member', 'own', 'own'), member);
});

test('removed or invalid selections never fall back to the personal workspace', () => {
  assert.equal(resolveWorkspace([own], null, 'member', 'own'), null);
  assert.equal(resolveWorkspace([own], 'member', 'own', 'own'), null);
});

test('first login can use the default or first available workspace', () => {
  assert.equal(resolveWorkspace(workspaces, null, null, 'member'), member);
  assert.equal(resolveWorkspace(workspaces, null, null, 'missing'), member);
  assert.equal(resolveWorkspace([own], null, null, 'own'), own);
  assert.equal(resolveWorkspace([], null, null, null), null);
});

test('direct Leads URLs use only the restored workspace permissions', () => {
  const grants = { own: ['leads.view'], member: ['dashboard.overview'] };
  const restored = resolveWorkspace(workspaces, null, 'member', 'own');
  const memberPermission = permission => grants[restored.id].includes(permission);
  assert.equal(isWorkspacePageAllowed('/user/admin/leads', memberPermission), false);
  assert.equal(isWorkspacePageAllowed('/user/admin/leads/details', memberPermission), false);
  assert.equal(isWorkspacePageAllowed('/user/admin/dashboard', memberPermission), true);
  const switched = resolveWorkspace(workspaces, 'own', 'member', 'own');
  assert.equal(switched, member);
  assert.equal(isWorkspacePageAllowed('/user/admin/leads', permission => grants[switched.id].includes(permission)), false);
  grants.member.push('leads.view');
  assert.equal(isWorkspacePageAllowed('/user/admin/leads', memberPermission), true);
});

test('unknown routes fail closed and notification-only settings remain accessible', () => {
  assert.equal(isWorkspacePageAllowed('/user/admin/unknown', () => true), false);
  assert.equal(isWorkspacePageAllowed('/user/admin/settings', permission => permission === 'settings.notifications'), true);
  assert.equal(isWorkspacePageAllowed('/user/admin/leads', () => false), false);
});

test('only assigned workspaces are visible, with explicit switching between assignments', () => {
  const second = { id: 'second', role: 'admin', is_owner: false };
  assert.deepEqual(getVisibleWorkspaces([own, member, second]), [member, second]);
  assert.equal(resolveWorkspace([own, member, second], 'second', 'member', 'own'), second);
  assert.deepEqual(getVisibleWorkspaces([own]), [own]);
});

test('credits and billing grants remain separate, independent of member role', () => {
  const permission = key => key === 'credits.view';
  assert.equal(isWorkspacePageAllowed('/user/admin/credits', permission), true);
  assert.equal(isWorkspacePageAllowed('/user/admin/billing', permission), false);
});

test('server-filtered list migrates only a known hidden personal workspace', () => {
  assert.equal(resolveWorkspace([member], null, 'own', 'own', ['own']), member);
  assert.equal(resolveWorkspace([member], null, 'revoked', 'own', ['own']), null);
  assert.equal(resolveWorkspace([member], 'member', 'own', 'own', ['own']), member);
});

test('legacy roles are normalized before hiding personal workspaces', () => {
  const legacyMember = { id: 'member', role: ' MEMBER ' };
  assert.deepEqual(getVisibleWorkspaces([own, legacyMember]), [legacyMember]);
});
