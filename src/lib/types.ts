export interface ScheduleEntry {
  id: string;
  category: "study" | "ai_work" | "learning" | "other_work" | "personal" | "content";
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
  content: { n: 'Content', c: '#f43f5e' }
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
