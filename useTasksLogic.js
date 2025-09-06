// FILE: useTasksLogic.ts - Complete logic hook that returns everything UI needs
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask, useUpdateTask } from './api-hooks.js';
import { useTaskFilters, useUIStore, useToast } from './ui-store.js';

// Mock completion data - replace with real API later
export const MOCK_COMPLETIONS = {
  today: { completed: 3, total: 8 },
  week: { completed: 12, total: 28 },
  month: { completed: 47, total: 89 },
  year: { completed: 234, total: 456 }
};

// Categories definition
export const categories = {
  1: { name: "Work", icon: "💼", color: "#3b82f6" },
  2: { name: "Personal", icon: "👤", color: "#22c55e" },
  3: { name: "Health", icon: "🏃", color: "#f59e0b" },
  4: { name: "Learning", icon: "📚", color: "#8b5cf6" },
  5: { name: "Habits", icon: "🔄", color: "#ef4444" }
};

export function useTasksLogic() {
  // UI State
  const taskFilters = useTaskFilters();
  const setTaskFilters = useUIStore(state => state.setTaskFilters);
  const { showToast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [bulkActionMode, setBulkActionMode] = useState(false);

  // Form state for creating/editing tasks
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 2,
    xp: 10,
    coins: 5,
    due_date: '',
    due_time: '',
    estimated_hours: 0,
    tags: '',
    category_id: null,
    notes: ''
  });

  // API hooks - Convert taskFilters to API format
  const apiFilters = {
    q: taskFilters.search || undefined,
    priority: taskFilters.priority || undefined,
    sort: taskFilters.sort || 'priority',
    category_id: taskFilters.category || undefined
  };
  const { data: tasks = [], isLoading, error, refetch } = useTasks(apiFilters);
  const createTaskMutation = useCreateTask();
  const completeTaskMutation = useCompleteTask();
  const deleteTaskMutation = useDeleteTask();
  const updateTaskMutation = useUpdateTask();

  // Filter tasks based on current filters - CLIENT SIDE since API doesn't support all filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (taskFilters.search && !task.title.toLowerCase().includes(taskFilters.search.toLowerCase()) 
          && !task.description?.toLowerCase().includes(taskFilters.search.toLowerCase())) {
        return false;
      }
      if (taskFilters.priority && task.priority !== parseInt(taskFilters.priority)) {
        return false;
      }
      if (taskFilters.category && task.category_id !== parseInt(taskFilters.category)) {
        return false;
      }
      return true;
    });
  }, [tasks, taskFilters]);

  // Task handlers
  const handleCreateTask = useCallback(async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await createTaskMutation.mutateAsync({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        xp: newTask.xp,
        coins: newTask.coins,
        category_id: newTask.category_id,
        due_date: newTask.due_date || undefined,
        due_time: newTask.due_time || undefined
      });
      
      setNewTask({
        title: '',
        description: '',
        priority: 2,
        xp: 10,
        coins: 5,
        due_date: '',
        due_time: '',
        estimated_hours: 0,
        tags: '',
        category_id: null,
        notes: ''
      });
      setShowCreateForm(false);
      showToast('Task created successfully!', 'success');
    } catch (error) {
      showToast('Failed to create task', 'error');
    }
  }, [newTask, createTaskMutation, showToast]);

  const handleCompleteTask = useCallback(async (taskId) => {
    try {
      await completeTaskMutation.mutateAsync({ id: taskId });
      showToast('Task completed! XP and coins awarded.', 'success');
    } catch (error) {
      showToast('Failed to complete task', 'error');
    }
  }, [completeTaskMutation, showToast]);

  const handleDeleteTask = useCallback(async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteTaskMutation.mutateAsync({ id: taskId });
      showToast('Task deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete task', 'error');
    }
  }, [deleteTaskMutation, showToast]);

  const handleEditTask = useCallback((task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      xp: task.xp || 10,
      coins: task.coins || 5,
      due_date: task.due_date || '',
      due_time: task.due_time || '',
      estimated_hours: 0,
      tags: '',
      category_id: task.category_id,
      notes: ''
    });
    setShowCreateForm(true);
  }, []);

  const handleUpdateTask = useCallback(async (e) => {
    e.preventDefault();
    if (!editingTask || !newTask.title.trim()) return;

    try {
      await updateTaskMutation.mutateAsync({
        id: editingTask.task_id,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        xp: newTask.xp,
        coins: newTask.coins,
        category_id: newTask.category_id,
        due_date: newTask.due_date || undefined,
        due_time: newTask.due_time || undefined
      });
      
      setEditingTask(null);
      setNewTask({
        title: '',
        description: '',
        priority: 2,
        xp: 10,
        coins: 5,
        due_date: '',
        due_time: '',
        estimated_hours: 0,
        tags: '',
        category_id: null,
        notes: ''
      });
      setShowCreateForm(false);
      showToast('Task updated successfully!', 'success');
    } catch (error) {
      showToast('Failed to update task', 'error');
    }
  }, [editingTask, newTask, updateTaskMutation, showToast]);

  // Bulk operations
  const handleBulkComplete = useCallback(async () => {
    if (selectedTasks.size === 0) return;
    
    const taskIds = Array.from(selectedTasks);
    for (const taskId of taskIds) {
      try {
        await completeTaskMutation.mutateAsync({ id: taskId });
      } catch (error) {
        console.error(`Failed to complete task ${taskId}:`, error);
      }
    }
    
    setSelectedTasks(new Set());
    setBulkActionMode(false);
    showToast(`${taskIds.length} tasks completed!`, 'success');
  }, [selectedTasks, completeTaskMutation, showToast]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedTasks.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTasks.size} tasks?`)) return;
    
    const taskIds = Array.from(selectedTasks);
    for (const taskId of taskIds) {
      try {
        await deleteTaskMutation.mutateAsync({ id: taskId });
      } catch (error) {
        console.error(`Failed to delete task ${taskId}:`, error);
      }
    }
    
    setSelectedTasks(new Set());
    setBulkActionMode(false);
    showToast(`${taskIds.length} tasks deleted!`, 'success');
  }, [selectedTasks, deleteTaskMutation, showToast]);

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(filteredTasks.map(t => t.task_id));
    setSelectedTasks(selectedTasks.size === allIds.size ? new Set() : allIds);
  }, [filteredTasks, selectedTasks]);

  const resetForm = useCallback(() => {
    setShowCreateForm(false);
    setEditingTask(null);
    setNewTask({
      title: '',
      description: '',
      priority: 2,
      xp: 10,
      coins: 5,
      due_date: '',
      due_time: '',
      estimated_hours: 0,
      tags: '',
      category_id: null,
      notes: ''
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            setShowCreateForm(true);
            break;
          case 'f':
            e.preventDefault();
            document.querySelector('input[placeholder*="Search"]')?.focus();
            break;
          case 'a':
            e.preventDefault();
            if (bulkActionMode) {
              setSelectedTasks(new Set(filteredTasks.map(t => t.task_id)));
            }
            break;
          case 'b':
            e.preventDefault();
            setBulkActionMode(!bulkActionMode);
            setSelectedTasks(new Set());
            break;
        }
      }
      
      if (e.key === 'Escape') {
        setShowCreateForm(false);
        setEditingTask(null);
        setBulkActionMode(false);
        setSelectedTasks(new Set());
        setShowKeyboardShortcuts(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [bulkActionMode, filteredTasks]);

  // Return everything UI needs in organized structure
  return {
    // Data
    data: {
      tasks,
      filteredTasks,
      isLoading,
      error,
      categories,
      MOCK_COMPLETIONS
    },
    
    // State
    state: {
      showCreateForm,
      editingTask,
      selectedTasks,
      showKeyboardShortcuts,
      bulkActionMode,
      newTask,
      taskFilters
    },
    
    // Handlers
    handlers: {
      handleCreateTask,
      handleCompleteTask,
      handleDeleteTask,
      handleEditTask,
      handleUpdateTask,
      handleBulkComplete,
      handleBulkDelete,
      handleSelectAll,
      resetForm,
      refetch
    },
    
    // Setters
    setters: {
      setShowCreateForm,
      setEditingTask,
      setSelectedTasks,
      setShowKeyboardShortcuts,
      setBulkActionMode,
      setNewTask,
      setTaskFilters
    },
    
    // Mutations
    mutations: {
      createTaskMutation,
      completeTaskMutation,
      deleteTaskMutation,
      updateTaskMutation
    },
    
    // Utils
    utils: {
      showToast
    }
  };
}