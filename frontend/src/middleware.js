import { NextResponse } from 'next/server';

export function middleware(request) {
  const requestHeaders = new Headers(request.headers);
  
  // Always attach the ngrok bypass header to backend API requests proxying through Next.js.
  // This ensures that even raw `fetch('/api/...')` calls without our custom api.js client
  // won't get blocked by the ngrok HTML interstitial page, which causes JSON parse errors.
  requestHeaders.set('ngrok-skip-browser-warning', 'true');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Only run on routes that hitting the backend API.
export const config = {
  matcher: [
    '/api/:path*',
    '/backend/:path*'
  ],
};
