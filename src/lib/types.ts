export interface ScheduleEntry {
  id: string;
  category: "study" | "ai_work" | "learning" | "other_work" | "personal" | "content" | "sleep";
  title: string;
  description?: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  date: string; // YYYY-MM-DD
  place?: string;
  notes?: string;
  durationMinutes: number;
}

export const CATEGORIES = {
  study: { n: 'Study', c: '#5eead4' },
  ai_work: { n: 'AI work', c: '#4ade80' },
  learning: { n: 'Learning', c: '#bef264' },
  other_work: { n: 'Other work', c: '#38bdf8' },
  personal: { n: 'Personal', c: '#fcd34d' },
  content: { n: 'Content', c: '#f43f5e' },
  sleep: { n: 'Sleep', c: '#a78bfa' }
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

// --- Streaks ---
export type PeriodUnit = 'days' | 'weeks';

export interface StreakDefinition {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  periodAmount: number;
  periodUnit: PeriodUnit;
  requiredCompletions: number;
  createdAt: string;
}

export interface StreakCompletion {
  id?: string;
  streakId: string;
  date: string; // YYYY-MM-DD
}

export interface StreakProgress {
  definition: StreakDefinition;
  currentStreak: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  completionsThisPeriod: number;
  isCompletedThisPeriod: boolean;
  isBroken: boolean;
  daysRemainingInPeriod: number;
  history: string[]; // dates of recent completions
}
