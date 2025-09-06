// FILE: api-hooks.ts - Complete modern API layer with Tanstack Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-client.js';

// ============================================================================
// SETTINGS & CONFIGURATION
// ============================================================================
function getApiBase(): string {
  try {
    const settings = JSON.parse(localStorage.getItem("app.settings.v1") || "{}");
    return (settings?.aiEndpoint || "http://127.0.0.1:8002").replace(/\/+$/, "");
  } catch {
    return "http://127.0.0.1:8002";
  }
}

// ============================================================================
// MODERN FETCH UTILITY - Fixed Content-Type header issue
// ============================================================================
async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getApiBase();
  const { body, headers = {}, ...restOptions } = options || {};
  
  // Only set Content-Type for requests with a body
  const requestHeaders: HeadersInit = body ? {
    'Content-Type': 'application/json',
    ...headers,
  } : headers;

  const response = await fetch(`${baseUrl}${path}`, {
    headers: requestHeaders,
    body,
    ...restOptions,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Network error');
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }
  return response.text() as T;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Tasks
export interface Task {
  task_id: number;
  title: string;
  description?: string | null;
  priority: number;
  xp: number;
  coins: number;
  category_id?: number | null;
  created_at: string;
  due_date?: string | null;
  due_time?: string | null;
}

export interface NewTask {
  title: string;
  description?: string;
  priority?: number;
  xp?: number;
  coins?: number;
  category_id?: number;
  due_date?: string;
  due_time?: string;
}

export interface TaskFilters {
  q?: string;
  priority?: number;
  sort?: 'priority' | 'title' | 'created_at';
  category_id?: string;
}

export interface TaskCompletion {
  ok: boolean;
  completion_id: number;
  earned_xp: number;
  earned_coins: number;
  message: string;
}

// Checklists
export interface Checklist {
  checklist_id: number;
  name: string;
  category?: string | null;
  created_at: string;
  items?: ChecklistItem[];
}

export interface ChecklistItem {
  item_id: number;
  checklist_id: number;
  text: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface NewChecklist {
  name: string;
  category?: string;
}

export interface NewChecklistItem {
  text: string;
  position?: number;
}

// Journal
export interface JournalEntry {
  entry_id: number;
  text: string;
  mood?: number | null;
  energy?: number | null;
  stress?: number | null;
  tags?: string | null;
  created_at: string;
}

export interface NewJournalEntry {
  text: string;
  mood?: number;
  energy?: number;
  stress?: number;
  tags?: string;
}

// Admin
export interface HealthCheck {
  status: string;
  timestamp: string;
  uptime: number;
  database: string;
  server: string;
  db: {
    journal_mode: string;
    foreign_keys: boolean;
    wal: boolean;
  };
  counts: {
    tasks: number;
    journal: number;
    checklists: number;
  };
}

export interface AdminStats {
  tasks: {
    total: { count: number };
    by_priority: Array<{ priority: number; count: number }>;
    completed_today: { count: number };
    total_xp_earned: { total: number };
    total_coins_earned: { total: number };
  };
  journal: {
    total_entries: { count: number };
    entries_this_week: { count: number };
    avg_mood: { avg: number };
    avg_energy: { avg: number };
    avg_stress: { avg: number };
  };
  checklists: {
    total: { count: number };
    total_items: { count: number };
    completed_items: { count: number };
  };
}

// ============================================================================
// TASK HOOKS
// ============================================================================

/**
 * Fetch tasks with intelligent caching and background updates
 */
export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: async (): Promise<Task[]> => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.priority) params.set('priority', String(filters.priority));
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.category_id) params.set('category_id', filters.category_id);
      
      const query = params.toString();
      return apiFetch(`/api/tasks${query ? `?${query}` : ''}`);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
  });
}

/**
 * Create task with optimistic updates and cache invalidation
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newTask: NewTask): Promise<{ task_id: number; title: string; message: string }> => {
      return apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(newTask),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
    onError: (error) => {
      console.error('Failed to create task:', error);
    },
  });
}

/**
 * Update task with optimistic updates
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<NewTask>) => {
      return apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onMutate: async ({ id, ...updates }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      
      const previousTasks = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all });
      
      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.all },
        (oldData: Task[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(task => 
            task.task_id === id ? { ...task, ...updates } : task
          );
        }
      );
      
      return { previousTasks };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

/**
 * Delete task with optimistic removal
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
    },
    onMutate: async ({ id }) => {
      // Optimistic removal
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      
      const previousTasks = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all });
      
      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.all },
        (oldData: Task[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(task => task.task_id !== id);
        }
      );
      
      return { previousTasks };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

/**
 * Complete task with optimistic removal and XP tracking
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, note }: { id: number; note?: string }): Promise<TaskCompletion> => {
      return apiFetch(`/api/tasks/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
    },
    onMutate: async ({ id }) => {
      // Optimistic removal
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      
      const previousTasks = queryClient.getQueriesData({ queryKey: queryKeys.tasks.all });
      
      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.all },
        (oldData: Task[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(task => task.task_id !== id);
        }
      );
      
      return { previousTasks };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      // Also invalidate stats since completion affects totals
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

// ============================================================================
// CHECKLIST HOOKS
// ============================================================================

/**
 * Fetch checklists with items included
 */
export function useChecklists(filters: { category?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.checklists.list(filters.category),
    queryFn: async (): Promise<Checklist[]> => {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      
      const query = params.toString();
      return apiFetch(`/api/checklists${query ? `?${query}` : ''}`);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Create checklist
 */
export function useCreateChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newChecklist: NewChecklist) => {
      return apiFetch('/api/checklists', {
        method: 'POST',
        body: JSON.stringify(newChecklist),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checklists.all });
    },
  });
}

/**
 * Add item to checklist
 */
export function useAddChecklistItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ checklist_id, text, position }: { checklist_id: number; text: string; position?: number }) => {
      return apiFetch(`/api/checklists/${checklist_id}/items`, {
        method: 'POST',
        body: JSON.stringify({ text, position }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checklists.all });
    },
  });
}

/**
 * Toggle checklist item completion
 */
export function useToggleChecklistItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ checklist_id, item_id, done }: { checklist_id: number; item_id: number; done: number }) => {
      return apiFetch(`/api/checklists/items/${item_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: done === 1 }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checklists.all });
    },
  });
}

/**
 * Update checklist item (toggle completion, edit text, etc.)
 */
export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ item_id, updates }: { item_id: number; updates: Partial<ChecklistItem> }) => {
      return apiFetch(`/api/checklists/items/${item_id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checklists.all });
    },
  });
}

/**
 * Delete checklist item
 */
export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ checklist_id, item_id }: { checklist_id: number; item_id: number }) => {
      return apiFetch(`/api/checklists/items/${item_id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checklists.all });
    },
  });
}

// ============================================================================
// JOURNAL HOOKS
// ============================================================================

/**
 * Fetch journal entries with date filtering
 */
export function useJournalEntries(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: queryKeys.journal.recent(params),
    queryFn: async (): Promise<{ rows: JournalEntry[] }> => {
      const searchParams = new URLSearchParams();
      if (params?.from) searchParams.set('from', params.from);
      if (params?.to) searchParams.set('to', params.to);
      
      const query = searchParams.toString();
      return apiFetch(`/api/journal/recent${query ? `?${query}` : ''}`);
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Create journal entry
 */
export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entry: NewJournalEntry) => {
      return apiFetch('/api/journal', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.all });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });
}

// ============================================================================
// CHAT/AI HOOKS
// ============================================================================

/**
 * Send chat message to AI
 */
export function useChatMessage() {
  return useMutation({
    mutationFn: async ({ message, agent = "Assistant", model = "lmstudio", context = "" }: {
      message: string;
      agent?: string;
      model?: string;
      context?: string;
    }) => {
      return apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message, agent, model, context }),
      });
    },
  });
}

/**
 * Execute AI tool
 */
export function useExecuteTool() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, args }: { name: string; args: any }) => {
      return apiFetch('/api/tools/exec', {
        method: 'POST',
        body: JSON.stringify({ name, args }),
      });
    },
    onSuccess: () => {
      // Tool execution might affect any data, so invalidate broadly
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.checklists.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.all });
    },
  });
}

// ============================================================================
// ADMIN HOOKS
// ============================================================================

/**
 * Health check with automatic polling
 */
export function useHealthCheck() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async (): Promise<HealthCheck> => {
      return apiFetch('/api/admin/health');
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Poll every minute
    retry: 3,
  });
}

/**
 * Get detailed admin statistics
 */
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async (): Promise<AdminStats> => {
      return apiFetch('/api/admin/stats');
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Database maintenance operations
 */
export function useDbMaintenance() {
  const queryClient = useQueryClient();
  
  return {
    vacuum: useMutation({
      mutationFn: async () => apiFetch('/api/admin/vacuum', { method: 'POST' }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin'] });
      },
    }),
    
    reindex: useMutation({
      mutationFn: async () => apiFetch('/api/admin/reindex', { method: 'POST' }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin'] });
      },
    }),
  };
}

// ============================================================================
// EXPORT UTILITY HOOKS
// ============================================================================

/**
 * Export data in various formats
 */

/**
 * Fetch checklist items for a specific checklist
 */
export function useChecklistItems(checklistId: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ['checklist-items', checklistId],
    queryFn: async (): Promise<ChecklistItem[]> => {
      return apiFetch(`/api/checklists/${checklistId}/items`);
    },
    enabled: enabled && !!checklistId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Delete checklist
 */
export function useDeleteChecklist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return apiFetch(`/api/checklists/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checklists.all });
    },
  });
}
export function useExportData() {
  return {
    exportTasks: useMutation({
      mutationFn: async (format: 'json' | 'csv' = 'json') => {
        return apiFetch(`/api/admin/export/tasks?format=${format}`);
      },
    }),
    
    exportJournal: useMutation({
      mutationFn: async (format: 'json' | 'csv' = 'json') => {
        return apiFetch(`/api/admin/export/journal?format=${format}`);
      },
    }),
  };
}

// ============================================================================
// TRACE/DEBUG HOOKS
// ============================================================================

/**
 * Get trace events for debugging
 */
export function useTraceEvents() {
  return useQuery({
    queryKey: ['admin', 'trace'],
    queryFn: async () => {
      return apiFetch('/api/trace');
    },
    enabled: process.env.NODE_ENV === 'development',
    staleTime: 1000 * 10, // 10 seconds in dev
  });
}