'use client';

import React, { useState, useCallback, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  DollarSign,
  Calendar,
  Plus,
  Clock,
  FileText,
  Sparkles,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationDropdown } from '@/components/notification-dropdown';
import { ExportButton } from '@/components/export-button';
import { GlobalSearch } from '@/components/global-search';
import { QuickActions } from '@/components/quick-actions';
import { PwaInstallBanner } from '@/components/pwa-install-banner';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { ClientFormModal } from '@/components/client-form-modal';
import { DealFormModal } from '@/components/deal-form-modal';
import { BookingFormModal } from '@/components/booking-form-modal';
import { Toaster } from '@/components/ui/sonner';
import {
  useDashboardData,
  useClients,
  useDeals,
  useMutate,
} from '@/lib/api';
import type {
  AppClient,
  AppDeal,
  AppNotification,
  DashboardData,
} from '@/types';
import { auditLog } from '@/lib/audit';

// Tipo para dados de booking usados no modal (compativel com BookingFormModal.Booking)
interface BookingFormData {
  id?: string;
  clientId: string;
  dealId?: string;
  eventType: string;
  eventDate: string;
  duration: number;
  location: string | null;
  status: string;
  notes: string | null;
  client?: {
    id: string;
    name: string;
  };
}

// Dashboard context para compartilhar dados entre paginas
interface DashboardContextType {
  data: DashboardData | null;
  clients: AppClient[];
  deals: AppDeal[];
  loading: boolean;
  fetchDashboardData: () => void;
  fetchClients: () => void;
  fetchDeals: () => void;
  showClientModal: boolean;
  setShowClientModal: (v: boolean) => void;
  editingClient: AppClient | null;
  setEditingClient: (v: AppClient | null) => void;
  showDealModal: boolean;
  setShowDealModal: (v: boolean) => void;
  editingDeal: AppDeal | null;
  setEditingDeal: (v: AppDeal | null) => void;
  showBookingModal: boolean;
  setShowBookingModal: (v: boolean) => void;
  editingBooking: BookingFormData | null;
  setEditingBooking: (v: BookingFormData | null) => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard deve ser usado dentro de DashboardLayout');
  return ctx;
}

// Metadados das views para o header
const viewMeta: Record<string, { icon: typeof LayoutDashboard; title: string; description: string }> = {
  dashboard: { icon: LayoutDashboard, title: 'Dashboard', description: "Welcome back! Here's your studio overview." },
  clients: { icon: Users, title: 'Clients', description: 'Manage your client relationships and contacts.' },
  pipeline: { icon: FolderKanban, title: 'Pipeline', description: 'Track and manage your deals across all stages.' },
  proposals: { icon: FileText, title: 'Proposals', description: 'Create and send professional proposals to clients.' },
  financials: { icon: DollarSign, title: 'Financials', description: 'Revenue, expenses, and profitability insights.' },
  calendar: { icon: Calendar, title: 'Calendar', description: 'Your upcoming shoots and bookings.' },
  settings: { icon: Settings, title: 'Settings', description: 'Customize your dashboard preferences.' },
};

// Notificacoes estaticas
const notifications: AppNotification[] = [
  { id: '1', title: 'New booking confirmed', message: 'Wedding shoot with Ana Silva', time: '2 min ago', read: false, type: 'booking' },
  { id: '2', title: 'Payment received', message: 'R$5,000 from Pedro Costa', time: '1 hour ago', read: false, type: 'payment' },
  { id: '3', title: 'Briefing updated', message: 'Music Video project details added', time: '3 hours ago', read: true, type: 'briefing' },
  { id: '4', title: 'New client registered', message: 'Maria Santos joined from website', time: '5 hours ago', read: true, type: 'client' },
  { id: '5', title: 'Booking reminder', message: 'Portrait session tomorrow at 10AM', time: '1 day ago', read: false, type: 'booking' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // SWR: dados buscados automaticamente com deduplicacao e cache
  const { data: dashboardResponse } = useDashboardData();
  const { data: clients } = useClients();
  const { data: deals } = useDeals();
  const { mutateAll } = useMutate();

  // Estado derivado: loading enquanto qualquer dado nao foi carregado
  const loading = !dashboardResponse || !clients || !deals;
  const data = dashboardResponse ?? null;

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Estados dos modais
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<AppClient | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<AppDeal | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingFormData | null>(null);

  const pathname = usePathname();

  // Determina a view atual a partir da rota
  const getCurrentView = () => {
    if (pathname === '/dashboard' || pathname === '/') return 'dashboard';
    if (pathname.startsWith('/clients')) return 'clients';
    if (pathname.startsWith('/pipeline')) return 'pipeline';
    if (pathname.startsWith('/proposals')) return 'proposals';
    if (pathname.startsWith('/financials')) return 'financials';
    if (pathname.startsWith('/calendar')) return 'calendar';
    if (pathname.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };
  const currentView = getCurrentView();
  const meta = viewMeta[currentView] || viewMeta.dashboard;

  // --- Handlers CRUD envolvidos com useCallback para estabilidade referencial ---

  const handleSaveClient = useCallback(async (clientData: Partial<AppClient>) => {
    try {
      if (editingClient?.id) {
        const response = await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData),
        });
        if (response.ok) {
          auditLog('client:update', { id: editingClient.id, fields: Object.keys(clientData) });
          mutateAll();
        }
      } else {
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData),
        });
        if (response.ok) {
          const created = await response.json();
          auditLog('client:create', { id: created.id, name: (clientData as Record<string, unknown>).name as string });
          mutateAll();
        }
      }
    } catch (error) {
      console.error('Error saving client:', error);
    }
    setEditingClient(null);
  }, [editingClient, mutateAll]);

  const handleDeleteClient = useCallback(async () => {
    if (!editingClient?.id) return;
    try {
      const response = await fetch(`/api/clients/${editingClient.id}`, { method: 'DELETE' });
      if (response.ok) {
        auditLog('client:delete', { id: editingClient.id, name: editingClient.name });
        mutateAll();
      }
    } catch (error) {
      console.error('Error deleting client:', error);
    }
    setEditingClient(null);
  }, [editingClient, mutateAll]);

  const handleSaveDeal = useCallback(async (dealData: Partial<AppDeal>) => {
    try {
      if (editingDeal?.id) {
        const response = await fetch(`/api/deals/${editingDeal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dealData),
        });
        if (response.ok) {
          auditLog('deal:update', { id: editingDeal.id, fields: Object.keys(dealData) });
          mutateAll();
        }
      } else {
        const response = await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dealData),
        });
        if (response.ok) {
          const created = await response.json();
          auditLog('deal:create', { id: created.id, title: (dealData as Record<string, unknown>).title as string });
          mutateAll();
        }
      }
    } catch (error) {
      console.error('Error saving deal:', error);
    }
    setEditingDeal(null);
  }, [editingDeal, mutateAll]);

  const handleDeleteDeal = useCallback(async () => {
    if (!editingDeal?.id) return;
    try {
      const response = await fetch(`/api/deals/${editingDeal.id}`, { method: 'DELETE' });
      if (response.ok) {
        auditLog('deal:delete', { id: editingDeal.id, title: editingDeal.title });
        mutateAll();
      }
    } catch (error) {
      console.error('Error deleting deal:', error);
    }
    setEditingDeal(null);
  }, [editingDeal, mutateAll]);

  const handleSaveBooking = useCallback(async (bookingData: BookingFormData) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });
      if (response.ok) {
        const created = await response.json();
        auditLog('booking:create', { id: created.id, clientId: bookingData.clientId, eventType: bookingData.eventType });
        mutateAll();
      }
    } catch (error) {
      console.error('Error saving booking:', error);
    }
    setEditingBooking(null);
  }, [mutateAll]);

  const openNewClientModal = useCallback(() => { setEditingClient(null); setShowClientModal(true); }, []);
  const openNewDealModal = useCallback(() => { setEditingDeal(null); setShowDealModal(true); }, []);
  const openNewBookingModal = useCallback(() => { setEditingBooking(null); setShowBookingModal(true); }, []);

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

  const ViewIcon = meta.icon;

  return (
    <DashboardContext.Provider value={{
      data, clients, deals, loading,
      // Alias para manter compatibilidade com componentes filhos
      fetchDashboardData: mutateAll,
      fetchClients: mutateAll,
      fetchDeals: mutateAll,
      showClientModal, setShowClientModal, editingClient, setEditingClient,
      showDealModal, setShowDealModal, editingDeal, setEditingDeal,
      showBookingModal, setShowBookingModal, editingBooking, setEditingBooking,
    }}>
      <div className="min-h-screen bg-background flex relative">
        {/* Animated Background Orbs */}
        <div className="bg-orbs">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />
        </div>

        {/* Sidebar */}
        <DashboardSidebar />

        {/* Main Content */}
        <main className="flex-1 transition-all duration-500 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 glass border-b border-glass-border">
            <div className="px-8 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground capitalize flex items-center gap-2">
                  <ViewIcon className="w-6 h-6 text-primary" />
                  {meta.title}
                </h1>
                <p className="text-muted-foreground text-sm">{meta.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <GlobalSearch
                  clients={clients}
                  deals={deals}
                  bookings={data?.upcomingBookings || []}
                  onSelectClient={() => {
                    // Navegacao tratada pelo componente GlobalSearch
                  }}
                  onSelectDeal={() => {
                    // Navegacao tratada pelo componente GlobalSearch
                  }}
                  onSelectBooking={() => {
                    // Navegacao tratada pelo componente GlobalSearch
                  }}
                />
                <ThemeToggle />
                <NotificationDropdown notifications={notifications} />
                <ExportButton data={{ clients, deals, kpis: data?.kpis }} />
                <Badge variant="secondary" className="glass-badge px-4 py-2">
                  <Clock className="w-4 h-4 mr-2" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </Badge>
                <Button
                  className="gradient-gold text-warm-950 hover:opacity-90 transition-all duration-300 shadow-lg shadow-gold/20 hover:shadow-gold/30 hover:scale-105"
                  onClick={() => {
                    if (currentView === 'clients') openNewClientModal();
                    else if (currentView === 'pipeline') openNewDealModal();
                    else openNewBookingModal();
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New {currentView === 'clients' ? 'Client' : currentView === 'pipeline' ? 'Deal' : 'Booking'}
                </Button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          {children}

          {/* Footer */}
          <footer className="mt-auto border-t border-border bg-card/30 backdrop-blur-sm">
            <div className="px-8 py-4 flex items-center justify-between text-sm text-muted-foreground">
              <p>&copy; 2024 GoTake CRM. Built for filmmakers &amp; photographers.</p>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-primary transition-colors">Documentation</a>
                <a href="#" className="hover:text-primary transition-colors">Support</a>
              </div>
            </div>
          </footer>
        </main>

        {/* Modals */}
        <ClientFormModal
          open={showClientModal}
          onOpenChange={setShowClientModal}
          client={editingClient}
          onSave={handleSaveClient}
          onDelete={editingClient?.id ? handleDeleteClient : undefined}
        />
        {/* @ts-expect-error TODO: alinhar tipos AppDeal com Deal local do componente */}
        <DealFormModal
          open={showDealModal}
          onOpenChange={setShowDealModal}
          deal={editingDeal}
          clients={clients.map(c => ({ id: c.id, name: c.name }))}
          onSave={handleSaveDeal}
          onDelete={editingDeal?.id ? handleDeleteDeal : undefined}
        />
        <BookingFormModal
          open={showBookingModal}
          onOpenChange={setShowBookingModal}
          booking={editingBooking}
          clients={clients.map(c => ({ id: c.id, name: c.name }))}
          onSave={handleSaveBooking}
        />

        {/* Quick Actions FAB */}
        <QuickActions
          onNewClient={openNewClientModal}
          onNewDeal={openNewDealModal}
          onNewBooking={openNewBookingModal}
          onOpenSearch={() => {}}
          onExport={() => {
            const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(
              'Clients\n' + clients.map(c => `${c.name},${c.email},${c.phone}`).join('\n')
            );
            const link = document.createElement('a');
            link.href = csvContent;
            link.download = 'crm-export.csv';
            link.click();
          }}
          onOpenSettings={() => {}}
          onNavigate={() => {}}
          currentView={currentView}
        />

        <PwaInstallBanner />
        <Toaster position="bottom-right" richColors closeButton />
      </div>
    </DashboardContext.Provider>
  );
}
