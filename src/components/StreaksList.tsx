'use client';
import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { StreakDefinition, StreakCompletion, StreakProgress } from '@/lib/types';
import { computeStreakProgress } from '@/lib/streak';
import { Flame, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function StreakCard({ progress, onComplete }: { progress: StreakProgress, onComplete: (defId: string) => void }) {
  const { definition: def, currentStreak, isCompletedThisPeriod, daysRemainingInPeriod, history } = progress;
  
  const [animating, setAnimating] = useState(false);

  const handleComplete = () => {
    if (isCompletedThisPeriod && def.periodAmount === 1 && def.periodUnit === 'days') return;
    setAnimating(true);
    setTimeout(() => {
      onComplete(def.id!);
      setAnimating(false);
    }, 600);
  };

  const isDaily = def.periodAmount === 1 && def.periodUnit === 'days';
  const isDueSoon = !isCompletedThisPeriod && daysRemainingInPeriod <= 2;
  const isBroken = progress.isBroken;

  // Render recent history sequence
  const today = new Date();
  const historySequence = [];
  
  if (isDaily) {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = iso(d);
      const isDone = history.includes(dStr);
      historySequence.push(
        <div key={dStr} className={`w-4 h-4 rounded-full transition-colors ${isDone ? 'bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.4)]' : 'bg-white/10'}`} title={dStr}></div>
      );
    }
  }

  return (
    <div className={`glass p-4 rounded-xl border relative overflow-hidden transition-all duration-300 ${isCompletedThisPeriod ? 'border-[#4ade80]/30 bg-[#4ade80]/5' : (isDueSoon ? 'border-yellow-500/30' : 'border-[var(--line)]')}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-[16px] font-semibold tracking-tight text-[var(--ink)] flex items-center gap-2">
            {def.name}
            {isCompletedThisPeriod && <CheckCircle size={16} className="text-[#4ade80]" />}
          </h3>
          <p className="text-[12px] text-[var(--mute)] mt-1">
            {def.requiredCompletions}x every {def.periodAmount > 1 ? `${def.periodAmount} ${def.periodUnit}` : def.periodUnit.slice(0, -1)}
          </p>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 text-[15px] font-semibold text-orange-400">
            <Flame size={16} className={currentStreak > 0 ? 'fill-orange-400 text-orange-400' : 'text-white/20'} />
            <span className={currentStreak > 0 ? 'text-[var(--ink)]' : 'text-[var(--mute)]'}>{currentStreak}</span>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between mt-4">
        <div>
          {isDaily ? (
            <div className="flex gap-1.5 mt-2">
              {historySequence}
            </div>
          ) : (
            <div className="text-[12px]">
              <div className="flex gap-2 items-center mb-1.5">
                <span className="text-[var(--mute)]">Progress this period:</span>
                <span className="font-medium text-[var(--ink)]">{progress.completionsThisPeriod} / {def.requiredCompletions}</span>
              </div>
              <div className="h-1.5 w-full bg-[var(--line)] rounded-full overflow-hidden w-[120px]">
                <div 
                  className="h-full bg-[#4ade80] rounded-full transition-all"
                  style={{ width: `${Math.min(100, (progress.completionsThisPeriod / def.requiredCompletions) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleComplete}
          disabled={isCompletedThisPeriod && isDaily}
          className={`relative overflow-hidden flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${isCompletedThisPeriod && isDaily ? 'bg-white/5 text-[var(--mute)] cursor-default' : 'bg-white/10 hover:bg-white/20 text-[var(--ink)] active:scale-95'}`}
        >
          {animating ? (
            <span className="flex items-center gap-1"><CheckCircle size={14} className="text-[#4ade80] animate-bounce" /> Logging...</span>
          ) : (
            isCompletedThisPeriod ? 'Log extra' : 'Log completion'
          )}
        </button>
      </div>

      {!isCompletedThisPeriod && (
        <div className={`mt-3 pt-3 border-t border-[var(--line)]/50 text-[12px] flex items-center gap-1.5 ${isDueSoon ? 'text-yellow-400' : 'text-[var(--mute)]'}`}>
          {isDueSoon ? <AlertTriangle size={12} /> : <Clock size={12} />}
          {isDaily ? 'Due today' : `${daysRemainingInPeriod} days remaining in period`}
        </div>
      )}
    </div>
  );
}

export default function StreaksList() {
  const [definitions, setDefinitions] = useState<StreakDefinition[]>([]);
  const [completions, setCompletions] = useState<StreakCompletion[]>([]);

  useEffect(() => {
    const qDef = query(collection(db, 'streak_definitions'));
    const unsubDef = onSnapshot(qDef, (snap) => {
      setDefinitions(snap.docs.map(d => ({ id: d.id, ...d.data() } as StreakDefinition)));
    });

    const qComp = query(collection(db, 'streak_completions'));
    const unsubComp = onSnapshot(qComp, (snap) => {
      setCompletions(snap.docs.map(d => ({ id: d.id, ...d.data() } as StreakCompletion)));
    });

    return () => { unsubDef(); unsubComp(); };
  }, []);

  const progressList = useMemo(() => {
    const todayStr = iso(new Date());
    return definitions.map(def => {
      const defComps = completions.filter(c => c.streakId === def.id);
      return computeStreakProgress(def, defComps, todayStr);
    }).sort((a, b) => b.currentStreak - a.currentStreak);
  }, [definitions, completions]);

  const handleLogCompletion = async (streakId: string) => {
    const todayStr = iso(new Date());
    // In a real setup we'd call an API or write to Firebase. Since we have db:
    const newDoc = doc(collection(db, 'streak_completions'));
    await setDoc(newDoc, {
      streakId,
      date: todayStr,
      timestamp: new Date().toISOString()
    });
  };

  if (definitions.length === 0) return null; // Don't show if no streaks are defined

  return (
    <section className="mt-8 mb-4">
      <div className="card-h mb-4">
        <h2 className="text-[24px] font-[800] leading-none font-heading tracking-tight text-white/90">Streaks & Habits</h2>
        <span className="text-[var(--mute)] text-[13px] mt-1 block">Consistency builds routines</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {progressList.map(p => (
          <StreakCard key={p.definition.id} progress={p} onComplete={handleLogCompletion} />
        ))}
      </div>
    </section>
  );
}
