import type { DadosClinicos, Medicacao } from '@/types/obesidade';
import {
  COMORBIDADES_OPTIONS,
  DIAGNOSTICO_LABELS,
  MOTIVACAO_OPTIONS,
  SINTOMAS_GI_OPTIONS,
  TIREOIDE_OPTIONS,
  filterRiskQuestionsForSexo,
  riskOptionLabel,
} from '@/lib/meta/metaChatInicial';

export type AnamneseV2CardData = {
  id: string;
  title: string;
  chips: string[];
  informed: boolean;
};

const MED_CATEGORIA: Record<Medicacao['categoria'], string> = {
  metformina: 'Metformina',
  sglt2i: 'SGLT2i (dapagliflozina/empagliflozina)',
  insulina: 'Insulina basal/bolus',
  statina: 'Estatina',
  anti_hipertensivo: 'Anti-hipertensivo (IECA/BRA, BCC, tiazídico)',
  antidepressivo: 'Antidepressivo/ansiolítico',
  outro: 'Outro',
};

function formatMedicacaoChip(med: Medicacao): string {
  const cat = MED_CATEGORIA[med.categoria] || med.categoria;
  const parts = [cat];
  if (med.nomeFarmaco?.trim()) parts.push(med.nomeFarmaco.trim());
  const detalhe = [med.dose, med.frequencia].filter(Boolean).join(' · ');
  if (detalhe) parts.push(`(${detalhe})`);
  return parts.join(' — ');
}

export function buildAnamneseV2Cards(
  dc?: DadosClinicos,
  sexo?: string
): AnamneseV2CardData[] {
  const motivacaoChips: string[] = [];
  const m = (dc?.motivacao || {}) as Record<string, boolean>;
  MOTIVACAO_OPTIONS.forEach(({ key, label }) => {
    if (m[key]) motivacaoChips.push(label);
  });
  if (m.outro && dc?.motivacaoOutro?.trim()) {
    motivacaoChips.push(dc.motivacaoOutro.trim());
  }

  const diagChips: string[] = [];
  const dcAny = dc as { diagnosticoPrincipalTipos?: string[] } | undefined;
  const tipos =
    dcAny?.diagnosticoPrincipalTipos ||
    (dc?.diagnosticoPrincipal?.tipo ? [dc.diagnosticoPrincipal.tipo] : []);
  tipos.forEach((t) => {
    const lab = DIAGNOSTICO_LABELS[t] || t;
    if (t === 'outro' && dc?.diagnosticoPrincipal?.outro?.trim()) {
      diagChips.push(dc.diagnosticoPrincipal.outro.trim());
    } else {
      diagChips.push(lab);
    }
  });

  const comorbChips: string[] = [];
  const c = (dc?.comorbidades || {}) as Record<string, unknown>;
  COMORBIDADES_OPTIONS.forEach(({ key, label }) => {
    if (c[key]) comorbChips.push(label);
  });
  if (c.outra && typeof c.outraDescricao === 'string' && c.outraDescricao.trim()) {
    comorbChips.push(c.outraDescricao.trim());
  }

  const medChips = (dc?.medicacoesUsoAtual || [])
    .filter((med) => med.categoria || med.nomeFarmaco?.trim())
    .map(formatMedicacaoChip);

  const alergiaChips: string[] = [];
  const a = dc?.alergias;
  if (a?.semAlergias) alergiaChips.push('Sem alergias conhecidas');
  if (a?.medicamentosa) {
    const farm = a.medicamentosa.farmaco?.trim();
    const reac = a.medicamentosa.reacao?.trim();
    alergiaChips.push(
      farm || reac
        ? `Medicamentosa: ${[farm, reac].filter(Boolean).join(' — ')}`
        : 'Medicamentosa'
    );
  }
  if (a?.alimento?.trim()) alergiaChips.push(`Alimento: ${a.alimento.trim()}`);
  if (a?.latexAdesivo?.trim()) alergiaChips.push(`Látex/adesivo: ${a.latexAdesivo.trim()}`);

  const riscoChips: string[] = [];
  const riscos = dc?.riscos as Record<string, string> | undefined;
  filterRiskQuestionsForSexo(sexo).forEach((q) => {
    const v = riscos?.[q.key];
    if (v) riscoChips.push(`${q.label}: ${riskOptionLabel(v)}`);
  });

  const tireoideChips: string[] = [];
  if (dc?.historiaTireoidiana) {
    const opt = TIREOIDE_OPTIONS.find((o) => o.value === dc.historiaTireoidiana);
    if (dc.historiaTireoidiana === 'outro' && dc.historiaTireoidianaOutro?.trim()) {
      tireoideChips.push(dc.historiaTireoidianaOutro.trim());
    } else {
      tireoideChips.push(opt?.label || dc.historiaTireoidiana);
    }
  }

  const giChips: string[] = [];
  const gi = (dc?.sintomasGI || {}) as Record<string, boolean>;
  SINTOMAS_GI_OPTIONS.forEach(({ key, label }) => {
    if (gi[key]) giChips.push(label);
  });

  return [
    { id: 'motivacao', title: 'Motivação em relação ao peso', chips: motivacaoChips, informed: motivacaoChips.length > 0 },
    { id: 'diagnostico', title: 'Diagnóstico Principal', chips: diagChips, informed: diagChips.length > 0 },
    { id: 'comorbidades', title: 'Comorbidades Associadas', chips: comorbChips, informed: comorbChips.length > 0 },
    { id: 'medicacoes', title: 'Medicações em uso atual', chips: medChips, informed: medChips.length > 0 },
    { id: 'alergias', title: 'Alergias', chips: alergiaChips, informed: alergiaChips.length > 0 },
    {
      id: 'riscos',
      title: 'Riscos e condições que impactam a tirzepatida',
      chips: riscoChips,
      informed: riscoChips.length > 0,
    },
    { id: 'tireoide', title: 'História tireoidiana', chips: tireoideChips, informed: tireoideChips.length > 0 },
    {
      id: 'sintomasGi',
      title: 'Sintomas basais relacionados ao trato GI',
      chips: giChips,
      informed: giChips.length > 0,
    },
  ];
}
