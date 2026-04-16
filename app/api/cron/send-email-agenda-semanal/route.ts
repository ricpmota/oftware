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

// Função para formatar agenda semanal
function formatarAgendaSemanal(
  aplicacoes: Array<{ data: Date; pacienteNome: string; semana: number; dose: number; localAplicacao?: string }>,
  pagamentos: Array<{ data: Date; pacienteNome: string; parcela: number; valor: number; status?: string }>
): string {
  let html = '<ul style="list-style: none; padding: 0;">';
  
  // Agrupar por dia
  const eventosPorDia = new Map<string, Array<{ tipo: 'aplicacao' | 'pagamento'; data: Date; pacienteNome: string; detalhes: string }>>();
  
  aplicacoes.forEach(app => {
    const dataStr = app.data.toLocaleDateString('pt-BR');
    if (!eventosPorDia.has(dataStr)) {
      eventosPorDia.set(dataStr, []);
    }
    const localNome = app.localAplicacao === 'abdome' ? 'Abdome' : app.localAplicacao === 'coxa' ? 'Coxa' : 'Braço';
    eventosPorDia.get(dataStr)!.push({
      tipo: 'aplicacao',
      data: app.data,
      pacienteNome: app.pacienteNome,
      detalhes: `Semana ${app.semana} - ${app.dose}mg - Local: ${localNome}`
    });
  });
  
  pagamentos.forEach(pag => {
    const dataStr = pag.data.toLocaleDateString('pt-BR');
    if (!eventosPorDia.has(dataStr)) {
      eventosPorDia.set(dataStr, []);
    }
    const statusTexto = pag.status === 'paga' ? ' (Paga)' : pag.status === 'atrasada' ? ' (Atrasada)' : ' (Pendente)';
    eventosPorDia.get(dataStr)!.push({
      tipo: 'pagamento',
      data: pag.data,
      pacienteNome: pag.pacienteNome,
      detalhes: `Parcela ${pag.parcela} - R$ ${pag.valor.toFixed(2).replace('.', ',')}${statusTexto}`
    });
  });
  
  // Ordenar dias
  const diasOrdenados = Array.from(eventosPorDia.keys()).sort((a, b) => {
    const [diaA, mesA, anoA] = a.split('/').map(Number);
    const [diaB, mesB, anoB] = b.split('/').map(Number);
    return new Date(anoA, mesA - 1, diaA).getTime() - new Date(anoB, mesB - 1, diaB).getTime();
  });
  
  diasOrdenados.forEach(dia => {
    const eventos = eventosPorDia.get(dia)!;
    html += `<li style="margin-bottom: 15px;"><strong>${dia}</strong><ul style="list-style: disc; margin-left: 20px;">`;
    eventos.forEach(evento => {
      const tipoTexto = evento.tipo === 'aplicacao' ? '💉 Aplicação' : '💰 Pagamento';
      html += `<li><strong>${evento.pacienteNome}</strong> - ${tipoTexto}: ${evento.detalhes}</li>`;
    });
    html += '</ul></li>';
  });
  
  html += '</ul>';
  return html;
}

export async function GET(request: NextRequest) {
  try {
    console.log('--- Iniciando Cron Job de E-mail de Agenda Semanal ---');
    const db = getFirebaseAdmin();
    
    // Calcular período da semana (segunda a domingo da semana que vem)
    // Como o e-mail é enviado no domingo, vamos calcular a semana seguinte (segunda a domingo)
    const agora = new Date();
    const diaSemana = agora.getDay(); // 0 = domingo, 1 = segunda, etc.
    
    // Se hoje é domingo, calcular a semana que vem (próxima segunda a domingo)
    // Se não, calcular a semana atual (segunda a domingo)
    const diasParaSegunda = diaSemana === 0 ? 1 : (diaSemana === 1 ? 0 : (8 - diaSemana));
    const segunda = new Date(agora);
    segunda.setDate(agora.getDate() + diasParaSegunda);
    segunda.setHours(0, 0, 0, 0);
    
    const domingo = new Date(segunda);
    domingo.setDate(segunda.getDate() + 6);
    domingo.setHours(23, 59, 59);
    
    console.log(`📅 Semana: ${segunda.toLocaleDateString('pt-BR')} a ${domingo.toLocaleDateString('pt-BR')}`);
    
    // Buscar template do e-mail
    const emailDoc = await db.collection('emails').doc('agenda_agenda_semanal').get();
    if (!emailDoc.exists) {
      console.log('⚠️ Template de e-mail não configurado');
      return NextResponse.json({ success: false, message: 'Template não configurado' });
    }
    
    const emailTemplate = emailDoc.data();
    const assuntoTemplate = emailTemplate?.assunto || 'Agenda Semanal - Aplicações e Pagamentos';
    const corpoTemplate = emailTemplate?.corpoHtml || '<p>Olá Dr(a). {medico},</p><p>{agenda_semanal}</p>';
    
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
    
    // Para cada médico
    for (const medico of medicos) {
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
      
      // Calcular aplicações da semana
      const aplicacoes: Array<{ data: Date; pacienteNome: string; semana: number; dose: number; localAplicacao?: string }> = [];
      const pagamentos: Array<{ data: Date; pacienteNome: string; parcela: number; valor: number; status?: string }> = [];
      
      pacientesDoMedico.forEach((paciente: any) => {
        const plano = paciente.planoTerapeutico;
        if (!plano?.startDate || !plano?.injectionDayOfWeek) return;
        
        const calendario = criarCalendarioDoses(plano, paciente.evolucaoSeguimento || []);
        calendario.forEach(item => {
          if (item.data >= segunda && item.data <= domingo && (item.status === 'futura' || item.status === 'hoje')) {
            aplicacoes.push({
              data: item.data,
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
              if (dataVenc >= segunda && dataVenc <= domingo) {
                pagamentos.push({
                  data: dataVenc,
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
      const agendaFormatada = formatarAgendaSemanal(aplicacoes, pagamentos);
      
      // Preparar e-mail
      const medicoNome = medico.nome || medico.name || 'Médico';
      const medicoGenero = medico.genero || medico.gender;
      const medicoNomeCompleto = (medicoGenero === 'F' || medicoGenero === 'female' ? 'Dra. ' : 'Dr. ') + medicoNome;
      
      let assunto = assuntoTemplate.replace(/\{medico\}/g, medicoNomeCompleto);
      let html = corpoTemplate.replace(/\{medico\}/g, medicoNomeCompleto);
      html = html.replace(/\{agenda_semanal\}/g, agendaFormatada);
      
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
        console.log(`📧 Enviando e-mail de agenda semanal para ${medicoNomeCompleto} (${medicoEmail})`);
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
          emailTipo: 'agenda_agenda_semanal',
          destinatarioEmail: medicoEmail,
          assunto: assunto,
          enviadoEm: new Date(),
          status: 'enviado',
          tipo: 'automatico',
          medicoId: medico.id,
          medicoNome: medicoNomeCompleto,
        });
        
        emailsEnviados++;
        console.log(`✅ E-mail de agenda semanal enviado para ${medicoNomeCompleto} (${medicoEmail})`);
      } catch (error) {
        emailsFalhados++;
        const erroMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`❌ Erro ao enviar e-mail para ${medicoNomeCompleto} (${medicoEmail}):`, erroMsg);
        
        await db.collection('email_envios').add({
          emailTipo: 'agenda_agenda_semanal',
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
