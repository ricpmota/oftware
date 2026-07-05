/**
 * Geração de texto do laudo de Mapeamento de Retina — parágrafo corrido por olho.
 */

import type {
  EyeSide,
  RetinaFinding,
  RetinaMeiosOpticos,
  RetinaSection,
  RetinaStructuredFindings,
  RetinaStructuredFindingsByEye,
} from '@/types/oftpay/retinaMap';
import {
  RETINA_DMRI_LABELS,
  RETINA_MEIOS_OPTICOS_LABELS,
  RETINA_QUADRANT_LABELS,
  RETINA_QUANTITY_LABELS,
  RETINA_RD_LABELS,
  RETINA_REGION_LABELS,
  RETINA_SECTION_ORDER,
  RETINA_SEVERITY_LABELS,
} from '@/types/oftpay/retinaMap';
import { makeStructuredKey } from '@/lib/oftpay/retinaStructuredMapConfig';

const NORMATIVE_MEIOS_TRANSPARENTE = 'Meios ópticos transparentes.';
const NORMATIVE_DISCO =
  'Disco óptico corado, de contornos nítidos e com relação escavação/disco fisiológica.';
const NORMATIVE_MACULA = 'Mácula de brilho aparentemente fisiológico.';
const NORMATIVE_VASOS = 'Vasos de calibre e trajetos preservados.';
const NORMATIVE_POLO = 'Polo posterior sem alterações significativas.';
const NORMATIVE_PERIFERIA = 'Periferia sem alterações evidentes.';
const NORMATIVE_RETINA = 'Retina aplicada.';

const VITREO_BLOCK_MESSAGE =
  'Fundoscopia prejudicada pela intensa opacidade dos meios ópticos, impossibilitando a adequada avaliação das estruturas retinianas neste olho.';

type AnatomicalBucket = 'meios' | 'disco' | 'macula' | 'vasos' | 'polo' | 'periferia' | 'adicionais';

export function groupFindingsByEye(
  findings: RetinaFinding[]
): Record<EyeSide, RetinaFinding[]> {
  return {
    OD: findings.filter((f) => f.eye === 'OD'),
    OE: findings.filter((f) => f.eye === 'OE'),
  };
}

function ensurePeriod(text: string): string {
  const t = text.trim();
  if (!t) return '';
  return t.endsWith('.') ? t : `${t}.`;
}

function joinSentences(sentences: string[]): string {
  return sentences.filter(Boolean).map(ensurePeriod).join(' ');
}

function joinClauses(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function hasMapForStructuredKey(
  mapFindings: RetinaFinding[],
  section: RetinaSection,
  fieldKey: string
): boolean {
  const key = makeStructuredKey(section, fieldKey);
  return mapFindings.some((f) => f.structuredKey === key);
}

function mapLocationPhrase(finding: RetinaFinding): string {
  const quadrant = RETINA_QUADRANT_LABELS[finding.quadrant];

  if (finding.region === 'periferia') {
    let loc = `em periferia ${quadrant}`;
    if (finding.clockHour != null) {
      loc += ` (aproximadamente às ${finding.clockHour} horas)`;
    }
    return loc;
  }
  if (finding.region === 'macula') return 'em região macular';
  if (finding.region === 'disco') return 'no disco óptico';
  if (finding.region === 'polo_posterior') return 'em polo posterior';

  return `em ${RETINA_REGION_LABELS[finding.region]} ${quadrant}`;
}

function quantityPhrase(finding: RetinaFinding): string {
  if (finding.quantity) return RETINA_QUANTITY_LABELS[finding.quantity];
  if (finding.severity) return RETINA_SEVERITY_LABELS[finding.severity];
  return '';
}

function getAnatomicalBucket(finding: RetinaFinding): AnatomicalBucket {
  if (finding.region === 'disco') return 'disco';
  if (finding.region === 'macula') return 'macula';
  if (finding.region === 'periferia') return 'periferia';
  if (finding.region === 'polo_posterior') return 'polo';

  switch (finding.section) {
    case 'vitreo':
      return 'meios';
    case 'disco':
      return 'disco';
    case 'macula':
      return 'macula';
    case 'vasos':
      return 'vasos';
    case 'periferia':
      return 'periferia';
    case 'achados_especificos':
      return ['microaneurisma', 'hemorragia', 'exsudato', 'nevo', 'cicatriz'].includes(finding.type)
        ? 'polo'
        : 'adicionais';
    default:
      return 'adicionais';
  }
}

function routeMapFindings(findings: RetinaFinding[]): Record<AnatomicalBucket, RetinaFinding[]> {
  const buckets: Record<AnatomicalBucket, RetinaFinding[]> = {
    meios: [],
    disco: [],
    macula: [],
    vasos: [],
    polo: [],
    periferia: [],
    adicionais: [],
  };
  for (const f of findings) {
    buckets[getAnatomicalBucket(f)].push(f);
  }
  return buckets;
}

/** Frase clínica para achado marcado no mapa. */
export function describeMapFinding(finding: RetinaFinding): string {
  const loc = mapLocationPhrase(finding);
  const qty = quantityPhrase(finding);
  const size = finding.size?.trim();
  const notes = finding.notes?.trim();

  let sentence: string;

  switch (finding.type) {
    case 'drusa':
      sentence =
        finding.region === 'macula' || finding.section === 'macula'
          ? 'Presença de pontos amarelados dispersos em região macular, sugestivos de drusas.'
          : `Presença de pontos amarelados ${loc}, sugestivos de drusas.`;
      break;
    case 'lattice':
      sentence = `Presença de degeneração lattice ${loc}.`;
      break;
    case 'rotura':
      sentence = `Presença de rotura retiniana em extrema periferia ${loc.replace(/^em /, '')}.`;
      break;
    case 'buraco':
      sentence = `Presença de buraco atrófico ${loc}.`;
      break;
    case 'hemorragia':
      sentence = qty
        ? `Presença de hemorragias ${qty} ${loc}.`
        : `Presença de hemorragia ${loc}.`;
      break;
    case 'exsudato':
      sentence = qty
        ? `Presença de exsudatos duros ${qty} ${loc}.`
        : `Presença de exsudato duro ${loc}.`;
      break;
    case 'microaneurisma':
      sentence = `Presença de microaneurismas ${loc}.`;
      break;
    case 'edema_macular':
      sentence = `Edema macular ${loc}${qty ? ` (${qty})` : ''}.`;
      break;
    case 'membrana_epirretiniana':
      sentence = `Membrana epirretiniana ${loc}.`;
      break;
    case 'descolamento_retina':
      sentence = `Sinais sugestivos de descolamento de retina ${loc}.`;
      break;
    case 'papiledema':
      sentence = 'Achados compatíveis com papiledema.';
      break;
    case 'atrofia_epr':
      sentence = `Atrofia do epitélio pigmentar da retina ${loc}.`;
      break;
    case 'cicatriz':
      sentence = `Cicatriz corioretiniana ${loc}.`;
      break;
    case 'nevo':
      sentence = `Nevo de coroide/retina ${loc}.`;
      break;
    case 'outros':
      sentence = notes
        ? `Achado adicional ${loc}: ${notes}.`
        : `Achado adicional ${loc}.`;
      break;
    default:
      sentence = `Achado ${loc}.`;
  }

  if (size && finding.type !== 'outros') {
    sentence = sentence.replace(/\.$/, ` (${size}).`);
  }
  if (notes && finding.type !== 'outros' && finding.type !== 'drusa') {
    sentence = sentence.replace(/\.$/, `. ${notes}.`);
  }

  return sentence;
}

function mapFindingGroupKey(finding: RetinaFinding): string {
  if (finding.structuredKey) return finding.structuredKey;
  return `${finding.type}:${finding.section}`;
}

function uniqueLocationPhrases(findings: RetinaFinding[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const f of findings) {
    const loc = mapLocationPhrase(f);
    if (!seen.has(loc)) {
      seen.add(loc);
      result.push(loc);
    }
  }
  return result;
}

function joinLocationPhrases(locations: string[]): string {
  return joinClauses(locations);
}

/** Descreve vários marcadores do mesmo achado sem repetir a mesma frase. */
function describeMapFindingGroup(findings: RetinaFinding[]): string {
  if (findings.length === 0) return '';
  if (findings.length === 1) return describeMapFinding(findings[0]);

  const first = findings[0];
  const locations = uniqueLocationPhrases(findings);
  const allSameLoc = locations.length === 1;
  const locJoined = joinLocationPhrases(locations);
  const loc = locations[0];
  const notes = first.notes?.trim();

  switch (first.type) {
    case 'drusa': {
      if (allSameLoc && (first.region === 'macula' || first.section === 'macula')) {
        return 'Presença de múltiplos pontos amarelados dispersos em região macular, sugestivos de drusas.';
      }
      if (allSameLoc) {
        return `Presença de múltiplos pontos amarelados ${loc}, sugestivos de drusas.`;
      }
      return `Presença de pontos amarelados sugestivos de drusas ${locJoined}.`;
    }
    case 'hemorragia':
      return allSameLoc
        ? `Presença de hemorragias ${loc}.`
        : `Presença de hemorragias ${locJoined}.`;
    case 'exsudato':
      return allSameLoc
        ? `Presença de exsudatos duros ${loc}.`
        : `Presença de exsudatos duros ${locJoined}.`;
    case 'microaneurisma':
      return allSameLoc
        ? `Presença de microaneurismas ${loc}.`
        : `Presença de microaneurismas ${locJoined}.`;
    case 'lattice':
      return allSameLoc
        ? `Presença de degeneração lattice ${loc}.`
        : `Presença de degeneração lattice ${locJoined}.`;
    case 'rotura':
      return allSameLoc
        ? `Presença de roturas retinianas ${loc}.`
        : `Presença de roturas retinianas ${locJoined}.`;
    case 'buraco':
      return allSameLoc
        ? `Presença de buracos atróficos ${loc}.`
        : `Presença de buracos atróficos ${locJoined}.`;
    case 'edema_macular':
      return allSameLoc
        ? `Edema macular ${loc}.`
        : `Edema macular ${locJoined}.`;
    case 'membrana_epirretiniana':
      return allSameLoc
        ? `Membrana epirretiniana ${loc}.`
        : `Membranas epirretinianas ${locJoined}.`;
    case 'descolamento_retina':
      return allSameLoc
        ? `Sinais sugestivos de descolamento de retina ${loc}.`
        : `Sinais sugestivos de descolamento de retina ${locJoined}.`;
    case 'atrofia_epr':
      return allSameLoc
        ? `Atrofia do epitélio pigmentar da retina ${loc}.`
        : `Atrofias do epitélio pigmentar da retina ${locJoined}.`;
    case 'cicatriz':
      return allSameLoc
        ? `Cicatrizes corioretinianas ${loc}.`
        : `Cicatrizes corioretinianas ${locJoined}.`;
    case 'nevo':
      return allSameLoc
        ? `Nevos de coroide/retina ${loc}.`
        : `Nevos de coroide/retina ${locJoined}.`;
    case 'outros':
      if (notes) {
        return allSameLoc ? `${notes} ${loc}.` : `${notes} ${locJoined}.`;
      }
      return allSameLoc
        ? `Múltiplos achados adicionais ${loc}.`
        : `Achados adicionais ${locJoined}.`;
    default: {
      const texts = findings.map(describeMapFinding);
      const unique = [...new Set(texts)];
      if (unique.length === 1) {
        return unique[0]
          .replace(/^Presença de /, 'Presença de múltiplos ')
          .replace(/^Achado /, 'Achados ');
      }
      return joinSentences(unique);
    }
  }
}

/** Agrupa achados do mapa (mesmo structuredKey) e gera frases sem repetição. */
export function describeMapFindingsGrouped(findings: RetinaFinding[]): string {
  if (findings.length === 0) return '';
  if (findings.length === 1) return describeMapFinding(findings[0]);

  const groups = new Map<string, RetinaFinding[]>();
  for (const f of findings) {
    const key = mapFindingGroupKey(f);
    const list = groups.get(key) ?? [];
    list.push(f);
    groups.set(key, list);
  }

  const sentences: string[] = [];
  for (const group of groups.values()) {
    sentences.push(describeMapFindingGroup(group));
  }
  return joinSentences(sentences);
}

/** @deprecated Use describeMapFinding. */
export function describeRetinaFinding(finding: RetinaFinding): string {
  return describeMapFinding(finding);
}

function hasVitreoStructured(v: RetinaStructuredFindings['vitreo']): boolean {
  return !!(
    v.transparente ||
    v.sinereze ||
    v.dpv_parcial ||
    v.dpv_completo ||
    v.hemorragia_vitrea ||
    v.opacidades_vitreas ||
    v.outros?.trim()
  );
}

/** Hemorragia vítrea intensa impede descrição do fundo. */
export function vitreoBlocksFundoscopy(v: RetinaStructuredFindings['vitreo']): boolean {
  return v.hemorragia_vitrea === 'intensa';
}

function buildMeiosSentence(
  v: RetinaStructuredFindings['vitreo'],
  mapFindings: RetinaFinding[]
): string {
  const mapPart = describeMapFindingsGrouped(mapFindings);

  if (!hasVitreoStructured(v)) {
    return mapPart;
  }

  const parts: string[] = [];

  if (v.transparente) {
    parts.push(NORMATIVE_MEIOS_TRANSPARENTE);
  }

  if (v.hemorragia_vitrea === 'leve') {
    parts.push(
      'Discreta opacidade dos meios ópticos por hemorragia vítrea leve, dificultando parcialmente a avaliação das estruturas retinianas.'
    );
  } else if (v.hemorragia_vitrea === 'moderada') {
    parts.push(
      'Moderada opacidade dos meios ópticos por hemorragia vítrea, dificultando parcialmente a avaliação das estruturas retinianas.'
    );
  } else if (v.hemorragia_vitrea === 'intensa') {
    parts.push(
      'Intensa opacidade dos meios ópticos por hemorragia vítrea, impossibilitando a adequada avaliação das estruturas retinianas.'
    );
  } else if (v.opacidades_vitreas) {
    parts.push(
      'Discreta opacidade dos meios ópticos, dificultando parcialmente a avaliação das estruturas retinianas.'
    );
  }

  if (v.sinereze) parts.push('Sinérese vítrea.');
  if (v.dpv_parcial) parts.push('Descolamento posterior do vítreo parcial.');
  if (v.dpv_completo) parts.push('Descolamento posterior do vítreo completo.');
  if (v.outros?.trim()) parts.push(ensurePeriod(v.outros.trim()));

  return joinSentences([...parts, mapPart]);
}

function hasDiscoStructured(d: RetinaStructuredFindings['disco']): boolean {
  return !!(
    d.corado_rosado ||
    d.palido ||
    d.contornos_nitidos ||
    d.contornos_borrados ||
    d.cd_fisiologica ||
    d.cd_aumentada ||
    d.cd_valor != null ||
    d.atrofia_peripapilar ||
    d.crescente_escleral ||
    d.outros?.trim()
  );
}

function isNormativeDisco(d: RetinaStructuredFindings['disco']): boolean {
  return !!(
    (d.corado_rosado || d.contornos_nitidos || d.cd_fisiologica) &&
    !d.palido &&
    !d.contornos_borrados &&
    !d.cd_aumentada &&
    d.cd_valor == null &&
    !d.atrofia_peripapilar &&
    !d.crescente_escleral &&
    !d.outros?.trim()
  );
}

function buildDiscoSentence(
  d: RetinaStructuredFindings['disco'],
  mapFindings: RetinaFinding[]
): string {
  const mapPart = describeMapFindingsGrouped(mapFindings);

  if (!hasDiscoStructured(d)) {
    return mapPart;
  }

  if (isNormativeDisco(d) && mapFindings.length === 0) {
    return NORMATIVE_DISCO;
  }

  const cor = d.palido ? 'pálido' : d.corado_rosado ? 'corado' : 'corado';
  const contornos = d.contornos_borrados
    ? 'de contornos borrados'
    : d.contornos_nitidos
      ? 'de contornos nítidos'
      : 'de contornos nítidos';

  let cd = '';
  if (d.cd_aumentada) cd = 'com relação escavação/disco aumentada';
  else if (d.cd_fisiologica) cd = 'com relação escavação/disco fisiológica';
  else if (d.cd_valor != null) {
    cd = `com relação C/D de ${d.cd_valor.toFixed(1)}`;
    if (d.cd_aumentada) cd += ', aumentada';
  }

  const extras: string[] = [];
  if (d.atrofia_peripapilar && !hasMapForStructuredKey(mapFindings, 'disco', 'atrofia_peripapilar')) {
    extras.push('atrofia peripapilar');
  }
  if (d.crescente_escleral && !hasMapForStructuredKey(mapFindings, 'disco', 'crescente_escleral')) {
    extras.push('crescente escleral');
  }
  if (d.outros?.trim()) extras.push(d.outros.trim());

  const cdPart = cd ? ` e ${cd}` : '';
  let base = `Disco óptico ${cor}, ${contornos}${cdPart}`;
  if (extras.length > 0) base += `, com ${joinClauses(extras)}`;
  base = ensurePeriod(base);

  return joinSentences([base, mapPart]);
}

function hasMaculaStructured(m: RetinaStructuredFindings['macula']): boolean {
  return !!(
    m.reflexo_foveal_presente ||
    m.contornos_preservados ||
    m.alteracoes_pigmentares ||
    m.atrofia ||
    m.drusas ||
    m.edema_intrarretiniano ||
    m.liquido_sub_retiniano ||
    m.hemorragias ||
    m.exsudatos_duros ||
    m.membrana_epirretiniana ||
    m.outros?.trim()
  );
}

function isNormativeMacula(m: RetinaStructuredFindings['macula']): boolean {
  return !!(
    (m.reflexo_foveal_presente || m.contornos_preservados) &&
    !m.alteracoes_pigmentares &&
    !m.atrofia &&
    !m.drusas &&
    !m.edema_intrarretiniano &&
    !m.liquido_sub_retiniano &&
    !m.hemorragias &&
    !m.exsudatos_duros &&
    !m.membrana_epirretiniana &&
    !m.outros?.trim()
  );
}

function buildMaculaSentence(
  m: RetinaStructuredFindings['macula'],
  mapFindings: RetinaFinding[]
): string {
  const mapPart = describeMapFindingsGrouped(mapFindings);

  if (!hasMaculaStructured(m)) {
    return mapPart;
  }

  if (isNormativeMacula(m) && mapFindings.length === 0) {
    return NORMATIVE_MACULA;
  }

  const parts: string[] = [];

  if (m.drusas && !hasMapForStructuredKey(mapFindings, 'macula', 'drusas')) {
    parts.push(
      'Presença de pontos amarelados dispersos em região macular, sugestivos de drusas.'
    );
  }
  if (m.edema_intrarretiniano && !hasMapForStructuredKey(mapFindings, 'macula', 'edema_intrarretiniano')) {
    parts.push('Edema intrarretiniano em região macular.');
  }
  if (m.liquido_sub_retiniano && !hasMapForStructuredKey(mapFindings, 'macula', 'liquido_sub_retiniano')) {
    parts.push('Líquido sub-retiniano em região macular.');
  }
  if (m.hemorragias && !hasMapForStructuredKey(mapFindings, 'macula', 'hemorragias')) {
    parts.push('Hemorragias em região macular.');
  }
  if (m.exsudatos_duros && !hasMapForStructuredKey(mapFindings, 'macula', 'exsudatos_duros')) {
    parts.push('Exsudatos duros em região macular.');
  }
  if (m.membrana_epirretiniana && !hasMapForStructuredKey(mapFindings, 'macula', 'membrana_epirretiniana')) {
    parts.push('Membrana epirretiniana em região macular.');
  }
  if (m.alteracoes_pigmentares && !hasMapForStructuredKey(mapFindings, 'macula', 'alteracoes_pigmentares')) {
    parts.push('Alterações pigmentares em região macular.');
  }
  if (m.atrofia && !hasMapForStructuredKey(mapFindings, 'macula', 'atrofia')) {
    parts.push('Atrofia macular.');
  }
  if ((m.reflexo_foveal_presente || m.contornos_preservados) && parts.length === 0) {
    parts.push(NORMATIVE_MACULA);
  }
  if (m.outros?.trim()) parts.push(ensurePeriod(m.outros.trim()));

  return joinSentences([...parts, mapPart]);
}

function hasVasosStructured(v: RetinaStructuredFindings['vasos']): boolean {
  return !!(
    v.relacao_av_preservada ||
    v.calibre_arterial_preservado ||
    v.calibre_venoso_preservado ||
    v.cruzamentos_av_ausentes ||
    v.cruzamentos_av_presentes ||
    v.esclerose_arteriolar ||
    v.estreitamento_arteriolar ||
    v.tortuosidade_arteriolar ||
    v.hemorragias ||
    v.exsudatos ||
    v.neovascularizacao ||
    v.outros?.trim()
  );
}

function isNormativeVasos(v: RetinaStructuredFindings['vasos']): boolean {
  return !!(
    (v.relacao_av_preservada || v.calibre_arterial_preservado || v.calibre_venoso_preservado) &&
    !v.cruzamentos_av_presentes &&
    !v.esclerose_arteriolar &&
    !v.estreitamento_arteriolar &&
    !v.tortuosidade_arteriolar &&
    !v.hemorragias &&
    !v.exsudatos &&
    !v.neovascularizacao &&
    !v.outros?.trim()
  );
}

function buildVasosSentence(
  v: RetinaStructuredFindings['vasos'],
  mapFindings: RetinaFinding[]
): string {
  const mapPart = describeMapFindingsGrouped(mapFindings);

  if (!hasVasosStructured(v)) {
    return mapPart;
  }

  if (isNormativeVasos(v) && mapFindings.length === 0) {
    return NORMATIVE_VASOS;
  }

  const parts: string[] = [];
  if (v.esclerose_arteriolar) parts.push('esclerose arteriolar');
  if (v.estreitamento_arteriolar) parts.push('estreitamento arteriolar');
  if (v.tortuosidade_arteriolar) parts.push('tortuosidade arteriolar');
  if (v.cruzamentos_av_presentes) parts.push('cruzamentos arteriovenosos');
  if (v.hemorragias && !hasMapForStructuredKey(mapFindings, 'vasos', 'hemorragias')) {
    parts.push('hemorragias');
  }
  if (v.exsudatos && !hasMapForStructuredKey(mapFindings, 'vasos', 'exsudatos')) {
    parts.push('exsudatos');
  }
  if (v.neovascularizacao && !hasMapForStructuredKey(mapFindings, 'vasos', 'neovascularizacao')) {
    parts.push('neovascularização');
  }

  let base = parts.length > 0 ? `Vasos com ${joinClauses(parts)}.` : NORMATIVE_VASOS;
  if (v.outros?.trim()) base = joinSentences([base, ensurePeriod(v.outros.trim())]);

  return joinSentences([base, mapPart]);
}

function buildPoloSentence(
  achados: RetinaStructuredFindings['achados_especificos'],
  mapFindings: RetinaFinding[]
): string {
  const parts: string[] = [];

  const rd = achados.retinopatia_diabetica;
  if (rd && rd !== 'ausente') {
    const grau = RETINA_RD_LABELS[rd].toLowerCase();
    parts.push(
      `Presença de microaneurismas, hemorragias intrarretinianas e/ou exsudatos duros em polo posterior, compatível com retinopatia diabética ${grau}.`
    );
  }

  const dmri = achados.dmri;
  if (dmri && dmri !== 'ausente') {
    parts.push(
      `Achados em região macular/polo posterior compatíveis com ${RETINA_DMRI_LABELS[dmri].toLowerCase()}.`
    );
  }

  const mapPart = describeMapFindingsGrouped(mapFindings);
  if (parts.length === 0 && !mapPart) return '';

  return joinSentences([...parts, mapPart]);
}

function hasPeriferiaStructured(p: RetinaStructuredFindings['periferia']): boolean {
  return !!(
    p.degeneracoes_perifericas ||
    p.lattice ||
    p.buracos_roturas ||
    p.descolamento_retina ||
    p.degeneracao_vitreorretiniana ||
    p.atrofia_periferica ||
    p.outros?.trim()
  );
}

function isNormativePeriferia(p: RetinaStructuredFindings['periferia']): boolean {
  return !!(
    p.retina_aplicada_360 &&
    !p.degeneracoes_perifericas &&
    !p.lattice &&
    !p.buracos_roturas &&
    !p.descolamento_retina &&
    !p.degeneracao_vitreorretiniana &&
    !p.atrofia_periferica &&
    !p.outros?.trim()
  );
}

function buildPeriferiaSentence(
  p: RetinaStructuredFindings['periferia'],
  mapFindings: RetinaFinding[]
): string {
  const mapPart = describeMapFindingsGrouped(mapFindings);

  if (!hasPeriferiaStructured(p)) {
    return mapPart;
  }

  if (isNormativePeriferia(p) && mapFindings.length === 0) {
    return NORMATIVE_PERIFERIA;
  }

  const clauses: string[] = [];
  const sentences: string[] = [];

  if (p.lattice && !hasMapForStructuredKey(mapFindings, 'periferia', 'lattice')) {
    clauses.push('degeneração lattice');
  }
  if (p.buracos_roturas && !hasMapForStructuredKey(mapFindings, 'periferia', 'buracos_roturas')) {
    clauses.push('buracos/roturas');
  }
  if (p.descolamento_retina && !hasMapForStructuredKey(mapFindings, 'periferia', 'descolamento_retina')) {
    clauses.push('descolamento de retina');
  }
  if (p.degeneracoes_perifericas && !hasMapForStructuredKey(mapFindings, 'periferia', 'degeneracoes_perifericas')) {
    clauses.push('degenerações periféricas');
  }
  if (p.degeneracao_vitreorretiniana && !hasMapForStructuredKey(mapFindings, 'periferia', 'degeneracao_vitreorretiniana')) {
    clauses.push('degeneração vitreorretiniana');
  }
  if (p.atrofia_periferica && !hasMapForStructuredKey(mapFindings, 'periferia', 'atrofia_periferica')) {
    clauses.push('atrofia periférica');
  }
  if (p.outros?.trim()) sentences.push(ensurePeriod(p.outros.trim()));

  let base = '';
  if (clauses.length > 0) {
    base = `Periferia com ${joinClauses(clauses)}.`;
  }

  return joinSentences([base, ...sentences, mapPart]);
}

function buildRetinaAplicadaSentence(p: RetinaStructuredFindings['periferia']): string {
  if (!p.retina_aplicada_360 && !p.descolamento_retina) return '';
  if (p.descolamento_retina) {
    return 'Retina com áreas de descolamento.';
  }
  return NORMATIVE_RETINA;
}

function buildAdicionaisSentence(
  achados: RetinaStructuredFindings['achados_especificos'],
  mapFindings: RetinaFinding[]
): string {
  const parts: string[] = [];

  if (achados.outros?.trim()) {
    parts.push(ensurePeriod(achados.outros.trim()));
  }

  const mapPart = describeMapFindingsGrouped(mapFindings);
  return joinSentences([...parts, mapPart]);
}

function buildCondutaSentence(c: RetinaStructuredFindings['conduta']): string {
  const parts: string[] = [];
  if (c.acompanhamento_clinico) parts.push('Acompanhamento clínico.');
  if (c.exames_complementares?.trim()) {
    parts.push(`Exames complementares: ${c.exames_complementares.trim()}.`);
  }
  if (c.retorno_em?.trim()) parts.push(`Retorno em ${c.retorno_em.trim()}.`);
  if (c.tratamento_indicado?.trim()) {
    parts.push(`Tratamento indicado: ${c.tratamento_indicado.trim()}.`);
  }
  if (c.encaminhamento?.trim()) {
    parts.push(`Encaminhamento: ${c.encaminhamento.trim()}.`);
  }
  if (c.outras_recomendacoes?.trim()) {
    parts.push(ensurePeriod(c.outras_recomendacoes.trim()));
  }
  return joinSentences(parts);
}

function describeEyeParagraph(
  structured: RetinaStructuredFindings,
  findings: RetinaFinding[]
): string {
  const buckets = routeMapFindings(findings);

  if (vitreoBlocksFundoscopy(structured.vitreo)) {
    return joinSentences([
      buildMeiosSentence(structured.vitreo, buckets.meios),
      VITREO_BLOCK_MESSAGE,
    ]);
  }

  const sentences = [
    buildMeiosSentence(structured.vitreo, buckets.meios),
    buildDiscoSentence(structured.disco, buckets.disco),
    buildMaculaSentence(structured.macula, buckets.macula),
    buildVasosSentence(structured.vasos, buckets.vasos),
    buildPoloSentence(structured.achados_especificos, buckets.polo),
    buildPeriferiaSentence(structured.periferia, buckets.periferia),
    buildRetinaAplicadaSentence(structured.periferia),
  ];

  const adicionais = buildAdicionaisSentence(
    structured.achados_especificos,
    buckets.adicionais
  );
  if (adicionais) sentences.push(adicionais);

  return joinSentences(sentences.filter((s) => s.trim()));
}

export function eyeHasAnyData(
  structured: RetinaStructuredFindings,
  findings: RetinaFinding[]
): boolean {
  return describeEyeParagraph(structured, findings).trim().length > 0;
}

function isExplicitlyNormalEye(
  structured: RetinaStructuredFindings,
  findings: RetinaFinding[]
): boolean {
  if (findings.length > 0) return false;
  if (vitreoBlocksFundoscopy(structured.vitreo)) return false;

  const v = structured.vitreo;
  const vitreoOk =
    v.transparente &&
    !v.sinereze &&
    !v.dpv_parcial &&
    !v.dpv_completo &&
    !v.hemorragia_vitrea &&
    !v.opacidades_vitreas &&
    !v.outros?.trim();

  return !!(
    vitreoOk &&
    isNormativeDisco(structured.disco) &&
    isNormativeMacula(structured.macula) &&
    isNormativeVasos(structured.vasos) &&
    isNormativePeriferia(structured.periferia) &&
    structured.periferia.retina_aplicada_360 &&
    !hasPoloStructured(structured.achados_especificos) &&
    !buildAdicionaisSentence(structured.achados_especificos, []).trim()
  );
}

function hasPoloStructured(a: RetinaStructuredFindings['achados_especificos']): boolean {
  return !!(
    (a.retinopatia_diabetica && a.retinopatia_diabetica !== 'ausente') ||
    (a.dmri && a.dmri !== 'ausente')
  );
}

function eyeHasAlterations(
  structured: RetinaStructuredFindings,
  findings: RetinaFinding[]
): boolean {
  if (findings.length > 0) return true;
  if (structured.conclusao.alteracoes_conforme_descricao) return true;
  if (vitreoBlocksFundoscopy(structured.vitreo)) return true;

  const v = structured.vitreo;
  if (
    v.sinereze ||
    v.dpv_parcial ||
    v.dpv_completo ||
    v.hemorragia_vitrea ||
    v.opacidades_vitreas ||
    v.outros?.trim()
  ) {
    return true;
  }

  if (hasDiscoStructured(structured.disco) && !isNormativeDisco(structured.disco)) return true;
  if (hasMaculaStructured(structured.macula) && !isNormativeMacula(structured.macula)) return true;
  if (hasVasosStructured(structured.vasos) && !isNormativeVasos(structured.vasos)) return true;
  if (hasPeriferiaStructured(structured.periferia)) return true;

  if (hasPoloStructured(structured.achados_especificos)) return true;
  if (structured.achados_especificos.outros?.trim()) return true;

  return false;
}

function hasRelevantPeripheralFinding(findings: RetinaFinding[]): boolean {
  return findings.some(
    (f) =>
      f.type === 'rotura' ||
      f.type === 'lattice' ||
      f.type === 'buraco' ||
      f.type === 'descolamento_retina' ||
      f.section === 'periferia' ||
      f.region === 'periferia'
  );
}

function hasDiabeticRetinopathy(
  structuredByEye: RetinaStructuredFindingsByEye,
  findings: RetinaFinding[]
): boolean {
  for (const eye of ['OD', 'OE'] as const) {
    const rd = structuredByEye[eye].achados_especificos.retinopatia_diabetica;
    if (rd && rd !== 'ausente') return true;
  }
  return findings.some(
    (f) => f.type === 'microaneurisma' || f.type === 'hemorragia' || f.type === 'exsudato'
  );
}

export function generateRetinaImpression(
  structuredByEye: RetinaStructuredFindingsByEye,
  findings: RetinaFinding[]
): string {
  const byEye = groupFindingsByEye(findings);

  const odHasData = eyeHasAnyData(structuredByEye.OD, byEye.OD);
  const oeHasData = eyeHasAnyData(structuredByEye.OE, byEye.OE);

  if (!odHasData && !oeHasData) {
    return '';
  }

  const odBlocked = vitreoBlocksFundoscopy(structuredByEye.OD.vitreo);
  const oeBlocked = vitreoBlocksFundoscopy(structuredByEye.OE.vitreo);

  if (odBlocked || oeBlocked) {
    const blockedEyes = [
      odBlocked ? 'OD' : null,
      oeBlocked ? 'OE' : null,
    ].filter(Boolean);
    const eyeList = blockedEyes.join(' e ');
    return `Exame de mapeamento de retina limitado pela intensa opacidade dos meios ópticos em ${eyeList}, sem possibilidade de descrição adequada do fundo de olho.`;
  }

  const odAltered = eyeHasAlterations(structuredByEye.OD, byEye.OD);
  const oeAltered = eyeHasAlterations(structuredByEye.OE, byEye.OE);
  const odNormal = isExplicitlyNormalEye(structuredByEye.OD, byEye.OD);
  const oeNormal = isExplicitlyNormalEye(structuredByEye.OE, byEye.OE);

  const odSemAlt = structuredByEye.OD.conclusao.sem_alteracoes;
  const oeSemAlt = structuredByEye.OE.conclusao.sem_alteracoes;

  let text = '';

  if ((odSemAlt && oeSemAlt) || ((odNormal || !odHasData) && (oeNormal || !oeHasData) && !odAltered && !oeAltered)) {
    text = 'Mapeamento de retina sem alterações significativas no momento.';
  } else {
    text = 'Alterações retinianas descritas acima, conforme achados do exame.';
  }

  const comments = [structuredByEye.OD.conclusao.comentarios, structuredByEye.OE.conclusao.comentarios]
    .filter((c) => c?.trim())
    .map((c) => ensurePeriod(c!.trim()));
  if (comments.length > 0) {
    text = joinSentences([text, ...comments]);
  }

  const needsSpecialist =
    hasRelevantPeripheralFinding(findings) || hasDiabeticRetinopathy(structuredByEye, findings);

  if (needsSpecialist) {
    text +=
      ' Achado periférico relevante, sugerindo necessidade de avaliação/conduta especializada conforme julgamento clínico.';
  }

  return text;
}

export interface GenerateRetinaReportOptions {
  structured: RetinaStructuredFindingsByEye;
}

/** Mantido para compatibilidade com overlay legado do mapa. */
export function describeMeiosOpticos(value: RetinaMeiosOpticos): string {
  const label = RETINA_MEIOS_OPTICOS_LABELS[value].toLowerCase();
  if (value === 'transparentes') return 'Meios ópticos transparentes.';
  if (value.startsWith('hemorragia_vitrea')) {
    return `Opacidade dos meios ópticos por ${label}, dificultando parcialmente a avaliação das estruturas retinianas.`;
  }
  if (value.startsWith('opacidades')) {
    return 'Discreta opacidade dos meios ópticos, dificultando parcialmente a avaliação das estruturas retinianas.';
  }
  return `Meios ópticos com ${label}.`;
}

export function generateRetinaReport(
  findings: RetinaFinding[],
  options: GenerateRetinaReportOptions
): string {
  const byEye = groupFindingsByEye(findings);
  const lines: string[] = ['LAUDO DE MAPEAMENTO DE RETINA', ''];

  for (const eye of ['OD', 'OE'] as const) {
    const paragraph = describeEyeParagraph(options.structured[eye], byEye[eye]);
    lines.push(`${eye}:`);
    lines.push(paragraph || '—');
    lines.push('');
  }

  const condutaOd = buildCondutaSentence(options.structured.OD.conduta);
  const condutaOe = buildCondutaSentence(options.structured.OE.conduta);
  const conduta = joinSentences(
    [condutaOd, condutaOe].filter((c, i, arr) => c && arr.indexOf(c) === i)
  );

  const impression = generateRetinaImpression(options.structured, findings);
  if (impression) {
    lines.push('Impressão:');
    lines.push(impression);
  }

  if (conduta) {
    lines.push('');
    lines.push('Conduta:');
    lines.push(conduta);
  }

  return lines.join('\n').trim();
}

function sectionHasStructuredOrMap(
  section: RetinaSection,
  structured: RetinaStructuredFindings,
  findings: RetinaFinding[]
): boolean {
  const buckets = routeMapFindings(findings);

  switch (section) {
    case 'vitreo':
      return hasVitreoStructured(structured.vitreo) || buckets.meios.length > 0;
    case 'disco':
      return hasDiscoStructured(structured.disco) || buckets.disco.length > 0;
    case 'macula':
      return hasMaculaStructured(structured.macula) || buckets.macula.length > 0;
    case 'vasos':
      return hasVasosStructured(structured.vasos) || buckets.vasos.length > 0;
    case 'periferia':
      return (
        hasPeriferiaStructured(structured.periferia) ||
        structured.periferia.retina_aplicada_360 ||
        buckets.periferia.length > 0
      );
    case 'achados_especificos': {
      const a = structured.achados_especificos;
      return !!(
        (a.retinopatia_diabetica && a.retinopatia_diabetica !== 'ausente') ||
        (a.dmri && a.dmri !== 'ausente') ||
        a.outros?.trim() ||
        buckets.polo.length > 0 ||
        buckets.adicionais.length > 0
      );
    }
    case 'conclusao':
      return !!(
        structured.conclusao.sem_alteracoes ||
        structured.conclusao.alteracoes_conforme_descricao ||
        structured.conclusao.comentarios?.trim()
      );
    case 'conduta':
      return !!buildCondutaSentence(structured.conduta);
    default:
      return false;
  }
}

export function getCompletedSections(
  structured: RetinaStructuredFindings,
  findings: RetinaFinding[]
): Set<RetinaSection> {
  const completed = new Set<RetinaSection>();

  for (const section of RETINA_SECTION_ORDER) {
    if (sectionHasStructuredOrMap(section, structured, findings)) {
      completed.add(section);
    }
  }

  return completed;
}
