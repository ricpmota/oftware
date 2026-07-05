import type { DadosClinicos, PerfilMetabolicoV3 } from '@/types/obesidade';
import {
  blocoAlimentacaoCompleto,
  blocoAtividadeCompleto,
  blocoBarreirasCompleto,
  blocoEnergiaCompleto,
  blocoExpectativaCompleto,
  blocoHistoricoCompleto,
  blocoMedicamentosCompleto,
  blocoSonoCompleto,
} from '@/lib/meta/perfilMetabolicoV3Chat';

const SIM_NAO: Record<string, string> = {
  sim: 'Sim',
  nao: 'Não',
  as_vezes: 'Às vezes',
  nao_sei: 'Não sei',
  nao_aplicavel: 'Não se aplica',
};

const QUALIDADE_SONO: Record<string, string> = {
  muito_bom: 'Muito bom',
  bom: 'Bom',
  regular: 'Regular',
  ruim: 'Ruim',
  muito_ruim: 'Muito ruim',
};

const HORAS_SONO: Record<string, string> = {
  menos_5: 'Menos de 5 h',
  '5_6': '5–6 h',
  '7_8': '7–8 h',
  mais_8: 'Mais de 8 h',
};

const ROTINA: Record<string, string> = {
  sedentario: 'Sedentário',
  leve: 'Leve',
  moderada: 'Moderada',
  intensa: 'Intensa',
};

const MOMENTO_ALIM: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  fim_de_semana: 'Fim de semana',
};

const ENERGIA_NIVEL: Record<string, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
  muito_baixa: 'Muito baixa',
};

const EXPECTATIVA_PESO: Record<string, string> = {
  ate_5kg: 'Até 5 kg',
  '5_10kg': '5–10 kg',
  '10_15kg': '10–15 kg',
  mais_15kg: 'Mais de 15 kg',
  nao_sei: 'Ainda não sabe',
};

const MEDICACOES: Record<string, string> = {
  semaglutida: 'Semaglutida',
  tirzepatida: 'Tirzepatida',
  sibutramina: 'Sibutramina',
  orlistate: 'Orlistate',
  outro: 'Outro',
  nenhuma: 'Nenhuma',
};

const DIFICULDADES_ATIV: Record<string, string> = {
  faltaTempo: 'Falta de tempo',
  dor: 'Dor',
  desanimo: 'Desânimo',
  nenhuma: 'Nenhuma',
};

const BARREIRAS_ENERGIA: Record<string, string> = {
  faltaTempo: 'Falta de tempo',
  faltaMotivacao: 'Falta de motivação',
  faltaPlanejamento: 'Falta de planejamento',
  faltaApoio: 'Falta de apoio',
  nenhuma: 'Nenhuma',
};

const BARREIRAS_ADESAO: Record<string, string> = {
  faltaTempo: 'Falta de tempo',
  faltaMotivacao: 'Falta de motivação',
  custo: 'Custo',
  efeitosColaterais: 'Efeitos colaterais',
  rotinaCorrida: 'Rotina corrida',
  faltaApoio: 'Falta de apoio',
  nenhuma: 'Nenhuma',
  outro: 'Outro',
};

function flagsToChips(obj: Record<string, boolean> | undefined, labels: Record<string, string>): string[] {
  if (!obj) return [];
  return Object.entries(obj)
    .filter(([k, v]) => v && k !== 'outroDescricao')
    .map(([k]) => labels[k] || k);
}

export type PerfilMetabolicoCardData = {
  id: string;
  title: string;
  chips: string[];
  informed: boolean;
};

export function buildPerfilMetabolicoCards(pm?: PerfilMetabolicoV3): PerfilMetabolicoCardData[] {
  const s = pm?.sono;
  const sonoChips: string[] = [];
  if (s?.qualidadeSono) sonoChips.push(QUALIDADE_SONO[s.qualidadeSono] || s.qualidadeSono);
  if (s?.horasSonoMedias) sonoChips.push(HORAS_SONO[s.horasSonoMedias] || s.horasSonoMedias);
  if (s?.acordaCansado) sonoChips.push(`Acorda cansado: ${SIM_NAO[s.acordaCansado] || s.acordaCansado}`);
  if (s?.ronca) sonoChips.push(`Ronca: ${SIM_NAO[s.ronca] || s.ronca}`);
  if (s?.acordaDuranteNoite) sonoChips.push(`Acorda à noite: ${SIM_NAO[s.acordaDuranteNoite] || s.acordaDuranteNoite}`);

  const a = pm?.atividadeFisica;
  const ativChips: string[] = [];
  if (a?.rotinaMovimento) ativChips.push(ROTINA[a.rotinaMovimento] || a.rotinaMovimento);
  ativChips.push(...flagsToChips(a?.dificuldades, DIFICULDADES_ATIV));

  const ali = pm?.alimentacao;
  const aliChips: string[] = [];
  if (ali?.momentoMaisDificil) aliChips.push(`Momento difícil: ${MOMENTO_ALIM[ali.momentoMaisDificil] || ali.momentoMaisDificil}`);
  if (ali?.vontadeDoces) aliChips.push(`Doces: ${SIM_NAO[ali.vontadeDoces]}`);
  if (ali?.beliscaEntreRefeicoes) aliChips.push(`Belisca: ${SIM_NAO[ali.beliscaEntreRefeicoes]}`);
  if (ali?.comeAnsiedadeEstresse) aliChips.push(`Ansiedade/estresse: ${SIM_NAO[ali.comeAnsiedadeEstresse]}`);
  if (ali?.perdaControleAlimentar) aliChips.push(`Perda de controle: ${SIM_NAO[ali.perdaControleAlimentar]}`);

  const e = pm?.energia;
  const energiaChips: string[] = [];
  if (e?.nivelEnergiaDiaria) energiaChips.push(`Energia: ${ENERGIA_NIVEL[e.nivelEnergiaDiaria] || e.nivelEnergiaDiaria}`);
  energiaChips.push(...flagsToChips(e?.barreirasRotina, BARREIRAS_ENERGIA));

  const h = pm?.historicoEmagrecimento;
  const histChips: string[] = [];
  if (h?.jaTentouEmagrecer) histChips.push(`Já tentou: ${SIM_NAO[h.jaTentouEmagrecer] || h.jaTentouEmagrecer}`);
  if (h?.recuperouPesoDepois) histChips.push(`Recuperou peso: ${SIM_NAO[h.recuperouPesoDepois] || h.recuperouPesoDepois}`);

  const m = pm?.medicamentosPrevios;
  const medChips: string[] = [];
  if (m?.usouMedicacaoParaEmagrecer) {
    medChips.push(`Usou medicação: ${SIM_NAO[m.usouMedicacaoParaEmagrecer] || m.usouMedicacaoParaEmagrecer}`);
    if (m.usouMedicacaoParaEmagrecer === 'sim') {
      medChips.push(...flagsToChips(m.medicacoes, MEDICACOES));
      if (m.teveEfeitosColaterais) medChips.push(`Efeitos colaterais: ${SIM_NAO[m.teveEfeitosColaterais]}`);
    }
  }

  const barChips = flagsToChips(pm?.barreirasAdesao, BARREIRAS_ADESAO);
  if (pm?.barreirasAdesao?.outroDescricao?.trim()) barChips.push(pm.barreirasAdesao.outroDescricao.trim());

  const exp = pm?.expectativa;
  const expChips: string[] = [];
  if (exp?.expectativaPerdaPeso) {
    expChips.push(EXPECTATIVA_PESO[exp.expectativaPerdaPeso] || exp.expectativaPerdaPeso);
  }

  return [
    { id: 'sono', title: 'Sono', chips: sonoChips, informed: blocoSonoCompleto(pm) },
    { id: 'atividade', title: 'Atividade física', chips: ativChips, informed: blocoAtividadeCompleto(pm) },
    { id: 'alimentacao', title: 'Alimentação', chips: aliChips, informed: blocoAlimentacaoCompleto(pm) },
    { id: 'energia', title: 'Energia', chips: energiaChips, informed: blocoEnergiaCompleto(pm) },
    {
      id: 'historico',
      title: 'Histórico de emagrecimento',
      chips: histChips,
      informed: blocoHistoricoCompleto(pm),
    },
    {
      id: 'medicamentos',
      title: 'Medicamentos prévios',
      chips: medChips,
      informed: blocoMedicamentosCompleto(pm),
    },
    { id: 'barreiras', title: 'Barreiras de adesão', chips: barChips, informed: blocoBarreirasCompleto(pm) },
    {
      id: 'expectativa',
      title: 'Expectativa de perda de peso',
      chips: expChips,
      informed: blocoExpectativaCompleto(pm),
    },
  ];
}

export function getTipoAvaliacaoBadge(
  _tipo?: DadosClinicos['tipoAvaliacaoInicial']
): { label: string; className: string } {
  return {
    label: 'Perfil metabólico completo',
    className: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800',
  };
}
