// FILE: useChecklistsLogic.ts - Comprehensive checklist logic with all enhanced features
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  useChecklists, 
  useCreateChecklist, 
  useDeleteChecklist, 
  useChecklistItems, 
  useAddChecklistItem, 
  useToggleChecklistItem, 
  useDeleteChecklistItem 
} from './api-hooks.js';
import { useToast } from './ui-store.js';
import { 
  CHECKLIST_TEMPLATES, 
  TEMPLATE_CATEGORIES, 
  QUICK_SUGGESTIONS,
  getTemplatesByCategory,
  getRecurringTemplates,
  searchTemplates,
  type ChecklistTemplate 
} from './checklistTemplates.js';

// Enhanced interfaces
export interface EnhancedChecklistItem {
  id: number;
  checklist_id: number;
  text: string;
  done: number;
  position?: number;
  priority?: 'low' | 'normal' | 'high';
  assignedTo?: string;
  dueDate?: string;
  estimatedMinutes?: number;
  notes?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface EnhancedChecklist {
  checklist_id: number;
  name: string;
  category?: string;
  icon?: string;
  color?: string;
  description?: string;
  created_at?: string;
  isRecurring?: boolean;
  recurringType?: 'daily' | 'weekly' | 'monthly';
  nextDueDate?: string;
  isTemplate?: boolean;
  sharedWith?: string[];
  totalEstimatedTime?: number;
  completionRate?: number;
  items?: EnhancedChecklistItem[];
}

export interface ChecklistAnalytics {
  totalChecklists: number;
  completedToday: number;
  completedThisWeek: number;
  averageCompletionTime: number;
  mostUsedCategories: Array<{ category: string; count: number }>;
  streakDays: number;
  totalItemsCompleted: number;
}

export function useChecklistsLogic() {
  // API hooks
  const { data: checklists = [], isLoading, error, refetch } = useChecklists();
  const createChecklistMutation = useCreateChecklist();
  const deleteChecklistMutation = useDeleteChecklist();
  const { showToast } = useToast();

  // UI State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'created' | 'completion'>('name');
  const [openChecklists, setOpenChecklists] = useState<Set<number>>(new Set());
  const [selectedChecklists, setSelectedChecklists] = useState<Set<number>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);

  // Form state
  const [newChecklist, setNewChecklist] = useState({
    name: '',
    category: '',
    description: '',
    icon: '',
    color: '#3b82f6',
    isRecurring: false,
    recurringType: 'weekly' as 'daily' | 'weekly' | 'monthly',
    isTemplate: false
  });

  // Template and collaboration state
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>('all');
  const [familyMembers] = useState(['Dad', 'Mom', 'Alex', 'Sam']); // Could come from settings
  const [draggedItem, setDraggedItem] = useState<EnhancedChecklistItem | null>(null);

  // Individual checklist item management
  const [newItemTexts, setNewItemTexts] = useState<Record<number, string>>({});
  const [editingItems, setEditingItems] = useState<Record<number, EnhancedChecklistItem>>({});

  // Enhanced computed values
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(checklists.map(c => c.category).filter(Boolean)));
    return [
      ...TEMPLATE_CATEGORIES.filter(tc => uniqueCategories.includes(tc.name)),
      ...uniqueCategories
        .filter(cat => !TEMPLATE_CATEGORIES.find(tc => tc.name === cat))
        .map(cat => ({ name: cat, icon: '📋', color: '#6b7280' }))
    ];
  }, [checklists]);

  const filteredChecklists = useMemo(() => {
    let filtered = checklists.filter(checklist => {
      const matchesSearch = checklist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           checklist.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || checklist.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort checklists
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        case 'created':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'completion':
          return (b.completionRate || 0) - (a.completionRate || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [checklists, searchQuery, selectedCategory, sortBy]);

  const filteredTemplates = useMemo(() => {
    let templates = selectedTemplateCategory === 'all' 
      ? CHECKLIST_TEMPLATES 
      : getTemplatesByCategory(selectedTemplateCategory);
    
    if (templateSearchQuery) {
      templates = searchTemplates(templateSearchQuery);
    }
    
    return templates;
  }, [selectedTemplateCategory, templateSearchQuery]);

  const analytics = useMemo((): ChecklistAnalytics => {
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const completedToday = checklists.filter(c => 
      c.items?.every(item => item.done) && 
      c.items?.some(item => item.completedAt && new Date(item.completedAt).toDateString() === today)
    ).length;

    const completedThisWeek = checklists.filter(c =>
      c.items?.every(item => item.done) &&
      c.items?.some(item => item.completedAt && new Date(item.completedAt) >= weekAgo)
    ).length;

    const categoryCount = checklists.reduce((acc, c) => {
      if (c.category) {
        acc[c.category] = (acc[c.category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const mostUsedCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalItemsCompleted = checklists.reduce((total, c) => 
      total + (c.items?.filter(item => item.done).length || 0), 0
    );

    return {
      totalChecklists: checklists.length,
      completedToday,
      completedThisWeek,
      averageCompletionTime: 0, // Would need timing data
      mostUsedCategories,
      streakDays: 0, // Would need historical data
      totalItemsCompleted
    };
  }, [checklists]);

  // Checklist management handlers
  const handleCreateChecklist = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newChecklist.name.trim()) return;

    try {
      const checklistData = {
        name: newChecklist.name,
        category: newChecklist.category,
        description: newChecklist.description,
        icon: newChecklist.icon,
        color: newChecklist.color
      };

      const result = await createChecklistMutation.mutateAsync(checklistData);
      
      // If creating from template, add all template items
      if (selectedTemplate) {
        // Would need to add items via API calls here
        for (const item of selectedTemplate.items) {
          // await addItemMutation.mutateAsync({ checklist_id: result.checklist_id, text: item.text });
        }
      }

      setNewChecklist({
        name: '',
        category: '',
        description: '',