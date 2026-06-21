# ADR-0004: WhatsApp integration via official Cloud API (one number per Organization)

## Status

Accepted

## Context

WhatsApp integration is a core selling feature of GoTakeCRM. Photographers need to manage client communication directly from the CRM and trigger CRM actions via WhatsApp messages (e.g., update proposal status, add expenses, query client info).

WhatsApp does not offer a Telegram-style "create a bot and get a token" API. The options are the official Cloud API (stable, compliant, paid after 1000 conversations/month) or unofficial reverse-engineered libraries (Baileys, whatsapp-web.js — free but Terms of Service violations).

## Decision

- Use the **official Meta WhatsApp Cloud API** exclusively
- Each **Organization** connects their own WhatsApp Business phone number via Meta Business API credentials
- The CRM stores the Organization's WhatsApp access token and phone number ID
- Incoming webhook messages are routed by the phone number they arrive **on** → maps to the Organization → processes within that org's data boundary
- WhatsApp groups can include the bot for agency/team coordination — all group messages route to the owning Organization

## Consequences

### Positive
- Stable, compliant, won't break overnight — safe for a production product
- 1000 conversations/month free tier covers small photographers
- Natural isolation: each org's WhatsApp number maps cleanly to one org's data
- No infra cost — photographers bring their own Meta Business account and phone number
- Scales to agency use case: the agency has one number, all team members see messages

### Negative
- Each photographer needs a Meta Business account and a WhatsApp Business phone number — onboarding friction
- After 1000 conversations/month, per-conversation billing applies (cost passed to the photographer)
- The official API has rate limits and message format restrictions
- WhatsApp Business phone numbers cannot be regular personal numbers

### Risks
- Meta could change the free tier threshold — would impact pricing model
- WhatsApp group bot integration has limited API support compared to direct messages
- Photographers in markets without WhatsApp Business API availability would be blocked

## Alternatives Considered

### Unofficial libraries (Baileys, whatsapp-web.js)
Rejected. Building a product on a Terms of Service violation is a time bomb. Meta can break the API or ban the phone number at any time. Not viable for a paid product.

### Single shared bot number for all organizations
Rejected. All clients would see the same phone number — destroys brand identity for individual photographers. Also creates routing complexity when the same client phone number exists across multiple organizations.

### Provider-agnostic messaging layer (support Telegram, Instagram DM, etc.)
Deferred. WhatsApp is the primary market (Brazil). Other channels can be added later by abstracting behind a `MessageProvider` interface, but that abstraction is not needed for Phase 1.
