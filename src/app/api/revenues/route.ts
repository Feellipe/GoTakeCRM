import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, revenueCreateSchema, validateOrigin } from '@/lib/validations';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';

// GET all revenues
export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 100, windowMs: 60_000 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    const orgId = searchParams.get('orgId') || '';

    // Get user's org membership(s)
    const userOrgs = await db.userOrganization.findMany({
      where: { userId },
      select: { organizationId: true },
    });

    if (userOrgs.length === 0) {
      return NextResponse.json({ error: 'No organizations found' }, { status: 404 });
    }

    // If orgId specified, validate user belongs to it; otherwise aggregate across all
    let orgIds: string[];
    if (orgId) {
      const belongs = userOrgs.some(uo => uo.organizationId === orgId);
      if (!belongs) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }
      orgIds = [orgId];
    } else {
      orgIds = userOrgs.map(uo => uo.organizationId);
    }

    const whereClause: Record<string, unknown> = {};

    if (dealId) {
      whereClause.dealId = dealId;
    }

    // Add org filtering via deal relation
    whereClause.deal = { organizationId: { in: orgIds } };

    const revenues = await db.revenue.findMany({
      where: whereClause,
      include: {
        deal: {
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
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(revenues);
  } catch (error) {
    console.error('Error fetching revenues:', error);
    return NextResponse.json({ error: 'Failed to fetch revenues' }, { status: 500 });
  }
}

// POST create a new revenue
export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { limit: 20, windowMs: 60_000 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const rawBody = await request.json();
    const body = validateOrThrow(revenueCreateSchema, rawBody);

    const revenue = await db.revenue.create({
      data: {
        dealId: body.dealId,
        description: body.description ?? null,
        amount: body.amount,
        currency: body.currency,
        date: body.date ? new Date(body.date) : new Date(),
        status: body.status,
      },
      include: {
        deal: {
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
          },
        },
      },
    });

    return NextResponse.json(revenue, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    }
    console.error('Error creating revenue:', error);
    return NextResponse.json({ error: 'Failed to create revenue' }, { status: 500 });
  }
}
