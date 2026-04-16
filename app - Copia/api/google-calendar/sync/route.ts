import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/services/googleCalendarService';
import { PacienteService } from '@/services/pacienteService';
import { MedicoService } from '@/services/medicoService';

interface EventoCalendario {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
}

// Função para obter token atualizado (com refresh se necessário)
async function obterTokenAtualizado(userId: string): Promise<string | null> {
  const token = await GoogleCalendarService.getToken(userId);
  if (!token || !token.accessToken) {
    return null;
  }

  // Verificar se token expirou
  if (token.expiresAt && new Date() >= token.expiresAt) {
    // Refresh token
    if (!token.refreshToken) {
      return null;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return null;
    }

    try {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: token.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const newExpiresAt = new Date();
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (refreshData.expires_in || 3600));

        await GoogleCalendarService.salvarToken({
          ...token,
          accessToken: refreshData.access_token,
          expiresAt: newExpiresAt
        });

        return refreshData.access_token;
      }
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      return null;
    }
  }

  return token.accessToken;
}

// Criar evento no Google Calendar
async function criarEvento(accessToken: string, evento: EventoCalendario): Promise<string | null> {
  try {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(evento),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Erro ao criar evento:', error);
      return null;
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Erro ao criar evento no Google Calendar:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tipo } = body; // tipo: 'medico' | 'paciente'

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    const accessToken = await obterTokenAtualizado(userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Token não encontrado ou expirado. Reautorize o acesso.' },
        { status: 401 }
      );
    }

    let eventosCriados = 0;
    let eventosErro = 0;

    if (tipo === 'medico') {
      // Sincronizar todas as aplicações de todos os pacientes do médico
      const medico = await MedicoService.getMedicoById(userId);
      if (!medico) {
        return NextResponse.json(
          { error: 'Médico não encontrado' },
          { status: 404 }
        );
      }

      const pacientes = await PacienteService.getPacientesByMedico(userId);
      const pacientesEmTratamento = pacientes.filter(p => p.statusTratamento === 'em_tratamento');

      for (const paciente of pacientesEmTratamento) {
        const planoTerapeutico = paciente.planoTerapeutico;
        if (!planoTerapeutico?.startDate || !planoTerapeutico?.injectionDayOfWeek) {
          continue;
        }

        const numeroSemanas = planoTerapeutico.numeroSemanasTratamento || 18;
        const doseInicial = planoTerapeutico.currentDoseMg || 2.5;

        const diasSemana: { [key: string]: number } = {
          dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6
        };

        const diaDesejado = diasSemana[planoTerapeutico.injectionDayOfWeek];
        const startDateValue = planoTerapeutico.startDate;
        const primeiraDose = startDateValue instanceof Date 
          ? new Date(startDateValue)
          : new Date(startDateValue as any);
        primeiraDose.setHours(0, 0, 0, 0);
        while (primeiraDose.getDay() !== diaDesejado) {
          primeiraDose.setDate(primeiraDose.getDate() + 1);
        }

        const locais = ['abdome', 'coxa', 'braco'];
        const evolucao = paciente.evolucaoSeguimento || [];

        for (let semana = 0; semana < numeroSemanas; semana++) {
          const dataDose = new Date(primeiraDose);
          dataDose.setDate(primeiraDose.getDate() + (semana * 7));
          dataDose.setHours(8, 0, 0, 0); // 8h da manhã

          // Calcular dose
          let semanasDesdeUltimoCiclo = semana;
          for (let s = 0; s < semana; s++) {
            const dataPrevista = new Date(primeiraDose);
            dataPrevista.setDate(primeiraDose.getDate() + (s * 7));
            const registro = evolucao.find(e => {
              if (!e.dataRegistro) return false;
              const dataRegistro = e.dataRegistro instanceof Date 
                ? new Date(e.dataRegistro)
                : new Date(e.dataRegistro as any);
              dataRegistro.setHours(0, 0, 0, 0);
              const diffDias = Math.abs((dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
              return diffDias <= 1;
            });
            if (registro && registro.dataRegistro) {
              const dataRegistro = registro.dataRegistro instanceof Date 
                ? new Date(registro.dataRegistro)
                : new Date(registro.dataRegistro as any);
              dataRegistro.setHours(0, 0, 0, 0);
              const diffDias = (dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24);
              if (diffDias >= 4) {
                semanasDesdeUltimoCiclo = semana - s - 1;
                break;
              }
            }
          }
          const dosePlanejada = doseInicial + (Math.floor(semanasDesdeUltimoCiclo / 4) * 2.5);

          // Rotação de local
          const dataSemanaAnterior = new Date(dataDose);
          dataSemanaAnterior.setDate(dataDose.getDate() - 7);
          const aplicacaoSemanaAnterior = evolucao.find(e => {
            const dataRegistro = e.dataRegistro instanceof Date 
              ? new Date(e.dataRegistro)
              : new Date(e.dataRegistro as any);
            const diffDias = Math.abs((dataRegistro.getTime() - dataSemanaAnterior.getTime()) / (1000 * 60 * 60 * 24));
            return diffDias <= 1;
          });
          let ultimoLocalAplicado = aplicacaoSemanaAnterior?.localAplicacao;
          if (!ultimoLocalAplicado) {
            const ultimaAplicacao = evolucao
              .filter(e => {
                const dataRegistro = e.dataRegistro instanceof Date 
                  ? new Date(e.dataRegistro)
                  : new Date(e.dataRegistro as any);
                return dataRegistro < dataDose;
              })
              .sort((a, b) => {
                const dataA = a.dataRegistro instanceof Date 
                  ? new Date(a.dataRegistro)
                  : new Date(a.dataRegistro as any);
                const dataB = b.dataRegistro instanceof Date 
                  ? new Date(b.dataRegistro)
                  : new Date(b.dataRegistro as any);
                return dataB.getTime() - dataA.getTime();
              })[0];
            ultimoLocalAplicado = ultimaAplicacao?.localAplicacao;
          }
          let localIndex = 0;
          if (ultimoLocalAplicado) {
            const ultimoLocalIndex = locais.indexOf(ultimoLocalAplicado);
            if (ultimoLocalIndex >= 0) {
              localIndex = (ultimoLocalIndex + 1) % locais.length;
            }
          }
          const localNome = locais[localIndex] === 'abdome' ? 'Abdome' : locais[localIndex] === 'coxa' ? 'Coxa' : 'Braço';

          const evento: EventoCalendario = {
            summary: `${paciente.nome} - Tirzepatida Semana ${semana + 1}`,
            description: `Aplicação de Tirzepatida\n\nPaciente: ${paciente.nome}\nSemana: ${semana + 1}\nDose: ${dosePlanejada}mg\nLocal: ${localNome}`,
            start: {
              dateTime: dataDose.toISOString(),
              timeZone: 'America/Sao_Paulo'
            },
            end: {
              dateTime: new Date(dataDose.getTime() + 60 * 60 * 1000).toISOString(), // 1 hora depois
              timeZone: 'America/Sao_Paulo'
            }
          };

          const eventoId = await criarEvento(accessToken, evento);
          if (eventoId) {
            eventosCriados++;
          } else {
            eventosErro++;
          }
        }
      }
    } else if (tipo === 'paciente') {
      // Sincronizar aplicações do paciente
      const paciente = await PacienteService.getPacienteById(userId);
      if (!paciente) {
        return NextResponse.json(
          { error: 'Paciente não encontrado' },
          { status: 404 }
        );
      }

      const planoTerapeutico = paciente.planoTerapeutico;
      if (!planoTerapeutico?.startDate || !planoTerapeutico?.injectionDayOfWeek) {
        return NextResponse.json(
          { error: 'Plano terapêutico não configurado' },
          { status: 400 }
        );
      }

      const numeroSemanas = planoTerapeutico.numeroSemanasTratamento || 18;
      const doseInicial = planoTerapeutico.currentDoseMg || 2.5;

      const diasSemana: { [key: string]: number } = {
        dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6
      };

      const diaDesejado = diasSemana[planoTerapeutico.injectionDayOfWeek];
      const startDateValue = planoTerapeutico.startDate;
      const primeiraDose = startDateValue instanceof Date 
        ? new Date(startDateValue)
        : new Date(startDateValue as any);
      primeiraDose.setHours(0, 0, 0, 0);
      while (primeiraDose.getDay() !== diaDesejado) {
        primeiraDose.setDate(primeiraDose.getDate() + 1);
      }

      const evolucao = paciente.evolucaoSeguimento || [];

      for (let semana = 0; semana < numeroSemanas; semana++) {
        const dataDose = new Date(primeiraDose);
        dataDose.setDate(primeiraDose.getDate() + (semana * 7));
        dataDose.setHours(8, 0, 0, 0);

        // Calcular dose com atrasos
        let semanasDesdeUltimoCiclo = semana;
        for (let s = 0; s < semana; s++) {
          const dataPrevista = new Date(primeiraDose);
          dataPrevista.setDate(primeiraDose.getDate() + (s * 7));
          const registro = evolucao.find(e => {
            if (!e.dataRegistro) return false;
            const dataRegistro = e.dataRegistro instanceof Date 
              ? new Date(e.dataRegistro)
              : new Date(e.dataRegistro as any);
            dataRegistro.setHours(0, 0, 0, 0);
            const diffDias = Math.abs((dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24));
            return diffDias <= 1;
          });
          if (registro && registro.dataRegistro) {
            const dataRegistro = registro.dataRegistro instanceof Date 
              ? new Date(registro.dataRegistro)
              : new Date(registro.dataRegistro as any);
            dataRegistro.setHours(0, 0, 0, 0);
            const diffDias = (dataRegistro.getTime() - dataPrevista.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDias >= 4) {
              semanasDesdeUltimoCiclo = semana - s - 1;
              break;
            }
          }
        }
        const dosePlanejada = doseInicial + (Math.floor(semanasDesdeUltimoCiclo / 4) * 2.5);

        const evento: EventoCalendario = {
          summary: `Tirzepatida - Semana ${semana + 1} - ${dosePlanejada}mg`,
          description: `Aplicação de Tirzepatida\n\nSemana: ${semana + 1}\nDose: ${dosePlanejada}mg`,
          start: {
            dateTime: dataDose.toISOString(),
            timeZone: 'America/Sao_Paulo'
          },
          end: {
            dateTime: new Date(dataDose.getTime() + 60 * 60 * 1000).toISOString(),
            timeZone: 'America/Sao_Paulo'
          }
        };

        const eventoId = await criarEvento(accessToken, evento);
        if (eventoId) {
          eventosCriados++;
        } else {
          eventosErro++;
        }
      }
    }

    // Atualizar data de sincronização
    await GoogleCalendarService.atualizarSincronizacao(userId);

    return NextResponse.json({
      success: true,
      eventosCriados,
      eventosErro
    });
  } catch (error) {
    console.error('Erro ao sincronizar eventos:', error);
    return NextResponse.json(
      { error: 'Erro ao sincronizar eventos', details: (error as Error).message },
      { status: 500 }
    );
  }
}

