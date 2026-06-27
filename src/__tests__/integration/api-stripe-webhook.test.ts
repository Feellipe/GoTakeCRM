/**
 * API Integration Tests — POST /api/stripe/webhook
 *
 * Tests the Stripe webhook endpoint that handles checkout.session.completed events.
 * Mocks Stripe's webhook signature verification and Prisma at the system boundary.
 *
 * Techniques: PC (path coverage), EG (error guessing)
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

function makeRequest(body: string, signature?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (signature) headers['stripe-signature'] = signature;
  return new NextRequest('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers,
    body,
  });
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  // ── Tracer bullet: happy path ──
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

    const request = makeRequest(
      JSON.stringify({ type: 'checkout.session.completed' }),
      't=123,v1=abc'
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockProposalUpdate).toHaveBeenCalledWith({
      where: { id: 'prop_1' },
      data: { paymentStatus: 'paid', status: 'accepted' },
    });
  });

  // ── PC: 400 when signature header missing ──
  it('returns 400 when stripe-signature header is missing', async () => {
    const request = makeRequest(JSON.stringify({ type: 'checkout.session.completed' }));
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  // ── PC: 400 when signature is invalid ──
  it('returns 400 when signature is invalid', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const request = makeRequest(
      JSON.stringify({ type: 'checkout.session.completed' }),
      't=123,v1=bad'
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  // ── PC: 500 when webhook secret not configured ──
  it('returns 500 when webhook secret is missing', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const request = makeRequest(
      JSON.stringify({ type: 'checkout.session.completed' }),
      't=123,v1=abc'
    );
    const response = await POST(request);
    expect(response.status).toBe(500);
  });

  // ── PC: unknown event type still returns 200 ──
  it('returns 200 for unknown event type', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'charge.updated',
      data: { object: { id: 'ch_123' } },
    });

    const request = makeRequest(
      JSON.stringify({ type: 'charge.updated' }),
      't=123,v1=abc'
    );
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockProposalUpdate).not.toHaveBeenCalled();
  });

  // ── PC: checkout.session.completed without proposalId is a no-op ──
  it('handles checkout.session.completed without proposalId gracefully', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: {},
        },
      },
    });

    const request = makeRequest(
      JSON.stringify({ type: 'checkout.session.completed' }),
      't=123,v1=abc'
    );
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockProposalUpdate).not.toHaveBeenCalled();
  });
});
