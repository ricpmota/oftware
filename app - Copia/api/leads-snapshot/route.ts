import { NextRequest, NextResponse } from 'next/server';
import { EmailConfigService } from '@/services/emailConfigService';
import { SolicitacaoMedicoService } from '@/services/solicitacaoMedicoService';
import { PacienteService } from '@/services/pacienteService';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

// Declaração global para adminAuth
declare global {
  var adminAuth: Auth | undefined;
}

// Função para obter Firebase Admin
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

/**
 * Criar snapshot diário de leads
 * Deve ser chamado diariamente (via cron) para rastrear conversões
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📸 Criando snapshot diário de leads...');
    
    // 1. Buscar todos os usuários do Firebase Auth
    const auth = getFirebaseAdmin();
    let allFirebaseUsers: any[] = [];
    let nextPageToken: string | undefined;
    
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      allFirebaseUsers = allFirebaseUsers.concat(listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    
    // 2. Buscar solicitações e pacientes com médico
    const [todasSolicitacoes, todosPacientes] = await Promise.all([
      SolicitacaoMedicoService.getAllSolicitacoes(),
      PacienteService.getAllPacientes()
    ]);
    
    const emailsComSolicitacao = new Set(
      todasSolicitacoes.map(s => s.pacienteEmail?.toLowerCase().trim()).filter(Boolean)
    );
    
    const pacientesComMedico = new Set(
      todosPacientes
        .filter(p => p.medicoResponsavelId)
        .map(p => p.email?.toLowerCase().trim())
        .filter(Boolean)
    );
    
    // 3. Filtrar leads (mesma lógica da página Leads)
    const dataMinima = new Date('2025-11-20T00:00:00');
    dataMinima.setHours(0, 0, 0, 0);
    
    const leads = allFirebaseUsers
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
        
        return {
          id: user.uid,
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || user.email || 'Usuário sem nome',
          createdAt: createdAt,
          status: 'nao_qualificado' as const,
        };
      })
      .filter((user: any) => {
        const userEmail = user.email?.toLowerCase().trim();
        if (!userEmail || userEmail === 'sem email' || userEmail === '') return false;
        if (emailsComSolicitacao.has(userEmail)) return false;
        if (pacientesComMedico.has(userEmail)) return false;
        if (!user.createdAt) return false;
        const userCreatedAt = new Date(user.createdAt);
        userCreatedAt.setHours(0, 0, 0, 0);
        return userCreatedAt >= dataMinima;
      });
    
    // 4. Criar snapshot
    await EmailConfigService.criarSnapshotDiario(leads);
    
    console.log(`✅ Snapshot criado com ${leads.length} leads`);
    return NextResponse.json({ success: true, totalLeads: leads.length });
  } catch (error) {
    console.error('❌ Erro ao criar snapshot:', error);
    return NextResponse.json(
      { error: 'Erro ao criar snapshot', details: (error as Error).message },
      { status: 500 }
    );
  }
}

