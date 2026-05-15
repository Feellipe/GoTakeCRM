'use client';

import * as React from 'react';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Deal {
  id?: string;
  title: string;
  description?: string;
  status: string;
  value: number;
  clientId: string;
  client?: {
    id: string;
    name: string;
  };
}

interface Client {
  id: string;
  name: string;
}

interface DealFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  clients: Client[];
  onSave: (deal: Partial<Deal>) => void;
  onDelete?: () => void;
}

const statusOptions = [
  { value: 'new', label: 'New', color: 'bg-blue-500' },
  { value: 'briefing', label: 'Briefing', color: 'bg-purple-500' },
  { value: 'quoting', label: 'Quoting', color: 'bg-amber-500' },
  { value: 'production', label: 'Production', color: 'bg-green-500' },
  { value: 'completed', label: 'Completed', color: 'bg-warm-700' },
];

export function DealFormModal({ open, onOpenChange, deal, clients, onSave, onDelete }: DealFormModalProps) {
  const [formData, setFormData] = React.useState<Partial<Deal>>({
    title: '',
    description: '',
    status: 'new',
    value: 0,
    clientId: '',
  });

  React.useEffect(() => {
    if (deal) {
      setFormData({
        ...deal,
        clientId: deal.client?.id || deal.clientId,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'new',
        value: 0,
        clientId: clients[0]?.id || '',
      });
    }
  }, [deal, open, clients]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      value: Number(formData.value) || 0,
    });
    onOpenChange(false);
  };

  const isEditing = !!deal?.id;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit className="w-5 h-5 text-primary" />
                Edit Deal
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-primary" />
                New Deal
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the deal information below.'
              : 'Fill in the details to create a new deal.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Deal Information</h4>
            <div className="space-y-2">
              <Label htmlFor="title">Deal Title *</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Wedding - John & Jane"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details about the deal..."
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Value and Client */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Financial Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Deal Value (R$) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="value"
                    type="number"
                    value={formData.value || ''}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    placeholder="5000"
                    className="pl-9"
                    required
                  />
                </div>
                {formData.value && formData.value > 0 && (
                  <p className="text-xs text-muted-foreground">{formatCurrency(formData.value)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pipeline Stage</h4>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: option.value })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    formData.status === option.value
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${option.color}`} />
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete();
                  onOpenChange(false);
                }}
                className="mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="gradient-gold text-warm-950">
              {isEditing ? 'Save Changes' : 'Create Deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
