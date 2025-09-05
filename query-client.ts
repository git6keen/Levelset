// FILE: query-client.ts - Tanstack Query setup
import { QueryClient } from '@tanstack/react-query';

// Create a query client with smart defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false, // Don't refetch when user returns to tab
      refetchOnReconnect: true, // Do refetch when internet reconnects
    },
    mutations: {
      retry: false, // Don't retry mutations by default
      onError: (error: any) => {
        console.error('Mutation error:', error);
        // You could show a toast notification here
      },
    },
  },
});

// Query keys for organization and type safety
export const queryKeys = {
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.tasks.details(), id] as const,
  },
  checklists: {
    all: ['checklists'] as const,
    lists: () => [...queryKeys.checklists.all, 'list'] as const,
    list: (category?: string) => [...queryKeys.checklists.lists(), category] as const,
    details: () => [...queryKeys.checklists.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.checklists.details(), id] as const,
  },
  journal: {
    all: ['journal'] as const,
    recent: (params?: any) => [...queryKeys.journal.all, 'recent', params] as const,
  },
  health: ['health'] as const,
} as const;