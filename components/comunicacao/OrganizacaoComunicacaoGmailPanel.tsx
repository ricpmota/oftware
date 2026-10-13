'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Filter,
  Inbox,
  Mail,
  Menu,
  Paperclip,
  PenLine,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import type { PacienteMensagemAnexo } from '@/services/pacienteMensagemService';
import {
  appendAssinaturaToPlain,
  ASSINATURA_LOGO_PADRAO,
  buildComposeHtmlWithAssinatura,
  buildDefaultAssinaturaHtml,
  plainBodyWithoutAssinatura,
  type MensagemAssinaturaDefaults,
} from '@/lib/pacienteMensagem/assinaturaMensagem';
import { htmlToPlainText, sanitizeMensagemHtml } from '@/lib/pacienteMensagem/mensagemHtml';
import { MensagemAssinaturaService } from '@/services/mensagemAssinaturaService';
import { OrganizacaoMensagemService } from '@/services/organizacaoMensagemService';
import {
  resolveOrganizacaoThreadId,
  pacienteSyntheticUserId,
  mensagemFoiLidaPor,
  mensagemTemLeituraDeDestinatario,
  mensagemPertenceAoPapel,
  participanteMatchesMe,
  type ComunicacaoDestinatario,
  type ComunicacaoParticipante,
  type ComunicacaoParticipanteRole,
  type OrganizacaoMensagem,
  type OrganizacaoMensagemPacienteAnexo,
  type PacienteAnexavelComunicacao,
} from '@/lib/organizacaoMensagem/types';
import { AvatarBubble, AvatarPair } from '@/components/comunicacao/MensagemAvatars';
import MensagemPacienteAnexoCard from '@/components/comunicacao/MensagemPacienteAnexoCard';
import MensagemRichEditor from '@/components/metaadmin/comunicacao/MensagemRichEditor';
import MensagemHtmlBody from '@/components/metaadmin/comunicacao/MensagemHtmlBody';
import MensagemAssinaturaModal from '@/components/metaadmin/comunicacao/MensagemAssinaturaModal';

type Aba = 'entrada' | 'saida';
type Painel = 'vazio' | 'ler' | 'escrever';

type Props = {
  organizationId: string;
  currentUser: ComunicacaoParticipante;
  /** Carrega destinatários (pacientes, médicos org, nutris, personais). */
  loadDestinatarios: () => Promise<ComunicacaoDestinatario[]>;
  /** Pacientes do médico para anexar (somente metaadmin / role medico). */
  loadPacientesAnexaveis?: () => Promise<PacienteAnexavelComunicacao[]>;
  /** Destinatário abre o prontuário compartilhado (sem entrar na lista). */
  onAbrirPacienteAnexo?: (anexo: OrganizacaoMensagemPacienteAnexo) => void | Promise<void>;
  assinaturaDefaults: MensagemAssinaturaDefaults;
  logoUrl?: string | null;
  onNotify?: (msg: string) => void;
  className?: string;
  /** Esconde título "Comunicação" (útil em modal com header próprio). */
  hideHeaderTitle?: boolean;
  /** Ação extra no canto superior direito (ex.: Canal Chat). */
  headerExtra?: ReactNode;
};

type ThreadResumo = {
  threadId: string;
  /** Chave única na lista (ex.: id da mensagem na caixa de saída). */
  listKey?: string;
  titulo: string;
  mensagens: OrganizacaoMensagem[];
  ultima: OrganizacaoMensagem;
  naoLidas: number;
  temEntrada: boolean;
  temSaida: boolean;
  counterparty: ComunicacaoParticipante;
  /** Conversa em grupo: 1 card por thread (estilo Gmail). */
  isGrupoThread?: boolean;
};

function formatQuando(d: Date) {
  try {
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return '';
  }
}

function formatQuandoCompleto(d: Date) {
  try {
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return '';
  }
}

function assuntoLimpo(titulo: string): string {
  return String(titulo || '').replace(/^(re|fw|fwd)\s*:\s*/gi, '').trim() || 'Sem assunto';
}

function roleLabel(role: ComunicacaoParticipanteRole | string | undefined | null): string {
  switch (role) {
    case 'medico':
      return 'Médico';
    case 'nutricionista':
      return 'Nutricionista';
    case 'psiquiatra':
      return 'Psiquiatra';
    case 'personal':
      return 'Personal';
    case 'paciente':
      return 'Paciente';
    default:
      return 'Contato';
  }
}

const GRUPOS_DEST = ['medicos', 'nutricionistas', 'psiquiatras', 'personais', 'pacientes'] as const;
type GrupoDest = (typeof GRUPOS_DEST)[number];

function isGrupoDest(v: string): v is GrupoDest {
  return (GRUPOS_DEST as readonly string[]).includes(v);
}

/** Sempre retorna uma chave válida do agrupamento (nunca undefined). */
function grupoFromRole(
  role: ComunicacaoParticipanteRole | string | undefined | null
): GrupoDest {
  const v = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (v === 'paciente' || v === 'pacientes') return 'pacientes';
  if (v === 'nutricionista' || v === 'nutricionistas') return 'nutricionistas';
  if (v === 'psiquiatra' || v === 'psiquiatras') return 'psiquiatras';
  if (
    v === 'personal' ||
    v === 'personais' ||
    v === 'personal_trainer' ||
    v === 'personaltrainer'
  ) {
    return 'personais';
  }
  if (v === 'medico' || v === 'medicos') return 'medicos';
  if (isGrupoDest(v)) return v;
  return 'medicos';
}

function emptyDestGroups(): Record<GrupoDest, ComunicacaoDestinatario[]> {
  // Sempre arrays novos (não reutilizar literal — evita bug de hoist do bundler)
  return {
    medicos: [] as ComunicacaoDestinatario[],
    nutricionistas: [] as ComunicacaoDestinatario[],
    psiquiatras: [] as ComunicacaoDestinatario[],
    pessoais: [] as ComunicacaoDestinatario[],
    pacientes: [] as ComunicacaoDestinatario[],
  };
}

function normalizeDestinatario(d: ComunicacaoDestinatario | null | undefined): ComunicacaoDestinatario | null {
  if (!d || typeof d !== 'object') return null;
  const profileId = String(d.profileId || '').trim();
  const userId = String(d.userId || '').trim();
  if (!profileId && !userId) return null;
  const roleRaw = String(d.role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  const grupoRaw = String(d.grupo || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  let role: ComunicacaoParticipanteRole = 'medico';
  // Role explícito tem prioridade (evita personal com grupo "medicos" cair no bucket errado)
  if (
    roleRaw === 'personal' ||
    roleRaw === 'personais' ||
    roleRaw === 'personal_trainer' ||
    roleRaw === 'personaltrainer'
  ) {
    role = 'personal';
  } else if (roleRaw === 'nutricionista' || roleRaw === 'nutricionistas') {
    role = 'nutricionista';
  } else if (roleRaw === 'psiquiatra' || roleRaw === 'psiquiatras') {
    role = 'psiquiatra';
  } else if (roleRaw === 'paciente' || roleRaw === 'pacientes') {
    role = 'paciente';
  } else if (roleRaw === 'medico' || roleRaw === 'medicos') {
    role = 'medico';
  } else if (grupoRaw === 'personais' || grupoRaw === 'personal' || grupoRaw === 'personal_trainer') {
    role = 'personal';
  } else if (grupoRaw === 'nutricionistas' || grupoRaw === 'nutricionista') {
    role = 'nutricionista';
  } else if (grupoRaw === 'psiquiatras' || grupoRaw === 'psiquiatra') {
    role = 'psiquiatra';
  } else if (grupoRaw === 'pacientes' || grupoRaw === 'paciente') {
    role = 'paciente';
  } else if (grupoRaw === 'medicos' || grupoRaw === 'medico') {
    role = 'medico';
  }

  const grupo = grupoFromRole(role);
  return {
    userId: userId || profileId,
    role,
    profileId: profileId || userId,
    nome: String(d.nome || roleLabel(role) || 'Contato').trim() || 'Contato',
    email: String(d.email || '').trim(),
    fotoUrl: d.fotoUrl ?? null,
    subtitle: d.subtitle ?? null,
    grupo,
  };
}

/** Mesma regra para contagem do card e lista do modal (evita “2 disponíveis” + lista vazia). */
function destPertenceAoGrupo(
  d: ComunicacaoDestinatario | null | undefined,
  g: GrupoDest
): boolean {
  const n = normalizeDestinatario(d);
  if (!n) return false;
  return grupoFromRole(n.grupo || n.role) === g;
}

function listDestinatariosDoGrupo(
  list: ComunicacaoDestinatario[] | null | undefined,
  g: GrupoDest
): ComunicacaoDestinatario[] {
  const out: ComunicacaoDestinatario[] = [];
  for (const item of Array.isArray(list) ? list : []) {
    const n = normalizeDestinatario(item);
    if (!n) continue;
    if (grupoFromRole(n.grupo || n.role) !== g) continue;
    out.push(n);
  }
  return out;
}

function isMensagemGrupo(m: OrganizacaoMensagem | null | undefined): boolean {
  if (!m) return false;
  if (m.isGrupo) return true;
  if (Array.isArray(m.participantes) && m.participantes.length > 2) return true;
  if (String(m.to?.userId || '').startsWith('grupo:')) return true;
  return false;
}

function buildThreads(
  mensagens: OrganizacaoMensagem[],
  me: Pick<ComunicacaoParticipante, 'userId' | 'role' | 'profileId'>
): ThreadResumo[] {
  const isMeP = (p: ComunicacaoParticipante | null | undefined) => participanteMatchesMe(p, me);

  const map = new Map<string, OrganizacaoMensagem[]>();
  for (const msg of Array.isArray(mensagens) ? mensagens : []) {
    if (!msg || typeof msg !== 'object') continue;
    const tid = resolveOrganizacaoThreadId(msg);
    const existing = map.get(tid);
    if (Array.isArray(existing)) {
      existing.push(msg);
    } else {
      map.set(tid, [msg]);
    }
  }

  const threads: ThreadResumo[] = [];
  for (const [threadId, msgs] of map.entries()) {
    if (!Array.isArray(msgs) || msgs.length === 0) continue;
    const ordered = [...msgs].sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
    const ultima = ordered[ordered.length - 1]!;
    const primeira = ordered[0]!;
    const from = ultima.from || ({ userId: '', nome: '', role: 'medico', profileId: '', email: '' } as OrganizacaoMensagem['from']);
    const to = ultima.to || ({ userId: '', nome: '', role: 'medico', profileId: '', email: '' } as OrganizacaoMensagem['to']);
    const temEntrada = ordered.some(
      (m) => isMeP(m.to) || (isMensagemGrupo(m) && mensagemPertenceAoPapel(m, me) && !isMeP(m.from))
    );
    const temSaida = ordered.some((m) => isMeP(m.from));
    const counterparty = isMeP(from) ? to : from;
    threads.push({
      threadId,
      titulo: assuntoLimpo(primeira.titulo || ultima.titulo),
      mensagens: ordered,
      ultima,
      naoLidas: ordered.filter(
        (m) =>
          !isMeP(m.from) &&
          mensagemPertenceAoPapel(m, me) &&
          !mensagemFoiLidaPor(m, [
            me.userId,
            me.role === 'paciente' && me.profileId ? pacienteSyntheticUserId(me.profileId) : '',
          ].filter(Boolean))
      ).length,
      temEntrada,
      temSaida,
      counterparty,
      isGrupoThread: ordered.some((m) => isMensagemGrupo(m)),
    });
  }

  return threads.sort((a, b) => b.ultima.criadoEm.getTime() - a.ultima.criadoEm.getTime());
}

export default function OrganizacaoComunicacaoGmailPanel({
  organizationId,
  currentUser,
  loadDestinatarios,
  loadPacientesAnexaveis,
  onAbrirPacienteAnexo,
  assinaturaDefaults,
  onNotify,
  className = '',
  hideHeaderTitle = false,
  headerExtra = null,
}: Props) {
  const [aba, setAba] = useState<Aba>('entrada');
  const [painel, setPainel] = useState<Painel>('vazio');
  const [threadIdAtivo, setThreadIdAtivo] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<OrganizacaoMensagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [html, setHtml] = useState('');
  const [anexos, setAnexos] = useState<PacienteMensagemAnexo[]>([]);
  const [pacienteAnexoSel, setPacienteAnexoSel] =
    useState<OrganizacaoMensagemPacienteAnexo | null>(null);
  const [pacientesAnexaveis, setPacientesAnexaveis] = useState<PacienteAnexavelComunicacao[]>(
    []
  );
  const [showModalPacienteAnexo, setShowModalPacienteAnexo] = useState(false);
  const [buscaPacienteAnexo, setBuscaPacienteAnexo] = useState('');
  const [loadingPacientesAnexo, setLoadingPacientesAnexo] = useState(false);
  const [abrindoPacienteAnexoId, setAbrindoPacienteAnexoId] = useState<string | null>(null);
  const [replyThreadId, setReplyThreadId] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [destinatariosSel, setDestinatariosSel] = useState<ComunicacaoDestinatario[]>([]);
  const [destinatarios, setDestinatarios] = useState<ComunicacaoDestinatario[]>([]);
  const [loadingDest, setLoadingDest] = useState(false);
  const [modalGrupo, setModalGrupo] = useState<GrupoDest | null>(null);
  const [buscaModal, setBuscaModal] = useState('');
  /** individual = 1 cópia por pessoa; grupo = mesmo thread para todos. */
  const [modoEnvio, setModoEnvio] = useState<'individual' | 'grupo'>('individual');
  const [editorKey, setEditorKey] = useState(0);
  const [composeInitialHtml, setComposeInitialHtml] = useState('');

  const [buscaLista, setBuscaLista] = useState('');
  const [filtroLeitura, setFiltroLeitura] = useState<'todas' | 'lida' | 'nao_lida'>('todas');
  const [filtroData, setFiltroData] = useState<'todas' | 'hoje' | '7d' | '30d'>('todas');
  const [filtroPessoa, setFiltroPessoa] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);
  /** Menu lateral estilo Gmail (mobile). */
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [assinaturaHtml, setAssinaturaHtml] = useState('');
  const [showAssinaturaModal, setShowAssinaturaModal] = useState(false);

  const defaultsAssinatura = useMemo(
    () => ({
      role: assinaturaDefaults.role,
      displayName: assinaturaDefaults.displayName,
      registro: assinaturaDefaults.registro ?? null,
      telefone: assinaturaDefaults.telefone ?? null,
      email: assinaturaDefaults.email ?? null,
      logoUrl: assinaturaDefaults.logoUrl ?? ASSINATURA_LOGO_PADRAO,
    }),
    [
      assinaturaDefaults.role,
      assinaturaDefaults.displayName,
      assinaturaDefaults.registro,
      assinaturaDefaults.telefone,
      assinaturaDefaults.email,
      assinaturaDefaults.logoUrl,
    ]
  );

  const refresh = useCallback(async () => {
    if (!currentUser.userId) return;
    setLoading(true);
    try {
      const ids =
        currentUser.role === 'paciente'
          ? [
              currentUser.userId,
              pacienteSyntheticUserId(currentUser.profileId),
            ]
          : [currentUser.userId];
      // Query por Auth UID (legado) + filtro por papel/perfil:
      // o mesmo e-mail pode ter médico + nutri + personal + paciente no mesmo UID.
      const list = await OrganizacaoMensagemService.listMensagensDoUsuario(ids);
      setMensagens(
        list.filter((m) =>
          mensagemPertenceAoPapel(m, {
            userId: currentUser.userId,
            role: currentUser.role,
            profileId: currentUser.profileId,
          })
        )
      );
    } catch (e) {
      console.error(e);
      onNotify?.('Erro ao carregar mensagens.');
    } finally {
      setLoading(false);
    }
  }, [currentUser.userId, currentUser.role, currentUser.profileId, onNotify]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!currentUser.profileId) {
      setAssinaturaHtml(buildDefaultAssinaturaHtml(defaultsAssinatura));
      return;
    }
    let cancelled = false;
    void MensagemAssinaturaService.getAssinaturaHtml(
      {
        userId: currentUser.userId,
        profileId: currentUser.profileId,
        role: currentUser.role,
      },
      defaultsAssinatura
    ).then((h) => {
      if (!cancelled) setAssinaturaHtml(h);
    });
    return () => {
      cancelled = true;
    };
  }, [
    currentUser.userId,
    currentUser.profileId,
    currentUser.role,
    defaultsAssinatura,
  ]);

  const meUserIds = useMemo(() => {
    if (currentUser.role === 'paciente' && currentUser.profileId) {
      return [currentUser.userId, pacienteSyntheticUserId(currentUser.profileId)];
    }
    return [currentUser.userId];
  }, [currentUser.userId, currentUser.role, currentUser.profileId]);

  const isMeParticipante = useCallback(
    (p: ComunicacaoParticipante | null | undefined) =>
      participanteMatchesMe(p, {
        userId: currentUser.userId,
        role: currentUser.role,
        profileId: currentUser.profileId,
      }),
    [currentUser.userId, currentUser.role, currentUser.profileId]
  );

  const threads = useMemo(
    () =>
      buildThreads(mensagens, {
        userId: currentUser.userId,
        role: currentUser.role,
        profileId: currentUser.profileId,
      }),
    [mensagens, currentUser.userId, currentUser.role, currentUser.profileId]
  );

  const isMensagemEnviadaPorMim = useCallback(
    (m: OrganizacaoMensagem | null | undefined) => {
      if (!m?.from) return false;
      return isMeParticipante(m.from);
    },
    [isMeParticipante]
  );

  const isMensagemRecebidaPorMim = useCallback(
    (m: OrganizacaoMensagem | null | undefined) => {
      if (!m) return false;
      if (isMensagemEnviadaPorMim(m)) return false;
      const me = {
        userId: currentUser.userId,
        role: currentUser.role,
        profileId: currentUser.profileId,
      };
      if (!mensagemPertenceAoPapel(m, me)) return false;
      if (isMeParticipante(m.to)) return true;
      // Grupo: estou nos participantes neste papel
      if (m.isGrupo || (Array.isArray(m.participantes) && m.participantes.length > 2)) {
        return (m.participantes || []).some((p) => isMeParticipante(p));
      }
      return false;
    },
    [
      isMeParticipante,
      isMensagemEnviadaPorMim,
      currentUser.userId,
      currentUser.role,
      currentUser.profileId,
    ]
  );

  const lista = useMemo(() => {
    // Estilo e-mail: uma linha por mensagem
    const threadList = Array.isArray(threads) ? threads : [];
    const byThread = new Map(threadList.map((t) => [t.threadId, t]));
    // Busca na tela inicial (mobile/desktop): varre entrada + saída
    const searching = Boolean(buscaLista.trim());
    let pool = (Array.isArray(mensagens) ? mensagens : []).filter((m) => {
      if (!m) return false;
      if (searching) {
        return isMensagemRecebidaPorMim(m) || isMensagemEnviadaPorMim(m);
      }
      return aba === 'entrada' ? isMensagemRecebidaPorMim(m) : isMensagemEnviadaPorMim(m);
    });

    // Busca Gmail (assunto, nome, e-mail, texto…)
    const q = buscaLista.trim().toLowerCase();
    if (q) {
      pool = pool.filter((m) => {
        const blob = [
          m.titulo,
          m.mensagem,
          htmlToPlainText(m.mensagemHtml || ''),
          m.from?.nome,
          m.from?.email,
          m.to?.nome,
          m.to?.email,
          ...(m.participantes || []).map((p) => `${p.nome} ${p.email}`),
        ]
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      });
    }

    // Filtro lida / não lida
    if (filtroLeitura !== 'todas') {
      pool = pool.filter((m) => {
        const asEntrada = searching ? isMensagemRecebidaPorMim(m) : aba === 'entrada';
        if (asEntrada) {
          const li = mensagemFoiLidaPor(m, meUserIds);
          return filtroLeitura === 'lida' ? li : !li;
        }
        const li = mensagemTemLeituraDeDestinatario(m);
        return filtroLeitura === 'lida' ? li : !li;
      });
    }

    // Filtro data
    if (filtroData !== 'todas') {
      const now = new Date();
      const start = new Date(now);
      if (filtroData === 'hoje') {
        start.setHours(0, 0, 0, 0);
      } else if (filtroData === '7d') {
        start.setDate(start.getDate() - 7);
      } else {
        start.setDate(start.getDate() - 30);
      }
      pool = pool.filter((m) => m.criadoEm && m.criadoEm.getTime() >= start.getTime());
    }

    // Filtro destinatário / remetente
    const pessoa = filtroPessoa.trim().toLowerCase();
    if (pessoa) {
      pool = pool.filter((m) => {
        const asEntrada = searching ? isMensagemRecebidaPorMim(m) : aba === 'entrada';
        if (asEntrada) {
          return (
            (m.from?.nome || '').toLowerCase().includes(pessoa) ||
            (m.from?.email || '').toLowerCase().includes(pessoa)
          );
        }
        return (
          (m.to?.nome || '').toLowerCase().includes(pessoa) ||
          (m.to?.email || '').toLowerCase().includes(pessoa) ||
          (m.participantes || []).some(
            (p) =>
              (p.nome || '').toLowerCase().includes(pessoa) ||
              (p.email || '').toLowerCase().includes(pessoa)
          )
        );
      });
    }

    pool = pool.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());

    const rows: ThreadResumo[] = [];
    const gruposJaListados = new Set<string>();

    for (const m of pool) {
      const tid = resolveOrganizacaoThreadId(m);
      const full = byThread.get(tid);
      const isGrupo = isMensagemGrupo(m) || Boolean(full?.isGrupoThread);
      const rowIsEntrada = searching ? isMensagemRecebidaPorMim(m) : aba === 'entrada';

      if (isGrupo) {
        if (gruposJaListados.has(tid)) continue;
        gruposJaListados.add(tid);
        const msgs = full?.mensagens?.length
          ? full.mensagens
          : [m];
        const ultima = msgs[msgs.length - 1] || m;
        const primeira = msgs[0] || m;
        const naoLidas = msgs.filter(
          (x) => isMensagemRecebidaPorMim(x) && !mensagemFoiLidaPor(x, meUserIds)
        ).length;
        // Contra-parte: nomes do grupo (exceto eu)
        const participantes =
          ultima.participantes ||
          msgs.find((x) => Array.isArray(x.participantes) && x.participantes.length)?.participantes ||
          [];
        const outros = (participantes || []).filter((p) => p && !isMeParticipante(p));
        const grupoLabel =
          outros.length === 0
            ? ultima.to?.nome || 'Grupo'
            : outros.length <= 3
              ? outros.map((p) => p.nome).join(', ')
              : `${outros
                  .slice(0, 2)
                  .map((p) => p.nome)
                  .join(', ')} e +${outros.length - 2}`;
        rows.push({
          threadId: tid,
          listKey: `grupo:${tid}`,
          titulo: assuntoLimpo(primeira.titulo || ultima.titulo),
          mensagens: msgs,
          ultima,
          naoLidas,
          temEntrada: Boolean(full?.temEntrada) || msgs.some((x) => isMensagemRecebidaPorMim(x)),
          temSaida: Boolean(full?.temSaida) || msgs.some((x) => isMensagemEnviadaPorMim(x)),
          counterparty: {
            userId: ultima.to?.userId || `grupo:${tid}`,
            role: outros[0]?.role || ultima.to?.role || 'medico',
            profileId: ultima.to?.profileId || tid,
            nome: grupoLabel,
            email: '',
            fotoUrl: null,
            subtitle: `Grupo · ${Math.max(outros.length, 1) + 1} pessoas`,
          },
          isGrupoThread: true,
        });
        continue;
      }

      // Individual: 1 linha por mensagem
      const msgs = full?.mensagens?.length ? full.mensagens : [m];
      const naoLidaEntrada = rowIsEntrada && !mensagemFoiLidaPor(m, meUserIds);
      rows.push({
        threadId: tid,
        listKey: m.id,
        titulo: assuntoLimpo(m.titulo),
        mensagens: msgs,
        ultima: m,
        naoLidas: naoLidaEntrada ? 1 : 0,
        temEntrada: Boolean(full?.temEntrada) || isMensagemRecebidaPorMim(m),
        temSaida: Boolean(full?.temSaida) || isMensagemEnviadaPorMim(m),
        counterparty: rowIsEntrada ? m.from : m.to,
        isGrupoThread: false,
      });
    }

    return rows;
  }, [
    aba,
    threads,
    mensagens,
    isMensagemEnviadaPorMim,
    isMensagemRecebidaPorMim,
    isMeParticipante,
    buscaLista,
    filtroLeitura,
    filtroData,
    filtroPessoa,
    meUserIds,
  ]);

  const pessoasFiltroOptions = useMemo(() => {
    const names = new Set<string>();
    for (const m of Array.isArray(mensagens) ? mensagens : []) {
      if (aba === 'entrada') {
        if (isMensagemRecebidaPorMim(m) && m.from?.nome) names.add(m.from.nome);
      } else if (isMensagemEnviadaPorMim(m)) {
        if (m.to?.nome && !String(m.to.userId || '').startsWith('grupo:')) names.add(m.to.nome);
        for (const p of m.participantes || []) {
          if (p.nome && !isMeParticipante(p)) names.add(p.nome);
        }
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [mensagens, aba, isMensagemRecebidaPorMim, isMensagemEnviadaPorMim, isMeParticipante]);

  const naoLidasEntrada = useMemo(
    () =>
      (Array.isArray(mensagens) ? mensagens : []).filter(
        (m) => isMensagemRecebidaPorMim(m) && !mensagemFoiLidaPor(m, meUserIds)
      ).length,
    [mensagens, isMensagemRecebidaPorMim, meUserIds]
  );

  const threadAtivo = useMemo(
    () => threads.find((t) => t.threadId === threadIdAtivo) || null,
    [threads, threadIdAtivo]
  );

  const destinatariosDisponiveis = useMemo(() => {
    return (Array.isArray(destinatarios) ? destinatarios : [])
      .map(normalizeDestinatario)
      .filter((d): d is ComunicacaoDestinatario => !!d)
      // Exclui só o próprio papel/perfil — mesmo Auth UID em outro papel permanece contato
      .filter(
        (d) =>
          !(
            d.role === currentUser.role &&
            currentUser.profileId &&
            d.profileId === currentUser.profileId
          )
      );
  }, [destinatarios, currentUser.role, currentUser.profileId]);

  const destByGrupo = useMemo((): Record<GrupoDest, ComunicacaoDestinatario[]> => {
    const groups = emptyDestGroups();
    try {
      for (const g of GRUPOS_DEST) {
        groups[g] = listDestinatariosDoGrupo(destinatariosDisponiveis, g);
      }
      console.info('[comunicacao panel] destByGrupo', {
        medicos: groups.medicos.length,
        nutricionistas: groups.nutricionistas.length,
        pessoais: groups.personais.length,
        pacientes: groups.pacientes.length,
        samplePersonal: groups.personais.slice(0, 3).map((d) => ({
          role: d.role,
          grupo: d.grupo,
          profileId: d.profileId,
          nome: d.nome,
        })),
      });
    } catch (e) {
      console.warn('[OrganizacaoComunicacaoGmailPanel] destByGrupo', e);
    }
    return groups;
  }, [destinatariosDisponiveis]);

  const seedCompose = useCallback(
    (bodyHtml = '') => {
      const seeded = buildComposeHtmlWithAssinatura(bodyHtml, assinaturaHtml);
      setHtml(seeded);
      setComposeInitialHtml(seeded);
      setEditorKey((k) => k + 1);
    },
    [assinaturaHtml]
  );

  const resetCompose = () => {
    setTitulo('');
    setHtml('');
    setComposeInitialHtml('');
    setAnexos([]);
    setPacienteAnexoSel(null);
    setShowModalPacienteAnexo(false);
    setBuscaPacienteAnexo('');
    setReplyThreadId(null);
    setReplyToId(null);
    setDestinatariosSel([]);
    setModalGrupo(null);
    setBuscaModal('');
    setModoEnvio('individual');
    setEditorKey((k) => k + 1);
  };

  const abrirModalAnexarPaciente = async () => {
    if (currentUser.role !== 'medico' || !loadPacientesAnexaveis) {
      onNotify?.('Anexar paciente está disponível apenas entre médicos.');
      return;
    }
    setShowModalPacienteAnexo(true);
    setBuscaPacienteAnexo('');
    if (pacientesAnexaveis.length > 0) return;
    setLoadingPacientesAnexo(true);
    try {
      const list = await loadPacientesAnexaveis();
      setPacientesAnexaveis(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      onNotify?.('Erro ao carregar pacientes.');
      setPacientesAnexaveis([]);
    } finally {
      setLoadingPacientesAnexo(false);
    }
  };

  const selecionarPacienteAnexo = (p: PacienteAnexavelComunicacao) => {
    setPacienteAnexoSel({
      pacienteId: p.pacienteId,
      nome: p.nome,
      email: p.email ?? null,
      telefone: p.telefone ?? null,
      dataNascimento: p.dataNascimento ?? null,
      cidade: p.cidade ?? null,
      estado: p.estado ?? null,
      sexoBiologico: p.sexoBiologico ?? null,
      medicoOwnerId: currentUser.profileId,
      medicoOwnerNome: currentUser.nome,
    });
    setShowModalPacienteAnexo(false);
    setBuscaPacienteAnexo('');
  };

  const handleAbrirPacienteAnexo = async (anexo: OrganizacaoMensagemPacienteAnexo) => {
    if (!onAbrirPacienteAnexo) {
      onNotify?.('Abertura do prontuário compartilhado disponível no painel do médico.');
      return;
    }
    setAbrindoPacienteAnexoId(anexo.pacienteId);
    try {
      await onAbrirPacienteAnexo(anexo);
    } catch (e) {
      console.error(e);
      onNotify?.('Não foi possível abrir o paciente compartilhado.');
    } finally {
      setAbrindoPacienteAnexoId(null);
    }
  };

  const carregarDestinatarios = async () => {
    setLoadingDest(true);
    try {
      // Somente vínculos reais do papel atual (não mistura outros perfis do mesmo login)
      const list = await loadDestinatarios();
      const byKey = new Map<string, ComunicacaoDestinatario>();
      const roleCount: Record<string, number> = {};
      for (const raw of Array.isArray(list) ? list : []) {
        const d = normalizeDestinatario(raw);
        if (!d) continue;
        roleCount[d.role] = (roleCount[d.role] || 0) + 1;
        if (d.role === currentUser.role && d.profileId === currentUser.profileId) continue;
        byKey.set(`${d.role}:${d.profileId}`, d);
      }
      const next = Array.from(byKey.values());
      console.info('[comunicacao panel] destinatários após normalize', {
        rawTotal: Array.isArray(list) ? list.length : 0,
        roleCount,
        afterFilter: next.length,
        personais: next.filter((d) => d.role === 'personal').length,
        nutris: next.filter((d) => d.role === 'nutricionista').length,
      });
      setDestinatarios(next);
    } catch (e) {
      console.error(e);
      onNotify?.('Erro ao carregar destinatários.');
      setDestinatarios([]);
    } finally {
      setLoadingDest(false);
    }
  };

  const abrirNova = async () => {
    setThreadIdAtivo(null);
    setTitulo('');
    setAnexos([]);
    setReplyThreadId(null);
    setReplyToId(null);
    setDestinatariosSel([]);
    setModalGrupo(null);
    setBuscaModal('');
    setModoEnvio('individual');
    seedCompose('');
    setPainel('escrever');
    await carregarDestinatarios();
  };

  const destKey = (d: Pick<ComunicacaoDestinatario, 'role' | 'profileId'>) =>
    `${d.role}:${d.profileId}`;

  const abrirThread = async (thread: ThreadResumo) => {
    setThreadIdAtivo(thread.threadId);
    setPainel('ler');
    // Grupo (Gmail): ao abrir o card, marca todas as não lidas da conversa
    if (thread.isGrupoThread) {
      const naoLidas = (thread.mensagens || []).filter(
        (m) => isMensagemRecebidaPorMim(m) && !mensagemFoiLidaPor(m, meUserIds)
      );
      if (naoLidas.length === 0) return;
      try {
        await Promise.all(
          naoLidas.map((m) => OrganizacaoMensagemService.marcarComoLida(m.id, meUserIds))
        );
        await refresh();
      } catch (e) {
        console.error(e);
      }
      return;
    }
    const alvo = thread.ultima;
    if (!alvo?.id) return;
    if (!isMensagemRecebidaPorMim(alvo) || mensagemFoiLidaPor(alvo, meUserIds)) return;
    try {
      await OrganizacaoMensagemService.marcarComoLida(alvo.id, meUserIds);
      await refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const abrirResponder = (thread: ThreadResumo) => {
    const msgs = Array.isArray(thread.mensagens) ? thread.mensagens : [];
    const ultima = thread.ultima || msgs[msgs.length - 1];
    if (!ultima) {
      onNotify?.('Não foi possível responder esta conversa.');
      return;
    }
    const rootId =
      msgs.find((m) => m.threadId && !String(m.threadId).startsWith('legacy:'))?.threadId ||
      msgs[0]?.id ||
      ultima.id;

    const precisaConsolidar = msgs.some((m) => !m.threadId || m.threadId !== rootId);
    if (precisaConsolidar) {
      void OrganizacaoMensagemService.ensureThreadId(
        msgs.map((m) => m.id),
        rootId
      ).then(() => refresh());
    }

    const isGrupoThread =
      Boolean(ultima.isGrupo) ||
      msgs.some((m) => m.isGrupo) ||
      (Array.isArray(ultima.participantes) && ultima.participantes.length > 2);

    if (isGrupoThread) {
      const pool =
        (Array.isArray(ultima.participantes) && ultima.participantes.length
          ? ultima.participantes
          : msgs.flatMap((m) => [m.from, m.to, ...(m.participantes || [])])) || [];
      const seen = new Set<string>();
      const outros: ComunicacaoDestinatario[] = [];
      for (const p of pool) {
        if (!p?.userId && !p?.profileId) continue;
        if (isMeParticipante(p)) continue;
        const dest = normalizeDestinatario({
          ...p,
          grupo: grupoFromRole(p.role),
        });
        if (!dest) continue;
        const key = destKey(dest);
        if (seen.has(key)) continue;
        seen.add(key);
        outros.push(dest);
      }
      if (outros.length === 0) {
        onNotify?.('Não foi possível responder este grupo.');
        return;
      }
      setReplyThreadId(rootId);
      setReplyToId(ultima.id);
      setDestinatariosSel(outros);
      setModoEnvio('grupo');
      setTitulo(assuntoLimpo(thread.titulo));
      setAnexos([]);
      seedCompose('');
      setPainel('escrever');
      return;
    }

    const other = isMeParticipante(ultima.from) ? ultima.to : ultima.from;
    const dest = normalizeDestinatario({
      ...other,
      grupo: grupoFromRole(other?.role),
    });
    if (!dest) {
      onNotify?.('Não foi possível responder esta conversa.');
      return;
    }

    setReplyThreadId(rootId);
    setReplyToId(ultima.id);
    setDestinatariosSel([dest]);
    setModoEnvio('individual');
    setTitulo(assuntoLimpo(thread.titulo));
    setAnexos([]);
    seedCompose('');
      setPainel('escrever');
  };

  const isDestSelected = (d: ComunicacaoDestinatario) =>
    (Array.isArray(destinatariosSel) ? destinatariosSel : []).some(
      (x) => destKey(x) === destKey(d)
    );

  const toggleDestinatario = (d: ComunicacaoDestinatario) => {
    setDestinatariosSel((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const key = destKey(d);
      if (list.some((x) => destKey(x) === key)) {
        return list.filter((x) => destKey(x) !== key);
      }
      return [...list, d];
    });
  };

  const enviar = async () => {
    const plainBody = plainBodyWithoutAssinatura(html, assinaturaHtml);
    const targets = (Array.isArray(destinatariosSel) ? destinatariosSel : [])
      .map(normalizeDestinatario)
      .filter((d): d is ComunicacaoDestinatario => {
        if (!d || !d.userId) return false;
        // Mesmo e-mail/UID entre papéis diferentes é permitido (testes multi-painel)
        if (d.role === currentUser.role && d.profileId === currentUser.profileId) return false;
        return true;
      });
    if (targets.length === 0) {
      onNotify?.('Selecione pelo menos um destinatário.');
      return;
    }
    if (!titulo.trim() || (!plainBody && (anexos?.length ?? 0) === 0 && !pacienteAnexoSel)) {
      onNotify?.('Assunto e mensagem são obrigatórios.');
      return;
    }
    if (pacienteAnexoSel) {
      const temMedico = targets.some((t) => t.role === 'medico');
      if (!temMedico) {
        onNotify?.('Para anexar paciente, selecione ao menos um médico destinatário.');
        return;
      }
    }
    const usarGrupo =
      modoEnvio === 'grupo' && (targets.length > 1 || Boolean(replyThreadId));
    setEnviando(true);
    try {
      const assunto = assuntoLimpo(titulo);
      const htmlFinal = sanitizeMensagemHtml(html);
      const plainFinal =
        htmlToPlainText(htmlFinal).trim() ||
        appendAssinaturaToPlain(plainBody || titulo.trim(), assinaturaHtml);
      const fromParticipante: ComunicacaoParticipante = {
        userId: currentUser.userId,
        role: currentUser.role,
        profileId: currentUser.profileId,
        nome: currentUser.nome,
        email: currentUser.email || '',
        fotoUrl: currentUser.fotoUrl ?? null,
        subtitle: currentUser.subtitle ?? null,
      };
      const ids: string[] = [];
      const pacienteAnexoPayload = pacienteAnexoSel
        ? {
            ...pacienteAnexoSel,
            medicoOwnerId: pacienteAnexoSel.medicoOwnerId || currentUser.profileId,
            medicoOwnerNome: pacienteAnexoSel.medicoOwnerNome || currentUser.nome,
          }
        : null;

      if (usarGrupo) {
        const nomes = targets.map((t) => t.nome).filter(Boolean);
        const toGrupo: ComunicacaoParticipante = {
          userId: `grupo:${replyThreadId || 'novo'}`,
          role: targets[0]!.role,
          profileId: replyThreadId || targets.map((t) => t.profileId).sort().join('_'),
          nome: nomes.length <= 3 ? nomes.join(', ') : `${nomes.slice(0, 2).join(', ')} e +${nomes.length - 2}`,
          email: '',
          fotoUrl: null,
          subtitle: `Grupo · ${targets.length} pessoas`,
        };
        const participantes: ComunicacaoParticipante[] = [fromParticipante, ...targets];
        const novaId = await OrganizacaoMensagemService.criarMensagem({
          organizationId,
          from: fromParticipante,
          to: toGrupo,
          titulo: replyThreadId ? assunto : titulo.trim(),
          mensagem: plainFinal,
          mensagemHtml: htmlFinal,
          anexos: Array.isArray(anexos) ? anexos : [],
          pacienteAnexo: pacienteAnexoPayload,
          isGrupo: true,
          participantes,
          ...(replyThreadId
            ? { threadId: replyThreadId, emRespostaAId: replyToId || undefined }
            : {}),
          mirrorPacienteMensagem: false,
        });
        ids.push(novaId);
      } else {
        for (const to of targets) {
          const novaId = await OrganizacaoMensagemService.criarMensagem({
            organizationId,
            from: fromParticipante,
            to: {
              userId: to.userId,
              role: to.role,
              profileId: to.profileId,
              nome: to.nome,
              email: to.email || '',
              fotoUrl: to.fotoUrl ?? null,
              subtitle: to.subtitle ?? null,
            },
            titulo: replyThreadId ? assunto : titulo.trim(),
            mensagem: plainFinal,
            mensagemHtml: htmlFinal,
            anexos: Array.isArray(anexos) ? anexos : [],
            pacienteAnexo: pacienteAnexoPayload,
            ...(replyThreadId && targets.length === 1
              ? { threadId: replyThreadId, emRespostaAId: replyToId || undefined }
              : {}),
            medicoIdForMirror: currentUser.role === 'medico' ? currentUser.profileId : undefined,
            medicoEmailForMirror: currentUser.role === 'medico' ? currentUser.email : undefined,
          });
          ids.push(novaId);
        }
      }

      const n = targets.length;
      onNotify?.(
        replyThreadId
          ? 'Resposta enviada!'
          : usarGrupo
            ? `Mensagem em grupo enviada para ${n} pessoas!`
            : n > 1
              ? `Mensagem enviada individualmente para ${n} destinatários!`
              : 'Mensagem enviada!'
      );
      setAba(usarGrupo || n === 1 ? 'saida' : 'saida');
      const nextThreadId = replyThreadId || ids[0] || null;
      resetCompose();
      if (!usarGrupo && n > 1 && !replyThreadId) {
        setThreadIdAtivo(null);
        setPainel('vazio');
      } else if (nextThreadId) {
        setThreadIdAtivo(nextThreadId);
        setPainel('ler');
      } else {
        setPainel('vazio');
      }
      await refresh();
    } catch (e) {
      console.error(e);
      onNotify?.('Erro ao enviar mensagem.');
    } finally {
      setEnviando(false);
    }
  };

  const excluir = async (id: string) => {
    if (!confirm('Excluir esta mensagem?')) return;
    try {
      await OrganizacaoMensagemService.deletarMensagem(id);
      await refresh();
      onNotify?.('Mensagem excluída.');
    } catch (e) {
      console.error(e);
      onNotify?.('Erro ao excluir.');
    }
  };

  const destSel = Array.isArray(destinatariosSel) ? destinatariosSel : [];
  const anexosSafe = Array.isArray(anexos) ? anexos : [];
  const listaSafe = Array.isArray(lista) ? lista : [];
  const pacientesAnexaveisFiltrados = useMemo(() => {
    const q = buscaPacienteAnexo.trim().toLowerCase();
    const list = Array.isArray(pacientesAnexaveis) ? pacientesAnexaveis : [];
    if (!q) return list;
    return list.filter((p) =>
      [p.nome, p.email, p.telefone, p.cidade, p.estado]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [pacientesAnexaveis, buscaPacienteAnexo]);

  const GRUPO_BTN: { id: GrupoDest; label: string }[] = [
    { id: 'pacientes', label: 'Pacientes' },
    { id: 'medicos', label: 'Médicos' },
    { id: 'nutricionistas', label: 'Nutricionistas' },
    { id: 'psiquiatras', label: 'Psiquiatras' },
    { id: 'personais', label: 'Personais' },
  ];

  const countSelNoGrupo = (g: GrupoDest) =>
    destSel.filter((d) => destPertenceAoGrupo(d, g)).length;

  const modalListaBase = modalGrupo
    ? listDestinatariosDoGrupo(destinatariosDisponiveis, modalGrupo)
    : [];
  const modalLista = (() => {
    const q = buscaModal.trim().toLowerCase();
    if (!q) return modalListaBase;
    return modalListaBase.filter(
      (d) =>
        d.nome.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        (d.subtitle || '').toLowerCase().includes(q)
    );
  })();

  const selecionarTodosDoModal = () => {
    if (!modalGrupo) return;
    const alvo = buscaModal.trim() ? modalLista : modalListaBase;
    setDestinatariosSel((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const map = new Map(list.map((d) => [destKey(d), d]));
      for (const d of alvo) map.set(destKey(d), d);
      return Array.from(map.values());
    });
  };

  const limparTodosDoModal = () => {
    if (!modalGrupo) return;
    const keys = new Set((buscaModal.trim() ? modalLista : modalListaBase).map((d) => destKey(d)));
    setDestinatariosSel((prev) =>
      (Array.isArray(prev) ? prev : []).filter((d) => !keys.has(destKey(d)))
    );
  };

  const abrirModalGrupo = (g: GrupoDest) => {
    setBuscaModal('');
    setModalGrupo(g);
    const lista = listDestinatariosDoGrupo(destinatariosDisponiveis, g);
    console.info('[comunicacao panel] abrirModalGrupo', {
      grupo: g,
      total: lista.length,
      ids: lista.map((d) => ({
        role: d.role,
        grupo: d.grupo,
        profileId: d.profileId,
        nome: d.nome,
      })),
    });
    if (!destinatarios.length && !loadingDest) {
      void carregarDestinatarios();
    }
  };

  const mobileShowingDetail = painel === 'ler' || painel === 'escrever';
  const searchingBoth = Boolean(buscaLista.trim());

  const voltarParaListaMobile = () => {
    if (painel === 'escrever') {
      resetCompose();
      setPainel(threadIdAtivo ? 'ler' : 'vazio');
      if (!threadIdAtivo) setThreadIdAtivo(null);
      return;
    }
    setPainel('vazio');
    setThreadIdAtivo(null);
  };

  const irParaAbaMobile = (next: Aba) => {
    setAba(next);
    setBuscaLista('');
    setPainel('vazio');
    setThreadIdAtivo(null);
    setMobileNavOpen(false);
  };

  return (
    <div
      className={`relative flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${
        className || 'h-[calc(100vh-8rem)] min-h-[520px]'
      }`}
    >
      {/* Drawer mobile — estilo Gmail */}
      {mobileNavOpen ? (
        <div className="absolute inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <nav className="absolute left-0 top-0 flex h-full w-[min(82vw,300px)] flex-col bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4">
              <Mail className="h-5 w-5 text-gray-500" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">Comunicação</p>
                <p className="truncate text-[11px] text-gray-500">{currentUser.nome}</p>
              </div>
            </div>
            <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
              <button
                type="button"
                onClick={() => irParaAbaMobile('entrada')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium ${
                  aba === 'entrada' && !searchingBoth
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Inbox size={18} className="shrink-0" />
                <span className="flex-1">Caixa de entrada</span>
                {naoLidasEntrada > 0 ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                    {naoLidasEntrada}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => irParaAbaMobile('saida')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium ${
                  aba === 'saida' && !searchingBoth
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Send size={18} className="shrink-0" />
                Caixa de saída
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  setShowAssinaturaModal(true);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <PenLine size={18} className="shrink-0" />
                Assinatura
              </button>
            </div>
            <div className="border-t border-gray-200 p-3">
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  void abrirNova();
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={16} />
                Nova mensagem
              </button>
            </div>
          </nav>
        </div>
      ) : null}

      {/* Top bar mobile — hamburger + busca (lista) ou voltar (detalhe) */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-2 py-2 lg:hidden">
        {mobileShowingDetail ? (
          <>
            <button
              type="button"
              onClick={voltarParaListaMobile}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">
                {painel === 'escrever'
                  ? replyThreadId
                    ? 'Responder'
                    : 'Nova mensagem'
                  : threadAtivo?.titulo || 'Mensagem'}
              </p>
            </div>
            {painel === 'ler' && threadAtivo ? (
              <button
                type="button"
                onClick={() => abrirResponder(threadAtivo)}
                className="rounded-full p-2 text-blue-700 hover:bg-blue-50"
                aria-label="Responder"
              >
                <Reply size={18} />
              </button>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-full p-2 text-gray-700 hover:bg-gray-100"
              aria-label="Menu"
            >
              <Menu size={22} />
            </button>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="search"
                value={buscaLista}
                onChange={(e) => setBuscaLista(e.target.value)}
                placeholder="Buscar e-mail"
                className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-9 pr-8 text-sm focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {buscaLista ? (
                <button
                  type="button"
                  onClick={() => setBuscaLista('')}
                  className="absolute right-2 top-2 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                  aria-label="Limpar busca"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            {headerExtra}
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Atualizar"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => void abrirNova()}
              className="rounded-full bg-blue-600 p-2 text-white hover:bg-blue-700"
              aria-label="Nova mensagem"
            >
              <Plus size={18} />
            </button>
          </>
        )}
      </div>

      {/* Header desktop */}
      <div className="hidden items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 lg:flex">
        <div className="flex min-w-0 items-center gap-2">
          {!hideHeaderTitle ? (
            <>
              <Mail className="h-5 w-5 shrink-0 text-gray-500" />
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-gray-900">Comunicação</h2>
                <p className="truncate text-xs text-gray-500">
                  {currentUser.role === 'paciente'
                    ? 'Mensagens com médico, nutricionista e personal'
                    : 'E-mail corporativo · pacientes, médicos, nutricionistas, psiquiatras e personais'}
                </p>
              </div>
            </>
          ) : null}
          {naoLidasEntrada > 0 ? (
            <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
              {naoLidasEntrada} nova(s)
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {headerExtra}
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setShowAssinaturaModal(true)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <PenLine size={14} />
            Assinatura
          </button>
          <button
            type="button"
            onClick={() => void abrirNova()}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={14} />
            Nova mensagem
          </button>
        </div>
      </div>

      {naoLidasEntrada > 0 && !mobileShowingDetail ? (
        <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Você tem {naoLidasEntrada} mensagem(ns) não lida(s) na Caixa de entrada.
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(300px,36%)_1fr]">
        <div
          className={`min-h-0 flex-col border-gray-200 lg:border-r ${
            mobileShowingDetail ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="hidden shrink-0 border-b border-gray-200 lg:flex">
            <button
              type="button"
              onClick={() => {
                setAba('entrada');
                setPainel('vazio');
                setThreadIdAtivo(null);
              }}
              className={`flex-1 border-b-2 px-3 py-2.5 text-xs font-semibold ${
                aba === 'entrada'
                  ? 'border-blue-600 bg-blue-50/60 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Caixa de entrada
              {naoLidasEntrada > 0 ? (
                <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-800">
                  {naoLidasEntrada}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => {
                setAba('saida');
                setPainel('vazio');
                setThreadIdAtivo(null);
              }}
              className={`flex-1 border-b-2 px-3 py-2.5 text-xs font-semibold ${
                aba === 'saida'
                  ? 'border-blue-600 bg-blue-50/60 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Caixa de saída
            </button>
          </div>

          {/* Título da pasta no mobile */}
          {!searchingBoth ? (
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 lg:hidden">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {aba === 'entrada' ? 'Caixa de entrada' : 'Caixa de saída'}
              </p>
              <span className="text-[10px] text-gray-400">{listaSafe.length} msg</span>
            </div>
          ) : (
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 lg:hidden">
              <p className="text-xs font-semibold text-gray-600">
                Resultados em entrada e saída
              </p>
              <span className="text-[10px] text-gray-400">{listaSafe.length}</span>
            </div>
          )}

          <div className="hidden shrink-0 space-y-2 border-b border-gray-200 bg-white px-3 py-2.5 lg:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="search"
                value={buscaLista}
                onChange={(e) => setBuscaLista(e.target.value)}
                placeholder="Buscar mensagem (assunto, nome, texto…)"
                className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-8 text-sm"
              />
              {buscaLista ? (
                <button
                  type="button"
                  onClick={() => setBuscaLista('')}
                  className="absolute right-2 top-2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Limpar busca"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFiltros((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold ${
                  showFiltros ||
                  filtroLeitura !== 'todas' ||
                  filtroData !== 'todas' ||
                  filtroPessoa
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Filter size={12} />
                Filtros
              </button>
              {(filtroLeitura !== 'todas' || filtroData !== 'todas' || filtroPessoa || buscaLista) && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscaLista('');
                    setFiltroLeitura('todas');
                    setFiltroData('todas');
                    setFiltroPessoa('');
                  }}
                  className="text-[11px] font-medium text-blue-700 hover:underline"
                >
                  Limpar
                </button>
              )}
              <span className="ml-auto text-[10px] text-gray-400">
                {listaSafe.length} msg
              </span>
            </div>
            {showFiltros ? (
              <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Leitura
                  <select
                    value={filtroLeitura}
                    onChange={(e) =>
                      setFiltroLeitura(e.target.value as 'todas' | 'lida' | 'nao_lida')
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800"
                  >
                    <option value="todas">Todas</option>
                    <option value="nao_lida">
                      {aba === 'entrada' ? 'Não lidas (por mim)' : 'Não lidas (pelo destinatário)'}
                    </option>
                    <option value="lida">
                      {aba === 'entrada' ? 'Lidas (por mim)' : 'Lidas (pelo destinatário)'}
                    </option>
                  </select>
                </label>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  Data
                  <select
                    value={filtroData}
                    onChange={(e) =>
                      setFiltroData(e.target.value as 'todas' | 'hoje' | '7d' | '30d')
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800"
                  >
                    <option value="todas">Qualquer data</option>
                    <option value="hoje">Hoje</option>
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                  </select>
                </label>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  {aba === 'entrada' ? 'Remetente' : 'Destinatário'}
                  <select
                    value={filtroPessoa}
                    onChange={(e) => setFiltroPessoa(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800"
                  >
                    <option value="">Todos</option>
                    {pessoasFiltroOptions.map((nome) => (
                      <option key={nome} value={nome}>
                        {nome}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa]">
            {loading && listaSafe.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : listaSafe.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                {buscaLista || filtroLeitura !== 'todas' || filtroData !== 'todas' || filtroPessoa
                  ? 'Nenhuma mensagem com esses filtros'
                  : aba === 'entrada'
                    ? 'Nenhuma mensagem recebida'
                    : 'Nenhuma mensagem enviada'}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100/80">
                {listaSafe.map((thread) => {
                  const msg = thread.ultima;
                  const ativa = threadIdAtivo === thread.threadId && painel === 'ler';
                  const totalMsgs = Array.isArray(thread.mensagens) ? thread.mensagens.length : 1;
                  const isGrupoCard = Boolean(thread.isGrupoThread) || isMensagemGrupo(msg);
                  const rowIsEntrada = searchingBoth
                    ? isMensagemRecebidaPorMim(msg)
                    : aba === 'entrada';
                  const naoLidaEntrada =
                    rowIsEntrada
                      ? isGrupoCard
                        ? thread.naoLidas > 0
                        : msg
                          ? !mensagemFoiLidaPor(msg, meUserIds) || thread.naoLidas > 0
                          : false
                      : false;
                  const lidaPeloDest = !rowIsEntrada && msg ? mensagemTemLeituraDeDestinatario(msg) : false;
                  const destaqueNaoLida = naoLidaEntrada;
                  const from = msg?.from;
                  const to = msg?.to;
                  const preview = (msg?.mensagem || htmlToPlainText(msg?.mensagemHtml || '')).slice(
                    0,
                    90
                  );
                  const tituloLinha = isGrupoCard
                    ? `Grupo: ${thread.counterparty?.nome || to?.nome || '?'}`
                    : !rowIsEntrada
                      ? `Para: ${to?.nome || thread.counterparty?.nome || '?'}`
                      : `De: ${from?.nome || thread.counterparty?.nome || '?'}`;
                  return (
                    <li key={thread.listKey || thread.threadId}>
                      <button
                        type="button"
                        onClick={() => void abrirThread(thread)}
                        className={`group flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors ${
                          ativa
                            ? 'bg-blue-50 shadow-[inset_3px_0_0_#2563eb]'
                            : destaqueNaoLida
                              ? 'bg-white hover:bg-blue-50/40'
                              : 'bg-transparent hover:bg-white'
                        }`}
                      >
                        <AvatarPair
                          fromName={from?.nome || currentUser.nome || '?'}
                          fromPhoto={from?.fotoUrl || currentUser.fotoUrl}
                          toName={
                            isGrupoCard
                              ? thread.counterparty?.nome || to?.nome || 'Grupo'
                              : to?.nome || '?'
                          }
                          toPhoto={isGrupoCard ? null : to?.fotoUrl}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={`truncate text-[13px] ${
                                destaqueNaoLida
                                  ? 'font-bold text-gray-900'
                                  : 'font-medium text-gray-800'
                              }`}
                            >
                              {tituloLinha}
                            </span>
                            <span
                              className={`shrink-0 text-[11px] tabular-nums ${
                                destaqueNaoLida ? 'font-semibold text-blue-700' : 'text-gray-400'
                              }`}
                            >
                              {msg?.criadoEm ? formatQuando(msg.criadoEm) : ''}
                            </span>
                          </div>
                          <div
                            className={`mt-0.5 flex items-center gap-1.5 truncate text-[13px] ${
                              destaqueNaoLida
                                ? 'font-semibold text-gray-900'
                                : 'font-medium text-gray-700'
                            }`}
                          >
                            {isGrupoCard && totalMsgs > 1 ? (
                              <span
                                className="inline-flex shrink-0 items-center rounded bg-gray-200/90 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-gray-700"
                                title={`${totalMsgs} mensagens nesta conversa`}
                              >
                                {totalMsgs}
                              </span>
                            ) : null}
                            <span className="truncate">{thread.titulo}</span>
                            {msg?.anexos && msg.anexos.length > 0 ? (
                              <Paperclip className="h-3 w-3 shrink-0 text-gray-400" />
                            ) : null}
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-[12px] text-gray-500">
                            {isGrupoCard && from?.nome
                              ? `${from.nome}: ${preview || '—'}`
                              : preview || '—'}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {searchingBoth ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  rowIsEntrada
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {rowIsEntrada ? 'Entrada' : 'Saída'}
                              </span>
                            ) : null}
                            {isGrupoCard ? (
                              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                                Grupo
                              </span>
                            ) : null}
                            {isGrupoCard && totalMsgs > 1 ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                                {totalMsgs} mensagens nesta conversa
                              </span>
                            ) : null}
                            {!isGrupoCard ? (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                                {roleLabel(
                                  !rowIsEntrada
                                    ? to?.role || thread.counterparty?.role
                                    : from?.role || thread.counterparty?.role
                                )}
                              </span>
                            ) : null}
                            {naoLidaEntrada ? (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                {isGrupoCard && thread.naoLidas > 1
                                  ? `${thread.naoLidas} não lidas`
                                  : 'Não lida'}
                              </span>
                            ) : null}
                            {rowIsEntrada &&
                            !naoLidaEntrada &&
                            msg &&
                            (isGrupoCard || mensagemFoiLidaPor(msg, meUserIds)) ? (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                                Lida
                              </span>
                            ) : null}
                            {!rowIsEntrada && !isGrupoCard ? (
                              lidaPeloDest ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                  Lida
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                                  Não lida
                                </span>
                              )
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div
          className={`min-h-0 flex-col bg-white ${
            mobileShowingDetail ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {painel === 'vazio' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-gray-500">
              <Users className="h-10 w-10 text-gray-300" />
              <p className="text-sm">Selecione uma conversa ou escreva uma nova mensagem.</p>
              <button
                type="button"
                onClick={() => void abrirNova()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={16} /> Nova mensagem
              </button>
            </div>
          ) : null}

          {painel === 'ler' && threadAtivo ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="hidden items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 lg:flex">
                <div className="min-w-0">
                  <h4 className="text-base font-semibold text-gray-900">{threadAtivo.titulo}</h4>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Com {threadAtivo.counterparty?.nome || 'Contato'} ·{' '}
                    {roleLabel(threadAtivo.counterparty?.role)} ·{' '}
                    {(threadAtivo.mensagens || []).length} mensagem
                    {(threadAtivo.mensagens || []).length > 1 ? 'ns' : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => abrirResponder(threadAtivo)}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <Reply size={14} />
                    Responder
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPainel('vazio');
                      setThreadIdAtivo(null);
                    }}
                    className="rounded-md p-2 text-gray-400 hover:bg-gray-100"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] px-3 py-3">
                {(threadAtivo.mensagens || []).map((msg) => {
                  const mine = isMeParticipante(msg.from);
                  return (
                    <article
                      key={msg.id}
                      className={`rounded-xl border bg-white p-3 shadow-sm ${
                        mine ? 'border-blue-100' : 'border-amber-100'
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <AvatarBubble
                            name={msg.from?.nome || '?'}
                            photoUrl={msg.from?.fotoUrl}
                            size={32}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {msg.from?.nome || 'Contato'}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              Para: {msg.to?.nome || 'Contato'} ·{' '}
                              {msg.criadoEm ? formatQuandoCompleto(msg.criadoEm) : ''}
                              {msg.emRespostaAId ? ' · resposta' : ''}
                            </p>
                          </div>
                        </div>
                        {mine ? (
                          <button
                            type="button"
                            onClick={() => void excluir(msg.id)}
                            className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                      <MensagemHtmlBody
                        texto={msg.mensagem}
                        html={msg.mensagemHtml}
                        anexos={msg.anexos}
                      />
                      {msg.pacienteAnexo ? (
                        <MensagemPacienteAnexoCard
                          anexo={msg.pacienteAnexo}
                          mode={mine ? 'enviar' : 'receber'}
                          opening={abrindoPacienteAnexoId === msg.pacienteAnexo.pacienteId}
                          onAbrir={
                            onAbrirPacienteAnexo
                              ? (a) => void handleAbrirPacienteAnexo(a)
                              : undefined
                          }
                        />
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <div className="border-t border-gray-200 px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => abrirResponder(threadAtivo)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Reply size={16} />
                  Responder nesta conversa
                </button>
              </div>
            </div>
          ) : null}

          {painel === 'escrever' ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="hidden items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 lg:flex">
                <div className="flex min-w-0 items-center gap-3">
                  {destSel[0] ? (
                    <AvatarPair
                      fromName={currentUser.nome || '?'}
                      fromPhoto={currentUser.fotoUrl}
                      toName={
                        destSel.length === 1
                          ? destSel[0].nome
                          : `${destSel.length} destinatários`
                      }
                      toPhoto={destSel.length === 1 ? destSel[0].fotoUrl : null}
                      size={40}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-gray-900">
                      {replyThreadId ? 'Responder' : 'Nova mensagem'}
                    </h4>
                    <p className="truncate text-[12px] text-gray-500">
                      {destSel.length === 0
                        ? 'Selecione os destinatários'
                        : destSel.length === 1
                          ? `De: ${currentUser.nome} → Para: ${destSel[0].nome}`
                          : `De: ${currentUser.nome} → Para: ${destSel.map((d) => d.nome).join(', ')}`}
                      {replyThreadId ? ` · ${assuntoLimpo(titulo)}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetCompose();
                    setPainel(threadIdAtivo ? 'ler' : 'vazio');
                  }}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {!replyThreadId ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Destinatários *{' '}
                      <span className="font-normal text-gray-400">
                        (pode selecionar vários)
                      </span>
                    </label>
                    {destSel.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {destSel.map((d) => (
                          <span
                            key={destKey(d)}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 py-1 pl-1 pr-2 text-xs text-blue-900"
                          >
                            <AvatarBubble name={d.nome} photoUrl={d.fotoUrl} size={20} />
                            <span className="truncate font-medium">{d.nome}</span>
                            <button
                              type="button"
                              onClick={() => toggleDestinatario(d)}
                              className="rounded-full p-0.5 text-blue-600 hover:bg-blue-100"
                              aria-label={`Remover ${d.nome}`}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mb-2 text-xs text-gray-400">
                        Escolha um grupo abaixo para selecionar quem recebe a mensagem.
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {GRUPO_BTN.map((btn) => {
                        const total = listDestinatariosDoGrupo(
                          destinatariosDisponiveis,
                          btn.id
                        ).length;
                        const sel = countSelNoGrupo(btn.id);
                        const disabled = loadingDest ? false : total === 0;
                        return (
                          <button
                            key={btn.id}
                            type="button"
                            disabled={disabled && !loadingDest}
                            onClick={() => abrirModalGrupo(btn.id)}
                            className={`rounded-lg border px-2.5 py-2.5 text-left transition-colors ${
                              sel > 0
                                ? 'border-blue-300 bg-blue-50 text-blue-900'
                                : disabled
                                  ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
                                  : 'border-gray-200 bg-white text-gray-800 hover:border-blue-200 hover:bg-blue-50/40'
                            }`}
                          >
                            <span className="block text-xs font-semibold">{btn.label}</span>
                            <span className="mt-0.5 block text-[10px] text-gray-500">
                              {loadingDest
                                ? 'Carregando…'
                                : sel > 0
                                  ? `${sel} selecionado${sel > 1 ? 's' : ''} · ${total}`
                                  : `${total} disponíve${total === 1 ? 'l' : 'is'}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {destSel.length > 1 ? (
                      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="mb-2 text-xs font-medium text-gray-700">
                          Como enviar para {destSel.length} pessoas?
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setModoEnvio('individual')}
                            className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                              modoEnvio === 'individual'
                                ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <span className="block text-xs font-semibold text-gray-900">
                              Individual
                            </span>
                            <span className="mt-0.5 block text-[11px] text-gray-500">
                              Uma cópia separada para cada um (assuntos independentes)
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setModoEnvio('grupo')}
                            className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                              modoEnvio === 'grupo'
                                ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                          >
                            <span className="block text-xs font-semibold text-gray-900">
                              Em grupo
                            </span>
                            <span className="mt-0.5 block text-[11px] text-gray-500">
                              Todos respondem no mesmo assunto/conversa
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : destSel.length > 0 ? (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-800">
                      {modoEnvio === 'grupo' || destSel.length > 1 ? (
                        <>
                          Resposta em grupo · Assunto: <strong>{assuntoLimpo(titulo)}</strong>
                          <p className="mt-1 text-[11px] text-blue-700">
                            Participantes: {destSel.map((d) => d.nome).join(', ')}
                          </p>
                        </>
                      ) : (
                        <>
                          Para: <strong>{destSel[0].nome}</strong> · Assunto:{' '}
                          <strong>{assuntoLimpo(titulo)}</strong>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}

                {!replyThreadId ? (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">Assunto *</label>
                    <input
                      type="text"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Assunto da mensagem"
                    />
                  </div>
                ) : null}

                {currentUser.role === 'medico' && loadPacientesAnexaveis ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      Anexar paciente{' '}
                      <span className="font-normal text-gray-400">
                        (compartilha o prontuário com o médico destinatário)
                      </span>
                    </label>
                    {pacienteAnexoSel ? (
                      <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3">
                        <div className="flex items-start gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
                            <UserRound className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {pacienteAnexoSel.nome}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-500">
                              {[
                                pacienteAnexoSel.email,
                                pacienteAnexoSel.telefone,
                                [pacienteAnexoSel.cidade, pacienteAnexoSel.estado]
                                  .filter(Boolean)
                                  .join(' / '),
                              ]
                                .filter(Boolean)
                                .join(' · ') || 'Prontuário anexado'}
                            </p>
                            <p className="mt-1 text-[10px] text-teal-800">
                              O destinatário poderá abrir e editar — sem adicionar à lista dele.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPacienteAnexoSel(null)}
                            className="rounded-md p-1 text-gray-400 hover:bg-white hover:text-gray-700"
                            aria-label="Remover paciente anexado"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => void abrirModalAnexarPaciente()}
                          className="mt-2 text-[11px] font-semibold text-teal-800 hover:underline"
                        >
                          Trocar paciente
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void abrirModalAnexarPaciente()}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-teal-300 bg-teal-50/40 px-3 py-2.5 text-xs font-semibold text-teal-800 hover:bg-teal-50"
                      >
                        <UserRound size={14} />
                        Selecionar paciente para anexar
                      </button>
                    )}
                  </div>
                ) : null}

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Mensagem *</label>
                  <MensagemRichEditor
                    key={editorKey}
                    initialHtml={composeInitialHtml}
                    onChangeHtml={setHtml}
                    anexos={anexosSafe}
                    onAnexosChange={(next) => setAnexos(Array.isArray(next) ? next : [])}
                    disabled={enviando}
                    uploadEndpoint="/api/comunicacao/mensagens-anexo-upload"
                    minHeightClassName="min-h-[220px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    resetCompose();
                    setPainel(threadIdAtivo ? 'ler' : 'vazio');
                  }}
                  className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
                  disabled={enviando}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void enviar()}
                  disabled={enviando}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send size={15} />
                  {enviando ? 'Enviando…' : replyThreadId ? 'Enviar resposta' : 'Enviar'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {modalGrupo ? (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/50 lg:items-center lg:p-4">
          <div className="flex h-full w-full flex-col overflow-hidden bg-white lg:h-auto lg:max-h-[85vh] lg:max-w-lg lg:rounded-xl">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-gray-900">
                  {GRUPO_BTN.find((b) => b.id === modalGrupo)?.label || 'Destinatários'}
                </h3>
                <p className="text-xs text-gray-500">
                  {countSelNoGrupo(modalGrupo)} selecionado
                  {countSelNoGrupo(modalGrupo) === 1 ? '' : 's'} · {modalListaBase.length} no total
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalGrupo(null);
                  setBuscaModal('');
                }}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-gray-100 px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={buscaModal}
                  onChange={(e) => setBuscaModal(e.target.value)}
                  placeholder={`Pesquisar ${
                    GRUPO_BTN.find((b) => b.id === modalGrupo)?.label.toLowerCase() || 'pessoas'
                  }…`}
                  className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm"
                  autoFocus
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selecionarTodosDoModal}
                  disabled={modalLista.length === 0}
                  className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                >
                  {buscaModal.trim() ? 'Selecionar resultados' : 'Selecionar todos'}
                </button>
                <button
                  type="button"
                  onClick={limparTodosDoModal}
                  disabled={countSelNoGrupo(modalGrupo) === 0}
                  className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Limpar seleção
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {loadingDest ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Carregando…
                </div>
              ) : modalLista.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-500">
                  {buscaModal.trim()
                    ? 'Nenhum resultado para esta busca'
                    : 'Ninguém neste grupo'}
                </p>
              ) : (
                <ul className="space-y-1">
                  {modalLista.map((d) => {
                    const ativo = isDestSelected(d);
                    return (
                      <li key={destKey(d)}>
                        <button
                          type="button"
                          onClick={() => toggleDestinatario(d)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors ${
                            ativo ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              ativo
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-gray-300 bg-white text-transparent'
                            }`}
                            aria-hidden
                          >
                            <Check size={12} strokeWidth={3} />
                          </span>
                          <AvatarBubble name={d.nome} photoUrl={d.fotoUrl} size={36} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{d.nome}</p>
                            <p className="truncate text-[11px] text-gray-500">
                              {d.subtitle || d.email || roleLabel(d.role)}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="border-t border-gray-200 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setModalGrupo(null);
                  setBuscaModal('');
                }}
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Concluir · {countSelNoGrupo(modalGrupo)} selecionado
                {countSelNoGrupo(modalGrupo) === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showModalPacienteAnexo ? (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/50 lg:items-center lg:p-4">
          <div className="flex h-full w-full flex-col overflow-hidden bg-white lg:h-auto lg:max-h-[85vh] lg:max-w-lg lg:rounded-xl">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-gray-900">
                  Anexar paciente
                </h3>
                <p className="text-xs text-gray-500">
                  O médico destinatário poderá abrir e editar o prontuário (sem entrar na lista dele).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModalPacienteAnexo(false);
                  setBuscaPacienteAnexo('');
                }}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="border-b border-gray-100 px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={buscaPacienteAnexo}
                  onChange={(e) => setBuscaPacienteAnexo(e.target.value)}
                  placeholder="Buscar por nome, e-mail ou telefone…"
                  className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {loadingPacientesAnexo ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Carregando…
                </div>
              ) : pacientesAnexaveisFiltrados.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-500">
                  {buscaPacienteAnexo.trim()
                    ? 'Nenhum paciente encontrado'
                    : 'Nenhum paciente disponível'}
                </p>
              ) : (
                <ul className="space-y-1">
                  {pacientesAnexaveisFiltrados.map((p) => (
                    <li key={p.pacienteId}>
                      <button
                        type="button"
                        onClick={() => selecionarPacienteAnexo(p)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left hover:bg-teal-50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{p.nome}</p>
                          <p className="truncate text-[11px] text-gray-500">
                            {[p.email, p.telefone, [p.cidade, p.estado].filter(Boolean).join(' / ')]
                              .filter(Boolean)
                              .join(' · ') || 'Paciente'}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <MensagemAssinaturaModal
        open={showAssinaturaModal}
        onClose={() => setShowAssinaturaModal(false)}
        userId={currentUser.userId}
        profileId={currentUser.profileId}
        defaults={defaultsAssinatura}
        uploadPacienteId={currentUser.profileId}
        uploadEndpoint="/api/comunicacao/mensagens-anexo-upload"
        onSaved={(h) => {
          setAssinaturaHtml(h);
          if (painel === 'escrever') {
            const bodyOnly = plainBodyWithoutAssinatura(html, assinaturaHtml);
            const bodyHtml = bodyOnly
              ? `<div>${bodyOnly
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/\n/g, '<br>')}</div>`
              : '';
            const next = buildComposeHtmlWithAssinatura(bodyHtml, h);
            setHtml(next);
            setComposeInitialHtml(next);
            setEditorKey((k) => k + 1);
          }
        }}
        onNotify={onNotify}
      />
    </div>
  );
}
