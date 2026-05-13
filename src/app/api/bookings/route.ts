import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, bookingCreateSchema } from '@/lib/validations';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || '';
    const upcoming = searchParams.get('upcoming') === 'true';

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (upcoming) {
      where.eventDate = {
        gte: new Date(),
      };
    }

    const bookings = await db.booking.findMany({
      where,
      include: {
        client: true,
        deal: true,
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const body = validateOrThrow(bookingCreateSchema, rawBody);

    const booking = await db.booking.create({
      data: {
        clientId: body.clientId,
        dealId: body.dealId ?? null,
        eventType: body.eventType,
        eventDate: new Date(body.eventDate),
        duration: body.duration,
        location: body.location ?? null,
        status: body.status,
        notes: body.notes ?? null,
      },
      include: {
        client: true,
      },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    }
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
