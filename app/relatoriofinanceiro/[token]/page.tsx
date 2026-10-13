'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente } from '@/types/pagamento';
import {
  buildVendasPdfFromPagamentoPaciente,
  getStatusPagamentoPaciente,
  getValoresPacienteDeParcelas,
} from '@/lib/metaadmin/buildFinanceiroRelatorioTransacoes';
import { downloadRelatorioFinanceiroPdf } from '@/utils/relatorioFinanceiroPdfDownload';
import { ObservacaoVendaResumo } from '@/components/metaadmin/ObservacaoVendaPanel';
import { observacaoVendaTemConteudo } from '@/lib/metaadmin/observacaoVenda';

type MedicoDto = {
  id?: string;
  nome?: string;
  genero?: string;
  crm?: { estado?: string; numero?: string };
  telefone?: string;
  whiteLabel?: { pdfLogoUrl?: string };
};

function formatMoney(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatData(v: unknown): string {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v as string | number);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusLabel(status: string): string {
  if (status === 'pago') return 'Pago';
  if (status === 'iniciou_pagamento') return 'Parcial';
  return 'Aberto';
}

function statusBadgeClass(status: string): string {
  if (status === 'pago') return 'bg-green-100 text-green-800';
  if (status === 'iniciou_pagamento') return 'bg-yellow-100 text-yellow-800';
  return 'bg-amber-100 text-amber-800';
}

function parcelaStatusLabel(status: string): string {
  if (status === 'paga') return 'Paga';
  if (status === 'atrasada') return 'Atrasada';
  return 'Pendente';
}

function medicoTitulo(m: MedicoDto | null): string {
  if (!m?.nome) return 'Médico';
  const titulo = m.genero === 'F' ? 'Dra.' : 'Dr.';
  return `${titulo} ${m.nome}`;
}

function toMedicoForPdf(m: MedicoDto | null): Medico | null {
  if (!m) return null;
  return {
    id: m.id || '',
    userId: '',
    email: '',
    nome: m.nome || 'Médico',
    genero: m.genero === 'F' ? 'F' : 'M',
    crm: m.crm,
    whiteLabel: m.whiteLabel?.pdfLogoUrl
      ? { pdfLogoUrl: m.whiteLabel.pdfLogoUrl }
      : undefined,
  } as Medico;
}

export default function RelatorioFinanceiroPublicPage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [paciente, setPaciente] = useState<PacienteCompleto | null>(null);
  const [medico, setMedico] = useState<MedicoDto | null>(null);
  const [pagamento, setPagamento] = useState<PagamentoPaciente | null>(null);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    if (!token || token.trim().length < 8) {
      setErro('Link inválido');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/relatorio-financeiro/${encodeURIComponent(token)}/dados`);
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setErro(data?.error || 'Não foi possível carregar o relatório.');
          return;
        }
        if (cancelled) return;
        setPaciente(data.paciente as PacienteCompleto);
        setMedico((data.medico as MedicoDto) || null);
        setPagamento((data.pagamento as PagamentoPaciente) || null);
      } catch {
        if (!cancelled) setErro('Erro ao carregar o relatório financeiro.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const nomePaciente =
    paciente?.dadosIdentificacao?.nomeCompleto || paciente?.nome || 'Paciente';
  const totais = getValoresPacienteDeParcelas(pagamento);
  const status = getStatusPagamentoPaciente(pagamento);
  const { vendas } =
    pagamento != null
      ? buildVendasPdfFromPagamentoPaciente(pagamento, paciente || undefined)
      : { vendas: [] };

  const handleDownload = async () => {
    if (!pagamento || !paciente) return;
    setBaixando(true);
    try {
      const dataNasc = paciente.dadosIdentificacao?.dataNascimento
        ? formatData(paciente.dadosIdentificacao.dataNascimento)
        : 'N/A';
      const sexo =
        paciente.dadosIdentificacao?.sexoBiologico === 'M'
          ? 'Masculino'
          : paciente.dadosIdentificacao?.sexoBiologico === 'F'
            ? 'Feminino'
            : 'N/A';
      const { vendas: vendasPdf, totaisGerais } = buildVendasPdfFromPagamentoPaciente(
        pagamento,
        paciente
      );
      await downloadRelatorioFinanceiroPdf(
        vendasPdf,
        toMedicoForPdf(medico),
        {
          pacienteNome: nomePaciente,
          pacienteCpf: paciente.dadosIdentificacao?.cpf,
          pacienteDataNascimento: dataNasc,
          pacienteSexo: sexo,
        },
        {
          observacoes: pagamento.observacoes,
          totaisGerais,
          paciente,
        }
      );
    } catch (error) {
      console.error('Erro ao baixar relatório financeiro:', error);
      setErro('Erro ao gerar o PDF do relatório financeiro.');
    } finally {
      setBaixando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregando relatório...
        </div>
      </div>
    );
  }

  if (erro && !paciente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
          <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-slate-900">Relatório financeiro</h1>
          <p className="mt-2 text-sm text-slate-600">{erro}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Relatório financeiro
          </p>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">{nomePaciente}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {medicoTitulo(medico)}
            {medico?.crm?.estado && medico?.crm?.numero
              ? ` · CRM-${medico.crm.estado} ${medico.crm.numero}`
              : ''}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {erro && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">Total</p>
            <p className="mt-1 text-xl font-semibold text-blue-700 tabular-nums">
              {formatMoney(totais.valorTotal)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">Recebido</p>
            <p className="mt-1 text-xl font-semibold text-green-700 tabular-nums">
              {formatMoney(totais.valorPago)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">Em aberto</p>
            <p className="mt-1 text-xl font-semibold text-amber-600 tabular-nums">
              {formatMoney(totais.valorPendente)}
            </p>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(status)}`}
          >
            {statusLabel(status)}
          </span>
          <button
            type="button"
            onClick={handleDownload}
            disabled={baixando || !pagamento || totais.valorTotal <= 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors shadow-md disabled:opacity-50"
          >
            {baixando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Baixar relatório em PDF
          </button>
        </div>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Vendas e parcelas</h2>
          </div>
          {vendas.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              Nenhum pagamento registrado para este paciente.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {vendas.map((venda, idx) => (
                <div key={`${venda.label}-${idx}`} className="px-4 py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{venda.label}</p>
                      <p className="text-xs text-slate-500">{formatData(venda.data)}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-slate-900 tabular-nums">
                        {formatMoney(venda.valorTotal)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Pago {formatMoney(venda.valorPago)} · Aberto{' '}
                        {formatMoney(venda.valorPendente)}
                      </p>
                    </div>
                  </div>
                  {venda.parcelas.length > 0 && (
                    <div className="overflow-hidden rounded-lg border border-slate-100">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-2.5 py-2 text-left font-medium">#</th>
                            <th className="px-2.5 py-2 text-left font-medium">Vencimento</th>
                            <th className="px-2.5 py-2 text-left font-medium">Pagamento</th>
                            <th className="px-2.5 py-2 text-left font-medium">Status</th>
                            <th className="px-2.5 py-2 text-right font-medium">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {venda.parcelas.map((p) => (
                            <tr key={`${venda.label}-${p.numero}`}>
                              <td className="px-2.5 py-2 text-slate-700">{p.numero}</td>
                              <td className="px-2.5 py-2 text-slate-600">
                                {formatData(p.dataVencimento)}
                              </td>
                              <td className="px-2.5 py-2 text-slate-600">
                                {formatData(p.dataPagamento)}
                              </td>
                              <td className="px-2.5 py-2 text-slate-700">
                                {parcelaStatusLabel(p.status)}
                              </td>
                              <td className="px-2.5 py-2 text-right font-medium tabular-nums text-slate-900">
                                {formatMoney(p.valor)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {observacaoVendaTemConteudo(venda.observacao) ? (
                    <ObservacaoVendaResumo obs={venda.observacao} valorVenda={venda.valorTotal} />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {pagamento?.observacoes?.trim() &&
          !vendas.some((v) => observacaoVendaTemConteudo(v.observacao)) && (
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Observações</h2>
            <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">
              {pagamento.observacoes.trim()}
            </p>
          </section>
        )}

        <div className="pt-2 pb-8">
          <button
            type="button"
            onClick={handleDownload}
            disabled={baixando || !pagamento || totais.valorTotal <= 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors shadow-md disabled:opacity-50"
          >
            {baixando ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            Baixar relatório em PDF
          </button>
          <p className="text-slate-500 text-sm mt-2">
            O PDF é o mesmo gerado no Controle Financeiro do Metaadmin.
          </p>
        </div>
      </main>
    </div>
  );
}
