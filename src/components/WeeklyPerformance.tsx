'use client';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { ScheduleEntry } from '@/lib/types';
import BarChart from './BarChart';
import DonutChart from './DonutChart';
import WeeklyCategoryList from './WeeklyCategoryList';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? ' ' + r + 'm' : ''}` : `${r}m`; };

export default function WeeklyPerformance({ entries }: { entries: ScheduleEntry[] }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const { dates, weekLabel, isCurrentWeek, totalMins } = useMemo(() => {
    const today = new Date();
    // Get Monday of current week
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(today.getFullYear(), today.getMonth(), diff);
    monday.setDate(monday.getDate() + (weekOffset * 7));

    const ds: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      ds.push(iso(d));
    }

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const formatShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const label = `${formatShort(monday)} - ${formatShort(sunday)}`;

    const weekEntries = entries.filter(e => ds.includes(e.date));
    const total = weekEntries.reduce((acc, e) => acc + e.durationMinutes, 0);

    return { dates: ds, weekLabel: label, isCurrentWeek: weekOffset === 0, totalMins: total };
  }, [weekOffset, entries]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex justify-between items-center bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-[var(--line)] flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--line)] rounded-lg text-[var(--mute)]">
            <Calendar size={20} />
          </div>
          <div>
            <h2 className="text-[18px] font-semibold font-heading tracking-tight">Week of {weekLabel}</h2>
            <p className="text-[13px] text-[var(--mute)]">
              {fmt(totalMins)} logged this week
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(p => p - 1)} className="btn ghost p-2 !rounded-full"><ChevronLeft size={20} /></button>
          <button onClick={() => setWeekOffset(0)} disabled={isCurrentWeek} className="btn ghost px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">Current Week</button>
          <button onClick={() => setWeekOffset(p => p + 1)} disabled={isCurrentWeek} className="btn ghost p-2 !rounded-full disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight size={20} /></button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <section className="glass md:col-span-7">
          <div className="card-h">
            <h2 className="text-[20px] font-semibold font-heading tracking-tight">Daily Distribution</h2>
            <span className="text-[var(--mute)] text-[13px]">Monday – Sunday</span>
          </div>
          <BarChart entries={entries} dates={dates} />
        </section>

        <section className="glass md:col-span-5">
          <div className="card-h">
            <h2 className="text-[20px] font-semibold font-heading tracking-tight">Week Overview</h2>
            <span className="text-[var(--mute)] text-[13px]">Share by category</span>
          </div>
          <DonutChart entries={entries} dates={dates} />
        </section>
      </div>

      <section className="glass">
        <div className="card-h mb-4">
          <h2 className="text-[20px] font-semibold font-heading tracking-tight">Category Breakdown</h2>
          <span className="text-[var(--mute)] text-[13px]">Exact hours for selected week</span>
        </div>
        <WeeklyCategoryList entries={entries} dates={dates} />
      </section>
    </div>
  );
}
