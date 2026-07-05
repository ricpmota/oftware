'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  Camera,
  CheckCircle,
  ChevronLeft,
  Copy,
  Hash,
  Loader2,
  MessageCircle,
  Pill,
  Target,
  User,
  UserCircle,
} from 'lucide-react';
import type { MarcoZero } from '@/types/obesidade';
import type { MedicoWhiteLabelResolved } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import { resolveMedicoWhiteLabel } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import PublicPageTopLogo from '@/components/public/PublicPageTopLogo';
import PublicPageBrandFooter from '@/components/public/PublicPageBrandFooter';
import WhiteLabelFaviconEffect from '@/components/public/WhiteLabelFaviconEffect';
import {
  fetchPublicPatientApi,
  formatPublicPatientFetchError,
} from '@/lib/public/fetchPublicPatientApi';
import { METODO_PACIENTE_META_URL, goToMetodoPacienteMeta } from '@/lib/tenant/metodoPublicOrigin';
import {
  MARCO_ZERO_INTRO,
  MARCO_ZERO_QUESTIONS,
  type MarcoZeroQuestion,
} from '@/lib/aplicacao/marcoZeroQuestions';
import AplicacaoFotosEvolucaoSection from '@/components/aplicacao/AplicacaoFotosEvolucaoSection';

const INTRO_STEP = 0;
const QUESTION_COUNT = MARCO_ZERO_QUESTIONS.length;
const TOTAL_STEPS = INTRO_STEP + QUESTION_COUNT + 1;

type DadosAplicacao = {
  semana: number;
  dose: number;
  data: string;
  nomePaciente: string;
  jaPreenchido?: boolean;
  peso?: number;
  circunferenciaAbdominal?: number | null;
  marcoZero?: MarcoZero;
  whiteLabel?: MedicoWhiteLabelResolved;
  medicoNome?: string;
  medicoGenero?: 'M' | 'F';
  medicoFotoPerfilUrl?: string | null;
  linkIndicacao?: string;
};

type FormState = Record<string, string>;

const INITIAL_FORM: FormState = Object.fromEntries(
  MARCO_ZERO_QUESTIONS.map((q) => [q.key, ''])
);

function formatarNomePaciente(nomeCompleto: string | undefined) {
  if (!nomeCompleto) return '';
  const partes = nomeCompleto.trim().split(/\s+/).filter((p) => p.length > 0);
  if (partes.length === 0) return '';
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

function parseDataChaveLocal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 0, 0, 0, 0);
}

function formatarDataPrevista(s: string) {
  const d = parseDataChaveLocal(s);
  if (!d) return s;
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatarDoseMg(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  const t = Number.isInteger(n)
    ? String(n)
    : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${t} mg`;
}

export default function AplicacaoMarcoZeroPageClient() {
  const params = useParams();
  const token = params?.token as string;

  const [step, setStep] = useState(INTRO_STEP);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosAplicacao | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [resultado, setResultado] = useState<{
    marcoZero: MarcoZero;
    dataInicio: string;
  } | null>(null);
  const [whiteLabel, setWhiteLabel] = useState<MedicoWhiteLabelResolved | null>(null);
  const [temFotosLocais, setTemFotosLocais] = useState(false);
  const [mostrarFotosPosSucesso, setMostrarFotosPosSucesso] = useState(false);
  const [linkIndicacao, setLinkIndicacao] = useState<string | null>(null);
  const [medicoNome, setMedicoNome] = useState<string | null>(null);
  const [medicoGenero, setMedicoGenero] = useState<'M' | 'F'>('M');
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [showModalIndicarMedico, setShowModalIndicarMedico] = useState(false);
  const [showModalEvolucao, setShowModalEvolucao] = useState(false);
  const [pendingAcaoEvolucao, setPendingAcaoEvolucao] = useState<'copiar' | 'whatsapp' | null>(null);
  const [evolucaoFromIndicar, setEvolucaoFromIndicar] = useState(false);
  const [evolucaoEscolhida, setEvolucaoEscolhida] = useState<boolean | null>(null);
  const fotosSectionRef = useRef<HTMLDivElement | null>(null);
  const indicarModalAgendadoRef = useRef(false);

  const isIntro = step === INTRO_STEP;
  const questionIndex = step - 1;
  const currentQuestion: MarcoZeroQuestion | null =
    questionIndex >= 0 && questionIndex < QUESTION_COUNT
      ? MARCO_ZERO_QUESTIONS[questionIndex]
      : null;
  const isLastStep = step === QUESTION_COUNT;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const updateField = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErro(null);
  }, []);

  const verificarFotos = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchPublicPatientApi(`/api/aplicacao/${encodeURIComponent(token)}/fotos`);
      const json = await res.json();
      if (res.ok && Array.isArray(json.fotos)) {
        setTemFotosLocais(json.fotos.length > 0);
      }
    } catch {
      // silencioso
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchPublicPatientApi(`/api/aplicacao/${encodeURIComponent(token)}/dados`)
      .then((res) => {
        if (!res.ok) throw new Error('Link inválido ou expirado');
        return res.json();
      })
      .then((data: DadosAplicacao) => {
        setDados(data);
        setErro(null);
        if (data.whiteLabel) setWhiteLabel(data.whiteLabel);
        if (data.medicoNome) setMedicoNome(data.medicoNome);
        if (data.medicoGenero === 'F' || data.medicoGenero === 'M') {
          setMedicoGenero(data.medicoGenero);
        }
        if (data.jaPreenchido && data.marcoZero) {
          if (data.linkIndicacao) setLinkIndicacao(data.linkIndicacao);
          setResultado({
            marcoZero: data.marcoZero,
            dataInicio: data.data,
          });
          setSucesso(true);
        }
      })
      .catch((err) => setErro(formatPublicPatientFetchError(err)))
      .finally(() => setLoading(false));
    void verificarFotos();
  }, [token, verificarFotos]);

  useEffect(() => {
    if (!sucesso || !linkIndicacao || indicarModalAgendadoRef.current) return;
    indicarModalAgendadoRef.current = true;
    const t = setTimeout(() => setShowModalIndicarMedico(true), 2500);
    return () => clearTimeout(t);
  }, [sucesso, linkIndicacao]);

  const executarAcaoLink = useCallback(
    (comEvolucao: boolean, acao: 'copiar' | 'whatsapp') => {
      if (!linkIndicacao) return;
      const path = comEvolucao
        ? `${linkIndicacao}${linkIndicacao.includes('?') ? '&' : '?'}evolucao=1`
        : linkIndicacao;
      const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
      const tituloMedico = medicoGenero === 'F' ? 'Dra.' : 'Dr.';
      const medicoLabel = medicoNome ? `${tituloMedico} ${medicoNome}` : 'médico';
      const msgComEvolucao = `Oi! Tudo bem?

Queria te indicar o método que usei para emagrecer. Fiz meu tratamento com ${medicoLabel} do *Método Emagrecer*, dentro do sistema da Oftware, e tive um resultado muito bom.

Nesse link você consegue ver também *meu histórico de evolução no tratamento*, como peso inicial e progresso ao longo do tempo:

${url}

Se você estiver pensando em cuidar do peso ou da saúde metabólica, vale a pena conhecer. Depois me conta o que achou 🙂`;
      const msgSemEvolucao = `Oi! Tudo bem?

Queria te indicar o *Método Emagrecer*, que foi o tratamento que usei para perder peso com acompanhamento médico pela plataforma da Oftware.

Nesse link você consegue entender como funciona o método e, se quiser, iniciar o processo com um médico:

${url}

Achei muito organizado e sério. Se tiver interesse, dá uma olhada 🙂`;
      const msg = comEvolucao ? msgComEvolucao : msgSemEvolucao;
      if (acao === 'copiar') {
        navigator.clipboard
          .writeText(url)
          .then(() => {
            setLinkCopiado(true);
            setTimeout(() => setLinkCopiado(false), 2500);
          })
          .catch(() => {});
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
      }
      setShowModalEvolucao(false);
      setPendingAcaoEvolucao(null);
      setEvolucaoFromIndicar(false);
      setEvolucaoEscolhida(null);
    },
    [linkIndicacao, medicoGenero, medicoNome]
  );

  const headerWhiteLabel: MedicoWhiteLabelResolved | null = whiteLabel
    ? whiteLabel
    : dados?.medicoNome
      ? resolveMedicoWhiteLabel({
          nome: dados.medicoNome,
          genero: dados.medicoGenero,
          fotoPerfilUrl: dados.medicoFotoPerfilUrl,
        })
      : null;

  const aplicacaoPage = headerWhiteLabel?.publicPages.aplicacao;
  const pageBg = aplicacaoPage?.backgroundColor ?? '#F8FAFC';

  const validateCurrentStep = useCallback((): boolean => {
    if (isIntro || currentQuestion?.type === 'marco_fotos') {
      setErro(null);
      return true;
    }
    if (!currentQuestion) return true;

    const value = (form[currentQuestion.key] || '').trim();

    if (currentQuestion.type === 'decimal') {
      if (currentQuestion.required && !value) {
        setErro('Este campo é obrigatório.');
        return false;
      }
      if (value) {
        const num = parseFloat(value.replace(',', '.'));
        if (isNaN(num) || num <= 0) {
          setErro('Informe um valor válido.');
          return false;
        }
      }
      setErro(null);
      return true;
    }

    if (currentQuestion.type === 'choice' || currentQuestion.type === 'shorttext') {
      if (currentQuestion.required && !value) {
        setErro(
          currentQuestion.type === 'choice' ? 'Selecione uma opção.' : 'Este campo é obrigatório.'
        );
        return false;
      }
      setErro(null);
      return true;
    }

    setErro(null);
    return true;
  }, [isIntro, currentQuestion, form]);

  const handleSubmit = useCallback(async () => {
    if (!token) return;
    const pesoNum = parseFloat((form.peso || '').replace(',', '.'));
    if (isNaN(pesoNum) || pesoNum <= 0) {
      setErro('Informe um peso válido.');
      return;
    }

    const circStr = (form.circunferenciaAbdominal || '').trim();
    const circNum = circStr ? parseFloat(circStr.replace(',', '.')) : undefined;

    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/aplicacao/${token}/atualizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peso: pesoNum,
          circunferenciaAbdominal: circNum != null && !isNaN(circNum) ? circNum : undefined,
          marcoZero: {
            motivacaoPrincipal: form.motivacaoPrincipal,
            satisfacaoAtual: form.satisfacaoAtual,
            objetivoPaciente: form.objetivoPaciente,
            confiancaNoObjetivo: form.confiancaNoObjetivo,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao registrar Marco Zero');

      const marco: MarcoZero = json.marcoZero ?? {
        pesoInicial: pesoNum,
        circunferenciaInicial: circNum,
        motivacaoPrincipal: form.motivacaoPrincipal,
        satisfacaoAtual: form.satisfacaoAtual,
        objetivoPaciente: form.objetivoPaciente,
        confiancaNoObjetivo: form.confiancaNoObjetivo,
        possuiFotosIniciais: temFotosLocais,
        createdAt: new Date(),
      };

      if (json.linkIndicacao) setLinkIndicacao(json.linkIndicacao);
      if (json.medicoNome) setMedicoNome(json.medicoNome);
      if (json.medicoGenero === 'F' || json.medicoGenero === 'M') {
        setMedicoGenero(json.medicoGenero);
      }

      setResultado({
        marcoZero: marco,
        dataInicio: dados?.data ?? new Date().toISOString(),
      });
      setSucesso(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setEnviando(false);
    }
  }, [token, form, dados?.data, temFotosLocais]);

  const handleNext = useCallback(async () => {
    if (!validateCurrentStep()) return;
    if (isLastStep) {
      await handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  }, [validateCurrentStep, isLastStep, handleSubmit]);

  const handleBack = useCallback(() => {
    if (step > INTRO_STEP) {
      setStep((s) => s - 1);
      setErro(null);
    }
  }, [step]);

  const stepLabel = useMemo(() => `${step + 1} de ${TOTAL_STEPS}`, [step]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (erro && !dados) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <p className="text-red-600">{erro}</p>
      </div>
    );
  }

  if (sucesso && resultado) {
    const mz = resultado.marcoZero;
    const dataFmt = formatarDataPrevista(resultado.dataInicio);
    const possuiFotos = mz.possuiFotosIniciais || temFotosLocais;

    return (
      <div
        className="min-h-dvh flex flex-col items-center px-4 pt-3 pb-10"
        style={{ backgroundColor: pageBg }}
      >
        <WhiteLabelFaviconEffect
          faviconUrl={headerWhiteLabel?.faviconUrl}
          cacheKey={headerWhiteLabel?.faviconUrl ?? undefined}
        />
        <div className="w-full max-w-lg mb-4">
          <PublicPageTopLogo
            theme={aplicacaoPage}
            brandName={headerWhiteLabel?.brandName}
            priority
          />
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full border border-slate-100">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-3">
              <Target className="w-8 h-8 text-amber-700" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-1">Marco Zero Registrado</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Parabéns por iniciar sua jornada. Hoje registramos seu ponto de partida. Nas próximas
              semanas você poderá acompanhar sua evolução através do peso, da circunferência
              abdominal, das fotos e dos seus hábitos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
              <p className="text-[10px] font-semibold uppercase text-violet-700">Peso inicial</p>
              <p className="text-lg font-bold text-violet-900">{mz.pesoInicial.toFixed(1)} kg</p>
            </div>
            {mz.circunferenciaInicial != null && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                <p className="text-[10px] font-semibold uppercase text-rose-700">Cintura inicial</p>
                <p className="text-lg font-bold text-rose-900">
                  {mz.circunferenciaInicial.toFixed(1)} cm
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 mb-3">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Seu objetivo</p>
            <p className="text-sm font-medium text-slate-900 mt-1">{mz.objetivoPaciente}</p>
          </div>

          <p className="text-xs text-slate-500 mb-4">Início do tratamento: {dataFmt}</p>

          {possuiFotos ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 mb-4">
              📸 Fotos iniciais registradas
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mb-4 space-y-2">
              <p className="text-sm text-amber-900">
                Você ainda pode registrar suas fotos iniciais para acompanhar melhor sua
                transformação.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMostrarFotosPosSucesso(true);
                  setTimeout(() => fotosSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-3 py-2"
              >
                <Camera className="h-4 w-4" />
                Registrar minhas fotos
              </button>
            </div>
          )}

          {(mostrarFotosPosSucesso || !possuiFotos) && (
            <div ref={fotosSectionRef} className="mb-4">
              <AplicacaoFotosEvolucaoSection
                token={token}
                defaultAberto={mostrarFotosPosSucesso || !possuiFotos}
              />
            </div>
          )}

          <div className="flex justify-center mb-5">
            <a
              href={METODO_PACIENTE_META_URL}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50"
            >
              <UserCircle className="h-[18px] w-[18px]" /> Minha página
            </a>
          </div>

          {linkIndicacao && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Indique seu médico</h3>
              <p className="text-xs text-slate-600 mb-3">
                Compartilhe este link para que outras pessoas possam solicitar tratamento com seu médico.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingAcaoEvolucao('copiar');
                    setEvolucaoFromIndicar(false);
                    setShowModalEvolucao(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium"
                >
                  <Copy size={18} /> {linkCopiado ? 'Copiado!' : 'Copiar link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingAcaoEvolucao('whatsapp');
                    setEvolucaoFromIndicar(false);
                    setShowModalEvolucao(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                >
                  <MessageCircle size={18} /> Enviar no WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>

        {showModalIndicarMedico && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3 text-center">
                Quer indicar seu médico?
              </h3>
              <p className="text-sm text-slate-600 mb-4 text-center">
                Compartilhe o link para que outras pessoas possam solicitar tratamento com quem está
                te acompanhando.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalIndicarMedico(false);
                    setShowModalEvolucao(true);
                    setEvolucaoFromIndicar(true);
                    setEvolucaoEscolhida(null);
                  }}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModalIndicarMedico(false);
                    goToMetodoPacienteMeta();
                  }}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium"
                >
                  Não
                </button>
              </div>
            </div>
          </div>
        )}

        {showModalEvolucao && (pendingAcaoEvolucao || evolucaoFromIndicar) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              {evolucaoFromIndicar && evolucaoEscolhida !== null ? (
                <>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Como deseja compartilhar?</h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => executarAcaoLink(evolucaoEscolhida, 'copiar')}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium"
                    >
                      <Copy size={18} /> {linkCopiado ? 'Copiado!' : 'Copiar link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => executarAcaoLink(evolucaoEscolhida, 'whatsapp')}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                    >
                      <MessageCircle size={18} /> Enviar no WhatsApp
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Compartilhar evolução</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Quer mostrar sua evolução no tratamento para quem você está indicando? Assim a
                    pessoa consegue ver, com números e gráficos, os resultados reais que você está
                    alcançando.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (evolucaoFromIndicar) {
                          setEvolucaoEscolhida(true);
                        } else {
                          executarAcaoLink(true, pendingAcaoEvolucao!);
                        }
                      }}
                      className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
                    >
                      Sim, quero compartilhar minha evolução
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (evolucaoFromIndicar) {
                          setEvolucaoEscolhida(false);
                        } else {
                          executarAcaoLink(false, pendingAcaoEvolucao!);
                        }
                      }}
                      className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium"
                    >
                      Não, prefiro não compartilhar agora
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col"
      style={{ color: aplicacaoPage?.textColor }}
    >
      <WhiteLabelFaviconEffect
        faviconUrl={headerWhiteLabel?.faviconUrl}
        cacheKey={headerWhiteLabel?.faviconUrl ?? undefined}
      />

      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <PublicPageTopLogo
              theme={aplicacaoPage}
              brandName={headerWhiteLabel?.brandName}
              className="!pt-0 !pb-0"
            />
            <span className="text-xs font-medium text-slate-500">{stepLabel}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            {isIntro ? (
              <>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2">
                  {MARCO_ZERO_INTRO.titulo}
                </h1>
                <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                  {MARCO_ZERO_INTRO.subtitulo}
                </p>
                <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm space-y-3">
                  {dados?.nomePaciente && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-amber-800">Paciente</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatarNomePaciente(dados.nomePaciente)}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 border p-3">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Hash className="h-4 w-4" />
                        <span className="text-[10px] font-semibold uppercase">Semana</span>
                      </div>
                      <p className="text-xl font-bold">1</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border p-3">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Pill className="h-4 w-4" />
                        <span className="text-[10px] font-semibold uppercase">Dose</span>
                      </div>
                      <p className="text-base font-bold">{formatarDoseMg(dados?.dose)}</p>
                    </div>
                  </div>
                  {dados?.data && (
                    <div className="rounded-xl bg-slate-50 border p-3 flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-amber-700" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-slate-500">Data</p>
                        <p className="text-sm font-semibold">{formatarDataPrevista(dados.data)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : currentQuestion?.type === 'marco_fotos' ? (
              <div className="space-y-4">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                  Registro fotográfico
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Essas fotos são privadas e servem apenas para acompanhar sua evolução. Muitos
                  pacientes só percebem a magnitude da transformação quando comparam as fotos do
                  início com as de algumas semanas depois.
                </p>
                <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-3 space-y-2 text-sm text-amber-950">
                  <p>📸 Tire sua foto frontal</p>
                  <p>📸 Tire sua foto de perfil</p>
                  <p className="text-xs text-amber-800 pt-1">
                    Daqui a algumas semanas você ficará feliz por ter registrado este momento.
                  </p>
                </div>
                {!temFotosLocais && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                    Recomendamos fortemente que você registre suas fotos iniciais. Elas serão uma
                    das formas mais poderosas de visualizar sua evolução.
                  </div>
                )}
                <AplicacaoFotosEvolucaoSection
                  token={token}
                  defaultAberto
                />
              </div>
            ) : currentQuestion ? (
              <>
                <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-4 leading-snug">
                  {currentQuestion.label}
                  {currentQuestion.unit ? (
                    <span className="block text-sm font-medium text-slate-500 mt-1">
                      ({currentQuestion.unit})
                    </span>
                  ) : null}
                </label>

                {currentQuestion.type === 'choice' && currentQuestion.options ? (
                  <div className="space-y-2.5">
                    {currentQuestion.options.map((option) => {
                      const selected = form[currentQuestion.key] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateField(currentQuestion.key, option)}
                          className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm sm:text-base transition-all ${
                            selected
                              ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm ring-1 ring-amber-500/30'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : currentQuestion.type === 'shorttext' ? (
                  <input
                    type="text"
                    value={form[currentQuestion.key] || ''}
                    onChange={(e) => updateField(currentQuestion.key, e.target.value)}
                    placeholder={currentQuestion.placeholder}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form[currentQuestion.key] || ''}
                    onChange={(e) => updateField(currentQuestion.key, e.target.value)}
                    placeholder={currentQuestion.placeholder}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-base focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                )}
              </>
            ) : null}

            {erro && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {erro}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="sticky bottom-0 pt-6 pb-4 mt-auto">
          <div className="flex gap-3">
            {step > INTRO_STEP && (
              <button
                type="button"
                onClick={handleBack}
                disabled={enviando}
                className="flex items-center gap-1 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (currentQuestion?.type === 'marco_fotos') {
                  void verificarFotos();
                }
                void handleNext();
              }}
              disabled={enviando}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-amber-500 to-orange-600 shadow-md disabled:opacity-70"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
                </>
              ) : isIntro ? (
                'Iniciar Marco Zero'
              ) : isLastStep ? (
                'Concluir Marco Zero'
              ) : (
                'Continuar'
              )}
            </button>
          </div>
        </div>
      </div>

      <PublicPageBrandFooter
        theme={aplicacaoPage}
        brandName={headerWhiteLabel?.brandName}
        showPoweredBy={headerWhiteLabel?.showPoweredByOftware !== false}
        className="px-4 pb-6"
      />
    </div>
  );
}
