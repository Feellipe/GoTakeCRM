# Stripe Payment Links — Vertical Slices

> **For Hermes:** Use `tdd` (Matt Pollock) for philosophy + `tdd-techniques` for test case design.
> Strict vertical slicing: RED (1 test) → GREEN (minimal code) → Refactor → Commit per cycle.
> One test at a time. Never anticipate future tests.

**Goal:** User configures Stripe keys in Settings → generates payment links for proposals → Stripe Checkout with PIX + Card.

**Architecture:** Stripe SDK, Prisma (Organization.stripe_* + Proposal.payment_* fields), webhook for status updates.

---

## Phase 1: Schema & Setup

### Task 1: Install Stripe SDK

```bash
npm install stripe
```

**GREEN:**
```ts
// src/lib/stripe.ts
import Stripe from 'stripe';
export function getStripeClient(secretKey?: string) {
  const key = secretKey || process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe secret key not configured');
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}
```

Commit: `"feat: install stripe SDK"`

### Task 2: Prisma migration — add Stripe fields

Edit `prisma/schema.prisma`:

```
model Organization { ... stripeSecretKey String? @map("stripe_secret_key") stripePublicKey String? @map("stripe_public_key") }
model Proposal { ... paymentLink String? @map("payment_link") paymentStatus String @default("none") @map("payment_status") stripeSessionId String? @map("stripe_session_id") }
```

```bash
npx prisma migrate dev --name add_stripe_fields
```

Commit: `"feat: add Stripe fields to Organization and Proposal"`

---

## Phase 2: Settings UI — Vertical Slices

### Task 3 (Tracer bullet 🎯): Save Stripe keys, mask secret in response

**RED — 1 test:**

`src/__tests__/integration/api-stripe-settings.test.ts`
```ts
import { PATCH } from '@/app/api/admin/organizations/[id]/stripe/route';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
import { getServerSession } from 'next-auth';
const mockGetSession = vi.mocked(getServerSession);
const mockUserOrg = vi.mocked(db.userOrganization.findFirst);
const mockOrgUpdate = vi.mocked(db.organization.update);

it('saves Stripe keys and masks secret in response', async () => {
  mockGetSession.mockResolvedValue({ user: { id: 'u1' } });
  mockUserOrg.mockResolvedValue({ role: 'owner' });
  mockOrgUpdate.mockResolvedValue({ stripePublicKey: 'pk_test_abc', stripeSecretKey: 'sk_live_secret123' });

  const req = new NextRequest('http://localhost/api/admin/orgs/org_1/stripe', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stripePublicKey: 'pk_test_abc', stripeSecretKey: 'sk_live_secret123' }),
  });
  const res = await PATCH(req, { params: Promise.resolve({ id: 'org_1' }) });
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.stripePublicKey).toBe('pk_test_abc');
  expect(data.stripeSecretKey).not.toContain('secret');
  expect(data.stripeSecretKey).toContain('••••');
});
```

**GREEN — minimal handler:**
Create endpoint, validate session + role, update org, mask secret in response.

Run → PASS → Commit.

---

### Task 4: 401 when not authenticated

**RED:**
```ts
it('returns 401 when not authenticated', async () => {
  mockGetSession.mockResolvedValue(null);
  const res = await PATCH(req, { params: Promise.resolve({ id: 'org_1' }) });
  expect(res.status).toBe(401);
});
```

**GREEN:** Add `if (!session?.user?.id) return 401`.

Run → PASS → Commit.

---

### Task 5: 403 for viewer role

**RED:**
```ts
it('returns 403 when user has viewer role', async () => {
  mockUserOrg.mockResolvedValue({ role: 'viewer' });
  const res = await PATCH(req, { params: Promise.resolve({ id: 'org_1' }) });
  expect(res.status).toBe(403);
});
```

**GREEN:** Add `!['owner', 'admin'].includes(membership.role)` check.

Run → PASS → Commit.

---

### Task 6: Add Stripe UI card to Settings page

Edit `src/app/(dashboard)/settings/page.tsx`: add CreditCard icon, inputs for pk + sk, save button, `handleSaveStripe`.

Commit: `"feat: add Stripe settings UI card"`

---

## Phase 3: Create Checkout — Vertical Slices

### Task 7 (Tracer bullet 🎯): Happy path — creates session, saves to proposal, returns URL

**RED — 1 test:**

`src/__tests__/integration/api-stripe-checkout.test.ts`
```ts
import { POST } from '@/app/api/stripe/create-checkout/route';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('stripe', () => ({ default: vi.fn() }));

import Stripe from 'stripe';
const mockStripe = vi.mocked(Stripe);
const mockGetSession = vi.mocked(getServerSession);
const mockUserOrg = vi.mocked(db.userOrganization.findFirst);
const mockProposal = vi.mocked(db.proposal.findUnique);
const mockProposalUpdate = vi.mocked(db.proposal.update);
const mockOrgFind = vi.mocked(db.organization.findUnique);

// Setup: session exists, user in org, proposal exists with valid status, org has Stripe key
mockGetSession.mockResolvedValue({ user: { id: 'u1' } });
mockUserOrg.mockResolvedValue({ organizationId: 'org_1' });
mockProposal.mockResolvedValue({ id: 'prop_1', organizationId: 'org_1', totalValue: 5000, title: 'Wedding', currency: 'BRL', status: 'sent', paymentStatus: 'none' });
mockOrgFind.mockResolvedValue({ stripeSecretKey: 'sk_test_abc' });

const mockCreate = vi.fn().mockResolvedValue({ id: 'cs_123', url: 'https://checkout.stripe.com/pay/cs_123' });
mockStripe.mockReturnValue({ checkout: { sessions: { create: mockCreate } } });

it('creates checkout session and returns URL for valid proposal', async () => {
  const req = new NextRequest('http://localhost/api/stripe/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId: 'prop_1' }),
  });
  const res = await POST(req);
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.url).toContain('checkout.stripe.com');
  expect(data.sessionId).toBe('cs_123');
  expect(mockProposalUpdate).toHaveBeenCalledWith({
    where: { id: 'prop_1' },
    data: { stripeSessionId: 'cs_123', paymentLink: data.url, paymentStatus: 'pending' },
  });
  expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
    mode: 'payment',
    payment_method_types: ['card', 'pix'],
    line_items: [expect.objectContaining({
      price_data: expect.objectContaining({ unit_amount: 500000, currency: 'brl' }),
    })],
    metadata: { proposalId: 'prop_1', organizationId: 'org_1' },
  }));
});
```

**GREEN — minimal POST handler:**
- Validate session
- Get membership
- Find proposal
- Get org Stripe key
- Create Stripe Checkout Session
- Save to proposal
- Return URL

Run → PASS → Commit.

---

### Task 8: 401 when not authenticated

**RED:**
```ts
it('returns 401 when no session', async () => {
  mockGetSession.mockResolvedValue(null);
  const res = await POST(req);
  expect(res.status).toBe(401);
});
```

**GREEN:** Add guard: `if (!session?.user?.id) → 401`.

Run → PASS → Commit.

---

### Task 9: 403 when no org membership

**RED:**
```ts
it('returns 403 when user has no organization', async () => {
  mockUserOrg.mockResolvedValue(null);
  const res = await POST(req);
  expect(res.status).toBe(403);
});
```

**GREEN:** Add guard: `if (!membership) → 403`.

Run → PASS → Commit.

---

### Task 10: 404 when proposal not found or wrong org

**RED:**
```ts
it('returns 404 when proposal does not exist', async () => {
  mockProposal.mockResolvedValue(null);
  const res = await POST(req);
  expect(res.status).toBe(404);
});
```

**GREEN:** Add guard: `if (!proposal || proposal.organizationId !== membership.organizationId) → 404`.

Run → PASS → Commit.

---

### Task 11: 400 when Stripe not configured

**RED:**
```ts
it('returns 400 when org has no Stripe key', async () => {
  mockOrgFind.mockResolvedValue({ stripeSecretKey: null });
  const res = await POST(req);
  expect(res.status).toBe(400);
  expect(await res.json()).toHaveProperty('error');
});
```

**GREEN:** Add guard: `if (!org?.stripeSecretKey) → 400`.

Run → PASS → Commit.

---

### Task 12: DT — 400 when proposal already paid

**RED:**
```ts
it('returns 400 when proposal is already paid', async () => {
  mockProposal.mockResolvedValue({ ...proposal, status: 'accepted', paymentStatus: 'paid' });
  const res = await POST(req);
  expect(res.status).toBe(400);
  expect((await res.json()).error).toContain('paid');
});
```

**GREEN:** Add DT guard: `if (paymentStatus === 'paid') → 400`.

Run → PASS → Commit.

---

### Task 13: DT — 400 when proposal rejected

**RED:**
```ts
it('returns 400 when proposal is rejected', async () => {
  mockProposal.mockResolvedValue({ ...proposal, status: 'rejected' });
  const res = await POST(req);
  expect(res.status).toBe(400);
});
```

**GREEN:** Add guard: `if (status === 'rejected') → 400`.

Run → PASS → Commit.

---

### Task 14: DT — 400 when proposal expired

**RED:**
```ts
it('returns 400 when proposal is expired', async () => {
  mockProposal.mockResolvedValue({ ...proposal, status: 'expired' });
  const res = await POST(req);
  expect(res.status).toBe(400);
});
```

**GREEN:** Add guard: `if (status === 'expired') → 400`.

Run → PASS → Commit.

---

### Task 15: BV — totalValue = 0 (free proposal)

**RED:**
```ts
it('creates checkout with totalValue = 0', async () => {
  mockProposal.mockResolvedValue({ ...proposal, totalValue: 0 });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
    line_items: [expect.objectContaining({
      price_data: expect.objectContaining({ unit_amount: 0 }),
    })],
  }));
});
```

**GREEN:** Already works — `Math.round(0 * 100) = 0`.

Run → PASS → Commit.

---

### Task 16: BV — totalValue = 999999.99 (large value)

**RED:**
```ts
it('creates checkout with large totalValue', async () => {
  mockProposal.mockResolvedValue({ ...proposal, totalValue: 999999.99 });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
    line_items: [expect.objectContaining({
      price_data: expect.objectContaining({ unit_amount: 99999999 }),
    })],
  }));
});
```

**GREEN:** Already works.

Run → PASS → Commit.

---

### Task 17: EG — proposalId not a string

**RED:**
```ts
it('returns 400 when proposalId is a number', async () => {
  const req = new NextRequest('http://localhost/api/stripe/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposalId: 123 }),
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
});
```

**GREEN:** Add `typeof proposalId !== 'string'` check.

Run → PASS → Commit.

---

### Task 18: EG — empty string proposalId

**RED:**
```ts
it('returns 400 when proposalId is empty string', async () => {
  const req = new NextRequest('...', { method: 'POST', body: JSON.stringify({ proposalId: '' }) });
  const res = await POST(req);
  expect(res.status).toBe(400);
});
```

**GREEN:** Already covered by `if (!proposalId)` check.

Run → PASS → Commit.

---

### Task 19: Stripe API error → 500

**RED:**
```ts
it('returns 500 when Stripe API call fails', async () => {
  mockCreate.mockRejectedValue(new Error('Invalid API key'));
  const res = await POST(req);
  expect(res.status).toBe(500);
});
```

**GREEN:** Wrap Stripe call in try/catch → 500.

Run → PASS → Commit.

---

### Task 20: Add "Generate Payment Link" button to proposal view

Edit `proposals-view.tsx`: add button that calls `/api/stripe/create-checkout`, copies URL to clipboard. Shows "Generate Payment Link" / "Copy Link" / "Paid" badge based on state.

Commit: `"feat: add payment link button to proposal cards"`

---

## Phase 4: Webhook — Vertical Slices

### Task 21 (Tracer bullet 🎯): checkout.session.completed → marks proposal paid

**RED — 1 test:**

`src/__tests__/integration/api-stripe-webhook.test.ts`
```ts
import { POST } from '@/app/api/stripe/webhook/route';

vi.mock('stripe', () => ({
  webhooks: { constructEvent: vi.fn() },
}));

const mockConstruct = vi.mocked(require('stripe').webhooks.constructEvent);
const mockProposalUpdate = vi.mocked(db.proposal.update);

it('marks proposal as paid on checkout.session.completed', async () => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  mockConstruct.mockReturnValue({
    type: 'checkout.session.completed',
    data: { object: { metadata: { proposalId: 'prop_1' } } },
  });

  const req = new NextRequest('.../api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 't=123,v1=abc' },
    body: JSON.stringify({ type: 'checkout.session.completed' }),
  });
  const res = await POST(req);
  const data = await res.json();

  expect(res.status).toBe(200);
  expect(data.received).toBe(true);
  expect(mockProposalUpdate).toHaveBeenCalledWith({
    where: { id: 'prop_1' },
    data: { paymentStatus: 'paid', status: 'accepted' },
  });
});
```

**GREEN — minimal webhook handler:**
```ts
// src/app/api/stripe/webhook/route.ts
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  const stripe = require('stripe');
  const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  if (event.type === 'checkout.session.completed') {
    const proposalId = event.data.object.metadata?.proposalId;
    if (proposalId) await db.proposal.update({ where: { id: proposalId }, data: { paymentStatus: 'paid', status: 'accepted' } });
  }
  return NextResponse.json({ received: true });
}
```

Run → PASS → Commit.

---

### Task 22: 400 when signature missing

**RED:**
```ts
it('returns 400 when stripe-signature header is missing', async () => {
  const req = new NextRequest('...', { method: 'POST', body: '{}' });
  const res = await POST(req);
  expect(res.status).toBe(400);
});
```

**GREEN:** Add `if (!signature) return 400`.

Run → PASS → Commit.

---

### Task 23: EG — invalid signature

**RED:**
```ts
it('returns 400 when signature is invalid', async () => {
  mockConstruct.mockImplementation(() => { throw new Error('bad sig'); });
  const res = await POST(req);
  expect(res.status).toBe(400);
});
```

**GREEN:** Wrap constructEvent in try/catch → 400.

Run → PASS → Commit.

---

### Task 24: checkout.session.expired → marks proposal failed

**RED:**
```ts
it('marks proposal as failed on checkout.session.expired', async () => {
  mockConstruct.mockReturnValue({ type: 'checkout.session.expired', data: { object: { metadata: { proposalId: 'prop_2' } } } });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(mockProposalUpdate).toHaveBeenCalledWith({ where: { id: 'prop_2' }, data: { paymentStatus: 'failed' } });
});
```

**GREEN:** Add `case 'checkout.session.expired'`.

Run → PASS → Commit.

---

### Task 25: No proposalId in metadata → no crash

**RED:**
```ts
it('does not crash when session has no proposalId metadata', async () => {
  mockConstruct.mockReturnValue({ type: 'checkout.session.completed', data: { object: { metadata: {} } } });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(mockProposalUpdate).not.toHaveBeenCalled();
});
```

**GREEN:** Add `if (proposalId)` guard — already there.

Run → PASS → Commit.

---

### Task 26: Unknown event type → 200

**RED:**
```ts
it('ignores unknown event types gracefully', async () => {
  mockConstruct.mockReturnValue({ type: 'payment_intent.succeeded', data: { object: {} } });
  const res = await POST(req);
  expect(res.status).toBe(200);
  expect(mockProposalUpdate).not.toHaveBeenCalled();
});
```

**GREEN:** Default case — no action, return 200.

Run → PASS → Commit.

---

## Summary

| Phase | Tasks | Type | Tests |
|-------|-------|------|-------|
| Schema | 1-2 | Infra | 0 |
| Settings | 3-6 | 3 tests vertical | 3 |
| Checkout | 7-20 | 11 tests vertical | 11 |
| Webhook | 21-26 | 6 tests vertical | 6 |
| **Total** | **26 tasks** | **~2h** | **20 tests** |

**Verification:**
```bash
npx vitest run          # all pass, no regressions
npm run build           # no errors
npx playwright test     # E2E still green
```
