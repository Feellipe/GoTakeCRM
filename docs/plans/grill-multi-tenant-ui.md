# Grill: Multi-Tenant UI/UX — GoTakeCRM

## Context

Multi-tenant architecture is already implemented at the **data layer**:
- `User`, `Organization`, `UserOrganization` models exist
- All data models have `organizationId` with FK
- `/api/auth/me` returns user + their organizations
- Auth already supports Google OAuth + email/password

What's **missing** is the **UI layer** for multi-tenant:
- Org switcher in sidebar
- Role-based navigation
- Members management page
- Onboarding flow
- Settings split (org vs user)
- Active org context throughout the app

## Goal

Define the UI/UX for the multi-tenant experience. What should each screen look like? How does a user switch orgs? What's the onboarding flow? Where does role-based gating happen?

## Current State

- **Sidebar**: hardcoded brand name, hardcoded user info, no org awareness
- **Settings page**: mixed org-level (Stripe, WhatsApp) and user-level (Profile, Appearance) in one page
- **Settings OrgData**: includes `stripePublicKey`, `stripeSecretKey`, `stripeWebhookSecret` but no members list
- **Proposals view**: user can view/create proposals but no org context in URL
- **No middleware**: API routes are unprotected at the middleware level

## Key Questions

1. **Org in URL or session?** — Should the active org be in the URL path (`/org/[slug]/dashboard`) or tracked via session state (React context)?
2. **Org switcher placement** — Sidebar header? Top bar? Both?
3. **Settings architecture** — One settings page with tabs? Separate routes (`/settings/org`, `/settings/profile`)?
4. **Onboarding** — What happens when a user has 0 orgs? 0 is a valid state?
5. **Member invite** — Simple email invite? Invite code? Self-service?
6. **Role gating** — Should viewer see proposals but not edit? Hidden entirely?
