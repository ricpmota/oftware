/**

 * Escalonamento em escadinha simétrica: pico no meio do período, +2,5 mg/bloco.

 * Lento = blocos de 4 semanas · Agressivo = blocos de 2 semanas · teto 15 mg.

 */

export const DOSE_ESCALONAMENTO_MAX_MG = 15;

export const INCREMENTO_DOSE_ESCALONAMENTO_MG = 2.5;



export const PERDA_SEMANAL_MIN_KG = 0.7;

export const PERDA_SEMANAL_MAX_KG = 1.3;

export const PERDA_SEMANAL_MEDIA_KG =

  Math.round(((PERDA_SEMANAL_MIN_KG + PERDA_SEMANAL_MAX_KG) / 2) * 10) / 10;



export function arredondarDoseMg(dose: number): number {

  return Math.round(dose * 10) / 10;

}



export function limitarDoseEscalonamentoMg(dose: number): number {

  return arredondarDoseMg(Math.min(DOSE_ESCALONAMENTO_MAX_MG, Math.max(0, dose)));

}



function niveisAscendentes(doseInicialMg: number): number[] {

  const base = limitarDoseEscalonamentoMg(doseInicialMg);

  const step = INCREMENTO_DOSE_ESCALONAMENTO_MG;

  const niveis = [base];

  let d = base;

  while (d + step <= DOSE_ESCALONAMENTO_MAX_MG) {

    d = limitarDoseEscalonamentoMg(d + step);

    niveis.push(d);

    if (d >= DOSE_ESCALONAMENTO_MAX_MG) break;

  }

  return niveis;

}



/** Índice de nível por bloco: sobe do início ao meio e desce simetricamente. */

export function indicesNivelPorBloco(numBlocos: number): number[] {

  const n = Math.max(1, Math.round(numBlocos));

  const indices: number[] = [];

  for (let b = 0; b < n; b++) {

    indices.push(Math.min(b, n - 1 - b));

  }

  return indices;

}



/**

 * Pirâmide com pico no centro do período (ex.: mês 2 em 3 meses; meses 3–4 em 6 meses).

 */

export function montarPiramideCentral(

  doseInicialMg: number,

  totalSemanas: number,

  blocoSemanas: number

): number[] {

  const base = limitarDoseEscalonamentoMg(doseInicialMg);

  const total = Math.max(1, Math.round(totalSemanas));

  const bloco = Math.max(1, Math.round(blocoSemanas));

  const niveis = niveisAscendentes(base);

  const numBlocos = Math.max(1, Math.ceil(total / bloco));

  const nivelPorBloco = indicesNivelPorBloco(numBlocos);



  const doses: number[] = [];

  for (let s = 0; s < total; s++) {

    const blocoIdx = Math.min(Math.floor(s / bloco), numBlocos - 1);

    const nivelIdx = Math.min(nivelPorBloco[blocoIdx], niveis.length - 1);

    doses.push(niveis[nivelIdx]);

  }

  return doses;

}



/**

 * Monta fase de escalonamento (pirâmide centrada no período informado).

 */

export function montarEscadinhaDose(

  doseInicialMg: number,

  semanasEscalacao: number,

  blocoSemanas: number

): number[] {

  return montarPiramideCentral(doseInicialMg, semanasEscalacao, blocoSemanas);

}



/**

 * Plano completo: pirâmide centrada no prazo total (desmame = descida final à dose inicial).

 */

export function montarDosesComDesmame(

  doseInicialMg: number,

  totalSemanas: number,

  _semanasDesmame: number,

  blocoSemanas: number

): number[] {

  return montarPiramideCentral(doseInicialMg, totalSemanas, blocoSemanas);

}


