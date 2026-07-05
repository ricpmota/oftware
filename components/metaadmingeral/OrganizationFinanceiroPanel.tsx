'use client';

import { AlertCircle, CheckCircle, CreditCard, DollarSign, Loader2 } from 'lucide-react';
import type { OrganizationDefinition } from '@/lib/organization/organizationTypes';
import type { OrganizationFinanceMetrics } from '@/lib/metaadmingeral/buildOrganizationFinanceMetrics';

function formatBrl(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

type OrganizationFinanceiroPanelProps = {
  organization: OrganizationDefinition;
  metrics: OrganizationFinanceMetrics;
  loading: boolean;
};

export default function OrganizationFinanceiroPanel({
  organization,
  metrics,
  loading,
}: OrganizationFinanceiroPanelProps) {
  const { rows, totalFaturamento, totalPago, totalPendente, totalMedicos } = metrics;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#E8EDED]">Financeiro</h2>
        <p className="mt-1 text-sm text-[#E8EDED]/60">
          Resultado financeiro por médico em{' '}
          <span className="font-medium text-[#E8EDED]">{organization.name}</span>
          {' · '}
          {totalMedicos} médico{totalMedicos === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#2F8FA3]/40 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#E8EDED]/80">Total faturado</p>
              <p className="text-2xl font-bold text-[#E8EDED]">
                {loading ? '—' : formatBrl(totalFaturamento)}
              </p>
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3]">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-amber-400/40 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#E8EDED]/80">Pendente de pagamento</p>
              <p className="text-2xl font-bold text-[#E8EDED]">
                {loading ? '—' : formatBrl(totalPendente)}
              </p>
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3]">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#4CCB7A]/40 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#E8EDED]/80">Total pago</p>
              <p className="text-2xl font-bold text-[#E8EDED]">
                {loading ? '—' : formatBrl(totalPago)}
              </p>
            </div>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3]">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-[#4CCB7A]/30">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-[#4CCB7A]" />
          <h3 className="text-lg font-semibold text-[#E8EDED]">Faturamento por médico</h3>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#4CCB7A]" />
            <p className="mt-4 text-sm text-[#E8EDED]/70">Carregando faturamento...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-[#E8EDED]/50">
            <p className="text-sm">Nenhum médico cadastrado nesta organização.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Médico
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Pendente
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Tratamento
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Concluído
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Abandono
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    C/ pagamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Vendas avulsas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Valor total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Valor pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#E8EDED]/70">
                    Valor pendente
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.map((row) => (
                  <tr key={row.medicoId} className="hover:bg-white/10">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-[#E8EDED]">{row.medicoNome}</div>
                      <div className="text-sm text-[#E8EDED]/45">{row.medicoEmail}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm font-medium text-[#E8EDED]">
                      {row.pacientesTotal}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-[#E8EDED]/80">
                      {row.pacientesPendente}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-[#4CCB7A]">
                      {row.pacientesEmTratamento}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-sky-300">
                      {row.pacientesConcluido}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-red-300/90">
                      {row.pacientesAbandono}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-[#E8EDED]/60">
                      {row.pacientesComPagamento}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-[#E8EDED]">
                      {row.vendasAvulsas}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-[#E8EDED]">
                      {formatBrl(row.valorTotal)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-green-400">
                      {formatBrl(row.valorPago)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-amber-300">
                      {formatBrl(row.valorPendente)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
