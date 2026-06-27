/**
 * API Integration Tests — POST /api/stripe/webhook
 *
 * Tests the Stripe webhook endpoint that handles checkout.session.completed events.
 * Mocks Stripe's webhook signature verification and Prisma at the system boundary.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/stripe/webhook/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

const mockConstructEvent = vi.hoisted(() => vi.fn());
vi.mock('stripe', () => ({
  default: {
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  },
}));

const mockProposalUpdate = vi.mocked(db.proposal.update);

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  it('marks proposal as paid on checkout.session.completed', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { proposalId: 'prop_1' },
        },
      },
    });

    mockProposalUpdate.mockResolvedValue({
      id: 'prop_1',
      paymentStatus: 'paid',
      status: 'accepted',
    } as any);

    const request = new NextRequest('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 't=123,v1=abc' },
      body: JSON.stringify({ type: 'checkout.session.completed' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockProposalUpdate).toHaveBeenCalledWith({
      where: { id: 'prop_1' },
      data: { paymentStatus: 'paid', status: 'accepted' },
    });
  });
});
