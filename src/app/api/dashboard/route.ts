import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get all deals with client info
    const deals = await db.deal.findMany({
      include: {
        client: true,
        briefings: true,
        expenses: true,
        revenue: true,
      },
    });

    // Get all clients
    const clients = await db.client.findMany();

    // Get all bookings
    const bookings = await db.booking.findMany({
      include: {
        client: true,
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    // Get all expenses
    const expenses = await db.expense.findMany();

    // Get all revenue
    const revenue = await db.revenue.findMany();

    // Calculate KPIs
    const totalRevenue = revenue
      .filter(r => r.status === 'received')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const pipelineValue = deals
      .filter(d => d.status !== 'finalizado')
      .reduce((sum, d) => sum + d.value, 0);

    const activeClients = clients.filter(c => c.status === 'active').length;

    // Deals by status
    const dealsByStatus = {
      novo: deals.filter(d => d.status === 'novo').length,
      briefing: deals.filter(d => d.status === 'briefing').length,
      contando: deals.filter(d => d.status === 'contando').length,
      producao: deals.filter(d => d.status === 'producao').length,
      finalizado: deals.filter(d => d.status === 'finalizado').length,
    };

    // Revenue by month (last 6 months)
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

    // Expenses by category
    const expenseCategories = [
      'Equipment Rental',
      'Location Fee',
      'Crew',
      'Props',
      'Travel',
      'Post-Production',
      'Insurance',
      'Other',
    ];

    const expensesByCategory = expenseCategories.reduce((acc, category) => {
      const total = expenses
        .filter(e => e.category === category)
        .reduce((sum, e) => sum + e.amount, 0);
      if (total > 0) {
        acc.push({ category, amount: total });
      }
      return acc;
    }, [] as { category: string; amount: number }[]);

    // Upcoming bookings (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const upcomingBookings = bookings.filter(b => {
      const eventDate = new Date(b.eventDate);
      return eventDate >= now && eventDate <= sevenDaysFromNow && b.status !== 'cancelled';
    });

    // Recent activity (last 10 deals created/updated)
    const recentDeals = deals
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Top clients by deal value
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
        totalDeals: deals.length,
        totalClients: clients.length,
      },
      dealsByStatus,
      monthlyRevenue,
      expensesByCategory,
      upcomingBookings,
      recentDeals,
      topClients,
      pipeline: {
        novo: deals.filter(d => d.status === 'novo'),
        briefing: deals.filter(d => d.status === 'briefing'),
        contando: deals.filter(d => d.status === 'contando'),
        producao: deals.filter(d => d.status === 'producao'),
        finalizado: deals.filter(d => d.status === 'finalizado'),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
