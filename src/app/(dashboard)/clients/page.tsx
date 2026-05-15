'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Users,
  Search,
  Phone,
  Mail,
  Camera,
  Video,
  Building,
  Briefcase,
  Star,
  Users2,
  MessageSquare,
  Eye,
  Edit,
  Paperclip,
  Smile,
  Send,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboard } from '@/app/(dashboard)/layout';
import { usePaginatedClients } from '@/lib/api';
import { formatCurrency, statusColors, statusLabels } from '@/lib/utils';
import type { AppClient } from '@/types';

// Dynamic import for heavy component (client activity timeline)
const ClientActivityTimeline = dynamic(
  () => import('@/components/client-activity-timeline').then(mod => ({ default: mod.ClientActivityTimeline })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
  }
);

// Event type icon components mapping
const eventTypeIconComponents: Record<string, typeof Camera> = {
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

// Mock WhatsApp messages
const mockWhatsAppMessages = [
  { id: '1', sender: 'client', text: "Hi! I'm interested in booking a wedding shoot.", time: '10:30 AM' },
  { id: '2', sender: 'studio', text: 'Hello! Thank you for reaching out.', time: '10:32 AM' },
  { id: '3', sender: 'client', text: 'The wedding is in December. Do you have availability?', time: '10:35 AM' },
  { id: '4', sender: 'studio', text: 'Let me check our calendar... Yes, we have openings in December!', time: '10:37 AM' },
];

export default function ClientsPage() {
  const { setEditingClient, setShowClientModal } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 12;
  const [selectedClient, setSelectedClient] = useState<AppClient | null>(null);
  const [showWhatsAppPanel, setShowWhatsAppPanel] = useState(false);
  const [whatsappClient, setWhatsappClient] = useState<AppClient | null>(null);

  // Paginacao server-side via SWR: busca, status e pagina sao enviados como query params
  const effectiveStatus = statusFilter === 'all' ? '' : statusFilter;
  const { data: paginatedData } = usePaginatedClients({ page, limit, search: searchTerm, status: effectiveStatus });
  const filteredClients = paginatedData?.data ?? [];
  const totalPages = paginatedData?.totalPages ?? 1;
  const total = paginatedData?.total ?? 0;

  // useCallback: handlers estaveis para evitar re-render desnecessario de filhos (rerender-functional-setstate)
  const openWhatsApp = useCallback((client: AppClient) => {
    setWhatsappClient(client);
    setShowWhatsAppPanel(true);
  }, []);

  const openEditClientModal = useCallback((client: AppClient) => {
    setEditingClient(client);
    setShowClientModal(true);
    setSelectedClient(null);
  }, []);

  return (
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
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
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
          const EventIcon = eventTypeIconComponents[client.eventType] || Camera;
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

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages} ({total} clients)
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        >
          Next
        </Button>
      </div>

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
    </div>
  );
}
