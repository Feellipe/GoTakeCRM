'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileText,
  Edit,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DraggableDealCard } from '@/components/draggable-deal-card';
import { BriefingModal } from '@/components/briefing-modal';
import { useDashboard } from '@/app/(dashboard)/layout';
import { formatCurrency, statusColors, statusLabels } from '@/lib/utils';
import type { AppDeal } from '@/types';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export default function PipelinePage() {
  const { deals, fetchDeals, fetchDashboardData, setEditingDeal, setShowDealModal, clients } = useDashboard();
  const router = useRouter();
  const [selectedDeal, setSelectedDeal] = useState<AppDeal | null>(null);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [proposalFromDeal, setProposalFromDeal] = useState<{
    id: string;
    title: string;
    clientId: string;
    value: number;
  } | null>(null);
  const [activeDeal, setActiveDeal] = React.useState<AppDeal | null>(null);

  // Drag and drop setup
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);
    if (!over) return;
    const dealId = active.id as string;
    const newStatus = over.id as string;
    if (['novo', 'briefing', 'contando', 'producao', 'finalizado'].includes(newStatus)) {
      const deal = deals.find(d => d.id === dealId);
      if (deal && deal.status !== newStatus) {
        try {
          await fetch(`/api/deals/${dealId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...deal, status: newStatus }),
          });
          fetchDeals();
          fetchDashboardData();
        } catch (error) {
          console.error('Error updating deal status:', error);
        }
      }
    }
  };

  const handleDragStart = (event: { active: { id: string } }) => {
    const deal = deals.find(d => d.id === event.active.id);
    setActiveDeal(deal || null);
  };

  const openEditDealModal = (deal: AppDeal) => {
    setEditingDeal(deal);
    setShowDealModal(true);
    setSelectedDeal(null);
  };

  return (
    <div className="p-8 flex-1 overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <ScrollArea className="h-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 min-h-[calc(100vh-16rem)]">
            {['novo', 'briefing', 'contando', 'producao', 'finalizado'].map((status) => {
              const stageDeals = deals.filter(d => d.status === status);
              const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0);
              return (
                <div key={status} className="flex flex-col">
                  {/* Stage Header */}
                  <div className="mb-4 p-3 rounded-xl bg-muted/30 border border-muted">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
                        <h3 className="font-semibold text-foreground capitalize">{statusLabels[status] || status}</h3>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-white/50">
                        {stageDeals.length}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-primary">{formatCurrency(stageValue)}</p>
                  </div>

                  {/* Deal Cards - Droppable Zone */}
                  <div
                    id={status}
                    className="space-y-3 flex-1 min-h-[100px] rounded-xl border-2 border-dashed border-transparent p-1"
                  >
                    <SortableContext
                      items={stageDeals.map(d => d.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {stageDeals.map((deal) => (
                        <DraggableDealCard
                          key={deal.id}
                          deal={deal}
                          statusColors={statusColors}
                          statusLabels={statusLabels}
                          formatCurrency={formatCurrency}
                          onClick={() => setSelectedDeal(deal)}
                          onCreateProposal={() => {
                            setProposalFromDeal({
                              id: deal.id,
                              title: deal.title,
                              clientId: deal.clientId || deal.client.id || '',
                              value: deal.value,
                            });
                            router.push('/proposals');
                          }}
                        />
                      ))}
                    </SortableContext>
                    {stageDeals.length === 0 && (
                      <div className="border-2 border-dashed border-muted rounded-xl p-6 text-center hover:border-primary/30 transition-colors cursor-pointer" id={status}>
                        <Plus className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Add deal</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <DragOverlay>
          {activeDeal && (
            <Card className="glass-card shadow-2xl ring-2 ring-primary">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={activeDeal.client.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeDeal.client.name}`} />
                    <AvatarFallback className="bg-warm-200 text-warm-700 text-xs">
                      {activeDeal.client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activeDeal.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activeDeal.client.name}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-primary">{formatCurrency(activeDeal.value)}</p>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>

      {/* Deal Detail Modal */}
      <Dialog open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
        <DialogContent className="max-w-lg glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedDeal?.title}</span>
              <Badge variant="secondary" className={`text-xs text-white ${statusColors[selectedDeal?.status || '']}`}>
                {statusLabels[selectedDeal?.status || ''] || selectedDeal?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedDeal?.client.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-gold/10 to-gold-light/10 border border-gold/20">
              <p className="text-xs text-muted-foreground">Deal Value</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(selectedDeal?.value || 0)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-bold text-red-500">{formatCurrency(selectedDeal?.totalExpenses || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-lg font-bold text-green-500">{formatCurrency(selectedDeal?.totalRevenue || 0)}</p>
              </div>
            </div>
            <Separator />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setShowBriefingModal(true)}>
                <FileText className="w-4 h-4 mr-2" />
                Notes
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => selectedDeal && openEditDealModal(selectedDeal)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Briefing Modal */}
      <BriefingModal
        open={showBriefingModal}
        onOpenChange={setShowBriefingModal}
        dealId={selectedDeal?.id || null}
        dealTitle={selectedDeal?.title || ''}
        dealValue={selectedDeal?.value || 0}
        clientName={selectedDeal?.client.name || ''}
        clientAvatar={selectedDeal?.client.avatar || null}
      />
    </div>
  );
}
