import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { sendEmail, verifyZeptoMailConnection } from '@/lib/email/transporter';
import {
  assertCronZeptoConfigured,
  cronEmailThrottle,
  getCronZeptoMaxSendsPerRun,
} from '@/lib/email/cronZeptoBatch';

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

// Função para criar calendário de doses (mesma lógica do calendário)
function criarCalendarioDoses(planoTerapeutico: any, evolucaoSeguimento: any[]): Array<{
  data: Date;
  semana: number;
  dose: number;
  status: 'tomada' | 'perdida' | 'hoje' | 'futura';
}> {
  if (!planoTerapeutico?.startDate || !planoTerapeutico?.injectionDayOfWeek) {
    return [];
  }

  const diasSemana: { [key: string]: number } = {
    dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6
  };

  const diaDesejado = diasSemana[planoTerapeutico.injectionDayOfWeek];
  const startDateValue = planoTerapeutico.startDate;
  const primeiraDose = startDateValue.toDate ? startDateValue.toDate() : new Date(startDateValue);
  primeiraDose.setHours(0, 0, 0, 0);
  while (primeiraDose.getDay() !== diaDesejado) {
    primeiraDose.setDate(primeiraDose.getDate() + 1);
  }

  const doseInicial = planoTerapeutico.currentDoseMg || 2.5;
  const numeroSemanas = planoTerapeutico.numeroSemanasTratamento || 18;
  const semanasCanceladas = planoTerapeutico.semanasCanceladas || [];
  const evolucao = (evolucaoSeguimento || []).map((e: any) => ({
    ...e,
    dataRegistro: e.dataRegistro?.toDate ? e.dataRegistro.toDate() : new Date(e.dataRegistro)
  }));

  const calcularDoseComAtrasos = (semanaIndex: number) => {
    let semanasDesdeUltimoCiclo = semanaIndex;
    for (let s = 0; s < semanaIndex; s++) {
      const dataPrevista = new Date(primeiraDose);
      dataPrevista.setDate(primeiraDose.getDate() + (s * 7));
      const registro = evolucao.find((e: any) => {
        if (!e.dataRegistro) return false;
        const dataRegistro = e.dataRegistro instanceof Date ? new Date(e.dataRegistro) : new Date(e.dataRegistro);
        if (isNaN(dataRegistro.getTime())) return false;
        dataRegistro.setHours(0, 0, 0, 0);
        const diffDias = Math.abs((dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
        return diffDias <= 1;
      });
      if (registro && registro.dataRegistro) {
        const dataRegistro = registro.dataRegistro instanceof Date ? new Date(registro.dataRegistro) : new Date(registro.dataRegistro);
        dataRegistro.setHours(0, 0, 0, 0);
        const diffDias = (dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDias >= 4) {
          semanasDesdeUltimoCiclo = semanaIndex - s - 1;
          break;
        }
      }
    }
    return doseInicial + (Math.floor(semanasDesdeUltimoCiclo / 4) * 2.5);
  };

  const calendario = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  for (let semana = 0; semana < numeroSemanas; semana++) {
    const semanaNum = semana + 1;
    if (semanasCanceladas.includes(semanaNum)) continue;

    const dataDose = new Date(primeiraDose);
    dataDose.setDate(primeiraDose.getDate() + (semana * 7));
    const dosePlanejada = calcularDoseComAtrasos(semana);
    
    const registroEvolucao = evolucao.find((e: any) => {
      if (!e.dataRegistro) return false;
      const dataRegistro = e.dataRegistro instanceof Date ? new Date(e.dataRegistro) : new Date(e.dataRegistro);
      if (isNaN(dataRegistro.getTime())) return false;
      dataRegistro.setHours(0, 0, 0, 0);
      const diffDias = Math.abs((dataRegistro.getTime() - dataDose.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias <= 1;
    });

    let doseReal = dosePlanejada;
    if (planoTerapeutico.esquemaDosesCustomizado && planoTerapeutico.esquemaDosesCustomizado[semanaNum]) {
      doseReal = planoTerapeutico.esquemaDosesCustomizado[semanaNum];
    } else if (registroEvolucao?.doseAplicada) {
      doseReal = registroEvolucao.doseAplicada.quantidade || dosePlanejada;
    }

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

    calendario.push({ data: dataDose, semana: semanaNum, dose: doseReal, status });
  }

  return calendario;
}

// Função para formatar agenda diária
function formatarAgendaDiaria(
  aplicacoes: Array<{ pacienteNome: string; semana: number; dose: number; localAplicacao?: string }>,
  pagamentos: Array<{ pacienteNome: string; parcela: number; valor: number; status?: string }>
): string {
  let html = '<ul style="list-style: none; padding: 0;">';
  
  if (aplicacoes.length > 0) {
    html += '<li><strong>💉 Aplicações:</strong><ul style="list-style: disc; margin-left: 20px;">';
    aplicacoes.forEach(app => {
      const localNome = app.localAplicacao === 'abdome' ? 'Abdome' : app.localAplicacao === 'coxa' ? 'Coxa' : 'Braço';
      html += `<li><strong>${app.pacienteNome}</strong> - Semana ${app.semana} - ${app.dose}mg - Local: ${localNome}</li>`;
    });
    html += '</ul></li>';
  }
  
  if (pagamentos.length > 0) {
    html += '<li><strong>💰 Pagamentos:</strong><ul style="list-style: disc; margin-left: 20px;">';
    pagamentos.forEach(pag => {
      const statusTexto = pag.status === 'paga' ? ' (Paga)' : pag.status === 'atrasada' ? ' (Atrasada)' : ' (Pendente)';
      html += `<li><strong>${pag.pacienteNome}</strong> - Parcela ${pag.parcela} - R$ ${pag.valor.toFixed(2).replace('.', ',')}${statusTexto}</li>`;
    });
    html += '</ul></li>';
  }
  
  html += '</ul>';
  return html;
}

export async function GET(request: NextRequest) {
  try {
    console.log('--- Iniciando Cron Job de E-mail de Agenda Diária ---');
    const db = getFirebaseAdmin();
    
    // Data de hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const hojeFim = new Date(hoje);
    hojeFim.setHours(23, 59, 59);
    
    console.log(`📅 Dia: ${hoje.toLocaleDateString('pt-BR')}`);
    
    // Buscar template do e-mail
    const emailDoc = await db.collection('emails').doc('agenda_agenda_diario').get();
    if (!emailDoc.exists) {
      console.log('⚠️ Template de e-mail não configurado');
      return NextResponse.json({ success: false, message: 'Template não configurado' });
    }
    
    const emailTemplate = emailDoc.data();
    const assuntoTemplate = emailTemplate?.assunto || 'Agenda do Dia - Aplicações e Pagamentos';
    const corpoTemplate = emailTemplate?.corpoHtml || '<p>Olá Dr(a). {medico},</p><p>{agenda_diario}</p>';
    
    // Buscar todos os médicos
    const medicosSnapshot = await db.collection('medicos').get();
    const medicos = medicosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Buscar todos os pacientes
    const pacientesSnapshot = await db.collection('pacientes_completos').get();
    const pacientes = pacientesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Buscar todos os pagamentos
    const pagamentosSnapshot = await db.collection('pagamentos_pacientes').get();
    const pagamentosData = pagamentosSnapshot.docs.map(doc => ({ pacienteId: doc.id, ...doc.data() }));
    
    const zeptoGate = assertCronZeptoConfigured();
    if (!zeptoGate.ok) {
      return NextResponse.json(zeptoGate.body, { status: zeptoGate.status });
    }

    const verifyResult = await verifyZeptoMailConnection();
    if (!verifyResult.success) {
      console.error('❌ Erro ao verificar conexão SMTP ZeptoMail:', verifyResult.error);
      return NextResponse.json(
        {
          success: false,
          erro: `Erro ao conectar ao servidor SMTP: ${verifyResult.error}`,
        },
        { status: 500 }
      );
    }

    let emailsEnviados = 0;
    let emailsFalhados = 0;
    const limitePorExecucao = getCronZeptoMaxSendsPerRun();
    let enviosZeptoNestaExecucao = 0;
    let truncadoPorLimite = false;
    
    // Para cada médico
    for (const medico of medicos) {
      if (enviosZeptoNestaExecucao >= limitePorExecucao) {
        truncadoPorLimite = true;
        break;
      }
      // Validação rigorosa do email do médico
      const medicoEmail = medico.email?.trim();
      if (!medicoEmail || medicoEmail === '' || medicoEmail === 'N/A' || !medicoEmail.includes('@')) {
        console.log(`⚠️ Médico ${medico.id} sem email válido: ${medicoEmail || 'não informado'}`);
        continue;
      }
      
      const pacientesDoMedico = pacientes.filter((p: any) => 
        p.medicoResponsavelId === medico.id && p.statusTratamento === 'em_tratamento'
      );
      
      if (pacientesDoMedico.length === 0) continue;
      
      // Calcular aplicações do dia
      const aplicacoes: Array<{ pacienteNome: string; semana: number; dose: number; localAplicacao?: string }> = [];
      const pagamentos: Array<{ pacienteNome: string; parcela: number; valor: number; status?: string }> = [];
      
      pacientesDoMedico.forEach((paciente: any) => {
        const plano = paciente.planoTerapeutico;
        if (!plano?.startDate || !plano?.injectionDayOfWeek) return;
        
        const calendario = criarCalendarioDoses(plano, paciente.evolucaoSeguimento || []);
        calendario.forEach(item => {
          const dataItem = new Date(item.data);
          dataItem.setHours(0, 0, 0, 0);
          if (dataItem.getTime() === hoje.getTime() && (item.status === 'hoje' || item.status === 'futura')) {
            aplicacoes.push({
              pacienteNome: paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente',
              semana: item.semana,
              dose: item.dose,
              localAplicacao: 'abdome' // Poderia calcular baseado na rotação
            });
          }
        });
        
        // Buscar pagamentos do paciente
        const pagamentoPaciente = pagamentosData.find((pag: any) => pag.pacienteId === paciente.id);
        if (pagamentoPaciente?.parcelas) {
          pagamentoPaciente.parcelas.forEach((parcela: any) => {
            if (parcela.dataVencimento) {
              const dataVenc = parcela.dataVencimento.toDate ? parcela.dataVencimento.toDate() : new Date(parcela.dataVencimento);
              dataVenc.setHours(0, 0, 0, 0);
              if (dataVenc.getTime() === hoje.getTime()) {
                pagamentos.push({
                  pacienteNome: paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente',
                  parcela: parcela.numero || 0,
                  valor: parcela.valor || 0,
                  status: parcela.status
                });
              }
            }
          });
        }
      });
      
      if (aplicacoes.length === 0 && pagamentos.length === 0) continue;
      
      // Formatar agenda
      const agendaFormatada = formatarAgendaDiaria(aplicacoes, pagamentos);
      
      // Preparar e-mail
      const medicoNome = medico.nome || medico.name || 'Médico';
      const medicoGenero = medico.genero || medico.gender;
      const medicoNomeCompleto = (medicoGenero === 'F' || medicoGenero === 'female' ? 'Dra. ' : 'Dr. ') + medicoNome;
      
      let assunto = assuntoTemplate.replace(/\{medico\}/g, medicoNomeCompleto);
      let html = corpoTemplate.replace(/\{medico\}/g, medicoNomeCompleto);
      html = html.replace(/\{agenda_diario\}/g, agendaFormatada);
      
      // Garantir que o HTML está bem formatado
      if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
        html = `
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
      
      try {
        console.log(`📧 Enviando e-mail de agenda diária para ${medicoNomeCompleto} (${medicoEmail})`);
        if (enviosZeptoNestaExecucao >= limitePorExecucao) {
          truncadoPorLimite = true;
          break;
        }
        if (enviosZeptoNestaExecucao > 0) await cronEmailThrottle();

        const sent = await sendEmail({
          to: medicoEmail,
          subject: assunto,
          html: html,
          text: html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
        });
        if (!sent.success) throw new Error(sent.error);
        enviosZeptoNestaExecucao++;
        
        // Registrar envio
        await db.collection('email_envios').add({
          emailTipo: 'agenda_agenda_diario',
          destinatarioEmail: medicoEmail,
          assunto: assunto,
          enviadoEm: new Date(),
          status: 'enviado',
          tipo: 'automatico',
          medicoId: medico.id,
          medicoNome: medicoNomeCompleto,
        });
        
        emailsEnviados++;
        console.log(`✅ E-mail de agenda diária enviado para ${medicoNomeCompleto} (${medicoEmail})`);
      } catch (error) {
        emailsFalhados++;
        const erroMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`❌ Erro ao enviar e-mail para ${medicoNomeCompleto} (${medicoEmail}):`, erroMsg);
        
        await db.collection('email_envios').add({
          emailTipo: 'agenda_agenda_diario',
          destinatarioEmail: medicoEmail,
          assunto: assunto,
          enviadoEm: new Date(),
          status: 'falhou',
          erro: erroMsg,
          tipo: 'automatico',
          medicoId: medico.id,
          medicoNome: medicoNomeCompleto,
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      enviados: emailsEnviados,
      falhas: emailsFalhados,
      mensagem: `${emailsEnviados} e-mail(s) enviado(s), ${emailsFalhados} falha(s)`,
      limitePorExecucao,
      truncadoPorLimiteZepto: truncadoPorLimite,
      provedor: 'ZeptoMail',
    });
  } catch (error) {
    console.error('Erro no cron job:', error);
    return NextResponse.json({
      success: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
