'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ClipboardList } from 'lucide-react';
import { OFTPAY_COURSES } from '@/app/oftpay/coursesConfig';

type CarplayAccess = {
  email: string;
  displayName?: string | null;
  allowedCourseIds: string[];
  questoesEnabled: boolean;
  accessEndAt: number | null;
};

type CourseSummary = {
  courseId: string;
  progressPercent: number;
  plannerName: string | null;
};

export default function CarplayPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState<CarplayAccess | null>(null);
  const [summaries, setSummaries] = useState<CourseSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/oftpay/carplay/session')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return null;
        return data as CarplayAccess;
      })
      .then((data) => {
        if (!cancelled) setAccess(data);
      })
      .catch(() => {
        if (!cancelled) setAccess(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enter = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/oftpay/carplay/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Código inválido.');
      setAccess(data as CarplayAccess);
      setCode('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Código inválido.');
    } finally {
      setSubmitting(false);
    }
  };

  const loadSummaries = async () => {
    const res = await fetch('/api/oftpay/carplay/library');
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(data.courses)) {
      setSummaries([]);
      return;
    }
    setSummaries(data.courses as CourseSummary[]);
  };

  useEffect(() => {
    if (!access) return;
    void loadSummaries();
  }, [access]);

  const leave = async () => {
    await fetch('/api/oftpay/carplay/session', { method: 'DELETE' });
    setAccess(null);
    setSummaries([]);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-white" />
      </div>
    );
  }

  if (!access) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
        <form
          className="w-full max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            void enter();
          }}
        >
          <img src="/oftware2.png" alt="Oftware" className="h-9 w-auto object-contain mix-blend-screen" />
          <h1 className="mt-4 text-4xl font-semibold">CarPlay</h1>
          <p className="mt-3 text-zinc-400">Digite o código da sua conta.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoFocus
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            maxLength={12}
            placeholder="CÓDIGO"
            className="mt-8 w-full rounded-2xl border border-white/15 bg-zinc-900 px-4 py-5 text-center text-3xl font-semibold tracking-[0.25em] text-white caret-white uppercase outline-none placeholder:text-zinc-500 focus:border-white/40"
          />
          <button
            type="submit"
            disabled={submitting || code.trim().length < 4}
            className="mt-4 w-full rounded-2xl bg-white py-5 text-xl font-semibold text-zinc-950 disabled:opacity-40"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
          {error && <p className="mt-4 text-center text-red-400">{error}</p>}
        </form>
      </div>
    );
  }

  const courses = OFTPAY_COURSES.filter((c) => access.allowedCourseIds.includes(c.id));
  const label = access.displayName || access.email;
  const summaryByCourse = new Map(summaries.map((s) => [s.courseId, s]));

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-6 py-8">
      <header className="max-w-5xl mx-auto mb-8 flex items-end justify-between gap-4">
        <div>
          <img src="/oftware2.png" alt="Oftware" className="h-8 w-auto object-contain mix-blend-screen" />
          <h1 className="text-3xl font-semibold mt-3">{label}</h1>
        </div>
        <button type="button" onClick={() => void leave()} className="text-sm text-zinc-400 underline">
          Sair
        </button>
      </header>
      <main className="max-w-5xl mx-auto grid gap-4 sm:grid-cols-2">
        {courses.map((course) => {
          const isPurple = course.theme === 'purple';
          return (
            <Link
              key={course.id}
              href={`/carplay/curso/${course.id}`}
              className="flex items-center gap-5 rounded-3xl border border-white/10 bg-zinc-900 px-6 py-7 touch-manipulation"
            >
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${isPurple ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                <BookOpen className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-semibold">{course.name}</h2>
                <p className="mt-1 text-sm text-zinc-300">
                  {summaryByCourse.get(course.id)?.plannerName
                    ? `Planejamento: ${summaryByCourse.get(course.id)?.plannerName}`
                    : 'Sem planejamento salvo'}
                  {' · '}
                  {summaryByCourse.get(course.id)?.progressPercent ?? 0}% assistido
                </p>
              </div>
            </Link>
          );
        })}
        {access.questoesEnabled && (
          <div className="flex items-center gap-5 rounded-3xl border border-white/10 bg-zinc-900/60 px-6 py-7 text-zinc-400">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <ClipboardList className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-zinc-200">Banco de Questões</h2>
              <p className="mt-1 text-sm">Liberado nesta conta. Continua no OftPay com login Google.</p>
            </div>
          </div>
        )}
        {courses.length === 0 && !access.questoesEnabled && (
          <p className="text-zinc-400">Nenhum curso liberado nesta conta.</p>
        )}
      </main>
    </div>
  );
}
