import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET all expenses
export async function GET() {
  try {
    const expenses = await db.expense.findMany({
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
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const expense = await db.expense.create({
      data: {
        dealId: body.dealId || null,
        category: body.category,
        description: body.description,
        amount: body.amount,
        currency: body.currency || 'BRL',
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
    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
