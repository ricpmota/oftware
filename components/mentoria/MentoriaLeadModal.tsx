'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

const ESTADOS_BR = [
  { value: '', label: 'Selecione' },
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

const FATURAMENTO_OPCOES = [
  { value: '', label: 'Selecione' },
  { value: 'menos_5k', label: 'Menos de R$5.000/mês' },
  { value: '5k_10k', label: 'R$5.000 – R$10.000' },
  { value: '10k_20k', label: 'R$10.000 – R$20.000' },
  { value: '20k_50k', label: 'R$20.000 – R$50.000' },
  { value: 'mais_50k', label: 'Mais de R$50.000' },
];

const OBJETIVO_OPCOES = [
  { value: '', label: 'Selecione' },
  { value: 'aumentar_faturamento', label: 'Aumentar faturamento' },
  { value: 'criar_renda_online', label: 'Criar renda online' },
  { value: 'sair_consultorio', label: 'Sair da dependência do consultório' },
  { value: 'escalar_atendimento', label: 'Escalar atendimento' },
  { value: 'liberdade_tempo', label: 'Ter mais liberdade de tempo' },
];

const ATENDE_ONLINE_OPCOES = [
  { value: '', label: 'Selecione' },
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
  { value: 'tentei_nao_deu', label: 'Já tentei, mas não deu certo' },
];

const PRAZO_OPCOES = [
  { value: '', label: 'Selecione' },
  { value: 'imediato', label: 'Imediatamente' },
  { value: '30_dias', label: '30 dias' },
  { value: '3_meses', label: '3 meses' },
  { value: 'avaliando', label: 'Só estou avaliando' },
];

function maskWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

type FormData = {
  nomeCompleto: string;
  cidade: string;
  estado: string;
  email: string;
  whatsapp: string;
  faturamentoAtual: string;
  objetivoPrincipal: string;
  atendeOnline: string;
  prazoTransformacao: string;
  travamento: string;
};

const INITIAL_FORM: FormData = {
  nomeCompleto: '',
  cidade: '',
  estado: '',
  email: '',
  whatsapp: '',
  faturamentoAtual: '',
  objetivoPrincipal: '',
  atendeOnline: '',
  prazoTransformacao: '',
  travamento: '',
};

function formatSelectValue(key: string, value: string): string {
  const maps: Record<string, Record<string, string>> = {
    faturamentoAtual: Object.fromEntries(FATURAMENTO_OPCOES.filter((o) => o.value).map((o) => [o.value, o.label])),
    objetivoPrincipal: Object.fromEntries(OBJETIVO_OPCOES.filter((o) => o.value).map((o) => [o.value, o.label])),
    atendeOnline: Object.fromEntries(ATENDE_ONLINE_OPCOES.filter((o) => o.value).map((o) => [o.value, o.label])),
    prazoTransformacao: Object.fromEntries(PRAZO_OPCOES.filter((o) => o.value).map((o) => [o.value, o.label])),
  };
  return maps[key]?.[value] || value;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MentoriaLeadModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = useCallback((field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }, [errors]);

  const handleWhatsAppChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const masked = maskWhatsApp(raw);
    update('whatsapp', masked);
  }, [update]);

  const validate = useCallback((): boolean => {
    const e: typeof errors = {};
    if (!form.nomeCompleto.trim()) e.nomeCompleto = 'Obrigatório';
    if (!form.email.trim()) e.email = 'Obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido';
    if (!form.whatsapp.replace(/\D/g, '').trim() || form.whatsapp.replace(/\D/g, '').length < 10)
      e.whatsapp = 'WhatsApp inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      setLoading(true);
      try {
        const res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nomeCompleto: form.nomeCompleto.trim(),
            cidade: form.cidade.trim(),
            estado: form.estado,
            email: form.email.trim(),
            whatsapp: form.whatsapp,
            faturamentoAtual: formatSelectValue('faturamentoAtual', form.faturamentoAtual) || form.faturamentoAtual || '—',
            objetivoPrincipal: formatSelectValue('objetivoPrincipal', form.objetivoPrincipal) || form.objetivoPrincipal || '—',
            atendeOnline: formatSelectValue('atendeOnline', form.atendeOnline) || form.atendeOnline || '—',
            prazoTransformacao: formatSelectValue('prazoTransformacao', form.prazoTransformacao) || form.prazoTransformacao || '—',
            travamento: form.travamento.trim() || '—',
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Erro ao enviar');
        }
        setSuccess(true);
        setForm(INITIAL_FORM);
      } catch (err) {
        setErrors({ email: (err as Error).message });
      } finally {
        setLoading(false);
      }
    },
    [form, validate]
  );

  const handleClose = useCallback(() => {
    setForm(INITIAL_FORM);
    setErrors({});
    setSuccess(false);
    setLoading(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  const inputClass =
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/20 text-sm sm:text-base text-[#E8EDED] placeholder-[#E8EDED]/50 focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/60 focus:border-[#4CCB7A]/50 transition-all';
  const optionStyle = { backgroundColor: '#ffffff', color: '#0A1F44' } as const;
  const errorClass = 'text-red-400 text-xs sm:text-sm mt-0.5';
  const labelClass = 'block text-xs sm:text-sm font-medium text-[#E8EDED]/90 mb-1 sm:mb-1.5';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[340px] sm:max-w-lg max-h-[75vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-b from-[#0d2a5a] to-[#0A1F44] border border-white/10 shadow-2xl"
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2 rounded-lg text-[#E8EDED]/70 hover:text-[#E8EDED] hover:bg-white/10 transition-colors z-10"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <div className="p-4 sm:p-6 lg:p-8">
              {success ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-8"
                >
                  <h3 className="text-xl sm:text-2xl font-bold text-[#E8EDED] mb-2 sm:mb-3">Recebemos sua aplicação</h3>
                  <p className="text-sm sm:text-base text-[#E8EDED]/80 mb-6 sm:mb-8">
                    Se seu perfil for aprovado, entraremos em contato.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all"
                  >
                    Fechar
                  </button>
                </motion.div>
              ) : (
                <>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#E8EDED] mb-1.5">Antes de liberar sua vaga…</h2>
                  <p className="text-sm sm:text-base text-[#E8EDED]/80 mb-0.5">
                    Queremos entender se você está pronto para escalar com o modelo digital.
                  </p>
                  <p className="text-xs text-[#E8EDED]/60 mb-5 sm:mb-6">Leva menos de 1 minuto.</p>

                  <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    <div>
                      <label className={labelClass}>Nome completo *</label>
                      <input
                        type="text"
                        value={form.nomeCompleto}
                        onChange={(e) => update('nomeCompleto', e.target.value)}
                        className={inputClass}
                        placeholder="Dr(a). Nome"
                      />
                      {errors.nomeCompleto && <p className={errorClass}>{errors.nomeCompleto}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className={labelClass}>Cidade</label>
                        <input
                          type="text"
                          value={form.cidade}
                          onChange={(e) => update('cidade', e.target.value)}
                          className={inputClass}
                          placeholder="São Paulo"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Estado</label>
                        <select
                          value={form.estado}
                          onChange={(e) => update('estado', e.target.value)}
                          className={inputClass}
                        >
                          {ESTADOS_BR.map((o) => (
                            <option key={o.value || 'empty'} value={o.value} style={optionStyle}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>E-mail *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        className={inputClass}
                        placeholder="seu@email.com"
                      />
                      {errors.email && <p className={errorClass}>{errors.email}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>WhatsApp *</label>
                      <input
                        type="tel"
                        value={form.whatsapp}
                        onChange={handleWhatsAppChange}
                        className={inputClass}
                        placeholder="(11) 99999-9999"
                      />
                      {errors.whatsapp && <p className={errorClass}>{errors.whatsapp}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>Qual sua faixa de faturamento atual?</label>
                      <select
                        value={form.faturamentoAtual}
                        onChange={(e) => update('faturamentoAtual', e.target.value)}
                        className={inputClass}
                      >
                        {FATURAMENTO_OPCOES.map((o) => (
                          <option key={o.value || 'empty'} value={o.value} style={optionStyle}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Qual seu principal objetivo hoje?</label>
                      <select
                        value={form.objetivoPrincipal}
                        onChange={(e) => update('objetivoPrincipal', e.target.value)}
                        className={inputClass}
                      >
                        {OBJETIVO_OPCOES.map((o) => (
                          <option key={o.value || 'empty'} value={o.value} style={optionStyle}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Você já atende pacientes online?</label>
                      <select
                        value={form.atendeOnline}
                        onChange={(e) => update('atendeOnline', e.target.value)}
                        className={inputClass}
                      >
                        {ATENDE_ONLINE_OPCOES.map((o) => (
                          <option key={o.value || 'empty'} value={o.value} style={optionStyle}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Em quanto tempo você quer transformar sua renda?</label>
                      <select
                        value={form.prazoTransformacao}
                        onChange={(e) => update('prazoTransformacao', e.target.value)}
                        className={inputClass}
                      >
                        {PRAZO_OPCOES.map((o) => (
                          <option key={o.value || 'empty'} value={o.value} style={optionStyle}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>O que está te travando hoje?</label>
                      <textarea
                        value={form.travamento}
                        onChange={(e) => update('travamento', e.target.value)}
                        className={`${inputClass} min-h-[72px] sm:min-h-[100px] resize-y`}
                        placeholder="Seja direto. Isso nos ajuda a te orientar melhor."
                        rows={3}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base text-[#0A1F44] bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3] hover:opacity-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Quero minha vaga na mentoria'
                      )}
                    </button>
                    <p className="text-center text-xs text-[#E8EDED]/50">
                      Vagas limitadas • Resposta em breve
                    </p>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
