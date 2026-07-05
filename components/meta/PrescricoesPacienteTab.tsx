'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { Prescricao } from '@/types/prescricao';
import { PrescricaoService } from '@/services/prescricaoService';
import PrescricaoLeituraModal from '@/components/meta/PrescricaoLeituraModal';
import PrescricoesListaPaciente from '@/components/meta/PrescricoesListaPaciente';

export default function PrescricoesPacienteTab({ paciente }: { paciente: PacienteCompleto | null }) {
  const [lista, setLista] = useState<Prescricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [prescricaoModal, setPrescricaoModal] = useState<Prescricao | null>(null);

  const pacienteId = paciente?.id;

  useEffect(() => {
    if (!pacienteId) {
      setLista([]);
      setLoading(false);
      setPrescricaoModal(null);
      return;
    }
    let cancel = false;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const raw = await PrescricaoService.getPrescricoesByPaciente(pacienteId);
        const filtradas = raw.filter((p) => !p.isTemplate);
        if (!cancel) setLista(filtradas);
      } catch (e) {
        console.error(e);
        if (!cancel) setErro('Não foi possível carregar as prescrições.');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [pacienteId]);

  if (!pacienteId) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center border border-gray-200">
        <p className="text-black">Salve seus dados para ver as prescrições.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-black">
        <Loader2 className="h-10 w-10 animate-spin text-green-600 mb-3" />
        <p className="text-sm">Carregando prescrições…</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-800 text-sm">{erro}</div>
    );
  }

  if (lista.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm text-center border border-gray-200">
        <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-black mb-2">Nenhuma prescrição ainda</h3>
        <p className="text-black text-sm">Quando o médico registrar prescrições para você, elas aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <>
      <PrescricoesListaPaciente prescricoes={lista} onItemClick={setPrescricaoModal} accent="green" />

      <PrescricaoLeituraModal
        prescricao={prescricaoModal}
        paciente={paciente}
        onClose={() => setPrescricaoModal(null)}
      />
    </>
  );
}
