import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const body = await request.json();
    const { dealId, description, amount, currency, date, status } = body;

    const updateData: Record<string, unknown> = {};
    
    if (dealId !== undefined) updateData.dealId = dealId;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (currency !== undefined) updateData.currency = currency;
    if (date !== undefined) updateData.date = new Date(date);
    if (status !== undefined) updateData.status = status;

    const revenue = await db.revenue.update({
      where: { id },
      data: updateData,
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
    
    await db.revenue.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting revenue:', error);
    return NextResponse.json({ error: 'Failed to delete revenue' }, { status: 500 });
  }
}
