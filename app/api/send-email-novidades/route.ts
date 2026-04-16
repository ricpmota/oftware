import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
  isZeptoMailConfigured,
  sendEmail,
  verifyZeptoMailConnection,
} from '@/lib/email/transporter';

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
    db: getFirestore(adminApp),
    auth: getAuth(adminApp),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { enviarPacientes, enviarMedicos, pacientesIds, medicosIds } = await request.json();

    // Modo específico: enviar para IDs selecionados
    const modoEspecifico = pacientesIds || medicosIds;
    
    if (!modoEspecifico && !enviarPacientes && !enviarMedicos) {
      return NextResponse.json(
        { error: 'Selecione pelo menos um destinatário (Pacientes ou Médicos)' },
        { status: 400 }
      );
    }

    const { db, auth } = getFirebaseAdmin();
    
    // 1. Buscar template do e-mail
    const emailDoc = await db.collection('emails').doc('novidades_novidade').get();
    if (!emailDoc.exists) {
      return NextResponse.json(
        { error: 'Template de e-mail não configurado' },
        { status: 404 }
      );
    }

    const emailTemplate = emailDoc.data();
    const assunto = emailTemplate?.assunto || 'Novidades do Oftware';
    const htmlTemplate = emailTemplate?.corpoHtml || '';

    let smtpPronto = false;
    if (isZeptoMailConfigured()) {
      const v = await verifyZeptoMailConnection();
      if (!v.success) {
        return NextResponse.json(
          { error: 'Erro ao conectar SMTP ZeptoMail', details: v.error },
          { status: 500 }
        );
      }
      smtpPronto = true;
    }

    let enviadosPacientes = 0;
    let falhasPacientes = 0;
    let enviadosMedicos = 0;
    let falhasMedicos = 0;

    // 3. Enviar para pacientes
    if (enviarPacientes || (pacientesIds && pacientesIds.length > 0)) {
      let pacientesParaEnviar;
      
      if (pacientesIds && pacientesIds.length > 0) {
        // Modo específico: buscar apenas os pacientes selecionados
        pacientesParaEnviar = [];
        for (const pacienteId of pacientesIds) {
          const pacienteDoc = await db.collection('pacientes_completos').doc(pacienteId).get();
          if (pacienteDoc.exists) {
            pacientesParaEnviar.push({ id: pacienteId, data: pacienteDoc.data() });
          }
        }
      } else {
        // Modo massa: buscar todos os pacientes
        const pacientesSnapshot = await db.collection('pacientes_completos').get();
        pacientesParaEnviar = pacientesSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
      }
      
      for (const { id: pacienteId, data: paciente } of pacientesParaEnviar) {
        const pacienteEmail = paciente.email || paciente.dadosIdentificacao?.email || '';
        const pacienteNome = paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente';
        
        if (!pacienteEmail || pacienteEmail === 'sem email' || pacienteEmail === '') {
          continue;
        }

        try {
          // Substituir variáveis
          let html = htmlTemplate.replace(/\{nome\}/g, pacienteNome);
          
          // Garantir estrutura HTML completa
          let htmlFinal = html;
          if (!htmlFinal.includes('<html') && !htmlFinal.includes('<!DOCTYPE')) {
            htmlFinal = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${html}
</body>
</html>
            `.trim();
          }

          if (smtpPronto) {
            const sent = await sendEmail({
              to: pacienteEmail,
              subject: assunto,
              html: htmlFinal,
              text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
            });
            if (!sent.success) throw new Error(sent.error);
          } else {
            console.log(`📧 SIMULAÇÃO E-MAIL para paciente: ${pacienteEmail}`);
          }

          // Registrar envio
          await db.collection('email_envios').add({
            leadId: paciente.userId || pacienteId,
            leadEmail: pacienteEmail,
            leadNome: pacienteNome,
            emailTipo: 'novidades_novidade',
            assunto,
            enviadoEm: new Date(),
            status: smtpPronto ? 'enviado' : 'pendente',
            tentativas: 1,
            erro: null,
            tipo: 'manual',
          });

          enviadosPacientes++;
        } catch (error) {
          falhasPacientes++;
          console.error(`❌ Erro ao enviar para paciente ${pacienteEmail}:`, error);
          
          // Registrar falha
          await db.collection('email_envios').add({
            leadId: paciente.userId || pacienteId,
            leadEmail: pacienteEmail,
            leadNome: pacienteNome,
            emailTipo: 'novidades_novidade',
            assunto,
            enviadoEm: new Date(),
            status: 'falhou',
            tentativas: 1,
            erro: (error as Error).message,
            tipo: 'manual',
          });
        }
      }
    }

    // 4. Enviar para médicos
    if (enviarMedicos || (medicosIds && medicosIds.length > 0)) {
      let medicosParaEnviar;
      
      if (medicosIds && medicosIds.length > 0) {
        // Modo específico: buscar apenas os médicos selecionados
        medicosParaEnviar = [];
        for (const medicoId of medicosIds) {
          const medicoDoc = await db.collection('medicos').doc(medicoId).get();
          if (medicoDoc.exists) {
            medicosParaEnviar.push({ id: medicoId, data: medicoDoc.data() });
          }
        }
      } else {
        // Modo massa: buscar todos os médicos
        const medicosSnapshot = await db.collection('medicos').get();
        medicosParaEnviar = medicosSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
      }
      
      for (const { id: medicoId, data: medico } of medicosParaEnviar) {
        const medicoEmail = medico.email;
        const medicoNomeBase = medico?.nome || medico?.name || 'Médico';
        const medicoGenero = medico?.genero || medico?.gender;
        const medicoNome = medicoGenero === 'F' || medicoGenero === 'female' 
          ? `Dra. ${medicoNomeBase}` 
          : `Dr. ${medicoNomeBase}`;
        
        if (!medicoEmail || medicoEmail === 'sem email' || medicoEmail === '') {
          continue;
        }

        try {
          // Substituir variáveis
          let html = htmlTemplate.replace(/\{nome\}/g, medicoNome);
          
          // Garantir estrutura HTML completa
          let htmlFinal = html;
          if (!htmlFinal.includes('<html') && !htmlFinal.includes('<!DOCTYPE')) {
            htmlFinal = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${html}
</body>
</html>
            `.trim();
          }

          if (smtpPronto) {
            const sent = await sendEmail({
              to: medicoEmail,
              subject: assunto,
              html: htmlFinal,
              text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
            });
            if (!sent.success) throw new Error(sent.error);
          } else {
            console.log(`📧 SIMULAÇÃO E-MAIL para médico: ${medicoEmail}`);
          }

          // Registrar envio
          await db.collection('email_envios').add({
            leadId: medicoId,
            leadEmail: medicoEmail,
            leadNome: medicoNome,
            emailTipo: 'novidades_novidade',
            assunto,
            enviadoEm: new Date(),
            status: smtpPronto ? 'enviado' : 'pendente',
            tentativas: 1,
            erro: null,
            tipo: 'manual',
          });

          enviadosMedicos++;
        } catch (error) {
          falhasMedicos++;
          console.error(`❌ Erro ao enviar para médico ${medicoEmail}:`, error);
          
          // Registrar falha
          await db.collection('email_envios').add({
            leadId: medicoId,
            leadEmail: medicoEmail,
            leadNome: medicoNome,
            emailTipo: 'novidades_novidade',
            assunto,
            enviadoEm: new Date(),
            status: 'falhou',
            tentativas: 1,
            erro: (error as Error).message,
            tipo: 'manual',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'E-mails de novidades enviados com sucesso',
      enviadosPacientes,
      falhasPacientes,
      enviadosMedicos,
      falhasMedicos,
    });
  } catch (error) {
    console.error('Erro ao enviar e-mails de novidades:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar e-mails', details: (error as Error).message },
      { status: 500 }
    );
  }
}

