// FILE: trace.ts - Modern event logging and debugging system
// ============================================================================
// TYPES
// ============================================================================

export interface TraceEvent {
  id: string;
  timestamp: string;
  event: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  data?: any;
  source?: string;
  duration?: number;
  tags?: string[];
}

export interface TraceFilter {
  level?: 'info' | 'warn' | 'error' | 'debug';
  event?: string;
  source?: string;
  since?: string;
  tags?: string[];
}

export interface TraceStats {
  total: number;
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
  recent: TraceEvent[];
  errors: TraceEvent[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

let maxEvents = 200;
let enableConsoleOutput = true;
let enabledLevels: Set<string> = new Set(['info', 'warn', 'error', 'debug']);

// ============================================================================
// STORAGE
// ============================================================================

const eventBuffer: TraceEvent[] = [];
const pendingTimers: Map<string, { start: number; event: string; data?: any }> = new Map();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function shouldLog(level: string): boolean {
  return enabledLevels.has(level);
}

function trimBuffer(): void {
  if (eventBuffer.length > maxEvents) {
    eventBuffer.splice(0, eventBuffer.length - maxEvents);
  }
}

function logToConsole(event: TraceEvent): void {
  if (!enableConsoleOutput) return;

  const prefix = `[${event.timestamp}] ${event.event}`;
  const message = event.data ? `${prefix}: ${JSON.stringify(event.data)}` : prefix;

  switch (event.level) {
    case 'error':
      console.error(`🔴 ${message}`);
      break;
    case 'warn':
      console.warn(`🟡 ${message}`);
      break;
    case 'debug':
      console.debug(`🔵 ${message}`);
      break;
    default:
      console.log(`⚪ ${message}`);
  }
}

// ============================================================================
// CORE LOGGING FUNCTIONS
// ============================================================================

/**
 * Log an event with specified level
 */
export function logEvent(
  event: string, 
  data?: any, 
  level: 'info' | 'warn' | 'error' | 'debug' = 'info',
  source?: string,
  tags?: string[]
): string {
  if (!shouldLog(level)) return '';

  const traceEvent: TraceEvent = {
    id: generateId(),
    timestamp: formatTimestamp(),
    event,
    level,
    data,
    source,
    tags
  };

  eventBuffer.push(traceEvent);
  trimBuffer();
  logToConsole(traceEvent);

  return traceEvent.id;
}

/**
 * Log info level event (default)
 */
export function logInfo(event: string, data?: any, source?: string): string {
  return logEvent(event, data, 'info', source);
}

/**
 * Log warning level event
 */
export function logWarn(event: string, data?: any, source?: string): string {
  return logEvent(event, data, 'warn', source);
}

/**
 * Log error level event
 */
export function logError(event: string, data?: any, source?: string): string {
  return logEvent(event, data, 'error', source);
}

/**
 * Log debug level event
 */
export function logDebug(event: string, data?: any, source?: string): string {
  return logEvent(event, data, 'debug', source);
}

// ============================================================================
// TIMING AND PERFORMANCE
// ============================================================================

/**
 * Start timing an operation
 */
export function startTimer(key: string, event: string, data?: any): void {
  pendingTimers.set(key, {
    start: performance.now(),
    event,
    data
  });
}

/**
 * End timing and log the duration
 */
export function endTimer(key: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info'): string | null {
  const timer = pendingTimers.get(key);
  if (!timer) {
    logWarn('timer_not_found', { key }, 'trace');
    return null;
  }

  const duration = performance.now() - timer.start;
  pendingTimers.delete(key);

  return logEvent(timer.event, { ...timer.data, duration }, level, 'timer');
}

/**
 * Measure function execution time
 */
export function measureTime<T>(
  fn: () => T, 
  event: string, 
  data?: any
): T {
  const key = generateId();
  startTimer(key, event, data);
  
  try {
    const result = fn();
    endTimer(key, 'info');
    return result;
  } catch (error) {
    endTimer(key, 'error');
    throw error;
  }
}

/**
 * Measure async function execution time
 */
export async function measureTimeAsync<T>(
  fn: () => Promise<T>, 
  event: string, 
  data?: any
): Promise<T> {
  const key = generateId();
  startTimer(key, event, data);
  
  try {
    const result = await fn();
    endTimer(key, 'info');
    return result;
  } catch (error) {
    endTimer(key, 'error');
    throw error;
  }
}

// ============================================================================
// RETRIEVAL AND FILTERING
// ============================================================================

/**
 * Get all events (legacy compatibility)
 */
export function getEvents(): TraceEvent[] {
  return eventBuffer.slice(-maxEvents);
}

/**
 * Get events with filtering
 */
export function getFilteredEvents(filter: TraceFilter = {}): TraceEvent[] {
  let filtered = eventBuffer;

  if (filter.level) {
    filtered = filtered.filter(e => e.level === filter.level);
  }

  if (filter.event) {
    filtered = filtered.filter(e => e.event.includes(filter.event!));
  }

  if (filter.source) {
    filtered = filtered.filter(e => e.source === filter.source);
  }

  if (filter.since) {
    const sinceTime = new Date(filter.since).getTime();
    filtered = filtered.filter(e => new Date(e.timestamp).getTime() >= sinceTime);
  }

  if (filter.tags && filter.tags.length > 0) {
    filtered = filtered.filter(e => 
      e.tags && filter.tags!.some(tag => e.tags!.includes(tag))
    );
  }

  return filtered;
}

/**
 * Get recent events (last N)
 */
export function getRecentEvents(count: number = 50): TraceEvent[] {
  return eventBuffer.slice(-count);
}

/**
 * Get events by level
 */
export function getEventsByLevel(level: 'info' | 'warn' | 'error' | 'debug'): TraceEvent[] {
  return eventBuffer.filter(e => e.level === level);
}

/**
 * Get error events only
 */
export function getErrors(): TraceEvent[] {
  return getEventsByLevel('error');
}

// ============================================================================
// STATISTICS AND ANALYSIS
// ============================================================================

/**
 * Get trace statistics
 */
export function getTraceStats(): TraceStats {
  const byLevel: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  eventBuffer.forEach(event => {
    byLevel[event.level] = (byLevel[event.level] || 0) + 1;
    if (event.source) {
      bySource[event.source] = (bySource[event.source] || 0) + 1;
    }
  });

  return {
    total: eventBuffer.length,
    byLevel,
    bySource,
    recent: getRecentEvents(10),
    errors: getErrors().slice(-5)
  };
}

/**
 * Get events in a time range
 */
export function getEventsInRange(start: string, end: string): TraceEvent[] {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  return eventBuffer.filter(event => {
    const eventTime = new Date(event.timestamp).getTime();
    return eventTime >= startTime && eventTime <= endTime;
  });
}

// ============================================================================
// CONFIGURATION FUNCTIONS
// ============================================================================

/**
 * Set maximum number of events to keep in buffer
 */
export function setMaxEvents(n: number): void {
  maxEvents = Math.max(1, Math.min(10000, n)); // Limit between 1-10k
  trimBuffer();
}

/**
 * Legacy alias for backward compatibility
 */
export function setMax(n: number): void {
  setMaxEvents(n);
}

/**
 * Enable/disable console output
 */
export function setConsoleOutput(enabled: boolean): void {
  enableConsoleOutput = enabled;
}

/**
 * Configure which log levels are enabled
 */
export function setEnabledLevels(levels: string[]): void {
  enabledLevels = new Set(levels);
}

/**
 * Clear all events from buffer
 */
export function clearEvents(): void {
  eventBuffer.length = 0;
  pendingTimers.clear();
  logInfo('trace_cleared', { timestamp: formatTimestamp() }, 'trace');
}

// ============================================================================
// EXPORT AND IMPORT
// ============================================================================

/**
 * Export events as JSON string
 */
export function exportEvents(filter?: TraceFilter): string {
  const events = filter ? getFilteredEvents(filter) : eventBuffer;
  return JSON.stringify({
    exported_at: formatTimestamp(),
    total_events: events.length,
    events
  }, null, 2);
}

/**
 * Export events for download
 */
export function createDownloadData(filter?: TraceFilter): { filename: string; content: string; type: string } {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return {
    filename: `trace-events-${timestamp}.json`,
    content: exportEvents(filter),
    type: 'application/json'
  };
}

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

/**
 * Log system information for debugging
 */
export function logSystemInfo(): void {
  const info = {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
    timestamp: formatTimestamp(),
    bufferSize: eventBuffer.length,
    maxEvents,
    enabledLevels: Array.from(enabledLevels),
    pendingTimers: pendingTimers.size
  };

  logInfo('system_info', info, 'trace');
}

/**
 * Create a tagged logger for a specific source
 */
export function createLogger(source: string, defaultTags: string[] = []) {
  return {
    info: (event: string, data?: any, tags?: string[]) => 
      logInfo(event, data, source, [...defaultTags, ...(tags || [])]),
    warn: (event: string, data?: any, tags?: string[]) => 
      logWarn(event, data, source, [...defaultTags, ...(tags || [])]),
    error: (event: string, data?: any, tags?: string[]) => 
      logError(event, data, source, [...defaultTags, ...(tags || [])]),
    debug: (event: string, data?: any, tags?: string[]) => 
      logDebug(event, data, source, [...defaultTags, ...(tags || [])]),
    timer: {
      start: (key: string, event: string, data?: any) => startTimer(key, event, data),
      end: (key: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info') => endTimer(key, level)
    }
  };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Log trace system startup
logInfo('trace_system_initialized', { 
  maxEvents, 
  enableConsoleOutput, 
  enabledLevels: Array.from(enabledLevels) 
}, 'trace');