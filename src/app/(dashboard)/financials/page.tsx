'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, ResponsiveContainer, Pie, PieChart, Cell } from 'recharts';
import { useDashboard } from '@/app/(dashboard)/layout';
import { formatCurrency, CHART_COLORS } from '@/lib/utils';

// Dynamic imports for heavy components
const RevenueManager = dynamic(
  () => import('@/components/revenue-manager').then(mod => ({ default: mod.RevenueManager })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full rounded-xl" />,
  }
);

const ExpenseManager = dynamic(
  () => import('@/components/expense-manager').then(mod => ({ default: mod.ExpenseManager })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-96 w-full rounded-xl" />,
  }
);

const chartConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: '#b8860b' },
  expenses: { label: 'Expenses', color: '#6b5c4a' },
  profit: { label: 'Profit', color: '#4a9b6b' },
};

export default function FinancialsPage() {
  const { data, deals, fetchDashboardData } = useDashboard();

  // useMemo: KPI cards derivados do dashboard (rerender-memo)
  const financialKpis = useMemo(() => [
    { title: 'Total Revenue', value: formatCurrency(data?.kpis.totalRevenue || 0), icon: TrendingUp, color: 'text-green-500', bgColor: 'bg-green-500/10', change: '+12.5%' },
    { title: 'Total Expenses', value: formatCurrency(data?.kpis.totalExpenses || 0), icon: TrendingDown, color: 'text-red-500', bgColor: 'bg-red-500/10', change: '+8.3%' },
    { title: 'Net Profit', value: formatCurrency(data?.kpis.profit || 0), icon: Wallet, color: (data?.kpis.profit || 0) > 0 ? 'text-green-500' : 'text-red-500', bgColor: (data?.kpis.profit || 0) > 0 ? 'bg-green-500/10' : 'bg-red-500/10', change: (data?.kpis.profit || 0) > 0 ? '+15.2%' : '-5.1%' },
    { title: 'Profit Margin', value: `${Math.round(((data?.kpis.profit || 0) / (data?.kpis.totalRevenue || 1)) * 100)}%`, icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10', change: '+2.1%' },
  ], [data?.kpis]);

  // useMemo: expenses por categoria para legenda (rerender-memo)
  const expensesCategoryLegend = useMemo(
    () => (data?.expensesByCategory || []).slice(0, 5),
    [data?.expensesByCategory]
  );

  return (
    <div className="p-8 space-y-6 flex-1">
      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {financialKpis.map((kpi) => (
          <Card key={kpi.title} className="glass-card hover:shadow-xl transition-all duration-300 group cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">{kpi.title}</p>
                <div className={`w-10 h-10 rounded-xl ${kpi.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${kpi.color} mb-1`}>{kpi.value}</p>
              <p className={`text-xs ${kpi.color}`}>{kpi.change} vs last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Profit Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.monthlyRevenue || []}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4a9b6b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4a9b6b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="profit" stroke="#4a9b6b" strokeWidth={3} fill="url(#profitGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Expenses Pie Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              Expense Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.expensesByCategory || []}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={4}
                  >
                    {(data?.expensesByCategory || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {expensesCategoryLegend.map((item, index) => (
                <div key={item.category} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{item.category.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Expense Management */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Financial Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="revenue" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 min-h-[44px]">
              <TabsTrigger value="revenue" className="flex items-center gap-2 py-3">
                <TrendingUp className="w-4 h-4" />
                Revenue
              </TabsTrigger>
              <TabsTrigger value="expenses" className="flex items-center gap-2 py-3">
                <TrendingDown className="w-4 h-4" />
                Expenses
              </TabsTrigger>
            </TabsList>
            <TabsContent value="revenue">
              <RevenueManager
                deals={deals.map(d => ({ id: d.id, title: d.title, value: d.value, client: d.client }))}
                onNotification={() => {
                  fetchDashboardData();
                }}
              />
            </TabsContent>
            <TabsContent value="expenses">
              <ExpenseManager
                deals={deals.map(d => ({ id: d.id, title: d.title, client: d.client }))}
                onExpenseChange={() => {
                  fetchDashboardData();
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
