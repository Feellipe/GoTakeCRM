import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const eventType = searchParams.get('eventType') || '';

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (eventType) {
      where.eventType = eventType;
    }

    const clients = await db.client.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add computed fields
    const clientsWithStats = clients.map(client => ({
      ...client,
      totalDeals: client.deals.length,
      totalValue: client.deals.reduce((sum, d) => sum + d.value, 0),
      activeDeals: client.deals.filter(d => d.status !== 'finalizado').length,
    }));

    return NextResponse.json(clientsWithStats);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const client = await db.client.create({
      data: {
        phone: body.phone,
        name: body.name,
        email: body.email || null,
        eventType: body.eventType,
        notes: body.notes || null,
        source: body.source || 'whatsapp',
        status: body.status || 'lead',
        avatar: body.avatar || null,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
