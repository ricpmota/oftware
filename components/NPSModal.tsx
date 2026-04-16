'use client';

import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { NPSService } from '@/services/npsService';
import { NPSResposta, NPSTipo, classificarNPS } from '@/types/nps';

interface NPSModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: NPSTipo; // 'paciente' ou 'medico'
  userId: string;
  pacienteId?: string; // Opcional, usado quando médico responde sobre um paciente
  medicoResponsavelId?: string; // Opcional, ID do médico responsável (quando tipo === 'paciente')
}

export default function NPSModal({ isOpen, onClose, tipo, userId, pacienteId, medicoResponsavelId }: NPSModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // Estado do formulário
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [melhoriaTexto, setMelhoriaTexto] = useState('');
  
  // Estados para paciente
  const [acompanhamentoMedico, setAcompanhamentoMedico] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [clarezaTratamento, setClarezaTratamento] = useState<'muito_claras' | 'claras' | 'mais_ou_menos' | 'confusas' | null>(null);
  const [segurancaPrivacidade, setSegurancaPrivacidade] = useState<'muito_seguro' | 'seguro' | 'indiferente' | 'inseguro' | null>(null);
  const [impactoTratamento, setImpactoTratamento] = useState<'ajuda_muito' | 'ajuda' | 'ajuda_pouco' | 'nao_ajuda' | null>(null);
  const [motivacaoContinuar, setMotivacaoContinuar] = useState('');

  // Estados para médico
  const [facilidadeUso, setFacilidadeUso] = useState<'muito' | 'sim' | 'pouco' | 'nao' | null>(null);
  const [qualidadeInformacoes, setQualidadeInformacoes] = useState<'excelentes' | 'boas' | 'regulares' | 'insuficientes' | null>(null);
  const [ganhoProfissional, setGanhoProfissional] = useState<'muito' | 'sim' | 'pouco' | 'nao' | null>(null);
  const [intencaoContinuidade, setIntencaoContinuidade] = useState<'com_certeza' | 'provavelmente' | 'nao_sei' | 'provavelmente_nao' | null>(null);
  const [oQueTornariaIndispensavel, setOQueTornariaIndispensavel] = useState('');

  // Estados para extras
  const [comoConheceu, setComoConheceu] = useState<'medico' | 'indicacao' | 'instagram' | 'google' | 'outro' | null>(null);
  const [oQueMaisUsa, setOQueMaisUsa] = useState<string[]>([]);
  const [oQueSenteFalta, setOQueSenteFalta] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setNpsScore(null);
      setMelhoriaTexto('');
      setErro('');
    }
  }, [isOpen]);

  const handleNpsScoreClick = (score: number) => {
    setNpsScore(score);
    setErro('');
  };

  const handleOQueMaisUsaToggle = (item: string) => {
    setOQueMaisUsa(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const handleOQueSenteFaltaToggle = (item: string) => {
    setOQueSenteFalta(prev => 
      prev.includes(item) 
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const podeAvancar = () => {
    if (step === 1) {
      return npsScore !== null;
    }
    if (step === 2) {
      const classificacao = npsScore !== null ? classificarNPS(npsScore) : null;
      // Se for detrator ou neutro (≤8), campo é obrigatório
      if (classificacao === 'detrator' || classificacao === 'neutro') {
        return !!melhoriaTexto.trim();
      }
      return true; // Para promotores (9-10), é opcional
    }
    return true;
  };

  // Calcular total de steps e índice atual
  const totalSteps = 10; // 1, 2, 4-8 (paciente) ou 9-13 (médico), 15-17 (paciente) ou 14-16 (médico)
  const getCurrentStepIndex = () => {
    if (tipo === 'paciente') {
      if (step === 1) return 0;
      if (step === 2) return 1;
      if (step >= 4 && step <= 8) return step - 2; // 4->2, 5->3, 6->4, 7->5, 8->6
      if (step === 15) return 7;
      if (step === 16) return 8;
      if (step === 17) return 9;
      return 0;
    } else {
      if (step === 1) return 0;
      if (step === 2) return 1;
      if (step >= 9 && step <= 13) return step - 7; // 9->2, 10->3, 11->4, 12->5, 13->6
      if (step === 14) return 7;
      if (step === 15) return 8;
      if (step === 16) return 9;
      return 0;
    }
  };

  const handleAvancar = () => {
    if (!podeAvancar()) {
      setErro('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (step === 2 && tipo === 'paciente') {
      setStep(4); // Pular para bloco paciente
    } else if (step === 2 && tipo === 'medico') {
      setStep(9); // Pular para bloco médico
    } else if (step === 8 && tipo === 'paciente') {
      setStep(15); // Primeira pergunta extra
    } else if (step === 13 && tipo === 'medico') {
      setStep(14); // Primeira pergunta extra
    } else if (step === 15 && tipo === 'paciente') {
      setStep(16); // Segunda pergunta extra
    } else if (step === 14 && tipo === 'medico') {
      setStep(15); // Segunda pergunta extra
    } else if (step === 16 && tipo === 'paciente') {
      setStep(17); // Terceira pergunta extra
    } else if (step === 15 && tipo === 'medico') {
      setStep(16); // Terceira pergunta extra
    } else {
      setStep(step + 1);
    }
    setErro('');
  };

  const handleVoltar = () => {
    if (step === 4 && tipo === 'paciente') {
      setStep(2);
    } else if (step === 9 && tipo === 'medico') {
      setStep(2);
    } else if (step === 15 && tipo === 'paciente') {
      setStep(8);
    } else if (step === 14 && tipo === 'medico') {
      setStep(13);
    } else if (step === 16 && tipo === 'paciente') {
      setStep(15);
    } else if (step === 15 && tipo === 'medico') {
      setStep(14);
    } else if (step === 17 && tipo === 'paciente') {
      setStep(16);
    } else if (step === 16 && tipo === 'medico') {
      setStep(15);
    } else {
      setStep(step - 1);
    }
    setErro('');
  };

  // Função para remover campos undefined de um objeto
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj;
    if (typeof obj !== 'object') return obj;
    
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          const cleanedNested = removeUndefined(obj[key]);
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested;
          }
        } else {
          cleaned[key] = obj[key];
        }
      }
    }
    return cleaned;
  };

  const handleEnviar = async () => {
    if (!podeAvancar()) {
      setErro('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setErro('');

    try {
      const resposta: any = {
        userId,
        tipo,
        npsScore: npsScore!,
      };

      // Adicionar pacienteId apenas se fornecido
      if (pacienteId) {
        resposta.pacienteId = pacienteId;
      }

      // Adicionar medicoResponsavelId apenas se tipo for 'paciente' e o ID existir
      if (tipo === 'paciente' && medicoResponsavelId) {
        resposta.medicoResponsavelId = medicoResponsavelId;
        console.log('💾 NPS: Salvando com medicoResponsavelId:', medicoResponsavelId);
      }

      // Adicionar melhoriaTexto apenas se tiver conteúdo
      if (melhoriaTexto.trim()) {
        resposta.melhoriaTexto = melhoriaTexto.trim();
      }

      if (tipo === 'paciente') {
        const pacienteData: any = {};
        if (acompanhamentoMedico) pacienteData.acompanhamentoMedico = acompanhamentoMedico;
        if (clarezaTratamento) pacienteData.clarezaTratamento = clarezaTratamento;
        if (segurancaPrivacidade) pacienteData.segurancaPrivacidade = segurancaPrivacidade;
        if (impactoTratamento) pacienteData.impactoTratamento = impactoTratamento;
        if (motivacaoContinuar.trim()) pacienteData.motivacaoContinuar = motivacaoContinuar.trim();
        if (Object.keys(pacienteData).length > 0) {
          resposta.paciente = pacienteData;
        }
      } else {
        const medicoData: any = {};
        if (facilidadeUso) medicoData.facilidadeUso = facilidadeUso;
        if (qualidadeInformacoes) medicoData.qualidadeInformacoes = qualidadeInformacoes;
        if (ganhoProfissional) medicoData.ganhoProfissional = ganhoProfissional;
        if (intencaoContinuidade) medicoData.intencaoContinuidade = intencaoContinuidade;
        if (oQueTornariaIndispensavel.trim()) medicoData.oQueTornariaIndispensavel = oQueTornariaIndispensavel.trim();
        if (Object.keys(medicoData).length > 0) {
          resposta.medico = medicoData;
        }
      }

      // Adicionar extras se preenchidos
      const extrasData: any = {};
      if (comoConheceu) extrasData.comoConheceu = comoConheceu;
      if (oQueMaisUsa.length > 0) extrasData.oQueMaisUsa = oQueMaisUsa;
      if (oQueSenteFalta.length > 0) extrasData.oQueSenteFalta = oQueSenteFalta;
      if (Object.keys(extrasData).length > 0) {
        resposta.extras = extrasData;
      }

      console.log('💾 NPS: Resposta antes de remover undefined:', resposta);

      // Remover todos os campos undefined antes de salvar
      const respostaLimpa = removeUndefined(resposta);

      console.log('💾 NPS: Resposta após remover undefined:', respostaLimpa);
      console.log('💾 NPS: medicoResponsavelId na resposta limpa:', respostaLimpa.medicoResponsavelId);

      await NPSService.salvarResposta(respostaLimpa);
      
      // Fechar modal e notificar sucesso
      onClose();
      
      // Opcional: mostrar mensagem de sucesso
      if (typeof window !== 'undefined') {
        alert('Obrigado pela sua resposta! Sua opinião é muito importante para nós.');
      }
    } catch (error) {
      console.error('Erro ao salvar resposta NPS:', error);
      setErro('Erro ao enviar resposta. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const classificacao = npsScore !== null ? classificarNPS(npsScore) : null;
  const precisaMelhoriaTexto = classificacao === 'detrator' || classificacao === 'neutro';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white w-full h-full md:rounded-lg md:shadow-xl md:max-w-4xl md:w-[95vw] md:h-[95vh] md:max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 z-10">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Avaliação Oftware</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Indicadores de progresso */}
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalSteps }).map((_, index) => {
              const currentIndex = getCurrentStepIndex();
              return (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index <= currentIndex
                      ? 'bg-blue-600 w-8'
                      : 'bg-gray-300 w-2'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {erro && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {erro}
            </div>
          )}

          {/* Step 1: Pergunta NPS Central */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Em uma escala de 0 a 10, o quanto você recomendaria o Oftware para um amigo ou colega?
                </h3>
                <p className="text-sm text-gray-600 mb-6">Esta pergunta é obrigatória</p>
              </div>

              <div className="flex justify-center gap-2 flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                  <button
                    key={score}
                    onClick={() => handleNpsScoreClick(score)}
                    className={`w-14 h-14 rounded-lg font-bold text-lg transition-all ${
                      npsScore === score
                        ? 'bg-blue-600 text-white scale-110'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>

              {npsScore !== null && (
                <div className="text-center mt-4">
                  <p className="text-sm font-medium text-gray-700">
                    {classificacao === 'promotor' && '🟢 Promotor (9-10)'}
                    {classificacao === 'neutro' && '🟡 Neutro (7-8)'}
                    {classificacao === 'detrator' && '🔴 Detrator (0-6)'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Pergunta Aberta Estratégica */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  O que podemos melhorar para tornar sua experiência no Oftware excelente?
                </h3>
                {precisaMelhoriaTexto && (
                  <p className="text-sm text-red-600 mb-2">Este campo é obrigatório para sua avaliação</p>
                )}
                {!precisaMelhoriaTexto && (
                  <p className="text-sm text-gray-600 mb-2">Campo opcional, mas sua opinião é muito importante!</p>
                )}
              </div>

              <textarea
                value={melhoriaTexto}
                onChange={(e) => setMelhoriaTexto(e.target.value)}
                className="w-full h-32 p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                placeholder="Compartilhe suas sugestões, críticas e ideias..."
              />
            </div>
          )}

          {/* Steps 4-8: Bloco Paciente */}
          {tipo === 'paciente' && step === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Experiência com o acompanhamento médico</h3>
              <div>
                <p className="text-base font-medium text-gray-700 mb-4">Como você avalia seu acompanhamento médico no Oftware?</p>
                <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                  {[5, 4, 3, 2, 1].map(num => (
                    <button
                      key={num}
                      onClick={() => setAcompanhamentoMedico(num as 1 | 2 | 3 | 4 | 5)}
                      className={`flex items-center md:flex-col gap-3 md:gap-0 p-3 md:p-4 rounded-lg border-2 transition-all ${
                        acompanhamentoMedico === num
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-center mb-0 md:mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={20}
                            className={i < num ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                      <p className="text-xs md:text-center text-gray-600 font-medium">
                        {num === 5 && 'Excelente'}
                        {num === 4 && 'Bom'}
                        {num === 3 && 'Regular'}
                        {num === 2 && 'Ruim'}
                        {num === 1 && 'Péssimo'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tipo === 'paciente' && step === 5 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Clareza do tratamento</h3>
              <div>
                <p className="text-base font-medium text-gray-700 mb-4">As orientações sobre medicação, alimentação e hábitos ficaram claras?</p>
                <div className="space-y-2">
                  {(['muito_claras', 'claras', 'mais_ou_menos', 'confusas'] as const).map(opcao => (
                    <label key={opcao} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      clarezaTratamento === opcao 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                      <input
                        type="radio"
                        name="clareza"
                        value={opcao}
                        checked={clarezaTratamento === opcao}
                        onChange={() => setClarezaTratamento(opcao)}
                        className="mr-3 w-4 h-4 text-blue-600"
                      />
                      <span className="text-base text-gray-700">
                        {opcao === 'muito_claras' && 'Muito claras'}
                        {opcao === 'claras' && 'Claras'}
                        {opcao === 'mais_ou_menos' && 'Mais ou menos'}
                        {opcao === 'confusas' && 'Confusas'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tipo === 'paciente' && step === 6 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Sensação de segurança e privacidade</h3>
              <div>
                <p className="text-base font-medium text-gray-700 mb-4">Você se sente seguro(a) usando o Oftware para seu tratamento?</p>
                <div className="space-y-2">
                  {(['muito_seguro', 'seguro', 'indiferente', 'inseguro'] as const).map(opcao => (
                    <label key={opcao} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      segurancaPrivacidade === opcao 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                      <input
                        type="radio"
                        name="seguranca"
                        value={opcao}
                        checked={segurancaPrivacidade === opcao}
                        onChange={() => setSegurancaPrivacidade(opcao)}
                        className="mr-3 w-4 h-4 text-blue-600"
                      />
                      <span className="text-base text-gray-700">
                        {opcao === 'muito_seguro' && 'Muito seguro'}
                        {opcao === 'seguro' && 'Seguro'}
                        {opcao === 'indiferente' && 'Indiferente'}
                        {opcao === 'inseguro' && 'Inseguro'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tipo === 'paciente' && step === 7 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Impacto percebido no tratamento</h3>
              <div>
                <p className="text-base font-medium text-gray-700 mb-4">O Oftware te ajuda a manter o tratamento e os hábitos?</p>
                <div className="space-y-2">
                  {(['ajuda_muito', 'ajuda', 'ajuda_pouco', 'nao_ajuda'] as const).map(opcao => (
                    <label key={opcao} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      impactoTratamento === opcao 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                      <input
                        type="radio"
                        name="impacto"
                        value={opcao}
                        checked={impactoTratamento === opcao}
                        onChange={() => setImpactoTratamento(opcao)}
                        className="mr-3 w-4 h-4 text-blue-600"
                      />
                      <span className="text-base text-gray-700">
                        {opcao === 'ajuda_muito' && 'Ajuda muito'}
                        {opcao === 'ajuda' && 'Ajuda'}
                        {opcao === 'ajuda_pouco' && 'Ajuda pouco'}
                        {opcao === 'nao_ajuda' && 'Não ajuda'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tipo === 'paciente' && step === 8 && (
            <div className="space-y-6">
              <div>
                <p className="text-xl font-semibold text-gray-900 mb-6">O que mais te motiva a continuar seu tratamento usando o Oftware?</p>
                <textarea
                  value={motivacaoContinuar}
                  onChange={(e) => setMotivacaoContinuar(e.target.value)}
                  className="w-full h-32 p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                  placeholder="Compartilhe o que te motiva..."
                />
              </div>
            </div>
          )}

          {/* Steps 9-12: Bloco Médico */}
          {tipo === 'medico' && step === 9 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Facilidade de uso</h3>
              <div>
                <p className="text-base font-medium text-gray-700 mb-4">O Oftware facilita sua rotina de acompanhamento do paciente?</p>
                <div className="space-y-2">
                  {(['muito', 'sim', 'pouco', 'nao'] as const).map(opcao => (
                    <label key={opcao} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      facilidadeUso === opcao 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                      <input
                        type="radio"
                        name="facilidade"
                        value={opcao}
                        checked={facilidadeUso === opcao}
                        onChange={() => setFacilidadeUso(opcao)}
                        className="mr-3 w-4 h-4 text-blue-600"
                      />
                      <span className="text-base text-gray-700 capitalize">{opcao}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tipo === 'medico' && step === 10 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Qualidade das informações clínicas</h3>
              <div>
                <p className="text-base font-medium text-gray-700 mb-4">As informações dos pacientes são suficientes e bem organizadas?</p>
                <div className="space-y-2">
                  {(['excelentes', 'boas', 'regulares', 'insuficientes'] as const).map(opcao => (
                    <label key={opcao} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      qualidadeInformacoes === opcao 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                      <input
                        type="radio"
                        name="qualidade"
                        value={opcao}
                        checked={qualidadeInformacoes === opcao}
                        onChange={() => setQualidadeInformacoes(opcao)}
                        className="mr-3 w-4 h-4 text-blue-600"
                      />
                      <span className="text-base text-gray-700 capitalize">{opcao}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tipo === 'medico' && step === 11 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Ganho profissional</h3>
              <div>
                <p className="text-base font-medium text-gray-700 mb-4">O Oftware agrega valor à sua prática médica?</p>
                <div className="space-y-2">
                  {(['muito', 'sim', 'pouco', 'nao'] as const).map(opcao => (
                    <label key={opcao} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      ganhoProfissional === opcao 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                      <input
                        type="radio"
                        name="ganho"
                        value={opcao}
                        checked={ganhoProfissional === opcao}
                        onChange={() => setGanhoProfissional(opcao)}
                        className="mr-3 w-4 h-4 text-blue-600"
                      />
                      <span className="text-base text-gray-700 capitalize">{opcao}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tipo === 'medico' && step === 12 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Intenção de continuidade</h3>
              <div>
                <p className="text-base font-medium text-gray-700 mb-4">Você pretende continuar usando o Oftware nos próximos meses?</p>
                <div className="space-y-2">
                  {(['com_certeza', 'provavelmente', 'nao_sei', 'provavelmente_nao'] as const).map(opcao => (
                    <label key={opcao} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      intencaoContinuidade === opcao 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                      <input
                        type="radio"
                        name="continuidade"
                        value={opcao}
                        checked={intencaoContinuidade === opcao}
                        onChange={() => setIntencaoContinuidade(opcao)}
                        className="mr-3 w-4 h-4 text-blue-600"
                      />
                      <span className="text-base text-gray-700">
                        {opcao === 'com_certeza' && 'Com certeza'}
                        {opcao === 'provavelmente' && 'Provavelmente'}
                        {opcao === 'nao_sei' && 'Não sei'}
                        {opcao === 'provavelmente_nao' && 'Provavelmente não'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tipo === 'medico' && step === 13 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Pergunta estratégica</h3>
              <div>
                <p className="text-base font-medium text-gray-700 mb-4">O que faria o Oftware se tornar indispensável na sua prática?</p>
                <textarea
                  value={oQueTornariaIndispensavel}
                  onChange={(e) => setOQueTornariaIndispensavel(e.target.value)}
                  className="w-full h-32 p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                  placeholder="Compartilhe suas ideias..."
                />
              </div>
            </div>
          )}

          {/* Perguntas Extras - Separadas em páginas diferentes */}
          {/* Paciente: steps 15, 16, 17 */}
          {tipo === 'paciente' && step === 15 && (
            <div className="space-y-6">
              <p className="text-base font-semibold text-gray-900 mb-4">Como você conheceu o Oftware?</p>
              <div className="space-y-2">
                {(['medico', 'indicacao', 'instagram', 'google', 'outro'] as const).map(opcao => (
                  <label key={opcao} className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <input
                      type="radio"
                      name="comoConheceu"
                      value={opcao}
                      checked={comoConheceu === opcao}
                      onChange={() => setComoConheceu(opcao)}
                      className="mr-3 w-4 h-4 text-blue-600"
                    />
                    <span className="text-base text-gray-700 capitalize">{opcao}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {tipo === 'paciente' && step === 16 && (
            <div className="space-y-6">
              <p className="text-base font-semibold text-gray-900 mb-4">O que você mais usa? (pode selecionar vários)</p>
              <div className="space-y-2">
                {['acompanhamento_medico', 'chat', 'plano_alimentar', 'medicacao', 'relatorios'].map(item => (
                  <label key={item} className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <input
                      type="checkbox"
                      checked={oQueMaisUsa.includes(item)}
                      onChange={() => handleOQueMaisUsaToggle(item)}
                      className="mr-3 w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-base text-gray-700">
                      {item === 'acompanhamento_medico' && 'Acompanhamento médico'}
                      {item === 'chat' && 'Chat'}
                      {item === 'plano_alimentar' && 'Plano alimentar'}
                      {item === 'medicacao' && 'Medicação'}
                      {item === 'relatorios' && 'Relatórios'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {tipo === 'paciente' && step === 17 && (
            <div className="space-y-6">
              <p className="text-base font-semibold text-gray-900 mb-4">O que sente falta hoje? (pode selecionar vários)</p>
              <div className="space-y-2">
                {['mais_contato_medico', 'mais_conteudo_educativo', 'mais_automacoes', 'mais_relatorios', 'outros'].map(item => (
                  <label key={item} className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <input
                      type="checkbox"
                      checked={oQueSenteFalta.includes(item)}
                      onChange={() => handleOQueSenteFaltaToggle(item)}
                      className="mr-3 w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-base text-gray-700">
                      {item === 'mais_contato_medico' && 'Mais contato médico'}
                      {item === 'mais_conteudo_educativo' && 'Mais conteúdo educativo'}
                      {item === 'mais_automacoes' && 'Mais automações'}
                      {item === 'mais_relatorios' && 'Mais relatórios'}
                      {item === 'outros' && 'Outros'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Médico: steps 14, 15, 16 */}
          {tipo === 'medico' && step === 14 && (
            <div className="space-y-6">
              <p className="text-base font-semibold text-gray-900 mb-4">Como você conheceu o Oftware?</p>
              <div className="space-y-2">
                {(['medico', 'indicacao', 'instagram', 'google', 'outro'] as const).map(opcao => (
                  <label key={opcao} className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <input
                      type="radio"
                      name="comoConheceu"
                      value={opcao}
                      checked={comoConheceu === opcao}
                      onChange={() => setComoConheceu(opcao)}
                      className="mr-3 w-4 h-4 text-blue-600"
                    />
                    <span className="text-base text-gray-700 capitalize">{opcao}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {tipo === 'medico' && step === 15 && (
            <div className="space-y-6">
              <p className="text-base font-semibold text-gray-900 mb-4">O que você mais usa? (pode selecionar vários)</p>
              <div className="space-y-2">
                {['controle_leads', 'financeiro', 'chat', 'pacientes', 'estatisticas', 'calendario'].map(item => (
                  <label key={item} className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <input
                      type="checkbox"
                      checked={oQueMaisUsa.includes(item)}
                      onChange={() => handleOQueMaisUsaToggle(item)}
                      className="mr-3 w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-base text-gray-700">
                      {item === 'controle_leads' && 'Controle de Leads'}
                      {item === 'financeiro' && 'Financeiro'}
                      {item === 'chat' && 'Chat'}
                      {item === 'pacientes' && 'Pacientes'}
                      {item === 'estatisticas' && 'Estatísticas'}
                      {item === 'calendario' && 'Calendário'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {tipo === 'medico' && step === 16 && (
            <div className="space-y-6">
              <p className="text-base font-semibold text-gray-900 mb-4">O que sente falta hoje? (pode selecionar vários)</p>
              <div className="space-y-2">
                {['mais_integracao', 'mais_automatizacao', 'mais_relatorios', 'melhor_ux', 'mais_ferramentas', 'outros'].map(item => (
                  <label key={item} className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <input
                      type="checkbox"
                      checked={oQueSenteFalta.includes(item)}
                      onChange={() => handleOQueSenteFaltaToggle(item)}
                      className="mr-3 w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-base text-gray-700">
                      {item === 'mais_integracao' && 'Mais integrações'}
                      {item === 'mais_automatizacao' && 'Mais automação'}
                      {item === 'mais_relatorios' && 'Mais relatórios'}
                      {item === 'melhor_ux' && 'Melhor experiência de uso'}
                      {item === 'mais_ferramentas' && 'Mais ferramentas clínicas'}
                      {item === 'outros' && 'Outros'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer com botões */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 md:p-6 flex justify-between z-10">
          <button
            onClick={step > 1 ? handleVoltar : onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            {step > 1 ? 'Voltar' : 'Fechar'}
          </button>

          <button
            onClick={step === (tipo === 'paciente' ? 17 : 16) ? handleEnviar : handleAvancar}
            disabled={!podeAvancar() || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Enviando...' : step === (tipo === 'paciente' ? 17 : 16) ? 'Enviar' : 'Avançar'}
          </button>
        </div>
      </div>
    </div>
  );
}
