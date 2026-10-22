'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Clock,
  Activity,
  CheckCircle2,
  Search,
  ChevronRight,
  FolderPlus,
} from 'lucide-react';
import {
  ProjectWorkLogSummary,
  WorkItem,
  WorkSession,
  DashboardStats,
  STATUS_CONFIG,
  SESSION_TYPE_CONFIG,
} from '@/lib/worklog';
import { ScheduleEntry } from '@/lib/types';
import ProjectAllocationChart from '@/components/work/ProjectAllocationChart';
import AiActivityBarChart from '@/components/work/AiActivityBarChart';
import NewProjectModal from '@/components/work/NewProjectModal';
import LogWorkSessionModal from '@/components/work/LogWorkSessionModal';
import ProjectDetailModal from '@/components/work/ProjectDetailModal';

export default function WorkManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data from /api/worklog
  const [projects, setProjects] = useState<ProjectWorkLogSummary[]>([]);
  const [rawProjects, setRawProjects] = useState<WorkItem[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Filters & State
  const [trendDays, setTrendDays] = useState<number>(14);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isLogSessionOpen, setIsLogSessionOpen] = useState(false);
  const [logSessionDefaultProjectId, setLogSessionDefaultProjectId] = useState<string | undefined>();
  const [selectedProjectSummary, setSelectedProjectSummary] = useState<ProjectWorkLogSummary | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/worklog?days=${trendDays}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch work log data');
      }

      setProjects(data.projects || []);
      setRawProjects(data.rawProjects || []);
      setWorkItems(data.workItems || []);
      setWorkSessions(data.workSessions || []);
      setScheduleEntries(data.scheduleEntries || []);
      setStats(data.stats || null);

      if (selectedProjectSummary) {
        const updated = (data.projects || []).find(
          (p: ProjectWorkLogSummary) => p.project.id === selectedProjectSummary.project.id
        );
        if (updated) setSelectedProjectSummary(updated);
      }
    } catch (err: unknown) {
      console.error('Work log fetch error:', err);
      setError(err instanceof Error ? err.message : 'Error fetching work log');
    } finally {
      setLoading(false);
    }
  }, [trendDays, selectedProjectSummary]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.project.status === statusFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        p.project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.project.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.project.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  }, [projects, statusFilter, searchQuery]);

  return (
    <div className="max-w-[1240px] mx-auto px-5 pt-7 pb-15 text-[var(--ink)]">
      {/* Header & Navigation */}
      <header className="flex justify-between items-end gap-4 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap text-[13px] text-[var(--mute)]">
            <Link
              href="/"
              className="hover:text-white transition-colors underline underline-offset-4"
            >
              &larr; Back to Schedule Dashboard
            </Link>
            <span>•</span>
            <Link
              href="/routine"
              className="hover:text-white transition-colors underline underline-offset-4"
            >
              View General Routine &rarr;
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[clamp(30px,5vw,50px)] font-[800] leading-none font-heading tracking-tight text-white">
              Work Management
            </h1>
            {!error && !loading && (
              <span className="flex items-center gap-1.5 bg-[var(--glass)] border border-[var(--g)]/30 text-[var(--g)] px-2.5 py-1 rounded-full text-xs font-semibold shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                <Activity size={14} className="animate-pulse" /> Live MCP
              </span>
            )}
          </div>
          <p className="text-[var(--mute)] text-[14px]">
            AI Building, project deliverables, and cumulative hours aggregated from verified schedule records.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setLogSessionDefaultProjectId(undefined);
              setIsLogSessionOpen(true);
            }}
            className="btn ghost text-[13px] py-2 px-4 flex items-center gap-1.5 font-semibold"
          >
            <Clock size={16} /> Log Session
          </button>

          <button
            onClick={() => setIsNewProjectOpen(true)}
            className="btn text-[13px] py-2 px-5 flex items-center gap-1.5 font-semibold"
          >
            <Plus size={16} /> New Project
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200">
          <h3 className="font-semibold text-red-400 mb-1">Error Loading Data</h3>
          <p className="text-[13px]">{error}</p>
        </div>
      )}

      {loading && !stats ? (
        <div className="loading h-48 rounded-2xl glass w-full mb-6"></div>
      ) : (
        <>
          {/* Top KPI Cards Grid */}
          <section
            className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"
            aria-label="AI Work Summary Metrics"
          >
            {/* Total AI Hours */}
            <div className="glass stat p-4 rounded-2xl relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#4ade80]" />
              <div className="text-[var(--mute)] text-[13px]">Total AI Work</div>
              <div className="text-[28px] font-bold my-0.5 font-heading text-[#4ade80]">
                {stats?.totalAiHours || 0}h
              </div>
              <div className="text-[11px] text-[var(--mute)]/80">
                {stats?.uniqueScheduleSessionsCount || 0} unique schedule blocks
              </div>
            </div>

            {/* Active Projects */}
            <div className="glass stat p-4 rounded-2xl relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#38bdf8]" />
              <div className="text-[var(--mute)] text-[13px]">Projects</div>
              <div className="text-[28px] font-bold my-0.5 font-heading text-white">
                {stats?.activeProjects || 0}
                <span className="text-[16px] text-[var(--mute)] font-normal ml-1">
                  / {stats?.totalProjects || 0}
                </span>
              </div>
              <div className="text-[11px] text-[var(--mute)]/80">
                {stats?.completedProjects || 0} completed
              </div>
            </div>

            {/* Total Work Sessions */}
            <div className="glass stat p-4 rounded-2xl relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#bef264]" />
              <div className="text-[var(--mute)] text-[13px]">Sessions Logged</div>
              <div className="text-[28px] font-bold my-0.5 font-heading text-white">
                {stats?.totalWorkSessions || 0}
              </div>
              <div className="text-[11px] text-[var(--mute)]/80">
                Structured work logs
              </div>
            </div>

            {/* Deliverables / Items Done */}
            <div className="glass stat p-4 rounded-2xl relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c084fc]" />
              <div className="text-[var(--mute)] text-[13px]">Deliverables Done</div>
              <div className="text-[28px] font-bold my-0.5 font-heading text-white">
                {stats?.completedDeliverables || 0}
                <span className="text-[16px] text-[var(--mute)] font-normal ml-1">
                  / {stats?.totalDeliverables || 0}
                </span>
              </div>
              <div className="text-[11px] text-[var(--mute)]/80">
                Features, tasks &amp; experiments
              </div>
            </div>

            {/* Focus Breakdown */}
            <div className="glass stat p-4 rounded-2xl relative overflow-hidden group col-span-2 md:col-span-1">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#fcd34d]" />
              <div className="text-[var(--mute)] text-[13px]">Focus Split</div>
              <div className="text-[28px] font-bold my-0.5 font-heading text-white">
                {stats?.hoursBySessionType?.building || 0}h
              </div>
              <div className="text-[11px] text-[var(--mute)]/80">
                Build: {stats?.hoursBySessionType?.building || 0}h • Learn: {stats?.hoursBySessionType?.learning || 0}h
              </div>
            </div>
          </section>

          {/* Charts Row */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
            {/* AI Daily Activity Trend Bar Chart */}
            <div className="glass md:col-span-7 flex flex-col justify-between">
              <div className="card-h">
                <div>
                  <h2 className="text-[20px] font-semibold font-heading tracking-tight text-white">
                    Daily AI Building Activity
                  </h2>
                  <p className="text-[12px] text-[var(--mute)]">
                    Hours spent building, learning, and experimenting
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-[var(--line)]">
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => setTrendDays(days)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        trendDays === days
                          ? 'bg-[#4ade80]/20 text-[#4ade80]'
                          : 'text-[var(--mute)] hover:text-white'
                      }`}
                    >
                      {days}D
                    </button>
                  ))}
                </div>
              </div>

              {stats?.dailyTrends ? (
                <AiActivityBarChart trends={stats.dailyTrends} />
              ) : (
                <div className="h-40 flex items-center justify-center text-[var(--mute)]">
                  No activity data available
                </div>
              )}
            </div>

            {/* Project Time Allocation */}
            <div className="glass md:col-span-5 flex flex-col justify-between">
              <div className="card-h">
                <div>
                  <h2 className="text-[20px] font-semibold font-heading tracking-tight text-white">
                    Project Time Allocation
                  </h2>
                  <p className="text-[12px] text-[var(--mute)]">
                    Share of cumulative hours across initiatives
                  </p>
                </div>
                <span className="text-[12px] text-[var(--mute)] font-medium">
                  {stats?.projectAllocations.length || 0} Projects
                </span>
              </div>

              {stats?.projectAllocations ? (
                <ProjectAllocationChart
                  allocations={stats.projectAllocations}
                  onSelectProject={(id) => {
                    const p = projects.find((proj) => proj.project.id === id);
                    if (p) setSelectedProjectSummary(p);
                  }}
                />
              ) : null}
            </div>
          </section>

          {/* Projects Section */}
          <section className="mb-8">
            <div className="flex justify-between items-center gap-4 flex-wrap mb-4">
              <div>
                <h2 className="text-[24px] font-[800] leading-none font-heading tracking-tight text-white">
                  Projects &amp; Initiatives
                </h2>
                <p className="text-[13px] text-[var(--mute)] mt-1">
                  Click on any project card to inspect tasks, deliverables, and session history.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mute)]"
                  />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-full bg-white/5 border border-[var(--line)] text-[13px] text-white focus:outline-none focus:border-[#4ade80]/60 placeholder:text-white/20 w-44 sm:w-56"
                  />
                </div>

                <div className="flex gap-1 bg-white/5 p-1 rounded-full border border-[var(--line)]">
                  {['all', 'in_progress', 'completed', 'planned'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                        statusFilter === s
                          ? 'bg-[#4ade80]/20 text-[#4ade80]'
                          : 'text-[var(--mute)] hover:text-white'
                      }`}
                    >
                      {s === 'all'
                        ? 'All'
                        : s === 'in_progress'
                        ? 'Active'
                        : s === 'completed'
                        ? 'Done'
                        : 'Planned'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Project Cards Grid */}
            {filteredProjects.length === 0 ? (
              <div className="glass p-12 text-center rounded-3xl">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-[var(--line)] flex items-center justify-center mx-auto mb-3 text-[var(--mute)]">
                  <FolderPlus size={24} />
                </div>
                <h3 className="text-[18px] font-bold font-heading text-white mb-1">
                  {projects.length === 0 ? 'No projects created yet' : 'No matching projects found'}
                </h3>
                <p className="text-[13px] text-[var(--mute)] max-w-md mx-auto mb-5">
                  {projects.length === 0
                    ? 'Start tracking your AI work by creating your first project, or ask ChatGPT to create one via the manage_work_item tool.'
                    : 'Try clearing your search query or switching your status filter.'}
                </p>
                {projects.length === 0 && (
                  <button
                    onClick={() => setIsNewProjectOpen(true)}
                    className="btn py-2 px-5 text-[13px] font-semibold inline-flex items-center gap-1.5"
                  >
                    <Plus size={16} /> Create Your First Project
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((summary) => {
                  const { project, totalHours, workItemsSummary, recentSessions, hoursBySessionType } =
                    summary;
                  const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planned;
                  const progressPct =
                    workItemsSummary.total > 0
                      ? Math.round((workItemsSummary.completed / workItemsSummary.total) * 100)
                      : 0;
                  const latestSession = recentSessions[0];

                  return (
                    <div
                      key={project.id}
                      onClick={() => setSelectedProjectSummary(summary)}
                      className="glass p-5 rounded-3xl cursor-pointer hover:border-[#4ade80]/40 transition-all hover:-translate-y-0.5 group flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Meta */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-[18px] font-bold font-heading tracking-tight text-white group-hover:text-[#4ade80] transition-colors leading-snug">
                            {project.title}
                          </h3>
                          <span
                            className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0"
                            style={{
                              color: statusCfg.color,
                              backgroundColor: statusCfg.bg,
                              border: `1px solid ${statusCfg.color}30`,
                            }}
                          >
                            {statusCfg.label}
                          </span>
                        </div>

                        {project.description && (
                          <p className="text-[13px] text-[var(--mute)] line-clamp-2 mb-4 leading-relaxed">
                            {project.description}
                          </p>
                        )}

                        {/* Cumulative Hours & Progress Bar */}
                        <div className="bg-white/[0.02] border border-[var(--line)] p-3 rounded-2xl mb-4">
                          <div className="flex justify-between items-baseline mb-2">
                            <span className="text-[12px] text-[var(--mute)]">Cumulative Time</span>
                            <span className="text-[20px] font-bold font-heading text-[#4ade80]">
                              {totalHours}h
                            </span>
                          </div>

                          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-2">
                            <div
                              className="bg-[#4ade80] h-full rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[11px] text-[var(--mute)]">
                            <span>
                              {workItemsSummary.completed}/{workItemsSummary.total} deliverables done
                            </span>
                            <span>{progressPct}%</span>
                          </div>
                        </div>

                        {/* Session Breakdown Pills */}
                        <div className="flex gap-1.5 flex-wrap mb-4 text-[11px]">
                          {hoursBySessionType.building > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 font-medium">
                              Build: {hoursBySessionType.building}h
                            </span>
                          )}
                          {hoursBySessionType.learning > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-[#bef264]/10 text-[#bef264] border border-[#bef264]/20 font-medium">
                              Learn: {hoursBySessionType.learning}h
                            </span>
                          )}
                          {hoursBySessionType.experimentation > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 font-medium">
                              Exp: {hoursBySessionType.experimentation}h
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer: Recent Activity */}
                      <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between text-[12px] text-[var(--mute)]">
                        {latestSession ? (
                          <div className="truncate pr-2">
                            <span className="text-white/80 font-medium">{latestSession.date}: </span>
                            <span className="truncate">{latestSession.workSummary}</span>
                          </div>
                        ) : (
                          <span className="italic text-[11px]">No sessions logged yet</span>
                        )}

                        <ChevronRight
                          size={16}
                          className="shrink-0 group-hover:translate-x-1 transition-transform text-[var(--mute)] group-hover:text-white"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent Work Sessions Feed */}
          <section className="glass rounded-3xl p-6">
            <div className="card-h mb-4">
              <div>
                <h2 className="text-[20px] font-semibold font-heading tracking-tight text-white">
                  Recent Work Sessions Feed
                </h2>
                <p className="text-[12px] text-[var(--mute)]">
                  Chronological log of what was built and accomplished
                </p>
              </div>

              <span className="text-[12px] text-[var(--mute)] font-medium">
                {workSessions.length} total sessions
              </span>
            </div>

            {workSessions.length === 0 ? (
              <div className="py-12 text-center text-[var(--mute)] text-[13px]">
                No sessions logged yet. Record your first work session using the &quot;+ Log Session&quot; button.
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto no-scrollbar">
                {workSessions.slice(0, 15).map((session) => {
                  const projectObj = rawProjects.find((p) => p.id === session.projectId);
                  const sessionTypeCfg =
                    SESSION_TYPE_CONFIG[session.sessionType] || SESSION_TYPE_CONFIG.building;

                  return (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-2xl bg-white/[0.02] border border-[var(--line)] hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap text-[12px] mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-semibold px-2 py-0.5 rounded-full text-[11px]"
                            style={{
                              color: sessionTypeCfg.color,
                              backgroundColor: `${sessionTypeCfg.color}15`,
                              border: `1px solid ${sessionTypeCfg.color}35`,
                            }}
                          >
                            {sessionTypeCfg.name}
                          </span>

                          <span className="font-bold text-white">
                            {projectObj?.title || session.projectId}
                          </span>
                        </div>

                        <span className="text-[var(--mute)]">{session.date}</span>
                      </div>

                      <p className="text-[14px] text-white/90 font-medium my-1">
                        {session.workSummary}
                      </p>

                      {session.outcome && (
                        <div className="text-[12px] text-[#4ade80] mt-1.5 flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="shrink-0" />
                          <span>Deliverable: {session.outcome}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* Modals */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onSuccess={fetchData}
      />

      <LogWorkSessionModal
        isOpen={isLogSessionOpen}
        projects={rawProjects}
        workItems={workItems}
        scheduleEntries={scheduleEntries}
        defaultProjectId={logSessionDefaultProjectId}
        onClose={() => setIsLogSessionOpen(false)}
        onSuccess={fetchData}
      />

      <ProjectDetailModal
        isOpen={Boolean(selectedProjectSummary)}
        projectSummary={selectedProjectSummary}
        onClose={() => setSelectedProjectSummary(null)}
        onRefresh={fetchData}
        onOpenLogSession={(pId) => {
          setLogSessionDefaultProjectId(pId);
          setIsLogSessionOpen(true);
        }}
      />
    </div>
  );
}
