'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase';
import type { ContratoPadraoEditor } from '@/lib/contratos/contratoPadraoTypes';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  Trash2,
  UserPlus,
} from 'lucide-react';

type SystemUser = {
  uid: string;
  email: string;
  displayName: string;
  disabled?: boolean;
};

async function authFetch(url: string, init?: RequestInit) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente.');
  const token = await user.getIdToken();
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}

const selectCls =
  'w-full rounded-lg border border-white/20 bg-[#0A1F44] px-3 py-2 text-sm text-[#E8EDED] focus:border-[#4CCB7A]/60 focus:outline-none';

export default function ContratosMedicoPacienteAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [editors, setEditors] = useState<ContratoPadraoEditor[]>([]);
  const [savedEditors, setSavedEditors] = useState<ContratoPadraoEditor[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [selectedUid, setSelectedUid] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [templateLength, setTemplateLength] = useState(0);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const isDirty = useMemo(
    () => JSON.stringify(editors) !== JSON.stringify(savedEditors),
    [editors, savedEditors]
  );

  const availableUsers = useMemo(() => {
    const editorUids = new Set(editors.map((e) => e.uid));
    return systemUsers
      .filter((u) => u.email && !u.disabled && !editorUids.has(u.uid))
      .sort((a, b) => {
        const nameA = (a.displayName || a.email).toLowerCase();
        const nameB = (b.displayName || b.email).toLowerCase();
        return nameA.localeCompare(nameB, 'pt-BR');
      });
  }, [systemUsers, editors]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/metaadmingeral/contratos/medico-paciente');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar.');
      setEditors(data.editors || []);
      setSavedEditors(data.editors || []);
      setUpdatedAt(data.updatedAt || null);
      setTemplateLength(data.templateLength || 0);
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao carregar.' });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSystemUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao listar usuários.');
      setSystemUsers(
        (data.users || []).map((u: SystemUser) => ({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || u.email,
          disabled: u.disabled,
        }))
      );
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao listar usuários.' });
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
    void loadSystemUsers();
  }, [loadConfig, loadSystemUsers]);

  const addEditor = () => {
    const user = systemUsers.find((u) => u.uid === selectedUid);
    if (!user?.email) return;
    setEditors((prev) => [
      ...prev,
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
      },
    ]);
    setSelectedUid('');
  };

  const removeEditor = (uid: string) => {
    setEditors((prev) => prev.filter((e) => e.uid !== uid));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch('/api/metaadmingeral/contratos/medico-paciente', {
        method: 'PUT',
        body: JSON.stringify({ editors }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar.');
      setEditors(data.editors || editors);
      setSavedEditors(data.editors || editors);
      setUpdatedAt(data.updatedAt || null);
      setMessage({ type: 'ok', text: 'Permissões de edição salvas.' });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#4CCB7A]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-[#E8EDED]">Editores autorizados</h2>
        <p className="mt-1 text-sm text-[#E8EDED]/70">
          Apenas os usuários listados abaixo podem salvar alterações em{' '}
          <a href="/contratopadrao" className="text-[#4CCB7A] hover:underline">
            /contratopadrao
          </a>
          . O administrador geral sempre pode editar.
        </p>
        {updatedAt && (
          <p className="mt-2 text-xs text-[#E8EDED]/50">
            Permissões atualizadas em {new Date(updatedAt).toLocaleString('pt-BR')}
            {templateLength > 0 ? ` · Contrato com ${templateLength.toLocaleString('pt-BR')} caracteres` : ''}
          </p>
        )}
      </div>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'border-[#4CCB7A]/30 bg-[#4CCB7A]/10 text-[#4CCB7A]'
              : 'border-red-400/30 bg-red-500/10 text-red-200'
          }`}
        >
          {message.type === 'ok' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <h3 className="text-sm font-medium text-[#E8EDED]">Adicionar editor</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-[#E8EDED]/60">Usuário do sistema</label>
            <select
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value)}
              disabled={loadingUsers || availableUsers.length === 0}
              className={selectCls}
            >
              <option value="">
                {loadingUsers
                  ? 'Carregando usuários...'
                  : availableUsers.length === 0
                    ? 'Todos os usuários já foram adicionados'
                    : 'Selecione um usuário'}
              </option>
              {availableUsers.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {(u.displayName || u.email) + (u.displayName ? ` (${u.email})` : '')}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={addEditor}
            disabled={!selectedUid}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4CCB7A] px-4 py-2 text-sm font-semibold text-[#0A1F44] hover:bg-[#3db868] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="border-b border-white/10 px-5 py-3">
          <h3 className="text-sm font-medium text-[#E8EDED]">
            Pessoas autorizadas ({editors.length})
          </h3>
        </div>
        {editors.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[#E8EDED]/50">
            Nenhum editor autorizado além do administrador geral.
          </p>
        ) : (
          <ul className="divide-y divide-white/10">
            {editors.map((editor) => (
              <li
                key={editor.uid}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-[#E8EDED]">
                    {editor.displayName || editor.email}
                  </p>
                  <p className="text-xs text-[#E8EDED]/50">{editor.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeEditor(editor.uid)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !isDirty}
          className="inline-flex items-center gap-2 rounded-lg bg-[#4CCB7A] px-5 py-2.5 text-sm font-semibold text-[#0A1F44] hover:bg-[#3db868] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar permissões
        </button>
      </div>
    </div>
  );
}
