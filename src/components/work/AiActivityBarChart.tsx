'use client';
import { useState } from 'react';
import { SESSION_TYPE_CONFIG } from '@/lib/worklog';

interface DailyTrend {
  date: string;
  dayLabel: string;
  totalHours: number;
  buildingHours: number;
  learningHours: number;
  experimentationHours: number;
}

export default function AiActivityBarChart({
  trends,
}: {
  trends: DailyTrend[];
}) {
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    trend: DailyTrend | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    trend: null,
  });

  const maxHours = Math.max(...trends.map((t) => t.totalHours), 3);
  const chartHeightHours = Math.ceil(maxHours);

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const chartTop = 20;
  const chartBottom = 180;
  const plotHeight = chartBottom - chartTop;

  // Grid lines
  const gridLines = [];
  const step = Math.max(1, Math.ceil(chartHeightHours / 4));
  for (let g = 0; g <= chartHeightHours; g += step) {
    const y = chartBottom - (g / chartHeightHours) * plotHeight;
    gridLines.push(
      <g key={`grid-${g}`}>
        <line
          x1="36"
          x2={svgWidth - 10}
          y1={y}
          y2={y}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray={g === 0 ? "none" : "3 3"}
        />
        <text
          x="28"
          y={y + 4}
          textAnchor="end"
          fill="var(--mute)"
          fontSize="11"
          className="select-none font-sans"
        >
          {g}h
        </text>
      </g>
    );
  }

  const barCount = trends.length;
  const slotWidth = (svgWidth - 60) / Math.max(barCount, 1);
  const barWidth = Math.max(8, Math.min(slotWidth * 0.65, 34));

  const bars = trends.map((trend, i) => {
    const centerX = 50 + i * slotWidth + slotWidth / 2;
    const x = centerX - barWidth / 2;

    const bHeight = (trend.buildingHours / chartHeightHours) * plotHeight;
    const lHeight = (trend.learningHours / chartHeightHours) * plotHeight;
    const eHeight = (trend.experimentationHours / chartHeightHours) * plotHeight;

    let currentY = chartBottom;
    const bY = currentY - bHeight;
    currentY -= bHeight;
    const lY = currentY - lHeight;
    currentY -= lHeight;
    const eY = currentY - eHeight;

    const isToday =
      trend.date ===
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(new Date().getDate()).padStart(2, '0')}`;

    return (
      <g
        key={trend.date}
        className="group cursor-pointer"
        onMouseEnter={(e) =>
          setTooltip({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            trend,
          })
        }
        onMouseMove={(e) =>
          setTooltip({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            trend,
          })
        }
        onMouseLeave={() => setTooltip((p) => ({ ...p, visible: false }))}
      >
        {/* Invisible hit target for smooth hover */}
        <rect
          x={centerX - slotWidth / 2}
          y={chartTop}
          width={slotWidth}
          height={plotHeight + 35}
          fill="transparent"
        />

        {/* Hover highlight background column */}
        <rect
          x={centerX - slotWidth / 2 + 2}
          y={chartTop}
          width={slotWidth - 4}
          height={plotHeight}
          rx="6"
          fill="rgba(255, 255, 255, 0.03)"
          className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        />

        {/* Building Bar (Emerald) */}
        {bHeight > 0 && (
          <rect
            x={x}
            y={bY}
            width={barWidth}
            height={bHeight}
            rx={lHeight === 0 && eHeight === 0 ? 4 : 0}
            fill={SESSION_TYPE_CONFIG.building.color}
            className="transition-opacity group-hover:opacity-90"
          />
        )}

        {/* Learning Bar (Lime) */}
        {lHeight > 0 && (
          <rect
            x={x}
            y={lY}
            width={barWidth}
            height={lHeight}
            rx={eHeight === 0 ? 4 : 0}
            fill={SESSION_TYPE_CONFIG.learning.color}
            className="transition-opacity group-hover:opacity-90"
          />
        )}

        {/* Experimentation Bar (Sky) */}
        {eHeight > 0 && (
          <rect
            x={x}
            y={eY}
            width={barWidth}
            height={eHeight}
            rx={4}
            fill={SESSION_TYPE_CONFIG.experimentation.color}
            className="transition-opacity group-hover:opacity-90"
          />
        )}

        {/* Empty placeholder pill if 0 hours */}
        {trend.totalHours === 0 && (
          <rect
            x={x}
            y={chartBottom - 3}
            width={barWidth}
            height={3}
            rx="1.5"
            fill="rgba(255,255,255,0.12)"
          />
        )}

        {/* Date Label */}
        <text
          x={centerX}
          y={chartBottom + 20}
          textAnchor="middle"
          fill={isToday ? '#4ade80' : 'var(--mute)'}
          fontWeight={isToday ? '600' : '400'}
          fontSize="11"
          className="select-none font-sans"
        >
          {trend.dayLabel.split(',')[0]}
        </text>
      </g>
    );
  });

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label="Daily AI Activity Hours"
        className="w-full h-auto block"
      >
        {gridLines}
        {bars}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-[var(--line)] text-[12px] text-[var(--mute)]">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <i
              className="inline-block w-2.5 h-2.5 rounded-[3px]"
              style={{ background: SESSION_TYPE_CONFIG.building.color }}
            />
            {SESSION_TYPE_CONFIG.building.name}
          </span>
          <span className="flex items-center gap-1.5">
            <i
              className="inline-block w-2.5 h-2.5 rounded-[3px]"
              style={{ background: SESSION_TYPE_CONFIG.learning.color }}
            />
            {SESSION_TYPE_CONFIG.learning.name}
          </span>
          <span className="flex items-center gap-1.5">
            <i
              className="inline-block w-2.5 h-2.5 rounded-[3px]"
              style={{ background: SESSION_TYPE_CONFIG.experimentation.color }}
            />
            {SESSION_TYPE_CONFIG.experimentation.name}
          </span>
        </div>
        <span className="text-[11px] text-[var(--mute)]/70">
          Source of truth: Schedule records
        </span>
      </div>

      {/* Floating Tooltip */}
      {tooltip.visible && tooltip.trend && (
        <div
          className="fixed pointer-events-none z-50 px-3.5 py-2.5 rounded-xl shadow-2xl text-[13px] font-medium transition-opacity duration-150 backdrop-blur-xl border border-white/10"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -125%)',
            backgroundColor: 'rgba(8, 20, 14, 0.95)',
            color: '#e6f6ee',
          }}
        >
          <div className="font-heading font-semibold text-[14px] text-white mb-1.5 pb-1 border-b border-white/10">
            {tooltip.trend.dayLabel}
          </div>
          <div className="space-y-1 text-[12px]">
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[var(--mute)]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: SESSION_TYPE_CONFIG.building.color }}
                />
                Building:
              </span>
              <span className="font-semibold">{tooltip.trend.buildingHours}h</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[var(--mute)]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: SESSION_TYPE_CONFIG.learning.color }}
                />
                Learning:
              </span>
              <span className="font-semibold">{tooltip.trend.learningHours}h</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-1.5 text-[var(--mute)]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: SESSION_TYPE_CONFIG.experimentation.color }}
                />
                Experimentation:
              </span>
              <span className="font-semibold">{tooltip.trend.experimentationHours}h</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-white/10 font-bold text-white">
              <span>Total Logged:</span>
              <span className="text-[#4ade80]">{tooltip.trend.totalHours}h</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
