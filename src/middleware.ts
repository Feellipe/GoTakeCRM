import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from 'next-auth/middleware';

export default async function middleware(request: NextRequest) {
  try {
    return await withAuth({
      pages: {
        signIn: '/api/auth/signin',
      },
    })(request);
  } catch (error) {
    console.error('Middleware error:', error);
    // Redireciona para signin em caso de falha na autenticacao
    return NextResponse.redirect(new URL('/api/auth/signin', request.url));
  }
}

export const config = {
  matcher: [
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
