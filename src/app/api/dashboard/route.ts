import { db } from '@/lib/db';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, { limit: 100, windowMs: 60_000 });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    // Paraleliza todas as chamadas ao banco (async-parallel)
    const [
      deals,
      clients,
      bookings,
      expenses,
      revenue,
      totalRevenueAgg,
      totalExpensesAgg,
      pipelineValueAgg,
      activeClientsCount,
      totalDealsCount,
      totalClientsCount,
      dealsByStatusRaw,
      expensesByCategoryRaw,
    ] = await Promise.all([
      // Dados completos necessarios para upcomingBookings, recentDeals, topClients, pipeline
      db.deal.findMany({
        include: {
          client: true,
          briefings: true,
          expenses: true,
          revenue: true,
        },
      }),
      db.client.findMany(),
      db.booking.findMany({
        include: { client: true },
        orderBy: { eventDate: 'asc' },
      }),
      db.expense.findMany(),
      db.revenue.findMany(),

      // Agregacoes Prisma (substituem filtros/reduces JS)
      db.revenue.aggregate({
        _sum: { amount: true },
        where: { status: 'received' },
      }),
      db.expense.aggregate({
        _sum: { amount: true },
      }),
      db.deal.aggregate({
        _sum: { value: true },
        where: { status: { not: 'completed' } },
      }),
      db.client.count({
        where: { status: 'active' },
      }),
      db.deal.count(),
      db.client.count(),

      // groupBy para deals por status
      db.deal.groupBy({
        by: ['status'],
        _count: true,
      }),

      // groupBy para expenses por categoria (somente amount > 0)
      db.expense.groupBy({
        by: ['category'],
        _sum: { amount: true },
        where: { amount: { gt: 0 } },
      }),
    ]);

    // Extrai resultados das agregacoes
    const totalRevenue = totalRevenueAgg._sum.amount ?? 0;
    const totalExpenses = totalExpensesAgg._sum.amount ?? 0;
    const pipelineValue = pipelineValueAgg._sum.value ?? 0;
    const activeClients = activeClientsCount;
    const totalDeals = totalDealsCount;
    const totalClients = totalClientsCount;

    // Constroi dealsByStatus a partir do groupBy
    const dealsByStatus = {
      new: 0,
      briefing: 0,
      quoting: 0,
      production: 0,
      completed: 0,
    };
    for (const group of dealsByStatusRaw) {
      if (group.status in dealsByStatus) {
        (dealsByStatus as Record<string, number>)[group.status] = group._count;
      }
    }

    // Constroi expensesByCategory a partir do groupBy
    const expensesByCategory = expensesByCategoryRaw
      .map((group) => ({
        category: group.category,
        amount: group._sum.amount ?? 0,
      }))
      .filter((item) => item.amount > 0);

    // Revenue por mes (ultimos 6 meses) — mantido como loop JS
    // Prisma SQLite nao possui date_trunc para groupBy temporal
    const now = new Date();
    const monthlyRevenue: { month: string; revenue: number; expenses: number; profit: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const monthRevenue = revenue
        .filter(r => {
          const date = new Date(r.date);
          return r.status === 'received' && date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, r) => sum + r.amount, 0);

      const monthExpenses = expenses
        .filter(e => {
          const date = new Date(e.date);
          return date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      monthlyRevenue.unshift({
        month: monthStart.toLocaleString('en-US', { month: 'short' }),
        revenue: monthRevenue,
        expenses: monthExpenses,
        profit: monthRevenue - monthExpenses,
      });
    }

    // Upcoming bookings (proximos 7 dias) — necessita registros completos
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcomingBookings = bookings.filter(b => {
      const eventDate = new Date(b.eventDate);
      return eventDate >= now && eventDate <= sevenDaysFromNow && b.status !== 'cancelled';
    });

    // Atividade recente (ultimos 10 deals criados/atualizados)
    const recentDeals = deals
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Top clientes por valor de deals — necessita registros completos
    const clientValues = new Map<string, { name: string; value: number; deals: number }>();
    deals.forEach(deal => {
      const existing = clientValues.get(deal.clientId);
      if (existing) {
        existing.value += deal.value;
        existing.deals += 1;
      } else {
        clientValues.set(deal.clientId, {
          name: deal.client.name,
          value: deal.value,
          deals: 1,
        });
      }
    });

    const topClients = Array.from(clientValues.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return NextResponse.json({
      kpis: {
        totalRevenue,
        totalExpenses,
        profit: totalRevenue - totalExpenses,
        pipelineValue,
        activeClients,
        totalDeals,
        totalClients,
      },
      dealsByStatus,
      monthlyRevenue,
      expensesByCategory,
      upcomingBookings,
      recentDeals,
      topClients,
      pipeline: {
        new: deals.filter(d => d.status === 'new'),
        briefing: deals.filter(d => d.status === 'briefing'),
        quoting: deals.filter(d => d.status === 'quoting'),
        production: deals.filter(d => d.status === 'production'),
        completed: deals.filter(d => d.status === 'completed'),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
