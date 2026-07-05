'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Search, Bell, FlaskConical, Stethoscope, RefreshCw, Send, Phone, DollarSign } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { LembreteTag } from '@/types/lembrete';
import { LEMBRETE_TAGS } from '@/types/lembrete';

export type ModalNovoLembreteInitialValues = {
  pacienteId?: string;
  pacienteNome?: string;
  texto?: string;
  tag?: LembreteTag;
  data?: string;
};

interface ModalNovoLembreteProps {
  pacientes: PacienteCompleto[];
  onSalvar: (dados: { data: string; pacienteId: string; pacienteNome: string; texto: string; tag: LembreteTag }) => Promise<void>;
  onFechar: () => void;
  isDark?: boolean;
  initialValues?: ModalNovoLembreteInitialValues;
  lembreteId?: string;
  elevatedZIndex?: boolean;
}

const TAG_ICONS: Record<LembreteTag, React.ReactNode> = {
  Exames:    <FlaskConical className="w-4 h-4" />,
  Consulta:  <Stethoscope className="w-4 h-4" />,
  Renovação: <RefreshCw className="w-4 h-4" />,
  Envio:     <Send className="w-4 h-4" />,
  Ligação:   <Phone className="w-4 h-4" />,
  Cobrança:  <DollarSign className="w-4 h-4" />,
};

const TAG_COLORS: Record<LembreteTag, { selected: string; unselected: string }> = {
  Exames:    { selected: 'bg-violet-600 text-white ring-2 ring-violet-400', unselected: 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50' },
  Consulta:  { selected: 'bg-blue-600 text-white ring-2 ring-blue-400',   unselected: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50' },
  Renovação: { selected: 'bg-emerald-600 text-white ring-2 ring-emerald-400', unselected: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50' },
  Envio:     { selected: 'bg-cyan-600 text-white ring-2 ring-cyan-400',   unselected: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50' },
  Ligação:   { selected: 'bg-amber-600 text-white ring-2 ring-amber-400', unselected: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50' },
  Cobrança:  { selected: 'bg-red-600 text-white ring-2 ring-red-400',     unselected: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50' },
};

export default function ModalNovoLembrete({
  pacientes,
  onSalvar,
  onFechar,
  isDark,
  initialValues,
  lembreteId,
  elevatedZIndex,
}: ModalNovoLembreteProps) {
  const isEdicao = !!lembreteId;
  const [data, setData] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [pacienteNome, setPacienteNome] = useState('');
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [texto, setTexto] = useState('');
  const [tag, setTag] = useState<LembreteTag>('Consulta');
  const [salvando, setSalvando] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    if (initialValues.pacienteId) {
      setPacienteId(initialValues.pacienteId);
      const nome = initialValues.pacienteNome ?? '';
      setPacienteNome(nome);
      setBuscaPaciente(nome);
    }
    if (initialValues.texto != null) setTexto(initialValues.texto);
    if (initialValues.tag) setTag(initialValues.tag);
  }, [initialValues]);

  const pacientesFiltrados = useMemo(() => {
    const q = buscaPaciente.toLowerCase().trim();
    if (!q) return pacientes.slice(0, 20);
    return pacientes
      .filter(p => {
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
    setSalvando(true);
    try {
      await onSalvar({ data, pacienteId, pacienteNome, texto: texto.trim(), tag });
      onFechar();
    } catch (err) {
      console.error('Erro ao salvar lembrete:', err);
      alert('Erro ao salvar lembrete. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const formValido = !!data && !!pacienteId && !!texto.trim();

  const d = isDark;
  const bgOverlay = 'bg-black/50';
  const bgModal = d ? 'bg-[#0A1F44] border-white/15' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700';
  const textPrimary = d ? 'text-[#E8EDED]' : 'text-gray-900 dark:text-white';
  const textSecondary = d ? 'text-[#E8EDED]/70' : 'text-gray-600 dark:text-gray-400';
  const inputCls = d
    ? 'bg-white/10 border-white/15 text-[#E8EDED] placeholder:text-[#E8EDED]/40 focus:ring-[#4CCB7A] focus:border-[#4CCB7A]'
    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-green-500 dark:focus:border-green-500';
  const btnPrimary = d
    ? 'bg-[#4CCB7A] text-[#0A1F44] hover:bg-[#4CCB7A]/90 disabled:bg-[#4CCB7A]/30'
    : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600';

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${elevatedZIndex ? 'z-[99999]' : 'z-50'} ${bgOverlay}`}
      onClick={onFechar}
    >
      <div
        className={`w-full max-w-lg rounded-xl border shadow-2xl ${bgModal} max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${d ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'}`}>
          <div className="flex items-center gap-2">
            <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${d ? 'bg-[#2F8FA3] text-[#E8EDED]' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
              <Bell className="w-4 h-4" />
            </span>
            <h3 className={`text-lg font-semibold ${textPrimary}`}>{isEdicao ? 'Editar Lembrete' : 'Novo Lembrete'}</h3>
          </div>
          <button onClick={onFechar} className={`p-1.5 rounded-lg transition-colors ${d ? 'hover:bg-white/10 text-[#E8EDED]/70' : 'hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-700'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Data */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Data</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${inputCls}`}
            />
          </div>

          {/* Paciente */}
          <div ref={dropdownRef} className="relative">
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Paciente</label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${d ? 'text-[#E8EDED]/40' : 'text-gray-400'}`} />
              <input
                ref={inputRef}
                type="text"
                value={buscaPaciente}
                onChange={e => { setBuscaPaciente(e.target.value); setPacienteId(''); setPacienteNome(''); setDropdownAberto(true); }}
                onFocus={() => setDropdownAberto(true)}
                placeholder="Digite o nome do paciente..."
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${inputCls}`}
                autoComplete="off"
              />
            </div>
            {dropdownAberto && pacientesFiltrados.length > 0 && (
              <div className={`absolute z-50 w-full mt-1 rounded-lg border shadow-lg max-h-48 overflow-y-auto ${d ? 'bg-[#0A1F44] border-white/15' : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                {pacientesFiltrados.map(p => {
                  const nome = p.nome || p.dadosIdentificacao?.nomeCompleto || 'Paciente';
                  const isSelected = p.id === pacienteId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selecionarPaciente(p)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        isSelected
                          ? d ? 'bg-[#4CCB7A]/20 text-[#4CCB7A]' : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : d ? 'text-[#E8EDED] hover:bg-white/10' : 'text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-gray-700'
                      }`}
                    >
                      {nome}
                    </button>
                  );
                })}
              </div>
            )}
            {pacienteId && (
              <p className={`mt-1 text-xs ${d ? 'text-[#4CCB7A]' : 'text-green-600 dark:text-green-400'}`}>
                ✓ {pacienteNome}
              </p>
            )}
          </div>

          {/* Lembrete texto */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${textPrimary}`}>Lembrete</label>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Digite o lembrete..."
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none ${inputCls}`}
            />
          </div>

          {/* Tag */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${textPrimary}`}>Tag</label>
            <div className="flex flex-wrap gap-2">
              {LEMBRETE_TAGS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    tag === t
                      ? (d ? TAG_COLORS[t].selected : TAG_COLORS[t].selected)
                      : (d ? TAG_COLORS[t].unselected.replace(/hover:bg-\S+/g, '').trim() + ' hover:opacity-80' : TAG_COLORS[t].unselected)
                  }`}
                >
                  {TAG_ICONS[t]}
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 px-5 py-4 border-t ${d ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'}`}>
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
    </div>
  );
}
