# Plan 003 — Multi-Tenant Data Model, Unified PostgreSQL, Dual Auth & Deployment

> **Status:** Draft — Pending Implementation
> **Created:** 2026-06-14
> **Related ADRs:** [ADR-0001](../adr/0001-multi-tenant-single-user-ui.md), [ADR-0002](../adr/0002-deployment-single-branch-vercel-preview.md), [ADR-0003](../adr/0003-dual-auth-database-unification.md), [ADR-0004](../adr/0004-whatsapp-official-cloud-api.md)

---

## Overview

This plan implements the architectural decisions from the `/grill-with-docs` session (2026-06-14). It covers four interrelated workstreams:

1. **Database unification** — Drop SQLite, unify to PostgreSQL-only schema via Supabase
2. **Multi-tenant data model** — Add `organizationId` to all models + new auth/collaboration tables
3. **Dual authentication** — Add `CredentialsProvider` (email/password) alongside Google OAuth
4. **Deployment restructure** — Single branch (`main`), Vercel Preview Environments, two Supabase projects

---

## Prerequisites

| # | Item | Details |
|---|---|---|
| 1 | Two Supabase projects | `gotakecrm-prod` (production) and `gotakecrm-demo` (development + portfolio) |
| 2 | Vercel project linked | Already linked via git — verify `.vercel/project.json` or `.vercel/repo.json` exists |
| 3 | Meta Business account | For future WhatsApp integration — not blocking for this plan |

---

## Phase 0 — Test Impact Analysis & Preparation

> **Goal:** Understand exactly what breaks, update the test foundation first, then implement.

### 0.1 Test Framework State

- **Framework:** Vitest with `@testing-library/react` (jsdom)
- **Mocking strategy:** Prisma mocked at the system boundary (`vi.mock('@/lib/db')` in `setup.ts`)
- **Pattern:** Each model has a mock object with `findMany`, `create`, `update`, etc.
- **Test count:** 4 unit test files + 11 integration test files + 3 component test files + 2 API test files

### 0.2 What Breaks — Impact Summary

| Category | Files Affected | Impact Level |
|---|---|---|
| **Test setup mocks** | `src/__tests__/setup.ts` | 🔴 HIGH — must add 4 new model mocks + `organizationId` to all existing mocks |
| **Validation schemas** | `src/lib/validations.ts` + `src/__tests__/unit/validations.test.ts` | 🔴 HIGH — all create/update schemas need `organizationId` |
| **API integration tests** | All 11 files in `src/__tests__/integration/` | 🔴 HIGH — all mock data missing `organizationId` |
| **Component tests** | 3 files in `src/__tests__/components/` | 🟡 MEDIUM — form components need `organizationId` in props |
| **Unit tests (non-DB)** | `rate-limit.test.ts`, `audit.test.ts`, `logger.test.ts`, `utils.test.ts` | 🟢 LOW — no Prisma dependency |
| **Seed scripts** | `prisma/seed.ts`, `prisma/seed-proposals.ts`, `prisma/seed-revenues.ts` | 🔴 HIGH — must create Organization + User, add `organizationId` to all records |

### 0.3 Critical Update Order (TDD: Red → Green → Refactor)

This order ensures tests stay green through the migration:

**Step 1 — Update test foundation (all tests will still pass)**
1. Update `src/__tests__/setup.ts` — add mocks for `user`, `organization`, `userOrganization`, `clientShare`
2. All existing tests continue to pass because they don't reference these new models yet

**Step 2 — Schema + validation (existing tests start failing — RED)**
1. Update `prisma/schema.prisma` — add `organizationId` to all 13 models
2. Add 4 new models: `User`, `Organization`, `UserOrganization`, `ClientShare`
3. Update `src/lib/validations.ts` — add `organizationId` to all create/update schemas
4. Run `npx prisma generate` — regenerate client

**Step 3 — Fix all failing tests (GREEN)**
1. Fix `src/__tests__/unit/validations.test.ts` — add `organizationId` to test data
2. Fix all 11 integration test files — add `organizationId` to mock data objects
3. Fix component tests — add `organizationId` to form props
4. Run full test suite → all green

**Step 4 — Seed scripts + db.ts**
1. Update `prisma/seed.ts` — create Organization + User, add `organizationId` to all records
2. Update `src/lib/db.ts` — remove NODE_ENV-based switching, single PostgreSQL datasource
3. Delete `prisma/schema.prod.prisma` and `prisma/dev.db`
4. Run `npx prisma db push` on demo Supabase
5. Run `npx tsx prisma/seed.ts` on demo Supabase

**Step 5 — Auth (new feature — RED → GREEN)**
1. Add `CredentialsProvider` to NextAuth config
2. Create `/api/auth/register` route
3. Create User model API tests (new files)
4. Implement User CRUD routes
5. Run full test suite → all green

**Step 6 — CI/CD + Vercel**
1. Update `.github/workflows/ci.yml` — single branch, remove `validate-prod-schema` job
2. Configure Vercel Preview Environment Variables
3. Merge `deploy/portfolio` into `main`, delete branch

---

## Phase 1 — Prisma Schema Migration (PostgreSQL-Only)

### 1.1 Unify Schema

**Action:** Merge `schema.prod.prisma` into `schema.prisma`, replacing SQLite with PostgreSQL.

**Current state:**
```
prisma/schema.prisma      → SQLite (dev)
prisma/schema.prod.prisma → PostgreSQL/Supabase (prod)
```

**Target state:**
```
prisma/schema.prisma      → PostgreSQL/Supabase (all environments)
```

**Changes to `prisma/schema.prisma`:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Keep the `@@map` table names and `@map` column names from `schema.prod.prisma` (snake_case for PostgreSQL convention).

**Delete after merge:**
- `prisma/schema.prod.prisma`
- `prisma/dev.db` (SQLite file)

### 1.2 Add Multi-Tenant Models

Add 4 new models to the unified schema:

```prisma
// User — application-level user (separate from NextAuth)
model User {
  id                String   @id @default(cuid())
  email             String   @unique
  name              String
  passwordHash      String?
  avatar            String?
  googleId          String?  @unique
  lastLoginAt       DateTime?
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  organizations     UserOrganization[]

  @@map("users")
}

// Organization — tenant isolation unit
model Organization {
  id                String   @id @default(cuid())
  name              String
  slug              String   @unique
  whatsappPhone     String?  @map("whatsapp_phone")
  whatsappToken     String?  @map("whatsapp_token")
  whatsappPhoneId   String?  @map("whatsapp_phone_id")
  plan              String   @default("solo") // solo, pro, agency
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  members           UserOrganization[]
  clients           Client[]
  deals             Deal[]
  packages          Package[]
  proposalTemplates ProposalTemplate[]
  dashboardSettings DashboardSettings[]
  grantedShares     ClientShare[] @relation("GrantedShares")
  receivedShares    ClientShare[] @relation("ReceivedShares")

  @@map("organizations")
}

// UserOrganization — many-to-many with role
model UserOrganization {
  id              String   @id @default(cuid())
  userId          String   @map("user_id")
  organizationId  String   @map("organization_id")
  role            String   @default("owner") // owner, admin, member, viewer
  createdAt       DateTime @default(now()) @map("created_at")

  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([userId, organizationId])
  @@index([userId])
  @@index([organizationId])
  @@map("user_organizations")
}

// ClientShare — cross-org collaboration
model ClientShare {
  id              String   @id @default(cuid())
  clientId        String   @map("client_id")
  organizationId  String   @map("organization_id")  // which org gets access
  grantedBy       String   @map("granted_by")       // which user shared it
  createdAt       DateTime @default(now()) @map("created_at")

  client          Client       @relation(fields: [clientId], references: [id], onDelete: Cascade)
  organization    Organization @relation("GrantedShares", fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([clientId, organizationId])
  @@index([clientId])
  @@index([organizationId])
  @@map("client_shares")
}
```

### 1.3 Add `organizationId` to All Existing Models

Every existing model gets `organizationId` + an index. Example for `Client`:

```prisma
model Client {
  id              String   @id @default(cuid())
  organizationId  String   @map("organization_id")  // ← NEW
  phone           String   @unique
  name            String
  // ... rest of fields ...

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])  // ← NEW
  @@index([status])
  @@map("clients")
}
```

**Models requiring `organizationId`:**

| Model | FK Relationship |
|---|---|
| `Client` | `Client.organization → Organization` |
| `Deal` | `Deal.organization → Organization` |
| `Briefing` | Indirect via `Deal` — NO `organizationId` needed (accessed through Deal) |
| `Expense` | Indirect via `Deal` — NO `organizationId` needed |
| `Revenue` | Indirect via `Deal` — NO `organizationId` needed |
| `Conversation` | `Conversation.organization → Organization` |
| `Message` | Indirect via `Conversation` — NO `organizationId` needed |
| `Booking` | `Booking.organization → Organization` |
| `Document` | `Document.organization → Organization` |
| `Template` | `Template.organization → Organization` |
| `Package` | `Package.organization → Organization` |
| `ProposalTemplate` | `ProposalTemplate.organization → Organization` |
| `Proposal` | `Proposal.organization → Organization` |
| `DashboardSettings` | `DashboardSettings.organization → Organization` |

> **Design decision:** Only **top-level** models get `organizationId`. Child models (Briefing, Expense, Revenue, Message) are accessed through their parent (Deal, Conversation) and inherit org isolation implicitly. This avoids redundant foreign keys and keeps queries clean.

### 1.4 Supabase-Specific Schema Considerations

Per [Supabase Postgres Best Practices](../../.claude/skills/supabase-postgres-best-practices):

- **Enable RLS on all tables** — even though Phase 1 is server-side only (Prisma uses the `service_role` key), RLS should be enabled from day one as defense in depth
- **Index all foreign keys** — `organizationId` gets a `@@index` on every model that has it
- **Connection pooling** — Supabase provides a connection pooler URL. Use the pooler URL for Vercel serverless functions (transaction-mode), direct URL for long-running scripts (seed, migrations)
- **`@@map` for snake_case** — Keep PostgreSQL convention of snake_case column names mapped to camelCase in Prisma

### 1.5 Connection String Setup

```
# Supabase provides two connection strings per project:
#
# Direct (for migrations, seed scripts, long-running operations):
#   postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
#
# Pooler (for Vercel serverless functions — transaction mode):
#   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
#
# .env.local (development):
DATABASE_URL="postgresql://postgres.demo:[password]@db.demo.supabase.co:5432/postgres"
#
# Vercel Production Env Var:
DATABASE_URL="postgresql://postgres.prod:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
#
# Vercel Preview Env Var:
DATABASE_URL="postgresql://postgres.demo:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
```

---

## Phase 2 — Auth Migration (CredentialsProvider + Google)

### 2.1 Update NextAuth Config

**File:** `src/app/api/auth/[...nextauth]/route.ts`

Add `CredentialsProvider` alongside existing `GoogleProvider`:

```typescript
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from '@/lib/db';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.NEXTAUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.NEXTAUTH_GOOGLE_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.passwordHash) {
          return null;
        }
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      // For Google sign-in: create User record if first time
      if (account?.provider === "google") {
        await db.user.upsert({
          where: { email: user.email! },
          update: { googleId: user.id, name: user.name!, avatar: user.image, lastLoginAt: new Date() },
          create: { email: user.email!, googleId: user.id, name: user.name!, avatar: user.image },
        });
      }
      // For credentials: user already exists in DB, update lastLoginAt
      if (account?.provider === "credentials") {
        await db.user.update({
          where: { email: user.email! },
          data: { lastLoginAt: new Date() },
        });
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
  },
});
```

### 2.2 New Dependencies

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

### 2.3 New API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/register` | POST | Create User + Organization + UserOrganization in one transaction |
| `/api/auth/me` | GET | Return current user with their organization |
| `/api/demo/reset` | POST | Wipe and re-seed demo database (checks env before executing) |

### 2.4 Registration Flow

```
POST /api/auth/register
Body: { email, password, name, businessName }

Transaction:
  1. Hash password (bcryptjs, salt rounds: 12)
  2. Create User
  3. Create Organization (slug: slugify(businessName))
  4. Create UserOrganization (role: "owner")
  5. Return user (without passwordHash)
```

### 2.5 Auth Middleware (Phase 1 — lightweight)

Add middleware to protect API routes. Phase 1 checks only "is authenticated." Phase 2 adds organization isolation.

**File:** `src/middleware.ts` (new)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/register', '/api/auth'];
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check JWT
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    // API routes → 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Page routes → redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 2.6 New Environment Variables

| Variable | Production | Preview (Demo) |
|---|---|---|
| `NEXTAUTH_SECRET` | Strong random string | Same or different |
| `NEXTAUTH_GOOGLE_ID` | Real Google OAuth client ID | Optional (can disable) |
| `NEXTAUTH_GOOGLE_SECRET` | Real Google OAuth client secret | Optional (can disable) |
| `NEXTAUTH_URL` | `https://your-domain.com` | `https://your-app-git-*.vercel.app` |

---

## Phase 3 — Update `db.ts`

**File:** `src/lib/db.ts`

Remove the `NODE_ENV`-based datasource switching. Single PostgreSQL datasource:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

No more `datasources` override. The `DATABASE_URL` env var does all the routing.

---

## Phase 4 — Seed Script Update

### 4.1 Update `prisma/seed.ts`

The seed script must:
1. Create an `Organization` (e.g., "GoTake Studio")
2. Create a demo `User` (e.g., `demo@gotakecrm.com` / `hashed_password`)
3. Create a `UserOrganization` (role: "owner")
4. Add `organizationId` to all `Client` creates
5. Add `organizationId` to all `Deal` creates
6. Add `organizationId` to all `Booking`, `Package`, `ProposalTemplate`, `DashboardSettings` creates

**Password for demo user:**
```typescript
import bcrypt from 'bcryptjs';
const demoPasswordHash = await bcrypt.hash('demo2026', 12);
```

### 4.2 Update `prisma/seed-proposals.ts` and `prisma/seed-revenues.ts`

Same pattern — add `organizationId` to all record creates. These scripts should accept the `organizationId` as a parameter or look it up by slug.

### 4.3 Seed Order (respects FK constraints)

```
1. DashboardSettings (no FK)
2. Template (no FK)
3. Organization (no FK)
4. User (no FK)
5. UserOrganization (FK: user, organization)
6. Client (FK: organization)
7. Package (FK: organization)
8. ProposalTemplate (FK: organization)
9. Deal (FK: client, organization)
10. Briefing (FK: deal)
11. Expense (FK: deal)
12. Revenue (FK: deal)
13. Booking (FK: client, organization, deal?)
14. Conversation (FK: client, organization)
15. Message (FK: conversation)
16. Document (FK: client, organization, deal?)
17. Proposal (FK: client, organization, deal?, template?)
18. ClientShare (FK: client, organization)
```

---

## Phase 5 — Test Suite Updates

### 5.1 `src/__tests__/setup.ts`

Add 4 new model mocks:

```typescript
vi.mock('@/lib/db', () => ({
  db: {
    // Existing models (unchanged)
    client: createModelMock(),
    deal: createModelMock(),
    booking: createModelMock(),
    expense: createModelMock(),
    revenue: createModelMock(),
    package: createModelMock(),
    proposal: createModelMock(),
    proposalTemplate: createModelMock(),
    briefing: createModelMock(),
    document: createModelMock(),
    conversation: createModelMock(),
    message: createModelMock(),
    dashboardSettings: createModelMock(),
    $transaction: vi.fn(),
    // NEW models
    user: createModelMock(),
    organization: createModelMock(),
    userOrganization: createModelMock(),
    clientShare: createModelMock(),
  },
}));
```

### 5.2 Validation Tests (`src/__tests__/unit/validations.test.ts`)

Add `organizationId` validation to all create/update schemas:

```typescript
// Every create schema must accept organizationId
expect(() => clientCreateSchema.parse({
  ...validClientData,
  organizationId: 'org_1',  // ← new required field
})).not.toThrow();
```

### 5.3 Integration Tests — Mock Data Pattern

All mock data objects need `organizationId`. Example for `api-clients.test.ts`:

```typescript
const mockClients = [
  {
    id: 'cl_1',
    organizationId: 'org_1',  // ← NEW
    phone: '+5511999999999',
    name: 'Alice',
    // ... rest unchanged
  },
];
```

**Files to update (11 total):**

| File | Model(s) affected |
|---|---|
| `api-clients.test.ts` | Client |
| `api-clients-id.test.ts` | Client |
| `api-deals.test.ts` | Deal |
| `api-deals-id.test.ts` | Deal |
| `api-expenses.test.ts` | Expense |
| `api-revenues.test.ts` | Revenue |
| `api-bookings.test.ts` | Booking |
| `api-proposal-templates.test.ts` | ProposalTemplate |
| `api-packages.test.ts` | Package |
| `api-proposals.test.ts` | Proposal |
| `api-dashboard.test.ts` | DashboardSettings |

### 5.4 New Test Files Needed

| New Test File | Tests |
|---|---|
| `src/__tests__/integration/api-auth-register.test.ts` | Registration flow (create User + Org + UserOrg) |
| `src/__tests__/integration/api-auth-me.test.ts` | Current user retrieval |
| `src/__tests__/integration/api-users.test.ts` | User CRUD (if applicable) |
| `src/__tests__/unit/auth.test.ts` | Password hashing, JWT validation |

---

## Phase 6 — CI/CD & Vercel Deployment

### 6.1 Merge `deploy/portfolio` into `main`

```bash
git checkout main
git merge deploy/portfolio
# Resolve any conflicts
git push origin main
git branch -d deploy/portfolio
git push origin --delete deploy/portfolio
```

### 6.2 Update CI Workflow

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm run build
      - run: npm run test

  # validate-prod-schema job REMOVED — no more dual schema
```

Changes:
- Remove `deploy/portfolio` from branch triggers
- Remove `validate-prod-schema` job entirely
- Single Prisma generate (one schema only)

### 6.3 Vercel Environment Variables

Configure in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Production Value | Preview Value |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.prod:[pwd]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres` | `postgresql://postgres.demo:[pwd]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres` |
| `NEXTAUTH_SECRET` | `[strong-random-string]` | `[same-or-different]` |
| `NEXTAUTH_GOOGLE_ID` | `[real-client-id]` | Leave empty or set |
| `NEXTAUTH_GOOGLE_SECRET` | `[real-client-secret]` | Leave empty or set |
| `NEXTAUTH_URL` | `[production-domain]` | Auto-set by Vercel Preview |
| `NODE_ENV` | `production` | `production` |

### 6.4 Vercel `vercel.json` Update

The build command stays the same — Prisma generates against the schema, Vercel injects the correct `DATABASE_URL` per environment:

```json
{
  "buildCommand": "prisma generate && next build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["gru1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

### 6.5 Deployment Flow (Final State)

```
Developer pushes to main
  → GitHub CI runs (type check, lint, build, test)
  → Vercel deploys:
      • Production deployment → gotakecrm-prod (DATABASE_URL from Production env vars)
      • Preview deployment  → gotakecrm-demo (DATABASE_URL from Preview env vars)
```

---

## Phase 7 — Supabase Project Setup

### 7.1 Create Projects

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create `gotakecrm-prod` — choose `sa-east-1` (São Paulo) region
3. Create `gotakecrm-demo` — same region
4. Note the project reference for each (e.g., `abcdefghij`, `klmnopqrst`)

### 7.2 Get Connection Strings

For each project:
1. **Project Settings → Database → Connection string → URI**
2. Copy the connection string
3. Replace `[YOUR-PASSWORD]` with the database password you set

**Important:** Use the **pooler** connection string for Vercel serverless, **direct** for local dev/seed scripts.

### 7.3 Run Schema Migration

```bash
# Against demo project (local development)
DATABASE_URL="postgresql://postgres.demo:[pwd]@db.demo.supabase.co:5432/postgres" \
  npx prisma db push

# Seed the demo database
DATABASE_URL="postgresql://postgres.demo:[pwd]@db.demo.supabase.co:5432/postgres" \
  npx tsx prisma/seed.ts

# Against prod project (only after CI passes)
DATABASE_URL="postgresql://postgres.prod:[pwd]@db.prod.supabase.co:5432/postgres" \
  npx prisma db push
```

### 7.4 Supabase Dashboard — Enable RLS

For each table in both projects:
1. Go to **Authentication → Policies**
2. Enable RLS on all tables
3. For Phase 1, add a permissive policy (Prisma uses `service_role` key which bypasses RLS, but enabling it now is defense in depth):

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_shares ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Phase 1: service_role bypasses RLS automatically
-- Phase 2: Add proper org-scoped policies
```

---

## Implementation Order (Sequential)

```
Phase 0 → Test impact analysis (DONE — this document)
Phase 1 → Prisma schema migration (schema.prisma only)
Phase 2 → db.ts update (remove NODE_ENV switching)
Phase 3 → Test suite updates (setup.ts → validations → integration → components)
Phase 4 → Auth migration (CredentialsProvider + register route)
Phase 5 → Seed script updates (add Organization, User, organizationId)
Phase 6 → Supabase project setup + schema push + seed
Phase 7 → CI/CD update (merge branches, update workflow)
Phase 8 → Vercel environment variables + deployment verification
```

---

## Files Changed Summary

| Action | File(s) |
|---|---|
| **DELETE** | `prisma/schema.prod.prisma`, `prisma/dev.db` |
| **REWRITE** | `prisma/schema.prisma` — unified PostgreSQL + new models |
| **REWRITE** | `src/lib/db.ts` — remove NODE_ENV switching |
| **REWRITE** | `src/app/api/auth/[...nextauth]/route.ts` — add CredentialsProvider |
| **REWRITE** | `src/__tests__/setup.ts` — add 4 new model mocks |
| **UPDATE** | `src/lib/validations.ts` — add `organizationId` to schemas |
| **UPDATE** | `prisma/seed.ts` — add Org + User + organizationId |
| **UPDATE** | `prisma/seed-proposals.ts` — add organizationId |
| **UPDATE** | `prisma/seed-revenues.ts` — add organizationId |
| **UPDATE** | All 11 integration test files — add `organizationId` to mock data |
| **UPDATE** | `src/__tests__/unit/validations.test.ts` — add organizationId tests |
| **UPDATE** | Component tests — add organizationId to props |
| **UPDATE** | `.github/workflows/ci.yml` — single branch, remove prod schema job |
| **CREATE** | `src/app/api/auth/register/route.ts` |
| **CREATE** | `src/app/api/auth/me/route.ts` |
| **CREATE** | `src/app/api/demo/reset/route.ts` |
| **CREATE** | `src/middleware.ts` |
| **CREATE** | 3-4 new test files for auth routes |
| **CONFIG** | Vercel environment variables (Production + Preview) |

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Demo Supabase gets trashed during dev | Re-seed with one command (`npx tsx prisma/seed.ts`) |
| Migration breaks production | Schema changes go to demo first; CI must pass before prod deploy |
| `organizationId` missed on a model = data leak | Integration tests verify org isolation; code review checklist |
| CredentialsProvider weak passwords | Validation: min 8 chars, zod schema enforced |
| Vercel Preview uses wrong DATABASE_URL | Preview Environment Variables configured separately in Vercel dashboard |
