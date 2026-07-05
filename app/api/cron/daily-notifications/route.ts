import { NextRequest, NextResponse } from 'next/server';
import { ScheduledNotificationService } from '@/services/scheduledNotificationService';
import { assertCronProductionEnvironment } from '@/lib/email/cronProductionGate';

// Esta função será chamada pelo cron job do Vercel ou serviço externo
export async function GET(request: NextRequest) {
  const envGate = assertCronProductionEnvironment(request);
  if (!envGate.ok) {
    return NextResponse.json(envGate.body, { status: envGate.status });
  }

  try {
    console.log('🕐 Iniciando cron job de notificações diárias...');
    
    // Verificar se é uma chamada autorizada (opcional - adicione token se necessário)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.log('❌ Token de autorização inválido');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Processar notificações
    const resultado = await ScheduledNotificationService.processarNotificacoesDiarias();
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      results: resultado,
      summary: {
        totalEnviados: resultado.lembreteAmanha.success + resultado.lembreteHoje.success,
        totalFalhas: resultado.lembreteAmanha.failed + resultado.lembreteHoje.failed
      }
    };

    console.log('✅ Cron job concluído:', response);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Erro no cron job:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Permitir POST também para testes manuais
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, teste } = body;

    if (teste) {
      console.log('🧪 Executando teste de notificações...');
      await ScheduledNotificationService.testarNotificacoes(tipo);
      
      return NextResponse.json({
        success: true,
        message: 'Teste de notificações executado com sucesso',
        timestamp: new Date().toISOString()
      });
    }

    // Execução manual do cron
    const resultado = await ScheduledNotificationService.processarNotificacoesDiarias();
    
    return NextResponse.json({
      success: true,
      message: 'Notificações processadas manualmente',
      results: resultado,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro no processamento manual:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar notificações',
        details: (error as Error).message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
