'use client';

import { useState } from 'react';
import { Clock, Play, TestTube, Calendar, Bell, CheckCircle, XCircle } from 'lucide-react';

interface TestResult {
  success: boolean;
  message: string;
  details?: unknown;
  timestamp: string;
}

export default function NotificationScheduler() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const handleTestarNotificacoes = async (tipo: 'lembrete-hoje' | 'lembrete-amanha') => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/cron/daily-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teste: true,
          tipo: tipo
        }),
      });

      const data = await response.json();
      
      setTestResult({
        success: response.ok,
        message: data.message || (response.ok ? 'Teste executado com sucesso' : 'Erro no teste'),
        details: data,
        timestamp: new Date().toLocaleString('pt-BR')
      });

    } catch (error) {
      setTestResult({
        success: false,
        message: `Erro ao executar teste: ${(error as Error).message}`,
        timestamp: new Date().toLocaleString('pt-BR')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecutarManual = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/cron/daily-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teste: false
        }),
      });

      const data = await response.json();
      
      setTestResult({
        success: response.ok,
        message: data.message || (response.ok ? 'Notificações processadas' : 'Erro no processamento'),
        details: data,
        timestamp: new Date().toLocaleString('pt-BR')
      });

    } catch (error) {
      setTestResult({
        success: false,
        message: `Erro ao processar notificações: ${(error as Error).message}`,
        timestamp: new Date().toLocaleString('pt-BR')
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Clock className="w-6 h-6 text-blue-600 mr-3" />
          <h3 className="text-lg font-semibold text-gray-900">Notificações Automáticas</h3>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Bell className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-2">Sistema Configurado</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>19:00</strong> - Lembrete para o dia seguinte</li>
                <li>• <strong>06:00</strong> - Lembrete para o dia atual</li>
                <li>• Enviado automaticamente via e-mail e WhatsApp</li>
                <li>• Apenas para residentes com escalas no dia</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Teste Lembrete Hoje */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <TestTube className="w-5 h-5 text-green-600 mr-2" />
              <h4 className="font-medium text-gray-900">Testar Hoje</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Simula o envio de lembretes das 06:00 para escalas de hoje
            </p>
            <button
              onClick={() => handleTestarNotificacoes('lembrete-hoje')}
              disabled={isLoading}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isLoading ? 'Testando...' : 'Testar Agora'}
            </button>
          </div>

          {/* Teste Lembrete Amanhã */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Calendar className="w-5 h-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-gray-900">Testar Amanhã</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Simula o envio de lembretes das 19:00 para escalas de amanhã
            </p>
            <button
              onClick={() => handleTestarNotificacoes('lembrete-amanha')}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isLoading ? 'Testando...' : 'Testar Agora'}
            </button>
          </div>

          {/* Execução Manual */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Play className="w-5 h-5 text-purple-600 mr-2" />
              <h4 className="font-medium text-gray-900">Executar Manual</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Executa o processamento baseado no horário atual
            </p>
            <button
              onClick={handleExecutarManual}
              disabled={isLoading}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isLoading ? 'Executando...' : 'Executar Agora'}
            </button>
          </div>
        </div>

        {/* Resultado do Teste */}
        {testResult && (
          <div className={`mt-6 rounded-lg p-4 ${
            testResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start">
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
              )}
              <div className="flex-1">
                <h4 className={`font-medium ${
                  testResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {testResult.success ? 'Teste Executado com Sucesso' : 'Erro no Teste'}
                </h4>
                <p className={`text-sm mt-1 ${
                  testResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {testResult.message}
                </p>
                <p className={`text-xs mt-2 ${
                  testResult.success ? 'text-green-600' : 'text-red-600'
                }`}>
                  Executado em: {testResult.timestamp}
                </p>
                
                {/* Detalhes do resultado */}
                {testResult.details && testResult.success && (
                  <div className="mt-3 text-sm">
                    <p className="text-gray-600">
                      <strong>Detalhes:</strong> Verifique os logs do console para mais informações
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Informações sobre Configuração */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuração do Sistema</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Como Funciona</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• O sistema verifica automaticamente as escalas todos os dias</li>
              <li>• Às 19:00, envia lembretes para as escalas do dia seguinte</li>
              <li>• Às 06:00, envia lembretes para as escalas do dia atual</li>
              <li>• Apenas residentes com escalas no dia recebem notificações</li>
              <li>• Mensagens incluem todos os serviços (manhã e tarde) do residente</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Formato da Mensagem</h4>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
              <p className="font-medium">📅 CENOFT - Lembrete de Escala</p>
              <p className="mt-1">Olá [Nome]!</p>
              <p className="mt-1">Você tem escala amanhã/hoje ([Data]):</p>
              <p className="mt-1">🌅 <strong>Manhã</strong>: [Serviço] - [Local]</p>
              <p>🌇 <strong>Tarde</strong>: [Serviço] - [Local]</p>
              <p className="mt-1 italic">Sistema Automático CENOFT</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Configuração no Vercel</h4>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Importante:</strong> O sistema usa Vercel Cron Jobs. Certifique-se de que:
              </p>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>• O arquivo <code>vercel.json</code> está configurado</li>
                <li>• O projeto está deployado no Vercel</li>
                <li>• Os cron jobs estão ativos no dashboard do Vercel</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
