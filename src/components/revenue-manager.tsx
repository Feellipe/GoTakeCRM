'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  Briefcase,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  CreditCard,
  Banknote,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Deal {
  id: string;
  title: string;
  value: number;
  client: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface Revenue {
  id: string;
  description: string | null;
  amount: number;
  currency: string;
  date: string;
  status: string;
  createdAt: string;
  deal: {
    id: string;
    title: string;
    client: {
      id: string;
      name: string;
      avatar: string | null;
    };
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  received: 'bg-green-500',
  cancelled: 'bg-red-500',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  received: 'Received',
  cancelled: 'Cancelled',
};

interface RevenueManagerProps {
  deals: Deal[];
  onNotification?: (message: string) => void;
}

export function RevenueManager({ deals, onNotification }: RevenueManagerProps) {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  
  // Form states
  const [selectedDeal, setSelectedDeal] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [revenueDate, setRevenueDate] = useState<string>('');
  const [revenueStatus, setRevenueStatus] = useState<string>('received');

  useEffect(() => {
    fetchRevenues();
  }, []);

  const fetchRevenues = async () => {
    try {
      const response = await fetch('/api/revenues');
      const data = await response.json();
      setRevenues(data);
    } catch (error) {
      console.error('Error fetching revenues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRevenue = async () => {
    if (!selectedDeal || !amount) return;

    try {
      const revenueData = {
        dealId: selectedDeal,
        amount: parseFloat(amount),
        description: description || null,
        date: revenueDate || new Date().toISOString(),
        status: revenueStatus,
      };

      if (editingRevenue?.id) {
        await fetch(`/api/revenues/${editingRevenue.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(revenueData),
        });
      } else {
        await fetch('/api/revenues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(revenueData),
        });
      }

      fetchRevenues();
      resetForm();
      setShowAddModal(false);
      onNotification?.(editingRevenue ? 'Revenue updated successfully!' : 'Revenue added successfully!');
    } catch (error) {
      console.error('Error saving revenue:', error);
    }
  };

  const handleDeleteRevenue = async (id: string) => {
    try {
      await fetch(`/api/revenues/${id}`, { method: 'DELETE' });
      fetchRevenues();
      onNotification?.('Revenue deleted successfully!');
    } catch (error) {
      console.error('Error deleting revenue:', error);
    }
  };

  const handleEditRevenue = (revenue: Revenue) => {
    setEditingRevenue(revenue);
    setSelectedDeal(revenue.deal.id);
    setAmount(revenue.amount.toString());
    setDescription(revenue.description || '');
    setRevenueDate(new Date(revenue.date).toISOString().split('T')[0]);
    setRevenueStatus(revenue.status);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setSelectedDeal('');
    setAmount('');
    setDescription('');
    setRevenueDate('');
    setRevenueStatus('received');
    setEditingRevenue(null);
  };

  const filteredRevenues = revenues.filter(r => {
    const matchesSearch = r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.deal.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStats = () => {
    const total = revenues.reduce((sum, r) => sum + r.amount, 0);
    const received = revenues.filter(r => r.status === 'received').reduce((sum, r) => sum + r.amount, 0);
    const pending = revenues.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
    const thisMonth = revenues.filter(r => {
      const date = new Date(r.date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).reduce((sum, r) => sum + r.amount, 0);
    
    return { total, received, pending, thisMonth };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Sparkles className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(stats.total)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Received</p>
                <p className="text-xl font-bold text-green-500">{formatCurrency(stats.received)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-amber-500">{formatCurrency(stats.pending)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(stats.thisMonth)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search revenues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 glass-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="gradient-gold text-warm-950"
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Revenue
        </Button>
      </div>

      {/* Revenue List */}
      <div className="space-y-3">
        {filteredRevenues.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No revenues found</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first revenue record</p>
            </CardContent>
          </Card>
        ) : (
          filteredRevenues.map((revenue, index) => (
            <Card
              key={revenue.id}
              className="glass-card hover:shadow-lg transition-all duration-300 group animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      revenue.status === 'received' ? 'bg-green-500/10' : 
                      revenue.status === 'pending' ? 'bg-amber-500/10' : 'bg-red-500/10'
                    }`}>
                      {revenue.status === 'received' ? (
                        <ArrowDownRight className="w-6 h-6 text-green-500" />
                      ) : revenue.status === 'pending' ? (
                        <Clock className="w-6 h-6 text-amber-500" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {revenue.deal.title}
                        </p>
                        <Badge className={`${statusColors[revenue.status]} text-white text-xs`}>
                          {statusLabels[revenue.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{revenue.deal.client.name}</span>
                        </div>
                        {revenue.description && (
                          <span className="text-sm text-muted-foreground">• {revenue.description}</span>
                        )}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(revenue.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`text-xl font-bold ${
                      revenue.status === 'received' ? 'text-green-500' : 
                      revenue.status === 'pending' ? 'text-amber-500' : 'text-muted-foreground'
                    }`}>
                      +{formatCurrency(revenue.amount)}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditRevenue(revenue)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-500"
                          onClick={() => handleDeleteRevenue(revenue.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Revenue Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => {
        setShowAddModal(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRevenue ? 'Edit Revenue' : 'Add New Revenue'}</DialogTitle>
            <DialogDescription>
              Record a payment received from a client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Deal *</label>
              <Select value={selectedDeal} onValueChange={setSelectedDeal}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a deal" />
                </SelectTrigger>
                <SelectContent>
                  {deals.map(deal => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.title} - {deal.client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (BRL) *</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Payment description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={revenueDate}
                  onChange={(e) => setRevenueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={revenueStatus} onValueChange={setRevenueStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button
                className="gradient-gold text-warm-950"
                onClick={handleSaveRevenue}
                disabled={!selectedDeal || !amount}
              >
                {editingRevenue ? 'Update' : 'Add Revenue'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
