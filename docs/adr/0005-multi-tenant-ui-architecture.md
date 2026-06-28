# ADR-0005: Multi-Tenant UI Architecture

**Status:** Accepted
**Date:** 2026-06-28
**Related:** ADR-0001 (Multi-tenant single-user UI)

## Context

The multi-tenant data layer is already implemented (User, Organization, UserOrganization, organizationId on all models). The UI layer needs to support:

- Freelancers who work solo AND collaborate with agencies
- Users with multiple organization memberships
- Role-based access within organizations
- A consolidated "All Work" view

## Decision

### Navigation Model

Three-tier navigation:

1. **All Work** — Aggregated view across ALL contexts (solo + all orgs)
2. **My Work** — The user's personal workspace (always exists, no explicit org creation needed)
3. **Organization X/Y** — Specific org contexts the user is a member of

### Org State Management

Active context is managed via **React Context + global state**, NOT in the URL. This enables:
- Easy cross-org views ("All Work")
- No URL restructuring
- Deep linking via session-based context

### Org Switcher Placement

Org switcher lives at the **top of the sidebar**, replacing the static brand section. Uses dropdown pattern with org name + icon + chevron.

### Settings Architecture

Single settings page with **tabs**: "Personal" and a dynamic tab per org context. Personal tab persists across context switches.

### Roles (per organization)

| Role | Scope |
|------|-------|
| **Admin** | Full access to org data + configuration |
| **Autônomo** | Sees only clients/deals they're assigned to |
| **CRM** | Sees clients, conversations, proposals (read/edit) — no financials/config |

### WhatsApp Integration

WhatsApp is configured at the **user level** (the photographer's number). The same bot serves all contexts. Conversation routing is role-based per org.

## Consequences

- Sidebar needs significant restructuring
- React Context provider needed for active org state
- Role gating logic needed in sidebar navigation and API queries
- Settings page needs tab redesign
- Member management page needed
- All API queries already filter by organizationId (data layer ready)
