'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChevronLeft, Loader2, Upload } from 'lucide-react';
import {
  CADASTRO_MEDICO_DRAFT_STORAGE_KEY,
  CADASTRO_MEDICO_STEP_TITLES,
  CADASTRO_MEDICO_TOTAL_STEPS,
  createEmptyCadastroMedicoForm,
  DIA_VENCIMENTO_OPTIONS,
  ESTADO_CIVIL_OPTIONS,
  ESTADOS_BR_OPTIONS,
} from '@/lib/whiteLabel/cadastroMedicoConstants';
import { CADASTRO_MEDICO_FORM_KEYS } from '@/types/cadastroMedicoWhiteLabel';
import { formatLeadWhiteLabelWhatsAppDisplay } from '@/lib/whiteLabel/leadWhiteLabelNormalize';
import CadastroMedicoReviewStep from '@/components/whitelabel/cadastroMedico/CadastroMedicoReviewStep';
import CadastroMedicoDomainStep from '@/components/whitelabel/cadastroMedico/CadastroMedicoDomainStep';
import {
  ChoiceButton,
  FieldGrid,
  FieldLabel,
  StepHint,
  inputClassName,
  maskCep,
  maskCnpj,
  maskCpf,
  maskPhone,
  selectClassName,
} from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';

type FormState = Record<string, string>;

const UPLOAD_FIELDS = [
  { field: 'fotoProfissional', key: 'fotoProfissionalUrl', label: 'Foto profissional' },
  { field: 'logo', key: 'logoUrl', label: 'Logo' },
  { field: 'imagemCapa', key: 'imagemCapaUrl', label: 'Imagem de capa' },
  { field: 'documentoFoto', key: 'documentoFotoUrl', label: 'Documento com foto' },
  { field: 'comprovanteEndereco', key: 'comprovanteEnderecoUrl', label: 'Comprovante de endereço' },
] as const;

function validateStepClient(form: FormState, step: number): string | null {
  const req = (key: string, msg: string) => (!form[key]?.trim() ? msg : null);

  switch (step) {
    case 0:
      return (
        req('tratamento', 'Selecione o tratamento.') ||
        req('nome', 'Informe o nome.') ||
        req('sobrenome', 'Informe o sobrenome.') ||
        req('nomeMarca', 'Informe o nome da marca.') ||
        req('especialidade', 'Informe a especialidade.') ||
        req('cidade', 'Informe a cidade.') ||
        req('estado', 'Selecione o estado.')
      );
    case 1:
      if (!form.dominioDesejado.trim()) return 'Informe o domínio desejado.';
      if (!form.extensaoDominio.trim()) return 'Selecione um domínio na lista.';
      if (!form.statusDominio) return 'Busque e selecione um domínio disponível.';
      if (form.statusDominio === 'indisponivel') return 'Selecione um domínio disponível na lista.';
      return null;
    case 2:
      if (!form.cepEntrega.replace(/\D/g, '')) return 'Informe o CEP.';
      if (!form.ruaEntrega.trim()) return 'Informe a rua.';
      if (!form.numeroEntrega.trim()) return 'Informe o número.';
      if (!form.bairroEntrega.trim()) return 'Informe o bairro.';
      if (!form.cidadeEntrega.trim()) return 'Informe a cidade.';
      if (!form.estadoEntrega.trim()) return 'Selecione o estado.';
      if (!form.nomeRecebedor.trim()) return 'Informe quem receberá.';
      if (form.telefoneEntrega.replace(/\D/g, '').length < 10) return 'Informe um telefone válido.';
      return null;
    case 3: {
      if (!form.nomeCompletoContrato.trim()) return 'Informe o nome completo.';
      if (form.cpf.replace(/\D/g, '').length !== 11) return 'Informe um CPF válido.';
      if (!form.rg.trim()) return 'Informe o RG.';
      if (!form.dataNascimento.trim()) return 'Informe a data de nascimento.';
      if (!form.estadoCivil.trim()) return 'Selecione o estado civil.';
      if (!form.nacionalidade.trim()) return 'Informe a nacionalidade.';
      if (!form.crm.trim()) return 'Informe o CRM.';
      if (!form.crmUf.trim()) return 'Selecione a UF do CRM.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailContrato.trim())) return 'Informe um e-mail válido.';
      if (form.whatsappContrato.replace(/\D/g, '').length < 10) return 'Informe um WhatsApp válido.';
      if (form.usarMesmoEnderecoEntrega === 'nao') {
        if (!form.cepContrato.replace(/\D/g, '')) return 'Informe o CEP do endereço contratual.';
        if (!form.ruaContrato.trim()) return 'Informe a rua do endereço contratual.';
        if (!form.numeroContrato.trim()) return 'Informe o número do endereço contratual.';
        if (!form.bairroContrato.trim()) return 'Informe o bairro do endereço contratual.';
        if (!form.cidadeContrato.trim()) return 'Informe a cidade do endereço contratual.';
        if (!form.estadoContrato.trim()) return 'Selecione o estado do endereço contratual.';
      }
      return null;
    }
    case 4:
      if (!form.diaVencimento.trim()) return 'Selecione o dia de vencimento.';
      if (form.tipoPessoa === 'juridica') {
        if (!form.cnpj.replace(/\D/g, '')) return 'Informe o CNPJ.';
        if (!form.razaoSocial.trim()) return 'Informe a razão social.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailFinanceiro.trim())) {
          return 'Informe um e-mail financeiro válido.';
        }
      }
      return null;
    case 5:
      return null;
    case 6:
      if (form.confirmoVeracidade !== 'true') return 'Confirme que as informações são verdadeiras.';
      if (form.autorizoUsoDados !== 'true') return 'Autorize a utilização dos dados.';
      return null;
    default:
      return null;
  }
}

async function fetchCep(cep: string) {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  const data = await response.json();
  if (data.erro) return null;
  return data as { logradouro?: string; bairro?: string; localidade?: string; uf?: string };
}

export default function CadastroMedicoPageClient() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(createEmptyCadastroMedicoForm);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const savedHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = ((step + 1) / CADASTRO_MEDICO_TOTAL_STEPS) * 100;
  const stepLabel = useMemo(() => `${step + 1} de ${CADASTRO_MEDICO_TOTAL_STEPS}`, [step]);
  const isReviewStep = step === 6;

  const updateField = useCallback((key: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
    if (key === 'dominioDesejado' || key === 'extensaoDominio') {
      next.statusDominio = '';
    }
    return next;
  });
  setError('');
  }, []);

  const persistDraft = useCallback(
    async (nextStep: number, currentForm: FormState, currentDraftId: string | null) => {
      setSaving(true);
      try {
        const res = await fetch('/api/whitelabel/cadastromedico/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftId: currentDraftId || undefined,
            form: currentForm,
            currentStep: nextStep,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string; draftId?: string };
        if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
        if (data.draftId) {
          setDraftId(data.draftId);
          localStorage.setItem(CADASTRO_MEDICO_DRAFT_STORAGE_KEY, data.draftId);
        }
        setSavedHint(true);
        if (savedHintTimer.current) clearTimeout(savedHintTimer.current);
        savedHintTimer.current = setTimeout(() => setSavedHint(false), 2500);
        return data.draftId || currentDraftId;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const storedId = localStorage.getItem(CADASTRO_MEDICO_DRAFT_STORAGE_KEY);
      if (!storedId) {
        setLoadingDraft(false);
        return;
      }
      try {
        const res = await fetch(`/api/whitelabel/cadastromedico/draft?id=${encodeURIComponent(storedId)}`);
        const data = (await res.json().catch(() => ({}))) as {
          draft?: FormState & { currentStep?: number; status?: string; id?: string };
        };
        if (!cancelled && res.ok && data.draft) {
          if (data.draft.status === 'concluido') {
            setSuccess(true);
          } else {
            const loaded = createEmptyCadastroMedicoForm();
            for (const key of CADASTRO_MEDICO_FORM_KEYS) {
              const val = data.draft[key];
              if (typeof val === 'string') loaded[key] = val;
            }
            setForm(loaded);
            setDraftId(data.draft.id || storedId);
            if (typeof data.draft.currentStep === 'number') {
              setStep(Math.min(data.draft.currentStep, CADASTRO_MEDICO_TOTAL_STEPS - 1));
            }
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCepChange = useCallback(
    async (prefix: 'Entrega' | 'Contrato', raw: string) => {
      const masked = maskCep(raw);
      updateField(`cep${prefix}`, masked);
      const data = await fetchCep(masked);
      if (!data) return;
      updateField(`rua${prefix}`, data.logradouro || '');
      updateField(`bairro${prefix}`, data.bairro || '');
      updateField(`cidade${prefix}`, data.localidade || '');
      updateField(`estado${prefix}`, data.uf || '');
    },
    [updateField]
  );

  const handleUpload = useCallback(
    async (field: string, urlKey: string, file: File) => {
      let activeDraftId = draftId;
      if (!activeDraftId) {
        activeDraftId = await persistDraft(step, form, null);
      }
      if (!activeDraftId) {
        setError('Salve o rascunho antes de enviar arquivos.');
        return;
      }
      setUploadingField(field);
      setError('');
      try {
        const fd = new FormData();
        fd.append('draftId', activeDraftId);
        fd.append('field', field);
        fd.append('file', file);
        const res = await fetch('/api/whitelabel/cadastromedico/upload', { method: 'POST', body: fd });
        const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
        if (!res.ok) throw new Error(data.error || 'Erro no upload.');
        updateField(urlKey, data.url || '');
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setUploadingField(null);
      }
    },
    [draftId, form, persistDraft, step, updateField]
  );

  const submitForm = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let activeDraftId = draftId;
      if (!activeDraftId) {
        activeDraftId = await persistDraft(step, form, null);
      }
      if (!activeDraftId) throw new Error('Não foi possível salvar o rascunho.');

      const res = await fetch('/api/whitelabel/cadastromedico/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: activeDraftId, form }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Erro ao concluir cadastro.');
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [draftId, form, persistDraft, step]);

  const handleNext = useCallback(async () => {
    const validationError = validateStepClient(form, step);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isReviewStep) {
      await submitForm();
      return;
    }

    setLoading(true);
    try {
      const nextStep = step + 1;
      await persistDraft(nextStep, form, draftId);
      setStep(nextStep);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [draftId, form, isReviewStep, persistDraft, step, submitForm]);

  const handleSaveAndExit = useCallback(async () => {
    setLoading(true);
    try {
      await persistDraft(step, form, draftId);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [draftId, form, persistDraft, step]);

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
      setError('');
    }
  }, [step]);

  if (loadingDraft) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">Cadastro concluído!</h1>
          <p className="text-slate-600">
            Recebemos suas informações. Nossa equipe iniciará a implantação da sua marca, site e
            sistema em breve.
          </p>
          <p className="text-sm text-slate-500">
            Você poderá enviar arquivos pendentes posteriormente pela plataforma.
          </p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <FieldGrid>
            <div>
              <FieldLabel>Tratamento</FieldLabel>
              <div className="grid grid-cols-2 gap-2.5">
                {['Dr.', 'Dra.'].map((opt) => (
                  <ChoiceButton
                    key={opt}
                    selected={form.tratamento === opt}
                    onClick={() => updateField('tratamento', opt)}
                  >
                    {opt}
                  </ChoiceButton>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Nome</FieldLabel>
              <input
                className={inputClassName}
                value={form.nome}
                onChange={(e) => updateField('nome', e.target.value)}
                placeholder="João"
              />
            </div>
            <div>
              <FieldLabel>Sobrenome</FieldLabel>
              <input
                className={inputClassName}
                value={form.sobrenome}
                onChange={(e) => updateField('sobrenome', e.target.value)}
                placeholder="Silva"
              />
            </div>
            <div>
              <FieldLabel>Nome da Marca</FieldLabel>
              <input
                className={inputClassName}
                value={form.nomeMarca}
                onChange={(e) => updateField('nomeMarca', e.target.value)}
                placeholder="Instituto João Silva"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Ex.: Instituto João Silva, Método João Silva, Clínica João Silva, Dr João Silva
              </p>
            </div>
            <div>
              <FieldLabel>Especialidade</FieldLabel>
              <input
                className={inputClassName}
                value={form.especialidade}
                onChange={(e) => updateField('especialidade', e.target.value)}
                placeholder="Endocrinologia"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Cidade</FieldLabel>
                <input
                  className={inputClassName}
                  value={form.cidade}
                  onChange={(e) => updateField('cidade', e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Estado</FieldLabel>
                <select
                  className={selectClassName}
                  value={form.estado}
                  onChange={(e) => updateField('estado', e.target.value)}
                >
                  {ESTADOS_BR_OPTIONS.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </FieldGrid>
        );
      case 1:
        return (
          <CadastroMedicoDomainStep
            form={form}
            updateField={updateField}
            nome={form.nome}
            sobrenome={form.sobrenome}
            nomeMarca={form.nomeMarca}
            onError={setError}
          />
        );
      case 2:
        return (
          <FieldGrid>
            <div>
              <FieldLabel>CEP</FieldLabel>
              <input
                className={inputClassName}
                value={form.cepEntrega}
                onChange={(e) => void handleCepChange('Entrega', e.target.value)}
                placeholder="00000-000"
                inputMode="numeric"
              />
            </div>
            <div>
              <FieldLabel>Rua</FieldLabel>
              <input className={inputClassName} value={form.ruaEntrega} onChange={(e) => updateField('ruaEntrega', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Número</FieldLabel>
                <input className={inputClassName} value={form.numeroEntrega} onChange={(e) => updateField('numeroEntrega', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Complemento</FieldLabel>
                <input className={inputClassName} value={form.complementoEntrega} onChange={(e) => updateField('complementoEntrega', e.target.value)} />
              </div>
            </div>
            <div>
              <FieldLabel>Bairro</FieldLabel>
              <input className={inputClassName} value={form.bairroEntrega} onChange={(e) => updateField('bairroEntrega', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Cidade</FieldLabel>
                <input className={inputClassName} value={form.cidadeEntrega} onChange={(e) => updateField('cidadeEntrega', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Estado</FieldLabel>
                <select className={selectClassName} value={form.estadoEntrega} onChange={(e) => updateField('estadoEntrega', e.target.value)}>
                  {ESTADOS_BR_OPTIONS.map((o) => (
                    <option key={o.value || 'empty-e'} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <FieldLabel>Ponto de referência</FieldLabel>
              <input className={inputClassName} value={form.pontoReferenciaEntrega} onChange={(e) => updateField('pontoReferenciaEntrega', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Nome de quem recebe</FieldLabel>
              <input className={inputClassName} value={form.nomeRecebedor} onChange={(e) => updateField('nomeRecebedor', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Telefone para entrega</FieldLabel>
              <input
                className={inputClassName}
                value={form.telefoneEntrega}
                onChange={(e) => updateField('telefoneEntrega', maskPhone(e.target.value))}
                inputMode="tel"
              />
            </div>
          </FieldGrid>
        );
      case 3:
        return (
          <FieldGrid>
            <div>
              <FieldLabel>Nome completo</FieldLabel>
              <input className={inputClassName} value={form.nomeCompletoContrato} onChange={(e) => updateField('nomeCompletoContrato', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>CPF</FieldLabel>
                <input className={inputClassName} value={form.cpf} onChange={(e) => updateField('cpf', maskCpf(e.target.value))} inputMode="numeric" />
              </div>
              <div>
                <FieldLabel>RG</FieldLabel>
                <input className={inputClassName} value={form.rg} onChange={(e) => updateField('rg', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Data de nascimento</FieldLabel>
                <input type="date" className={inputClassName} value={form.dataNascimento} onChange={(e) => updateField('dataNascimento', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Estado civil</FieldLabel>
                <select className={selectClassName} value={form.estadoCivil} onChange={(e) => updateField('estadoCivil', e.target.value)}>
                  <option value="">Selecione</option>
                  {ESTADO_CIVIL_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <FieldLabel>Nacionalidade</FieldLabel>
              <input className={inputClassName} value={form.nacionalidade} onChange={(e) => updateField('nacionalidade', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>CRM</FieldLabel>
                <input className={inputClassName} value={form.crm} onChange={(e) => updateField('crm', e.target.value)} />
              </div>
              <div>
                <FieldLabel>UF do CRM</FieldLabel>
                <select className={selectClassName} value={form.crmUf} onChange={(e) => updateField('crmUf', e.target.value)}>
                  {ESTADOS_BR_OPTIONS.map((o) => (
                    <option key={o.value || 'empty-crm'} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <FieldLabel>E-mail</FieldLabel>
              <input type="email" className={inputClassName} value={form.emailContrato} onChange={(e) => updateField('emailContrato', e.target.value)} />
            </div>
            <div>
              <FieldLabel>WhatsApp</FieldLabel>
              <input
                className={inputClassName}
                value={form.whatsappContrato}
                onChange={(e) => updateField('whatsappContrato', formatLeadWhiteLabelWhatsAppDisplay(e.target.value))}
                inputMode="tel"
              />
            </div>
            <div>
              <FieldLabel>Utilizar o mesmo endereço de entrega?</FieldLabel>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { value: 'sim', label: 'Sim' },
                  { value: 'nao', label: 'Não' },
                ].map((opt) => (
                  <ChoiceButton
                    key={opt.value}
                    selected={form.usarMesmoEnderecoEntrega === opt.value}
                    onClick={() => updateField('usarMesmoEnderecoEntrega', opt.value)}
                  >
                    {opt.label}
                  </ChoiceButton>
                ))}
              </div>
            </div>
            {form.usarMesmoEnderecoEntrega === 'nao' && (
              <>
                <div>
                  <FieldLabel>CEP</FieldLabel>
                  <input className={inputClassName} value={form.cepContrato} onChange={(e) => void handleCepChange('Contrato', e.target.value)} inputMode="numeric" />
                </div>
                <div>
                  <FieldLabel>Rua</FieldLabel>
                  <input className={inputClassName} value={form.ruaContrato} onChange={(e) => updateField('ruaContrato', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Número</FieldLabel>
                    <input className={inputClassName} value={form.numeroContrato} onChange={(e) => updateField('numeroContrato', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Complemento</FieldLabel>
                    <input className={inputClassName} value={form.complementoContrato} onChange={(e) => updateField('complementoContrato', e.target.value)} />
                  </div>
                </div>
                <div>
                  <FieldLabel>Bairro</FieldLabel>
                  <input className={inputClassName} value={form.bairroContrato} onChange={(e) => updateField('bairroContrato', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Cidade</FieldLabel>
                    <input className={inputClassName} value={form.cidadeContrato} onChange={(e) => updateField('cidadeContrato', e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Estado</FieldLabel>
                    <select className={selectClassName} value={form.estadoContrato} onChange={(e) => updateField('estadoContrato', e.target.value)}>
                      {ESTADOS_BR_OPTIONS.map((o) => (
                        <option key={o.value || 'empty-cc'} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </FieldGrid>
        );
      case 4:
        return (
          <FieldGrid>
            <div>
              <FieldLabel>Pessoa</FieldLabel>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { value: 'fisica', label: 'Física' },
                  { value: 'juridica', label: 'Jurídica' },
                ].map((opt) => (
                  <ChoiceButton
                    key={opt.value}
                    selected={form.tipoPessoa === opt.value}
                    onClick={() => updateField('tipoPessoa', opt.value)}
                  >
                    {opt.label}
                  </ChoiceButton>
                ))}
              </div>
            </div>
            {form.tipoPessoa === 'juridica' && (
              <>
                <div>
                  <FieldLabel>CNPJ</FieldLabel>
                  <input className={inputClassName} value={form.cnpj} onChange={(e) => updateField('cnpj', maskCnpj(e.target.value))} inputMode="numeric" />
                </div>
                <div>
                  <FieldLabel>Razão Social</FieldLabel>
                  <input className={inputClassName} value={form.razaoSocial} onChange={(e) => updateField('razaoSocial', e.target.value)} />
                </div>
                <div>
                  <FieldLabel>Nome Fantasia</FieldLabel>
                  <input className={inputClassName} value={form.nomeFantasia} onChange={(e) => updateField('nomeFantasia', e.target.value)} />
                </div>
                <div>
                  <FieldLabel>E-mail financeiro</FieldLabel>
                  <input type="email" className={inputClassName} value={form.emailFinanceiro} onChange={(e) => updateField('emailFinanceiro', e.target.value)} />
                </div>
              </>
            )}
            <div>
              <FieldLabel>Melhor dia para vencimento</FieldLabel>
              <select className={selectClassName} value={form.diaVencimento} onChange={(e) => updateField('diaVencimento', e.target.value)}>
                <option value="">Selecione</option>
                {DIA_VENCIMENTO_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </FieldGrid>
        );
      case 5:
        return (
          <FieldGrid>
            <StepHint>
              Você poderá enviar esses arquivos posteriormente pela plataforma. Nenhum upload é
              obrigatório.
            </StepHint>
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enviarDepois === 'true'}
                onChange={(e) => updateField('enviarDepois', e.target.checked ? 'true' : '')}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-700">Não tenho agora, enviar depois</span>
            </label>
            {UPLOAD_FIELDS.map(({ field, key, label }) => (
              <div key={field} className="rounded-xl border border-slate-200 bg-white p-4">
                <FieldLabel>{label}</FieldLabel>
                {form[key] ? (
                  <p className="text-sm text-emerald-700 mb-2">Arquivo anexado</p>
                ) : null}
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                  {uploadingField === field ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {form[key] ? 'Substituir arquivo' : 'Enviar arquivo'}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    disabled={form.enviarDepois === 'true' || uploadingField === field}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUpload(field, key, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            ))}
          </FieldGrid>
        );
      case 6:
        return (
          <div className="space-y-4">
            <CadastroMedicoReviewStep form={form} />
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.confirmoVeracidade === 'true'}
                  onChange={(e) => updateField('confirmoVeracidade', e.target.checked ? 'true' : '')}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700">
                  Confirmo que as informações fornecidas são verdadeiras.
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.autorizoUsoDados === 'true'}
                  onChange={(e) => updateField('autorizoUsoDados', e.target.checked ? 'true' : '')}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700">
                  Autorizo a utilização destes dados para criação do meu site, sistema e contrato.
                </span>
              </label>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3 md:max-w-2xl">
          <div className="flex items-center justify-between mb-2">
            <img src="/oftware1.jpg" alt="Oftware" className="h-8 w-auto object-contain" />
            <div className="flex items-center gap-2">
              {savedHint && (
                <span className="text-xs font-medium text-emerald-600">Salvo</span>
              )}
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
              <span className="text-xs font-medium text-slate-500">{stepLabel}</span>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 md:max-w-2xl">
        <div className="mb-6">
          {step === 0 && (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2">
                Implantação White Label
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Complete seu cadastro para iniciarmos a criação da sua marca, site, domínio, sistema
                e contrato. Você pode salvar e continuar depois.
              </p>
            </>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            {!isReviewStep && (
              <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-4 leading-snug">
                {CADASTRO_MEDICO_STEP_TITLES[step]}
              </label>
            )}
            {renderStep()}
            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="sticky bottom-0 pt-6 pb-4 mt-auto bg-gradient-to-t from-white via-white to-transparent space-y-2">
          <div className="flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm sm:text-base hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isReviewStep ? 'Concluindo...' : 'Salvando...'}
                </>
              ) : isReviewStep ? (
                'Concluir Cadastro'
              ) : (
                'Continuar'
              )}
            </button>
          </div>
          {!isReviewStep && (
            <button
              type="button"
              onClick={handleSaveAndExit}
              disabled={loading || saving}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-700 py-1 transition-colors disabled:opacity-50"
            >
              Salvar e continuar depois
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
