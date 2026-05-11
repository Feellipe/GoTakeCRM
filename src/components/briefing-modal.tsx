'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Plus,
  Clock,
  User,
  Trash2,
  Edit,
  Save,
  X,
} from 'lucide-react';

interface Briefing {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

interface BriefingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string | null;
  dealTitle: string;
  dealValue: number;
  clientName: string;
  clientAvatar: string | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Mock briefings data
const mockBriefings: Record<string, Briefing[]> = {
  'default': [
    {
      id: '1',
      content: 'Initial consultation scheduled for next Tuesday. Client wants to discuss wedding photography packages.',
      author: 'Studio Pro',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: '2',
      content: 'Client prefers natural lighting and outdoor locations. Suggested the botanical garden as a venue option.',
      author: 'Studio Pro',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};

// Get initial briefings for a deal
const getInitialBriefings = (dealId: string | null): Briefing[] => {
  if (!dealId) return [];
  return mockBriefings[dealId] || mockBriefings['default'];
};

export function BriefingModal({
  open,
  onOpenChange,
  dealId,
  dealTitle,
  dealValue,
  clientName,
  clientAvatar,
}: BriefingModalProps) {
  const initialBriefings = useMemo(() => getInitialBriefings(dealId), [dealId]);
  const [briefings, setBriefings] = useState<Briefing[]>(initialBriefings);
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Reset briefings when dealId changes
  const [prevDealId, setPrevDealId] = useState(dealId);
  if (dealId !== prevDealId) {
    setPrevDealId(dealId);
    setBriefings(getInitialBriefings(dealId));
  }

  const handleAddBriefing = async () => {
    if (!newContent.trim()) return;

    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    const newBriefing: Briefing = {
      id: Date.now().toString(),
      content: newContent,
      author: 'Studio Pro',
      createdAt: new Date().toISOString(),
    };

    setBriefings(prev => [newBriefing, ...prev]);
    setNewContent('');
    setIsLoading(false);
  };

  const handleEditBriefing = (briefing: Briefing) => {
    setEditingId(briefing.id);
    setEditContent(briefing.content);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    setBriefings(prev =>
      prev.map(b =>
        b.id === editingId ? { ...b, content: editContent } : b
      )
    );
    setEditingId(null);
    setEditContent('');
    setIsLoading(false);
  };

  const handleDeleteBriefing = async (id: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    setBriefings(prev => prev.filter(b => b.id !== id));
    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} min ago`;
      }
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] glass-card">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12 border-2 border-primary/30">
              <AvatarImage src={clientAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${clientName}`} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {clientName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-lg">{dealTitle}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <span>{clientName}</span>
                <span className="text-primary font-medium">• {formatCurrency(dealValue)}</span>
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="glass-badge">
              <FileText className="w-3 h-3 mr-1" />
              {briefings.length} notes
            </Badge>
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        {/* Add new briefing */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Add Note</span>
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a note about this deal..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[80px] resize-none glass-input"
            />
            <Button
              onClick={handleAddBriefing}
              disabled={!newContent.trim() || isLoading}
              className="gradient-gold text-warm-950 hover:opacity-90 self-end"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Briefings list */}
        <ScrollArea className="flex-1 pr-4" style={{ maxHeight: '400px' }}>
          <div className="space-y-4">
            {briefings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No notes yet</p>
                <p className="text-xs">Add your first note above</p>
              </div>
            ) : (
              briefings.map((briefing) => (
                <div
                  key={briefing.id}
                  className="p-4 rounded-xl bg-muted/50 border border-transparent hover:border-primary/20 transition-all group"
                >
                  {editingId === briefing.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(null);
                            setEditContent('');
                          }}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={isLoading}
                          className="gradient-gold text-warm-950"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {briefing.content}
                      </p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{briefing.author}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(briefing.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEditBriefing(briefing)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => handleDeleteBriefing(briefing.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
