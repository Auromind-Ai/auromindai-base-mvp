import { NextResponse } from 'next/server';
import { resolveSubdomainAction } from './lib/subdomainRouting.mjs';

export function middleware(request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const { pathname, search } = request.nextUrl;
  const authToken = request.cookies.get('auth_token')?.value || null;

  const action = resolveSubdomainAction({
    host,
    pathname,
    search,
    authToken,
  });

  if (action.type === 'redirect') {
    const targetUrl = action.url.startsWith('http')
      ? new URL(action.url)
      : new URL(action.url, request.url);
    const response = NextResponse.redirect(targetUrl, action.status || 307);
    if (action.clearCookie) {
      response.cookies.delete('auth_token');
    }
    return response;
  }

  if (action.type === 'rewrite') {
    const rewriteUrl = new URL(action.url, request.url);
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

// Run middleware on all relevant page and asset requests (excluding Next static internals)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
