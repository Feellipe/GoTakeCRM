import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import { logger } from '@/lib/logger';

export default async function middleware(request: NextRequest) {
  // Skip auth in development to allow local testing without Google OAuth
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  try {
    return await withAuth({
      pages: {
        signIn: '/api/auth/signin',
      },
    })(request);
  } catch (error) {
    logger.error('Middleware error', { error: String(error), path: request.nextUrl.pathname });
    return NextResponse.redirect(new URL('/api/auth/signin', request.url));
  }
}

export const config = {
  matcher: [
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
