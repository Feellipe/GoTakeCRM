import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, dealCreateSchema, dealUpdateSchema } from '@/lib/validations';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const clientId = searchParams.get('clientId') || '';

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    const deals = await db.deal.findMany({
      where,
      include: {
        client: true,
        briefings: true,
        expenses: true,
        revenue: true,
        bookings: true,
        documents: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add computed fields
    const dealsWithStats = deals.map(deal => ({
      ...deal,
      totalExpenses: deal.expenses.reduce((sum, e) => sum + e.amount, 0),
      totalRevenue: deal.revenue
        .filter(r => r.status === 'received')
        .reduce((sum, r) => sum + r.amount, 0),
      profit: deal.revenue
        .filter(r => r.status === 'received')
        .reduce((sum, r) => sum + r.amount, 0) - deal.expenses.reduce((sum, e) => sum + e.amount, 0),
    }));

    return NextResponse.json(dealsWithStats);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const body = validateOrThrow(dealCreateSchema, rawBody);

    const deal = await db.deal.create({
      data: {
        clientId: body.clientId,
        title: body.title,
        description: body.description ?? null,
        status: body.status,
        value: body.value,
        currency: body.currency,
      },
      include: {
        client: true,
      },
    });

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    }
    console.error('Error creating deal:', error);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rawBody = await request.json();
    // Valida o corpo inteiro; apenas campos permitidos pelo schema sao aceitos
    const validated = validateOrThrow(dealUpdateSchema, rawBody);
    const id = (rawBody as Record<string, unknown>).id as string;

    if (!id) {
      return NextResponse.json({ error: 'Deal ID is required' }, { status: 400 });
    }

    const deal = await db.deal.update({
      where: { id },
      data: validated,
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
