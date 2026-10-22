import { ScheduleEntry } from "./types";

export type WorkItemType = "project" | "task" | "feature" | "experiment";
export type WorkItemStatus = "planned" | "in_progress" | "completed" | "blocked" | "archived";
export type SessionType = "building" | "learning" | "experimentation";

export interface WorkItem {
  id: string;
  type: WorkItemType;
  title: string;
  description?: string;
  status: WorkItemStatus;
  projectId?: string;
  category: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkSession {
  id: string;
  projectId: string;
  workItemId?: string;
  sessionType: SessionType;
  workSummary: string;
  outcome?: string;
  status?: WorkItemStatus;
  scheduleEntryId?: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const SESSION_TYPE_CONFIG: Record<
  SessionType,
  { name: string; color: string; desc: string }
> = {
  building: {
    name: "Building",
    color: "#4ade80", // Emerald
    desc: "Coding, feature implementation, and architecture",
  },
  learning: {
    name: "Learning",
    color: "#bef264", // Lime
    desc: "Reading docs, studying papers, and skill acquisition",
  },
  experimentation: {
    name: "Experimentation",
    color: "#38bdf8", // Sky blue
    desc: "Prototyping, prompt tuning, and benchmarking",
  },
};

export const STATUS_CONFIG: Record<
  WorkItemStatus,
  { label: string; color: string; bg: string }
> = {
  completed: {
    label: "Completed",
    color: "#4ade80",
    bg: "rgba(74, 222, 128, 0.15)",
  },
  in_progress: {
    label: "In Progress",
    color: "#fcd34d",
    bg: "rgba(252, 211, 77, 0.15)",
  },
  planned: {
    label: "Planned",
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.15)",
  },
  blocked: {
    label: "Blocked",
    color: "#f43f5e",
    bg: "rgba(244, 63, 94, 0.15)",
  },
  archived: {
    label: "Archived",
    color: "#64748b",
    bg: "rgba(100, 116, 139, 0.15)",
  },
};

export interface ProjectWorkLogSummary {
  project: WorkItem;
  totalMinutes: number;
  totalHours: number;
  uniqueScheduleSessions: number;
  totalWorkSessions: number;
  unlinkedSessionsCount: number;
  hoursBySessionType: Record<SessionType, number>;
  minutesBySessionType: Record<SessionType, number>;
  workItemsSummary: {
    total: number;
    completed: number;
    pending: number;
    byType: {
      features: { total: number; completed: number; pending: number };
      tasks: { total: number; completed: number; pending: number };
      experiments: { total: number; completed: number; pending: number };
    };
  };
  workItems: WorkItem[];
  recentSessions: Array<
    WorkSession & {
      scheduleDetails?: {
        startTime: string;
        endTime: string;
        durationMinutes: number;
      };
      workItemTitle?: string;
      workItemType?: WorkItemType;
    }
  >;
}

export interface DashboardStats {
  totalAiHours: number;
  totalAiMinutes: number;
  uniqueScheduleSessionsCount: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalWorkSessions: number;
  totalDeliverables: number;
  completedDeliverables: number;
  hoursBySessionType: Record<SessionType, number>;
  projectAllocations: Array<{
    projectId: string;
    projectTitle: string;
    hours: number;
    percentage: number;
    status: WorkItemStatus;
  }>;
  dailyTrends: Array<{
    date: string;
    dayLabel: string;
    totalHours: number;
    buildingHours: number;
    learningHours: number;
    experimentationHours: number;
  }>;
}

/**
 * Aggregates work items, sessions, and schedule records for a single project.
 * Uses scheduleEntryId as the single source of truth for duration,
 * strictly counting each schedule block only ONCE to prevent duplicate hours.
 */
export function aggregateProjectWorkLog(
  project: WorkItem,
  items: WorkItem[],
  sessions: WorkSession[],
  scheduleEntriesMap: Map<string, ScheduleEntry>
): ProjectWorkLogSummary {
  // Deduplicate linked schedule entries
  const uniqueScheduleIds = Array.from(
    new Set(
      sessions
        .map((s) => s.scheduleEntryId)
        .filter((id): id is string => Boolean(id && scheduleEntriesMap.has(id)))
    )
  );

  let totalMinutes = 0;
  for (const scheduleId of uniqueScheduleIds) {
    const entry = scheduleEntriesMap.get(scheduleId);
    if (entry) {
      totalMinutes += entry.durationMinutes;
    }
  }

  // Hours by session type
  const sessionTypes: SessionType[] = ["building", "learning", "experimentation"];
  const hoursBySessionType: Record<SessionType, number> = {
    building: 0,
    learning: 0,
    experimentation: 0,
  };
  const minutesBySessionType: Record<SessionType, number> = {
    building: 0,
    learning: 0,
    experimentation: 0,
  };

  for (const st of sessionTypes) {
    const typeSessions = sessions.filter((s) => s.sessionType === st);
    const typeUniqueIds = Array.from(
      new Set(
        typeSessions
          .map((s) => s.scheduleEntryId)
          .filter((id): id is string => Boolean(id && scheduleEntriesMap.has(id)))
      )
    );
    const typeMins = typeUniqueIds.reduce(
      (acc, id) => acc + (scheduleEntriesMap.get(id)?.durationMinutes ?? 0),
      0
    );
    minutesBySessionType[st] = typeMins;
    hoursBySessionType[st] = parseFloat((typeMins / 60).toFixed(2));
  }

  const unlinkedSessionsCount = sessions.filter(
    (s) => !s.scheduleEntryId || !scheduleEntriesMap.has(s.scheduleEntryId)
  ).length;

  // Work items summary
  const byType = {
    features: { total: 0, completed: 0, pending: 0 },
    tasks: { total: 0, completed: 0, pending: 0 },
    experiments: { total: 0, completed: 0, pending: 0 },
  };

  let completedCount = 0;
  let pendingCount = 0;

  for (const item of items) {
    if (item.status === "completed") {
      completedCount++;
    } else if (item.status !== "archived") {
      pendingCount++;
    }

    const key =
      item.type === "feature"
        ? "features"
        : item.type === "task"
        ? "tasks"
        : item.type === "experiment"
        ? "experiments"
        : null;

    if (key) {
      byType[key].total++;
      if (item.status === "completed") byType[key].completed++;
      else if (item.status !== "archived") byType[key].pending++;
    }
  }

  const itemsMap = new Map(items.map((i) => [i.id, i]));
  const recentSessions = sessions.map((s) => {
    const schedule = s.scheduleEntryId ? scheduleEntriesMap.get(s.scheduleEntryId) : undefined;
    const item = s.workItemId ? itemsMap.get(s.workItemId) : undefined;

    return {
      ...s,
      ...(schedule
        ? {
            scheduleDetails: {
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              durationMinutes: schedule.durationMinutes,
            },
          }
        : {}),
      ...(item
        ? {
            workItemTitle: item.title,
            workItemType: item.type,
          }
        : {}),
    };
  });

  return {
    project,
    totalMinutes,
    totalHours: parseFloat((totalMinutes / 60).toFixed(2)),
    uniqueScheduleSessions: uniqueScheduleIds.length,
    totalWorkSessions: sessions.length,
    unlinkedSessionsCount,
    hoursBySessionType,
    minutesBySessionType,
    workItemsSummary: {
      total: items.length,
      completed: completedCount,
      pending: pendingCount,
      byType,
    },
    workItems: items,
    recentSessions,
  };
}

/**
 * Calculates overall dashboard stats, project time allocations, and daily trends.
 */
export function aggregateDashboardStats(
  projects: WorkItem[],
  workItems: WorkItem[],
  workSessions: WorkSession[],
  scheduleEntries: ScheduleEntry[],
  trendDays: number = 14
): DashboardStats {
  const scheduleMap = new Map(scheduleEntries.map((e) => [e.id, e]));

  // Deduplicate all linked schedule entries across all projects
  const allUniqueScheduleIds = Array.from(
    new Set(
      workSessions
        .map((s) => s.scheduleEntryId)
        .filter((id): id is string => Boolean(id && scheduleMap.has(id)))
    )
  );

  let totalAiMinutes = 0;
  for (const id of allUniqueScheduleIds) {
    const entry = scheduleMap.get(id);
    if (entry) {
      totalAiMinutes += entry.durationMinutes;
    }
  }

  // Session type hours across all sessions
  const hoursBySessionType: Record<SessionType, number> = {
    building: 0,
    learning: 0,
    experimentation: 0,
  };

  for (const st of ["building", "learning", "experimentation"] as SessionType[]) {
    const typeSessions = workSessions.filter((s) => s.sessionType === st);
    const typeIds = Array.from(
      new Set(
        typeSessions
          .map((s) => s.scheduleEntryId)
          .filter((id): id is string => Boolean(id && scheduleMap.has(id)))
      )
    );
    const mins = typeIds.reduce(
      (acc, id) => acc + (scheduleMap.get(id)?.durationMinutes ?? 0),
      0
    );
    hoursBySessionType[st] = parseFloat((mins / 60).toFixed(2));
  }

  // Project Allocations
  const projectSummaries = projects.map((p) => {
    const pSessions = workSessions.filter((s) => s.projectId === p.id);
    const pItems = workItems.filter((i) => i.projectId === p.id);
    const summary = aggregateProjectWorkLog(p, pItems, pSessions, scheduleMap);
    return summary;
  });

  const sumAllProjectMinutes = projectSummaries.reduce(
    (acc, s) => acc + s.totalMinutes,
    0
  );

  const projectAllocations = projectSummaries
    .map((s) => ({
      projectId: s.project.id,
      projectTitle: s.project.title,
      hours: s.totalHours,
      percentage:
        sumAllProjectMinutes > 0
          ? parseFloat(((s.totalMinutes / sumAllProjectMinutes) * 100).toFixed(1))
          : 0,
      status: s.project.status,
    }))
    .sort((a, b) => b.hours - a.hours);

  // Daily Trends for past N days
  const dailyTrends: DashboardStats["dailyTrends"] = [];
  const today = new Date();

  for (let i = trendDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    // Sessions on this date
    const dateSessions = workSessions.filter((s) => s.date === dateStr);
    
    // Unique schedule IDs on this date
    const dateScheduleIds = Array.from(
      new Set(
        dateSessions
          .map((s) => s.scheduleEntryId)
          .filter((id): id is string => Boolean(id && scheduleMap.has(id)))
      )
    );

    const dateTotalMins = dateScheduleIds.reduce(
      (acc, id) => acc + (scheduleMap.get(id)?.durationMinutes ?? 0),
      0
    );

    // Split by session type on this date
    const buildingIds = Array.from(
      new Set(
        dateSessions
          .filter((s) => s.sessionType === "building")
          .map((s) => s.scheduleEntryId)
          .filter((id): id is string => Boolean(id && scheduleMap.has(id)))
      )
    );
    const learningIds = Array.from(
      new Set(
        dateSessions
          .filter((s) => s.sessionType === "learning")
          .map((s) => s.scheduleEntryId)
          .filter((id): id is string => Boolean(id && scheduleMap.has(id)))
      )
    );
    const expIds = Array.from(
      new Set(
        dateSessions
          .filter((s) => s.sessionType === "experimentation")
          .map((s) => s.scheduleEntryId)
          .filter((id): id is string => Boolean(id && scheduleMap.has(id)))
      )
    );

    const buildingMins = buildingIds.reduce((a, id) => a + (scheduleMap.get(id)?.durationMinutes ?? 0), 0);
    const learningMins = learningIds.reduce((a, id) => a + (scheduleMap.get(id)?.durationMinutes ?? 0), 0);
    const expMins = expIds.reduce((a, id) => a + (scheduleMap.get(id)?.durationMinutes ?? 0), 0);

    dailyTrends.push({
      date: dateStr,
      dayLabel,
      totalHours: parseFloat((dateTotalMins / 60).toFixed(2)),
      buildingHours: parseFloat((buildingMins / 60).toFixed(2)),
      learningHours: parseFloat((learningMins / 60).toFixed(2)),
      experimentationHours: parseFloat((expMins / 60).toFixed(2)),
    });
  }

  // Deliverables count
  const nonProjectItems = workItems.filter((i) => i.type !== "project");
  const completedDeliverables = nonProjectItems.filter((i) => i.status === "completed").length;

  return {
    totalAiHours: parseFloat((totalAiMinutes / 60).toFixed(2)),
    totalAiMinutes,
    uniqueScheduleSessionsCount: allUniqueScheduleIds.length,
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === "in_progress").length,
    completedProjects: projects.filter((p) => p.status === "completed").length,
    totalWorkSessions: workSessions.length,
    totalDeliverables: nonProjectItems.length,
    completedDeliverables,
    hoursBySessionType,
    projectAllocations,
    dailyTrends,
  };
}
