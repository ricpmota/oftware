import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PacienteCompleto } from '@/types/obesidade';
import { AplicacaoAgendada, FiltroAplicacao, AplicacaoRealizada } from '@/types/calendario';

export class AplicacaoService {
  /**
   * Calcula todas as aplicações futuras baseado no plano terapêutico do paciente
   */
  static calcularAplicacoesFuturas(
    paciente: PacienteCompleto,
    dataLimite: Date = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 dias à frente
  ): AplicacaoAgendada[] {
    const aplicacoes: AplicacaoAgendada[] = [];
    const planoTerapeutico = paciente.planoTerapeutico;

    if (!planoTerapeutico?.startDate || !planoTerapeutico?.injectionDayOfWeek) {
      return aplicacoes;
    }

    const startDate = planoTerapeutico.startDate instanceof Date
      ? planoTerapeutico.startDate
      : new Date(planoTerapeutico.startDate);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Mapear dia da semana
    const diasSemana: Record<string, number> = {
      'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6
    };
    const diaSemanaInjecao = diasSemana[planoTerapeutico.injectionDayOfWeek];

    // Calcular número de semanas desde o início
    const semanasDesdeInicio = Math.floor(
      (hoje.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    // Encontrar a próxima data de aplicação (hoje ou futura)
    let proximaData = new Date(startDate);
    proximaData.setDate(proximaData.getDate() + (semanasDesdeInicio * 7));
    
    // Ajustar para o dia da semana correto
    while (proximaData.getDay() !== diaSemanaInjecao) {
      proximaData.setDate(proximaData.getDate() + 1);
    }

    // Se a data calculada já passou, avançar uma semana
    if (proximaData < hoje) {
      proximaData.setDate(proximaData.getDate() + 7);
    }

    // Calcular aplicações futuras
    let numeroAplicacao = semanasDesdeInicio + 1;
    let dataAplicacao = new Date(proximaData);
    const numeroSemanas = planoTerapeutico.numeroSemanasTratamento || 18;
    const currentDose = planoTerapeutico.currentDoseMg || 2.5;

    while (dataAplicacao <= dataLimite && numeroAplicacao <= numeroSemanas) {
      aplicacoes.push({
        id: `${paciente.id}_${numeroAplicacao}`,
        pacienteId: paciente.id,
        pacienteNome: paciente.nome,
        pacienteEmail: paciente.email,
        dataAplicacao: new Date(dataAplicacao),
        dosePrevista: currentDose, // Por enquanto usa a dose atual, pode ser melhorado
        numeroAplicacao,
        statusEmailAntes: 'nao_enviado',
        statusEmailDia: 'nao_enviado',
        medicoResponsavelId: paciente.medicoResponsavelId,
      });

      dataAplicacao.setDate(dataAplicacao.getDate() + 7);
      numeroAplicacao++;
    }

    return aplicacoes;
  }

  /**
   * Busca todas as aplicações agendadas de todos os pacientes em tratamento
   */
  static async buscarAplicacoesAgendadas(
    filtro?: FiltroAplicacao
  ): Promise<AplicacaoAgendada[]> {
    try {
      // Buscar todos os pacientes em tratamento
      const pacientesQuery = query(
        collection(db, 'pacientes_completos'),
        where('statusTratamento', '==', 'em_tratamento')
      );
      
      const pacientesSnapshot = await getDocs(pacientesQuery);
      const todasAplicacoes: AplicacaoAgendada[] = [];

      // Para cada paciente, calcular aplicações futuras
      for (const doc of pacientesSnapshot.docs) {
        const pacienteData = doc.data();
        const paciente: PacienteCompleto = {
          id: doc.id,
          ...pacienteData,
          dataCadastro: pacienteData.dataCadastro?.toDate() || new Date(),
          planoTerapeutico: {
            ...pacienteData.planoTerapeutico,
            startDate: pacienteData.planoTerapeutico?.startDate?.toDate(),
            lastDoseChangeAt: pacienteData.planoTerapeutico?.lastDoseChangeAt?.toDate(),
            nextReviewDate: pacienteData.planoTerapeutico?.nextReviewDate?.toDate(),
          },
        } as PacienteCompleto;

        const aplicacoes = this.calcularAplicacoesFuturas(paciente);
        todasAplicacoes.push(...aplicacoes);
      }

      // Aplicar filtros
      let aplicacoesFiltradas = todasAplicacoes;

      if (filtro) {
        if (filtro.dataInicio) {
          aplicacoesFiltradas = aplicacoesFiltradas.filter(
            a => a.dataAplicacao >= filtro.dataInicio!
          );
        }
        if (filtro.dataFim) {
          aplicacoesFiltradas = aplicacoesFiltradas.filter(
            a => a.dataAplicacao <= filtro.dataFim!
          );
        }
        if (filtro.pacienteId) {
          aplicacoesFiltradas = aplicacoesFiltradas.filter(
            a => a.pacienteId === filtro.pacienteId
          );
        }
        if (filtro.dose) {
          aplicacoesFiltradas = aplicacoesFiltradas.filter(
            a => a.dosePrevista === filtro.dose
          );
        }
        if (filtro.statusEmail && filtro.statusEmail !== 'todos') {
          aplicacoesFiltradas = aplicacoesFiltradas.filter(
            a => a.statusEmailAntes === filtro.statusEmail || a.statusEmailDia === filtro.statusEmail
          );
        }
      }

      // Verificar status de e-mails enviados
      const aplicacoesComStatus = await this.verificarStatusEmails(aplicacoesFiltradas);

      return aplicacoesComStatus.sort((a, b) => 
        a.dataAplicacao.getTime() - b.dataAplicacao.getTime()
      );
    } catch (error) {
      console.error('Erro ao buscar aplicações agendadas:', error);
      throw error;
    }
  }

  /**
   * Verifica o status dos e-mails enviados para cada aplicação
   */
  static async verificarStatusEmails(
    aplicacoes: AplicacaoAgendada[]
  ): Promise<AplicacaoAgendada[]> {
    try {
      // Buscar logs de e-mails enviados
      const emailEnviosQuery = query(
        collection(db, 'email_envios'),
        where('emailTipo', 'in', ['aplicacao_aplicacao_antes', 'aplicacao_aplicacao_dia'])
      );
      
      const emailEnviosSnapshot = await getDocs(emailEnviosQuery);
      const emailsEnviados = emailEnviosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        enviadoEm: doc.data().enviadoEm?.toDate(),
      }));

      // Atualizar status de cada aplicação
      return aplicacoes.map(aplicacao => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        const dataAplicacao = new Date(aplicacao.dataAplicacao);
        dataAplicacao.setHours(0, 0, 0, 0);

        // Verificar e-mail "dia anterior" (enviado 1 dia antes da aplicação)
        const dataAplicacaoMenosUmDia = new Date(dataAplicacao);
        dataAplicacaoMenosUmDia.setDate(dataAplicacaoMenosUmDia.getDate() - 1);
        const emailAntes = emailsEnviados.find(
          e => e.emailTipo === 'aplicacao_aplicacao_antes' &&
               e.leadEmail === aplicacao.pacienteEmail &&
               e.leadNome === aplicacao.pacienteNome &&
               e.enviadoEm &&
               Math.abs(new Date(e.enviadoEm).getTime() - dataAplicacaoMenosUmDia.getTime()) < 24 * 60 * 60 * 1000
        );

        // Verificar e-mail "dia da aplicação"
        const emailDia = emailsEnviados.find(
          e => e.emailTipo === 'aplicacao_aplicacao_dia' &&
               e.leadEmail === aplicacao.pacienteEmail &&
               e.leadNome === aplicacao.pacienteNome &&
               e.enviadoEm &&
               Math.abs(new Date(e.enviadoEm).getTime() - dataAplicacao.getTime()) < 24 * 60 * 60 * 1000
        );

        // Determinar status
        let statusEmailAntes: 'enviado' | 'nao_enviado' | 'pendente' = 'nao_enviado';
        let statusEmailDia: 'enviado' | 'nao_enviado' | 'pendente' = 'nao_enviado';

        if (emailAntes) {
          statusEmailAntes = 'enviado';
        } else if (dataAplicacao.getTime() === amanha.getTime()) {
          // Aplicação é amanhã, e-mail "antes" deve ser enviado hoje
          statusEmailAntes = 'pendente';
        }

        if (emailDia) {
          statusEmailDia = 'enviado';
        } else if (dataAplicacao.getTime() === hoje.getTime()) {
          // Aplicação é hoje, e-mail "dia" deve ser enviado hoje
          statusEmailDia = 'pendente';
        }

        return {
          ...aplicacao,
          statusEmailAntes,
          statusEmailDia,
        };
      });
    } catch (error) {
      console.error('Erro ao verificar status de e-mails:', error);
      return aplicacoes;
    }
  }

  /**
   * Busca aplicações realizadas (do histórico de doses e evolução)
   */
  static async buscarAplicacoesRealizadas(): Promise<AplicacaoRealizada[]> {
    try {
      const pacientesQuery = query(
        collection(db, 'pacientes_completos'),
        where('statusTratamento', '==', 'em_tratamento')
      );
      
      const pacientesSnapshot = await getDocs(pacientesQuery);
      const aplicacoesRealizadas: AplicacaoRealizada[] = [];

      for (const doc of pacientesSnapshot.docs) {
        const pacienteData = doc.data();
        
        // Buscar do histórico de doses
        if (pacienteData.planoTerapeutico?.historicoDoses) {
          pacienteData.planoTerapeutico.historicoDoses.forEach((dose: any, index: number) => {
            aplicacoesRealizadas.push({
              pacienteId: doc.id,
              data: dose.data?.toDate() || new Date(dose.data),
              dose: dose.dose,
              numeroAplicacao: index + 1,
            });
          });
        }

        // Buscar da evolução semanal
        if (pacienteData.evolucaoSeguimento) {
          pacienteData.evolucaoSeguimento.forEach((seguimento: any) => {
            if (seguimento.doseAplicada) {
              aplicacoesRealizadas.push({
                pacienteId: doc.id,
                data: seguimento.doseAplicada.data?.toDate() || new Date(seguimento.doseAplicada.data),
                dose: seguimento.doseAplicada.quantidade,
                numeroAplicacao: seguimento.weekIndex || 1,
              });
            }
          });
        }
      }

      return aplicacoesRealizadas.sort((a, b) => 
        a.data.getTime() - b.data.getTime()
      );
    } catch (error) {
      console.error('Erro ao buscar aplicações realizadas:', error);
      throw error;
    }
  }
}

