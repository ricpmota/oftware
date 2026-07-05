import type {
  CampoAlteradoAuditoria,
  ParametrosPlanoPersonalizadoEditavel,
} from '@/lib/treatment-negotiation/types';

function serializar(valor: unknown): string {
  if (valor === null || valor === undefined) return '—';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
}

const CAMPOS_AUDITORIA: (keyof ParametrosPlanoPersonalizadoEditavel)[] = [
  'nomePlano',
  'descricaoCurta',
  'observacoesMedico',
  'pesoAtualKg',
  'metaKg',
  'pesoAlvoKg',
  'percentualEstimado',
  'semanasPrazo',
  'mesesPrazo',
  'dataInicioEstimada',
  'dataTerminoEstimada',
  'doseMensalMg',
  'ritmoEscalonamento',
  'aplicacoesTotal',
  'aplicacoesFrequencia',
  'custoPorKit',
  'consultas',
  'consultasFrequencia',
  'consultasValorUnitario',
  'consultasValorTotalManual',
  'bioimpedancias',
  'bioFrequencia',
  'bioValorUnitario',
  'bioValorTotalManual',
  'exames',
  'examesDescricao',
  'examesValorTotalManual',
  'consolidacaoHabilitada',
  'consolidacaoSemanas',
  'estrategiaPosMeta',
  'consolidacaoObservacao',
  'modoRecalculo',
  'descontoManual',
];

export function diffParametrosNegociacao(
  anterior: ParametrosPlanoPersonalizadoEditavel | null,
  atual: ParametrosPlanoPersonalizadoEditavel
): CampoAlteradoAuditoria[] {
  if (!anterior) return [{ campo: 'plano', valorAnterior: '—', valorNovo: 'criado' }];

  const alterados: CampoAlteradoAuditoria[] = [];

  for (const campo of CAMPOS_AUDITORIA) {
    const va = anterior[campo];
    const vb = atual[campo];
    if (serializar(va) !== serializar(vb)) {
      alterados.push({
        campo,
        valorAnterior: serializar(va),
        valorNovo: serializar(vb),
      });
    }
  }

  const dosesAnt = JSON.stringify(anterior.dosesSemanais);
  const dosesNov = JSON.stringify(atual.dosesSemanais);
  if (dosesAnt !== dosesNov) {
    alterados.push({
      campo: 'dosesSemanais',
      valorAnterior: `${anterior.dosesSemanais.length} semanas`,
      valorNovo: `${atual.dosesSemanais.length} semanas`,
    });
  }

  const invAnt = JSON.stringify(anterior.investimento);
  const invNov = JSON.stringify(atual.investimento);
  if (invAnt !== invNov) {
    alterados.push({
      campo: 'investimento',
      valorAnterior: 'valores anteriores',
      valorNovo: 'valores atualizados',
    });
  }

  return alterados;
}
