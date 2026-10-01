'use client';
import { CATEGORIES, CategoryKey, ScheduleEntry } from '@/lib/types';

const fmt = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? ' ' + r + 'm' : ''}` : `${r}m`; };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayOf = (o: number) => { const d = new Date(); d.setDate(d.getDate() - o); return d; };

export default function BarChart({ entries }: { entries: ScheduleEntry[] }) {
  const K = Object.keys(CATEGORIES) as CategoryKey[];
  const ds = Array.from({ length: 7 }, (_, i) => iso(dayOf(6 - i)));
  
  const sum = (list: ScheduleEntry[], cat?: string) => list.filter(e => !cat || e.category === cat).reduce((a, e) => a + e.durationMinutes, 0);
  
  const W = ds.map(d => K.map(k => sum(entries.filter(e => e.date === d), k)));
  const mx = Math.max(...W.map(a => a.reduce((x, y) => x + y, 0)), 60);
  const H = Math.ceil(mx / 60);

  const gridLines = [];
  for (let g = 0; g <= H; g += Math.max(1, Math.ceil(H / 4))) {
    const y = 200 - g * 60 / (H * 60) * 180;
    gridLines.push(
      <g key={`grid-${g}`}>
        <line x1="34" x2="550" y1={y} y2={y} stroke="rgba(255,255,255,.07)" />
        <text x="26" y={y + 4} textAnchor="end" fill="var(--mute)" fontSize="12">{g}h</text>
      </g>
    );
  }

  const bars = ds.map((d, i) => {
    let y = 200;
    const x = 48 + i * 73;
    const rects = W[i].map((m, j) => {
      const h = m / (H * 60) * 180;
      if (!h) return null;
      y -= h;
      return (
        <rect key={`${i}-${j}`} x={x} y={y} width="44" height={h - 1.5} rx="5" fill={CATEGORIES[K[j]].c} opacity={d === iso(new Date()) ? 1 : 0.62}>
          <title>{CATEGORIES[K[j]].n}: {fmt(m)}</title>
        </rect>
      );
    });

    return (
      <g key={d}>
        {rects}
        <text x={x + 22} y="222" textAnchor="middle" fill={d === iso(new Date()) ? '#e6f6ee' : 'var(--mute)'} fontWeight={d === iso(new Date()) ? 600 : 400} fontSize="12">
          {new Date(d + 'T00:00').toLocaleDateString('en-US', { weekday: 'short' })}
        </text>
      </g>
    );
  });

  return (
    <div>
      <svg viewBox="0 0 560 240" role="img" aria-label="Stacked hours per day" className="w-full h-auto block">
        {gridLines}
        {bars}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-[13px] text-[var(--mute)]">
        {K.map(k => (
          <span key={k} className="flex items-center">
            <i className="inline-block w-2 h-2 rounded-[3px] mr-1.5" style={{ background: CATEGORIES[k].c }}></i>
            {CATEGORIES[k].n}
          </span>
        ))}
      </div>
    </div>
  );
}
