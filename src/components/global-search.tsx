'use client';

import * as React from 'react';
import { Search, Users, FolderKanban, Calendar, TrendingUp, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  eventType: string;
  status: string;
  avatar: string | null;
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
}

interface Booking {
  id: string;
  eventType: string;
  eventDate: string;
  status: string;
  client?: {
    name: string;
  };
}

interface GlobalSearchProps {
  clients: Client[];
  deals: Deal[];
  bookings: Booking[];
  onSelectClient?: (client: Client) => void;
  onSelectDeal?: (deal: Deal) => void;
  onSelectBooking?: (booking: Booking) => void;
  onNavigate?: (view: string) => void;
}

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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value);
};

export function GlobalSearch({
  clients,
  deals,
  bookings,
  onSelectClient,
  onSelectDeal,
  onSelectBooking,
  onNavigate,
}: GlobalSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Filter results
  const filteredClients = React.useMemo(() => {
    if (!search) return clients.slice(0, 5);
    return clients.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5);
  }, [clients, search]);

  const filteredDeals = React.useMemo(() => {
    if (!search) return deals.slice(0, 5);
    return deals.filter(d =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.client.name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5);
  }, [deals, search]);

  const filteredBookings = React.useMemo(() => {
    if (!search) return bookings.slice(0, 5);
    return bookings.filter(b =>
      b.eventType.toLowerCase().includes(search.toLowerCase()) ||
      b.client?.name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5);
  }, [bookings, search]);

  const totalResults = filteredClients.length + filteredDeals.length + filteredBookings.length;

  // Keyboard shortcut to open
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, totalResults - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  const handleSelect = (index: number) => {
    let current = 0;
    
    // Check clients
    for (const client of filteredClients) {
      if (current === index) {
        onSelectClient?.(client);
        setOpen(false);
        return;
      }
      current++;
    }
    
    // Check deals
    for (const deal of filteredDeals) {
      if (current === index) {
        onSelectDeal?.(deal);
        setOpen(false);
        return;
      }
      current++;
    }
    
    // Check bookings
    for (const booking of filteredBookings) {
      if (current === index) {
        onSelectBooking?.(booking);
        setOpen(false);
        return;
      }
      current++;
    }
  };

  return (
    <>
      {/* Search Button */}
      <Button
        variant="outline"
        className="relative gap-2 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(true)}
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-70">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 max-w-xl glass-card">
          <DialogHeader className="sr-only">
            <DialogTitle>Global Search</DialogTitle>
            <DialogDescription>Search for clients, deals, and bookings</DialogDescription>
          </DialogHeader>
          {/* Search Input */}
          <div className="flex items-center border-b px-4">
            <Search className="w-4 h-4 text-muted-foreground mr-3" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search clients, deals, bookings..."
              className="flex-1 py-4 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
            />
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-70">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <ScrollArea className="max-h-80">
            {totalResults === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No results found for "{search}"</p>
              </div>
            ) : (
              <div className="p-2">
                {/* Clients Section */}
                {filteredClients.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      <Users className="w-3 h-3" />
                      Clients ({filteredClients.length})
                    </div>
                    {filteredClients.map((client, i) => {
                      const globalIndex = i;
                      return (
                        <button
                          key={client.id}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                            selectedIndex === globalIndex
                              ? "bg-primary/10 text-foreground"
                              : "hover:bg-muted text-foreground"
                          )}
                          onClick={() => handleSelect(globalIndex)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={client.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${client.name}`} />
                            <AvatarFallback className="bg-warm-200 text-warm-700 text-xs">
                              {client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.phone}</p>
                          </div>
                          <Badge variant="secondary" className={cn("text-xs text-white", statusColors[client.status])}>
                            {statusLabels[client.status] || client.status}
                          </Badge>
                          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Deals Section */}
                {filteredDeals.length > 0 && (
                  <div className="mb-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      <FolderKanban className="w-3 h-3" />
                      Deals ({filteredDeals.length})
                    </div>
                    {filteredDeals.map((deal, i) => {
                      const globalIndex = filteredClients.length + i;
                      return (
                        <button
                          key={deal.id}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                            selectedIndex === globalIndex
                              ? "bg-primary/10 text-foreground"
                              : "hover:bg-muted text-foreground"
                          )}
                          onClick={() => handleSelect(globalIndex)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{deal.title}</p>
                            <p className="text-xs text-muted-foreground">{deal.client.name}</p>
                          </div>
                          <p className="text-sm font-bold text-primary">{formatCurrency(deal.value)}</p>
                          <Badge variant="secondary" className={cn("text-xs text-white", statusColors[deal.status])}>
                            {statusLabels[deal.status] || deal.status}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Bookings Section */}
                {filteredBookings.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Bookings ({filteredBookings.length})
                    </div>
                    {filteredBookings.map((booking, i) => {
                      const globalIndex = filteredClients.length + filteredDeals.length + i;
                      return (
                        <button
                          key={booking.id}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                            selectedIndex === globalIndex
                              ? "bg-primary/10 text-foreground"
                              : "hover:bg-muted text-foreground"
                          )}
                          onClick={() => handleSelect(globalIndex)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-green-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{booking.eventType}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(booking.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {booking.client && ` • ${booking.client.name}`}
                            </p>
                          </div>
                          <Badge variant="secondary" className={cn("text-xs text-white", statusColors[booking.status])}>
                            {booking.status}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd> Navigate</span>
              <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↵</kbd> Select</span>
            </div>
            <span>{totalResults} results</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
