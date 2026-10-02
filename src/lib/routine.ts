export type RoutineBlockType = "sleep" | "morning_routine" | "school" | "rest" | "coaching" | "productivity" | "wind_down";

export interface RoutineBlock {
  id: string;
  type: RoutineBlockType;
  title: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

const weekdayBase: RoutineBlock[] = [
  { id: "sleep_1", type: "sleep", title: "Sleep", startTime: "00:00", endTime: "05:00" },
  { id: "morning", type: "morning_routine", title: "Morning Prep", startTime: "05:00", endTime: "06:30" },
  { id: "school", type: "school", title: "School", startTime: "06:30", endTime: "15:00" },
  { id: "rest", type: "rest", title: "Rest/Reset", startTime: "15:00", endTime: "16:00" },
  { id: "wind", type: "wind_down", title: "Dinner/Wind-down", startTime: "21:00", endTime: "22:00" },
  { id: "sleep_2", type: "sleep", title: "Sleep", startTime: "22:00", endTime: "23:59" }
];

const normalWorkday: RoutineBlock[] = [
  ...weekdayBase,
  { id: "prod", type: "productivity", title: "Productivity Hours", startTime: "16:00", endTime: "21:00" }
];

const coachingDay: RoutineBlock[] = [
  { id: "sleep_1", type: "sleep", title: "Sleep", startTime: "00:00", endTime: "05:00" },
  { id: "morning", type: "morning_routine", title: "Morning Prep", startTime: "05:00", endTime: "06:30" },
  { id: "school", type: "school", title: "School", startTime: "06:30", endTime: "15:00" },
  { id: "rest", type: "rest", title: "Rest/Reset", startTime: "15:00", endTime: "15:30" },
  { id: "coach", type: "coaching", title: "Coaching", startTime: "15:30", endTime: "21:00" },
  { id: "wind", type: "wind_down", title: "Dinner/Wind-down", startTime: "21:00", endTime: "22:00" },
  { id: "sleep_2", type: "sleep", title: "Sleep", startTime: "22:00", endTime: "23:59" }
];

const sunday: RoutineBlock[] = [
  { id: "sleep_1", type: "sleep", title: "Sleep", startTime: "00:00", endTime: "05:00" },
  { id: "prod_morn", type: "productivity", title: "Productivity Hours", startTime: "05:00", endTime: "08:00" },
  { id: "coach", type: "coaching", title: "Coaching", startTime: "08:00", endTime: "14:30" },
  { id: "prod_eve", type: "productivity", title: "Productivity Hours", startTime: "14:30", endTime: "21:00" },
  { id: "wind", type: "wind_down", title: "Dinner/Wind-down", startTime: "21:00", endTime: "22:00" },
  { id: "sleep_2", type: "sleep", title: "Sleep", startTime: "22:00", endTime: "23:59" }
];

export const DEFAULT_ROUTINE: Record<number, RoutineBlock[]> = {
  0: sunday,        // Sunday
  1: normalWorkday, // Monday
  2: normalWorkday, // Tuesday
  3: normalWorkday, // Wednesday
  4: coachingDay,   // Thursday
  5: normalWorkday, // Friday
  6: coachingDay    // Saturday
};

export function getDayOfWeek(dateString: string): number {
  return new Date(dateString).getDay();
}
