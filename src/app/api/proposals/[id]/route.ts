import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, proposalUpdateSchema, validateOrigin } from '@/lib/validations';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// GET single proposal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const proposal = await db.proposal.findUnique({
      where: { id },
      include: {
        client: true,
        deal: true,
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(request, { limit: 20, windowMs: 60_000 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const { id } = await params;
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const rawBody = await request.json();
    // Apenas campos validados pelo schema sao aceitos (protecao contra mass assignment)
    const body = validateOrThrow(proposalUpdateSchema, rawBody);

    // Monta data com campos validados; converte validUntil se fornecido
    const updateData: Record<string, unknown> = {
      ...body,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
    };

    // Define timestamps automaticos conforme transicao de status
    if (body.status === 'sent') {
      updateData.sentAt = new Date();
    }
    if (body.status === 'viewed') {
      updateData.viewedAt = new Date();
    }
    if (body.status === 'accepted' || body.status === 'rejected') {
      updateData.respondedAt = new Date();
    }

    const proposal = await db.proposal.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        deal: true,
      },
    });
    return NextResponse.json(proposal);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    }
    console.error('Error updating proposal:', error);
    return NextResponse.json({ error: 'Failed to update proposal' }, { status: 500 });
  }
}

// DELETE proposal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(request, { limit: 20, windowMs: 60_000 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const { id } = await params;
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await db.proposal.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return NextResponse.json({ error: 'Failed to delete proposal' }, { status: 500 });
  }
}
