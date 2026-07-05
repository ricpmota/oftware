'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  Copy,
  Hash,
  Loader2,
  MessageCircle,
  Pill,
  Play,
  PlayCircle,
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
import { CHECK_IN_SEMANAL_QUESTIONS, LOCAL_APLICACAO_LABEL_TO_VALUE } from '@/lib/aplicacao/checkInSemanalQuestions';
import type { CheckInSemanalScoreResultado } from '@/lib/aplicacao/calcularScoreCheckInSemanal';
import { CheckInSemanalScoreCard } from '@/components/aplicacao/CheckInSemanalScoreCard';
import AplicacaoFotosEvolucaoSection from '@/components/aplicacao/AplicacaoFotosEvolucaoSection';
import { DigitalMeasurePicker } from '@/components/aplicacao/DigitalMeasurePicker';

const INTRO_STEP = 0;
const QUESTION_COUNT = CHECK_IN_SEMANAL_QUESTIONS.length;
const TOTAL_STEPS = INTRO_STEP + QUESTION_COUNT + 1;

const INSTAGRAM_MARK_GRADIENT: import('react').CSSProperties = {
  background: 'radial-gradient(circle at 30% 110%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
};

function InstagramGradientLink({
  href,
  ariaLabel,
  title,
}: {
  href: string;
  ariaLabel: string;
  title?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex shrink-0 items-center justify-center text-white shadow-sm ring-1 ring-black/10 transition hover:opacity-90 rounded-[22%] h-10 w-10"
      style={INSTAGRAM_MARK_GRADIENT}
      aria-label={ariaLabel}
      title={title}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    </a>
  );
}

type DadosAplicacao = {
  semana: number;
  dose: number;
  data: string;
  nomePaciente: string;
  jaPreenchido?: boolean;
  variacaoPeso?: number | null;
  variacaoCircunferencia?: number | null;
  pesoPerdidoAcumulado?: number | null;
  circunferenciaPerdidaAcumulada?: number | null;
  peso?: number;
  circunferenciaAbdominal?: number | null;
  pesoReferencia?: number | null;
  circunferenciaReferencia?: number | null;
  linkIndicacao?: string;
  medicoNome?: string;
  medicoGenero?: 'M' | 'F';
  medicoFotoPerfilUrl?: string | null;
  medicoInstagramUsuario?: string | null;
  pacienteFotoPerfilUrl?: string | null;
  whiteLabel?: MedicoWhiteLabelResolved;
};

type FormState = Record<string, string>;

const INITIAL_FORM: FormState = Object.fromEntries(
  CHECK_IN_SEMANAL_QUESTIONS.map((q) => [q.key, ''])
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
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatarDoseMg(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  const t = Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${t} mg`;
}

function formatarPerda(valor: number | null | undefined, unidade: 'kg' | 'cm') {
  if (valor == null || Number.isNaN(valor)) return null;
  if (valor === 0) return `Sem alteração (${unidade})`;
  const sinal = valor > 0 ? '−' : '+';
  return `${sinal}${Math.abs(valor).toFixed(1)} ${unidade}`;
}

function MedicoAvatar({ url, alt }: { url: string | null; alt: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const trimmed = (url || '').trim();
  if (trimmed && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={trimmed}
        alt={alt}
        className="h-12 w-12 shrink-0 rounded-full object-cover border border-emerald-200 bg-slate-100 shadow-sm"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] text-white shadow-sm">
      <Stethoscope className="h-6 w-6" />
    </div>
  );
}

export default function AplicacaoCheckInPageClient() {
  const params = useParams();
  const token = params?.token as string;

  const [step, setStep] = useState(INTRO_STEP);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosAplicacao | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [resultado, setResultado] = useState<{
    variacaoPeso: number | null;
    variacaoCircunferencia: number | null;
    peso: number;
    circunferenciaAbdominal: number | null;
    scoreCheckInSemanal?: CheckInSemanalScoreResultado | null;
  } | null>(null);
  const [linkIndicacao, setLinkIndicacao] = useState<string | null>(null);
  const [medicoNome, setMedicoNome] = useState<string | null>(null);
  const [medicoGenero, setMedicoGenero] = useState<'M' | 'F'>('M');
  const [medicoFotoPerfilUrl, setMedicoFotoPerfilUrl] = useState<string | null>(null);
  const [medicoInstagramUsuario, setMedicoInstagramUsuario] = useState<string | null>(null);
  const [whiteLabel, setWhiteLabel] = useState<MedicoWhiteLabelResolved | null>(null);
  const [medidasReferencia, setMedidasReferencia] = useState<{
    peso: number | null;
    circunferenciaAbdominal: number | null;
  }>({ peso: null, circunferenciaAbdominal: null });
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [showModalEvolucao, setShowModalEvolucao] = useState(false);
  const [pendingAcaoEvolucao, setPendingAcaoEvolucao] = useState<'copiar' | 'whatsapp' | null>(null);
  const [showModalIndicarMedico, setShowModalIndicarMedico] = useState(false);
  const [evolucaoFromIndicar, setEvolucaoFromIndicar] = useState(false);
  const [evolucaoEscolhida, setEvolucaoEscolhida] = useState<boolean | null>(null);
  const [showModalVideo, setShowModalVideo] = useState(false);
  const [modalVideoMostrarVideo, setModalVideoMostrarVideo] = useState(false);
  const [videoSignedUrl, setVideoSignedUrl] = useState<string | null>(null);
  const [videoUrlLoading, setVideoUrlLoading] = useState(false);
  const videoAbrirBusyRef = useRef(false);

  const isIntro = step === INTRO_STEP;
  const questionIndex = step - 1;
  const currentQuestion = questionIndex >= 0 && questionIndex < QUESTION_COUNT ? CHECK_IN_SEMANAL_QUESTIONS[questionIndex] : null;
  const isLastStep = step === QUESTION_COUNT;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const updateField = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErro(null);
  }, []);

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
        if (data.medicoNome) setMedicoNome(data.medicoNome);
        if (data.medicoGenero === 'F' || data.medicoGenero === 'M') setMedicoGenero(data.medicoGenero);
        setMedicoFotoPerfilUrl(data.medicoFotoPerfilUrl?.trim() || null);
        setMedicoInstagramUsuario(data.medicoInstagramUsuario?.trim() || null);
        if (data.whiteLabel) setWhiteLabel(data.whiteLabel);

        setMedidasReferencia({
          peso:
            data.pesoReferencia != null && data.pesoReferencia > 0 ? data.pesoReferencia : null,
          circunferenciaAbdominal:
            data.circunferenciaReferencia != null && data.circunferenciaReferencia > 0
              ? data.circunferenciaReferencia
              : null,
        });

        setForm((prev) => {
          const next = { ...prev };
          if (!prev.peso.trim() && data.peso != null && data.peso > 0) {
            next.peso = data.peso.toFixed(1).replace('.', ',');
          }
          if (
            !prev.circunferenciaAbdominal.trim() &&
            data.circunferenciaAbdominal != null &&
            data.circunferenciaAbdominal > 0
          ) {
            next.circunferenciaAbdominal = data.circunferenciaAbdominal.toFixed(2).replace('.', ',');
          }
          return next;
        });

        if (data.jaPreenchido) {
          setResultado({
            variacaoPeso: data.variacaoPeso ?? null,
            variacaoCircunferencia: data.variacaoCircunferencia ?? null,
            peso: data.peso ?? 0,
            circunferenciaAbdominal: data.circunferenciaAbdominal ?? null,
          });
          if (data.linkIndicacao) setLinkIndicacao(data.linkIndicacao);
          setSucesso(true);
          setShowFireworks(true);
        }
      })
      .catch((err) => setErro(formatPublicPatientFetchError(err)))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (showFireworks) {
      const t = setTimeout(() => {
        setShowFireworks(false);
        if (linkIndicacao) setShowModalIndicarMedico(true);
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [showFireworks, linkIndicacao]);

  useEffect(() => {
    if (!loading && dados && !sucesso && !erro) {
      setShowModalVideo(true);
      setModalVideoMostrarVideo(false);
    }
  }, [loading, dados, sucesso, erro]);

  const executarAcaoLink = useCallback(
    (comEvolucao: boolean, acao: 'copiar' | 'whatsapp') => {
      if (!linkIndicacao) return;
      const path = comEvolucao ? `${linkIndicacao}${linkIndicacao.includes('?') ? '&' : '?'}evolucao=1` : linkIndicacao;
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
    [linkIndicacao, medicoGenero, medicoNome]
  );

  const headerWhiteLabel: MedicoWhiteLabelResolved | null = whiteLabel
    ? whiteLabel
    : medicoNome
      ? resolveMedicoWhiteLabel({ nome: medicoNome, genero: medicoGenero, fotoPerfilUrl: medicoFotoPerfilUrl })
      : null;

  const aplicacaoPage = headerWhiteLabel?.publicPages.aplicacao;
  const pageBg = aplicacaoPage?.backgroundColor ?? '#F8FAFC';
  const tituloMedico = medicoGenero === 'F' ? 'Dra.' : 'Dr.';

  const validateCurrentStep = useCallback((): boolean => {
    if (isIntro) return true;
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

    if (currentQuestion.type === 'choice') {
      if (currentQuestion.required && !value) {
        setErro('Selecione uma opção.');
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
    const localAplicacao = LOCAL_APLICACAO_LABEL_TO_VALUE[form.localAplicacao || ''];

    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/aplicacao/${token}/atualizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peso: pesoNum,
          circunferenciaAbdominal: circNum != null && !isNaN(circNum) ? circNum : undefined,
          localAplicacao,
          checkInSemanal: {
            fomeSemana: form.fomeSemana,
            periodoMaisFome: form.periodoMaisFome,
            saciedadeAoComer: form.saciedadeAoComer,
            consumoAgua: form.consumoAgua,
            consumoProteinas: form.consumoProteinas,
            satisfacaoEvolucao: form.satisfacaoEvolucao,
            comentarioSemana: form.comentarioSemana || undefined,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao atualizar');
      setResultado({
        variacaoPeso: json.variacaoPeso ?? null,
        variacaoCircunferencia: json.variacaoCircunferencia ?? null,
        peso: json.peso ?? pesoNum,
        circunferenciaAbdominal: json.circunferenciaAbdominal ?? null,
        scoreCheckInSemanal: json.scoreCheckInSemanal ?? null,
      });
      if (json.linkIndicacao) setLinkIndicacao(json.linkIndicacao);
      if (json.medicoNome) setMedicoNome(json.medicoNome);
      if (json.medicoGenero === 'F' || json.medicoGenero === 'M') setMedicoGenero(json.medicoGenero);
      setSucesso(true);
      setShowFireworks(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setEnviando(false);
    }
  }, [token, form]);

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

  const abrirVideoAplicacao = async () => {
    if (videoAbrirBusyRef.current) return;
    videoAbrirBusyRef.current = true;
    setVideoUrlLoading(true);
    try {
      const res = await fetch('/api/aplicacao/video-signed-url');
      const json = await res.json();
      if (res.ok && json.signedUrl) {
        setVideoSignedUrl(json.signedUrl);
        setShowModalVideo(true);
        setModalVideoMostrarVideo(true);
      }
    } finally {
      videoAbrirBusyRef.current = false;
      setVideoUrlLoading(false);
    }
  };

  const stepLabel = useMemo(() => `${step + 1} de ${TOTAL_STEPS}`, [step]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (erro && !dados) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 mb-4">{erro}</p>
          <p className="text-sm text-slate-500">Verifique se o link está correto ou entre em contato com seu médico.</p>
        </div>
      </div>
    );
  }

  if (sucesso) {
    const vPeso = resultado?.variacaoPeso;
    const vCirc = resultado?.variacaoCircunferencia;
    const temVarPeso = vPeso != null;
    const temVarCirc = vCirc != null;
    const doisCardsVariacao = temVarPeso && temVarCirc;

    const Confetti = () => {
      if (!showFireworks) return null;
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
            const animationName = `confetti-aplicacao-${i}`;
            const startX = Math.cos(angle * Math.PI / 180) * explosionDistance;
            const startY = Math.sin(angle * Math.PI / 180) * explosionDistance;
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
    };

    const Fireworks = () => {
      if (!showFireworks) return null;
      const fireworkPositions = [
        { x: '30%', y: '25%' }, { x: '70%', y: '20%' }, { x: '25%', y: '40%' }, { x: '75%', y: '35%' },
        { x: '40%', y: '35%' }, { x: '60%', y: '30%' }, { x: '50%', y: '50%' }, { x: '20%', y: '60%' },
        { x: '80%', y: '55%' }, { x: '35%', y: '70%' }, { x: '65%', y: '65%' },
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
              const x = Math.cos(angle * Math.PI / 180) * distance;
              const y = Math.sin(angle * Math.PI / 180) * distance;
              return { x, y, color, key: `fw-${fireworkIndex}-${i}` };
            });
            return (
              <div key={`fw-${fireworkIndex}`}>
                {particles.map((p) => {
                  const animName = `firework-aplicacao-${p.key}`;
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
    };

    return (
      <div className="min-h-dvh flex flex-col items-center px-4 pt-3 pb-10 relative overflow-hidden" style={{ backgroundColor: pageBg }}>
        <WhiteLabelFaviconEffect faviconUrl={headerWhiteLabel?.faviconUrl} cacheKey={headerWhiteLabel?.faviconUrl ?? undefined} />
        <Confetti />
        <Fireworks />
        <div className="w-full max-w-lg relative z-10 mb-4">
          <PublicPageTopLogo theme={aplicacaoPage} brandName={headerWhiteLabel?.brandName} priority />
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-lg w-full border border-slate-100 relative z-10">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-3">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-1">Check-in enviado com sucesso</h1>
            <p className="text-sm text-slate-500">Obrigado por registrar sua evolução desta semana.</p>
          </div>

          {resultado?.scoreCheckInSemanal && (
            <div className="mb-4">
              <CheckInSemanalScoreCard score={resultado.scoreCheckInSemanal} />
            </div>
          )}

          {(temVarPeso || temVarCirc) && (
            <div className={doisCardsVariacao ? 'grid grid-cols-2 gap-3 mb-4' : 'grid grid-cols-1 mb-4 max-w-[220px] mx-auto'}>
              {temVarPeso && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">Δ Peso</p>
                  <p className={`text-lg font-bold ${vPeso! < 0 ? 'text-emerald-600' : vPeso! > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                    {vPeso! > 0 ? '+' : ''}{vPeso!.toFixed(1)} kg
                  </p>
                </div>
              )}
              {temVarCirc && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">Δ Abdominal</p>
                  <p className={`text-lg font-bold ${vCirc! < 0 ? 'text-emerald-600' : vCirc! > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                    {vCirc! > 0 ? '+' : ''}{vCirc!.toFixed(1)} cm
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-center mb-5">
            <a
              href={METODO_PACIENTE_META_URL}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50 transition-colors"
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
                  onClick={() => { setPendingAcaoEvolucao('copiar'); setEvolucaoFromIndicar(false); setShowModalEvolucao(true); }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium"
                >
                  <Copy size={18} /> {linkCopiado ? 'Copiado!' : 'Copiar link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setPendingAcaoEvolucao('whatsapp'); setEvolucaoFromIndicar(false); setShowModalEvolucao(true); }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                >
                  <MessageCircle size={18} /> Enviar no WhatsApp
                </button>
              </div>
            </div>
          )}

          {showModalIndicarMedico && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3 text-center">Quer indicar seu médico?</h3>
                <p className="text-sm text-slate-600 mb-4 text-center">
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
      </div>
    );
  }

  const pesoPerdidoLabel = formatarPerda(dados?.pesoPerdidoAcumulado, 'kg');
  const circPerdidaLabel = formatarPerda(dados?.circunferenciaPerdidaAcumulada, 'cm');

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col" style={{ color: aplicacaoPage?.textColor }}>
      <WhiteLabelFaviconEffect faviconUrl={headerWhiteLabel?.faviconUrl} cacheKey={headerWhiteLabel?.faviconUrl ?? undefined} />

      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <PublicPageTopLogo theme={aplicacaoPage} brandName={headerWhiteLabel?.brandName} className="!pt-0 !pb-0" />
            <span className="text-xs font-medium text-slate-500">{stepLabel}</span>
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
                  Check-in Semanal
                </h1>
                <p className="text-sm text-slate-600 mb-5">
                  Acompanhe sua evolução e registre como foi sua semana de tratamento.
                </p>

                <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm space-y-4 mb-4">
                  {medicoNome && (
                    <div className="flex items-center gap-3">
                      <MedicoAvatar
                        url={headerWhiteLabel?.profilePhotoUrl || medicoFotoPerfilUrl}
                        alt={headerWhiteLabel?.brandName || medicoNome}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Médico(a)</p>
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {headerWhiteLabel?.brandName || `${tituloMedico} ${medicoNome}`}
                        </p>
                      </div>
                      {medicoInstagramUsuario && (
                        <InstagramGradientLink
                          href={`https://www.instagram.com/${encodeURIComponent(medicoInstagramUsuario)}/`}
                          ariaLabel={`Instagram de ${tituloMedico} ${medicoNome}`}
                          title={`@${medicoInstagramUsuario}`}
                        />
                      )}
                    </div>
                  )}

                  {dados?.nomePaciente && (
                    <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-800">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Paciente</p>
                        <p className="text-sm font-semibold text-slate-900">{formatarNomePaciente(dados.nomePaciente)}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Hash className="h-4 w-4" />
                        <span className="text-[10px] font-semibold uppercase">Semana</span>
                      </div>
                      <p className="text-xl font-bold text-slate-900">{dados?.semana ?? '—'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Pill className="h-4 w-4" />
                        <span className="text-[10px] font-semibold uppercase">Dose</span>
                      </div>
                      <p className="text-base font-bold text-slate-900">{formatarDoseMg(dados?.dose)}</p>
                    </div>
                  </div>

                  {dados?.data && (
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-sky-700 shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-slate-500">Data prevista</p>
                        <p className="text-sm font-semibold text-slate-900">{formatarDataPrevista(dados.data)}</p>
                      </div>
                    </div>
                  )}

                  {(pesoPerdidoLabel || circPerdidaLabel) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pesoPerdidoLabel && (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                          <p className="text-[10px] font-semibold uppercase text-emerald-800 mb-1">Peso perdido</p>
                          <p className="text-sm font-bold text-emerald-900">{pesoPerdidoLabel}</p>
                        </div>
                      )}
                      {circPerdidaLabel && (
                        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                          <p className="text-[10px] font-semibold uppercase text-emerald-800 mb-1">Abdominal perdido</p>
                          <p className="text-sm font-bold text-emerald-900">{circPerdidaLabel}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : currentQuestion ? (
              <>
                <label className="block text-lg sm:text-xl font-semibold text-slate-900 mb-4 leading-snug">
                  {currentQuestion.label}
                  {currentQuestion.unit ? (
                    <span className="block text-sm font-medium text-slate-500 mt-1">({currentQuestion.unit})</span>
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
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/30'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : currentQuestion.type === 'textarea' ? (
                  <textarea
                    value={form[currentQuestion.key] || ''}
                    onChange={(e) => updateField(currentQuestion.key, e.target.value)}
                    placeholder={currentQuestion.placeholder}
                    rows={4}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-y min-h-[120px]"
                  />
                ) : currentQuestion.type === 'fotos' ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-600 mb-3">
                      Opcional — registre fotos frontal e de perfil para acompanhar sua evolução visual.
                    </p>
                    <AplicacaoFotosEvolucaoSection token={token} defaultAberto />
                  </div>
                ) : currentQuestion.key === 'peso' ? (
                  <DigitalMeasurePicker
                    value={form.peso || ''}
                    onChange={(v) => updateField('peso', v)}
                    unit="kg"
                    step={0.1}
                    decimals={1}
                    referenceValue={medidasReferencia.peso}
                  />
                ) : currentQuestion.key === 'circunferenciaAbdominal' ? (
                  <DigitalMeasurePicker
                    value={form.circunferenciaAbdominal || ''}
                    onChange={(v) => updateField('circunferenciaAbdominal', v)}
                    unit="cm"
                    step={0.25}
                    decimals={2}
                    referenceValue={medidasReferencia.circunferenciaAbdominal}
                  />
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form[currentQuestion.key] || ''}
                    onChange={(e) => updateField(currentQuestion.key, e.target.value)}
                    placeholder={currentQuestion.placeholder}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
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

        <div className="sticky bottom-0 pt-6 pb-4 mt-auto bg-gradient-to-t from-white via-white to-transparent">
          <div className="flex gap-3">
            {step > INTRO_STEP && (
              <button
                type="button"
                onClick={handleBack}
                disabled={enviando}
                className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={enviando}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20 disabled:opacity-70"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
                </>
              ) : isIntro ? (
                'Responder Check-In Semanal'
              ) : isLastStep ? (
                'Enviar check-in'
              ) : (
                'Responder'
              )}
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={abrirVideoAplicacao}
        disabled={videoUrlLoading}
        className="fixed bottom-5 right-4 z-40 flex flex-col items-center gap-1.5"
        aria-label="Assistir vídeo de como fazer a aplicação"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff0000] text-white shadow-lg">
          {videoUrlLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Play className="h-7 w-7 fill-white translate-x-0.5" />}
        </span>
        <span className="rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-slate-900 shadow-sm">Aplicação</span>
      </button>

      {showModalVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            {!modalVideoMostrarVideo ? (
              <>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 text-center">
                  Deseja assistir o vídeo auxiliando em como fazer a aplicação?
                </h3>
                <div className="flex gap-3 justify-center mt-5">
                  <button
                    type="button"
                    onClick={abrirVideoAplicacao}
                    disabled={videoUrlLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium"
                  >
                    {videoUrlLoading ? <Loader2 className="animate-spin" /> : <PlayCircle size={20} />} Sim
                  </button>
                  <button type="button" onClick={() => setShowModalVideo(false)} className="px-6 py-3 bg-slate-100 rounded-lg font-medium">
                    Não
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-slate-900">Como fazer a aplicação</h3>
                  <button type="button" onClick={() => { setShowModalVideo(false); setModalVideoMostrarVideo(false); }} className="text-slate-400 p-1">✕</button>
                </div>
                <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                  {videoSignedUrl ? (
                    <video src={videoSignedUrl} controls className="w-full h-full" autoPlay />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <PublicPageBrandFooter
        theme={aplicacaoPage}
        brandName={headerWhiteLabel?.brandName}
        showPoweredBy={headerWhiteLabel?.showPoweredByOftware !== false}
        className="px-4 pb-6"
      />
    </div>
  );
}
