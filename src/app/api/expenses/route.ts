import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, expenseCreateSchema, validateOrigin } from '@/lib/validations';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';

// GET all expenses
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

    const expenses = await db.expense.findMany({
      where: {
        deal: { organizationId: { in: orgIds } },
      },
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

// POST create new expense
export async function POST(request: NextRequest) {
  const rl = rateLimit(request, { limit: 20, windowMs: 60_000 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const rawBody = await request.json();
    const body = validateOrThrow(expenseCreateSchema, rawBody);

    const expense = await db.expense.create({
      data: {
        dealId: body.dealId,
        category: body.category,
        description: body.description,
        amount: body.amount,
        currency: body.currency,
        date: body.date ? new Date(body.date) : new Date(),
      },
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    }
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
