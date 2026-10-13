'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  Dumbbell,
  FlaskConical,
  Folder,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  RefreshCw,
  Stethoscope,
  User as UserIcon,
  UtensilsCrossed,
} from 'lucide-react';
import { InternationalPhoneInput } from '@/components/phone/InternationalPhoneInput';
import { PatientLocationFields } from '@/components/localizacao/PatientLocationFields';
import { getBrazilStates } from '@/lib/localizacao/brazilLocations';
import {
  gravacaoLocalizacaoPerfil,
  interpretPatientLocation,
  type PatientLocationInput,
  type PatientLocationInterpretation,
} from '@/lib/localizacao/patientLocationField';
import { formatCpf } from '@/lib/meta/metaChatInicial/helpers';
import { DIAGNOSTICO_LABELS } from '@/lib/meta/metaChatInicial/constants';
import { lerDiagnosticoTipos } from '@/lib/meta/metaChatInicial/diagnosticoCondicoes';
import {
  formatInternationalPhoneDisplay,
  isValidIdentificacaoPhone,
  type PersistedInternationalPhone,
} from '@/lib/phone/internationalPhoneValue';
import {
  limitesInputDataNascimento,
  parseDataNascimentoDiaMesLocal,
} from '@/utils/dataNascimentoLocal';
import PlanoNutriAnamnesePanel from '@/components/nutri/PlanoNutriAnamnesePanel';
import { AvaliacaoAtividadeFisicaSummarySections } from '@/components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaSummarySections';
import { buildPhysicalActivityAssessmentSummary } from '@/lib/avaliacaoAtividadeFisica/buildAssessmentSummary';
import { avaliacaoAtividadeFisicaService } from '@/services/avaliacaoAtividadeFisicaService';
import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';
import type {
  AvaliacaoAtividadeFisica,
  AvaliacaoAtividadeFisicaSummary,
} from '@/types/avaliacaoAtividadeFisica';
import type { AnamneseNutricionalSnapshot } from '@/lib/nutri/anamneseNutricional';

type PastaId = 'identificacao' | 'clinicos' | 'nutricionais' | 'atividade';

const PASTAS: { id: PastaId; label: string; short: string }[] = [
  { id: 'identificacao', label: 'Identificação', short: 'Identificação' },
  { id: 'clinicos', label: 'Dados Clínicos', short: 'Clínicos' },
  { id: 'nutricionais', label: 'Nutricionais', short: 'Nutri' },
  { id: 'atividade', label: 'Atividade Física', short: 'Atividade' },
];

type PlanoNutricionalPerfil = {
  protDia_g?: number;
  anamneseNutricional?: AnamneseNutricionalSnapshot;
  restricoesPaciente?: string[];
  preferenciasProteinaPaciente?: string[];
};

export interface MetaMeuPerfilProps {
  paciente: PacienteCompleto | null;
  temPacienteIdNaUrl: boolean;
  medicoResponsavel: Medico | null;
  planoNutricional: PlanoNutricionalPerfil | null;
  loadingPlanoNutricional: boolean;
  mostrarCompletarDados: boolean;
  onCompletarDados: () => void;
  onIrNutri: () => void;
  onIrAtividade: () => void;
  podeEditarIdentificacao?: boolean;
  onSalvarIdentificacao?: (payload: IdentificacaoEditPayload) => Promise<void>;
}

export type IdentificacaoEditPayload = {
  nomeCompleto: string;
  telefone: string;
  telefoneDdi: string;
  telefonePais: string;
  cpf: string;
  dataNascimento: Date | null;
  sexoBiologico: 'M' | 'F' | 'Outro' | '';
  cidade: string;
  estado: string;
  codigoIbge: string;
};

function formatarData(value: unknown): string {
  if (!value) return '—';
  const raw = value as { toDate?: () => Date };
  const date =
    value instanceof Date
      ? value
      : typeof raw?.toDate === 'function'
        ? raw.toDate()
        : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

function formatarSexo(sexo?: string) {
  if (sexo === 'M') return 'Masculino';
  if (sexo === 'F') return 'Feminino';
  if (sexo === 'Outro') return 'Outro';
  return '—';
}

function rotuloDiagnostico(dc?: PacienteCompleto['dadosClinicos']) {
  const tipos = lerDiagnosticoTipos(dc);
  if (!tipos.length) return '—';
  return tipos
    .map((tipo) =>
      tipo === 'outro' && dc?.diagnosticoPrincipal?.outro?.trim()
        ? dc.diagnosticoPrincipal.outro.trim()
        : DIAGNOSTICO_LABELS[tipo] || tipo
    )
    .join(', ');
}

function rotuloTireoide(valor?: string, outro?: string) {
  const mapa: Record<string, string> = {
    eutireoidismo: 'Tireoide normal',
    hipotireoidismo_tratado: 'Hipotireoidismo tratado',
    nodulo_bocio: 'Nódulo ou bócio',
    tireoidite_previa: 'Tireoidite prévia',
    cmt_confirmado: 'CMT confirmado',
    outro: outro || 'Outro',
  };
  return (valor && mapa[valor]) || valor || '—';
}

function simNaoDesconheco(valor?: string) {
  if (valor === 'sim') return 'Sim';
  if (valor === 'nao') return 'Não';
  if (valor === 'desconheco') return 'Desconheço';
  return '—';
}

function FactGrid({ items }: { items: { label: string; value: string }[] }) {
  const visiveis = items.filter((item) => item.value && item.value !== '—');
  if (!visiveis.length) {
    return <p className="text-sm text-[#0A1F44]/55 dark:text-[#E8EDED]/55">Nada informado ainda.</p>;
  }
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
      {visiveis.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-[#0A1F44]/45 dark:text-[#E8EDED]/45">
            {item.label}
          </dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-[0_8px_22px_-16px_rgba(10,31,68,0.35)] dark:border-white/10 dark:bg-[#0A1F44]/55 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const FIELD_CLASS =
  'mt-1 w-full rounded-xl border border-[#0A1F44]/15 bg-white px-3 py-2.5 text-sm text-[#0A1F44] outline-none focus:border-[#2F8FA3] dark:border-white/15 dark:bg-[#0A1F44]/40 dark:text-[#E8EDED]';

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-[11px] font-medium uppercase tracking-wide text-[#0A1F44]/45 dark:text-[#E8EDED]/45">
      {children}
    </label>
  );
}

function formatarNascimento(value: unknown): string {
  const date = parseDataNascimentoDiaMesLocal(value);
  if (!date) return '—';
  return date.toLocaleDateString('pt-BR');
}

function nascimentoParaInput(value: unknown): string {
  const date = parseDataNascimentoDiaMesLocal(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nomeEstado(sigla?: string): string {
  if (!sigla) return '';
  return getBrazilStates().find((item) => item.sigla === sigla)?.nome || sigla;
}

function localizacaoDoEndereco(endereco?: {
  estado?: string;
  cidade?: string;
  codigoIbge?: string;
}): PatientLocationInput {
  return {
    estado: endereco?.estado,
    cidade: endereco?.cidade,
    codigoIbge: endereco?.codigoIbge,
  };
}

function ChipList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-lg border border-[#2F8FA3]/25 bg-[#2F8FA3]/8 px-2.5 py-1 text-xs font-medium text-[#0A1F44] dark:border-[#4CCB7A]/30 dark:bg-[#4CCB7A]/10 dark:text-[#E8EDED]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function EmptyFolder({
  title,
  text,
  actionLabel,
  onAction,
  Icon,
}: {
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  Icon: typeof UtensilsCrossed;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#2F8FA3]/35 bg-white px-5 py-10 text-center dark:border-[#4CCB7A]/25 dark:bg-[#0A1F44]/40">
      <Icon className="mx-auto mb-3 h-8 w-8 text-[#2F8FA3] dark:text-[#4CCB7A]" aria-hidden />
      <h3 className="text-base font-semibold text-[#0A1F44] dark:text-[#E8EDED]">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[#0A1F44]/65 dark:text-[#E8EDED]/65">
        {text}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center rounded-xl bg-[#0A1F44] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A1F44]/90 dark:bg-[#4CCB7A] dark:text-[#0A1F44]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function resolveActivitySummary(
  assessment: AvaliacaoAtividadeFisica
): AvaliacaoAtividadeFisicaSummary | null {
  const existing = assessment.summary;
  if (
    existing &&
    typeof existing === 'object' &&
    'version' in existing &&
    existing.version === 1 &&
    'goalProfile' in existing
  ) {
    return existing;
  }
  if (!assessment.answers || Object.keys(assessment.answers).length === 0) return null;
  return buildPhysicalActivityAssessmentSummary(assessment.answers, assessment.safety);
}

function PastaAtividade({
  patientId,
  onIrAtividade,
}: {
  patientId: string;
  onIrAtividade: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AvaliacaoAtividadeFisica | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    avaliacaoAtividadeFisicaService
      .getByPatientId(patientId)
      .then((doc) => {
        if (!cancelled) setAssessment(doc);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar a anamnese de atividade física.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const summary = useMemo(
    () => (assessment ? resolveActivitySummary(assessment) : null),
    [assessment]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200/90 bg-white py-12 text-sm text-[#0A1F44]/60 dark:border-white/10 dark:bg-[#0A1F44]/55 dark:text-[#E8EDED]/70">
        <Loader2 className="h-4 w-4 animate-spin text-[#2F8FA3]" />
        Carregando anamnese…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 dark:border-red-400/30 dark:bg-[#0A1F44]/55">
        {error}
      </div>
    );
  }

  if (!assessment || assessment.status === 'draft' || !summary) {
    const emAndamento = assessment?.status === 'draft';
    return (
      <EmptyFolder
        Icon={Dumbbell}
        title={emAndamento ? 'Anamnese em andamento' : 'Anamnese ainda não preenchida'}
        text={
          emAndamento
            ? `Você já começou a avaliação${
                typeof assessment?.progressPercent === 'number'
                  ? ` (${assessment.progressPercent}%)`
                  : ''
              }. Continue para ver as respostas aqui.`
            : 'Quando você concluir a avaliação de atividade física, as respostas aparecem nesta pasta.'
        }
        actionLabel={emAndamento ? 'Continuar avaliação' : 'Preencher avaliação'}
        onAction={onIrAtividade}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#0A1F44]/55 dark:text-[#E8EDED]/55">
        {assessment.completedAt
          ? `Preenchida em ${formatarData(assessment.completedAt)}`
          : `Atualizada em ${formatarData(assessment.updatedAt)}`}
      </p>
      <AvaliacaoAtividadeFisicaSummarySections
        summary={summary}
        safety={assessment.safety}
        mode="professional_readonly"
        defaultOpen
      />
    </div>
  );
}

function PastaIdentificacao({
  paciente,
  medicoResponsavel,
  podeEditar,
  onSalvar,
}: {
  paciente: PacienteCompleto;
  medicoResponsavel: Medico | null;
  podeEditar: boolean;
  onSalvar?: (payload: IdentificacaoEditPayload) => Promise<void>;
}) {
  const dados = paciente.dadosIdentificacao;
  const endereco = dados?.endereco;
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState(dados?.nomeCompleto || paciente.nome || '');
  const [phone, setPhone] = useState<PersistedInternationalPhone>({
    telefone: dados?.telefone || '',
    telefoneDdi: dados?.telefoneDdi || '',
    telefonePais: dados?.telefonePais || '',
  });
  const [cpf, setCpf] = useState(dados?.cpf || '');
  const [nascimento, setNascimento] = useState(nascimentoParaInput(dados?.dataNascimento));
  const [sexo, setSexo] = useState<IdentificacaoEditPayload['sexoBiologico']>(dados?.sexoBiologico || '');
  const [localizacaoValor, setLocalizacaoValor] = useState<PatientLocationInput | null>(() =>
    localizacaoDoEndereco(endereco)
  );
  const [localizacao, setLocalizacao] = useState<PatientLocationInterpretation>(() =>
    interpretPatientLocation(localizacaoDoEndereco(endereco))
  );

  const limitesNascimento = limitesInputDataNascimento();
  const enderecoTexto = endereco?.rua
    ? [endereco.rua, endereco.cidade && endereco.estado ? `${endereco.cidade}/${nomeEstado(endereco.estado)}` : endereco.cidade]
        .filter(Boolean)
        .join(', ')
    : endereco?.cep || '';
  const localTexto = [endereco?.cidade, nomeEstado(endereco?.estado)].filter(Boolean).join(' — ');

  const abrirEdicao = () => {
    setNome(dados?.nomeCompleto || paciente.nome || '');
    setPhone({
      telefone: dados?.telefone || '',
      telefoneDdi: dados?.telefoneDdi || '',
      telefonePais: dados?.telefonePais || '',
    });
    setCpf(dados?.cpf || '');
    setNascimento(nascimentoParaInput(dados?.dataNascimento));
    setSexo(dados?.sexoBiologico || '');
    const atual = localizacaoDoEndereco(endereco);
    setLocalizacaoValor(atual);
    setLocalizacao(interpretPatientLocation(atual));
    setErro(null);
    setEditando(true);
  };

  const salvar = async () => {
    if (!onSalvar) return;
    const nomeLimpo = nome.trim();
    if (nomeLimpo.length < 3) {
      setErro('Informe o nome completo.');
      return;
    }
    const telefoneInformado = phone.telefone.trim().length > 0;
    if (telefoneInformado && !isValidIdentificacaoPhone(phone)) {
      setErro('Informe um telefone válido.');
      return;
    }
    const cpfDigitos = cpf.replace(/\D/g, '');
    if (cpfDigitos && cpfDigitos.length !== 11) {
      setErro('O CPF precisa ter 11 dígitos.');
      return;
    }
    const localizacaoGravada = gravacaoLocalizacaoPerfil(localizacao);
    if (!localizacaoGravada) {
      setErro('Selecione um município oficial. Para remover a localização, deixe o estado em branco.');
      return;
    }
    const dataNascimento = nascimento ? parseDataNascimentoDiaMesLocal(nascimento) : null;
    if (nascimento && !dataNascimento) {
      setErro('Data de nascimento inválida.');
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      await onSalvar({
        nomeCompleto: nomeLimpo,
        telefone: phone.telefone,
        telefoneDdi: phone.telefoneDdi,
        telefonePais: phone.telefonePais,
        cpf: cpfDigitos ? formatCpf(cpfDigitos) : '',
        dataNascimento,
        sexoBiologico: sexo,
        cidade: localizacaoGravada.cidade,
        estado: localizacaoGravada.estado,
        codigoIbge: localizacaoGravada.codigoIbge,
      });
      setEditando(false);
    } catch {
      setErro('Não foi possível salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionCard
        title="Dados pessoais"
        action={
          podeEditar && !editando ? (
            <button
              type="button"
              onClick={abrirEdicao}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#2F8FA3] hover:bg-[#2F8FA3]/10 dark:text-[#4CCB7A]"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Editar
            </button>
          ) : null
        }
      >
        {editando ? (
          <div className="space-y-3">
            <div>
              <FieldLabel>Nome completo</FieldLabel>
              <input
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                className={FIELD_CLASS}
                autoComplete="name"
              />
            </div>
            <div>
              <FieldLabel>Telefone</FieldLabel>
              <div className="mt-1">
                <InternationalPhoneInput value={phone} onChange={setPhone} id="perfil-telefone" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>CPF</FieldLabel>
                <input
                  value={cpf}
                  inputMode="numeric"
                  onChange={(event) => setCpf(formatCpf(event.target.value))}
                  className={FIELD_CLASS}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <FieldLabel>Nascimento</FieldLabel>
                <input
                  type="date"
                  value={nascimento}
                  min={limitesNascimento.min}
                  max={limitesNascimento.max}
                  onChange={(event) => setNascimento(event.target.value)}
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <FieldLabel>Sexo biológico</FieldLabel>
                <select
                  value={sexo}
                  onChange={(event) =>
                    setSexo(event.target.value as IdentificacaoEditPayload['sexoBiologico'])
                  }
                  className={FIELD_CLASS}
                >
                  <option value="">Não informado</option>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
            <PatientLocationFields
              id="perfil-localizacao"
              value={localizacaoValor}
              onChange={setLocalizacaoValor}
              onInterpretationChange={setLocalizacao}
            />
            {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => void salvar()}
                disabled={salvando}
                className="inline-flex items-center rounded-xl bg-[#0A1F44] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-[#4CCB7A] dark:text-[#0A1F44]"
              >
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setErro(null);
                }}
                disabled={salvando}
                className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#0A1F44]/70 hover:bg-[#0A1F44]/5 dark:text-[#E8EDED]/70"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <FactGrid
            items={[
              { label: 'Nome completo', value: dados?.nomeCompleto || paciente.nome || '—' },
              { label: 'E-mail', value: paciente.email || dados?.email || '—' },
              {
                label: 'Telefone',
                value: dados?.telefone
                  ? formatInternationalPhoneDisplay({
                      telefone: dados.telefone,
                      telefoneDdi: dados.telefoneDdi,
                      telefonePais: dados.telefonePais,
                    })
                  : '—',
              },
              { label: 'CPF', value: dados?.cpf || '—' },
              { label: 'Nascimento', value: formatarNascimento(dados?.dataNascimento) },
              { label: 'Sexo biológico', value: formatarSexo(dados?.sexoBiologico) },
              { label: 'Cidade', value: localTexto || 'Não informada' },
              { label: 'Cadastro', value: formatarData(dados?.dataCadastro) },
            ]}
          />
        )}
      </SectionCard>

      {enderecoTexto && !editando ? (
        <SectionCard title="Endereço">
          <p className="inline-flex items-start gap-2 text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2F8FA3]" aria-hidden />
            {enderecoTexto}
          </p>
        </SectionCard>
      ) : null}

      {medicoResponsavel ? (
        <SectionCard title="Médico responsável">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
            <Stethoscope className="h-4 w-4 text-[#2F8FA3]" aria-hidden />
            {medicoResponsavel.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoResponsavel.nome}
          </p>
        </SectionCard>
      ) : null}
    </div>
  );
}

function PastaClinicos({ paciente }: { paciente: PacienteCompleto }) {
  const clinicos = paciente.dadosClinicos;
  if (!clinicos) {
    return (
      <EmptyFolder
        Icon={FlaskConical}
        title="Dados clínicos ainda não preenchidos"
        text="As medidas, o diagnóstico e as condições de saúde aparecem aqui depois da anamnese inicial."
      />
    );
  }

  const medidas = clinicos.medidasIniciais;
  const motivacao = clinicos.motivacao;
  const motivacoes = [
    motivacao?.estetica ? 'Estética' : '',
    motivacao?.cansaco_falta_energia ? 'Cansaço / energia' : '',
    motivacao?.saude_exames_alterados ? 'Saúde / exames' : '',
    motivacao?.autoestima ? 'Autoestima' : '',
    motivacao?.dificuldade_emagrecer ? 'Dificuldade emagrecer' : '',
    motivacao?.outro ? clinicos.motivacaoOutro || 'Outro' : '',
  ].filter(Boolean);

  const comorbidades = clinicos.comorbidades;
  const comorbidadeChips = [
    comorbidades?.hipertensaoArterial ? 'Pressão alta' : '',
    comorbidades?.dislipidemia ? 'Dislipidemia' : '',
    comorbidades?.apneiaObstrutivaSono ? 'Apneia do sono' : '',
    comorbidades?.esteatoseEHNA ? 'Esteatose / EHNA' : '',
    comorbidades?.doencaCardiovascular ? 'Doença cardiovascular' : '',
    comorbidades?.doencaRenalCronica ? 'Doença renal crônica' : '',
    comorbidades?.sop ? 'SOP' : '',
    comorbidades?.hipotireoidismo ? 'Hipotireoidismo' : '',
    comorbidades?.asmaDPOC ? 'Asma / DPOC' : '',
    comorbidades?.transtornoAnsiedadeDepressao ? 'Ansiedade / depressão' : '',
    comorbidades?.nenhuma ? 'Nenhuma' : '',
    comorbidades?.outra ? comorbidades.outraDescricao || 'Outra' : '',
  ].filter(Boolean);

  const objetivos = clinicos.objetivosTratamento;
  const objetivoChips = [
    objetivos?.perdaPeso10Porcento ? 'Perder peso' : '',
    objetivos?.hba1cMenor68 ? 'Melhorar glicose / HbA1c' : '',
    objetivos?.reducaoCircunferencia10cm ? 'Reduzir circunferência abdominal' : '',
    objetivos?.remissaoPreDiabetes ? 'Reverter pré-diabetes' : '',
    objetivos?.melhoraEHNA ? 'Melhorar o fígado' : '',
    objetivos?.mais_energia ? 'Mais energia' : '',
    objetivos?.melhora_autoestima ? 'Autoestima' : '',
    objetivos?.outro ? objetivos.outroDescricao || 'Outro' : '',
  ].filter(Boolean);

  const gi = clinicos.sintomasGI;
  const giChips = [
    gi?.plenitudePosPrandial ? 'Plenitude após comer' : '',
    gi?.nauseaLeve ? 'Náusea leve' : '',
    gi?.constipacao ? 'Constipação' : '',
    gi?.refluxoPirose ? 'Refluxo / queimação' : '',
    gi?.nenhum ? 'Nenhum' : '',
  ].filter(Boolean);

  const riscos = clinicos.riscos;

  return (
    <div className="space-y-4">
      {medidas ? (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {[
            { label: 'Peso', value: medidas.peso ? `${medidas.peso} kg` : '—' },
            { label: 'Altura', value: medidas.altura ? `${medidas.altura} cm` : '—' },
            {
              label: 'IMC',
              value: medidas.imc ? `${medidas.imc.toFixed(1)} kg/m²` : '—',
            },
            {
              label: 'Cintura',
              value: medidas.circunferenciaAbdominal
                ? `${medidas.circunferenciaAbdominal} cm`
                : '—',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-[#2F8FA3]/25 bg-gradient-to-br from-white via-[#E8EDED]/50 to-[#2F8FA3]/10 p-3.5 dark:from-[#0A1F44]/70 dark:via-[#0A1F44]/80 dark:to-[#2F8FA3]/20"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#0A1F44]/55 dark:text-[#E8EDED]/50">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#0A1F44] dark:text-[#E8EDED]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <SectionCard title="Quadro clínico">
        <FactGrid
          items={[
            {
              label: 'Diagnóstico principal',
              value: rotuloDiagnostico(clinicos),
            },
            {
              label: 'História tireoidiana',
              value: clinicos.historiaTireoidiana
                ? rotuloTireoide(clinicos.historiaTireoidiana, clinicos.historiaTireoidianaOutro)
                : '—',
            },
          ]}
        />
      </SectionCard>

      {motivacoes.length ? (
        <SectionCard title="Motivação">
          <ChipList items={motivacoes} />
        </SectionCard>
      ) : null}

      {comorbidadeChips.length ? (
        <SectionCard title="Comorbidades">
          <ChipList items={comorbidadeChips} />
        </SectionCard>
      ) : null}

      {riscos && Object.values(riscos).some(Boolean) ? (
        <SectionCard title="Riscos e condições">
          <FactGrid
            items={[
              { label: 'Pancreatite prévia', value: simNaoDesconheco(riscos.pancreatitePrevia) },
              { label: 'Gastroparesia', value: simNaoDesconheco(riscos.gastroparesia) },
              { label: 'Histórico CMT / MEN2', value: simNaoDesconheco(riscos.historicoCMT_MEN2) },
              { label: 'Gestação', value: simNaoDesconheco(riscos.gestacao) },
              { label: 'Lactação', value: simNaoDesconheco(riscos.lactacao) },
            ]}
          />
        </SectionCard>
      ) : null}

      {giChips.length ? (
        <SectionCard title="Sintomas do trato gastrointestinal">
          <ChipList items={giChips} />
        </SectionCard>
      ) : null}

      {objetivoChips.length ? (
        <SectionCard title="Objetivos do tratamento">
          <ChipList items={objetivoChips} />
        </SectionCard>
      ) : null}
    </div>
  );
}

export default function MetaMeuPerfil({
  paciente,
  temPacienteIdNaUrl,
  medicoResponsavel,
  planoNutricional,
  loadingPlanoNutricional,
  mostrarCompletarDados,
  onCompletarDados,
  onIrNutri,
  onIrAtividade,
  podeEditarIdentificacao = false,
  onSalvarIdentificacao,
}: MetaMeuPerfilProps) {
  const [pasta, setPasta] = useState<PastaId>('identificacao');

  if (!paciente && !temPacienteIdNaUrl) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#0A1F44] dark:text-white">Meu Perfil</h2>
        <EmptyFolder
          Icon={MessageSquare}
          title="Preencha seus dados"
          text="Responda às perguntas para cadastrar identificação, peso, comorbidades e o que o tratamento precisa saber."
          actionLabel="Abrir questionário"
          onAction={onCompletarDados}
        />
      </div>
    );
  }

  if (!paciente) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#0A1F44] dark:text-white">Meu Perfil</h2>
        <EmptyFolder
          Icon={UserIcon}
          title="Dados não encontrados"
          text="Seus dados aparecem aqui assim que o cadastro estiver disponível."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0A1F44] dark:text-white">
            Meu Perfil
          </h2>
          <p className="mt-0.5 text-sm text-[#0A1F44]/60 dark:text-[#E8EDED]/60">
            Identificação, clínica, nutrição e atividade física
          </p>
        </div>
        {mostrarCompletarDados ? (
          <button
            type="button"
            onClick={onCompletarDados}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A1F44] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0A1F44]/90 dark:bg-[#4CCB7A] dark:text-[#0A1F44]"
          >
            <Activity className="h-4 w-4" aria-hidden />
            Atualizar dados clínicos
          </button>
        ) : null}
      </div>

      <div
        className="flex gap-1 overflow-x-auto rounded-2xl border border-[#0A1F44]/10 bg-white p-1.5 shadow-sm dark:border-white/10 dark:bg-[#0A1F44]/50"
        role="tablist"
        aria-label="Pastas do perfil"
      >
        {PASTAS.map((item) => {
          const ativa = pasta === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setPasta(item.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                ativa
                  ? 'bg-[#0A1F44] text-white shadow-sm dark:bg-[#4CCB7A] dark:text-[#0A1F44]'
                  : 'text-[#0A1F44]/65 hover:bg-[#0A1F44]/5 dark:text-[#E8EDED]/70 dark:hover:bg-white/5'
              }`}
            >
              <Folder className="h-3.5 w-3.5" aria-hidden />
              <span className="sm:hidden">{item.short}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          );
        })}
      </div>

      {pasta === 'identificacao' ? (
        <PastaIdentificacao
          paciente={paciente}
          medicoResponsavel={medicoResponsavel}
          podeEditar={podeEditarIdentificacao}
          onSalvar={onSalvarIdentificacao}
        />
      ) : null}

      {pasta === 'clinicos' ? <PastaClinicos paciente={paciente} /> : null}

      {pasta === 'nutricionais' ? (
        loadingPlanoNutricional ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200/90 bg-white py-12 text-sm text-[#0A1F44]/60 dark:border-white/10 dark:bg-[#0A1F44]/55">
            <RefreshCw className="h-4 w-4 animate-spin text-[#2F8FA3]" />
            Carregando anamnese nutricional…
          </div>
        ) : planoNutricional?.anamneseNutricional ? (
          <PlanoNutriAnamnesePanel paciente={paciente} plano={planoNutricional} />
        ) : (
          <EmptyFolder
            Icon={UtensilsCrossed}
            title="Anamnese nutricional ainda não preenchida"
            text="As respostas do questionário nutricional aparecem aqui depois que você concluir o plano na área Nutri."
            actionLabel="Ir para Nutri"
            onAction={onIrNutri}
          />
        )
      ) : null}

      {pasta === 'atividade' && paciente.id ? (
        <PastaAtividade patientId={paciente.id} onIrAtividade={onIrAtividade} />
      ) : null}
    </div>
  );
}
