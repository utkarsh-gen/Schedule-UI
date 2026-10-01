'use client';
import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ScheduleEntry, CATEGORIES, CategoryKey } from '@/lib/types';
import RingChart from '@/components/RingChart';
import BarChart from '@/components/BarChart';
import DonutChart from '@/components/DonutChart';
import WeeklyCategoryList from '@/components/WeeklyCategoryList';
import { ChevronLeft, ChevronRight, Activity } from 'lucide-react';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmt = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? ' ' + r + 'm' : ''}` : `${r}m`; };
const mins = (t: string) => { const [h, m] = t.split(':'); return +h * 60 + +m; };

export default function Home() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Real-time listener on the correct collection
    const q = query(collection(db, 'schedule_entries'), orderBy('date', 'desc'), orderBy('startTime', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleEntry));
      setEntries(data);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error(err);
      if (err.message.includes('permission')) {
        setError("Permissions error: Please update Firestore rules for 'schedule_entries' to allow reads.");
      } else {
        setError(err.message);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const todayStr = iso(currentDate);
  const todaysEntries = useMemo(() => entries.filter(e => e.date === todayStr).sort((a, b) => a.startTime.localeCompare(b.startTime)), [entries, todayStr]);
  const totMins = useMemo(() => todaysEntries.reduce((acc, e) => acc + e.durationMinutes, 0), [todaysEntries]);

  const handlePrevDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); };
  const handleNextDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); };
  const handleToday = () => { setCurrentDate(new Date()); };

  const isToday = iso(currentDate) === iso(new Date());

  const ds = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return iso(d); });

  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const curEntry = todaysEntries.find(e => mins(e.startTime) <= nowMins && nowMins < mins(e.endTime));

  return (
    <div className="max-w-[1240px] mx-auto px-5 pt-7 pb-15">
      <header className="flex justify-between items-end gap-4 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-[clamp(30px,5vw,52px)] font-[800] leading-none font-heading tracking-tight">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h1>
            {!error && !loading && (
              <span className="flex items-center gap-1.5 bg-[var(--glass)] border border-[var(--g)]/30 text-[var(--g)] px-2.5 py-1 rounded-full text-xs font-semibold shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                <Activity size={14} className="animate-pulse" /> Live
              </span>
            )}
          </div>
          <p className="mt-2.5 text-[var(--mute)]">
            {todaysEntries.length ? (
              <><b>{fmt(totMins)}</b> logged across {todaysEntries.length} {todaysEntries.length > 1 ? 'entries' : 'entry'} on this day.</>
            ) : 'Nothing logged yet for this day.'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={handlePrevDay} className="btn ghost p-2 !rounded-full"><ChevronLeft size={20} /></button>
          <button onClick={handleToday} disabled={isToday} className="btn ghost px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed">Today</button>
          <button onClick={handleNextDay} disabled={isToday} className="btn ghost p-2 !rounded-full disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight size={20} /></button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-200">
          <h3 className="font-semibold text-red-400 mb-1">Access Denied</h3>
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="loading h-32 rounded-xl glass w-full"></div>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4" aria-label="Today by category">
            {(Object.keys(CATEGORIES) as CategoryKey[]).map(k => {
              const sumT = todaysEntries.filter(e => e.category === k).reduce((acc, e) => acc + e.durationMinutes, 0);
              const v = ds.map(d => entries.filter(e => e.date === d && e.category === k).reduce((a, e) => a + e.durationMinutes, 0));
              const mx = Math.max(...v, 1);
              const pts = v.map((x, i) => `${i * 100 / 6},${28 - x / mx * 24}`).join(' ');
              return (
                <div key={k} className="glass stat p-4 rounded-2xl relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: CATEGORIES[k].c }}></div>
                  <div className="text-[var(--mute)] text-[13px] ml-1">{CATEGORIES[k].n}</div>
                  <div className="text-[26px] font-semibold my-0.5 mb-1.5 font-heading ml-1">{fmt(sumT) || '0m'}</div>
                  <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-[30px] block opacity-60 group-hover:opacity-100 transition-opacity">
                    <polyline points={pts} fill="none" stroke={CATEGORIES[k].c} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                  </svg>
                </div>
              );
            })}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
            <section className="glass md:col-span-5">
              <div className="card-h">
                <h2 className="text-[20px] font-semibold font-heading tracking-tight">Your day, around the clock</h2>
                <span className="text-[var(--mute)] text-[13px]">24 hours</span>
              </div>
              <RingChart entries={todaysEntries} />
            </section>
            
            <section className="glass md:col-span-7 flex flex-col">
              <div className="card-h">
                <h2 className="text-[20px] font-semibold font-heading tracking-tight">Day timeline</h2>
                <span className="text-[var(--mute)] text-[13px]">{todaysEntries.length} entries</span>
              </div>
              <ul className="list-none m-0 p-0 max-h-[430px] overflow-auto no-scrollbar flex-1">
                {!todaysEntries.length ? (
                  <li className="block">
                    <div className="text-center py-10 px-2 text-[var(--mute)]">
                      <b className="block text-[var(--ink)] font-semibold text-[20px] font-heading mb-1.5">A clean slate</b>
                      Nothing logged on this day. Ask ChatGPT to add an activity!
                    </div>
                  </li>
                ) : todaysEntries.map((e) => (
                  <li key={e.id} className="grid grid-cols-[52px_14px_1fr] gap-2.5 pb-3">
                    <div className="text-[var(--mute)] text-[13px] text-right pt-3">
                      {e.startTime}<br />{e.endTime}
                    </div>
                    <div className="relative">
                      <div className="absolute left-1.5 top-0 bottom-[-12px] w-[1px] bg-[var(--line)]"></div>
                      <i className="absolute left-[0.5px] top-[15px] w-[11px] h-[11px] rounded-full shadow-[0_0_12px]" style={{ background: CATEGORIES[e.category].c, color: CATEGORIES[e.category].c }}></i>
                    </div>
                    <div className={`border border-[var(--line)] bg-[rgba(255,255,255,0.03)] rounded-[14px] p-3 transition-all ${e === curEntry && isToday ? 'border-[var(--c)] shadow-[0_0_0_1px_var(--c),0_0_30px_-8px_var(--c)]' : ''}`} style={{ '--c': CATEGORIES[e.category].c } as React.CSSProperties}>
                      <h3 className="text-[16px] font-semibold tracking-tight">{e.title}</h3>
                      <p className="mt-1 text-[var(--mute)] text-[13px] flex items-center gap-2 flex-wrap">
                        <span className="inline-block text-[12px] px-2.5 py-0.5 rounded-full whitespace-nowrap" style={{ color: CATEGORIES[e.category].c, backgroundColor: `color-mix(in srgb, ${CATEGORIES[e.category].c} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${CATEGORIES[e.category].c} 30%, transparent)` }}>
                          {CATEGORIES[e.category].n}
                        </span>
                        <span>{fmt(e.durationMinutes)}</span>
                        {e.place && <span>• {e.place}</span>}
                      </p>
                      {e.notes && (
                        <div className="mt-2 text-[13px] text-[var(--mute)]/80 italic border-t border-[var(--line)]/50 pt-2">
                          "{e.notes}"
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass md:col-span-7">
              <div className="card-h">
                <h2 className="text-[20px] font-semibold font-heading tracking-tight">Hours per day</h2>
                <span className="text-[var(--mute)] text-[13px]">Last 7 days</span>
              </div>
              <BarChart entries={entries} />
            </section>

            <section className="glass md:col-span-5">
              <div className="card-h">
                <h2 className="text-[20px] font-semibold font-heading tracking-tight">Where the week went</h2>
                <span className="text-[var(--mute)] text-[13px]">Share by category</span>
              </div>
              <DonutChart entries={entries} />
            </section>
          </div>

          <section className="glass mb-4">
            <div className="card-h mb-4">
              <h2 className="text-[20px] font-semibold font-heading tracking-tight">Weekly Category Breakdown</h2>
              <span className="text-[var(--mute)] text-[13px]">Last 7 days exact hours</span>
            </div>
            <WeeklyCategoryList entries={entries} />
          </section>

          <section className="glass">
            <div className="card-h mb-4">
              <h2 className="text-[20px] font-semibold font-heading tracking-tight">All entries</h2>
              <div className="flex gap-1.5 flex-wrap">
                {['all', ...Object.keys(CATEGORIES)].map(k => (
                  <button 
                    key={k} 
                    onClick={() => setFilter(k)}
                    className={`cursor-pointer border border-[var(--line)] bg-transparent text-[var(--mute)] font-medium text-[13px] px-3 py-1 rounded-full transition-colors ${filter === k ? 'bg-[#4ade80]/15 text-[var(--ink)] border-[#4ade80]/50' : 'hover:bg-white/5'}`}
                  >
                    {k === 'all' ? 'All' : CATEGORIES[k as CategoryKey].n}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto no-scrollbar">
              <table className="w-full border-collapse min-w-[680px]">
                <thead className="sticky top-0 bg-[#06100b]/85 backdrop-blur-md z-10">
                  <tr>
                    <th className="text-left font-medium text-[var(--mute)] text-[13px] p-2.5 px-3">Activity</th>
                    <th className="text-left font-medium text-[var(--mute)] text-[13px] p-2.5 px-3">Category</th>
                    <th className="text-left font-medium text-[var(--mute)] text-[13px] p-2.5 px-3">Date</th>
                    <th className="text-left font-medium text-[var(--mute)] text-[13px] p-2.5 px-3">Time</th>
                    <th className="text-left font-medium text-[var(--mute)] text-[13px] p-2.5 px-3">Duration</th>
                    <th className="text-left font-medium text-[var(--mute)] text-[13px] p-2.5 px-3">Place</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.filter(e => filter === 'all' || e.category === filter).length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="text-center py-10 text-[var(--mute)]">
                          <b className="block text-[var(--ink)] font-semibold text-[20px] font-heading mb-1.5">No entries in this category</b>
                          Pick another filter or log a new activity.
                        </div>
                      </td>
                    </tr>
                  ) : entries.filter(e => filter === 'all' || e.category === filter).map(e => (
                    <tr key={e.id} className="border-t border-[var(--line)] hover:bg-[#4ade80]/5 transition-colors group">
                      <td className="p-3 text-[14px]">
                        <div>{e.title}</div>
                        {e.notes && <div className="text-[12px] text-[var(--mute)] mt-1 hidden group-hover:block italic">"{e.notes}"</div>}
                      </td>
                      <td className="p-3">
                        <span className="inline-block text-[12px] px-2.5 py-0.5 rounded-full whitespace-nowrap" style={{ color: CATEGORIES[e.category].c, backgroundColor: `color-mix(in srgb, ${CATEGORIES[e.category].c} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${CATEGORIES[e.category].c} 30%, transparent)` }}>
                          {CATEGORIES[e.category].n}
                        </span>
                      </td>
                      <td className="p-3 text-[14px]">{new Date(e.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className="p-3 text-[14px] text-[var(--mute)]">{e.startTime} – {e.endTime}</td>
                      <td className="p-3 text-[14px]">
                        <span className="inline-block h-1.5 rounded-full align-middle mr-2" style={{ width: Math.min(e.durationMinutes / 3, 60), background: CATEGORIES[e.category].c }}></span>
                        {fmt(e.durationMinutes)}
                      </td>
                      <td className="p-3 text-[14px]">{e.place || <span className="text-[var(--mute)]">None</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
