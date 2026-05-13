import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, proposalCreateSchema } from '@/lib/validations';

// GET all proposals with optional dealId filter
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');

    const where: Record<string, unknown> = {};
    if (dealId) {
      where.dealId = dealId;
    }

    const proposals = await db.proposal.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
            status: true,
            value: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json({ error: 'Failed to fetch proposals' }, { status: 500 });
  }
}

// POST create new proposal
export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const body = validateOrThrow(proposalCreateSchema, rawBody);

    const proposal = await db.proposal.create({
      data: {
        clientId: body.clientId,
        dealId: body.dealId ?? null,
        templateId: body.templateId ?? null,
        title: body.title,
        description: body.description ?? null,
        status: body.status,
        packages: body.packages,
        customItems: body.customItems ?? null,
        portfolioLinks: body.portfolioLinks ?? null,
        terms: body.terms ?? null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        totalValue: body.totalValue,
        currency: body.currency,
        notes: body.notes ?? null,
      },
      include: {
        client: true,
        deal: true,
      },
    });
    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    }
    console.error('Error creating proposal:', error);
    return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
  }
}
