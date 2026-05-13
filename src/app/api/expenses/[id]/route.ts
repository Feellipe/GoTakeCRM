import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, expenseUpdateSchema, validateOrigin } from '@/lib/validations';

// GET single expense
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expense = await db.expense.findUnique({
      where: { id },
      include: {
        deal: true,
      },
    });
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
  }
}

// PUT update expense
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const rawBody = await request.json();
    const body = validateOrThrow(expenseUpdateSchema, rawBody);

    // Monta data com campos validados; converte data se fornecida
    const data: Record<string, unknown> = { ...body };
    if (body.date) {
      data.date = new Date(body.date);
    }

    const expense = await db.expense.update({
      where: { id },
      data,
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
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    }
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

// DELETE expense
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await db.expense.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
