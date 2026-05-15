# GoTakeCRM -- R&D Production Readiness Report

**Project**: GoTakeCRM - CRM Dashboard for Filmmakers & Photographers
**Date**: May 2026
**Evaluated by**: Claude Code (Next.js Best Practices + Vercel React Best Practices)
**Overall Status**: NOT PRODUCTION-READY

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [Architecture & Next.js Best Practices](#3-architecture--nextjs-best-practices)
4. [React & Vercel Performance](#4-react--vercel-performance)
5. [Security Audit](#5-security-audit)
6. [Database & Data Layer](#6-database--data-layer)
7. [Code Quality & Maintainability](#7-code-quality--maintainability)
8. [Missing Production Features](#8-missing-production-features)
9. [Improvement Roadmap](#9-improvement-roadmap)
10. [Questions & Uncertainties](#10-questions--uncertainties)

---

## 1. Executive Summary

GoTakeCRM has achieved a functional MVP with 6 views (Dashboard, Clients, Pipeline, Proposals, Financials, Calendar), a polished glassmorphism UI, and basic CRUD operations for all core entities. The feature scope is well-aligned with the original plan's production dashboard goals.

However, the application has **13 critical issues** and **8 high-severity issues** that block production deployment. The most impactful problems are:

- **Zero authentication or authorization** -- all API routes are publicly accessible
- **Entire app shipped as a single client component** (~1,913 lines) -- no Server Components, no code splitting, no route-based splitting
- **SQLite as production database** -- single-writer lock, no replication, no horizontal scaling
- **No error boundaries, no loading states, no `not-found` pages**
- **12+ unused npm dependencies** inflating the install footprint
- **No input validation** despite Zod being installed

**Estimated effort to production**: Significant structural refactor required. The UI and feature set are ready; the architecture is not.

---

## 2. Current State Assessment

### 2.1 What Works Well

| Area | Assessment | Details |
|------|-----------|---------|
| UI/UX Design | Strong | Glassmorphism theme, warm neutrals, fluid animations |
| Feature Completeness | Good | 6 views, full CRUD for Clients, Deals, Expenses, Revenue, Proposals, Bookings |
| Prisma Schema | Well-designed | 14 models with proper relationships, JSON fields for flexibility |
| shadcn/ui Integration | Correct | 34+ UI components properly installed and used |
| Dark Mode | Working | next-themes with proper ThemeProvider |
| Font Optimization | Good | next/font/google with Geist family, CSS variables |
| Drag & Drop | Functional | @dnd-kit for pipeline Kanban board |
| Toast Notifications | Working | Sonner integration for user feedback |

### 2.2 Technical Stack

| Technology | Version | Status |
|-----------|---------|--------|
| Next.js | 16.1.1 | Installed, App Router used but not leveraged |
| React | 19.0.0 | Current |
| TypeScript | 5.x | Used but with `noImplicitAny: false` |
| Prisma | 6.11.1 | Working, SQLite provider |
| Tailwind CSS | 4.x | Working |
| shadcn/ui | Latest | 34 components installed |
| Recharts | Latest | Charts rendering correctly |

### 2.3 File Statistics

- **Main page**: `src/app/page.tsx` -- 1,913 lines (monolithic)
- **Largest components**: `proposals-view.tsx` (1,195 lines), `expense-manager.tsx` (442 lines), `revenue-manager.tsx` (515 lines)
- **API routes**: 9 route groups, 16 route files
- **Custom components**: 16 components (all `'use client'`)
- **UI components**: 34 shadcn/ui components

---

## 3. Architecture & Next.js Best Practices

### CRITICAL: RSC Boundaries

**Problem**: The entire application is a single `~1,913`-line client component.

```
src/app/page.tsx:1
'use client';
```

This single directive means:
- Zero server-side rendering benefits from Next.js App Router
- All 16 custom components + 34 shadcn components are shipped as JavaScript
- All data fetching happens on the client via `fetch()` to API routes
- No streaming, no Suspense boundaries, no progressive rendering
- The initial HTML payload is essentially empty -- the browser must download, parse, and execute all JavaScript before anything renders

**Why this matters for production**:
- **First Contentful Paint (FCP)**: Users see a blank page until all JS loads
- **Largest Contentful Paint (LCP)**: Severely degraded
- **Time to Interactive (TTI)**: 1,913 lines of JS must execute before interaction
- **Core Web Vitals**: Will fail Google's thresholds

**Recommendation**: Split into proper Next.js file-based routes. `page.tsx` should be a Server Component that fetches data directly via Prisma. Only interactive leaf components need `'use client'`.

**Correct architecture**:
```
src/app/
  page.tsx              -- Server Component (redirect to /dashboard)
  dashboard/
    page.tsx            -- Server Component (fetch KPIs)
    loading.tsx         -- Suspense fallback
    error.tsx           -- Error boundary
  clients/
    page.tsx            -- Server Component (fetch clients)
    loading.tsx
    error.tsx
  pipeline/
    page.tsx            -- Server Component (fetch deals)
    loading.tsx
    error.tsx
  ...
```

### CRITICAL: No Route-Based Navigation

The app uses client-side state instead of Next.js file-based routing:

```typescript
// src/app/page.tsx
const [activeView, setActiveView] = useState('dashboard');
// ...
{activeView === 'clients' && (...)}
{activeView === 'pipeline' && (...)}
```

**Impact**:
- No URL-based navigation (`/clients`, `/pipeline` etc. don't exist)
- No browser history -- back button doesn't work between views
- No deep linking -- users can't bookmark or share specific views
- No SEO -- search engines see one URL
- No analytics -- can't track which views users visit

**Recommendation**: Migrate to `src/app/(dashboard)/clients/page.tsx` etc. with proper `<Link>` components.

### HIGH: No Dynamic Imports

Zero usage of `next/dynamic` or `React.lazy`. Heavy components are statically imported even when their views aren't visible:

```typescript
import { ProposalsView } from '@/components/proposals-view';       // 1,195 lines
import { ExpenseManager } from '@/components/expense-manager';      // 442 lines
import { RevenueManager } from '@/components/revenue-manager';      // 515 lines
```

These are massive components loaded unconditionally.

**Recommendation**:
```typescript
const ProposalsView = dynamic(() => import('@/components/proposals-view'), {
  loading: () => <Skeleton />,
});
```

### HIGH: No `error.tsx`, `loading.tsx`, or `not-found.tsx`

None of Next.js's convention files exist:
- No `error.tsx` -- any runtime error crashes the entire app with a white screen
- No `loading.tsx` -- no streaming SSR or Suspense boundaries
- No `not-found.tsx` -- no 404 handling

**Recommendation**: Create these files for every route segment.

### MEDIUM: Metadata Configuration

Good: Fonts use `next/font/google` correctly. Metadata export exists with OpenGraph tags.

Issues:
- OpenGraph `url` and `siteName` are empty strings (`src/app/layout.tsx:28-29`)
- Favicon points to external CDN `https://z-cdn.chatglm.cn/z-ai/static/logo.svg` -- likely a leftover
- No `robots.txt` content (file exists but may be empty)
- No sitemap.xml
- Language inconsistency: UI has Portuguese labels (`novo`, `contando`) but `lang="en"` and metadata in English

---

## 4. React & Vercel Performance

### CRITICAL: No Memoization

**Finding**: Zero usage of `React.memo`, `useMemo`, or `useCallback` across the entire codebase.

```bash
# grep results for memoization patterns
React.memo     -> 0 results
useMemo        -> 0 results
useCallback    -> 0 results
```

With a 1,913-line component managing 6 views, every state change re-renders everything. For example, typing in a search field re-renders all charts, the calendar, the pipeline board, and every KPI card.

**Recommendation**: At minimum, memoize:
- Chart components (Recharts is expensive to re-render)
- Deal cards in the pipeline (re-render on every drag event)
- Filtered/sorted lists (clients, deals)
- Format functions called in render (formatCurrency)

### CRITICAL: Data Fetching Anti-Patterns

**Client-side waterfall**: Three parallel `fetch()` calls fire on mount:

```typescript
// src/app/page.tsx:354-358
useEffect(() => {
  fetchDashboardData();
  fetchClients();
  fetchDeals();
}, []);
```

Each request: Browser -> API Route (same server) -> Prisma -> JSON serialization -> Response. This entire round-trip is unnecessary when using Server Components.

**Repeated full re-fetches on every mutation**:

```typescript
// src/app/page.tsx:421-435
if (response.ok) {
  fetchClients();
  fetchDashboardData();
}
```

A single client update triggers re-fetching of ALL clients AND ALL dashboard data. No cache invalidation strategy.

**N+1-style dashboard queries** (`src/app/api/dashboard/route.ts:7-34`):
```typescript
const deals = await db.deal.findMany({...});     // Query 1
const clients = await db.client.findMany();       // Query 2
const bookings = await db.booking.findMany({...}); // Query 3
const expenses = await db.expense.findMany();      // Query 4
const revenue = await db.revenue.findMany();        // Query 5
```

Not wrapped in `Promise.all()`. All aggregation is done in JavaScript on full result sets instead of using Prisma `groupBy` or SQL aggregation.

**Duplicate fetching**: `ExpenseManager`, `RevenueManager`, and `ProposalsView` each mount and independently fetch data that the parent already fetched.

**Recommendation**:
1. Use Server Components for initial data fetch (direct Prisma calls, zero HTTP overhead)
2. Use **SWR** (`swr`, by Vercel) for client-side mutations with cache invalidation (Phase 3 -- to be installed then)
3. Use `Promise.all()` for parallel queries
4. Use Prisma `groupBy` and `_sum` for aggregation instead of fetching all records

### HIGH: No List Virtualization

Client and deal lists render all records without virtualization. As data grows (100+ clients), this will cause significant rendering delays.

**Recommendation**: Implement pagination with shadcn's `PaginationTable` component (already installed). For lists exceeding 100+ items, consider `react-virtuoso` as a virtualization library.

### HIGH: Animation Performance

The glassmorphism effects use `backdrop-filter: blur()` which is GPU-intensive. Combined with `will-change` properties and multiple animated gradient orbs, this can cause jank on lower-end devices.

**Current CSS** (`src/app/globals.css`):
```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
```

**Recommendation**:
- Use `contain: layout style paint` on glass cards
- Reduce blur radius to 12-16px (20px is excessive)
- Disable backdrop-filter on mobile devices (< 768px)
- Use `transform: translateZ(0)` to promote to GPU layer

### MEDIUM: No `next/image` Usage

No `next/image` usage anywhere in the project. Avatar images use raw `<img>` via shadcn's `AvatarImage`:

```typescript
<AvatarImage src={deal.client.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${deal.client.name}`} />
```

External DiceBear URLs are fetched on every render with no caching.

**Recommendation**: Configure `next.config.ts` with `images.remotePatterns` for DiceBear and use `next/image` where possible.

### MEDIUM: Unused Dependencies Bloat

**12+ dependencies installed but never imported in any source file**:

| Package | Size Impact | Status |
|---------|------------|--------|
| `@tanstack/react-query` | ~45KB | Installed, never used |
| `@tanstack/react-table` | ~35KB | Installed, never used |
| `react-hook-form` | ~25KB | Installed, never used |
| `@hookform/resolvers` | ~5KB | Installed, never used |
| `next-auth` | ~50KB | Installed, never configured |
| `next-intl` | ~30KB | Installed, never used |
| `framer-motion` | ~80KB | Installed, never imported |
| `react-markdown` | ~15KB | Installed, never used |
| `react-syntax-highlighter` | ~40KB | Installed, never used |
| `@mdxeditor/editor` | ~200KB+ | Installed, never used |
| `uuid` | ~5KB | Installed, never used |
| `zustand` | ~3KB | Installed, never used |
| `z-ai-web-dev-sdk` | Unknown | Installed, purpose unclear |

**Combined estimated bloat**: ~530KB+ in node_modules.

**Recommendation**: Remove all unused dependencies. Re-install only when needed.

---

## 5. Security Audit

### CRITICAL: No Authentication

`next-auth` is installed but **never configured**. There are:
- No `src/app/api/auth/[...nextauth]/route.ts`
- No `src/middleware.ts` for route protection
- No session validation
- No login page
- No protected routes

**Impact**: Anyone who can reach the server can read all client data (names, emails, phone numbers), access financial data (revenue, expenses), and create/update/delete any record.

**Recommendation**: Configure NextAuth with a provider (e.g., Google OAuth for solo users, or credentials for multi-user). Add `middleware.ts` to protect all routes except `/auth/*`.

### CRITICAL: Mass Assignment Vulnerability

```typescript
// src/app/api/deals/route.ts:79-97
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...data } = body;
  const deal = await db.deal.update({
    where: { id },
    data,  // Spreads entire body into update!
  });
}
```

An attacker could set any field including `createdAt`, `updatedAt`, or `clientId` to reassign deals to different clients.

**Recommendation**: Whitelist specific fields:
```typescript
const { title, description, status, value } = body;
await db.deal.update({ where: { id }, data: { title, description, status, value } });
```

### CRITICAL: No Input Validation

All API routes accept raw `request.json()` without validation. `zod` is installed but never used.

```typescript
// src/app/api/clients/route.ts:62-84
const body = await request.json(); // No validation!
const client = await db.client.create({
  data: {
    phone: body.phone,       // Could be undefined, wrong type
    name: body.name,          // No length check
    email: body.email || null, // No email format validation
    eventType: body.eventType, // No enum validation
  },
});
```

**Recommendation**: Define Zod schemas for every entity:
```typescript
const ClientSchema = z.object({
  phone: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  eventType: z.enum(['wedding', 'corporate', 'portrait', 'product', 'other']),
});
```

### HIGH: No CSRF Protection

All mutation endpoints accept requests from any origin without CSRF tokens or `SameSite` cookie enforcement.

### HIGH: No Rate Limiting

No rate limiting on any API route. An attacker could brute-force create thousands of records or perform DoS attacks.

**Recommendation**: Add `next-rate-limit` or implement rate limiting in `middleware.ts`.

### HIGH: Destructive Operations Not Transactional

```typescript
// src/app/api/clients/[id]/route.ts:65-93
await db.document.deleteMany({ where: { clientId: id } });
await db.booking.deleteMany({ where: { clientId: id } });
// ... more deletes
```

If one delete fails, data is left in an inconsistent state. No soft-delete option. No audit trail.

**Recommendation**: Wrap in `$transaction()` and consider soft-delete with a `deletedAt` field.

---

## 6. Database & Data Layer

### CRITICAL: SQLite for Production

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

SQLite limitations for production:
- **Single-writer lock**: Only one write at a time. With concurrent WhatsApp webhooks + dashboard operations, this becomes a bottleneck immediately.
- **No replication**: Cannot scale reads horizontally.
- **No built-in backups**: File-based storage is vulnerable to corruption.
- **No row-level security**: Cannot restrict data access per user.
- **No full-text search**: The `search` filter in clients API does LIKE queries -- will be slow at scale.

**Recommendation**: Migrate to PostgreSQL (Supabase as planned). Prisma makes this straightforward:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### HIGH: Query Logging Enabled in Production

```typescript
// src/lib/db.ts:10
new PrismaClient({
  log: ['query'],
})
```

This logs every SQL query to the console unconditionally. In production, this impacts performance and may expose sensitive data.

**Recommendation**:
```typescript
new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
})
```

### HIGH: No Database Indexes

The Prisma schema has no `@@index` or `@@unique` declarations beyond the default `@id` indexes. Common query patterns that need indexes:

- `deals.status` -- filtered in every pipeline query
- `deals.clientId` -- joined in every deal query
- `expenses.dealId` -- joined in every expense query
- `clients.status` -- filtered in client list
- `bookings.eventDate` -- filtered in calendar queries
- `bookings.status` -- filtered in booking queries

### MEDIUM: No Environment Configuration

- No `.env` or `.env.example` file exists
- `DATABASE_URL` is undocumented
- No server-only variable enforcement

### MEDIUM: In-Memory Aggregation

Dashboard KPIs are calculated in JavaScript after fetching ALL records:

```typescript
// src/app/api/dashboard/route.ts:36-85
const totalRevenue = revenue
  .filter(r => r.status === 'received')
  .reduce((sum, r) => sum + r.amount, 0);
```

This does not scale. As data grows, every dashboard load fetches every revenue/expense record ever created and processes them in memory.

**Recommendation**: Use Prisma aggregation:
```typescript
const { _sum } = await db.revenue.aggregate({
  _sum: { amount: true },
  where: { status: 'received' },
});
```

---

## 7. Code Quality & Maintainability

### HIGH: Duplicated Types Across 6+ Files

| Type/Function | Files Where Duplicated |
|--------------|----------------------|
| `Client` interface | page.tsx, client-form-modal.tsx, global-search.tsx, proposals-view.tsx |
| `Deal` interface | page.tsx, deal-form-modal.tsx, expense-manager.tsx, proposals-view.tsx, draggable-deal-card.tsx, global-search.tsx |
| `formatCurrency()` | page.tsx, deal-form-modal.tsx, expense-manager.tsx, revenue-manager.tsx, proposals-view.tsx, briefing-modal.tsx, client-activity-timeline.tsx, global-search.tsx |
| `statusColors` map | page.tsx, draggable-deal-card.tsx, global-search.tsx |
| `statusLabels` map | page.tsx, draggable-deal-card.tsx, global-search.tsx |

**Recommendation**: Create `src/types/index.ts` with shared interfaces derived from Prisma types. Move `formatCurrency`, `statusColors`, and `statusLabels` to `src/lib/utils.ts`.

### HIGH: TypeScript Configuration Weak

```json
// tsconfig.json:13
"noImplicitAny": false,
```

This disables implicit `any` type checking. Combined with explicit `any` usage:

```typescript
// src/app/page.tsx:326
const [editingBooking, setEditingBooking] = useState<any>(null);

// src/app/page.tsx:504
const handleSaveBooking = async (bookingData: any) => {
```

**Recommendation**: Enable `noImplicitAny: true` and use Prisma-generated types.

### HIGH: API Route Inconsistencies

| Issue | Details |
|-------|---------|
| Request type | Some routes use `NextRequest`, others use `Request` |
| Status codes | POST returns 200 instead of 201 (except revenues which correctly returns 201) |
| Error responses | No structured error codes (400 vs 422 vs 404) |
| Unused route | `/api/route.ts` is a scaffold "Hello, world!" -- should be removed |
| Non-standard PATCH | `/api/deals` PATCH on collection route instead of `/api/deals/[id]` |

### MEDIUM: Prisma Types Not Used

None of the API routes or components use Prisma-generated types. Everything is manually re-typed with varying accuracy.

```typescript
// Current: manual type that may drift from schema
interface Client {
  id: string;
  name: string;
  // ...
}

// Should use:
import { Client } from '@prisma/client';
```

---

## 8. Missing Production Features

### Critical Missing Features

| Feature | Status | Impact |
|---------|--------|--------|
| Authentication | Not implemented | Anyone can access all data |
| Authorization / RBAC | Not implemented | No role separation |
| CSRF Protection | Not implemented | Vulnerable to cross-site attacks |
| Rate Limiting | Not implemented | Vulnerable to DoS |
| Input Validation | Not implemented | Vulnerable to injection |
| Error Boundaries | Not implemented | White screen on errors |
| Loading States (convention) | Not implemented | No progressive rendering |
| Environment Configuration | Not implemented | No secrets management |
| Audit Logging | Not implemented | No trail of changes |

### High-Priority Missing Features

| Feature | Status | Notes |
|---------|--------|-------|
| Database Migrations | Seed scripts only | No versioned schema migration |
| Testing | Zero tests | No unit, integration, or e2e tests |
| CI/CD Pipeline | None configured | No automated quality gates |
| Error Tracking | Console only | No Sentry or similar |
| Logging | Console only | No structured logging |
| PDF Generation | Not implemented | Listed as future feature |
| Email Notifications | Not implemented | Listed as future feature |
| WhatsApp Integration | Mockup only | Core feature from plan |
| Real-time Updates | Polling/refetch only | No WebSocket or Supabase Realtime |

### Medium-Priority Missing Features

| Feature | Status | Notes |
|---------|--------|-------|
| Internationalization | next-intl installed but not used | UI has mixed EN/PT |
| Pagination | Installed but not used | All records fetched |
| Search (full-text) | LIKE queries only | Will degrade at scale |
| Backup Strategy | None | No data recovery plan |
| Monitoring/Analytics | None | No performance or usage tracking |
| Accessibility (a11y) | Partial | No audit performed |

---

## 9. Improvement Roadmap

### Phase 1: Critical Security & Foundation (Must-do before any deployment)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 1.1 | Configure NextAuth with **Google OAuth** provider | Critical | Medium |
| 1.2 | Create `middleware.ts` for route protection (single user, no RBAC needed) | Critical | Low |
| 1.3 | Add Zod validation to all API routes (already installed) | Critical | Medium |
| 1.4 | Fix mass assignment in deal/revenue update routes | Critical | Low |
| 1.5 | Wrap destructive operations in Prisma `$transaction()` | Critical | Low |
| 1.6 | Disable Prisma query logging in production (`db.ts`) | Critical | Low |
| 1.7 | Create `.env.example` with required variables | Critical | Low |
| 1.8 | Remove unused dependencies (DONE -- 10 packages removed) | ~~High~~ Done | ~~Low~~ |

### Phase 2: Architecture Refactor (Leverage Next.js App Router properly)

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 2.1 | Split `page.tsx` into file-based routes (`/dashboard`, `/clients`, `/pipeline`, `/proposals`, `/financials`, `/calendar`) | Critical | High |
| 2.2 | Convert page components to Server Components with direct Prisma calls | Critical | High |
| 2.3 | Create `error.tsx`, `loading.tsx`, `not-found.tsx` for each route | High | Medium |
| 2.4 | Create shared types file (`src/types/index.ts`) using Prisma-generated types | High | Medium |
| 2.5 | Add `next/dynamic` imports for heavy components | High | Medium |
| 2.6 | Configure dual database: SQLite for dev, Supabase PostgreSQL for prod (via `DATABASE_URL` env var) | High | Medium |
| 2.7 | Add database indexes for common queries | High | Low |

### Phase 3: Performance & Data Layer

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 3.1 | Install and implement **SWR** (`swr`) for client-side mutations with cache invalidation (replaces removed `@tanstack/react-query`) | High | Medium |
| 3.2 | Replace in-memory aggregation with Prisma `groupBy` / `_sum` | High | Medium |
| 3.3 | Add `React.memo`, `useMemo`, `useCallback` for expensive computations | High | Medium |
| 3.4 | Implement list virtualization or pagination | Medium | Medium |
| 3.5 | Configure `next/image` with remote patterns for DiceBear avatars | Medium | Low |
| 3.6 | Optimize CSS animations for mobile (reduce blur radius, add `contain`) | Medium | Low |
| 3.7 | Enable `noImplicitAny: true` in tsconfig | Medium | Medium |

### Phase 4: Production Hardening

| # | Task | Priority | Effort |
|---|------|----------|--------|
| 4.1 | Add rate limiting to API routes | High | Medium |
| 4.2 | Add CSRF protection | High | Medium |
| 4.3 | Implement audit logging | Medium | Medium |
| 4.4 | Add error tracking (Sentry) | Medium | Low |
| 4.5 | Add structured logging | Medium | Low |
| 4.6 | Set up CI/CD pipeline (Vercel + GitHub Actions) | Medium | Medium |
| 4.7 | Write integration tests for API routes | Medium | High |
| 4.8 | Translate Portuguese status labels to English (`novo`->`new`, `contando`->`quoting`, `producao`->`production`, `finalizado`->`completed`) | Medium | Low |
| 4.9 | Clean up metadata (add proper favicon, finalize OpenGraph) | Low | Low |
| 4.10 | Add robots.txt and sitemap.xml | Low | Low |

### Future Phases (Out of Scope for Now)

| Feature | Status |
|---------|--------|
| WhatsApp Cloud API integration | Phase 5 -- separate project |
| PDF generation & delivery | Phase 6 -- requires Supabase Storage |
| Cal.com calendar integration | Phase 7 -- keep custom calendar |
| Multi-user / RBAC | Phase 8 -- single user for now |
| Internationalization (EN/PT) | Phase 9 -- English only for now |

---

## 10. Resolved Architecture Decisions

The following decisions have been confirmed and are incorporated into the roadmap:

| # | Decision | Resolution |
|---|----------|-----------|
| 1 | Authentication provider | **NextAuth with Google OAuth** -- simpler for solo filmmakers, integrates with Google account |
| 2 | Database strategy | **Keep SQLite for local dev with mock data, migrate to Supabase PostgreSQL for production** via environment variable |
| 3 | Supabase scope | **Supabase for database only** -- API routes remain in Next.js (required for future WhatsApp integration) |
| 4 | Routing strategy | **Real URL routes** (`/dashboard`, `/clients`, `/pipeline`, `/proposals`, `/financials`, `/calendar`) |
| 5 | Language | **English only** -- no i18n, remove Portuguese status labels |
| 6 | Multi-tenant | **Single user for now** -- no tenant isolation needed, simplify auth |
| 7 | WhatsApp integration | **Not in scope** -- future phase |
| 8 | PDF generation | **Not in scope** -- future phase |
| 9 | Calendar integration | **Not in scope** -- keep custom calendar for now |
| 10 | Deployment target | **Vercel + Supabase** |

### Cleanup Actions Completed

| Action | Status |
|--------|--------|
| Removed `z-ai-web-dev-sdk` from package.json | Done |
| Removed `@mdxeditor/editor` from package.json | Done |
| Removed `framer-motion` from package.json | Done |
| Removed `react-markdown` from package.json | Done |
| Removed `react-syntax-highlighter` from package.json | Done |
| Removed `uuid` from package.json | Done |
| Removed `zustand` from package.json | Done |
| Removed `@tanstack/react-table` from package.json | Done |
| Removed `@reactuses/core` from package.json | Done |
| Removed `next-intl` from package.json | Done |
| Removed leftover favicon URL (`z-cdn.chatglm.cn`) from layout.tsx | Done |
| Removed `.zscripts/` directory | Done |

### Packages Kept (for upcoming implementation)

| Package | Reason |
|---------|--------|
| `next-auth` | Google OAuth authentication (Phase 1) |
| `zod` | API input validation (Phase 1) |
| `react-hook-form` | Used by shadcn `form.tsx` UI component |
| `@hookform/resolvers` | Zod resolver for react-hook-form |
| `swr` | **To be installed in Phase 3** -- Vercel's data fetching library, replaces `@tanstack/react-query` (removed for security concerns) |

---

## Appendix A: Severity Classification

| Level | Count | Definition |
|-------|-------|-----------|
| CRITICAL | 13 | Blocks production deployment. Must fix before any user-facing release. |
| HIGH | 8 | Significant impact on security, performance, or maintainability. Fix before launch. |
| MEDIUM | 7 | Quality-of-life improvements. Fix in first maintenance cycle. |
| LOW | 3 | Nice-to-have. Address when convenient. |

## Appendix B: Files Requiring Changes

### Must Modify

| File | Change |
|------|--------|
| `src/app/page.tsx` | Split into 6 route pages, convert to Server Components |
| `src/app/layout.tsx` | Add auth provider, fix metadata |
| `src/lib/db.ts` | Conditional logging, PostgreSQL support |
| `src/app/api/deals/route.ts` | Fix mass assignment, add validation |
| `src/app/api/clients/route.ts` | Add Zod validation, fix status codes |
| `src/app/api/dashboard/route.ts` | Prisma aggregation, Promise.all |
| `src/app/api/clients/[id]/route.ts` | Wrap deletes in transaction |
| `package.json` | Remove 12+ unused dependencies |
| `tsconfig.json` | Enable noImplicitAny |
| `next.config.ts` | Add image remote patterns |

### Must Create

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Auth + route protection |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth configuration |
| `src/types/index.ts` | Shared types from Prisma |
| `src/lib/validations.ts` | Zod schemas for all entities |
| `src/app/dashboard/page.tsx` | Dashboard as Server Component |
| `src/app/clients/page.tsx` | Clients as Server Component |
| `src/app/pipeline/page.tsx` | Pipeline as Server Component |
| `src/app/proposals/page.tsx` | Proposals as Server Component |
| `src/app/financials/page.tsx` | Financials as Server Component |
| `src/app/calendar/page.tsx` | Calendar as Server Component |
| `src/app/error.tsx` | Global error boundary |
| `src/app/not-found.tsx` | 404 page |
| `.env.example` | Environment variable documentation |

### Should Remove

| File | Reason | Status |
|------|--------|--------|
| `src/app/api/route.ts` | Unused scaffold "Hello, world!" | Pending |
| `.zscripts/` directory | Removed -- custom scripts no longer needed | Done |

### Dependencies Removed

| Package | Reason | Status |
|---------|--------|--------|
| `z-ai-web-dev-sdk` | Unused, unknown purpose | Done |
| `@mdxeditor/editor` | Unused, ~200KB+ | Done |
| `framer-motion` | Unused, ~80KB | Done |
| `react-markdown` | Unused, ~15KB | Done |
| `react-syntax-highlighter` | Unused, ~40KB | Done |
| `uuid` | Unused (Prisma generates CUIDs) | Done |
| `zustand` | Unused | Done |
| `@tanstack/react-table` | Unused | Done |
| `@tanstack/react-query` | **Security concern** -- removed, never used in code. Replacement: SWR (Phase 3) | Done |
| `@reactuses/core` | Unused | Done |
| `next-intl` | Unused (English only) | Done |
