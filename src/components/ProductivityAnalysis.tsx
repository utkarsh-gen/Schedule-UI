'use client';
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { ScheduleEntry, CATEGORIES } from '@/lib/types';
import { DEFAULT_ROUTINE } from '@/lib/routine';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mins = (t: string) => { const [h, m] = t.split(':'); return +h * 60 + +m; };
const fmt = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? ' ' + r + 'm' : ''}` : `${r}m`; };

function getIntersection(start1: number, end1: number, start2: number, end2: number) {
  const start = Math.max(start1, start2);
  const end = Math.min(end1, end2);
  return Math.max(0, end - start);
}

export default function ProductivityAnalysis({ entries }: { entries: ScheduleEntry[] }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const { weekLabel, isCurrentWeek, analysisDays, totalExpected, totalLogged, weekSegments } = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(today.getFullYear(), today.getMonth(), diff);
    monday.setDate(monday.getDate() + (weekOffset * 7));

    const ds: string[] = [];
    const datesObjs: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      ds.push(iso(d));
      datesObjs.push(d);
    }

    const sunday = datesObjs[6];
    const formatShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const label = `${formatShort(monday)} - ${formatShort(sunday)}`;

    const analysis = ds.map((dateStr, i) => {
      const dayOfWeek = (1 + i) % 7; // 0=Mon -> 1, 6=Sun -> 0
      const blocks = DEFAULT_ROUTINE[dayOfWeek] || [];
      const prodBlocks = blocks.filter(b => b.type === 'productivity');
      
      const dayEntries = entries.filter(e => e.date === dateStr);
      
      let expectedMins = 0;
      const segments: { category: string, title: string, duration: number, color: string }[] = [];
      let totalLoggedMins = 0;

      prodBlocks.forEach(pb => {
        const pStart = mins(pb.startTime);
        const pEnd = mins(pb.endTime);
        expectedMins += (pEnd - pStart);

        const intersections = dayEntries.map(e => {
          const eStart = mins(e.startTime);
          const eEnd = mins(e.endTime);
          const dur = getIntersection(pStart, pEnd, eStart, eEnd);
          return dur > 0 ? { ...e, intDur: dur, iStart: Math.max(pStart, eStart) } : null;
        }).filter(Boolean) as (ScheduleEntry & { intDur: number, iStart: number })[];

        intersections.sort((a, b) => a.iStart - b.iStart);
        
        let currentMins = pStart;
        intersections.forEach(inter => {
          if (inter.iStart > currentMins) {
            segments.push({ category: 'unlogged', title: 'No activity logged', duration: inter.iStart - currentMins, color: 'rgba(255,255,255,0.05)' });
          }
          segments.push({ category: inter.category, title: inter.title, duration: inter.intDur, color: CATEGORIES[inter.category]?.c || '#666' });
          currentMins = inter.iStart + inter.intDur;
          totalLoggedMins += inter.intDur;
        });

        if (currentMins < pEnd) {
          segments.push({ category: 'unlogged', title: 'No activity logged', duration: pEnd - currentMins, color: 'rgba(255,255,255,0.05)' });
        }
      });

      return {
        dateStr,
        dayName: datesObjs[i].toLocaleDateString('en-US', { weekday: 'short' }),
        expectedMins,
        totalLoggedMins,
        segments
      };
    });

    const totalE = analysis.reduce((sum, d) => sum + d.expectedMins, 0);
    const totalL = analysis.reduce((sum, d) => sum + d.totalLoggedMins, 0);

    const weekSegmentsMap: Record<string, number> = { unlogged: 0 };
    analysis.forEach(day => {
      day.segments.forEach(seg => {
        weekSegmentsMap[seg.category] = (weekSegmentsMap[seg.category] || 0) + seg.duration;
      });
    });

    const weekSegments = Object.entries(weekSegmentsMap)
      .map(([k, v]) => ({
        category: k,
        duration: v,
        title: k === 'unlogged' ? 'No activity logged' : CATEGORIES[k as keyof typeof CATEGORIES]?.n || k,
        color: k === 'unlogged' ? 'rgba(255,255,255,0.05)' : CATEGORIES[k as keyof typeof CATEGORIES]?.c || '#666'
      }))
      .filter(s => s.duration > 0)
      .sort((a, b) => {
        if (a.category === 'unlogged') return 1;
        if (b.category === 'unlogged') return -1;
        return b.duration - a.duration;
      });

    return { weekLabel: label, isCurrentWeek: weekOffset === 0, analysisDays: analysis, totalExpected: totalE, totalLogged: totalL, weekSegments };
  }, [weekOffset, entries]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex justify-between items-center bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-[var(--line)] flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--line)] rounded-lg text-[var(--mute)]">
            <Target size={20} />
          </div>
          <div>
            <h2 className="text-[18px] font-semibold font-heading tracking-tight">Productivity Hours Analysis</h2>
            <p className="text-[13px] text-[var(--mute)]">
              {fmt(totalLogged)} / {fmt(totalExpected)} expected hours logged
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(p => p - 1)} className="btn ghost p-2 !rounded-full"><ChevronLeft size={20} /></button>
          <span className="text-[13px] font-medium text-[var(--mute)] px-2">{weekLabel}</span>
          <button onClick={() => setWeekOffset(p => p + 1)} disabled={isCurrentWeek} className="btn ghost p-2 !rounded-full disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight size={20} /></button>
        </div>
      </header>

      <div className="glass p-5">
        {totalExpected > 0 && (
          <div className="mb-8 pb-6 border-b border-[var(--line)]">
            <div className="flex justify-between items-end mb-3">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--ink)]">Weekly Allocation</h3>
                <span className="text-[12px] text-[var(--mute)]">How your {fmt(totalExpected)} expected hours were spent</span>
              </div>
            </div>
            <div className="h-8 w-full bg-[var(--line)] rounded-lg flex overflow-hidden shadow-inner mb-4">
              {weekSegments.map((seg, idx) => {
                const pct = (seg.duration / totalExpected) * 100;
                return (
                  <div 
                    key={idx}
                    className="h-full relative group/seg transition-opacity hover:opacity-90 cursor-pointer"
                    style={{ width: `${pct}%`, backgroundColor: seg.color }}
                  >
                    <div className="absolute opacity-0 group-hover/seg:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1c1c1e] text-white text-[11px] rounded whitespace-nowrap pointer-events-none z-10 transition-opacity border border-white/10 shadow-xl">
                      {seg.title}: {fmt(seg.duration)} ({(pct).toFixed(1)}%)
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {weekSegments.map((seg, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[12px] text-[var(--mute)]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }}></span>
                  <span>{seg.title} <b className="font-medium text-[var(--ink)] ml-1">{fmt(seg.duration)}</b></span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {analysisDays.map((day, i) => (
            <div key={day.dateStr} className="flex flex-col gap-2 group">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <span className={`w-8 text-[13px] font-medium ${day.dateStr === iso(new Date()) ? 'text-[#4ade80]' : 'text-[var(--mute)]'}`}>
                    {day.dayName}
                  </span>
                  {day.expectedMins > 0 ? (
                    <span className="text-[12px] text-[var(--mute)] opacity-60">
                      {fmt(day.expectedMins)} available
                    </span>
                  ) : (
                    <span className="text-[12px] text-[var(--mute)] opacity-60">
                      No productivity hours expected
                    </span>
                  )}
                </div>
                {day.expectedMins > 0 && (
                  <span className="text-[13px] font-semibold text-[var(--ink)]">
                    {fmt(day.totalLoggedMins)}
                  </span>
                )}
              </div>
              
              {day.expectedMins > 0 && (
                <div className="h-6 w-full bg-[var(--line)] rounded-md flex overflow-hidden shadow-inner">
                  {day.segments.map((seg, idx) => {
                    const pct = (seg.duration / day.expectedMins) * 100;
                    return (
                      <div 
                        key={idx}
                        className="h-full relative group/seg transition-opacity hover:opacity-90 cursor-pointer"
                        style={{ width: `${pct}%`, backgroundColor: seg.color }}
                        title={`${seg.title} (${fmt(seg.duration)})`}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute opacity-0 group-hover/seg:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1c1c1e] text-white text-[11px] rounded whitespace-nowrap pointer-events-none z-10 transition-opacity border border-white/10 shadow-xl">
                          {seg.title}: {fmt(seg.duration)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
