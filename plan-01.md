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
