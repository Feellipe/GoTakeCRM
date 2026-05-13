import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, revenueUpdateSchema, validateOrigin } from '@/lib/validations';

// GET a single revenue by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const revenue = await db.revenue.findUnique({
      where: { id },
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

    if (!revenue) {
      return NextResponse.json({ error: 'Revenue not found' }, { status: 404 });
    }

    return NextResponse.json(revenue);
  } catch (error) {
    console.error('Error fetching revenue:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 });
  }
}

// PUT update a revenue
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const rawBody = await request.json();
    // Apenas campos validados pelo schema sao aceitos (protecao contra mass assignment)
    const body = validateOrThrow(revenueUpdateSchema, rawBody);

    // Monta data com campos validados; converte data se fornecida
    const data: Record<string, unknown> = { ...body };
    if (body.date) {
      data.date = new Date(body.date);
    }

    const revenue = await db.revenue.update({
      where: { id },
      data,
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

    return NextResponse.json(revenue);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    }
    console.error('Error updating revenue:', error);
    return NextResponse.json({ error: 'Failed to update revenue' }, { status: 500 });
  }
}

// DELETE a revenue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.revenue.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting revenue:', error);
    return NextResponse.json({ error: 'Failed to delete revenue' }, { status: 500 });
  }
}
