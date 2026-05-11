import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all proposals
export async function GET() {
  try {
    const proposals = await db.proposal.findMany({
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
    const body = await request.json();
    const proposal = await db.proposal.create({
      data: {
        clientId: body.clientId,
        templateId: body.templateId || null,
        title: body.title,
        description: body.description,
        status: 'draft',
        packages: JSON.stringify(body.packages || []),
        customItems: body.customItems ? JSON.stringify(body.customItems) : null,
        portfolioLinks: body.portfolioLinks ? JSON.stringify(body.portfolioLinks) : null,
        terms: body.terms,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        totalValue: body.totalValue || 0,
        notes: body.notes,
      },
      include: {
        client: true,
      },
    });
    return NextResponse.json(proposal);
  } catch (error) {
    console.error('Error creating proposal:', error);
    return NextResponse.json({ error: 'Failed to create proposal' }, { status: 500 });
  }
}
