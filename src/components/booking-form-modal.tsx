'use client';

import * as React from 'react';
import { Plus, Edit, Trash2, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
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

interface Booking {
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

interface Client {
  id: string;
  name: string;
}

interface BookingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: Booking | null;
  clients: Client[];
  onSave: (booking: Partial<Booking>) => void;
  onDelete?: () => void;
}

const eventTypes = [
  'Wedding',
  'Corporate Event',
  'Portrait Session',
  'Product Photography',
  'Music Video',
  'Documentary',
  'Real Estate',
  'Fashion Shoot',
  'Birthday Party',
  'Conference',
  'Graduation',
  'Family Portrait',
  'Engagement',
  'Brand Campaign',
];

const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-500' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-500' },
  { value: 'completed', label: 'Completed', color: 'bg-warm-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

const durationOptions = [
  { value: 1, label: '1 hour' },
  { value: 2, label: '2 hours' },
  { value: 3, label: '3 hours' },
  { value: 4, label: '4 hours' },
  { value: 6, label: '6 hours' },
  { value: 8, label: 'Full day (8h)' },
  { value: 12, label: 'Extended (12h)' },
];

export function BookingFormModal({ open, onOpenChange, booking, clients, onSave, onDelete }: BookingFormModalProps) {
  const [formData, setFormData] = React.useState<Partial<Booking>>({
    clientId: '',
    eventType: 'Wedding',
    eventDate: '',
    duration: 2,
    location: '',
    status: 'pending',
    notes: '',
  });

  React.useEffect(() => {
    if (booking) {
      setFormData({
        ...booking,
        clientId: booking.client?.id || booking.clientId,
        eventDate: booking.eventDate ? new Date(booking.eventDate).toISOString().slice(0, 16) : '',
      });
    } else {
      // Default to tomorrow at 10:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      setFormData({
        clientId: clients[0]?.id || '',
        eventType: 'Wedding',
        eventDate: tomorrow.toISOString().slice(0, 16),
        duration: 2,
        location: '',
        status: 'pending',
        notes: '',
      });
    }
  }, [booking, open, clients]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      duration: Number(formData.duration) || 2,
    });
    onOpenChange(false);
  };

  const isEditing = !!booking?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit className="w-5 h-5 text-primary" />
                Edit Booking
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-primary" />
                New Booking
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the booking information below.'
              : 'Schedule a new booking or event.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Event Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value) => setFormData({ ...formData, eventType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
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

          {/* Schedule */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Schedule</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventDate">Date & Time</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="eventDate"
                    type="datetime-local"
                    value={formData.eventDate || ''}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={String(formData.duration)}
                  onValueChange={(value) => setFormData({ ...formData, duration: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Event address or venue name"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Status</h4>
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

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about the booking..."
              rows={2}
            />
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
              {isEditing ? 'Save Changes' : 'Schedule Booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
