// FILE: useJournalLogic.ts - Enhanced journal functionality for Chat page
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useJournalEntries, useCreateJournalEntry } from './api-hooks.js';
import { useToast } from './ui-store.js';

// Enhanced journal interfaces
export interface JournalEntry {
  entry_id: number;
  text: string;
  mood?: number | null;
  energy?: number | null;
  stress?: number | null;
  tags?: string | null;
  created_at: string;
  weather?: string;
  location?: string;
  gratitude?: string;
  goals?: string;
  reflection?: string;
  photos?: string[]; // URLs or base64
}

export interface JournalTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  prompts: Array<{
    label: string;
    placeholder: string;
    type: 'text' | 'textarea' | 'scale';
    required?: boolean;
  }>;
}

export interface JournalAnalytics {
  totalEntries: number;
  entriesThisWeek: number;
  averageMood: number;
  averageEnergy: number;
  averageStress: number;
  moodTrend: 'up' | 'down' | 'stable';
  energyTrend: 'up' | 'down' | 'stable';
  stressTrend: 'up' | 'down' | 'stable';
  commonTags: Array<{ tag: string; count: number }>;
  longestStreak: number;
  currentStreak: number;
}

export interface JournalPreferences {
  mood: number;
  energy: number;
  stress: number;
  tags: string;
  saveTo: 'local' | 'db' | 'vector' | 'both';
  reminderTime?: string;
  reminderEnabled: boolean;
  privateMode: boolean;
  autoSuggestTags: boolean;
  defaultTemplate?: string;
  includeWeather: boolean;
  includeLocation: boolean;
}

// Journal templates for guided writing
export const JOURNAL_TEMPLATES: JournalTemplate[] = [
  {
    id: 'daily-reflection',
    name: 'Daily Reflection',
    description: 'Simple end-of-day reflection',
    icon: '🌅',
    prompts: [
      { label: 'How was your day?', placeholder: 'Describe your day...', type: 'textarea', required: true },
      { label: 'What went well?', placeholder: 'Celebrate your wins...', type: 'textarea' },
      { label: 'What could be improved?', placeholder: 'Areas for growth...', type: 'textarea' },
      { label: 'Tomorrow\'s focus', placeholder: 'What will you prioritize?', type: 'text' }
    ]
  },
  {
    id: 'gratitude',
    name: 'Gratitude Practice',
    description: 'Focus on appreciation and thankfulness',
    icon: '🙏',
    prompts: [
      { label: 'Three things I\'m grateful for', placeholder: '1. \n2. \n3. ', type: 'textarea', required: true },
      { label: 'Someone who made my day better', placeholder: 'Who helped or inspired you?', type: 'text' },
      { label: 'A small moment that brought joy', placeholder: 'Notice the little things...', type: 'textarea' },
      { label: 'How did you help others today?', placeholder: 'Your contribution to the world...', type: 'textarea' }
    ]
  },
  {
    id: 'goal-progress',
    name: 'Goal Progress',
    description: 'Track progress toward your objectives',
    icon: '🎯',
    prompts: [
      { label: 'Goal I worked on today', placeholder: 'Which goal did you advance?', type: 'text', required: true },
      { label: 'Progress made', placeholder: 'What steps did you take?', type: 'textarea' },
      { label: 'Obstacles encountered', placeholder: 'What challenged you?', type: 'textarea' },
      { label: 'Next action needed', placeholder: 'What\'s your next step?', type: 'text' }
    ]
  },
  {
    id: 'mood-check',
    name: 'Mood Check-in',
    description: 'Explore your emotional state',
    icon: '💭',
    prompts: [
      { label: 'Current mood', placeholder: 'How are you feeling right now?', type: 'textarea', required: true },
      { label: 'What influenced your mood?', placeholder: 'Events, people, thoughts...', type: 'textarea' },
      { label: 'How did you handle stress?', placeholder: 'Coping strategies used...', type: 'textarea' },
      { label: 'Self-care activities', placeholder: 'How did you take care of yourself?', type: 'text' }
    ]
  },
  {
    id: 'creative-flow',
    name: 'Creative Flow',
    description: 'Capture creative thoughts and inspiration',
    icon: '🎨',
    prompts: [
      { label: 'Creative spark', placeholder: 'What inspired you today?', type: 'textarea', required: true },
      { label: 'Ideas brewing', placeholder: 'New concepts or projects...', type: 'textarea' },
      { label: 'Creative blocks', placeholder: 'What\'s stopping your flow?', type: 'textarea' },
      { label: 'Tomorrow\'s creative time', placeholder: 'When will you create?', type: 'text' }
    ]
  },
  {
    id: 'weekly-review',
    name: 'Weekly Review',
    description: 'Comprehensive weekly reflection',
    icon: '📊',
    prompts: [
      { label: 'Week\'s highlights', placeholder: 'What were the best moments?', type: 'textarea', required: true },
      { label: 'Lessons learned', placeholder: 'What did you discover?', type: 'textarea' },
      { label: 'Goals achieved', placeholder: 'What did you accomplish?', type: 'textarea' },
      { label: 'Next week\'s intentions', placeholder: 'What do you want to focus on?', type: 'textarea' }
    ]
  }
];

export function useJournalLogic() {
  // API hooks
  const { data: entries = [], isLoading, error, refetch } = useJournalEntries({ from: undefined, to: undefined });
  const createEntryMutation = useCreateJournalEntry();
  const { showToast } = useToast();

  // UI State
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<JournalTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  // Journal preferences (persisted to localStorage)
  const [preferences, setPreferences] = useState<JournalPreferences>(() => {
    try {
      const saved = localStorage.getItem('journal.preferences.v1');
      return saved ? JSON.parse(saved) : {
        mood: 5,
        energy: 5,
        stress: 3,
        tags: '',
        saveTo: 'both',
        reminderEnabled: false,
        privateMode: false,
        autoSuggestTags: true,
        includeWeather: false,
        includeLocation: false
      };
    } catch {
      return {
        mood: 5,
        energy: 5,
        stress: 3,
        tags: '',
        saveTo: 'both',
        reminderEnabled: false,
        privateMode: false,
        autoSuggestTags: true,
        includeWeather: false,
        includeLocation: false
      };
    }
  });

  // Template form state
  const [templateResponses, setTemplateResponses] = useState<Record<string, string>>({});

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('journal.preferences.v1', JSON.stringify(preferences));
  }, [preferences]);

  // Analytics calculation
  const analytics = useMemo((): JournalAnalytics => {
    if (!entries.length) {
      return {
        totalEntries: 0,
        entriesThisWeek: 0,
        averageMood: 0,
        averageEnergy: 0,
        averageStress: 0,
        moodTrend: 'stable',
        energyTrend: 'stable',
        stressTrend: 'stable',
        commonTags: [],
        longestStreak: 0,
        currentStreak: 0
      };
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const entriesThisWeek = entries.filter(e => new Date(e.created_at) >= weekAgo).length;
    const entriesLastWeek = entries.filter(e => {
      const date = new Date(e.created_at);
      return date >= twoWeeksAgo && date < weekAgo;
    }).length;

    // Mood/Energy/Stress calculations
    const validMoods = entries.filter(e => e.mood !== null && e.mood !== undefined).map(e => e.mood!);
    const validEnergy = entries.filter(e => e.energy !== null && e.energy !== undefined).map(e => e.energy!);
    const validStress = entries.filter(e => e.stress !== null && e.stress !== undefined).map(e => e.stress!);

    const averageMood = validMoods.length ? validMoods.reduce((a, b) => a + b, 0) / validMoods.length : 0;
    const averageEnergy = validEnergy.length ? validEnergy.reduce((a, b) => a + b, 0) / validEnergy.length : 0;
    const averageStress = validStress.length ? validStress.reduce((a, b) => a + b, 0) / validStress.length : 0;

    // Trend calculation (last week vs previous week)
    const recentMoods = entries.filter(e => new Date(e.created_at) >= weekAgo && e.mood !== null).map(e => e.mood!);
    const previousMoods = entries.filter(e => {
      const date = new Date(e.created_at);
      return date >= twoWeeksAgo && date < weekAgo && e.mood !== null;
    }).map(e => e.mood!);

    const getMoodTrend = () => {
      if (!recentMoods.length || !previousMoods.length) return 'stable';
      const recentAvg = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
      const previousAvg = previousMoods.reduce((a, b) => a + b, 0) / previousMoods.length;
      const diff = recentAvg - previousAvg;
      if (diff > 0.5) return 'up';
      if (diff < -0.5) return 'down';
      return 'stable';
    };

    // Common tags
    const allTags = entries.flatMap(e => 
      e.tags ? e.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    );
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Streak calculation (simplified - consecutive days with entries)
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date().toDateString();
    const entriesByDate = sortedEntries.reduce((acc, entry) => {
      const date = new Date(entry.created_at).toDateString();
      acc[date] = true;
      return acc;
    }, {} as Record<string, boolean>);

    // Calculate current streak from today backwards
    let checkDate = new Date();
    while (entriesByDate[checkDate.toDateString()]) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return {
      totalEntries: entries.length,
      entriesThisWeek,
      averageMood,
      averageEnergy,
      averageStress,
      moodTrend: getMoodTrend(),
      energyTrend: 'stable', // Simplified for now
      stressTrend: 'stable', // Simplified for now
      commonTags,
      longestStreak: Math.max(longestStreak, currentStreak),
      currentStreak
    };
  }, [entries]);

  // Filtered entries for display
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Text search
      if (searchQuery && !entry.text.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Tag filter
      if (filterTags.length > 0) {
        const entryTags = entry.tags ? entry.tags.split(',').map(t => t.trim()) : [];
        if (!filterTags.some(tag => entryTags.includes(tag))) {
          return false;
        }
      }

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const entryDate = new Date(entry.created_at);
        if (dateRange.from && entryDate < new Date(dateRange.from)) return false;
        if (dateRange.to && entryDate > new Date(dateRange.to)) return false;
      }

      return true;
    });
  }, [entries, searchQuery, filterTags, dateRange]);

  // Handlers
  const handleCreateEntry = useCallback(async (text: string, additionalData: Partial<JournalEntry> = {}) => {
    try {
      const entryData = {
        text: text.trim(),
        mood: preferences.mood,
        energy: preferences.energy,
        stress: preferences.stress,
        tags: preferences.tags,
        ...additionalData
      };

      await createEntryMutation.mutateAsync(entryData);
      showToast('Journal entry saved successfully!', 'success');
      
      // Reset template responses if using template
      if (selectedTemplate) {
        setTemplateResponses({});
        setSelectedTemplate(null);
      }
    } catch (error) {
      showToast('Failed to save journal entry', 'error');
    }
  }, [preferences, createEntryMutation, showToast, selectedTemplate]);

  const handleUseTemplate = useCallback((template: JournalTemplate) => {
    setSelectedTemplate(template);
    setTemplateResponses({});
    setShowTemplates(false);
  }, []);

  const handleTemplateSubmit = useCallback(() => {
    if (!selectedTemplate) return;

    const responses = Object.entries(templateResponses)
      .map(([label, response]) => `**${label}**: ${response}`)
      .join('\n\n');

    const fullText = `# ${selectedTemplate.name}\n\n${responses}`;
    handleCreateEntry(fullText);
  }, [selectedTemplate, templateResponses, handleCreateEntry]);

  const updatePreferences = useCallback((updates: Partial<JournalPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const getSuggestedTags = useCallback(() => {
    if (!preferences.autoSuggestTags) return [];
    
    const recentTags = entries
      .slice(0, 20) // Last 20 entries
      .flatMap(e => e.tags ? e.tags.split(',').map(t => t.trim()) : [])
      .filter(Boolean);
    
    const uniqueTags = Array.from(new Set(recentTags));
    return uniqueTags.slice(0, 8); // Top 8 suggestions
  }, [entries, preferences.autoSuggestTags]);

  // Return organized state and handlers
  return {
    // Data
    data: {
      entries: filteredEntries,
      allEntries: entries,
      templates: JOURNAL_TEMPLATES,
      analytics,
      isLoading,
      error,
      suggestedTags: getSuggestedTags()
    },

    // State
    state: {
      showTemplates,
      showAnalytics,
      showHistory,
      selectedTemplate,
      searchQuery,
      filterTags,
      dateRange,
      preferences,
      templateResponses
    },

    // Setters
    setters: {
      setShowTemplates,
      setShowAnalytics,
      setShowHistory,
      setSelectedTemplate,
      setSearchQuery,
      setFilterTags,
      setDateRange,
      setPreferences: updatePreferences,
      setTemplateResponses
    },

    // Handlers
    handlers: {
      handleCreateEntry,
      handleUseTemplate,
      handleTemplateSubmit,
      updatePreferences,
      refetch
    },

    // Mutations
    mutations: {
      createEntryMutation
    },

    // Utils
    utils: {
      showToast
    }
  };
}