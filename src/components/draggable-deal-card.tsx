'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, GripVertical, FileText } from 'lucide-react';

interface Deal {
  id: string;
  title: string;
  status: string;
  value: number;
  clientId?: string;
  client: {
    id?: string;
    name: string;
    avatar: string | null;
  };
}

interface DraggableDealCardProps {
  deal: Deal;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
  formatCurrency: (value: number) => string;
  onClick: () => void;
  onCreateProposal?: () => void;
  hasProposal?: boolean;
}

export const DraggableDealCard = React.memo(function DraggableDealCard({
  deal,
  statusColors,
  statusLabels,
  formatCurrency,
  onClick,
  onCreateProposal,
  hasProposal = false,
}: DraggableDealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`glass-card cursor-pointer hover:shadow-xl transition-all duration-300 group border border-transparent hover:border-primary/20 ${
        isDragging ? 'shadow-2xl ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </button>
          <Avatar className="w-8 h-8 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
            <AvatarImage src={deal.client.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${deal.client.name}`} />
            <AvatarFallback className="bg-warm-200 text-warm-700 text-xs">
              {deal.client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{deal.title}</p>
            <p className="text-xs text-muted-foreground truncate">{deal.client.name}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-primary">{formatCurrency(deal.value)}</p>
          <div className="flex items-center gap-2">
            {onCreateProposal && !hasProposal && (
              <Button
                size="sm"
                variant="ghost"
                className="min-h-[44px] px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateProposal();
                }}
              >
                <FileText className="w-3 h-3 mr-1" />
                Proposal
              </Button>
            )}
            {hasProposal && (
              <Badge variant="secondary" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                Proposal
              </Badge>
            )}
            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
