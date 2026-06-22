# ADR-0001: Multi-tenant data model with single-user UI from day one

## Status

Accepted

## Context

GoTakeCRM needs to support two distinct collaboration patterns:

1. **Freelance collaboration**: Two independent photographers (Felipe and João) share a specific Client and its project data while keeping their other clients private.
2. **Agency/multi-user (Phase 2)**: A photography studio with an organizer, managers, and photographers who have role-based access to the CRM.

The initial instinct was to build as single-user and add multi-tenant later. However, migrating a flat schema (no `organizationId` on models) to a multi-tenant schema requires updating every record, every query, and every index — a high-risk migration when real data exists.

## Decision

Bake the multi-tenant data model into the schema from day one:

- Every model gets an `organizationId` field
- New tables: `User`, `Organization`, `UserOrganization`
- New table: `ClientShare` for cross-org client sharing (full-client subtree, no per-table granular flags)
- The UI launches as single-user — the Organization is hidden from view and auto-created on sign up

This means:
- Phase 1: Single photographer per org, `UserOrganization` has one row per org, no role enforcement
- Phase 2: Multiple users per org, roles enforced in middleware, UI exposes org management
- Cross-org sharing (`ClientShare`) works from Phase 1

## Consequences

### Positive
- Zero data migration needed when adding multi-user support
- Every query already includes `organizationId` filtering — no retrofitting
- `ClientShare` enables the core freelance collaboration use case immediately
- Development and production use the same database engine (PostgreSQL via Supabase), eliminating schema drift

### Negative
- Every Prisma model has an additional `organizationId` field and index — slightly more storage and query complexity
- All API routes must include `organizationId` in queries from day one, even though only one org exists per user in Phase 1
- The seed script must create an Organization and User to be valid
- SQLite can no longer be used for local development — Supabase PostgreSQL is required even in dev

### Risks
- If the multi-user Phase 2 never ships, the `organizationId` and related tables are unused overhead. Low risk given the product roadmap targets agency users.
- The `ClientShare` full-subtree sharing may prove too coarse for some users (e.g., wanting to share a Deal but not Revenue). Granular per-table sharing is deferred to Phase 2.

## Alternatives Considered

### Single-user schema, migrate later
Rejected. Adding `organizationId` to 13 models with existing data is a high-risk migration. The cost of baking it in from day one is minimal (one field per model).

### Per-table sharing flags on ClientShare
Rejected for Phase 1. Adds query complexity to every API route (`OR` clauses joining through `ClientShare` with boolean flags). The use case for "share the client but hide revenue" is niche. Full-client sharing covers 90%+ of scenarios. Can be added in Phase 2 without breaking the existing model.
