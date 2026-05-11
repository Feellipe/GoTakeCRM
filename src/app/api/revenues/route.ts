import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const body = await request.json();
    const { dealId, description, amount, currency, date, status } = body;

    if (!dealId || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const revenue = await db.revenue.create({
      data: {
        dealId,
        description: description || null,
        amount: parseFloat(amount),
        currency: currency || 'BRL',
        date: date ? new Date(date) : new Date(),
        status: status || 'received',
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
    console.error('Error creating revenue:', error);
    return NextResponse.json({ error: 'Failed to create revenue' }, { status: 500 });
  }
}
