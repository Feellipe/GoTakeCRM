import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await db.client.findUnique({
      where: { id },
      include: {
        deals: {
          include: {
            briefings: true,
            expenses: true,
            revenue: true,
          },
        },
        bookings: true,
        documents: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const client = await db.client.update({
      where: { id },
      data: {
        phone: body.phone,
        name: body.name,
        email: body.email || null,
        eventType: body.eventType,
        notes: body.notes || null,
        source: body.source,
        status: body.status,
        avatar: body.avatar || null,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // First delete related records
    await db.document.deleteMany({ where: { clientId: id } });
    await db.booking.deleteMany({ where: { clientId: id } });
    
    // Get deals to delete related records
    const deals = await db.deal.findMany({ where: { clientId: id } });
    const dealIds = deals.map(d => d.id);
    
    await db.briefing.deleteMany({ where: { dealId: { in: dealIds } } });
    await db.expense.deleteMany({ where: { dealId: { in: dealIds } } });
    await db.revenue.deleteMany({ where: { dealId: { in: dealIds } } });
    await db.deal.deleteMany({ where: { clientId: id } });
    
    // Finally delete the client
    await db.client.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
