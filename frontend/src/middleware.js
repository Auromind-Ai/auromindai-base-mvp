import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

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

  // 2. Handle Admin Console page routing
  if (pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Run middleware on API routes and page requests (excluding static assets)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
