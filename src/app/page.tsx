'use client';

import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  DollarSign,
  Calendar,
  Menu,
  X,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  UserCheck,
  Clock,
  ArrowUpRight,
  MoreHorizontal,
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  MapPin,
  Camera,
  Video,
  Image,
  Briefcase,
  Building,
  Star,
  MessageSquare,
  FileText,
  CheckCircle,
  AlertCircle,
  CalendarDays,
  Users2,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
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
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Pie, PieChart, Cell, Line, LineChart, Area, AreaChart } from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types
interface DashboardData {
  kpis: {
    totalRevenue: number;
    totalExpenses: number;
    profit: number;
    pipelineValue: number;
    activeClients: number;
    totalDeals: number;
    totalClients: number;
  };
  dealsByStatus: {
    novo: number;
    briefing: number;
    contando: number;
    producao: number;
    finalizado: number;
  };
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  expensesByCategory: Array<{
    category: string;
    amount: number;
  }>;
  upcomingBookings: Array<{
    id: string;
    eventType: string;
    eventDate: string;
    status: string;
    location: string | null;
    duration: number;
    client: {
      name: string;
      avatar: string | null;
    };
  }>;
  recentDeals: Array<{
    id: string;
    title: string;
    status: string;
    value: number;
    createdAt: string;
    client: {
      name: string;
      avatar: string | null;
    };
  }>;
  topClients: Array<{
    name: string;
    value: number;
    deals: number;
  }>;
  pipeline: {
    novo: Deal[];
    briefing: Deal[];
    contando: Deal[];
    producao: Deal[];
    finalizado: Deal[];
  };
}

interface Client {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  eventType: string;
  notes: string | null;
  source: string;
  status: string;
  avatar: string | null;
  createdAt: string;
  totalDeals: number;
  totalValue: number;
  activeDeals: number;
}

interface Deal {
  id: string;
  title: string;
  status: string;
  value: number;
  client: {
    name: string;
    avatar: string | null;
  };
  createdAt?: string;
  totalExpenses?: number;
  totalRevenue?: number;
  profit?: number;
}

// Navigation items
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'pipeline', label: 'Pipeline', icon: FolderKanban },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

// Event type icons
const eventTypeIcons: Record<string, typeof Camera> = {
  'Wedding': Camera,
  'Corporate Event': Building,
  'Portrait Session': Camera,
  'Product Photography': Camera,
  'Music Video': Video,
  'Documentary': Video,
  'Real Estate': Building,
  'Fashion Shoot': Camera,
  'Birthday Party': Camera,
  'Conference': Users2,
  'Graduation': Camera,
  'Family Portrait': Camera,
  'Engagement': Star,
  'Brand Campaign': Briefcase,
};

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Status colors
const statusColors: Record<string, string> = {
  novo: 'bg-blue-500',
  briefing: 'bg-purple-500',
  contando: 'bg-amber-500',
  producao: 'bg-green-500',
  finalizado: 'bg-warm-700',
  pending: 'bg-amber-500',
  confirmed: 'bg-green-500',
  completed: 'bg-warm-700',
  cancelled: 'bg-red-500',
  active: 'bg-green-500',
  lead: 'bg-blue-500',
  inactive: 'bg-warm-500',
};

const statusLabels: Record<string, string> = {
  novo: 'New',
  briefing: 'Briefing',
  contando: 'Quoting',
  producao: 'Production',
  finalizado: 'Completed',
  active: 'Active',
  lead: 'Lead',
  inactive: 'Inactive',
};

// Chart colors
const CHART_COLORS = ['#b8860b', '#6b5c4a', '#9a8460', '#d4a24c', '#4a9b6b', '#5b8db8', '#9b6bb8', '#c75050'];

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [data, setData] = useState<DashboardData | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchDashboardData();
    fetchClients();
    fetchDeals();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const result = await response.json();
      setClients(result);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchDeals = async () => {
    try {
      const response = await fetch('/api/deals');
      const result = await response.json();
      setDeals(result);
    } catch (error) {
      console.error('Error fetching deals:', error);
    }
  };

  const chartConfig: ChartConfig = {
    revenue: {
      label: 'Revenue',
      color: '#b8860b',
    },
    expenses: {
      label: 'Expenses',
      color: '#6b5c4a',
    },
    profit: {
      label: 'Profit',
      color: '#4a9b6b',
    },
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-warm-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`glass-sidebar fixed left-0 top-0 h-full z-50 transition-all duration-500 ease-in-out ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 flex items-center justify-between border-b border-white/10">
            {sidebarOpen && (
              <div className="flex items-center gap-3 animate-fade-in-up">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-lg shadow-gold/30">
                  <span className="text-white font-bold text-lg">W</span>
                </div>
                <div>
                  <span className="text-white font-semibold text-lg block">WhatsApp</span>
                  <span className="text-white/50 text-xs">CRM Dashboard</span>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeView === item.id
                    ? 'bg-gold text-warm-950 font-medium shadow-lg shadow-gold/20'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="animate-fade-in-up whitespace-nowrap">{item.label}</span>
                )}
              </button>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-gold/30 ring-2 ring-gold/10">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=studio" />
                <AvatarFallback className="bg-gold text-warm-950">ST</AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="animate-fade-in-up">
                  <p className="text-white font-medium text-sm">Studio Pro</p>
                  <p className="text-white/50 text-xs">Admin</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-500 flex flex-col ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 glass border-b border-glass-border">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground capitalize">{activeView}</h1>
              <p className="text-muted-foreground text-sm">
                {activeView === 'dashboard' && 'Welcome back! Here\'s your studio overview.'}
                {activeView === 'clients' && 'Manage your client relationships and contacts.'}
                {activeView === 'pipeline' && 'Track and manage your deals across all stages.'}
                {activeView === 'financials' && 'Revenue, expenses, and profitability insights.'}
                {activeView === 'calendar' && 'Your upcoming shoots and bookings.'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="glass-badge px-4 py-2">
                <Clock className="w-4 h-4 mr-2" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Badge>
              <Button className="gradient-gold text-warm-950 hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4 mr-2" />
                New {activeView === 'clients' ? 'Client' : activeView === 'pipeline' ? 'Deal' : 'Booking'}
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard View */}
        {activeView === 'dashboard' && (
          <div className="p-8 space-y-8 flex-1">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: 'Total Revenue',
                  value: formatCurrency(data?.kpis.totalRevenue || 0),
                  change: '+12.5%',
                  trend: 'up',
                  icon: DollarSign,
                  color: 'from-gold to-gold-light',
                },
                {
                  title: 'Pipeline Value',
                  value: formatCurrency(data?.kpis.pipelineValue || 0),
                  change: `${data?.kpis.totalDeals || 0} deals`,
                  trend: 'neutral',
                  icon: FolderKanban,
                  color: 'from-blue-500 to-blue-600',
                },
                {
                  title: 'Active Clients',
                  value: data?.kpis.activeClients || 0,
                  change: `of ${data?.kpis.totalClients || 0} total`,
                  trend: 'neutral',
                  icon: UserCheck,
                  color: 'from-green-500 to-green-600',
                },
                {
                  title: 'Net Profit',
                  value: formatCurrency(data?.kpis.profit || 0),
                  change: `${Math.round(((data?.kpis.profit || 0) / (data?.kpis.totalRevenue || 1)) * 100)}% margin`,
                  trend: (data?.kpis.profit || 0) > 0 ? 'up' : 'down',
                  icon: Wallet,
                  color: (data?.kpis.profit || 0) > 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600',
                },
              ].map((kpi, index) => (
                <Card
                  key={kpi.title}
                  className={`glass-card kpi-glow animate-fade-in-up`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm font-medium">{kpi.title}</p>
                        <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                        <div className="flex items-center gap-1">
                          {kpi.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {kpi.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                          <span className={`text-xs font-medium ${
                            kpi.trend === 'up' ? 'text-green-500' : kpi.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
                          }`}>
                            {kpi.change}
                          </span>
                        </div>
                      </div>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-lg`}>
                        <kpi.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <Card className="glass-card lg:col-span-2 animate-fade-in-up">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-foreground">Revenue vs Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.monthlyRevenue || []}>
                        <XAxis dataKey="month" stroke="#7a756d" fontSize={12} />
                        <YAxis stroke="#7a756d" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="revenue" fill="#b8860b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" fill="#6b5c4a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Expenses by Category */}
              <Card className="glass-card animate-fade-in-up">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-foreground">Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(data?.expensesByCategory || []).slice(0, 5).map((item, index) => {
                      const total = data?.expensesByCategory.reduce((sum, e) => sum + e.amount, 0) || 1;
                      const percentage = (item.amount / total) * 100;
                      return (
                        <div key={item.category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-foreground">{item.category}</span>
                            <span className="text-sm font-medium text-foreground">
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
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
                    <CardTitle className="text-lg font-semibold text-foreground">Pipeline Overview</CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => setActiveView('pipeline')}>
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(data?.dealsByStatus || {}).map(([status, count]) => {
                      const total = Object.values(data?.dealsByStatus || {}).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <div key={status} className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
                          <span className="text-sm text-foreground flex-1 capitalize">{statusLabels[status] || status}</span>
                          <span className="text-sm font-medium text-foreground w-8">{count}</span>
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${statusColors[status]} transition-all duration-500`}
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
                    <CardTitle className="text-lg font-semibold text-foreground">Upcoming Bookings</CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => setActiveView('calendar')}>
                      View Calendar <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(data?.upcomingBookings || []).slice(0, 4).map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                      >
                        <div className={`w-2 h-12 rounded-full ${statusColors[booking.status]}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{booking.eventType}</p>
                          <p className="text-xs text-muted-foreground">{booking.client.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            {new Date(booking.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{booking.status}</p>
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
                    <CardTitle className="text-lg font-semibold text-foreground">Recent Deals</CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(data?.recentDeals || []).slice(0, 5).map((deal) => (
                      <div
                        key={deal.id}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={deal.client.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${deal.client.name}`} />
                          <AvatarFallback className="bg-warm-200 text-warm-700">
                            {deal.client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{deal.title}</p>
                          <p className="text-xs text-muted-foreground">{deal.client.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">{formatCurrency(deal.value)}</p>
                          <Badge variant="secondary" className={`text-xs text-white ${statusColors[deal.status]}`}>
                            {statusLabels[deal.status] || deal.status}
                          </Badge>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Clients */}
              <Card className="glass-card animate-fade-in-up">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-foreground">Top Clients</CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary" onClick={() => setActiveView('clients')}>
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(data?.topClients || []).map((client, index) => (
                      <div
                        key={client.name}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {index + 1}
                        </div>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} />
                          <AvatarFallback className="bg-warm-200 text-warm-700">
                            {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.deals} deals</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-primary">{formatCurrency(client.value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Clients View */}
        {activeView === 'clients' && (
          <div className="p-8 space-y-6 flex-1">
            {/* Search and Filters */}
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search clients by name, email, or phone..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Clients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((client, index) => {
                const EventIcon = eventTypeIcons[client.eventType] || Camera;
                return (
                  <Card
                    key={client.id}
                    className="glass-card hover:shadow-xl transition-all duration-300 cursor-pointer group"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="w-14 h-14 border-2 border-gold/20 ring-2 ring-gold/5">
                          <AvatarImage src={client.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} />
                          <AvatarFallback className="bg-warm-200 text-warm-700 text-lg">
                            {client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                            <Badge variant="secondary" className={`text-xs text-white ${statusColors[client.status]}`}>
                              {statusLabels[client.status] || client.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <EventIcon className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs text-muted-foreground">{client.eventType}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Value</p>
                          <p className="text-lg font-bold text-primary">{formatCurrency(client.totalValue)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Deals</p>
                          <p className="text-lg font-bold text-foreground">{client.totalDeals}</p>
                        </div>
                      </div>

                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowUpRight className="w-5 h-5 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredClients.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No clients found matching your search.</p>
              </div>
            )}
          </div>
        )}

        {/* Pipeline View */}
        {activeView === 'pipeline' && (
          <div className="p-8 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 min-h-[calc(100vh-16rem)]">
                {['novo', 'briefing', 'contando', 'producao', 'finalizado'].map((status) => {
                  const stageDeals = deals.filter(d => d.status === status);
                  const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
                  
                  return (
                    <div key={status} className="flex flex-col">
                      {/* Stage Header */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
                            <h3 className="font-semibold text-foreground capitalize">{statusLabels[status] || status}</h3>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {stageDeals.length}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{formatCurrency(stageValue)}</p>
                      </div>

                      {/* Deal Cards */}
                      <div className="space-y-3 flex-1">
                        {stageDeals.map((deal) => (
                          <Card
                            key={deal.id}
                            className="glass-card cursor-pointer hover:shadow-lg transition-all duration-300 group"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={deal.client.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${deal.client.name}`} />
                                  <AvatarFallback className="bg-warm-200 text-warm-700 text-xs">
                                    {deal.client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{deal.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">{deal.client.name}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-primary">{formatCurrency(deal.value)}</p>
                                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {stageDeals.length === 0 && (
                          <div className="border-2 border-dashed border-muted rounded-xl p-6 text-center">
                            <p className="text-sm text-muted-foreground">No deals in this stage</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Financials View */}
        {activeView === 'financials' && (
          <div className="p-8 space-y-6 flex-1">
            {/* Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { title: 'Total Revenue', value: formatCurrency(data?.kpis.totalRevenue || 0), icon: TrendingUp, color: 'text-green-500', bgColor: 'bg-green-500/10' },
                { title: 'Total Expenses', value: formatCurrency(data?.kpis.totalExpenses || 0), icon: TrendingDown, color: 'text-red-500', bgColor: 'bg-red-500/10' },
                { title: 'Net Profit', value: formatCurrency(data?.kpis.profit || 0), icon: Wallet, color: (data?.kpis.profit || 0) > 0 ? 'text-green-500' : 'text-red-500', bgColor: (data?.kpis.profit || 0) > 0 ? 'bg-green-500/10' : 'bg-red-500/10' },
                { title: 'Profit Margin', value: `${Math.round(((data?.kpis.profit || 0) / (data?.kpis.totalRevenue || 1)) * 100)}%`, icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
              ].map((kpi) => (
                <Card key={kpi.title} className="glass-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">{kpi.title}</p>
                        <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl ${kpi.bgColor} flex items-center justify-center`}>
                        <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profit Trend */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Profit Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data?.monthlyRevenue || []}>
                        <XAxis dataKey="month" stroke="#7a756d" fontSize={12} />
                        <YAxis stroke="#7a756d" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="profit" stroke="#4a9b6b" fill="#4a9b6b" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Expenses Pie Chart */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Expense Distribution</CardTitle>
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
                          label={({ category, percent }) => `${category.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                        >
                          {(data?.expensesByCategory || []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Calendar View */}
        {activeView === 'calendar' && (
          <div className="p-8 space-y-6 flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar Grid */}
              <Card className="glass-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + i);
                      const dayBookings = (data?.upcomingBookings || []).filter(b => {
                        const bookingDate = new Date(b.eventDate);
                        return bookingDate.toDateString() === date.toDateString();
                      });
                      
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-xl text-center transition-all duration-300 ${
                            i === 0 ? 'bg-primary text-white' : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <p className="text-xs text-muted-foreground mb-1">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                          <p className="text-lg font-bold">{date.getDate()}</p>
                          {dayBookings.length > 0 && (
                            <div className={`w-2 h-2 rounded-full mx-auto mt-1 ${i === 0 ? 'bg-white' : 'bg-primary'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming List */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Upcoming</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    <div className="space-y-3">
                      {(data?.upcomingBookings || []).map((booking) => (
                        <div
                          key={booking.id}
                          className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-10 rounded-full ${statusColors[booking.status]}`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{booking.eventType}</p>
                              <p className="text-xs text-muted-foreground">{booking.client.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(booking.eventDate).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            <Badge variant="secondary" className={`text-xs text-white ${statusColors[booking.status]}`}>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                      {(!data?.upcomingBookings || data.upcomingBookings.length === 0) && (
                        <div className="text-center py-8 text-muted-foreground">
                          <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No upcoming bookings</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-auto border-t border-border bg-card/30 backdrop-blur-sm">
          <div className="px-8 py-4 flex items-center justify-between text-sm text-muted-foreground">
            <p>© 2024 WhatsApp CRM. Built for filmmakers & photographers.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-primary transition-colors">Documentation</a>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
