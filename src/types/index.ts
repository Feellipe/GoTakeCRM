// Shared types for GoTakeCRM
// Re-export Prisma model types
export type {
  Client as PrismaClient,
  Deal as PrismaDeal,
  Briefing as PrismaBriefing,
  Expense as PrismaExpense,
  Revenue as PrismaRevenue,
  Conversation as PrismaConversation,
  Message as PrismaMessage,
  Booking as PrismaBooking,
  Document as PrismaDocument,
  Template as PrismaTemplate,
  Package as PrismaPackage,
  ProposalTemplate as PrismaProposalTemplate,
  Proposal as PrismaProposal,
  DashboardSettings as PrismaDashboardSettings,
} from '@prisma/client';

// Client type used throughout the app (matches API response shape)
export interface AppClient {
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

// Deal type used throughout the app (matches API response shape)
export interface AppDeal {
  id: string;
  title: string;
  status: string;
  value: number;
  clientId?: string;
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

// Dashboard data shape returned from /api/dashboard
export interface DashboardData {
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
    new: number;
    briefing: number;
    quoting: number;
    production: number;
    completed: number;
  };
  monthlyRevenue: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
  expensesByCategory: Array<{ category: string; amount: number }>;
  upcomingBookings: Array<{
    id: string; eventType: string; eventDate: string; status: string;
    location: string | null; duration: number;
    client: { name: string; avatar: string | null };
  }>;
  recentDeals: Array<{
    id: string; title: string; status: string; value: number; createdAt: string;
    client: { name: string; avatar: string | null };
  }>;
  topClients: Array<{ name: string; value: number; deals: number }>;
  pipeline: {
    new: AppDeal[]; briefing: AppDeal[]; quoting: AppDeal[];
    production: AppDeal[]; completed: AppDeal[];
  };
}

export interface AppNotification {
  id: string; title: string; message: string; time: string;
  read: boolean; type: 'booking' | 'payment' | 'briefing' | 'client';
}

export interface ProposalFromDeal {
  id: string; title: string; clientId: string; value: number;
}
