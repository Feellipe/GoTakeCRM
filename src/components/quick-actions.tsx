'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Users,
  FolderKanban,
  Calendar,
  Search,
  Download,
  Moon,
  Sun,
  Settings,
  Zap,
  Keyboard,
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface QuickAction {
  id: string;
  label: string;
  shortcut: string;
  icon: typeof Plus;
  action: () => void;
  category: 'create' | 'navigation' | 'actions';
}

interface QuickActionsProps {
  onNewClient?: () => void;
  onNewDeal?: () => void;
  onNewBooking?: () => void;
  onOpenSearch?: () => void;
  onExport?: () => void;
  onOpenSettings?: () => void;
  onNavigate?: (view: string) => void;
  currentView?: string;
}

export function QuickActions({
  onNewClient,
  onNewDeal,
  onNewBooking,
  onOpenSearch,
  onExport,
  onOpenSettings,
  onNavigate,
  currentView = 'dashboard',
}: QuickActionsProps) {
  const { theme, setTheme } = useTheme();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Meta/Ctrl key shortcuts
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            if (currentView === 'clients' && onNewClient) onNewClient();
            else if (currentView === 'pipeline' && onNewDeal) onNewDeal();
            else if (onNewBooking) onNewBooking();
            break;
          case 'e':
            e.preventDefault();
            if (onExport) onExport();
            break;
          case ',':
            e.preventDefault();
            if (onOpenSettings) onOpenSettings();
            break;
        }
      }

      // Number key navigation (Alt + number)
      if (e.altKey) {
        const viewMap = ['dashboard', 'clients', 'pipeline', 'financials', 'calendar'];
        const num = parseInt(e.key);
        if (num >= 1 && num <= 5 && onNavigate) {
          e.preventDefault();
          onNavigate(viewMap[num - 1]);
        }
      }

      // Single key shortcuts
      switch (e.key.toLowerCase()) {
        case 't':
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            setTheme(theme === 'dark' ? 'light' : 'dark');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme, setTheme, currentView, onNewClient, onNewDeal, onNewBooking, onExport, onOpenSettings, onNavigate]);

  const actions: QuickAction[] = [
    // Create actions
    {
      id: 'new-client',
      label: 'New Client',
      shortcut: '⌘N (Clients)',
      icon: Users,
      action: () => onNewClient?.(),
      category: 'create',
    },
    {
      id: 'new-deal',
      label: 'New Deal',
      shortcut: '⌘N (Pipeline)',
      icon: FolderKanban,
      action: () => onNewDeal?.(),
      category: 'create',
    },
    {
      id: 'new-booking',
      label: 'New Booking',
      shortcut: '⌘N (Other)',
      icon: Calendar,
      action: () => onNewBooking?.(),
      category: 'create',
    },
    // Navigation
    {
      id: 'search',
      label: 'Search',
      shortcut: '⌘K',
      icon: Search,
      action: () => onOpenSearch?.(),
      category: 'navigation',
    },
    {
      id: 'dashboard',
      label: 'Go to Dashboard',
      shortcut: 'Alt+1',
      icon: Zap,
      action: () => onNavigate?.('dashboard'),
      category: 'navigation',
    },
    {
      id: 'clients',
      label: 'Go to Clients',
      shortcut: 'Alt+2',
      icon: Users,
      action: () => onNavigate?.('clients'),
      category: 'navigation',
    },
    {
      id: 'pipeline',
      label: 'Go to Pipeline',
      shortcut: 'Alt+3',
      icon: FolderKanban,
      action: () => onNavigate?.('pipeline'),
      category: 'navigation',
    },
    // Actions
    {
      id: 'export',
      label: 'Export Data',
      shortcut: '⌘E',
      icon: Download,
      action: () => onExport?.(),
      category: 'actions',
    },
    {
      id: 'toggle-theme',
      label: 'Toggle Theme',
      shortcut: 'T',
      icon: theme === 'dark' ? Sun : Moon,
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      category: 'actions',
    },
    {
      id: 'settings',
      label: 'Settings',
      shortcut: '⌘,',
      icon: Settings,
      action: () => onOpenSettings?.(),
      category: 'actions',
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg shadow-primary/20 gradient-gold text-warm-950 hover:scale-110 transition-transform z-50"
        >
          <Zap className="w-6 h-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 glass-card">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Keyboard className="w-4 h-4" />
          Quick Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
          Create
        </DropdownMenuLabel>
        {actions.filter(a => a.category === 'create').map((action) => (
          <DropdownMenuItem
            key={action.id}
            onClick={action.action}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <action.icon className="w-4 h-4" />
              {action.label}
            </span>
            <span className="text-xs text-muted-foreground">{action.shortcut}</span>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
          Navigation
        </DropdownMenuLabel>
        {actions.filter(a => a.category === 'navigation').map((action) => (
          <DropdownMenuItem
            key={action.id}
            onClick={action.action}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <action.icon className="w-4 h-4" />
              {action.label}
            </span>
            <span className="text-xs text-muted-foreground">{action.shortcut}</span>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
          Actions
        </DropdownMenuLabel>
        {actions.filter(a => a.category === 'actions').map((action) => (
          <DropdownMenuItem
            key={action.id}
            onClick={action.action}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <action.icon className="w-4 h-4" />
              {action.label}
            </span>
            <span className="text-xs text-muted-foreground">{action.shortcut}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
