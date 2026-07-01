'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit,
  Receipt,
  TrendingDown,
  Calendar,
  Tag,
  FileText,
  DollarSign,
  Briefcase,
  Camera,
  Video,
  MapPin,
  Users,
  Car,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface Expense {
  id: string;
  dealId: string | null;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  createdAt: string;
  deal?: {
    title: string;
    client: {
      name: string;
    };
  };
}

interface Deal {
  id: string;
  title: string;
  client: {
    name: string;
  };
}

const expenseCategories = [
  { value: 'equipment', label: 'Equipment', icon: Camera },
  { value: 'location', label: 'Location', icon: MapPin },
  { value: 'crew', label: 'Crew', icon: Users },
  { value: 'props', label: 'Props & Supplies', icon: Briefcase },
  { value: 'travel', label: 'Travel', icon: Car },
  { value: 'software', label: 'Software', icon: Video },
  { value: 'marketing', label: 'Marketing', icon: Tag },
  { value: 'other', label: 'Other', icon: Receipt },
];

const categoryColors: Record<string, string> = {
  equipment: 'bg-blue-500',
  location: 'bg-green-500',
  crew: 'bg-purple-500',
  props: 'bg-orange-500',
  travel: 'bg-cyan-500',
  software: 'bg-pink-500',
  marketing: 'bg-yellow-500',
  other: 'bg-gray-500',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

interface ExpenseManagerProps {
  deals: Deal[];
  onExpenseChange?: () => void;
}

export function ExpenseManager({ deals, onExpenseChange }: ExpenseManagerProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // Form state
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dealId, setDealId] = useState('');
  const [expenseDate, setExpenseDate] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await fetch('/api/expenses');
      if (response.ok) {
        const data = await response.json();
        setExpenses(Array.isArray(data) ? data : []);
      } else {
        console.error('Error fetching expenses:', await response.text());
        setExpenses([]);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCategory('');
    setDescription('');
    setAmount('');
    setDealId('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setEditingExpense(null);
  };

  const handleSaveExpense = async () => {
    if (!category || !description || !amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const expenseData = {
        category,
        description,
        amount: parseFloat(amount),
        dealId: dealId || null,
        date: expenseDate || new Date().toISOString(),
        currency: 'BRL',
      };

      if (editingExpense?.id) {
        const response = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        });
        if (response.ok) {
          toast.success('Expense updated successfully');
          fetchExpenses();
          onExpenseChange?.();
        }
      } else {
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData),
        });
        if (response.ok) {
          toast.success('Expense added successfully');
          fetchExpenses();
          onExpenseChange?.();
        }
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('Expense deleted');
        fetchExpenses();
        onExpenseChange?.();
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setCategory(expense.category);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setDealId(expense.dealId || '');
    setExpenseDate(new Date(expense.date).toISOString().split('T')[0]);
    setShowModal(true);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Sparkles className="w-6 h-6 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Recent Expenses
          </h3>
          <p className="text-sm text-muted-foreground">
            Total: {formatCurrency(totalExpenses)}
          </p>
        </div>
        <Button
          className="gradient-gold text-warm-950"
          onClick={() => {
            resetForm();
            setExpenseDate(new Date().toISOString().split('T')[0]);
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        {expenses.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No expenses recorded yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first expense to track spending</p>
            </CardContent>
          </Card>
        ) : (
          expenses.slice(0, 10).map((expense, index) => {
            const categoryInfo = expenseCategories.find(c => c.value === expense.category) || { label: expense.category, icon: Receipt };
            const CategoryIcon = categoryInfo.icon;
            
            return (
              <Card
                key={expense.id}
                className="glass-card hover:shadow-lg transition-all duration-300 group animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${categoryColors[expense.category] || 'bg-gray-500'} flex items-center justify-center`}>
                      <CategoryIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{expense.description}</p>
                        <Badge variant="secondary" className="text-xs">
                          {categoryInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(expense.date)}
                        </span>
                        {expense.deal && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {expense.deal.title}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-red-500">-{formatCurrency(expense.amount)}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditModal(expense)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add/Edit Expense Modal */}
      <Dialog open={showModal} onOpenChange={(open) => {
        setShowModal(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
            <DialogDescription>
              Record a business expense for tracking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="w-4 h-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Camera rental for wedding shoot"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (R$) *</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>

            {/* Related Deal */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Related Project (Optional)</label>
              <Select value={dealId} onValueChange={setDealId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No project</SelectItem>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.title} - {deal.client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowModal(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button
                className="gradient-gold text-warm-950"
                onClick={handleSaveExpense}
                disabled={!category || !description || !amount}
              >
                {editingExpense ? 'Update' : 'Add'} Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
