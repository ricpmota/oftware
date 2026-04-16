'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { Syringe, Loader2, CheckCircle, Copy, MessageCircle, PlayCircle, Play, Calendar, Hash, Pill, Stethoscope, User, UserCircle, Weight, Ruler, MapPin } from 'lucide-react';

type DadosAplicacao = {
  semana: number;
  dose: number;
  data: string;
  nomePaciente: string;
  jaPreenchido?: boolean;
  variacaoPeso?: number | null;
  variacaoCircunferencia?: number | null;
  peso?: number;
  circunferenciaAbdominal?: number | null;
  linkIndicacao?: string;
  medicoNome?: string;
  medicoGenero?: 'M' | 'F';
};

export default function AplicacaoPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosAplicacao | null>(null);

  const [peso, setPeso] = useState('');
  const [circunferenciaAbdominal, setCircunferenciaAbdominal] = useState('');
  const [localAplicacao, setLocalAplicacao] = useState<string>('');
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [resultado, setResultado] = useState<{
    variacaoPeso: number | null;
    variacaoCircunferencia: number | null;
    peso: number;
    circunferenciaAbdominal: number | null;
  } | null>(null);
  const [linkIndicacao, setLinkIndicacao] = useState<string | null>(null);
  const [medicoNome, setMedicoNome] = useState<string | null>(null);
  const [medicoGenero, setMedicoGenero] = useState<'M' | 'F'>('M');
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

  const executarAcaoLink = (comEvolucao: boolean, acao: 'copiar' | 'whatsapp') => {
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
  };

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

  useEffect(() => {
    if (!token) return;
    fetch(`/api/aplicacao/${token}/dados`)
      .then((res) => {
        if (!res.ok) throw new Error('Link inválido ou expirado');
        return res.json();
      })
      .then((data) => {
        setDados(data);
        setErro(null);
        // Sempre setar nome e gênero do médico (para o cabeçalho)
        if (data.medicoNome) setMedicoNome(data.medicoNome);
        if (data.medicoGenero === 'F' || data.medicoGenero === 'M') setMedicoGenero(data.medicoGenero);
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
      .catch((err) => setErro(err.message || 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !peso.trim()) return;

    const pesoNum = parseFloat(peso.replace(',', '.'));
    if (isNaN(pesoNum) || pesoNum <= 0) {
      setErro('Informe um peso válido.');
      return;
    }

    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/aplicacao/${token}/atualizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peso: pesoNum,
          circunferenciaAbdominal: circunferenciaAbdominal.trim() ? parseFloat(circunferenciaAbdominal.replace(',', '.')) : undefined,
          localAplicacao: localAplicacao || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao atualizar');
      setResultado({
        variacaoPeso: json.variacaoPeso ?? null,
        variacaoCircunferencia: json.variacaoCircunferencia ?? null,
        peso: json.peso ?? pesoNum,
        circunferenciaAbdominal: json.circunferenciaAbdominal ?? null,
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
  };

  /** YYYY-MM-DD como data de calendário local (evita um dia a menos com new Date('...') em UTC). */
  const parseDataChaveLocal = (s: string): Date | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
    if (!m) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    return new Date(y, mo, day, 0, 0, 0, 0);
  };

  const formatarDataPrevista = (s: string) => {
    const d = parseDataChaveLocal(s);
    if (!d) return s;
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatarDoseMg = (n: number | undefined) => {
    if (n == null || Number.isNaN(n)) return '—';
    const t = Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return `${t} mg`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (erro && !dados) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
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
    const vPeso = resultado?.variacaoPeso;
    const vCirc = resultado?.variacaoCircunferencia;

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
                <div className="absolute" style={{
                  left: center.x, top: center.y, width: '8px', height: '8px', backgroundColor: color,
                  borderRadius: Math.random() > 0.5 ? '50%' : '0%', opacity: 0,
                  animation: `${animationName} ${duration}s ease-out ${delay}s forwards`,
                  transform: 'translate(-50%, -50%)',
                }} />
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
                      <div className="absolute" style={{
                        left: position.x, top: position.y, width: '8px', height: '8px', borderRadius: '50%',
                        backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}`,
                        opacity: 0, animation: `${animName} ${duration}s ease-out ${delay}s forwards`,
                      }} />
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

    const temVarPeso = vPeso != null;
    const temVarCirc = vCirc != null;
    const doisCardsVariacao = temVarPeso && temVarCirc;

    return (
      <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-emerald-50 to-gray-50 dark:from-emerald-950/20 dark:to-gray-900 px-4 pt-3 pb-10 relative overflow-hidden">
        <Confetti />
        <Fireworks />
        <div className="w-full max-w-md relative z-10 shrink-0 mb-4">
          <Image
            src="/metodo-emagrecer-logotipo-28.png"
            alt="Método Emagrecer"
            width={220}
            height={68}
            className="h-10 sm:h-11 w-auto max-w-[85vw] sm:max-w-[260px] object-contain object-left"
            priority
          />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-5 sm:p-6 max-w-md w-full border border-gray-100 dark:border-gray-700 relative z-10">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 mb-3">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">
              Registro enviado com sucesso
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Obrigado por preencher os dados da sua aplicação.
            </p>
          </div>

          {(temVarPeso || temVarCirc) && (
            <div
              className={
                doisCardsVariacao
                  ? 'grid grid-cols-2 gap-2 sm:gap-3 mb-4'
                  : 'grid grid-cols-1 mb-4 max-w-[220px] mx-auto'
              }
            >
              {temVarPeso && (
                <div className="rounded-xl border border-gray-100/90 dark:border-gray-600/60 bg-gradient-to-b from-gray-50/90 to-white dark:from-gray-700/40 dark:to-gray-800/30 p-3 sm:p-3.5 text-center shadow-sm">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 leading-tight">
                    Δ Peso
                  </p>
                  <p
                    className={`text-lg sm:text-xl font-bold tabular-nums ${
                      vPeso! < 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : vPeso! > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {vPeso! > 0 ? '+' : ''}
                    {vPeso!.toFixed(1)} kg
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">
                    {vPeso! < 0 || vPeso! > 0 ? 'vs. última medição' : 'Sem alteração'}
                  </p>
                </div>
              )}
              {temVarCirc && (
                <div className="rounded-xl border border-gray-100/90 dark:border-gray-600/60 bg-gradient-to-b from-gray-50/90 to-white dark:from-gray-700/40 dark:to-gray-800/30 p-3 sm:p-3.5 text-center shadow-sm">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 leading-tight">
                    Δ Abdominal
                  </p>
                  <p
                    className={`text-lg sm:text-xl font-bold tabular-nums ${
                      vCirc! < 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : vCirc! > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {vCirc! > 0 ? '+' : ''}
                    {vCirc!.toFixed(1)} cm
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">
                    {vCirc! < 0 || vCirc! > 0 ? 'vs. última medição' : 'Sem alteração'}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-center mb-5">
            <a
              href="https://www.oftware.com.br/meta"
              className="group inline-flex items-center gap-2 rounded-full border border-emerald-200/90 bg-white/95 px-3.5 py-2 text-[13px] font-semibold text-emerald-800 shadow-[0_2px_12px_rgba(16,185,129,0.12)] backdrop-blur-sm transition-all hover:border-emerald-300 hover:bg-emerald-50/95 hover:shadow-[0_4px_16px_rgba(16,185,129,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-emerald-800/60 dark:bg-gray-800/95 dark:text-emerald-300 dark:hover:bg-emerald-950/50 dark:hover:border-emerald-600/50"
            >
              <UserCircle className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-105" aria-hidden />
              Minha página
            </a>
          </div>

          {linkIndicacao && (
            <>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 p-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Indique seu médico</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Compartilhe este link para que outras pessoas possam solicitar tratamento com seu médico.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => { setPendingAcaoEvolucao('copiar'); setEvolucaoFromIndicar(false); setShowModalEvolucao(true); }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Copy size={18} />
                    {linkCopiado ? 'Copiado!' : 'Copiar link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPendingAcaoEvolucao('whatsapp'); setEvolucaoFromIndicar(false); setShowModalEvolucao(true); }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <MessageCircle size={18} />
                    Enviar no WhatsApp
                  </button>
                </div>
              </div>

              {showModalIndicarMedico && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
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
                        onClick={() => setShowModalIndicarMedico(false)}
                        className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium"
                      >
                        Não
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showModalEvolucao && (pendingAcaoEvolucao || evolucaoFromIndicar) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
                    {evolucaoFromIndicar && evolucaoEscolhida !== null ? (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          Como deseja compartilhar?
                        </h3>
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
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                          Compartilhar evolução
                        </h3>
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
          )}
        </div>
      </div>
    );
  }

  const formatarNomePaciente = (nomeCompleto: string | undefined) => {
    if (!nomeCompleto) return '';
    const partes = nomeCompleto.trim().split(/\s+/).filter(p => p.length > 0);
    if (partes.length === 0) return '';
    if (partes.length === 1) return partes[0];
    return `${partes[0]} ${partes[partes.length - 1]}`;
  };

  const tituloMedicoHeader = medicoGenero === 'F' ? 'Dra.' : 'Dr.';

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

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-900 px-4 pt-2 pb-24 sm:pb-28 sm:pt-3">
      {/* Logo + card médico/paciente (vídeo: botão fixo canto inferior direito) */}
      <header className="w-full max-w-md mb-5 sm:mb-6 self-center shrink-0">
        <div className="pt-1 pb-3">
          <Image
            src="/metodo-emagrecer-logotipo-28.png"
            alt="Método Emagrecer"
            width={220}
            height={68}
            className="h-10 sm:h-12 w-auto max-w-[85vw] sm:max-w-[280px] object-contain object-left"
            priority
          />
        </div>

        <div className="rounded-2xl border border-emerald-100/90 dark:border-emerald-900/40 bg-gradient-to-br from-white via-white to-emerald-50/40 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-emerald-950/20 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(16,185,129,0.06)] dark:shadow-none p-3.5 sm:p-4 space-y-3.5">
          {medicoNome ? (
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400">
                <Stethoscope className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700/85 dark:text-emerald-400/90">
                  Médico(a)
                </p>
                <p className="text-sm sm:text-[15px] font-semibold text-gray-900 dark:text-white leading-snug break-words mt-0.5">
                  {tituloMedicoHeader} {medicoNome}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 pl-1">Tratamento acompanhado na Oftware</p>
          )}
          {medicoNome && dados?.nomePaciente ? (
            <div className="h-px bg-gradient-to-r from-emerald-200/50 via-gray-200/80 to-transparent dark:from-emerald-800/40 dark:via-gray-600/50" aria-hidden />
          ) : null}
          {dados?.nomePaciente ? (
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100/90 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300">
                <User className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-teal-800/80 dark:text-teal-400/90">
                  Paciente
                </p>
                <p className="text-sm sm:text-[15px] font-semibold text-gray-900 dark:text-white leading-snug break-words mt-0.5">
                  {formatarNomePaciente(dados.nomePaciente)}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {/* Vídeo da aplicação — FAB fixo estilo chat (canto inferior direito) */}
      <button
        type="button"
        onClick={abrirVideoAplicacao}
        disabled={videoUrlLoading}
        className="fixed bottom-5 right-4 z-40 flex flex-col items-center gap-1.5 rounded-none border-0 bg-transparent p-0 shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 dark:focus-visible:ring-offset-gray-900 disabled:opacity-55 disabled:pointer-events-none sm:bottom-6 sm:right-6"
        style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom, 0px))' }}
        aria-label="Assistir vídeo de como fazer a aplicação"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff0000] text-white shadow-[0_4px_20px_rgba(255,0,0,0.45),0_2px_8px_rgba(0,0,0,0.12)] transition-transform hover:scale-105 hover:bg-[#e60000] active:scale-95">
          {videoUrlLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          ) : (
            <Play className="h-7 w-7 fill-white text-white translate-x-0.5" aria-hidden />
          )}
        </span>
        <span className="rounded-md bg-white/95 px-2 py-0.5 text-center text-[11px] font-semibold leading-tight text-gray-900 shadow-sm ring-1 ring-black/5 dark:bg-gray-900/95 dark:text-gray-100 dark:ring-white/10">
          Aplicação
        </span>
      </button>

      <div className="w-full max-w-md self-center flex-1">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-emerald-100/90 dark:border-emerald-900/45 bg-gradient-to-br from-emerald-50/90 via-white to-slate-50/70 dark:from-emerald-950/25 dark:via-gray-800/50 dark:to-gray-900/30 p-4 sm:p-5 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]"
          aria-label="Registro de aplicação"
        >
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100/90 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
              <Syringe className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                Registro de aplicação
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Confira o resumo e preencha seus dados
              </p>
            </div>
          </div>

          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800/80 dark:text-emerald-400/90 mb-3 sm:mb-4">
            Resumo desta aplicação
          </p>
          <div className="space-y-2 sm:space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="flex min-w-0 rounded-xl bg-white/75 dark:bg-gray-900/35 border border-gray-100/90 dark:border-gray-700/60 p-2.5 sm:p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none gap-2 items-center">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-100/90 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                  <Hash className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight">
                    Semana
                  </p>
                  <p className="text-lg sm:text-xl font-bold tabular-nums text-gray-900 dark:text-white leading-tight">
                    {dados?.semana ?? '—'}
                  </p>
                </div>
              </div>
              <div className="flex min-w-0 rounded-xl bg-white/75 dark:bg-gray-900/35 border border-gray-100/90 dark:border-gray-700/60 p-2.5 sm:p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none gap-2 items-center">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-teal-100/90 dark:bg-teal-900/35 text-teal-800 dark:text-teal-300">
                  <Pill className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight">
                    Dose
                  </p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight truncate" title={formatarDoseMg(dados?.dose)}>
                    {formatarDoseMg(dados?.dose)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex rounded-xl bg-white/75 dark:bg-gray-900/35 border border-gray-100/90 dark:border-gray-700/60 p-2.5 sm:p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none gap-2 sm:gap-3 items-center">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-sky-100/90 dark:bg-sky-900/35 text-sky-800 dark:text-sky-300">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Data prevista
                </p>
                <p className="text-xs sm:text-[15px] font-semibold text-gray-900 dark:text-white leading-snug mt-0.5">
                  {dados?.data ? formatarDataPrevista(dados.data) : '—'}
                </p>
              </div>
            </div>
          </div>

          <div
            className="my-5 sm:my-6 h-px bg-gradient-to-r from-emerald-200/50 via-gray-200/80 to-transparent dark:from-emerald-800/40 dark:via-gray-600/50"
            aria-hidden
          />

          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800/80 dark:text-emerald-400/90 mb-3 sm:mb-4">
            Seus dados nesta aplicação
          </p>
          <div className="space-y-3 sm:space-y-3.5">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="flex min-w-0 flex-col rounded-xl bg-white/75 dark:bg-gray-900/35 border border-gray-100/90 dark:border-gray-700/60 p-2.5 sm:p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100/90 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                    <Weight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                  </div>
                  <label htmlFor="peso-aplicacao" className="text-[9px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight">
                    Peso (kg) *
                  </label>
                </div>
                <input
                  id="peso-aplicacao"
                  type="text"
                  inputMode="decimal"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  placeholder="75,5"
                  required
                  className="w-full rounded-xl border border-gray-200/90 dark:border-gray-600 bg-white dark:bg-gray-800/90 px-2.5 sm:px-3 py-2 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 focus:border-emerald-500/60 transition-shadow"
                />
              </div>

              <div className="flex min-w-0 flex-col rounded-xl bg-white/75 dark:bg-gray-900/35 border border-gray-100/90 dark:border-gray-700/60 p-2.5 sm:p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100/90 dark:bg-teal-900/35 text-teal-800 dark:text-teal-300">
                    <Ruler className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                  </div>
                  <label
                    htmlFor="circ-aplicacao"
                    className="min-w-0 text-[9px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-tight"
                    title="Comprimento abdominal (centímetros)"
                  >
                    <span className="sm:hidden">Abdome (cm)</span>
                    <span className="hidden sm:inline">Compr. abdominal (cm)</span>
                  </label>
                </div>
                <input
                  id="circ-aplicacao"
                  type="text"
                  inputMode="decimal"
                  value={circunferenciaAbdominal}
                  onChange={(e) => setCircunferenciaAbdominal(e.target.value)}
                  placeholder="98"
                  className="w-full rounded-xl border border-gray-200/90 dark:border-gray-600 bg-white dark:bg-gray-800/90 px-2.5 sm:px-3 py-2 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 focus:border-emerald-500/60 transition-shadow"
                />
              </div>
            </div>

            <div className="flex rounded-xl bg-white/75 dark:bg-gray-900/35 border border-gray-100/90 dark:border-gray-700/60 p-3 sm:p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none gap-3 items-start">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100/90 dark:bg-sky-900/35 text-sky-800 dark:text-sky-300">
                <MapPin className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="local-aplicacao" className="text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Local de aplicação
                </label>
                <select
                  id="local-aplicacao"
                  value={localAplicacao}
                  onChange={(e) => setLocalAplicacao(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200/90 dark:border-gray-600 bg-white dark:bg-gray-800/90 px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/35 focus:border-emerald-500/60 transition-shadow"
                >
                  <option value="">Selecione</option>
                  <option value="abdome">Abdome</option>
                  <option value="coxa">Coxa</option>
                  <option value="braco">Braço</option>
                </select>
              </div>
            </div>
          </div>

          {erro && (
            <p className="mt-4 text-sm font-medium text-red-600 dark:text-red-400 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 px-3 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando || !peso.trim()}
            className="mt-5 w-full rounded-xl py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
          >
            {enviando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar registro'
            )}
          </button>
        </form>

        {showModalVideo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6">
              {!modalVideoMostrarVideo ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 text-center">
                    Deseja assistir o vídeo auxiliando em como fazer a aplicação?
                  </h3>
                  <div className="flex gap-3 justify-center mt-5">
                    <button
                      type="button"
                      onClick={async () => {
                        setVideoUrlLoading(true);
                        try {
                          const res = await fetch('/api/aplicacao/video-signed-url');
                          const json = await res.json();
                          if (res.ok && json.signedUrl) {
                            setVideoSignedUrl(json.signedUrl);
                            setModalVideoMostrarVideo(true);
                          }
                        } finally {
                          setVideoUrlLoading(false);
                        }
                      }}
                      disabled={videoUrlLoading}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-lg font-medium"
                    >
                      {videoUrlLoading ? <Loader2 size={20} className="animate-spin" /> : <PlayCircle size={20} />}
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowModalVideo(false)}
                      className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium"
                    >
                      Não
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Como fazer a aplicação
                    </h3>
                    <button
                      type="button"
                      onClick={() => { setShowModalVideo(false); setModalVideoMostrarVideo(false); }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
                      aria-label="Fechar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                    {videoSignedUrl ? (
                      <video
                        src={videoSignedUrl}
                        controls
                        className="w-full h-full"
                        autoPlay
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer com logo Oftware */}
      <div className="flex items-center justify-center gap-2 mt-6 text-gray-400 dark:text-gray-500">
        <img src="/logo.png" alt="Oftware" className="h-5 w-auto opacity-60" />
        <span className="text-xs">Powered by Oftware 2026</span>
      </div>
    </div>
  );
}
