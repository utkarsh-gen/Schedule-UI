import { StreakDefinition, StreakCompletion, StreakProgress } from './types';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function computeStreakProgress(def: StreakDefinition, completions: StreakCompletion[], todayStr: string): StreakProgress {
  // Sort completions by date ascending
  const sortedDates = [...new Set(completions.map(c => c.date))].sort();

  // We need to define periods. The periods start from `def.createdAt` and step by `def.periodAmount` `def.periodUnit`.
  const getNextPeriod = (startStr: string): string => {
    const d = new Date(startStr + "T00:00:00");
    if (def.periodUnit === 'days') {
      d.setDate(d.getDate() + def.periodAmount);
    } else if (def.periodUnit === 'weeks') {
      d.setDate(d.getDate() + (def.periodAmount * 7));
    }
    return iso(d);
  };

  let currentPeriodStart = def.createdAt;
  let currentPeriodEnd = getNextPeriod(currentPeriodStart);
  
  let streakCount = 0;
  let completionsThisPeriod = 0;
  let isBroken = false;
  
  // Fast forward periods up to today
  let activePeriodStart = def.createdAt;
  let activePeriodEnd = getNextPeriod(activePeriodStart);
  
  while (activePeriodEnd <= todayStr) {
    activePeriodStart = activePeriodEnd;
    activePeriodEnd = getNextPeriod(activePeriodStart);
  }
  
  // Now we iterate periods from createdAt to activePeriodStart, calculating streak
  let iterStart = def.createdAt;
  let iterEnd = getNextPeriod(iterStart);
  
  streakCount = 0;
  
  while (iterStart < activePeriodStart) {
    const compsInPeriod = sortedDates.filter(d => d >= iterStart && d < iterEnd).length;
    if (compsInPeriod >= def.requiredCompletions) {
      streakCount++;
    } else {
      streakCount = 0; // broken
    }
    iterStart = iterEnd;
    iterEnd = getNextPeriod(iterStart);
  }

  // Now we are at the active period (containing today)
  completionsThisPeriod = sortedDates.filter(d => d >= activePeriodStart && d < activePeriodEnd).length;
  
  const isCompletedThisPeriod = completionsThisPeriod >= def.requiredCompletions;
  
  // If it's broken in the past, and we haven't completed this period, streak is 0.
  // We only increment streakCount for this period if it's completed.
  if (isCompletedThisPeriod) {
    streakCount++;
  }

  // isBroken refers to if the streak was lost before this period and hasn't been recovered yet.
  isBroken = streakCount === 0 && activePeriodStart !== def.createdAt && !isCompletedThisPeriod;

  const today = new Date(todayStr + "T00:00:00");
  const endD = new Date(activePeriodEnd + "T00:00:00");
  const daysRemaining = Math.max(0, Math.ceil((endD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    definition: def,
    currentStreak: streakCount,
    currentPeriodStart: activePeriodStart,
    currentPeriodEnd: activePeriodEnd,
    completionsThisPeriod,
    isCompletedThisPeriod,
    isBroken,
    daysRemainingInPeriod: daysRemaining,
    history: sortedDates.slice(-30) // last 30 completions
  };
}
