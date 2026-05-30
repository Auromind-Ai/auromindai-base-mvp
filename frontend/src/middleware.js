import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const adminPath = process.env.NEXT_PUBLIC_ADMIN_CONSOLE_PATH || 'x7k2-admin-9pqm';

  // 1. Handle API/Backend headers proxying (existing logic)
  if (pathname.startsWith('/api/') || pathname.startsWith('/backend/')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('ngrok-skip-browser-warning', 'true');
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 2. Handle Admin Console page routing and security checks
  if (pathname.includes('/[admin_path]')) {
    return NextResponse.next();
  }

  if (pathname.startsWith(`/${adminPath}`)) {
    // If accessing any admin sub-path (e.g. /dashboard, /users, etc.)
    // but not the root login path (/[adminPath] itself)
    if (pathname !== `/${adminPath}`) {
      const token = request.cookies.get('admin_session')?.value;
      if (!token) {
        // Rewrite directly to the Next.js 404 page
        const url = request.nextUrl.clone();
        url.pathname = '/404';
        return NextResponse.rewrite(url);
      }
    }
  }

  return NextResponse.next();
}

// Run middleware on API routes and page requests (excluding static assets)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
