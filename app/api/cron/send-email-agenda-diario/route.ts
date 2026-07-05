import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { sendEmail, verifyZeptoMailConnection } from '@/lib/email/transporter';
import {
  assertCronZeptoConfigured,
  cronEmailThrottle,
  getCronZeptoMaxSendsPerRun,
} from '@/lib/email/cronZeptoBatch';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';
import { dataPrevistaSemanaComoEsquema } from '@/utils/datasAplicacaoSemanaPlano';

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

function obterRegistroAplicacao(paciente: any, dataAplicacao: Date, semana: number) {
  const evolucao = paciente?.evolucaoSeguimento || [];
  const dataPrevista = new Date(dataAplicacao);
  dataPrevista.setHours(0, 0, 0, 0);
  return evolucao.find((e: any) => {
    const week = e.weekIndex ?? e.numeroSemana ?? 0;
    if (week === semana) return true;
    if (!e.dataRegistro) return false;
    const d = e.dataRegistro?.toDate ? e.dataRegistro.toDate() : new Date(e.dataRegistro);
    if (isNaN(d.getTime())) return false;
    d.setHours(0, 0, 0, 0);
    const diff = Math.abs(d.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 3;
  });
}

function listarAplicacoesDoPaciente(paciente: any): Array<{ data: Date; semana: number; dose: number; localAplicacao: string }> {
  const plano = paciente?.planoTerapeutico;
  if (!plano?.startDate) return [];
  const numeroSemanas = Number(plano.numeroSemanasTratamento) || 18;
  const semanasCanceladas = new Set<number>(plano.semanasCanceladas || []);
  const evolucao = paciente.evolucaoSeguimento || [];
  const aplicacoes: Array<{ data: Date; semana: number; dose: number; localAplicacao: string }> = [];
  for (let semana = 1; semana <= numeroSemanas; semana++) {
    if (semanasCanceladas.has(semana)) continue;
    const dataDose = dataPrevistaSemanaComoEsquema(plano, semana, evolucao);
    dataDose.setHours(0, 0, 0, 0);
    const registro = obterRegistroAplicacao(paciente, dataDose, semana);
    const adesaoPerdida = registro?.adherence === 'MISSED' || registro?.adesao === 'esquecida';
    const jaAplicada = !!(registro?.doseAplicada?.quantidade && registro.doseAplicada.quantidade > 0 && !adesaoPerdida);
    if (jaAplicada) continue;
    const doseCustom = plano.esquemaDosesCustomizado?.[semana];
    const doseAplicada = registro?.doseAplicada?.quantidade;
    const dose = Number(doseCustom ?? doseAplicada ?? (plano.currentDoseMg || 2.5));
    aplicacoes.push({ data: dataDose, semana, dose, localAplicacao: 'abdome' });
  }
  return aplicacoes;
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
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

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
        const aplicacoesPaciente = listarAplicacoesDoPaciente(paciente);
        aplicacoesPaciente.forEach(item => {
          const dataItem = new Date(item.data);
          dataItem.setHours(0, 0, 0, 0);
          if (dataItem.getTime() === hoje.getTime()) {
            aplicacoes.push({
              pacienteNome: paciente.nome || paciente.dadosIdentificacao?.nomeCompleto || 'Paciente',
              semana: item.semana,
              dose: item.dose,
              localAplicacao: item.localAplicacao
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
      
      const assunto = assuntoTemplate.replace(/\{medico\}/g, medicoNomeCompleto);
      let html = corpoTemplate.replace(/\{medico\}/g, medicoNomeCompleto);
      html = html.replace(/\{agenda_diario\}/g, agendaFormatada);
      html = html.replace(/\{aplicacoesHtml\}/g, formatarAgendaDiaria(aplicacoes, []));
      html = html.replace(/\{pagamentosHtml\}/g, formatarAgendaDiaria([], pagamentos));
      
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
