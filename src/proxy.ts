import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { logger } from '@/lib/logger';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/register', '/api/auth'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Skip auth in development to allow local testing without credentials
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Portfolio mode: public access, no auth required
  if (process.env.APP_MODE === 'portfolio') {
    return NextResponse.next();
  }

  // Client mode: JWT authentication required
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  } catch (error) {
    logger.error('Proxy error', { error: String(error), path: pathname });
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
