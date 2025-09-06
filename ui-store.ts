// FILE: ui-store.ts - Zustand store for UI state
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================
interface AppSettings {
  aiEndpoint: string;
  lmBase: string;
  rememberLastSearch: boolean;
  checklistDefaultCategory: string;
  dashboard: {
    showConnections: boolean;
    showRecent: boolean;
    showRenown: boolean;
    showTaskBuckets: boolean;
  };
  aiPorts: {
    lmstudio: number;
    ollama: number;
  };
}

interface TaskFilters {
  search: string;
  priority?: number;
  sort: 'priority' | 'title' | 'created_at';
  category_id?: string;
}

interface UIState {
  // App Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  
  // Task Filters (for TasksPage)
  taskFilters: TaskFilters;
  setTaskFilters: (filters: Partial<TaskFilters>) => void;
  clearTaskSearch: () => void;
  
  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // Toast notifications
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
  
  // Modal state
  modals: {
    createTask: boolean;
    editTask: { open: boolean; taskId?: number };
    createChecklist: boolean;
  };
  openModal: (modal: keyof UIState['modals'], data?: any) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================
const defaultSettings: AppSettings = {
  aiEndpoint: 'http://127.0.0.1:8002',
  lmBase: 'http://127.0.0.1:1234',
  rememberLastSearch: true,
  checklistDefaultCategory: '',
  dashboard: {
    showConnections: true,
    showRecent: true,
    showRenown: true,
    showTaskBuckets: true,
  },
  aiPorts: {
    lmstudio: 1234,
    ollama: 11434,
  },
};

const defaultTaskFilters: TaskFilters = {
  search: '',
  sort: 'priority',
};

// ============================================================================
// ZUSTAND STORE
// ============================================================================
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Settings
      settings: defaultSettings,
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      resetSettings: () => set({ settings: defaultSettings }),

      // Task Filters
      taskFilters: defaultTaskFilters,
      setTaskFilters: (filters) =>
        set((state) => ({
          taskFilters: { ...state.taskFilters, ...filters },
        })),
      clearTaskSearch: () =>
        set((state) => ({
          taskFilters: { ...state.taskFilters, search: '' },
        })),

      // UI State
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Toast notifications
      toast: null,
      showToast: (message, type = 'info') =>
        set({ toast: { message, type } }),
      hideToast: () => set({ toast: null }),

      // Modals
      modals: {
        createTask: false,
        editTask: { open: false },
        createChecklist: false,
      },
      openModal: (modal, data) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [modal]: typeof data === 'object' ? { open: true, ...data } : true,
          },
        })),
      closeModal: (modal) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [modal]: modal === 'editTask' ? { open: false } : false,
          },
        })),
      closeAllModals: () =>
        set({
          modals: {
            createTask: false,
            editTask: { open: false },
            createChecklist: false,
          },
        }),
    }),
    {
      name: 'ui-store', // localStorage key
      partialize: (state) => ({
        // Only persist these parts of the state
        settings: state.settings,
        taskFilters: state.settings.rememberLastSearch
          ? state.taskFilters
          : defaultTaskFilters,
      }),
    }
  )
);

// ============================================================================
// CONVENIENCE HOOKS
// ============================================================================

/**
 * Hook for just the settings
 */
export const useSettings = () => useUIStore((state) => state.settings);

/**
 * Hook for updating settings
 */
export const useUpdateSettings = () => useUIStore((state) => state.updateSettings);

/**
 * Hook for task filters
 */
export const useTaskFilters = () => useUIStore((state) => state.taskFilters);

/**
 * Hook for toast notifications
 */
export const useToast = () => ({
  toast: useUIStore((state) => state.toast),
  showToast: useUIStore((state) => state.showToast),
  hideToast: useUIStore((state) => state.hideToast),
});

/**
 * Hook for modals
 */
export const useModals = () => ({
  modals: useUIStore((state) => state.modals),
  openModal: useUIStore((state) => state.openModal),
  closeModal: useUIStore((state) => state.closeModal),
  closeAllModals: useUIStore((state) => state.closeAllModals),
});	