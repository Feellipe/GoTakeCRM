import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET single proposal
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const proposal = await db.proposal.findUnique({
      where: { id },
      include: {
        client: true,
        template: true,
      },
    });
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }
    return NextResponse.json(proposal);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return NextResponse.json({ error: 'Failed to fetch proposal' }, { status: 500 });
  }
}

// PUT update proposal
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {
      title: body.title,
      description: body.description,
      status: body.status,
      packages: JSON.stringify(body.packages || []),
      customItems: body.customItems ? JSON.stringify(body.customItems) : null,
      portfolioLinks: body.portfolioLinks ? JSON.stringify(body.portfolioLinks) : null,
      terms: body.terms,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      totalValue: body.totalValue,
      notes: body.notes,
    };

    if (body.status === 'sent' && !body.sentAt) {
      updateData.sentAt = new Date();
    }
    if (body.status === 'viewed' && !body.viewedAt) {
      updateData.viewedAt = new Date();
    }
    if (['accepted', 'rejected'].includes(body.status) && !body.respondedAt) {
      updateData.respondedAt = new Date();
    }

    const proposal = await db.proposal.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
      },
    });
    return NextResponse.json(proposal);
  } catch (error) {
    console.error('Error updating proposal:', error);
    return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 });
  }
}

// DELETE proposal
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.proposal.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return NextResponse.json({ error: 'Failed to delete proposal' }, { status: 500 });
  }
}
