import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PacienteCompleto } from '@/types/obesidade';
import { AplicacaoAgendada, FiltroAplicacao, AplicacaoRealizada } from '@/types/calendario';
import { criarCalendarioDoses as criarCalendarioDosesPlano } from '@/lib/aplicacao/criarCalendarioDoses';
import {
  auditEmailEnviosQuery,
  EMAIL_ENVIOS_AUDIT_SITES,
} from '@/lib/auditoria/emailEnviosAudit';
import {
  APLICACAO_EMAIL_LEAD_IN_BATCH_SIZE,
  applyEmailStatusToAplicacoes,
  deriveAplicacaoEmailTimeWindow,
  emailsNeedingLegacyFallback,
  filterEnviosAplicacaoInWindow,
  isEmailTipoAplicacao,
  planEnviosAplicacaoQueries,
  uniquePacienteEmails,
  uniquePacienteLeadIds,
  type EnvioAplicacaoLedger,
} from '@/lib/aplicacao/verificarStatusEmailsAplicacao';
import { logEmailEnviosResidual } from '@/lib/email/emailEnviosResidualMetrics';

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
    return criarCalendarioDosesPlano(
      paciente.planoTerapeutico,
      paciente.evolucaoSeguimento || []
    ).map((item) => ({
      ...item,
      dosePlanejada: item.dose,
    }));
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
        pacienteUserId: paciente.userId || undefined,
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
   * Verifica o status dos e-mails enviados para cada aplicação.
   *
   * É proibido utilizar email_envios como fonte global de elegibilidade
   * ou carregar o ledger completo.
   *
   * Estratégia: leadId IN (candidatos) → fallback leadEmail só para legados sem match.
   * Sem candidatos → status desconhecido (não faz full-scan).
   */
  static async verificarStatusEmails(
    aplicacoes: AplicacaoAgendada[]
  ): Promise<AplicacaoAgendada[]> {
    const startedAt = Date.now();
    try {
      if (aplicacoes.length === 0) return aplicacoes;

      const leadIds = uniquePacienteLeadIds(aplicacoes);
      const emails = uniquePacienteEmails(aplicacoes);
      const timeWindow = deriveAplicacaoEmailTimeWindow(aplicacoes);

      if (leadIds.length === 0 && emails.length === 0) {
        logEmailEnviosResidual({
          origin: 'CalendarioAplicacoes.verificarStatusEmails',
          route: '/metaadmingeral (Calendário Aplicações)',
          queryPattern: 'none',
          queryCount: 0,
          candidateCount: 0,
          docsReturned: 0,
          docsReadEstimated: 0,
          durationMs: Date.now() - startedAt,
          batchCount: 0,
          paginationUsed: false,
          note: 'sem candidatos — sem query (proibido full-scan)',
        });
        return aplicacoes;
      }

      const plan = planEnviosAplicacaoQueries({ leadIds, emails });
      const enviosBrutos: EnvioAplicacaoLedger[] = [];
      const seenDocIds = new Set<string>();
      let docsRead = 0;
      let queryCount = 0;

      const runLeadIdBatches = async (batches: string[][]) => {
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i]!;
          queryCount += 1;
          auditEmailEnviosQuery({
            siteId: EMAIL_ENVIOS_AUDIT_SITES.SERVICE_APLICACAO_STATUS.id,
            surface: 'client',
            queryPattern: 'leadId_in',
            leadIdsCount: batch.length,
            emailTipos: ['aplicacao_aplicacao_antes', 'aplicacao_aplicacao_dia'],
            batchIndex: i,
            batchCount: batches.length,
            note: 'leadId IN candidatos — filtro emailTipo em memória',
          });

          const snap = await getDocs(
            query(collection(db, 'email_envios'), where('leadId', 'in', batch)),
          );
          docsRead += snap.size;

          auditEmailEnviosQuery({
            siteId: EMAIL_ENVIOS_AUDIT_SITES.SERVICE_APLICACAO_STATUS.id,
            surface: 'client',
            queryPattern: 'leadId_in',
            leadIdsCount: batch.length,
            docsReturned: snap.size,
            batchIndex: i,
            batchCount: batches.length,
          });

          for (const docSnap of snap.docs) {
            if (seenDocIds.has(docSnap.id)) continue;
            seenDocIds.add(docSnap.id);
            const data = docSnap.data();
            const emailTipo = String(data.emailTipo || '');
            if (!isEmailTipoAplicacao(emailTipo)) continue;
            enviosBrutos.push({
              id: docSnap.id,
              emailTipo,
              leadEmail: data.leadEmail,
              leadNome: data.leadNome,
              leadId: data.leadId,
              enviadoEm:
                data.enviadoEm?.toDate?.() ??
                (data.enviadoEm ? new Date(data.enviadoEm) : undefined),
            });
          }
        }
      };

      const runLeadEmailBatches = async (batches: string[][]) => {
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i]!;
          queryCount += 1;
          auditEmailEnviosQuery({
            siteId: EMAIL_ENVIOS_AUDIT_SITES.SERVICE_APLICACAO_STATUS.id,
            surface: 'client',
            queryPattern: 'other',
            leadIdsCount: batch.length,
            emailTipos: ['aplicacao_aplicacao_antes', 'aplicacao_aplicacao_dia'],
            batchIndex: i,
            batchCount: batches.length,
            note: 'fallback legado leadEmail IN — só candidatos sem match por leadId',
          });

          const snap = await getDocs(
            query(collection(db, 'email_envios'), where('leadEmail', 'in', batch)),
          );
          docsRead += snap.size;

          for (const docSnap of snap.docs) {
            if (seenDocIds.has(docSnap.id)) continue;
            seenDocIds.add(docSnap.id);
            const data = docSnap.data();
            const emailTipo = String(data.emailTipo || '');
            if (!isEmailTipoAplicacao(emailTipo)) continue;
            enviosBrutos.push({
              id: docSnap.id,
              emailTipo,
              leadEmail: data.leadEmail,
              leadNome: data.leadNome,
              leadId: data.leadId,
              enviadoEm:
                data.enviadoEm?.toDate?.() ??
                (data.enviadoEm ? new Date(data.enviadoEm) : undefined),
            });
          }
        }
      };

      await runLeadIdBatches(plan.leadIdBatches);

      let usedLeadEmailFallback = plan.leadEmailBatches.length > 0;
      if (plan.leadIdBatches.length > 0) {
        const legacyEmails = emailsNeedingLegacyFallback(aplicacoes, enviosBrutos);
        if (legacyEmails.length > 0) {
          usedLeadEmailFallback = true;
          const legacyPlan = planEnviosAplicacaoQueries({
            leadIds: [],
            emails: legacyEmails,
            batchSize: APLICACAO_EMAIL_LEAD_IN_BATCH_SIZE,
          });
          await runLeadEmailBatches(legacyPlan.leadEmailBatches);
        }
      } else {
        await runLeadEmailBatches(plan.leadEmailBatches);
      }

      const emailsEnviados = filterEnviosAplicacaoInWindow(enviosBrutos, timeWindow);

      logEmailEnviosResidual({
        origin: 'CalendarioAplicacoes.verificarStatusEmails',
        route: '/metaadmingeral (Calendário Aplicações)',
        queryPattern: usedLeadEmailFallback ? 'leadId_in+leadEmail_in' : 'leadId_in',
        queryCount,
        candidateCount: leadIds.length || emails.length,
        docsReturned: emailsEnviados.length,
        docsReadEstimated: docsRead,
        durationMs: Date.now() - startedAt,
        batchCount: queryCount,
        paginationUsed: true,
        timeWindow: timeWindow
          ? { start: timeWindow.start.toISOString(), end: timeWindow.end.toISOString() }
          : null,
        note: `leadIds=${leadIds.length} emails=${emails.length} legacyFallback=${usedLeadEmailFallback}`,
      });

      return applyEmailStatusToAplicacoes(aplicacoes, emailsEnviados);
    } catch (error) {
      console.error('Erro ao verificar status de e-mails:', error);
      logEmailEnviosResidual({
        origin: 'CalendarioAplicacoes.verificarStatusEmails',
        route: '/metaadmingeral (Calendário Aplicações)',
        queryPattern: 'error',
        queryCount: 0,
        candidateCount: 0,
        docsReturned: 0,
        docsReadEstimated: 0,
        durationMs: Date.now() - startedAt,
        note: `error=${error instanceof Error ? error.message : 'unknown'}`,
      });
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

