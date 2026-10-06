'use client';
import { CATEGORIES, CategoryKey, ScheduleEntry } from '@/lib/types';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayOf = (o: number) => { const d = new Date(); d.setDate(d.getDate() - o); return d; };

export default function DonutChart({ entries, dates }: { entries: ScheduleEntry[], dates?: string[] }) {
  const K = Object.keys(CATEGORIES) as CategoryKey[];
  const ds = dates || Array.from({ length: 7 }, (_, i) => iso(dayOf(6 - i)));
  const sum = (list: ScheduleEntry[], cat?: string) => list.filter(e => !cat || e.category === cat).reduce((a, e) => a + e.durationMinutes, 0);

  const WK = entries.filter(e => ds.includes(e.date));
  const wt = sum(WK) || 1;
  let off = 0;
  const R = 70;
  const L = 2 * Math.PI * R;

  const circles = K.map(k => {
    const f = sum(WK, k) / wt * L;
    const currentOff = off;
    off += f;
    return (
      <circle 
        key={k}
        cx="90" cy="90" r={R} 
        fill="none" 
        stroke={CATEGORIES[k].c} 
        strokeWidth="22" 
        strokeDasharray={`${Math.max(f - 2, 0)} ${L}`} 
        strokeDashoffset={-currentOff} 
      />
    );
  });

  return (
    <div className="grid grid-cols-[minmax(150px,200px)_1fr] gap-[18px] items-center max-md:grid-cols-1">
      <svg viewBox="0 0 180 180" style={{ width: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="22" />
        {circles}
        <text x="90" y="90" transform="rotate(90 90 90)" textAnchor="middle" dominantBaseline="central" fill="#e6f6ee" className="font-heading text-[26px] font-[800]">
          {Math.round(wt / 60)}h
        </text>
      </svg>
      <div className="grid gap-2 text-[14px]">
        {K.map(k => {
          const perc = Math.round(sum(WK, k) / wt * 100);
          return (
            <div key={k} className="flex justify-between gap-2">
              <span className="flex items-center">
                <i className="inline-block w-2.5 h-2.5 rounded-[3px] mr-2" style={{ background: CATEGORIES[k].c }}></i>
                {CATEGORIES[k].n}
              </span>
              <b className="font-semibold">{perc}%</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}
