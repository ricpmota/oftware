'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
  onAuthStateChanged,
  User,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { Medico } from '@/types/medico';
import { SolicitacaoMedicoService } from '@/services/solicitacaoMedicoService';
import type { LeadReferralSnapshot } from '@/types/leadMedico';
import { PacienteService } from '@/services/pacienteService';
import { PacienteCompleto, DadosClinicos } from '@/types/obesidade';
import { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { Stethoscope, MapPin, Phone, Mail, Loader2, CheckCircle, Check, AlertCircle, X, UtensilsCrossed, Dumbbell, Users, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { alturaInputParaCm } from '@/utils/alturaInput';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DepoimentosAnimatedBackdrop from '@/components/landing/DepoimentosAnimatedBackdrop';
import { getMedicoGoogleMapsHref } from '@/lib/meta/medicoLocalizacao';
import { resolveMedicoWhiteLabel } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import { publicPageCustomLogoUrl } from '@/lib/whiteLabel/publicPagesTheme';
import PublicPageBrandFooter from '@/components/public/PublicPageBrandFooter';
import WhiteLabelFaviconEffect from '@/components/public/WhiteLabelFaviconEffect';

/** Paleta alinhada à home (/) — fundo padrão #0A1F44, destaques #4CCB7A / #2F8FA3, texto #E8EDED */
const DEFAULT_PAGE_BG = '#0A1F44';
const SHELL_CARD = 'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-xl';

const CARDS_INSTITUCIONAIS = [
  {
    icon: Activity,
    title: 'Acompanhamento estruturado',
    text: 'Fluxo contínuo de acompanhamento com organização clínica e monitoramento individualizado.',
  },
  {
    icon: Users,
    title: 'Equipe integrada',
    text: 'Possibilidade de integração com nutrição e treino conforme necessidade clínica.',
  },
  {
    icon: CheckCircle,
    title: 'Atendimento verificado',
    text: 'Perfil validado com registro profissional ativo.',
  },
] as const;

type DepoimentoPublico = {
  pacienteId: string;
  nome: string;
  cidadeEstado: string | null;
  idade: number | null;
  depoimento: string;
};

function SeloPerfilInstitucional({ medico }: { medico: Medico }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
      {medico.isVerificado ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0095F6]/40 bg-[#0095F6]/10 px-3 py-1.5 text-sm font-medium text-[#B8E4FF]">
          <CheckCircle className="h-4 w-4 shrink-0 text-[#0095F6]" aria-hidden />
          Perfil verificado
        </span>
      ) : null}
      {medico.crm ? (
        <span className="text-sm text-[var(--public-page-text)]/65">CRM ativo · {medico.crm.estado} {medico.crm.numero}</span>
      ) : null}
    </div>
  );
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
  const [authChecking, setAuthChecking] = useState(true);
  /** Enquanto verifica se o login já é de paciente cadastrado (evita flash do botão de solicitar). */
  const [verificandoSessaoPaciente, setVerificandoSessaoPaciente] = useState(false);
  const solicitacaoInFlightRef = useRef(false);
  const redirectedToMetaRef = useRef(false);
  /** Após login Google (popup): pede um clique explícito em Entrar antes de criar solicitação / ir ao Meta. */
  const [showEntrarConfirmModal, setShowEntrarConfirmModal] = useState(false);

  /** Navegação “hard” para /meta — em WebViews/Android o router.push do Next às vezes não troca de página. */
  const navigateToMeta = () => {
    const path = '/meta';
    if (typeof window !== 'undefined') {
      window.location.assign(`${window.location.origin}${path}`);
      return;
    }
    router.push(path);
  };

  /** Após nova solicitação: mantém médico do link para o wizard no /meta. */
  const navigateToMetaPaciente = (medicoId: string) => {
    const path = `/meta?drMedico=${encodeURIComponent(medicoId)}`;
    if (typeof window !== 'undefined') {
      window.location.assign(`${window.location.origin}${path}`);
      return;
    }
    router.push(path);
  };

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
  const [pacienteIndicador, setPacienteIndicador] = useState<{ id: string; nome: string; userId?: string; email?: string } | null>(null);

  // Estatísticas do médico (página pública)
  type EstatisticasPayload = {
    counts: { total: number; pendentes: number; emTratamento: number; concluidos: number; abandono: number };
    demografia: { idadeMedia: number; totalComIdade: number; faixasEtarias: Record<string, number>; porcentagensFaixas: Record<string, number>; homens: number; mulheres: number; totalGenero: number; dadosGenero: { name: string; value: number; porcentagem: number }[] };
    geografia: { dadosCidades: { cidadeEstado: string; count: number; porcentagem: number }[]; totalComCidade: number };
    perdaPeso: { mediasPorSemana: { semana: number; media: number; quantidade: number }[] };
  };
  const [estatisticasMeus, setEstatisticasMeus] = useState<EstatisticasPayload | null>(null);
  const [loadingEstatisticas, setLoadingEstatisticas] = useState(false);
  const [filtroFaixaEtariaPerdaPeso, setFiltroFaixaEtariaPerdaPeso] = useState<string>('todas');
  const [filtroSexoPerdaPeso, setFiltroSexoPerdaPeso] = useState<string>('todos');
  const [erroEstatisticas, setErroEstatisticas] = useState<string | null>(null);
  const [informacoesPessoaisAberto, setInformacoesPessoaisAberto] = useState(false);
  const [estatisticasTratamentoAberto, setEstatisticasTratamentoAberto] = useState(false);
  const [depoimentos, setDepoimentos] = useState<DepoimentoPublico[]>([]);
  const [loadingDepoimentos, setLoadingDepoimentos] = useState(false);
  const [depoimentoIndex, setDepoimentoIndex] = useState(0);
  const [depoimentosPausado, setDepoimentosPausado] = useState(false);

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
          const responsePaciente = await fetch(
            `/api/paciente-por-nome?nome=${encodeURIComponent(slugPacienteIndicador)}&medicoId=${encodeURIComponent(medicoData.id)}`
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
        } else {
          setPacienteIndicador(null);
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
    setLoadingDepoimentos(true);
    fetch(`/api/depoimentos-medico?medicoId=${encodeURIComponent(medico.id)}`)
      .then((res) => (res.ok ? res.json() : { depoimentos: [] }))
      .then((data: { depoimentos: DepoimentoPublico[] }) => {
        setDepoimentos(data.depoimentos || []);
        setDepoimentoIndex(0);
      })
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

  const loadEstatisticasMedico = async (base: 'meus' | 'oftware', sexo?: string, faixaEtaria?: string) => {
    if (!medico?.id && base === 'meus') return;
    setLoadingEstatisticas(true);
    setErroEstatisticas(null);
    try {
      const params = new URLSearchParams({ base });
      if (base === 'meus' && medico?.id) params.set('medicoId', medico.id);
      if (sexo) params.set('sexo', sexo);
      if (faixaEtaria) params.set('faixaEtaria', faixaEtaria);
      const res = await fetch(`/api/estatisticas-medico?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao carregar estatísticas');
      setEstatisticasMeus(data);
    } catch (e) {
      console.error('Erro ao carregar estatísticas:', e);
      setErroEstatisticas(e instanceof Error ? e.message : 'Não foi possível carregar as estatísticas.');
    } finally {
      setLoadingEstatisticas(false);
    }
  };

  useEffect(() => {
    if (!medico?.id) return;
    loadEstatisticasMedico('meus', filtroSexoPerdaPeso, filtroFaixaEtariaPerdaPeso);
  }, [medico?.id, filtroSexoPerdaPeso, filtroFaixaEtariaPerdaPeso]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);

      if (!currentUser) {
        setShowEntrarConfirmModal(false);
        setVerificandoSessaoPaciente(false);
        return;
      }

      if (!medico || isEmbed || redirectedToMetaRef.current) return;

      setVerificandoSessaoPaciente(true);
      try {
        const email = currentUser.email || '';
        const pacienteData =
          (email ? await PacienteService.getPacienteByEmail(email) : null) ??
          (await PacienteService.getPacienteByUserId(currentUser.uid));
        setPaciente(pacienteData);
        if (pacienteData?.dadosIdentificacao?.telefone) {
          setTelefone(String(pacienteData.dadosIdentificacao.telefone));
        }

        // Paciente já cadastrado → área do paciente (sem nova solicitação ao médico)
        if (pacienteData?.id) {
          setShowEntrarConfirmModal(false);
          redirectedToMetaRef.current = true;
          navigateToMeta();
          return;
        }

        const solicitacoes = email
          ? await SolicitacaoMedicoService.getSolicitacoesPorPaciente(email)
          : [];
        const solicitacaoExistente = solicitacoes.find((s) => s.medicoId === medico.id);
        if (solicitacaoExistente) {
          setShowEntrarConfirmModal(false);
          redirectedToMetaRef.current = true;
          navigateToMetaPaciente(medico.id);
        }
      } catch (err) {
        console.error('Erro ao verificar sessão do paciente:', err);
      } finally {
        setVerificandoSessaoPaciente(false);
      }
    });

    return () => unsubscribe();
  }, [medico, isEmbed]);

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
      setShowEntrarConfirmModal(true);
      // onAuthStateChanged atualiza `user` e carrega paciente/solicitação
    } catch (err: unknown) {
      const e = err as { code?: string };
      console.error('Erro ao fazer login:', err);
      if (e?.code === 'auth/popup-closed-by-user') {
        setError('Login cancelado. Por favor, tente novamente.');
      } else {
        setError('Erro ao fazer login com Google. Tente novamente.');
      }
    }
  };

  const handleCriarSolicitacao = async () => {
    if (solicitacaoInFlightRef.current) return;
    const currentUser = user ?? auth.currentUser;

    if (!currentUser?.email || !medico) {
      setError('Erro: Dados incompletos. Recarregue a página.');
      return;
    }

    setShowEntrarConfirmModal(false);

    const medicoId = medico.id;
    const emailPaciente = currentUser.email;

    solicitacaoInFlightRef.current = true;
    setCriandoSolicitacao(true);
    setError(null);

    const tentarUmaVez = async () => {
      // Proteção anti-duplicação: paciente já cadastrado ou solicitação existente → só redireciona.
      const pacienteExistente =
        paciente ??
        (await PacienteService.getPacienteByEmail(emailPaciente)) ??
        (await PacienteService.getPacienteByUserId(currentUser.uid));
      if (pacienteExistente?.id) {
        setShowTelefoneModal(false);
        navigateToMeta();
        setCriandoSolicitacao(false);
        solicitacaoInFlightRef.current = false;
        return;
      }

      const solicitacoesExistentes = await SolicitacaoMedicoService.getSolicitacoesPorPaciente(emailPaciente);
      const solicitacaoExistente = solicitacoesExistentes.find((s) => s.medicoId === medicoId);
      if (solicitacaoExistente) {
        setSolicitacaoCriada(true);
        setShowTelefoneModal(false);
        navigateToMetaPaciente(medicoId);
        setCriandoSolicitacao(false);
        solicitacaoInFlightRef.current = false;
        return;
      }
      const telefoneCadastro =
        telefone?.trim() ||
        paciente?.dadosIdentificacao?.telefone ||
        '';
      const telefoneNormalizado = telefoneCadastro.replace(/\D/g, '');

      const pacienteNome = paciente?.nome || 
                          paciente?.dadosIdentificacao?.nomeCompleto || 
                          currentUser.displayName || 
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
          imc: imcVal,
        } as DadosClinicos['medidasIniciais'];

        let pacienteParaSalvar = paciente;
        if (!pacienteParaSalvar?.id) {
          pacienteParaSalvar = await PacienteService.getPacienteByEmail(currentUser.email || '')
            ?? await PacienteService.getPacienteByUserId(currentUser.uid);
        }

        if (pacienteParaSalvar?.id) {
          const pacienteAtualizado: PacienteCompleto = {
            ...pacienteParaSalvar,
            medicoRecomendadoId: medico.id,
            dadosClinicos: {
              ...pacienteParaSalvar.dadosClinicos,
              medidasIniciais
            }
          };
          pacienteIdFinal = await PacienteService.createOrUpdatePaciente(pacienteAtualizado);
          setPaciente(pacienteAtualizado);
        } else {
          // Criar paciente novo com medidas iniciais
          const pacienteNovo: Omit<PacienteCompleto, 'id'> = {
            userId: currentUser.uid,
            email: currentUser.email || '',
            nome: pacienteNome,
            medicoResponsavelId: medico.id,
            dadosIdentificacao: {
              nomeCompleto: pacienteNome,
              email: currentUser.email || '',
              telefone: telefoneNormalizado,
              endereco: paciente?.dadosIdentificacao?.endereco ?? {},
              dataCadastro: new Date(),
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
            dataCadastro: new Date(),
          };
          pacienteIdFinal = await PacienteService.createOrUpdatePaciente(pacienteNovo);
          setPaciente({ ...pacienteNovo, id: pacienteIdFinal });
        }
      }

      // Se houver profissional secundário e paciente ainda não existe, criar paciente básico
      
      if (temProfissionalSecundario && !pacienteIdFinal && currentUser.email) {
        try {
          console.log('📋 Criando paciente básico para vincular ao profissional...');
          const medidasIniciaisBasico: { peso?: number; altura?: number; imc?: number } = {};
          if (pesoVal && pesoVal > 0 && alturaVal !== null && alturaVal > 0) {
            const altM = alturaVal / 100;
            medidasIniciaisBasico.peso = pesoVal;
            medidasIniciaisBasico.altura = alturaVal;
            medidasIniciaisBasico.imc = pesoVal / (altM * altM);
          }
          const pacienteBasico: Omit<PacienteCompleto, 'id'> = {
            userId: currentUser.uid,
            email: currentUser.email, // Campo necessário para getPacienteByEmail funcionar
            nome: pacienteNome,
            medicoResponsavelId: medico.id,
            dadosIdentificacao: {
              nomeCompleto: pacienteNome,
              email: currentUser.email,
              telefone: telefoneNormalizado,
              endereco: {},
              dataCadastro: new Date(),
            },
            dadosClinicos: {
              comorbidades: {},
              medidasIniciais:
                Object.keys(medidasIniciaisBasico).length > 0
                  ? (medidasIniciaisBasico as DadosClinicos['medidasIniciais'])
                  : undefined,
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
            statusTratamento: 'pendente' as const,
            dataCadastro: new Date(),
          };

          pacienteIdFinal = await PacienteService.createOrUpdatePaciente(pacienteBasico);
          console.log('✅ Paciente criado com ID:', pacienteIdFinal);
          setPaciente({ ...pacienteBasico, id: pacienteIdFinal });
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

      // Determinar snapshot de origem comercial
      let referral: LeadReferralSnapshot | undefined;
      if (nutricionista) {
        referral = {
          type: 'nutricionista',
          sourceId: nutricionista.userId || nutricionista.id,
          sourceName: nutricionista.nome,
          capturedAt: new Date(),
        };
      } else if (personalTrainer) {
        referral = {
          type: 'personal',
          sourceId: personalTrainer.userId || personalTrainer.id,
          sourceName: personalTrainer.nome,
          capturedAt: new Date(),
        };
      } else if (pacienteIndicador) {
        referral = {
          type: 'paciente',
          sourceId: pacienteIndicador.id,
          sourceName: pacienteIndicador.nome,
          sourceContact: pacienteIndicador.email || pacienteIndicador.userId,
          capturedAt: new Date(),
        };
      } else {
        referral = {
          type: 'medico',
          sourceId: medico.id,
          sourceName: medico.nome,
          capturedAt: new Date(),
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

      await SolicitacaoMedicoService.criarSolicitacao(
        {
          pacienteEmail: emailPaciente,
          pacienteNome,
          pacienteTelefone: telefoneNormalizado || '',
          pacienteId: pacienteIdFinal,
          medicoId: medico.id,
          medicoNome: medico.nome,
          status: 'pendente',
          referral,
        },
        {
          emailIndicador: pacienteIndicadorParam?.pacienteIndicadorUserId,
          referral,
        }
      );
      setSolicitacaoCriada(true);
      setShowTelefoneModal(false);

      // Redirecionar para /meta após 2 segundos (mantém médico do link para o chat não pedir busca de médico)
      setTimeout(() => {
        navigateToMetaPaciente(medicoId);
        setCriandoSolicitacao(false);
        solicitacaoInFlightRef.current = false;
      }, 2000);
    };

    const MAX_TENTATIVAS = 4;
    for (let t = 0; t < MAX_TENTATIVAS; t++) {
      try {
        if (t > 0) {
          await new Promise((r) => setTimeout(r, 600 * t));
        }
        await tentarUmaVez();
        return;
      } catch (err) {
        console.error(`[dr] criar solicitacao tentativa ${t + 1}/${MAX_TENTATIVAS}`, err);
        if (t === MAX_TENTATIVAS - 1) {
          setCriandoSolicitacao(false);
          solicitacaoInFlightRef.current = false;
          navigateToMetaPaciente(medicoId);
        }
      }
    }
  };

  useEffect(() => {
    if (!criandoSolicitacao) return;
    const id = window.setTimeout(() => {
      console.warn('[dr] watchdog: fluxo Entrar demorou demais — liberando UI');
      setCriandoSolicitacao(false);
      solicitacaoInFlightRef.current = false;
    }, 45000);
    return () => window.clearTimeout(id);
  }, [criandoSolicitacao]);

  // Determinar se há profissional secundário (nutricionista ou personal) ou paciente indicador
  const profissionalSecundario = nutricionista || personalTrainer;
  const tipoProfissional = nutricionista ? 'nutricionista' : personalTrainer ? 'personal' : null;
  const aguardandoSessaoPaciente = authChecking || (!!user && verificandoSessaoPaciente);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: DEFAULT_PAGE_BG }}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#4CCB7A] animate-spin mx-auto mb-4" />
          <p className="text-[var(--public-page-text)]/80">
            {profissionalSecundario ? 'Carregando informações...' : 'Carregando informações do médico...'}
          </p>
        </div>
      </div>
    );
  }

  if (error && !medico) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: DEFAULT_PAGE_BG }}>
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

  const whiteLabelResolved = resolveMedicoWhiteLabel(medico);
  const drPage = whiteLabelResolved.publicPages.dr;
  const medicoAvatarUrl = whiteLabelResolved.profilePhotoUrl;
  const nomeCompleto = whiteLabelResolved.brandName;
  const accentColor = whiteLabelResolved.primaryColor;
  const pageBg = drPage.backgroundColor;
  const pageText = drPage.textColor;
  const drCustomLogo = publicPageCustomLogoUrl(drPage);

  return (
    <div
      className={`min-h-screen relative ${isEmbed ? 'min-h-0' : ''}`}
      style={{
        backgroundColor: pageBg,
        ['--public-page-text' as string]: pageText,
      }}
    >
      <WhiteLabelFaviconEffect
        faviconUrl={whiteLabelResolved.faviconUrl}
        cacheKey={medico.id}
      />
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
      <div
        className={`relative z-10 container mx-auto px-4 max-w-4xl ${isEmbed ? 'py-4' : 'py-12'} ${
          !isEmbed && !solicitacaoCriada ? 'pb-32' : ''
        }`}
      >
        {/* Banner Paciente Indicador */}
        {pacienteIndicador && (
          <div className="bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3] rounded-2xl shadow-xl p-6 mb-6 text-center">
            <p className="text-lg sm:text-xl font-semibold text-white leading-relaxed">
              <span className="font-bold">{pacienteIndicador.nome}</span> compartilhou sua experiência de acompanhamento com {nomeCompleto}
            </p>
            <p className="text-white/75 text-xs sm:text-sm mt-3 leading-relaxed max-w-lg mx-auto">
              Relatos individuais; não garantem resposta semelhante.
            </p>
          </div>
        )}
        {/* Header */}
        <div className={`${SHELL_CARD} p-8 mb-8`}>
          {profissionalSecundario ? (
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center justify-center gap-4">
                {/* Ícone do Médico */}
                <div className="flex flex-col items-center gap-2">
                  <div className={AVATAR_MEDICO_WRAP}>
                    {medicoAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={medicoAvatarUrl}
                        alt=""
                        className={`${AVATAR_MEDICO_FACE} object-cover`}
                      />
                    ) : (
                      <div
                        className={`flex ${AVATAR_MEDICO_FACE} items-center justify-center`}
                        style={{ background: `linear-gradient(to bottom right, ${accentColor}, #2F8FA3)` }}
                      >
                        <Stethoscope className="h-14 w-14 text-white sm:h-16 sm:w-16 md:h-[4.25rem] md:w-[4.25rem]" strokeWidth={1.75} />
                      </div>
                    )}
                    {medico.isVerificado ? <SeloVerificadoInstagram /> : null}
                  </div>
                  <span className="text-sm font-medium text-[var(--public-page-text)]/80">Médico</span>
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
                  <span className="text-sm font-medium text-[var(--public-page-text)]/80">
                    {tipoProfissional === 'nutricionista' ? 'Nutricionista' : 'Personal Trainer'}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-bold text-[var(--public-page-text)] mb-2">{nomeCompleto}</h1>
                {medico.crm && (
                  <p className="text-lg text-[var(--public-page-text)]/75 mb-1">
                    CRM-{medico.crm.estado} {medico.crm.numero}
                  </p>
                )}
                <SeloPerfilInstitucional medico={medico} />
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-lg font-semibold text-[var(--public-page-text)]/85 mb-1">
                    {tipoProfissional === 'nutricionista' ? 'Nutricionista' : 'Personal Trainer'}
                  </p>
                  <p className="text-xl text-[var(--public-page-text)]">{profissionalSecundario.nome}</p>
                  {profissionalSecundario.registroNumero && (
                    <p className="text-sm text-[var(--public-page-text)]/65 mt-1">
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
                    {medicoAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={medicoAvatarUrl}
                        alt=""
                        className={`${AVATAR_MEDICO_FACE} object-cover`}
                      />
                    ) : (
                      <div
                        className={`flex ${AVATAR_MEDICO_FACE} items-center justify-center`}
                        style={{ background: `linear-gradient(to bottom right, ${accentColor}, #2F8FA3)` }}
                      >
                        <Stethoscope className="h-14 w-14 text-white sm:h-16 sm:w-16 md:h-[4.25rem] md:w-[4.25rem]" strokeWidth={1.75} />
                      </div>
                    )}
                    {medico.isVerificado ? <SeloVerificadoInstagram /> : null}
                  </div>
                  <span className="text-sm font-medium text-[var(--public-page-text)]/80">Médico</span>
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-bold text-[var(--public-page-text)] mb-2">{nomeCompleto}</h1>
                {medico.crm && (
                  <p className="text-lg text-[var(--public-page-text)]/75 mb-1">
                    CRM-{medico.crm.estado} {medico.crm.numero}
                  </p>
                )}
                <SeloPerfilInstitucional medico={medico} />
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
            <h2 className="text-xl font-bold text-[var(--public-page-text)]">Informações Pessoais</h2>
            {informacoesPessoaisAberto ? <ChevronUp className="h-6 w-6 text-[var(--public-page-text)]/55" /> : <ChevronDown className="h-6 w-6 text-[var(--public-page-text)]/55" />}
          </button>

          {informacoesPessoaisAberto && (
          <div className="space-y-4">
            {(medico.localizacao?.endereco || medico.localizacao?.nomeLocal) && (
              <div className="flex items-start gap-4">
                <MapPin className="h-6 w-6 text-[#4CCB7A] mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--public-page-text)]">Endereço</p>
                  {medico.localizacao.nomeLocal && (
                    <p className="text-[var(--public-page-text)] font-medium">{medico.localizacao.nomeLocal}</p>
                  )}
                  {medico.localizacao.endereco && (
                    <p className="text-[var(--public-page-text)]/75">
                      {medico.localizacao.endereco}
                      {medico.localizacao.numero?.trim() ? `, nº ${medico.localizacao.numero.trim()}` : ''}
                    </p>
                  )}
                  {medico.localizacao.pontoReferencia && (
                    <p className="text-sm text-[var(--public-page-text)]/55 mt-1">
                      Ref.: {medico.localizacao.pontoReferencia}
                    </p>
                  )}
                  {getMedicoGoogleMapsHref(medico.localizacao) && (
                    <a
                      href={getMedicoGoogleMapsHref(medico.localizacao)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-[#4CCB7A] hover:text-[#6dd99a]"
                    >
                      Ver no Google Maps →
                    </a>
                  )}
                </div>
              </div>
            )}

            {medico.telefone && (
              <div className="flex items-start gap-4">
                <Phone className="h-6 w-6 text-[#4CCB7A] mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--public-page-text)]">Telefone</p>
                  <p className="text-[var(--public-page-text)]/75">{medico.telefone}</p>
                </div>
              </div>
            )}

            {medico.email && (
              <div className="flex items-start gap-4">
                <Mail className="h-6 w-6 text-[#4CCB7A] mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--public-page-text)]">E-mail</p>
                  <p className="text-[var(--public-page-text)]/75">{medico.email}</p>
                </div>
              </div>
            )}

            {medico.cidades && medico.cidades.length > 0 && (
              <div className="flex items-start gap-4">
                <MapPin className="h-6 w-6 text-[#4CCB7A] mt-1 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--public-page-text)]">Cidades de Atendimento</p>
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

        {/* Dados do acompanhamento */}
        <div className={`${SHELL_CARD} p-8 mb-8`}>
          <h2 className="text-xl font-bold text-[var(--public-page-text)] mb-6">Dados do acompanhamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CARDS_INSTITUCIONAIS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-[#0A1F44]/70 p-5 rounded-xl border border-white/10">
                <Icon className="h-7 w-7 text-[#4CCB7A] mb-3" aria-hidden />
                <h3 className="text-base font-semibold text-[var(--public-page-text)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--public-page-text)]/70 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dados agregados de acompanhamento */}
        <div className={`${SHELL_CARD} p-0 mb-8 overflow-hidden`}>
          <button
            type="button"
            onClick={() => setEstatisticasTratamentoAberto((v) => !v)}
            className="w-full flex items-center justify-between text-left px-5 sm:px-6 py-5"
          >
            <h2 className="text-xl font-bold text-[var(--public-page-text)]">Dados agregados de acompanhamento</h2>
            {estatisticasTratamentoAberto ? <ChevronUp className="h-6 w-6 text-[var(--public-page-text)]/55" /> : <ChevronDown className="h-6 w-6 text-[var(--public-page-text)]/55" />}
          </button>

          {estatisticasTratamentoAberto && (
          <>
          {loadingEstatisticas && !estatisticasMeus ? (
            <div className="flex items-center justify-center py-12 px-5 sm:px-6">
              <Loader2 className="h-10 w-10 text-[#4CCB7A] animate-spin" />
              <span className="ml-3 text-[var(--public-page-text)]/75">Carregando estatísticas...</span>
            </div>
          ) : erroEstatisticas ? (
            <div className="flex flex-col items-center justify-center py-12 px-5 sm:px-6 text-center">
              <AlertCircle className="h-12 w-12 text-amber-400 mb-3" />
              <p className="text-[var(--public-page-text)]/85 mb-2">{erroEstatisticas}</p>
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
              {/* Perfil da base em acompanhamento */}
              {estatisticasMeus?.demografia && (
                <div className="border-t border-white/10 pt-6 first:border-t-0 first:pt-0">
                  <h3 className="text-lg font-semibold text-[var(--public-page-text)] mb-1">Perfil da base em acompanhamento</h3>
                  <p className="text-xs text-[var(--public-page-text)]/50 mb-4">
                    Dados agregados do acompanhamento deste profissional. Observacionais e sujeitos a variações individuais.
                  </p>
                  <div className="bg-white/5 rounded-xl p-5 border border-white/10 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-[var(--public-page-text)]/60 uppercase tracking-wide">Idade média</p>
                      <p className="text-2xl font-semibold text-[var(--public-page-text)] mt-1">
                        {estatisticasMeus.demografia.idadeMedia > 0
                          ? `${estatisticasMeus.demografia.idadeMedia.toFixed(1)} anos`
                          : '—'}
                      </p>
                      <p className="text-xs text-[var(--public-page-text)]/55 mt-1">
                        {estatisticasMeus.demografia.totalComIdade} registro
                        {estatisticasMeus.demografia.totalComIdade !== 1 ? 's' : ''} com data de nascimento
                      </p>
                    </div>
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-xs font-medium text-[var(--public-page-text)]/60 mb-2">Faixas etárias (distribuição geral)</p>
                      <ul className="space-y-1.5 text-sm text-[var(--public-page-text)]/75">
                        {(['18-24', '25-40', '41-65', '65+'] as const).map((faixa) => (
                          <li key={faixa} className="flex justify-between gap-4">
                            <span>{faixa === '65+' ? 'Acima de 65 anos' : `${faixa.replace('-', ' a ')} anos`}</span>
                            <span className="text-[var(--public-page-text)]/90 tabular-nums">
                              {(estatisticasMeus.demografia.porcentagensFaixas[faixa] || 0).toFixed(1)}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {estatisticasMeus.demografia.totalGenero > 0 && (
                      <p className="text-xs text-[var(--public-page-text)]/55 border-t border-white/10 pt-4">
                        Composição registrada:{' '}
                        {estatisticasMeus.demografia.dadosGenero
                          .map((g) => `${g.porcentagem.toFixed(0)}% ${g.name.toLowerCase()}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Evolução agregada registrada */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-semibold text-[var(--public-page-text)] mb-1">Evolução agregada registrada</h3>
                <p className="text-xs text-[var(--public-page-text)]/50 mb-4">
                  Dados agregados, observacionais e sujeitos a variações individuais.
                </p>
                <div className="flex flex-wrap items-end justify-end gap-3 mb-4">
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[var(--public-page-text)]/90 mb-1">Faixa Etária</label>
                      <div className="flex gap-1 flex-wrap">
                        <button type="button" onClick={() => setFiltroFaixaEtariaPerdaPeso('todas')} className={`px-2 py-1 text-xs rounded-md ${filtroFaixaEtariaPerdaPeso === 'todas' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[var(--public-page-text)]/80 hover:bg-white/20'}`}>Todas</button>
                        <button type="button" onClick={() => setFiltroFaixaEtariaPerdaPeso('18-24')} className={`px-2 py-1 text-xs rounded-md ${filtroFaixaEtariaPerdaPeso === '18-24' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[var(--public-page-text)]/80 hover:bg-white/20'}`}>18-24</button>
                        <button type="button" onClick={() => setFiltroFaixaEtariaPerdaPeso('25-40')} className={`px-2 py-1 text-xs rounded-md ${filtroFaixaEtariaPerdaPeso === '25-40' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[var(--public-page-text)]/80 hover:bg-white/20'}`}>25-40</button>
                        <button type="button" onClick={() => setFiltroFaixaEtariaPerdaPeso('41-65')} className={`px-2 py-1 text-xs rounded-md ${filtroFaixaEtariaPerdaPeso === '41-65' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[var(--public-page-text)]/80 hover:bg-white/20'}`}>41-65</button>
                        <button type="button" onClick={() => setFiltroFaixaEtariaPerdaPeso('65+')} className={`px-2 py-1 text-xs rounded-md ${filtroFaixaEtariaPerdaPeso === '65+' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[var(--public-page-text)]/80 hover:bg-white/20'}`}>&gt;65</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--public-page-text)]/90 mb-1">Sexo</label>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setFiltroSexoPerdaPeso('todos')} className={`px-2 py-1 text-xs rounded-md ${filtroSexoPerdaPeso === 'todos' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[var(--public-page-text)]/80 hover:bg-white/20'}`}>Todos</button>
                        <button type="button" onClick={() => setFiltroSexoPerdaPeso('M')} className={`px-2 py-1 text-xs rounded-md ${filtroSexoPerdaPeso === 'M' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[var(--public-page-text)]/80 hover:bg-white/20'}`}>M</button>
                        <button type="button" onClick={() => setFiltroSexoPerdaPeso('F')} className={`px-2 py-1 text-xs rounded-md ${filtroSexoPerdaPeso === 'F' ? 'bg-[#4CCB7A] text-[#0A1F44]' : 'bg-white/10 text-[var(--public-page-text)]/80 hover:bg-white/20'}`}>F</button>
                      </div>
                    </div>
                  </div>
                </div>
                {loadingEstatisticas ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-[#4CCB7A]" /><span className="ml-3 text-[var(--public-page-text)]/75">Carregando...</span></div>
                ) : (() => {
                  const dadosPerda = estatisticasMeus;
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
                          <h4 className="text-sm font-semibold text-[var(--public-page-text)]/90 mb-3">Média registrada por semana</h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto pr-1" style={{ scrollbarColor: '#4CCB7A66 transparent' }}>
                            {mediasPorSemana.length === 0 && <div className="text-center py-4 text-[var(--public-page-text)]/50 text-sm">Nenhum dado com os filtros selecionados</div>}
                            {mediasPorSemana.map((item) => (
                              <div key={item.semana} className="flex items-center justify-between">
                                <span className="text-sm text-[var(--public-page-text)]/70 font-medium w-20">Sem {item.semana}</span>
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-full max-w-xs bg-white/20 rounded-full h-2">
                                    <div className={`h-2 rounded-full ${item.media > 0 ? 'bg-[#4CCB7A]' : item.media < 0 ? 'bg-red-400' : 'bg-[var(--public-page-text)]/40'}`} style={{ width: `${Math.min(Math.abs(item.media) * 5, 100)}%` }} />
                                  </div>
                                  <span className={`text-sm font-semibold min-w-[100px] text-right ${item.media > 0 ? 'text-[#4CCB7A]' : item.media < 0 ? 'text-red-300' : 'text-[var(--public-page-text)]/75'}`}>
                                    {item.media.toFixed(2)} kg <span className="text-[var(--public-page-text)]/55 text-xs">(n={item.quantidade})</span>
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="lg:col-span-3">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <h4 className="text-sm font-semibold text-[var(--public-page-text)]/90 mb-3">Evolução média registrada</h4>
                          {dadosGrafico.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                              <LineChart data={dadosGrafico} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(232, 237, 237, 0.22)" />
                                <XAxis dataKey="semana" tick={{ fontSize: 12 }} stroke={pageText} />
                                {/* Eixo Y invertido visualmente (valores negativos), mas mostramos o valor absoluto na tooltip */}
                                <YAxis
                                  stroke={pageText}
                                  domain={[minPerda - margem, 0]}
                                  tickFormatter={(v) => Math.abs(v).toFixed(1)}
                                />
                                <Tooltip
                                  contentStyle={{ backgroundColor: pageBg, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: pageText }}
                                  itemStyle={{ color: pageText }}
                                  labelStyle={{ color: pageText }}
                                  formatter={(value: number) => [`${Math.abs(value).toFixed(2)} kg`, 'Média agregada']}
                                  labelFormatter={(l) => `Semana ${l}`}
                                />
                                <Line type="monotone" dataKey="perda" stroke="#4CCB7A" strokeWidth={2.5} dot={{ r: 4, fill: '#4CCB7A' }} name="Média registrada (kg)" />
                              </LineChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-[300px] text-[var(--public-page-text)]/50 text-sm">Nenhum dado para o gráfico</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 px-5 sm:px-6 text-[var(--public-page-text)]/60">
              <span>Carregando estatísticas do médico...</span>
            </div>
          )}
          </>
          )}
        </div>

        {/* Experiências compartilhadas */}
        <div className={`relative ${SHELL_CARD} p-8 mb-8 overflow-hidden`}>
          <DepoimentosAnimatedBackdrop />

          <div className="relative">
            <h2 className="text-xl font-bold text-[#0A1F44] mb-2">Experiências compartilhadas</h2>
            <p className="text-sm text-[#0A1F44]/65 mb-6">
              Relatos individuais compartilhados espontaneamente pelos pacientes.
            </p>

            {loadingDepoimentos ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-10 w-10 text-[#4CCB7A] animate-spin" />
                <span className="ml-3 text-[#0A1F44]/80 font-medium">Carregando relatos...</span>
              </div>
            ) : depoimentos.length === 0 ? (
              <p className="text-[#0A1F44]/70 text-center py-8 font-medium">Nenhuma experiência publicada ainda.</p>
            ) : (
              <div
                className="relative cursor-pointer"
                onClick={() => setDepoimentosPausado(true)}
              >
                <div key={depoimentoIndex} className="min-h-[160px] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
                  <p className="text-[#0A1F44] font-semibold mb-0.5">
                    {depoimentos[depoimentoIndex]?.nome}
                  </p>
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
                        aria-label={`Experiência ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
                )}
              </div>
            )}
            <p className="text-center text-[#0A1F44]/50 text-xs max-w-2xl mx-auto mt-6 leading-relaxed px-2">
              Resultados variam conforme características clínicas, adesão e resposta individual.
            </p>
          </div>
        </div>

        {/* Área de Login/Solicitação — oculta em embed (perfil dentro do modal no chat /meta) */}
        {!isEmbed &&
          (aguardandoSessaoPaciente ? (
            <div className={`${SHELL_CARD} p-8 text-center`}>
              <Loader2 className="h-10 w-10 text-[#4CCB7A] animate-spin mx-auto mb-4" aria-hidden />
              <p className="text-[var(--public-page-text)]/75">Verificando sua conta...</p>
            </div>
          ) : !user ? (
            <div className={`${SHELL_CARD} p-8 text-center`}>
              <h2 className="text-2xl font-bold text-[var(--public-page-text)] mb-4">
                Solicitar avaliação
              </h2>
              <p className="text-[var(--public-page-text)]/75 mb-6 max-w-lg mx-auto">
                {profissionalSecundario
                  ? `Faça login com sua conta Google para solicitar avaliação com ${nomeCompleto} e ${profissionalSecundario.nome}`
                  : pacienteIndicador
                  ? `Faça login com sua conta Google para solicitar avaliação com ${nomeCompleto}`
                  : `Faça login com sua conta Google para solicitar avaliação com ${nomeCompleto}`}
              </p>
              <button
                onClick={handleGoogleLogin}
                className="px-8 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/25 text-lg mx-auto"
              >
                Solicitar avaliação
              </button>
              {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
            </div>
          ) : solicitacaoCriada ? (
            <div className={`${SHELL_CARD} p-8 text-center`}>
              <CheckCircle className="h-16 w-16 text-[#4CCB7A] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[var(--public-page-text)] mb-2">
                Solicitação enviada com sucesso!
              </h2>
              <p className="text-[var(--public-page-text)]/75 mb-4 max-w-lg mx-auto">
                {profissionalSecundario
                  ? `As solicitações foram enviadas. O médico e o ${tipoProfissional === 'nutricionista' ? 'nutricionista' : 'personal trainer'} serão notificados e entrarão em contato em breve.`
                  : pacienteIndicador
                  ? 'Sua solicitação foi enviada. O médico será notificado e entrará em contato em breve.'
                  : 'O médico será notificado e entrará em contato em breve.'}
              </p>
              <p className="text-sm text-[var(--public-page-text)]/55">Redirecionando para sua área do paciente...</p>
            </div>
          ) : showEntrarConfirmModal ? (
            <div className={`${SHELL_CARD} p-8 text-center`}>
              <p className="text-[var(--public-page-text)]/80 text-sm max-w-md mx-auto leading-relaxed">
                Para continuar, use o botão <span className="text-[#4CCB7A] font-semibold">Continuar para avaliação</span> na janela que abriu ao centro da tela.
              </p>
            </div>
          ) : (
            <div className={`${SHELL_CARD} p-8 text-center`}>
              <h2 className="text-2xl font-bold text-[var(--public-page-text)] mb-4">
                Iniciar acompanhamento
              </h2>
              <p className="text-[var(--public-page-text)]/75 mb-6 max-w-lg mx-auto">
                {pacienteIndicador
                  ? `${pacienteIndicador.nome} compartilhou este link. Clique abaixo para solicitar acompanhamento com ${nomeCompleto}.`
                  : `Clique no botão abaixo para solicitar acompanhamento com ${nomeCompleto}`}
              </p>
              <button
                type="button"
                onClick={handleCriarSolicitacao}
                disabled={criandoSolicitacao}
                className="px-8 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all text-lg shadow-lg hover:shadow-[#4CCB7A]/25 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {criandoSolicitacao && (
                  <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
                )}
                {criandoSolicitacao ? 'Aguarde...' : 'Iniciar acompanhamento'}
              </button>
            </div>
          ))}

        {/* Modal de solicitar acompanhamento — igual ao /meta */}
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
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Solicitar avaliação</h3>
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

        {!isEmbed && (
          <footer className={`${SHELL_CARD} p-6 mb-8`}>
            <p className="text-[var(--public-page-text)]/45 text-xs leading-relaxed text-center max-w-2xl mx-auto">
              Esta página possui caráter informativo e institucional. As condutas dependem de avaliação médica individualizada. A resposta ao acompanhamento varia conforme características clínicas, adesão e evolução individual.
            </p>
            <PublicPageBrandFooter
              theme={drPage}
              brandName={nomeCompleto}
              showLogo
              showPoweredBy={whiteLabelResolved.showPoweredByOftware}
              className="mt-4"
              logoClassName="opacity-80"
              poweredByClassName="text-[var(--public-page-text)]/40"
            />
          </footer>
        )}
      </div>

      {!isEmbed && !solicitacaoCriada && !aguardandoSessaoPaciente && (
        <div
          className="fixed bottom-0 inset-x-0 z-40 border-t border-white/20 backdrop-blur-md p-3"
          style={{ backgroundColor: `${pageBg}f2` }}
        >
          <div className="container mx-auto max-w-4xl px-1">
            {!user ? (
              <button
                onClick={handleGoogleLogin}
                className="w-full px-6 py-3 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/25"
              >
                Solicitar avaliação
              </button>
            ) : showEntrarConfirmModal ? null : (
              <button
                type="button"
                onClick={handleCriarSolicitacao}
                disabled={criandoSolicitacao}
                className="w-full px-6 py-3 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/25 disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {criandoSolicitacao && (
                  <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
                )}
                {criandoSolicitacao ? 'Aguarde...' : 'Iniciar acompanhamento'}
              </button>
            )}
          </div>
        </div>
      )}

      {!isEmbed &&
        user &&
        !solicitacaoCriada &&
        showEntrarConfirmModal &&
        !criandoSolicitacao &&
        !showTelefoneModal && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dr-entrar-modal-title"
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-white/10 p-6 text-center shadow-2xl"
              style={{ backgroundColor: pageBg }}
            >
              {drCustomLogo ? (
                <div className="mb-4 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={drCustomLogo}
                    alt={nomeCompleto}
                    className="h-12 w-auto max-w-[220px] object-contain"
                  />
                </div>
              ) : null}
              <p id="dr-entrar-modal-title" className="text-base font-medium leading-snug text-[var(--public-page-text)]">
                Continuar para avaliação
              </p>
              <p className="mt-2 text-sm text-[var(--public-page-text)]/70">Toque no botão abaixo para seguir com seu acompanhamento.</p>
              <button
                type="button"
                onClick={handleCriarSolicitacao}
                className="mt-6 min-h-[48px] w-full touch-manipulation rounded-xl bg-[#4CCB7A] px-6 py-3 font-semibold text-[#0A1F44] shadow-lg transition-all hover:bg-[#45b86d] hover:shadow-[#4CCB7A]/25"
              >
                Iniciar acompanhamento
              </button>
            </div>
          </div>
        )}

      {criandoSolicitacao && !showTelefoneModal && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 px-6"
          style={{ backgroundColor: 'rgba(10, 31, 68, 0.92)' }}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-14 w-14 text-[#4CCB7A] animate-spin" aria-hidden />
          <p className="text-center text-lg font-medium text-[var(--public-page-text)]">
            {solicitacaoCriada
              ? 'Redirecionando para sua área do paciente...'
              : 'Preparando seu acesso...'}
          </p>
          <p className="text-center text-sm text-[var(--public-page-text)]/65 max-w-sm">
            Aguarde, você será levado ao Meta em instantes.
          </p>
        </div>
      )}
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
