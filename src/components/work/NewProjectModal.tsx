'use client';
import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { WorkItemStatus } from '@/lib/worklog';

export default function NewProjectModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<WorkItemStatus>('in_progress');
  const [customId, setCustomId] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Project title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tags = tagsStr
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const res = await fetch('/api/worklog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_project',
          title: title.trim(),
          description: description.trim(),
          status,
          customId: customId.trim() || undefined,
          tags,
          category: 'ai_work',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div
        className="w-full max-w-[500px] rounded-3xl p-6 bg-[#08140e] border border-[var(--line)] shadow-2xl relative text-[var(--ink)] animate-in fade-in zoom-in-95 duration-200"
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
            <Sparkles size={18} />
          </div>
          <h2 className="text-[22px] font-bold font-heading tracking-tight">Create New Project</h2>
        </div>
        <p className="text-[13px] text-[var(--mute)] mb-6">
          Track time, tasks, and deliverables for this initiative via the Work Log MCP.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-[13px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--mute)] mb-1.5">
              Project Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Schedule MCP Work Log"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-[var(--line)] text-[var(--ink)] text-[14px] focus:outline-none focus:border-[#4ade80]/60 transition-colors placeholder:text-white/20"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[var(--mute)] mb-1.5">
              Description or Subtitle
            </label>
            <textarea
              placeholder="What is this project building or exploring?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-[var(--line)] text-[var(--ink)] text-[14px] focus:outline-none focus:border-[#4ade80]/60 transition-colors placeholder:text-white/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[var(--mute)] mb-1.5">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkItemStatus)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a1b13] border border-[var(--line)] text-[var(--ink)] text-[14px] focus:outline-none focus:border-[#4ade80]/60"
              >
                <option value="in_progress">In Progress</option>
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[var(--mute)] mb-1.5">
                Custom Slug (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. schedule-mcp"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-[var(--line)] text-[var(--ink)] text-[14px] focus:outline-none focus:border-[#4ade80]/60 transition-colors placeholder:text-white/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[var(--mute)] mb-1.5">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. mcp, backend, llm"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-[var(--line)] text-[var(--ink)] text-[14px] focus:outline-none focus:border-[#4ade80]/60 transition-colors placeholder:text-white/20"
            />
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
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
