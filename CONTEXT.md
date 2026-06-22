# CONTEXT.md — GoTakeCRM Domain Glossary

## Domain

**GoTakeCRM** is a CRM for freelance photographers and videographers (and their agencies) operating in Brazil. It manages clients, deals, bookings, proposals, finances, and WhatsApp-based communication.

---

## Glossary

### People & Organizations

| Term | Definition |
|---|---|
| **User** | A person who logs into the CRM. Has credentials (email/password or Google OAuth). Owns their data. A single User can belong to multiple Organizations. |
| **Organization** | The isolation and billing unit. Every User gets an Organization on sign up. For a solo photographer it is hidden from the UI; for an agency it is visible with multiple members. Maps to one WhatsApp Business phone number. |
| **UserOrganization** | The join table linking Users to Organizations with a role (owner, admin, member, viewer). Roles are not enforced in Phase 1 (single-user UI) but the data structure is present. |

### Clients & Work

| Term | Definition |
|---|---|
| **Client** | The photographer's customer — the person or company hiring the studio. Belongs to one Organization. |
| **Deal** | A project or opportunity linked to a Client. The central entity that connects briefings, expenses, revenues, bookings, and proposals. Pipeline stages: `new` → `briefing` → `quoting` → `production` → `completed`. |
| **Briefing** | Creative requirements captured per Deal. Written by the Client or photographer. |
| **Expense** | A cost incurred during a Deal (equipment rental, crew, travel, location). |
| **Revenue** | A payment received from a Client for a Deal. Status: `pending` or `received`. |
| **Booking** | A calendar reservation for a shoot or event linked to a Client (and optionally a Deal). |
| **Proposal** | A business proposal sent to a Client for a Deal, composed of Packages. Status: `draft` → `sent` → `viewed` → `accepted` / `rejected` / `expired`. |
| **Package** | A pre-registered service offering (e.g., "Wedding Essential", "Book Premium") with a fixed price and deliverables list. Reusable across Proposals. |
| **ProposalTemplate** | A reusable template for creating Proposals with default terms and conditions. |

### Communication

| Term | Definition |
|---|---|
| **Conversation** | A WhatsApp conversation thread linked to a Client. Routed by the WhatsApp Business phone number to the owning Organization. |
| **Message** | An individual message within a Conversation. Direction: `inbound` (from client) or `outbound` (from photographer/bot). |

### Collaboration

| Term | Definition |
|---|---|
| **ClientShare** | A grant allowing one Organization to access another Organization's Client and its entire subtree (Deal, Briefing, Expense, Revenue, Booking, Proposal, Document). Shared at full-client level — no per-table granular control (Phase 2). |
| **Share** (verb) | The act of granting another Organization access to a Client. "Felipe shares Client Jade with João" creates a `ClientShare` record. |

### Deployment & Environments

| Term | Definition |
|---|---|
| **Production** | The live deployment serving the real client. Connected to `gotakecrm-prod` Supabase. Deployed from `main` branch on Vercel. |
| **Preview** | The portfolio/demo deployment connected to `gotakecrm-demo` Supabase. Visitors use demo credentials to explore the app with seeded fake data. Automatically created by Vercel from any branch push. |
| **Demo database** | The `gotakecrm-demo` Supabase project. Used for both local development AND portfolio preview. Can be reseeded freely without affecting production data. |

### Authentication

| Term | Definition |
|---|---|
| **CredentialsProvider** | Email/password login via NextAuth. The primary auth path for users without Google accounts. |
| **GoogleProvider** | Google OAuth login via NextAuth. Coexists with CredentialsProvider. |

---

## Currency & Locale

- All monetary values are in **BRL** (Brazilian Real) unless explicitly stated otherwise.
- Default timezone: `America/Sao_Paulo`.
- All user-facing content is in **Brazilian Portuguese**.
