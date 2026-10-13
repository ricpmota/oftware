'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { classifyImportedContacts, normalizeOptOutList } from '@/lib/disparos/classifyImport';
import {
  DISPAROS_POLL_MS,
  DISPAROS_ROUTES,
  DISPAROS_WRITE_CHUNK,
} from '@/lib/disparos/constants';
import { DisparoCsvError, parseCsv, suggestColumnMapping } from '@/lib/disparos/parseCsv';
import type {
  CampaignItemStatus,
  DisparoCampaign,
  DisparoCampaignItem,
  DisparoColumnMapping,
  DisparoImport,
  DisparosWhatsappView,
  ImportedContact,
  ImportedContactStatus,
  NewDisparoDraft,
  ParsedCsv,
} from '@/lib/disparos/types';
import { DISPAROS_DEFAULT_DDD } from '@/lib/disparos/normalizeDisparoPhone';
import { initialDisparosWhatsappView } from '@/lib/disparos/whatsappView';
import DisparosCampaignDrawer from '@/components/metaadmingeral/disparos/DisparosCampaignDrawer';
import DisparosCampaignPanel from '@/components/metaadmingeral/disparos/DisparosCampaignPanel';
import DisparosContactsTable from '@/components/metaadmingeral/disparos/DisparosContactsTable';
import DisparosHistoryTable from '@/components/metaadmingeral/disparos/DisparosHistoryTable';
import DisparosImportSection from '@/components/metaadmingeral/disparos/DisparosImportSection';
import DisparosWhatsappCard from '@/components/metaadmingeral/disparos/DisparosWhatsappCard';
import { DisparosSectionTitle, DisparosSoftCard, DisparosStat } from '@/components/metaadmingeral/disparos/disparosUi';

const EMPTY_MAPPING: DisparoColumnMapping = { nome: '', telefone1: '', telefone2: '' };

type Props = {
  getAuthToken: () => Promise<string>;
};

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || 'Não foi possível concluir a operação.');
  return body;
}

export default function DisparosAdminPanel({ getAuthToken }: Props) {
  const [connection, setConnection] = useState<DisparosWhatsappView>(initialDisparosWhatsappView);
  const [fileName, setFileName] = useState<string | null>(null);
  const [listName, setListName] = useState('');
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<DisparoColumnMapping>(EMPTY_MAPPING);
  const [importError, setImportError] = useState<string | null>(null);
  const [optOutText, setOptOutText] = useState('');
  const [defaultDdd, setDefaultDdd] = useState(DISPAROS_DEFAULT_DDD);
  const [saving, setSaving] = useState(false);
  const [imports, setImports] = useState<DisparoImport[]>([]);
  const [currentImport, setCurrentImport] = useState<DisparoImport | null>(null);
  const [contacts, setContacts] = useState<ImportedContact[]>([]);
  const [contactCursor, setContactCursor] = useState<string | null>(null);
  const [contactPageCursor, setContactPageCursor] = useState<string | null>(null);
  const [contactCursorStack, setContactCursorStack] = useState<Array<string | null>>([]);
  const [contactQuery, setContactQuery] = useState('');
  const [contactStatus, setContactStatus] = useState<'todos' | ImportedContactStatus>('todos');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DisparoImport | null>(null);
  const [deleteCampaignTarget, setDeleteCampaignTarget] = useState<DisparoCampaign | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [startingCampaign, setStartingCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<DisparoCampaign[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [items, setItems] = useState<DisparoCampaignItem[]>([]);
  const [itemQuery, setItemQuery] = useState('');
  const [itemStatus, setItemStatus] = useState<'todos' | CampaignItemStatus>('todos');
  const [itemCursor, setItemCursor] = useState<string | null>(null);
  const [itemCursorStack, setItemCursorStack] = useState<Array<string | null>>([]);
  const [itemPageCursor, setItemPageCursor] = useState<string | null>(null);
  const itemPageCursorRef = useRef<string | null>(null);
  const itemCursorStackRef = useRef<Array<string | null>>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const activeCampaign = campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null;
  const previewContact = contacts.find((contact) => contact.status === 'valido') ?? null;

  const loadImports = useCallback(async () => {
    const token = await getAuthToken();
    const body = await api<{ imports: DisparoImport[] }>(DISPAROS_ROUTES.imports, token);
    setImports(body.imports);
    return body.imports;
  }, [getAuthToken]);

  const loadCampaigns = useCallback(async () => {
    const token = await getAuthToken();
    const body = await api<{ campaigns: DisparoCampaign[] }>(DISPAROS_ROUTES.campaigns, token);
    setCampaigns(body.campaigns);
    return body.campaigns;
  }, [getAuthToken]);

  const loadContacts = useCallback(
    async (importId: string, cursor: string | null, query = contactQuery, status = contactStatus) => {
      const token = await getAuthToken();
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      if (query.trim()) params.set('q', query.trim());
      if (status !== 'todos') params.set('status', status);
      const body = await api<{ contacts: ImportedContact[]; nextCursor: string | null }>(
        `${DISPAROS_ROUTES.imports}/${importId}/contatos?${params.toString()}`,
        token,
      );
      setContacts(body.contacts);
      setContactPageCursor(cursor);
      setContactCursor(body.nextCursor);
    },
    [contactQuery, contactStatus, getAuthToken],
  );

  const loadItems = useCallback(
    async (campaignId: string, query = itemQuery, status = itemStatus, cursor: string | null = null) => {
      const token = await getAuthToken();
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (status !== 'todos') params.set('status', status);
      if (cursor) params.set('cursor', cursor);
      const body = await api<{ items: DisparoCampaignItem[]; nextCursor: string | null }>(
        `${DISPAROS_ROUTES.campaigns}/${campaignId}/itens?${params.toString()}`,
        token,
      );
      setItems(body.items);
      setItemPageCursor(cursor);
      itemPageCursorRef.current = cursor;
      setItemCursor(body.nextCursor);
      return body;
    },
    [getAuthToken, itemQuery, itemStatus],
  );

  const followSendingPage = useCallback(
    async (campaignId: string) => {
      let cursor = itemPageCursorRef.current;
      const stack = [...itemCursorStackRef.current];
      let page = await loadItems(campaignId, '', 'todos', cursor);
      for (let step = 0; step < 12 && page; step += 1) {
        const stillOnPage = page.items.some((item) => item.status === 'pending' || item.status === 'processing');
        if (stillOnPage || !page.nextCursor) break;
        stack.push(cursor);
        cursor = page.nextCursor;
        page = await loadItems(campaignId, '', 'todos', cursor);
      }
      itemCursorStackRef.current = stack;
      setItemCursorStack(stack);
    },
    [loadItems],
  );

  useEffect(() => {
    let cancelled = false;
    void loadImports()
      .then((list) => {
        if (cancelled) return;
        const first = list[0];
        if (!first) return;
        setCurrentImport(first);
        void loadContacts(first.id, null, '', 'todos').catch((error: unknown) => {
          setImportError(error instanceof Error ? error.message : 'Não foi possível abrir a base.');
        });
      })
      .catch((error: unknown) => {
        setImportError(error instanceof Error ? error.message : 'Não foi possível carregar as bases.');
      });
    void loadCampaigns().catch((error: unknown) => {
      setImportError(error instanceof Error ? error.message : 'Não foi possível carregar as campanhas.');
    });
    return () => {
      cancelled = true;
    };
    // A lista mais recente abre uma vez. A busca não deve reabrir outra base.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadCampaigns, loadImports]);

  useEffect(() => {
    if (!activeCampaignId) return;
    const status = activeCampaign?.status;
    const shouldPoll = status === 'em_andamento' || status === 'preparando' || status === 'pausada';
    if (!shouldPoll) return;
    const follow = status === 'em_andamento' && !itemQuery && itemStatus === 'todos';
    const tick = () => {
      void loadCampaigns();
      if (follow) void followSendingPage(activeCampaignId);
      else void loadItems(activeCampaignId, itemQuery, itemStatus, itemPageCursorRef.current);
    };
    tick();
    const timer = window.setInterval(tick, DISPAROS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [activeCampaign?.status, activeCampaignId, followSendingPage, itemQuery, itemStatus, loadCampaigns, loadItems]);

  async function onFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportError('Envie um arquivo .csv.');
      return;
    }
    try {
      const text = await file.text();
      const next = parseCsv(text);
      setFileName(file.name);
      setListName(file.name.replace(/\.csv$/i, ''));
      setParsed(next);
      setMapping(suggestColumnMapping(next.headers));
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof DisparoCsvError ? error.message : 'Não foi possível ler o CSV.');
    }
  }

  async function applyMapping() {
    if (!parsed || !fileName || !mapping.nome || !mapping.telefone1) return;
    setSaving(true);
    setImportError(null);
    try {
      const phoneOptions = { defaultDdd };
      const classified = classifyImportedContacts({
        importId: 'pending',
        parsed,
        mapping,
        optOut: normalizeOptOutList(optOutText, phoneOptions),
        phoneOptions,
      });
      const token = await getAuthToken();
      const created = await api<{ importacao: DisparoImport }>(DISPAROS_ROUTES.imports, token, {
        method: 'POST',
        body: JSON.stringify({
          nome: listName.trim() || fileName,
          nomeArquivo: fileName,
          dddPadrao: defaultDdd,
          mapping,
          summary: classified.summary,
        }),
      });
      for (let index = 0; index < classified.contacts.length; index += DISPAROS_WRITE_CHUNK) {
        const chunk = classified.contacts.slice(index, index + DISPAROS_WRITE_CHUNK).map((contact) => ({
          rowNumber: contact.rowNumber,
          nome: contact.nome,
          primeiroNome: contact.primeiroNome,
          telefone1Original: contact.telefone1.original,
          telefone2Original: contact.telefone2?.original ?? null,
          status: contact.status,
          optOut: contact.optOut,
        }));
        await api(`${DISPAROS_ROUTES.imports}/${created.importacao.id}/contatos`, token, {
          method: 'POST',
          body: JSON.stringify({ contacts: chunk }),
        });
      }
      const finished = await api<{ importacao: DisparoImport }>(
        `${DISPAROS_ROUTES.imports}/${created.importacao.id}/concluir`,
        token,
        { method: 'POST' },
      );
      setCurrentImport(finished.importacao);
      setSelectedIds([]);
      setContactCursorStack([]);
      setContactQuery('');
      setContactStatus('todos');
      await loadContacts(finished.importacao.id, null, '', 'todos');
      await loadImports();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Não foi possível salvar a base.');
    } finally {
      setSaving(false);
    }
  }

  async function openImport(item: DisparoImport) {
    setCurrentImport(item);
    setSelectedIds([]);
    setContactCursorStack([]);
    setContactQuery('');
    setContactStatus('todos');
    await loadContacts(item.id, null, '', 'todos');
  }

  async function removeImport() {
    if (!deleteTarget) return;
    const token = await getAuthToken();
    await api(`${DISPAROS_ROUTES.imports}/${deleteTarget.id}`, token, { method: 'DELETE' });
    if (currentImport?.id === deleteTarget.id) {
      setCurrentImport(null);
      setContacts([]);
    }
    setDeleteTarget(null);
    await loadImports();
  }

  function scrollToFollowUp() {
    requestAnimationFrame(() => {
      document.getElementById('disparos-acompanhamento')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function startCampaign(draft: NewDisparoDraft) {
    if (!currentImport || startingCampaign) return;
    setWizardOpen(false);
    setCampaignError(null);
    setStartingCampaign(true);
    setItemQuery('');
    setItemStatus('todos');
    itemPageCursorRef.current = null;
    itemCursorStackRef.current = [];
    setItemCursorStack([]);
    scrollToFollowUp();
    try {
      const token = await getAuthToken();
      const body = await api<{ campaign: DisparoCampaign }>(DISPAROS_ROUTES.campaigns, token, {
        method: 'POST',
        body: JSON.stringify({
          nome: draft.name,
          importacaoId: currentImport.id,
          messageTemplate: draft.messageTemplate,
          phoneChoice: draft.phoneChoice,
          audience: draft.audience,
          intervalMinutes: draft.intervalMinutes,
          selectedIds: draft.audience === 'selecionados' ? [...selectedSet] : [],
          senderPhone: connection.phone,
          senderProfileName: connection.profileName,
        }),
      });
      setActiveCampaignId(body.campaign.id);
      await loadCampaigns();
      await loadItems(body.campaign.id, '', 'todos');
      scrollToFollowUp();
    } catch (error) {
      setCampaignError(error instanceof Error ? error.message : 'Não foi possível iniciar o disparo.');
      scrollToFollowUp();
    } finally {
      setStartingCampaign(false);
    }
  }

  async function removeCampaign() {
    if (!deleteCampaignTarget) return;
    const target = deleteCampaignTarget;
    try {
      const token = await getAuthToken();
      await api(`${DISPAROS_ROUTES.campaigns}/${target.id}`, token, { method: 'DELETE' });
      if (activeCampaignId === target.id) {
        setActiveCampaignId(null);
        setItems([]);
      }
      setDeleteCampaignTarget(null);
      await loadCampaigns();
    } catch (error) {
      setDeleteCampaignTarget(null);
      setCampaignError(error instanceof Error ? error.message : 'Não foi possível excluir a campanha.');
    }
  }

  async function campaignAction(action: 'pausar' | 'continuar' | 'cancelar', retryFailed = false) {
    if (!activeCampaign) return;
    const token = await getAuthToken();
    await api(`${DISPAROS_ROUTES.campaigns}/${activeCampaign.id}/${action}`, token, {
      method: 'POST',
      ...(action === 'continuar' ? { body: JSON.stringify({ retryFailed }) } : {}),
    });
    await loadCampaigns();
    await loadItems(activeCampaign.id, itemQuery, itemStatus, null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#E8EDED]">Disparos</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#E8EDED]/60">
            Importe contatos, prepare campanhas e acompanhe seus envios pelo WhatsApp.
          </p>
        </div>
        <button
          type="button"
          disabled={!currentImport || currentImport.summary.validos === 0}
          onClick={() => setWizardOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4CCB7A] px-4 py-2.5 text-sm font-semibold text-[#062015] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Novo disparo
        </button>
      </div>

      <div id="disparos-whatsapp">
        <DisparosWhatsappCard
          connection={connection}
          getAuthToken={getAuthToken}
          onConnectionChange={setConnection}
        />
      </div>

      <DisparosSoftCard>
        <DisparosSectionTitle title="Bases de contatos" hint="Listas gravadas. Elas continuam depois de atualizar a página." />
        {imports.length === 0 ? (
          <p className="mt-4 text-sm text-[#E8EDED]/50">Nenhuma base salva ainda.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {imports.map((item) => (
              <article key={item.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-medium text-[#E8EDED]">{item.name}</h3>
                  <p className="mt-1 text-sm text-[#E8EDED]/60">
                    {item.summary.validos.toLocaleString('pt-BR')} contatos válidos ·{' '}
                    {new Date(item.importedAt).toLocaleDateString('pt-BR')}
                    {item.status === 'importando' ? ' · salvando' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void openImport(item)} className="rounded-xl border border-white/15 px-3 py-2 text-sm text-[#E8EDED]">
                    Abrir
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void openImport(item).then(() => setWizardOpen(true));
                    }}
                    className="rounded-xl bg-[#4CCB7A] px-3 py-2 text-sm font-semibold text-[#062015]"
                  >
                    Usar em disparo
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(item)} className="rounded-xl border border-rose-400/30 px-3 py-2 text-sm text-rose-100">
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </DisparosSoftCard>

      <DisparosImportSection
        fileName={fileName}
        headers={parsed?.headers ?? []}
        sampleRows={(parsed?.rows ?? []).slice(0, 5)}
        totalRows={parsed?.rows.length ?? 0}
        mapping={mapping}
        error={importError}
        optOutText={optOutText}
        defaultDdd={defaultDdd}
        listName={listName}
        saving={saving}
        onFile={onFile}
        onMapping={setMapping}
        onOptOutText={setOptOutText}
        onDefaultDdd={setDefaultDdd}
        onListName={setListName}
        onApply={() => void applyMapping()}
      />

      {currentImport ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DisparosStat label="Total" value={currentImport.summary.total.toLocaleString('pt-BR')} />
            <DisparosStat label="Válidos" value={currentImport.summary.validos.toLocaleString('pt-BR')} />
            <DisparosStat label="Inválidos" value={currentImport.summary.invalidos.toLocaleString('pt-BR')} />
            <DisparosStat label="Duplicados" value={currentImport.summary.duplicados.toLocaleString('pt-BR')} />
          </div>
          <DisparosContactsTable
            contacts={contacts}
            selectedIds={selectedSet}
            showPhone2={Boolean(currentImport.mapping.telefone2)}
            onToggle={(id) =>
              setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
            }
            onReplaceSelection={setSelectedIds}
            remote={{
              query: contactQuery,
              status: contactStatus,
              label: `${currentImport.summary.total.toLocaleString('pt-BR')} na base`,
              hasPrev: contactCursorStack.length > 0,
              hasNext: Boolean(contactCursor),
              onQuery: (value) => {
                setContactQuery(value);
                setContactCursorStack([]);
                void loadContacts(currentImport.id, null, value, contactStatus);
              },
              onStatus: (value) => {
                setContactStatus(value);
                setContactCursorStack([]);
                void loadContacts(currentImport.id, null, contactQuery, value);
              },
              onPrev: () => {
                const previous = contactCursorStack.at(-1) ?? null;
                setContactCursorStack((current) => current.slice(0, -1));
                void loadContacts(currentImport.id, previous);
              },
              onNext: () => {
                if (!contactCursor) return;
                setContactCursorStack((current) => [...current, contactPageCursor]);
                void loadContacts(currentImport.id, contactCursor);
              },
            }}
          />
        </div>
      ) : null}

      <div id="disparos-acompanhamento" className="scroll-mt-6 space-y-3">
        {startingCampaign ? (
          <p className="text-sm text-[#E8EDED]/70">Preparando a campanha. O acompanhamento aparece aqui.</p>
        ) : null}
        {campaignError ? <p className="text-sm text-rose-200">{campaignError}</p> : null}
      <DisparosCampaignPanel
        campaign={activeCampaign}
        items={items}
        itemQuery={itemQuery}
        itemStatus={itemStatus}
        hasPrevItems={itemCursorStack.length > 0}
        hasNextItems={Boolean(itemCursor)}
        onPrevItems={() => {
          if (!activeCampaign) return;
          const previous = itemCursorStack.at(-1) ?? null;
          const nextStack = itemCursorStack.slice(0, -1);
          itemCursorStackRef.current = nextStack;
          setItemCursorStack(nextStack);
          void loadItems(activeCampaign.id, itemQuery, itemStatus, previous);
        }}
        onNextItems={() => {
          if (!activeCampaign || !itemCursor) return;
          const nextStack = [...itemCursorStack, itemPageCursor];
          itemCursorStackRef.current = nextStack;
          setItemCursorStack(nextStack);
          void loadItems(activeCampaign.id, itemQuery, itemStatus, itemCursor);
        }}
        onItemQuery={(value) => {
          setItemQuery(value);
          itemPageCursorRef.current = null;
          itemCursorStackRef.current = [];
          setItemCursorStack([]);
          if (activeCampaign) void loadItems(activeCampaign.id, value, itemStatus, null);
        }}
        onItemStatus={(value) => {
          setItemStatus(value);
          itemPageCursorRef.current = null;
          itemCursorStackRef.current = [];
          setItemCursorStack([]);
          if (activeCampaign) void loadItems(activeCampaign.id, itemQuery, value, null);
        }}
        onPause={() => void campaignAction('pausar')}
        onResume={(retryFailed) => void campaignAction('continuar', retryFailed)}
        onCancel={() => void campaignAction('cancelar')}
        onConnect={() => document.getElementById('disparos-whatsapp')?.scrollIntoView({ behavior: 'smooth' })}
        onUpdateList={async () => {
          if (!activeCampaign) return;
          const token = await getAuthToken();
          await api(`${DISPAROS_ROUTES.campaigns}/${activeCampaign.id}/atualizar-lista`, token, { method: 'POST' });
          const imports = await loadImports();
          const source = imports.find((item) => item.id === activeCampaign.importId);
          if (source) {
            setCurrentImport(source);
            await loadContacts(source.id, null, '', 'todos');
          }
          await loadCampaigns();
        }}
      />
      </div>

      <DisparosHistoryTable
        campaigns={campaigns}
        activeId={activeCampaignId}
        onOpen={(id) => {
          setActiveCampaignId(id);
          setItemQuery('');
          setItemStatus('todos');
          itemPageCursorRef.current = null;
          itemCursorStackRef.current = [];
          setItemCursorStack([]);
          void loadItems(id, '', 'todos');
          scrollToFollowUp();
        }}
        onDelete={setDeleteCampaignTarget}
      />

      <DisparosCampaignDrawer
        open={wizardOpen}
        validCount={currentImport?.summary.validos ?? 0}
        selectedCount={selectedIds.length}
        previewContact={previewContact}
        connection={connection}
        onClose={() => setWizardOpen(false)}
        onStart={(draft) => void startCampaign(draft)}
      />

      {deleteCampaignTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A1F44] p-5">
            <h4 className="text-base font-semibold text-[#E8EDED]">Excluir {deleteCampaignTarget.name}?</h4>
            <p className="mt-2 text-sm text-[#E8EDED]/70">
              Esta campanha sai do histórico. Nenhuma mensagem nova é enviada. A base de contatos permanece.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteCampaignTarget(null)} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[#E8EDED]">
                Cancelar
              </button>
              <button type="button" onClick={() => void removeCampaign()} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white">
                Excluir
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A1F44] p-5">
            <h4 className="text-base font-semibold text-[#E8EDED]">Excluir {deleteTarget.name}?</h4>
            <p className="mt-2 text-sm text-[#E8EDED]/70">
              Se esta base já entrou em uma campanha, ela sai da lista e os contatos ficam guardados para auditoria. A
              campanha não é apagada.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[#E8EDED]">
                Cancelar
              </button>
              <button type="button" onClick={() => void removeImport()} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white">
                Excluir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
