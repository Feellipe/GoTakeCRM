# ADR-0003: Dual auth (CredentialsProvider + Google) and unified PostgreSQL schema

## Status

Accepted

## Context

The CRM initially had Google-only authentication via NextAuth. This locked out users without Google accounts and meant all user identity data lived in Google's systems rather than the application's own database.

Additionally, the project maintained two Prisma schemas: `schema.prisma` (SQLite for local dev) and `schema.prod.prisma` (PostgreSQL for Supabase production). This created schema drift risk and meant development didn't match production's database engine.

## Decision

### Authentication
- Add `CredentialsProvider` (email/password) alongside the existing `GoogleProvider` in NextAuth
- Create a `User` table in Supabase to own user data (email, name, password hash, avatar)
- Both auth methods coexist — users choose their preference at sign up / sign in
- The `CredentialsProvider` also enables the portfolio demo to use a shared demo credential

### Database unification
- Drop SQLite entirely — unified single `schema.prisma` using PostgreSQL
- Local development connects to the `gotakecrm-demo` Supabase project
- No more `schema.prod.prisma` — one schema, one Prisma client, one database engine everywhere
- Two Supabase projects handle environment separation:
  - `gotakecrm-prod` → Production (Vercel Production Deployment)
  - `gotakecrm-demo` → Development + Portfolio Preview (Vercel Preview Deployment)

## Consequences

### Positive
- Non-Google users can sign up — broader audience reach
- Full ownership of user data in the application's own database
- Single Prisma schema eliminates schema drift between dev and prod
- Developers can seed, mutate, and test freely on the demo Supabase without risking production data
- Demo reseed is a single command: `npx tsx prisma/seed.ts` against the demo project

### Negative
- Requires internet connection for local development (Supabase is remote, not local SQLite)
- Password hashing and credential validation add implementation surface area
- The `User` table must be seeded with a demo user for the portfolio preview to work
- No offline/local-first development option without running PostgreSQL locally

### Migration
- Merge `schema.prod.prisma` content into `schema.prisma`, replacing SQLite with PostgreSQL
- Delete `schema.prod.prisma` and `prisma/dev.db`
- Update `db.ts` to remove `NODE_ENV`-based datasource switching
- Update CI workflow to remove the `validate-prod-schema` job
- Update `vercel.json` build command to remove dual-schema logic

## Alternatives Considered

### Keep SQLite for local dev
Rejected. Having two different database engines (SQLite locally, PostgreSQL in prod) creates a class of bugs that only appear in production (e.g., case sensitivity in string comparisons, different date/time handling, missing PostgreSQL features like `@@index` syntax differences). The demo Supabase project eliminates this risk.

### Add more auth providers (Magic Link, GitHub, etc.)
Rejected for Phase 1. Google + email/password covers the vast majority of users. Additional providers can be added later with minimal effort since NextAuth supports them as drop-in providers.
