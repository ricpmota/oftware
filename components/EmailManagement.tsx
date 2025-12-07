'use client';

import { useState, useEffect } from 'react';
import { EmailConfig, EmailTipo, EmailModulo } from '@/types/emailConfig';
import { EmailInbox } from '@/types/emailConfig';
import { Lead } from '@/types/lead';
import { Mail, Send, Save, Settings, Inbox, RefreshCw, BarChart3, SendHorizontal, Folder, Users, UserCheck, Activity } from 'lucide-react';
import LeadsEmailDashboard from './LeadsEmailDashboard';

interface EmailManagementProps {
  leads: Lead[];
}

const emailInfoLeads = {
  email1: { nome: 'E-mail 1', tempo: 'Imediato (1h)', descricao: 'Assim que o lead criar a conta sem escolher médico' },
  email2: { nome: 'E-mail 2', tempo: '24 horas depois', descricao: 'O paciente ainda está quente, curioso e aberto' },
  email3: { nome: 'E-mail 3', tempo: '72 horas (3 dias)', descricao: 'Momento perfeito para reacender o desejo e reforçar benefícios' },
  email4: { nome: 'E-mail 4', tempo: '7 dias depois', descricao: 'E-mail de objeção — quando geralmente o lead esfria' },
  email5: { nome: 'E-mail 5', tempo: '14 dias depois', descricao: 'Último aviso, com urgência leve. Grande parte das conversões tardias' },
};

const emailInfoSolicitadoMedico = {
  boas_vindas: { nome: 'Boas-vindas', descricao: 'Enviado quando solicitacao_medico status = aceita (início do tratamento)' },
};

const emailInfoEmTratamento = {
  plano_editado: { nome: 'Plano Editado', descricao: 'Enviado quando o médico edita o Plano de Tratamento do paciente' },
};

const emailInfoNovoLeadMedico = {
  novo_lead: { nome: 'Novo Lead', descricao: 'Avisa ao médico que chegou um novo lead (nova solicitacao_medico)' },
};

const emailInfoAplicacao = {
  aplicacao_antes: { nome: 'Aplicação Antes', descricao: 'Aviso 1 dia antes da aplicação do tratamento' },
  aplicacao_dia: { nome: 'Aplicação Dia', descricao: 'Aviso no dia da aplicação do tratamento' },
};

const emailInfoLeadAvulso = {
  novo_lead: { nome: 'Novo Lead Avulso', descricao: 'Aviso de novo lead para o Gestor Admin geral' },
};

const emailInfoCheckRecomendacoes = {
  recomendacoes_lidas: { nome: 'Recomendações Lidas', descricao: 'Avisa ao médico que o paciente leu as recomendações' },
};

const emailInfoNovidades = {
  novidade: { nome: 'Novidade', descricao: 'E-mail em massa para pacientes ou médicos' },
};

const emailInfoBemVindo = {
  bem_vindo_geral: { nome: 'Bem-vindo Geral', descricao: 'E-mail enviado automaticamente quando um novo cliente se cadastra' },
  bem_vindo_medico: { nome: 'Bem-vindo Médico', descricao: 'E-mail enviado quando um médico salva o perfil pela primeira vez' },
};

export default function EmailManagement({ leads }: EmailManagementProps) {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inbox, setInbox] = useState<EmailInbox[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [outbox, setOutbox] = useState<any[]>([]);
  const [loadingOutbox, setLoadingOutbox] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'outbox' | 'inbox' | 'dashboard'>('config');
  const [pastaEmailSelecionada, setPastaEmailSelecionada] = useState<string | null>(null);
  const [activeModulo, setActiveModulo] = useState<EmailModulo>('leads');
  const [activeEmail, setActiveEmail] = useState<string>('email1');
  const [enviandoNovidades, setEnviandoNovidades] = useState(false);
  const [modoEnvioNovidades, setModoEnvioNovidades] = useState<'massa' | 'especifico'>('massa');
  const [pacientesDisponiveis, setPacientesDisponiveis] = useState<Array<{id: string; nome: string; email: string}>>([]);
  const [medicosDisponiveis, setMedicosDisponiveis] = useState<Array<{id: string; nome: string; email: string}>>([]);
  const [pacientesSelecionados, setPacientesSelecionados] = useState<string[]>([]);
  const [medicosSelecionados, setMedicosSelecionados] = useState<string[]>([]);
  const [loadingDestinatarios, setLoadingDestinatarios] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  // Carregar pacientes e médicos quando o modo específico for ativado
  useEffect(() => {
    if (activeModulo === 'novidades' && modoEnvioNovidades === 'especifico' && pacientesDisponiveis.length === 0) {
      loadDestinatarios();
    }
  }, [activeModulo, modoEnvioNovidades]);

  const loadDestinatarios = async () => {
    setLoadingDestinatarios(true);
    try {
      // Buscar pacientes
      const pacientesResponse = await fetch('/api/pacientes-para-email');
      if (pacientesResponse.ok) {
        const pacientesData = await pacientesResponse.json();
        setPacientesDisponiveis(pacientesData.pacientes || []);
      }

      // Buscar médicos
      const medicosResponse = await fetch('/api/medicos-para-email');
      if (medicosResponse.ok) {
        const medicosData = await medicosResponse.json();
        setMedicosDisponiveis(medicosData.medicos || []);
      }
    } catch (error) {
      console.error('Erro ao carregar destinatários:', error);
    } finally {
      setLoadingDestinatarios(false);
    }
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/email-config');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          // Migrar estrutura antiga para nova se necessário
          if (data.emails && !data.leads) {
            setConfig({
              leads: data.emails,
              solicitado_medico: {
                boas_vindas: {
                  assunto: 'Bem-vindo ao tratamento!',
                  corpoHtml: '<p>Olá,</p><p>Parabéns! Você foi aceito pelo Dr(a). {medico}.</p><p>Seu tratamento começará em {inicio} e terá duração de {semanas} semanas.</p>',
                },
              },
              em_tratamento: {
                plano_editado: {
                  assunto: 'Seu plano de tratamento foi atualizado',
                  corpoHtml: '<p>Olá,</p><p>O Dr(a). {medico} atualizou seu plano de tratamento.</p><p>Início: {inicio}</p><p>Duração: {semanas} semanas</p>',
                },
              },
              envioAutomatico: data.envioAutomatico || { ativo: false },
            });
          } else {
            // Garantir que todos os módulos existam, mesmo que não venham do servidor
            const configCompleto = {
              ...data,
              bem_vindo: data.bem_vindo || {
                bem_vindo_geral: {
                  assunto: 'Bem-vindo ao Oftware!',
                  corpoHtml: '<p>Olá {nome},</p><p>Bem-vindo ao Oftware! Estamos muito felizes em tê-lo conosco.</p><p>Seu cadastro foi realizado com sucesso!</p>',
                },
                bem_vindo_medico: {
                  assunto: 'Bem-vindo ao Oftware, Dr(a). {nome}!',
                  corpoHtml: '<p>Olá Dr(a). {nome},</p><p>Bem-vindo ao Oftware! Seu perfil médico foi criado com sucesso.</p><p>Estamos felizes em tê-lo em nossa plataforma!</p>',
                },
              },
              novidades: data.novidades || {
                novidade: {
                  assunto: 'Novidades do Oftware',
                  corpoHtml: '<p>Olá {nome},</p><p>Temos novidades para você!</p>',
                },
              },
            };
            setConfig(configCompleto);
          }
        } else {
          // Configuração padrão
          setConfig({
            leads: {
              email1: {
                assunto: 'Bem-vindo ao Oftware!',
                corpoHtml: '<p>Olá {nome},</p><p>Ficamos muito felizes em ter você conosco!</p>',
              },
              email2: {
                assunto: 'Você ainda está aqui? Vamos continuar!',
                corpoHtml: '<p>Oi {nome}, tudo bem?</p><p>Esperamos que esteja tudo certo por aí!</p>',
              },
              email3: {
                assunto: 'Reacenda sua jornada de bem-estar',
                corpoHtml: '<p>{nome}, vamos reacender essa chama?</p><p>Passaram alguns dias desde que você se cadastrou...</p>',
              },
              email4: {
                assunto: 'Superando objeções - Estamos aqui para ajudar',
                corpoHtml: '<p>{nome}, entendemos suas dúvidas</p><p>Sabemos que pode haver algumas preocupações...</p>',
              },
              email5: {
                assunto: 'Última chance - Não perca essa oportunidade',
                corpoHtml: '<p>{nome}, esta é sua última chance!</p><p>Já faz duas semanas desde que você se cadastrou...</p>',
              },
            },
            solicitado_medico: {
              boas_vindas: {
                assunto: 'Bem-vindo ao tratamento!',
                corpoHtml: '<p>Olá,</p><p>Parabéns! Você foi aceito pelo Dr(a). {medico}.</p><p>Seu tratamento começará em {inicio} e terá duração de {semanas} semanas.</p>',
              },
            },
            em_tratamento: {
              plano_editado: {
                assunto: 'Seu plano de tratamento foi atualizado',
                corpoHtml: '<p>Olá,</p><p>O Dr(a). {medico} atualizou seu plano de tratamento.</p><p>Início: {inicio}</p><p>Duração: {semanas} semanas</p>',
              },
            },
            novo_lead_medico: {
              novo_lead: {
                assunto: 'Novo lead disponível',
                corpoHtml: '<p>Olá Dr(a). {medico},</p><p>Você tem um novo lead: {nome}</p>',
              },
            },
            aplicacao: {
              aplicacao_antes: {
                assunto: 'Lembrete: Aplicação amanhã',
                corpoHtml: '<p>Olá {nome},</p><p>Este é um lembrete de que sua aplicação #{numero} será amanhã.</p><p>Médico responsável: Dr(a). {medico}</p>',
              },
              aplicacao_dia: {
                assunto: 'Lembrete: Aplicação hoje',
                corpoHtml: '<p>Olá {nome},</p><p>Lembrete: sua aplicação #{numero} é hoje!</p><p>Médico responsável: Dr(a). {medico}</p>',
              },
            },
            lead_avulso: {
              novo_lead: {
                assunto: 'Novo lead cadastrado',
                corpoHtml: '<p>Olá,</p><p>Um novo lead foi cadastrado: {nome}</p>',
              },
            },
            check_recomendacoes: {
              recomendacoes_lidas: {
                assunto: 'Paciente leu as recomendações',
                corpoHtml: '<p>Olá Dr(a). {medico},</p><p>O paciente {nome} leu as recomendações no painel.</p>',
              },
            },
            bem_vindo: {
              bem_vindo_geral: {
                assunto: 'Bem-vindo ao Oftware!',
                corpoHtml: '<p>Olá {nome},</p><p>Bem-vindo ao Oftware! Estamos muito felizes em tê-lo conosco.</p><p>Seu cadastro foi realizado com sucesso!</p>',
              },
              bem_vindo_medico: {
                assunto: 'Bem-vindo ao Oftware, Dr(a). {nome}!',
                corpoHtml: '<p>Olá Dr(a). {nome},</p><p>Bem-vindo ao Oftware! Seu perfil médico foi criado com sucesso.</p><p>Estamos felizes em tê-lo em nossa plataforma!</p>',
              },
            },
            novidades: {
              novidade: {
                assunto: 'Novidades do Oftware',
                corpoHtml: '<p>Olá {nome},</p><p>Temos novidades para você!</p>',
              },
            },
            envioAutomatico: {
              ativo: false,
            },
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) {
      alert('Configuração não carregada. Aguarde...');
      return;
    }
    
    // Validar estrutura antes de enviar
    const requiredLeads: Array<'email1' | 'email2' | 'email3' | 'email4' | 'email5'> = ['email1', 'email2', 'email3', 'email4', 'email5'];
    for (const emailTipo of requiredLeads) {
      if (!config.leads[emailTipo] || !config.leads[emailTipo].assunto || !config.leads[emailTipo].corpoHtml) {
        alert(`Por favor, preencha o ${emailTipo} do módulo Leads completamente (assunto e corpo são obrigatórios)`);
        return;
      }
    }

    if (!config.solicitado_medico.boas_vindas?.assunto || !config.solicitado_medico.boas_vindas?.corpoHtml) {
      alert('Por favor, preencha o e-mail de Boas-vindas do módulo Solicitado Médico completamente');
      return;
    }

    if (!config.em_tratamento.plano_editado?.assunto || !config.em_tratamento.plano_editado?.corpoHtml) {
      alert('Por favor, preencha o e-mail de Plano Editado do módulo Em Tratamento completamente');
      return;
    }

    // Validar novos módulos
    if (!config.novo_lead_medico?.novo_lead?.assunto || !config.novo_lead_medico?.novo_lead?.corpoHtml) {
      alert('Por favor, preencha o e-mail de Novo Lead do módulo Novo Lead Médico completamente');
      return;
    }

    if (!config.aplicacao?.aplicacao_antes?.assunto || !config.aplicacao?.aplicacao_antes?.corpoHtml) {
      alert('Por favor, preencha o e-mail de Aplicação Antes do módulo Aplicação completamente');
      return;
    }

    if (!config.aplicacao?.aplicacao_dia?.assunto || !config.aplicacao?.aplicacao_dia?.corpoHtml) {
      alert('Por favor, preencha o e-mail de Aplicação Dia do módulo Aplicação completamente');
      return;
    }

    if (!config.lead_avulso?.novo_lead?.assunto || !config.lead_avulso?.novo_lead?.corpoHtml) {
      alert('Por favor, preencha o e-mail de Novo Lead Avulso do módulo Lead Avulso completamente');
      return;
    }

    if (!config.check_recomendacoes?.recomendacoes_lidas?.assunto || !config.check_recomendacoes?.recomendacoes_lidas?.corpoHtml) {
      alert('Por favor, preencha o e-mail de Recomendações Lidas do módulo Check Recomendações completamente');
      return;
    }

    if (!config.bem_vindo?.bem_vindo_geral?.assunto || !config.bem_vindo?.bem_vindo_geral?.corpoHtml) {
      alert('Por favor, preencha o e-mail de Bem-vindo Geral do módulo Bem-vindo completamente');
      return;
    }

    if (!config.bem_vindo?.bem_vindo_medico?.assunto || !config.bem_vindo?.bem_vindo_medico?.corpoHtml) {
      alert('Por favor, preencha o e-mail de Bem-vindo Médico do módulo Bem-vindo completamente');
      return;
    }

    if (!config.novidades?.novidade?.assunto || !config.novidades?.novidade?.corpoHtml) {
      alert('Por favor, preencha o e-mail de Novidade do módulo Novidades completamente');
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch('/api/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        alert('Configuração salva com sucesso!');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error('Erro do servidor:', errorData);
        alert(`Erro ao salvar: ${errorData.error || errorData.details || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert(`Erro ao salvar configuração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const loadInbox = async () => {
    setLoadingInbox(true);
    try {
      const response = await fetch('/api/read-emails?limit=50');
      if (response.ok) {
        const data = await response.json();
        setInbox(data.emails || []);
      }
    } catch (error) {
      console.error('Erro ao carregar caixa de entrada:', error);
    } finally {
      setLoadingInbox(false);
    }
  };

  const loadOutbox = async () => {
    setLoadingOutbox(true);
    try {
      const response = await fetch('/api/email-envios');
      if (response.ok) {
        const data = await response.json();
        // A API retorna { envios: [...], count: ... }
        setOutbox(data.envios || data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar caixa de saída:', error);
    } finally {
      setLoadingOutbox(false);
    }
  };

  const sendTestEmail = async (modulo: EmailModulo, emailKey: string, leadId?: string) => {
    if (!config) {
      alert('Configuração não carregada');
      return;
    }

    setSaving(true);
    try {
      let emailTemplate;
      if (modulo === 'leads') {
        emailTemplate = config.leads[emailKey as EmailTipo];
        if (!leadId) {
          alert('Selecione um lead para teste');
          return;
        }
        const response = await fetch('/api/send-email-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            emailTipo: emailKey,
          }),
        });
        if (response.ok) {
          alert(`E-mail ${emailInfoLeads[emailKey as EmailTipo].nome} enviado com sucesso!`);
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao enviar');
        }
      } else {
        // Para outros módulos, ainda não implementado o envio de teste
        alert('Envio de teste para este módulo será implementado em breve');
      }
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      alert('Erro ao enviar e-mail de teste');
    } finally {
      setSaving(false);
    }
  };

  const leadsNaoQualificados = leads.filter(l => l.status === 'nao_qualificado');

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!config) {
    return <div className="p-6">Erro ao carregar configuração</div>;
  }

  const getVariaveisDisponiveis = (modulo: EmailModulo, emailTipo?: string): { variaveis: Array<{ nome: string; descricao: string }> } => {
    // Variável {nome} - Nome da pessoa cadastrada, independente se é paciente ou médico
    const variavelNome = { nome: '{nome}', descricao: 'Nome da pessoa cadastrada (paciente ou médico)' };
    
    // Variável {medico} - Nome do médico responsável pelo tratamento do paciente
    const variavelMedico = { nome: '{medico}', descricao: 'Nome do médico responsável pelo tratamento do paciente' };
    
    // Variável {inicio} - Data de início do tratamento configurada pelo médico
    const variavelInicio = { nome: '{inicio}', descricao: 'Data de início do tratamento configurada pelo médico' };
    
    // Variável {semanas} - Duração do tratamento definida pelo médico (ex: 12 semanas)
    const variavelSemanas = { nome: '{semanas}', descricao: 'Duração do tratamento definida pelo médico (ex: 12 semanas)' };
    
    // Variável {numero} - Número da aplicação da Tirzepatida (aplicação 1, 2, 3…)
    const variavelNumero = { nome: '{numero}', descricao: 'Número da aplicação da Tirzepatida (aplicação 1, 2, 3…)' };
    
    if (modulo === 'leads') {
      return {
        variaveis: [variavelNome]
      };
    } else if (modulo === 'solicitado_medico') {
      return {
        variaveis: [variavelNome, variavelMedico]
      };
    } else if (modulo === 'em_tratamento') {
      return {
        variaveis: [variavelNome, variavelMedico, variavelInicio, variavelSemanas]
      };
    } else if (modulo === 'novo_lead_medico') {
      return {
        variaveis: [variavelNome, variavelMedico]
      };
    } else if (modulo === 'aplicacao') {
      return {
        variaveis: [variavelNome, variavelMedico, variavelNumero]
      };
    } else if (modulo === 'lead_avulso') {
      return {
        variaveis: [variavelNome]
      };
    } else if (modulo === 'check_recomendacoes') {
      return {
        variaveis: [variavelNome, variavelMedico]
      };
    } else if (modulo === 'bem_vindo') {
      if (emailTipo === 'bem_vindo_medico') {
        return {
          variaveis: [{ nome: '{nome}', descricao: 'Nome do médico cadastrado' }]
        };
      } else {
        return {
          variaveis: [variavelNome]
        };
      }
    } else if (modulo === 'novidades') {
      return {
        variaveis: [variavelNome]
      };
    }
    return { variaveis: [] };
  };

  const renderEmailEditor = () => {
    let emailTemplate;
    let emailInfo;
    
    if (activeModulo === 'leads') {
      emailTemplate = config.leads[activeEmail as EmailTipo];
      emailInfo = emailInfoLeads[activeEmail as EmailTipo];
    } else if (activeModulo === 'solicitado_medico') {
      emailTemplate = config.solicitado_medico.boas_vindas;
      emailInfo = emailInfoSolicitadoMedico.boas_vindas;
    } else if (activeModulo === 'em_tratamento') {
      emailTemplate = config.em_tratamento.plano_editado;
      emailInfo = emailInfoEmTratamento.plano_editado;
    } else if (activeModulo === 'novo_lead_medico') {
      emailTemplate = config.novo_lead_medico.novo_lead;
      emailInfo = emailInfoNovoLeadMedico.novo_lead;
    } else if (activeModulo === 'aplicacao') {
      if (activeEmail === 'aplicacao_antes') {
        emailTemplate = config.aplicacao.aplicacao_antes;
        emailInfo = emailInfoAplicacao.aplicacao_antes;
      } else {
        emailTemplate = config.aplicacao.aplicacao_dia;
        emailInfo = emailInfoAplicacao.aplicacao_dia;
      }
    } else if (activeModulo === 'lead_avulso') {
      emailTemplate = config.lead_avulso.novo_lead;
      emailInfo = emailInfoLeadAvulso.novo_lead;
    } else if (activeModulo === 'check_recomendacoes') {
      emailTemplate = config.check_recomendacoes.recomendacoes_lidas;
      emailInfo = emailInfoCheckRecomendacoes.recomendacoes_lidas;
    } else if (activeModulo === 'bem_vindo') {
      if (activeEmail === 'bem_vindo_medico') {
        emailTemplate = config.bem_vindo.bem_vindo_medico;
        emailInfo = emailInfoBemVindo.bem_vindo_medico;
      } else {
        emailTemplate = config.bem_vindo.bem_vindo_geral;
        emailInfo = emailInfoBemVindo.bem_vindo_geral;
      }
    } else if (activeModulo === 'novidades') {
      emailTemplate = config.novidades.novidade;
      emailInfo = emailInfoNovidades.novidade;
    }

    if (!emailTemplate) return null;

    const variaveisInfo = getVariaveisDisponiveis(activeModulo, activeEmail);
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold mb-1 text-gray-900">
            {emailInfo.nome}
          </h3>
          <p className="text-xs text-gray-500">{emailInfo.descricao}</p>
        </div>
        
        {/* Seção de Variáveis Disponíveis */}
        {variaveisInfo.variaveis.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
              <span className="mr-2">📋</span> Variáveis Disponíveis
            </h4>
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {variaveisInfo.variaveis.map((variavel) => (
                  <code
                    key={variavel.nome}
                    className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-mono font-semibold"
                  >
                    {variavel.nome}
                  </code>
                ))}
              </div>
              <div className="space-y-1">
                {variaveisInfo.variaveis.map((variavel) => (
                  <div key={variavel.nome} className="text-xs text-blue-700">
                    <span className="font-mono font-semibold">{variavel.nome}</span>
                    <span className="ml-1.5">{variavel.descricao}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Assunto do E-mail
            </label>
            <input
              type="text"
              value={emailTemplate.assunto}
              onChange={(e) => {
                if (activeModulo === 'leads') {
                  setConfig({
                    ...config,
                    leads: {
                      ...config.leads,
                      [activeEmail]: { ...config.leads[activeEmail as EmailTipo], assunto: e.target.value }
                    }
                  });
                } else if (activeModulo === 'solicitado_medico') {
                  setConfig({
                    ...config,
                    solicitado_medico: {
                      boas_vindas: { ...config.solicitado_medico.boas_vindas, assunto: e.target.value }
                    }
                  });
                } else if (activeModulo === 'em_tratamento') {
                  setConfig({
                    ...config,
                    em_tratamento: {
                      plano_editado: { ...config.em_tratamento.plano_editado, assunto: e.target.value }
                    }
                  });
                } else if (activeModulo === 'novo_lead_medico') {
                  setConfig({
                    ...config,
                    novo_lead_medico: {
                      novo_lead: { ...config.novo_lead_medico.novo_lead, assunto: e.target.value }
                    }
                  });
                } else if (activeModulo === 'aplicacao') {
                  if (activeEmail === 'aplicacao_antes') {
                    setConfig({
                      ...config,
                      aplicacao: {
                        ...config.aplicacao,
                        aplicacao_antes: { ...config.aplicacao.aplicacao_antes, assunto: e.target.value }
                      }
                    });
                  } else {
                    setConfig({
                      ...config,
                      aplicacao: {
                        ...config.aplicacao,
                        aplicacao_dia: { ...config.aplicacao.aplicacao_dia, assunto: e.target.value }
                      }
                    });
                  }
                } else if (activeModulo === 'lead_avulso') {
                  setConfig({
                    ...config,
                    lead_avulso: {
                      novo_lead: { ...config.lead_avulso.novo_lead, assunto: e.target.value }
                    }
                  });
                } else if (activeModulo === 'check_recomendacoes') {
                  setConfig({
                    ...config,
                    check_recomendacoes: {
                      recomendacoes_lidas: { ...config.check_recomendacoes.recomendacoes_lidas, assunto: e.target.value }
                    }
                  });
                } else if (activeModulo === 'bem_vindo') {
                  if (activeEmail === 'bem_vindo_medico') {
                    setConfig({
                      ...config,
                      bem_vindo: {
                        ...config.bem_vindo,
                        bem_vindo_medico: { ...config.bem_vindo.bem_vindo_medico, assunto: e.target.value }
                      }
                    });
                  } else {
                    setConfig({
                      ...config,
                      bem_vindo: {
                        ...config.bem_vindo,
                        bem_vindo_geral: { ...config.bem_vindo.bem_vindo_geral, assunto: e.target.value }
                      }
                    });
                  }
                } else if (activeModulo === 'novidades') {
                  setConfig({
                    ...config,
                    novidades: {
                      novidade: { ...config.novidades.novidade, assunto: e.target.value }
                    }
                  });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black bg-white"
              style={{ color: '#000000' }}
              placeholder="Ex: Bem-vindo ao Oftware!"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Corpo do E-mail (HTML)
            </label>
            {(() => {
              const variaveisInfo = getVariaveisDisponiveis(activeModulo, activeEmail);
              if (variaveisInfo.variaveis.length === 0) return null;
              return (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-blue-900 mb-2">Variáveis Disponíveis:</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {variaveisInfo.variaveis.map((variavel) => (
                      <code
                        key={variavel.nome}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono font-semibold"
                      >
                        {variavel.nome}
                      </code>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {variaveisInfo.variaveis.map((variavel) => (
                      <div key={variavel.nome} className="text-xs text-blue-700">
                        <span className="font-mono font-semibold">{variavel.nome}</span>
                        <span className="ml-2">{variavel.descricao}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <textarea
              value={emailTemplate.corpoHtml}
              onChange={(e) => {
                if (activeModulo === 'leads') {
                  setConfig({
                    ...config,
                    leads: {
                      ...config.leads,
                      [activeEmail]: { ...config.leads[activeEmail as EmailTipo], corpoHtml: e.target.value }
                    }
                  });
                } else if (activeModulo === 'solicitado_medico') {
                  setConfig({
                    ...config,
                    solicitado_medico: {
                      boas_vindas: { ...config.solicitado_medico.boas_vindas, corpoHtml: e.target.value }
                    }
                  });
                } else if (activeModulo === 'em_tratamento') {
                  setConfig({
                    ...config,
                    em_tratamento: {
                      plano_editado: { ...config.em_tratamento.plano_editado, corpoHtml: e.target.value }
                    }
                  });
                } else if (activeModulo === 'novo_lead_medico') {
                  setConfig({
                    ...config,
                    novo_lead_medico: {
                      novo_lead: { ...config.novo_lead_medico.novo_lead, corpoHtml: e.target.value }
                    }
                  });
                } else if (activeModulo === 'aplicacao') {
                  if (activeEmail === 'aplicacao_antes') {
                    setConfig({
                      ...config,
                      aplicacao: {
                        ...config.aplicacao,
                        aplicacao_antes: { ...config.aplicacao.aplicacao_antes, corpoHtml: e.target.value }
                      }
                    });
                  } else {
                    setConfig({
                      ...config,
                      aplicacao: {
                        ...config.aplicacao,
                        aplicacao_dia: { ...config.aplicacao.aplicacao_dia, corpoHtml: e.target.value }
                      }
                    });
                  }
                } else if (activeModulo === 'lead_avulso') {
                  setConfig({
                    ...config,
                    lead_avulso: {
                      novo_lead: { ...config.lead_avulso.novo_lead, corpoHtml: e.target.value }
                    }
                  });
                } else if (activeModulo === 'check_recomendacoes') {
                  setConfig({
                    ...config,
                    check_recomendacoes: {
                      recomendacoes_lidas: { ...config.check_recomendacoes.recomendacoes_lidas, corpoHtml: e.target.value }
                    }
                  });
                } else if (activeModulo === 'bem_vindo') {
                  if (activeEmail === 'bem_vindo_medico') {
                    setConfig({
                      ...config,
                      bem_vindo: {
                        ...config.bem_vindo,
                        bem_vindo_medico: { ...config.bem_vindo.bem_vindo_medico, corpoHtml: e.target.value }
                      }
                    });
                  } else {
                    setConfig({
                      ...config,
                      bem_vindo: {
                        ...config.bem_vindo,
                        bem_vindo_geral: { ...config.bem_vindo.bem_vindo_geral, corpoHtml: e.target.value }
                      }
                    });
                  }
                } else if (activeModulo === 'novidades') {
                  setConfig({
                    ...config,
                    novidades: {
                      novidade: { ...config.novidades.novidade, corpoHtml: e.target.value }
                    }
                  });
                }
              }}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-xs text-black bg-white"
              style={{ color: '#000000' }}
              placeholder="<p>Olá {nome}, ...</p>"
            />
          </div>

          {activeModulo === 'leads' && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enviar Teste para Lead
              </label>
              <div className="flex gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      sendTestEmail('leads', activeEmail, e.target.value);
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black bg-white"
                  style={{ color: '#000000' }}
                >
                  <option value="" style={{ color: '#666666' }}>Selecione um lead para teste...</option>
                  {leadsNaoQualificados.map(lead => (
                    <option key={lead.id} value={lead.id} style={{ color: '#000000' }}>
                      {lead.name} ({lead.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeModulo === 'novidades' && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modo de Envio
              </label>
              <div className="space-y-4">
                {/* Seleção do modo */}
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="modoEnvio"
                      value="massa"
                      checked={modoEnvioNovidades === 'massa'}
                      onChange={() => setModoEnvioNovidades('massa')}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Envio em Massa</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="modoEnvio"
                      value="especifico"
                      checked={modoEnvioNovidades === 'especifico'}
                      onChange={() => setModoEnvioNovidades('especifico')}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Pessoas Específicas</span>
                  </label>
                </div>

                {/* Modo: Envio em Massa */}
                {modoEnvioNovidades === 'massa' && (
                  <div className="space-y-3">
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          id="enviarPacientes"
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Enviar para todos os pacientes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          id="enviarMedicos"
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Enviar para todos os médicos</span>
                      </label>
                    </div>
                    <button
                      onClick={async () => {
                        const enviarPacientes = (document.getElementById('enviarPacientes') as HTMLInputElement)?.checked;
                        const enviarMedicos = (document.getElementById('enviarMedicos') as HTMLInputElement)?.checked;
                        
                        if (!enviarPacientes && !enviarMedicos) {
                          alert('Selecione pelo menos um destinatário (Pacientes ou Médicos)');
                          return;
                        }
                        
                        if (!confirm(`Tem certeza que deseja enviar este e-mail para ${enviarPacientes ? 'todos os pacientes' : ''}${enviarPacientes && enviarMedicos ? ' e ' : ''}${enviarMedicos ? 'todos os médicos' : ''}?`)) {
                          return;
                        }
                        
                        setEnviandoNovidades(true);
                        try {
                          const response = await fetch('/api/send-email-novidades', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              enviarPacientes,
                              enviarMedicos,
                            }),
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            alert(`E-mail enviado com sucesso! ${data.enviadosPacientes || 0} pacientes e ${data.enviadosMedicos || 0} médicos receberam o e-mail.`);
                          } else {
                            const error = await response.json();
                            throw new Error(error.error || 'Erro ao enviar');
                          }
                        } catch (error) {
                          console.error('Erro ao enviar novidades:', error);
                          alert('Erro ao enviar e-mail em massa. Tente novamente.');
                        } finally {
                          setEnviandoNovidades(false);
                        }
                      }}
                      disabled={enviandoNovidades}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {enviandoNovidades ? 'Enviando...' : 'Disparar E-mail em Massa'}
                    </button>
                  </div>
                )}

                {/* Modo: Pessoas Específicas */}
                {modoEnvioNovidades === 'especifico' && (
                  <div className="space-y-4">
                    {loadingDestinatarios ? (
                      <div className="text-center py-4 text-gray-500">Carregando destinatários...</div>
                    ) : (
                      <>
                        {/* Seleção de Pacientes */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Selecionar Pacientes
                          </label>
                          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                            {pacientesDisponiveis.length === 0 ? (
                              <p className="text-sm text-gray-500">Nenhum paciente disponível</p>
                            ) : (
                              pacientesDisponiveis.map((paciente) => (
                                <label key={paciente.id} className="flex items-center py-1 hover:bg-gray-50 rounded px-2">
                                  <input
                                    type="checkbox"
                                    checked={pacientesSelecionados.includes(paciente.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setPacientesSelecionados([...pacientesSelecionados, paciente.id]);
                                      } else {
                                        setPacientesSelecionados(pacientesSelecionados.filter(id => id !== paciente.id));
                                      }
                                    }}
                                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {paciente.nome} ({paciente.email})
                                  </span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Seleção de Médicos */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Selecionar Médicos
                          </label>
                          <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                            {medicosDisponiveis.length === 0 ? (
                              <p className="text-sm text-gray-500">Nenhum médico disponível</p>
                            ) : (
                              medicosDisponiveis.map((medico) => (
                                <label key={medico.id} className="flex items-center py-1 hover:bg-gray-50 rounded px-2">
                                  <input
                                    type="checkbox"
                                    checked={medicosSelecionados.includes(medico.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setMedicosSelecionados([...medicosSelecionados, medico.id]);
                                      } else {
                                        setMedicosSelecionados(medicosSelecionados.filter(id => id !== medico.id));
                                      }
                                    }}
                                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">
                                    {medico.nome} ({medico.email})
                                  </span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            if (pacientesSelecionados.length === 0 && medicosSelecionados.length === 0) {
                              alert('Selecione pelo menos um destinatário (Paciente ou Médico)');
                              return;
                            }
                            
                            if (!confirm(`Tem certeza que deseja enviar este e-mail para ${pacientesSelecionados.length} paciente(s) e ${medicosSelecionados.length} médico(s)?`)) {
                              return;
                            }
                            
                            setEnviandoNovidades(true);
                            try {
                              const response = await fetch('/api/send-email-novidades', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  pacientesIds: pacientesSelecionados,
                                  medicosIds: medicosSelecionados,
                                }),
                              });
                              
                              if (response.ok) {
                                const data = await response.json();
                                alert(`E-mail enviado com sucesso! ${data.enviadosPacientes || 0} paciente(s) e ${data.enviadosMedicos || 0} médico(s) receberam o e-mail.`);
                                // Limpar seleções
                                setPacientesSelecionados([]);
                                setMedicosSelecionados([]);
                              } else {
                                const error = await response.json();
                                throw new Error(error.error || 'Erro ao enviar');
                              }
                            } catch (error) {
                              console.error('Erro ao enviar novidades:', error);
                              alert('Erro ao enviar e-mail. Tente novamente.');
                            } finally {
                              setEnviandoNovidades(false);
                            }
                          }}
                          disabled={enviandoNovidades || (pacientesSelecionados.length === 0 && medicosSelecionados.length === 0)}
                          className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {enviandoNovidades ? 'Enviando...' : `Enviar para ${pacientesSelecionados.length + medicosSelecionados.length} destinatário(s)`}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'config'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="inline mr-2" size={18} />
            Configuração
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="inline mr-2" size={18} />
            Gestão Visual
          </button>
          <button
            onClick={() => {
              setActiveTab('outbox');
              loadOutbox();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'outbox'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <SendHorizontal className="inline mr-2" size={18} />
            Caixa de Saída
          </button>
          <button
            onClick={() => {
              setActiveTab('inbox');
              loadInbox();
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'inbox'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Inbox className="inline mr-2" size={18} />
            Caixa de Entrada
          </button>
        </nav>
      </div>

      {/* Tab: Configuração */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Seleção de Módulo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-base font-semibold mb-3 text-gray-900">Módulos de E-mail</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
              <button
                onClick={() => {
                  setActiveModulo('leads');
                  setActiveEmail('email1');
                }}
                className={`p-2.5 rounded-md border transition-all text-left ${
                  activeModulo === 'leads'
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Mail size={16} className={activeModulo === 'leads' ? 'text-green-600' : 'text-gray-500'} />
                  <span className="font-medium text-sm text-gray-900">Leads</span>
                </div>
                <div className="text-xs text-gray-500 ml-6">5 e-mails automáticos</div>
              </button>
              <button
                onClick={() => {
                  setActiveModulo('solicitado_medico');
                  setActiveEmail('boas_vindas');
                }}
                className={`p-2.5 rounded-md border transition-all text-left ${
                  activeModulo === 'solicitado_medico'
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck size={16} className={activeModulo === 'solicitado_medico' ? 'text-green-600' : 'text-gray-500'} />
                  <span className="font-medium text-sm text-gray-900">Solicitado Médico</span>
                </div>
                <div className="text-xs text-gray-500 ml-6">Boas-vindas</div>
              </button>
              <button
                onClick={() => {
                  setActiveModulo('em_tratamento');
                  setActiveEmail('plano_editado');
                }}
                className={`p-2.5 rounded-md border transition-all text-left ${
                  activeModulo === 'em_tratamento'
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Activity size={16} className={activeModulo === 'em_tratamento' ? 'text-green-600' : 'text-gray-500'} />
                  <span className="font-medium text-sm text-gray-900">Em Tratamento</span>
                </div>
                <div className="text-xs text-gray-500 ml-6">Plano editado</div>
              </button>
              <button
                onClick={() => {
                  setActiveModulo('novo_lead_medico');
                  setActiveEmail('novo_lead');
                }}
                className={`p-2.5 rounded-md border transition-all text-left ${
                  activeModulo === 'novo_lead_medico'
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Users size={16} className={activeModulo === 'novo_lead_medico' ? 'text-green-600' : 'text-gray-500'} />
                  <span className="font-medium text-sm text-gray-900">Novo Lead Médico</span>
                </div>
                <div className="text-xs text-gray-500 ml-6">Aviso ao médico</div>
              </button>
              <button
                onClick={() => {
                  setActiveModulo('aplicacao');
                  setActiveEmail('aplicacao_antes');
                }}
                className={`p-2.5 rounded-md border transition-all text-left ${
                  activeModulo === 'aplicacao'
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Send size={16} className={activeModulo === 'aplicacao' ? 'text-green-600' : 'text-gray-500'} />
                  <span className="font-medium text-sm text-gray-900">Aplicação</span>
                </div>
                <div className="text-xs text-gray-500 ml-6">2 e-mails</div>
              </button>
              <button
                onClick={() => {
                  setActiveModulo('lead_avulso');
                  setActiveEmail('novo_lead');
                }}
                className={`p-2.5 rounded-md border transition-all text-left ${
                  activeModulo === 'lead_avulso'
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 size={16} className={activeModulo === 'lead_avulso' ? 'text-green-600' : 'text-gray-500'} />
                  <span className="font-medium text-sm text-gray-900">Lead Avulso</span>
                </div>
                <div className="text-xs text-gray-500 ml-6">Aviso admin</div>
              </button>
              <button
                onClick={() => {
                  setActiveModulo('check_recomendacoes');
                  setActiveEmail('recomendacoes_lidas');
                }}
                className={`p-2.5 rounded-md border transition-all text-left ${
                  activeModulo === 'check_recomendacoes'
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw size={16} className={activeModulo === 'check_recomendacoes' ? 'text-green-600' : 'text-gray-500'} />
                  <span className="font-medium text-sm text-gray-900">Check Recomendações</span>
                </div>
                <div className="text-xs text-gray-500 ml-6">Avisa médico</div>
              </button>
              <button
                onClick={() => {
                  setActiveModulo('bem_vindo');
                  setActiveEmail('bem_vindo_geral');
                }}
                className={`p-2.5 rounded-md border transition-all text-left ${
                  activeModulo === 'bem_vindo'
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck size={16} className={activeModulo === 'bem_vindo' ? 'text-green-600' : 'text-gray-500'} />
                  <span className="font-medium text-sm text-gray-900">Bem-vindo</span>
                </div>
                <div className="text-xs text-gray-500 ml-6">E-mails automáticos</div>
              </button>
              <button
                onClick={() => {
                  setActiveModulo('novidades');
                  setActiveEmail('novidade');
                }}
                className={`p-2.5 rounded-md border transition-all text-left ${
                  activeModulo === 'novidades'
                    ? 'border-green-500 bg-green-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Mail size={16} className={activeModulo === 'novidades' ? 'text-green-600' : 'text-gray-500'} />
                  <span className="font-medium text-sm text-gray-900">Novidades</span>
                </div>
                <div className="text-xs text-gray-500 ml-6">E-mail em massa</div>
              </button>
            </div>
          </div>

          {/* Seleção de E-mail dentro do Módulo */}
          {activeModulo === 'bem_vindo' && (
            <div className="mb-3 bg-white rounded-md border border-gray-200 p-3">
              <label className="block text-xs font-medium text-gray-700 mb-2">Tipo de e-mail:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveEmail('bem_vindo_geral')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeEmail === 'bem_vindo_geral'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Geral
                </button>
                <button
                  onClick={() => setActiveEmail('bem_vindo_medico')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeEmail === 'bem_vindo_medico'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Médico
                </button>
              </div>
            </div>
          )}
          {activeModulo === 'leads' && (
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold mb-3 text-gray-900">Selecione o E-mail</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {(Object.keys(emailInfoLeads) as EmailTipo[]).map((emailTipo) => {
                  const info = emailInfoLeads[emailTipo];
                  return (
                    <button
                      key={emailTipo}
                      onClick={() => setActiveEmail(emailTipo)}
                      className={`p-2.5 rounded-md border transition-all text-left ${
                        activeEmail === emailTipo
                          ? 'border-green-500 bg-green-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-sm text-gray-900">{info.nome}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{info.tempo}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seleção de E-mail dentro do Módulo Aplicação */}
          {activeModulo === 'aplicacao' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-black">Selecione o E-mail para Configurar</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveEmail('aplicacao_antes')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    activeEmail === 'aplicacao_antes'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-black">{emailInfoAplicacao.aplicacao_antes.nome}</div>
                  <div className="text-sm text-gray-600 mt-1">{emailInfoAplicacao.aplicacao_antes.descricao}</div>
                </button>
                <button
                  onClick={() => setActiveEmail('aplicacao_dia')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    activeEmail === 'aplicacao_dia'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-black">{emailInfoAplicacao.aplicacao_dia.nome}</div>
                  <div className="text-sm text-gray-600 mt-1">{emailInfoAplicacao.aplicacao_dia.descricao}</div>
                </button>
              </div>
            </div>
          )}

          {/* Editor de E-mail */}
          {renderEmailEditor()}

          {/* Envio Automático (apenas para Leads) */}
          {activeModulo === 'leads' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-black">Envio Automático</h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.envioAutomatico.ativo}
                  onChange={(e) => setConfig({
                    ...config,
                    envioAutomatico: { ...config.envioAutomatico, ativo: e.target.checked }
                  })}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  Ativar envio automático dos 5 e-mails
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Os e-mails serão enviados automaticamente nos tempos configurados: 1h, 24h, 72h, 7 dias e 14 dias após a criação da conta.
              </p>
            </div>
          )}

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              <Save className="mr-2" size={18} />
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>
      )}

      {/* Tab: Gestão Visual */}
      {activeTab === 'dashboard' && (
        <LeadsEmailDashboard />
      )}

      {/* Tab: Caixa de Saída */}
      {activeTab === 'outbox' && (() => {
        // Organizar e-mails por tipo
        const emailsPorTipo: Record<string, any[]> = {};
        outbox.forEach((envio) => {
          const tipo = envio.emailTipo || 'outros';
          if (!emailsPorTipo[tipo]) {
            emailsPorTipo[tipo] = [];
          }
          emailsPorTipo[tipo].push(envio);
        });

        // Mapear tipos de e-mail para módulo, nome e descrição
        const tiposEmail: Record<string, { modulo: string; nome: string; descricao: string }> = {
          'lead_avulso_novo_lead': { 
            modulo: 'Lead Avulso',
            nome: 'Novo Lead', 
            descricao: 'E-mail enviado quando um novo usuário se cadastra'
          },
          'novo_lead_medico_novo_lead': { 
            modulo: 'Novo Lead Médico',
            nome: 'Novo Lead', 
            descricao: 'Aviso ao médico sobre novo paciente'
          },
          'solicitado_medico_boas_vindas': { 
            modulo: 'Solicitado Médico',
            nome: 'Boas-vindas', 
            descricao: 'E-mail de boas-vindas quando solicitação é aceita'
          },
          'em_tratamento_plano_editado': { 
            modulo: 'Em Tratamento',
            nome: 'Plano Editado', 
            descricao: 'E-mail quando o plano de tratamento é editado'
          },
          'aplicacao_aplicacao_antes': { 
            modulo: 'Aplicação',
            nome: 'Antes', 
            descricao: 'Lembrete 1 dia antes da aplicação'
          },
          'aplicacao_aplicacao_dia': { 
            modulo: 'Aplicação',
            nome: 'Dia', 
            descricao: 'Lembrete no dia da aplicação'
          },
          'check_recomendacoes_recomendacoes_lidas': { 
            modulo: 'Check Recomendações',
            nome: 'Recomendações Lidas', 
            descricao: 'Aviso ao médico quando paciente lê recomendações'
          },
          'bem_vindo_bem_vindo_geral': { 
            modulo: 'Bem-vindo',
            nome: 'Bem-vindo Geral', 
            descricao: 'E-mail enviado automaticamente quando um novo cliente se cadastra'
          },
          'bem_vindo_bem_vindo_medico': { 
            modulo: 'Bem-vindo',
            nome: 'Bem-vindo Médico', 
            descricao: 'E-mail enviado quando um médico salva o perfil pela primeira vez'
          },
          'novidades_novidade': { 
            modulo: 'Novidades',
            nome: 'Novidade', 
            descricao: 'E-mail em massa para pacientes ou médicos'
          },
          'email1': { modulo: 'Leads', nome: 'Bem-vindo ao Oftware!', descricao: 'E-mail imediato (1h após cadastro)' },
          'email2': { modulo: 'Leads', nome: 'Você ainda está aqui?', descricao: 'E-mail 24h depois do cadastro' },
          'email3': { modulo: 'Leads', nome: 'Reacenda sua jornada', descricao: 'E-mail 72h (3 dias) depois do cadastro' },
          'email4': { modulo: 'Leads', nome: 'Superando objeções', descricao: 'E-mail 7 dias depois do cadastro' },
          'email5': { modulo: 'Leads', nome: 'Última chance', descricao: 'E-mail 14 dias depois do cadastro' },
        };

        // Organizar por módulo
        const emailsPorModulo: Record<string, Record<string, any[]>> = {};
        Object.keys(emailsPorTipo).forEach((tipo) => {
          const info = tiposEmail[tipo] || { modulo: 'Outros', nome: tipo, descricao: '' };
          if (!emailsPorModulo[info.modulo]) {
            emailsPorModulo[info.modulo] = {};
          }
          emailsPorModulo[info.modulo][tipo] = emailsPorTipo[tipo];
        });

        // Calcular estatísticas por tipo
        const getEstatisticasTipo = (tipo: string) => {
          const envios = emailsPorTipo[tipo] || [];
          const enviados = envios.filter(e => e.status === 'enviado').length;
          const falharam = envios.filter(e => e.status === 'falhou').length;
          const pendentes = envios.filter(e => e.status === 'pendente').length;
          return { total: envios.length, enviados, falharam, pendentes };
        };

        // Calcular estatísticas por módulo
        const getEstatisticasModulo = (modulo: string) => {
          const tiposDoModulo = emailsPorModulo[modulo] || {};
          let total = 0;
          let enviados = 0;
          let falharam = 0;
          let pendentes = 0;
          Object.values(tiposDoModulo).forEach((envios: any[]) => {
            total += envios.length;
            enviados += envios.filter(e => e.status === 'enviado').length;
            falharam += envios.filter(e => e.status === 'falhou').length;
            pendentes += envios.filter(e => e.status === 'pendente').length;
          });
          return { total, enviados, falharam, pendentes };
        };

        // Filtrar e-mails da pasta selecionada
        const emailsFiltrados = pastaEmailSelecionada 
          ? emailsPorTipo[pastaEmailSelecionada] || []
          : [];

        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-black flex items-center">
                  <SendHorizontal className="mr-2" size={20} /> Caixa de Saída
                </h3>
                <button
                  onClick={loadOutbox}
                  disabled={loadingOutbox}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <RefreshCw className={`mr-2 ${loadingOutbox ? 'animate-spin' : ''}`} size={16} /> Atualizar
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-4">
                {/* Painel de Pastas */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                      <Folder className="mr-2" size={18} />
                      Pastas
                    </h4>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      <button
                        onClick={() => setPastaEmailSelecionada(null)}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                          pastaEmailSelecionada === null
                            ? 'bg-green-100 text-green-700 font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Todos os E-mails</span>
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">
                            {outbox.length}
                          </span>
                        </div>
                      </button>
                      {Object.keys(emailsPorModulo).sort().map((modulo) => {
                        const statsModulo = getEstatisticasModulo(modulo);
                        const tiposDoModulo = emailsPorModulo[modulo];
                        return (
                          <div key={modulo} className="space-y-1">
                            {/* Cabeçalho do Módulo */}
                            <div className="px-3 py-2 bg-gray-100 rounded-md">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-900">{modulo}</span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  statsModulo.falharam > 0 
                                    ? 'bg-red-100 text-red-700'
                                    : statsModulo.enviados > 0
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-200 text-gray-700'
                                }`}>
                                  {statsModulo.total}
                                </span>
                              </div>
                            </div>
                            {/* Títulos dentro do módulo */}
                            {Object.keys(tiposDoModulo).sort().map((tipo) => {
                              const info = tiposEmail[tipo] || { modulo: 'Outros', nome: tipo, descricao: '' };
                              const stats = getEstatisticasTipo(tipo);
                              return (
                                <button
                                  key={tipo}
                                  onClick={() => setPastaEmailSelecionada(tipo)}
                                  className={`w-full text-left px-3 py-2 ml-2 rounded-md transition-colors ${
                                    pastaEmailSelecionada === tipo
                                      ? 'bg-green-100 text-green-700 font-semibold'
                                      : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm">{info.nome}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      stats.falharam > 0 
                                        ? 'bg-red-100 text-red-700'
                                        : stats.enviados > 0
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-200 text-gray-700'
                                    }`}>
                                      {stats.total}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                      {Object.keys(emailsPorModulo).length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          Nenhum e-mail enviado ainda
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lista de E-mails */}
                <div className="lg:col-span-3">
                  {loadingOutbox ? (
                    <div className="text-center py-8 text-gray-500">Carregando envios...</div>
                  ) : emailsFiltrados.length === 0 && pastaEmailSelecionada ? (
                    <div className="text-center py-8 text-gray-500">
                      <SendHorizontal size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>Nenhum e-mail deste tipo encontrado</p>
                    </div>
                  ) : outbox.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <SendHorizontal size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>Nenhum e-mail enviado ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="mb-4">
                        <h4 className="text-md font-semibold text-gray-900">
                          {pastaEmailSelecionada 
                            ? tiposEmail[pastaEmailSelecionada] 
                              ? `${tiposEmail[pastaEmailSelecionada].modulo} - ${tiposEmail[pastaEmailSelecionada].nome}`
                              : pastaEmailSelecionada
                            : 'Todos os E-mails Enviados'}
                        </h4>
                        {pastaEmailSelecionada && tiposEmail[pastaEmailSelecionada] && (
                          <p className="text-sm text-gray-600 mt-1">
                            {tiposEmail[pastaEmailSelecionada].descricao}
                          </p>
                        )}
                      </div>
                      {(pastaEmailSelecionada ? emailsFiltrados : outbox)
                        .sort((a, b) => {
                          const dateA = a.enviadoEm?.toDate ? a.enviadoEm.toDate() : new Date(a.enviadoEm);
                          const dateB = b.enviadoEm?.toDate ? b.enviadoEm.toDate() : new Date(b.enviadoEm);
                          return dateB.getTime() - dateA.getTime();
                        })
                        .map((envio) => {
                          const dataEnvio = envio.enviadoEm?.toDate 
                            ? envio.enviadoEm.toDate() 
                            : new Date(envio.enviadoEm);
                          const tipoInfo = tiposEmail[envio.emailTipo] || { nome: envio.emailTipo };
                          
                          return (
                            <div
                              key={envio.id}
                              className={`border rounded-lg p-4 transition-colors ${
                                envio.status === 'enviado'
                                  ? 'border-green-200 bg-green-50'
                                  : envio.status === 'falhou'
                                  ? 'border-red-200 bg-red-50'
                                  : 'border-yellow-200 bg-yellow-50'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-black">{envio.assunto || 'Sem assunto'}</span>
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      envio.status === 'enviado'
                                        ? 'bg-green-100 text-green-700'
                                        : envio.status === 'falhou'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {envio.status === 'enviado' ? '✓ Enviado' : envio.status === 'falhou' ? '✗ Falhou' : '⏳ Pendente'}
                                    </span>
                                    {!pastaEmailSelecionada && (
                                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                                        {tipoInfo.nome}
                                      </span>
                                    )}
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      envio.tipo === 'automatico'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {envio.tipo === 'automatico' ? 'Automático' : 'Manual'}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 space-y-1">
                                    <div>
                                      <span className="font-medium">Para:</span>{' '}
                                      {envio.leadEmail || envio.destinatarioEmail || 'N/A'}
                                      {envio.leadNome && ` (${envio.leadNome})`}
                                    </div>
                                    {envio.medicoNome && (
                                      <div>
                                        <span className="font-medium">Médico:</span> {envio.medicoNome}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500">
                                      {dataEnvio.toLocaleString('pt-BR')}
                                    </div>
                                  </div>
                                  {envio.erro && (
                                    <div className="mt-2 text-xs text-red-600 p-2 bg-red-100 rounded">
                                      <span className="font-medium">Erro:</span> {envio.erro}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tab: Caixa de Entrada */}
      {activeTab === 'inbox' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black flex items-center">
              <Inbox className="mr-2" size={20} />
              Caixa de Entrada
            </h3>
            <button
              onClick={loadInbox}
              disabled={loadingInbox}
              className="flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <RefreshCw className={`mr-2 ${loadingInbox ? 'animate-spin' : ''}`} size={16} />
              Atualizar
            </button>
          </div>

          <div className="p-4">
            {loadingInbox ? (
              <div className="text-center py-8 text-gray-500">Carregando e-mails...</div>
            ) : inbox.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Inbox size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Nenhum e-mail na caixa de entrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inbox.map((email) => {
                  const relatedLead = leads.find(l => l.email === email.from);
                  return (
                    <div
                      key={email.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-black">{email.subject}</span>
                            {relatedLead && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                                Lead: {relatedLead.name}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">De:</span> {email.from}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Para:</span> {email.to}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(email.date).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-gray-700 border-t pt-3">
                        <div dangerouslySetInnerHTML={{ __html: email.html || email.text }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
