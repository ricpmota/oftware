import { collection, doc, getDocs, getDoc, updateDoc, addDoc, deleteDoc, query, where, setDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { User, Residente, Local, Servico, Escala, ServicoDia } from '@/types/auth';
import { InternalNotificationService } from './internalNotificationService';
import { Troca, NotificacaoTroca } from '@/types/troca';
import { Ferias, NotificacaoFerias } from '@/types/ferias';

export class UserService {
  // Usuários
  static async getAllUsers(): Promise<User[]> {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      return usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          name: data.name || '',
          email: data.email || '',
          role: data.role || 'user',
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as User;
      });
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      throw error;
    }
  }


  static async updateUserRole(userId: string, role: 'admin' | 'user' | 'residente' | 'recepcao'): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      throw error;
    }
  }

  static async updateUserName(userId: string, name: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        name,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao atualizar nome:', error);
      throw error;
    }
  }

  static async getUserByUid(uid: string): Promise<User | null> {
    try {
      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
      if (userDoc.empty) {
        return null;
      }
      
      const userData = userDoc.docs[0].data();
      return {
        uid: userData.uid,
        name: userData.name || '',
        email: userData.email || '',
        role: userData.role || 'user',
        createdAt: userData.createdAt?.toDate(),
        updatedAt: userData.updatedAt?.toDate()
      } as User;
    } catch (error) {
      console.error('Erro ao buscar usuário por UID:', error);
      throw error;
    }
  }

  static async createAdminUser(uid: string, name: string, email: string): Promise<void> {
    try {
      console.log('Criando usuário admin:', { uid, name, email });
      
      // Verificar se já existe um usuário com este UID
      const existingUser = await this.getUserByUid(uid);
      
      if (existingUser) {
        console.log('Usuário admin já existe, não criando duplicata');
        return;
      }
      
      const userData = {
        uid,
        name,
        email,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Dados do usuário admin para Firestore:', userData);
      
      // Usar o UID como ID do documento para evitar duplicatas
      const docRef = doc(db, 'users', uid);
      await setDoc(docRef, userData);
      console.log('Usuário admin criado com ID:', uid);
    } catch (error) {
      console.error('Erro ao criar usuário admin:', error);
      throw error;
    }
  }

  // Buscar usuários do Firebase Authentication via API
  static async getFirebaseAuthUsers(): Promise<any[]> {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Erro ao buscar usuários do Firebase Auth');
      }
      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Erro ao buscar usuários do Firebase Auth via API:', error);
      // Fallback: retornar array vazio para forçar busca manual
      return [];
    }
  }

  // Buscar usuários do Firebase Authentication diretamente (fallback)
  static async getFirebaseAuthUsersDirect(): Promise<any[]> {
    try {
      // Esta função será implementada para buscar usuários diretamente
      // Por enquanto, retorna array vazio
      console.log('Tentando buscar usuários diretamente do Firebase Auth...');
      return [];
    } catch (error) {
      console.error('Erro ao buscar usuários diretamente:', error);
      return [];
    }
  }

  // Função para limpar usuários duplicados
  static async cleanDuplicateUsers(): Promise<void> {
    try {
      const users = await this.getAllUsers();
      const uniqueUsers = new Map();
      
      // Agrupar por UID e manter apenas o primeiro
      users.forEach(user => {
        if (!uniqueUsers.has(user.uid)) {
          uniqueUsers.set(user.uid, user);
        }
      });
      
      // Deletar usuários duplicados
      const usersToDelete = users.filter(user => {
        const firstUser = uniqueUsers.get(user.uid);
        return firstUser && user.uid === firstUser.uid && user !== firstUser;
      });
      
      for (const user of usersToDelete) {
        await deleteDoc(doc(db, 'users', user.uid));
        console.log('Usuário duplicado removido:', user.email);
      }
      
      console.log(`Limpeza concluída. ${usersToDelete.length} usuários duplicados removidos.`);
    } catch (error) {
      console.error('Erro ao limpar usuários duplicados:', error);
      throw error;
    }
  }

  // Função para adicionar usuários de teste
  static async addTestUsers(): Promise<void> {
    try {
      const testUsers = [
        {
          uid: 'test-user-1',
          name: 'João Silva',
          email: 'joao.silva@test.com',
          role: 'user' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          uid: 'test-user-2',
          name: 'Maria Santos',
          email: 'maria.santos@test.com',
          role: 'user' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          uid: 'test-user-3',
          name: 'Pedro Oliveira',
          email: 'pedro.oliveira@test.com',
          role: 'user' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      for (const userData of testUsers) {
        const docRef = doc(db, 'users', userData.uid);
        await setDoc(docRef, userData);
        console.log('Usuário de teste criado:', userData.email);
      }
    } catch (error) {
      console.error('Erro ao adicionar usuários de teste:', error);
      throw error;
    }
  }

  // Residentes
  static async getAllResidentes(): Promise<Residente[]> {
    try {
      const residentesSnapshot = await getDocs(collection(db, 'residentes'));
      return residentesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.nome || '',
          nivel: data.nivel || 'R1',
          email: data.email || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Residente;
      });
    } catch (error) {
      console.error('Erro ao buscar residentes:', error);
      throw error;
    }
  }

  static async addResidente(residente: Omit<Residente, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      console.log('=== DEBUG: Iniciando adição de residente ===');
      console.log('Dados do residente a serem salvos:', residente);
      console.log('Firebase app configurado:', !!db);
      console.log('Auth state:', auth.currentUser?.email);
      
      const residenteData = {
        nome: residente.nome,
        nivel: residente.nivel,
        email: residente.email,
        telefone: residente.telefone,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Dados formatados para Firestore:', residenteData);
      console.log('Tentando acessar coleção "residentes"...');
      
      const residentesCollection = collection(db, 'residentes');
      console.log('Coleção obtida:', !!residentesCollection);
      
      const docRef = await addDoc(residentesCollection, residenteData);
      console.log('✅ Residente adicionado com sucesso! ID:', docRef.id);
    } catch (error) {
      console.error('❌ Erro detalhado ao adicionar residente:', error);
      console.error('Tipo do erro:', typeof error);
      console.error('Código do erro:', (error as any)?.code);
      console.error('Mensagem do erro:', (error as any)?.message);
      throw error;
    }
  }

  static async deleteResidente(residenteId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'residentes', residenteId));
    } catch (error) {
      console.error('Erro ao deletar residente:', error);
      throw error;
    }
  }

  // Locais
  static async getAllLocais(): Promise<Local[]> {
    try {
      const locaisSnapshot = await getDocs(collection(db, 'locais'));
      return locaisSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.nome || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Local;
      });
    } catch (error) {
      console.error('Erro ao buscar locais:', error);
      throw error;
    }
  }

  static async addLocal(local: Omit<Local, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      await addDoc(collection(db, 'locais'), {
        ...local,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao adicionar local:', error);
      throw error;
    }
  }

  static async deleteLocal(localId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'locais', localId));
    } catch (error) {
      console.error('Erro ao deletar local:', error);
      throw error;
    }
  }

  // Serviços
  static async getAllServicos(): Promise<Servico[]> {
    try {
      const servicosSnapshot = await getDocs(collection(db, 'servicos'));
      const servicos = servicosSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nome: data.nome || '',
          localId: data.localId || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Servico;
      });

      // Buscar dados dos locais para cada serviço
      const locais = await this.getAllLocais();
      return servicos.map(servico => ({
        ...servico,
        local: locais.find(local => local.id === servico.localId)
      }));
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      throw error;
    }
  }

  static async addServico(servico: Omit<Servico, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      await addDoc(collection(db, 'servicos'), {
        ...servico,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao adicionar serviço:', error);
      throw error;
    }
  }

  static async deleteServico(servicoId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'servicos', servicoId));
    } catch (error) {
      console.error('Erro ao deletar serviço:', error);
      throw error;
    }
  }

  // Escalas
  static async getAllEscalas(): Promise<Escala[]> {
    try {
      const escalasSnapshot = await getDocs(collection(db, 'escalas'));
      return escalasSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          dataInicio: data.dataInicio?.toDate() || new Date(),
          dias: data.dias || {},
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      });
    } catch (error) {
      console.error('Erro ao buscar escalas:', error);
      throw error;
    }
  }

  static async addEscala(escala: Omit<Escala, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      console.log('Adicionando escala:', escala);
      
      const escalaData = {
        dataInicio: new Date(escala.dataInicio),
        dias: escala.dias,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Dados da escala para Firestore:', escalaData);
      
      const docRef = await addDoc(collection(db, 'escalas'), escalaData);
      console.log('Escala adicionada com ID:', docRef.id);
    } catch (error) {
      console.error('Erro ao adicionar escala:', error);
      throw error;
    }
  }

  static async deleteEscala(escalaId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'escalas', escalaId));
    } catch (error) {
      console.error('Erro ao deletar escala:', error);
      throw error;
    }
  }

  // Funções de atualização
  static async updateResidente(residenteId: string, residente: Residente): Promise<void> {
    try {
      await updateDoc(doc(db, 'residentes', residenteId), {
        nome: residente.nome,
        nivel: residente.nivel,
        email: residente.email,
        telefone: residente.telefone,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao atualizar residente:', error);
      throw error;
    }
  }

  static async updateLocal(localId: string, local: Local): Promise<void> {
    try {
      await updateDoc(doc(db, 'locais', localId), {
        nome: local.nome,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao atualizar local:', error);
      throw error;
    }
  }

  static async updateServico(servicoId: string, servico: Servico): Promise<void> {
    try {
      await updateDoc(doc(db, 'servicos', servicoId), {
        nome: servico.nome,
        localId: servico.localId,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
      throw error;
    }
  }

  static async updateEscala(escalaId: string, escala: Escala): Promise<void> {
    try {
      await updateDoc(doc(db, 'escalas', escalaId), {
        dataInicio: escala.dataInicio,
        dias: escala.dias,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao atualizar escala:', error);
      throw error;
    }
  }

  // Trocas
  static async solicitarTroca(troca: Omit<Troca, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('=== DEBUG: Iniciando solicitação de troca ===');
      console.log('Dados da troca:', troca);
      console.log('Firebase app configurado:', !!db);
      console.log('Auth state:', auth.currentUser?.email);
      
      // Validar dados obrigatórios
      if (!troca.solicitanteEmail || !troca.solicitadoEmail || !troca.escalaId || !troca.dia || !troca.turno || !troca.servicoId || !troca.localId) {
        throw new Error('Dados obrigatórios da troca não fornecidos');
      }
      
      const trocaData = {
        solicitanteEmail: troca.solicitanteEmail,
        solicitadoEmail: troca.solicitadoEmail,
        escalaId: troca.escalaId,
        dia: troca.dia,
        turno: troca.turno,
        servicoId: troca.servicoId,
        localId: troca.localId,
        status: 'pendente',
        motivo: troca.motivo || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Dados formatados para Firestore:', trocaData);
      console.log('Tentando acessar coleção "trocas"...');
      
      const trocasCollection = collection(db, 'trocas');
      console.log('Coleção obtida:', !!trocasCollection);
      
      const docRef = await addDoc(trocasCollection, trocaData);
      console.log('✅ Troca criada com sucesso! ID:', docRef.id);
      
      // Criar notificação para o residente solicitado
      try {
        await addDoc(collection(db, 'notificacoes_troca'), {
          usuarioEmail: troca.solicitadoEmail,
          tipo: 'solicitacao_recebida',
          trocaId: docRef.id,
          lida: false,
          createdAt: new Date()
        });
        console.log('✅ Notificação criada com sucesso!');
      } catch (notifError) {
        console.warn('⚠️ Erro ao criar notificação (não crítico):', notifError);
        // Não falhar a operação por causa da notificação
      }
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro detalhado ao solicitar troca:', error);
      console.error('Tipo do erro:', typeof error);
      console.error('Código do erro:', (error as any)?.code);
      console.error('Mensagem do erro:', (error as any)?.message);
      throw error;
    }
  }

  static async getAllTrocas(): Promise<Troca[]> {
    try {
      const trocasSnapshot = await getDocs(collection(db, 'trocas'));
      return trocasSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          solicitanteEmail: data.solicitanteEmail || '',
          solicitadoEmail: data.solicitadoEmail || '',
          escalaId: data.escalaId || '',
          dia: data.dia || '',
          turno: data.turno || 'manha',
          servicoId: data.servicoId || '',
          localId: data.localId || '',
          status: data.status || 'pendente',
          motivo: data.motivo || '',
          aprovadoPor: data.aprovadoPor || undefined,
          rejeitadoPor: data.rejeitadoPor || undefined,
          canceladoPor: data.canceladoPor || undefined,
          revertidoPor: data.revertidoPor || undefined,
          dataAprovacao: data.dataAprovacao?.toDate() || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Troca;
      });
    } catch (error) {
      console.error('Erro ao buscar trocas:', error);
      throw error;
    }
  }

  static async getTrocasPorUsuario(email: string): Promise<Troca[]> {
    try {
      const q = query(
        collection(db, 'trocas'),
        where('solicitanteEmail', '==', email)
      );
      const q2 = query(
        collection(db, 'trocas'),
        where('solicitadoEmail', '==', email)
      );
      
      const [solicitadasSnapshot, recebidasSnapshot] = await Promise.all([
        getDocs(q),
        getDocs(q2)
      ]);
      
      const solicitadas = solicitadasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Troca[];
      
      const recebidas = recebidasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Troca[];
      
      return [...solicitadas, ...recebidas].sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
    } catch (error) {
      console.error('Erro ao buscar trocas do usuário:', error);
      throw error;
    }
  }

  static async responderTroca(trocaId: string, aceita: boolean): Promise<void> {
    try {
      console.log('=== DEBUG: Iniciando resposta de troca ===');
      console.log('ID da troca:', trocaId);
      console.log('Aceita:', aceita);
      console.log('Firebase app configurado:', !!db);
      console.log('Auth state:', auth.currentUser?.email);
      
      const status = aceita ? 'aceita' : 'rejeitada';
      
      // Buscar dados da troca primeiro para obter informações necessárias
      const trocaDocRef = doc(db, 'trocas', trocaId);
      const trocaSnapshot = await getDoc(trocaDocRef);
      
      if (!trocaSnapshot.exists()) {
        throw new Error('Troca não encontrada');
      }
      
      const trocaData = trocaSnapshot.data();
      console.log('Dados da troca encontrados:', trocaData);
      
      // Atualizar status da troca
      const updateData: any = {
        status,
        updatedAt: new Date()
      };
      
      // Adicionar informação de quem respondeu
      if (auth.currentUser?.email) {
        if (aceita) {
          updateData.aprovadoPor = auth.currentUser.email;
        } else {
          updateData.rejeitadoPor = auth.currentUser.email;
        }
      }
      
      await updateDoc(trocaDocRef, updateData);
      console.log('✅ Status da troca atualizado para:', status);
      
      // Criar notificações
      try {
        // Criar notificação para o solicitante
        await addDoc(collection(db, 'notificacoes_troca'), {
          usuarioEmail: trocaData.solicitanteEmail,
          tipo: aceita ? 'solicitacao_aceita' : 'solicitacao_rejeitada',
          trocaId,
          lida: false,
          createdAt: new Date()
        });
        console.log('✅ Notificação para solicitante criada');
        
        // Se aceita, criar notificação para admin
        if (aceita) {
          const admins = await this.getAllUsers();
          const adminEmails = admins.filter(u => u.role === 'admin').map(u => u.email);
          
          for (const adminEmail of adminEmails) {
            await addDoc(collection(db, 'notificacoes_troca'), {
              usuarioEmail: adminEmail,
              tipo: 'troca_aprovada',
              trocaId,
              lida: false,
              createdAt: new Date()
            });
          }
          console.log('✅ Notificações para admins criadas');
        }
      } catch (notifError) {
        console.warn('⚠️ Erro ao criar notificações (não crítico):', notifError);
        // Não falhar a operação por causa das notificações
      }
    } catch (error) {
      console.error('❌ Erro detalhado ao responder troca:', error);
      console.error('Tipo do erro:', typeof error);
      console.error('Código do erro:', (error as any)?.code);
      console.error('Mensagem do erro:', (error as any)?.message);
      throw error;
    }
  }

  static async aprovarTroca(trocaId: string): Promise<void> {
    try {
      console.log('=== DEBUG: Iniciando aprovação de troca ===');
      console.log('ID da troca:', trocaId);
      console.log('Firebase app configurado:', !!db);
      console.log('Auth state:', auth.currentUser?.email);
      
      // Buscar dados da troca diretamente pelo ID
      const trocaDocRef = doc(db, 'trocas', trocaId);
      const trocaSnapshot = await getDoc(trocaDocRef);
      if (!trocaSnapshot.exists()) throw new Error('Troca não encontrada');
      
      const trocaData = trocaSnapshot.data();
      console.log('Dados da troca encontrados:', trocaData);
      
      // Atualizar status da troca
      const updateData: any = {
        status: 'aprovada',
        dataAprovacao: new Date(),
        updatedAt: new Date()
      };
      
      // Adicionar informação de quem aprovou
      if (auth.currentUser?.email) {
        updateData.aprovadoPor = auth.currentUser.email;
      }
      
      await updateDoc(trocaDocRef, updateData);
      console.log('✅ Status da troca atualizado para aprovada');
      
      // Enviar notificação interna para o solicitante
      try {
        const servicos = await this.getAllServicos();
        const locais = await this.getAllLocais();
        const servico = servicos.find(s => s.id === trocaData.servicoId);
        const local = locais.find(l => l.id === trocaData.localId);
        
        // Calcular data do serviço
        const escalasSnapshot = await getDocs(collection(db, 'escalas'));
        const escalaDoc = escalasSnapshot.docs.find(doc => doc.id === trocaData.escalaId);
        let dataServico = '';
        
        if (escalaDoc) {
          const escalaData = escalaDoc.data();
          const dataInicio = new Date(escalaData.dataInicio.seconds * 1000);
          const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
          const indiceDia = diasSemana.indexOf(trocaData.dia);
          if (indiceDia !== -1) {
            const dataServicoCalc = new Date(dataInicio);
            dataServicoCalc.setDate(dataInicio.getDate() + indiceDia);
            dataServico = dataServicoCalc.toLocaleDateString('pt-BR');
          }
        }
        
        const residentes = await this.getAllResidentes();
        const residenteSolicitante = residentes.find(r => r.email === trocaData.solicitanteEmail);
        
        if (residenteSolicitante && servico && local) {
          await InternalNotificationService.notificarTrocaAprovada(
            trocaData.solicitanteEmail,
            residenteSolicitante.nome,
            servico.nome,
            local.nome,
            dataServico,
            trocaData.turno === 'manha' ? 'Manhã' : 'Tarde',
            trocaId
          );
        }
      } catch (notificationError) {
        console.error('Erro ao enviar notificação de troca aprovada:', notificationError);
        // Não interromper o processo se a notificação falhar
      }
      
      // Executar a troca na escala
      const escalasSnapshot = await getDocs(collection(db, 'escalas'));
      const escala = escalasSnapshot.docs.find(doc => doc.id === trocaData.escalaId);
      
      if (escala) {
        const escalaData = escala.data();
        const dias = escalaData.dias;
        const dia = dias[trocaData.dia];
        
        if (Array.isArray(dia)) {
          const servicoIndex = dia.findIndex(s => 
            s.servicoId === trocaData.servicoId && 
            s.localId === trocaData.localId && 
            s.turno === trocaData.turno
          );
          
          if (servicoIndex !== -1) {
            const servico = dia[servicoIndex];
            const residentesAtualizados = servico.residentes.map((email: string) => 
              email === trocaData.solicitanteEmail ? trocaData.solicitadoEmail : email
            );
            
            dia[servicoIndex] = { ...servico, residentes: residentesAtualizados };
            
            await updateDoc(doc(db, 'escalas', trocaData.escalaId), {
              dias,
              updatedAt: new Date()
            });
          }
        }
      }
      
      // Criar notificações para os residentes
      try {
        await addDoc(collection(db, 'notificacoes_troca'), {
          usuarioEmail: trocaData.solicitanteEmail,
          tipo: 'troca_aprovada',
          trocaId,
          lida: false,
          createdAt: new Date()
        });
        
        await addDoc(collection(db, 'notificacoes_troca'), {
          usuarioEmail: trocaData.solicitadoEmail,
          tipo: 'troca_aprovada',
          trocaId,
          lida: false,
          createdAt: new Date()
        });
        console.log('✅ Notificações criadas com sucesso');
      } catch (notifError) {
        console.warn('⚠️ Erro ao criar notificações (não crítico):', notifError);
        // Não falhar a operação por causa das notificações
      }
    } catch (error) {
      console.error('Erro ao aprovar troca:', error);
      throw error;
    }
  }

  static async getNotificacoesTroca(email: string): Promise<NotificacaoTroca[]> {
    try {
      const q = query(
        collection(db, 'notificacoes_troca'),
        where('usuarioEmail', '==', email)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          usuarioEmail: data.usuarioEmail || '',
          tipo: data.tipo || 'solicitacao_recebida',
          trocaId: data.trocaId || '',
          lida: data.lida || false,
          createdAt: data.createdAt?.toDate() || new Date()
        } as NotificacaoTroca;
      }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      throw error;
    }
  }

  static async marcarNotificacaoComoLida(notificacaoId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notificacoes_troca', notificacaoId), {
        lida: true
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  }

  static async cancelarTroca(trocaId: string): Promise<void> {
    try {
      console.log('=== DEBUG: Iniciando cancelamento de troca ===');
      console.log('ID da troca:', trocaId);
      console.log('Firebase app configurado:', !!db);
      console.log('Auth state:', auth.currentUser?.email);
      
      // Buscar dados da troca diretamente pelo ID
      const trocaDocRef = doc(db, 'trocas', trocaId);
      const trocaSnapshot = await getDoc(trocaDocRef);
      
      if (!trocaSnapshot.exists()) {
        throw new Error('Troca não encontrada');
      }
      
      const trocaData = trocaSnapshot.data();
      console.log('Dados da troca encontrados:', trocaData);
      
      // Atualizar status da troca para cancelada
      const updateData: any = {
        status: 'cancelada',
        updatedAt: new Date()
      };
      
      // Adicionar informação de quem cancelou
      if (auth.currentUser?.email) {
        updateData.canceladoPor = auth.currentUser.email;
      }
      
      await updateDoc(trocaDocRef, updateData);
      console.log('✅ Status da troca atualizado para cancelada');
      
      // Criar notificação para o residente solicitado
      try {
        await addDoc(collection(db, 'notificacoes_troca'), {
          usuarioEmail: trocaData.solicitadoEmail,
          tipo: 'troca_cancelada',
          trocaId,
          lida: false,
          createdAt: new Date()
        });
        console.log('✅ Notificação de cancelamento criada');
      } catch (notifError) {
        console.warn('⚠️ Erro ao criar notificação (não crítico):', notifError);
        // Não falhar a operação por causa da notificação
      }
    } catch (error) {
      console.error('❌ Erro detalhado ao cancelar troca:', error);
      console.error('Tipo do erro:', typeof error);
      console.error('Código do erro:', (error as any)?.code);
      console.error('Mensagem do erro:', (error as any)?.message);
      throw error;
    }
  }

  static async rejeitarTroca(trocaId: string): Promise<void> {
    try {
      console.log('=== DEBUG: Iniciando rejeição de troca ===');
      console.log('ID da troca:', trocaId);
      console.log('Firebase app configurado:', !!db);
      console.log('Auth state:', auth.currentUser?.email);
      
      // Buscar dados da troca diretamente pelo ID
      const trocaDocRef = doc(db, 'trocas', trocaId);
      const trocaSnapshot = await getDoc(trocaDocRef);
      
      if (!trocaSnapshot.exists()) {
        throw new Error('Troca não encontrada');
      }
      
      const trocaData = trocaSnapshot.data();
      console.log('Dados da troca encontrados:', trocaData);
      
      // Atualizar status da troca para rejeitada
      const updateData: any = {
        status: 'rejeitada',
        updatedAt: new Date()
      };
      
      // Adicionar informação de quem rejeitou
      if (auth.currentUser?.email) {
        updateData.rejeitadoPor = auth.currentUser.email;
      }
      
      await updateDoc(trocaDocRef, updateData);
      console.log('✅ Status da troca atualizado para rejeitada');
      
      // Enviar notificação interna para o solicitante
      try {
        const servicos = await this.getAllServicos();
        const locais = await this.getAllLocais();
        const servico = servicos.find(s => s.id === trocaData.servicoId);
        const local = locais.find(l => l.id === trocaData.localId);
        
        // Calcular data do serviço
        const escalasSnapshot = await getDocs(collection(db, 'escalas'));
        const escalaDoc = escalasSnapshot.docs.find(doc => doc.id === trocaData.escalaId);
        let dataServico = '';
        
        if (escalaDoc) {
          const escalaData = escalaDoc.data();
          const dataInicio = new Date(escalaData.dataInicio.seconds * 1000);
          const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
          const indiceDia = diasSemana.indexOf(trocaData.dia);
          if (indiceDia !== -1) {
            const dataServicoCalc = new Date(dataInicio);
            dataServicoCalc.setDate(dataInicio.getDate() + indiceDia);
            dataServico = dataServicoCalc.toLocaleDateString('pt-BR');
          }
        }
        
        const residentes = await this.getAllResidentes();
        const residenteSolicitante = residentes.find(r => r.email === trocaData.solicitanteEmail);
        
        if (residenteSolicitante && servico && local) {
          await InternalNotificationService.notificarTrocaRejeitada(
            trocaData.solicitanteEmail,
            residenteSolicitante.nome,
            servico.nome,
            local.nome,
            dataServico,
            trocaData.turno === 'manha' ? 'Manhã' : 'Tarde',
            trocaId
          );
        }
      } catch (notificationError) {
        console.error('Erro ao enviar notificação de troca rejeitada:', notificationError);
        // Não interromper o processo se a notificação falhar
      }
      
      // Criar notificação para o solicitante
      try {
        await addDoc(collection(db, 'notificacoes_troca'), {
          usuarioEmail: trocaData.solicitanteEmail,
          tipo: 'solicitacao_rejeitada',
          trocaId,
          lida: false,
          createdAt: new Date()
        });
        console.log('✅ Notificação de rejeição criada');
      } catch (notifError) {
        console.warn('⚠️ Erro ao criar notificação (não crítico):', notifError);
        // Não falhar a operação por causa da notificação
      }
    } catch (error) {
      console.error('❌ Erro detalhado ao rejeitar troca:', error);
      console.error('Tipo do erro:', typeof error);
      console.error('Código do erro:', (error as any)?.code);
      console.error('Mensagem do erro:', (error as any)?.message);
      throw error;
    }
  }

  // Validações para trocas
  static validarTroca(escalaId: string, dia: string, turno: string): { valida: boolean; erro?: string } {
    try {
      // Buscar a escala para obter a data de início
      // Como não temos acesso direto aqui, vamos assumir que a validação será feita no frontend
      // onde temos acesso aos dados da escala
      return { valida: true };
    } catch (error) {
      return { valida: false, erro: 'Erro ao validar troca' };
    }
  }

  static validarDataTroca(dataInicio: Date, dia: string): { valida: boolean; erro?: string } {
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    
    // Calcular a data do serviço baseado no dia da semana
    // dataInicio já é a segunda-feira da semana, então precisamos ajustar o índice
    const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    const indiceDia = diasSemana.indexOf(dia);
    
    if (indiceDia === -1) {
      return { valida: false, erro: 'Dia da semana inválido' };
    }
    
    // Calcular a data do serviço (dataInicio + dias até o dia da semana)
    const dataServico = new Date(dataInicio);
    dataServico.setDate(dataInicio.getDate() + indiceDia);
    dataServico.setHours(0, 0, 0, 0);
    
    // Verificar se a data do serviço é no passado, ontem ou hoje
    if (dataServico <= hoje) {
      return { 
        valida: false, 
        erro: 'Não é possível trocar escalas passadas, de ontem ou de hoje' 
      };
    }
    
    // Verificar se há pelo menos 24 horas de antecedência
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    
    if (dataServico <= amanha) {
      return { 
        valida: false, 
        erro: 'É necessário pelo menos 24 horas de antecedência para solicitar troca' 
      };
    }
    
    return { valida: true };
  }

  static async validarTrocaComResidente(escalaId: string, dia: string, turno: string, servicoId: string, localId: string, residenteEmail: string): Promise<{ valida: boolean; erro?: string }> {
    try {
      // Buscar a escala
      const escalasSnapshot = await getDocs(collection(db, 'escalas'));
      const escala = escalasSnapshot.docs.find(doc => doc.id === escalaId);
      
      if (!escala) {
        return { valida: false, erro: 'Escala não encontrada' };
      }
      
      const escalaData = escala.data();
      const dias = escalaData.dias;
      const diaData = dias[dia];
      
      if (!Array.isArray(diaData)) {
        return { valida: false, erro: 'Dados do dia inválidos' };
      }
      
      // Verificar se o residente já está no serviço
      const servico = diaData.find(s => 
        s.servicoId === servicoId && 
        s.localId === localId && 
        s.turno === turno
      );
      
      if (servico && servico.residentes.includes(residenteEmail)) {
        return { 
          valida: false, 
          erro: 'Este residente já está escalado para este serviço no mesmo turno' 
        };
      }
      
      return { valida: true };
    } catch (error) {
      console.error('Erro ao validar troca com residente:', error);
      return { valida: false, erro: 'Erro ao validar troca' };
    }
  }

  static async reverterTroca(trocaId: string): Promise<void> {
    try {
      console.log('=== DEBUG: Iniciando reversão de troca ===');
      console.log('ID da troca:', trocaId);
      console.log('Firebase app configurado:', !!db);
      console.log('Auth state:', auth.currentUser?.email);
      
      // Buscar dados da troca
      const trocaDocRef = doc(db, 'trocas', trocaId);
      const trocaSnapshot = await getDoc(trocaDocRef);
      
      if (!trocaSnapshot.exists()) {
        throw new Error('Troca não encontrada');
      }
      
      const trocaData = trocaSnapshot.data();
      console.log('Dados da troca encontrados:', trocaData);
      
      // Verificar se a troca está aprovada
      if (trocaData.status !== 'aprovada') {
        throw new Error('Apenas trocas aprovadas podem ser revertidas');
      }
      
      // Verificar se há data de aprovação
      if (!trocaData.dataAprovacao) {
        throw new Error('Data de aprovação não encontrada');
      }
      
      // Verificar se ainda está dentro do prazo de 24 horas
      const dataAprovacao = trocaData.dataAprovacao.toDate();
      const agora = new Date();
      const diferencaHoras = (agora.getTime() - dataAprovacao.getTime()) / (1000 * 60 * 60);
      
      if (diferencaHoras > 24) {
        throw new Error('Não é possível reverter troca após 24 horas da aprovação');
      }
      
      // Atualizar status da troca para revertida
      const updateData: any = {
        status: 'revertida',
        updatedAt: new Date()
      };
      
      // Adicionar informação de quem reverteu
      if (auth.currentUser?.email) {
        updateData.revertidoPor = auth.currentUser.email;
      }
      
      await updateDoc(trocaDocRef, updateData);
      console.log('✅ Status da troca atualizado para revertida');
      
      // Reverter a troca na escala (voltar ao estado original)
      const escalasSnapshot = await getDocs(collection(db, 'escalas'));
      const escala = escalasSnapshot.docs.find(doc => doc.id === trocaData.escalaId);
      
      if (escala) {
        const escalaData = escala.data();
        const dias = escalaData.dias;
        const dia = dias[trocaData.dia];
        
        if (Array.isArray(dia)) {
          const servicoIndex = dia.findIndex(s => 
            s.servicoId === trocaData.servicoId && 
            s.localId === trocaData.localId && 
            s.turno === trocaData.turno
          );
          
          if (servicoIndex !== -1) {
            const servico = dia[servicoIndex];
            // Reverter: trocar de volta o solicitado pelo solicitante
            const residentesRevertidos = servico.residentes.map((email: string) => 
              email === trocaData.solicitadoEmail ? trocaData.solicitanteEmail : email
            );
            
            dia[servicoIndex] = { ...servico, residentes: residentesRevertidos };
            
            await updateDoc(doc(db, 'escalas', trocaData.escalaId), {
              dias,
              updatedAt: new Date()
            });
            console.log('✅ Troca revertida na escala');
          }
        }
      }
      
      // Criar notificações para os residentes
      try {
        await addDoc(collection(db, 'notificacoes_troca'), {
          usuarioEmail: trocaData.solicitanteEmail,
          tipo: 'troca_revertida',
          trocaId,
          lida: false,
          createdAt: new Date()
        });
        
        await addDoc(collection(db, 'notificacoes_troca'), {
          usuarioEmail: trocaData.solicitadoEmail,
          tipo: 'troca_revertida',
          trocaId,
          lida: false,
          createdAt: new Date()
        });
        console.log('✅ Notificações de reversão criadas');
      } catch (notifError) {
        console.warn('⚠️ Erro ao criar notificações (não crítico):', notifError);
      }
    } catch (error) {
      console.error('❌ Erro detalhado ao reverter troca:', error);
      throw error;
    }
  }

  // Notificações Internas
  static async criarNotificacao(notificacao: {
    residenteEmail: string;
    residenteNome: string;
    titulo: string;
    mensagem: string;
    tipo: string;
    criadoPor: string;
  }): Promise<string> {
    try {
      console.log('=== DEBUG: Iniciando criação de notificação ===');
      console.log('Dados da notificação:', notificacao);
      console.log('Firebase app configurado:', !!db);
      console.log('Auth state:', auth.currentUser?.email);
      
      const notificacaoData = {
        residenteEmail: notificacao.residenteEmail,
        residenteNome: notificacao.residenteNome,
        titulo: notificacao.titulo,
        mensagem: notificacao.mensagem,
        tipo: notificacao.tipo,
        lida: false,
        criadoPor: notificacao.criadoPor,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Dados formatados para Firestore:', notificacaoData);
      console.log('Tentando acessar coleção "notificacoes"...');
      
      const notificacoesCollection = collection(db, 'notificacoes');
      console.log('Coleção obtida:', !!notificacoesCollection);
      
      const docRef = await addDoc(notificacoesCollection, notificacaoData);
      console.log('✅ Notificação criada com sucesso! ID:', docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao criar notificação:', error);
      console.error('Tipo do erro:', typeof error);
      console.error('Mensagem do erro:', (error as any)?.message);
      throw error;
    }
  }

  static async buscarNotificacoesResidente(residenteEmail: string): Promise<any[]> {
    try {
      const notificacoesSnapshot = await getDocs(
        query(
          collection(db, 'notificacoes'),
          where('residenteEmail', '==', residenteEmail),
          orderBy('createdAt', 'desc')
        )
      );
      
      return notificacoesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      throw error;
    }
  }

  static async contarNotificacoesNaoLidas(residenteEmail: string): Promise<number> {
    try {
      const notificacoesSnapshot = await getDocs(
        query(
          collection(db, 'notificacoes'),
          where('residenteEmail', '==', residenteEmail),
          where('lida', '==', false)
        )
      );
      
      return notificacoesSnapshot.size;
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
      return 0;
    }
  }

  static async marcarNotificacaoComoLida(notificacaoId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notificacoes', notificacaoId), {
        lida: true,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }
  }

  static async excluirNotificacao(notificacaoId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'notificacoes', notificacaoId));
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      throw error;
    }
  }

  // Férias
  static async verificarConflitoFerias(
    residenteEmail: string, 
    dataInicio: Date, 
    dataFim: Date
  ): Promise<{ temConflito: boolean; motivo?: string }> {
    try {
      // Buscar todas as férias aprovadas
      const feriasSnapshot = await getDocs(
        query(collection(db, 'ferias'), where('status', '==', 'aprovada'))
      );
      
      // Buscar o nível do residente
      const residentesSnapshot = await getDocs(collection(db, 'residentes'));
      const residente = residentesSnapshot.docs.find(doc => doc.data().email === residenteEmail);
      const nivelResidente = residente?.data()?.nivel;
      
      if (!nivelResidente) {
        return { temConflito: false };
      }
      
      // Verificar conflitos com outros residentes do mesmo nível
      for (const doc of feriasSnapshot.docs) {
        const ferias = doc.data();
        
        // Pular se for do mesmo residente
        if (ferias.residenteEmail === residenteEmail) {
          continue;
        }
        
        // Buscar nível do residente da férias
        const outroResidente = residentesSnapshot.docs.find(d => d.data().email === ferias.residenteEmail);
        const outroNivel = outroResidente?.data()?.nivel;
        
        // Verificar se é do mesmo nível
        if (outroNivel === nivelResidente) {
          const inicioFerias = ferias.dataInicio.toDate();
          const fimFerias = ferias.dataFim.toDate();
          
          // Verificar sobreposição de datas
          const temSobreposicao = (
            (dataInicio >= inicioFerias && dataInicio <= fimFerias) ||
            (dataFim >= inicioFerias && dataFim <= fimFerias) ||
            (dataInicio <= inicioFerias && dataFim >= fimFerias)
          );
          
          if (temSobreposicao) {
            return {
              temConflito: true,
              motivo: `Já existe um ${nivelResidente} em férias no período de ${inicioFerias.toLocaleDateString('pt-BR')} a ${fimFerias.toLocaleDateString('pt-BR')}`
            };
          }
        }
      }
      
      return { temConflito: false };
    } catch (error) {
      console.error('Erro ao verificar conflito de férias:', error);
      return { temConflito: false };
    }
  }

  // Sistema de Férias - Simples e Funcional
  static async solicitarFerias(dataInicio: string, dataFim: string, motivo: string, residenteEmail: string): Promise<void> {
    try {
      console.log('=== DEBUG: Iniciando solicitação de férias ===');
      console.log('Dados recebidos:', { dataInicio, dataFim, motivo, residenteEmail });
      console.log('Firebase app configurado:', !!db);
      console.log('Auth state:', auth.currentUser?.email);
      
      // Validações básicas
      if (!dataInicio || !dataFim || !residenteEmail) {
        throw new Error('Dados obrigatórios não fornecidos');
      }
      
      // Validar se a data de fim é posterior à data de início
      // Corrigir problema de fuso horário: usar horário local
      const inicio = new Date(dataInicio + 'T00:00:00');
      const fim = new Date(dataFim + 'T23:59:59');
      
      console.log('Datas convertidas:', {
        dataInicioOriginal: dataInicio,
        dataFimOriginal: dataFim,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        inicioLocal: inicio.toLocaleDateString('pt-BR'),
        fimLocal: fim.toLocaleDateString('pt-BR')
      });
      
      if (fim <= inicio) {
        throw new Error('A data de fim deve ser posterior à data de início');
      }
      
      // Validar se as datas não são no passado
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      if (inicio < hoje) {
        throw new Error('Não é possível solicitar férias para datas passadas');
      }
      
      const feriasData = {
        residenteEmail: residenteEmail,
        dataInicio: inicio,
        dataFim: fim,
        motivo: motivo.trim() || null,
        status: 'pendente',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Dados formatados para Firestore:', feriasData);
      console.log('Tentando acessar coleção "ferias"...');
      
      const feriasCollection = collection(db, 'ferias');
      console.log('Coleção obtida:', !!feriasCollection);
      
      const docRef = await addDoc(feriasCollection, feriasData);
      console.log('✅ Solicitação de férias enviada com sucesso! ID:', docRef.id);
      
      // Criar notificação para o admin
      try {
        const admins = await this.getAllUsers();
        const adminEmails = admins.filter(u => u.role === 'admin').map(u => u.email);
        
        for (const adminEmail of adminEmails) {
          await addDoc(collection(db, 'notificacoes_ferias'), {
            usuarioEmail: adminEmail,
            tipo: 'solicitacao_ferias',
            feriasId: docRef.id,
            lida: false,
            createdAt: new Date()
          });
        }
        console.log('✅ Notificações para admins criadas');
      } catch (notifError) {
        console.warn('⚠️ Erro ao criar notificação (não crítico):', notifError);
      }
    } catch (error) {
      console.error('❌ Erro detalhado ao solicitar férias:', error);
      console.error('Tipo do erro:', typeof error);
      console.error('Código do erro:', (error as any)?.code);
      console.error('Mensagem do erro:', (error as any)?.message);
      
      if ((error as Error).message.includes('Dados obrigatórios') || 
          (error as Error).message.includes('data de fim') ||
          (error as Error).message.includes('datas passadas')) {
        throw error;
      }
      
      throw new Error('Erro ao enviar solicitação de férias. Tente novamente.');
    }
  }

  static async getFeriasDoUsuario(userEmail: string): Promise<Ferias[]> {
    try {
      console.log('=== DEBUG: Buscando férias do usuário ===');
      console.log('Email do usuário:', userEmail);
      console.log('Firebase app configurado:', !!db);
      
      // Primeiro, vamos buscar TODAS as férias para debug
      console.log('🔍 Buscando TODAS as férias primeiro...');
      const todasFeriasSnapshot = await getDocs(collection(db, 'ferias'));
      console.log('📊 Total de férias no sistema:', todasFeriasSnapshot.docs.length);
      
      // Mostrar todas as férias para debug
      todasFeriasSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log('📋 Férias no sistema:', {
          id: doc.id,
          residenteEmail: data.residenteEmail,
          status: data.status,
          match: data.residenteEmail === userEmail ? '✅ MATCH' : '❌ NO MATCH'
        });
      });
      
      // Agora buscar apenas as do usuário
      const feriasQuery = query(
        collection(db, 'ferias'),
        where('residenteEmail', '==', userEmail)
      );
      
      console.log('Query criada, executando...');
      const feriasSnapshot = await getDocs(feriasQuery);
      console.log('Documentos encontrados para o usuário:', feriasSnapshot.docs.length);
      
      const feriasData = feriasSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Documento encontrado:', doc.id, {
          ...data,
          dataInicio: data.dataInicio?.toDate?.() || data.dataInicio,
          dataFim: data.dataFim?.toDate?.() || data.dataFim,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          status: data.status
        });
        
        return {
          id: doc.id,
          residenteEmail: data.residenteEmail,
          dataInicio: data.dataInicio?.toDate() || new Date(),
          dataFim: data.dataFim?.toDate() || new Date(),
          motivo: data.motivo || '',
          status: data.status || 'pendente',
          aprovadoPor: data.aprovadoPor,
          rejeitadoPor: data.rejeitadoPor,
          observacoes: data.observacoes,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Ferias;
      });
      
      // Ordenar manualmente por data de criação (mais recentes primeiro)
      feriasData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      console.log('✅ Férias carregadas com sucesso:', feriasData.length);
      console.log('Status das férias:', feriasData.map(f => ({ id: f.id, status: f.status })));
      return feriasData;
    } catch (error) {
      console.error('❌ Erro ao buscar férias do usuário:', error);
      console.error('Código do erro:', (error as any)?.code);
      console.error('Mensagem do erro:', (error as any)?.message);
      return [];
    }
  }

  static async getAllFerias(): Promise<Ferias[]> {
    try {
      console.log('=== DEBUG: Buscando todas as férias ===');
      console.log('Firebase app configurado:', !!db);
      
      const feriasSnapshot = await getDocs(collection(db, 'ferias'));
      console.log('Total de documentos encontrados:', feriasSnapshot.docs.length);
      
      const feriasData = feriasSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          residenteEmail: data.residenteEmail || '',
          dataInicio: data.dataInicio?.toDate() || new Date(),
          dataFim: data.dataFim?.toDate() || new Date(),
          motivo: data.motivo || undefined,
          status: data.status || 'pendente',
          aprovadoPor: data.aprovadoPor || undefined,
          rejeitadoPor: data.rejeitadoPor || undefined,
          observacoes: data.observacoes || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Ferias;
      });
      
      // Ordenar manualmente por data de criação (mais recentes primeiro)
      feriasData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      console.log('✅ Todas as férias carregadas com sucesso:', feriasData.length);
      return feriasData;
    } catch (error) {
      console.error('❌ Erro ao buscar férias:', error);
      console.error('Código do erro:', (error as any)?.code);
      console.error('Mensagem do erro:', (error as any)?.message);
      throw error;
    }
  }

  static async aprovarFerias(feriasId: string, observacoes?: string): Promise<void> {
    try {
      console.log('=== DEBUG: Iniciando aprovação de férias ===');
      console.log('ID da férias:', feriasId);
      console.log('Firebase app configurado:', !!db);
      console.log('Auth state:', auth.currentUser?.email);

      const feriasDocRef = doc(db, 'ferias', feriasId);
      const updateData: any = {
        status: 'aprovada',
        updatedAt: new Date()
      };

      if (auth.currentUser?.email) {
        updateData.aprovadoPor = auth.currentUser.email;
      }

      if (observacoes) {
        updateData.observacoes = observacoes;
      }

      await updateDoc(feriasDocRef, updateData);
      console.log('✅ Férias aprovada com sucesso');
      
      // Verificar se a atualização foi feita corretamente
      const feriasAtualizadaSnapshot = await getDoc(feriasDocRef);
      if (feriasAtualizadaSnapshot.exists()) {
        const dadosAtualizados = feriasAtualizadaSnapshot.data();
        console.log('🔍 Verificação pós-aprovação:', {
          id: feriasId,
          status: dadosAtualizados.status,
          aprovadoPor: dadosAtualizados.aprovadoPor,
          residenteEmail: dadosAtualizados.residenteEmail
        });
      }

      // Criar notificação para o residente
      try {
        const feriasSnapshot = await getDoc(feriasDocRef);
        if (feriasSnapshot.exists()) {
          const feriasData = feriasSnapshot.data();
          await addDoc(collection(db, 'notificacoes_ferias'), {
            usuarioEmail: feriasData.residenteEmail,
            tipo: 'ferias_aprovada',
            feriasId,
            lida: false,
            createdAt: new Date()
          });
          console.log('✅ Notificação para residente criada');
        }
      } catch (notifError) {
        console.warn('⚠️ Erro ao criar notificação (não crítico):', notifError);
      }

    } catch (error) {
      console.error('❌ Erro detalhado ao aprovar férias:', error);
      throw error;
    }
  }

  static async rejeitarFerias(feriasId: string, observacoes?: string): Promise<void> {
    try {
      console.log('=== DEBUG: Iniciando rejeição de férias ===');
      console.log('ID da férias:', feriasId);
      console.log('Firebase app configurado:', !!db);
      console.log('Auth state:', auth.currentUser?.email);

      const feriasDocRef = doc(db, 'ferias', feriasId);
      const updateData: any = {
        status: 'rejeitada',
        updatedAt: new Date()
      };

      if (auth.currentUser?.email) {
        updateData.rejeitadoPor = auth.currentUser.email;
      }

      if (observacoes) {
        updateData.observacoes = observacoes;
      }

      await updateDoc(feriasDocRef, updateData);
      console.log('✅ Férias rejeitada com sucesso');

      // Criar notificação para o residente
      try {
        const feriasSnapshot = await getDoc(feriasDocRef);
        if (feriasSnapshot.exists()) {
          const feriasData = feriasSnapshot.data();
          await addDoc(collection(db, 'notificacoes_ferias'), {
            usuarioEmail: feriasData.residenteEmail,
            tipo: 'ferias_rejeitada',
            feriasId,
            lida: false,
            createdAt: new Date()
          });
          console.log('✅ Notificação para residente criada');
        }
      } catch (notifError) {
        console.warn('⚠️ Erro ao criar notificação (não crítico):', notifError);
      }

    } catch (error) {
      console.error('❌ Erro detalhado ao rejeitar férias:', error);
      throw error;
    }
  }

  static async editarFerias(feriasId: string, dataInicio: string, dataFim: string, motivo: string): Promise<void> {
    try {
      console.log('=== DEBUG: Iniciando edição de férias ===');
      console.log('Dados recebidos:', { feriasId, dataInicio, dataFim, motivo });
      console.log('Firebase app configurado:', !!db);
      console.log('Auth state:', auth.currentUser?.email);
      
      // Validações básicas
      if (!feriasId || !dataInicio || !dataFim) {
        throw new Error('Dados obrigatórios não fornecidos');
      }
      
      // Validar se a data de fim é posterior à data de início
      // Corrigir problema de fuso horário: usar horário local
      const inicio = new Date(dataInicio + 'T00:00:00');
      const fim = new Date(dataFim + 'T23:59:59');
      
      console.log('Datas convertidas:', {
        dataInicioOriginal: dataInicio,
        dataFimOriginal: dataFim,
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        inicioLocal: inicio.toLocaleDateString('pt-BR'),
        fimLocal: fim.toLocaleDateString('pt-BR')
      });
      
      if (fim <= inicio) {
        throw new Error('A data de fim deve ser posterior à data de início');
      }
      
      // Validar se as datas não são no passado
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      if (inicio < hoje) {
        throw new Error('Não é possível editar férias para datas passadas');
      }
      
      const feriasDocRef = doc(db, 'ferias', feriasId);
      
      // Verificar se a férias existe
      const feriasSnapshot = await getDoc(feriasDocRef);
      if (!feriasSnapshot.exists()) {
        throw new Error('Férias não encontrada');
      }
      
      const updateData = {
        dataInicio: inicio,
        dataFim: fim,
        motivo: motivo.trim() || null,
        status: 'pendente', // Volta para pendente quando editada
        updatedAt: new Date(),
        observacoes: null, // Limpa observações anteriores
        aprovadoPor: null,
        rejeitadoPor: null
      };
      
      console.log('Dados para atualização:', updateData);
      
      await updateDoc(feriasDocRef, updateData);
      console.log('✅ Férias editada com sucesso!');
      
      // Criar notificação para o admin sobre a edição
      try {
        const feriasData = feriasSnapshot.data();
        await addDoc(collection(db, 'notificacoes_ferias'), {
          usuarioEmail: 'ricpmota.med@gmail.com', // Email do admin
          tipo: 'ferias_editada',
          feriasId,
          lida: false,
          createdAt: new Date()
        });
        console.log('✅ Notificação para admin criada');
      } catch (notifError) {
        console.warn('⚠️ Erro ao criar notificação (não crítico):', notifError);
      }
      
    } catch (error) {
      console.error('❌ Erro detalhado ao editar férias:', error);
      throw error;
    }
  }

  static async getNotificacoesFerias(): Promise<NotificacaoFerias[]> {
    try {
      if (!auth.currentUser) return [];

      const notificacoesSnapshot = await getDocs(
        query(
          collection(db, 'notificacoes_ferias'),
          where('usuarioEmail', '==', auth.currentUser.email)
        )
      );

      return notificacoesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate()
        } as NotificacaoFerias;
      }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Erro ao buscar notificações de férias:', error);
      throw error;
    }
  }

  static async marcarNotificacaoFeriasComoLida(notificacaoId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notificacoes_ferias', notificacaoId), {
        lida: true
      });
    } catch (error) {
      console.error('Erro ao marcar notificação de férias como lida:', error);
      throw error;
    }
  }

  // Função alternativa para buscar férias (sem query)
  static async getFeriasDoUsuarioAlternativo(userEmail: string): Promise<Ferias[]> {
    try {
      console.log('🔄 === MÉTODO ALTERNATIVO: Buscando férias sem query ===');
      console.log('Email do usuário:', userEmail);
      
      // Buscar TODAS as férias
      const todasFeriasSnapshot = await getDocs(collection(db, 'ferias'));
      console.log('📊 Total de férias no sistema:', todasFeriasSnapshot.docs.length);
      
      // Filtrar manualmente
      const feriasDoUsuario = todasFeriasSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          const match = data.residenteEmail === userEmail;
          console.log('🔍 Verificando:', {
            id: doc.id,
            residenteEmail: data.residenteEmail,
            userEmail,
            match: match ? '✅' : '❌'
          });
          return match;
        })
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            residenteEmail: data.residenteEmail,
            dataInicio: data.dataInicio?.toDate() || new Date(),
            dataFim: data.dataFim?.toDate() || new Date(),
            motivo: data.motivo || '',
            status: data.status || 'pendente',
            aprovadoPor: data.aprovadoPor,
            rejeitadoPor: data.rejeitadoPor,
            observacoes: data.observacoes,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as Ferias;
        });
      
      // Ordenar manualmente
      feriasDoUsuario.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      console.log('✅ Férias encontradas (método alternativo):', feriasDoUsuario.length);
      console.log('📋 Status das férias:', feriasDoUsuario.map(f => ({ id: f.id, status: f.status })));
      
      return feriasDoUsuario;
    } catch (error) {
      console.error('❌ Erro no método alternativo:', error);
      return [];
    }
  }

  // Função de teste para debug
  static async testarFeriasAprovadas(userEmail: string): Promise<void> {
    try {
      console.log('🧪 === TESTE: Verificando férias aprovadas ===');
      console.log('Email do usuário:', userEmail);
      
      // Buscar todas as férias
      const todasFeriasSnapshot = await getDocs(collection(db, 'ferias'));
      console.log('📊 Total de férias no sistema:', todasFeriasSnapshot.docs.length);
      
      // Filtrar por usuário e status
      const feriasDoUsuario = todasFeriasSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.residenteEmail === userEmail;
      });
      
      console.log('👤 Férias do usuário:', feriasDoUsuario.length);
      
      feriasDoUsuario.forEach(doc => {
        const data = doc.data();
        console.log('📋 Férias do usuário:', {
          id: doc.id,
          status: data.status,
          dataInicio: data.dataInicio?.toDate?.() || data.dataInicio,
          dataFim: data.dataFim?.toDate?.() || data.dataFim,
          aprovadoPor: data.aprovadoPor,
          observacoes: data.observacoes
        });
      });
      
      // Verificar se há férias aprovadas
      const aprovadas = feriasDoUsuario.filter(doc => {
        const data = doc.data();
        return data.status === 'aprovada';
      });
      
      console.log('✅ Férias aprovadas encontradas:', aprovadas.length);
      
      if (aprovadas.length === 0) {
        console.log('❌ NENHUMA férias aprovada encontrada para este usuário!');
        console.log('🔍 Verificar se a aprovação foi feita corretamente no admin');
      } else {
        console.log('✅ Férias aprovadas encontradas:', aprovadas.map(doc => ({
          id: doc.id,
          status: doc.data().status,
          dataInicio: doc.data().dataInicio?.toDate?.() || doc.data().dataInicio
        })));
      }
      
    } catch (error) {
      console.error('❌ Erro no teste de férias aprovadas:', error);
    }
  }
}
