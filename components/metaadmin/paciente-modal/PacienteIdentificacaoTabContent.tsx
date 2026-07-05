'use client';

import { Calendar, Hash, Mail, MapPin, Stethoscope, User } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import { formatDateBr, formatDateInputValue } from '@/lib/metaadmin/pacienteModalObesidadeDisplay';

const RO =
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

export type PacienteIdentificacaoTabContentProps = {
  paciente: PacienteCompleto;
  medicoResponsavelLabel?: string;
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

export function PacienteIdentificacaoTabContent({
  paciente,
  medicoResponsavelLabel = '',
}: PacienteIdentificacaoTabContentProps) {
  const id = paciente.dadosIdentificacao;
  const idade = calcIdade(id?.dataNascimento);
  const statusKey = paciente.statusTratamento || 'pendente';
  const statusBadge = STATUS_TRATAMENTO[statusKey] ?? STATUS_TRATAMENTO.pendente;

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
              readOnly
              disabled
              value={id?.nomeCompleto || paciente.nome || ''}
              className={RO}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>CPF</FieldLabel>
              <input type="text" readOnly disabled value={id?.cpf || ''} className={RO} />
            </div>
            <div>
              <FieldLabel>Data de nascimento</FieldLabel>
              <input
                type="date"
                readOnly
                disabled
                value={formatDateInputValue(id?.dataNascimento)}
                className={RO}
              />
            </div>
          </div>
          <div>
            <FieldLabel>Sexo biológico</FieldLabel>
            <input type="text" readOnly disabled value={labelSexo(id?.sexoBiologico)} className={RO} />
          </div>
        </FieldCard>

        <FieldCard icon={Mail} title="Contato">
          <div>
            <FieldLabel>E-mail</FieldLabel>
            <input type="email" readOnly disabled value={id?.email || ''} className={RO} />
          </div>
          <div>
            <FieldLabel>Telefone</FieldLabel>
            <input type="tel" readOnly disabled value={id?.telefone || ''} className={RO} />
          </div>
        </FieldCard>

        <FieldCard icon={MapPin} title="Endereço" className="md:col-span-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <FieldLabel>CEP</FieldLabel>
              <input type="text" readOnly disabled value={id?.endereco?.cep || ''} className={RO} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Logradouro</FieldLabel>
              <input type="text" readOnly disabled value={id?.endereco?.rua || ''} className={RO} />
            </div>
            <div>
              <FieldLabel>Cidade</FieldLabel>
              <input type="text" readOnly disabled value={id?.endereco?.cidade || ''} className={RO} />
            </div>
            <div>
              <FieldLabel>Estado (UF)</FieldLabel>
              <input type="text" readOnly disabled value={id?.endereco?.estado || ''} className={RO} />
            </div>
          </div>
        </FieldCard>

        <FieldCard icon={Calendar} title="Cadastro">
          <div>
            <FieldLabel>Data de cadastro</FieldLabel>
            <input
              type="text"
              readOnly
              disabled
              value={formatDateBr(id?.dataCadastro ?? paciente.dataCadastro)}
              className={RO}
            />
          </div>
        </FieldCard>

        <FieldCard icon={Stethoscope} title="Vínculo clínico">
          <div>
            <FieldLabel>Médico responsável</FieldLabel>
            <input type="text" readOnly disabled value={medicoResponsavelLabel} className={RO} />
          </div>
          <div>
            <FieldLabel>ID do paciente</FieldLabel>
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <input type="text" readOnly disabled value={paciente.id} className={`${RO} font-mono text-xs`} />
            </div>
          </div>
        </FieldCard>
      </div>
    </section>
  );
}
