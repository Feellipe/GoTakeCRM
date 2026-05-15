'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  FolderKanban,
  UserCheck,
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  Star,
  ChevronRight,
  ArrowRight,
  Target,
  CalendarDays,
  Users,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { useDashboard } from '@/app/(dashboard)/layout';
import { formatCurrency, statusColors, statusLabels } from '@/lib/utils';

const chartConfig: ChartConfig = {
  revenue: { label: 'Revenue', color: '#b8860b' },
  expenses: { label: 'Expenses', color: '#6b5c4a' },
  profit: { label: 'Profit', color: '#4a9b6b' },
};

export default function DashboardPage() {
  const { data } = useDashboard();

  // useMemo: dados dos KPI cards derivados do dashboard (rerender-memo)
  const kpis = useMemo(() => [
    {
      title: 'Total Revenue',
      value: formatCurrency(data?.kpis.totalRevenue || 0),
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'from-gold to-gold-light',
      description: 'vs last month',
    },
    {
      title: 'Pipeline Value',
      value: formatCurrency(data?.kpis.pipelineValue || 0),
      change: `${data?.kpis.totalDeals || 0} deals`,
      trend: 'neutral',
      icon: FolderKanban,
      color: 'from-blue-500 to-blue-600',
      description: 'Active opportunities',
    },
    {
      title: 'Active Clients',
      value: data?.kpis.activeClients || 0,
      change: `of ${data?.kpis.totalClients || 0} total`,
      trend: 'neutral',
      icon: UserCheck,
      color: 'from-green-500 to-green-600',
      description: 'Client relationships',
    },
    {
      title: 'Net Profit',
      value: formatCurrency(data?.kpis.profit || 0),
      change: `${Math.round(((data?.kpis.profit || 0) / (data?.kpis.totalRevenue || 1)) * 100)}% margin`,
      trend: (data?.kpis.profit || 0) > 0 ? 'up' : 'down',
      icon: Wallet,
      color: (data?.kpis.profit || 0) > 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600',
      description: 'After expenses',
    },
  ], [data?.kpis]);

  // useMemo: deals recentes filtrados para exibicao (rerender-memo)
  const recentDealsList = useMemo(() => (data?.recentDeals || []).slice(0, 5), [data?.recentDeals]);

  return (
    <div className="p-8 space-y-8 flex-1">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <Card
            key={kpi.title}
            className="glass-card kpi-glow animate-fade-in-up group cursor-pointer hover:shadow-2xl transition-all duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground text-sm font-medium">{kpi.title}</p>
                    <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                  </div>
                  <p className="text-3xl font-bold text-foreground tracking-tight">{kpi.value}</p>
                  <div className="flex items-center gap-2">
                    {kpi.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                    {kpi.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                    <span className={`text-xs font-medium ${
                      kpi.trend === 'up' ? 'text-green-500' : kpi.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
                    }`}>
                      {kpi.change}
                    </span>
                    <span className="text-xs text-muted-foreground">{kpi.description}</span>
                  </div>
                </div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <kpi.icon className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/clients">
          <Card className="glass-card cursor-pointer hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Manage Clients</p>
                <p className="text-sm text-muted-foreground">View and edit client details</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/pipeline">
          <Card className="glass-card cursor-pointer hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Track Pipeline</p>
                <p className="text-sm text-muted-foreground">Monitor deal progress</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/financials">
          <Card className="glass-card cursor-pointer hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                <Activity className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">View Reports</p>
                <p className="text-sm text-muted-foreground">Financial insights</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="glass-card lg:col-span-2 animate-fade-in-up">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Revenue vs Expenses
              </CardTitle>
              <Select defaultValue="6months">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6months">6 Months</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.monthlyRevenue || []}>
                  <XAxis dataKey="month" stroke="#7a756d" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#7a756d" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="#b8860b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" fill="#6b5c4a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card className="glass-card animate-fade-in-up">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data?.expensesByCategory || []).slice(0, 5).map((item) => {
                const total = data?.expensesByCategory.reduce((sum, e) => sum + e.amount, 0) || 1;
                const percentage = (item.amount / total) * 100;
                return (
                  <div key={item.category} className="space-y-2 group cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors">{item.category}</span>
                      <span className="text-sm font-medium text-foreground">{formatCurrency(item.amount)}</span>
                    </div>
                    <Progress value={percentage} className="h-2 group-hover:h-3 transition-all" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline & Bookings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deal Pipeline Overview */}
        <Card className="glass-card animate-fade-in-up">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-primary" />
                Pipeline Overview
              </CardTitle>
              <Link href="/pipeline">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data?.dealsByStatus || {}).map(([status, count]) => {
                const total = Object.values(data?.dealsByStatus || {}).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={status} className="flex items-center gap-4 group cursor-pointer">
                    <div className={`w-3 h-3 rounded-full ${statusColors[status]} group-hover:scale-125 transition-transform`} />
                    <span className="text-sm text-foreground flex-1 capitalize group-hover:text-primary transition-colors">{statusLabels[status] || status}</span>
                    <span className="text-sm font-medium text-foreground w-8">{count}</span>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusColors[status]} transition-all duration-500 group-hover:brightness-110`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card className="glass-card animate-fade-in-up">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Upcoming Bookings
              </CardTitle>
              <Link href="/calendar">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                  View Calendar <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.upcomingBookings || []).slice(0, 4).map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-300 cursor-pointer group border border-transparent hover:border-primary/20"
                >
                  <div className={`w-2 h-12 rounded-full ${statusColors[booking.status]} group-hover:h-14 transition-all`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{booking.eventType}</p>
                    <p className="text-xs text-muted-foreground">{booking.client.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {new Date(booking.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <Badge variant="secondary" className={`text-xs text-white ${statusColors[booking.status]}`}>
                      {booking.status}
                    </Badge>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
              {(!data?.upcomingBookings || data.upcomingBookings.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  No upcoming bookings this week
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Top Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deals */}
        <Card className="glass-card animate-fade-in-up">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Recent Deals
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDealsList.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-all duration-300 cursor-pointer group border border-transparent hover:border-primary/20"
                >
                  <Avatar className="w-10 h-10 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                    <AvatarImage src={deal.client.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${deal.client.name}`} />
                    <AvatarFallback className="bg-warm-200 text-warm-700">
                      {deal.client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{deal.title}</p>
                    <p className="text-xs text-muted-foreground">{deal.client.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{formatCurrency(deal.value)}</p>
                    <Badge variant="secondary" className={`text-xs text-white ${statusColors[deal.status]}`}>
                      {statusLabels[deal.status] || deal.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="glass-card animate-fade-in-up">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Top Clients
              </CardTitle>
              <Link href="/clients">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.topClients || []).map((client, index) => (
                <div
                  key={client.name}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-all duration-300 cursor-pointer group border border-transparent hover:border-gold/20"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                    index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                    'bg-gradient-to-br from-warm-400 to-warm-600'
                  }`}>
                    {index + 1}
                  </div>
                  <Avatar className="w-10 h-10 ring-2 ring-transparent group-hover:ring-gold/30 transition-all">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} />
                    <AvatarFallback className="bg-warm-200 text-warm-700">
                      {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.deals} deals</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{formatCurrency(client.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
