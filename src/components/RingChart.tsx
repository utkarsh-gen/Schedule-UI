'use client';
import { CATEGORIES, ScheduleEntry } from '@/lib/types';
import { useEffect, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');
const mins = (t: string) => { const [h, m] = t.split(':'); return +h * 60 + +m; };
const fmt = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? ' ' + r + 'm' : ''}` : `${r}m`; };

const P = (a: number, r: number) => {
  const t = (a - 90) * Math.PI / 180;
  return [180 + r * Math.cos(t), 180 + r * Math.sin(t)];
};
const arc = (m1: number, m2: number, r: number) => {
  const [x1, y1] = P(m1 / 4, r), [x2, y2] = P(m2 / 4, r);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)}A${r} ${r} 0 ${(m2 - m1) / 4 > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};

export default function RingChart({ entries }: { entries: ScheduleEntry[] }) {
  const [now, setNow] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const nm = now.getHours() * 60 + now.getMinutes();
  const tot = entries.reduce((acc, e) => acc + e.durationMinutes, 0);

  const lines = Array.from({ length: 24 }).map((_, h) => {
    const [a, b] = P(h * 15, h % 6 ? 158 : 162);
    const [c, d] = P(h * 15, 170);
    return <line key={h} x1={a} y1={b} x2={c} y2={d} stroke={`rgba(255,255,255,${h % 6 ? 0.12 : 0.35})`} />;
  });

  const texts = [0, 6, 12, 18].map(h => {
    const [x, y] = P(h * 15, 190);
    return (
      <text key={h} x={Math.min(Math.max(x, 14), 346)} y={y + 4} textAnchor="middle" fill="#86a396" fontSize="12">
        {pad(h)}
      </text>
    );
  });

  const arcs = entries.map((e, i) => {
    return (
      <path 
        key={e.id}
        className="arc" 
        pathLength="1" 
        style={{ '--i': i } as React.CSSProperties} 
        stroke={CATEGORIES[e.category].c} 
        d={arc(mins(e.startTime) + 4, Math.max(mins(e.endTime) - 4, mins(e.startTime) + 5), 140)}
      >
        <title>{e.title} · {e.startTime}–{e.endTime}</title>
      </path>
    );
  });

  const [nx, ny] = P(nm / 4, 140);
  const cur = entries.find(e => mins(e.startTime) <= nm && nm < mins(e.endTime));

  return (
    <div className="relative max-w-[400px] mx-auto in">
      <svg viewBox="0 0 360 360" role="img" aria-label="24 hour ring of today's activities" className="w-full h-auto block">
        <circle cx="180" cy="180" r="140" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="20" />
        {lines}
        {texts}
        {arcs}
        <circle className="pulse" cx={nx} cy={ny} r="5" fill="#fff" />
        <circle cx={nx} cy={ny} r="5" fill="#fff" />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center pointer-events-none">
        <div className="text-[clamp(32px,6vw,46px)] font-[800] font-heading tracking-tight">{fmt(tot) || '0m'}</div>
        <small className="text-[var(--mute)]">{cur ? 'Now: ' + cur.title : 'logged today'}</small>
      </div>
    </div>
  );
}
