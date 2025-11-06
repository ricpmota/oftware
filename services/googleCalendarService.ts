import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface GoogleCalendarToken {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  calendarId?: string; // ID do calendário criado para o sistema
  sincronizadoEm?: Date;
}

export class GoogleCalendarService {
  private static readonly COLLECTION_NAME = 'google_calendar_tokens';

  // Salvar token de acesso
  static async salvarToken(token: GoogleCalendarToken): Promise<void> {
    try {
      await setDoc(
        doc(db, this.COLLECTION_NAME, token.userId),
        {
          ...token,
          expiresAt: token.expiresAt instanceof Date ? token.expiresAt : new Date(token.expiresAt),
          sincronizadoEm: token.sincronizadoEm || new Date()
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Erro ao salvar token do Google Calendar:', error);
      throw error;
    }
  }

  // Buscar token por userId
  static async getToken(userId: string): Promise<GoogleCalendarToken | null> {
    try {
      const tokenDoc = await getDoc(doc(db, this.COLLECTION_NAME, userId));
      if (!tokenDoc.exists()) {
        return null;
      }
      const data = tokenDoc.data();
      return {
        ...data,
        expiresAt: data.expiresAt?.toDate() || new Date(),
        sincronizadoEm: data.sincronizadoEm?.toDate()
      } as GoogleCalendarToken;
    } catch (error) {
      console.error('Erro ao buscar token do Google Calendar:', error);
      throw error;
    }
  }

  // Verificar se token está autorizado
  static async isAutorizado(userId: string): Promise<boolean> {
    const token = await this.getToken(userId);
    return token !== null && token.accessToken !== '';
  }

  // Remover autorização
  static async removerAutorizacao(userId: string): Promise<void> {
    try {
      await setDoc(
        doc(db, this.COLLECTION_NAME, userId),
        {
          accessToken: '',
          refreshToken: '',
          expiresAt: new Date(0)
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Erro ao remover autorização do Google Calendar:', error);
      throw error;
    }
  }

  // Atualizar data de sincronização
  static async atualizarSincronizacao(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTION_NAME, userId), {
        sincronizadoEm: new Date()
      });
    } catch (error) {
      console.error('Erro ao atualizar data de sincronização:', error);
      throw error;
    }
  }
}

