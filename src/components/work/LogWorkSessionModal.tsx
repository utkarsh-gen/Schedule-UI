'use client';
import { useState } from 'react';
import { X, Clock, Hammer, BookOpen, FlaskConical } from 'lucide-react';
import { WorkItem, SessionType, WorkItemStatus } from '@/lib/worklog';
import { ScheduleEntry } from '@/lib/types';

export default function LogWorkSessionModal({
  isOpen,
  projects,
  workItems,
  scheduleEntries,
  defaultProjectId,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  projects: WorkItem[];
  workItems: WorkItem[];
  scheduleEntries: ScheduleEntry[];
  defaultProjectId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const projectId = defaultProjectId || selectedProjectId || (projects[0]?.id || '');

  const [workItemId, setWorkItemId] = useState('');
  const [sessionType, setSessionType] = useState<SessionType>('building');
  const [scheduleEntryId, setScheduleEntryId] = useState('');
  const [workSummary, setWorkSummary] = useState('');
  const [outcome, setOutcome] = useState('');
  const [status, setStatus] = useState<WorkItemStatus>('completed');
  const [notes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter child items for selected project
  const availableItems = workItems.filter((i) => i.projectId === projectId);

  // Filter and sort schedule entries: prefer recent ai_work entries first
  const sortedScheduleEntries = [...scheduleEntries].sort((a, b) => {
    return b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      setError('Please select a project');
      return;
    }
    if (!workSummary.trim()) {
      setError('Please describe what was done');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/worklog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_work_session',
          projectId,
          workItemId: workItemId || undefined,
          sessionType,
          scheduleEntryId: scheduleEntryId || undefined,
          workSummary: workSummary.trim(),
          outcome: outcome.trim() || undefined,
          status,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to log work session');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <div
        className="w-full max-w-[540px] rounded-3xl p-6 bg-[#08140e] border border-[var(--line)] shadow-2xl relative text-[var(--ink)] my-8 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[var(--mute)] hover:text-white p-1 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-[#4ade80]/15 border border-[#4ade80]/30 flex items-center justify-center text-[#4ade80]">
            <Clock size={18} />
          </div>
          <h2 className="text-[22px] font-bold font-heading tracking-tight">Log AI Work Session</h2>
        </div>
        <p className="text-[13px] text-[var(--mute)] mb-5">
          Record what you built and link it to your time logs to aggregate cumulative hours.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-[13px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project & Optional Task */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[var(--mute)] mb-1.5">
                Target Project *
              </label>
              <select
                value={projectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setWorkItemId('');
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1b13] border border-[var(--line)] text-[var(--ink)] text-[14px] focus:outline-none focus:border-[#4ade80]/60"
                required
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[var(--mute)] mb-1.5">
                Task / Feature (Optional)
              </label>
              <select
                value={workItemId}
                onChange={(e) => setWorkItemId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1b13] border border-[var(--line)] text-[var(--ink)] text-[14px] focus:outline-none focus:border-[#4ade80]/60"
              >
                <option value="">General Project Work</option>
                {availableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    [{item.type.toUpperCase()}] {item.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Session Type Switcher */}
          <div>
            <label className="block text-[13px] font-medium text-[var(--mute)] mb-1.5">
              Work Nature (Session Type)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSessionType('building')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-[13px] font-semibold transition-all ${
                  sessionType === 'building'
                    ? 'bg-[#4ade80]/20 border-[#4ade80] text-white shadow-[0_0_12px_rgba(74,222,128,0.25)]'
                    : 'bg-white/[0.02] border-[var(--line)] text-[var(--mute)] hover:bg-white/5'
                }`}
              >
                <Hammer size={14} className={sessionType === 'building' ? 'text-[#4ade80]' : ''} />
                Building
              </button>

              <button
                type="button"
                onClick={() => setSessionType('learning')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-[13px] font-semibold transition-all ${
                  sessionType === 'learning'
                    ? 'bg-[#bef264]/20 border-[#bef264] text-white shadow-[0_0_12px_rgba(190,242,100,0.25)]'
                    : 'bg-white/[0.02] border-[var(--line)] text-[var(--mute)] hover:bg-white/5'
                }`}
              >
                <BookOpen size={14} className={sessionType === 'learning' ? 'text-[#bef264]' : ''} />
                Learning
              </button>

              <button
                type="button"
                onClick={() => setSessionType('experimentation')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-[13px] font-semibold transition-all ${
                  sessionType === 'experimentation'
                    ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-white shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                    : 'bg-white/[0.02] border-[var(--line)] text-[var(--mute)] hover:bg-white/5'
                }`}
              >
                <FlaskConical size={14} className={sessionType === 'experimentation' ? 'text-[#38bdf8]' : ''} />
                Experiment
              </button>
            </div>
          </div>

          {/* Linked Schedule Record (Source of Truth) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[13px] font-medium text-[var(--mute)]">
                Link to Schedule Block (Source of Truth)
              </label>
              <span className="text-[11px] text-[#4ade80] font-medium">Prevents double-counting</span>
            </div>
            <select
              value={scheduleEntryId}
              onChange={(e) => setScheduleEntryId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#0a1b13] border border-[var(--line)] text-[var(--ink)] text-[13px] focus:outline-none focus:border-[#4ade80]/60"
            >
              <option value="">None (Log summary without schedule block)</option>
              {sortedScheduleEntries.slice(0, 30).map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.date} ({entry.startTime}–{entry.endTime}, {entry.durationMinutes}m) • {entry.title} [{entry.category}]
                </option>
              ))}
            </select>
          </div>

          {/* Work Summary */}
          <div>
            <label className="block text-[13px] font-medium text-[var(--mute)] mb-1.5">
              What was done during this session? *
            </label>
            <textarea
              placeholder="e.g. Implemented AI Work Log MCP tools and deduplication logic"
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-[var(--line)] text-[var(--ink)] text-[14px] focus:outline-none focus:border-[#4ade80]/60 transition-colors placeholder:text-white/20 resize-none"
              required
            />
          </div>

          {/* Outcome & Resulting Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[var(--mute)] mb-1.5">
                Outcome / Key Deliverables
              </label>
              <input
                type="text"
                placeholder="e.g. PR merged, 24 unit tests passing"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-[var(--line)] text-[var(--ink)] text-[14px] focus:outline-none focus:border-[#4ade80]/60 transition-colors placeholder:text-white/20"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[var(--mute)] mb-1.5">
                Resulting Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkItemStatus)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1b13] border border-[var(--line)] text-[var(--ink)] text-[14px] focus:outline-none focus:border-[#4ade80]/60"
              >
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-full text-[13px] font-semibold text-[var(--mute)] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn text-[14px] py-2.5 px-6 font-semibold"
            >
              {loading ? 'Logging...' : 'Save Work Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
