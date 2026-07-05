import type { PacienteCompleto } from '@/types/obesidade';
import type { Medico } from '@/types/medico';
import {
  buildRelatorioFinanceiroJsPdfDocument,
  saveRelatorioFinanceiroPdf,
  type RelatorioFinanceiroPdfBuildInput,
  type RelatorioFinanceiroPdfContext,
  type RelatorioFinanceiroVenda,
} from '@/utils/relatorioFinanceiroPdfGenerate';
import { extrairAplicacoesRelatorioFinanceiro } from '@/utils/relatorioFinanceiroAplicacoes';

export type { RelatorioFinanceiroPdfContext, RelatorioFinanceiroVenda };

export async function downloadRelatorioFinanceiroPdf(
  vendas: RelatorioFinanceiroVenda[],
  medico: Medico | null,
  ctx: RelatorioFinanceiroPdfContext,
  options?: {
    observacoes?: string;
    totaisGerais?: { valorTotal: number; valorPago: number; valorPendente: number };
    paciente?: PacienteCompleto | null;
  }
): Promise<void> {
  const totaisGerais = options?.totaisGerais ?? {
    valorTotal: vendas.reduce((s, v) => s + v.valorTotal, 0),
    valorPago: vendas.reduce((s, v) => s + v.valorPago, 0),
    valorPendente: vendas.reduce((s, v) => s + v.valorPendente, 0),
  };

  const aplicacoes = options?.paciente ? extrairAplicacoesRelatorioFinanceiro(options.paciente) : [];

  const input: RelatorioFinanceiroPdfBuildInput = {
    vendas,
    medico,
    ctx,
    observacoes: options?.observacoes,
    totaisGerais,
    aplicacoes,
    dataDocumento: new Date(),
  };

  const doc = await buildRelatorioFinanceiroJsPdfDocument(input);
  saveRelatorioFinanceiroPdf(doc, ctx.pacienteNome);
}
