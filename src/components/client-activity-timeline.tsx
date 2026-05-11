'use client';

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  Phone,
  Mail,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  User,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'message' | 'call' | 'email' | 'note' | 'booking' | 'payment' | 'deal' | 'status';
  title: string;
  description?: string;
  timestamp: string;
  user?: {
    name: string;
    avatar?: string | null;
  };
  metadata?: {
    amount?: number;
    status?: string;
    dealTitle?: string;
  };
}

interface ClientActivityTimelineProps {
  clientId: string;
  clientName: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Mock activity data
const getMockActivities = (clientId: string): Activity[] => [
  {
    id: '1',
    type: 'message',
    title: 'WhatsApp message received',
    description: 'Client asked about wedding package pricing',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '2',
    type: 'deal',
    title: 'New deal created',
    description: 'Wedding Photography Package',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    metadata: {
      dealTitle: 'Wedding - Pedro',
      amount: 17500,
    },
  },
  {
    id: '3',
    type: 'call',
    title: 'Phone call completed',
    description: 'Discussed event details and requirements',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    user: { name: 'Studio Pro' },
  },
  {
    id: '4',
    type: 'booking',
    title: 'Consultation scheduled',
    description: 'Initial meeting at the studio',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    metadata: {
      status: 'confirmed',
    },
  },
  {
    id: '5',
    type: 'payment',
    title: 'Deposit received',
    description: 'Booking deposit for wedding shoot',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    metadata: {
      amount: 5000,
    },
  },
  {
    id: '6',
    type: 'note',
    title: 'Note added',
    description: 'Client prefers outdoor locations and golden hour shoots',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    user: { name: 'Studio Pro' },
  },
  {
    id: '7',
    type: 'email',
    title: 'Email sent',
    description: 'Sent portfolio samples and package options',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
  {
    id: '8',
    type: 'status',
    title: 'Client status changed',
    description: 'Changed from Lead to Active',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
];

const activityConfig: Record<Activity['type'], { icon: typeof MessageSquare; color: string; bgColor: string }> = {
  message: { icon: MessageSquare, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  call: { icon: Phone, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  email: { icon: Mail, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  note: { icon: FileText, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  booking: { icon: Calendar, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  payment: { icon: DollarSign, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  deal: { icon: Sparkles, color: 'text-primary', bgColor: 'bg-primary/10' },
  status: { icon: ArrowRight, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
};

export function ClientActivityTimeline({ clientId, clientName }: ClientActivityTimelineProps) {
  const activities = getMockActivities(clientId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Activity Timeline
        </h4>
        <Badge variant="secondary" className="text-xs">
          {activities.length} events
        </Badge>
      </div>

      <ScrollArea className="h-80 pr-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {/* Activity items */}
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;

              return (
                <div
                  key={activity.id}
                  className="relative pl-10 animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Icon circle */}
                  <div
                    className={`absolute left-0 w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}
                  >
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group cursor-pointer border border-transparent hover:border-primary/20">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {activity.title}
                        </p>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {activity.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>

                    {/* Metadata */}
                    {activity.metadata && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                        {activity.metadata.amount && (
                          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                            {formatCurrency(activity.metadata.amount)}
                          </Badge>
                        )}
                        {activity.metadata.status && (
                          <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {activity.metadata.status}
                          </Badge>
                        )}
                        {activity.metadata.dealTitle && (
                          <Badge variant="outline" className="text-xs">
                            {activity.metadata.dealTitle}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* User */}
                    {activity.user && (
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={activity.user.avatar || undefined} />
                          <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                            {activity.user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">by {activity.user.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
