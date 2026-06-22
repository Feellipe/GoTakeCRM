import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, dealCreateSchema, dealUpdateSchema, validateOrigin } from '@/lib/validations';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 100, windowMs: 60_000 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const clientId = searchParams.get('clientId') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    // Paraleliza a contagem e a busca (async-parallel)
    const [total, deals] = await Promise.all([
      db.deal.count({ where }),
      db.deal.findMany({
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
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Computed fields
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

    // Se a requisicao veio com params de paginacao, retorna formato paginado
    const hasPagination = searchParams.has('page') || searchParams.has('limit');
    if (hasPagination) {
      return NextResponse.json({
        data: dealsWithStats,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

    // Sem params de paginacao: retorna array plano (compatibilidade com SWR)
    return NextResponse.json(dealsWithStats);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { limit: 20, windowMs: 60_000 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
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
  const rl = rateLimit(request, { limit: 20, windowMs: 60_000 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

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
