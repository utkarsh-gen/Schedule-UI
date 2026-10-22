'use client';
import { useState } from 'react';
import {
  X,
  CheckCircle2,
  Plus,
  Hammer,
  BookOpen,
  FlaskConical,
} from 'lucide-react';
import {
  ProjectWorkLogSummary,
  WorkItem,
  WorkItemType,
  WorkItemStatus,
  STATUS_CONFIG,
  SESSION_TYPE_CONFIG,
} from '@/lib/worklog';

export default function ProjectDetailModal({
  isOpen,
  projectSummary,
  onClose,
  onRefresh,
  onOpenLogSession,
}: {
  isOpen: boolean;
  projectSummary: ProjectWorkLogSummary | null;
  onClose: () => void;
  onRefresh: () => void;
  onOpenLogSession: (projectId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'deliverables' | 'history'>('deliverables');
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'feature' | 'task' | 'experiment'>('all');
  
  // New item form state
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemType, setNewItemType] = useState<WorkItemType>('feature');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [submittingItem, setSubmittingItem] = useState(false);

  // Updating project status
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!isOpen || !projectSummary) return null;

  const { project, totalHours, uniqueScheduleSessions, totalWorkSessions, hoursBySessionType, workItems, recentSessions, workItemsSummary } =
    projectSummary;

  const handleToggleItemStatus = async (item: WorkItem) => {
    const nextStatus: WorkItemStatus = item.status === 'completed' ? 'in_progress' : 'completed';
    try {
      await fetch('/api/worklog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_work_item',
          id: item.id,
          updates: { status: nextStatus },
        }),
      });
      onRefresh();
    } catch (e) {
      console.error('Failed to toggle status:', e);
    }
  };

  const handleUpdateProjectStatus = async (status: WorkItemStatus) => {
    setUpdatingStatus(true);
    try {
      await fetch('/api/worklog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_work_item',
          id: project.id,
          updates: { status },
        }),
      });
      onRefresh();
    } catch (e) {
      console.error('Failed to update project status:', e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    setSubmittingItem(true);
    try {
      await fetch('/api/worklog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_work_item',
          projectId: project.id,
          type: newItemType,
          title: newItemTitle.trim(),
          description: newItemDesc.trim(),
          status: 'planned',
        }),
      });

      setNewItemTitle('');
      setNewItemDesc('');
      setIsAddingItem(false);
      onRefresh();
    } catch (e) {
      console.error('Failed to add work item:', e);
    } finally {
      setSubmittingItem(false);
    }
  };

  const filteredItems = workItems.filter(
    (i) => itemTypeFilter === 'all' || i.type === itemTypeFilter
  );

  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.planned;
  const progressPercent =
    workItemsSummary.total > 0
      ? Math.round((workItemsSummary.completed / workItemsSummary.total) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div
        className="w-full max-w-[800px] rounded-3xl p-6 sm:p-8 bg-[#08140e] border border-[var(--line)] shadow-2xl relative text-[var(--ink)] my-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[var(--mute)] hover:text-white p-1 rounded-full transition-colors"
        >
          <X size={22} />
        </button>

        {/* Header */}
        <div className="pr-12 mb-6">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h2 className="text-[28px] font-bold font-heading tracking-tight text-white">
              {project.title}
            </h2>
            <div className="relative inline-block">
              <select
                value={project.status}
                disabled={updatingStatus}
                onChange={(e) => handleUpdateProjectStatus(e.target.value as WorkItemStatus)}
                className="text-[12px] font-semibold px-3 py-1 rounded-full border cursor-pointer focus:outline-none appearance-none pr-6"
                style={{
                  color: statusConfig.color,
                  backgroundColor: statusConfig.bg,
                  borderColor: `${statusConfig.color}40`,
                }}
              >
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="planned">Planned</option>
                <option value="blocked">Blocked</option>
                <option value="archived">Archived</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1.5 text-[10px]" style={{ color: statusConfig.color }}>
                ▼
              </span>
            </div>
          </div>

          {project.description && (
            <p className="text-[14px] text-[var(--mute)] max-w-2xl">
              {project.description}
            </p>
          )}

          {project.tags && project.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-3">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[var(--mute)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="glass p-3.5 rounded-2xl">
            <div className="text-[12px] text-[var(--mute)] mb-1">Cumulative Time</div>
            <div className="text-[24px] font-bold font-heading text-[#4ade80]">
              {totalHours}h
            </div>
            <div className="text-[11px] text-[var(--mute)]/70">
              {uniqueScheduleSessions} schedule block{uniqueScheduleSessions === 1 ? '' : 's'}
            </div>
          </div>

          <div className="glass p-3.5 rounded-2xl">
            <div className="text-[12px] text-[var(--mute)] mb-1">Building Hours</div>
            <div className="text-[24px] font-bold font-heading text-white">
              {hoursBySessionType.building}h
            </div>
            <div className="text-[11px] text-[#4ade80]">Core implementation</div>
          </div>

          <div className="glass p-3.5 rounded-2xl">
            <div className="text-[12px] text-[var(--mute)] mb-1">Learning &amp; Exp.</div>
            <div className="text-[24px] font-bold font-heading text-white">
              {(hoursBySessionType.learning + hoursBySessionType.experimentation).toFixed(1)}h
            </div>
            <div className="text-[11px] text-[#38bdf8]">
              {hoursBySessionType.learning}h learn • {hoursBySessionType.experimentation}h exp
            </div>
          </div>

          <div className="glass p-3.5 rounded-2xl">
            <div className="text-[12px] text-[var(--mute)] mb-1">Deliverables Done</div>
            <div className="text-[24px] font-bold font-heading text-white">
              {workItemsSummary.completed}
              <span className="text-[15px] font-normal text-[var(--mute)]">
                /{workItemsSummary.total}
              </span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#4ade80] h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('deliverables')}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                activeTab === 'deliverables'
                  ? 'bg-white/10 text-white'
                  : 'text-[var(--mute)] hover:text-white'
              }`}
            >
              Tasks &amp; Deliverables ({workItems.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                activeTab === 'history'
                  ? 'bg-white/10 text-white'
                  : 'text-[var(--mute)] hover:text-white'
              }`}
            >
              Work Sessions ({totalWorkSessions})
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenLogSession(project.id);
            }}
            className="btn text-[12px] py-1.5 px-3.5 flex items-center gap-1 font-semibold"
          >
            <Plus size={14} /> Log Work Session
          </button>
        </div>

        {/* Tab 1: Tasks, Features & Experiments */}
        {activeTab === 'deliverables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-1.5">
                {(['all', 'feature', 'task', 'experiment'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setItemTypeFilter(type)}
                    className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                      itemTypeFilter === type
                        ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40'
                        : 'text-[var(--mute)] hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {type === 'all'
                      ? 'All'
                      : type === 'feature'
                      ? `Features (${workItemsSummary.byType.features.total})`
                      : type === 'task'
                      ? `Tasks (${workItemsSummary.byType.tasks.total})`
                      : `Experiments (${workItemsSummary.byType.experiments.total})`}
                  </button>
                ))}
              </div>

              {!isAddingItem && (
                <button
                  onClick={() => setIsAddingItem(true)}
                  className="text-[12px] text-[#4ade80] hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus size={14} /> Add Work Item
                </button>
              )}
            </div>

            {/* Inline Add Item Form */}
            {isAddingItem && (
              <form
                onSubmit={handleCreateItem}
                className="p-4 rounded-2xl bg-white/[0.03] border border-[#4ade80]/30 space-y-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-white">
                    New Deliverable / Item
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingItem(false)}
                    className="text-[var(--mute)] hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as WorkItemType)}
                    className="px-3 py-2 rounded-xl bg-[#0a1b13] border border-[var(--line)] text-[13px] text-white"
                  >
                    <option value="feature">Feature</option>
                    <option value="task">Task</option>
                    <option value="experiment">Experiment</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Title *"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    className="col-span-2 px-3 py-2 rounded-xl bg-white/5 border border-[var(--line)] text-[13px] text-white focus:outline-none focus:border-[#4ade80]/60"
                    required
                  />
                </div>

                <input
                  type="text"
                  placeholder="Optional description"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-[var(--line)] text-[13px] text-white focus:outline-none focus:border-[#4ade80]/60"
                />

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingItem(false)}
                    className="px-3 py-1.5 rounded-lg text-[12px] text-[var(--mute)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingItem}
                    className="btn py-1.5 px-4 text-[12px] font-semibold"
                  >
                    {submittingItem ? 'Adding...' : 'Save Item'}
                  </button>
                </div>
              </form>
            )}

            {/* Items List */}
            <div className="space-y-2 max-h-[320px] overflow-y-auto no-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="py-8 text-center text-[var(--mute)] text-[13px]">
                  No items found. Click &quot;+ Add Work Item&quot; to define features, tasks, or experiments.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const itemStatus = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
                  const isDone = item.status === 'completed';

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-[var(--line)] hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={() => handleToggleItemStatus(item)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                            isDone
                              ? 'bg-[#4ade80] border-[#4ade80] text-[#030806]'
                              : 'border-[var(--mute)]/40 hover:border-[#4ade80]'
                          }`}
                        >
                          {isDone && <CheckCircle2 size={14} className="stroke-[3]" />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold text-[14px] truncate ${
                                isDone ? 'line-through text-[var(--mute)]' : 'text-white'
                              }`}
                            >
                              {item.title}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/5 text-[var(--mute)] shrink-0">
                              {item.type}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-[12px] text-[var(--mute)] truncate mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className="text-[11px] px-2.5 py-0.5 rounded-full shrink-0 font-medium"
                        style={{
                          color: itemStatus.color,
                          backgroundColor: itemStatus.bg,
                          border: `1px solid ${itemStatus.color}30`,
                        }}
                      >
                        {itemStatus.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Work Sessions Timeline */}
        {activeTab === 'history' && (
          <div className="space-y-3 max-h-[360px] overflow-y-auto no-scrollbar">
            {recentSessions.length === 0 ? (
              <div className="py-10 text-center text-[var(--mute)] text-[13px]">
                No work sessions recorded yet. Click &quot;Log Work Session&quot; to add your first entry!
              </div>
            ) : (
              recentSessions.map((session) => {
                const sessionTypeCfg =
                  SESSION_TYPE_CONFIG[session.sessionType] || SESSION_TYPE_CONFIG.building;

                return (
                  <div
                    key={session.id}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-[var(--line)] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap text-[12px]">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-semibold px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1"
                          style={{
                            color: sessionTypeCfg.color,
                            backgroundColor: `${sessionTypeCfg.color}18`,
                            border: `1px solid ${sessionTypeCfg.color}40`,
                          }}
                        >
                          {session.sessionType === 'building' && <Hammer size={12} />}
                          {session.sessionType === 'learning' && <BookOpen size={12} />}
                          {session.sessionType === 'experimentation' && <FlaskConical size={12} />}
                          {sessionTypeCfg.name}
                        </span>

                        {session.workItemTitle && (
                          <span className="text-[var(--mute)]">
                            on <b className="text-white">{session.workItemTitle}</b>
                          </span>
                        )}
                      </div>

                      <div className="text-[var(--mute)] flex items-center gap-2">
                        <span>{session.date}</span>
                        {session.scheduleDetails && (
                          <span className="text-[#4ade80] font-medium bg-[#4ade80]/10 px-2 py-0.5 rounded-full border border-[#4ade80]/20">
                            {session.scheduleDetails.startTime}–{session.scheduleDetails.endTime} ({session.scheduleDetails.durationMinutes}m)
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[14px] text-white font-medium">{session.workSummary}</p>

                    {session.outcome && (
                      <div className="text-[13px] text-[#4ade80]/90 bg-[#4ade80]/5 px-2.5 py-1 rounded-lg border border-[#4ade80]/20 inline-block">
                        Deliverable: {session.outcome}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
