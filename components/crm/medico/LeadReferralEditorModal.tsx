'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Search, X } from 'lucide-react';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import { LeadMedicoService } from '@/services/leadMedicoService';
import { PacienteService } from '@/services/pacienteService';
import { resolveLeadMedicoId } from '@/lib/crm/leadMedicoCrmUtils';
import type { LeadMedico, LeadReferralSnapshot, LeadReferralType } from '@/types/leadMedico';
import type { PacienteCompleto } from '@/types/obesidade';

const TYPE_OPTIONS: { value: LeadReferralType; label: string }[] = [
  { value: 'nutricionista', label: 'Nutricionista' },
  { value: 'personal', label: 'Personal' },
  { value: 'paciente', label: 'Paciente' },
  { value: 'medico', label: 'Médico / Direto' },
  { value: 'manual', label: 'Manual / Pessoa avulsa' },
  { value: 'landing', label: 'Landing' },
  { value: 'desconhecido', label: 'Desconhecido' },
];

type Props = {
  open: boolean;
  lead: LeadMedico;
  medicoId: string;
  medicoNome?: string;
  userEmail?: string | null;
  pacientes?: PacienteCompleto[];
  onClose: () => void;
  onSaved: (referral: LeadReferralSnapshot) => void;
};

function pacienteDisplayName(p: PacienteCompleto): string {
  return p.nome || p.dadosIdentificacao?.nomeCompleto || 'Paciente';
}

function pacientePhone(p: PacienteCompleto): string | undefined {
  const phone = p.dadosIdentificacao?.telefone?.trim();
  return phone || undefined;
}

function sortPacientes(list: PacienteCompleto[]): PacienteCompleto[] {
  return [...list].sort((a, b) =>
    pacienteDisplayName(a).localeCompare(pacienteDisplayName(b), 'pt-BR', { sensitivity: 'base' })
  );
}

function initialDraft(
  lead: LeadMedico,
  medicoId: string,
  medicoNome?: string
): {
  type: LeadReferralType;
  sourceName: string;
  sourceContact: string;
  sourceId: string;
  note: string;
} {
  const r = lead.referral;
  let type: LeadReferralType = r?.type ?? 'desconhecido';
  if (type === 'dr_link') type = 'medico';

  return {
    type,
    sourceName: r?.sourceName || (type === 'medico' ? medicoNome || '' : ''),
    sourceContact: r?.sourceContact || '',
    sourceId: r?.sourceId || (type === 'medico' ? medicoId : ''),
    note: r?.note || '',
  };
}

export default function LeadReferralEditorModal({
  open,
  lead,
  medicoId,
  medicoNome,
  userEmail,
  pacientes: pacientesProp = [],
  onClose,
  onSaved,
}: Props) {
  const t = useMedicoLeadsCrmTheme();
  const [draft, setDraft] = useState(() => initialDraft(lead, medicoId, medicoNome));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedPacientes, setLoadedPacientes] = useState<PacienteCompleto[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [buscaPaciente, setBuscaPaciente] = useState('');

  const pacientes = pacientesProp.length > 0 ? pacientesProp : loadedPacientes;
  const pacientesSorted = useMemo(() => sortPacientes(pacientes), [pacientes]);

  const pacientesFiltrados = useMemo(() => {
    const q = buscaPaciente.toLowerCase().trim();
    if (!q) return pacientesSorted;
    return pacientesSorted.filter((p) => pacienteDisplayName(p).toLowerCase().includes(q));
  }, [buscaPaciente, pacientesSorted]);

  const selectedPaciente = useMemo(
    () => (draft.sourceId ? pacientesSorted.find((p) => p.id === draft.sourceId) : undefined),
    [draft.sourceId, pacientesSorted]
  );

  useEffect(() => {
    if (!open) return;
    const next = initialDraft(lead, medicoId, medicoNome);
    setDraft(next);
    setError(null);
    setBuscaPaciente('');
    if (next.type === 'paciente' && next.sourceId) {
      const p = pacientesProp.find((item) => item.id === next.sourceId);
      if (p) setBuscaPaciente(pacienteDisplayName(p));
    }
  }, [open, lead, medicoId, medicoNome, pacientesProp]);

  useEffect(() => {
    if (!open || draft.type !== 'paciente') return;
    if (pacientesProp.length > 0) return;

    let cancelled = false;
    setLoadingPacientes(true);
    PacienteService.getPacientesByMedico(medicoId)
      .then((list) => {
        if (!cancelled) setLoadedPacientes(list);
      })
      .catch(() => {
        if (!cancelled) setLoadedPacientes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPacientes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, draft.type, medicoId, pacientesProp.length]);

  useEffect(() => {
    if (!open || draft.type !== 'paciente' || !draft.sourceId) return;
    const p = pacientesSorted.find((item) => item.id === draft.sourceId);
    if (p) setBuscaPaciente(pacienteDisplayName(p));
  }, [open, draft.type, draft.sourceId, pacientesSorted]);

  const handleTypeChange = (type: LeadReferralType) => {
    setDraft((prev) => {
      const next = { ...prev, type };
      if (type === 'medico') {
        next.sourceId = medicoId;
        next.sourceName = medicoNome || prev.sourceName;
        next.sourceContact = '';
        next.note = '';
      } else if (type === 'desconhecido') {
        next.sourceId = '';
        next.sourceName = '';
        next.sourceContact = '';
        next.note = '';
      } else if (type === 'landing') {
        next.sourceName = prev.sourceName || 'Landing page';
        next.sourceId = '';
      } else if (type === 'paciente') {
        next.sourceContact = '';
        next.note = '';
      }
      return next;
    });
    if (type === 'paciente') setBuscaPaciente('');
  };

  const selecionarPaciente = (p: PacienteCompleto) => {
    const nome = pacienteDisplayName(p);
    setDraft((prev) => ({
      ...prev,
      type: 'paciente',
      sourceId: p.id,
      sourceName: nome,
      sourceContact: pacientePhone(p) || '',
    }));
    setBuscaPaciente(nome);
    setError(null);
  };

  const buildSnapshot = (): LeadReferralSnapshot | null => {
    const now = new Date();
    const base = {
      updatedAt: now,
      updatedBy: userEmail || undefined,
      updatedManually: true,
      capturedAt: lead.referral?.capturedAt ?? now,
    };

    if (draft.type === 'desconhecido') {
      return { type: 'desconhecido', ...base };
    }

    if (draft.type === 'medico') {
      return {
        type: 'medico',
        sourceId: medicoId,
        sourceName: medicoNome || draft.sourceName.trim() || undefined,
        ...base,
      };
    }

    if (draft.type === 'manual') {
      const name = draft.sourceName.trim();
      if (!name) return null;
      return {
        type: 'manual',
        sourceName: name,
        sourceContact: draft.sourceContact.trim() || undefined,
        note: draft.note.trim() || undefined,
        ...base,
      };
    }

    if (draft.type === 'landing') {
      return {
        type: 'landing',
        sourceName: draft.sourceName.trim() || 'Landing page',
        ...base,
      };
    }

    if (draft.type === 'paciente') {
      const patientId = draft.sourceId.trim();
      if (!patientId) return null;
      const p = pacientesSorted.find((item) => item.id === patientId);
      const name = p ? pacienteDisplayName(p) : draft.sourceName.trim();
      if (!name) return null;
      return {
        type: 'paciente',
        sourceId: patientId,
        sourceName: name,
        sourceContact: p ? pacientePhone(p) : draft.sourceContact.trim() || undefined,
        ...base,
      };
    }

    const name = draft.sourceName.trim();
    if (!name) return null;

    return {
      type: draft.type,
      sourceId: draft.sourceId.trim() || undefined,
      sourceName: name || undefined,
      sourceContact: draft.sourceContact.trim() || undefined,
      note: draft.note.trim() || undefined,
      ...base,
    };
  };

  const handleSave = async () => {
    const snapshot = buildSnapshot();
    if (!snapshot) {
      setError(draft.type === 'paciente' ? 'Selecione um paciente.' : 'Preencha o nome da origem.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const leadId = resolveLeadMedicoId(lead);
      await LeadMedicoService.updateLeadReferral(leadId, snapshot, userEmail || undefined);
      onSaved(snapshot);
      onClose();
    } catch (e) {
      setError((e as Error).message || 'Erro ao salvar origem.');
    } finally {
      setBusy(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  const showName =
    draft.type !== 'desconhecido' && draft.type !== 'medico' && draft.type !== 'paciente';
  const showContact = draft.type === 'nutricionista' || draft.type === 'personal' || draft.type === 'manual';
  const showNote = draft.type === 'manual';
  const showSourceId = draft.type === 'nutricionista' || draft.type === 'personal';
  const showPacientePicker = draft.type === 'paciente';

  const content = (
    <div
      className="fixed inset-0 z-[10080] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl ${t.cardBg} ${t.cardBorder}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${t.divider}`}>
          <div>
            <h2 className={`text-base font-semibold ${t.textPrimary}`}>Editar origem do lead</h2>
            <p className={`text-xs mt-0.5 ${t.textMuted}`}>{lead.name}</p>
          </div>
          <button type="button" onClick={onClose} className={t.closeBtn} aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {error && <p className={`text-sm px-3 py-2 rounded-lg border ${t.messageErr}`}>{error}</p>}

          <div>
            <label className={`block text-xs font-medium mb-1 ${t.label}`}>Tipo de origem</label>
            <select
              value={draft.type}
              onChange={(e) => handleTypeChange(e.target.value as LeadReferralType)}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${t.input}`}
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {draft.type === 'medico' && (
            <p className={`text-sm ${t.textMuted}`}>
              Origem direta do médico{medicoNome ? `: ${medicoNome}` : ''}.
            </p>
          )}

          {showPacientePicker && (
            <div>
              <label className={`block text-xs font-medium mb-1 ${t.label}`}>Paciente indicador</label>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.textMuted}`} />
                <input
                  type="text"
                  value={buscaPaciente}
                  onChange={(e) => setBuscaPaciente(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${t.input}`}
                  placeholder="Buscar paciente..."
                />
              </div>

              {loadingPacientes ? (
                <div className={`flex items-center gap-2 mt-2 text-sm ${t.textMuted}`}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando pacientes...
                </div>
              ) : pacientesSorted.length === 0 ? (
                <p className={`mt-2 text-sm ${t.textMuted}`}>Nenhum paciente encontrado para este médico.</p>
              ) : (
                <div className={`mt-2 max-h-52 overflow-y-auto rounded-lg border ${t.cardBorder}`}>
                  {pacientesFiltrados.length === 0 ? (
                    <p className={`px-3 py-2 text-sm ${t.textMuted}`}>Nenhum paciente corresponde à busca.</p>
                  ) : (
                    pacientesFiltrados.map((p) => {
                      const nome = pacienteDisplayName(p);
                      const isSelected = draft.sourceId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selecionarPaciente(p)}
                          className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 transition-colors ${
                            isSelected
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : `${t.textPrimary} hover:bg-black/5 dark:hover:bg-white/5`
                          }`}
                        >
                          {nome}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {selectedPaciente && (
                <p className={`mt-2 text-xs ${t.textMuted}`}>
                  Selecionado: <span className="font-medium">{pacienteDisplayName(selectedPaciente)}</span>
                </p>
              )}
            </div>
          )}

          {showName && (
            <div>
              <label className={`block text-xs font-medium mb-1 ${t.label}`}>
                {draft.type === 'manual'
                  ? 'Nome da pessoa ou origem'
                  : draft.type === 'landing'
                    ? 'Nome / descrição'
                    : 'Nome'}
              </label>
              <input
                type="text"
                value={draft.sourceName}
                onChange={(e) => setDraft((d) => ({ ...d, sourceName: e.target.value }))}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${t.input}`}
                maxLength={120}
                placeholder={
                  draft.type === 'nutricionista'
                    ? 'Ex.: Juliana Silva'
                    : draft.type === 'manual'
                      ? 'Ex.: João da Farmácia'
                      : 'Nome'
                }
              />
            </div>
          )}

          {showContact && (
            <div>
              <label className={`block text-xs font-medium mb-1 ${t.label}`}>
                {draft.type === 'paciente' ? 'Telefone' : 'Contato (opcional)'}
              </label>
              <input
                type="text"
                value={draft.sourceContact}
                onChange={(e) => setDraft((d) => ({ ...d, sourceContact: e.target.value }))}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${t.input}`}
                maxLength={40}
                placeholder="Telefone ou WhatsApp"
              />
            </div>
          )}

          {showSourceId && (
            <div>
              <label className={`block text-xs font-medium mb-1 ${t.label}`}>
                ID do profissional (opcional)
              </label>
              <input
                type="text"
                value={draft.sourceId}
                onChange={(e) => setDraft((d) => ({ ...d, sourceId: e.target.value }))}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${t.input}`}
                maxLength={80}
                placeholder="ID interno, se souber"
              />
            </div>
          )}

          {showNote && (
            <div>
              <label className={`block text-xs font-medium mb-1 ${t.label}`}>Observação (opcional)</label>
              <textarea
                value={draft.note}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                rows={2}
                className={`w-full px-3 py-2 text-sm rounded-lg border resize-none ${t.input}`}
                maxLength={300}
              />
            </div>
          )}

          {draft.type === 'desconhecido' && (
            <p className={`text-sm ${t.textMuted}`}>
              A origem será marcada como desconhecida. Você pode editar novamente depois.
            </p>
          )}
        </div>

        <div className={`flex justify-end gap-2 px-5 py-4 border-t ${t.divider}`}>
          <button type="button" onClick={onClose} className={`px-4 py-2 text-sm rounded-lg ${t.btnSecondary}`}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ${t.btnPrimary} disabled:opacity-50`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
