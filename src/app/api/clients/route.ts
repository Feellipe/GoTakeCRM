import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, clientCreateSchema, validateOrigin } from '@/lib/validations';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 100, windowMs: 60_000 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const eventType = searchParams.get('eventType') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (eventType) {
      where.eventType = eventType;
    }

    // Paraleliza a contagem e a busca (async-parallel)
    const [total, clients] = await Promise.all([
      db.client.count({ where }),
      db.client.findMany({
        where,
        include: {
          deals: {
            include: {
              briefings: true,
              expenses: true,
              revenue: true,
            },
          },
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
    const clientsWithStats = clients.map(client => ({
      ...client,
      totalDeals: client.deals.length,
      totalValue: client.deals.reduce((sum, d) => sum + d.value, 0),
      activeDeals: client.deals.filter(d => d.status !== 'completed').length,
    }));

    // Se a requisicao veio com params de paginacao, retorna formato paginado
    const hasPagination = searchParams.has('page') || searchParams.has('limit');
    if (hasPagination) {
      return NextResponse.json({
        data: clientsWithStats,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    }

    // Sem params de paginacao: retorna array plano (compatibilidade com SWR)
    return NextResponse.json(clientsWithStats);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { limit: 20, windowMs: 60_000 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Derive organizationId from the authenticated user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await db.userOrganization.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: 'No organization found for user' }, { status: 403 });
    }

    const rawBody = await request.json();
    // Add organizationId from session (not client-provided)
    rawBody.organizationId = membership.organizationId;
    const body = validateOrThrow(clientCreateSchema, rawBody);

    const client = await db.client.create({
      data: {
        organizationId: membership.organizationId,
        phone: body.phone,
        name: body.name,
        email: body.email ?? null,
        eventType: body.eventType,
        notes: body.notes ?? null,
        source: body.source,
        status: body.status,
        avatar: body.avatar ?? null,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    }
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
