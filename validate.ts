// FILE: validate.ts - Modern validation utilities with comprehensive helpers
// ============================================================================
// BASIC VALIDATION FUNCTIONS
// ============================================================================

/**
 * Safely cap string length to prevent buffer overflows and database issues
 */
export function capStr(s: any, max: number): string {
  const v = typeof s === "string" ? s : String(s ?? "");
  return v.length > max ? v.slice(0, max) : v;
}

/**
 * Safely cap number within bounds with fallback to default
 */
export function capNum(n: any, min: number, max: number, fallback = 0): number {
  const v = Number(n ?? fallback);
  return Math.max(min, Math.min(max, isFinite(v) ? v : fallback));
}

// ============================================================================
// ENHANCED VALIDATION UTILITIES
// ============================================================================

/**
 * Parse and validate integer with bounds
 */
export function safeInt(value: any, fallback = 0, min?: number, max?: number): number {
  const parsed = parseInt(String(value), 10);
  const result = isNaN(parsed) ? fallback : parsed;
  
  if (min !== undefined && result < min) return min;
  if (max !== undefined && result > max) return max;
  
  return result;
}

/**
 * Parse and validate float with bounds
 */
export function safeFloat(value: any, fallback = 0, min?: number, max?: number): number {
  const parsed = parseFloat(String(value));
  const result = isNaN(parsed) ? fallback : parsed;
  
  if (min !== undefined && result < min) return min;
  if (max !== undefined && result > max) return max;
  
  return result;
}

/**
 * Validate and sanitize email address
 */
export function validateEmail(email: any): { valid: boolean; email: string | null } {
  const str = capStr(email, 320); // RFC 5321 limit
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!str || !emailRegex.test(str)) {
    return { valid: false, email: null };
  }
  
  return { valid: true, email: str.toLowerCase().trim() };
}

/**
 * Validate and parse date strings
 */
export function validateDate(date: any): { valid: boolean; date: Date | null; iso: string | null } {
  if (!date) return { valid: false, date: null, iso: null };
  
  const parsed = new Date(date);
  const valid = !isNaN(parsed.getTime());
  
  return {
    valid,
    date: valid ? parsed : null,
    iso: valid ? parsed.toISOString() : null
  };
}

/**
 * Validate time string in HH:MM format
 */
export function validateTime(time: any): { valid: boolean; time: string | null } {
  const str = capStr(time, 5);
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!timeRegex.test(str)) {
    return { valid: false, time: null };
  }
  
  return { valid: true, time: str };
}

/**
 * Validate priority level (1-5 scale)
 */
export function validatePriority(priority: any): number {
  return capNum(priority, 1, 5, 2); // Default to normal priority
}

/**
 * Validate XP/coin rewards
 */
export function validateReward(reward: any): number {
  return capNum(reward, 0, 10000, 0); // Max 10k rewards
}

/**
 * Validate mood/energy/stress ratings (1-10 scale)
 */
export function validateRating(rating: any): number | null {
  if (rating === null || rating === undefined || rating === '') return null;
  return capNum(rating, 1, 10, 5);
}

// ============================================================================
// TEXT PROCESSING UTILITIES
// ============================================================================

/**
 * Clean and normalize text input
 */
export function cleanText(text: any, maxLength = 1000): string {
  const str = capStr(text, maxLength);
  return str
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s\-.,!?:;'"()]/g, ''); // Remove potentially dangerous chars
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(html: any): string {
  const str = capStr(html, 10000);
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Parse and validate tags from comma-separated string
 */
export function parseTags(tags: any, maxTags = 10, maxTagLength = 30): string[] {
  if (!tags) return [];
  
  const str = capStr(tags, 500);
  return str
    .split(',')
    .map(tag => capStr(tag.trim(), maxTagLength))
    .filter(tag => tag.length > 0)
    .slice(0, maxTags);
}

/**
 * Convert tags array back to comma-separated string
 */
export function stringifyTags(tags: string[]): string {
  return Array.isArray(tags) ? tags.join(', ') : '';
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export interface TaskValidation {
  title: string;
  description: string;
  priority: number;
  xp_reward: number;
  coin_reward: number;
  category_id: number | null;
  due_date: string | null;
  due_time: string | null;
}

export interface JournalValidation {
  text: string;
  mood: number | null;
  energy: number | null;
  stress: number | null;
  tags: string[];
}

export interface ChecklistValidation {
  name: string;
  category: string;
}

export interface ChecklistItemValidation {
  text: string;
  position: number;
}

/**
 * Validate task input data
 */
export function validateTaskInput(input: any): TaskValidation {
  return {
    title: cleanText(input.title, 200),
    description: cleanText(input.description, 1000),
    priority: validatePriority(input.priority),
    xp_reward: validateReward(input.xp_reward || input.xp),
    coin_reward: validateReward(input.coin_reward || input.coins),
    category_id: input.category_id ? safeInt(input.category_id, null) : null,
    due_date: input.due_date ? validateDate(input.due_date).iso : null,
    due_time: input.due_time ? validateTime(input.due_time).time : null,
  };
}

/**
 * Validate journal entry input data
 */
export function validateJournalInput(input: any): JournalValidation {
  return {
    text: cleanText(input.text, 5000),
    mood: validateRating(input.mood),
    energy: validateRating(input.energy),
    stress: validateRating(input.stress),
    tags: parseTags(input.tags),
  };
}

/**
 * Validate checklist input data
 */
export function validateChecklistInput(input: any): ChecklistValidation {
  return {
    name: cleanText(input.name, 200),
    category: cleanText(input.category, 100),
  };
}

/**
 * Validate checklist item input data
 */
export function validateChecklistItemInput(input: any): ChecklistItemValidation {
  return {
    text: cleanText(input.text, 500),
    position: safeInt(input.position, 0, 0, 1000),
  };
}

// ============================================================================
// ADVANCED VALIDATION HELPERS
// ============================================================================

/**
 * Check if a value exists and is not empty
 */
export function isPresent(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Validate required fields in an object
 */
export function validateRequired(obj: any, requiredFields: string[]): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter(field => !isPresent(obj[field]));
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Create a validation error message
 */
export function createValidationError(field: string, message: string): Error {
  const error = new Error(`Validation failed for '${field}': ${message}`);
  error.name = 'ValidationError';
  return error;
}

/**
 * Bulk validate an array of items
 */
export function validateBatch<T>(
  items: any[], 
  validator: (item: any) => T
): { valid: T[]; errors: Array<{ index: number; error: Error }> } {
  const valid: T[] = [];
  const errors: Array<{ index: number; error: Error }> = [];
  
  items.forEach((item, index) => {
    try {
      const validated = validator(item);
      valid.push(validated);
    } catch (error) {
      errors.push({ index, error: error as Error });
    }
  });
  
  return { valid, errors };
}

// ============================================================================
// EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================================================

// Keep the original simple functions for existing code
export { capStr as cap_str, capNum as cap_num };