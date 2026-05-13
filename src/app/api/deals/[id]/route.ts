import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, dealUpdateSchema, validateOrigin } from '@/lib/validations';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deal = await db.deal.findUnique({
      where: { id },
      include: {
        client: true,
        briefings: true,
        expenses: true,
        revenue: true,
        bookings: true,
        documents: true,
      },
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const dealWithStats = {
      ...deal,
      totalExpenses: deal.expenses.reduce((sum, e) => sum + e.amount, 0),
      totalRevenue: deal.revenue
        .filter(r => r.status === 'received')
        .reduce((sum, r) => sum + r.amount, 0),
      profit: deal.revenue
        .filter(r => r.status === 'received')
        .reduce((sum, r) => sum + r.amount, 0) - deal.expenses.reduce((sum, e) => sum + e.amount, 0),
    };

    return NextResponse.json(dealWithStats);
  } catch (error) {
    console.error('Error fetching deal:', error);
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const rawBody = await request.json();
    // Apenas campos validados pelo schema sao repassados (protecao contra mass assignment)
    const body = validateOrThrow(dealUpdateSchema, rawBody);

    // Destruturação explicita para whitelist de campos atualizáveis
    const { title, description, status, value, currency } = body;

    const deal = await db.deal.update({
      where: { id },
      data: { title, description, status, value, currency },
      include: {
        client: true,
      },
    });

    return NextResponse.json(deal);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    }
    console.error('Error updating deal:', error);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Todas as exclusoes em cascata dentro de uma unica transacao
    await db.$transaction([
      db.briefing.deleteMany({ where: { dealId: id } }),
      db.expense.deleteMany({ where: { dealId: id } }),
      db.revenue.deleteMany({ where: { dealId: id } }),
      db.booking.deleteMany({ where: { dealId: id } }),
      db.document.deleteMany({ where: { dealId: id } }),
      db.deal.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
  }
}
