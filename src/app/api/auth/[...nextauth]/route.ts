import NextAuth from "next-auth";
import { authOptions } from '@/lib/auth-options';
import { logger } from '@/lib/logger';

// Validacao de variaveis de ambiente obrigatorias para autenticacao
if (!process.env.NEXTAUTH_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing required environment variable: NEXTAUTH_SECRET');
  } else {
    logger.warn('Missing environment variable: NEXTAUTH_SECRET');
  }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
