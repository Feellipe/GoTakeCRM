import NextAuth from "next-auth";
import { authOptions } from '@/lib/auth-options';
import { logger } from '@/lib/logger';

// Lazy env validation — called at runtime, not module load time (build-safe)
function validateEnv(): void {
  if (!process.env.NEXTAUTH_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing required environment variable: NEXTAUTH_SECRET');
    } else {
      logger.warn('Missing environment variable: NEXTAUTH_SECRET');
    }
  }
}

// Create handler lazily so env vars are available at runtime
function createHandler() {
  validateEnv();
  return NextAuth(authOptions);
}

let _handler: ReturnType<typeof NextAuth> | null = null;
function getHandler() {
  if (!_handler) {
    _handler = createHandler();
  }
  return _handler;
}

async function GET(req: Request, ctx: any) {
  return getHandler()(req, ctx);
}

async function POST(req: Request, ctx: any) {
  return getHandler()(req, ctx);
}

export { GET, POST };
