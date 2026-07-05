'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Users, ClipboardCheck, Activity } from 'lucide-react';

export type ClienteWhiteLabel = {
  id: string;
  nome: string;
  genero: 'M' | 'F';
  fotoPerfilUrl: string;
  slug: string;
  href: string;
  crm: string;
  local: string;
  totalPacientes: number;
  acompanhamentosConcluidos: number;
  registrosEmMonitoramento: number;
};

function formatNum(n: number) {
  return n.toLocaleString('pt-BR');
}

function tituloMedico(genero: 'M' | 'F', nome: string) {
  return `${genero === 'F' ? 'Dra.' : 'Dr.'} ${nome}`;
}

function MetricItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#16A34A]" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-[#1D1D1D] leading-none tabular-nums">{formatNum(value)}</p>
        <p className="text-[11px] text-[#5A5A5A] leading-snug mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ClienteCard({ cliente }: { cliente: ClienteWhiteLabel }) {
  return (
    <Link
      href={cliente.href}
      className="group flex flex-col sm:flex-row gap-5 rounded-2xl border border-[#E5E7EB] bg-white p-5 md:p-6 hover:border-[#22C55E]/40 hover:shadow-lg hover:shadow-[#22C55E]/5 transition-all duration-300"
    >
      <div className="flex items-start gap-4 sm:w-[220px] shrink-0">
        <div className="relative shrink-0">
          <img
            src={cliente.fotoPerfilUrl}
            alt={tituloMedico(cliente.genero, cliente.nome)}
            className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border border-[#E5E7EB] group-hover:border-[#22C55E]/50 transition-colors"
            loading="lazy"
          />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" aria-hidden />
          </span>
        </div>
        <div className="min-w-0 pt-1">
          <p className="font-semibold text-[#1D1D1D] leading-snug group-hover:text-[#16A34A] transition-colors">
            {tituloMedico(cliente.genero, cliente.nome)}
          </p>
          {cliente.crm && <p className="text-xs text-[#5A5A5A] mt-1">{cliente.crm}</p>}
          {cliente.local && <p className="text-xs text-[#5A5A5A] mt-0.5">{cliente.local}</p>}
          <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#16A34A]">
            White Label verificado
          </p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-3 sm:items-center border-t sm:border-t-0 sm:border-l border-[#E5E7EB] pt-4 sm:pt-0 sm:pl-6">
        <MetricItem icon={Users} label="Pacientes no total" value={cliente.totalPacientes} />
        <MetricItem icon={ClipboardCheck} label="Acompanhamentos concluídos" value={cliente.acompanhamentosConcluidos} />
        <MetricItem icon={Activity} label="Registros em monitoramento" value={cliente.registrosEmMonitoramento} />
      </div>
    </Link>
  );
}

export default function ClientesWhiteLabelSection() {
  const [clientes, setClientes] = useState<ClienteWhiteLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/clientes-white-label', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Falha ao carregar clientes'))))
      .then((data: { clientes?: ClienteWhiteLabel[] }) => {
        if (!cancelled) setClientes(data.clientes ?? []);
      })
      .catch((e) => {
        if (!cancelled) setErro(e instanceof Error ? e.message : 'Erro ao carregar');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="clientes"
      className="scroll-mt-[80px] py-20 md:py-28 bg-[#F7F7F7] border-t border-[#E5E7EB]"
    >
      <div className="w-full max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl mb-12 md:mb-14">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.22em] text-[#16A34A] mb-5">
            Clientes
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1D1D1D] leading-[1.1] tracking-tight mb-5">
            Operações White Label na Oftware.
          </h2>
          <p className="text-lg md:text-xl text-[#5A5A5A] leading-relaxed">
            Médicos verificados que constroem seus programas de acompanhamento sobre a infraestrutura Oftware — com
            pacientes, jornadas concluídas e monitoramento clínico em operação.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-[#5A5A5A]">
            <Loader2 className="w-6 h-6 animate-spin text-[#16A34A]" />
            <span>Carregando clientes...</span>
          </div>
        ) : erro ? (
          <p className="text-center text-[#5A5A5A] py-10">{erro}</p>
        ) : clientes.length === 0 ? (
          <p className="text-center text-[#5A5A5A] py-10">Nenhum cliente verificado disponível no momento.</p>
        ) : (
          <div className="grid gap-4 md:gap-5">
            {clientes.map((cliente) => (
              <ClienteCard key={cliente.id} cliente={cliente} />
            ))}
          </div>
        )}

        <p className="mt-8 text-xs text-[#9CA3AF] text-center max-w-2xl mx-auto leading-relaxed">
          Métricas consolidadas por operação médica na plataforma. Dados agregados de uso — não representam promessa de
          resultado clínico individual.
        </p>
      </div>
    </section>
  );
}
