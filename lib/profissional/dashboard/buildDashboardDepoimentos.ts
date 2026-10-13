import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';
import { calcularIdadePaciente } from '@/lib/metaadmin/dashboard/weightEvolutionAnalysis';
import type { DashboardDepoimento } from '@/components/metaadmin/dashboard/DashboardTestimonialCard';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  buildEvolucaoSnapshotParaDepoimento,
  listDepoimentosSlidesFromPlano,
} from '@/utils/conclusaoTratamentoHistorico';

function cidadeEstado(paciente: PacienteCompleto): string | null {
  const cidade = paciente.dadosIdentificacao?.endereco?.cidade?.trim();
  const estado = paciente.dadosIdentificacao?.endereco?.estado?.trim();
  if (cidade && estado) return `${cidade}-${estado}`;
  return cidade || estado || null;
}

export function collectDepoimentoAuthUserIds(pacientes: PacienteCompleto[]): string[] {
  const ids = new Set<string>();
  for (const p of pacientes) {
    const slides = listDepoimentosSlidesFromPlano(
      (p.planoTerapeutico || null) as Record<string, unknown> | null
    );
    if (slides.length === 0) continue;
    if (typeof p.userId === 'string' && isValidFirebaseAuthUid(p.userId)) ids.add(p.userId);
    else if (isValidFirebaseAuthUid(p.id)) ids.add(p.id);
  }
  return [...ids];
}

/** Depoimentos apenas dos pacientes já visíveis ao profissional — não amplia permissão. */
export function buildDashboardDepoimentosFromPacientes(
  pacientes: PacienteCompleto[],
  photoByUserId: Record<string, string | null>
): DashboardDepoimento[] {
  const items: DashboardDepoimento[] = [];
  for (const p of pacientes) {
    const slides = listDepoimentosSlidesFromPlano(
      (p.planoTerapeutico || null) as Record<string, unknown> | null
    );
    if (slides.length === 0) continue;
    const uid =
      typeof p.userId === 'string' && isValidFirebaseAuthUid(p.userId)
        ? p.userId
        : isValidFirebaseAuthUid(p.id)
          ? p.id
          : null;
    const photoUrl = uid ? photoByUserId[uid] ?? null : null;
    const idade = calcularIdadePaciente(p.dadosIdentificacao?.dataNascimento);
    const nome = p.dadosIdentificacao?.nomeCompleto || p.nome || 'Paciente';
    const evolucaoAtual = buildEvolucaoSnapshotParaDepoimento(p.evolucaoSeguimento);
    for (const slide of slides) {
      const evolucao =
        slide.origem === 'atual' && evolucaoAtual.length > 0 ? evolucaoAtual : slide.evolucaoSnapshot;
      items.push({
        instanceKey: `${p.id || p.userId || 'p'}_${slide.key}`,
        pacienteId: p.id || p.userId || '',
        nome,
        cidadeEstado: cidadeEstado(p),
        idade,
        depoimento: slide.texto,
        estrelas: slide.estrelas ?? 0,
        pesoInicialKg: slide.pesoInicialKg,
        pesoAtualKg: slide.pesoAtualKg ?? slide.pesoFinalKg,
        perdaTotalKg: slide.perdaTotalKg,
        perdaPercentual: slide.perdaPercentual,
        evolucao,
        photoUrl,
      });
    }
  }
  return items;
}

export function computeTreatmentTotals(pacientes: PacienteCompleto[]): {
  totalMgAplicado: number;
  totalPesoPerdido: number;
} {
  let totalMgAplicado = 0;
  let totalPesoPerdido = 0;
  for (const paciente of pacientes) {
    const evolucao = paciente.evolucaoSeguimento || [];
    evolucao.forEach((reg) => {
      const qtd = reg.doseAplicada?.quantidade;
      const adesaoOk = reg.adherence !== 'MISSED' && reg.adesao !== 'esquecida';
      if (adesaoOk && typeof qtd === 'number' && qtd > 0) totalMgAplicado += qtd;
    });
    const comPeso = evolucao
      .filter((r) => typeof r.peso === 'number' && r.peso > 0)
      .sort((a, b) => (a.weekIndex || 0) - (b.weekIndex || 0));
    const pesoInicial = comPeso[0]?.peso ?? paciente.dadosClinicos?.medidasIniciais?.peso ?? null;
    const pesoFinal =
      comPeso[comPeso.length - 1]?.peso ??
      paciente.planoTerapeutico?.conclusaoTratamento?.pesoFinalKg ??
      null;
    if (pesoInicial != null && pesoFinal != null && pesoInicial > pesoFinal) {
      totalPesoPerdido += pesoInicial - pesoFinal;
    }
  }
  return { totalMgAplicado, totalPesoPerdido };
}
