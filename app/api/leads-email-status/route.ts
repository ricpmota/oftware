import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
  fetchEnviosCampanhaPorLeadIds,
  LEAD_ID_IN_BATCH_SIZE,
} from '@/lib/leadsEmailStatus/fetchEnviosCampanhaPorLeadIds';

// Declaração global para adminAuth
declare global {
  var adminAuth: Auth | undefined;
}

// Função para obter Firebase Admin (mesma da /api/users)
function getFirebaseAdmin(): Auth {
  if (globalThis.adminAuth) {
    return globalThis.adminAuth;
  }
  
  const existingApps = getApps();
  if (existingApps.length > 0) {
    globalThis.adminAuth = getAuth(existingApps[0]);
    return globalThis.adminAuth;
  }
  
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "oftware-9201e";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  
  if (!privateKey || !clientEmail) {
    throw new Error('Variáveis de ambiente do Firebase Admin não configuradas');
  }
  
  let processedKey = privateKey.replace(/\\n/g, '\n');
  if (!processedKey.includes('\n') && processedKey.includes('-----BEGIN')) {
    processedKey = processedKey
      .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
      .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
      .replace(/\n+/g, '\n');
  }
  
  const adminApp = initializeApp({
    credential: cert({
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: processedKey,
    }),
  });
  
  globalThis.adminAuth = getAuth(adminApp);
  return globalThis.adminAuth;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Buscando leads para gestão de e-mails...');
    
    // 1. Buscar todos os usuários do Firebase Auth (mesma lógica da página Leads)
    const auth = getFirebaseAdmin();
    let allFirebaseUsers: any[] = [];
    let nextPageToken: string | undefined;
    
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      allFirebaseUsers = allFirebaseUsers.concat(listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    console.log(`✅ ${allFirebaseUsers.length} usuários encontrados no Firebase Auth`);
    
    // 2. Buscar solicitações de médico para filtrar usando Admin SDK
    // FLUXO: Se usuário tem solicitacao_medico → lead qualificado (NÃO aparece)
    //        Se não tem → lead não qualificado (APARECE na lista)
    const adminDb = getFirestore(auth.app);
    
    const solicitacoesSnapshot = await adminDb.collection('solicitacoes_medico').get();
    const todasSolicitacoes = solicitacoesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      criadoEm: doc.data().criadoEm?.toDate(),
    }));
    
    // Extrair emails únicos que já fizeram solicitação
    const emailsComSolicitacao = new Set(
      todasSolicitacoes
        .map(s => s.pacienteEmail?.toLowerCase().trim())
        .filter(Boolean)
    );
    console.log(`✅ ${emailsComSolicitacao.size} emails únicos com solicitação encontrados (de ${todasSolicitacoes.length} solicitações totais)`);
    
    // Criar mapa de email -> solicitação (para buscar nome do médico quando necessário)
    const solicitacaoPorEmail = new Map<string, typeof todasSolicitacoes[0]>();
    todasSolicitacoes.forEach(s => {
      const email = s.pacienteEmail?.toLowerCase().trim();
      if (email && !solicitacaoPorEmail.has(email)) {
        // Pegar a solicitação mais recente de cada email
        solicitacaoPorEmail.set(email, s);
      }
    });

    // 2.1. Buscar pacientes_completos para verificar medicoResponsavelId e mostrar médico na lista usando Admin SDK
    const pacientesSnapshot = await adminDb
      .collection('pacientes_completos')
      .where('medicoResponsavelId', '!=', null)
      .get();
    const todosPacientes = pacientesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      email: doc.data().email,
      medicoResponsavelId: doc.data().medicoResponsavelId,
    }));
    
    const pacientesComMedico = new Map<string, { medicoId: string; medicoNome?: string }>();
    const medicosMap = new Map<string, { nome: string }>();
    const medicoIds = new Set<string>();
    todosPacientes.forEach((p: any) => {
      if (p.medicoResponsavelId) medicoIds.add(String(p.medicoResponsavelId));
    });
    const medicoDocs = await Promise.all(
      Array.from(medicoIds).map((medicoId) => adminDb.collection('medicos').doc(medicoId).get())
    );
    medicoDocs.forEach((docSnap) => {
      if (!docSnap.exists) return;
      const data = docSnap.data() || {};
      medicosMap.set(docSnap.id, { nome: String(data.nome || '') });
    });
    
    todosPacientes.forEach((p: any) => {
      if (p.medicoResponsavelId) {
        const email = p.email?.toLowerCase().trim();
        if (email) {
          const medicoNome = medicosMap.get(p.medicoResponsavelId)?.nome;
          pacientesComMedico.set(email, {
            medicoId: p.medicoResponsavelId,
            medicoNome: medicoNome || 'Médico não encontrado'
          });
        }
      }
    });
    
    console.log(`✅ ${pacientesComMedico.size} pacientes com médico responsável encontrados`);
    
    // 3. Data mínima: 20/11/2025 (mesma da página Leads)
    const dataMinima = new Date('2025-11-20T00:00:00');
    dataMinima.setHours(0, 0, 0, 0);
    
    // 4. Formatar TODOS os leads (incluindo os que têm solicitação para mostrar nome do médico)
    const leadsFormatted = allFirebaseUsers
      .map((user: any) => {
        let createdAt: Date | undefined;
        if (user.metadata?.creationTime) {
          if (typeof user.metadata.creationTime === 'string') {
            createdAt = new Date(user.metadata.creationTime);
          } else if (user.metadata.creationTime instanceof Date) {
            createdAt = user.metadata.creationTime;
          } else if (user.metadata.creationTime.toDate) {
            createdAt = user.metadata.creationTime.toDate();
          }
        }
        
        const userEmail = user.email?.toLowerCase().trim();
        const solicitacao = userEmail ? solicitacaoPorEmail.get(userEmail) : undefined;
        
        return {
          id: user.uid,
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || user.email || 'Usuário sem nome',
          createdAt: createdAt,
          status: 'nao_qualificado' as const, // Status padrão
          // Informações da solicitação (se houver)
          temSolicitacao: !!solicitacao,
          medicoNome: solicitacao?.medicoNome,
          medicoId: solicitacao?.medicoId,
          statusSolicitacao: solicitacao?.status as 'pendente' | 'aceita' | 'rejeitada' | 'desistiu' | undefined,
        };
      })
      .filter((user: any) => {
        const userEmail = user.email?.toLowerCase().trim();
        
        // Filtrar usuários sem email válido
        if (!userEmail || userEmail === 'sem email' || userEmail === '') {
          return false;
        }
        
        // FLUXO CORRETO: Se tem solicitacao_medico → NÃO aparece (lead qualificado)
        if (emailsComSolicitacao.has(userEmail)) {
          return false; // Lead qualificado, não aparece
        }
        
        // EXCLUIR leads que têm medicoResponsavelId (estão sendo acompanhados por médico)
        if (pacientesComMedico.has(userEmail)) {
          return false; // Não é mais lead, está sendo acompanhado
        }
        
        // Filtrar apenas usuários cadastrados a partir de 20/11/2025
        if (!user.createdAt) return false;
        const userCreatedAt = new Date(user.createdAt);
        userCreatedAt.setHours(0, 0, 0, 0);
        return userCreatedAt >= dataMinima;
      })
      .map((user: any) => {
        // Adicionar informação do médico se houver (para mostrar na lista)
        const userEmail = user.email?.toLowerCase().trim();
        const pacienteComMedico = userEmail ? pacientesComMedico.get(userEmail) : undefined;
        
        if (pacienteComMedico) {
          user.medicoResponsavelId = pacienteComMedico.medicoId;
          user.medicoResponsavelNome = pacienteComMedico.medicoNome;
        }
        
        return user;
      });
    
    console.log(`✅ ${leadsFormatted.length} leads formatados (incluindo ${leadsFormatted.filter(l => l.temSolicitacao).length} com solicitação)`);
    console.log(`📊 Resumo: ${allFirebaseUsers.length} usuários totais → ${leadsFormatted.length} leads`);
    
    // 5. Envios de campanha apenas dos leads exibidos (sem varrer histórico global)
    const leadIds = leadsFormatted.map((lead) => lead.id);
    const { enviosPorLead, docsLidos: docsEmailEnviosLidos } = await fetchEnviosCampanhaPorLeadIds(
      adminDb,
      leadIds
    );
    console.log(
      `✅ email_envios: ${leadIds.length === 0 ? 0 : Math.ceil(leadIds.length / LEAD_ID_IN_BATCH_SIZE)} batches, ${docsEmailEnviosLidos} docs lidos (${leadIds.length} leads)`
    );

    // Criar status para cada lead
    const status = leadsFormatted.map(lead => {
      const enviosDoLead = enviosPorLead.get(lead.id) || [];
      const leadEmail = lead.email?.toLowerCase().trim();
      const solicitacao = leadEmail && solicitacaoPorEmail ? solicitacaoPorEmail.get(leadEmail) : undefined;
      const temSolicitacao = !!solicitacao;
      
      const pacienteComMedico = leadEmail && pacientesComMedico ? pacientesComMedico.get(leadEmail) : undefined;
      const temMedicoResponsavel = !!pacienteComMedico;
      
      const statusItem: any = {
        leadId: lead.id,
        leadEmail: lead.email,
        leadNome: lead.name,
        statusLead: lead.status,
        dataCriacao: lead.createdAt || new Date(),
        dataStatus: lead.createdAt || new Date(),
        temSolicitacaoMedico: temSolicitacao,
        medicoNome: solicitacao?.medicoNome || pacienteComMedico?.medicoNome,
        medicoId: solicitacao?.medicoId || pacienteComMedico?.medicoId,
        statusSolicitacao: solicitacao?.status,
        temMedicoResponsavel: temMedicoResponsavel,
      };

      // Verificar cada e-mail
      (['email1', 'email2', 'email3', 'email4', 'email5'] as const).forEach(emailTipo => {
        if (temSolicitacao) {
          statusItem[emailTipo] = {
            enviado: false,
            status: 'nao_enviar',
          };
        } else {
          const envio = enviosDoLead.find(e => e.emailTipo === emailTipo);
          if (envio) {
            statusItem[emailTipo] = {
              enviado: true,
              dataEnvio: envio.enviadoEm,
              status: envio.status,
            };
          } else {
            statusItem[emailTipo] = {
              enviado: false,
              status: 'pendente',
            };
          }
        }
      });

      // Verificar conversão
      if (temMedicoResponsavel) {
        const enviosEnviados = enviosDoLead
          .filter(e => e.status === 'enviado')
          .sort((a, b) => a.enviadoEm.getTime() - b.enviadoEm.getTime());
        
        if (enviosEnviados.length > 0) {
          const ultimoEnvio = enviosEnviados[enviosEnviados.length - 1];
          statusItem.emailConversao = ultimoEnvio.emailTipo;
          statusItem.dataConversao = new Date();
        }
      } else {
        const envioConversao = enviosDoLead.find(e => e.conversao);
        if (envioConversao) {
          statusItem.emailConversao = envioConversao.emailTipo;
          statusItem.dataConversao = envioConversao.conversao?.data;
        }
      }

      // Calcular próximo e-mail
      const dataCriacao = lead.createdAt || new Date();
      // Usar horário de São Paulo (UTC-3)
      const agora = new Date();
      const horasDesdeCriacao = (agora.getTime() - dataCriacao.getTime()) / (1000 * 60 * 60);
      const minutosDesdeCriacao = (agora.getTime() - dataCriacao.getTime()) / (1000 * 60);

      if (!temSolicitacao && !temMedicoResponsavel) {
        // Sempre calcular o próximo envio, mesmo que ainda não tenha passado o tempo
        if (!statusItem.email1?.enviado) {
          statusItem.proximoEmail = 'email1';
          statusItem.proximoEnvio = new Date(dataCriacao.getTime() + 60 * 60 * 1000); // 1 hora
        } else if (!statusItem.email2?.enviado) {
          statusItem.proximoEmail = 'email2';
          statusItem.proximoEnvio = new Date(dataCriacao.getTime() + 24 * 60 * 60 * 1000);
        } else if (!statusItem.email3?.enviado) {
          statusItem.proximoEmail = 'email3';
          statusItem.proximoEnvio = new Date(dataCriacao.getTime() + 72 * 60 * 60 * 1000);
        } else if (!statusItem.email4?.enviado) {
          statusItem.proximoEmail = 'email4';
          statusItem.proximoEnvio = new Date(dataCriacao.getTime() + 168 * 60 * 60 * 1000);
        } else if (!statusItem.email5?.enviado) {
          statusItem.proximoEmail = 'email5';
          statusItem.proximoEnvio = new Date(dataCriacao.getTime() + 336 * 60 * 60 * 1000);
        }
      }

      return statusItem;
    });
    
    console.log(`✅ ${status.length} status de e-mail calculados`);
    return NextResponse.json(status);
  } catch (error) {
    console.error('❌ Erro ao buscar status de e-mails:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao buscar status',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

