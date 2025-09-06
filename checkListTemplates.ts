// FILE: checklistTemplates.ts - Comprehensive checklist templates and quick-create data
export interface ChecklistTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  description: string;
  recurring?: 'daily' | 'weekly' | 'monthly';
  items: Array<{
    text: string;
    priority?: 'low' | 'normal' | 'high';
    estimatedMinutes?: number;
    assignable?: boolean;
  }>;
}

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  // DAILY ROUTINES
  {
    id: 'morning-routine',
    name: 'Morning Routine',
    category: 'Daily Routine',
    icon: '🌅',
    color: '#f59e0b',
    description: 'Start your day right with a structured morning routine',
    recurring: 'daily',
    items: [
      { text: 'Make bed', priority: 'normal', estimatedMinutes: 2 },
      { text: 'Brush teeth', priority: 'high', estimatedMinutes: 3 },
      { text: 'Shower/get dressed', priority: 'high', estimatedMinutes: 15 },
      { text: 'Eat healthy breakfast', priority: 'high', estimatedMinutes: 15 },
      { text: 'Review daily goals', priority: 'normal', estimatedMinutes: 5 },
      { text: 'Check weather and plan outfit', priority: 'low', estimatedMinutes: 2 },
      { text: 'Pack lunch if needed', priority: 'normal', estimatedMinutes: 10 }
    ]
  },
  {
    id: 'evening-routine',
    name: 'Evening Wind-Down',
    category: 'Daily Routine',
    icon: '🌙',
    color: '#6366f1',
    description: 'Prepare for restful sleep with an evening routine',
    recurring: 'daily',
    items: [
      { text: 'Put away items from the day', priority: 'normal', estimatedMinutes: 10 },
      { text: 'Prepare clothes for tomorrow', priority: 'normal', estimatedMinutes: 5 },
      { text: 'Brush teeth and evening skincare', priority: 'high', estimatedMinutes: 10 },
      { text: 'Write in journal/reflect on day', priority: 'normal', estimatedMinutes: 15 },
      { text: 'Set phone to airplane mode', priority: 'normal', estimatedMinutes: 1 },
      { text: 'Read for 15-30 minutes', priority: 'low', estimatedMinutes: 20 }
    ]
  },

  // HOUSEHOLD MANAGEMENT
  {
    id: 'weekly-cleaning',
    name: 'Weekly House Cleaning',
    category: 'Household',
    icon: '🧹',
    color: '#10b981',
    description: 'Comprehensive weekly cleaning routine for the whole house',
    recurring: 'weekly',
    items: [
      { text: 'Vacuum all floors', priority: 'high', estimatedMinutes: 30, assignable: true },
      { text: 'Mop kitchen and bathroom floors', priority: 'high', estimatedMinutes: 20, assignable: true },
      { text: 'Clean all bathrooms', priority: 'high', estimatedMinutes: 45, assignable: true },
      { text: 'Dust all surfaces', priority: 'normal', estimatedMinutes: 25, assignable: true },
      { text: 'Change bed sheets', priority: 'normal', estimatedMinutes: 15, assignable: true },
      { text: 'Clean kitchen thoroughly', priority: 'high', estimatedMinutes: 40, assignable: true },
      { text: 'Take out all trash and recycling', priority: 'high', estimatedMinutes: 10, assignable: true },
      { text: 'Wipe down all mirrors and windows', priority: 'low', estimatedMinutes: 15, assignable: true }
    ]
  },
  {
    id: 'grocery-shopping',
    name: 'Grocery Shopping',
    category: 'Household',
    icon: '🛒',
    color: '#059669',
    description: 'Complete grocery shopping checklist',
    items: [
      { text: 'Check fridge and pantry inventory', priority: 'high', estimatedMinutes: 10 },
      { text: 'Plan meals for the week', priority: 'high', estimatedMinutes: 15 },
      { text: 'Make shopping list by store section', priority: 'normal', estimatedMinutes: 10 },
      { text: 'Check for coupons and deals', priority: 'low', estimatedMinutes: 5 },
      { text: 'Fresh produce', priority: 'high' },
      { text: 'Dairy and eggs', priority: 'high' },
      { text: 'Meat and seafood', priority: 'normal' },
      { text: 'Pantry staples', priority: 'normal' },
      { text: 'Household items', priority: 'low' },
      { text: 'Put away groceries properly', priority: 'high', estimatedMinutes: 15 }
    ]
  },

  // TRAVEL & EVENTS
  {
    id: 'weekend-trip',
    name: 'Weekend Trip Packing',
    category: 'Travel',
    icon: '🎒',
    color: '#8b5cf6',
    description: 'Don\'t forget anything on your weekend getaway',
    items: [
      { text: 'Check weather forecast for destination', priority: 'high', estimatedMinutes: 5 },
      { text: 'Pack clothes for 2-3 days', priority: 'high', estimatedMinutes: 20 },
      { text: 'Toiletries and medications', priority: 'high', estimatedMinutes: 10 },
      { text: 'Phone charger and electronics', priority: 'high', estimatedMinutes: 5 },
      { text: 'Travel documents and ID', priority: 'high', estimatedMinutes: 5 },
      { text: 'Snacks and water bottle', priority: 'normal', estimatedMinutes: 10 },
      { text: 'Entertainment (books, games)', priority: 'low', estimatedMinutes: 5 },
      { text: 'Camera or phone for photos', priority: 'normal', estimatedMinutes: 2 },
      { text: 'Confirm reservations', priority: 'high', estimatedMinutes: 10 },
      { text: 'Set house security/timers', priority: 'normal', estimatedMinutes: 5 }
    ]
  },
  {
    id: 'vacation-packing',
    name: 'Vacation Packing (1 Week+)',
    category: 'Travel',
    icon: ✈️',
    color: '#3b82f6',
    description: 'Complete packing list for longer vacations',
    items: [
      { text: 'Research destination weather and culture', priority: 'high', estimatedMinutes: 20 },
      { text: 'Pack clothes for each day + extras', priority: 'high', estimatedMinutes: 45 },
      { text: 'Shoes for different activities', priority: 'high', estimatedMinutes: 10 },
      { text: 'All toiletries and personal care', priority: 'high', estimatedMinutes: 15 },
      { text: 'Medications and first aid kit', priority: 'high', estimatedMinutes: 10 },
      { text: 'Electronics and chargers', priority: 'high', estimatedMinutes: 10 },
      { text: 'Travel documents and copies', priority: 'high', estimatedMinutes: 15 },
      { text: 'Travel insurance information', priority: 'normal', estimatedMinutes: 5 },
      { text: 'Local currency or cards', priority: 'high', estimatedMinutes: 10 },
      { text: 'Guidebooks or offline maps', priority: 'normal', estimatedMinutes: 5 },
      { text: 'Arrange house/pet sitting', priority: 'high', estimatedMinutes: 30 },
      { text: 'Stop mail and newspaper delivery', priority: 'normal', estimatedMinutes: 10 }
    ]
  },

  // WORK & PRODUCTIVITY
  {
    id: 'new-project-setup',
    name: 'New Project Setup',
    category: 'Work',
    icon: '🚀',
    color: '#dc2626',
    description: 'Get organized at the start of any new project',
    items: [
      { text: 'Define project goals and scope', priority: 'high', estimatedMinutes: 30 },
      { text: 'Identify key stakeholders', priority: 'high', estimatedMinutes: 15 },
      { text: 'Create project timeline', priority: 'high', estimatedMinutes: 45 },
      { text: 'Set up project folders and files', priority: 'normal', estimatedMinutes: 20 },
      { text: 'Create communication channels', priority: 'normal', estimatedMinutes: 15 },
      { text: 'Schedule kickoff meeting', priority: 'high', estimatedMinutes: 10 },
      { text: 'Research similar past projects', priority: 'low', estimatedMinutes: 60 },
      { text: 'Set up tracking and reporting', priority: 'normal', estimatedMinutes: 30 },
      { text: 'Identify potential risks', priority: 'normal', estimatedMinutes: 20 }
    ]
  },
  {
    id: 'weekly-review',
    name: 'Weekly Planning & Review',
    category: 'Productivity',
    icon: '📋',
    color: '#7c3aed',
    description: 'Weekly reflection and planning session',
    recurring: 'weekly',
    items: [
      { text: 'Review previous week\'s accomplishments', priority: 'high', estimatedMinutes: 15 },
      { text: 'Identify what didn\'t get done and why', priority: 'normal', estimatedMinutes: 10 },
      { text: 'Review upcoming week\'s calendar', priority: 'high', estimatedMinutes: 10 },
      { text: 'Set 3-5 key priorities for the week', priority: 'high', estimatedMinutes: 15 },
      { text: 'Schedule important tasks', priority: 'high', estimatedMinutes: 20 },
      { text: 'Clear and organize workspace', priority: 'normal', estimatedMinutes: 15 },
      { text: 'Update project statuses', priority: 'normal', estimatedMinutes: 20 },
      { text: 'Plan personal time and activities', priority: 'normal', estimatedMinutes: 10 }
    ]
  },

  // HEALTH & FITNESS
  {
    id: 'workout-routine',
    name: 'Complete Workout Session',
    category: 'Health',
    icon: '💪',
    color: '#ef4444',
    description: 'Full workout routine checklist',
    items: [
      { text: 'Warm up (5-10 minutes)', priority: 'high', estimatedMinutes: 8 },
      { text: 'Cardio exercise (20-30 minutes)', priority: 'high', estimatedMinutes: 25 },
      { text: 'Strength training', priority: 'normal', estimatedMinutes: 30 },
      { text: 'Core/abs workout', priority: 'normal', estimatedMinutes: 10 },
      { text: 'Cool down and stretching', priority: 'high', estimatedMinutes: 10 },
      { text: 'Log workout in fitness app', priority: 'low', estimatedMinutes: 5 },
      { text: 'Drink water and refuel', priority: 'high', estimatedMinutes: 5 },
      { text: 'Clean/put away equipment', priority: 'normal', estimatedMinutes: 5 }
    ]
  },
  {
    id: 'meal-prep',
    name: 'Weekly Meal Prep',
    category: 'Health',
    icon: '🥗',
    color: '#22c55e',
    description: 'Prepare healthy meals for the week ahead',
    recurring: 'weekly',
    items: [
      { text: 'Plan meals for the week', priority: 'high', estimatedMinutes: 20 },
      { text: 'Make grocery list', priority: 'high', estimatedMinutes: 10 },
      { text: 'Shop for ingredients', priority: 'high', estimatedMinutes: 60 },
      { text: 'Wash and prep vegetables', priority: 'high', estimatedMinutes: 30 },
      { text: 'Cook grains and proteins', priority: 'high', estimatedMinutes: 45 },
      { text: 'Portion meals into containers', priority: 'normal', estimatedMinutes: 20 },
      { text: 'Label containers with dates', priority: 'normal', estimatedMinutes: 10 },
      { text: 'Clean up kitchen', priority: 'normal', estimatedMinutes: 20 }
    ]
  },

  // FAMILY & EVENTS
  {
    id: 'birthday-party',
    name: 'Birthday Party Planning',
    category: 'Events',
    icon: '🎂',
    color: '#f59e0b',
    description: 'Plan the perfect birthday celebration',
    items: [
      { text: 'Set date and create guest list', priority: 'high', estimatedMinutes: 20 },
      { text: 'Send invitations', priority: 'high', estimatedMinutes: 30 },
      { text: 'Plan menu and order cake', priority: 'high', estimatedMinutes: 45 },
      { text: 'Buy decorations and supplies', priority: 'normal', estimatedMinutes: 60 },
      { text: 'Plan activities and games', priority: 'normal', estimatedMinutes: 30 },
      { text: 'Prepare party favors', priority: 'low', estimatedMinutes: 45 },
      { text: 'Set up space day of party', priority: 'high', estimatedMinutes: 60, assignable: true },
      { text: 'Prepare food and drinks', priority: 'high', estimatedMinutes: 90, assignable: true },
      { text: 'Take photos throughout event', priority: 'normal' },
      { text: 'Clean up after party', priority: 'normal', estimatedMinutes: 60, assignable: true }
    ]
  },
  {
    id: 'back-to-school',
    name: 'Back to School Preparation',
    category: 'Family',
    icon: '🎓',
    color: '#3b82f6',
    description: 'Get ready for the new school year',
    items: [
      { text: 'Review school supply list', priority: 'high', estimatedMinutes: 10 },
      { text: 'Shop for school supplies', priority: 'high', estimatedMinutes: 90 },
      { text: 'Buy new clothes and shoes', priority: 'normal', estimatedMinutes: 120 },
      { text: 'Schedule medical checkups', priority: 'high', estimatedMinutes: 20 },
      { text: 'Update emergency contacts at school', priority: 'high', estimatedMinutes: 15 },
      { text: 'Set up study space at home', priority: 'normal', estimatedMinutes: 60 },
      { text: 'Establish new bedtime routine', priority: 'normal', estimatedMinutes: 30 },
      { text: 'Plan first week lunches', priority: 'normal', estimatedMinutes: 20 },
      { text: 'Meet with teachers (if new school)', priority: 'normal', estimatedMinutes: 60 },
      { text: 'Organize backpack and supplies', priority: 'high', estimatedMinutes: 30, assignable: true }
    ]
  },

  // SEASONAL & MAINTENANCE
  {
    id: 'spring-cleaning',
    name: 'Spring Deep Cleaning',
    category: 'Seasonal',
    icon: '🌸',
    color: '#10b981',
    description: 'Annual deep clean and organization',
    items: [
      { text: 'Declutter each room', priority: 'high', estimatedMinutes: 180, assignable: true },
      { text: 'Wash windows inside and out', priority: 'normal', estimatedMinutes: 120, assignable: true },
      { text: 'Deep clean carpets and rugs', priority: 'normal', estimatedMinutes: 90, assignable: true },
      { text: 'Organize closets and donate items', priority: 'high', estimatedMinutes: 120, assignable: true },
      { text: 'Clean out garage/basement/attic', priority: 'normal', estimatedMinutes: 240, assignable: true },
      { text: 'Service HVAC system', priority: 'high', estimatedMinutes: 120 },
      { text: 'Clean light fixtures and fans', priority: 'normal', estimatedMinutes: 60, assignable: true },
      { text: 'Organize important documents', priority: 'normal', estimatedMinutes: 90 },
      { text: 'Check smoke detector batteries', priority: 'high', estimatedMinutes: 15 }
    ]
  },
  {
    id: 'car-maintenance',
    name: 'Quarterly Car Maintenance',
    category: 'Maintenance',
    icon: '🚗',
    color: '#6b7280',
    description: 'Keep your vehicle in top condition',
    recurring: 'monthly',
    items: [
      { text: 'Check oil level and condition', priority: 'high', estimatedMinutes: 5 },
      { text: 'Inspect tire pressure and tread', priority: 'high', estimatedMinutes: 15 },
      { text: 'Test all lights and signals', priority: 'high', estimatedMinutes: 10 },
      { text: 'Check windshield washer fluid', priority: 'normal', estimatedMinutes: 3 },
      { text: 'Inspect belts and hoses', priority: 'normal', estimatedMinutes: 10 },
      { text: 'Clean interior and vacuum', priority: 'normal', estimatedMinutes: 30 },
      { text: 'Wash and wax exterior', priority: 'low', estimatedMinutes: 60 },
      { text: 'Check registration and insurance', priority: 'normal', estimatedMinutes: 5 },
      { text: 'Schedule service if needed', priority: 'normal', estimatedMinutes: 15 }
    ]
  }
];

// Quick suggestions based on user input
export const QUICK_SUGGESTIONS = {
  daily: ['morning-routine', 'evening-routine'],
  weekly: ['weekly-cleaning', 'meal-prep', 'weekly-review'],
  monthly: ['car-maintenance'],
  travel: ['weekend-trip', 'vacation-packing'],
  work: ['new-project-setup', 'weekly-review'],
  health: ['workout-routine', 'meal-prep'],
  family: ['birthday-party', 'back-to-school'],
  cleaning: ['weekly-cleaning', 'spring-cleaning'],
  events: ['birthday-party']
};

// Categories for organization
export const TEMPLATE_CATEGORIES = [
  { name: 'Daily Routine', icon: '🌅', color: '#f59e0b' },
  { name: 'Household', icon: '🏠', color: '#10b981' },
  { name: 'Travel', icon: '✈️', color: '#3b82f6' },
  { name: 'Work', icon: '💼', color: '#dc2626' },
  { name: 'Productivity', icon: '📈', color: '#7c3aed' },
  { name: 'Health', icon: '💚', color: '#22c55e' },
  { name: 'Events', icon: '🎉', color: '#f59e0b' },
  { name: 'Family', icon: '👨‍👩‍👧‍👦', color: '#3b82f6' },
  { name: 'Seasonal', icon: '🌿', color: '#10b981' },
  { name: 'Maintenance', icon: '🔧', color: '#6b7280' }
];

export function getTemplatesByCategory(category: string): ChecklistTemplate[] {
  return CHECKLIST_TEMPLATES.filter(template => template.category === category);
}

export function getRecurringTemplates(): ChecklistTemplate[] {
  return CHECKLIST_TEMPLATES.filter(template => template.recurring);
}

export function searchTemplates(query: string): ChecklistTemplate[] {
  const lowercaseQuery = query.toLowerCase();
  return CHECKLIST_TEMPLATES.filter(template => 
    template.name.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.category.toLowerCase().includes(lowercaseQuery) ||
    template.items.some(item => item.text.toLowerCase().includes(lowercaseQuery))
  );
}