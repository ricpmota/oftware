'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleDollarSign,
  Edit,
  FileText,
  Loader2,
  MessageCircle,
  Search,
} from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente, VendaAvulsa } from '@/types/pagamento';
import type { Medico } from '@/types/medico';
import {
  buildFinanceiroRelatorioTransacoes,
  buildVendasPdfFromVendaAvulsa,
  financeiroRelatorioDescricao,
  financeiroRelatorioStatusLabel,
  financeiroRelatorioTitulo,
  getValorCobrancaParcelasVencidas,
  type FinanceiroRelatorioLinha,
  type FinanceiroRelatorioTipo,
} from '@/lib/metaadmin/buildFinanceiroRelatorioTransacoes';
import { openRelatorioFinanceiroLink } from '@/lib/metaadmin/openRelatorioFinanceiroLink';
import { downloadRelatorioFinanceiroPdf } from '@/utils/relatorioFinanceiroPdfDownload';
import CobrancaWhatsappConfirmModal, {
  type CobrancaConfirmTarget,
  type CobrancaSubmitStatus,
} from '@/components/metaadmin/CobrancaWhatsappConfirmModal';

type Props = {
  tipo: FinanceiroRelatorioTipo;
  pagamentosPacientes: Record<string, PagamentoPaciente>;
  vendasAvulsas: VendaAvulsa[];
  pacientes: PacienteCompleto[];
  totalCard: number;
  onVoltar: () => void;
  isMobile?: boolean;
  onErro?: (mensagem: string) => void;
  onNotify?: (mensagem: string) => void;
  onEditarPaciente?: (pacienteId: string) => void;
  onEditarVendaAvulsa?: (vendaId: string) => void;
  medico?: Medico | null;
  getAuthToken?: () => Promise<string | null>;
};

type OrdenacaoCampo = 'nome' | 'valor';
type OrdenacaoDirecao = 'asc' | 'desc';

/** Normaliza texto para busca (minúsculas, sem acentos). */
function normTextoBusca(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

type CobrancaEnvioDto = {
  id: string;
  pacienteId: string;
  pacienteNome?: string;
  phone?: string;
  valorAberto?: number;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  sentAt: string;
};

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function formatMoney(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatEnvioDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CobrancaEnviosDetalhe({
  envios,
  compact = false,
  defaultOpen = false,
}: {
  envios: CobrancaEnvioDto[];
  compact?: boolean;
  /** Abre automaticamente (ex.: logo após clicar em cobrar). */
  defaultOpen?: boolean;
}) {
  const hasPending = envios.some((envio) => envio.status === 'pending');
  const [aberto, setAberto] = useState(defaultOpen || hasPending);

  useEffect(() => {
    if (hasPending) setAberto(true);
  }, [hasPending]);

  if (envios.length === 0) return null;

  const enviados = envios.filter((envio) => envio.status === 'sent').length;
  const falhas = envios.filter((envio) => envio.status === 'failed').length;
  const resumo =
    hasPending
      ? 'Enviando cobrança…'
      : enviados > 0
        ? `${enviados} cobrança${enviados === 1 ? '' : 's'} enviada${enviados === 1 ? '' : 's'}`
        : `${falhas} falha${falhas === 1 ? '' : 's'} de envio`;

  return (
    <div className={compact ? 'mt-1.5' : 'mt-2'}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20 ${
          compact ? 'text-[11px]' : 'text-xs'
        } font-medium text-amber-800 dark:text-amber-300`}
        aria-expanded={aberto}
      >
        {aberto ? (
          <ChevronUp className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0`} />
        ) : (
          <ChevronDown className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0`} />
        )}
        <MessageCircle className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} shrink-0`} />
        <span>{resumo}</span>
      </button>

      {aberto ? (
        <div className={`space-y-1 ${compact ? 'mt-1 pl-1' : 'mt-1.5 pl-1.5'}`}>
          {envios.map((envio) => {
            const tone =
              envio.status === 'pending'
                ? 'text-amber-600 dark:text-amber-300'
                : envio.status === 'sent'
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-red-600 dark:text-red-400';
            const label =
              envio.status === 'pending'
                ? 'Enviando cobrança…'
                : envio.status === 'sent'
                  ? 'Cobrança enviada'
                  : 'Falha no envio';

            return (
              <div key={envio.id} className={`flex items-start gap-1.5 ${tone}`}>
                {envio.status === 'pending' ? (
                  <Loader2
                    className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} mt-0.5 shrink-0 animate-spin`}
                  />
                ) : (
                  <span
                    className={`${compact ? 'w-3' : 'w-3.5'} mt-1.5 shrink-0 flex justify-center`}
                    aria-hidden
                  >
                    <span className="h-1 w-1 rounded-full bg-current" />
                  </span>
                )}
                <p className={`${compact ? 'text-[11px]' : 'text-xs'} leading-snug`}>
                  {label}
                  {envio.status !== 'pending' ? (
                    <>
                      <span className="text-gray-400 dark:text-gray-500"> · </span>
                      {formatEnvioDateTime(envio.sentAt)}
                    </>
                  ) : null}
                  {envio.status !== 'pending' && typeof envio.valorAberto === 'number' ? (
                    <>
                      <span className="text-gray-400 dark:text-gray-500"> · </span>
                      {formatMoney(envio.valorAberto)}
                    </>
                  ) : null}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function accentClasses(tipo: FinanceiroRelatorioTipo): {
  badge: string;
  total: string;
  ring: string;
} {
  if (tipo === 'vendido') {
    return {
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      total: 'text-blue-700',
      ring: 'focus:ring-blue-500 focus:border-blue-500',
    };
  }
  if (tipo === 'recebido') {
    return {
      badge: 'bg-green-50 text-green-700 border-green-200',
      total: 'text-green-700',
      ring: 'focus:ring-green-500 focus:border-green-500',
    };
  }
  return {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    total: 'text-amber-600',
    ring: 'focus:ring-amber-500 focus:border-amber-500',
  };
}

function statusBadgeClass(status: 'pago' | 'iniciou_pagamento' | 'em_aberto'): string {
  if (status === 'pago') return 'bg-green-100 text-green-800';
  if (status === 'iniciou_pagamento') return 'bg-yellow-100 text-yellow-800';
  return 'bg-amber-100 text-amber-800';
}

function tituloCurto(tipo: FinanceiroRelatorioTipo): string {
  if (tipo === 'vendido') return 'Total Vendido';
  if (tipo === 'recebido') return 'Total Recebido';
  return 'Total Aberto';
}

function SortIcon({ active, direcao }: { active: boolean; direcao: OrdenacaoDirecao }) {
  if (!active) {
    return (
      <span className="inline-flex flex-col leading-none opacity-40" aria-hidden>
        <ChevronUp className="w-3 h-3 -mb-1" />
        <ChevronDown className="w-3 h-3" />
      </span>
    );
  }
  return direcao === 'asc' ? (
    <ChevronUp className="w-3.5 h-3.5 shrink-0" aria-hidden />
  ) : (
    <ChevronDown className="w-3.5 h-3.5 shrink-0" aria-hidden />
  );
}

function BotaoOrdenacao({
  label,
  campo,
  ativo,
  direcao,
  onToggle,
  align = 'left',
}: {
  label: string;
  campo: OrdenacaoCampo;
  ativo: boolean;
  direcao: OrdenacaoDirecao;
  onToggle: (campo: OrdenacaoCampo) => void;
  align?: 'left' | 'right';
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(campo)}
      className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider transition-colors hover:text-gray-800 dark:hover:text-gray-200 ${
        ativo ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
      } ${align === 'right' ? 'justify-end w-full' : ''}`}
      title={
        campo === 'nome'
          ? ativo
            ? direcao === 'asc'
              ? 'Nome A→Z (clique para Z→A)'
              : 'Nome Z→A (clique para A→Z)'
            : 'Ordenar por nome'
          : ativo
            ? direcao === 'desc'
              ? 'Maior → menor (clique para menor → maior)'
              : 'Menor → maior (clique para maior → menor)'
            : 'Ordenar por valor'
      }
      aria-label={`Ordenar por ${label}`}
    >
      <span>{label}</span>
      <SortIcon active={ativo} direcao={direcao} />
    </button>
  );
}

function BotaoRelatorioPaciente({
  gerando,
  disabled,
  onClick,
  compact = false,
}: {
  gerando: boolean;
  disabled?: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || gerando}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 ${
        compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
      title="Abrir relatório financeiro do paciente"
    >
      {gerando ? (
        <Loader2 className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} animate-spin`} />
      ) : (
        <FileText className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      )}
      Relatório
    </button>
  );
}

function BotaoEditarPaciente({
  onClick,
  compact = false,
}: {
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center p-1.5 font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
      title="Editar controle financeiro"
      aria-label="Editar controle financeiro"
    >
      <Edit className={compact ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5'} />
    </button>
  );
}

function BotaoCobrancaPaciente({
  enviando,
  disabled,
  onClick,
  compact = false,
}: {
  enviando: boolean;
  disabled?: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled || enviando}
      onClick={onClick}
      className="inline-flex items-center justify-center p-1.5 font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
      title="Enviar cobrança pelo Canal Chat"
      aria-label="Enviar cobrança"
    >
      {enviando ? (
        <Loader2 className={`${compact ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5'} animate-spin`} />
      ) : (
        <CircleDollarSign className={compact ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5'} />
      )}
    </button>
  );
}

function AcoesPaciente({
  linha,
  gerandoId,
  cobrandoId,
  showCobranca,
  onGerarRelatorio,
  onCobranca,
  onEditar,
  onEditarVendaAvulsa,
  compact = false,
}: {
  linha: FinanceiroRelatorioLinha;
  gerandoId: string | null;
  cobrandoId: string | null;
  showCobranca?: boolean;
  onGerarRelatorio: (linha: FinanceiroRelatorioLinha) => void;
  onCobranca?: (linha: FinanceiroRelatorioLinha) => void;
  onEditar?: (pacienteId: string) => void;
  onEditarVendaAvulsa?: (vendaId: string) => void;
  compact?: boolean;
}) {
  const isPaciente = linha.tipo === 'paciente' && !!linha.pacienteId;
  const isVendaAvulsa = linha.tipo === 'venda_avulsa' && !!linha.vendaAvulsaId;
  if (!isPaciente && !isVendaAvulsa) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  const busy = gerandoId !== null || cobrandoId !== null;
  return (
    <div className={`inline-flex items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
      <BotaoRelatorioPaciente
        compact={compact}
        gerando={gerandoId === linha.id}
        disabled={busy && gerandoId !== linha.id}
        onClick={() => onGerarRelatorio(linha)}
      />
      {showCobranca && onCobranca ? (
        <BotaoCobrancaPaciente
          compact={compact}
          enviando={cobrandoId === linha.id}
          disabled={busy && cobrandoId !== linha.id}
          onClick={() => onCobranca(linha)}
        />
      ) : null}
      {isPaciente && onEditar ? (
        <BotaoEditarPaciente
          compact={compact}
          onClick={() => onEditar(linha.pacienteId!)}
        />
      ) : null}
      {isVendaAvulsa && onEditarVendaAvulsa ? (
        <BotaoEditarPaciente
          compact={compact}
          onClick={() => onEditarVendaAvulsa(linha.vendaAvulsaId!)}
        />
      ) : null}
    </div>
  );
}

function LinhaMobile({
  linha,
  totalClass,
  gerandoId,
  cobrandoId,
  showCobranca,
  envios,
  onGerarRelatorio,
  onCobranca,
  onEditar,
  onEditarVendaAvulsa,
}: {
  linha: FinanceiroRelatorioLinha;
  totalClass: string;
  gerandoId: string | null;
  cobrandoId: string | null;
  showCobranca?: boolean;
  envios: CobrancaEnvioDto[];
  onGerarRelatorio: (linha: FinanceiroRelatorioLinha) => void;
  onCobranca?: (linha: FinanceiroRelatorioLinha) => void;
  onEditar?: (pacienteId: string) => void;
  onEditarVendaAvulsa?: (vendaId: string) => void;
}) {
  return (
    <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-white break-words">{linha.nome}</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 break-words">
            {linha.detalhe}
            <span className="text-gray-300 dark:text-gray-600"> · </span>
            {linha.tipo === 'paciente' ? 'Paciente' : 'Avulsa'}
          </p>
          {envios.length > 0 ? <CobrancaEnviosDetalhe compact envios={envios} /> : null}
        </div>
        <p className={`shrink-0 text-right font-semibold tabular-nums ${totalClass}`}>
          {formatMoney(linha.valor)}
        </p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-500 dark:text-gray-400">{linha.dataLabel}</span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(linha.status)}`}
          >
            {financeiroRelatorioStatusLabel(linha.status)}
          </span>
        </div>
        <AcoesPaciente
          compact
          linha={linha}
          gerandoId={gerandoId}
          cobrandoId={cobrandoId}
          showCobranca={showCobranca}
          onGerarRelatorio={onGerarRelatorio}
          onCobranca={onCobranca}
          onEditar={onEditar}
          onEditarVendaAvulsa={onEditarVendaAvulsa}
        />
      </div>
    </div>
  );
}

export default function FinanceiroRelatorioTransacoesPanel({
  tipo,
  pagamentosPacientes,
  vendasAvulsas,
  pacientes,
  totalCard,
  onVoltar,
  isMobile = false,
  onErro,
  onNotify,
  onEditarPaciente,
  onEditarVendaAvulsa,
  medico = null,
  getAuthToken,
}: Props) {
  const [busca, setBusca] = useState('');
  const [filtroAno, setFiltroAno] = useState<string | number>('todos');
  const [filtroMes, setFiltroMes] = useState<string | number>('todos');
  const [filtroOrigem, setFiltroOrigem] = useState<'todos' | 'paciente' | 'venda_avulsa'>('todos');
  const [gerandoId, setGerandoId] = useState<string | null>(null);
  const [cobrandoId, setCobrandoId] = useState<string | null>(null);
  const [cobrancaConfirmTarget, setCobrancaConfirmTarget] = useState<CobrancaConfirmTarget | null>(
    null,
  );
  const [cobrancaEnvios, setCobrancaEnvios] = useState<CobrancaEnvioDto[]>([]);
  const [ordenacaoCampo, setOrdenacaoCampo] = useState<OrdenacaoCampo>('valor');
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState<OrdenacaoDirecao>('desc');

  const accent = accentClasses(tipo);
  const showCobranca = tipo === 'aberto' && Boolean(getAuthToken);
  const getAuthTokenRef = useRef(getAuthToken);
  getAuthTokenRef.current = getAuthToken;

  const enviosByPaciente = useMemo(() => {
    const map = new Map<string, CobrancaEnvioDto[]>();
    for (const envio of cobrancaEnvios) {
      const list = map.get(envio.pacienteId) ?? [];
      list.push(envio);
      map.set(envio.pacienteId, list);
    }
    for (const [pacienteId, list] of map) {
      list.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
      });
      map.set(pacienteId, list);
    }
    return map;
  }, [cobrancaEnvios]);

  useEffect(() => {
    if (!showCobranca) {
      setCobrancaEnvios([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      const tokenFn = getAuthTokenRef.current;
      if (!tokenFn) return;
      try {
        const token = await tokenFn();
        if (!token || cancelled) return;
        const res = await fetch('/api/metaadmin/financeiro/cobranca-envios', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          envios?: CobrancaEnvioDto[];
        } | null;
        if (cancelled || !res.ok || !data?.ok || !Array.isArray(data.envios)) return;

        setCobrancaEnvios((prev) => {
          const pending = prev.filter((item) => item.status === 'pending');
          const byId = new Map<string, CobrancaEnvioDto>();
          for (const envio of data.envios!) byId.set(envio.id, envio);
          for (const envio of pending) byId.set(envio.id, envio);
          return Array.from(byId.values()).sort(
            (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
          );
        });
      } catch {
        // Histórico é auxiliar — não bloqueia o relatório.
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [showCobranca]);

  const linhas = buildFinanceiroRelatorioTransacoes({
    tipo,
    pagamentosPacientes,
    vendasAvulsas,
    pacientes,
  });

  const anosDisponiveis = (() => {
    const anos = [...new Set(linhas.map((l) => l.data.getFullYear()))].sort((a, b) => b - a);
    if (anos.length === 0) {
      const y = new Date().getFullYear();
      return [y, y - 1];
    }
    return anos;
  })();

  const toggleOrdenacao = (campo: OrdenacaoCampo) => {
    if (ordenacaoCampo === campo) {
      setOrdenacaoDirecao((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setOrdenacaoCampo(campo);
    // Nome começa A→Z; valor começa maior→menor
    setOrdenacaoDirecao(campo === 'nome' ? 'asc' : 'desc');
  };

  const q = normTextoBusca(busca);
  const linhasFiltradas = [...linhas]
    .filter((l) => {
      const matchBusca =
        !q ||
        normTextoBusca(l.nome).includes(q) ||
        normTextoBusca(l.detalhe).includes(q);
      const matchAno = filtroAno === 'todos' || l.data.getFullYear() === filtroAno;
      const matchMes = filtroMes === 'todos' || l.data.getMonth() === filtroMes;
      const matchOrigem = filtroOrigem === 'todos' || l.tipo === filtroOrigem;
      return matchBusca && matchAno && matchMes && matchOrigem;
    })
    .sort((a, b) => {
      if (ordenacaoCampo === 'nome') {
        const cmp = a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        return ordenacaoDirecao === 'asc' ? cmp : -cmp;
      }
      const cmp = a.valor - b.valor;
      return ordenacaoDirecao === 'asc' ? cmp : -cmp;
    });

  const totalFiltrado = linhasFiltradas.reduce((s, l) => s + l.valor, 0);
  const usandoFiltro =
    busca.trim() !== '' ||
    filtroAno !== 'todos' ||
    filtroMes !== 'todos' ||
    filtroOrigem !== 'todos';

  const selectClass = `w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2.5 py-1.5 text-sm ${accent.ring}`;

  const resolverPacienteIdDaLinha = (linha: FinanceiroRelatorioLinha): string | null => {
    if (linha.tipo === 'paciente' && linha.pacienteId) return linha.pacienteId;
    if (linha.tipo !== 'venda_avulsa' || !linha.vendaAvulsaId) return null;
    const venda = vendasAvulsas.find((v) => v.id === linha.vendaAvulsaId);
    const nome = (venda?.cliente || '').trim();
    if (!nome) return null;
    const q = normTextoBusca(nome);
    const match = pacientes.find((p) => {
      const n = p.dadosIdentificacao?.nomeCompleto || p.nome || '';
      return normTextoBusca(n) === q;
    });
    return match?.id ?? null;
  };

  const gerarRelatorioPaciente = async (linha: FinanceiroRelatorioLinha) => {
    if (linha.tipo === 'venda_avulsa' && linha.vendaAvulsaId) {
      const venda = vendasAvulsas.find((v) => v.id === linha.vendaAvulsaId);
      if (!venda) {
        onErro?.('Venda avulsa não encontrada.');
        return;
      }
      setGerandoId(linha.id);
      try {
        const { vendas, totaisGerais } = buildVendasPdfFromVendaAvulsa(venda);
        await downloadRelatorioFinanceiroPdf(
          vendas,
          medico ?? null,
          { pacienteNome: venda.cliente || venda.descricao || 'Venda avulsa' },
          { observacoes: venda.observacoes, totaisGerais }
        );
      } catch {
        onErro?.('Não foi possível gerar o relatório da venda avulsa.');
      } finally {
        setGerandoId(null);
      }
      return;
    }
    if (!linha.pacienteId || linha.tipo !== 'paciente') return;
    setGerandoId(linha.id);
    try {
      const result = await openRelatorioFinanceiroLink(linha.pacienteId);
      if (!result.ok) onErro?.(result.error);
    } finally {
      setGerandoId(null);
    }
  };

  const solicitarCobrancaPaciente = (linha: FinanceiroRelatorioLinha) => {
    if (!showCobranca) return;
    const pacienteId = resolverPacienteIdDaLinha(linha);
    if (!pacienteId) {
      onErro?.(
        linha.tipo === 'venda_avulsa'
          ? 'Cobrança pelo Canal Chat está disponível quando o cliente da venda avulsa é um paciente cadastrado.'
          : 'Paciente não encontrado para cobrança.',
      );
      return;
    }
    const parcelas =
      linha.tipo === 'venda_avulsa'
        ? vendasAvulsas.find((v) => v.id === linha.vendaAvulsaId)?.parcelas
        : pagamentosPacientes[pacienteId]?.parcelas;
    const valorVencido = getValorCobrancaParcelasVencidas(parcelas);
    if (!(valorVencido > 0)) {
      onErro?.(
        'Não há parcelas vencidas em aberto para cobrar (apenas pendentes com vencimento anterior a hoje).',
      );
      return;
    }
    setCobrancaConfirmTarget({
      pacienteId,
      pacienteNome: linha.nome,
      valorAberto: valorVencido,
      linhaId: linha.id,
    });
  };

  const podeCobrarLinha = (linha: FinanceiroRelatorioLinha) => {
    if (!showCobranca) return false;
    if (linha.tipo === 'paciente' && linha.pacienteId) {
      return getValorCobrancaParcelasVencidas(pagamentosPacientes[linha.pacienteId]?.parcelas) > 0;
    }
    if (linha.tipo === 'venda_avulsa' && linha.vendaAvulsaId) {
      const venda = vendasAvulsas.find((v) => v.id === linha.vendaAvulsaId);
      return getValorCobrancaParcelasVencidas(venda?.parcelas) > 0;
    }
    return false;
  };

  const enviarCobrancaPaciente = async (linha: FinanceiroRelatorioLinha) => {
    const pacienteId = resolverPacienteIdDaLinha(linha);
    if (!pacienteId || !showCobranca) return;
    if (!getAuthToken) {
      onErro?.('Sessão indisponível. Recarregue a página e tente novamente.');
      return;
    }

    const pendingId = `pending_${pacienteId}_${Date.now()}`;
    const pendingEnvio: CobrancaEnvioDto = {
      id: pendingId,
      pacienteId,
      pacienteNome: linha.nome,
      valorAberto: linha.valor,
      status: 'pending',
      sentAt: new Date().toISOString(),
    };

    // Linha de detalhe imediata ao clicar.
    setCobrancaEnvios((prev) => [pendingEnvio, ...prev]);
    setCobrandoId(linha.id);

    try {
      const token = await getAuthToken();
      if (!token) {
        setCobrancaEnvios((prev) => prev.filter((item) => item.id !== pendingId));
        onErro?.('Sessão expirada. Faça login novamente.');
        return;
      }

      const res = await fetch('/api/metaadmin/financeiro/cobranca-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pacienteId,
          valorAberto: linha.valor,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        message?: string;
        envio?: CobrancaEnvioDto;
        status?: CobrancaSubmitStatus;
      } | null;

      if (!res.ok || data?.ok === false) {
        setCobrancaEnvios((prev) =>
          prev.map((item) =>
            item.id === pendingId
              ? {
                  ...item,
                  status: 'failed',
                  errorMessage: data?.error || 'Não foi possível enviar a cobrança.',
                  sentAt: new Date().toISOString(),
                }
              : item,
          ),
        );
        onErro?.(data?.error || 'Não foi possível enviar a cobrança.');
        return;
      }

      if (data?.status === 'confirmation_sent' || data?.status === 'awaiting_confirmation') {
        setCobrancaEnvios((prev) => prev.filter((item) => item.id !== pendingId));
        onNotify?.(
          data.message ||
            (data.status === 'confirmation_sent'
              ? 'Confirmação enviada. A cobrança será enviada após o paciente responder OK.'
              : 'Aguardando confirmação do Canal Chat.'),
        );
        return data.status;
      }

      const confirmed: CobrancaEnvioDto = data?.envio
        ? { ...data.envio, status: data.envio.status === 'failed' ? 'failed' : 'sent' }
        : {
            id: `local_${pacienteId}_${Date.now()}`,
            pacienteId,
            pacienteNome: linha.nome,
            valorAberto: linha.valor,
            status: 'sent',
            sentAt: new Date().toISOString(),
          };

      setCobrancaEnvios((prev) => [
        confirmed,
        ...prev.filter((item) => item.id !== pendingId && item.id !== confirmed.id),
      ]);

      onNotify?.(data?.message || `Cobrança enviada para ${linha.nome}.`);
      return 'sent';
    } catch {
      setCobrancaEnvios((prev) =>
        prev.map((item) =>
          item.id === pendingId
            ? {
                ...item,
                status: 'failed',
                errorMessage: 'Erro ao enviar cobrança. Tente novamente.',
                sentAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      onErro?.('Erro ao enviar cobrança. Tente novamente.');
    } finally {
      setCobrandoId(null);
    }
  };

  return (
    <div className={`space-y-4 sm:space-y-6 ${isMobile ? 'px-0' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
            <span className="sm:hidden">Relatório — {tituloCurto(tipo)}</span>
            <span className="hidden sm:inline">{financeiroRelatorioTitulo(tipo)}</span>
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
            {financeiroRelatorioDescricao(tipo)}
          </p>
        </div>
        <button
          type="button"
          onClick={onVoltar}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 sm:px-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      <div className={`space-y-4 sm:space-y-5 ${isMobile ? '' : 'bg-white dark:bg-gray-800 rounded-lg shadow p-6'}`}>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
              {usandoFiltro ? 'Total filtrado' : 'Total do card'}
            </p>
            <p className={`mt-0.5 text-xl sm:text-3xl font-semibold tabular-nums ${accent.total}`}>
              {formatMoney(usandoFiltro ? totalFiltrado : totalCard)}
            </p>
            {usandoFiltro && Math.abs(totalFiltrado - totalCard) > 0.009 ? (
              <p className="mt-1 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                Card: {formatMoney(totalCard)} · {linhasFiltradas.length}/{linhas.length}
              </p>
            ) : (
              <p className="mt-1 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                {linhas.length} {linhas.length === 1 ? 'registro' : 'registros'}
              </p>
            )}
          </div>
          <span
            className={`hidden sm:inline-flex self-start items-center rounded-md border px-2.5 py-1 text-xs font-medium ${accent.badge}`}
          >
            Por paciente
          </span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 sm:items-end">
          <label className="col-span-2 sm:col-auto flex flex-col gap-1 sm:min-w-[180px] sm:flex-1">
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Buscar</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome ou descrição"
                className={`w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pl-9 pr-3 py-1.5 text-sm ${accent.ring}`}
              />
            </div>
          </label>
          <label className="flex flex-col gap-1 min-w-0">
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Ano</span>
            <select
              value={filtroAno}
              onChange={(e) =>
                setFiltroAno(e.target.value === 'todos' ? 'todos' : parseInt(e.target.value, 10))
              }
              className={selectClass}
            >
              <option value="todos">Todos</option>
              {anosDisponiveis.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 min-w-0">
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Mês</span>
            <select
              value={filtroMes}
              onChange={(e) =>
                setFiltroMes(e.target.value === 'todos' ? 'todos' : parseInt(e.target.value, 10))
              }
              className={selectClass}
            >
              <option value="todos">Todos</option>
              {MESES.map((nome, idx) => (
                <option key={idx} value={idx}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 sm:col-auto flex flex-col gap-1 min-w-0 sm:w-auto">
            <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Origem</span>
            <select
              value={filtroOrigem}
              onChange={(e) =>
                setFiltroOrigem(e.target.value as 'todos' | 'paciente' | 'venda_avulsa')
              }
              className={selectClass}
            >
              <option value="todos">Todas</option>
              <option value="paciente">Pacientes</option>
              <option value="venda_avulsa">Vendas avulsas</option>
            </select>
          </label>
        </div>

        {/* Mobile: controles de ordenação */}
        <div className="sm:hidden flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">Ordenar:</span>
          <div className="flex flex-1 gap-2">
            <button
              type="button"
              onClick={() => toggleOrdenacao('nome')}
              className={`flex-1 inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                ordenacaoCampo === 'nome'
                  ? 'border-gray-400 bg-gray-100 text-gray-900 dark:border-gray-500 dark:bg-gray-700 dark:text-white'
                  : 'border-gray-200 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              Nome
              <SortIcon active={ordenacaoCampo === 'nome'} direcao={ordenacaoDirecao} />
            </button>
            <button
              type="button"
              onClick={() => toggleOrdenacao('valor')}
              className={`flex-1 inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                ordenacaoCampo === 'valor'
                  ? 'border-gray-400 bg-gray-100 text-gray-900 dark:border-gray-500 dark:bg-gray-700 dark:text-white'
                  : 'border-gray-200 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              Valor
              <SortIcon active={ordenacaoCampo === 'valor'} direcao={ordenacaoDirecao} />
            </button>
          </div>
        </div>

        {/* Mobile: lista empilhada */}
        <div className="sm:hidden border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
          {linhasFiltradas.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum registro encontrado para este relatório.
            </p>
          ) : (
            <>
              {linhasFiltradas.map((linha) => (
                <LinhaMobile
                  key={linha.id}
                  linha={linha}
                  totalClass={accent.total}
                  gerandoId={gerandoId}
                  cobrandoId={cobrandoId}
                  showCobranca={podeCobrarLinha(linha)}
                  envios={
                    (() => {
                      const pid = resolverPacienteIdDaLinha(linha);
                      return pid ? enviosByPaciente.get(pid) ?? [] : [];
                    })()
                  }
                  onGerarRelatorio={gerarRelatorioPaciente}
                  onCobranca={solicitarCobrancaPaciente}
                  onEditar={onEditarPaciente}
                  onEditarVendaAvulsa={onEditarVendaAvulsa}
                />
              ))}
              <div className="flex items-center justify-between gap-3 px-3 py-3 bg-gray-50 dark:bg-gray-900/40">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Soma ({linhasFiltradas.length})
                </span>
                <span className={`font-semibold tabular-nums ${accent.total}`}>
                  {formatMoney(totalFiltrado)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Desktop: tabela */}
        <div className="hidden sm:block overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Data
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Origem
                </th>
                <th className="px-3 py-2.5 text-left text-xs">
                  <BotaoOrdenacao
                    label="Nome / Cliente"
                    campo="nome"
                    ativo={ordenacaoCampo === 'nome'}
                    direcao={ordenacaoDirecao}
                    onToggle={toggleOrdenacao}
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Detalhe
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-3 py-2.5 text-right text-xs">
                  <BotaoOrdenacao
                    label="Valor"
                    campo="valor"
                    ativo={ordenacaoCampo === 'valor'}
                    direcao={ordenacaoDirecao}
                    onToggle={toggleOrdenacao}
                    align="right"
                  />
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {linhasFiltradas.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    Nenhum registro encontrado para este relatório.
                  </td>
                </tr>
              ) : (
                linhasFiltradas.map((linha) => {
                  const pid = resolverPacienteIdDaLinha(linha);
                  const envios = pid ? enviosByPaciente.get(pid) ?? [] : [];
                  return (
                  <tr key={linha.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-700 dark:text-gray-200 align-top">
                      {linha.dataLabel}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 dark:text-gray-300 align-top">
                      {linha.tipo === 'paciente' ? 'Paciente' : 'Avulsa'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-900 dark:text-white font-medium align-top">
                      {linha.nome}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 align-top">
                      <div>{linha.detalhe}</div>
                      {showCobranca && envios.length > 0 ? (
                        <CobrancaEnviosDetalhe envios={envios} />
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(linha.status)}`}
                      >
                        {financeiroRelatorioStatusLabel(linha.status)}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 text-right whitespace-nowrap font-semibold tabular-nums align-top ${accent.total}`}>
                      {formatMoney(linha.valor)}
                    </td>
                    <td className="px-3 py-2.5 text-right align-top">
                      <AcoesPaciente
                        linha={linha}
                        gerandoId={gerandoId}
                        cobrandoId={cobrandoId}
                        showCobranca={podeCobrarLinha(linha)}
                        onGerarRelatorio={gerarRelatorioPaciente}
                        onCobranca={solicitarCobrancaPaciente}
                        onEditar={onEditarPaciente}
                        onEditarVendaAvulsa={onEditarVendaAvulsa}
                      />
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
            {linhasFiltradas.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                  >
                    Soma ({linhasFiltradas.length})
                  </td>
                  <td className={`px-3 py-3 text-right font-semibold tabular-nums ${accent.total}`}>
                    {formatMoney(totalFiltrado)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {cobrancaConfirmTarget && getAuthToken ? (
        <CobrancaWhatsappConfirmModal
          target={cobrancaConfirmTarget}
          getAuthToken={getAuthToken}
          confirming={cobrandoId != null}
          onCancel={() => {
            if (cobrandoId != null) return;
            setCobrancaConfirmTarget(null);
          }}
          onConfirm={async () => {
            const target = cobrancaConfirmTarget;
            const linha =
              (target.linhaId
                ? linhas.find((l) => l.id === target.linhaId)
                : undefined) ??
              linhas.find(
                (l) => l.tipo === 'paciente' && l.pacienteId === target.pacienteId,
              );
            if (!linha) {
              onErro?.('Registro não encontrado na lista de cobrança.');
              setCobrancaConfirmTarget(null);
              return;
            }
            const status = await enviarCobrancaPaciente({
              ...linha,
              valor: target.valorAberto,
            });
            if (
              status === 'sent' ||
              status === 'confirmation_sent' ||
              status === 'awaiting_confirmation'
            ) {
              setCobrancaConfirmTarget(null);
            }
            return status;
          }}
        />
      ) : null}
    </div>
  );
}
