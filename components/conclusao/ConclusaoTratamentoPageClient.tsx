'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  Star,
  Stethoscope,
  User,
  UserCircle,
} from 'lucide-react';
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
import { CONCLUSAO_QUESTIONS, type ConclusaoQuestion } from '@/lib/conclusao/conclusaoQuestions';
import { formatarVariacaoMedida, toneVariacaoMedida } from '@/lib/aplicacao/formatarVariacaoMedida';

const INTRO_STEP = 0;

type FlowStep =
  | { kind: 'question'; question: ConclusaoQuestion }
  | { kind: 'stars' }
  | { kind: 'review' };

type DadosConclusao = {
  nomePaciente: string;
  data: string;
  medicoNome: string;
  medicoGenero?: 'M' | 'F';
  linkIndicacao?: string;
  jaPreenchido: boolean;
  jaClassificouMedico: boolean;
  pesoFinalKg?: number | null;
  circunferenciaAbdominalFinalCm?: number | null;
  depoimento?: string | null;
  percepcaoResultadoFinal?: string | null;
  principalConquista?: string | null;
  estrelasMedico?: number | null;
  pesoPerdidoAcumulado?: number | null;
  circunferenciaAbdominalReduzidaCm?: number | null;
  linkRelatorio?: string | null;
  whiteLabel?: MedicoWhiteLabelResolved;
};

type FormState = Record<string, string>;

const INITIAL_FORM: FormState = Object.fromEntries(CONCLUSAO_QUESTIONS.map((q) => [q.key, '']));

function toneDeltaClasses(tone: ReturnType<typeof toneVariacaoMedida>): string {
  if (tone === 'positivo') return 'text-emerald-600 dark:text-emerald-400';
  if (tone === 'atencao') return 'text-amber-600 dark:text-amber-400';
  return 'text-gray-700 dark:text-gray-300';
}

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

function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const confettiColors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#ff6b9d', '#c44569', '#f8b500', '#00d2d3', '#ffa500', '#ff1493', '#32cd32', '#9370db'];
  const confettiCount = 50;
  const explosionCenters = [{ x: '50%', y: '50%' }, { x: '40%', y: '45%' }, { x: '60%', y: '45%' }];
  return (
    <div className="fixed inset-0 pointer-events-none z-[50]" style={{ overflow: 'hidden' }}>
      {Array.from({ length: confettiCount }).map((_, i) => {
        const center = explosionCenters[i % explosionCenters.length];
        const angle = Math.random() * 360;
        const explosionDistance = 30 + Math.random() * 60;
        const fallDistance = 250 + Math.random() * 200;
        const delay = Math.random() * 0.5;
        const duration = 3.5;
        const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        const rotation = Math.random() * 360;
        const animationName = `confetti-conclusao-${i}`;
        const startX = Math.cos((angle * Math.PI) / 180) * explosionDistance;
        const startY = Math.sin((angle * Math.PI) / 180) * explosionDistance;
        const fallX = (Math.random() - 0.5) * 40;
        const fallY = fallDistance;
        return (
          <div key={`confetti-${i}`}>
            <div
              className="absolute"
              style={{
                left: center.x,
                top: center.y,
                width: '8px',
                height: '8px',
                backgroundColor: color,
                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
                opacity: 0,
                animation: `${animationName} ${duration}s ease-out ${delay}s forwards`,
                transform: 'translate(-50%, -50%)',
              }}
            />
            <style>{`@keyframes ${animationName} {
              0% { transform: translate(-50%, -50%) translate(0, 0) rotate(${rotation}deg) scale(0); opacity: 0; }
              10% { transform: translate(-50%, -50%) translate(${startX}px, ${startY}px) rotate(${rotation}deg) scale(1); opacity: 1; }
              30% { transform: translate(-50%, -50%) translate(${startX + fallX * 0.3}px, ${startY - 50}px) rotate(${rotation + 180}deg) scale(1); opacity: 1; }
              100% { transform: translate(-50%, -50%) translate(${startX + fallX}px, ${startY + fallY}px) rotate(${rotation + 720}deg) scale(0.5); opacity: 0; }
            }`}</style>
          </div>
        );
      })}
    </div>
  );
}

function Fireworks({ active }: { active: boolean }) {
  if (!active) return null;
  const fireworkPositions = [
    { x: '30%', y: '25%' }, { x: '70%', y: '20%' }, { x: '25%', y: '40%' },
    { x: '75%', y: '35%' }, { x: '50%', y: '50%' }, { x: '20%', y: '60%' },
    { x: '80%', y: '55%' }, { x: '35%', y: '70%' },
  ];
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#ff6b9d', '#c44569', '#f8b500', '#00d2d3', '#ffa500', '#ff1493'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[49]" style={{ overflow: 'hidden' }}>
      {fireworkPositions.map((position, fireworkIndex) => {
        const delay = fireworkIndex * 0.2;
        const duration = 0.8;
        const particles = Array.from({ length: 15 }, (_, i) => {
          const angle = (i * 360) / 15;
          const distance = 40 + Math.random() * 50;
          const color = colors[Math.floor(Math.random() * colors.length)];
          const x = Math.cos((angle * Math.PI) / 180) * distance;
          const y = Math.sin((angle * Math.PI) / 180) * distance;
          return { x, y, color, key: `fw-${fireworkIndex}-${i}` };
        });
        return (
          <div key={`fw-${fireworkIndex}`}>
            {particles.map((p) => {
              const animName = `firework-conclusao-${p.key}`;
              return (
                <div key={p.key}>
                  <div
                    className="absolute"
                    style={{
                      left: position.x,
                      top: position.y,
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: p.color,
                      boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}`,
                      opacity: 0,
                      animation: `${animName} ${duration}s ease-out ${delay}s forwards`,
                    }}
                  />
                  <style>{`@keyframes ${animName} {
                    0% { transform: translate(-50%, -50%) translate(0, 0) scale(0); opacity: 0; }
                    5% { transform: translate(-50%, -50%) translate(0, 0) scale(1.2); opacity: 1; }
                    100% { transform: translate(-50%, -50%) translate(${p.x}px, ${p.y}px) scale(0); opacity: 0; }
                  }`}</style>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function ConclusaoTratamentoPageClient() {
  const params = useParams();
  const token = params?.token as string;

  const [step, setStep] = useState(INTRO_STEP);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosConclusao | null>(null);
  const [estrelasMedico, setEstrelasMedico] = useState(0);
  const [hoverEstrelas, setHoverEstrelas] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [resultadoSucesso, setResultadoSucesso] = useState({
    pesoPerdidoAcumulado: null as number | null,
    circunferenciaAbdominalReduzidaCm: null as number | null,
    linkRelatorio: null as string | null,
    depoimento: null as string | null,
    percepcaoResultadoFinal: null as string | null,
    principalConquista: null as string | null,
    estrelasMedico: null as number | null,
  });
  const [showFireworks, setShowFireworks] = useState(false);
  const [linkIndicacao, setLinkIndicacao] = useState<string | null>(null);
  const [medicoNomeState, setMedicoNomeState] = useState<string | null>(null);
  const [medicoGenero, setMedicoGenero] = useState<'M' | 'F'>('M');
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [showModalIndicarMedico, setShowModalIndicarMedico] = useState(false);
  const [showModalEvolucao, setShowModalEvolucao] = useState(false);
  const [pendingAcaoEvolucao, setPendingAcaoEvolucao] = useState<'copiar' | 'whatsapp' | null>(null);
  const [evolucaoFromIndicar, setEvolucaoFromIndicar] = useState(false);
  const [evolucaoEscolhida, setEvolucaoEscolhida] = useState<boolean | null>(null);
  const [whiteLabel, setWhiteLabel] = useState<MedicoWhiteLabelResolved | null>(null);

  const flowSteps = useMemo((): FlowStep[] => {
    const steps: FlowStep[] = CONCLUSAO_QUESTIONS.map((question) => ({ kind: 'question', question }));
    if (!dados?.jaClassificouMedico) steps.push({ kind: 'stars' });
    steps.push({ kind: 'review' });
    return steps;
  }, [dados?.jaClassificouMedico]);

  const TOTAL_STEPS = 1 + flowSteps.length;
  const isIntro = step === INTRO_STEP;
  const contentIndex = step - 1;
  const currentFlowStep = contentIndex >= 0 && contentIndex < flowSteps.length ? flowSteps[contentIndex] : null;
  const isLastStep = step === TOTAL_STEPS - 1;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const stepLabel = `${step + 1} de ${TOTAL_STEPS}`;

  const campoBloqueado = useCallback(
    (key: string) => {
      if (!dados?.jaPreenchido) return false;
      return key === 'pesoFinal' || key === 'circunferenciaAbdominal';
    },
    [dados?.jaPreenchido]
  );

  const updateField = useCallback((key: string, value: string) => {
    if (campoBloqueado(key)) return;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErro(null);
  }, [campoBloqueado]);

  const executarAcaoLink = useCallback(
    (comEvolucao: boolean, acao: 'copiar' | 'whatsapp') => {
      const link = linkIndicacao ?? dados?.linkIndicacao;
      if (!link) return;
      const path = comEvolucao ? `${link}${link.includes('?') ? '&' : '?'}evolucao=1` : link;
      const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
      const tituloMedico = medicoGenero === 'F' ? 'Dra.' : 'Dr.';
      const medicoLabel = medicoNomeState ? `${tituloMedico} ${medicoNomeState}` : 'médico';
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
        navigator.clipboard.writeText(url).then(() => {
          setLinkCopiado(true);
          setTimeout(() => setLinkCopiado(false), 2500);
        }).catch(() => {});
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
      }
      setShowModalEvolucao(false);
      setPendingAcaoEvolucao(null);
      setEvolucaoFromIndicar(false);
      setEvolucaoEscolhida(null);
    },
    [linkIndicacao, dados?.linkIndicacao, medicoGenero, medicoNomeState]
  );

  useEffect(() => {
    if (showFireworks) {
      const t = setTimeout(() => {
        setShowFireworks(false);
        if (linkIndicacao ?? dados?.linkIndicacao) setShowModalIndicarMedico(true);
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [showFireworks, linkIndicacao, dados?.linkIndicacao]);

  useEffect(() => {
    if (!token) return;
    fetchPublicPatientApi(`/api/conclusao/${encodeURIComponent(token)}/dados`)
      .then((res) => {
        if (!res.ok) throw new Error('Link inválido ou expirado');
        return res.json();
      })
      .then((data: DadosConclusao) => {
        setDados(data);
        setErro(null);
        if (data.medicoNome) setMedicoNomeState(data.medicoNome);
        if (data.medicoGenero === 'F' || data.medicoGenero === 'M') setMedicoGenero(data.medicoGenero);
        if (data.linkIndicacao) setLinkIndicacao(data.linkIndicacao);
        if (data.whiteLabel) setWhiteLabel(data.whiteLabel);

        const nextForm = { ...INITIAL_FORM };
        if (data.pesoFinalKg != null) nextForm.pesoFinal = String(data.pesoFinalKg);
        if (data.circunferenciaAbdominalFinalCm != null) nextForm.circunferenciaAbdominal = String(data.circunferenciaAbdominalFinalCm);
        if (data.depoimento) nextForm.depoimento = String(data.depoimento);
        if (data.percepcaoResultadoFinal) nextForm.percepcaoResultadoFinal = data.percepcaoResultadoFinal;
        if (data.principalConquista) nextForm.principalConquista = data.principalConquista;
        setForm(nextForm);
        if (data.estrelasMedico) setEstrelasMedico(data.estrelasMedico);

        if (data.jaPreenchido && data.depoimento != null && String(data.depoimento).trim() !== '') {
          setResultadoSucesso({
            pesoPerdidoAcumulado: data.pesoPerdidoAcumulado ?? null,
            circunferenciaAbdominalReduzidaCm: data.circunferenciaAbdominalReduzidaCm ?? null,
            linkRelatorio: data.linkRelatorio ?? null,
            depoimento: data.depoimento ?? null,
            percepcaoResultadoFinal: data.percepcaoResultadoFinal ?? null,
            principalConquista: data.principalConquista ?? null,
            estrelasMedico: data.estrelasMedico ?? null,
          });
          setSucesso(true);
          setShowFireworks(true);
        }
      })
      .catch((err) => setErro(formatPublicPatientFetchError(err)))
      .finally(() => setLoading(false));
  }, [token]);

  const validateCurrentStep = useCallback((): boolean => {
    if (isIntro) return true;
    if (!currentFlowStep) return true;

    if (currentFlowStep.kind === 'stars' || currentFlowStep.kind === 'review') {
      setErro(null);
      return true;
    }

    const q = currentFlowStep.question;
    const value = (form[q.key] || '').trim();

    if (q.type === 'decimal') {
      if (q.required && !value && !campoBloqueado(q.key)) {
        setErro('Este campo é obrigatório.');
        return false;
      }
      if (value && !campoBloqueado(q.key)) {
        const num = parseFloat(value.replace(',', '.'));
        if (isNaN(num) || num <= 0) {
          setErro('Informe um valor válido maior que zero.');
          return false;
        }
      }
      if (q.required && campoBloqueado(q.key) && !value) {
        setErro('Peso final não registrado. Entre em contato com seu médico.');
        return false;
      }
      setErro(null);
      return true;
    }

    if (q.type === 'choice') {
      if (q.required && !value) {
        setErro('Selecione uma opção.');
        return false;
      }
      setErro(null);
      return true;
    }

    if (q.type === 'textarea' && value.length > 3000) {
      setErro('O depoimento deve ter no máximo 3000 caracteres.');
      return false;
    }

    setErro(null);
    return true;
  }, [isIntro, currentFlowStep, form, campoBloqueado]);

  const handleSubmit = useCallback(async () => {
    if (!token) return;
    const pesoNum = parseFloat((form.pesoFinal || '').replace(',', '.'));
    if (isNaN(pesoNum) || pesoNum <= 0) {
      setErro('Informe um peso final válido.');
      return;
    }

    const circStr = (form.circunferenciaAbdominal || '').trim();
    const circNum = circStr ? parseFloat(circStr.replace(',', '.')) : undefined;

    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/conclusao/${token}/atualizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pesoFinalKg: pesoNum,
          circunferenciaAbdominalFinalCm: circNum != null && !isNaN(circNum) ? circNum : undefined,
          depoimento: form.depoimento.trim() || undefined,
          estrelasMedico: estrelasMedico >= 1 && estrelasMedico <= 5 ? estrelasMedico : undefined,
          percepcaoResultadoFinal: form.percepcaoResultadoFinal.trim() || undefined,
          principalConquista: form.principalConquista.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar');
      setResultadoSucesso({
        pesoPerdidoAcumulado: json.pesoPerdidoAcumulado ?? null,
        circunferenciaAbdominalReduzidaCm: json.circunferenciaAbdominalReduzidaCm ?? null,
        linkRelatorio: json.linkRelatorio ?? null,
        depoimento: json.depoimento ?? null,
        percepcaoResultadoFinal: json.percepcaoResultadoFinal ?? (form.percepcaoResultadoFinal.trim() || null),
        principalConquista: json.principalConquista ?? (form.principalConquista.trim() || null),
        estrelasMedico: json.estrelasMedico ?? (estrelasMedico >= 1 ? estrelasMedico : null),
      });
      if (json.linkIndicacao) setLinkIndicacao(json.linkIndicacao);
      if (json.medicoNome) setMedicoNomeState(json.medicoNome);
      if (json.medicoGenero === 'F' || json.medicoGenero === 'M') setMedicoGenero(json.medicoGenero);
      setSucesso(true);
      setShowFireworks(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setEnviando(false);
    }
  }, [token, form, estrelasMedico]);

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

  const tituloMedicoHeader = medicoGenero === 'F' ? 'Dra.' : 'Dr.';
  const headerWhiteLabel: MedicoWhiteLabelResolved | null = whiteLabel
    ? whiteLabel
    : medicoNomeState
      ? resolveMedicoWhiteLabel({ nome: medicoNomeState, genero: medicoGenero })
      : null;

  const conclusaoPage = headerWhiteLabel?.publicPages.conclusao;
  const pageBg = conclusaoPage?.backgroundColor ?? '#F9FAFB';
  const pageText = conclusaoPage?.textColor ?? '#374151';

  const FooterConclusao = () => (
    <PublicPageBrandFooter
      theme={conclusaoPage}
      brandName={headerWhiteLabel?.brandName}
      showPoweredBy={headerWhiteLabel?.showPoweredByOftware !== false}
      className="mt-6"
    />
  );

  const renderReviewItem = (label: string, value?: string | null) => {
    if (!value?.trim()) return null;
    return (
      <div className="rounded-xl bg-white/80 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 whitespace-pre-wrap">{value}</p>
      </div>
    );
  };

  const linkParaIndicacao = linkIndicacao ?? dados?.linkIndicacao ?? null;

  const modaisIndicarMedico = (
    <>
      {showModalIndicarMedico && linkParaIndicacao && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 text-center">
              Quer indicar seu médico?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
              Compartilhe o link para que outras pessoas possam solicitar tratamento com quem está te acompanhando.
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
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium"
              >
                Não
              </button>
            </div>
          </div>
        </div>
      )}

      {showModalEvolucao && linkParaIndicacao && (pendingAcaoEvolucao || evolucaoFromIndicar) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            {evolucaoFromIndicar && evolucaoEscolhida !== null ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Como deseja compartilhar?</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => executarAcaoLink(evolucaoEscolhida, 'copiar')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium"
                  >
                    <Copy size={18} />
                    {linkCopiado ? 'Copiado!' : 'Copiar link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => executarAcaoLink(evolucaoEscolhida, 'whatsapp')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                  >
                    <MessageCircle size={18} />
                    Enviar no WhatsApp
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Compartilhar evolução</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Quer mostrar sua evolução no tratamento para quem você está indicando? Assim a pessoa consegue ver, com números e gráficos, os resultados reais que você está alcançando.
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
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium"
                  >
                    Não, prefiro não compartilhar agora
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (erro && !dados) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{erro}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Verifique se o link está correto ou entre em contato com seu médico.
          </p>
        </div>
      </div>
    );
  }

  if (sucesso) {
    const {
      pesoPerdidoAcumulado,
      circunferenciaAbdominalReduzidaCm,
      linkRelatorio,
      depoimento: depoimentoSucesso,
      percepcaoResultadoFinal,
      principalConquista,
      estrelasMedico: estrelasSucesso,
    } = resultadoSucesso;

    const temPeso = pesoPerdidoAcumulado != null;
    const temCirc = circunferenciaAbdominalReduzidaCm != null;
    const pesoPerdidoFmt = formatarVariacaoMedida(pesoPerdidoAcumulado, 'kg');
    const reducaoAbdominalFmt = formatarVariacaoMedida(circunferenciaAbdominalReduzidaCm, 'cm');

    return (
      <div
        className="min-h-dvh flex flex-col items-center px-4 pt-3 pb-10 relative overflow-hidden"
        style={{ backgroundColor: pageBg, color: pageText }}
      >
        <WhiteLabelFaviconEffect faviconUrl={headerWhiteLabel?.faviconUrl} cacheKey={headerWhiteLabel?.faviconUrl ?? undefined} />
        <Confetti active={showFireworks} />
        <Fireworks active={showFireworks} />
        {modaisIndicarMedico}
        <div className="w-full max-w-md relative z-10 shrink-0 mb-4">
          <PublicPageTopLogo theme={conclusaoPage} brandName={headerWhiteLabel?.brandName} priority />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 sm:p-6 max-w-md w-full border border-gray-100 dark:border-gray-700 relative z-10">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 mb-3">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">
              Conclusão registrada com sucesso
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Parabéns por concluir esta etapa da sua jornada. Seu médico receberá essas informações e poderá acompanhar seu resultado final.
            </p>
          </div>

          <div className={`grid gap-2 sm:gap-3 mb-4 ${temPeso && temCirc ? 'grid-cols-2' : 'grid-cols-1 max-w-[220px] mx-auto'}`}>
            {temPeso && pesoPerdidoFmt && (
              <div className="rounded-xl border border-gray-100/90 dark:border-gray-600/60 bg-gradient-to-b from-gray-50/90 to-white dark:from-gray-700/40 dark:to-gray-800/30 p-3 sm:p-3.5 text-center shadow-sm">
                <p className="text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Peso perdido (acum.)</p>
                <p className={`text-lg sm:text-xl font-bold tabular-nums ${toneDeltaClasses(toneVariacaoMedida(pesoPerdidoAcumulado))}`}>
                  {pesoPerdidoFmt.replace('.', ',')}
                </p>
              </div>
            )}
            {temCirc && reducaoAbdominalFmt && (
              <div className="rounded-xl border border-gray-100/90 dark:border-gray-600/60 bg-gradient-to-b from-gray-50/90 to-white dark:from-gray-700/40 dark:to-gray-800/30 p-3 sm:p-3.5 text-center shadow-sm">
                <p className="text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Redução abdominal</p>
                <p className={`text-lg sm:text-xl font-bold tabular-nums ${toneDeltaClasses(toneVariacaoMedida(circunferenciaAbdominalReduzidaCm))}`}>
                  {reducaoAbdominalFmt.replace('.', ',')}
                </p>
              </div>
            )}
          </div>

          {(principalConquista || percepcaoResultadoFinal) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {principalConquista && (
                <div className="rounded-xl border border-violet-100 dark:border-violet-800/50 bg-violet-50/80 dark:bg-violet-950/30 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase text-violet-700 dark:text-violet-300 mb-1">Principal conquista</p>
                  <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">{principalConquista}</p>
                </div>
              )}
              {percepcaoResultadoFinal && (
                <div className="rounded-xl border border-sky-100 dark:border-sky-800/50 bg-sky-50/80 dark:bg-sky-950/30 p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase text-sky-700 dark:text-sky-300 mb-1">Percepção do resultado</p>
                  <p className="text-sm font-semibold text-sky-900 dark:text-sky-100">{percepcaoResultadoFinal}</p>
                </div>
              )}
            </div>
          )}

          {depoimentoSucesso?.trim() && (
            <div className="rounded-xl border border-gray-100/90 dark:border-gray-600/60 bg-gradient-to-b from-gray-50/90 to-white dark:from-gray-700/40 dark:to-gray-800/30 p-3 sm:p-3.5 mb-4 shadow-sm">
              <p className="text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Seu depoimento</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{depoimentoSucesso}</p>
            </div>
          )}

          {estrelasSucesso != null && estrelasSucesso >= 1 && (
            <div className="flex justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={22} className={s <= estrelasSucesso ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
              ))}
            </div>
          )}

          <div className="flex justify-center mb-5">
            <a
              href={METODO_PACIENTE_META_URL}
              className="group inline-flex items-center gap-2 rounded-full border border-emerald-200/90 bg-white/95 px-3.5 py-2 text-[13px] font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50/95 dark:border-emerald-800/60 dark:bg-gray-800/95 dark:text-emerald-300"
            >
              <UserCircle className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" aria-hidden />
              Minha página
            </a>
          </div>

          {linkRelatorio && (
            <div className="mb-4">
              <a
                href={linkRelatorio}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors"
              >
                <ExternalLink size={18} />
                Abrir seu relatório final
              </a>
            </div>
          )}

          {linkParaIndicacao && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 p-4 mt-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Indique seu médico</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
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
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <Copy size={18} />
                  {linkCopiado ? 'Copiado!' : 'Copiar link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingAcaoEvolucao('whatsapp');
                    setEvolucaoFromIndicar(false);
                    setShowModalEvolucao(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <MessageCircle size={18} />
                  Enviar no WhatsApp
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-800/50 p-4 mt-4">
            <p className="text-sm text-emerald-900 dark:text-emerald-200 text-center leading-relaxed">
              Seu médico receberá essas informações. Desejamos sucesso na sua nova fase!
            </p>
          </div>
        </div>
        <FooterConclusao />
      </div>
    );
  }

  const nextButtonLabel = isIntro
    ? 'Começar conclusão'
    : isLastStep
      ? enviando
        ? 'Enviando...'
        : 'Enviar conclusão'
      : 'Continuar';

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: pageBg, color: pageText }}>
      <WhiteLabelFaviconEffect faviconUrl={headerWhiteLabel?.faviconUrl} cacheKey={headerWhiteLabel?.faviconUrl ?? undefined} />

      <div className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-700/80">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <PublicPageTopLogo theme={conclusaoPage} brandName={headerWhiteLabel?.brandName} className="!pt-0 !pb-0" />
            {!isIntro && <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{stepLabel}</span>}
          </div>
          {!isIntro && (
            <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 pb-28">
        {dados?.jaPreenchido && !isIntro && (
          <div className="mb-4 rounded-xl border border-amber-200/90 dark:border-amber-800/50 bg-amber-50/90 dark:bg-amber-950/25 p-3">
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              Peso e circunferência já registrados. Complete as demais informações se ainda não preencheu.
            </p>
          </div>
        )}

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
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-2">
                  Conclusão do Tratamento
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5 leading-relaxed">
                  Vamos registrar o resultado final da sua jornada. Isso ajuda sua equipe médica a acompanhar sua evolução e também permite que você visualize tudo que conquistou.
                </p>
                <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-white dark:bg-gray-800 p-4 shadow-sm space-y-4">
                  {medicoNomeState && (
                    <div className="flex gap-3 items-center">
                      {headerWhiteLabel?.profilePhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={headerWhiteLabel.profilePhotoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover border border-emerald-200/90" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700">
                          <Stethoscope className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Médico(a)</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{headerWhiteLabel?.brandName || `${tituloMedicoHeader} ${medicoNomeState}`}</p>
                      </div>
                    </div>
                  )}
                  {dados?.nomePaciente && (
                    <div className="flex gap-3 items-center pt-1 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-800">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Paciente</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatarNomePaciente(dados.nomePaciente)}</p>
                      </div>
                    </div>
                  )}
                  {dados?.data && (
                    <div className="flex gap-3 items-center rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 p-3">
                      <Calendar className="h-5 w-5 text-sky-700 shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-gray-500">Data da conclusão</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatarDataPrevista(dados.data)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : currentFlowStep?.kind === 'review' ? (
              <>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Revisão antes de enviar</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Confira suas respostas antes de registrar a conclusão.</p>
                <div className="space-y-2">
                  {renderReviewItem('Peso final', form.pesoFinal ? `${form.pesoFinal} kg` : null)}
                  {renderReviewItem('Circunferência abdominal', form.circunferenciaAbdominal ? `${form.circunferenciaAbdominal} cm` : null)}
                  {renderReviewItem('Percepção do resultado', form.percepcaoResultadoFinal)}
                  {renderReviewItem('Principal conquista', form.principalConquista)}
                  {renderReviewItem('Depoimento', form.depoimento)}
                  {estrelasMedico >= 1 && renderReviewItem('Nota do tratamento', `${estrelasMedico} estrela${estrelasMedico > 1 ? 's' : ''}`)}
                </div>
              </>
            ) : currentFlowStep?.kind === 'stars' ? (
              <>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 leading-snug">
                  Como você avalia sua experiência com o tratamento?
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                  Sua avaliação ajuda sua equipe médica a melhorar continuamente o acompanhamento.
                </p>
                <div className="flex gap-1 justify-center py-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverEstrelas(star)}
                      onMouseLeave={() => setHoverEstrelas(0)}
                      onClick={() => setEstrelasMedico(estrelasMedico === star ? 0 : star)}
                      className="p-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                      aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                    >
                      <Star size={40} className={star <= (hoverEstrelas || estrelasMedico) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-500'} />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Opcional</p>
              </>
            ) : currentFlowStep?.kind === 'question' ? (
              (() => {
                const q = currentFlowStep.question;
                const bloqueado = campoBloqueado(q.key);
                return (
                  <>
                    <label className="block text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 leading-snug">
                      {q.label}
                      {q.unit ? <span className="block text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">({q.unit})</span> : null}
                    </label>
                    {q.hint && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{q.hint}</p>}
                    {bloqueado && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">Dado já registrado na conclusão.</p>
                    )}
                    {q.type === 'choice' && q.options ? (
                      <div className="space-y-2.5">
                        {q.options.map((option) => {
                          const selected = form[q.key] === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => updateField(q.key, option)}
                              className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm sm:text-base transition-all ${selected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/30' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-gray-300'}`}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    ) : q.type === 'textarea' ? (
                      <>
                        <textarea
                          value={form[q.key] || ''}
                          onChange={(e) => updateField(q.key, e.target.value)}
                          placeholder={q.placeholder}
                          rows={5}
                          maxLength={3000}
                          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-y min-h-[140px]"
                        />
                        <p className="text-xs text-gray-500 mt-1">{(form[q.key] || '').length}/3000 caracteres · Opcional</p>
                      </>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form[q.key] || ''}
                        onChange={(e) => updateField(q.key, e.target.value)}
                        placeholder={q.placeholder}
                        readOnly={bloqueado}
                        className={`w-full px-4 py-3.5 rounded-xl border text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${bloqueado ? 'border-gray-200 bg-gray-100 dark:bg-gray-800/90 text-gray-700 cursor-default' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900'}`}
                      />
                    )}
                  </>
                );
              })()
            ) : null}

            {erro && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{erro}</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 px-4 pb-6 pt-4">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > INTRO_STEP && (
            <button
              type="button"
              onClick={handleBack}
              disabled={enviando}
              className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium text-sm disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={enviando || (currentFlowStep?.kind === 'question' && currentFlowStep.question.key === 'pesoFinal' && !form.pesoFinal.trim() && !dados?.jaPreenchido)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold shadow-sm transition-all"
          >
            {enviando && isLastStep && <Loader2 className="w-5 h-5 animate-spin" />}
            {nextButtonLabel}
          </button>
        </div>
        <div className="max-w-lg mx-auto">
          <FooterConclusao />
        </div>
      </div>
    </div>
  );
}
