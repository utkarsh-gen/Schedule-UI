'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_ROUTINE, RoutineBlock } from '@/lib/routine';
import { CATEGORIES } from '@/lib/types';
import { Sparkles } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  sleep: CATEGORIES.sleep?.c || '#a78bfa',
  morning_routine: '#fcd34d',
  school: '#38bdf8',
  rest: '#9ca3af',
  coaching: '#f43f5e',
  productivity: '#4ade80',
  wind_down: '#c084fc',
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function TimelineBar({ blocks }: { blocks: RoutineBlock[] }) {
  return (
    <div className="relative h-[80px] w-full bg-[rgba(255,255,255,0.02)] rounded-xl border border-[var(--line)] overflow-hidden flex">
      {blocks.map((b, i) => {
        const start = b.startTime.split(':').map(Number);
        const end = b.endTime.split(':').map(Number);
        const startMins = start[0] * 60 + start[1];
        let endMins = end[0] * 60 + end[1];
        if (endMins < startMins) endMins += 24 * 60;
        
        const duration = endMins - startMins;
        const widthPct = (duration / (24 * 60)) * 100;
        
        return (
          <div 
            key={i} 
            className="h-full border-r border-[var(--bg)] last:border-r-0 relative group flex items-center justify-center overflow-hidden transition-all hover:brightness-110"
            style={{ width: `${widthPct}%`, backgroundColor: TYPE_COLORS[b.type] || '#333' }}
          >
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all z-0"></div>
            <div className="relative z-10 flex flex-col items-center justify-center p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              <span className="text-white font-bold text-[13px] drop-shadow-md">{b.title}</span>
              <span className="text-white/80 text-[11px] drop-shadow-md">{b.startTime} - {b.endTime}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RoutinePage() {
  const [overrides, setOverrides] = useState<Record<string, RoutineBlock[]>>({});

  useEffect(() => {
    const q = query(collection(db, 'routine_overrides'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const map: Record<string, RoutineBlock[]> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.blocks) {
          map[doc.id] = data.blocks as RoutineBlock[];
        }
      });
      setOverrides(map);
    }, (err) => {
      console.warn("routine_overrides error in routine page:", err.message);
    });
    return () => unsubscribe();
  }, []);

  const overrideEntries = Object.entries(overrides).sort((a, b) => b[0].localeCompare(a[0]));
  return (
    <div className="max-w-[1240px] mx-auto px-5 pt-7 pb-15">
      <header className="flex justify-between items-end gap-4 flex-wrap mb-6 border-b border-[var(--line)] pb-5">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap text-[14px]">
            <Link href="/" className="text-[var(--mute)] hover:text-white transition-colors inline-block underline underline-offset-4">&larr; Back to Dashboard</Link>
            <span className="text-[var(--mute)]">•</span>
            <Link href="/work" className="text-[#4ade80] hover:text-white transition-colors inline-block underline underline-offset-4 font-semibold">Work Management &rarr;</Link>
          </div>
          <h1 className="text-[clamp(30px,5vw,42px)] font-[800] leading-none font-heading tracking-tight mt-2">
            General Routine
          </h1>
          <p className="text-[var(--mute)] mt-2">Your default weekly timeline. The AI uses this as a baseline to schedule your productive hours.</p>
        </div>
      </header>

      <div className="space-y-12">
        {overrideEntries.length > 0 && (
          <section className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-6">
            <div className="flex items-center gap-2 text-emerald-400">
              <Sparkles size={20} />
              <h2 className="text-[20px] font-bold font-heading tracking-tight">Active Date Overrides (AI / MCP)</h2>
            </div>
            <p className="text-[13px] text-[var(--mute)] -mt-4">
              These dates have customized productivity hours or routine adjustments stored in Firestore.
            </p>
            <div className="space-y-6">
              {overrideEntries.map(([dateStr, blocks]) => (
                <div key={dateStr} className="glass p-5 rounded-xl border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-[16px] text-white flex items-center gap-2">
                      {dateStr}
                      <span className="text-[10px] font-semibold bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30 px-2 py-0.5 rounded uppercase">
                        Custom Override
                      </span>
                    </span>
                  </div>
                  <TimelineBar blocks={blocks} />
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="pt-2">
          <h2 className="text-[22px] font-bold font-heading tracking-tight mb-6">Standard Weekly Baseline</h2>
        </div>

        {DAY_NAMES.map((dayName, dayIndex) => {
          const blocks = DEFAULT_ROUTINE[dayIndex];
          
          return (
            <section key={dayIndex} className="glass p-6 rounded-2xl">
              <h2 className="text-[20px] font-bold font-heading tracking-tight mb-4">{dayName}</h2>
              <TimelineBar blocks={blocks} />
              
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-[13px] text-[var(--mute)]">
                {Array.from(new Set(blocks.map(b => b.type))).map(type => {
                  const title = blocks.find(b => b.type === type)?.title;
                  return (
                    <span key={type} className="flex items-center">
                      <i className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 shadow-sm" style={{ background: TYPE_COLORS[type] }}></i>
                      {title}
                    </span>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
