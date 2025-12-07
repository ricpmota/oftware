'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Buscar dados do usuário no Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              name: userData.name || firebaseUser.displayName || '',
              email: firebaseUser.email || '',
              role: userData.role || 'user',
              createdAt: userData.createdAt?.toDate(),
              updatedAt: userData.updatedAt?.toDate()
            });
          } else {
            // Se não existe no Firestore, criar documento
            const newUser: User = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || '',
              email: firebaseUser.email || '',
              role: firebaseUser.email === 'ricpmota.med@gmail.com' ? 'admin' : 'user',
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              ...newUser,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            setUser(newUser);

            // Se for um novo usuário (não é o admin), criar lead e enviar e-mail
            if (firebaseUser.email !== 'ricpmota.med@gmail.com' && firebaseUser.email) {
              try {
                console.log('🆕 Novo usuário detectado, criando lead e enviando e-mail...', {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  name: firebaseUser.displayName || firebaseUser.email
                });

                // Criar lead no Firestore
                const { LeadService } = await import('@/services/leadService');
                const novoLead = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  name: firebaseUser.displayName || firebaseUser.email.split('@')[0] || 'Usuário',
                  createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date(),
                  lastSignInTime: firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : undefined,
                  emailVerified: firebaseUser.emailVerified || false,
                  status: 'nao_qualificado' as const,
                  dataStatus: new Date(),
                };
                
                const leadId = await LeadService.createOrUpdateLead(novoLead);
                console.log('✅ Lead criado:', leadId);

                // Enviar e-mails simultaneamente: bem-vindo para o cliente e lead avulso para o admin
                try {
                  // Enviar e-mail de boas-vindas para o cliente
                  const bemVindoResponse = fetch('/api/send-email-bem-vindo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: firebaseUser.uid,
                      userEmail: novoLead.email,
                      userName: novoLead.name,
                    }),
                  });

                  // Enviar e-mail de lead avulso para o gestor admin
                  const leadAvulsoResponse = fetch('/api/send-email-lead-avulso', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      leadId: leadId,
                      leadNome: novoLead.name,
                      leadEmail: novoLead.email,
                    }),
                  });

                  // Aguardar ambos os envios
                  const [bemVindoResult, leadAvulsoResult] = await Promise.allSettled([
                    bemVindoResponse,
                    leadAvulsoResponse
                  ]);

                  if (bemVindoResult.status === 'fulfilled') {
                    const bemVindoData = await bemVindoResult.value.json();
                    if (bemVindoResult.value.ok) {
                      console.log('✅ E-mail de boas-vindas enviado com sucesso:', bemVindoData);
                    } else {
                      console.error('❌ Erro ao enviar e-mail de boas-vindas:', bemVindoData);
                    }
                  } else {
                    console.error('❌ Erro ao enviar e-mail de boas-vindas:', bemVindoResult.reason);
                  }

                  if (leadAvulsoResult.status === 'fulfilled') {
                    const leadAvulsoData = await leadAvulsoResult.value.json();
                    if (leadAvulsoResult.value.ok) {
                      console.log('✅ E-mail de lead avulso enviado com sucesso:', leadAvulsoData);
                    } else {
                      console.error('❌ Erro ao enviar e-mail de lead avulso:', leadAvulsoData);
                    }
                  } else {
                    console.error('❌ Erro ao enviar e-mail de lead avulso:', leadAvulsoResult.reason);
                  }
                } catch (emailError) {
                  console.error('❌ Erro ao enviar e-mails:', emailError);
                  // Não bloquear o fluxo se o e-mail falhar
                }
              } catch (leadError) {
                console.error('❌ Erro ao criar lead para novo usuário:', leadError);
                // Não bloquear o fluxo se o lead falhar
              }
            }
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Erro no login com Google:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'user') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role,
        updatedAt: new Date()
      });
      
      // Atualizar usuário atual se for o mesmo
      if (user && user.uid === userId) {
        setUser({ ...user, role, updatedAt: new Date() });
      }
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
    updateUserRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
