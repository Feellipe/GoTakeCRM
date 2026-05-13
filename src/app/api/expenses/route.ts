import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, expenseCreateSchema } from '@/lib/validations';

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
