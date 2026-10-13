'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Bookmark, Heart, MessageCircle, PenLine, Shield } from 'lucide-react';

type CinquentaKgDepoisIntroScreenProps = {
  onStart: () => void;
};

const STORY_THEMES = [
  'O que você viveu',
  'O que você sentiu',
  'O que ninguém viu',
  'Os momentos em que tentou',
  'Os momentos em que desistiu',
  'O dia em que decidiu tentar novamente',
] as const;

const REASSURANCE = [
  {
    icon: MessageCircle,
    title: 'Sem resposta certa',
    text: 'Escreva como numa conversa.',
  },
  {
    icon: Bookmark,
    title: 'No seu ritmo',
    text: 'Responda aos poucos, quando quiser.',
  },
  {
    icon: Shield,
    title: 'Salvo automaticamente',
    text: 'Seu progresso fica guardado.',
  },
] as const;

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function CinquentaKgDepoisIntroScreen({ onStart }: CinquentaKgDepoisIntroScreenProps) {
  return (
    <div className="pb-8">
      {/* Hero com capa */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl shadow-slate-900/15"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950" />
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative grid gap-5 p-5 sm:grid-cols-[7.5rem_1fr] sm:items-center sm:gap-6 sm:p-6">
          <div className="mx-auto sm:mx-0">
            <div className="relative aspect-[3/4] w-[7.5rem] overflow-hidden rounded-xl border border-white/15 shadow-2xl shadow-black/40 rotate-[-2deg] sm:rotate-[-3deg]">
              <Image
                src="/50kgdepois.jpeg"
                alt="Capa do livro 50 KG DEPOIS"
                fill
                className="object-cover"
                sizes="120px"
                priority
              />
            </div>
          </div>

          <div className="text-center sm:text-left space-y-2">
            <p className="text-[10px] sm:text-xs font-semibold tracking-[0.22em] text-emerald-300/90 uppercase">
              Entrevista biográfica
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold leading-none tracking-tight">
              50 <span className="text-amber-300/95">KG</span> DEPOIS
            </h1>
            <p className="text-sm text-white/75 leading-relaxed max-w-md">
              A história de uma transformação que começou muito antes da balança.
            </p>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">
              <span className="font-medium text-white">153 kg</span>
              <span className="text-white/40">→</span>
              <span className="font-medium text-emerald-300">103 kg</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Carta pessoal */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <PenLine className="h-4 w-4" />
          </div>
          <div className="space-y-3 text-slate-700 text-sm sm:text-[15px] leading-relaxed">
            <p className="text-lg font-semibold text-slate-900 tracking-tight">Antônio,</p>
            <p>
              Antes de escrevermos este livro, precisamos voltar ao começo — não à balança, mas à
              sua história.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 px-3.5 py-3 border border-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                  Não é sobre
                </p>
                <p className="text-slate-600 text-sm">Peso, cardápio ou números na balança.</p>
              </div>
              <div className="rounded-xl bg-emerald-50/80 px-3.5 py-3 border border-emerald-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600/80 mb-1">
                  É sobre
                </p>
                <p className="text-slate-800 text-sm font-medium">O que você viveu e sentiu.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Temas da história */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.14 }}
        className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
          Queremos conhecer
        </p>
        <ul className="space-y-2.5">
          {STORY_THEMES.map((theme, index) => (
            <li key={theme} className="flex items-start gap-3">
              <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                {index + 1}
              </span>
              <span className="text-sm sm:text-[15px] text-slate-700 leading-snug">{theme}.</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Como participar */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="mt-4 grid gap-3 sm:grid-cols-3"
      >
        {REASSURANCE.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm"
          >
            <Icon className="h-4 w-4 text-emerald-600 mb-2" />
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">{text}</p>
          </div>
        ))}
      </motion.div>

      {/* Fechamento */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.26 }}
        className="mt-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 to-white px-5 py-4 sm:px-6"
      >
        <div className="flex gap-3">
          <Heart className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed">
            Algumas perguntas serão fáceis. Outras podem trazer lembranças importantes. Responda
            apenas o que se sentir confortável — suas palavras serão a matéria-prima de uma história
            que pode ajudar outras pessoas a acreditarem que também é possível mudar.
          </p>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        {...fadeUp}
        transition={{ duration: 0.45, delay: 0.32 }}
        className="mt-8 text-center"
      >
        <button
          type="button"
          onClick={onStart}
          className="w-full sm:w-auto min-w-[240px] px-8 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.99]"
        >
          COMEÇAR MINHA HISTÓRIA
        </button>
        <p className="mt-3 text-xs text-slate-400">
          Você não está preenchendo um formulário. Está nos ajudando a contar a sua história.
        </p>
      </motion.div>
    </div>
  );
}
