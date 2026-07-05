'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ContratoTratamentoDocumentoRecord } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import { buildContratoTratamentoTextoLeituraPaciente } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTextoLeituraPaciente';
import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';

export type ContratoPacienteTextoLeituraProps = {
  paciente: PacienteCompleto;
  medico: Medico | null;
  contrato: ContratoTratamentoDocumentoRecord;
};

export default function ContratoPacienteTextoLeitura({
  paciente,
  medico,
  contrato,
}: ContratoPacienteTextoLeituraProps) {
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const t = await buildContratoTratamentoTextoLeituraPaciente(medico, paciente, {
          medicoId: contrato.medicoId,
          pacienteId: paciente.id,
          hashDocumento: contrato.hashDocumento,
          opcaoEntregaMaterial: contrato.opcaoEntregaMaterial ?? null,
        });
        if (!cancel) setTexto(t);
      } catch (e) {
        if (!cancel) setErro(e instanceof Error ? e.message : 'Não foi possível carregar o contrato.');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [paciente, medico, contrato.hashDocumento, contrato.medicoId, contrato.opcaoEntregaMaterial, paciente.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-12 text-sm text-[#E8EDED]/70">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando contrato…
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
        {erro}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#06152e]/60">
      <div className="border-b border-white/10 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#E8EDED]/55">Leitura do contrato</p>
        <p className="text-sm text-[#E8EDED]/75">
          Texto completo para leitura. A assinatura digital do médico consta no documento oficial.
        </p>
      </div>
      <pre className="max-h-none whitespace-pre-wrap break-words px-4 py-4 text-xs leading-relaxed text-[#E8EDED]/90 sm:text-sm">
        {texto}
      </pre>
    </section>
  );
}
