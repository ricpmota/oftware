'use client';

import { useMemo, useState } from 'react';
import type { AnamneseInteligenteV3, DadosClinicos, PacienteCompleto } from '@/types/obesidade';
import { buildAnamneseLayout, type AnamneseEditTarget } from '@/lib/meta/anamneseLayout';
import { AnamneseV2CardEditModal } from '@/components/metaadmin/AnamneseV2CardEditModal';
import { PerfilMetabolicoCardEditModal } from '@/components/metaadmin/PerfilMetabolicoCardEditModal';
import { AnamnesePacienteLayout } from '@/components/metaadmin/paciente-modal/AnamnesePacienteLayout';
import type { AnamneseV2SectionId } from '@/components/meta/AnamneseV2EditUI';

type EditState =
  | { kind: 'v2'; id: AnamneseV2SectionId; title: string }
  | { kind: 'v3'; id: string; title: string };

type Props = {
  pacienteId?: string;
  paciente: PacienteCompleto;
  dadosClinicos?: DadosClinicos;
  anamneseInteligenteAtivo?: boolean;
  allowGerarAnalise?: boolean;
  setPaciente?: React.Dispatch<React.SetStateAction<PacienteCompleto | null>>;
  onAnamneseInteligenteUpdated?: (inteligencia: AnamneseInteligenteV3) => void;
};

export function PerfilMetabolicoCompletoSection({ paciente, setPaciente }: Props) {
  const layout = useMemo(() => buildAnamneseLayout(paciente), [paciente]);
  const [editando, setEditando] = useState<EditState | null>(null);

  const abrirEdicao = (target: AnamneseEditTarget) => {
    setEditando(
      target.kind === 'v2'
        ? { kind: 'v2', id: target.id as AnamneseV2SectionId, title: target.title }
        : { kind: 'v3', id: target.id, title: target.title }
    );
  };

  return (
    <>
      <AnamnesePacienteLayout layout={layout} onEdit={setPaciente ? abrirEdicao : undefined} />

      {editando?.kind === 'v2' && setPaciente && (
        <AnamneseV2CardEditModal
          open
          sectionId={editando.id}
          cardTitle={editando.title}
          paciente={paciente}
          onClose={() => setEditando(null)}
          onSave={(atualizado) => {
            setPaciente(atualizado);
            setEditando(null);
          }}
        />
      )}

      {editando?.kind === 'v3' && setPaciente && (
        <PerfilMetabolicoCardEditModal
          open
          cardId={editando.id}
          cardTitle={editando.title}
          paciente={paciente}
          onClose={() => setEditando(null)}
          onSave={(atualizado) => {
            setPaciente(atualizado);
            setEditando(null);
          }}
        />
      )}
    </>
  );
}
