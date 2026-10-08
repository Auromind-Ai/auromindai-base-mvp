import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTokenExpired,
  resolveSubdomainAction,
  TOP_LEVEL_BYPASS_ROUTES,
  PROTECTED_WORKSPACE_ROOTS,
} from '../src/lib/subdomainRouting.mjs';

function createMockJwt(expSecondsFromNow) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expSecondsFromNow;
  const payload = Buffer.from(JSON.stringify({ sub: 'user_123', exp })).toString('base64url');
  const signature = 'mock_signature';
  return `${header}.${payload}.${signature}`;
}

const VALID_TOKEN = createMockJwt(3600); // 1 hour in future
const EXPIRED_TOKEN = createMockJwt(-3600); // 1 hour in past

test('isTokenExpired accurately identifies valid, expired, and malformed tokens', () => {
  assert.equal(isTokenExpired(null), true);
  assert.equal(isTokenExpired(''), true);
  assert.equal(isTokenExpired('invalid.jwt'), true);
  assert.equal(isTokenExpired(EXPIRED_TOKEN), true);
  assert.equal(isTokenExpired(VALID_TOKEN), false);
});

test('static assets and internals are bypassed across all hosts', () => {
  const staticPaths = ['/_next/static/chunk.js', '/api/health', '/images/logo.png', '/favicon.ico'];
  for (const pathname of staticPaths) {
    const action = resolveSubdomainAction({
      host: 'orbionagents.com',
      pathname,
    });
    assert.deepEqual(action, { type: 'next' });
  }
});

test('marketing site: orbionagents.com redirects /user/admin routes to app.orbionagents.com (308)', () => {
  const resDashboard = resolveSubdomainAction({
    host: 'orbionagents.com',
    pathname: '/user/admin',
  });
  assert.equal(resDashboard.type, 'redirect');
  assert.equal(resDashboard.status, 308);
  assert.equal(resDashboard.url, 'https://app.orbionagents.com/dashboard');

  const resCrm = resolveSubdomainAction({
    host: 'orbionagents.com',
    pathname: '/user/admin/crm',
    search: '?view=kanban',
  });
  assert.equal(resCrm.type, 'redirect');
  assert.equal(resCrm.status, 308);
  assert.equal(resCrm.url, 'https://app.orbionagents.com/crm?view=kanban');
});

test('marketing site: orbionagents.com redirects /login and /signup to app.orbionagents.com (307)', () => {
  const resLogin = resolveSubdomainAction({
    host: 'orbionagents.com',
    pathname: '/login',
    search: '?redirect=%2Fdashboard',
  });
  assert.equal(resLogin.type, 'redirect');
  assert.equal(resLogin.status, 307);
  assert.equal(resLogin.url, 'https://app.orbionagents.com/login?redirect=%2Fdashboard');

  const resSignup = resolveSubdomainAction({
    host: 'orbionagents.com',
    pathname: '/signup',
  });
  assert.equal(resSignup.type, 'redirect');
  assert.equal(resSignup.status, 307);
  assert.equal(resSignup.url, 'https://app.orbionagents.com/signup');
});

test('marketing site: public pages like / and /pricing remain on orbionagents.com', () => {
  const resHome = resolveSubdomainAction({
    host: 'orbionagents.com',
    pathname: '/',
  });
  assert.deepEqual(resHome, { type: 'next' });

  const resPricing = resolveSubdomainAction({
    host: 'www.orbionagents.com',
    pathname: '/pricing',
  });
  assert.deepEqual(resPricing, { type: 'next' });
});

test('app subdomain: root / redirects to /dashboard', () => {
  const res = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/',
    search: '?utm_source=test',
  });
  assert.equal(res.type, 'redirect');
  assert.equal(res.url, '/dashboard?utm_source=test');
});

test('app subdomain: legacy /user/admin routes receive canonical 308 redirect to clean paths', () => {
  const resDashboard = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/user/admin',
  });
  assert.equal(resDashboard.type, 'redirect');
  assert.equal(resDashboard.status, 308);
  assert.equal(resDashboard.url, '/dashboard');

  const resInbox = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/user/admin/inbox',
  });
  assert.equal(resInbox.type, 'redirect');
  assert.equal(resInbox.status, 308);
  assert.equal(resInbox.url, '/inbox');
});

test('app subdomain: unauthenticated access to protected routes redirects to /login', () => {
  const res = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/dashboard',
  });
  assert.equal(res.type, 'redirect');
  assert.equal(res.url, '/login?redirect=%2Fdashboard');
});

test('app subdomain: expired token redirects to /login?session_expired=true and flags cookie clearance', () => {
  const res = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/crm',
    authToken: EXPIRED_TOKEN,
  });
  assert.equal(res.type, 'redirect');
  assert.equal(res.url, '/login?session_expired=true');
  assert.equal(res.clearCookie, true);
});

test('app subdomain: authenticated user on clean route is rewritten internally to /user/admin/*', () => {
  const resDashboard = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/dashboard',
    authToken: VALID_TOKEN,
  });
  assert.deepEqual(resDashboard, {
    type: 'rewrite',
    url: '/user/admin/dashboard',
  });

  const resCrm = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/crm',
    search: '?tab=deals',
    authToken: VALID_TOKEN,
  });
  assert.deepEqual(resCrm, {
    type: 'rewrite',
    url: '/user/admin/crm?tab=deals',
  });

  const resInbox = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/inbox',
    authToken: VALID_TOKEN,
  });
  assert.deepEqual(resInbox, {
    type: 'rewrite',
    url: '/user/admin/inbox',
  });
});

test('app subdomain: /ai-agents maps internally to /user/admin/ai', () => {
  const res = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/ai-agents',
    authToken: VALID_TOKEN,
  });
  assert.deepEqual(res, {
    type: 'rewrite',
    url: '/user/admin/ai',
  });
});

test('app subdomain: login, signup, and bypass routes pass through without rewrite', () => {
  const resLogin = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/login',
  });
  assert.deepEqual(resLogin, { type: 'next' });

  const resWhatsapp = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/whatsapp/callback',
  });
  assert.deepEqual(resWhatsapp, { type: 'next' });

  const resDocs = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/docs',
  });
  assert.deepEqual(resDocs, { type: 'next' });
});

test('app subdomain: super admin routes require auth for sub-paths', () => {
  const resAdminRoot = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/admin',
  });
  assert.deepEqual(resAdminRoot, { type: 'next' });

  const resAdminSubUnauth = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/admin/dashboard',
  });
  assert.equal(resAdminSubUnauth.type, 'redirect');
  assert.equal(resAdminSubUnauth.url, '/admin');

  const resAdminSubAuth = resolveSubdomainAction({
    host: 'app.orbionagents.com',
    pathname: '/admin/dashboard',
    authToken: VALID_TOKEN,
  });
  assert.deepEqual(resAdminSubAuth, { type: 'next' });
});

test('localhost: allows local development testing of clean routes and legacy routes', () => {
  // Unauth clean route
  const resUnauth = resolveSubdomainAction({
    host: 'localhost:3000',
    pathname: '/dashboard',
  });
  assert.equal(resUnauth.type, 'redirect');
  assert.equal(resUnauth.url, '/login?redirect=%2Fdashboard');

  // Auth clean route rewrites to /user/admin/dashboard
  const resAuth = resolveSubdomainAction({
    host: 'localhost:3000',
    pathname: '/dashboard',
    authToken: VALID_TOKEN,
  });
  assert.deepEqual(resAuth, {
    type: 'rewrite',
    url: '/user/admin/dashboard',
  });

  // Auth /ai-agents rewrites to /user/admin/ai
  const resAi = resolveSubdomainAction({
    host: '127.0.0.1:3000',
    pathname: '/ai-agents',
    authToken: VALID_TOKEN,
  });
  assert.deepEqual(resAi, {
    type: 'rewrite',
    url: '/user/admin/ai',
  });

  // Public homepage passes through
  const resHome = resolveSubdomainAction({
    host: 'localhost:3000',
    pathname: '/',
  });
  assert.deepEqual(resHome, { type: 'next' });
});
