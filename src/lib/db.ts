// PRODUCTION DEPLOYMENT NOTE:
// Before deploying to production, regenerate the Prisma client with:
//   npx prisma generate --schema=prisma/schema.prod.prisma
// This switches from SQLite to PostgreSQL client code.
// Ensure DATABASE_URL is set to your Supabase PostgreSQL connection string.

if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required in production');
}

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configuracao do PrismaClient com suporte dual:
// - Desenvolvimento: SQLite (schema.prisma) com log de queries
// - Producao: PostgreSQL/Supabase (schema.prod.prisma) com log de erros apenas
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
    // Configuracoes especificas para PostgreSQL em producao
    ...(process.env.NODE_ENV === 'production' && {
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
