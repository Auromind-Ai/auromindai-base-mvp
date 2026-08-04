import { NextResponse } from 'next/server';

export function middleware(request) {
  return NextResponse.next();
}

// Run middleware on API routes and page requests (excluding static assets)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
