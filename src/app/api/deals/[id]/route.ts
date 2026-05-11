import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deal = await db.deal.findUnique({
      where: { id },
      include: {
        client: true,
        briefings: true,
        expenses: true,
        revenue: true,
        bookings: true,
        documents: true,
      },
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const dealWithStats = {
      ...deal,
      totalExpenses: deal.expenses.reduce((sum, e) => sum + e.amount, 0),
      totalRevenue: deal.revenue
        .filter(r => r.status === 'received')
        .reduce((sum, r) => sum + r.amount, 0),
      profit: deal.revenue
        .filter(r => r.status === 'received')
        .reduce((sum, r) => sum + r.amount, 0) - deal.expenses.reduce((sum, e) => sum + e.amount, 0),
    };

    return NextResponse.json(dealWithStats);
  } catch (error) {
    console.error('Error fetching deal:', error);
    return NextResponse.json({ error: 'Failed to fetch deal' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const deal = await db.deal.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description || null,
        status: body.status,
        value: body.value,
        clientId: body.clientId,
      },
      include: {
        client: true,
      },
    });

    return NextResponse.json(deal);
  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Delete related records first
    await db.briefing.deleteMany({ where: { dealId: id } });
    await db.expense.deleteMany({ where: { dealId: id } });
    await db.revenue.deleteMany({ where: { dealId: id } });
    await db.booking.deleteMany({ where: { dealId: id } });
    await db.document.deleteMany({ where: { dealId: id } });
    
    // Delete the deal
    await db.deal.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
  }
}
