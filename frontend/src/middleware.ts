import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/booking'];
  const isPublicRoute = publicRoutes.some(route => pathname === route);

  // Check for auth token cookie
  const authToken = request.cookies.get('auth-token')?.value;

  // If trying to access protected route without token
  if (!isPublicRoute && !authToken) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('login', 'true');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, favicon.svg, logo.svg
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|logo\\.svg).*)',
  ],
};
