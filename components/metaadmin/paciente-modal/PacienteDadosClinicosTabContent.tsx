'use client';

import type { AnamneseInteligenteV3, PacienteCompleto } from '@/types/obesidade';
import { PerfilMetabolicoCompletoSection } from '@/components/metaadmin/PerfilMetabolicoCompletoSection';
import { AnamneseMedidasIniciaisFields } from '@/components/metaadmin/paciente-modal/AnamneseMedidasIniciaisFields';
import {
  AnamneseIcons,
  AnamneseSectionCard,
  AnamneseTabShell,
} from '@/components/metaadmin/paciente-modal/anamneseSectionUi';

export type PacienteDadosClinicosTabContentProps = {
  paciente: PacienteCompleto;
  /** Exibe o card Perfil metabólico completo (padrão: true). */
  showPerfilMetabolicoInteligente?: boolean;
  /** Permite o botão "Gerar análise inteligente" (metanutri: false). */
  allowGerarAnaliseInteligente?: boolean;
  /** Gate do médico; só usado se allowGerarAnaliseInteligente for true. */
  anamneseInteligenteAtivo?: boolean;
  onAnamneseInteligenteUpdated?: (inteligencia: AnamneseInteligenteV3) => void;
};

export function PacienteDadosClinicosTabContent({
  paciente,
  showPerfilMetabolicoInteligente = true,
  allowGerarAnaliseInteligente = false,
  anamneseInteligenteAtivo = false,
  onAnamneseInteligenteUpdated,
}: PacienteDadosClinicosTabContentProps) {
  return (
    <AnamneseTabShell>
      <AnamneseSectionCard sectionId="2.1" title="Medidas Iniciais" icon={AnamneseIcons.medidas}>
        <AnamneseMedidasIniciaisFields paciente={paciente} readOnly />
      </AnamneseSectionCard>

      {showPerfilMetabolicoInteligente && (
        <PerfilMetabolicoCompletoSection
          pacienteId={paciente.id}
          paciente={paciente}
          dadosClinicos={paciente.dadosClinicos}
          anamneseInteligenteAtivo={anamneseInteligenteAtivo}
          allowGerarAnalise={allowGerarAnaliseInteligente}
          onAnamneseInteligenteUpdated={onAnamneseInteligenteUpdated}
        />
      )}
    </AnamneseTabShell>
  );
}
