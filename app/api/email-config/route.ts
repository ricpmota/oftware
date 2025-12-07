import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailConfig } from '@/types/emailConfig';

// Função para obter Firestore Admin
function getAdminFirestore() {
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

// Remove valores undefined recursivamente
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore();
    const emailsCollection = db.collection('emails');
    
    // Buscar e-mails do módulo Leads
    const emailTypes = ['email1', 'email2', 'email3', 'email4', 'email5'];
    const leads: any = {
      email1: { assunto: '', corpoHtml: '' },
      email2: { assunto: '', corpoHtml: '' },
      email3: { assunto: '', corpoHtml: '' },
      email4: { assunto: '', corpoHtml: '' },
      email5: { assunto: '', corpoHtml: '' },
    };
    
    for (const emailTipo of emailTypes) {
      const emailDoc = await emailsCollection.doc(`leads_${emailTipo}`).get();
      if (emailDoc.exists) {
        const data = emailDoc.data();
        leads[emailTipo] = {
          assunto: data?.assunto || '',
          corpoHtml: data?.corpoHtml || '',
          corpoTexto: data?.corpoTexto || '',
        };
      } else {
        // Fallback: tentar buscar na estrutura antiga
        const oldDoc = await emailsCollection.doc(emailTipo).get();
        if (oldDoc.exists) {
          const data = oldDoc.data();
          leads[emailTipo] = {
            assunto: data?.assunto || '',
            corpoHtml: data?.corpoHtml || '',
            corpoTexto: data?.corpoTexto || '',
          };
        }
      }
    }
    
    // Buscar e-mail do módulo Solicitado Médico
    const solicitadoMedicoDoc = await emailsCollection.doc('solicitado_medico_boas_vindas').get();
    const solicitado_medico = {
      boas_vindas: solicitadoMedicoDoc.exists ? {
        assunto: solicitadoMedicoDoc.data()?.assunto || '',
        corpoHtml: solicitadoMedicoDoc.data()?.corpoHtml || '',
        corpoTexto: solicitadoMedicoDoc.data()?.corpoTexto || '',
      } : {
        assunto: 'Bem-vindo ao tratamento!',
        corpoHtml: '<p>Olá,</p><p>Parabéns! Você foi aceito pelo Dr(a). {medico}.</p><p>Seu tratamento começará em {inicio} e terá duração de {semanas} semanas.</p>',
      },
    };
    
    // Buscar e-mail do módulo Em Tratamento
    const emTratamentoDoc = await emailsCollection.doc('em_tratamento_plano_editado').get();
    const em_tratamento = {
      plano_editado: emTratamentoDoc.exists ? {
        assunto: emTratamentoDoc.data()?.assunto || '',
        corpoHtml: emTratamentoDoc.data()?.corpoHtml || '',
        corpoTexto: emTratamentoDoc.data()?.corpoTexto || '',
      } : {
        assunto: 'Seu plano de tratamento foi atualizado',
        corpoHtml: '<p>Olá,</p><p>O Dr(a). {medico} atualizou seu plano de tratamento.</p><p>Início: {inicio}</p><p>Duração: {semanas} semanas</p>',
      },
    };
    
    // Buscar e-mail do módulo Novo Lead Médico
    const novoLeadMedicoDoc = await emailsCollection.doc('novo_lead_medico_novo_lead').get();
    const novo_lead_medico = {
      novo_lead: novoLeadMedicoDoc.exists ? {
        assunto: novoLeadMedicoDoc.data()?.assunto || '',
        corpoHtml: novoLeadMedicoDoc.data()?.corpoHtml || '',
        corpoTexto: novoLeadMedicoDoc.data()?.corpoTexto || '',
      } : {
        assunto: 'Novo lead disponível',
        corpoHtml: '<p>Olá Dr(a). {medico},</p><p>Você tem um novo lead: {nome}</p>',
      },
    };
    
    // Buscar e-mails do módulo Aplicação
    const aplicacaoAntesDoc = await emailsCollection.doc('aplicacao_aplicacao_antes').get();
    const aplicacaoDiaDoc = await emailsCollection.doc('aplicacao_aplicacao_dia').get();
    const aplicacao = {
      aplicacao_antes: aplicacaoAntesDoc.exists ? {
        assunto: aplicacaoAntesDoc.data()?.assunto || '',
        corpoHtml: aplicacaoAntesDoc.data()?.corpoHtml || '',
        corpoTexto: aplicacaoAntesDoc.data()?.corpoTexto || '',
      } : {
        assunto: 'Lembrete: Aplicação amanhã',
        corpoHtml: '<p>Olá {nome},</p><p>Este é um lembrete de que sua aplicação #{numero} será amanhã.</p><p>Médico responsável: Dr(a). {medico}</p>',
      },
      aplicacao_dia: aplicacaoDiaDoc.exists ? {
        assunto: aplicacaoDiaDoc.data()?.assunto || '',
        corpoHtml: aplicacaoDiaDoc.data()?.corpoHtml || '',
        corpoTexto: aplicacaoDiaDoc.data()?.corpoTexto || '',
      } : {
        assunto: 'Lembrete: Aplicação hoje',
        corpoHtml: '<p>Olá {nome},</p><p>Lembrete: sua aplicação #{numero} é hoje!</p><p>Médico responsável: Dr(a). {medico}</p>',
      },
    };
    
    // Buscar e-mail do módulo Lead Avulso
    const leadAvulsoDoc = await emailsCollection.doc('lead_avulso_novo_lead').get();
    const lead_avulso = {
      novo_lead: leadAvulsoDoc.exists ? {
        assunto: leadAvulsoDoc.data()?.assunto || '',
        corpoHtml: leadAvulsoDoc.data()?.corpoHtml || '',
        corpoTexto: leadAvulsoDoc.data()?.corpoTexto || '',
      } : {
        assunto: 'Novo lead cadastrado',
        corpoHtml: '<p>Olá,</p><p>Um novo lead foi cadastrado: {nome}</p>',
      },
    };
    
    // Buscar e-mail do módulo Check Recomendações
    const checkRecomendacoesDoc = await emailsCollection.doc('check_recomendacoes_recomendacoes_lidas').get();
    const check_recomendacoes = {
      recomendacoes_lidas: checkRecomendacoesDoc.exists ? {
        assunto: checkRecomendacoesDoc.data()?.assunto || '',
        corpoHtml: checkRecomendacoesDoc.data()?.corpoHtml || '',
        corpoTexto: checkRecomendacoesDoc.data()?.corpoTexto || '',
      } : {
        assunto: 'Paciente leu as recomendações',
        corpoHtml: '<p>Olá Dr(a). {medico},</p><p>O paciente {nome} leu as recomendações no painel.</p>',
      },
    };
    
    // Buscar e-mail do módulo Novidades
    const novidadesDoc = await emailsCollection.doc('novidades_novidade').get();
    const novidades = {
      novidade: novidadesDoc.exists ? {
        assunto: novidadesDoc.data()?.assunto || '',
        corpoHtml: novidadesDoc.data()?.corpoHtml || '',
        corpoTexto: novidadesDoc.data()?.corpoTexto || '',
      } : {
        assunto: 'Novidades do Oftware',
        corpoHtml: '<p>Olá {nome},</p><p>Temos novidades para você!</p>',
      },
    };
    
    // Buscar configuração
    const configDoc = await emailsCollection.doc('config').get();
    const configData = configDoc.exists ? configDoc.data() : {};
    
    const config: EmailConfig = {
      id: 'config',
      leads: leads,
      solicitado_medico: solicitado_medico,
      em_tratamento: em_tratamento,
      novo_lead_medico: novo_lead_medico,
      aplicacao: aplicacao,
      lead_avulso: lead_avulso,
      check_recomendacoes: check_recomendacoes,
      novidades: novidades,
      envioAutomatico: configData?.envioAutomatico || { ativo: false },
      createdAt: configData?.createdAt?.toDate(),
      updatedAt: configData?.updatedAt?.toDate(),
    };
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configuração', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let config;
    try {
      const body = await request.json();
      config = body;
      console.log('📧 Recebendo configuração de e-mail...');
      console.log('📋 Estrutura recebida:', {
        temEmails: !!config.emails,
        temEnvioAutomatico: !!config.envioAutomatico,
        emailKeys: config.emails ? Object.keys(config.emails) : []
      });
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      return NextResponse.json(
        { error: 'Erro ao processar dados recebidos', details: parseError instanceof Error ? parseError.message : 'Erro desconhecido' },
        { status: 400 }
      );
    }
    
    // Validar estrutura básica
    if (!config) {
      return NextResponse.json(
        { error: 'Configuração não fornecida' },
        { status: 400 }
      );
    }

    // Validar módulo Leads
    if (!config.leads) {
      console.error('❌ Estrutura de e-mails Leads não encontrada');
      return NextResponse.json(
        { error: 'Estrutura de e-mails Leads inválida' },
        { status: 400 }
      );
    }

    const requiredLeads: Array<'email1' | 'email2' | 'email3' | 'email4' | 'email5'> = ['email1', 'email2', 'email3', 'email4', 'email5'];
    for (const emailTipo of requiredLeads) {
      if (!config.leads[emailTipo]) {
        console.error(`❌ E-mail ${emailTipo} não encontrado`);
        return NextResponse.json(
          { error: `E-mail ${emailTipo} não encontrado na configuração` },
          { status: 400 }
        );
      }
      if (!config.leads[emailTipo].assunto || !config.leads[emailTipo].corpoHtml) {
        console.error(`❌ E-mail ${emailTipo} incompleto`);
        return NextResponse.json(
          { error: `E-mail ${emailTipo} está incompleto (assunto e corpoHtml são obrigatórios)` },
          { status: 400 }
        );
      }
    }

    // Validar módulo Solicitado Médico
    if (!config.solicitado_medico || !config.solicitado_medico.boas_vindas) {
      return NextResponse.json(
        { error: 'E-mail de boas-vindas (Solicitado Médico) não encontrado' },
        { status: 400 }
      );
    }
    if (!config.solicitado_medico.boas_vindas.assunto || !config.solicitado_medico.boas_vindas.corpoHtml) {
      return NextResponse.json(
        { error: 'E-mail de boas-vindas está incompleto (assunto e corpoHtml são obrigatórios)' },
        { status: 400 }
      );
    }

    // Validar módulo Em Tratamento
    if (!config.em_tratamento || !config.em_tratamento.plano_editado) {
      return NextResponse.json(
        { error: 'E-mail de plano editado (Em Tratamento) não encontrado' },
        { status: 400 }
      );
    }
    if (!config.em_tratamento.plano_editado.assunto || !config.em_tratamento.plano_editado.corpoHtml) {
      return NextResponse.json(
        { error: 'E-mail de plano editado está incompleto (assunto e corpoHtml são obrigatórios)' },
        { status: 400 }
      );
    }

    // Validar módulo Novo Lead Médico
    if (!config.novo_lead_medico || !config.novo_lead_medico.novo_lead) {
      return NextResponse.json(
        { error: 'E-mail de novo lead (Novo Lead Médico) não encontrado' },
        { status: 400 }
      );
    }
    if (!config.novo_lead_medico.novo_lead.assunto || !config.novo_lead_medico.novo_lead.corpoHtml) {
      return NextResponse.json(
        { error: 'E-mail de novo lead médico está incompleto (assunto e corpoHtml são obrigatórios)' },
        { status: 400 }
      );
    }

    // Validar módulo Aplicação
    if (!config.aplicacao || !config.aplicacao.aplicacao_antes || !config.aplicacao.aplicacao_dia) {
      return NextResponse.json(
        { error: 'E-mails de aplicação não encontrados' },
        { status: 400 }
      );
    }
    if (!config.aplicacao.aplicacao_antes.assunto || !config.aplicacao.aplicacao_antes.corpoHtml) {
      return NextResponse.json(
        { error: 'E-mail de aplicação antes está incompleto (assunto e corpoHtml são obrigatórios)' },
        { status: 400 }
      );
    }
    if (!config.aplicacao.aplicacao_dia.assunto || !config.aplicacao.aplicacao_dia.corpoHtml) {
      return NextResponse.json(
        { error: 'E-mail de aplicação dia está incompleto (assunto e corpoHtml são obrigatórios)' },
        { status: 400 }
      );
    }

    // Validar módulo Lead Avulso
    if (!config.lead_avulso || !config.lead_avulso.novo_lead) {
      return NextResponse.json(
        { error: 'E-mail de lead avulso não encontrado' },
        { status: 400 }
      );
    }
    if (!config.lead_avulso.novo_lead.assunto || !config.lead_avulso.novo_lead.corpoHtml) {
      return NextResponse.json(
        { error: 'E-mail de lead avulso está incompleto (assunto e corpoHtml são obrigatórios)' },
        { status: 400 }
      );
    }

    // Validar módulo Check Recomendações
    if (!config.check_recomendacoes || !config.check_recomendacoes.recomendacoes_lidas) {
      return NextResponse.json(
        { error: 'E-mail de check recomendações não encontrado' },
        { status: 400 }
      );
    }
    if (!config.check_recomendacoes.recomendacoes_lidas.assunto || !config.check_recomendacoes.recomendacoes_lidas.corpoHtml) {
      return NextResponse.json(
        { error: 'E-mail de check recomendações está incompleto (assunto e corpoHtml são obrigatórios)' },
        { status: 400 }
      );
    }

    // Validar módulo Novidades
    if (!config.novidades || !config.novidades.novidade) {
      return NextResponse.json(
        { error: 'E-mail de novidades não encontrado' },
        { status: 400 }
      );
    }
    if (!config.novidades.novidade.assunto || !config.novidades.novidade.corpoHtml) {
      return NextResponse.json(
        { error: 'E-mail de novidades está incompleto (assunto e corpoHtml são obrigatórios)' },
        { status: 400 }
      );
    }

    console.log('✅ Validação passou, salvando configuração...');
    
    try {
      const db = getAdminFirestore();
      const emailsCollection = db.collection('emails');
      const agora = new Date();
      
      // Salvar e-mails do módulo Leads
      for (const emailTipo of requiredLeads) {
        const emailData = config.leads[emailTipo];
        const emailDocRef = emailsCollection.doc(`leads_${emailTipo}`);
        const existingDoc = await emailDocRef.get();
        
        const emailDoc: any = {
          assunto: String(emailData.assunto || '').trim(),
          corpoHtml: String(emailData.corpoHtml || '').trim(),
          updatedAt: agora,
        };
        
        if (emailData.corpoTexto && emailData.corpoTexto.trim()) {
          emailDoc.corpoTexto = String(emailData.corpoTexto).trim();
        }
        
        if (!existingDoc.exists) {
          emailDoc.createdAt = agora;
        }
        
        const cleanedData = removeUndefined(emailDoc);
        await emailDocRef.set(cleanedData);
        console.log(`✅ leads_${emailTipo} salvo com sucesso`);
      }
      
      // Salvar e-mail do módulo Solicitado Médico
      const solicitadoMedicoData = config.solicitado_medico.boas_vindas;
      const solicitadoMedicoRef = emailsCollection.doc('solicitado_medico_boas_vindas');
      const existingSolicitadoMedico = await solicitadoMedicoRef.get();
      
      const solicitadoMedicoDoc: any = {
        assunto: String(solicitadoMedicoData.assunto || '').trim(),
        corpoHtml: String(solicitadoMedicoData.corpoHtml || '').trim(),
        updatedAt: agora,
      };
      
      if (solicitadoMedicoData.corpoTexto && solicitadoMedicoData.corpoTexto.trim()) {
        solicitadoMedicoDoc.corpoTexto = String(solicitadoMedicoData.corpoTexto).trim();
      }
      
      if (!existingSolicitadoMedico.exists) {
        solicitadoMedicoDoc.createdAt = agora;
      }
      
      const cleanedSolicitadoMedico = removeUndefined(solicitadoMedicoDoc);
      await solicitadoMedicoRef.set(cleanedSolicitadoMedico);
      console.log('✅ solicitado_medico_boas_vindas salvo com sucesso');
      
      // Salvar e-mail do módulo Em Tratamento
      const emTratamentoData = config.em_tratamento.plano_editado;
      const emTratamentoRef = emailsCollection.doc('em_tratamento_plano_editado');
      const existingEmTratamento = await emTratamentoRef.get();
      
      const emTratamentoDoc: any = {
        assunto: String(emTratamentoData.assunto || '').trim(),
        corpoHtml: String(emTratamentoData.corpoHtml || '').trim(),
        updatedAt: agora,
      };
      
      if (emTratamentoData.corpoTexto && emTratamentoData.corpoTexto.trim()) {
        emTratamentoDoc.corpoTexto = String(emTratamentoData.corpoTexto).trim();
      }
      
      if (!existingEmTratamento.exists) {
        emTratamentoDoc.createdAt = agora;
      }
      
      const cleanedEmTratamento = removeUndefined(emTratamentoDoc);
      await emTratamentoRef.set(cleanedEmTratamento);
      console.log('✅ em_tratamento_plano_editado salvo com sucesso');
      
      // Salvar e-mail do módulo Novo Lead Médico
      const novoLeadMedicoData = config.novo_lead_medico.novo_lead;
      const novoLeadMedicoRef = emailsCollection.doc('novo_lead_medico_novo_lead');
      const existingNovoLeadMedico = await novoLeadMedicoRef.get();
      
      const novoLeadMedicoDoc: any = {
        assunto: String(novoLeadMedicoData.assunto || '').trim(),
        corpoHtml: String(novoLeadMedicoData.corpoHtml || '').trim(),
        updatedAt: agora,
      };
      
      if (novoLeadMedicoData.corpoTexto && novoLeadMedicoData.corpoTexto.trim()) {
        novoLeadMedicoDoc.corpoTexto = String(novoLeadMedicoData.corpoTexto).trim();
      }
      
      if (!existingNovoLeadMedico.exists) {
        novoLeadMedicoDoc.createdAt = agora;
      }
      
      const cleanedNovoLeadMedico = removeUndefined(novoLeadMedicoDoc);
      await novoLeadMedicoRef.set(cleanedNovoLeadMedico);
      console.log('✅ novo_lead_medico_novo_lead salvo com sucesso');
      
      // Salvar e-mails do módulo Aplicação
      const aplicacaoAntesData = config.aplicacao.aplicacao_antes;
      const aplicacaoAntesRef = emailsCollection.doc('aplicacao_aplicacao_antes');
      const existingAplicacaoAntes = await aplicacaoAntesRef.get();
      
      const aplicacaoAntesDoc: any = {
        assunto: String(aplicacaoAntesData.assunto || '').trim(),
        corpoHtml: String(aplicacaoAntesData.corpoHtml || '').trim(),
        updatedAt: agora,
      };
      
      if (aplicacaoAntesData.corpoTexto && aplicacaoAntesData.corpoTexto.trim()) {
        aplicacaoAntesDoc.corpoTexto = String(aplicacaoAntesData.corpoTexto).trim();
      }
      
      if (!existingAplicacaoAntes.exists) {
        aplicacaoAntesDoc.createdAt = agora;
      }
      
      const cleanedAplicacaoAntes = removeUndefined(aplicacaoAntesDoc);
      await aplicacaoAntesRef.set(cleanedAplicacaoAntes);
      console.log('✅ aplicacao_aplicacao_antes salvo com sucesso');
      
      const aplicacaoDiaData = config.aplicacao.aplicacao_dia;
      const aplicacaoDiaRef = emailsCollection.doc('aplicacao_aplicacao_dia');
      const existingAplicacaoDia = await aplicacaoDiaRef.get();
      
      const aplicacaoDiaDoc: any = {
        assunto: String(aplicacaoDiaData.assunto || '').trim(),
        corpoHtml: String(aplicacaoDiaData.corpoHtml || '').trim(),
        updatedAt: agora,
      };
      
      if (aplicacaoDiaData.corpoTexto && aplicacaoDiaData.corpoTexto.trim()) {
        aplicacaoDiaDoc.corpoTexto = String(aplicacaoDiaData.corpoTexto).trim();
      }
      
      if (!existingAplicacaoDia.exists) {
        aplicacaoDiaDoc.createdAt = agora;
      }
      
      const cleanedAplicacaoDia = removeUndefined(aplicacaoDiaDoc);
      await aplicacaoDiaRef.set(cleanedAplicacaoDia);
      console.log('✅ aplicacao_aplicacao_dia salvo com sucesso');
      
      // Salvar e-mail do módulo Lead Avulso
      const leadAvulsoData = config.lead_avulso.novo_lead;
      const leadAvulsoRef = emailsCollection.doc('lead_avulso_novo_lead');
      const existingLeadAvulso = await leadAvulsoRef.get();
      
      const leadAvulsoDoc: any = {
        assunto: String(leadAvulsoData.assunto || '').trim(),
        corpoHtml: String(leadAvulsoData.corpoHtml || '').trim(),
        updatedAt: agora,
      };
      
      if (leadAvulsoData.corpoTexto && leadAvulsoData.corpoTexto.trim()) {
        leadAvulsoDoc.corpoTexto = String(leadAvulsoData.corpoTexto).trim();
      }
      
      if (!existingLeadAvulso.exists) {
        leadAvulsoDoc.createdAt = agora;
      }
      
      const cleanedLeadAvulso = removeUndefined(leadAvulsoDoc);
      await leadAvulsoRef.set(cleanedLeadAvulso);
      console.log('✅ lead_avulso_novo_lead salvo com sucesso');
      
      // Salvar e-mail do módulo Check Recomendações
      const checkRecomendacoesData = config.check_recomendacoes.recomendacoes_lidas;
      const checkRecomendacoesRef = emailsCollection.doc('check_recomendacoes_recomendacoes_lidas');
      const existingCheckRecomendacoes = await checkRecomendacoesRef.get();
      
      const checkRecomendacoesDoc: any = {
        assunto: String(checkRecomendacoesData.assunto || '').trim(),
        corpoHtml: String(checkRecomendacoesData.corpoHtml || '').trim(),
        updatedAt: agora,
      };
      
      if (checkRecomendacoesData.corpoTexto && checkRecomendacoesData.corpoTexto.trim()) {
        checkRecomendacoesDoc.corpoTexto = String(checkRecomendacoesData.corpoTexto).trim();
      }
      
      if (!existingCheckRecomendacoes.exists) {
        checkRecomendacoesDoc.createdAt = agora;
      }
      
      const cleanedCheckRecomendacoes = removeUndefined(checkRecomendacoesDoc);
      await checkRecomendacoesRef.set(cleanedCheckRecomendacoes);
      console.log('✅ check_recomendacoes_recomendacoes_lidas salvo com sucesso');
      
      // Salvar e-mail do módulo Bem-vindo
      if (config.bem_vindo && config.bem_vindo.bem_vindo) {
        const bemVindoData = config.bem_vindo.bem_vindo;
        const bemVindoRef = emailsCollection.doc('bem_vindo_bem_vindo');
        const existingBemVindo = await bemVindoRef.get();
        
        const bemVindoDoc: any = {
          assunto: String(bemVindoData.assunto || '').trim(),
          corpoHtml: String(bemVindoData.corpoHtml || '').trim(),
          updatedAt: agora,
        };
        
        if (bemVindoData.corpoTexto && bemVindoData.corpoTexto.trim()) {
          bemVindoDoc.corpoTexto = String(bemVindoData.corpoTexto).trim();
        }
        
        if (!existingBemVindo.exists) {
          bemVindoDoc.createdAt = agora;
        }
        
        const cleanedBemVindo = removeUndefined(bemVindoDoc);
        await bemVindoRef.set(cleanedBemVindo);
        console.log('✅ bem_vindo_bem_vindo salvo com sucesso');
      }
      
      // Salvar e-mail do módulo Novidades
      const novidadesData = config.novidades.novidade;
      const novidadesRef = emailsCollection.doc('novidades_novidade');
      const existingNovidades = await novidadesRef.get();
      
      const novidadesDoc: any = {
        assunto: String(novidadesData.assunto || '').trim(),
        corpoHtml: String(novidadesData.corpoHtml || '').trim(),
        updatedAt: agora,
      };
      
      if (novidadesData.corpoTexto && novidadesData.corpoTexto.trim()) {
        novidadesDoc.corpoTexto = String(novidadesData.corpoTexto).trim();
      }
      
      if (!existingNovidades.exists) {
        novidadesDoc.createdAt = agora;
      }
      
      const cleanedNovidades = removeUndefined(novidadesDoc);
      await novidadesRef.set(cleanedNovidades);
      console.log('✅ novidades_novidade salvo com sucesso');
      
      // Salvar configuração
      const configDocRef = emailsCollection.doc('config');
      const existingConfig = await configDocRef.get();
      
      const configData: any = {
        envioAutomatico: {
          ativo: Boolean(config.envioAutomatico?.ativo || false),
        },
        updatedAt: agora,
      };
      
      if (!existingConfig.exists) {
        configData.createdAt = agora;
      }
      
      const cleanedConfigData = removeUndefined(configData);
      await configDocRef.set(cleanedConfigData);
      console.log('✅ Configuração de envio automático salva com sucesso');
      
      return NextResponse.json({ success: true });
    } catch (saveError) {
      console.error('❌ Erro ao salvar no Firestore:', saveError);
      const saveErrorMessage = saveError instanceof Error ? saveError.message : 'Erro desconhecido';
      console.error('Stack trace:', saveError instanceof Error ? saveError.stack : 'N/A');
      return NextResponse.json(
        { 
          error: 'Erro ao salvar no banco de dados',
          details: saveErrorMessage 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Erro geral ao processar requisição:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorStack = error instanceof Error ? error.stack : 'N/A';
    console.error('Detalhes do erro:', errorMessage);
    console.error('Stack trace:', errorStack);
    return NextResponse.json(
      { 
        error: 'Erro ao salvar configuração',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

