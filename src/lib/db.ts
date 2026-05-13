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
