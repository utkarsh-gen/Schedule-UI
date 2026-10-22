'use client';
import { useState } from 'react';
import { STATUS_CONFIG, WorkItemStatus } from '@/lib/worklog';

interface ProjectAllocation {
  projectId: string;
  projectTitle: string;
  hours: number;
  percentage: number;
  status: WorkItemStatus;
}

const PALETTE = [
  '#4ade80', // emerald
  '#38bdf8', // sky
  '#bef264', // lime
  '#fcd34d', // amber
  '#c084fc', // purple
  '#f43f5e', // rose
  '#2dd4bf', // teal
];

export default function ProjectAllocationChart({
  allocations,
  onSelectProject,
}: {
  allocations: ProjectAllocation[];
  onSelectProject?: (projectId: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!allocations.length || allocations.every((a) => a.hours === 0)) {
    return (
      <div className="py-10 text-center text-[var(--mute)]">
        <p className="font-heading font-semibold text-[17px] text-[var(--ink)] mb-1">
          No project time logged yet
        </p>
        <p className="text-[13px]">
          Link your work sessions to schedule records to visualize where your time is going.
        </p>
      </div>
    );
  }

  const activeAllocations = allocations.filter((a) => a.hours > 0);

  return (
    <div className="space-y-4">
      {/* Visual Stacked Bar */}
      <div className="h-4 w-full rounded-full bg-white/5 p-0.5 overflow-hidden flex border border-[var(--line)] shadow-inner">
        {activeAllocations.map((a, i) => {
          const color = PALETTE[i % PALETTE.length];
          const isHovered = hoveredId === a.projectId;
          return (
            <div
              key={a.projectId}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300 relative group cursor-pointer"
              style={{
                width: `${a.percentage}%`,
                backgroundColor: color,
                opacity: hoveredId && !isHovered ? 0.4 : 1,
                transform: isHovered ? 'scaleY(1.15)' : 'none',
              }}
              onMouseEnter={() => setHoveredId(a.projectId)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectProject && onSelectProject(a.projectId)}
              title={`${a.projectTitle}: ${a.hours}h (${a.percentage}%)`}
            />
          );
        })}
      </div>

      {/* List Breakdown */}
      <div className="space-y-2.5 max-h-[260px] overflow-y-auto no-scrollbar pt-1">
        {allocations.map((a, i) => {
          const color = PALETTE[i % PALETTE.length];
          const isHovered = hoveredId === a.projectId;
          const status = STATUS_CONFIG[a.status] || STATUS_CONFIG.planned;

          return (
            <div
              key={a.projectId}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                isHovered
                  ? 'bg-white/8 border-white/20'
                  : 'bg-white/[0.02] border-[var(--line)] hover:bg-white/5'
              }`}
              onMouseEnter={() => setHoveredId(a.projectId)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectProject && onSelectProject(a.projectId)}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px]"
                  style={{ backgroundColor: color, color: color }}
                />
                <span className="font-semibold text-[14px] text-[var(--ink)] truncate">
                  {a.projectTitle}
                </span>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    color: status.color,
                    backgroundColor: status.bg,
                    border: `1px solid ${status.color}30`,
                  }}
                >
                  {status.label}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-right">
                <span className="font-heading font-semibold text-[15px] text-[var(--ink)]">
                  {a.hours}h
                </span>
                <span className="text-[12px] text-[var(--mute)] w-11 text-right">
                  {a.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
