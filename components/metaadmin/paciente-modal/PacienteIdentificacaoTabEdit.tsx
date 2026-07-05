'use client';

import type { Dispatch, SetStateAction } from 'react';
import {
  Calendar,
  Hash,
  Mail,
  MapPin,
  Stethoscope,
  User,
} from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { Medico } from '@/types/medico';

const INPUT =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100';
const INPUT_RO =
  'w-full border border-gray-300 rounded-md px-3 py-2 text-gray-600 bg-gray-50 cursor-default dark:border-gray-600 dark:bg-gray-800/60 dark:text-gray-400';

function calcIdade(dataNascimento?: Date | string | null): number | null {
  if (!dataNascimento) return null;
  try {
    const nasc = new Date(dataNascimento);
    if (isNaN(nasc.getTime())) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade >= 0 ? idade : null;
  } catch {
    return null;
  }
}

function formatDateInputValue(date?: Date | string | null): string {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

function formatDateBr(date?: Date | string | null): string {
  if (!date) return '—';
  try {
    const d = new Date(date);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

function labelSexo(sexo?: string): string {
  if (sexo === 'M') return 'Masculino';
  if (sexo === 'F') return 'Feminino';
  if (sexo === 'Outro') return 'Outro';
  return 'Não informado';
}

const STATUS_TRATAMENTO: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-100 text-amber-900 border-amber-200' },
  em_tratamento: { label: 'Em tratamento', className: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  concluido: { label: 'Concluído', className: 'bg-blue-100 text-blue-900 border-blue-200' },
  abandono: { label: 'Abandono', className: 'bg-red-100 text-red-900 border-red-200' },
};

async function buscarCepViaApi(cep: string): Promise<{
  cep?: string;
  logradouro?: string;
  localidade?: string;
  uf?: string;
} | null> {
  const cepValue = cep.replace(/\D/g, '');
  if (cepValue.length !== 8) return null;
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepValue}/json/`);
    const data = await response.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

export type PacienteIdentificacaoTabEditProps = {
  paciente: PacienteCompleto;
  setPaciente: Dispatch<SetStateAction<PacienteCompleto | null>>;
  medicoPerfil?: Medico | null;
  isAbandono?: boolean;
};

function FieldCard({
  icon: Icon,
  title,
  children,
  className = '',
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`rounded-lg border border-gray-200/90 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/80 ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h5>
      </div>
      <div className="space-y-3">{children}</div>
    </article>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
      {children}
    </label>
  );
}

export function PacienteIdentificacaoTabEdit({
  paciente,
  setPaciente,
  medicoPerfil,
  isAbandono = false,
}: PacienteIdentificacaoTabEditProps) {
  const id = paciente.dadosIdentificacao;
  const disabled = isAbandono;
  const inputClass = disabled ? `${INPUT} bg-gray-100 cursor-not-allowed` : INPUT;

  const idade = calcIdade(id?.dataNascimento);
  const statusKey = paciente.statusTratamento || 'pendente';
  const statusBadge = STATUS_TRATAMENTO[statusKey] ?? STATUS_TRATAMENTO.pendente;

  const medicoLabel = (() => {
    if (!medicoPerfil) return '';
    const titulo = medicoPerfil.genero === 'F' ? 'Dra.' : 'Dr.';
    return `${titulo} ${medicoPerfil.nome}`;
  })();

  const aplicarEnderecoCep = (data: {
    cep?: string;
    logradouro?: string;
    localidade?: string;
    uf?: string;
  }) => {
    setPaciente({
      ...paciente,
      dadosIdentificacao: {
        ...paciente.dadosIdentificacao,
        endereco: {
          ...paciente.dadosIdentificacao?.endereco,
          cep: data.cep?.replace(/\D/g, '') || paciente.dadosIdentificacao?.endereco?.cep,
          rua: data.logradouro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        },
      },
    });
  };

  const handleBuscarCep = async () => {
    const cep = paciente.dadosIdentificacao?.endereco?.cep;
    if (!cep) return;
    const data = await buscarCepViaApi(cep);
    if (data) aplicarEnderecoCep(data);
  };

  return (
    <section className="rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50/80 to-white p-4 md:p-5 dark:border-sky-900/50 dark:from-sky-950/30 dark:to-gray-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">Identificação</h4>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
            Dados cadastrais e de contato do paciente
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {idade != null && (
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
              {idade} anos
            </span>
          )}
          <span className="inline-flex rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
            {labelSexo(id?.sexoBiologico)}
          </span>
          {(id?.endereco?.cidade || id?.endereco?.estado) && (
            <span className="inline-flex rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
              {[id?.endereco?.cidade, id?.endereco?.estado].filter(Boolean).join(' — ')}
            </span>
          )}
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FieldCard icon={User} title="Dados pessoais">
          <div>
            <FieldLabel>Nome completo</FieldLabel>
            <input
              type="text"
              value={id?.nomeCompleto || ''}
              disabled={disabled}
              readOnly={disabled}
              onChange={(e) =>
                setPaciente({
                  ...paciente,
                  dadosIdentificacao: {
                    ...paciente.dadosIdentificacao,
                    nomeCompleto: e.target.value,
                  },
                })
              }
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>CPF</FieldLabel>
              <input
                type="text"
                value={id?.cpf || ''}
                disabled={disabled}
                readOnly={disabled}
                onChange={(e) =>
                  setPaciente({
                    ...paciente,
                    dadosIdentificacao: {
                      ...paciente.dadosIdentificacao,
                      cpf: e.target.value,
                    },
                  })
                }
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Data de nascimento</FieldLabel>
              <input
                type="date"
                value={formatDateInputValue(id?.dataNascimento)}
                disabled={disabled}
                readOnly={disabled}
                onChange={(e) => {
                  let dataNascimento: Date | undefined;
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    dataNascimento = new Date(year, month - 1, day);
                  }
                  setPaciente({
                    ...paciente,
                    dadosIdentificacao: {
                      ...paciente.dadosIdentificacao,
                      dataNascimento,
                    },
                  });
                }}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Sexo biológico</FieldLabel>
            <select
              value={id?.sexoBiologico || ''}
              disabled={disabled}
              onChange={(e) =>
                setPaciente({
                  ...paciente,
                  dadosIdentificacao: {
                    ...paciente.dadosIdentificacao,
                    sexoBiologico: e.target.value as 'M' | 'F' | 'Outro' | undefined,
                  },
                })
              }
              className={inputClass}
            >
              <option value="">Selecione</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </FieldCard>

        <FieldCard icon={Mail} title="Contato">
          <div>
            <FieldLabel>E-mail</FieldLabel>
            <input
              type="email"
              value={id?.email || ''}
              disabled={disabled}
              readOnly={disabled}
              onChange={(e) =>
                setPaciente({
                  ...paciente,
                  dadosIdentificacao: {
                    ...paciente.dadosIdentificacao,
                    email: e.target.value,
                  },
                })
              }
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>Telefone</FieldLabel>
            <input
              type="tel"
              value={id?.telefone || ''}
              disabled={disabled}
              readOnly={disabled}
              onChange={(e) =>
                setPaciente({
                  ...paciente,
                  dadosIdentificacao: {
                    ...paciente.dadosIdentificacao,
                    telefone: e.target.value,
                  },
                })
              }
              className={inputClass}
            />
          </div>
        </FieldCard>

        <FieldCard icon={MapPin} title="Endereço" className="md:col-span-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <FieldLabel>CEP</FieldLabel>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={id?.endereco?.cep || ''}
                  disabled={disabled}
                  readOnly={disabled}
                  onChange={(e) => {
                    const cepValue = e.target.value.replace(/\D/g, '');
                    setPaciente({
                      ...paciente,
                      dadosIdentificacao: {
                        ...paciente.dadosIdentificacao,
                        endereco: {
                          ...paciente.dadosIdentificacao?.endereco,
                          cep: cepValue.length <= 8 ? cepValue : cepValue.slice(0, 8),
                        },
                      },
                    });
                  }}
                  onBlur={() => void handleBuscarCep()}
                  className={`flex-1 ${inputClass}`}
                  placeholder="00000000"
                  maxLength={9}
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => void handleBuscarCep()}
                    className="shrink-0 rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                  >
                    Buscar
                  </button>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Logradouro</FieldLabel>
              <input
                type="text"
                value={id?.endereco?.rua || ''}
                disabled={disabled}
                readOnly={disabled}
                onChange={(e) =>
                  setPaciente({
                    ...paciente,
                    dadosIdentificacao: {
                      ...paciente.dadosIdentificacao,
                      endereco: {
                        ...paciente.dadosIdentificacao?.endereco,
                        rua: e.target.value,
                      },
                    },
                  })
                }
                className={inputClass}
                placeholder="Rua, número, complemento"
              />
            </div>
            <div>
              <FieldLabel>Cidade</FieldLabel>
              <input
                type="text"
                value={id?.endereco?.cidade || ''}
                disabled={disabled}
                readOnly={disabled}
                onChange={(e) =>
                  setPaciente({
                    ...paciente,
                    dadosIdentificacao: {
                      ...paciente.dadosIdentificacao,
                      endereco: {
                        ...paciente.dadosIdentificacao?.endereco,
                        cidade: e.target.value,
                      },
                    },
                  })
                }
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Estado (UF)</FieldLabel>
              <input
                type="text"
                value={id?.endereco?.estado || ''}
                disabled={disabled}
                readOnly={disabled}
                onChange={(e) =>
                  setPaciente({
                    ...paciente,
                    dadosIdentificacao: {
                      ...paciente.dadosIdentificacao,
                      endereco: {
                        ...paciente.dadosIdentificacao?.endereco,
                        estado: e.target.value,
                      },
                    },
                  })
                }
                className={inputClass}
                placeholder="UF"
              />
            </div>
          </div>
        </FieldCard>

        <FieldCard icon={Calendar} title="Cadastro">
          <div>
            <FieldLabel>Data de cadastro</FieldLabel>
            <input
              type="text"
              readOnly
              value={formatDateBr(id?.dataCadastro ?? paciente.dataCadastro)}
              className={INPUT_RO}
            />
          </div>
        </FieldCard>

        <FieldCard icon={Stethoscope} title="Vínculo clínico">
          <div>
            <FieldLabel>Médico responsável</FieldLabel>
            <input type="text" readOnly value={medicoLabel} className={INPUT_RO} />
          </div>
          <div>
            <FieldLabel>ID do paciente</FieldLabel>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <input type="text" readOnly value={paciente.id} className={`${INPUT_RO} font-mono text-xs`} />
            </div>
          </div>
        </FieldCard>
      </div>
    </section>
  );
}
