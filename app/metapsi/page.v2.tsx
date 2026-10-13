'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  AlertCircle,
  Brain,
  Building,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  Link as LinkIcon,
  Loader2,
  Mail,
  MapPin,
  Menu,
  Phone,
  Save,
  Search,
  Shield,
  ShieldCheck,
  Stethoscope,
  UserCircle,
  X,
  type LucideIcon,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import CadastroVerificacaoScreen from '@/components/portal/CadastroVerificacaoScreen';
import ProfissionalCadastroGateModal from '@/components/meta/ProfissionalCadastroGateModal';
import MetaNutriPersonalWizard from '@/components/meta/MetaNutriPersonalWizard';
import MedicoFotoPerfilEditor from '@/components/metaadmin/MedicoFotoPerfilEditor';
import { InternationalPhoneInput } from '@/components/phone/InternationalPhoneInput';
import { isValidIdentificacaoPhone } from '@/lib/phone/internationalPhoneValue';
import { professionalPhoneWriteFields } from '@/lib/whatsapp/resolveProfessionalPhone';
import VerificationCidadesFields from '@/components/meta/VerificationCidadesFields';
import OrganizacaoComunicacaoGmailPanel from '@/components/comunicacao/OrganizacaoComunicacaoGmailPanel';
import { loadDestinatariosMetapsi } from '@/lib/organizacaoMensagem/loadDestinatarios';
import {
  formatRegistroProfissional,
  resolveAssinaturaLogoUrl,
} from '@/lib/pacienteMensagem/assinaturaMensagem';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import { ESTADOS_BR_OPTIONS } from '@/lib/whiteLabel/cadastroMedicoConstants';
import OrganizationShellMobileMark from '@/components/organization/OrganizationShellMobileMark';
import { readOrganizationShellBrandingResponse } from '@/lib/organization/readOrganizationShellBrandingResponse';
import {
  organizationShellActiveClass,
  organizationShellBadgeClass,
  organizationShellCssVars,
  organizationShellForegroundClass,
  organizationShellIconButtonClass,
  organizationShellIdleClass,
  organizationShellSplashProps,
  resolveOrganizationShellChrome,
} from '@/lib/organization/resolveOrganizationShellChrome';
import { resolveOrganizationShellLogoUrl } from '@/lib/organization/resolveOrganizationShellLogoUrl';
import {
  METAPSI_BOTTOM_NAV,
  METAPSI_SHELL_BRANDING_ENDPOINT,
  METAPSI_SIDEBAR_NAV,
} from '@/lib/metapsi/metaPsiShellChrome';
import { PSIQUIATRA_ESPECIALIDADE, PSIQUIATRA_REGISTRO_LABEL } from '@/features/metaPsi/metaPsi.constants';
import type { PsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';
import { formatPsiquiatraRegistroAdmin, PsiquiatraService } from '@/services/psiquiatraService';
import MetaPsiMedicosVinculoPanel from '@/components/metapsi/MetaPsiMedicosVinculoPanel';
import MetaPsiPacientesPanel from '@/components/metapsi/MetaPsiPacientesPanel';
import MetaPsiDashboardHome from '@/components/metapsi/MetaPsiDashboardHome';
import MetaPsiHomeLeadsPipeline from '@/components/metapsi/MetaPsiHomeLeadsPipeline';
import MetaPsiPacienteWorkspaceModal from '@/components/metapsi/MetaPsiPacienteWorkspaceModal';
import ProfissionalDashboardHome from '@/components/profissional/dashboard/ProfissionalDashboardHome';
import type { PacienteCompartilhadoCrmItem } from '@/components/crm/profissional/LeadsProfissionalCrmView';
import {
  PacientePsiquiatraService,
  type PacienteVisivelPsiquiatra,
} from '@/services/pacientePsiquiatraService';

type MenuPsi =
  | 'home'
  | 'leads'
  | 'medicos'
  | 'pacientes'
  | 'financeiro'
  | 'calendario'
  | 'meu-perfil'
  | 'comunicacao';

type PerfilAba = 'dados' | 'endereco' | 'cidades';

type OrganizationShellBranding = {
  publicName: string;
  logoMainUrl: string | null;
  logoDarkUrl: string | null;
  logoLightUrl: string | null;
  iconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
};

function EmptyPanel({
  title,
  description,
  Icon,
}: {
  title: string;
  description: string;
  Icon?: LucideIcon;
}) {
  /* Chrome empty Nutri: solid border + icon + título — placeholders Financeiro/Calendário (6.3.8/6.3.9). */
  return (
    <div
      className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center"
      data-metapsi-placeholder
    >
      {Icon ? <Icon className="mx-auto mb-4 h-12 w-12 text-gray-400" aria-hidden /> : null}
      <h2 className="mb-2 text-lg font-semibold text-gray-900">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

export default function MetaPsiPageV2() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [psiquiatra, setPsiquiatra] = useState<PsiquiatraDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPsiquiatra, setLoadingPsiquiatra] = useState(true);
  const [criandoCadastro, setCriandoCadastro] = useState(false);
  const [salvandoCadastro, setSalvandoCadastro] = useState(false);
  const [loadTick, setLoadTick] = useState(0);
  const [activeMenu, setActiveMenu] = useState<MenuPsi>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tabletNavOpen, setTabletNavOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  /** Modal Mensagens mobile — mesmo canal da Comunicação desktop (padrão Personal). */
  const [showMensagensComunicacaoModal, setShowMensagensComunicacaoModal] = useState(false);
  const [meuPerfilAba, setMeuPerfilAba] = useState<PerfilAba>('dados');
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [pacientesVisiveisDash, setPacientesVisiveisDash] = useState<PacienteVisivelPsiquiatra[]>([]);
  const [loadingPacientesDash, setLoadingPacientesDash] = useState(false);
  const [filtroBaseDashboard, setFiltroBaseDashboard] = useState<'meus' | 'oftware'>('meus');
  const [filtroDosePerdaPeso, setFiltroDosePerdaPeso] = useState('todas');
  const [filtroFaixaEtariaPerdaPeso, setFiltroFaixaEtariaPerdaPeso] = useState('todas');
  const [filtroSexoPerdaPeso, setFiltroSexoPerdaPeso] = useState('todos');
  const [workspaceDash, setWorkspaceDash] = useState<PacienteVisivelPsiquiatra | null>(null);
  const [buscandoCepPerfil, setBuscandoCepPerfil] = useState(false);
  const [vinculoMessage, setVinculoMessage] = useState<string | null>(null);

  const [registroNumero, setRegistroNumero] = useState('');
  const [crmUf, setCrmUf] = useState('');
  const [rqe, setRqe] = useState('');
  const [telefoneContato, setTelefoneContato] = useState('');
  const [telefoneDdiContato, setTelefoneDdiContato] = useState('');
  const [telefonePaisContato, setTelefonePaisContato] = useState('');
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<PsiquiatraDoc['cidades']>([]);
  const [perfilGenero, setPerfilGenero] = useState<'M' | 'F' | ''>('');
  const [perfilInstagram, setPerfilInstagram] = useState('');
  const [perfilCep, setPerfilCep] = useState('');
  const [perfilNomeLocal, setPerfilNomeLocal] = useState('');
  const [perfilEndereco, setPerfilEndereco] = useState('');
  const [perfilNumero, setPerfilNumero] = useState('');
  const [perfilPontoRef, setPerfilPontoRef] = useState('');
  const [perfilGoogleMaps, setPerfilGoogleMaps] = useState('');
  const [perfilFotoUrl, setPerfilFotoUrl] = useState<string | null>(null);
  const [perfilNome, setPerfilNome] = useState('');
  const [organizationShellBranding, setOrganizationShellBranding] =
    useState<OrganizationShellBranding | null>(null);
  const [organizationShellContext, setOrganizationShellContext] = useState<{
    organizationId: string | null;
    organizationMatch: boolean;
  }>({ organizationId: null, organizationMatch: true });

  const applyPsiquiatraToForm = useCallback((doc: PsiquiatraDoc, firebaseUser?: User | null) => {
    setRegistroNumero(doc.registroNumero || '');
    setCrmUf(doc.crmUf || '');
    setRqe(doc.rqe || '');
    setTelefoneContato(doc.telefone || '');
    setTelefoneDdiContato(doc.telefoneDdi || '');
    setTelefonePaisContato(doc.telefonePais || '');
    setCidadesSelecionadas(doc.cidades || []);
    setPerfilGenero((doc.genero as 'M' | 'F' | '') || '');
    setPerfilInstagram(doc.instagramUsuario || '');
    setPerfilCep(doc.cep || '');
    setPerfilNomeLocal(doc.nomeLocal || '');
    setPerfilEndereco(doc.endereco || '');
    setPerfilNumero(doc.numero || '');
    setPerfilPontoRef(doc.pontoReferencia || '');
    setPerfilGoogleMaps(doc.googleMapsUrl || '');
    setPerfilFotoUrl(doc.fotoPerfilUrl || firebaseUser?.photoURL || null);
    setPerfilNome(doc.nome || firebaseUser?.displayName || '');
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setPsiquiatra(null);
        setLoadingPsiquiatra(false);
        setLoading(false);
        router.push('/');
        return;
      }

      setUser(firebaseUser);
      setLoadingPsiquiatra(true);
      try {
        let docPsi: PsiquiatraDoc | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            docPsi = await PsiquiatraService.getPsiquiatraByUserId(firebaseUser.uid);
            break;
          } catch (error) {
            if (attempt === 1) throw error;
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }
        setPsiquiatra(docPsi);
        if (docPsi) applyPsiquiatraToForm(docPsi, firebaseUser);
      } catch (error) {
        console.error('Erro ao carregar psiquiatra:', error);
      } finally {
        setLoadingPsiquiatra(false);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, applyPsiquiatraToForm]);

  useEffect(() => {
    if (!user) {
      setOrganizationShellBranding(null);
      setOrganizationShellContext({ organizationId: null, organizationMatch: true });
      return;
    }

    let cancelled = false;
    setOrganizationShellBranding(null);
    setOrganizationShellContext({ organizationId: null, organizationMatch: true });
    void (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(METAPSI_SHELL_BRANDING_ENDPOINT, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const parsed = readOrganizationShellBrandingResponse(res.ok ? await res.json() : null);
        if (!cancelled) {
          setOrganizationShellContext({
            organizationId: parsed.organizationId,
            organizationMatch: parsed.organizationMatch,
          });
          setOrganizationShellBranding(parsed.branding);
        }
      } catch {
        if (!cancelled) {
          setOrganizationShellBranding(null);
          setOrganizationShellContext({ organizationId: null, organizationMatch: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const shellChrome = useMemo(
    () =>
      resolveOrganizationShellChrome({
        organizationId: organizationShellContext.organizationId,
        branding: organizationShellBranding,
      }),
    [organizationShellBranding, organizationShellContext.organizationId],
  );
  const shellSplash = organizationShellSplashProps(shellChrome);
  const sidebarOrganizationLogoSrc = useMemo(
    () =>
      resolveOrganizationShellLogoUrl(organizationShellBranding, {
        backgroundColor: shellChrome.secondaryColor,
      }),
    [organizationShellBranding, shellChrome.secondaryColor],
  );
  const headerOrganizationLogoSrc = useMemo(
    () =>
      resolveOrganizationShellLogoUrl(organizationShellBranding, {
        darkBackground: false,
      }),
    [organizationShellBranding],
  );
  const sidebarOrganizationLogoAlt = organizationShellBranding?.publicName?.trim() || 'Oftware';

  const handleConfirmarCadastro = useCallback(async () => {
    if (!user) return;
    setCriandoCadastro(true);
    try {
      const docPsi = await PsiquiatraService.createOrUpdatePsiquiatra(
        user.uid,
        user.email || '',
        user.displayName || ''
      );
      setPsiquiatra(docPsi);
      applyPsiquiatraToForm(docPsi, user);
    } catch (error) {
      console.error('Erro ao iniciar cadastro de psiquiatra:', error);
      alert('Nao foi possivel iniciar seu cadastro agora. Tente novamente.');
    } finally {
      setCriandoCadastro(false);
    }
  }, [user, applyPsiquiatraToForm]);

  const handleRecusarCadastro = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = 'https://www.oftware.com.br';
      return;
    }
    router.push('/');
  }, [router]);

  const navegarMenu = (menu: MenuPsi) => {
    setActiveMenu(menu);
    setTabletNavOpen(false);
    setShowProfileDropdown(false);
    // Mobile: Comunicação abre o modal (mesmo padrão do Personal / Mensagens)
    if (
      menu === 'comunicacao' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches
    ) {
      setShowMensagensComunicacaoModal(true);
    }
  };

  useEffect(() => {
    if (!user || !psiquiatra) return;
    if (activeMenu !== 'home' && activeMenu !== 'leads') return;
    const psiId = psiquiatra.id || user.uid;
    let cancelled = false;
    void (async () => {
      setLoadingPacientesDash(true);
      try {
        const list = await PacientePsiquiatraService.listPacientesVisiveisByPsiquiatra(psiId);
        if (!cancelled) setPacientesVisiveisDash(list);
      } catch (err) {
        console.error('[MetaPsi] falha ao carregar pacientes do dashboard/leads', err);
        if (!cancelled) setPacientesVisiveisDash([]);
      } finally {
        if (!cancelled) setLoadingPacientesDash(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, psiquiatra, activeMenu, loadTick]);

  const openWorkspaceFromDash = useCallback((pacienteId: string) => {
    const item = pacientesVisiveisDash.find(
      (p) => p.pacienteId === pacienteId || p.paciente?.id === pacienteId || p.paciente?.userId === pacienteId
    );
    if (item) setWorkspaceDash(item);
  }, [pacientesVisiveisDash]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const renderComunicacaoPanel = (opts?: { hideHeaderTitle?: boolean; className?: string }) => {
    if (!user || !psiquiatra) return null;
    const crmLabel =
      formatRegistroProfissional('psiquiatra', {
        numero: psiquiatra.registroNumero,
        uf: psiquiatra.crmUf,
      }) || formatPsiquiatraRegistroAdmin(psiquiatra);
    return (
      <OrganizacaoComunicacaoGmailPanel
        organizationId={psiquiatra.organizationId || METODO_ORGANIZATION_ID}
        currentUser={{
          userId: user.uid,
          role: 'psiquiatra',
          profileId: psiquiatra.id || user.uid,
          nome: psiquiatra.nome || user.displayName || 'Psiquiatra',
          email: user.email || psiquiatra.email || '',
          fotoUrl: psiquiatra.fotoPerfilUrl || perfilFotoUrl || null,
          subtitle: crmLabel || null,
        }}
        loadDestinatarios={() =>
          loadDestinatariosMetapsi({
            psiquiatraProfileId: psiquiatra.id || user.uid,
            medicoVinculadoIds: psiquiatra.medicoVinculadoIds || [],
            organizationId: psiquiatra.organizationId || METODO_ORGANIZATION_ID,
          })
        }
        assinaturaDefaults={{
          role: 'psiquiatra',
          displayName: psiquiatra.nome || user.displayName || 'Psiquiatra',
          registro: crmLabel || null,
          telefone: psiquiatra.telefone || null,
          email: psiquiatra.email || user.email || null,
          logoUrl: resolveAssinaturaLogoUrl({
            logoMainUrl: organizationShellBranding?.logoMainUrl,
            shellLogoUrl: sidebarOrganizationLogoSrc,
          }),
        }}
        onNotify={(msg) => alert(msg)}
        hideHeaderTitle={opts?.hideHeaderTitle}
        className={opts?.className}
      />
    );
  };

  const handleSalvarPerfil = async () => {
    if (!user?.uid || !psiquiatra) return;
    const phoneWrite = professionalPhoneWriteFields({
      telefone: telefoneContato,
      telefoneDdi: telefoneDdiContato,
      telefonePais: telefonePaisContato,
    });
    if (!isValidIdentificacaoPhone({
      telefone: telefoneContato,
      telefoneDdi: telefoneDdiContato,
      telefonePais: telefonePaisContato,
    })) {
      setSaveMessage({ type: 'error', text: 'Preencha um telefone válido.' });
      return;
    }
    setSavingPerfil(true);
    setSaveMessage(null);
    try {
      await PsiquiatraService.updatePerfil(user.uid, registroNumero.replace(/\D/g, ''), phoneWrite.telefone, cidadesSelecionadas, {
        crmUf: crmUf.trim().toUpperCase(),
        rqe: rqe.trim(),
        genero: perfilGenero,
        instagramUsuario: perfilInstagram,
        cep: perfilCep,
        nomeLocal: perfilNomeLocal,
        endereco: perfilEndereco,
        numero: perfilNumero,
        pontoReferencia: perfilPontoRef,
        googleMapsUrl: perfilGoogleMaps,
        fotoPerfilUrl: perfilFotoUrl,
        nome: perfilNome.trim() || psiquiatra.nome,
        ...(phoneWrite.telefoneDdi
          ? { telefoneDdi: phoneWrite.telefoneDdi, telefonePais: phoneWrite.telefonePais }
          : {}),
      });
      const fresh = await PsiquiatraService.getPsiquiatraByUserId(user.uid);
      if (fresh) {
        setPsiquiatra(fresh);
        applyPsiquiatraToForm(fresh, user);
      }
      setSaveMessage({ type: 'success', text: 'Perfil salvo com sucesso.' });
    } catch (error) {
      console.error('Erro ao salvar perfil do psiquiatra:', error);
      setSaveMessage({ type: 'error', text: 'Não foi possível salvar o perfil. Tente novamente.' });
    } finally {
      setSavingPerfil(false);
    }
  };

  const buscarEnderecoPorCepPsi = async (cep: string) => {
    if (cep.length !== 8) return;
    setBuscandoCepPerfil(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        const rua = [data.logradouro, data.bairro, `${data.localidade}/${data.uf}`]
          .filter(Boolean)
          .join(', ');
        setPerfilEndereco(rua);
      }
    } catch {
      // silencioso — mesmo padrão Nutri
    } finally {
      setBuscandoCepPerfil(false);
    }
  };

  if (loading || loadingPsiquiatra) {
    return (
      <div style={organizationShellCssVars(shellChrome)}>
        <CadastroVerificacaoScreen
          backgroundColor={shellSplash.backgroundColor}
          spinnerClassName={shellSplash.spinnerClassName}
          messageClassName={shellSplash.messageClassName}
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!psiquiatra) {
    return (
      <ProfissionalCadastroGateModal
        tipo="psi"
        loading={criandoCadastro}
        onConfirm={handleConfirmarCadastro}
        onDecline={handleRecusarCadastro}
      />
    );
  }

  const telaBloqueioVerificacao =
    !!user?.uid && !loading && !loadingPsiquiatra && psiquiatra.isVerificado !== true;

  const avatarSrc = perfilFotoUrl || user.photoURL || null;

  const renderContent = () => {
    switch (activeMenu) {
      case 'home': {
        const pacientes = pacientesVisiveisDash.map((p) => p.paciente);
        return (
          <ProfissionalDashboardHome
            pacientesOwn={pacientes}
            todosPacientesOftware={[]}
            loadingTodosPacientes={loadingPacientesDash}
            filtroBase={filtroBaseDashboard}
            onFiltroBaseChange={setFiltroBaseDashboard}
            organizationName={organizationShellBranding?.publicName?.trim() || 'Oftware'}
            navyColor={shellChrome.secondaryColor}
            chrome={shellChrome}
            filtroDose={filtroDosePerdaPeso}
            filtroFaixaEtaria={filtroFaixaEtariaPerdaPeso}
            filtroSexo={filtroSexoPerdaPeso}
            onDoseChange={setFiltroDosePerdaPeso}
            onFaixaChange={setFiltroFaixaEtariaPerdaPeso}
            onSexoChange={setFiltroSexoPerdaPeso}
            onOpenPaciente={openWorkspaceFromDash}
            medicosVinculados={(psiquiatra.medicoVinculadoIds || []).filter(Boolean).length}
            afterStatusKpis={
              <MetaPsiDashboardHome
                hideHeroKpis
                psiquiatraId={psiquiatra.id || user.uid}
                medicoVinculadoIds={psiquiatra.medicoVinculadoIds || []}
                navyColor={shellChrome.secondaryColor}
                chrome={shellChrome}
                onNavigate={(menu) => navegarMenu(menu)}
              />
            }
          />
        );
      }
      case 'leads': {
        const compartilhadosCrm: PacienteCompartilhadoCrmItem[] = pacientesVisiveisDash.map((item) => ({
          vinculoId: item.vinculoId,
          pacienteId: item.pacienteId,
          paciente: item.paciente,
          medicoId: item.medicoId,
          medicoNome: item.medicoNome,
          dataCompartilhamento: item.dataCompartilhamento,
        }));
        return (
          <div className="space-y-6" data-metapsi-leads>
            {loadingPacientesDash && compartilhadosCrm.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                Carregando leads…
              </div>
            ) : (
              <MetaPsiHomeLeadsPipeline
                psiquiatraId={psiquiatra.id || user.uid}
                userEmail={user.email}
                compartilhados={compartilhadosCrm}
                onOpenAbaPsi={openWorkspaceFromDash}
              />
            )}
          </div>
        );
      }
      case 'medicos':
        return (
          <div className="space-y-4">
            {vinculoMessage ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                {vinculoMessage}
              </div>
            ) : null}
            <MetaPsiMedicosVinculoPanel
              userId={user.uid}
              psiquiatra={psiquiatra}
              onMessage={setVinculoMessage}
              onPsiquiatraRefresh={async () => {
                const doc = await PsiquiatraService.getPsiquiatraByUserId(user.uid);
                if (doc) {
                  setPsiquiatra(doc);
                  applyPsiquiatraToForm(doc, user);
                }
              }}
            />
          </div>
        );
      case 'pacientes':
        return (
          <div className="space-y-4">
            {vinculoMessage ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                {vinculoMessage}
              </div>
            ) : null}
            <MetaPsiPacientesPanel
              userId={user.uid}
              psiquiatra={psiquiatra}
              sidebarCollapsed={sidebarCollapsed}
              onMessage={setVinculoMessage}
            />
          </div>
        );
      case 'financeiro':
        return (
          <EmptyPanel
            title="Financeiro"
            description="O módulo financeiro ainda não está disponível para este perfil."
            Icon={DollarSign}
          />
        );
      case 'calendario':
        return (
          <EmptyPanel
            title="Calendário"
            description="O calendário ainda não está disponível para este perfil."
            Icon={Calendar}
          />
        );
      case 'comunicacao': {
        if (!user || !psiquiatra) {
          return (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Carregando perfil…
            </div>
          );
        }
        /* Desktop embutido (igual Nutri); mobile usa modal Mensagens (bottom nav / dropdown). */
        return (
          <div className="hidden min-w-0 w-full md:block">
            {renderComunicacaoPanel()}
          </div>
        );
      }
      case 'meu-perfil': {
        const inputClass =
          'block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500 transition-shadow';
        const inputDisabledClass =
          'block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-700 shadow-sm';
        const labelClass = 'flex items-center gap-2 text-sm font-semibold text-gray-800';
        return (
          <div className="w-full max-w-none space-y-5" data-metapsi-meu-perfil>
            <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
              {/* Cabeçalho — chrome Nutri */}
              <div className="flex items-center rounded-t-2xl border-b border-gray-100 bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 dark:border-gray-700">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-2 ring-white/30 sm:h-14 sm:w-14">
                    {perfilFotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={perfilFotoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle className="h-7 w-7 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-green-100">Meu Perfil</p>
                    <h2 className="truncate font-bold text-white">
                      {psiquiatra.nome || user.displayName || 'Psiquiatra'}
                    </h2>
                    <p className="truncate text-xs text-green-100/90">Psiquiatra</p>
                  </div>
                </div>
              </div>

              {/* Abas — mesmos chips Nutri; omitidas Assinatura / Meu Link / WhatsApp (legítimo) */}
              <div className="border-b border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/30">
                <nav className="flex flex-wrap gap-1.5" aria-label="Pastas do perfil">
                  {(
                    [
                      { id: 'dados', label: 'Dados Iniciais', short: 'Dados', Icon: UserCircle },
                      { id: 'endereco', label: 'Endereço de Atendimento', short: 'Endereço', Icon: MapPin },
                      { id: 'cidades', label: 'Cidade de Atendimento', short: 'Cidades', Icon: Building },
                    ] as const
                  ).map(({ id, label, short, Icon }) => {
                    const ativa = meuPerfilAba === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setMeuPerfilAba(id);
                          setSaveMessage(null);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                          ativa
                            ? 'bg-white text-green-700 shadow-md ring-1 ring-green-500/20 dark:bg-gray-800 dark:text-green-400'
                            : 'text-gray-600 hover:bg-white/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/60'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${ativa ? 'text-green-600' : ''}`} />
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden">{short}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {meuPerfilAba === 'dados' && (
                  <div className="space-y-5">
                    <div
                      className={`flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 ${
                        psiquiatra.isVerificado
                          ? 'border border-green-200 bg-green-50'
                          : 'border border-yellow-200 bg-yellow-50'
                      }`}
                    >
                      {psiquiatra.isVerificado ? (
                        <ShieldCheck size={16} className="text-green-600" />
                      ) : (
                        <Clock size={16} className="text-yellow-600" />
                      )}
                      <span
                        className={`text-sm font-semibold ${
                          psiquiatra.isVerificado ? 'text-green-900' : 'text-yellow-900'
                        }`}
                      >
                        {psiquiatra.isVerificado ? 'Perfil verificado' : 'Aguardando verificação'}
                      </span>
                      {psiquiatra.isVerificado ? (
                        <span className="ml-auto text-xs text-green-700">
                          {(psiquiatra.medicoVinculadoIds || []).length} médico(s) vinculado(s)
                        </span>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-dashed border-green-200 bg-green-50/30 p-5">
                      <MedicoFotoPerfilEditor
                        currentUrl={perfilFotoUrl}
                        onUrlChange={(url) => {
                          setPerfilFotoUrl(url);
                          if (!user?.uid) return;
                          void PsiquiatraService.updateFotoPerfil(user.uid, url)
                            .then(() => {
                              setPsiquiatra((prev) => (prev ? { ...prev, fotoPerfilUrl: url } : prev));
                            })
                            .catch((err) => {
                              console.error('Erro ao salvar foto de perfil do psiquiatra:', err);
                            });
                        }}
                        disabled={savingPerfil || loadingPsiquiatra}
                        profissao="psiquiatra"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className={labelClass}>
                          <UserCircle className="h-4 w-4 text-green-600" />
                          Nome
                        </label>
                        <input
                          type="text"
                          value={perfilNome}
                          onChange={(e) => setPerfilNome(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>
                          <Mail className="h-4 w-4 text-green-600" />
                          E-mail
                        </label>
                        <input
                          type="email"
                          readOnly
                          disabled
                          value={psiquiatra.email || user.email || ''}
                          className={inputDisabledClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>
                          <Stethoscope className="h-4 w-4 text-green-600" />
                          Especialidade
                        </label>
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={PSIQUIATRA_ESPECIALIDADE}
                          className={inputDisabledClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>
                          <UserCircle className="h-4 w-4 text-green-600" />
                          Gênero
                        </label>
                        <select
                          value={perfilGenero}
                          onChange={(e) => setPerfilGenero(e.target.value as 'M' | 'F' | '')}
                          className={inputClass}
                        >
                          <option value="">Selecione</option>
                          <option value="M">Masculino</option>
                          <option value="F">Feminino</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                          Nº do {PSIQUIATRA_REGISTRO_LABEL} *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={registroNumero}
                          onChange={(e) => setRegistroNumero(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ex: 123456"
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>
                          <MapPin className="h-4 w-4 text-green-600" />
                          UF do CRM *
                        </label>
                        <select
                          value={crmUf}
                          onChange={(e) => setCrmUf(e.target.value)}
                          className={inputClass}
                        >
                          {ESTADOS_BR_OPTIONS.map((o) => (
                            <option key={o.value || 'empty'} value={o.value}>
                              {o.value ? `${o.value} — ${o.label}` : o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                          RQE (opcional)
                        </label>
                        <input
                          type="text"
                          value={rqe}
                          onChange={(e) => setRqe(e.target.value)}
                          placeholder="Registro de Qualificação de Especialista"
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>
                          <Phone className="h-4 w-4 text-green-600" />
                          Telefone para contato *
                        </label>
                        <InternationalPhoneInput
                          id="metapsi-perfil-telefone"
                          value={{
                            telefone: telefoneContato,
                            telefoneDdi: telefoneDdiContato,
                            telefonePais: telefonePaisContato,
                          }}
                          onChange={(next) => {
                            setTelefoneContato(next.telefone);
                            setTelefoneDdiContato(next.telefoneDdi);
                            setTelefonePaisContato(next.telefonePais);
                          }}
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={labelClass}>
                          <LinkIcon className="h-4 w-4 text-green-600" />
                          Instagram (@)
                        </label>
                        <input
                          type="text"
                          value={perfilInstagram}
                          onChange={(e) => setPerfilInstagram(e.target.value)}
                          placeholder="@usuario"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {meuPerfilAba === 'endereco' && (
                  <div className="space-y-5">
                    <div className="space-y-1.5">
                      <label className={labelClass}>
                        <MapPin className="h-4 w-4 text-green-600" />
                        CEP
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={perfilCep.replace(/(\d{5})(\d{1,3})/, '$1-$2')}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 8);
                            setPerfilCep(v);
                            if (v.length === 8) void buscarEnderecoPorCepPsi(v);
                          }}
                          placeholder="00000-000"
                          maxLength={9}
                          className={`flex-1 ${inputClass}`}
                        />
                        <button
                          type="button"
                          onClick={() => void buscarEnderecoPorCepPsi(perfilCep)}
                          disabled={perfilCep.length !== 8 || buscandoCepPerfil}
                          className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
                        >
                          {buscandoCepPerfil ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                          Buscar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelClass}>
                        <Building className="h-4 w-4 text-green-600" />
                        Nome do local ou clínica
                      </label>
                      <input
                        type="text"
                        value={perfilNomeLocal}
                        onChange={(e) => setPerfilNomeLocal(e.target.value)}
                        placeholder="Ex: Clínica Saúde Plena"
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_120px]">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-800">Logradouro</label>
                        <input
                          type="text"
                          value={perfilEndereco}
                          onChange={(e) => setPerfilEndereco(e.target.value)}
                          placeholder="Preenchido pelo CEP ou digite: rua, bairro — cidade/UF"
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-800">Número</label>
                        <input
                          type="text"
                          value={perfilNumero}
                          onChange={(e) => setPerfilNumero(e.target.value)}
                          placeholder="Ex: 1200"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-800">Ponto de referência</label>
                      <input
                        type="text"
                        value={perfilPontoRef}
                        onChange={(e) => setPerfilPontoRef(e.target.value)}
                        placeholder="Ex: Próximo ao shopping, 3º andar"
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelClass}>
                        <LinkIcon className="h-4 w-4 text-green-600" />
                        URL do Google Maps
                      </label>
                      <input
                        type="url"
                        value={perfilGoogleMaps}
                        onChange={(e) => setPerfilGoogleMaps(e.target.value)}
                        placeholder="https://maps.app.goo.gl/..."
                        className={inputClass}
                      />
                      <p className="text-xs text-gray-500">
                        No Google Maps, abra o local → Compartilhar → Copiar link e cole aqui.
                      </p>
                      {perfilGoogleMaps.trim() ? (
                        <a
                          href={perfilGoogleMaps.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700"
                        >
                          <MapPin className="h-4 w-4" /> Testar link no Maps
                        </a>
                      ) : null}
                    </div>
                  </div>
                )}

                {meuPerfilAba === 'cidades' && (
                  <div className="space-y-5">
                    <p className="text-sm font-medium text-gray-700">Adicione pelo menos uma cidade *</p>
                    <VerificationCidadesFields
                      cidades={cidadesSelecionadas}
                      onChange={setCidadesSelecionadas}
                      userId={user.uid}
                    />
                  </div>
                )}
              </div>

              {/* Rodapé Salvar — chrome Nutri; pb-20 do shell evita cobrir bottom nav */}
              <div className="flex flex-col items-center gap-3 border-t border-gray-100 bg-gray-50/80 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/30 sm:flex-row">
                {saveMessage ? (
                  <div
                    className={`flex flex-1 items-center gap-2 text-sm font-medium ${
                      saveMessage.type === 'success' ? 'text-green-700' : 'text-red-700'
                    }`}
                    role="status"
                  >
                    {saveMessage.type === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    {saveMessage.text}
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
                <button
                  type="button"
                  onClick={() => void handleSalvarPerfil()}
                  disabled={savingPerfil}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 font-semibold text-white shadow-md transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto"
                >
                  {savingPerfil ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Salvar Perfil
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <>
      {telaBloqueioVerificacao && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-black/50"
          aria-modal="true"
          role="dialog"
          aria-labelledby="metapsi-bloqueio-verificacao-titulo"
        >
          <span id="metapsi-bloqueio-verificacao-titulo" className="sr-only">
            Verificação obrigatória — cadastro de psiquiatra
          </span>
          <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-white">
            <MetaNutriPersonalWizard
              tipo="psi"
              profissional={psiquiatra}
              setProfissional={setPsiquiatra}
              userDisplayName={user.displayName}
              userId={user.uid}
              onSave={async (_closeAfter, m) => {
                if (!m?.userId) return;
                await PsiquiatraService.updateCadastroVerificacao(m.userId, {
                  nome: m.nome,
                  telefone: m.telefone,
                  registroNumero: m.registroNumero,
                  crmUf: 'crmUf' in m ? String(m.crmUf || '') : crmUf,
                  cidades: m.cidades,
                  docVerificacaoCnhUrl: m.docVerificacaoCnhUrl ?? null,
                  docVerificacaoSelfieUrl: m.docVerificacaoSelfieUrl ?? null,
                  docVerificacaoRegistroUrl: m.docVerificacaoRegistroUrl ?? null,
                  ...(m.telefoneDdi?.trim()
                    ? { telefoneDdi: m.telefoneDdi.trim(), telefonePais: m.telefonePais?.trim() }
                    : {}),
                });
                const fresh = await PsiquiatraService.getPsiquiatraByUserId(user.uid);
                if (fresh) {
                  setPsiquiatra(fresh);
                  applyPsiquiatraToForm(fresh, user);
                  setLoadTick((t) => t + 1);
                }
              }}
              saving={salvandoCadastro}
              setSaving={setSalvandoCadastro}
              resumeAfterLoadTick={loadTick}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 w-full max-w-full" style={organizationShellCssVars(shellChrome)}>
        {tabletNavOpen ? (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:block xl:hidden"
            aria-hidden="true"
            onClick={() => setTabletNavOpen(false)}
          />
        ) : null}

        {/* Sidebar: tablet (md–xl) trilho + overlay; desktop (xl+) completo — mesmo padrão MetaNutri */}
        <div
          data-mn-nav-open={tabletNavOpen ? '' : undefined}
          data-organization-id={organizationShellContext.organizationId || undefined}
          data-organization-match={organizationShellContext.organizationMatch ? 'true' : 'false'}
          className={`mn-sidebar hidden md:block fixed inset-y-0 left-0 z-40 shadow-lg transition-all duration-300 border-r border-white/10 w-16 ${
            sidebarCollapsed ? 'xl:w-16' : 'xl:w-64'
          }`}
          style={{ backgroundColor: shellChrome.secondaryColor, ...organizationShellCssVars(shellChrome) }}
        >
          <div className="flex h-full flex-col">
            <div className="mn-sidebar-top flex h-16 items-center justify-between border-b border-white/10 px-2 xl:px-4">
              <div className={`mn-sidebar-label flex items-center ${sidebarCollapsed ? 'xl:hidden' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sidebarOrganizationLogoSrc}
                  alt={`${sidebarOrganizationLogoAlt} Logo`}
                  className="h-6 w-auto object-contain"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`rounded-md p-2 transition-colors xl:hidden ${organizationShellIconButtonClass(shellChrome, 'text-[#E8EDED] hover:bg-white/10')}`}
                  onClick={() => setTabletNavOpen((open) => !open)}
                  aria-label={tabletNavOpen ? 'Fechar menu' : 'Abrir menu'}
                  title="Menu"
                >
                  {tabletNavOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
                <button
                  type="button"
                  className={`hidden rounded-md p-2 transition-colors xl:flex ${organizationShellIconButtonClass(shellChrome, 'text-[#E8EDED] hover:bg-white/10')}`}
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  aria-label={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
                >
                  {sidebarCollapsed ? <Menu size={24} /> : <X size={24} />}
                </button>
              </div>
            </div>

            <div
              className={`mn-sidebar-label border-b border-white/10 px-4 py-4 ${
                sidebarCollapsed ? 'xl:hidden' : ''
              }`}
            >
              <div className="mb-2">
                <p className={organizationShellForegroundClass(shellChrome, 'text-sm font-semibold text-[#E8EDED]')}>Bem-vindo,</p>
                <div className="flex items-center gap-2">
                  <p className={organizationShellForegroundClass(shellChrome, 'text-sm font-semibold text-[#E8EDED]')}>
                    {psiquiatra.nome || user.displayName || 'Psiquiatra'}
                  </p>
                  {psiquiatra.isVerificado ? (
                    <ShieldCheck className="h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <Shield className="h-4 w-4 shrink-0 text-red-600" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={organizationShellBadgeClass(shellChrome, 'inline-flex items-center rounded-full border border-[#4CCB7A]/40 bg-[#4CCB7A]/20 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-[#4CCB7A]')}>
                  Psiquiatra
                </span>
              </div>
            </div>

            <nav
              className={`mn-sidebar-nav flex-1 space-y-2 overflow-y-auto py-4 ${
                sidebarCollapsed ? 'px-2' : 'px-4'
              }`}
              data-metapsi-sidebar-nav
            >
              {METAPSI_SIDEBAR_NAV.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => navegarMenu(id)}
                  className={`mn-sidebar-item flex w-full items-center rounded-md py-2 text-sm font-medium transition-colors ${
                    sidebarCollapsed ? 'justify-center px-0' : 'px-3'
                  } ${
                    activeMenu === id
                      ? organizationShellActiveClass(
                          shellChrome,
                          'border-r-2 border-[#4CCB7A] bg-white/10 text-[#4CCB7A]',
                        )
                      : organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')
                  }`}
                  title={label}
                >
                  <Icon
                    size={sidebarCollapsed ? 24 : 20}
                    className={`mn-sidebar-item-icon shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`}
                  />
                  <span className={`mn-sidebar-label ${sidebarCollapsed ? 'xl:hidden' : ''}`}>
                    {label}
                  </span>
                </button>
              ))}
            </nav>

            <div
              className={`mn-sidebar-footer border-t border-white/10 py-4 ${
                sidebarCollapsed ? 'px-2' : 'px-4'
              }`}
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className={`mn-sidebar-item flex w-full items-center rounded-md py-2 text-sm font-medium transition-colors ${organizationShellIdleClass(shellChrome, 'text-[#E8EDED]/80 hover:bg-white/10 hover:text-[#E8EDED]')} ${
                    sidebarCollapsed ? 'justify-center px-0' : 'px-3'
                  }`}
                  title="Perfil"
                >
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc}
                      alt="Profile"
                      className={`mn-sidebar-item-icon h-8 w-8 shrink-0 rounded-full ${
                        sidebarCollapsed ? '' : 'mr-3'
                      }`}
                    />
                  ) : (
                    <UserCircle
                      size={sidebarCollapsed ? 24 : 20}
                      className={`mn-sidebar-item-icon shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`}
                    />
                  )}
                  <span
                    className={`mn-sidebar-label flex flex-1 items-center ${
                      sidebarCollapsed ? 'xl:hidden' : ''
                    }`}
                  >
                    <span className="flex-1 text-left">Perfil</span>
                    <ChevronDown size={16} className={showProfileDropdown ? 'rotate-180' : ''} />
                  </span>
                </button>
                {showProfileDropdown ? (
                  <div
                    className={`mn-profile-dropdown absolute bottom-full left-0 right-0 z-50 mb-2 min-w-[280px] rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 ${
                      sidebarCollapsed
                        ? 'xl:bottom-0 xl:left-full xl:right-auto xl:mb-0 xl:ml-2'
                        : ''
                    }`}
                  >
                    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                      <div className="flex items-center gap-3">
                        {avatarSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarSrc} alt="Profile" className="h-12 w-12 rounded-full" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600">
                            <UserCircle size={24} className="text-gray-600 dark:text-gray-300" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {psiquiatra.nome || user.displayName || 'Usuário'}
                          </p>
                          <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                            {user.email || ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMeuPerfilAba('dados');
                          navegarMenu('meu-perfil');
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <UserCircle size={16} className="text-gray-600 dark:text-gray-400" />
                        Meu Perfil
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navegarMenu('medicos');
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 lg:hidden"
                      >
                        <Stethoscope size={16} className="text-gray-600 dark:text-gray-400" />
                        Médicos
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowMensagensComunicacaoModal(true);
                          setShowProfileDropdown(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 lg:hidden"
                        data-metapsi-mensagens-mobile
                      >
                        <Mail size={16} className="text-gray-600 dark:text-gray-400" />
                        Mensagens
                      </button>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700" />
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      data-metapsi-logout
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sair
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div
          className={`min-w-0 max-w-full flex-1 bg-gray-50 pb-20 transition-all duration-300 dark:bg-gray-900 md:pb-0 md:pl-16 ${
            sidebarCollapsed ? 'xl:pl-16' : 'xl:pl-64'
          }`}
        >
          {/* Mobile Header — estrutura MetaNutri; Brain = identidade Psiquiatria */}
          <div
            className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:hidden"
            data-metapsi-mobile-header
          >
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start">
                  <div className="mr-2 flex flex-col items-center">
                    <OrganizationShellMobileMark
                      organizationId={organizationShellContext.organizationId}
                      logoSrc={headerOrganizationLogoSrc}
                      alt={sidebarOrganizationLogoAlt}
                    >
                      <Brain className="h-6 w-6 shrink-0 text-green-600" />
                    </OrganizationShellMobileMark>
                    {psiquiatra.isVerificado ? (
                      <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <Shield className="mt-1 h-4 w-4 shrink-0 text-red-600" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-bold text-gray-900 dark:text-white">
                      {psiquiatra.nome || user.displayName || 'Psiquiatra'}
                    </span>
                    <span className="truncate text-sm text-gray-900 dark:text-white">Psiquiatra</span>
                  </div>
                </div>
              </div>
              <div className="relative flex shrink-0 items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  aria-label="Perfil"
                >
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarSrc} alt="Profile" className="h-8 w-8 rounded-full" />
                  ) : (
                    <UserCircle className="h-6 w-6" />
                  )}
                </button>
                {showProfileDropdown ? (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProfileDropdown(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 top-full z-50 mt-2 min-w-[280px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                        <div className="flex items-center gap-3">
                          {avatarSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarSrc} alt="Profile" className="h-12 w-12 rounded-full" />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600">
                              <UserCircle size={24} className="text-gray-600 dark:text-gray-300" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {psiquiatra.nome || user.displayName || 'Usuário'}
                            </p>
                            <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                              {user.email || ''}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setMeuPerfilAba('dados');
                            navegarMenu('meu-perfil');
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <UserCircle size={16} className="text-gray-600 dark:text-gray-400" />
                          Meu Perfil
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navegarMenu('medicos');
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          <Stethoscope size={16} className="text-gray-600 dark:text-gray-400" />
                          Médicos
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMensagensComunicacaoModal(true);
                            setShowProfileDropdown(false);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                          data-metapsi-mensagens-mobile
                        >
                          <Mail size={16} className="text-gray-600 dark:text-gray-400" />
                          Mensagens
                        </button>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700" />
                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        data-metapsi-logout
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Sair
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <main
            className={`bg-gray-50 dark:bg-gray-900 ${
              ['home', 'pacientes', 'leads', 'financeiro', 'calendario'].includes(activeMenu)
                ? 'px-2 py-6 sm:p-6'
                : 'p-4 md:p-6'
            }`}
          >
            {renderContent()}
          </main>
        </div>
      </div>

      {workspaceDash && user && psiquiatra ? (
        <MetaPsiPacienteWorkspaceModal
          open
          pacienteId={workspaceDash.pacienteId}
          psiquiatraId={psiquiatra.id || user.uid}
          medicoLabel={
            workspaceDash.medicoGenero === 'F'
              ? `Dra. ${workspaceDash.medicoNome}`
              : workspaceDash.medicoGenero === 'M'
                ? `Dr. ${workspaceDash.medicoNome}`
                : workspaceDash.medicoNome || 'Médico'
          }
          sidebarCollapsed={sidebarCollapsed}
          onClose={() => setWorkspaceDash(null)}
        />
      ) : null}

      {/* Mobile Bottom Navigation — chrome MetaNutri; itens Psi */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden"
        data-metapsi-bottom-nav
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', ...organizationShellCssVars(shellChrome) }}
      >
        <div className="flex items-center justify-around px-1 py-2">
          {METAPSI_BOTTOM_NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => navegarMenu(id)}
              className={`flex flex-1 flex-col items-center justify-center rounded-lg px-1 py-1.5 transition-colors ${
                activeMenu === id
                  ? organizationShellActiveClass(shellChrome, 'bg-green-100 text-green-700', 'light')
                  : 'text-gray-600'
              }`}
            >
              <Icon className="mb-1 h-4 w-4" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modal Mensagens (mobile — mesmo canal da Comunicação desktop; padrão Personal) */}
      {showMensagensComunicacaoModal && psiquiatra && user ? (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/50 lg:items-center lg:p-4">
          <div className="flex h-full w-full flex-col overflow-hidden bg-white lg:h-[min(90vh,820px)] lg:max-w-5xl lg:rounded-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-gray-900">Mensagens</h2>
                <p className="truncate text-sm text-gray-500">
                  Médicos e pacientes com compartilhamento ativo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMensagensComunicacaoModal(false)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>
            <div className="min-h-0 flex-1 p-2 sm:p-3">
              {renderComunicacaoPanel({
                hideHeaderTitle: true,
                className: 'h-full min-h-0 rounded-lg',
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
