import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

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
  
  return getFirestore(adminApp);
}

// Função para criar calendário completo de doses (mesma lógica da Pasta 7)
function criarCalendarioDoses(
  planoTerapeutico: any,
  evolucaoSeguimento: any[]
): Array<{
  data: Date;
  semana: number;
  dose: number;
  status: 'tomada' | 'perdida' | 'hoje' | 'futura';
}> {
  if (!planoTerapeutico?.startDate || !planoTerapeutico?.injectionDayOfWeek) {
    return [];
  }

  const diasSemana: { [key: string]: number } = {
    dom: 0,
    seg: 1,
    ter: 2,
    qua: 3,
    qui: 4,
    sex: 5,
    sab: 6
  };

  const diaDesejado = diasSemana[planoTerapeutico.injectionDayOfWeek];

  // Ajustar primeira dose para o dia da semana correto
  const startDateValue = planoTerapeutico.startDate;
  const primeiraDose = startDateValue.toDate ? startDateValue.toDate() : new Date(startDateValue);
  primeiraDose.setHours(0, 0, 0, 0);
  while (primeiraDose.getDay() !== diaDesejado) {
    primeiraDose.setDate(primeiraDose.getDate() + 1);
  }

  // Obter dose inicial do plano
  const doseInicial = planoTerapeutico.currentDoseMg || 2.5;

  // Obter número de semanas do tratamento (padrão: 18)
  const numeroSemanas = planoTerapeutico.numeroSemanasTratamento || 18;

  const calendario = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Processar evolução
  const evolucao = (evolucaoSeguimento || []).map((e: any) => ({
    ...e,
    dataRegistro: e.dataRegistro?.toDate ? e.dataRegistro.toDate() : new Date(e.dataRegistro)
  }));

  // Função para calcular dose considerando atrasos de 4+ dias (reinicia ciclo)
  const calcularDoseComAtrasos = (semanaIndex: number) => {
    let semanasDesdeUltimoCiclo = semanaIndex;
    
    // Verificar se houve atraso de 4+ dias em aplicações anteriores
    for (let s = 0; s < semanaIndex; s++) {
      const dataPrevista = new Date(primeiraDose);
      dataPrevista.setDate(primeiraDose.getDate() + (s * 7));
      
      // Buscar registro correspondente
      const registro = evolucao.find((e: any) => {
        if (!e.dataRegistro) return false;
        const dataRegistro = e.dataRegistro instanceof Date 
          ? new Date(e.dataRegistro)
          : new Date(e.dataRegistro);
        if (isNaN(dataRegistro.getTime())) return false;
        dataRegistro.setHours(0, 0, 0, 0);
        const diffDias = Math.abs((dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
        return diffDias <= 1; // Tolerância de 1 dia
      });
      
      // Se encontrou registro e houve atraso de 4+ dias
      if (registro && registro.dataRegistro) {
        const dataRegistro = registro.dataRegistro instanceof Date 
          ? new Date(registro.dataRegistro)
          : new Date(registro.dataRegistro);
        dataRegistro.setHours(0, 0, 0, 0);
        const diffDias = (dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24);
        
        // Se atraso de 4 dias ou mais, reiniciar ciclo a partir dessa semana
        if (diffDias >= 4) {
          semanasDesdeUltimoCiclo = semanaIndex - s - 1;
          break;
        }
      }
    }
    
    // Calcular dose: aumento de 2.5mg a cada 4 semanas desde o último ciclo
    return doseInicial + (Math.floor(semanasDesdeUltimoCiclo / 4) * 2.5);
  };

  // Obter semanas canceladas
  const semanasCanceladas = planoTerapeutico.semanasCanceladas || [];
  
  // Criar calendário baseado no número de semanas definido
  for (let semana = 0; semana < numeroSemanas; semana++) {
    const semanaNum = semana + 1;
    
    // Pular semanas canceladas
    if (semanasCanceladas.includes(semanaNum)) {
      continue;
    }
    
    // Calcular data da dose como primeiraDose + (semana * 7 dias)
    const dataDose = new Date(primeiraDose);
    dataDose.setDate(primeiraDose.getDate() + (semana * 7));

    // Calcular dose planejada considerando atrasos
    const dosePlanejada = calcularDoseComAtrasos(semana);

    // Encontrar registro de evolução para esta data (com tolerância de ±1 dia)
    const registroEvolucao = evolucao.find((e: any) => {
      if (!e.dataRegistro) return false;
      const dataRegistro = e.dataRegistro instanceof Date 
        ? new Date(e.dataRegistro)
        : new Date(e.dataRegistro);
      if (isNaN(dataRegistro.getTime())) return false;
      dataRegistro.setHours(0, 0, 0, 0);
      const diffDias = Math.abs((dataRegistro.getTime() - dataDose.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias <= 1; // Tolerância de 1 dia
    });

    // Determinar dose real (customizada > registro > planejada)
    let doseReal = dosePlanejada;
    // Primeiro, verificar se há dose customizada para esta semana
    if (planoTerapeutico.esquemaDosesCustomizado && planoTerapeutico.esquemaDosesCustomizado[semana + 1]) {
      doseReal = planoTerapeutico.esquemaDosesCustomizado[semana + 1];
    } else if (registroEvolucao?.doseAplicada) {
      // Se não houver customizada, usar a do registro (aplicada)
      doseReal = registroEvolucao.doseAplicada.quantidade || dosePlanejada;
    }

    // Determinar status baseado em data e adesão
    let status: 'tomada' | 'perdida' | 'hoje' | 'futura';
    if (dataDose.getTime() === hoje.getTime()) {
      status = 'hoje';
    } else if (dataDose < hoje) {
      // Dose no passado
      if (registroEvolucao && registroEvolucao.adherence && registroEvolucao.adherence !== 'MISSED') {
        status = 'tomada';
      } else {
        status = 'perdida';
      }
    } else {
      status = 'futura';
    }

    calendario.push({
      data: dataDose,
      semana: semana + 1,
      dose: doseReal,
      status,
    });
  }

  return calendario;
}

// Função auxiliar para enviar e-mail de aplicação
async function enviarEmailAplicacao(
  db: any,
  pacienteId: string,
  paciente: any,
  numeroAplicacao: number,
  tipo: 'antes' | 'dia'
) {
  // 1. Buscar dados do médico
  let medicoNome = 'Médico';
  if (paciente.medicoResponsavelId) {
    const medicoDoc = await db.collection('medicos').doc(paciente.medicoResponsavelId).get();
    if (medicoDoc.exists) {
      const medico = medicoDoc.data();
      const medicoNomeBase = medico?.nome || medico?.name || 'Médico';
      const medicoGenero = medico?.genero || medico?.gender;
      medicoNome = medicoGenero === 'F' || medicoGenero === 'female' 
        ? `Dra. ${medicoNomeBase}` 
        : `Dr. ${medicoNomeBase}`;
    }
  }

  // 2. Buscar template do e-mail
  const emailDocId = tipo === 'antes' ? 'aplicacao_aplicacao_antes' : 'aplicacao_aplicacao_dia';
  const emailDoc = await db.collection('emails').doc(emailDocId).get();
  if (!emailDoc.exists) {
    throw new Error('Template de e-mail não configurado');
  }

  const emailTemplate = emailDoc.data();
  const assunto = emailTemplate?.assunto || (tipo === 'antes' ? 'Lembrete: Aplicação amanhã' : 'Lembrete: Aplicação hoje');
  let html = emailTemplate?.corpoHtml || '';

  // 3. Substituir variáveis
  html = html.replace(/\{nome\}/g, paciente.nome || 'Paciente');
  html = html.replace(/\{medico\}/g, medicoNome);
  html = html.replace(/\{numero\}/g, numeroAplicacao.toString());

  // 4. Garantir estrutura HTML completa
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

  // 5. Enviar e-mail
  let envioSucesso = false;
  let erroEnvio: string | undefined;

  try {
    if (process.env.ZOHO_EMAIL && process.env.ZOHO_PASSWORD) {
      const transporter = nodemailer.createTransport({
        host: 'smtp.zoho.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.ZOHO_EMAIL,
          pass: process.env.ZOHO_PASSWORD,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      await transporter.verify();

      const info = await transporter.sendMail({
        from: `"Oftware" <${process.env.ZOHO_EMAIL}>`,
        to: paciente.email,
        subject: assunto,
        html: htmlFinal,
        text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
      });

      console.log(`✅ E-mail de aplicação ${tipo} enviado:`, info.messageId);
      envioSucesso = true;
    } else {
      console.log('📧 SIMULAÇÃO E-MAIL (Zoho não configurado)');
      envioSucesso = true;
    }
  } catch (emailError) {
    erroEnvio = (emailError as Error).message;
    console.error('❌ Erro ao enviar e-mail:', emailError);
    throw emailError;
  }

  // 6. Registrar envio
  const enviosCollection = db.collection('email_envios');
  await enviosCollection.add({
    leadId: paciente.userId || pacienteId,
    leadEmail: paciente.email,
    leadNome: paciente.nome,
    emailTipo: emailDocId,
    assunto,
    enviadoEm: new Date(),
    status: envioSucesso ? 'enviado' : 'falhou',
    tentativas: 1,
    erro: erroEnvio || null,
    tipo: 'automatico',
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log('--- Iniciando Cron Job de E-mails de Aplicação ---');
    const db = getFirebaseAdmin();
    
    // 1. Buscar todos os pacientes com plano terapêutico
    const pacientesSnapshot = await db.collection('pacientes_completos').get();
    const agora = new Date();
    agora.setHours(0, 0, 0, 0);
    
    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    
    let emailsEnviados = 0;
    let emailsFalhados = 0;
    
    for (const pacienteDoc of pacientesSnapshot.docs) {
      const paciente = pacienteDoc.data();
      const plano = paciente.planoTerapeutico;
      
      if (!plano || !plano.startDate || !plano.injectionDayOfWeek || !plano.numeroSemanasTratamento) {
        continue;
      }
      
      // Usar a mesma lógica do calendário da Pasta 7 para obter aplicações futuras
      const evolucaoSeguimento = paciente.evolucaoSeguimento || [];
      const calendario = criarCalendarioDoses(plano, evolucaoSeguimento);
      
      // Filtrar apenas aplicações futuras
      const aplicacoesFuturas = calendario.filter(item => item.status === 'futura');
      
      // Verificar se há aplicação amanhã ou hoje
      for (const aplicacao of aplicacoesFuturas) {
        const dataAplicacao = aplicacao.data;
        dataAplicacao.setHours(0, 0, 0, 0);
        
        const numeroAplicacao = aplicacao.semana;
        
        // Verificar se já foi enviado e-mail para esta aplicação
        const enviosSnapshot = await db.collection('email_envios')
          .where('leadId', '==', pacienteDoc.id)
          .where('emailTipo', 'in', ['aplicacao_aplicacao_antes', 'aplicacao_aplicacao_dia'])
          .get();
        
        const enviosExistentes = enviosSnapshot.docs.map(doc => doc.data());
        const jaEnviouAntes = enviosExistentes.some(
          e => e.emailTipo === 'aplicacao_aplicacao_antes' && 
          e.assunto?.includes(`#${numeroAplicacao}`) &&
          Math.abs((e.enviadoEm?.toDate ? e.enviadoEm.toDate() : new Date(e.enviadoEm)).getTime() - amanha.getTime()) < 24 * 60 * 60 * 1000
        );
        const jaEnviouDia = enviosExistentes.some(
          e => e.emailTipo === 'aplicacao_aplicacao_dia' && 
          e.assunto?.includes(`#${numeroAplicacao}`) &&
          Math.abs((e.enviadoEm?.toDate ? e.enviadoEm.toDate() : new Date(e.enviadoEm)).getTime() - agora.getTime()) < 24 * 60 * 60 * 1000
        );
        
        // Enviar e-mail 1 dia antes
        if (dataAplicacao.getTime() === amanha.getTime() && !jaEnviouAntes) {
          try {
            await enviarEmailAplicacao(db, pacienteDoc.id, paciente, numeroAplicacao, 'antes');
            emailsEnviados++;
            console.log(`✅ E-mail de aplicação antes enviado para paciente ${pacienteDoc.id}, aplicação #${numeroAplicacao} (dose: ${aplicacao.dose}mg)`);
          } catch (error) {
            emailsFalhados++;
            console.error(`❌ Erro ao enviar e-mail de aplicação antes:`, error);
          }
        }
        
        // Enviar e-mail no dia
        if (dataAplicacao.getTime() === agora.getTime() && !jaEnviouDia) {
          try {
            await enviarEmailAplicacao(db, pacienteDoc.id, paciente, numeroAplicacao, 'dia');
            emailsEnviados++;
            console.log(`✅ E-mail de aplicação dia enviado para paciente ${pacienteDoc.id}, aplicação #${numeroAplicacao} (dose: ${aplicacao.dose}mg)`);
          } catch (error) {
            emailsFalhados++;
            console.error(`❌ Erro ao enviar e-mail de aplicação dia:`, error);
          }
        }
      }
    }
    
    console.log(`--- Cron Job de E-mails de Aplicação Concluído: ${emailsEnviados} enviados, ${emailsFalhados} falhas ---`);
    return NextResponse.json({
      success: true,
      message: 'Cron job de e-mails de aplicação concluído',
      emailsEnviados,
      emailsFalhados,
    });
  } catch (error) {
    console.error('❌ Erro fatal no cron job de e-mails de aplicação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: (error as Error).message },
      { status: 500 }
    );
  }
}

