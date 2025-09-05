// FILE: api-hooks.ts - Complete modern API hooks with Tanstack Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-client.js';

// ============================================================================
// SETTINGS HELPER
// ============================================================================
function getApiBase(): string {
  try {
    const s = JSON.parse(localStorage.getItem("app.settings.v1") || "{}");
    return (s?.aiEndpoint || "http://127.0.0.1:8002").replace(/\/+$/, "");
  } catch {
    return "http://127.0.0.1:8002";
  }
}

// ============================================================================
// FETCH UTILITIES
// ============================================================================
async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getApiBase();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Network error');
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }
  return response.text() as T;
}

// ============================================================================
// TASK TYPES
// ============================================================================
export interface Task {
  task_id: number;
  title: string;
  description?: string | null;
  priority: number;
  xp: number;
  coins: number;
  category_id?: number | null;
  created_at?: string | null;
  due_date?: string | null;
  due_time?: string | null;
}

export interface TaskFilters {
  q?: string;
  priority?: number;
  sort?: 'priority' | 'title' | 'created_at';
  category_id?: string;
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

// ============================================================================
// TASKS HOOKS
// ============================================================================

/**
 * Fetch tasks with automatic caching and background updates
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
    staleTime: 1000 * 60 * 2, // 2 minutes for tasks
  });
}

/**
 * Create a new task with optimistic updates
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
      // Invalidate and refetch all task lists
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
    onError: (error) => {
      console.error('Failed to create task:', error);
    },
  });
}

/**
 * Update an existing task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<Task>) => {
      return apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

/**
 * Delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      return apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

/**
 * Complete a task with optimistic updates
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, note }: { id: number; note?: string }) => {
      return apiFetch(`/api/tasks/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
    },
    onSuccess: (data, variables) => {
      // Optimistically remove the task from the list
      queryClient.setQueriesData(
        { queryKey: queryKeys.tasks.lists() },
        (oldData: Task[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(task => task.task_id !== variables.id);
        }
      );
      
      // Also invalidate to get fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

// ============================================================================
// CHECKLIST TYPES
// ============================================================================
export interface Checklist {
  checklist_id: number;
  name: string;
  category?: string | null;
  created_at: string;
  items?: ChecklistItem[];
}

export interface ChecklistItem {
  id: number;
  checklist_id: number;
  text: string;
  done: number; // 0 or 1
  position?: number;
  created_at?: string;
}

export interface NewChecklist {
  name: string;
  category?: string;
}

export interface NewChecklistItem {
  text: string;
  position?: number;
}

// ============================================================================
// CHECKLISTS HOOKS
// ============================================================================

/**
 * Fetch checklists
 */
export function useChecklists(filters: { category?: string; q?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.checklists.list(filters.category),
    queryFn: async (): Promise<Checklist[]> => {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.q) params.set('q', filters.q);
      
      const query = params.toString();
      return apiFetch(`/api/checklists${query ? `?${query}` : ''}`);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes for checklists
  });
}

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
 * Create a new checklist
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
 * Delete a checklist
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
    onSuccess: (data, variables) => {
      // Invalidate the specific checklist items
      queryClient.invalidateQueries({ queryKey: ['checklist-items', variables.checklist_id] });
      // Also invalidate checklists if they include item counts
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
      return apiFetch(`/api/checklists/${checklist_id}/items/${item_id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ done }),
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate the specific checklist items
      queryClient.invalidateQueries({ queryKey: ['checklist-items', variables.checklist_id] });
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
      return apiFetch(`/api/checklists/${checklist_id}/items/${item_id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate the specific checklist items
      queryClient.invalidateQueries({ queryKey: ['checklist-items', variables.checklist_id] });
    },
  });
}

// ============================================================================
// JOURNAL TYPES & HOOKS
// ============================================================================
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

/**
 * Fetch recent journal entries
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
    staleTime: 1000 * 60 * 10, // 10 minutes for journal
  });
}

/**
 * Create a journal entry
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
    },
  });
}

// ============================================================================
// HEALTH CHECK HOOK
// ============================================================================
export function useHealthCheck() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: async () => {
      return apiFetch('/api/admin/health');
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}