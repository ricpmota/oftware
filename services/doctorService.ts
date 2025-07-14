import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { DoctorProfile, DoctorProfileFormData } from '../types/doctor';

export class DoctorService {
  private static COLLECTION = 'doctors';

  /**
   * Verificar se o usuário está autenticado
   */
  private static checkAuth(): string {
    if (!auth.currentUser) {
      throw new Error('Usuário não autenticado');
    }
    
    // Verificar se o token está válido
    if (!auth.currentUser.uid) {
      throw new Error('UID do usuário não disponível');
    }
    
    console.log('🔍 Usuário autenticado:', auth.currentUser.uid, auth.currentUser.email);
    console.log('🔍 Token válido:', !!auth.currentUser.uid);
    
    return auth.currentUser.uid;
  }

  /**
   * Buscar perfil do médico no Firestore
   */
  static async getDoctorProfile(uid?: string): Promise<DoctorProfile | null> {
    try {
      const userId = uid || this.checkAuth();
      console.log('🔍 Buscando perfil para usuário:', userId);
      
      const docRef = doc(db, this.COLLECTION, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log('✅ Perfil encontrado');
        return docSnap.data() as DoctorProfile;
      }
      
      console.log('ℹ️ Perfil não encontrado');
      return null;
    } catch (error: any) {
      console.error('❌ Erro ao buscar perfil do médico:', error);
      console.error('🔍 Detalhes do erro:', {
        code: error.code,
        message: error.message
      });
      
      // Se for erro de permissão, retornar null silenciosamente
      if (error.code === 'permission-denied') {
        console.log('🚫 Permissão negada ao buscar perfil - usuário pode não ter perfil ainda');
        return null;
      }
      
      // Se for erro de não autenticado, retornar null
      if (error.code === 'unauthenticated') {
        console.log('🚫 Usuário não autenticado');
        return null;
      }
      
      // Para outros erros, logar mas não quebrar a aplicação
      console.warn('⚠️ Erro ao buscar perfil do médico:', error);
      return null;
    }
  }

  /**
   * Salvar perfil do médico no Firestore
   */
  static async saveDoctorProfile(uid: string, profileData: DoctorProfileFormData): Promise<void> {
    try {
      // Verificar autenticação
      if (!auth.currentUser) {
        console.error('❌ Usuário não autenticado');
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      if (auth.currentUser.uid !== uid) {
        console.error('❌ UID não corresponde:', { 
          currentUser: auth.currentUser.uid, 
          requestedUid: uid 
        });
        throw new Error('UID do usuário não corresponde. Faça login novamente.');
      }

      console.log('💾 Salvando perfil para usuário:', uid);
      console.log('📝 Dados do perfil:', profileData);
      console.log('🔐 Usuário autenticado:', auth.currentUser.email);

      const docRef = doc(db, this.COLLECTION, uid);
      const now = new Date().toISOString();
      
      const profile: DoctorProfile = {
        uid,
        ...profileData,
        createdAt: now,
        updatedAt: now
      };
      
      await setDoc(docRef, profile);
      console.log('✅ Perfil salvo com sucesso');
    } catch (error: any) {
      console.error('❌ Erro ao salvar perfil do médico:', error);
      console.error('🔍 Detalhes do erro:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Se for erro de permissão, tentar usar a API Admin como fallback
      if (error.code === 'permission-denied') {
        console.log('🔄 Tentando criar perfil via API Admin...');
        try {
          const response = await fetch('/api/admin/create-doctor-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid,
              ...profileData
            })
          });

          if (response.ok) {
            console.log('✅ Perfil criado com sucesso via API Admin');
            return;
          } else {
            const errorData = await response.json();
            throw new Error(`Erro na API Admin: ${errorData.error}`);
          }
        } catch (apiError: any) {
          console.error('❌ Erro na API Admin:', apiError);
          throw new Error('Erro de permissão: Verifique se você está logado corretamente e tente novamente');
        }
      } else if (error.code === 'unauthenticated') {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      } else if (error.message?.includes('permission')) {
        throw new Error('Erro de permissão: Verifique se você está logado corretamente');
      } else if (error.message?.includes('autenticado')) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }
      
      throw error;
    }
  }

  /**
   * Atualizar perfil do médico no Firestore
   */
  static async updateDoctorProfile(uid: string, profileData: Partial<DoctorProfileFormData>): Promise<void> {
    try {
      // Verificar autenticação
      if (!auth.currentUser || auth.currentUser.uid !== uid) {
        throw new Error('Usuário não autenticado ou UID não corresponde');
      }

      const docRef = doc(db, this.COLLECTION, uid);
      const now = new Date().toISOString();
      
      await updateDoc(docRef, {
        ...profileData,
        updatedAt: now
      });
    } catch (error: any) {
      console.error('Erro ao atualizar perfil do médico:', error);
      
      // Se for erro de permissão, dar feedback específico
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        throw new Error('Erro de permissão: Verifique se você está logado corretamente');
      }
      
      throw error;
    }
  }

  /**
   * Verificar se o médico já tem perfil configurado
   */
  static async hasDoctorProfile(uid?: string): Promise<boolean> {
    try {
      const profile = await this.getDoctorProfile(uid);
      return profile !== null;
    } catch (error) {
      console.warn('Erro ao verificar perfil do médico:', error);
      return false;
    }
  }

  /**
   * Buscar perfil do usuário atual (método conveniente)
   */
  static async getCurrentUserProfile(): Promise<DoctorProfile | null> {
    return this.getDoctorProfile();
  }
} 