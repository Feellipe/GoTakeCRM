/**
 * API Integration Tests — POST /api/stripe/create-checkout
 *
 * Tests the Stripe Checkout Session creation endpoint through the HTTP interface.
 * Mocks Prisma, Stripe, and NextAuth at the system boundary.
 *
 * Techniques: PC (path coverage), DT (decision table), BV (boundary values), EG (error guessing)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/stripe/create-checkout/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

// Mock getServerSession
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock Stripe
const mockStripeCreate = vi.fn();
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    checkout: {
      sessions: {
        create: mockStripeCreate,
      },
    },
  })),
}));

import { getServerSession } from 'next-auth';

const mockGetServerSession = vi.mocked(getServerSession);
const mockUserOrgFindFirst = vi.mocked(db.userOrganization.findFirst);
const mockProposalFindUnique = vi.mocked(db.proposal.findUnique);
const mockProposalUpdate = vi.mocked(db.proposal.update);
const mockOrgFindUnique = vi.mocked(db.organization.findUnique);

const makeSession = (userId: string) => ({
  user: { id: userId, name: 'Test', email: 'test@email.com' },
  expires: '2099-01-01T00:00:00.000Z',
});

const baseProposal = {
  id: 'prop_1',
  organizationId: 'org_1',
  clientId: 'client_1',
  dealId: null,
  templateId: null,
  title: 'Wedding Package',
  description: 'Complete wedding coverage',
  status: 'sent',
  packages: '[]',
  customItems: null,
  portfolioLinks: null,
  terms: null,
  validUntil: null,
  totalValue: 5000,
  currency: 'BRL',
  notes: null,
  sentAt: null,
  viewedAt: null,
  respondedAt: null,
  paymentLink: null,
  paymentStatus: 'none',
  stripeSessionId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/stripe/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/stripe/create-checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Tracer bullet: happy path ──
  it('creates checkout session and returns URL for valid proposal', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({
      id: 'mem_1',
      userId: 'user_1',
      organizationId: 'org_1',
      role: 'owner',
      createdAt: '2026-01-01T00:00:00Z',
    } as any);
    mockProposalFindUnique.mockResolvedValue(baseProposal as any);
    mockOrgFindUnique.mockResolvedValue({
      id: 'org_1',
      stripeSecretKey: 'sk_test_abc',
    } as any);

    mockStripeCreate.mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.stripe.com/pay/cs_123',
    });

    mockProposalUpdate.mockResolvedValue({
      ...baseProposal,
      stripeSessionId: 'cs_123',
      paymentLink: 'https://checkout.stripe.com/pay/cs_123',
      paymentStatus: 'pending',
    } as any);

    const request = makeRequest({ proposalId: 'prop_1' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toContain('checkout.stripe.com');
    expect(data.sessionId).toBe('cs_123');

    expect(mockProposalUpdate).toHaveBeenCalledWith({
      where: { id: 'prop_1' },
      data: {
        stripeSessionId: 'cs_123',
        paymentLink: 'https://checkout.stripe.com/pay/cs_123',
        paymentStatus: 'pending',
      },
    });

    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        payment_method_types: ['card', 'pix'],
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: 'brl',
              unit_amount: 500000,
            }),
          }),
        ],
        metadata: { proposalId: 'prop_1', organizationId: 'org_1' },
      })
    );
  });

  // ── PC: 401 when not authenticated ──
  it('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const response = await POST(makeRequest({ proposalId: 'prop_1' }));
    expect(response.status).toBe(401);
  });

  // ── PC: 403 when no org membership ──
  it('returns 403 when user has no organization', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue(null);
    const response = await POST(makeRequest({ proposalId: 'prop_1' }));
    expect(response.status).toBe(403);
  });

  // ── PC: 404 when proposal not found ──
  it('returns 404 when proposal does not exist', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({
      id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'owner', createdAt: '2026-01-01T00:00:00Z',
    } as any);
    mockProposalFindUnique.mockResolvedValue(null);
    const response = await POST(makeRequest({ proposalId: 'prop_1' }));
    expect(response.status).toBe(404);
  });

  // ── PC: 400 when Stripe not configured ──
  it('returns 400 when org has no Stripe key', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({
      id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'owner', createdAt: '2026-01-01T00:00:00Z',
    } as any);
    mockProposalFindUnique.mockResolvedValue(baseProposal as any);
    mockOrgFindUnique.mockResolvedValue({ stripeSecretKey: null } as any);
    const response = await POST(makeRequest({ proposalId: 'prop_1' }));
    expect(response.status).toBe(400);
    expect((await response.json())).toHaveProperty('error');
  });

  // ── DT: 400 when proposal already paid ──
  it('returns 400 when proposal is already paid', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({
      id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'owner', createdAt: '2026-01-01T00:00:00Z',
    } as any);
    mockProposalFindUnique.mockResolvedValue({ ...baseProposal, paymentStatus: 'paid' } as any);
    mockOrgFindUnique.mockResolvedValue({ stripeSecretKey: 'sk_test_abc' } as any);
    const response = await POST(makeRequest({ proposalId: 'prop_1' }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('paid');
  });

  // ── DT: 400 when proposal rejected ──
  it('returns 400 when proposal is rejected', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({
      id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'owner', createdAt: '2026-01-01T00:00:00Z',
    } as any);
    mockProposalFindUnique.mockResolvedValue({ ...baseProposal, status: 'rejected' } as any);
    mockOrgFindUnique.mockResolvedValue({ stripeSecretKey: 'sk_test_abc' } as any);
    const response = await POST(makeRequest({ proposalId: 'prop_1' }));
    expect(response.status).toBe(400);
  });

  // ── DT: 400 when proposal expired ──
  it('returns 400 when proposal is expired', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({
      id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'owner', createdAt: '2026-01-01T00:00:00Z',
    } as any);
    mockProposalFindUnique.mockResolvedValue({ ...baseProposal, status: 'expired' } as any);
    mockOrgFindUnique.mockResolvedValue({ stripeSecretKey: 'sk_test_abc' } as any);
    const response = await POST(makeRequest({ proposalId: 'prop_1' }));
    expect(response.status).toBe(400);
  });

  // ── BV: totalValue = 0 (free proposal) ──
  it('creates checkout with totalValue = 0', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({
      id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'owner', createdAt: '2026-01-01T00:00:00Z',
    } as any);
    mockProposalFindUnique.mockResolvedValue({ ...baseProposal, totalValue: 0 } as any);
    mockOrgFindUnique.mockResolvedValue({ stripeSecretKey: 'sk_test_abc' } as any);
    mockStripeCreate.mockResolvedValue({ id: 'cs_free', url: 'https://checkout.stripe.com/pay/cs_free' });
    mockProposalUpdate.mockResolvedValue({ ...baseProposal, stripeSessionId: 'cs_free' } as any);

    const response = await POST(makeRequest({ proposalId: 'prop_1' }));
    expect(response.status).toBe(200);
    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [expect.objectContaining({
          price_data: expect.objectContaining({ unit_amount: 0 }),
        })],
      })
    );
  });

  // ── BV: totalValue = 999999.99 (large value) ──
  it('creates checkout with large totalValue', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({
      id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'owner', createdAt: '2026-01-01T00:00:00Z',
    } as any);
    mockProposalFindUnique.mockResolvedValue({ ...baseProposal, totalValue: 999999.99 } as any);
    mockOrgFindUnique.mockResolvedValue({ stripeSecretKey: 'sk_test_abc' } as any);
    mockStripeCreate.mockResolvedValue({ id: 'cs_big', url: 'https://checkout.stripe.com/pay/cs_big' });
    mockProposalUpdate.mockResolvedValue({ ...baseProposal, stripeSessionId: 'cs_big' } as any);

    const response = await POST(makeRequest({ proposalId: 'prop_1' }));
    expect(response.status).toBe(200);
    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [expect.objectContaining({
          price_data: expect.objectContaining({ unit_amount: 99999999 }),
        })],
      })
    );
  });

  // ── EG: proposalId is not a string ──
  it('returns 400 when proposalId is a number', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({
      id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'owner', createdAt: '2026-01-01T00:00:00Z',
    } as any);
    const response = await POST(makeRequest({ proposalId: 123 }));
    expect(response.status).toBe(400);
  });

  // ── EG: empty string proposalId ──
  it('returns 400 when proposalId is empty string', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({
      id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'owner', createdAt: '2026-01-01T00:00:00Z',
    } as any);
    const response = await POST(makeRequest({ proposalId: '' }));
    expect(response.status).toBe(400);
  });

  // ── EG: Stripe API error → 500 ──
  it('returns 500 when Stripe API call fails', async () => {
    mockGetServerSession.mockResolvedValue(makeSession('user_1'));
    mockUserOrgFindFirst.mockResolvedValue({
      id: 'mem_1', userId: 'user_1', organizationId: 'org_1', role: 'owner', createdAt: '2026-01-01T00:00:00Z',
    } as any);
    mockProposalFindUnique.mockResolvedValue(baseProposal as any);
    mockOrgFindUnique.mockResolvedValue({ stripeSecretKey: 'sk_test_abc' } as any);
    mockStripeCreate.mockRejectedValue(new Error('Invalid API key'));

    const response = await POST(makeRequest({ proposalId: 'prop_1' }));
    expect(response.status).toBe(500);
  });
});
