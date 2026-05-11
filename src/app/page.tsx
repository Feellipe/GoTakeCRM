'use client';

import React, { useState, useEffect } from 'react';
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
  Plus,
  Phone,
  Mail,
  MapPin,
  Camera,
  Video,
  Briefcase,
  Building,
  Star,
  MessageSquare,
  FileText,
  CheckCircle,
  CalendarDays,
  Users2,
  ArrowRight,
  Bell,
  Send,
  Paperclip,
  Smile,
  ChevronDown,
  ExternalLink,
  Edit,
  Trash2,
  Eye,
  Download,
  Sparkles,
  Activity,
  Target,
  Zap,
  Settings,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUpIcon,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Pie, PieChart, Cell, Area, AreaChart } from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationDropdown } from '@/components/notification-dropdown';
import { ClientFormModal } from '@/components/client-form-modal';
import { DealFormModal } from '@/components/deal-form-modal';
import { BookingFormModal } from '@/components/booking-form-modal';
import { DraggableDealCard } from '@/components/draggable-deal-card';
import { ExportButton } from '@/components/export-button';
import { GlobalSearch } from '@/components/global-search';
import { SettingsPanel } from '@/components/settings-panel';
import { BriefingModal } from '@/components/briefing-modal';
import { QuickActions } from '@/components/quick-actions';
import { ClientActivityTimeline } from '@/components/client-activity-timeline';
import { ProposalsView } from '@/components/proposals-view';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

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
    id?: string;
    phone?: string;
    email?: string | null;
  };
  createdAt?: string;
  totalExpenses?: number;
  totalRevenue?: number;
  profit?: number;
  description?: string;
}

// Navigation items
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'pipeline', label: 'Pipeline', icon: FolderKanban },
  { id: 'proposals', label: 'Proposals', icon: FileText },
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

// Mock WhatsApp messages
const mockWhatsAppMessages = [
  { id: '1', sender: 'client', text: 'Hi! I\'m interested in booking a wedding shoot.', time: '10:30 AM' },
  { id: '2', sender: 'studio', text: 'Hello! Thank you for reaching out. We\'d love to help capture your special day! 📸', time: '10:32 AM' },
  { id: '3', sender: 'client', text: 'The wedding is in December. Do you have availability?', time: '10:35 AM' },
  { id: '4', sender: 'studio', text: 'Let me check our calendar... Yes, we have openings in December! Would you like to schedule a consultation?', time: '10:37 AM' },
];

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [data, setData] = useState<DashboardData | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showWhatsAppPanel, setShowWhatsAppPanel] = useState(false);
  const [whatsappClient, setWhatsappClient] = useState<Client | null>(null);
  
  // CRUD Modal states
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  
  // Notifications
  const [notifications] = useState([
    { id: '1', title: 'New booking confirmed', message: 'Wedding shoot with Ana Silva', time: '2 min ago', read: false, type: 'booking' as const },
    { id: '2', title: 'Payment received', message: 'R$5,000 from Pedro Costa', time: '1 hour ago', read: false, type: 'payment' as const },
    { id: '3', title: 'Briefing updated', message: 'Music Video project details added', time: '3 hours ago', read: true, type: 'briefing' as const },
    { id: '4', title: 'New client registered', message: 'Maria Santos joined from website', time: '5 hours ago', read: true, type: 'client' as const },
    { id: '5', title: 'Booking reminder', message: 'Portrait session tomorrow at 10AM', time: '1 day ago', read: false, type: 'booking' as const },
  ]);
  
  // Briefing Modal state
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  
  // Global Search trigger state
  const [triggerSearch, setTriggerSearch] = useState(false);
  
  // Settings trigger state
  const [triggerSettings, setTriggerSettings] = useState(false);

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
    revenue: { label: 'Revenue', color: '#b8860b' },
    expenses: { label: 'Expenses', color: '#6b5c4a' },
    profit: { label: 'Profit', color: '#4a9b6b' },
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openWhatsApp = (client: Client) => {
    setWhatsappClient(client);
    setShowWhatsAppPanel(true);
  };

  // CRUD Handlers
  const handleSaveClient = async (clientData: Partial<Client>) => {
    try {
      if (editingClient?.id) {
        // Update existing client
        const response = await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData),
        });
        if (response.ok) {
          fetchClients();
          fetchDashboardData();
        }
      } else {
        // Create new client
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData),
        });
        if (response.ok) {
          fetchClients();
          fetchDashboardData();
        }
      }
    } catch (error) {
      console.error('Error saving client:', error);
    }
    setEditingClient(null);
  };

  const handleDeleteClient = async () => {
    if (!editingClient?.id) return;
    try {
      const response = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchClients();
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error deleting client:', error);
    }
    setEditingClient(null);
  };

  const handleSaveDeal = async (dealData: Partial<Deal>) => {
    try {
      if (editingDeal?.id) {
        const response = await fetch(`/api/deals/${editingDeal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dealData),
        });
        if (response.ok) {
          fetchDeals();
          fetchDashboardData();
        }
      } else {
        const response = await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dealData),
        });
        if (response.ok) {
          fetchDeals();
          fetchDashboardData();
        }
      }
    } catch (error) {
      console.error('Error saving deal:', error);
    }
    setEditingDeal(null);
  };

  const handleDeleteDeal = async () => {
    if (!editingDeal?.id) return;
    try {
      const response = await fetch(`/api/deals/${editingDeal.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchDeals();
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error deleting deal:', error);
    }
    setEditingDeal(null);
  };

  const handleSaveBooking = async (bookingData: any) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      if (response.ok) {
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error saving booking:', error);
    }
    setEditingBooking(null);
  };

  const openNewClientModal = () => {
    setEditingClient(null);
    setShowClientModal(true);
  };

  const openEditClientModal = (client: Client) => {
    setEditingClient(client);
    setShowClientModal(true);
    setSelectedClient(null);
  };

  const openNewDealModal = () => {
    setEditingDeal(null);
    setShowDealModal(true);
  };

  const openEditDealModal = (deal: Deal) => {
    setEditingDeal(deal);
    setShowDealModal(true);
    setSelectedDeal(null);
  };

  const openNewBookingModal = () => {
    setEditingBooking(null);
    setShowBookingModal(true);
  };

  // Drag and drop setup
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeDeal, setActiveDeal] = React.useState<Deal | null>(null);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);

    if (!over) return;

    const dealId = active.id as string;
    const newStatus = over.id as string;

    // If dropped on a status column, update the deal status
    if (['novo', 'briefing', 'contando', 'producao', 'finalizado'].includes(newStatus)) {
      const deal = deals.find(d => d.id === dealId);
      if (deal && deal.status !== newStatus) {
        try {
          await fetch(`/api/deals/${dealId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...deal, status: newStatus }),
          });
          fetchDeals();
          fetchDashboardData();
        } catch (error) {
          console.error('Error updating deal status:', error);
        }
      }
    }
  };

  const handleDragStart = (event: { active: { id: string } }) => {
    const deal = deals.find(d => d.id === event.active.id);
    setActiveDeal(deal || null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-warm-200 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-muted-foreground animate-pulse">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Animated Background Orbs */}
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-lg shadow-gold/30 relative overflow-hidden">
                  <span className="text-white font-bold text-lg relative z-10">W</span>
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
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
                {activeView === item.id && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>
            ))}
          </nav>

          {/* Quick Stats */}
          {sidebarOpen && (
            <div className="p-4 border-t border-white/10 animate-fade-in-up">
              <p className="text-white/50 text-xs mb-3 uppercase tracking-wider">Quick Stats</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Active Deals</span>
                  <span className="text-white font-medium">{data?.kpis.totalDeals || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Pipeline Value</span>
                  <span className="text-gold font-medium">{formatCurrency(data?.kpis.pipelineValue || 0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* User section */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-gold/30 ring-2 ring-gold/10">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=studio" />
                <AvatarFallback className="bg-gold text-warm-950">ST</AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="animate-fade-in-up flex-1">
                  <p className="text-white font-medium text-sm">Studio Pro</p>
                  <p className="text-white/50 text-xs">Admin</p>
                </div>
              )}
              {sidebarOpen && (
                <SettingsPanel
                  trigger={
                    <button className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
                      <Settings className="w-5 h-5" />
                    </button>
                  }
                />
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
              <h1 className="text-2xl font-bold text-foreground capitalize flex items-center gap-2">
                {activeView === 'dashboard' && <LayoutDashboard className="w-6 h-6 text-primary" />}
                {activeView === 'clients' && <Users className="w-6 h-6 text-primary" />}
                {activeView === 'pipeline' && <FolderKanban className="w-6 h-6 text-primary" />}
                {activeView === 'proposals' && <FileText className="w-6 h-6 text-primary" />}
                {activeView === 'financials' && <DollarSign className="w-6 h-6 text-primary" />}
                {activeView === 'calendar' && <Calendar className="w-6 h-6 text-primary" />}
                {activeView}
              </h1>
              <p className="text-muted-foreground text-sm">
                {activeView === 'dashboard' && 'Welcome back! Here\'s your studio overview.'}
                {activeView === 'clients' && 'Manage your client relationships and contacts.'}
                {activeView === 'pipeline' && 'Track and manage your deals across all stages.'}
                {activeView === 'proposals' && 'Create and send professional proposals to clients.'}
                {activeView === 'financials' && 'Revenue, expenses, and profitability insights.'}
                {activeView === 'calendar' && 'Your upcoming shoots and bookings.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Global Search */}
              <GlobalSearch
                clients={clients}
                deals={deals}
                bookings={data?.upcomingBookings || []}
                onSelectClient={(client) => {
                  setActiveView('clients');
                  setSelectedClient(client);
                }}
                onSelectDeal={(deal) => {
                  setActiveView('pipeline');
                  setSelectedDeal(deal);
                }}
                onSelectBooking={() => {
                  setActiveView('calendar');
                }}
              />
              
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* Notifications */}
              <NotificationDropdown notifications={notifications} />
              
              {/* Export */}
              <ExportButton data={{ clients, deals, kpis: data?.kpis }} />
              
              <Badge variant="secondary" className="glass-badge px-4 py-2">
                <Clock className="w-4 h-4 mr-2" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Badge>
              
              <Button 
                className="gradient-gold text-warm-950 hover:opacity-90 transition-all duration-300 shadow-lg shadow-gold/20 hover:shadow-gold/30 hover:scale-105"
                onClick={() => {
                  if (activeView === 'clients') openNewClientModal();
                  else if (activeView === 'pipeline') openNewDealModal();
                  else openNewBookingModal();
                }}
              >
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
              ].map((kpi, index) => (
                <Card
                  key={kpi.title}
                  className={`glass-card kpi-glow animate-fade-in-up group cursor-pointer hover:shadow-2xl transition-all duration-500`}
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
              <Card className="glass-card cursor-pointer hover:shadow-xl transition-all duration-300 group" onClick={() => setActiveView('clients')}>
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
              
              <Card className="glass-card cursor-pointer hover:shadow-xl transition-all duration-300 group" onClick={() => setActiveView('pipeline')}>
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
              
              <Card className="glass-card cursor-pointer hover:shadow-xl transition-all duration-300 group" onClick={() => setActiveView('financials')}>
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
                    <Zap className="w-5 h-5 text-primary" />
                    Expenses by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(data?.expensesByCategory || []).slice(0, 5).map((item, index) => {
                      const total = data?.expensesByCategory.reduce((sum, e) => sum + e.amount, 0) || 1;
                      const percentage = (item.amount / total) * 100;
                      return (
                        <div key={item.category} className="space-y-2 group cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-foreground group-hover:text-primary transition-colors">{item.category}</span>
                            <span className="text-sm font-medium text-foreground">
                              {formatCurrency(item.amount)}
                            </span>
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
                    <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10" onClick={() => setActiveView('pipeline')}>
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
                    <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10" onClick={() => setActiveView('calendar')}>
                      View Calendar <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(data?.recentDeals || []).slice(0, 5).map((deal) => (
                      <div
                        key={deal.id}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-all duration-300 cursor-pointer group border border-transparent hover:border-primary/20"
                        onClick={() => setSelectedDeal(deal)}
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
                    <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Star className="w-5 h-5 text-primary" />
                      Top Clients
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10" onClick={() => setActiveView('clients')}>
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
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
                    className="glass-card hover:shadow-2xl transition-all duration-500 cursor-pointer group border border-transparent hover:border-primary/20"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <Avatar className="w-14 h-14 border-2 border-gold/20 ring-2 ring-gold/5 group-hover:ring-gold/20 transition-all">
                          <AvatarImage src={client.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} />
                          <AvatarFallback className="bg-warm-200 text-warm-700 text-lg">
                            {client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{client.name}</h3>
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
                        <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                          <Phone className="w-4 h-4" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                      </div>

                      <Separator className="my-4" />

                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Value</p>
                          <p className="text-lg font-bold text-primary">{formatCurrency(client.totalValue)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Deals</p>
                          <p className="text-lg font-bold text-foreground">{client.totalDeals}</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 group-hover:bg-primary/10 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClient(client);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 hover:bg-green-500/10 hover:text-green-600 hover:border-green-500/30 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWhatsApp(client);
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          WhatsApp
                        </Button>
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
            >
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 min-h-[calc(100vh-16rem)]">
                  {['novo', 'briefing', 'contando', 'producao', 'finalizado'].map((status) => {
                    const stageDeals = deals.filter(d => d.status === status);
                    const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
                    
                    return (
                      <div key={status} className="flex flex-col">
                        {/* Stage Header */}
                        <div className="mb-4 p-3 rounded-xl bg-muted/30 border border-muted">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
                              <h3 className="font-semibold text-foreground capitalize">{statusLabels[status] || status}</h3>
                            </div>
                            <Badge variant="secondary" className="text-xs bg-white/50">
                              {stageDeals.length}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-primary">{formatCurrency(stageValue)}</p>
                        </div>

                        {/* Deal Cards - Droppable Zone */}
                        <div 
                          id={status}
                          className="space-y-3 flex-1 min-h-[100px] rounded-xl border-2 border-dashed border-transparent p-1"
                        >
                          <SortableContext
                            items={stageDeals.map(d => d.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {stageDeals.map((deal) => (
                              <DraggableDealCard
                                key={deal.id}
                                deal={deal}
                                statusColors={statusColors}
                                statusLabels={statusLabels}
                                formatCurrency={formatCurrency}
                                onClick={() => setSelectedDeal(deal)}
                              />
                            ))}
                          </SortableContext>
                          {stageDeals.length === 0 && (
                            <div className="border-2 border-dashed border-muted rounded-xl p-6 text-center hover:border-primary/30 transition-colors cursor-pointer" id={status}>
                              <Plus className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Add deal</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <DragOverlay>
                {activeDeal && (
                  <Card className="glass-card shadow-2xl ring-2 ring-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={activeDeal.client.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeDeal.client.name}`} />
                          <AvatarFallback className="bg-warm-200 text-warm-700 text-xs">
                            {activeDeal.client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{activeDeal.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{activeDeal.client.name}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-primary">{formatCurrency(activeDeal.value)}</p>
                    </CardContent>
                  </Card>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {/* Proposals View */}
        {activeView === 'proposals' && (
          <ProposalsView clients={clients} />
        )}

        {/* Financials View */}
        {activeView === 'financials' && (
          <div className="p-8 space-y-6 flex-1">
            {/* Financial KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { title: 'Total Revenue', value: formatCurrency(data?.kpis.totalRevenue || 0), icon: TrendingUp, color: 'text-green-500', bgColor: 'bg-green-500/10', change: '+12.5%' },
                { title: 'Total Expenses', value: formatCurrency(data?.kpis.totalExpenses || 0), icon: TrendingDown, color: 'text-red-500', bgColor: 'bg-red-500/10', change: '+8.3%' },
                { title: 'Net Profit', value: formatCurrency(data?.kpis.profit || 0), icon: Wallet, color: (data?.kpis.profit || 0) > 0 ? 'text-green-500' : 'text-red-500', bgColor: (data?.kpis.profit || 0) > 0 ? 'bg-green-500/10' : 'bg-red-500/10', change: (data?.kpis.profit || 0) > 0 ? '+15.2%' : '-5.1%' },
                { title: 'Profit Margin', value: `${Math.round(((data?.kpis.profit || 0) / (data?.kpis.totalRevenue || 1)) * 100)}%`, icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10', change: '+2.1%' },
              ].map((kpi) => (
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
                        <XAxis dataKey="month" stroke="#7a756d" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#7a756d" fontSize={12} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
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
                    {(data?.expensesByCategory || []).slice(0, 5).map((item, index) => (
                      <div key={item.category} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        <span className="text-xs text-muted-foreground">{item.category.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
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
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-3">
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
                          className={`p-4 rounded-2xl text-center transition-all duration-300 cursor-pointer hover:scale-105 ${
                            i === 0 ? 'bg-gradient-to-br from-gold to-gold-light text-white shadow-lg shadow-gold/30' : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <p className={`text-xs mb-1 ${i === 0 ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                          <p className={`text-2xl font-bold mb-2 ${i === 0 ? '' : 'text-foreground'}`}>{date.getDate()}</p>
                          {dayBookings.length > 0 && (
                            <div className="flex justify-center">
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                i === 0 ? 'bg-white/20 text-white' : 'bg-primary/20 text-primary'
                              }`}>
                                {dayBookings.length} {dayBookings.length === 1 ? 'event' : 'events'}
                              </div>
                            </div>
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
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Upcoming
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    <div className="space-y-3">
                      {(data?.upcomingBookings || []).map((booking) => (
                        <div
                          key={booking.id}
                          className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-300 cursor-pointer group border border-transparent hover:border-primary/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-12 rounded-full ${statusColors[booking.status]} group-hover:h-14 transition-all`} />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{booking.eventType}</p>
                              <p className="text-xs text-muted-foreground">{booking.client.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
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

      {/* Client Detail Modal */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-3xl glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={selectedClient?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedClient?.name}`} />
                <AvatarFallback className="bg-warm-200 text-warm-700">
                  {selectedClient?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p>{selectedClient?.name}</p>
                <Badge variant="secondary" className={`text-xs text-white ${statusColors[selectedClient?.status || '']}`}>
                  {statusLabels[selectedClient?.status || ''] || selectedClient?.status}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Client Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(selectedClient?.totalValue || 0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total Deals</p>
                  <p className="text-lg font-bold text-foreground">{selectedClient?.totalDeals || 0}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedClient?.phone}</span>
                </div>
                {selectedClient?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedClient.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedClient?.eventType}</span>
                </div>
              </div>
              {selectedClient?.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm text-foreground">{selectedClient.notes}</p>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (selectedClient) openWhatsApp(selectedClient);
                    setSelectedClient(null);
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => selectedClient && openEditClientModal(selectedClient)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
            
            {/* Right Column - Activity Timeline */}
            <div className="border-l border-border pl-6">
              {selectedClient && (
                <ClientActivityTimeline
                  clientId={selectedClient.id}
                  clientName={selectedClient.name}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deal Detail Modal */}
      <Dialog open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
        <DialogContent className="max-w-lg glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedDeal?.title}</span>
              <Badge variant="secondary" className={`text-xs text-white ${statusColors[selectedDeal?.status || '']}`}>
                {statusLabels[selectedDeal?.status || ''] || selectedDeal?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedDeal?.client.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-gold/10 to-gold-light/10 border border-gold/20">
              <p className="text-xs text-muted-foreground">Deal Value</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(selectedDeal?.value || 0)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-bold text-red-500">{formatCurrency(selectedDeal?.totalExpenses || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-lg font-bold text-green-500">{formatCurrency(selectedDeal?.totalRevenue || 0)}</p>
              </div>
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setShowBriefingModal(true)}>
                <FileText className="w-4 h-4 mr-2" />
                Notes
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => selectedDeal && openEditDealModal(selectedDeal)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Panel */}
      <Sheet open={showWhatsAppPanel} onOpenChange={setShowWhatsAppPanel}>
        <SheetContent className="w-96 p-0 flex flex-col">
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-white/30">
                <AvatarImage src={whatsappClient?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${whatsappClient?.name}`} />
                <AvatarFallback className="bg-white/20 text-white">
                  {whatsappClient?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-white text-left">{whatsappClient?.name}</SheetTitle>
                <SheetDescription className="text-white/70 text-left text-xs">
                  {whatsappClient?.phone}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          
          {/* Messages */}
          <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-warm-100 to-warm-50">
            <div className="space-y-3">
              {mockWhatsAppMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'client' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.sender === 'client'
                        ? 'bg-white rounded-tl-none shadow-sm'
                        : 'bg-green-500 text-white rounded-tr-none'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'client' ? 'text-muted-foreground' : 'text-white/70'}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {/* Input */}
          <div className="p-3 border-t bg-white">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="shrink-0">
                <Paperclip className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Input placeholder="Type a message..." className="flex-1" />
              <Button variant="ghost" size="icon" className="shrink-0">
                <Smile className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Button size="icon" className="shrink-0 bg-green-500 hover:bg-green-600">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Client Form Modal */}
      <ClientFormModal
        open={showClientModal}
        onOpenChange={setShowClientModal}
        client={editingClient}
        onSave={handleSaveClient}
        onDelete={editingClient?.id ? handleDeleteClient : undefined}
      />

      {/* Deal Form Modal */}
      <DealFormModal
        open={showDealModal}
        onOpenChange={setShowDealModal}
        deal={editingDeal}
        clients={clients.map(c => ({ id: c.id, name: c.name }))}
        onSave={handleSaveDeal}
        onDelete={editingDeal?.id ? handleDeleteDeal : undefined}
      />

      {/* Booking Form Modal */}
      <BookingFormModal
        open={showBookingModal}
        onOpenChange={setShowBookingModal}
        booking={editingBooking}
        clients={clients.map(c => ({ id: c.id, name: c.name }))}
        onSave={handleSaveBooking}
      />

      {/* Briefing Modal */}
      <BriefingModal
        open={showBriefingModal}
        onOpenChange={setShowBriefingModal}
        dealId={selectedDeal?.id || null}
        dealTitle={selectedDeal?.title || ''}
        dealValue={selectedDeal?.value || 0}
        clientName={selectedDeal?.client.name || ''}
        clientAvatar={selectedDeal?.client.avatar || null}
      />

      {/* Quick Actions FAB */}
      <QuickActions
        onNewClient={openNewClientModal}
        onNewDeal={openNewDealModal}
        onNewBooking={openNewBookingModal}
        onOpenSearch={() => setTriggerSearch(true)}
        onExport={() => {
          // Trigger export functionality
          const exportData = { clients, deals, kpis: data?.kpis };
          const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(
            'Clients\n' + clients.map(c => `${c.name},${c.email},${c.phone}`).join('\n')
          );
          const link = document.createElement('a');
          link.href = csvContent;
          link.download = 'crm-export.csv';
          link.click();
        }}
        onOpenSettings={() => setTriggerSettings(true)}
        onNavigate={(view) => setActiveView(view)}
        currentView={activeView}
      />
    </div>
  );
}
