import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PacienteMensagemAnexo } from '@/lib/pacienteMensagem/mensagemHtml';

export type { PacienteMensagemAnexo };

export interface PacienteMensagem {
  id: string;
  mensagemId?: string; // ID da mensagem original (se houver)
  /** Agrupa respostas no mesmo fio (Gmail-like). */
  threadId?: string;
  /** Mensagem à qual esta responde (opcional). */
  emRespostaAId?: string;
  pacienteId: string;
  pacienteEmail: string;
  medicoId?: string; // ID do médico responsável
  medicoEmail?: string; // Email do médico responsável
  titulo: string;
  /** Texto puro (legado / preview). */
  mensagem: string;
  /** Corpo HTML formatado (negrito, fontes, etc.). */
  mensagemHtml?: string;
  /** Anexos (arquivo, foto, vídeo). */
  anexos?: PacienteMensagemAnexo[];
  tipo: 'clinico' | 'alerta' | 'orientacao' | 'revisao';
  lida: boolean;
  lidaEm?: Date;
  criadoEm: Date;
  criadoPor: string; // Email de quem criou (médico ou paciente)
  direcao: 'medico_para_paciente' | 'paciente_para_medico'; // Direção da mensagem
  deletada?: boolean;
  pacienteNome?: string; // Nome do paciente (para exibição no médico)
}

/** Remove prefixos Re:/Fwd: para agrupar por assunto. */
export function normalizeAssuntoMensagem(titulo: string): string {
  return String(titulo || '')
    .replace(/^(re|fw|fwd)\s*:\s*/gi, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function resolveMensagemThreadId(msg: Pick<PacienteMensagem, 'id' | 'threadId' | 'titulo' | 'pacienteId'>): string {
  if (msg.threadId?.trim()) return msg.threadId.trim();
  const assunto = normalizeAssuntoMensagem(msg.titulo);
  if (assunto) return `legacy:${msg.pacienteId}:${assunto}`;
  return msg.id;
}

function mapMensagemDoc(id: string, data: Record<string, any>): PacienteMensagem {
  const direcao = data.direcao || 'medico_para_paciente';
  const anexosRaw = Array.isArray(data.anexos) ? data.anexos : [];
  return {
    id,
    mensagemId: data.mensagemId,
    threadId: typeof data.threadId === 'string' ? data.threadId : undefined,
    emRespostaAId: typeof data.emRespostaAId === 'string' ? data.emRespostaAId : undefined,
    pacienteId: data.pacienteId,
    pacienteEmail: data.pacienteEmail,
    medicoId: data.medicoId,
    medicoEmail: data.medicoEmail,
    titulo: data.titulo || '',
    mensagem: data.mensagem || '',
    mensagemHtml: typeof data.mensagemHtml === 'string' ? data.mensagemHtml : undefined,
    anexos: anexosRaw
      .filter((a: any) => a && typeof a.url === 'string')
      .map((a: any) => ({
        id: String(a.id || ''),
        name: String(a.name || 'anexo'),
        url: String(a.url),
        mimeType: String(a.mimeType || 'application/octet-stream'),
        size: Number(a.size) || 0,
      })),
    tipo: data.tipo || 'clinico',
    lida: data.lida || false,
    lidaEm: data.lidaEm?.toDate?.() ?? data.lidaEm,
    criadoEm: data.criadoEm?.toDate?.() || new Date(),
    criadoPor: data.criadoPor || '',
    direcao,
    deletada: data.deletada || false,
    pacienteNome: data.pacienteNome,
  };
}

export class PacienteMensagemService {
  
  /**
   * Criar uma nova mensagem do médico
   */
  static async criarMensagem(mensagem: Omit<PacienteMensagem, 'id' | 'criadoEm'>): Promise<string> {
    try {
      const mensagemData: Record<string, unknown> = {
        ...mensagem,
        criadoEm: new Date(),
      };
      if (!mensagem.mensagemHtml) delete mensagemData.mensagemHtml;
      if (!mensagem.anexos?.length) delete mensagemData.anexos;
      if (!mensagem.threadId) delete mensagemData.threadId;
      if (!mensagem.emRespostaAId) delete mensagemData.emRespostaAId;

      const docRef = await addDoc(collection(db, 'pacientes_mensagens'), mensagemData);

      // Novo fio: threadId = id do próprio documento
      if (!mensagem.threadId) {
        await updateDoc(docRef, { threadId: docRef.id });
      }

      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar mensagem:', error);
      throw error;
    }
  }

  /**
   * Buscar mensagens de um paciente (do médico para o paciente)
   */
  static async getMensagensPaciente(pacienteEmail: string): Promise<PacienteMensagem[]> {
    try {
      // Buscar todas as mensagens do paciente (sem filtrar por direcao para compatibilidade com dados antigos)
      const q = query(
        collection(db, 'pacientes_mensagens'),
        where('pacienteEmail', '==', pacienteEmail)
      );

      const snapshot = await getDocs(q);
      
      const mensagens = snapshot.docs.map(docSnap => mapMensagemDoc(docSnap.id, docSnap.data()));

      // Retornar TODAS as mensagens (recebidas e enviadas) - o filtro será feito no componente
      // Filtrar apenas mensagens não deletadas
      const mensagensFiltradas = mensagens.filter(m => !m.deletada);

      // Ordenar no cliente (mais recente primeiro)
      return mensagensFiltradas.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }
  }

  /**
   * Buscar mensagens do paciente para o médico
   */
  static async getMensagensPacienteParaMedico(medicoId: string, pacienteEmail?: string): Promise<PacienteMensagem[]> {
    try {
      let q;
      if (pacienteEmail) {
        // Buscar todas as mensagens do paciente para este médico
        q = query(
          collection(db, 'pacientes_mensagens'),
          where('medicoId', '==', medicoId),
          where('pacienteEmail', '==', pacienteEmail)
        );
      } else {
        q = query(
          collection(db, 'pacientes_mensagens'),
          where('medicoId', '==', medicoId)
        );
      }

      const snapshot = await getDocs(q);
      
      const mensagens = snapshot.docs.map(docSnap => mapMensagemDoc(docSnap.id, docSnap.data()));

      // Filtrar apenas mensagens do paciente para o médico
      const mensagensFiltradas = mensagens.filter(m => 
        m.direcao === 'paciente_para_medico'
      );

      // Ordenar no cliente (mais recente primeiro)
      return mensagensFiltradas.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
    } catch (error) {
      console.error('Erro ao buscar mensagens do paciente para o médico:', error);
      return [];
    }
  }

  /**
   * Contar mensagens não lidas do paciente para o médico
   */
  static async contarMensagensNaoLidasPacienteParaMedico(medicoId: string, pacienteEmail?: string): Promise<number> {
    try {
      let q;
      if (pacienteEmail) {
        q = query(
          collection(db, 'pacientes_mensagens'),
          where('medicoId', '==', medicoId),
          where('pacienteEmail', '==', pacienteEmail),
          where('direcao', '==', 'paciente_para_medico'),
          where('lida', '==', false),
          where('deletada', '==', false)
        );
      } else {
        q = query(
          collection(db, 'pacientes_mensagens'),
          where('medicoId', '==', medicoId),
          where('direcao', '==', 'paciente_para_medico'),
          where('lida', '==', false),
          where('deletada', '==', false)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Erro ao contar mensagens não lidas:', error);
      return 0;
    }
  }

  /**
   * Garante threadId compartilhado em mensagens de um fio legado (mesmo assunto).
   */
  static async ensureThreadId(mensagemIds: string[], threadId: string): Promise<void> {
    await Promise.all(
      mensagemIds.map(async (id) => {
        try {
          await updateDoc(doc(db, 'pacientes_mensagens', id), { threadId });
        } catch (e) {
          console.warn('[ensureThreadId]', id, e);
        }
      })
    );
  }

  /**
   * Marcar mensagem como lida
   */
  static async marcarComoLida(mensagemId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'pacientes_mensagens', mensagemId), {
        lida: true,
        lidaEm: new Date()
      });
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
      throw error;
    }
  }

  /**
   * Deletar mensagem
   */
  static async deletarMensagem(mensagemId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'pacientes_mensagens', mensagemId), {
        deletada: true
      });
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      throw error;
    }
  }

  /**
   * Contar mensagens não lidas de um paciente
   */
  static async contarMensagensNaoLidas(pacienteEmail: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'pacientes_mensagens'),
        where('pacienteEmail', '==', pacienteEmail),
        where('lida', '==', false),
        where('deletada', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Erro ao contar mensagens não lidas:', error);
      return 0;
    }
  }
}

