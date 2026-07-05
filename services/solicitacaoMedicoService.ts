import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import { normalizeLeadReferral, referralToFirestore } from '@/lib/crm/resolveLeadReferral';
import { SolicitacaoMedico } from '@/types/solicitacaoMedico';
import type { LeadReferralSnapshot } from '@/types/leadMedico';

export type CriarSolicitacaoOptions = {
  emailIndicador?: string;
  referral?: LeadReferralSnapshot;
};

function mapSolicitacaoDoc(id: string, data: Record<string, unknown>): SolicitacaoMedico {
  return {
    id,
    pacienteId: data.pacienteId as string | undefined,
    pacienteEmail: (data.pacienteEmail as string) || '',
    pacienteNome: (data.pacienteNome as string) || '',
    pacienteTelefone: data.pacienteTelefone as string | undefined,
    medicoId: (data.medicoId as string) || '',
    medicoNome: (data.medicoNome as string) || '',
    status: (data.status as SolicitacaoMedico['status']) || 'pendente',
    criadoEm: (data.criadoEm as { toDate?: () => Date })?.toDate?.() || new Date(),
    aceitaEm: (data.aceitaEm as { toDate?: () => Date })?.toDate?.(),
    rejeitadaEm: (data.rejeitadaEm as { toDate?: () => Date })?.toDate?.(),
    desistiuEm: (data.desistiuEm as { toDate?: () => Date })?.toDate?.(),
    observacoes: data.observacoes as string | undefined,
    motivoDesistencia: data.motivoDesistencia as string | undefined,
    chatInicialCompleto: data.chatInicialCompleto === true,
    referral: normalizeLeadReferral(data.referral),
  };
}

export class SolicitacaoMedicoService {
  /**
   * Criar uma nova solicitação de médico
   */
  static async criarSolicitacao(
    solicitacao: Omit<SolicitacaoMedico, 'id' | 'criadoEm'>,
    options?: CriarSolicitacaoOptions | string
  ): Promise<string> {
    const opts: CriarSolicitacaoOptions =
      typeof options === 'string' ? { emailIndicador: options } : options ?? {};

    try {
      let referral: LeadReferralSnapshot | undefined =
        solicitacao.referral ?? opts.referral;

      const solicitacaoData: Record<string, unknown> = {
        pacienteEmail: solicitacao.pacienteEmail,
        pacienteNome: solicitacao.pacienteNome,
        medicoId: solicitacao.medicoId,
        medicoNome: solicitacao.medicoNome,
        status: solicitacao.status,
        criadoEm: new Date(),
      };

      if (solicitacao.pacienteId) {
        solicitacaoData.pacienteId = solicitacao.pacienteId;
      }

      if (solicitacao.pacienteTelefone) {
        solicitacaoData.pacienteTelefone = solicitacao.pacienteTelefone;
      }

      if (solicitacao.chatInicialCompleto === true) {
        solicitacaoData.chatInicialCompleto = true;
      }

      if (referral?.type) {
        solicitacaoData.referral = referralToFirestore(referral);
      }

      const docRef = await addDoc(collection(db, 'solicitacoes_medico'), {
        ...solicitacaoData,
        ...shadowOrganizationFields(),
      });

      if (opts.emailIndicador && solicitacao.pacienteTelefone) {
        try {
          const { IndicacaoService } = await import('@/services/indicacaoService');
          const { MedicoService } = await import('@/services/medicoService');
          
          // Buscar dados do médico para obter cidade/estado
          const medico = await MedicoService.getMedicoById(solicitacao.medicoId);
          if (medico && medico.cidades.length > 0) {
            const primeiraCidade = medico.cidades[0];
            
            // Buscar dados do indicador (paciente que indicou)
            const { PacienteService } = await import('@/services/pacienteService');
            // Buscar paciente por userId (email)
            const pacientesQuery = query(
              collection(db, 'pacientes_completos'),
              where('userId', '==', opts.emailIndicador)
            );
            const pacientesSnapshot = await getDocs(pacientesQuery);
            const pacienteIndicador = pacientesSnapshot.empty ? null : {
              nome: pacientesSnapshot.docs[0].data().nome || opts.emailIndicador!.split('@')[0],
              dadosIdentificacao: pacientesSnapshot.docs[0].data().dadosIdentificacao || {}
            };
            
            const indicacaoId = await IndicacaoService.criarIndicacao({
              indicadoPor: opts.emailIndicador!,
              indicadoPorNome: pacienteIndicador?.nome || opts.emailIndicador!.split('@')[0],
              indicadoPorTelefone: pacienteIndicador?.dadosIdentificacao?.telefone?.replace(/\D/g, '') || '',
              nomePaciente: solicitacao.pacienteNome,
              telefonePaciente: solicitacao.pacienteTelefone.replace(/\D/g, ''),
              estado: primeiraCidade.estado,
              cidade: primeiraCidade.cidade,
              medicoId: solicitacao.medicoId,
              medicoNome: solicitacao.medicoNome,
              status: 'pendente',
            });

            if (!referral?.type || referral.type === 'medico' || referral.type === 'dr_link') {
              referral = {
                type: 'paciente',
                sourceId: indicacaoId,
                sourceName: pacienteIndicador?.nome || opts.emailIndicador!.split('@')[0],
                sourceContact: pacienteIndicador?.dadosIdentificacao?.telefone?.replace(/\D/g, '') || '',
                indicacaoId,
                capturedAt: new Date(),
              };
            } else if (referral.type === 'paciente') {
              referral = {
                ...referral,
                sourceId: indicacaoId,
                indicacaoId,
              };
            }
            await updateDoc(doc(db, 'solicitacoes_medico', docRef.id), {
              referral: referralToFirestore(referral),
            });

            console.log('✅ Indicação criada automaticamente via link para:', opts.emailIndicador);
          }
        } catch (indicacaoError) {
          console.error('❌ Erro ao criar indicação automática:', indicacaoError);
          // Não bloquear o fluxo se a indicação falhar
        }
      }
      
      // Enviar e-mail para o médico sobre o novo lead
      try {
        console.log('📧 Tentando enviar e-mail de novo lead médico...', {
          solicitacaoId: docRef.id,
          medicoId: solicitacao.medicoId,
          pacienteNome: solicitacao.pacienteNome
        });
        
        const emailResponse = await fetch('/api/send-email-novo-lead-medico', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solicitacaoId: docRef.id }),
        });

        const emailResult = await emailResponse.json();
        
        if (!emailResponse.ok) {
          console.error('❌ Erro ao enviar e-mail de novo lead médico:', emailResult);
        } else {
          console.log('✅ E-mail de novo lead médico enviado com sucesso:', emailResult);
        }
      } catch (emailError) {
        console.error('❌ Erro ao enviar e-mail de novo lead médico:', emailError);
        // Não bloquear o fluxo se o e-mail falhar
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      throw error;
    }
  }

  /**
   * Buscar solicitações de um médico
   */
  static async getSolicitacoesPorMedico(medicoId: string): Promise<SolicitacaoMedico[]> {
    try {
      const q = query(
        collection(db, 'solicitacoes_medico'),
        where('medicoId', '==', medicoId)
      );

      const snapshot = await getDocs(q);
      
      const solicitacoes = snapshot.docs.map((d) =>
        mapSolicitacaoDoc(d.id, d.data() as Record<string, unknown>)
      );

      // Ordenar no cliente (mais recente primeiro)
      return solicitacoes.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      return [];
    }
  }

  /**
   * Buscar solicitações de um paciente
   */
  static async getSolicitacoesPorPaciente(pacienteEmail: string): Promise<SolicitacaoMedico[]> {
    try {
      const q = query(
        collection(db, 'solicitacoes_medico'),
        where('pacienteEmail', '==', pacienteEmail)
      );

      const snapshot = await getDocs(q);
      
      const solicitacoes = snapshot.docs.map((d) =>
        mapSolicitacaoDoc(d.id, d.data() as Record<string, unknown>)
      );

      // Ordenar no cliente (mais recente primeiro)
      return solicitacoes.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      return [];
    }
  }

  /**
   * Marca solicitações pendentes do paciente como tendo chat inicial completo.
   */
  static async marcarChatInicialCompletoPorPaciente(
    pacienteEmail: string,
    medicoId?: string
  ): Promise<void> {
    try {
      const solicitacoes = await this.getSolicitacoesPorPaciente(pacienteEmail);
      const alvo = solicitacoes.filter(
        (s) =>
          s.status === 'pendente' &&
          s.chatInicialCompleto !== true &&
          (!medicoId || s.medicoId === medicoId)
      );
      await Promise.all(
        alvo.map((s) =>
          updateDoc(doc(db, 'solicitacoes_medico', s.id), { chatInicialCompleto: true })
        )
      );
    } catch (error) {
      console.error('Erro ao marcar chat inicial completo:', error);
      throw error;
    }
  }

  /**
   * Aceitar solicitação
   */
  static async aceitarSolicitacao(solicitacaoId: string, observacoes?: string): Promise<void> {
    try {
      const updateData: any = {
        status: 'aceita',
        aceitaEm: new Date()
      };

      if (observacoes) {
        updateData.observacoes = observacoes;
      }

      await updateDoc(doc(db, 'solicitacoes_medico', solicitacaoId), updateData);
    } catch (error) {
      console.error('Erro ao aceitar solicitação:', error);
      throw error;
    }
  }

  /**
   * Rejeitar solicitação - deleta o documento da coleção
   */
  static async rejeitarSolicitacao(solicitacaoId: string, observacoes?: string): Promise<void> {
    try {
      // Deletar o documento da coleção solicitacoes_medico
      await deleteDoc(doc(db, 'solicitacoes_medico', solicitacaoId));
      console.log('✅ Solicitação deletada com sucesso');
    } catch (error) {
      console.error('Erro ao rejeitar/deletar solicitação:', error);
      throw error;
    }
  }

  /**
   * Marcar como desistiu (paciente desistiu)
   */
  static async desistirSolicitacao(solicitacaoId: string, motivoDesistencia?: string): Promise<void> {
    try {
      const updateData: any = {
        status: 'desistiu',
        desistiuEm: new Date()
      };

      if (motivoDesistencia) {
        updateData.motivoDesistencia = motivoDesistencia;
      }

      await updateDoc(doc(db, 'solicitacoes_medico', solicitacaoId), updateData);
    } catch (error) {
      console.error('Erro ao marcar como desistiu:', error);
      throw error;
    }
  }

  /**
   * Cancelar todas as solicitações pendentes de um paciente
   */
  static async cancelarSolicitacoesPendentesPaciente(
    pacienteEmail: string,
    excludeSolicitacaoId?: string
  ): Promise<void> {
    try {
      const solicitacoes = await this.getSolicitacoesPorPaciente(pacienteEmail);
      const pendentes = solicitacoes.filter(
        (s) => s.status === 'pendente' && s.id !== excludeSolicitacaoId
      );
      
      for (const solicitacao of pendentes) {
        await updateDoc(doc(db, 'solicitacoes_medico', solicitacao.id), {
          status: 'desistiu',
          desistiuEm: new Date()
        });
      }
    } catch (error) {
      console.error('Erro ao cancelar solicitações pendentes:', error);
      throw error;
    }
  }

  /**
   * Deletar todas as solicitações de um paciente (usado quando paciente abandona tratamento)
   */
  static async deletarSolicitacoesPaciente(pacienteEmail: string): Promise<void> {
    try {
      const solicitacoes = await this.getSolicitacoesPorPaciente(pacienteEmail);
      
      for (const solicitacao of solicitacoes) {
        await deleteDoc(doc(db, 'solicitacoes_medico', solicitacao.id));
      }
    } catch (error) {
      console.error('Erro ao deletar solicitações do paciente:', error);
      throw error;
    }
  }

  /**
   * Deletar solicitações de vínculo entre um médico e um paciente específico.
   */
  static async deletarSolicitacoesPorMedicoEPaciente(medicoId: string, pacienteId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'solicitacoes_medico'),
        where('medicoId', '==', medicoId),
        where('pacienteId', '==', pacienteId)
      );

      const snapshot = await getDocs(q);
      for (const solicitacaoDoc of snapshot.docs) {
        await deleteDoc(doc(db, 'solicitacoes_medico', solicitacaoDoc.id));
      }
    } catch (error) {
      console.error('Erro ao deletar solicitações por médico e paciente:', error);
      throw error;
    }
  }

  /**
   * Buscar todas as solicitações pendentes
   */
  static async getAllSolicitacoesPendentes(): Promise<SolicitacaoMedico[]> {
    try {
      const q = query(
        collection(db, 'solicitacoes_medico'),
        where('status', '==', 'pendente')
      );

      const snapshot = await getDocs(q);
      
      const solicitacoes = snapshot.docs.map((d) =>
        mapSolicitacaoDoc(d.id, d.data() as Record<string, unknown>)
      );

      return solicitacoes;
    } catch (error) {
      console.error('Erro ao buscar solicitações pendentes:', error);
      return [];
    }
  }

  /**
   * Buscar todas as solicitações (qualquer status)
   */
  static async getAllSolicitacoes(): Promise<SolicitacaoMedico[]> {
    try {
      const snapshot = await getDocs(collection(db, 'solicitacoes_medico'));

      const solicitacoes = snapshot.docs.map((d) =>
        mapSolicitacaoDoc(d.id, d.data() as Record<string, unknown>)
      );

      return solicitacoes.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
    } catch (error) {
      console.error('Erro ao buscar todas as solicitações:', error);
      return [];
    }
  }
}

