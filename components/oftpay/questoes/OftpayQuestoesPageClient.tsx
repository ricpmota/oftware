'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createEmptyOftpayQuestaoDraft, validateOftpayQuestao } from '@/lib/oftpay/questoes/validateQuestao';
import {
  createQuestao,
  deleteQuestao,
  listQuestoesAdmin,
  listQuestoesPublicadas,
  markQuestaoAsReview,
  publicarQuestao,
  updateQuestao,
  OftpayQuestoesPermissionError,
  OftpayQuestoesValidationError,
  type OftpayQuestaoDoc,
} from '@/services/oftpayQuestoesService';
import OftpayKnowledgeMapPanel from './OftpayKnowledgeMapPanel';
import OftpaySourcesPanel from './OftpaySourcesPanel';
import QuestaoFonteOficialBlock, {
  hasQuestaoFonteOficial,
  QuestaoFonteOficialModal,
} from './QuestaoFonteOficialBlock';
import OftpayPerformancePanel from './OftpayPerformancePanel';
import OftreviewContentPanel from './OftreviewContentPanel';
import OftpayCreatorGuidedPanel from './OftpayCreatorGuidedPanel';
import OftpayCreatorOverviewPanel from './OftpayCreatorOverviewPanel';
import OftpaySimuladoPanel from './OftpaySimuladoPanel';
import {
  QUESTOES_ADMIN_EMAIL,
  OFTREVIEW_APOSTILAS_GCS_URI,
  type AlternativaLetra,
  type OftpayQuestao,
  type QuestaoDificuldade,
  type QuestaoStatus,
  getQuestaoPublishChecklist,
  getQuestaoCapituloDisplay,
} from '@/types/oftpayQuestoes';
import type { OftpayQuestoesPageTab } from '@/types/oftpayKnowledgeMap';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  PenLine,
  Plus,
  Trash2,
  User as UserIcon,
  XCircle,
} from 'lucide-react';

type OftpayQuestoesPageTabExtended = OftpayQuestoesPageTab | 'trechos' | 'desempenho' | 'conteudo';

type CreatorMode = 'guiado' | 'manual';

function isQuestoesAdmin(user: User | null): boolean {
  if (!user?.email) return false;
  return user.email.toLowerCase() === QUESTOES_ADMIN_EMAIL.toLowerCase();
}

const DIFICULDADE_LABEL: Record<QuestaoDificuldade, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
};

const STATUS_LABEL: Record<QuestaoStatus, string> = {
  rascunho: 'Rascunho',
  revisao: 'Revisão',
  publicado: 'Publicado',
};

const STATUS_BADGE: Record<QuestaoStatus, string> = {
  rascunho: 'bg-gray-100 text-gray-700',
  revisao: 'bg-amber-100 text-amber-800',
  publicado: 'bg-green-100 text-green-800',
};

function PublishChecklist({ questao }: { questao: OftpayQuestaoDoc }) {
  const { items, canPublish } = getQuestaoPublishChecklist(questao);
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 space-y-1">
      <p className="text-xs font-medium text-gray-600 mb-1">Checklist para publicar</p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li
            key={item.id}
            className={`text-xs flex items-center gap-1.5 ${
              item.ok ? 'text-green-700' : item.optional ? 'text-gray-400' : 'text-red-700'
            }`}
          >
            {item.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            {item.label}
            {item.optional && !item.ok && (
              <span className="text-gray-400">(opcional)</span>
            )}
          </li>
        ))}
      </ul>
      {!canPublish && (
        <p className="text-xs text-amber-800 pt-1">Corrija os itens pendentes antes de publicar.</p>
      )}
    </div>
  );
}

interface QuestaoAdminReviewCardProps {
  questao: OftpayQuestaoDoc;
  onEdit: () => void;
  onMarkReview: () => void;
  onPublish: () => void;
  onDelete: () => void;
  loadingAction: 'review' | 'publish' | null;
}

function QuestaoAdminReviewCard({
  questao,
  onEdit,
  onMarkReview,
  onPublish,
  onDelete,
  loadingAction,
}: QuestaoAdminReviewCardProps) {
  const { canPublish } = getQuestaoPublishChecklist(questao);
  const [fonteModalOpen, setFonteModalOpen] = useState(false);
  const showVerFonte = hasQuestaoFonteOficial(questao);

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[questao.status]}`}>
            {STATUS_LABEL[questao.status]}
          </span>
          <span className="text-xs rounded-full bg-blue-50 text-blue-700 px-2 py-0.5">
            {DIFICULDADE_LABEL[questao.dificuldade]}
          </span>
          {questao.sourceId && (
            <span className="text-xs rounded-full bg-violet-50 text-violet-800 px-2 py-0.5">
              Com sourceId
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {showVerFonte && (
            <button
              type="button"
              onClick={() => setFonteModalOpen(true)}
              className="text-xs px-2.5 py-1 rounded-lg border border-blue-200 text-blue-800 hover:bg-blue-50"
            >
              Ver Fonte
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Editar
          </button>
          {questao.status !== 'revisao' && questao.status !== 'publicado' && (
            <button
              type="button"
              onClick={onMarkReview}
              disabled={loadingAction != null}
              className="text-xs px-2.5 py-1 rounded-lg border border-amber-200 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
            >
              {loadingAction === 'review' ? '…' : 'Marcar como revisão'}
            </button>
          )}
          {questao.status !== 'publicado' && (
            <button
              type="button"
              onClick={onPublish}
              disabled={!canPublish || loadingAction != null}
              title={!canPublish ? 'Checklist incompleto' : 'Publicar'}
              className="text-xs px-2.5 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingAction === 'publish' ? '…' : 'Publicar'}
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={loadingAction != null}
            className="p-1 rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-600 space-y-0.5">
        <p>
          {questao.capituloTitulo?.trim() ? (
            <>
              <span className="font-medium text-gray-800">Capítulo:</span>{' '}
              {questao.capituloTitulo}
            </>
          ) : (
            <>
              <span className="font-medium text-gray-800">Tema:</span>{' '}
              {questao.tema || '—'}
            </>
          )}
          {questao.subtema && (
            <>
              {' '}
              · <span className="font-medium text-gray-800">Subtema:</span> {questao.subtema}
            </>
          )}
        </p>
        <p>
          <span className="font-medium text-gray-800">Apostila:</span>{' '}
          {questao.fonte.apostilaTitulo || '—'}
          {questao.fonte.pagina != null && (
            <>
              {' '}
              · <span className="font-medium text-gray-800">Pág.</span> {questao.fonte.pagina}
            </>
          )}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Enunciado</p>
        <p className="text-sm text-gray-900 whitespace-pre-wrap">{questao.enunciado || '—'}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Alternativas</p>
        <ul className="space-y-1">
          {questao.alternativas.map((alt) => (
            <li
              key={alt.letra}
              className={`text-sm rounded px-2 py-1 ${
                alt.correta
                  ? 'bg-green-50 border border-green-200 text-green-900 font-medium'
                  : 'text-gray-800'
              }`}
            >
              <span className="font-semibold mr-1">{alt.letra})</span>
              {alt.texto || '—'}
              {alt.correta && (
                <span className="ml-2 text-xs text-green-700">✓ correta</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Explicação</p>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{questao.explicacao || '—'}</p>
      </div>

      {questao.status !== 'publicado' && <PublishChecklist questao={questao} />}

      {fonteModalOpen && (
        <QuestaoFonteOficialModal
          questao={questao}
          onClose={() => setFonteModalOpen(false)}
        />
      )}
    </article>
  );
}

export default function OftpayQuestoesPageClient() {
  const [authChecked, setAuthChecked] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasQuestoesAccess, setHasQuestoesAccess] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeArea, setActiveArea] = useState<OftpayQuestoesPageTabExtended>('aluno');
  const [performanceRefreshKey, setPerformanceRefreshKey] = useState(0);
  const [creatorMode, setCreatorMode] = useState<CreatorMode>('guiado');
  const [manualExpanded, setManualExpanded] = useState(false);

  const [publicadas, setPublicadas] = useState<OftpayQuestaoDoc[]>([]);
  const [adminQuestoes, setAdminQuestoes] = useState<OftpayQuestaoDoc[]>([]);
  const [loadingPublicadas, setLoadingPublicadas] = useState(true);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [publicadasLoadError, setPublicadasLoadError] = useState<string | null>(null);
  const [adminLoadError, setAdminLoadError] = useState<string | null>(null);

  const [adminFiltroStatus, setAdminFiltroStatus] = useState<QuestaoStatus | ''>('rascunho');
  const [adminFiltroTema, setAdminFiltroTema] = useState('');
  const [adminFiltroCapitulo, setAdminFiltroCapitulo] = useState('');
  const [adminFiltroDificuldade, setAdminFiltroDificuldade] = useState<QuestaoDificuldade | ''>('');
  const [adminFiltroSourceId, setAdminFiltroSourceId] = useState<'todos' | 'com' | 'sem'>('todos');
  const [cardActionLoading, setCardActionLoading] = useState<{
    id: string;
    action: 'review' | 'publish';
  } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OftpayQuestao | null>(null);
  const [includeAltE, setIncludeAltE] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) {
      setAccessChecked(true);
      setHasQuestoesAccess(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/oftpay/allowed-courses', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) {
          setHasQuestoesAccess(Boolean(data.questoesEnabled));
        } else {
          setHasQuestoesAccess(false);
        }
      } catch {
        if (!cancelled) setHasQuestoesAccess(false);
      } finally {
        if (!cancelled) setAccessChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authChecked, user]);

  const isAdmin = isQuestoesAdmin(user);
  const canAccessPage = isAdmin || hasQuestoesAccess;
  const userEmail = user?.email ?? '';
  const userId = user?.uid ?? null;

  const loadPublicadas = useCallback(async () => {
    setLoadingPublicadas(true);
    setPublicadasLoadError(null);
    try {
      const list = await listQuestoesPublicadas();
      setPublicadas(list);
    } catch (e) {
      console.error('[questoes] loadPublicadas:', e);
      setPublicadas([]);
      setPublicadasLoadError(
        'Não foi possível carregar as questões publicadas. Tente recarregar a página.'
      );
    } finally {
      setLoadingPublicadas(false);
    }
  }, []);

  const loadAdmin = useCallback(async () => {
    if (!userEmail || !isAdmin) return;
    setLoadingAdmin(true);
    setAdminLoadError(null);
    try {
      const list = await listQuestoesAdmin(userEmail);
      setAdminQuestoes(list);
    } catch (e) {
      console.error('[questoes] loadAdmin:', e);
      setAdminQuestoes([]);
      if (e instanceof OftpayQuestoesPermissionError) {
        setAdminLoadError('Acesso negado.');
      } else {
        setAdminLoadError(
          'Não foi possível carregar as questões para revisão. Tente recarregar a página.'
        );
      }
    } finally {
      setLoadingAdmin(false);
    }
  }, [userEmail, isAdmin]);

  useEffect(() => {
    loadPublicadas();
  }, [loadPublicadas]);

  useEffect(() => {
    if (activeArea === 'criador' && isAdmin && userEmail) {
      loadAdmin();
    }
  }, [activeArea, isAdmin, userEmail, loadAdmin]);

  const adminStats = useMemo(
    () => ({
      total: adminQuestoes.length,
      rascunho: adminQuestoes.filter((q) => q.status === 'rascunho').length,
      revisao: adminQuestoes.filter((q) => q.status === 'revisao').length,
      publicado: adminQuestoes.filter((q) => q.status === 'publicado').length,
    }),
    [adminQuestoes]
  );

  const temasAdminUnicos = useMemo(() => {
    const set = new Set(adminQuestoes.map((q) => getQuestaoCapituloDisplay(q)).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [adminQuestoes]);

  const capitulosAdminUnicos = useMemo(() => {
    const set = new Set(
      adminQuestoes
        .map((q) => q.capituloTitulo?.trim())
        .filter((c): c is string => Boolean(c))
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [adminQuestoes]);

  const adminQuestoesFiltradas = useMemo(() => {
    const temaQ = adminFiltroTema.trim().toLowerCase();
    const capQ = adminFiltroCapitulo.trim().toLowerCase();
    return adminQuestoes.filter((q) => {
      if (adminFiltroStatus && q.status !== adminFiltroStatus) return false;
      if (adminFiltroDificuldade && q.dificuldade !== adminFiltroDificuldade) return false;
      if (adminFiltroSourceId === 'com' && !q.sourceId) return false;
      if (adminFiltroSourceId === 'sem' && q.sourceId) return false;
      const capDisplay = getQuestaoCapituloDisplay(q).toLowerCase();
      if (
        temaQ &&
        !capDisplay.includes(temaQ) &&
        !q.tema.toLowerCase().includes(temaQ) &&
        !(q.subtema ?? '').toLowerCase().includes(temaQ)
      ) {
        return false;
      }
      if (capQ) {
        const capTitulo = (q.capituloTitulo ?? '').trim().toLowerCase();
        if (!capTitulo.includes(capQ)) return false;
      }
      return true;
    });
  }, [
    adminQuestoes,
    adminFiltroStatus,
    adminFiltroTema,
    adminFiltroCapitulo,
    adminFiltroDificuldade,
    adminFiltroSourceId,
  ]);

  const openNewForm = () => {
    if (!userEmail) return;
    const draft = createEmptyOftpayQuestaoDraft(userEmail);
    setForm(draft);
    setEditingId(null);
    setIncludeAltE(false);
    setShowForm(true);
    setCreatorMode('manual');
    setManualExpanded(true);
    setFormError(null);
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  const openEditForm = (questao: OftpayQuestaoDoc) => {
    const { id, createdAt, updatedAt, ...rest } = questao;
    setForm({ ...rest, id });
    setEditingId(id);
    setIncludeAltE(questao.alternativas.some((a) => a.letra === 'E'));
    setShowForm(true);
    setCreatorMode('manual');
    setManualExpanded(true);
    setFormError(null);
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(null);
    setEditingId(null);
    setFormError(null);
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  const updateFormField = <K extends keyof OftpayQuestao>(key: K, value: OftpayQuestao[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateFonte = (patch: Partial<OftpayQuestao['fonte']>) => {
    setForm((prev) =>
      prev ? { ...prev, fonte: { ...prev.fonte, ...patch, sourceType: 'pdf_bucket' as const } } : prev
    );
  };

  const updateAlternativa = (letra: AlternativaLetra, patch: Partial<{ texto: string; correta: boolean }>) => {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        alternativas: prev.alternativas.map((alt) =>
          alt.letra === letra ? { ...alt, ...patch } : patch.correta ? { ...alt, correta: false } : alt
        ),
      };
    });
  };

  const setCorreta = (letra: AlternativaLetra) => {
    setForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        alternativas: prev.alternativas.map((alt) => ({ ...alt, correta: alt.letra === letra })),
      };
    });
  };

  const toggleAltE = (enabled: boolean) => {
    setIncludeAltE(enabled);
    setForm((prev) => {
      if (!prev) return prev;
      if (enabled) {
        if (prev.alternativas.some((a) => a.letra === 'E')) return prev;
        return {
          ...prev,
          alternativas: [...prev.alternativas, { letra: 'E', texto: '', correta: false }],
        };
      }
      return {
        ...prev,
        alternativas: prev.alternativas.filter((a) => a.letra !== 'E'),
      };
    });
  };

  const runPreviewValidation = (status: QuestaoStatus) => {
    if (!form) return;
    const preview = { ...form, status };
    const result = validateOftpayQuestao(status === 'publicado' ? preview : { ...preview, status });
    setValidationErrors(result.errors);
    setValidationWarnings(result.warnings);
  };

  const handleSaveDraft = async () => {
    if (!form || !userEmail) return;
    setSaving(true);
    setFormError(null);
    const status = form.status === 'publicado' ? 'rascunho' : form.status;
    const toSave: OftpayQuestao = { ...form, status };
    try {
      if (editingId) {
        await updateQuestao(editingId, toSave, userEmail);
      } else {
        const { id: _id, createdAt, updatedAt, ...createPayload } = toSave;
        await createQuestao(createPayload, userEmail);
      }
      await loadAdmin();
      closeForm();
    } catch (e) {
      if (e instanceof OftpayQuestoesValidationError) {
        setValidationErrors(e.errors);
        setValidationWarnings(e.warnings);
        setFormError('Corrija os erros antes de salvar.');
      } else {
        setFormError(e instanceof Error ? e.message : 'Erro ao salvar.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!form || !userEmail) return;
    const checklist = getQuestaoPublishChecklist({ ...form, status: 'publicado' });
    if (!checklist.canPublish) {
      setFormError('Checklist incompleto. Corrija os itens pendentes antes de publicar.');
      return;
    }
    setSaving(true);
    setFormError(null);
    runPreviewValidation('publicado');
    const payload = { ...form, status: 'publicado' as const };
    try {
      if (editingId) {
        await publicarQuestao(editingId, userEmail);
      } else {
        const { id: _id, createdAt, updatedAt, ...createPayload } = payload;
        await createQuestao(createPayload, userEmail);
      }
      await Promise.all([loadAdmin(), loadPublicadas()]);
      closeForm();
    } catch (e) {
      if (e instanceof OftpayQuestoesValidationError) {
        setValidationErrors(e.errors);
        setValidationWarnings(e.warnings);
        setFormError('Questão inválida para publicação. Preencha apostila, explicação e demais campos.');
      } else {
        setFormError(e instanceof Error ? e.message : 'Erro ao publicar.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReviewCard = async (id: string) => {
    if (!userEmail) return;
    setCardActionLoading({ id, action: 'review' });
    setFormError(null);
    try {
      await markQuestaoAsReview(id, userEmail);
      await loadAdmin();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao marcar revisão.');
    } finally {
      setCardActionLoading(null);
    }
  };

  const handlePublishCard = async (questao: OftpayQuestaoDoc) => {
    if (!userEmail) return;
    const { canPublish } = getQuestaoPublishChecklist(questao);
    if (!canPublish) {
      setFormError('Checklist incompleto. Edite a questão e corrija antes de publicar.');
      return;
    }
    if (!window.confirm('Publicar esta questão? Ela ficará visível na área do aluno.')) return;
    setCardActionLoading({ id: questao.id, action: 'publish' });
    setFormError(null);
    try {
      await publicarQuestao(questao.id, userEmail);
      await Promise.all([loadAdmin(), loadPublicadas()]);
    } catch (e) {
      if (e instanceof OftpayQuestoesValidationError) {
        setFormError(e.errors.join(' ') || 'Validação falhou.');
      } else {
        setFormError(e instanceof Error ? e.message : 'Erro ao publicar.');
      }
    } finally {
      setCardActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!userEmail || !window.confirm('Excluir esta questão?')) return;
    try {
      await deleteQuestao(id, userEmail);
      await loadAdmin();
      if (editingId === id) closeForm();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao excluir.');
    }
  };

  if (!authChecked || !accessChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <p className="text-gray-600 mb-4">Faça login no OftPay para acessar o Banco de Questões.</p>
        <Link href="/oftpay" className="text-blue-600 hover:underline text-sm font-medium">
          Ir para OftPay →
        </Link>
      </div>
    );
  }

  if (!canAccessPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-gray-800 font-medium mb-1">Acesso não liberado</p>
        <p className="text-gray-600 text-sm text-center max-w-md mb-4">
          O Banco de Questões não está liberado para sua conta. Solicite acesso ao administrador.
        </p>
        <Link href="/oftpay" className="text-blue-600 hover:underline text-sm font-medium">
          Voltar ao OftPay →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-4 flex items-center justify-between gap-4">
          <Link
            href="/oftpay"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Oftpay
          </Link>
          {authChecked && user && (
            <span className="inline-flex items-center gap-2 text-xs text-gray-500 truncate max-w-[240px]">
              <UserIcon className="w-3.5 h-3.5 flex-shrink-0" />
              {user.email}
            </span>
          )}
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 lg:py-8 space-y-8">
        <section className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
            Banco de Questões Oftreview
          </h1>
          <p className="text-gray-600 max-w-2xl text-sm md:text-base">
            Simulados personalizados e acompanhamento de desempenho por tópico.
          </p>
        </section>

        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
          <button
            type="button"
            onClick={() => setActiveArea('aluno')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeArea === 'aluno'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Área do aluno
          </button>
          <button
            type="button"
            onClick={() => setActiveArea('desempenho')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeArea === 'desempenho'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Meu Desempenho
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setActiveArea('criador')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeArea === 'criador'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <PenLine className="w-4 h-4" />
                Área do criador
              </button>
              <button
                type="button"
                onClick={() => setActiveArea('mapa')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeArea === 'mapa'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <BookMarked className="w-4 h-4" />
                Mapa das Apostilas
              </button>
              <button
                type="button"
                onClick={() => setActiveArea('trechos')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeArea === 'trechos'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Trechos Oficiais
              </button>
              <button
                type="button"
                onClick={() => setActiveArea('conteudo')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeArea === 'conteudo'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Database className="w-4 h-4" />
                Conteúdo Extraído
              </button>
            </>
          )}
        </div>

        {activeArea === 'aluno' && (
          <section aria-labelledby="questoes-aluno-heading">
            {publicadasLoadError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800 mb-6">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {publicadasLoadError}
              </div>
            )}

            <OftpaySimuladoPanel
              embedded
              userId={userId}
              userEmail={userEmail || null}
              publicadas={publicadas}
              loadingPublicadas={loadingPublicadas}
              onPerformanceRefresh={() => setPerformanceRefreshKey((k) => k + 1)}
            />
          </section>
        )}

        {activeArea === 'criador' && isAdmin && (
          <section className="space-y-6" aria-labelledby="questoes-criador-heading">
            {adminLoadError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {adminLoadError}
              </div>
            )}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <PenLine className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 id="questoes-criador-heading" className="text-lg font-medium text-gray-900">
                    Criação e revisão
                  </h2>
                  <p className="text-sm text-gray-600">
                    Fluxo principal: apostila oficial → tópicos → questão → rascunho → revisão →
                    publicação.
                  </p>
                </div>
              </div>
            </div>

            <OftpayCreatorOverviewPanel userEmail={userEmail} adminQuestoes={adminQuestoes} />

            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
              <button
                type="button"
                onClick={() => {
                  if (showForm && !editingId) closeForm();
                  setCreatorMode('guiado');
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  creatorMode === 'guiado'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Gerar por apostila/tópico
              </button>
              <button
                type="button"
                onClick={() => setCreatorMode('manual')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  creatorMode === 'manual'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <PenLine className="w-4 h-4" />
                Criar manualmente
              </button>
            </div>

            {creatorMode === 'guiado' && !showForm && (
              <OftpayCreatorGuidedPanel
                userEmail={userEmail}
                adminQuestoes={adminQuestoes}
                onGoToContentTab={() => setActiveArea('conteudo')}
                onQuestaoGenerated={loadAdmin}
              />
            )}

            {creatorMode === 'manual' && !showForm && (
              <details
                open={manualExpanded}
                onToggle={(e) => setManualExpanded((e.target as HTMLDetailsElement).open)}
                className="rounded-xl border border-gray-200 bg-white shadow-sm group"
              >
                <summary className="cursor-pointer list-none px-5 py-4 font-medium text-gray-900 flex items-center justify-between gap-2">
                  <span>Modo manual avançado</span>
                  <span className="text-xs font-normal text-gray-500 group-open:hidden">
                    Expandir
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-0 space-y-3 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    Use apenas para criar questões específicas manualmente.
                  </p>
                  <button
                    type="button"
                    onClick={openNewForm}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-800 text-white px-4 py-2 text-sm font-medium hover:bg-gray-900"
                  >
                    <Plus className="w-4 h-4" />
                    Abrir formulário manual
                  </button>
                </div>
              </details>
            )}

            {showForm && form && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                <h3 className="font-medium text-gray-900">
                  {editingId ? 'Editar questão' : 'Nova questão (modo manual avançado)'}
                </h3>
                {!editingId && (
                  <p className="text-xs text-gray-500 -mt-2">
                    Use apenas para criar questões específicas manualmente.
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tema *</label>
                    <input
                      value={form.tema}
                      onChange={(e) => updateFormField('tema', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subtema</label>
                    <input
                      value={form.subtema ?? ''}
                      onChange={(e) => updateFormField('subtema', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                  <p className="text-xs font-medium text-blue-900">Fonte (PDF oficial do bucket)</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Título da apostila *
                      </label>
                      <input
                        value={form.fonte.apostilaTitulo}
                        onChange={(e) => updateFonte({ apostilaTitulo: e.target.value })}
                        placeholder="Nome do PDF (sem extensão)"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Página</label>
                      <input
                        type="number"
                        min={1}
                        value={form.fonte.pagina ?? ''}
                        onChange={(e) =>
                          updateFonte({
                            pagina: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Trecho base</label>
                      <textarea
                        value={form.fonte.trechoBase ?? ''}
                        onChange={(e) => updateFonte({ trechoBase: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Enunciado *</label>
                  <textarea
                    value={form.enunciado}
                    onChange={(e) => updateFormField('enunciado', e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-gray-600">Alternativas *</p>
                    <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={includeAltE}
                        onChange={(e) => toggleAltE(e.target.checked)}
                      />
                      Incluir alternativa E
                    </label>
                  </div>
                  {form.alternativas.map((alt) => (
                    <div key={alt.letra} className="flex flex-wrap items-center gap-2">
                      <input
                        type="radio"
                        name="correta"
                        checked={alt.correta}
                        onChange={() => setCorreta(alt.letra)}
                        title="Alternativa correta"
                        className="flex-shrink-0"
                      />
                      <span className="w-6 text-sm font-semibold text-gray-700">{alt.letra})</span>
                      <input
                        value={alt.texto}
                        onChange={(e) => updateAlternativa(alt.letra, { texto: e.target.value })}
                        placeholder={`Texto da alternativa ${alt.letra}`}
                        className="flex-1 min-w-[200px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Explicação *</label>
                  <textarea
                    value={form.explicacao}
                    onChange={(e) => updateFormField('explicacao', e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Dificuldade</label>
                    <select
                      value={form.dificuldade}
                      onChange={(e) =>
                        updateFormField('dificuldade', e.target.value as QuestaoDificuldade)
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="facil">Fácil</option>
                      <option value="medio">Médio</option>
                      <option value="dificil">Difícil</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status (salvar)</label>
                    <select
                      value={form.status}
                      onChange={(e) => {
                        const status = e.target.value as QuestaoStatus;
                        updateFormField('status', status);
                        runPreviewValidation(status);
                      }}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="rascunho">Rascunho</option>
                      <option value="revisao">Revisão</option>
                      <option value="publicado">Publicado</option>
                    </select>
                  </div>
                </div>

                {(validationErrors.length > 0 || validationWarnings.length > 0) && (
                  <div className="space-y-2 text-sm">
                    {validationErrors.length > 0 && (
                      <ul className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800 space-y-1">
                        {validationErrors.map((msg) => (
                          <li key={msg}>• {msg}</li>
                        ))}
                      </ul>
                    )}
                    {validationWarnings.length > 0 && (
                      <ul className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 space-y-1">
                        {validationWarnings.map((msg) => (
                          <li key={msg}>• {msg}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {form.sourceId && (
                  <p className="text-xs text-violet-700 bg-violet-50 rounded px-2 py-1">
                    Vinculada ao trecho oficial: <code>{form.sourceId}</code>
                  </p>
                )}

                {(form.fonte.trechoBase?.trim() || form.sourceId) && (
                  <QuestaoFonteOficialBlock
                    questao={{
                      ...(form as OftpayQuestaoDoc),
                      id: editingId ?? 'draft',
                      criadoPor: form.criadoPor,
                    }}
                    defaultExpanded
                  />
                )}

                <PublishChecklist questao={{ ...form, status: 'publicado' }} />

                {formError && (
                  <p className="text-sm text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    {formError}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveDraft}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    {saving ? 'Salvando…' : 'Salvar rascunho'}
                  </button>
                  {editingId && form.status !== 'revisao' && form.status !== 'publicado' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        if (!editingId || !userEmail) return;
                        setSaving(true);
                        try {
                          await markQuestaoAsReview(editingId, userEmail);
                          await loadAdmin();
                          closeForm();
                        } catch (e) {
                          setFormError(e instanceof Error ? e.message : 'Erro.');
                        } finally {
                          setSaving(false);
                        }
                      }}
                      className="rounded-lg border border-amber-200 text-amber-800 px-4 py-2 text-sm hover:bg-amber-50 disabled:opacity-50"
                    >
                      Marcar como revisão
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={
                      saving || !getQuestaoPublishChecklist({ ...form, status: 'publicado' }).canPublish
                    }
                    onClick={handlePublish}
                    className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={
                      !getQuestaoPublishChecklist({ ...form, status: 'publicado' }).canPublish
                        ? 'Complete o checklist para publicar'
                        : undefined
                    }
                  >
                    {saving ? 'Publicando…' : 'Publicar'}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      if (form) runPreviewValidation(form.status);
                    }}
                    className="rounded-lg border border-blue-200 text-blue-700 px-4 py-2 text-sm hover:bg-blue-50"
                  >
                    Validar
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={closeForm}
                    className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {formError && !showForm && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-lg bg-gray-100 px-3 py-1.5">
                  Total: <strong>{adminStats.total}</strong>
                </span>
                <span className="rounded-lg bg-gray-100 px-3 py-1.5">
                  Rascunhos: <strong>{adminStats.rascunho}</strong>
                </span>
                <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-900">
                  Em revisão: <strong>{adminStats.revisao}</strong>
                </span>
                <span className="rounded-lg bg-green-50 px-3 py-1.5 text-green-900">
                  Publicadas: <strong>{adminStats.publicado}</strong>
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select
                    value={adminFiltroStatus}
                    onChange={(e) => setAdminFiltroStatus(e.target.value as QuestaoStatus | '')}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Todos</option>
                    <option value="rascunho">Rascunho</option>
                    <option value="revisao">Revisão</option>
                    <option value="publicado">Publicado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tema</label>
                  <input
                    type="text"
                    list="temas-admin"
                    value={adminFiltroTema}
                    onChange={(e) => setAdminFiltroTema(e.target.value)}
                    placeholder="Filtrar tema..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <datalist id="temas-admin">
                    {temasAdminUnicos.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Capítulo</label>
                  <input
                    type="text"
                    list="capitulos-admin"
                    value={adminFiltroCapitulo}
                    onChange={(e) => setAdminFiltroCapitulo(e.target.value)}
                    placeholder="Filtrar capítulo..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <datalist id="capitulos-admin">
                    {capitulosAdminUnicos.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Dificuldade</label>
                  <select
                    value={adminFiltroDificuldade}
                    onChange={(e) =>
                      setAdminFiltroDificuldade(e.target.value as QuestaoDificuldade | '')
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">Todas</option>
                    <option value="facil">Fácil</option>
                    <option value="medio">Médio</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Trecho oficial</label>
                  <select
                    value={adminFiltroSourceId}
                    onChange={(e) =>
                      setAdminFiltroSourceId(e.target.value as 'todos' | 'com' | 'sem')
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="todos">Todos</option>
                    <option value="com">Com sourceId</option>
                    <option value="sem">Sem sourceId</option>
                  </select>
                </div>
              </div>

              <h3 className="text-sm font-medium text-gray-700">
                Revisão editorial ({adminQuestoesFiltradas.length})
              </h3>

              {loadingAdmin ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : adminQuestoes.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma questão cadastrada.</p>
              ) : adminQuestoesFiltradas.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma questão corresponde aos filtros.</p>
              ) : (
                <div className="space-y-4">
                  {adminQuestoesFiltradas.map((q) => (
                    <QuestaoAdminReviewCard
                      key={q.id}
                      questao={q}
                      onEdit={() => openEditForm(q)}
                      onMarkReview={() => handleMarkReviewCard(q.id)}
                      onPublish={() => handlePublishCard(q)}
                      onDelete={() => handleDelete(q.id)}
                      loadingAction={
                        cardActionLoading?.id === q.id ? cardActionLoading.action : null
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeArea === 'criador' && authChecked && !isAdmin && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
            Esta área é restrita ao administrador ({QUESTOES_ADMIN_EMAIL}).
          </div>
        )}

        {activeArea === 'desempenho' && (
          <OftpayPerformancePanel
            userId={userId}
            userEmail={userEmail || null}
            refreshKey={performanceRefreshKey}
            publicadas={publicadas}
          />
        )}

        {activeArea === 'mapa' && isAdmin && (
          <OftpayKnowledgeMapPanel userEmail={userEmail} isAdmin={isAdmin} />
        )}

        {activeArea === 'trechos' && isAdmin && (
          <OftpaySourcesPanel
            userEmail={userEmail}
            isAdmin={isAdmin}
            onQuestaoGenerated={loadAdmin}
          />
        )}

        {activeArea === 'conteudo' && isAdmin && (
          <OftreviewContentPanel userEmail={userEmail} isAdmin={isAdmin} />
        )}
      </main>
    </div>
  );
}
