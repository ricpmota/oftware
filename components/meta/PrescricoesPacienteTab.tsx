'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { FlaskConical, Loader2, Pill } from 'lucide-react';
import { db } from '@/lib/firebase';
import type { PacienteCompleto } from '@/types/obesidade';
import type { Prescricao } from '@/types/prescricao';
import { PrescricaoService } from '@/services/prescricaoService';
import PrescricaoLeituraModal from '@/components/meta/PrescricaoLeituraModal';
import PrescricoesListaPaciente, {
  type HistoricoListaItem,
} from '@/components/meta/PrescricoesListaPaciente';
import SolicitacaoExamesLeituraModal from '@/components/meta/SolicitacaoExamesLeituraModal';
import {
  mapSolicitacaoExamesFromFirestore,
  type SolicitacaoExamesSalva,
} from '@/utils/solicitacaoExamesPdfDownload';

function dataDoItem(item: HistoricoListaItem): number {
  if (item.kind === 'solicitacao_exames') return item.solicitacao.criadoEm.getTime();
  return item.prescricao.atualizadoEm.getTime();
}

export default function PrescricoesPacienteTab({
  paciente,
  historicoInicial,
}: {
  paciente: PacienteCompleto | null;
  /** Quando informado (página pública /relatorio), não busca no Firestore do cliente. */
  historicoInicial?: {
    prescricoes: Prescricao[];
    solicitacoes: SolicitacaoExamesSalva[];
  };
}) {
  const [lista, setLista] = useState<Prescricao[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoExamesSalva[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [prescricaoModal, setPrescricaoModal] = useState<Prescricao | null>(null);
  const [solicitacaoModal, setSolicitacaoModal] = useState<SolicitacaoExamesSalva | null>(null);
  const [itemSelecionado, setItemSelecionado] = useState<HistoricoListaItem | null>(null);

  const pacienteId = paciente?.id;

  const itens = useMemo<HistoricoListaItem[]>(() => {
    const prescricoesItens: HistoricoListaItem[] = lista.map((p) => ({
      kind: 'prescricao',
      id: `prescricao:${p.id}`,
      prescricao: p,
    }));
    const examesItens: HistoricoListaItem[] = solicitacoes.map((s) => ({
      kind: 'solicitacao_exames',
      id: `exame:${s.id}`,
      solicitacao: s,
    }));
    return [...prescricoesItens, ...examesItens].sort((a, b) => dataDoItem(b) - dataDoItem(a));
  }, [lista, solicitacoes]);

  useEffect(() => {
    if (historicoInicial) {
      setLista(
        (historicoInicial.prescricoes || [])
          .filter((p) => !p.isTemplate)
          .map((p) => ({
            ...p,
            criadoEm: p.criadoEm instanceof Date ? p.criadoEm : new Date(p.criadoEm as unknown as string),
            atualizadoEm:
              p.atualizadoEm instanceof Date
                ? p.atualizadoEm
                : new Date(p.atualizadoEm as unknown as string),
          }))
      );
      setSolicitacoes(
        (historicoInicial.solicitacoes || []).map((s) => ({
          ...s,
          criadoEm: s.criadoEm instanceof Date ? s.criadoEm : new Date(s.criadoEm as unknown as string),
        }))
      );
      setLoading(false);
      setErro(null);
      return;
    }
    if (!pacienteId) {
      setLista([]);
      setSolicitacoes([]);
      setLoading(false);
      setPrescricaoModal(null);
      setSolicitacaoModal(null);
      setItemSelecionado(null);
      return;
    }
    let cancel = false;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const [raw, snap] = await Promise.all([
          PrescricaoService.getPrescricoesByPaciente(pacienteId),
          getDocs(
            query(
              collection(db, 'pacientes_completos', pacienteId, 'solicitacoesExames'),
              orderBy('criadoEm', 'desc')
            )
          ),
        ]);
        if (cancel) return;
        setLista(raw.filter((p) => !p.isTemplate));
        setSolicitacoes(
          snap.docs
            .map((d) =>
              mapSolicitacaoExamesFromFirestore(d.id, pacienteId, d.data() as Record<string, unknown>)
            )
            .filter((r) => Boolean(r.signedPdfUrl))
        );
      } catch (e) {
        console.error(e);
        if (!cancel) setErro('Não foi possível carregar o histórico.');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [pacienteId, historicoInicial]);

  useEffect(() => {
    if (itens.length === 0) {
      setItemSelecionado(null);
      return;
    }
    setItemSelecionado((prev) => {
      if (prev && itens.some((item) => item.id === prev.id)) return prev;
      return itens[0];
    });
  }, [itens]);

  const onItemClick = (item: HistoricoListaItem) => {
    setItemSelecionado(item);
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1024px)').matches) {
      if (item.kind === 'prescricao') setPrescricaoModal(item.prescricao);
      else setSolicitacaoModal(item.solicitacao);
    }
  };

  if (!pacienteId) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center border border-gray-200">
        <p className="text-black">Salve seus dados para ver o histórico.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-black">
        <Loader2 className="h-10 w-10 animate-spin text-green-600 mb-3" />
        <p className="text-sm">Carregando histórico…</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-800 text-sm">{erro}</div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-200">
        <div className="mx-auto mb-4 flex items-center justify-center gap-2 text-gray-400">
          <Pill className="h-12 w-12" />
          <FlaskConical className="h-12 w-12" />
        </div>
        <h3 className="text-lg font-semibold text-black mb-2">Nenhum histórico ainda</h3>
        <p className="text-black text-sm">
          Quando o médico registrar prescrições ou requisições de exames, elas aparecerão aqui.
        </p>
      </div>
    );
  }

  const prescricaoPainel =
    itemSelecionado?.kind === 'prescricao' ? itemSelecionado.prescricao : null;
  const solicitacaoPainel =
    itemSelecionado?.kind === 'solicitacao_exames' ? itemSelecionado.solicitacao : null;

  return (
    <>
      <div className="flex min-h-0 flex-col gap-3 lg:grid lg:min-h-[calc(100vh-10rem)] lg:grid-cols-[minmax(16rem,0.7fr)_minmax(0,1.3fr)] lg:items-stretch lg:gap-5">
        <div className="min-w-0 lg:flex lg:min-h-[28rem] lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border lg:border-gray-200 lg:bg-white lg:shadow-sm dark:lg:border-gray-600 dark:lg:bg-gray-900/40">
          <div className="hidden shrink-0 border-b border-gray-200 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/40 px-3 py-3 dark:border-gray-600 dark:from-emerald-950/30 dark:via-gray-900 dark:to-teal-950/20 lg:block">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Pill className="h-3.5 w-3.5" />
              <FlaskConical className="h-3.5 w-3.5" />
              Histórico
            </p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
              {itens.length} registro{itens.length === 1 ? '' : 's'}
            </p>
          </div>
          <PrescricoesListaPaciente
            itens={itens}
            onItemClick={onItemClick}
            selectedId={itemSelecionado?.id}
            hideChevron
            accent="green"
            maxHeightClassName="max-h-[min(70vh,520px)] lg:max-h-none lg:flex-1"
            className="lg:rounded-none lg:border-0 lg:shadow-none"
          />
        </div>

        <div className="hidden min-w-0 lg:flex lg:min-h-[28rem] lg:flex-col">
          {solicitacaoPainel ? (
            <SolicitacaoExamesLeituraModal variant="panel" solicitacao={solicitacaoPainel} />
          ) : (
            <PrescricaoLeituraModal variant="panel" prescricao={prescricaoPainel} paciente={paciente} />
          )}
        </div>
      </div>

      <PrescricaoLeituraModal
        prescricao={prescricaoModal}
        paciente={paciente}
        onClose={() => setPrescricaoModal(null)}
      />
      <SolicitacaoExamesLeituraModal
        solicitacao={solicitacaoModal}
        onClose={() => setSolicitacaoModal(null)}
      />
    </>
  );
}
