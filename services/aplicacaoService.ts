import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PacienteCompleto } from '@/types/obesidade';
import { AplicacaoAgendada, FiltroAplicacao, AplicacaoRealizada } from '@/types/calendario';

export class AplicacaoService {
  /**
   * Cria o calendário completo de doses do paciente (mesma lógica da Pasta 7)
   * Considera ajustes, atrasos e doses reais aplicadas
   */
  private static criarCalendarioDoses(paciente: PacienteCompleto): Array<{
    data: Date;
    semana: number;
    dose: number;
    dosePlanejada: number;
    status: 'tomada' | 'perdida' | 'hoje' | 'futura';
  }> {
    const planoTerapeutico = paciente.planoTerapeutico;
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
    const primeiraDose = startDateValue instanceof Date 
      ? new Date(startDateValue)
      : new Date(startDateValue as any);
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
    
    // Obter evolução do paciente
    const evolucao = (paciente.evolucaoSeguimento || []).map((e: any) => ({
      ...e,
      dataRegistro: e.dataRegistro instanceof Date 
        ? new Date(e.dataRegistro)
        : e.dataRegistro?.toDate ? e.dataRegistro.toDate() : new Date(e.dataRegistro as any)
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
            : new Date(e.dataRegistro as any);
          if (isNaN(dataRegistro.getTime())) return false;
          dataRegistro.setHours(0, 0, 0, 0);
          const diffDias = Math.abs((dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
          return diffDias <= 1; // Tolerância de 1 dia
        });
        
        // Se encontrou registro e houve atraso de 4+ dias
        if (registro && registro.dataRegistro) {
          const dataRegistro = registro.dataRegistro instanceof Date 
            ? new Date(registro.dataRegistro)
            : new Date(registro.dataRegistro as any);
          dataRegistro.setHours(0, 0, 0, 0);
          const diffDias = (dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24);
          
          // Se atraso de 4 dias ou mais, reiniciar ciclo a partir dessa semana
          if (diffDias >= 4) {
            semanasDesdeUltimoCiclo = semanaIndex - s - 1;
            break; // Usar o primeiro atraso encontrado como referência
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
    
      // Calcular dose planejada considerando atrasos (reinicia ciclo se atraso >= 4 dias)
      const dosePlanejada = calcularDoseComAtrasos(semana);

      // Encontrar registro de evolução para esta data (com tolerância de ±1 dia)
      const registroEvolucao = evolucao.find((e: any) => {
        if (!e.dataRegistro) return false;
        const dataRegistro = e.dataRegistro instanceof Date 
          ? new Date(e.dataRegistro)
          : new Date(e.dataRegistro as any);
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
        dosePlanejada,
        status,
      });
    }

    return calendario;
  }

  /**
   * Calcula todas as aplicações futuras baseado no calendário completo (mesma lógica da Pasta 7)
   * Considera ajustes, atrasos e doses reais aplicadas
   */
  static calcularAplicacoesFuturas(
    paciente: PacienteCompleto,
    dataLimite: Date = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 dias à frente
  ): AplicacaoAgendada[] {
    const aplicacoes: AplicacaoAgendada[] = [];
    
    // Criar calendário completo usando a mesma lógica da Pasta 7
    const calendario = this.criarCalendarioDoses(paciente);
    
    // Filtrar apenas aplicações futuras e dentro do limite
    const aplicacoesFuturas = calendario.filter(
      item => item.status === 'futura' && item.data <= dataLimite
    );

    // Converter para formato AplicacaoAgendada
    aplicacoesFuturas.forEach((item) => {
      aplicacoes.push({
        id: `${paciente.id}_${item.semana}`,
        pacienteId: paciente.id,
        pacienteNome: paciente.nome,
        pacienteEmail: paciente.email,
        dataAplicacao: new Date(item.data),
        dosePrevista: item.dose, // Usar a dose real calculada (não a planejada padrão)
        numeroAplicacao: item.semana,
        statusEmailAntes: 'nao_enviado',
        statusEmailDia: 'nao_enviado',
        medicoResponsavelId: paciente.medicoResponsavelId,
      });
    });

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
        } else {
          // Verificar se a aplicação é amanhã ou se já passou o dia de enviar
          const dataAplicacaoMenosUmDia = new Date(dataAplicacao);
          dataAplicacaoMenosUmDia.setDate(dataAplicacaoMenosUmDia.getDate() - 1);
          
          if (dataAplicacao.getTime() === amanha.getTime()) {
            // Aplicação é amanhã, e-mail "antes" deve ser enviado hoje
            statusEmailAntes = 'pendente';
          } else if (dataAplicacaoMenosUmDia.getTime() === hoje.getTime() && dataAplicacao.getTime() > hoje.getTime()) {
            // Aplicação é depois de amanhã, mas o e-mail "antes" deveria ter sido enviado hoje
            statusEmailAntes = 'pendente';
          } else if (dataAplicacao.getTime() > hoje.getTime()) {
            // Aplicação é futura, mas ainda não é hora de enviar
            statusEmailAntes = 'nao_enviado';
          }
        }

        if (emailDia) {
          statusEmailDia = 'enviado';
        } else {
          if (dataAplicacao.getTime() === hoje.getTime()) {
            // Aplicação é hoje, e-mail "dia" deve ser enviado hoje
            statusEmailDia = 'pendente';
          } else if (dataAplicacao.getTime() < hoje.getTime()) {
            // Aplicação já passou
            statusEmailDia = 'nao_enviado';
          } else {
            // Aplicação é futura, ainda não é hora de enviar
            statusEmailDia = 'nao_enviado';
          }
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

