// SWR: hooks compartilhados para busca de dados no cliente
// Segue boas praticas Vercel: deduplicacao automatica de requisicoes (client-swr-dedup)
import useSWR, { mutate as globalMutate } from 'swr';
import type { AppClient, AppDeal, DashboardData } from '@/types';

// Fetcher generico com tratamento de erro
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });

// Hook para dados do dashboard (revalida a cada 60s maximo)
export function useDashboardData() {
  return useSWR<DashboardData>('/api/dashboard', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
}

// Hook para lista de clientes (aceita parametros de busca, status e paginacao)
export function useClients(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params ?? {}).filter(
        (entry): entry is [string, string] =>
          entry[1] !== undefined && entry[1] !== ''
      )
    )
  ).toString();
  const key = query ? `/api/clients?${query}` : '/api/clients';
  return useSWR<AppClient[]>(key, fetcher, { revalidateOnFocus: false });
}

// Hook para lista de deals (aceita parametros de status e paginacao)
export function useDeals(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params ?? {}).filter(
        (entry): entry is [string, string] =>
          entry[1] !== undefined && entry[1] !== ''
      )
    )
  ).toString();
  const key = query ? `/api/deals?${query}` : '/api/deals';
  return useSWR<AppDeal[]>(key, fetcher, { revalidateOnFocus: false });
}

// Hook para clientes com suporte a paginacao (retorna metadados: data, total, page, limit, totalPages)
export function usePaginatedClients(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}) {
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(
        (entry): entry is [string, string] =>
          entry[1] !== undefined && entry[1] !== ''
      )
    )
  ).toString();
  return useSWR<{
    data: AppClient[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(`/api/clients?${query}`, fetcher, { revalidateOnFocus: false });
}

// Funcoes de mutacao para invalidar cache apos operacoes CRUD
// Retorna wrappers estaveis que chamam globalMutate do SWR
export function useMutate() {
  return {
    mutateDashboard: () => globalMutate('/api/dashboard'),
    mutateClients: () => globalMutate('/api/clients'),
    mutateDeals: () => globalMutate('/api/deals'),
    mutateAll: () => {
      globalMutate('/api/dashboard');
      globalMutate('/api/clients');
      globalMutate('/api/deals');
    },
  };
}
