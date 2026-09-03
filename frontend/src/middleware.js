import { NextResponse } from 'next/server';

function isTokenExpired(token) {
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

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/user/admin')) {
    const authToken = request.cookies.get('auth_token')?.value;
    if (authToken && isTokenExpired(authToken)) {
      const loginUrl = new URL('/login?session_expired=true', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('auth_token');
      return response;
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
