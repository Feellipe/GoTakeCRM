/**
 * API Integration Tests — POST /api/stripe/create-checkout
 *
 * Tests the Stripe Checkout Session creation endpoint through the HTTP interface.
 * Mocks Prisma, Stripe, and NextAuth at the system boundary.
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

describe('POST /api/stripe/create-checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    const request = new NextRequest('http://localhost/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId: 'prop_1' }),
    });
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
});
