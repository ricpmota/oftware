'use client';

import { useWhiteLabelCrmTheme } from '@/components/crm/whiteLabel/WhiteLabelCrmProvider';
import { getWhiteLabelLeadQuestions } from '@/lib/whiteLabel/leadWhiteLabelQuestions';
import {
  getLeadWhiteLabelInstagramUrl,
  formatLeadWhiteLabelContactDisplay,
} from '@/lib/whiteLabel/leadWhiteLabelNormalize';
import { whiteLabelProfissaoLabel } from '@/lib/whiteLabel/profissao';
import type { LeadWhiteLabel } from '@/types/leadWhiteLabel';

const QUALIFYING_KEYS = [
  'situacaoProfissional',
  'objetivo3Anos',
  'interesseReduzirPlantao',
  'interessePlataformaMarca',
  'pacientesMes',
  'realidadeAtual',
  'interesseExperienciaDigital',
  'familiaridadeTecnologia',
  'investimentoDisponivel',
  'prazoInicio',
  'faturamentoEsperado',
] as const;

type Props = {
  lead: LeadWhiteLabel;
};

export default function LeadWhiteLabelQuestionnairePanel({ lead }: Props) {
  const t = useWhiteLabelCrmTheme();
  const questions = getWhiteLabelLeadQuestions(lead.profissao || 'medico', {
    includeProfissaoQuestion: false,
  });
  const labelByKey = new Map(questions.map((q) => [q.key, q.label]));
  const instagramUrl = getLeadWhiteLabelInstagramUrl(lead.instagram);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div className={`${t.infoBox} rounded-lg p-3`}>
          <p className={`text-[10px] ${t.textSubtle}`}>Profissão</p>
          <p className={t.textPrimary}>{whiteLabelProfissaoLabel(lead.profissao || 'medico')}</p>
        </div>
        <div className={`${t.infoBox} rounded-lg p-3`}>
          <p className={`text-[10px] ${t.textSubtle}`}>Instagram</p>
          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${t.textPrimary} underline break-all text-xs`}
            >
              {lead.instagram || '—'}
            </a>
          ) : (
            <p className={`${t.textPrimary} break-all text-xs`}>{lead.instagram || '—'}</p>
          )}
        </div>
        <div className={`${t.infoBox} rounded-lg p-3`}>
          <p className={`text-[10px] ${t.textSubtle}`}>WhatsApp (formulário)</p>
          <p className={t.textPrimary}>{formatLeadWhiteLabelContactDisplay(lead)}</p>
        </div>
        <div className={`${t.infoBox} rounded-lg p-3`}>
          <p className={`text-[10px] ${t.textSubtle}`}>E-mail (formulário)</p>
          <p className={`${t.textPrimary} break-all text-xs`}>{lead.email || '—'}</p>
        </div>
      </div>

      <div className={`rounded-xl border ${t.panelBorder} ${t.infoBox} p-3 space-y-0`}>
        <p className={`text-xs font-semibold ${t.textMuted} uppercase mb-2`}>
          Respostas do /whitelabel
        </p>
        {QUALIFYING_KEYS.map((key) => {
          const value = (lead[key] || '').trim();
          if (!value) return null;
          return (
            <div
              key={key}
              className={`grid grid-cols-1 gap-1 py-2.5 border-b ${t.divider} last:border-0`}
            >
              <p className={`text-[11px] leading-snug ${t.textSubtle}`}>
                {labelByKey.get(key) || key}
              </p>
              <p className={`text-sm ${t.textPrimary}`}>{value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
