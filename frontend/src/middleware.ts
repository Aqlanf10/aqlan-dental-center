import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/booking', '/clinic-display', '/forgot-password', '/reset-password'];
  const isPublicRoute = publicRoutes.some(route => pathname === route);

  // Auth pages - accessible without token
  const authPages = ['/change-password'];
  const isAuthPage = authPages.some(route => pathname === route);

  // Static files and API routes
  const isStaticOrApi = pathname.startsWith('/_next') || pathname.startsWith('/api');

  if (isStaticOrApi) {
    return NextResponse.next();
  }

  // Check for auth token cookie
  const authToken = request.cookies.get('auth-token')?.value;

  // If trying to access protected route without token
  if (!isPublicRoute && !isAuthPage && !authToken) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('login', 'true');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|logo\\.svg).*)',
  ],
};
