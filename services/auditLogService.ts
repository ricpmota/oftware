/**
 * Serviço para gerenciar logs de auditoria do sistema Nutricionista
 */

import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export enum AuditLogType {
  NUTRI_VINCULO_SOLICITADO = 'NUTRI_VINCULO_SOLICITADO',
  NUTRI_VINCULO_ACEITO = 'NUTRI_VINCULO_ACEITO',
  NUTRI_VINCULO_REJEITADO = 'NUTRI_VINCULO_REJEITADO',
  NUTRI_VINCULO_CANCELADO = 'NUTRI_VINCULO_CANCELADO',
  PACIENTE_COMPARTILHADO_COM_NUTRI = 'PACIENTE_COMPARTILHADO_COM_NUTRI',
  NUTRI_ACEITOU_COMPARTILHAMENTO = 'NUTRI_ACEITOU_COMPARTILHAMENTO',
  NUTRI_REJEITOU_COMPARTILHAMENTO = 'NUTRI_REJEITOU_COMPARTILHAMENTO',
  COMPARTILHAMENTO_ENCERRADO = 'COMPARTILHAMENTO_ENCERRADO',
}

export interface AuditLog {
  id?: string;
  tipo: AuditLogType;
  medicoId?: string;
  nutricionistaId?: string;
  pacienteId?: string;
  criadoEm: Date;
  criadoPor?: string; // userId que criou o log
  dadosExtras?: Record<string, any>;
}

export class AuditLogService {
  /**
   * Cria um log de auditoria
   */
  static async createLog(
    tipo: AuditLogType,
    data: {
      medicoId?: string;
      nutricionistaId?: string;
      pacienteId?: string;
      criadoPor?: string;
      dadosExtras?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'logs'), {
        tipo,
        medicoId: data.medicoId || null,
        nutricionistaId: data.nutricionistaId || null,
        pacienteId: data.pacienteId || null,
        criadoEm: Timestamp.now(),
        criadoPor: data.criadoPor || null,
        dadosExtras: data.dadosExtras || null,
      });
    } catch (error) {
      // Não lançar erro para não quebrar o fluxo principal
      // Apenas logar no console
      console.error('Erro ao criar log de auditoria:', error);
    }
  }

  /**
   * Log quando nutricionista solicita vínculo com médico
   */
  static async logNutriVinculoSolicitado(
    nutricionistaId: string,
    medicoId: string,
    criadoPor: string
  ): Promise<void> {
    await this.createLog(AuditLogType.NUTRI_VINCULO_SOLICITADO, {
      nutricionistaId,
      medicoId,
      criadoPor,
    });
  }

  /**
   * Log quando médico aceita vínculo com nutricionista
   */
  static async logNutriVinculoAceito(
    nutricionistaId: string,
    medicoId: string,
    criadoPor: string
  ): Promise<void> {
    await this.createLog(AuditLogType.NUTRI_VINCULO_ACEITO, {
      nutricionistaId,
      medicoId,
      criadoPor,
    });
  }

  /**
   * Log quando nutricionista cancela solicitação de vínculo
   */
  static async logNutriVinculoCancelado(
    nutricionistaId: string,
    medicoId: string,
    canceladoPor: string
  ): Promise<void> {
    await this.createLog(AuditLogType.NUTRI_VINCULO_CANCELADO, {
      nutricionistaId,
      medicoId,
      criadoPor: canceladoPor,
    });
  }

  /**
   * Log quando médico rejeita vínculo com nutricionista
   */

  static async logNutriVinculoRejeitado(
    nutricionistaId: string,
    medicoId: string,
    criadoPor: string
  ): Promise<void> {
    await this.createLog(AuditLogType.NUTRI_VINCULO_REJEITADO, {
      nutricionistaId,
      medicoId,
      criadoPor,
    });
  }

  /**
   * Log quando médico compartilha paciente com nutricionista
   */
  static async logPacienteCompartilhadoComNutri(
    medicoId: string,
    nutricionistaId: string,
    pacienteId: string,
    criadoPor: string
  ): Promise<void> {
    await this.createLog(AuditLogType.PACIENTE_COMPARTILHADO_COM_NUTRI, {
      medicoId,
      nutricionistaId,
      pacienteId,
      criadoPor,
    });
  }

  /**
   * Log quando nutricionista aceita compartilhamento
   */
  static async logNutriAceitouCompartilhamento(
    nutricionistaId: string,
    medicoId: string,
    pacienteId: string,
    criadoPor: string
  ): Promise<void> {
    await this.createLog(AuditLogType.NUTRI_ACEITOU_COMPARTILHAMENTO, {
      nutricionistaId,
      medicoId,
      pacienteId,
      criadoPor,
    });
  }

  /**
   * Log quando nutricionista rejeita compartilhamento
   */
  static async logNutriRejeitouCompartilhamento(
    nutricionistaId: string,
    medicoId: string,
    pacienteId: string,
    criadoPor: string
  ): Promise<void> {
    await this.createLog(AuditLogType.NUTRI_REJEITOU_COMPARTILHAMENTO, {
      nutricionistaId,
      medicoId,
      pacienteId,
      criadoPor,
    });
  }

  /**
   * Log quando médico encerra compartilhamento
   */
  static async logCompartilhamentoEncerrado(
    medicoId: string,
    nutricionistaId: string,
    pacienteId: string,
    criadoPor: string
  ): Promise<void> {
    await this.createLog(AuditLogType.COMPARTILHAMENTO_ENCERRADO, {
      medicoId,
      nutricionistaId,
      pacienteId,
      criadoPor,
    });
  }
}
