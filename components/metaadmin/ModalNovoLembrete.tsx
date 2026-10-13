'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Bell, FlaskConical, Stethoscope, RefreshCw, Send, Phone, DollarSign, Calendar, Clock, Dumbbell, UtensilsCrossed, BookOpen, ClipboardCheck } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { LembreteAvisoWhatsApp, LembreteTag } from '@/types/lembrete';
import { LEMBRETE_TAGS } from '@/types/lembrete';
import { LEMBRETE_AVISO_WHATSAPP_OPTIONS } from '@/lib/lembrete/lembreteWhatsappNotify';
import DataDdMmYyInput from '@/components/metaadmin/DataDdMmYyInput';
import { InternationalPhoneInput } from '@/components/phone/InternationalPhoneInput';
import { isValidIdentificacaoPhone } from '@/lib/phone/internationalPhoneValue';
import { professionalPhoneWriteFields } from '@/lib/whatsapp/resolveProfessionalPhone';

export type ModalNovoLembreteInitialValues = {
  pacienteId?: string;
  pacienteNome?: string;
  texto?: string;
  tag?: LembreteTag;
  data?: string;
  horario?: string;
  avisoWhatsApp?: LembreteAvisoWhatsApp;
  telefoneAviso?: string;
  telefoneAvisoDdi?: string;
  telefoneAvisoPais?: string;
  notificarPaciente?: boolean;
};

export type ModalNovoLembreteSavePayload = {
  data: string;
  horario?: string;
  avisoWhatsApp: LembreteAvisoWhatsApp;
  /** Telefone de destino do aviso WhatsApp (opcional; sem valor → número da sessão). */
  telefoneAviso?: string;
  telefoneAvisoDdi?: string;
  telefoneAvisoPais?: string;
  /** Se true, envia a mesma mensagem também ao telefone cadastrado do paciente. */
  notificarPaciente?: boolean;
  pacienteId: string;
  pacienteNome: string;
  texto: string;
  tag: LembreteTag;
};

interface ModalNovoLembreteProps {
  pacientes: PacienteCompleto[];
  onSalvar: (dados: ModalNovoLembreteSavePayload) => Promise<void>;
  onFechar: () => void;
  isDark?: boolean;
  initialValues?: ModalNovoLembreteInitialValues;
  lembreteId?: string;
  elevatedZIndex?: boolean;
  /** Prefill sugerido para o telefone do aviso (ex.: celular cadastrado do profissional). */
  defaultTelefoneAviso?: string;
  defaultTelefoneAvisoDdi?: string;
  defaultTelefoneAvisoPais?: string;
  /** Tags disponíveis no seletor. Default: tags do médico (metaadmin). */
  tags?: LembreteTag[];
  /**
   * Quem recebe o aviso via Canal Chat / de quem sai a notificação ao paciente.
   * Default: médico (metaadmin).
   */
  audience?: 'medico' | 'nutricionista' | 'personal';
}

const TAG_ICONS: Record<LembreteTag, React.ReactNode> = {
  Exames: <FlaskConical className="w-4 h-4" />,
  Consulta: <Stethoscope className="w-4 h-4" />,
  Renovação: <RefreshCw className="w-4 h-4" />,
  Envio: <Send className="w-4 h-4" />,
  Ligação: <Phone className="w-4 h-4" />,
  Cobrança: <DollarSign className="w-4 h-4" />,
  'Nova receita': <UtensilsCrossed className="w-4 h-4" />,
  'Check-In': <ClipboardCheck className="w-4 h-4" />,
  'Novo Treino': <Dumbbell className="w-4 h-4" />,
  Treino: <Dumbbell className="w-4 h-4" />,
  Aula: <BookOpen className="w-4 h-4" />,
};

const TAG_COLORS: Record<LembreteTag, { selected: string; unselected: string }> = {
  Exames: {
    selected: 'bg-violet-600 text-white ring-2 ring-violet-400',
    unselected:
      'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50',
  },
  Consulta: {
    selected: 'bg-blue-600 text-white ring-2 ring-blue-400',
    unselected:
      'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50',
  },
  Renovação: {
    selected: 'bg-emerald-600 text-white ring-2 ring-emerald-400',
    unselected:
      'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50',
  },
  Envio: {
    selected: 'bg-cyan-600 text-white ring-2 ring-cyan-400',
    unselected:
      'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50',
  },
  Ligação: {
    selected: 'bg-amber-600 text-white ring-2 ring-amber-400',
    unselected:
      'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50',
  },
  Cobrança: {
    selected: 'bg-red-600 text-white ring-2 ring-red-400',
    unselected:
      'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50',
  },
  'Nova receita': {
    selected: 'bg-emerald-600 text-white ring-2 ring-emerald-400',
    unselected:
      'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50',
  },
  'Check-In': {
    selected: 'bg-violet-600 text-white ring-2 ring-violet-400',
    unselected:
      'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50',
  },
  'Novo Treino': {
    selected: 'bg-pink-600 text-white ring-2 ring-pink-400',
    unselected:
      'bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:hover:bg-pink-900/50',
  },
  Treino: {
    selected: 'bg-purple-600 text-white ring-2 ring-purple-400',
    unselected:
      'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50',
  },
  Aula: {
    selected: 'bg-sky-600 text-white ring-2 ring-sky-400',
    unselected:
      'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50',
  },
};

export default function ModalNovoLembrete({
  pacientes,
  onSalvar,
  onFechar,
  isDark,
  initialValues,
  lembreteId,
  elevatedZIndex,
  defaultTelefoneAviso,
  defaultTelefoneAvisoDdi,
  defaultTelefoneAvisoPais,
  tags = LEMBRETE_TAGS,
  audience = 'medico',
}: ModalNovoLembreteProps) {
  const isEdicao = !!lembreteId;
  const tagsDisponiveis = tags.length > 0 ? tags : LEMBRETE_TAGS;
  const tagPadrao = tagsDisponiveis.includes('Consulta') ? 'Consulta' : tagsDisponiveis[0];
  const audienceLabel =
    audience === 'nutricionista'
      ? 'nutricionista'
      : audience === 'personal'
        ? 'personal'
        : 'médico';
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [avisoWhatsApp, setAvisoWhatsApp] = useState<LembreteAvisoWhatsApp>('no_horario');
  const [telefoneAviso, setTelefoneAviso] = useState(defaultTelefoneAviso ?? '');
  const [telefoneAvisoDdi, setTelefoneAvisoDdi] = useState(defaultTelefoneAvisoDdi ?? '');
  const [telefoneAvisoPais, setTelefoneAvisoPais] = useState(defaultTelefoneAvisoPais ?? '');
  const [notificarPaciente, setNotificarPaciente] = useState(false);
  const [pacienteId, setPacienteId] = useState('');
  const [pacienteNome, setPacienteNome] = useState('');
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [tag, setTag] = useState<LembreteTag>(tagPadrao);
  const [salvando, setSalvando] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!initialValues) return;
    if (initialValues.data) setData(initialValues.data);
    if (initialValues.horario != null) setHorario(initialValues.horario);
    if (initialValues.avisoWhatsApp) setAvisoWhatsApp(initialValues.avisoWhatsApp);
    if (initialValues.telefoneAviso != null) {
      setTelefoneAviso(initialValues.telefoneAviso);
      setTelefoneAvisoDdi(initialValues.telefoneAvisoDdi ?? '');
      setTelefoneAvisoPais(initialValues.telefoneAvisoPais ?? '');
    } else if (defaultTelefoneAviso) {
      setTelefoneAviso(defaultTelefoneAviso);
      setTelefoneAvisoDdi(defaultTelefoneAvisoDdi ?? '');
      setTelefoneAvisoPais(defaultTelefoneAvisoPais ?? '');
    }
    setNotificarPaciente(initialValues.notificarPaciente === true);
    if (initialValues.pacienteId) {
      setPacienteId(initialValues.pacienteId);
      const nome = initialValues.pacienteNome ?? '';
      setPacienteNome(nome);
      setBuscaPaciente(nome);
    }
    if (initialValues.texto != null) setTexto(initialValues.texto);
    if (initialValues.tag) setTag(initialValues.tag);
  }, [initialValues, defaultTelefoneAviso, defaultTelefoneAvisoDdi, defaultTelefoneAvisoPais]);

  const pacientesFiltrados = useMemo(() => {
    const q = buscaPaciente.toLowerCase().trim();
    if (!q) return pacientes.slice(0, 20);
    return pacientes
      .filter((p) => {
        const nome = (p.nome || p.dadosIdentificacao?.nomeCompleto || '').toLowerCase();
        return nome.includes(q);
      })
      .slice(0, 20);
  }, [buscaPaciente, pacientes]);

  const selecionarPaciente = (p: PacienteCompleto) => {
    setPacienteId(p.id);
    const nome = p.nome || p.dadosIdentificacao?.nomeCompleto || 'Paciente';
    setPacienteNome(nome);
    setBuscaPaciente(nome);
    setDropdownAberto(false);
  };

  const handleSalvar = async () => {
    if (!data || !pacienteId || !texto.trim()) return;
    const avisando = !!horario.trim() && avisoWhatsApp !== 'disabled';
    const phoneWrite = professionalPhoneWriteFields({
      telefone: telefoneAviso,
      telefoneDdi: telefoneAvisoDdi,
      telefonePais: telefoneAvisoPais,
    });
    if (
      avisando &&
      !isValidIdentificacaoPhone({
        telefone: telefoneAviso,
        telefoneDdi: telefoneAvisoDdi,
        telefonePais: telefoneAvisoPais,
      })
    ) {
      alert('Informe o telefone que recebe o aviso.');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        data,
        horario: horario.trim() || undefined,
        avisoWhatsApp: horario.trim() ? avisoWhatsApp : 'disabled',
        telefoneAviso: avisando ? phoneWrite.telefone : undefined,
        telefoneAvisoDdi: avisando ? phoneWrite.telefoneDdi : undefined,
        telefoneAvisoPais: avisando ? phoneWrite.telefonePais : undefined,
        notificarPaciente: avisando ? notificarPaciente : false,
        pacienteId,
        pacienteNome,
        texto: texto.trim(),
        tag,
      });
      onFechar();
    } catch (err) {
      console.error('Erro ao salvar lembrete:', err);
      alert('Erro ao salvar lembrete. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const formValido = !!data && !!pacienteId && !!texto.trim();

  if (!mounted || typeof document === 'undefined') return null;

  const d = isDark;
  const bgOverlay = 'bg-black/50';
  const bgModal = d
    ? 'bg-[#0A1F44] border-white/15'
    : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700';
  const textPrimary = d ? 'text-[#E8EDED]' : 'text-gray-900 dark:text-white';
  const textSecondary = d ? 'text-[#E8EDED]/70' : 'text-gray-600 dark:text-gray-400';
  const inputCls = d
    ? 'bg-white/10 border-white/15 text-[#E8EDED] placeholder:text-[#E8EDED]/40 focus:ring-[#4CCB7A] focus:border-[#4CCB7A]'
    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-green-500 dark:focus:border-green-500';
  const btnPrimary = d
    ? 'bg-[#4CCB7A] text-[#0A1F44] hover:bg-[#4CCB7A]/90 disabled:bg-[#4CCB7A]/30'
    : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600';
  const quandoCard = d
    ? 'rounded-2xl border border-white/10 bg-white/[0.04] divide-y divide-white/10'
    : 'rounded-2xl border border-gray-200 bg-gray-50/80 divide-y divide-gray-200 dark:border-gray-700 dark:bg-gray-800/50 dark:divide-gray-700';
  const quandoIcon = d
    ? 'bg-[#2F8FA3]/25 text-[#4CCB7A]'
    : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
  const pickerCls = d
    ? 'h-10 rounded-xl border border-white/15 bg-[#0A1F44]/80 px-2.5 text-sm font-medium text-[#E8EDED] [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/40 focus:border-[#4CCB7A]'
    : 'h-10 rounded-xl border border-gray-200 bg-white px-2.5 text-sm font-medium text-gray-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 dark:border-gray-600 dark:bg-gray-900/80 dark:text-white dark:[color-scheme:dark]';

  return createPortal(
    <div
      className={`fixed inset-0 flex items-stretch justify-center lg:items-center lg:p-4 ${elevatedZIndex ? 'z-[99999]' : 'z-[70]'} ${bgOverlay}`}
      role="presentation"
      onClick={onFechar}
    >
      <div
        className={`flex h-[100dvh] max-h-[100dvh] w-full min-w-0 min-h-0 flex-col overflow-hidden border-0 shadow-2xl lg:h-auto lg:max-h-[min(90vh,720px)] lg:max-w-lg lg:rounded-xl lg:border ${bgModal}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-novo-lembrete-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-center justify-between px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b ${d ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'}`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center w-8 h-8 rounded-lg ${d ? 'bg-[#2F8FA3] text-[#E8EDED]' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}
            >
              <Bell className="w-4 h-4" />
            </span>
            <h3 id="modal-novo-lembrete-title" className={`text-lg font-semibold ${textPrimary}`}>
              {isEdicao ? 'Editar Lembrete' : 'Novo Lembrete'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className={`p-1.5 rounded-lg transition-colors ${d ? 'hover:bg-white/10 text-[#E8EDED]/70' : 'hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-700'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain flex-1 min-h-0">
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Quando</label>
            <div className={quandoCard}>
              <div className="flex items-center gap-3 px-3.5 py-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${quandoIcon}`}
                >
                  <Calendar className="h-4 w-4" />
                </span>
                <span className={`min-w-0 flex-1 text-sm font-medium ${textPrimary}`}>Data</span>
                <DataDdMmYyInput
                  value={data}
                  onChange={setData}
                  isDark={d}
                  ariaLabel="Data do lembrete"
                  className={pickerCls}
                />
              </div>
              <div className="flex items-center gap-3 px-3.5 py-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${quandoIcon}`}
                >
                  <Clock className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${textPrimary}`}>Horário</span>
                  <span className={`block text-[11px] leading-tight ${textSecondary}`}>
                    Brasília
                  </span>
                </div>
                <input
                  type="time"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className={`w-[7rem] max-w-[40%] shrink-0 ${pickerCls}`}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
              Aviso no WhatsApp
            </label>
            <div className="space-y-2">
              {LEMBRETE_AVISO_WHATSAPP_OPTIONS.map((option) => {
                const disabledByMissingTime =
                  option.value !== 'disabled' && !horario.trim();
                return (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      avisoWhatsApp === option.value
                        ? d
                          ? 'border-[#4CCB7A]/60 bg-[#4CCB7A]/10 text-[#E8EDED]'
                          : 'border-green-500 bg-green-50 text-green-900 dark:border-green-500 dark:bg-green-900/20 dark:text-green-100'
                        : d
                          ? 'border-white/10 text-[#E8EDED]/80 hover:bg-white/5'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50'
                    } ${disabledByMissingTime ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="radio"
                      name="avisoWhatsApp"
                      value={option.value}
                      checked={avisoWhatsApp === option.value}
                      disabled={disabledByMissingTime}
                      onChange={() => setAvisoWhatsApp(option.value)}
                      className="accent-green-600"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
            {!horario.trim() ? (
              <p className={`mt-1.5 text-[11px] ${textSecondary}`}>
                Informe o horário para agendar o aviso.
              </p>
            ) : null}
          </div>

          {horario.trim() && avisoWhatsApp !== 'disabled' ? (
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>
                Telefone que recebe o aviso
              </label>
              <InternationalPhoneInput
                id="modal-lembrete-telefone-aviso"
                value={{
                  telefone: telefoneAviso,
                  telefoneDdi: telefoneAvisoDdi,
                  telefonePais: telefoneAvisoPais,
                }}
                onChange={(next) => {
                  setTelefoneAviso(next.telefone);
                  setTelefoneAvisoDdi(next.telefoneDdi);
                  setTelefoneAvisoPais(next.telefonePais);
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${inputCls}`}
              />
              <p className={`mt-1.5 text-[11px] ${textSecondary}`}>
                Recebe o aviso pelo Canal Chat Oftware (não pelo WhatsApp do {audienceLabel}).
              </p>
            </div>
          ) : null}

          <div ref={dropdownRef} className="relative">
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Paciente</label>
            <div className="relative">
              <Search
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${d ? 'text-[#E8EDED]/40' : 'text-gray-400'}`}
              />
              <input
                ref={inputRef}
                type="text"
                value={buscaPaciente}
                onChange={(e) => {
                  setBuscaPaciente(e.target.value);
                  setPacienteId('');
                  setPacienteNome('');
                  setNotificarPaciente(false);
                  setDropdownAberto(true);
                }}
                onFocus={() => setDropdownAberto(true)}
                placeholder="Digite o nome do paciente..."
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${inputCls}`}
                autoComplete="off"
              />
            </div>
            {dropdownAberto && pacientesFiltrados.length > 0 && (
              <div
                className={`absolute z-50 w-full mt-1 rounded-lg border shadow-lg max-h-48 overflow-y-auto ${d ? 'bg-[#0A1F44] border-white/15' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}
              >
                {pacientesFiltrados.map((p) => {
                  const nome = p.nome || p.dadosIdentificacao?.nomeCompleto || 'Paciente';
                  const isSelected = p.id === pacienteId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selecionarPaciente(p)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        isSelected
                          ? d
                            ? 'bg-[#4CCB7A]/20 text-[#4CCB7A]'
                            : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : d
                            ? 'text-[#E8EDED] hover:bg-white/10'
                            : 'text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700'
                      }`}
                    >
                      {nome}
                    </button>
                  );
                })}
              </div>
            )}
            {pacienteId && (
              <div className="mt-1.5 space-y-1.5">
                <p className={`text-xs ${d ? 'text-[#4CCB7A]' : 'text-green-600 dark:text-green-400'}`}>
                  ✓ {pacienteNome}
                </p>
                <label
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                    d
                      ? 'border-white/10 text-[#E8EDED]/85 hover:bg-white/5'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={notificarPaciente}
                    onChange={(e) => setNotificarPaciente(e.target.checked)}
                    className="mt-0.5 accent-green-600"
                  />
                  <span>
                    Notificar também o paciente
                    <span className={`block text-[11px] mt-0.5 ${textSecondary}`}>
                      Envia a mesma mensagem do WhatsApp do {audienceLabel} para o telefone
                      cadastrado do paciente.
                    </span>
                  </span>
                </label>
              </div>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Lembrete</label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Digite o lembrete..."
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none ${inputCls}`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Tag</label>
            <div className="flex flex-wrap gap-2">
              {tagsDisponiveis.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    tag === t
                      ? TAG_COLORS[t].selected
                      : d
                        ? TAG_COLORS[t].unselected.replace(/hover:bg-\S+/g, '').trim() +
                          ' hover:opacity-80'
                        : TAG_COLORS[t].unselected
                  }`}
                >
                  {TAG_ICONS[t]}
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`flex shrink-0 items-center justify-end gap-3 px-5 py-4 border-t pb-[max(1rem,env(safe-area-inset-bottom))] ${d ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'}`}
        >
          <button
            onClick={onFechar}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${d ? 'text-[#E8EDED]/70 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={!formValido || salvando}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:cursor-not-allowed ${btnPrimary}`}
          >
            {salvando ? 'Salvando...' : isEdicao ? 'Salvar alterações' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
