'use client';
import { CATEGORIES, CategoryKey, ScheduleEntry } from '@/lib/types';

const fmt = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? ' ' + r + 'm' : ''}` : `${r}m`; };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayOf = (o: number) => { const d = new Date(); d.setDate(d.getDate() - o); return d; };

export default function WeeklyCategoryList({ entries, dates }: { entries: ScheduleEntry[], dates?: string[] }) {
  const K = Object.keys(CATEGORIES) as CategoryKey[];
  const ds = dates || Array.from({ length: 7 }, (_, i) => iso(dayOf(6 - i)));
  
  const sum = (list: ScheduleEntry[], cat?: string) => list.filter(e => !cat || e.category === cat).reduce((a, e) => a + e.durationMinutes, 0);
  const WK = entries.filter(e => ds.includes(e.date));
  
  // Sort categories by most time spent
  const sortedCategories = K.map(k => ({
    key: k,
    mins: sum(WK, k),
    ...CATEGORIES[k]
  })).sort((a, b) => b.mins - a.mins);

  const maxMins = Math.max(...sortedCategories.map(c => c.mins), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedCategories.map(c => (
        <div key={c.key} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2 relative overflow-hidden group">
          <div className="flex justify-between items-center z-10">
            <span className="flex items-center text-sm text-[var(--mute)]">
              <i className="inline-block w-2.5 h-2.5 rounded-[3px] mr-2" style={{ background: c.c }}></i>
              {c.n}
            </span>
            <span className="font-semibold text-lg font-heading tracking-tight">{fmt(c.mins)}</span>
          </div>
          <div className="h-1.5 w-full bg-[var(--line)] rounded-full overflow-hidden z-10">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${(c.mins / maxMins) * 100}%`, backgroundColor: c.c }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}
