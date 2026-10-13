'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import {
  Brain,
  ClipboardList,
  Dumbbell,
  FileText,
  FlaskConical,
  Menu,
  Pill,
  Scale,
  Syringe,
  User as UserIcon,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import PacienteModalHeader from '@/components/metaadmin/paciente-modal/PacienteModalHeader';
import { PacienteIdentificacaoTabContent } from '@/components/metaadmin/paciente-modal/PacienteIdentificacaoTabContent';
import { PacienteDadosClinicosTabContent } from '@/components/metaadmin/paciente-modal/PacienteDadosClinicosTabContent';
import { ProntuarioTab } from '@/app/metaadmin/components/paciente-modal/prontuario/ProntuarioTab';
import { BioImpedanciaDisplay } from '@/components/bodymap/BioImpedanciaDisplay';
import { EvolucaoSeguimentoReadonlyView } from '@/components/profissional/EvolucaoSeguimentoReadonlyView';
import NutriContent from '@/components/NutriContent';
import { PersonalPageContent } from '@/app/meta/personal/page';
import MetaPsiExamesReadonlyTab from '@/components/metapsi/MetaPsiExamesReadonlyTab';
import MetaPsiPrescricoesReadonlyTab from '@/components/metapsi/MetaPsiPrescricoesReadonlyTab';
import MetaPsiPsiquiatriaTab from '@/components/metapsi/MetaPsiPsiquiatriaTab';
import {
  assertPsiquiatraCanOpenPaciente,
  METAPSI_PACIENTE_PASTAS,
} from '@/lib/metapsi/openPacienteWorkspaceGate';
import { PacienteService } from '@/services/pacienteService';

const PASTAS_UI = METAPSI_PACIENTE_PASTAS.map((p) => {
  const Icon =
    p.id === 1
      ? UserIcon
      : p.id === 2
        ? ClipboardList
        : p.id === 3
          ? FileText
          : p.id === 4
            ? FlaskConical
            : p.id === 5
              ? Scale
              : p.id === 6
                ? Syringe
                : p.id === 7
                  ? Pill
                  : p.id === 8
                    ? UtensilsCrossed
                    : p.id === 9
                      ? Brain
                      : Dumbbell;
  return { ...p, Icon };
});

type Props = {
  open: boolean;
  pacienteId: string;
  psiquiatraId: string;
  medicoLabel: string;
  /** Offset da sidebar desktop (ex.: xl:left-64). */
  sidebarCollapsed?: boolean;
  onClose: () => void;
  onDenied?: (reason: string) => void;
};

/**
 * Workspace clínico do paciente no /metapsi — leitura multidisciplinar.
 * Abertura condicionada a hasActivePsiquiatraAccess (SoT paciente_psiquiatra).
 */
export default function MetaPsiPacienteWorkspaceModal({
  open,
  pacienteId,
  psiquiatraId,
  medicoLabel,
  sidebarCollapsed = false,
  onClose,
  onDenied,
}: Props) {
  const [pastaAtiva, setPastaAtiva] = useState(1);
  const [tabletPastasOpen, setTabletPastasOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [paciente, setPaciente] = useState<PacienteCompleto | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aclOk, setAclOk] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const fechar = useCallback(() => {
    setPaciente(null);
    setAclOk(false);
    setErro(null);
    setLoading(false);
    setPastaAtiva(1);
    setTabletPastasOpen(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    let cancelado = false;
    (async () => {
      setLoading(true);
      setErro(null);
      setAclOk(false);
      setPaciente(null);
      setPastaAtiva(1);
      setTabletPastasOpen(false);

      const gate = await assertPsiquiatraCanOpenPaciente(pacienteId, psiquiatraId);
      if (cancelado) return;

      if (!gate.ok) {
        setErro(
          gate.reason === 'missing_ids'
            ? 'Identificação incompleta para abrir o paciente.'
            : 'Você não tem autorização ativa para este paciente.'
        );
        onDenied?.(gate.reason);
        setLoading(false);
        return;
      }

      setAclOk(true);
      try {
        const p = await PacienteService.getPacienteById(pacienteId);
        if (cancelado) return;
        if (!p) {
          setErro('Paciente não encontrado.');
          return;
        }
        // Revalida ACL após carregar (SoT prevalece; IDs na URL não bastam).
        const recheck = await assertPsiquiatraCanOpenPaciente(pacienteId, psiquiatraId);
        if (cancelado) return;
        if (!recheck.ok) {
          setAclOk(false);
          setErro('Você não tem autorização ativa para este paciente.');
          onDenied?.(recheck.reason);
          return;
        }
        setPaciente(p);
      } catch (e) {
        console.error(e);
        if (!cancelado) setErro('Erro ao carregar o paciente.');
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [open, pacienteId, psiquiatraId, onDenied]);

  const nomePaciente = useMemo(
    () => paciente?.dadosIdentificacao?.nomeCompleto || paciente?.nome || 'Paciente',
    [paciente]
  );

  const medicoHeaderLabel = useMemo(() => {
    const label = String(medicoLabel || '').trim();
    if (!label) return null;
    if (/^dr\.?\s|^dra\.?\s/i.test(label)) return label;
    return `Dr(a). ${label}`;
  }, [medicoLabel]);

  if (!open) return null;

  const modalTelaCheia = isMobile;

  const sexoBiologico =
    paciente?.dadosIdentificacao?.sexoBiologico ??
    (paciente as { dadosidentificacao?: { sexobiologico?: string } } | null)?.dadosidentificacao
      ?.sexobiologico;
  const imagemSrc =
    sexoBiologico === 'F' ? '/bioimpedancia/mulher-frente.png' : '/bioimpedancia/homem-frente.png';
  const imageAlt = sexoBiologico === 'F' ? 'Body map feminino' : 'Body map masculino';

  const pastasFillHeight =
    pastaAtiva === 3 ||
    pastaAtiva === 4 ||
    pastaAtiva === 7 ||
    pastaAtiva === 8 ||
    pastaAtiva === 9 ||
    pastaAtiva === 10;

  const retryLoad = () => {
    // Re-dispara o effect limpando e reabrindo o mesmo paciente
    setErro(null);
    setAclOk(false);
    setPaciente(null);
    setLoading(true);
    void (async () => {
      const gate = await assertPsiquiatraCanOpenPaciente(pacienteId, psiquiatraId);
      if (!gate.ok) {
        setErro(
          gate.reason === 'missing_ids'
            ? 'Identificação incompleta para abrir o paciente.'
            : 'Você não tem autorização ativa para este paciente.',
        );
        onDenied?.(gate.reason);
        setLoading(false);
        return;
      }
      setAclOk(true);
      try {
        const p = await PacienteService.getPacienteById(pacienteId);
        if (!p) {
          setErro('Paciente não encontrado.');
          return;
        }
        const recheck = await assertPsiquiatraCanOpenPaciente(pacienteId, psiquiatraId);
        if (!recheck.ok) {
          setAclOk(false);
          setErro('Você não tem autorização ativa para este paciente.');
          onDenied?.(recheck.reason);
          return;
        }
        setPaciente(p);
      } catch (e) {
        console.error(e);
        setErro('Erro ao carregar o paciente.');
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div
      className={
        modalTelaCheia
          ? 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-0'
          : `fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 md:bg-transparent md:p-0 md:items-stretch md:justify-start md:transition-[left] md:duration-300 md:left-16 ${
              sidebarCollapsed ? 'xl:left-16' : 'xl:left-64'
            }`
      }
      role="dialog"
      aria-modal="true"
      aria-label="Workspace clínico do paciente"
      data-metapsi-workspace
      data-metapsi-workspace-fullscreen={modalTelaCheia ? '' : undefined}
    >
      <div
        className={
          modalTelaCheia
            ? 'flex h-full w-full flex-col overflow-hidden bg-white shadow-xl'
            : 'flex h-[90vh] w-full min-w-0 max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-xl md:h-full md:max-w-none md:w-full md:rounded-none md:border-l md:border-gray-200 md:shadow-none'
        }
      >
        <PacienteModalHeader
          compact={modalTelaCheia}
          className={modalTelaCheia ? 'sticky top-0 z-10' : ''}
          patientName={loading || !aclOk || !paciente ? 'Paciente' : nomePaciente}
          dataNascimento={aclOk && paciente ? paciente.dadosIdentificacao?.dataNascimento : undefined}
          cidade={aclOk && paciente ? paciente.dadosIdentificacao?.endereco?.cidade : undefined}
          estado={aclOk && paciente ? paciente.dadosIdentificacao?.endereco?.estado : undefined}
          statusTratamento={aclOk && paciente ? paciente.statusTratamento : undefined}
          relatorioPacienteId={aclOk && paciente?.id ? paciente.id : null}
          medicoLabel={aclOk && paciente ? medicoHeaderLabel : null}
          metaExtra={
            aclOk && paciente && medicoHeaderLabel ? (
              <span className="text-xs text-gray-500">Compartilhado pelo médico responsável</span>
            ) : null
          }
          onClose={fechar}
          closeAriaLabel="Fechar workspace"
        />

        {loading ? (
          <div
            className="flex flex-1 flex-col items-center justify-center py-16"
            data-metapsi-workspace-loading
          >
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-green-600" />
            <p className="mt-4 text-sm text-gray-600">Carregando paciente...</p>
          </div>
        ) : erro || !aclOk || !paciente ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
            data-metapsi-workspace-error
          >
            <p className="max-w-md text-sm text-amber-800">
              {erro || 'Não foi possível abrir o paciente.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {erro && !erro.includes('autorização') && !erro.includes('Identificação') ? (
                <button
                  type="button"
                  onClick={retryLoad}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Tentar novamente
                </button>
              ) : null}
              <button
                type="button"
                onClick={fechar}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            {!modalTelaCheia && (
              <>
                {tabletPastasOpen ? (
                  <div
                    className="absolute inset-0 z-10 hidden bg-black/20 lg:block xl:hidden"
                    aria-hidden="true"
                    onClick={() => setTabletPastasOpen(false)}
                  />
                ) : null}
                <aside
                  data-mn-pastas-open={tabletPastasOpen ? '' : undefined}
                  className="mn-pastas relative z-20 hidden w-16 flex-shrink-0 flex-col border-r border-gray-200 bg-white lg:flex xl:w-56"
                  data-metapsi-workspace-pastas
                >
                  <div className="mn-pastas-top flex h-12 items-center justify-center border-b border-gray-200 px-2 xl:hidden">
                    <button
                      type="button"
                      className="rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100"
                      onClick={() => setTabletPastasOpen((o) => !o)}
                      aria-label={tabletPastasOpen ? 'Fechar pastas' : 'Abrir pastas'}
                      title="Pastas"
                    >
                      {tabletPastasOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                  </div>
                  <nav className="mn-pastas-nav flex-1 space-y-1 overflow-y-auto px-2 py-2 xl:px-3 xl:py-4">
                    {PASTAS_UI.map(({ id, nome, Icon }) => {
                      const ativa = pastaAtiva === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          title={nome}
                          aria-label={nome}
                          aria-current={ativa ? 'page' : undefined}
                          onClick={() => {
                            setPastaAtiva(id);
                            setTabletPastasOpen(false);
                          }}
                          className={`mn-pastas-item flex min-h-11 w-full items-center justify-center rounded-md px-0 py-2 text-sm font-medium transition-colors xl:justify-start xl:px-3 ${
                            ativa
                              ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <Icon size={18} className="mn-pastas-item-icon flex-shrink-0 xl:mr-3" />
                          <span className="mn-pastas-label hidden truncate text-left xl:inline">
                            {nome}
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </aside>
              </>
            )}

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div
                className={`flex w-full flex-shrink-0 overflow-x-auto border-b border-gray-200 bg-white ${
                  modalTelaCheia ? '' : 'lg:hidden'
                }`}
                data-metapsi-workspace-mobile-tabs
              >
                {PASTAS_UI.map(({ id, nome }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPastaAtiva(id)}
                    className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                      pastaAtiva === id
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {nome}
                  </button>
                ))}
              </div>

              <div
                className={`min-h-0 flex-1 ${
                  pastasFillHeight && !modalTelaCheia
                    ? 'flex flex-col overflow-y-auto p-4 lg:overflow-hidden'
                    : modalTelaCheia
                      ? 'overflow-y-auto p-4'
                      : 'overflow-y-auto p-6'
                }`}
              >
                {pastaAtiva === 1 && (
                  <PacienteIdentificacaoTabContent
                    paciente={paciente}
                    medicoResponsavelLabel={medicoHeaderLabel || undefined}
                  />
                )}

                {pastaAtiva === 2 && (
                  <PacienteDadosClinicosTabContent
                    paciente={paciente}
                    allowGerarAnaliseInteligente={false}
                  />
                )}

                {pastaAtiva === 3 && (
                  <ProntuarioTab
                    paciente={paciente}
                    pacienteId={paciente.id}
                    fillHeight={!modalTelaCheia}
                    mobileMode={modalTelaCheia}
                    readOnly
                    canCreateConsulta
                    consultaAuthorRole="psiquiatra"
                    psiquiatraId={psiquiatraId}
                    onIrParaAba={(aba) => setPastaAtiva(aba)}
                  />
                )}

                {pastaAtiva === 4 && <MetaPsiExamesReadonlyTab paciente={paciente} />}

                {pastaAtiva === 5 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Bio Impedância</h3>
                    <BioImpedanciaDisplay
                      paciente={paciente}
                      registros={paciente.bioimpedanciaRegistros || []}
                      imagemSrc={imagemSrc}
                      imageAlt={imageAlt}
                      modoNutricionista
                      isMobile={isMobile}
                      formularioEmModal
                    />
                  </div>
                )}

                {pastaAtiva === 6 && <EvolucaoSeguimentoReadonlyView paciente={paciente} />}

                {pastaAtiva === 7 && <MetaPsiPrescricoesReadonlyTab paciente={paciente} />}

                {pastaAtiva === 8 && (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-emerald-200/60 bg-gradient-to-b from-emerald-50/50 to-white lg:rounded-none lg:border-0 lg:bg-none">
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-white lg:hidden">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                          <UtensilsCrossed size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold">Nutrologia</h3>
                          <p className="text-xs text-emerald-100">Somente visualização</p>
                        </div>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-6 lg:p-0">
                      <NutriContent
                        paciente={paciente}
                        setPaciente={(p: PacienteCompleto) => setPaciente(p)}
                        modoNutricionista
                        embedded
                        somenteVisualizacao
                      />
                    </div>
                  </div>
                )}

                {pastaAtiva === 9 && paciente && (
                  <MetaPsiPsiquiatriaTab pacienteId={paciente.id} />
                )}

                {pastaAtiva === 10 && (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-pink-200/60 bg-gradient-to-b from-pink-50/50 to-white lg:rounded-none lg:border-0 lg:bg-none">
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-pink-600 to-fuchsia-600 px-4 py-3 text-white lg:hidden">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
                          <Dumbbell size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold">Personal Trainer</h3>
                          <p className="text-xs text-pink-100">Somente visualização</p>
                        </div>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <Suspense
                        fallback={
                          <div className="flex min-h-[50dvh] items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
                          </div>
                        }
                      >
                        <PersonalPageContent
                          embedded
                          fromMetaadminEmbedded
                          professionalReadOnly
                          professionalViewerRole="doctor"
                          pacienteProp={paciente}
                        />
                      </Suspense>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
