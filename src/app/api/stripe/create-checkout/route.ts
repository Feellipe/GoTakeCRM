import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import Stripe from 'stripe';

// POST /api/stripe/create-checkout — Create a Stripe Checkout Session for a proposal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { proposalId } = await request.json();

    if (typeof proposalId !== 'string' || !proposalId) {
      return NextResponse.json(
        { error: 'Invalid proposal ID' },
        { status: 400 }
      );
    }

    // Verify user membership
    const membership = await db.userOrganization.findFirst({
      where: { userId: session.user.id },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find proposal
    const proposal = await db.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal || proposal.organizationId !== membership.organizationId) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Check payment status
    if (proposal.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'Proposal is already paid' },
        { status: 400 }
      );
    }

    // Check proposal status
    if (proposal.status === 'rejected' || proposal.status === 'expired') {
      return NextResponse.json(
        { error: `Proposal is ${proposal.status}` },
        { status: 400 }
      );
    }

    // Get org Stripe key
    const org = await db.organization.findUnique({
      where: { id: membership.organizationId },
      select: { stripeSecretKey: true },
    });

    if (!org?.stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe not configured for this organization' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const stripe = new Stripe(org.stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    });

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'pix'],
      line_items: [
        {
          price_data: {
            currency: proposal.currency.toLowerCase(),
            product_data: {
              name: proposal.title,
              description: proposal.description || undefined,
            },
            unit_amount: Math.round(proposal.totalValue * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        proposalId: proposal.id,
        organizationId: proposal.organizationId,
      },
      success_url: `${origin}/proposals/${proposal.id}?payment=success`,
      cancel_url: `${origin}/proposals/${proposal.id}?payment=cancelled`,
    });

    // Save session info to proposal
    await db.proposal.update({
      where: { id: proposal.id },
      data: {
        stripeSessionId: checkoutSession.id,
        paymentLink: checkoutSession.url,
        paymentStatus: 'pending',
      },
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
