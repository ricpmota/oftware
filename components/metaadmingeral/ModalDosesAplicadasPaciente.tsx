'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import type { User } from 'firebase/auth';

export type DoseAplicacaoRow = {
  index: number;
  seguimentoId: string;
  weekIndex: number;
  dataRegistro: string | null;
  doseMg: number | null;
  doseData: string | null;
  adherence: string;
  peso: number | null;
  contaNoTotal: boolean;
};

export type AplicacaoLinkRow = {
  token: string;
  data: string;
  semana: number;
  dose: number;
  key: string;
  createdAt: string | null;
  url: string;
};

type AplicacoesPayload = {
  pacienteId: string;
  totalContado: number;
  fonteTotal: string;
  criterioTotal: string;
  doses: DoseAplicacaoRow[];
  links: AplicacaoLinkRow[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  pacienteId: string;
  pacienteNome: string;
  user: User | null;
  onDosesChanged?: () => void;
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export default function ModalDosesAplicadasPaciente({
  open,
  onClose,
  pacienteId,
  pacienteNome,
  user,
  onDosesChanged,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AplicacoesPayload | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !pacienteId) return;
    setLoading(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/metaadmingeral/pacientes/${encodeURIComponent(pacienteId)}/aplicacoes`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar aplicações');
      setData(json as AplicacoesPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user, pacienteId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleDelete = async (
    type: 'link' | 'dose' | 'link_e_dose',
    opts: { token?: string; seguimentoId?: string; label: string }
  ) => {
    if (!user) return;
    const msg =
      type === 'link'
        ? `Excluir o link ${opts.token?.slice(0, 12)}…? Isso não altera o total de doses (só invalida o link).`
        : type === 'dose'
          ? `Remover o registro de dose (semana ${opts.label})? Isso reduz o total exibido na lista.`
          : `Excluir link e registro de dose (${opts.label})?`;
    if (!window.confirm(msg)) return;

    const key = `${type}:${opts.token || ''}:${opts.seguimentoId || ''}`;
    setDeletingKey(key);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/metaadmingeral/pacientes/${encodeURIComponent(pacienteId)}/aplicacoes`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          type,
          token: opts.token,
          seguimentoId: opts.seguimentoId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao excluir');
      await load();
      onDosesChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir');
    } finally {
      setDeletingKey(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-[#0A1F44] border border-white/15 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[#E8EDED]">Doses aplicadas</h3>
            <p className="text-sm text-[#E8EDED]/70 mt-1">{pacienteNome}</p>
            <p className="text-xs text-amber-200/90 mt-2 font-mono break-all">{pacienteId}</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#E8EDED]/60 hover:text-[#E8EDED] p-1">
            <X size={22} />
          </button>
        </div>

        <div className="px-6 py-3 bg-white/5 border-b border-white/10 text-xs text-[#E8EDED]/80 space-y-1">
          <p>
            <strong className="text-[#4CCB7A]">Total na lista ({data?.totalContado ?? '…'}):</strong> vem de{' '}
            <code className="text-amber-200">pacientes_completos → evolucaoSeguimento</code>, não da coleção{' '}
            <code className="text-amber-200">aplicacao_links</code>.
          </p>
          <p>Critério: registro com doseAplicada e adherence diferente de MISSED.</p>
          <p>
            Links públicos (<code className="text-amber-200">aplicacao_links</code>) são criados ao gerar URL de
            aplicação; ao preencher, o paciente grava em evolucaoSeguimento.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {error && (
            <div className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#E8EDED]/60">
              <RefreshCw className="animate-spin mr-2" size={20} />
              Carregando…
            </div>
          ) : (
            <>
              <section>
                <h4 className="text-sm font-semibold text-[#E8EDED] mb-3">
                  Registros em evolucaoSeguimento ({data?.doses.length ?? 0})
                </h4>
                {data?.doses.length === 0 ? (
                  <p className="text-sm text-[#E8EDED]/50">Nenhum registro de seguimento.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="min-w-full text-xs">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-3 py-2 text-left text-[#E8EDED]/60">Semana</th>
                          <th className="px-3 py-2 text-left text-[#E8EDED]/60">Dose (mg)</th>
                          <th className="px-3 py-2 text-left text-[#E8EDED]/60">Data registro</th>
                          <th className="px-3 py-2 text-left text-[#E8EDED]/60">Conta no total</th>
                          <th className="px-3 py-2 text-left text-[#E8EDED]/60">ID seguimento</th>
                          <th className="px-3 py-2 text-right text-[#E8EDED]/60">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data?.doses.map((d) => (
                          <tr key={d.seguimentoId}>
                            <td className="px-3 py-2 text-[#E8EDED]">{d.weekIndex}</td>
                            <td className="px-3 py-2 text-[#E8EDED]">{d.doseMg ?? '—'}</td>
                            <td className="px-3 py-2 text-[#E8EDED]/80">{formatDate(d.dataRegistro)}</td>
                            <td className="px-3 py-2">
                              {d.contaNoTotal ? (
                                <span className="text-[#4CCB7A]">Sim</span>
                              ) : (
                                <span className="text-[#E8EDED]/40">Não</span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-[#E8EDED]/70 break-all max-w-[10rem]">
                              {d.seguimentoId}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {d.contaNoTotal && (
                                <button
                                  type="button"
                                  disabled={deletingKey != null}
                                  onClick={() =>
                                    handleDelete('dose', {
                                      seguimentoId: d.seguimentoId,
                                      label: String(d.weekIndex),
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[10px] disabled:opacity-50"
                                  title="Remove este registro e diminui o total na lista"
                                >
                                  <Trash2 size={12} />
                                  Remover dose
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h4 className="text-sm font-semibold text-[#E8EDED] mb-3">
                  Links aplicacao_links ({data?.links.length ?? 0})
                </h4>
                {data?.links.length === 0 ? (
                  <p className="text-sm text-[#E8EDED]/50">Nenhum link gerado para este paciente.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="min-w-full text-xs">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-3 py-2 text-left text-[#E8EDED]/60">Token (doc id)</th>
                          <th className="px-3 py-2 text-left text-[#E8EDED]/60">Data</th>
                          <th className="px-3 py-2 text-left text-[#E8EDED]/60">Semana</th>
                          <th className="px-3 py-2 text-left text-[#E8EDED]/60">Dose</th>
                          <th className="px-3 py-2 text-left text-[#E8EDED]/60">key</th>
                          <th className="px-3 py-2 text-right text-[#E8EDED]/60">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data?.links.map((link) => {
                          const doseMatch = data.doses.find(
                            (d) => d.weekIndex === link.semana && d.contaNoTotal
                          );
                          return (
                            <tr key={link.token}>
                              <td className="px-3 py-2 font-mono text-[#E8EDED] break-all max-w-[12rem]" title={link.token}>
                                {link.token}
                              </td>
                              <td className="px-3 py-2 text-[#E8EDED]/80">{link.data || '—'}</td>
                              <td className="px-3 py-2 text-[#E8EDED]">{link.semana}</td>
                              <td className="px-3 py-2 text-[#E8EDED]">{link.dose} mg</td>
                              <td className="px-3 py-2 font-mono text-[#E8EDED]/50 break-all max-w-[8rem]">{link.key}</td>
                              <td className="px-3 py-2 text-right whitespace-nowrap space-x-1">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[#E8EDED] text-[10px]"
                                >
                                  <ExternalLink size={12} />
                                  Abrir
                                </a>
                                <button
                                  type="button"
                                  disabled={deletingKey != null}
                                  onClick={() =>
                                    handleDelete('link', { token: link.token, label: link.data })
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-700/80 hover:bg-amber-700 text-white text-[10px] disabled:opacity-50"
                                  title="Só exclui o documento do link"
                                >
                                  <Trash2 size={12} />
                                  Link
                                </button>
                                {doseMatch && (
                                  <button
                                    type="button"
                                    disabled={deletingKey != null}
                                    onClick={() =>
                                      handleDelete('link_e_dose', {
                                        token: link.token,
                                        seguimentoId: doseMatch.seguimentoId,
                                        label: `S${link.semana}`,
                                      })
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-600/80 hover:bg-red-600 text-white text-[10px] disabled:opacity-50"
                                    title="Exclui link e tenta remover dose da mesma semana"
                                  >
                                    Link+dose
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-md bg-white/10 text-[#E8EDED] hover:bg-white/20 disabled:opacity-50"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md bg-[#4CCB7A] text-[#0A1F44] font-medium hover:opacity-90"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
