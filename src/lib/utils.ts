import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency (BRL)
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Status colors for deal stages and client/booking statuses
export const statusColors: Record<string, string> = {
  new: 'bg-blue-500',
  briefing: 'bg-purple-500',
  quoting: 'bg-amber-500',
  production: 'bg-green-500',
  completed: 'bg-warm-700',
  pending: 'bg-amber-500',
  confirmed: 'bg-green-500',
  cancelled: 'bg-red-500',
  active: 'bg-green-500',
  lead: 'bg-blue-500',
  inactive: 'bg-warm-500',
  // Portuguese legacy aliases (backward compat during transition)
  novo: 'bg-blue-500',
  contando: 'bg-amber-500',
  producao: 'bg-green-500',
  finalizado: 'bg-warm-700',
};

// Human-readable status labels
export const statusLabels: Record<string, string> = {
  new: 'New',
  briefing: 'Briefing',
  quoting: 'Quoting',
  production: 'Production',
  completed: 'Completed',
  active: 'Active',
  lead: 'Lead',
  inactive: 'Inactive',
  // Portuguese legacy aliases (backward compat during transition)
  novo: 'New',
  contando: 'Quoting',
  producao: 'Production',
  finalizado: 'Completed',
};

// Chart color palette
export const CHART_COLORS = ['#b8860b', '#6b5c4a', '#9a8460', '#d4a24c', '#4a9b6b', '#5b8db8', '#9b6bb8', '#c75050'];

// Event type icons mapping (icon name -> label)
export const eventTypeIcons: Record<string, string> = {
  'Wedding': 'Camera',
  'Corporate Event': 'Building',
  'Portrait Session': 'Camera',
  'Product Photography': 'Camera',
  'Music Video': 'Video',
  'Documentary': 'Video',
  'Real Estate': 'Building',
  'Fashion Shoot': 'Camera',
  'Birthday Party': 'Camera',
  'Conference': 'Users2',
  'Graduation': 'Camera',
  'Family Portrait': 'Camera',
  'Engagement': 'Star',
  'Brand Campaign': 'Briefcase',
};
