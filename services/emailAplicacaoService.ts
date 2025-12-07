import { AplicacaoAgendada } from '@/types/calendario';

export class EmailAplicacaoService {
  /**
   * Verifica quais aplicações precisam de e-mail e envia
   * Regras:
   * - Se aplicação é HOJE: enviar apenas e-mail "Dia da aplicação"
   * - Se aplicação é AMANHÃ: enviar apenas e-mail "Dia anterior"
   * - Nunca enviar sobre datas passadas
   */
  static async processarEnviosAutomaticos(): Promise<{
    enviados: number;
    erros: number;
    detalhes: Array<{ aplicacao: AplicacaoAgendada; tipo: 'antes' | 'dia'; sucesso: boolean; erro?: string }>;
  }> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const resultado = {
      enviados: 0,
      erros: 0,
      detalhes: [] as Array<{ aplicacao: AplicacaoAgendada; tipo: 'antes' | 'dia'; sucesso: boolean; erro?: string }>,
    };

    try {
      // Buscar aplicações agendadas
      const { AplicacaoService } = await import('./aplicacaoService');
      const aplicacoes = await AplicacaoService.buscarAplicacoesAgendadas();

      console.log(`📧 Processando envios automáticos. Total de aplicações: ${aplicacoes.length}`);
      console.log(`📅 Hoje: ${hoje.toLocaleDateString('pt-BR')}, Amanhã: ${amanha.toLocaleDateString('pt-BR')}`);

      for (const aplicacao of aplicacoes) {
        const dataAplicacao = new Date(aplicacao.dataAplicacao);
        dataAplicacao.setHours(0, 0, 0, 0);

        // Verificar se é hoje
        if (dataAplicacao.getTime() === hoje.getTime()) {
          // Enviar e-mail "dia da aplicação" se ainda não foi enviado
          if (aplicacao.statusEmailDia !== 'enviado') {
            console.log(`📧 Enviando e-mail "dia da aplicação" para ${aplicacao.pacienteNome} (aplicação hoje)`);
            try {
              const response = await fetch('/api/send-email-aplicacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  pacienteId: aplicacao.pacienteId,
                  numeroAplicacao: aplicacao.numeroAplicacao,
                  tipo: 'dia',
                }),
              });

              if (response.ok) {
                resultado.enviados++;
                resultado.detalhes.push({
                  aplicacao,
                  tipo: 'dia',
                  sucesso: true,
                });
              } else {
                resultado.erros++;
                const errorData = await response.json();
                resultado.detalhes.push({
                  aplicacao,
                  tipo: 'dia',
                  sucesso: false,
                  erro: errorData.error || 'Erro desconhecido',
                });
              }
            } catch (error) {
              resultado.erros++;
              resultado.detalhes.push({
                aplicacao,
                tipo: 'dia',
                sucesso: false,
                erro: (error as Error).message,
              });
            }
          }
        }
        // Verificar se é amanhã
        else if (dataAplicacao.getTime() === amanha.getTime()) {
          // Enviar e-mail "dia anterior" se ainda não foi enviado
          if (aplicacao.statusEmailAntes !== 'enviado') {
            console.log(`📧 Enviando e-mail "dia anterior" para ${aplicacao.pacienteNome} (aplicação amanhã)`);
            try {
              const response = await fetch('/api/send-email-aplicacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  pacienteId: aplicacao.pacienteId,
                  numeroAplicacao: aplicacao.numeroAplicacao,
                  tipo: 'antes',
                }),
              });

              if (response.ok) {
                resultado.enviados++;
                resultado.detalhes.push({
                  aplicacao,
                  tipo: 'antes',
                  sucesso: true,
                });
              } else {
                resultado.erros++;
                const errorData = await response.json();
                resultado.detalhes.push({
                  aplicacao,
                  tipo: 'antes',
                  sucesso: false,
                  erro: errorData.error || 'Erro desconhecido',
                });
              }
            } catch (error) {
              resultado.erros++;
              resultado.detalhes.push({
                aplicacao,
                tipo: 'antes',
                sucesso: false,
                erro: (error as Error).message,
              });
            }
          }
        }
      }

      return resultado;
    } catch (error) {
      console.error('Erro ao processar envios automáticos:', error);
      throw error;
    }
  }
}

