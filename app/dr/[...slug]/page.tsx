'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Medico } from '@/types/medico';
import { SolicitacaoMedicoService } from '@/services/solicitacaoMedicoService';
import { PacienteService } from '@/services/pacienteService';
import { PacienteCompleto } from '@/types/obesidade';
import { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { Stethoscope, MapPin, Phone, Mail, Loader2, CheckCircle, Check, AlertCircle, X, UtensilsCrossed, Dumbbell, Star, TrendingDown, Users, Clock, Activity, User as UserIcon, ChevronDown, ChevronUp, BarChart3, Syringe, Scale } from 'lucide-react';
import { alturaInputParaCm } from '@/utils/alturaInput';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, ComposedChart, Bar } from 'recharts';
import DepoimentosAnimatedBackdrop from '@/components/landing/DepoimentosAnimatedBackdrop';

/** Paleta alinhada à home (/) — fundo #0A1F44, destaques #4CCB7A / #2F8FA3, texto #E8EDED */
const PAGE_BG = '#0A1F44';
const SHELL_CARD = 'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(
  end: number,
  durationMs: number,
  startAnimation: boolean,
  decimals = 0
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!startAnimation) {
      setValue(0);
      return;
    }

    const start = performance.now();
    const startVal = 0;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOutCubic(progress);
      const current = startVal + (end - startVal) * eased;
      const rounded =
        decimals > 0
          ? Math.round(current * Math.pow(10, decimals)) / Math.pow(10, decimals)
          : Math.round(current);

      setValue(rounded);
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [end, durationMs, startAnimation, decimals]);

  return value;
}

/** Selo azul com check branco, tangente ao canto inferior direito do avatar (estilo Instagram). */
function SeloVerificadoInstagram({ ringClassName = 'ring-[#0A1F44]' }: { ringClassName?: string }) {
  return (
    <span
      className={`-right-1 -bottom-1 pointer-events-none absolute z-10 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-[#0095F6] text-white shadow-md ring-[3px] ${ringClassName}`}
      title="Verificado"
      aria-label="Perfil verificado"
    >
      <Check className="h-3 w-3 sm:h-[14px] sm:w-[14px]" strokeWidth={3.2} aria-hidden />
    </span>
  );
}

const AVATAR_MEDICO_WRAP = 'relative w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48 shrink-0';
const AVATAR_MEDICO_FACE =
  'h-full w-full rounded-full border-4 border-white/90 shadow-xl ring-4 ring-[#4CCB7A]/35';

function MedicoPersonalPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get('embed') === '1';
  const [medico, setMedico] = useState<Medico | null>(null);
  const [nutricionista, setNutricionista] = useState<NutricionistaDoc | null>(null);
  const [personalTrainer, setPersonalTrainer] = useState<PersonalTrainerDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [paciente, setPaciente] = useState<PacienteCompleto | null>(null);
  const [showTelefoneModal, setShowTelefoneModal] = useState(false);
  const [telefone, setTelefone] = useState('');
  const [pesoPacienteModal, setPesoPacienteModal] = useState('');
  const [alturaPacienteModal, setAlturaPacienteModal] = useState('');
  const [criandoSolicitacao, setCriandoSolicitacao] = useState(false);
  const [isDraggingIMCModal, setIsDraggingIMCModal] = useState(false);
  const [pesoTemporarioIMCModal, setPesoTemporarioIMCModal] = useState<number | null>(null);
  const [imcTemporarioIMCModal, setImcTemporarioIMCModal] = useState<number | null>(null);
  const barraIMCRefModal = useRef<HTMLDivElement | null>(null);
  const [solicitacaoCriada, setSolicitacaoCriada] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agregadoMedico, setAgregadoMedico] = useState<{ count: number; media: number } | null>(null);
  const [pacienteIndicador, setPacienteIndicador] = useState<{ id: string; nome: string; userId?: string; email?: string } | null>(null);
  const [evolucaoIndicador, setEvolucaoIndicador] = useState<{ evolucaoPeso: { weekIndex: number; peso: number }[]; pesoInicial?: number } | null>(null);

  // Estatísticas do médico (página pública)
  type EstatisticasPayload = {
    counts: { total: number; pendentes: number; emTratamento: number; concluidos: number; abandono: number };
    demografia: { idadeMedia: number; totalComIdade: number; faixasEtarias: Record<string, number>; porcentagensFaixas: Record<string, number>; homens: number; mulheres: number; totalGenero: number; dadosGenero: { name: string; value: number; porcentagem: number }[] };
    geografia: { dadosCidades: { cidadeEstado: string; count: number; porcentagem: number }[]; totalComCidade: number };
    perdaPeso: { mediasPorSemana: { semana: number; media: number; quantidade: number }[] };
    totais?: { mgAplicadaTotal: number; kgPerdidoTotal: number };
  };
  const [estatisticasMeus, setEstatisticasMeus] = useState<EstatisticasPayload | null>(null);
  const [estatisticasOftware, setEstatisticasOftware] = useState<EstatisticasPayload | null>(null);
  const [loadingEstatisticas, setLoadingEstatisticas] = useState(false);
  const [filtroBaseDemografia, setFiltroBaseDemografia] = useState<'meus' | 'oftware'>('meus');
  const [filtroBasePerdaPeso, setFiltroBasePerdaPeso] = useState<'meus' | 'oftware'>('meus');
  const [filtroDosePerdaPeso, setFiltroDosePerdaPeso] = useState<string>('todas');
  const [filtroFaixaEtariaPerdaPeso, setFiltroFaixaEtariaPerdaPeso] = useState<string>('todas');
  const [filtroSexoPerdaPeso, setFiltroSexoPerdaPeso] = useState<string>('todos');
  const [erroEstatisticas, setErroEstatisticas] = useState<string | null>(null);
  const [showDesempenhoFireworks, setShowDesempenhoFireworks] = useState(false);
  const [informacoesPessoaisAberto, setInformacoesPessoaisAberto] = useState(false);
  const [estatisticasTratamentoAberto, setEstatisticasTratamentoAberto] = useState(false);
  const [depoimentos, setDepoimentos] = useState<{ pacienteId: string; nome: string; cidadeEstado: string | null; idade: number | null; depoimento: string; estrelas: number; pesoInicialKg: number | null; pesoAtualKg: number | null; perdaTotalKg: number | null; perdaPercentual: number | null; evolucao: { weekIndex: number; peso: number; doseMg: number }[] }[]>([]);
  const [loadingDepoimentos, setLoadingDepoimentos] = useState(false);
  const [depoimentoIndex, setDepoimentoIndex] = useState(0);
  const [depoimentosPausado, setDepoimentosPausado] = useState(false);
  const [depoimentoSelecionado, setDepoimentoSelecionado] = useState<{ pacienteId: string; nome: string; cidadeEstado: string | null; idade: number | null; depoimento: string; estrelas: number; pesoInicialKg: number | null; pesoAtualKg: number | null; perdaTotalKg: number | null; perdaPercentual: number | null; evolucao: { weekIndex: number; peso: number; doseMg: number }[] } | null>(null);
  const [showModalDepoimento, setShowModalDepoimento] = useState(false);

  // Extrair nome e sobrenome da URL
  // dr/ricardo-mota -> apenas médico
  // dr/ricardo-mota/maria-silva -> médico + nutricionista ou personal trainer
  // dr/ricardo-mota/paciente/joao-silva -> médico + paciente indicador (Indicar Médico)
  const slug = params?.slug as string[] || [];
  const nomeSobrenomeMedico = slug[0] || '';
  const nomeSobrenomeProfissional = slug[1] === 'paciente' ? null : (slug[1] || null);
  const slugPacienteIndicador = slug[1] === 'paciente' && slug[2] ? slug[2] : null;

  useEffect(() => {
    // Buscar médico e nutricionista pelo nome e sobrenome
    const buscarDados = async () => {
      if (!nomeSobrenomeMedico) {
        setError('Link inválido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Remover "dr" se presente no início
        const nomeLimpoMedico = nomeSobrenomeMedico.replace(/^dr-/, '').replace(/^-/, '');
        
        // Buscar médico via API route (server-side)
        const responseMedico = await fetch(`/api/medico-por-nome?nome=${encodeURIComponent(nomeLimpoMedico)}`);
        
        if (!responseMedico.ok) {
          if (responseMedico.status === 404) {
            setError('Médico não encontrado');
          } else {
            setError('Erro ao carregar informações do médico');
          }
          setLoading(false);
          return;
        }
        
        const medicoData = await responseMedico.json();
        setMedico(medicoData as Medico);

        // Se houver profissional secundário na URL, buscar também (personal ou nutricionista)
        // Para links do MetaPersonal: tentar PERSONAL primeiro (nunca chamar API de nutricionista).
        if (nomeSobrenomeProfissional) {
          const nomeLimpoProfissional = nomeSobrenomeProfissional.replace(/^-/, '');
          
          // Tentar buscar personal trainer primeiro (links do MetaPersonal)
          const responsePersonal = await fetch(`/api/personal-por-nome?nome=${encodeURIComponent(nomeLimpoProfissional)}`);
          
          if (responsePersonal.ok) {
            const personalData = await responsePersonal.json();
            
            // Validar que o personal está vinculado ao médico
            if (!personalData.medicoVinculadoIds || !personalData.medicoVinculadoIds.includes(medicoData.id)) {
              setError('Personal Trainer não está vinculado a este médico');
              setLoading(false);
              return;
            }

            // Validar que está ativo e verificado
            if (!personalData.isVerificado || personalData.status !== 'ativo') {
              setError('Personal Trainer não está ativo ou verificado');
              setLoading(false);
              return;
            }

            setPersonalTrainer(personalData as PersonalTrainerDoc);
          } else {
            // Se não encontrou personal, tentar nutricionista (links do MetaNutri)
            const responseNutri = await fetch(`/api/nutricionista-por-nome?nome=${encodeURIComponent(nomeLimpoProfissional)}`);
            
            if (!responseNutri.ok) {
              if (responseNutri.status === 404) {
                setError('Profissional não encontrado');
              } else {
                setError('Erro ao carregar informações do profissional');
              }
              setLoading(false);
              return;
            }

            const nutriData = await responseNutri.json();
            
            // Validar que o nutricionista está vinculado ao médico
            if (!nutriData.medicoVinculadoIds || !nutriData.medicoVinculadoIds.includes(medicoData.id)) {
              setError('Nutricionista não está vinculado a este médico');
              setLoading(false);
              return;
            }

            // Validar que está ativo e verificado
            if (!nutriData.isVerificado || nutriData.status !== 'ativo') {
              setError('Nutricionista não está ativo ou verificado');
              setLoading(false);
              return;
            }

            setNutricionista(nutriData as NutricionistaDoc);
          }
        }
        // Se houver paciente indicador na URL (fluxo "Indicar Médico")
        if (slugPacienteIndicador && medicoData.id) {
          const incluirEvolucao = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('evolucao') === '1';
          const responsePaciente = await fetch(
            `/api/paciente-por-nome?nome=${encodeURIComponent(slugPacienteIndicador)}&medicoId=${encodeURIComponent(medicoData.id)}${incluirEvolucao ? '&incluirEvolucao=true' : ''}`
          );
          if (!responsePaciente.ok) {
            if (responsePaciente.status === 404) {
              setError('Paciente indicador não encontrado');
            } else {
              setError('Erro ao carregar informações do paciente');
            }
            setLoading(false);
            return;
          }
          const pacienteData = await responsePaciente.json();
          if (pacienteData.medicoResponsavelId !== medicoData.id) {
            setError('Paciente não está vinculado a este médico');
            setLoading(false);
            return;
          }
          if (pacienteData.statusTratamento === 'abandono') {
            setError('Este link de indicação não está mais ativo');
            setLoading(false);
            return;
          }
          setPacienteIndicador({
            id: pacienteData.id,
            nome: pacienteData.nome || 'Paciente',
            userId: pacienteData.userId,
            email: pacienteData.email,
          });
          if (incluirEvolucao && pacienteData.evolucaoPeso && Array.isArray(pacienteData.evolucaoPeso)) {
            const pontos = pacienteData.evolucaoPeso.map((p: { weekIndex?: number; peso?: number }) => ({
              weekIndex: p.weekIndex ?? 0,
              peso: p.peso ?? 0,
            })).filter((p: { peso: number }) => p.peso > 0);
            setEvolucaoIndicador({
              evolucaoPeso: pontos,
              pesoInicial: pacienteData.pesoInicial,
            });
          } else {
            setEvolucaoIndicador(null);
          }
        } else {
          setPacienteIndicador(null);
          setEvolucaoIndicador(null);
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
        setError('Erro ao carregar informações');
      } finally {
        setLoading(false);
      }
    };

    buscarDados();
  }, [nomeSobrenomeMedico, nomeSobrenomeProfissional, slugPacienteIndicador]);

  useEffect(() => {
    if (!medico?.id) return;
    fetch(`/api/classificacao-medico?medicoId=${encodeURIComponent(medico.id)}`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Falha ao carregar classificação')))
      .then((data: { count: number; media: number }) => setAgregadoMedico(data))
      .catch(() => setAgregadoMedico({ count: 0, media: 0 }));
  }, [medico?.id]);

  useEffect(() => {
    if (!medico?.id) return;
    setLoadingDepoimentos(true);
    fetch(`/api/depoimentos-medico?medicoId=${encodeURIComponent(medico.id)}`)
      .then((res) => (res.ok ? res.json() : { depoimentos: [] }))
      .then(
        (data: {
          depoimentos: {
            pacienteId: string;
            nome: string;
            cidadeEstado: string | null;
            idade: number | null;
            depoimento: string;
            estrelas: number;
            pesoInicialKg: number | null;
            pesoAtualKg: number | null;
            perdaTotalKg: number | null;
            perdaPercentual: number | null;
            evolucao: { weekIndex: number; peso: number; doseMg: number }[];
          }[];
        }) => {
          setDepoimentos(data.depoimentos || []);
          setDepoimentoIndex(0);
        }
      )
      .catch(() => setDepoimentos([]))
      .finally(() => setLoadingDepoimentos(false));
  }, [medico?.id]);

  useEffect(() => {
    if (depoimentos.length <= 1 || depoimentosPausado) return;
    const t = setInterval(() => {
      setDepoimentoIndex((i) => (i + 1) % depoimentos.length);
    }, 10000);
    return () => clearInterval(t);
  }, [depoimentos.length, depoimentosPausado]);

  const loadEstatisticasMedico = async (base: 'meus' | 'oftware', sexo?: string, faixaEtaria?: string, dose?: string) => {
    if (!medico?.id && base === 'meus') return;
    setLoadingEstatisticas(true);
    setErroEstatisticas(null);
    try {
      const params = new URLSearchParams({ base });
      if (base === 'meus' && medico?.id) params.set('medicoId', medico.id);
      if (sexo) params.set('sexo', sexo);
      if (faixaEtaria) params.set('faixaEtaria', faixaEtaria);
      if (dose) params.set('dose', dose);
      const res = await fetch(`/api/estatisticas-medico?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao carregar estatísticas');
      if (base === 'meus') setEstatisticasMeus(data);
      else setEstatisticasOftware(data);
    } catch (e) {
      console.error('Erro ao carregar estatísticas:', e);
      setErroEstatisticas(e instanceof Error ? e.message : 'Não foi possível carregar as estatísticas.');
    } finally {
      setLoadingEstatisticas(false);
    }
  };

  useEffect(() => {
    if (filtroBaseDemografia === 'oftware' && !estatisticasOftware && medico?.id) {
      loadEstatisticasMedico('oftware', filtroSexoPerdaPeso, filtroFaixaEtariaPerdaPeso, filtroDosePerdaPeso);
    }
  }, [filtroBaseDemografia, estatisticasOftware, medico?.id]);

  useEffect(() => {
    if (filtroBasePerdaPeso === 'oftware' && !estatisticasOftware && medico?.id) {
      loadEstatisticasMedico('oftware', filtroSexoPerdaPeso, filtroFaixaEtariaPerdaPeso, filtroDosePerdaPeso);
    }
  }, [filtroBasePerdaPeso, estatisticasOftware, medico?.id]);

  useEffect(() => {
    if (!medico?.id) return;
    loadEstatisticasMedico(filtroBasePerdaPeso, filtroSexoPerdaPeso, filtroFaixaEtariaPerdaPeso, filtroDosePerdaPeso);
  }, [medico?.id, filtroBasePerdaPeso, filtroSexoPerdaPeso, filtroFaixaEtariaPerdaPeso, filtroDosePerdaPeso]);

  useEffect(() => {
    // Observar mudanças no estado de autenticação
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser && medico) {
        // Buscar paciente pelo email
        try {
          const pacienteData = await PacienteService.getPacienteByEmail(currentUser.email || '');
          setPaciente(pacienteData);
          
          // Verificar se já existe uma solicitação deste paciente para este médico
          const solicitacoes = await SolicitacaoMedicoService.getSolicitacoesPorPaciente(currentUser.email || '');
          const solicitacaoExistente = solicitacoes.find(s => s.medicoId === medico.id);
          
          if (solicitacaoExistente && !isEmbed) {
            console.log('Paciente já possui solicitação para este médico. Redirecionando...');
            router.push(`/meta?drMedico=${encodeURIComponent(medico.id)}`);
            return;
          }
        } catch (err) {
          console.error('Erro ao buscar paciente:', err);
        }
      }
    });

    return () => unsubscribe();
  }, [medico, router, isEmbed]);

  // Verificar solicitação existente quando médico e usuário estiverem disponíveis
  useEffect(() => {
    const verificarSolicitacaoExistente = async () => {
      if (user && medico && user.email) {
        try {
          const solicitacoes = await SolicitacaoMedicoService.getSolicitacoesPorPaciente(user.email);
          const solicitacaoExistente = solicitacoes.find(s => s.medicoId === medico.id);
          
          if (solicitacaoExistente && !isEmbed) {
            console.log('Paciente já possui solicitação para este médico. Redirecionando...');
            router.push(`/meta?drMedico=${encodeURIComponent(medico.id)}`);
          }
        } catch (err) {
          console.error('Erro ao verificar solicitação existente:', err);
        }
      }
    };

    verificarSolicitacaoExistente();
  }, [user, medico, router, isEmbed]);

  // Event listeners para arrastar o marcador de IMC no modal (mouse)
  useEffect(() => {
    if (!isDraggingIMCModal || !showTelefoneModal) return;
    const alturaCm = alturaInputParaCm(alturaPacienteModal);
    const alturaMetros = alturaCm ? alturaCm / 100 : null;
    if (!alturaMetros) return;

    const handleMouseMove = (e: MouseEvent) => {
      const barraRef = barraIMCRefModal.current;
      if (!barraRef) return;
      const rect = barraRef.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentual = Math.max(0, Math.min(100, (x / rect.width) * 100));

      const percentualParaIMC = (percent: number): number => {
        const p = Math.max(0, Math.min(100, percent));
        if (p <= 25) return (p / 25) * 18.5;
        if (p <= 50) return 18.5 + ((p - 25) / 25) * (25 - 18.5);
        if (p <= 75) return 25 + ((p - 50) / 25) * (30 - 25);
        return 30 + ((p - 75) / 25) * 20;
      };
      const imcParaPeso = (imc: number) => imc * (alturaMetros * alturaMetros);

      const novoIMC = percentualParaIMC(percentual);
      setImcTemporarioIMCModal(novoIMC);
      setPesoTemporarioIMCModal(imcParaPeso(novoIMC));
    };

    const handleMouseUp = () => {
      setIsDraggingIMCModal(false);
      setPesoTemporarioIMCModal(null);
      setImcTemporarioIMCModal(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingIMCModal, showTelefoneModal, alturaPacienteModal]);

  // Event listeners para arrastar o marcador de IMC no modal (touch)
  useEffect(() => {
    if (!isDraggingIMCModal || !showTelefoneModal) return;
    const alturaCm = alturaInputParaCm(alturaPacienteModal);
    const alturaMetros = alturaCm ? alturaCm / 100 : null;
    if (!alturaMetros) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const barraRef = barraIMCRefModal.current;
      if (!barraRef) return;
      const rect = barraRef.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const percentual = Math.max(0, Math.min(100, (x / rect.width) * 100));

      const percentualParaIMC = (percent: number): number => {
        const p = Math.max(0, Math.min(100, percent));
        if (p <= 25) return (p / 25) * 18.5;
        if (p <= 50) return 18.5 + ((p - 25) / 25) * (25 - 18.5);
        if (p <= 75) return 25 + ((p - 50) / 25) * (30 - 25);
        return 30 + ((p - 75) / 25) * 20;
      };
      const imcParaPeso = (imc: number) => imc * (alturaMetros * alturaMetros);

      const novoIMC = percentualParaIMC(percentual);
      setImcTemporarioIMCModal(novoIMC);
      setPesoTemporarioIMCModal(imcParaPeso(novoIMC));
    };

    const handleTouchEnd = () => {
      setIsDraggingIMCModal(false);
      setPesoTemporarioIMCModal(null);
      setImcTemporarioIMCModal(null);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingIMCModal, showTelefoneModal, alturaPacienteModal]);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      // O onAuthStateChanged vai detectar o login e buscar o paciente
    } catch (err: any) {
      console.error('Erro ao fazer login:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelado. Por favor, tente novamente.');
      } else {
        setError('Erro ao fazer login com Google. Tente novamente.');
      }
    }
  };

  const handleCriarSolicitacao = async () => {
    if (!telefone.trim()) {
      setError('Por favor, informe seu telefone.');
      return;
    }

    if (!user?.email || !medico) {
      setError('Erro: Dados incompletos. Recarregue a página.');
      return;
    }

    try {
      setCriandoSolicitacao(true);
      setError(null);

      const pacienteNome = paciente?.nome || 
                          paciente?.dadosIdentificacao?.nomeCompleto || 
                          user.displayName || 
                          'Paciente';

      let pacienteIdFinal = paciente?.id;
      const temProfissionalSecundario = nutricionista || personalTrainer;
      const pesoVal = pesoTemporarioIMCModal ?? parseFloat(pesoPacienteModal);
      const alturaVal = alturaInputParaCm(alturaPacienteModal);

      // Obter ou criar paciente e salvar peso/altura/imc se preenchidos
      if (pesoVal && pesoVal > 0 && alturaVal && alturaVal > 0) {
        const alturaMetros = alturaVal / 100;
        const imcVal = pesoVal / (alturaMetros * alturaMetros);
        const medidasIniciais = {
          ...paciente?.dadosClinicos?.medidasIniciais,
          peso: pesoVal,
          altura: alturaVal,
          imc: imcVal
        };

        let pacienteParaSalvar = paciente;
        if (!pacienteParaSalvar?.id) {
          pacienteParaSalvar = await PacienteService.getPacienteByEmail(user.email || '')
            ?? await PacienteService.getPacienteByUserId(user.uid);
        }

        if (pacienteParaSalvar?.id) {
          const pacienteAtualizado: PacienteCompleto = {
            ...pacienteParaSalvar,
            dadosClinicos: {
              ...pacienteParaSalvar.dadosClinicos,
              medidasIniciais
            }
          };
          pacienteIdFinal = await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
          setPaciente(pacienteAtualizado);
        } else {
          // Criar paciente novo com medidas iniciais
          const pacienteNovo = {
            userId: user.uid,
            email: user.email || '',
            nome: pacienteNome,
            medicoResponsavelId: medico.id,
            dadosIdentificacao: {
              nomeCompleto: pacienteNome,
              email: user.email || '',
              telefone: telefone.replace(/\D/g, ''),
              dataCadastro: new Date()
            },
            dadosClinicos: {
              medidasIniciais,
              comorbidades: {}
            },
            estiloVida: {},
            examesLaboratoriais: [],
            planoTerapeutico: { metas: {} },
            evolucaoSeguimento: [],
            alertas: [],
            comunicacao: { mensagens: [], anexos: [], logsAuditoria: [] },
            indicadores: { tempoEmTratamento: { dias: 0, semanas: 0 }, adesaoMedia: 0, incidenciaEfeitosAdversos: { total: 0, grave: 0, moderado: 0, leve: 0 } },
            status: 'ativo' as const,
            statusTratamento: 'pendente' as const,
            dataCadastro: new Date()
          };
          pacienteIdFinal = await PacienteService.createOrUpdatePaciente(pacienteNovo as PacienteCompleto);
          setPaciente({ ...pacienteNovo, id: pacienteIdFinal } as PacienteCompleto);
        }
      }

      // Se houver profissional secundário e paciente ainda não existe, criar paciente básico
      
      if (temProfissionalSecundario && !pacienteIdFinal && user.email) {
        try {
          console.log('📋 Criando paciente básico para vincular ao profissional...');
          const medidasIniciaisBasico: { peso?: number; altura?: number; imc?: number } = {};
          if (pesoVal && pesoVal > 0 && alturaVal !== null && alturaVal > 0) {
            const altM = alturaVal / 100;
            medidasIniciaisBasico.peso = pesoVal;
            medidasIniciaisBasico.altura = alturaVal;
            medidasIniciaisBasico.imc = pesoVal / (altM * altM);
          }
          const pacienteBasico = {
            userId: user.uid,
            email: user.email, // Campo necessário para getPacienteByEmail funcionar
            nome: pacienteNome,
            medicoResponsavelId: medico.id,
            dadosIdentificacao: {
              nomeCompleto: pacienteNome,
              email: user.email,
              telefone: telefone.replace(/\D/g, ''),
              dataCadastro: new Date()
            },
            dadosClinicos: {
              comorbidades: {},
              medidasIniciais: Object.keys(medidasIniciaisBasico).length > 0 ? medidasIniciaisBasico : undefined
            },
            estiloVida: {},
            examesLaboratoriais: [],
            planoTerapeutico: {
              metas: {}
            },
            evolucaoSeguimento: [],
            alertas: [],
            comunicacao: {
              mensagens: [],
              anexos: [],
              logsAuditoria: []
            },
            indicadores: {
              tempoEmTratamento: {
                dias: 0,
                semanas: 0
              },
              adesaoMedia: 0,
              incidenciaEfeitosAdversos: {
                total: 0,
                grave: 0,
                moderado: 0,
                leve: 0
              }
            },
            status: 'ativo' as const,
            statusTratamento: 'pendente' as const
          };
          
          pacienteIdFinal = await PacienteService.createOrUpdatePaciente(pacienteBasico);
          console.log('✅ Paciente criado com ID:', pacienteIdFinal);
          // Atualizar estado local
          setPaciente({ ...pacienteBasico, id: pacienteIdFinal } as PacienteCompleto);
        } catch (pacienteErr: any) {
          console.error('❌ Erro ao criar paciente:', pacienteErr);
          // Se houver profissional secundário, não podemos continuar sem o paciente
          throw new Error('Erro ao criar registro do paciente. A solicitação precisa do paciente cadastrado. Tente novamente.');
        }
      }

      // Se houver profissional secundário e ainda não temos pacienteId, não podemos continuar
      if (temProfissionalSecundario && !pacienteIdFinal) {
        throw new Error('Erro: Não foi possível criar o registro do paciente. Por favor, tente novamente.');
      }

      // Determinar info do profissional secundário
      let profissionalInfo = undefined;
      if (nutricionista && pacienteIdFinal) {
        profissionalInfo = {
          tipo: 'nutricionista' as const,
          profissionalId: nutricionista.id,
          profissionalNome: nutricionista.nome
        };
      } else if (personalTrainer && pacienteIdFinal) {
        profissionalInfo = {
          tipo: 'personal' as const,
          profissionalId: personalTrainer.id,
          profissionalNome: personalTrainer.nome
        };
      }

      // Determinar pacienteIndicador se vier do link "Indicar Médico"
      const pacienteIndicadorParam = pacienteIndicador
        ? {
            pacienteIndicadorId: pacienteIndicador.id,
            pacienteIndicadorNome: pacienteIndicador.nome,
            pacienteIndicadorUserId: pacienteIndicador.email || pacienteIndicador.userId || undefined,
          }
        : undefined;

      // Criar solicitação para o médico (com informações do profissional ou paciente indicador se houver)
      await SolicitacaoMedicoService.criarSolicitacao(
        {
          pacienteEmail: user.email,
          pacienteNome,
          pacienteTelefone: telefone.replace(/\D/g, ''),
          pacienteId: pacienteIdFinal,
          medicoId: medico.id,
          medicoNome: medico.nome,
          status: 'pendente'
        },
        undefined, // emailIndicador
        profissionalInfo,
        pacienteIndicadorParam
      );

      setSolicitacaoCriada(true);
      setShowTelefoneModal(false);
      
      // Redirecionar para /meta após 2 segundos (mantém médico do link para o chat não pedir busca de médico)
      setTimeout(() => {
        router.push(`/meta?drMedico=${encodeURIComponent(medico.id)}`);
      }, 2000);
    } catch (err) {
      console.error('Erro ao criar solicitação:', err);
      setError('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setCriandoSolicitacao(false);
    }
  };

  const kpiPacientes = estatisticasMeus?.counts.total ?? 0;
  const kpiPendentes = estatisticasMeus?.counts.pendentes ?? 0;
  const kpiTratamento = estatisticasMeus?.counts.emTratamento ?? 0;
  const kpiConcluido = estatisticasMeus?.counts.concluidos ?? 0;
  const kpiMgAplicada = estatisticasMeus?.totais?.mgAplicadaTotal ?? 0;
  const kpiKgPerdido = estatisticasMeus?.totais?.kgPerdidoTotal ?? 0;

  const hasKpiData = !!estatisticasMeus;
  const countPacientes = useCountUp(kpiPacientes, 1600, hasKpiData, 0);
  const countPendentes = useCountUp(kpiPendentes, 1600, hasKpiData, 0);
  const countTratamento = useCountUp(kpiTratamento, 1600, hasKpiData, 0);
  const countConcluido = useCountUp(kpiConcluido, 1600, hasKpiData, 0);
  const countMgAplicada = useCountUp(kpiMgAplicada, 1850, hasKpiData, 1);
  const countKgPerdido = useCountUp(kpiKgPerdido, 1850, hasKpiData, 1);

  useEffect(() => {
    if (!estatisticasMeus) {
      setShowDesempenhoFireworks(false);
      return;
    }
    // Dispara fogos quando a animação finaliza e houver resultado de perda.
    const timer = setTimeout(() => {
      if ((estatisticasMeus.totais?.kgPerdidoTotal ?? 0) > 0) {
        setShowDesempenhoFireworks(true);
      }
    }, 1950);
    const hideTimer = setTimeout(() => setShowDesempenhoFireworks(false), 4900);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [estatisticasMeus]);

  // Determinar se há profissional secundário (nutricionista ou personal) ou paciente indicador
  const profissionalSecundario = nutricionista || personalTrainer;
  const tipoProfissional = nutricionista ? 'nutricionista' : personalTrainer ? 'personal' : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: PAGE_BG }}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#4CCB7A] animate-spin mx-auto mb-4" />
          <p className="text-[#E8EDED]/80">
            {profissionalSecundario ? 'Carregando informações...' : 'Carregando informações do médico...'}
          </p>
        </div>
      </div>
    );
  }

  if (error && !medico) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: PAGE_BG }}>
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center border border-white/10">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {nomeSobrenomeProfissional ? 'Link inválido' : 'Médico não encontrado'}
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 rounded-lg font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  if (!medico) return null;

  const tituloMedico = medico.genero === 'F' ? 'Dra.' : 'Dr.';
  const nomeCompleto = `${tituloMedico} ${medico.nome}`;

  return (
    <div
      className={`min-h-screen relative ${isEmbed ? 'min-h-0' : ''}`}
      style={{ backgroundColor: PAGE_BG }}
    >
      {!isEmbed && (
        <div
          className="fixed top-0 right-0 z-[1] flex items-start justify-end p-3 sm:p-5 pointer-events-none"
          aria-hidden
        >
          <img
            src="/simbolo-metodo.png"
            alt=""
            className="w-[min(200px,35vw)] h-auto opacity-[0.07]"
          />
        </div>
      )}
      <div className={`relative z-10 container mx-auto px-4 max-w-4xl ${isEmbed ? 'py-4' : 'py-12'}`}>
        {/* Banner Paciente Indicador */}
        {pacienteIndicador && (
          <>
            <div className="bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3] rounded-2xl shadow-xl p-6 mb-6 text-center">
              <p className="text-lg sm:text-xl font-semibold text-white leading-relaxed">
                <span className="font-bold">{pacienteIndicador.nome}</span> está recomendando fazer{' '}
                <span className="font-bold">O Método Emagrecer</span> com {nomeCompleto}
              </p>
            </div>
            {/* Gráfico da evolução (quando compartilhou) */}
            {evolucaoIndicador && evolucaoIndicador.evolucaoPeso.length > 0 && (
              <div className={`${SHELL_CARD} p-4 sm:p-5 mb-6`}>
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-emerald-100/80">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingDown size={22} className="text-emerald-600" />
                  Evolução de {pacienteIndicador.nome} no tratamento
                </h3>
                {(() => {
                  const pontos = evolucaoIndicador.evolucaoPeso;
                  const pesoInicial = evolucaoIndicador.pesoInicial ?? pontos[0]?.peso;
                  const pesoAtual = pontos[pontos.length - 1]?.peso ?? pesoInicial;
                  const perdaKg = pesoInicial && pesoAtual ? pesoInicial - pesoAtual : 0;
                  const perdaPct = pesoInicial && pesoInicial > 0 && perdaKg > 0
                    ? ((perdaKg / pesoInicial) * 100).toFixed(1)
                    : null;
                  const chartData = pontos.map((p) => ({ semana: `S${p.weekIndex}`, peso: p.peso, pesoFormatado: `${p.peso.toFixed(1)} kg` }));
                  return (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-emerald-700 font-medium">Peso inicial</p>
                          <p className="text-lg font-bold text-emerald-900">{pesoInicial ? `${pesoInicial.toFixed(1)} kg` : '-'}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-emerald-700 font-medium">Peso atual</p>
                          <p className="text-lg font-bold text-emerald-900">{pesoAtual ? `${pesoAtual.toFixed(1)} kg` : '-'}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-emerald-700 font-medium">Perda total</p>
                          <p className="text-lg font-bold text-emerald-900">{perdaKg > 0 ? `-${perdaKg.toFixed(1)} kg` : '-'}</p>
                        </div>
                        {perdaPct && (
                          <div className="bg-emerald-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-emerald-700 font-medium">Percentual</p>
                            <p className="text-lg font-bold text-emerald-900">-{perdaPct}%</p>
                          </div>
                        )}
                      </div>
                      <div className="h-48 sm:h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="semana" tick={{ fontSize: 12 }} stroke="#6b7280" />
                            <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" unit=" kg" domain={['auto', 'auto']} />
                            <Tooltip formatter={(val: number) => [`${val.toFixed(1)} kg`, 'Peso']} contentStyle={{ borderRadius: 8 }} />
                            <Line type="monotone" dataKey="peso" stroke="#059669" strokeWidth={2} dot={{ fill: '#059669', r: 4 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  );
                })()}
                </div>
              </div>
            )}
          </>
        )}
        {/* Header */}
        <div className={`${SHELL_CARD} p-8 mb-8`}>
          {profissionalSecundario ? (
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center justify-center gap-4">
                {/* Ícone do Médico */}
                <div className="flex flex-col items-center gap-2">
                  <div className={AVATAR_MEDICO_WRAP}>
                    {medico.fotoPerfilUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={medico.fotoPerfilUrl}
                        alt=""
                        className={`${AVATAR_MEDICO_FACE} object-cover`}
                      />
                    ) : (
                      <div
                        className={`flex ${AVATAR_MEDICO_FACE} items-center justify-center bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3]`}
                      >
                        <Stethoscope className="h-14 w-14 text-white sm:h-16 sm:w-16 md:h-[4.25rem] md:w-[4.25rem]" strokeWidth={1.75} />
                      </div>
                    )}
                    {medico.isVerificado ? <SeloVerificadoInstagram /> : null}
                  </div>
                  <span className="text-sm font-medium text-[#E8EDED]/80">Médico</span>
                </div>
                
                {/* Ícone do Profissional (Nutricionista ou Personal) */}
                <div className="flex flex-col items-center gap-2">
                  {tipoProfissional === 'nutricionista' ? (
                    <div className="relative bg-gradient-to-br from-blue-500 to-blue-700 p-3 md:p-5 rounded-2xl shadow-lg">
                      <UtensilsCrossed size={32} className="md:w-16 md:h-16 text-white" />
                      {profissionalSecundario.isVerificado ? <SeloVerificadoInstagram /> : null}
                    </div>
                  ) : (
                    <div className="relative bg-gradient-to-br from-yellow-500 to-yellow-700 p-3 md:p-5 rounded-2xl shadow-lg">
                      <Dumbbell size={32} className="md:w-16 md:h-16 text-white" />
                      {profissionalSecundario.isVerificado ? <SeloVerificadoInstagram /> : null}
                    </div>
                  )}
                  <span className="text-sm font-medium text-[#E8EDED]/80">
                    {tipoProfissional === 'nutricionista' ? 'Nutricionista' : 'Personal Trainer'}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-bold text-[#E8EDED] mb-2">{nomeCompleto}</h1>
                {medico.crm && (
                  <p className="text-lg text-[#E8EDED]/75 mb-1">
                    CRM-{medico.crm.estado} {medico.crm.numero}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={18}
                      className={agregadoMedico && agregadoMedico.count > 0 && s <= Math.round(agregadoMedico.media) ? 'text-yellow-400 fill-yellow-400' : 'text-[#E8EDED]/30'}
                    />
                  ))}
                  <span className="text-sm text-[#E8EDED]/70">
                    {agregadoMedico && agregadoMedico.count > 0
                      ? `${agregadoMedico.media.toFixed(1)} (${agregadoMedico.count} avaliação${agregadoMedico.count !== 1 ? 'ões' : ''})`
                      : 'Sem avaliações'}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-lg font-semibold text-[#E8EDED]/85 mb-1">
                    {tipoProfissional === 'nutricionista' ? 'Nutricionista' : 'Personal Trainer'}
                  </p>
                  <p className="text-xl text-[#E8EDED]">{profissionalSecundario.nome}</p>
                  {profissionalSecundario.registroNumero && (
                    <p className="text-sm text-[#E8EDED]/65 mt-1">
                      {tipoProfissional === 'nutricionista' ? 'CRN' : 'CREF'}: {profissionalSecundario.registroNumero}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center justify-center gap-4">
                {/* Ícone do Médico */}
                <div className="flex flex-col items-center gap-2">
                  <div className={AVATAR_MEDICO_WRAP}>
                    {medico.fotoPerfilUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={medico.fotoPerfilUrl}
                        alt=""
                        className={`${AVATAR_MEDICO_FACE} object-cover`}
                      />
                    ) : (
                      <div
                        className={`flex ${AVATAR_MEDICO_FACE} items-center justify-center bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3]`}
                      >
                        <Stethoscope className="h-14 w-14 text-white sm:h-16 sm:w-16 md:h-[4.25rem] md:w-[4.25rem]" strokeWidth={1.75} />
                      </div>
                    )}
                    {medico.isVerificado ? <SeloVerificadoInstagram /> : null}
                  </div>
                  <span className="text-sm font-medium text-[#E8EDED]/80">Médico</span>
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-bold text-[#E8EDED] mb-2">{nomeCompleto}</h1>
                {medico.crm && (
                  <p className="text-lg text-[#E8EDED]/75 mb-1">
                    CRM-{medico.crm.estado} {medico.crm.numero}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={18}
                      className={agregadoMedico && agregadoMedico.count > 0 && s <= Math.round(agregadoMedico.media) ? 'text-yellow-400 fill-yellow-400' : 'text-[#E8EDED]/30'}
                    />
                  ))}
                  <span className="text-sm text-[#E8EDED]/70">
                    {agregadoMedico && agregadoMedico.count > 0
                      ? `${agregadoMedico.media.toFixed(1)} (${agregadoMedico.count} avaliação${agregadoMedico.count !== 1 ? 'ões' : ''})`
                      : 'Sem avaliações'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Informações Pessoais do Médico */}
        <div className={`${SHELL_CARD} p-8 mb-8`}>
          <button
            type="button"
            onClick={() => setInformacoesPessoaisAberto((v) => !v)}
            className="w-full flex items-center justify-between text-left mb-6"
          >
            <h2 className="text-xl font-bold text-[#E8EDED]">Informações Pessoais</h2>
            {informacoesPessoaisAberto ? <ChevronUp className="h-6 w-6 text-[#E8EDED]/55" /> : <ChevronDown className="h-6 w-6 text-[#E8EDED]/55" />}
          </button>

          {informacoesPessoaisAberto && (
          <div className="space-y-4">
            {medico.localizacao?.endereco && (
              <div className="flex items-start gap-4">
                <MapPin className="h-6 w-6 text-[#4CCB7A] mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#E8EDED]">Endereço</p>
                  <p className="text-[#E8EDED]/75">{medico.localizacao.endereco}</p>
                  {medico.localizacao.pontoReferencia && (
                    <p className="text-sm text-[#E8EDED]/55 mt-1">
                      {medico.localizacao.pontoReferencia}
                    </p>
                  )}
                </div>
              </div>
            )}

            {medico.telefone && (
              <div className="flex items-start gap-4">
                <Phone className="h-6 w-6 text-[#4CCB7A] mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#E8EDED]">Telefone</p>
                  <p className="text-[#E8EDED]/75">{medico.telefone}</p>
                </div>
              </div>
            )}

            {medico.email && (
              <div className="flex items-start gap-4">
                <Mail className="h-6 w-6 text-[#4CCB7A] mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#E8EDED]">E-mail</p>
                  <p className="text-[#E8EDED]/75">{medico.email}</p>
                </div>
              </div>
            )}

            {medico.cidades && medico.cidades.length > 0 && (
              <div className="flex items-start gap-4">
                <MapPin className="h-6 w-6 text-[#4CCB7A] mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#E8EDED]">Cidades de Atendimento</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {medico.cidades.map((cidade, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full text-sm bg-[#4CCB7A]/20 text-[#B8F0CC] border border-[#4CCB7A]/35"
                      >
                        {cidade.cidade}, {cidade.estado}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Desempenho do Médico */}
        <div className={`${SHELL_CARD} p-8 mb-8 relative overflow-hidden`}>
          {showDesempenhoFireworks && (
            <div className="absolute inset-0 pointer-events-none z-20" style={{ overflow: 'hidden', borderRadius: '16px' }}>
              {Array.from({ length: 14 }).map((_, fireworkIndex) => {
                const positions = [
                  { x: '16%', y: '34%' }, { x: '32%', y: '24%' }, { x: '50%', y: '20%' }, { x: '68%', y: '24%' }, { x: '84%', y: '34%' },
                  { x: '22%', y: '52%' }, { x: '40%', y: '44%' }, { x: '58%', y: '44%' }, { x: '76%', y: '52%' },
                  { x: '28%', y: '70%' }, { x: '50%', y: '62%' }, { x: '72%', y: '70%' }, { x: '40%', y: '82%' }, { x: '60%', y: '82%' },
                ];
                const position = positions[fireworkIndex % positions.length];
                const delay = fireworkIndex * 0.11;
                const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#ff6b9d', '#c44569', '#f8b500', '#00d2d3', '#ffa500', '#32cd32'];
                const particles = Array.from({ length: 12 }, (_, i) => {
                  const angle = (i * 360) / 12;
                  const distance = 24 + Math.random() * 36;
                  const x = Math.cos((angle * Math.PI) / 180) * distance;
                  const y = Math.sin((angle * Math.PI) / 180) * distance;
                  const color = colors[Math.floor(Math.random() * colors.length)];
                  const key = `dr-kpi-fw-${fireworkIndex}-${i}`;
                  return { x, y, color, key };
                });
                return (
                  <div key={`dr-kpi-fw-wrap-${fireworkIndex}`}>
                    {particles.map((particle) => {
                      const animationName = `dr-kpi-firework-${particle.key}`;
                      return (
                        <div key={particle.key}>
                          <div
                            className="absolute"
                            style={{
                              left: position.x,
                              top: position.y,
                              width: '7px',
                              height: '7px',
                              borderRadius: '999px',
                              backgroundColor: particle.color,
                              boxShadow: `0 0 10px ${particle.color}, 0 0 16px ${particle.color}`,
                              opacity: 0,
                              animation: `${animationName} 0.9s ease-out ${delay}s forwards`,
                            }}
                          />
                          <style>{`
                            @keyframes ${animationName} {
                              0% { transform: translate(-50%, -50%) translate(0, 0) scale(0); opacity: 0; }
                              8% { transform: translate(-50%, -50%) translate(0, 0) scale(1.2); opacity: 1; }
                              100% { transform: translate(-50%, -50%) translate(${particle.x}px, ${particle.y}px) scale(0); opacity: 0; }
                            }
                          `}</style>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
          <h2 className="text-xl font-bold text-[#E8EDED] mb-6">Desempenho do Médico</h2>
          {loadingEstatisticas && !estatisticasMeus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-[#4CCB7A] animate-spin" />
              <span className="ml-3 text-[#E8EDED]/75">Carregando desempenho...</span>
            </div>
          ) : erroEstatisticas ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-10 w-10 text-amber-400 mb-3" />
              <p className="text-[#E8EDED]/85 mb-2">{erroEstatisticas}</p>
              <button
                type="button"
                onClick={() => medico?.id && loadEstatisticasMedico('meus')}
                className="px-4 py-2 rounded-lg font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d]"
              >
                Tentar novamente
              </button>
            </div>
          ) : estatisticasMeus ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-[#0A1F44]/70 p-4 rounded-lg border border-white/10">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-green-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-[#E8EDED]/60">Pacientes</p>
                    <p className="text-xl font-semibold text-[#E8EDED] tabular-nums">{countPacientes.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#0A1F44]/70 p-4 rounded-lg border border-white/10">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-yellow-500" />
                  <div className="ml-3">
                    <p className="text-xs md:text-sm font-medium text-[#E8EDED]/60">Pendentes</p>
                    <p className="text-xl font-semibold text-[#E8EDED] tabular-nums">{countPendentes.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#0A1F44]/70 p-4 rounded-lg border border-white/10">
                <div className="flex items-center">
                  <Activity className="h-6 w-6 text-blue-500" />
                  <div className="ml-3">
                    <p className="text-xs md:text-sm font-medium text-[#E8EDED]/60">Tratamento</p>
                    <p className="text-xl font-semibold text-[#E8EDED] tabular-nums">{countTratamento.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#0A1F44]/70 p-4 rounded-lg border border-white/10">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div className="ml-3">
                    <p className="text-xs md:text-sm font-medium text-[#E8EDED]/60">Concluído</p>
                    <p className="text-xl font-semibold text-[#E8EDED] tabular-nums">{countConcluido.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#0A1F44]/70 p-4 rounded-lg border border-white/10">
                <div className="flex items-center">
                  <Syringe className="h-6 w-6 text-violet-400 shrink-0" />
                  <div className="ml-3 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-[#E8EDED]/60">mg aplicada</p>
                    <p className="text-xl font-semibold text-[#E8EDED] tabular-nums">
                      {countMgAplicada.toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-[#0A1F44]/70 p-4 rounded-lg border border-white/10">
                <div className="flex items-center">
                  <Scale className="h-6 w-6 text-amber-400 shrink-0" />
                  <div className="ml-3 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-[#E8EDED]/60">Kg Perdido</p>
                    <p className="text-xl font-semibold text-[#E8EDED] tabular-nums">
                      {`-${countKgPerdido.toFixed(1)}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Estatísticas de Tratamento — corpo branco em largura total do shell (sem card interno estreito) */}
        <div className={`${SHELL_CARD} p-0 mb-8 overflow-hidden`}>
          <button
            type="button"
            onClick={() => setEstatisticasTratamentoAberto((v) => !v)}
            className="w-full flex items-center justify-between text-left px-5 sm:px-6 py-5"
          >
            <h2 className="text-xl font-bold text-[#E8EDED]">Estatísticas de Tratamento</h2>
            {estatisticasTratamentoAberto ? <ChevronUp className="h-6 w-6 text-[#E8EDED]/55" /> : <ChevronDown className="h-6 w-6 text-[#E8EDED]/55" />}
          </button>

          {estatisticasTratamentoAberto && (
          <>
          {loadingEstatisticas && !estatisticasMeus ? (
            <div className="flex items-center justify-center py-12 px-5 sm:px-6">
              <Loader2 className="h-10 w-10 text-[#4CCB7A] animate-spin" />
              <span className="ml-3 text-[#E8EDED]/75">Carregando estatísticas...</span>
            </div>
          ) : erroEstatisticas ? (
            <div className="flex flex-col items-center justify-center py-12 px-5 sm:px-6 text-center">
              <AlertCircle className="h-12 w-12 text-amber-400 mb-3" />
              <p className="text-[#E8EDED]/85 mb-2">{erroEstatisticas}</p>
              <button
                type="button"
                onClick={() => medico?.id && loadEstatisticasMedico('meus')}
                className="px-4 py-2 rounded-lg font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d]"
              >
                Tentar novamente
              </button>
            </div>
          ) : estatisticasMeus ? (
            <div className="space-y-6 bg-[#0A1F44]/85 px-3 sm:px-5 md:px-6 py-5 sm:py-6 border-t border-white/10">
              {/* Demografia dos Pacientes */}
              <div className="border-t border-white/10 pt-6 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h3 className="text-lg font-semibold text-[#E8EDED]">Demografia dos Pacientes</h3>
                  <div>
                    <label className="block text-xs font-medium text-[#E8EDED]/90 mb-1.5">Base de Dados</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFiltroBaseDemografia('meus')}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                          filtroBaseDemografia === 'meus' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'
                        }`}
                      >
                        Desse médico
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltroBaseDemografia('oftware')}
                        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                          filtroBaseDemografia === 'oftware' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'
                        }`}
                      >
                        Base Oftware
                      </button>
                    </div>
                  </div>
                </div>
                {filtroBaseDemografia === 'oftware' && !estatisticasOftware && loadingEstatisticas ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#4CCB7A]" />
                    <span className="ml-3 text-[#E8EDED]/75">Carregando base Oftware...</span>
                  </div>
                ) : (() => {
                  const dados = filtroBaseDemografia === 'meus' ? estatisticasMeus : estatisticasOftware;
                  if (!dados?.demografia) return null;
                  const { idadeMedia, totalComIdade, porcentagensFaixas, dadosGenero, totalGenero } = dados.demografia;
                  const coresGenero = ['#3b82f6', '#ec4899'];
                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-[#E8EDED]/90">Idade Média</h4>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          <p className="text-3xl font-bold text-[#E8EDED]">
                            {idadeMedia > 0 ? idadeMedia.toFixed(1) : '-'} <span className="text-lg text-[#E8EDED]/70">anos</span>
                          </p>
                          <p className="text-xs text-[#E8EDED]/60 mt-1">{totalComIdade} paciente{totalComIdade !== 1 ? 's' : ''} com data de nascimento</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <h4 className="text-sm font-semibold text-[#E8EDED]/90 mb-3">Distribuição por Faixas Etárias</h4>
                          <div className="space-y-3">
                            {(['18-24', '25-40', '41-65', '65+'] as const).map((faixa, i) => (
                              <div key={faixa} className="flex items-center justify-between">
                                <span className="text-sm text-[#E8EDED]/70">{faixa === '65+' ? '> 65 anos' : `${faixa} anos`}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-32 bg-white/20 rounded-full h-2">
                                    <div className={`h-2 rounded-full transition-all ${i % 2 === 0 ? 'bg-[#4CCB7A]' : 'bg-[#2F8FA3]'}`} style={{ width: `${porcentagensFaixas[faixa] || 0}%` }} />
                                  </div>
                                  <span className="text-sm font-semibold text-[#E8EDED] w-12 text-right">{(porcentagensFaixas[faixa] || 0).toFixed(1)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <h4 className="text-sm font-semibold text-[#E8EDED]/90 mb-4">Distribuição por Gênero</h4>
                        {totalGenero > 0 ? (
                          <div className="flex flex-col items-center">
                            <div className="w-full max-w-xs">
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <defs>
                                    <linearGradient id="drGradienteMasculino" x1="0" y1="0" x2="1" y2="1">
                                      <stop offset="0%" stopColor="#4CCB7A" stopOpacity={1} />
                                      <stop offset="100%" stopColor="#2F8FA3" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="drGradienteFeminino" x1="0" y1="0" x2="1" y2="1">
                                      <stop offset="0%" stopColor="#2F8FA3" stopOpacity={1} />
                                      <stop offset="100%" stopColor="#0A1F44" stopOpacity={1} />
                                    </linearGradient>
                                  </defs>
                                  <Pie data={dadosGenero} cx="50%" cy="50%" labelLine={false} outerRadius={70} dataKey="value">
                                    {dadosGenero.map((_, index) => (
                                      <Cell key={`cell-${index}`} fill={index === 0 ? 'url(#drGradienteMasculino)' : 'url(#drGradienteFeminino)'} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    contentStyle={{ backgroundColor: '#0A1F44', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}
                                    itemStyle={{ color: '#E8EDED' }}
                                    labelStyle={{ color: '#E8EDED' }}
                                    formatter={(value: number, name: string, props: { payload?: { porcentagem: number } }) => [`${value} paciente${value !== 1 ? 's' : ''} (${(props?.payload?.porcentagem ?? 0).toFixed(1)}%)`, name]}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex gap-4">
                              {dadosGenero.map((item, index) => (
                                <div key={item.name} className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                      background:
                                        index === 0
                                          ? 'linear-gradient(135deg, #4CCB7A 0%, #2F8FA3 100%)'
                                          : 'linear-gradient(135deg, #2F8FA3 0%, #0A1F44 100%)',
                                    }}
                                  />
                                  <span className="text-sm text-[#E8EDED]/90">{item.name}: <span className="font-semibold">{item.value}</span> ({item.porcentagem.toFixed(1)}%)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-[#E8EDED]/50"><p className="text-sm">Nenhum dado de gênero disponível</p></div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Demografia Geográfica */}
              {estatisticasMeus?.geografia && (
                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Demografia Geográfica</h3>
                  {estatisticasMeus.geografia.totalComCidade > 0 ? (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <h4 className="text-sm font-semibold text-[#E8EDED]/90 mb-3">Top Cidades</h4>
                      <div className="space-y-3">
                        {estatisticasMeus.geografia.dadosCidades.map((item, index) => (
                          <div key={item.cidadeEstado} className="flex items-center justify-between">
                            <span className="text-sm text-[#E8EDED]/70 flex-shrink-0 w-40 truncate">{item.cidadeEstado}</span>
                            <div className="flex items-center gap-2 flex-1">
                              <div className="w-full max-w-xs bg-white/20 rounded-full h-2">
                                <div className="h-2 rounded-full transition-all" style={{ width: `${item.porcentagem}%`, backgroundColor: ['#4CCB7A', '#2F8FA3', '#4CCB7A', '#2F8FA3', '#4CCB7A', '#2F8FA3'][index] || '#2F8FA3' }} />
                              </div>
                              <span className="text-sm font-semibold text-[#E8EDED] w-16 text-right">{item.porcentagem.toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-[#E8EDED]/60 mt-3">{estatisticasMeus.geografia.totalComCidade} paciente{estatisticasMeus.geografia.totalComCidade !== 1 ? 's' : ''} com cidade cadastrada</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#E8EDED]/50"><p className="text-sm">Nenhum dado de cidade disponível</p></div>
                  )}
                </div>
              )}

              {/* Estatística de Perda de Peso */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold text-[#E8EDED] mb-4">Estatística de Perda de Peso</h3>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-[#E8EDED]/90 mb-1.5">Base de Dados</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => setFiltroBasePerdaPeso('meus')} className={`px-2 py-1 text-xs font-medium rounded-md ${filtroBasePerdaPeso === 'meus' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'}`}>Desse médico</button>
                      <button type="button" onClick={() => setFiltroBasePerdaPeso('oftware')} className={`px-2 py-1 text-xs font-medium rounded-md ${filtroBasePerdaPeso === 'oftware' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'}`}>Base Oftware</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#E8EDED]/90 mb-1">Dose Média</label>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setFiltroDosePerdaPeso('todas')} className={`px-2 py-1 text-xs rounded-md ${filtroDosePerdaPeso === 'todas' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'}`}>Todas</button>
                        {['2.5', '5.0', '7.5', '10', '12.5', '15'].map(d => (
                          <button key={d} type="button" onClick={() => setFiltroDosePerdaPeso(d)} className={`px-2 py-1 text-xs rounded-md ${filtroDosePerdaPeso === d ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'}`}>{d} mg</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E8EDED]/90 mb-1">Faixa Etária</label>
                      <div className="flex gap-1 flex-wrap">
                        <button type="button" onClick={() => setFiltroFaixaEtariaPerdaPeso('todas')} className={`px-2 py-1 text-xs rounded-md ${filtroFaixaEtariaPerdaPeso === 'todas' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'}`}>Todas</button>
                        <button type="button" onClick={() => setFiltroFaixaEtariaPerdaPeso('18-24')} className={`px-2 py-1 text-xs rounded-md ${filtroFaixaEtariaPerdaPeso === '18-24' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'}`}>18-24</button>
                        <button type="button" onClick={() => setFiltroFaixaEtariaPerdaPeso('25-40')} className={`px-2 py-1 text-xs rounded-md ${filtroFaixaEtariaPerdaPeso === '25-40' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'}`}>25-40</button>
                        <button type="button" onClick={() => setFiltroFaixaEtariaPerdaPeso('41-65')} className={`px-2 py-1 text-xs rounded-md ${filtroFaixaEtariaPerdaPeso === '41-65' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'}`}>41-65</button>
                        <button type="button" onClick={() => setFiltroFaixaEtariaPerdaPeso('65+')} className={`px-2 py-1 text-xs rounded-md ${filtroFaixaEtariaPerdaPeso === '65+' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'}`}>&gt;65</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#E8EDED]/90 mb-1">Sexo</label>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setFiltroSexoPerdaPeso('todos')} className={`px-2 py-1 text-xs rounded-md ${filtroSexoPerdaPeso === 'todos' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'}`}>Todos</button>
                        <button type="button" onClick={() => setFiltroSexoPerdaPeso('M')} className={`px-2 py-1 text-xs rounded-md ${filtroSexoPerdaPeso === 'M' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'}`}>M</button>
                        <button type="button" onClick={() => setFiltroSexoPerdaPeso('F')} className={`px-2 py-1 text-xs rounded-md ${filtroSexoPerdaPeso === 'F' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/20'}`}>F</button>
                      </div>
                    </div>
                  </div>
                </div>
                {filtroBasePerdaPeso === 'oftware' && !estatisticasOftware && loadingEstatisticas ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-[#4CCB7A]" /><span className="ml-3 text-[#E8EDED]/75">Carregando...</span></div>
                ) : (() => {
                  const dadosPerda = filtroBasePerdaPeso === 'meus' ? estatisticasMeus : estatisticasOftware;
                  const mediasPorSemana = dadosPerda?.perdaPeso?.mediasPorSemana || [];
                  // Para o gráfico, usamos valores NEGATIVOS para que a linha desça visualmente
                  const dadosGrafico = mediasPorSemana.map(item => ({
                    semana: item.semana,
                    perda: -Math.max(0, item.media),
                    quantidade: item.quantidade,
                  }));
                  const valoresPerda = dadosGrafico.map(d => d.perda);
                  const minPerda = Math.min(...valoresPerda, 0); // valor mais negativo
                  const margem = Math.abs(minPerda) * 0.1;
                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <h4 className="text-sm font-semibold text-[#E8EDED]/90 mb-3">Média de Perda de Peso por Semana</h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto pr-1" style={{ scrollbarColor: '#4CCB7A66 transparent' }}>
                            {mediasPorSemana.length === 0 && <div className="text-center py-4 text-[#E8EDED]/50 text-sm">Nenhum dado com os filtros selecionados</div>}
                            {mediasPorSemana.map((item) => (
                              <div key={item.semana} className="flex items-center justify-between">
                                <span className="text-sm text-[#E8EDED]/70 font-medium w-20">Sem {item.semana}</span>
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-full max-w-xs bg-white/20 rounded-full h-2">
                                    <div className={`h-2 rounded-full ${item.media > 0 ? 'bg-[#4CCB7A]' : item.media < 0 ? 'bg-red-400' : 'bg-[#E8EDED]/40'}`} style={{ width: `${Math.min(Math.abs(item.media) * 5, 100)}%` }} />
                                  </div>
                                  <span className={`text-sm font-semibold min-w-[100px] text-right ${item.media > 0 ? 'text-[#4CCB7A]' : item.media < 0 ? 'text-red-300' : 'text-[#E8EDED]/75'}`}>
                                    {(-item.media).toFixed(2)} kg <span className="text-[#E8EDED]/55 text-xs">(n={item.quantidade})</span>
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="lg:col-span-3">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <h4 className="text-sm font-semibold text-[#E8EDED]/90 mb-3">Evolução da Perda de Peso</h4>
                          {dadosGrafico.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                              <LineChart data={dadosGrafico} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(232, 237, 237, 0.22)" />
                                <XAxis dataKey="semana" tick={{ fontSize: 12 }} stroke="#E8EDED" />
                                {/* Eixo Y invertido visualmente (valores negativos), mas mostramos o valor absoluto na tooltip */}
                                <YAxis
                                  stroke="#E8EDED"
                                  domain={[minPerda - margem, 0]}
                                  tickFormatter={(v) => Math.abs(v).toFixed(1)}
                                />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#0A1F44', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#E8EDED' }}
                                  itemStyle={{ color: '#E8EDED' }}
                                  labelStyle={{ color: '#E8EDED' }}
                                  formatter={(value: number) => [`${Math.abs(value).toFixed(2)} kg`, 'Perda de Peso']}
                                  labelFormatter={(l) => `Semana ${l}`}
                                />
                                <Line type="monotone" dataKey="perda" stroke="#4CCB7A" strokeWidth={2.5} dot={{ r: 4, fill: '#4CCB7A' }} name="Perda de Peso (kg)" />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-[300px] text-[#E8EDED]/50 text-sm">Nenhum dado para o gráfico</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 px-5 sm:px-6 text-[#E8EDED]/60">
              <span>Carregando estatísticas do médico...</span>
            </div>
          )}
          </>
          )}
        </div>

        {/* Depoimentos */}
        <div className={`relative ${SHELL_CARD} p-8 mb-8 overflow-hidden`}>
          <DepoimentosAnimatedBackdrop />

          <div className="relative">
            <h2 className="text-xl font-bold text-[#0A1F44] mb-6">Depoimentos</h2>

            {loadingDepoimentos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-10 w-10 text-[#4CCB7A] animate-spin" />
                <span className="ml-3 text-[#0A1F44]/80 font-medium">Carregando depoimentos...</span>
              </div>
            ) : depoimentos.length === 0 ? (
              <p className="text-[#0A1F44]/70 text-center py-8 font-medium">Nenhum depoimento publicado ainda.</p>
            ) : (
              <div
                className="relative cursor-pointer"
                onClick={() => setDepoimentosPausado(true)}
              >
                <div key={depoimentoIndex} className="min-h-[160px] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
                  <div className="flex items-center justify-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={20}
                        className={s <= (depoimentos[depoimentoIndex]?.estrelas ?? 0) ? 'text-amber-500 fill-amber-500' : 'text-[#0A1F44]/25'}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-3 mb-0.5">
                    <p className="text-[#0A1F44] font-semibold">
                      {depoimentos[depoimentoIndex]?.nome}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDepoimentosPausado(true);
                        setDepoimentoSelecionado(depoimentos[depoimentoIndex]);
                        setShowModalDepoimento(true);
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-pink-500 hover:bg-pink-600 text-white shadow-md"
                      aria-label="Ver resultado do tratamento"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                  </div>
                  {(depoimentos[depoimentoIndex]?.cidadeEstado || depoimentos[depoimentoIndex]?.idade != null) && (
                    <p className="text-[#0A1F44]/70 text-sm mb-2">
                      {[depoimentos[depoimentoIndex]?.cidadeEstado, depoimentos[depoimentoIndex]?.idade != null ? `${depoimentos[depoimentoIndex]?.idade} anos` : null].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="text-[#0A1F44]/90 leading-relaxed max-w-2xl font-medium">"{depoimentos[depoimentoIndex]?.depoimento}"</p>
                </div>

                {depoimentos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setDepoimentoIndex((i) => (i - 1 + depoimentos.length) % depoimentos.length)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 p-2 rounded-full bg-[#0A1F44]/10 hover:bg-[#0A1F44]/20 text-[#0A1F44]/80"
                    aria-label="Anterior"
                  >
                    <ChevronDown className="h-5 w-5 rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepoimentoIndex((i) => (i + 1) % depoimentos.length)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 p-2 rounded-full bg-[#0A1F44]/10 hover:bg-[#0A1F44]/20 text-[#0A1F44]/80"
                    aria-label="Próximo"
                  >
                    <ChevronDown className="h-5 w-5 -rotate-90" />
                  </button>
                  <div className="flex justify-center gap-1.5 mt-4">
                    {depoimentos.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setDepoimentoIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === depoimentoIndex ? 'bg-[#4CCB7A]' : 'bg-[#0A1F44]/30 hover:bg-[#0A1F44]/50'}`}
                        aria-label={`Depoimento ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Detalhes do Depoimento */}
        {showModalDepoimento && depoimentoSelecionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative animate-modal-enter">
              <button
                type="button"
                onClick={() => setShowModalDepoimento(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-gray-900 mb-2">Resultado do tratamento</h3>
              <p className="text-sm text-gray-600 mb-4">
                {depoimentoSelecionado.nome}
                {(depoimentoSelecionado.cidadeEstado || depoimentoSelecionado.idade != null) && (
                  <>
                    {' · '}
                    {[depoimentoSelecionado.cidadeEstado, depoimentoSelecionado.idade != null ? `${depoimentoSelecionado.idade} anos` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </>
                )}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-medium">Peso inicial</p>
                  <p className="text-lg font-semibold text-green-900">
                    {depoimentoSelecionado.pesoInicialKg != null
                      ? `${depoimentoSelecionado.pesoInicialKg.toFixed(1)} kg`
                      : '—'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-medium">Peso atual</p>
                  <p className="text-lg font-semibold text-green-900">
                    {depoimentoSelecionado.pesoAtualKg != null
                      ? `${depoimentoSelecionado.pesoAtualKg.toFixed(1)} kg`
                      : '—'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-medium">Perda total (kg)</p>
                  <p className="text-lg font-semibold text-green-900">
                    {depoimentoSelecionado.perdaTotalKg != null
                      ? `-${depoimentoSelecionado.perdaTotalKg.toFixed(1)} kg`
                      : '—'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-medium">Perda percentual</p>
                  <p className="text-lg font-semibold text-green-900">
                    {depoimentoSelecionado.perdaPercentual != null
                      ? `-${depoimentoSelecionado.perdaPercentual.toFixed(1)}%`
                      : '—'}
                  </p>
                </div>
              </div>

              {depoimentoSelecionado.evolucao.length > 0 && (
                <div className="flex flex-col">
                  {(() => {
                    const maxDose = depoimentoSelecionado.evolucao.reduce(
                      (m, p) => Math.max(m, p.doseMg || 0),
                      0
                    );
                    const maxDoseAxis =
                      maxDose > 0 ? Math.min(30, (maxDose || 0) * 2) : 15;
                    const baseTicks = [2.5, 5, 7.5, 10, 12.5, 15];
                    const doseTicks = baseTicks.filter((v) => v <= maxDoseAxis);
                    const chartData = depoimentoSelecionado.evolucao.map((p) => ({
                      semana: `S${p.weekIndex}`,
                      peso: p.peso ?? null,
                      dose: p.doseMg ?? 0,
                    }));
                    const totalDose = depoimentoSelecionado.evolucao.reduce(
                      (s, p) => s + (p.doseMg || 0),
                      0
                    );
                    const patternId = `dosePat_${String(depoimentoSelecionado.pacienteId || 'x').replace(/[^a-zA-Z0-9_-]/g, '_')}`;

                    return (
                      <>
                        <div className="h-56 w-full min-h-[14rem]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                              data={chartData}
                              margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                            >
                              <defs>
                                <pattern
                                  id={patternId}
                                  patternUnits="userSpaceOnUse"
                                  width={10}
                                  height={10}
                                >
                                  <rect width="10" height="10" fill="#fdf2f8" />
                                  <path
                                    d="M0 10 L10 0 M-2 2 L2 -2 M8 12 L12 8"
                                    stroke="#db2777"
                                    strokeWidth={1.2}
                                    strokeOpacity={0.85}
                                  />
                                </pattern>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="semana" tick={{ fontSize: 11 }} stroke="#6b7280" />
                              <YAxis
                                yAxisId="peso"
                                tick={{ fontSize: 11 }}
                                stroke="#6b7280"
                                unit=" kg"
                              />
                              <YAxis
                                yAxisId="dose"
                                orientation="right"
                                tick={{ fontSize: 11 }}
                                stroke="#ec4899"
                                unit=" mg"
                                domain={[0, maxDoseAxis]}
                                ticks={doseTicks}
                              />
                              <Tooltip
                                formatter={(val: number, key: string) => {
                                  if (key === 'peso') return [`${val.toFixed(1)} kg`, 'Peso'];
                                  if (key === 'dose') return [`${val.toFixed(1)} mg`, 'Dose aplicada'];
                                  return [val, key];
                                }}
                                labelFormatter={(l) => `Semana ${l}`}
                              />
                              <Bar
                                yAxisId="dose"
                                dataKey="dose"
                                name="Dose aplicada"
                                fill={`url(#${patternId})`}
                                stroke="#be185d"
                                strokeWidth={1}
                                barSize={Math.min(28, Math.max(10, 320 / chartData.length))}
                                radius={[4, 4, 0, 0]}
                              />
                              <Line
                                yAxisId="peso"
                                type="monotone"
                                dataKey="peso"
                                stroke="#10b981"
                                strokeWidth={2.5}
                                dot={{ r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                        {totalDose > 0 && (
                          <div className="flex justify-center pt-3 pb-1">
                            <div
                              className="px-3 py-1.5 rounded-full bg-pink-600 text-xs font-semibold shadow !text-white"
                              style={{ color: '#ffffff' }}
                            >
                              {totalDose.toFixed(1)} mg (total)
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Área de Login/Solicitação — oculta em embed (perfil dentro do modal no chat /meta) */}
        {!isEmbed &&
          (!user ? (
            <div className={`${SHELL_CARD} p-8 text-center`}>
              <h2 className="text-2xl font-bold text-[#E8EDED] mb-4">
                Solicite seu tratamento
              </h2>
              <p className="text-[#E8EDED]/75 mb-6 max-w-lg mx-auto">
                {profissionalSecundario
                  ? `Faça login com sua conta Google para solicitar acompanhamento com ${nomeCompleto} e ${profissionalSecundario.nome}`
                  : pacienteIndicador
                  ? `Faça login com sua conta Google para solicitar tratamento com ${nomeCompleto}`
                  : `Faça login com sua conta Google para solicitar acompanhamento com ${nomeCompleto}`}
              </p>
              <button
                onClick={handleGoogleLogin}
                className="px-8 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/25 text-lg flex items-center gap-3 mx-auto"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Entrar com Google
              </button>
              {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
            </div>
          ) : solicitacaoCriada ? (
            <div className={`${SHELL_CARD} p-8 text-center`}>
              <CheckCircle className="h-16 w-16 text-[#4CCB7A] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[#E8EDED] mb-2">
                Solicitação enviada com sucesso!
              </h2>
              <p className="text-[#E8EDED]/75 mb-4 max-w-lg mx-auto">
                {profissionalSecundario
                  ? `As solicitações foram enviadas. O médico e o ${tipoProfissional === 'nutricionista' ? 'nutricionista' : 'personal trainer'} serão notificados e entrarão em contato em breve.`
                  : pacienteIndicador
                  ? 'Sua solicitação foi enviada. O médico será notificado e entrará em contato em breve.'
                  : 'O médico será notificado e entrará em contato em breve.'}
              </p>
              <p className="text-sm text-[#E8EDED]/55">Redirecionando para sua área do paciente...</p>
            </div>
          ) : (
            <div className={`${SHELL_CARD} p-8 text-center`}>
              <h2 className="text-2xl font-bold text-[#E8EDED] mb-4">
                Solicitar tratamento
              </h2>
              <p className="text-[#E8EDED]/75 mb-6 max-w-lg mx-auto">
                {pacienteIndicador
                  ? `${pacienteIndicador.nome} compartilhou este link. Clique abaixo para solicitar tratamento com ${nomeCompleto}.`
                  : `Clique no botão abaixo para solicitar acompanhamento com ${nomeCompleto}`}
              </p>
              <button
                onClick={() => setShowTelefoneModal(true)}
                className="px-8 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all text-lg shadow-lg hover:shadow-[#4CCB7A]/25"
              >
                Solicitar Tratamento
              </button>
            </div>
          ))}

        {/* Modal de Solicitar Tratamento - igual ao /meta */}
        {showTelefoneModal && medico && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
            <div className="bg-white w-full h-full md:rounded-lg md:w-auto md:h-auto md:max-w-2xl md:max-h-[85vh] overflow-y-auto flex flex-col relative shadow-xl">
              {criandoSolicitacao && (
                <div className="absolute inset-0 bg-white/95 md:rounded-lg flex flex-col items-center justify-center z-10">
                  <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
                  <p className="text-gray-700 font-medium">Carregando e preparando o envio...</p>
                  <p className="text-sm text-gray-500 mt-1">Por favor, aguarde.</p>
                </div>
              )}
              <div className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 sticky top-0 bg-white z-10 flex-shrink-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Solicitar Tratamento</h3>
                <button
                  onClick={() => {
                    if (!criandoSolicitacao) {
                      setShowTelefoneModal(false);
                      setTelefone('');
                      setPesoPacienteModal('');
                      setAlturaPacienteModal('');
                      setError(null);
                      setIsDraggingIMCModal(false);
                      setPesoTemporarioIMCModal(null);
                      setImcTemporarioIMCModal(null);
                    }
                  }}
                  disabled={criandoSolicitacao}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">
                    {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
                  </h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    {medico.crm && (
                      <p><span className="font-semibold">CRM:</span> {medico.crm.estado}-{medico.crm.numero}</p>
                    )}
                    {medico.localizacao?.endereco && (
                      <p><span className="font-semibold">Localização:</span> {medico.localizacao.endereco}</p>
                    )}
                    {medico.telefone && (
                      <p><span className="font-semibold">Telefone:</span> {medico.telefone}</p>
                    )}
                  </div>
                  {medico.cidades && medico.cidades.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Cidades atendidas:</p>
                      <div className="flex flex-wrap gap-2">
                        {medico.cidades.map((c: { cidade: string; estado: string }, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                            {c.cidade}/{c.estado}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Seu número de telefone *</label>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    disabled={criandoSolicitacao}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 disabled:bg-gray-100"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">O médico usará este número para entrar em contato com você</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="20"
                      max="400"
                      value={pesoPacienteModal}
                      onChange={(e) => setPesoPacienteModal(e.target.value)}
                      placeholder="Ex: 85"
                      disabled={criandoSolicitacao}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Altura (cm ou m)</label>
                    <input
                      type="number"
                      min="1"
                      max="250"
                      step="0.01"
                      value={alturaPacienteModal}
                      onChange={(e) => setAlturaPacienteModal(e.target.value)}
                      placeholder="Ex: 170 ou 1.70"
                      disabled={criandoSolicitacao}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {(() => {
                  const alturaCm = alturaInputParaCm(alturaPacienteModal);
                  const alturaMetros = alturaCm ? alturaCm / 100 : null;
                  const pesoInput = parseFloat(pesoPacienteModal);
                  let imcAtual: number | null = null;
                  if (isDraggingIMCModal && imcTemporarioIMCModal !== null) {
                    imcAtual = imcTemporarioIMCModal;
                  } else if (alturaMetros && pesoInput && pesoInput > 0) {
                    imcAtual = pesoInput / (alturaMetros * alturaMetros);
                  }
                  const pesoAtual = isDraggingIMCModal && pesoTemporarioIMCModal !== null
                    ? pesoTemporarioIMCModal
                    : (pesoInput && pesoInput > 0 ? pesoInput : null);

                  const calcularGrauObesidadeModal = (imc: number | null | undefined): string | null => {
                    if (!imc || imc === 0) return null;
                    if (imc < 18.5) return 'Abaixo do peso';
                    if (imc < 25) return 'Peso normal';
                    if (imc < 30) return 'Sobrepeso';
                    if (imc < 35) return 'Obesidade Grau I';
                    if (imc < 40) return 'Obesidade Grau II';
                    return 'Obesidade Grau III';
                  };
                  const getCorGrauObesidadeModal = (grau: string | null): string => {
                    if (!grau) return 'text-gray-500';
                    if (grau.includes('Grau III')) return 'text-red-600 font-semibold';
                    if (grau.includes('Grau II')) return 'text-orange-600 font-semibold';
                    if (grau.includes('Grau I')) return 'text-yellow-600 font-semibold';
                    if (grau === 'Sobrepeso') return 'text-amber-600';
                    if (grau === 'Peso normal') return 'text-green-600';
                    return 'text-blue-600';
                  };
                  const classificarIMC = (imc: number | null | undefined): { icone: string } | null => {
                    if (!imc || imc === 0) return null;
                    if (imc < 18.5) return { icone: '😟' };
                    if (imc < 25) return { icone: '🙂' };
                    if (imc < 30) return { icone: '😐' };
                    return { icone: '😟' };
                  };
                  const calcularPosicaoMarcador = (imc: number | null | undefined): number => {
                    if (!imc || imc === 0) return 0;
                    if (imc < 18.5) return (imc / 18.5) * 25;
                    if (imc < 25) return 25 + ((imc - 18.5) / (25 - 18.5)) * 25;
                    if (imc < 30) return 50 + ((imc - 25) / (30 - 25)) * 25;
                    return 75 + Math.min(((imc - 30) / 20) * 25, 25);
                  };
                  const pesoIdealSaudavel = alturaMetros ? 25 * (alturaMetros * alturaMetros) : null;
                  const kgParaPerder = pesoAtual && pesoIdealSaudavel && imcAtual && imcAtual > 25
                    ? pesoAtual - pesoIdealSaudavel
                    : null;

                  if (!alturaMetros || !pesoAtual || pesoAtual <= 0) return null;

                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center">
                          <div className="text-xs text-blue-700 font-medium mb-1">Peso Atual</div>
                          <div className="text-sm font-semibold text-blue-900">{pesoAtual.toFixed(1)} kg</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-blue-700 font-medium mb-1">Altura</div>
                          <div className="text-sm font-semibold text-blue-900">{alturaMetros.toFixed(2)} m</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-blue-700 font-medium mb-1">IMC</div>
                          <div className="text-sm font-semibold text-blue-900">{imcAtual?.toFixed(1) || '-'}</div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="relative mb-1 h-4">
                          <span className="absolute text-xs text-gray-500" style={{ left: '25%', transform: 'translateX(-50%)' }}>18.5</span>
                          <span className="absolute text-xs text-gray-500" style={{ left: '50%', transform: 'translateX(-50%)' }}>25</span>
                          <span className="absolute text-xs text-gray-500" style={{ left: '75%', transform: 'translateX(-50%)' }}>30</span>
                        </div>
                        <div
                          ref={barraIMCRefModal}
                          className="relative rounded-full overflow-visible bg-gray-100"
                          style={{ height: '6px', borderRadius: '999px' }}
                        >
                          <div className="absolute left-0 top-0 h-full" style={{ width: '25%', backgroundColor: '#60a5fa' }} />
                          <div className="absolute left-1/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#34d399' }} />
                          <div className="absolute left-2/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#fbbf24' }} />
                          <div className="absolute left-3/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#f87171' }} />
                          <div
                            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10 cursor-grab active:cursor-grabbing"
                            style={{ left: `${calcularPosicaoMarcador(imcAtual)}%`, userSelect: 'none' }}
                            onMouseDown={(e) => { e.preventDefault(); setIsDraggingIMCModal(true); }}
                            onTouchStart={() => setIsDraggingIMCModal(true)}
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-gray-600 text-xs font-bold">&lt;</span>
                              <div className="bg-white border-2 border-gray-400 rounded-full shadow-lg flex items-center justify-center hover:scale-110" style={{ width: '24px', height: '24px' }}>
                                <span style={{ fontSize: '14px' }}>{classificarIMC(imcAtual)?.icone || '🙂'}</span>
                              </div>
                              <span className="text-gray-600 text-xs font-bold">&gt;</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-gray-500 text-[11px]">Baixo</span>
                          <span className="text-gray-500 text-[11px]">Saudável</span>
                          <span className="text-gray-500 text-[11px]">Alto</span>
                          <span className="text-gray-500 text-[11px]">Obeso</span>
                        </div>
                        <div className="mt-2 text-center">
                          <div className="text-xs text-blue-700 font-medium mb-1">Grau de Obesidade</div>
                          <div className={`text-sm font-semibold ${getCorGrauObesidadeModal(calcularGrauObesidadeModal(imcAtual))}`}>
                            {calcularGrauObesidadeModal(imcAtual) || '-'}
                          </div>
                          {kgParaPerder !== null && kgParaPerder > 0 && (
                            <p className="text-xs text-amber-700 mt-2 font-medium">
                              Para peso saudável (IMC 25): precisa perder ~{kgParaPerder.toFixed(1)} kg
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    Ao enviar esta solicitação, o médico receberá uma notificação. Você poderá acompanhar o status da solicitação em suas notificações.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 px-4 md:px-6 py-3 md:py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 flex-shrink-0">
                <button
                  onClick={() => {
                    if (!criandoSolicitacao) {
                      setShowTelefoneModal(false);
                      setTelefone('');
                      setPesoPacienteModal('');
                      setAlturaPacienteModal('');
                      setError(null);
                    }
                  }}
                  disabled={criandoSolicitacao}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCriarSolicitacao}
                  disabled={criandoSolicitacao || !telefone.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {criandoSolicitacao && <Loader2 className="h-4 w-4 animate-spin" />}
                  {criandoSolicitacao ? 'Enviando...' : 'Confirmar Solicitação'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MedicoPersonalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
          <Loader2 className="h-12 w-12 text-green-600 animate-spin" />
        </div>
      }
    >
      <MedicoPersonalPageContent />
    </Suspense>
  );
}
