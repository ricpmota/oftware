/** Fração do mês que, ao soltar, completa a troca. Abaixo disso a grade fica onde parou. */
export const CALENDARIO_MES_SNAP = 0.9;

/** Dias do mês vizinho já presentes na primeira pintura, no celular. */
export const BORDA_DIAS_CALENDARIO = 15;

export type FatiaMesCalendario = {
  ano: number;
  mes: number;
  diaInicio: number;
  diaFim: number;
};

export function diasNoMesCalendario(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

/** Mês atual inteiro, com os últimos 15 dias do anterior e os primeiros 15 do seguinte. */
export function fatiasIniciaisCalendario(base: Date): FatiaMesCalendario[] {
  const ano = base.getFullYear();
  const mes = base.getMonth();
  const anterior = new Date(ano, mes - 1, 1);
  const seguinte = new Date(ano, mes + 1, 1);
  const fimAnterior = diasNoMesCalendario(anterior.getFullYear(), anterior.getMonth());
  const fimSeguinte = diasNoMesCalendario(seguinte.getFullYear(), seguinte.getMonth());
  return [
    {
      ano: anterior.getFullYear(),
      mes: anterior.getMonth(),
      diaInicio: Math.max(1, fimAnterior - (BORDA_DIAS_CALENDARIO - 1)),
      diaFim: fimAnterior,
    },
    { ano, mes, diaInicio: 1, diaFim: diasNoMesCalendario(ano, mes) },
    {
      ano: seguinte.getFullYear(),
      mes: seguinte.getMonth(),
      diaInicio: 1,
      diaFim: Math.min(BORDA_DIAS_CALENDARIO, fimSeguinte),
    },
  ];
}

/**
 * Perto da ponta: completa o mês que está pela metade.
 * Se ele já está inteiro, acrescenta 15 dias do mês seguinte nessa direção.
 */
export function expandirFatiasCalendario(
  fatias: FatiaMesCalendario[],
  direcao: 'cima' | 'baixo'
): FatiaMesCalendario[] {
  if (fatias.length === 0) return fatias;
  const copia = fatias.map((fatia) => ({ ...fatia }));
  if (direcao === 'baixo') {
    const ultima = copia[copia.length - 1];
    const fim = diasNoMesCalendario(ultima.ano, ultima.mes);
    if (ultima.diaFim < fim) {
      ultima.diaFim = fim;
      return copia;
    }
    const proximo = new Date(ultima.ano, ultima.mes + 1, 1);
    const fimProximo = diasNoMesCalendario(proximo.getFullYear(), proximo.getMonth());
    copia.push({
      ano: proximo.getFullYear(),
      mes: proximo.getMonth(),
      diaInicio: 1,
      diaFim: Math.min(BORDA_DIAS_CALENDARIO, fimProximo),
    });
    return copia;
  }
  const primeira = copia[0];
  if (primeira.diaInicio > 1) {
    primeira.diaInicio = 1;
    return copia;
  }
  const anterior = new Date(primeira.ano, primeira.mes - 1, 1);
  const fimAnterior = diasNoMesCalendario(anterior.getFullYear(), anterior.getMonth());
  copia.unshift({
    ano: anterior.getFullYear(),
    mes: anterior.getMonth(),
    diaInicio: Math.max(1, fimAnterior - (BORDA_DIAS_CALENDARIO - 1)),
    diaFim: fimAnterior,
  });
  return copia;
}

export function janelaDasFatiasCalendario(fatias: FatiaMesCalendario[]): { inicio: Date; fim: Date } | null {
  const primeira = fatias[0];
  const ultima = fatias[fatias.length - 1];
  if (!primeira || !ultima) return null;
  const inicio = new Date(primeira.ano, primeira.mes, primeira.diaInicio);
  const fim = new Date(ultima.ano, ultima.mes, ultima.diaFim);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

export function fimDoMesCalendario(ano: number, mes: number): Date {
  const fim = new Date(ano, mes + 1, 0);
  fim.setHours(23, 59, 59, 999);
  return fim;
}

function dataDaChaveJanela(chave: string, fim: boolean): Date {
  const partes = chave.split('-').map(Number);
  const ano = partes[0];
  const mes = partes[1];
  const dia = partes.length >= 3 ? partes[2] : fim ? 0 : 1;
  if (fim && partes.length < 3) return fimDoMesCalendario(ano, mes);
  const data = new Date(ano, mes, dia || 1);
  if (fim) data.setHours(23, 59, 59, 999);
  return data;
}

/** `janela` no formato `ano-mes-dia|ano-mes-dia`, com mês de 0 a 11. */
export function intervaloDaJanelaCalendario(
  base: Date,
  mobile: boolean,
  janela: string | null
): { inicio: Date; fim: Date } {
  if (!mobile) {
    return {
      inicio: new Date(base.getFullYear(), base.getMonth(), 1),
      fim: fimDoMesCalendario(base.getFullYear(), base.getMonth()),
    };
  }
  if (janela) {
    const [a, b] = janela.split('|');
    return { inicio: dataDaChaveJanela(a, false), fim: dataDaChaveJanela(b, true) };
  }
  return janelaDasFatiasCalendario(fatiasIniciaisCalendario(base))!;
}

export function mesesNoIntervaloCalendario(inicio: Date, fim: Date): Array<{ ano: number; mes: number }> {
  const out: Array<{ ano: number; mes: number }> = [];
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const limite = new Date(fim.getFullYear(), fim.getMonth(), 1);
  while (cursor.getTime() <= limite.getTime()) {
    out.push({ ano: cursor.getFullYear(), mes: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

export function distanciaMesesCalendario(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/**
 * `delta` é o quanto a grade andou a partir do mês alinhado.
 * Positivo: dedo para cima, próximo mês entra por baixo.
 * Negativo: mês anterior entra por cima.
 * A referência é a altura do mês que está sendo deixado.
 */
export function direcaoSnapMes(
  delta: number,
  alturaMesAtual: number,
  alturaMesAnterior: number,
  limite = CALENDARIO_MES_SNAP
): -1 | 0 | 1 {
  if (!(limite > 0) || !(limite <= 1)) return 0;
  if (delta > 0 && alturaMesAtual > 0 && delta / alturaMesAtual >= limite) return 1;
  if (delta < 0 && alturaMesAnterior > 0 && -delta / alturaMesAnterior >= limite) return -1;
  return 0;
}
