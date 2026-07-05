import { NextRequest, NextResponse } from 'next/server';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Função para obter Firebase Admin
function getFirebaseAdmin() {
  const existingApps = getApps();
  let adminApp;
  
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
  } else {
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
    
    adminApp = initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: processedKey,
      }),
    });
  }
  
  return {
    auth: getAuth(adminApp),
    db: getFirestore(adminApp),
  };
}

export async function GET(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  try {
    console.log('🔄 Iniciando atualização da coleção de conversão...');
    
    const { auth, db } = getFirebaseAdmin();
    const agora = new Date();

    // 1. Buscar todos os leads atuais (sem solicitação de médico e sem médico responsável)
    let allFirebaseUsers: any[] = [];
    let nextPageToken: string | undefined;
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      allFirebaseUsers = allFirebaseUsers.concat(listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);
    console.log(`✅ ${allFirebaseUsers.length} usuários encontrados no Firebase Auth`);

    // 2. Buscar solicitações de médico e pacientes com médico
    const solicitacoesSnapshot = await db.collection('solicitacoes_medico').get();
    const todasSolicitacoes = solicitacoesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      criadoEm: doc.data().criadoEm?.toDate(),
    }));
    const solicitacaoPorEmail = new Map<string, any>();
    todasSolicitacoes.forEach(s => {
      const email = s.pacienteEmail?.toLowerCase().trim();
      if (email) solicitacaoPorEmail.set(email, s);
    });

    const pacientesSnapshot = await db.collection('pacientes_completos').get();
    const todosPacientes = pacientesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    const pacientesComMedico = new Map<string, any>();
    todosPacientes.forEach(p => {
      const email = p.email?.toLowerCase().trim();
      if (email && p.medicoResponsavelId) pacientesComMedico.set(email, p);
    });

    // 3. Filtrar leads atuais (aptos para receber e-mails)
    const dataMinima = new Date('2025-11-20T00:00:00');
    dataMinima.setHours(0, 0, 0, 0);

    const leadsAtuais = new Set<string>();
    for (const user of allFirebaseUsers) {
      const userEmail = user.email?.toLowerCase().trim();
      if (!userEmail || userEmail === 'sem email' || userEmail === '') continue;
      if (solicitacaoPorEmail.has(userEmail)) continue; // Já tem solicitação = convertido
      if (pacientesComMedico.has(userEmail)) continue; // Já tem médico = convertido

      const createdAt = user.metadata.creationTime ? new Date(user.metadata.creationTime) : null;
      if (!createdAt) continue;
      const userCreatedAt = new Date(createdAt);
      userCreatedAt.setHours(0, 0, 0, 0);
      if (userCreatedAt < dataMinima) continue;

      leadsAtuais.add(userEmail);
    }
    console.log(`✅ ${leadsAtuais.size} leads atuais encontrados`);

    // 4. Buscar emails que estavam na coleção de conversão
    const conversaoCollection = db.collection('conversao');
    const conversaoSnapshot = await conversaoCollection.get();
    const emailsNaColecao = new Map<string, any>();
    
    conversaoSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = data.email?.toLowerCase().trim();
      if (email) {
        emailsNaColecao.set(email, {
          id: doc.id,
          email: email,
          leadId: data.leadId,
          leadNome: data.leadNome,
          dataInclusao: data.dataInclusao?.toDate(),
          dataUltimaAtualizacao: data.dataUltimaAtualizacao?.toDate(),
        });
      }
    });
    console.log(`✅ ${emailsNaColecao.size} emails encontrados na coleção de conversão`);

    // 5. Detectar conversões: emails que estavam na coleção mas não estão mais nos leads atuais
    const conversoesDetectadas: Array<{
      email: string;
      leadId: string;
      leadNome: string;
      dataConversao: Date;
    }> = [];

    for (const [email, dados] of emailsNaColecao.entries()) {
      if (!leadsAtuais.has(email)) {
        // Email sumiu da lista de leads atuais = houve conversão
        conversoesDetectadas.push({
          email: email,
          leadId: dados.leadId || '',
          leadNome: dados.leadNome || email,
          dataConversao: agora,
        });
      }
    }
    console.log(`📊 ${conversoesDetectadas.length} conversões detectadas`);

    // 6. Registrar conversões e remover emails da coleção
    const conversoesCollection = db.collection('conversoes_registradas');
    let conversoesRegistradas = 0;
    
    for (const conversao of conversoesDetectadas) {
      // Verificar se já foi registrada (evitar duplicatas)
      const conversaoExistente = await conversoesCollection
        .where('email', '==', conversao.email)
        .limit(1)
        .get();
      
      if (conversaoExistente.empty) {
        // Registrar nova conversão
        await conversoesCollection.add({
          email: conversao.email,
          leadId: conversao.leadId,
          leadNome: conversao.leadNome,
          dataConversao: conversao.dataConversao,
          registradoEm: agora,
        });
        conversoesRegistradas++;
        console.log(`✅ Conversão registrada: ${conversao.email}`);
      }

      // Remover email da coleção de conversão (para não contar 2 vezes)
      const docRef = conversaoCollection.doc(emailsNaColecao.get(conversao.email)!.id);
      await docRef.delete();
      console.log(`🗑️ Email removido da coleção: ${conversao.email}`);
    }

    // 7. Atualizar coleção de conversão com leads atuais
    let leadsAdicionados = 0;
    let leadsAtualizados = 0;

    for (const email of leadsAtuais) {
      const user = allFirebaseUsers.find(u => u.email?.toLowerCase().trim() === email);
      if (!user) continue;

      const docRef = conversaoCollection.doc();
      const emailLower = email.toLowerCase().trim();
      
      // Verificar se já existe
      const existente = Array.from(emailsNaColecao.values()).find(e => e.email === emailLower);
      
      if (existente) {
        // Atualizar data de última atualização
        await conversaoCollection.doc(existente.id).update({
          dataUltimaAtualizacao: agora,
        });
        leadsAtualizados++;
      } else {
        // Adicionar novo lead
        await docRef.set({
          email: emailLower,
          leadId: user.uid,
          leadNome: user.displayName || user.email || 'Usuário sem nome',
          dataInclusao: agora,
          dataUltimaAtualizacao: agora,
        });
        leadsAdicionados++;
      }
    }

    console.log(`✅ Coleção de conversão atualizada: ${leadsAdicionados} adicionados, ${leadsAtualizados} atualizados`);

    return NextResponse.json({
      success: true,
      timestamp: agora.toISOString(),
      resumo: {
        leadsAtuais: leadsAtuais.size,
        emailsNaColecao: emailsNaColecao.size,
        conversoesDetectadas: conversoesDetectadas.length,
        conversoesRegistradas: conversoesRegistradas,
        leadsAdicionados: leadsAdicionados,
        leadsAtualizados: leadsAtualizados,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar coleção de conversão:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Permitir POST também para testes manuais
export async function POST(request: NextRequest) {
  return GET(request);
}

