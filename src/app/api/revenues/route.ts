import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, revenueCreateSchema } from '@/lib/validations';

// GET all revenues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    
    const whereClause = dealId ? { dealId } : {};
    
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
  try {
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
