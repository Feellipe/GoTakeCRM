# ADR-0002: Single branch deployment with Vercel Preview Environments

## Status

Accepted

## Context

The initial plan was to maintain two Git branches (`main` for the client, `deploy/portfolio` for a demo portfolio) and deploy each to a separate Vercel project. This was motivated by wanting different data and configuration for a demo vs. production.

Vercel natively supports Preview Deployments for any branch push, with separate environment variables for Production vs. Preview. This makes Git branches redundant as a deployment-routing mechanism.

## Decision

- **Single branch** (`main`) — delete `deploy/portfolio`
- **Production Deployment** (from `main`) → connected to `gotakecrm-prod` Supabase (real client data)
- **Preview Deployments** (from any branch push) → connected to `gotakecrm-demo` Supabase (seeded demo data)
- Environment variables (`DATABASE_URL`, auth secrets, etc.) are configured separately in Vercel's "Production Environment Variables" and "Preview Environment Variables"
- The portfolio demo is simply a Preview Deployment URL shared with demo credentials (email/password)

## Consequences

### Positive
- No branch maintenance — no merge conflicts, no forgotten cherry-picks, no schema drift between branches
- CI is simplified: one workflow, one branch to watch
- The same code runs in both environments — any bug fix ships to production and preview simultaneously
- Demo data management is decoupled from code — just reseed the demo Supabase project

### Negative
- Preview Deployments are ephemeral by default (Vercel may delete them after a period on Hobby plan). For a persistent demo URL, a specific branch can be pinned in Vercel settings.
- Both deployments share the same code — no way to disable features in the demo without feature flags or env var checks

### Migration
- Merge `deploy/portfolio` into `main`, resolve any conflicts, then delete the branch
- Update CI workflow to watch only `main`
- Update Vercel project settings with separate Production and Preview environment variables

## Alternatives Considered

### Two branches (`main` + `deploy/portfolio`)
Rejected. Fork maintenance trap — every feature, bug fix, and refactor must be applied to both branches. They inevitably drift, creating silent inconsistencies.

### Two separate Vercel projects
Rejected. Overkill when Vercel Preview Environments provide the same result with zero additional configuration. Two Vercel projects would mean two dashboards, two build caches, and two deploy pipelines to manage.
