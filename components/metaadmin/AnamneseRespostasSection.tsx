'use client';

import { useState } from 'react';
import { Edit } from 'lucide-react';
import type { DadosClinicos, PacienteCompleto } from '@/types/obesidade';
import { buildAnamneseV2Cards } from '@/lib/meta/anamneseV2Display';
import { AnamneseIcons } from '@/components/metaadmin/paciente-modal/anamneseSectionUi';
import { AnamneseV2CardEditModal } from '@/components/metaadmin/AnamneseV2CardEditModal';
import type { AnamneseV2SectionId } from '@/components/meta/AnamneseV2EditUI';

const CARD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  motivacao: AnamneseIcons.motivacao,
  diagnostico: AnamneseIcons.diagnostico,
  comorbidades: AnamneseIcons.comorbidades,
  medicacoes: AnamneseIcons.medicacoes,
  alergias: AnamneseIcons.alergias,
  riscos: AnamneseIcons.riscos,
  tireoide: AnamneseIcons.tireoide,
  sintomasGi: AnamneseIcons.sintomasGi,
};

type Props = {
  paciente: PacienteCompleto;
  dadosClinicos?: DadosClinicos;
  setPaciente?: React.Dispatch<React.SetStateAction<PacienteCompleto | null>>;
  className?: string;
};

export function AnamneseRespostasSection({
  paciente,
  dadosClinicos,
  setPaciente,
  className = '',
}: Props) {
  const cards = buildAnamneseV2Cards(dadosClinicos, paciente.dadosIdentificacao?.sexoBiologico);
  const [cardEmEdicao, setCardEmEdicao] = useState<{ id: AnamneseV2SectionId; title: string } | null>(null);

  return (
    <section className={className}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = CARD_ICONS[card.id] || AnamneseIcons.diagnostico;
          return (
            <article
              key={card.id}
              className="rounded-lg border border-gray-200/90 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/80"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <h5 className="min-w-0 flex-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{card.title}</h5>
                {setPaciente && (
                  <button
                    type="button"
                    onClick={() => setCardEmEdicao({ id: card.id as AnamneseV2SectionId, title: card.title })}
                    className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-violet-700 dark:hover:bg-gray-700 dark:hover:text-violet-300"
                    aria-label={`Editar ${card.title}`}
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
              </div>
              {card.informed && card.chips.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {card.chips.map((chip, chipIdx) => (
                    <span
                      key={`${card.id}-${chipIdx}-${chip}`}
                      className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Não informado</p>
              )}
            </article>
          );
        })}
      </div>

      {cardEmEdicao && setPaciente && (
        <AnamneseV2CardEditModal
          open
          sectionId={cardEmEdicao.id}
          cardTitle={cardEmEdicao.title}
          paciente={paciente}
          onClose={() => setCardEmEdicao(null)}
          onSave={(atualizado) => {
            setPaciente(atualizado);
            setCardEmEdicao(null);
          }}
        />
      )}
    </section>
  );
}
