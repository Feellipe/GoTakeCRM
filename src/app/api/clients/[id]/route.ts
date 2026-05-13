import { db } from '@/lib/db';
import { validateOrThrow, ValidationError, validationErrorResponse, clientUpdateSchema } from '@/lib/validations';
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
    const rawBody = await request.json();
    const body = validateOrThrow(clientUpdateSchema, rawBody);

    // Apenas campos validados sao repassados ao Prisma (protecao contra mass assignment)
    const client = await db.client.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error);
    }
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

    // Busca deals relacionados para excluir registros associados dentro da transacao
    const deals = await db.deal.findMany({ where: { clientId: id } });
    const dealIds = deals.map(d => d.id);

    // Todas as exclusoes em cascata dentro de uma unica transacao
    await db.$transaction([
      db.document.deleteMany({ where: { clientId: id } }),
      db.booking.deleteMany({ where: { clientId: id } }),
      db.briefing.deleteMany({ where: { dealId: { in: dealIds } } }),
      db.expense.deleteMany({ where: { dealId: { in: dealIds } } }),
      db.revenue.deleteMany({ where: { dealId: { in: dealIds } } }),
      db.deal.deleteMany({ where: { clientId: id } }),
      db.client.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
