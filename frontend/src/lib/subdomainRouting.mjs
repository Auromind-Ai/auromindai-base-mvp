export function isTokenExpired(token) {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const jsonPayload = atob(padded);
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp <= (currentTime + 5);
  } catch {
    return true;
  }
}

export const TOP_LEVEL_BYPASS_ROUTES = [
  '/whatsapp',
  '/instagram',
  '/accept-invite',
  '/impersonate',
  '/data-deletion',
  '/terms',
  '/privacy',
  '/docs',
];

export const PROTECTED_WORKSPACE_ROOTS = [
  '/dashboard',
  '/crm',
  '/inbox',
  '/ai',
  '/ai-agents',
  '/automation',
  '/brain',
  '/credits',
  '/billing',
  '/marketing',
  '/channels',
  '/settings',
  '/team',
  '/flows',
  '/followups',
  '/promises',
  '/templates',
  '/leads',
  '/calendar',
  '/email',
];

export function resolveSubdomainAction({
  host = '',
  pathname = '/',
  search = '',
  authToken = null,
}) {
  // 1. Bypass static files and Next.js / API internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/api-proxy') ||
    pathname.startsWith('/ws') ||
    pathname.includes('.') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/sounds') ||
    pathname.startsWith('/videos') ||
    pathname.startsWith('/animations')
  ) {
    return { type: 'next' };
  }

  const hostname = host.split(':')[0].toLowerCase();
  const isMarketingSite = hostname === 'orbionagents.com' || hostname === 'www.orbionagents.com';
  const isAppSubdomain = hostname === 'app.orbionagents.com' || hostname.startsWith('app.');

  // =========================================================================
  // SCENARIO A: Marketing domain (orbionagents.com / www.orbionagents.com)
  // =========================================================================
  if (isMarketingSite) {
    // Redirect /user/admin/:path* -> https://app.orbionagents.com/:path* (HTTP 308)
    if (pathname === '/user/admin' || pathname === '/user/admin/') {
      return {
        type: 'redirect',
        status: 308,
        url: `https://app.orbionagents.com/dashboard${search}`,
      };
    }

    if (pathname.startsWith('/user/admin/')) {
      const cleanSubPath = pathname.slice('/user/admin'.length);
      return {
        type: 'redirect',
        status: 308,
        url: `https://app.orbionagents.com${cleanSubPath}${search}`,
      };
    }

    // Redirect /login and /signup -> https://app.orbionagents.com/:path* (HTTP 307)
    if (
      pathname === '/login' ||
      pathname.startsWith('/login/') ||
      pathname === '/signup' ||
      pathname.startsWith('/signup/')
    ) {
      return {
        type: 'redirect',
        status: 307,
        url: `https://app.orbionagents.com${pathname}${search}`,
      };
    }

    return { type: 'next' };
  }

  // =========================================================================
  // SCENARIO B: App Subdomain (app.orbionagents.com / app.localhost)
  // =========================================================================
  if (isAppSubdomain) {
    // Root / -> Redirect to /dashboard
    if (pathname === '/') {
      return {
        type: 'redirect',
        status: 307,
        url: `/dashboard${search}`,
      };
    }

    // Direct /user/admin routes -> Canonical 308 redirect to clean paths on subdomain
    if (pathname === '/user/admin' || pathname === '/user/admin/') {
      return {
        type: 'redirect',
        status: 308,
        url: `/dashboard${search}`,
      };
    }

    if (pathname.startsWith('/user/admin/')) {
      const cleanSubPath = pathname.slice('/user/admin'.length);
      return {
        type: 'redirect',
        status: 308,
        url: `${cleanSubPath}${search}`,
      };
    }

    // Super Admin console (/admin)
    if (pathname.startsWith('/admin') && pathname !== '/admin' && pathname !== '/admin/') {
      if (!authToken || isTokenExpired(authToken)) {
        return {
          type: 'redirect',
          status: 307,
          url: '/admin',
        };
      }
      return { type: 'next' };
    }
    if (pathname === '/admin' || pathname === '/admin/') {
      return { type: 'next' };
    }

    // Auth pages remain top-level on app subdomain
    if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
      return { type: 'next' };
    }

    // Top-level callback & auxiliary pages
    if (TOP_LEVEL_BYPASS_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      return { type: 'next' };
    }

    // Protected workspace routes on app subdomain: verify auth_token
    if (!authToken) {
      const redirectTarget = encodeURIComponent(`${pathname}${search}`);
      return {
        type: 'redirect',
        status: 307,
        url: `/login?redirect=${redirectTarget}`,
      };
    }

    if (isTokenExpired(authToken)) {
      return {
        type: 'redirect',
        status: 307,
        url: '/login?session_expired=true',
        clearCookie: true,
      };
    }

    // Authenticated workspace routes: internally rewrite from /:path* to /user/admin/:path*
    const targetSubPath = (pathname === '/ai-agents' || pathname === '/ai-agents/')
      ? '/ai'
      : pathname;
    return {
      type: 'rewrite',
      url: `/user/admin${targetSubPath}${search}`,
    };
  }

  // =========================================================================
  // SCENARIO C: Local development fallback (localhost / 127.0.0.1)
  // =========================================================================
  if (pathname.startsWith('/user/admin')) {
    if (!authToken) {
      const redirectTarget = encodeURIComponent(`${pathname}${search}`);
      return {
        type: 'redirect',
        status: 307,
        url: `/login?redirect=${redirectTarget}`,
      };
    }
    if (isTokenExpired(authToken)) {
      return {
        type: 'redirect',
        status: 307,
        url: '/login?session_expired=true',
        clearCookie: true,
      };
    }
    return { type: 'next' };
  }

  if (pathname.startsWith('/admin') && pathname !== '/admin' && pathname !== '/admin/') {
    if (!authToken || isTokenExpired(authToken)) {
      return {
        type: 'redirect',
        status: 307,
        url: '/admin',
      };
    }
    return { type: 'next' };
  }

  const isProtectedWorkspaceRoute = PROTECTED_WORKSPACE_ROOTS.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  if (isProtectedWorkspaceRoute) {
    if (!authToken) {
      const redirectTarget = encodeURIComponent(`${pathname}${search}`);
      return {
        type: 'redirect',
        status: 307,
        url: `/login?redirect=${redirectTarget}`,
      };
    }
    if (isTokenExpired(authToken)) {
      return {
        type: 'redirect',
        status: 307,
        url: '/login?session_expired=true',
        clearCookie: true,
      };
    }
    const targetSubPath = (pathname === '/ai-agents' || pathname === '/ai-agents/')
      ? '/ai'
      : pathname;
    return {
      type: 'rewrite',
      url: `/user/admin${targetSubPath}${search}`,
    };
  }

  return { type: 'next' };
}
