import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, arrayUnion, arrayRemove } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { PatientData } from '../types/clinical';

export interface Patient extends PatientData {
  lastVisit: string;
  nextVisit?: string;
  medications: string[];
  notes: string;
  doctorId: string; // Médico principal (dono do prontuário)
  sharedWith: string[]; // Array de UIDs de médicos com acesso compartilhado
  pendingShares: PendingShare[]; // Solicitações pendentes de compartilhamento
  isShared?: boolean; // Indica se o paciente foi compartilhado com o médico atual
}

export interface PendingShare {
  fromDoctorId: string;
  fromDoctorEmail: string;
  fromDoctorName: string;
  patientId: string;
  patientName: string;
  requestedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export class PatientService {
  private static COLLECTION = 'patients';

  /**
   * Verificar se o usuário está autenticado
   */
  private static checkAuth(): string {
    if (!auth.currentUser) {
      throw new Error('Usuário não autenticado');
    }
    
    if (!auth.currentUser.uid) {
      throw new Error('UID do usuário não disponível');
    }
    
    return auth.currentUser.uid;
  }

  /**
   * Salvar paciente no Firestore
   */
  static async savePatient(patientData: PatientData): Promise<void> {
    try {
      const doctorId = this.checkAuth();
      
      const patient: Patient = {
        ...patientData,
        lastVisit: new Date().toISOString(),
        medications: [],
        notes: '',
        doctorId,
        sharedWith: [],
        pendingShares: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = doc(db, this.COLLECTION, patientData.id);
      await setDoc(docRef, patient);
      
      console.log('✅ Paciente salvo com sucesso:', patientData.id);
    } catch (error: any) {
      console.error('❌ Erro ao salvar paciente:', error);
      throw error;
    }
  }

  /**
   * Buscar paciente por ID
   */
  static async getPatient(patientId: string): Promise<Patient | null> {
    try {
      this.checkAuth();
      
      const docRef = doc(db, this.COLLECTION, patientId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as Patient;
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Erro ao buscar paciente:', error);
      return null;
    }
  }

  /**
   * Buscar todos os pacientes do médico (próprios e compartilhados)
   */
  static async getPatients(): Promise<Patient[]> {
    try {
      const doctorId = this.checkAuth();
      
      // Buscar pacientes onde o médico é o dono ou está na lista de compartilhamento
      const q = query(
        collection(db, this.COLLECTION),
        where('doctorId', '==', doctorId),
        orderBy('lastVisit', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const patients: Patient[] = [];
      
      querySnapshot.forEach((doc) => {
        patients.push(doc.data() as Patient);
      });

      // Buscar pacientes compartilhados com este médico
      const sharedQ = query(
        collection(db, this.COLLECTION),
        where('sharedWith', 'array-contains', doctorId),
        orderBy('lastVisit', 'desc')
      );
      
      const sharedSnapshot = await getDocs(sharedQ);
      
      sharedSnapshot.forEach((doc) => {
        const patient = doc.data() as Patient;
        // Marcar como compartilhado
        patients.push({
          ...patient,
          isShared: true
        });
      });
      
      return patients;
    } catch (error: any) {
      console.error('❌ Erro ao buscar pacientes:', error);
      return [];
    }
  }

  /**
   * Buscar solicitações pendentes de compartilhamento
   */
  static async getPendingShares(): Promise<PendingShare[]> {
    try {
      const doctorId = this.checkAuth();
      
      const q = query(
        collection(db, this.COLLECTION),
        where('pendingShares', 'array-contains', { fromDoctorId: doctorId })
      );
      
      const querySnapshot = await getDocs(q);
      const pendingShares: PendingShare[] = [];
      
      querySnapshot.forEach((doc) => {
        const patient = doc.data() as Patient;
        const pendingForThisDoctor = patient.pendingShares.filter(
          share => share.fromDoctorId === doctorId && share.status === 'pending'
        );
        pendingShares.push(...pendingForThisDoctor);
      });
      
      return pendingShares;
    } catch (error: any) {
      console.error('❌ Erro ao buscar solicitações pendentes:', error);
      return [];
    }
  }

  /**
   * Solicitar compartilhamento de paciente
   */
  static async requestShare(patientId: string, targetDoctorEmail: string): Promise<void> {
    try {
      const fromDoctorId = this.checkAuth();
      
      // Buscar informações do médico solicitante
      const fromDoctorDoc = await getDoc(doc(db, 'doctors', fromDoctorId));
      if (!fromDoctorDoc.exists()) {
        throw new Error('Perfil do médico não encontrado');
      }
      
      const fromDoctorData = fromDoctorDoc.data();
      
      // Buscar o paciente
      const patientDoc = await getDoc(doc(db, this.COLLECTION, patientId));
      if (!patientDoc.exists()) {
        throw new Error('Paciente não encontrado');
      }
      
      const patient = patientDoc.data() as Patient;
      
      // Verificar se o médico solicitante tem acesso ao paciente
      if (patient.doctorId !== fromDoctorId && !patient.sharedWith.includes(fromDoctorId)) {
        throw new Error('Você não tem permissão para compartilhar este paciente');
      }
      
      // Buscar o médico alvo pelo email
      const doctorsQuery = query(
        collection(db, 'doctors'),
        where('email', '==', targetDoctorEmail)
      );
      
      const doctorsSnapshot = await getDocs(doctorsQuery);
      if (doctorsSnapshot.empty) {
        throw new Error('Médico com este email não encontrado');
      }
      
      const targetDoctorDoc = doctorsSnapshot.docs[0];
      const targetDoctorId = targetDoctorDoc.id;
      
      // Verificar se já existe uma solicitação pendente
      const existingRequest = patient.pendingShares.find(
        share => share.fromDoctorId === fromDoctorId && 
                share.status === 'pending'
      );
      
      if (existingRequest) {
        throw new Error('Já existe uma solicitação pendente para este médico');
      }
      
      // Criar nova solicitação
      const newShare: PendingShare = {
        fromDoctorId,
        fromDoctorEmail: fromDoctorData.email || '',
        fromDoctorName: fromDoctorData.name || '',
        patientId,
        patientName: patient.name,
        requestedAt: new Date().toISOString(),
        status: 'pending'
      };
      
      // Adicionar à lista de solicitações pendentes
      await updateDoc(doc(db, this.COLLECTION, patientId), {
        pendingShares: arrayUnion(newShare)
      });
      
      console.log('✅ Solicitação de compartilhamento enviada');
    } catch (error: any) {
      console.error('❌ Erro ao solicitar compartilhamento:', error);
      throw error;
    }
  }

  /**
   * Aceitar solicitação de compartilhamento
   */
  static async acceptShare(patientId: string, fromDoctorId: string): Promise<void> {
    try {
      const currentDoctorId = this.checkAuth();
      
      const patientDoc = await getDoc(doc(db, this.COLLECTION, patientId));
      if (!patientDoc.exists()) {
        throw new Error('Paciente não encontrado');
      }
      
      const patient = patientDoc.data() as Patient;
      
      // Encontrar a solicitação
      const shareIndex = patient.pendingShares.findIndex(
        share => share.fromDoctorId === fromDoctorId && 
                share.status === 'pending'
      );
      
      if (shareIndex === -1) {
        throw new Error('Solicitação não encontrada');
      }
      
      // Atualizar status da solicitação
      const updatedShares = [...patient.pendingShares];
      updatedShares[shareIndex] = {
        ...updatedShares[shareIndex],
        status: 'accepted'
      };
      
      // Adicionar médico à lista de compartilhamento
      await updateDoc(doc(db, this.COLLECTION, patientId), {
        pendingShares: updatedShares,
        sharedWith: arrayUnion(currentDoctorId)
      });
      
      console.log('✅ Compartilhamento aceito');
    } catch (error: any) {
      console.error('❌ Erro ao aceitar compartilhamento:', error);
      throw error;
    }
  }

  /**
   * Rejeitar solicitação de compartilhamento
   */
  static async rejectShare(patientId: string, fromDoctorId: string): Promise<void> {
    try {
      const currentDoctorId = this.checkAuth();
      
      const patientDoc = await getDoc(doc(db, this.COLLECTION, patientId));
      if (!patientDoc.exists()) {
        throw new Error('Paciente não encontrado');
      }
      
      const patient = patientDoc.data() as Patient;
      
      // Encontrar a solicitação
      const shareIndex = patient.pendingShares.findIndex(
        share => share.fromDoctorId === fromDoctorId && 
                share.status === 'pending'
      );
      
      if (shareIndex === -1) {
        throw new Error('Solicitação não encontrada');
      }
      
      // Atualizar status da solicitação
      const updatedShares = [...patient.pendingShares];
      updatedShares[shareIndex] = {
        ...updatedShares[shareIndex],
        status: 'rejected'
      };
      
      await updateDoc(doc(db, this.COLLECTION, patientId), {
        pendingShares: updatedShares
      });
      
      console.log('✅ Compartilhamento rejeitado');
    } catch (error: any) {
      console.error('❌ Erro ao rejeitar compartilhamento:', error);
      throw error;
    }
  }

  /**
   * Atualizar paciente
   */
  static async updatePatient(patientId: string, updates: Partial<Patient>): Promise<void> {
    try {
      this.checkAuth();
      
      const docRef = doc(db, this.COLLECTION, patientId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ Paciente atualizado com sucesso:', patientId);
    } catch (error: any) {
      console.error('❌ Erro ao atualizar paciente:', error);
      throw error;
    }
  }

  /**
   * Adicionar visita ao paciente
   */
  static async addVisit(patientId: string, visitData: {
    date: string;
    notes?: string;
    medications?: string[];
    nextVisit?: string;
  }): Promise<void> {
    try {
      this.checkAuth();
      
      const docRef = doc(db, this.COLLECTION, patientId);
      await updateDoc(docRef, {
        lastVisit: visitData.date,
        nextVisit: visitData.nextVisit || null,
        notes: visitData.notes || '',
        medications: visitData.medications || [],
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ Visita adicionada com sucesso:', patientId);
    } catch (error: any) {
      console.error('❌ Erro ao adicionar visita:', error);
      throw error;
    }
  }
} 