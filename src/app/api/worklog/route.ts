import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  WorkItem,
  WorkSession,
  aggregateProjectWorkLog,
  aggregateDashboardStats,
} from "@/lib/worklog";
import { ScheduleEntry } from "@/lib/types";

function cleanUndefined(obj: object): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function GET(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin is not configured. Check environment variables." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const trendDays = parseInt(searchParams.get("days") || "14", 10);

    // 1. Fetch work_items
    const itemsSnap = await adminDb.collection("work_items").get();
    const allItems = itemsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WorkItem[];

    const projects = allItems.filter((i) => i.type === "project");
    const childItems = allItems.filter((i) => i.type !== "project");

    // 2. Fetch work_sessions
    const sessionsSnap = await adminDb.collection("work_sessions").get();
    const sessions = sessionsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WorkSession[];

    // 3. Fetch schedule_entries
    const scheduleSnap = await adminDb.collection("schedule_entries").get();
    const scheduleEntries = scheduleSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ScheduleEntry[];

    const scheduleMap = new Map(scheduleEntries.map((e) => [e.id, e]));

    // 4. Compute per-project summaries with duplicate time protection
    const projectSummaries = projects.map((p) => {
      const pItems = childItems.filter((i) => i.projectId === p.id);
      const pSessions = sessions.filter((s) => s.projectId === p.id);
      return aggregateProjectWorkLog(p, pItems, pSessions, scheduleMap);
    });

    // 5. Compute overall dashboard stats & trends
    const stats = aggregateDashboardStats(projects, childItems, sessions, scheduleEntries, trendDays);

    return NextResponse.json({
      projects: projectSummaries,
      rawProjects: projects,
      workItems: childItems,
      workSessions: sessions.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
      scheduleEntries: scheduleEntries.filter((e) => e.category === "ai_work" || e.category === "learning"),
      stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/worklog error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin is not configured. Check environment variables." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { action } = body;
    const now = new Date().toISOString();

    if (action === "create_project") {
      const { title, description, status, category, tags, customId } = body;
      if (!title) {
        return NextResponse.json({ error: "Title is required for project" }, { status: 400 });
      }

      const col = adminDb.collection("work_items");
      const docRef = customId ? col.doc(customId) : col.doc();

      if (customId) {
        const existing = await docRef.get();
        if (existing.exists) {
          return NextResponse.json({ error: `Project '${customId}' already exists` }, { status: 400 });
        }
      }

      const newProject: WorkItem = {
        id: docRef.id,
        type: "project",
        title: title.trim(),
        description: description?.trim() || "",
        status: status || "in_progress",
        category: category || "ai_work",
        tags: tags || [],
        createdAt: now,
        updatedAt: now,
      };

      await docRef.set(cleanUndefined(newProject));
      return NextResponse.json({ success: true, project: newProject });
    }

    if (action === "create_work_item") {
      const { projectId, type, title, description, status, tags } = body;
      if (!projectId || !title || !type) {
        return NextResponse.json(
          { error: "projectId, type, and title are required for work item" },
          { status: 400 }
        );
      }

      const col = adminDb.collection("work_items");
      const docRef = col.doc();

      const newItem: WorkItem = {
        id: docRef.id,
        projectId,
        type,
        title: title.trim(),
        description: description?.trim() || "",
        status: status || "planned",
        category: "ai_work",
        tags: tags || [],
        createdAt: now,
        updatedAt: now,
      };

      await docRef.set(cleanUndefined(newItem));
      return NextResponse.json({ success: true, item: newItem });
    }

    if (action === "update_work_item") {
      const { id, updates } = body;
      if (!id || !updates) {
        return NextResponse.json({ error: "id and updates are required" }, { status: 400 });
      }

      const docRef = adminDb.collection("work_items").doc(id);
      const existing = await docRef.get();
      if (!existing.exists) {
        return NextResponse.json({ error: `Work item '${id}' not found` }, { status: 404 });
      }

      await docRef.update(
        cleanUndefined({
          ...updates,
          updatedAt: now,
        })
      );

      const updated = await docRef.get();
      return NextResponse.json({ success: true, item: updated.data() });
    }

    if (action === "log_work_session") {
      const {
        projectId,
        workItemId,
        sessionType,
        workSummary,
        outcome,
        status,
        scheduleEntryId,
        date,
        notes,
      } = body;

      if (!projectId || !workSummary) {
        return NextResponse.json(
          { error: "projectId and workSummary are required" },
          { status: 400 }
        );
      }

      let sessionDate = date;
      if (scheduleEntryId && !sessionDate) {
        const schDoc = await adminDb.collection("schedule_entries").doc(scheduleEntryId).get();
        if (schDoc.exists) {
          sessionDate = schDoc.data()?.date;
        }
      }
      if (!sessionDate) {
        sessionDate = now.split("T")[0];
      }

      const col = adminDb.collection("work_sessions");
      const docRef = col.doc();

      const newSession: WorkSession = {
        id: docRef.id,
        projectId,
        workItemId: workItemId || undefined,
        sessionType: sessionType || "building",
        workSummary: workSummary.trim(),
        outcome: outcome?.trim() || "",
        status: status || undefined,
        scheduleEntryId: scheduleEntryId || undefined,
        date: sessionDate,
        notes: notes?.trim() || "",
        createdAt: now,
        updatedAt: now,
      };

      await docRef.set(cleanUndefined(newSession));

      // If workItemId is given and status is provided, update the work item
      if (workItemId && status) {
        const itemRef = adminDb.collection("work_items").doc(workItemId);
        const itemDoc = await itemRef.get();
        if (itemDoc.exists) {
          await itemRef.update({
            status,
            updatedAt: now,
          });
        }
      }

      return NextResponse.json({ success: true, session: newSession });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/worklog error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
