'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PacienteCompleto } from '@/types/obesidade';
import { UtensilsCrossed, Calendar, AlertCircle } from 'lucide-react';

interface PlanoNutricional {
  estilo: 'digestiva' | 'plant_based' | 'mediterranea' | 'rico_proteina' | 'low_carb_moderada';
  protDia_g: number;
  aguaDia_ml: number;
  refeicoes: number;
  distribuicaoProteina: {
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  modeloDia: {
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  evitar: string[];
  criadoEm: Date;
}

interface CheckInDiario {
  proteinaOk: boolean;
  frutasOk: boolean;
  aguaOk: boolean;
  sintomasGI: 'nenhum' | 'leve' | 'moderado' | 'grave';
  lixoAlimentar: boolean;
  humorEnergia: number;
  score: number;
  data: string;
}

interface WizardData {
  atividadeFisica: 'nunca' | '1-2x' | '3-4x' | '5-7x';
  horasSentado: '<4h' | '4-8h' | '>8h';
  comportamentosAlimentares: string[];
  restricoes: string[];
  preferenciasProteina: string[];
  sintomasGI: 'nenhum' | 'leve' | 'moderado' | 'grave';
}

interface NutriContentProps {
  paciente: PacienteCompleto;
}

export default function NutriContent({ paciente }: NutriContentProps) {
  const [view, setView] = useState<'loading' | 'wizard' | 'plano' | 'checkin'>('loading');
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    atividadeFisica: 'nunca',
    horasSentado: '4-8h',
    comportamentosAlimentares: [],
    restricoes: [],
    preferenciasProteina: [],
    sintomasGI: 'nenhum'
  });
  const [peso, setPeso] = useState<number | null>(null);
  const [altura, setAltura] = useState<number | null>(null);
  const [showPesoAlturaForm, setShowPesoAlturaForm] = useState(false);
  const [plano, setPlano] = useState<PlanoNutricional | null>(null);
  const [checkInData, setCheckInData] = useState<CheckInDiario>({
    proteinaOk: false,
    frutasOk: false,
    aguaOk: false,
    sintomasGI: 'nenhum',
    lixoAlimentar: false,
    humorEnergia: 3,
    score: 0,
    data: new Date().toISOString().split('T')[0]
  });
  const [savingCheckIn, setSavingCheckIn] = useState(false);

  useEffect(() => {
    const loadPlano = async () => {
      try {
        const planoRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'plano');
        const planoSnap = await getDoc(planoRef);
        
        if (planoSnap.exists()) {
          const planoData = planoSnap.data();
          setPlano({
            ...planoData,
            criadoEm: planoData.criadoEm?.toDate() || new Date()
          } as PlanoNutricional);
          setView('plano');
        } else {
          const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
          const imc = medidasIniciais?.imc;
          const pesoExistente = medidasIniciais?.peso;
          const alturaExistente = medidasIniciais?.altura;
          
          if (imc && imc > 0) {
            setView('wizard');
          } else if (!pesoExistente || !alturaExistente) {
            setShowPesoAlturaForm(true);
            setPeso(pesoExistente || null);
            setAltura(alturaExistente || null);
            setView('wizard');
          } else {
            setView('wizard');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar plano nutricional:', error);
        setView('wizard');
      }
    };
    
    loadPlano();
  }, [paciente]);

  const handleSalvarPesoAltura = async () => {
    if (!peso || !altura) return;
    
    try {
      const alturaMetros = altura / 100;
      const imcCalculado = peso / (alturaMetros * alturaMetros);
      
      const pacienteRef = doc(db, 'pacientes_completos', paciente.id);
      const pacienteSnap = await getDoc(pacienteRef);
      if (pacienteSnap.exists()) {
        const dadosAtuais = pacienteSnap.data();
        await setDoc(pacienteRef, {
          ...dadosAtuais,
          dadosClinicos: {
            ...dadosAtuais.dadosClinicos,
            medidasIniciais: {
              ...dadosAtuais.dadosClinicos?.medidasIniciais,
              peso,
              altura,
              imc: imcCalculado
            }
          }
        }, { merge: true });
      }
      
      setShowPesoAlturaForm(false);
      setWizardStep(1);
    } catch (error) {
      console.error('Erro ao salvar peso/altura:', error);
      alert('Erro ao salvar dados. Tente novamente.');
    }
  };

  const handleWizardNext = () => {
    if (wizardStep < 6) {
      setWizardStep(wizardStep + 1);
    } else {
      gerarPlanoNutricional();
    }
  };

  const handleWizardBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  const toggleCheckbox = (field: keyof WizardData, value: string) => {
    if (field === 'comportamentosAlimentares' || field === 'restricoes' || field === 'preferenciasProteina') {
      const current = wizardData[field] as string[];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      setWizardData({ ...wizardData, [field]: updated });
    }
  };

  const gerarPlanoNutricional = async () => {
    const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
    const pesoKg = medidasIniciais?.peso || 0;
    const imc = medidasIniciais?.imc || 0;
    
    let protDia_g: number;
    if (imc < 27) {
      protDia_g = pesoKg * 1.2;
    } else if (imc >= 27 && imc <= 32) {
      protDia_g = pesoKg * 1.4;
    } else {
      protDia_g = pesoKg * 1.5;
    }
    
    const aguaDia_ml = pesoKg * 35;
    
    let estilo: PlanoNutricional['estilo'];
    if (wizardData.sintomasGI === 'moderado' || wizardData.sintomasGI === 'grave') {
      estilo = 'digestiva';
    } else if (wizardData.restricoes.includes('vegetariano') || wizardData.restricoes.includes('vegano')) {
      estilo = 'plant_based';
    } else if (wizardData.atividadeFisica === 'nunca' && 
               (wizardData.comportamentosAlimentares.includes('pulo refeições') ||
                wizardData.comportamentosAlimentares.includes('como rápido') ||
                wizardData.comportamentosAlimentares.includes('belisco o dia todo'))) {
      estilo = 'mediterranea';
    } else if (imc >= 32) {
      estilo = 'rico_proteina';
    } else {
      estilo = 'low_carb_moderada';
    }
    
    const protPorRefeicao = protDia_g / 5;
    const distribuicaoProteina = {
      cafe: `${Math.round(protPorRefeicao * 1.2)}-${Math.round(protPorRefeicao * 1.4)} g`,
      almoco: `${Math.round(protPorRefeicao * 1.2)}-${Math.round(protPorRefeicao * 1.4)} g`,
      jantar: `${Math.round(protPorRefeicao * 1.2)}-${Math.round(protPorRefeicao * 1.4)} g`,
      lanche1: `${Math.round(protPorRefeicao * 0.7)}-${Math.round(protPorRefeicao * 0.9)} g`,
      lanche2: `${Math.round(protPorRefeicao * 0.7)}-${Math.round(protPorRefeicao * 0.9)} g`
    };
    
    const modeloDia = gerarModeloDia(estilo);
    
    const evitar: string[] = ['fritos', 'ultraprocessados'];
    if (wizardData.comportamentosAlimentares.includes('álcool frequente')) {
      evitar.push('álcool frequente');
    }
    if (wizardData.restricoes.includes('intolerância lactose')) {
      evitar.push('laticínios com lactose');
    }
    if (wizardData.restricoes.includes('sem glúten')) {
      evitar.push('alimentos com glúten');
    }
    
    const novoPlano: PlanoNutricional = {
      estilo,
      protDia_g: Math.round(protDia_g),
      aguaDia_ml: Math.round(aguaDia_ml),
      refeicoes: 5,
      distribuicaoProteina,
      modeloDia,
      evitar,
      criadoEm: new Date()
    };
    
    await salvarPlanoNutricional(novoPlano);
  };

  const gerarModeloDia = (estilo: PlanoNutricional['estilo']): PlanoNutricional['modeloDia'] => {
    switch (estilo) {
      case 'digestiva':
        return {
          cafe: 'Ovos cozidos + fruta + chá',
          almoco: 'Peixe grelhado + legumes cozidos + arroz branco',
          jantar: 'Frango desfiado + purê de abóbora + salada morna',
          lanche1: 'Banana + chá de camomila',
          lanche2: 'Iogurte natural + fruta cozida'
        };
      case 'plant_based':
        return {
          cafe: 'Aveia + frutas + sementes',
          almoco: 'Lentilha + quinoa + salada + legumes',
          jantar: 'Grão-de-bico + vegetais + batata doce',
          lanche1: 'Hummus + vegetais crus',
          lanche2: 'Smoothie de proteína vegetal + frutas'
        };
      case 'mediterranea':
        return {
          cafe: 'Iogurte grego + frutas + azeite',
          almoco: 'Salmão + salada mediterrânea + azeite',
          jantar: 'Frango + legumes assados + azeite',
          lanche1: 'Oleaginosas + frutas',
          lanche2: 'Queijo + azeitonas + tomate'
        };
      case 'rico_proteina':
        return {
          cafe: 'Ovos + bacon magro + queijo + fruta',
          almoco: 'Carne magra + salada + batata doce',
          jantar: 'Peito de frango + legumes + quinoa',
          lanche1: 'Whey protein + fruta',
          lanche2: 'Atum + queijo cottage + fruta'
        };
      case 'low_carb_moderada':
        return {
          cafe: 'Ovos + abacate + vegetais',
          almoco: 'Proteína + salada + azeite',
          jantar: 'Proteína + legumes + azeite',
          lanche1: 'Oleaginosas + queijo',
          lanche2: 'Iogurte grego + frutas vermelhas'
        };
      default:
        return {
          cafe: 'Ovos mexidos + pão integral + fruta',
          almoco: 'Proteína (carne/frango/peixe) + salada + arroz integral',
          jantar: 'Proteína + legumes cozidos + batata doce',
          lanche1: 'Iogurte + frutas + oleaginosas',
          lanche2: 'Queijo + fruta ou smoothie proteico'
        };
    }
  };

  const salvarPlanoNutricional = async (planoData: PlanoNutricional) => {
    try {
      const planoRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'plano');
      await setDoc(planoRef, {
        ...planoData,
        criadoEm: new Date()
      });
      
      setPlano(planoData);
      setView('plano');
    } catch (error) {
      console.error('Erro ao salvar plano nutricional:', error);
      alert('Erro ao salvar plano. Tente novamente.');
    }
  };

  const calcularScoreCheckIn = (data: CheckInDiario): number => {
    const valores: number[] = [];
    valores.push(data.proteinaOk ? 1 : 0);
    valores.push(data.frutasOk ? 1 : 0);
    valores.push(data.aguaOk ? 1 : 0);
    valores.push(data.lixoAlimentar ? 0 : 1);
    valores.push(data.humorEnergia / 5);
    const sintomasMap: { [key: string]: number } = {
      'nenhum': 1,
      'leve': 0.75,
      'moderado': 0.5,
      'grave': 0.25
    };
    valores.push(sintomasMap[data.sintomasGI] || 0);
    const soma = valores.reduce((acc, val) => acc + val, 0);
    return Math.round((soma / valores.length) * 100) / 100;
  };

  const salvarCheckIn = async () => {
    if (!paciente || !paciente.id) {
      alert('Erro: Paciente não encontrado. Recarregue a página.');
      return;
    }

    try {
      setSavingCheckIn(true);
      const score = calcularScoreCheckIn(checkInData);
      const dataHoje = new Date().toISOString().split('T')[0];
      
      const checkInComScore = { 
        proteinaOk: checkInData.proteinaOk,
        frutasOk: checkInData.frutasOk,
        aguaOk: checkInData.aguaOk,
        sintomasGI: checkInData.sintomasGI,
        lixoAlimentar: checkInData.lixoAlimentar,
        humorEnergia: checkInData.humorEnergia,
        score: score,
        data: dataHoje,
        timestamp: Timestamp.now()
      };
      
      console.log('Salvando check-in:', checkInComScore);
      console.log('Paciente ID:', paciente.id);
      
      const checkInRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'checkins', dataHoje);
      await setDoc(checkInRef, checkInComScore);
      
      console.log('Check-in salvo com sucesso!');
      alert('Check-in salvo com sucesso!');
      setView('plano');
      setCheckInData({
        proteinaOk: false,
        frutasOk: false,
        aguaOk: false,
        sintomasGI: 'nenhum',
        lixoAlimentar: false,
        humorEnergia: 3,
        score: 0,
        data: dataHoje
      });
    } catch (error: any) {
      console.error('Erro ao salvar check-in:', error);
      console.error('Detalhes do erro:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      alert(`Erro ao salvar check-in: ${error?.message || 'Erro desconhecido'}. Verifique o console para mais detalhes.`);
    } finally {
      setSavingCheckIn(false);
    }
  };

  if (view === 'loading') {
    return (
      <div className="space-y-4">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (showPesoAlturaForm && view === 'wizard') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Informações Básicas</h2>
          <p className="text-gray-600 mb-6">
            Precisamos de algumas informações para criar seu plano nutricional personalizado.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Peso (kg) *
              </label>
              <input
                type="number"
                value={peso || ''}
                onChange={(e) => setPeso(parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                placeholder="Ex: 75.5"
                min="20"
                max="400"
                step="0.1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Altura (cm) *
              </label>
              <input
                type="number"
                value={altura || ''}
                onChange={(e) => setAltura(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                placeholder="Ex: 170"
                min="120"
                max="230"
              />
            </div>
          </div>
          
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleSalvarPesoAltura}
              disabled={!peso || !altura}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'wizard') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Plano Nutricional Personalizado</h2>
            <p className="text-gray-600">Vamos conhecer seus hábitos para criar o melhor plano para você.</p>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((step) => (
                <div
                  key={step}
                  className={`flex-1 h-2 rounded ${
                    step <= wizardStep ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {wizardStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Atividade Física</h3>
              <p className="text-gray-600 mb-4">Com que frequência você pratica atividade física?</p>
              <div className="space-y-2">
                {(['nunca', '1-2x', '3-4x', '5-7x'] as const).map((opcao) => (
                  <button
                    key={opcao}
                    onClick={() => setWizardData({ ...wizardData, atividadeFisica: opcao })}
                    className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${
                      wizardData.atividadeFisica === opcao
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {opcao === 'nunca' && 'Nunca'}
                    {opcao === '1-2x' && '1-2 vezes por semana'}
                    {opcao === '3-4x' && '3-4 vezes por semana'}
                    {opcao === '5-7x' && '5-7 vezes por semana'}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {wizardStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Tempo Sentado</h3>
              <p className="text-gray-600 mb-4">Quantas horas por dia você passa sentado?</p>
              <div className="space-y-2">
                {(['<4h', '4-8h', '>8h'] as const).map((opcao) => (
                  <button
                    key={opcao}
                    onClick={() => setWizardData({ ...wizardData, horasSentado: opcao })}
                    className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${
                      wizardData.horasSentado === opcao
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {opcao === '<4h' && 'Menos de 4 horas'}
                    {opcao === '4-8h' && '4 a 8 horas'}
                    {opcao === '>8h' && 'Mais de 8 horas'}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {wizardStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Comportamentos Alimentares</h3>
              <p className="text-gray-600 mb-4">Selecione todos que se aplicam a você:</p>
              <div className="space-y-2">
                {['pulo refeições', 'como rápido', 'belisco o dia todo', 'doce diário', 'álcool frequente'].map((opcao) => (
                  <label
                    key={opcao}
                    className="flex items-center px-4 py-3 rounded-md border-2 border-gray-200 hover:border-gray-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={wizardData.comportamentosAlimentares.includes(opcao)}
                      onChange={() => toggleCheckbox('comportamentosAlimentares', opcao)}
                      className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-gray-700 capitalize">{opcao}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {wizardStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Restrições Alimentares</h3>
              <p className="text-gray-600 mb-4">Selecione todas que se aplicam:</p>
              <div className="space-y-2">
                {['vegetariano', 'vegano', 'intolerância lactose', 'sem glúten', 'nada'].map((opcao) => (
                  <label
                    key={opcao}
                    className="flex items-center px-4 py-3 rounded-md border-2 border-gray-200 hover:border-gray-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={wizardData.restricoes.includes(opcao)}
                      onChange={() => toggleCheckbox('restricoes', opcao)}
                      className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-gray-700 capitalize">{opcao}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {wizardStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Preferências de Proteína</h3>
              <p className="text-gray-600 mb-4">Selecione todas as fontes de proteína que você consome:</p>
              <div className="space-y-2">
                {['Carne', 'Frango', 'Peixe', 'Ovos', 'Laticínios', 'Leguminosas'].map((opcao) => (
                  <label
                    key={opcao}
                    className="flex items-center px-4 py-3 rounded-md border-2 border-gray-200 hover:border-gray-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={wizardData.preferenciasProteina.includes(opcao)}
                      onChange={() => toggleCheckbox('preferenciasProteina', opcao)}
                      className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-gray-700">{opcao}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {wizardStep === 6 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Sintomas Gastrointestinais</h3>
              <p className="text-gray-600 mb-4">Você apresenta sintomas gastrointestinais (náusea, vômito, diarreia)?</p>
              <div className="space-y-2">
                {(['nenhum', 'leve', 'moderado', 'grave'] as const).map((opcao) => (
                  <button
                    key={opcao}
                    onClick={() => setWizardData({ ...wizardData, sintomasGI: opcao })}
                    className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${
                      wizardData.sintomasGI === opcao
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="capitalize">{opcao}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-6 flex gap-4">
            {wizardStep > 1 && (
              <button
                onClick={handleWizardBack}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Voltar
              </button>
            )}
            <button
              onClick={handleWizardNext}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              {wizardStep === 6 ? 'Gerar Plano' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'checkin') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Check-in Diário</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
              <div>
                <p className="font-medium text-gray-900">Proteína OK hoje?</p>
                <p className="text-sm text-gray-500">Conseguiu atingir a meta de proteína?</p>
              </div>
              <button
                onClick={() => setCheckInData({ ...checkInData, proteinaOk: !checkInData.proteinaOk })}
                className={`px-4 py-2 rounded-md ${
                  checkInData.proteinaOk
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {checkInData.proteinaOk ? 'Sim' : 'Não'}
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
              <div>
                <p className="font-medium text-gray-900">Frutas OK hoje?</p>
                <p className="text-sm text-gray-500">Consumiu frutas hoje?</p>
              </div>
              <button
                onClick={() => setCheckInData({ ...checkInData, frutasOk: !checkInData.frutasOk })}
                className={`px-4 py-2 rounded-md ${
                  checkInData.frutasOk
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {checkInData.frutasOk ? 'Sim' : 'Não'}
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
              <div>
                <p className="font-medium text-gray-900">Água OK hoje?</p>
                <p className="text-sm text-gray-500">Bebeu água suficiente?</p>
              </div>
              <button
                onClick={() => setCheckInData({ ...checkInData, aguaOk: !checkInData.aguaOk })}
                className={`px-4 py-2 rounded-md ${
                  checkInData.aguaOk
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {checkInData.aguaOk ? 'Sim' : 'Não'}
              </button>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-md">
              <label className="block font-medium text-gray-900 mb-2">Sintomas GI?</label>
              <select
                value={checkInData.sintomasGI}
                onChange={(e) => setCheckInData({ ...checkInData, sintomasGI: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
              >
                <option value="nenhum">Nenhum</option>
                <option value="leve">Leve</option>
                <option value="moderado">Moderado</option>
                <option value="grave">Grave</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
              <div>
                <p className="font-medium text-gray-900">Lixo alimentar hoje?</p>
                <p className="text-sm text-gray-500">Consumiu alimentos ultraprocessados?</p>
              </div>
              <button
                onClick={() => setCheckInData({ ...checkInData, lixoAlimentar: !checkInData.lixoAlimentar })}
                className={`px-4 py-2 rounded-md ${
                  checkInData.lixoAlimentar
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {checkInData.lixoAlimentar ? 'Sim' : 'Não'}
              </button>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-md">
              <label className="block font-medium text-gray-900 mb-2">
                Humor/Energia (1-5)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((valor) => (
                  <button
                    key={valor}
                    onClick={() => setCheckInData({ ...checkInData, humorEnergia: valor })}
                    className={`flex-1 px-4 py-2 rounded-md ${
                      checkInData.humorEnergia === valor
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {valor}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => setView('plano')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={salvarCheckIn}
              disabled={savingCheckIn}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {savingCheckIn ? 'Salvando...' : 'Salvar Check-in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!plano) {
    return (
      <div className="space-y-4">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-600">Carregando plano...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UtensilsCrossed className="h-6 w-6 text-green-600" />
              Plano Nutricional
            </h1>
            <p className="text-gray-600 mt-1">
              Criado em {new Date(plano.criadoEm).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <button
            onClick={() => setView('checkin')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Check-in Diário
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estilo Alimentar</h3>
          <p className="text-2xl font-bold text-green-600 capitalize">
            {plano.estilo.replace('_', ' ')}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Meta de Proteína</h3>
          <p className="text-2xl font-bold text-green-600">
            {plano.protDia_g} g/dia
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Meta de Água</h3>
          <p className="text-2xl font-bold text-blue-600">
            {plano.aguaDia_ml} ml/dia
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Aproximadamente {Math.round(plano.aguaDia_ml / 250)} copos
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Refeições</h3>
          <p className="text-2xl font-bold text-gray-900">
            {plano.refeicoes} refeições/dia
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Proteína por Refeição</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-600 mb-1">Café da Manhã</p>
            <p className="text-lg font-bold text-gray-900">{plano.distribuicaoProteina.cafe}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-600 mb-1">Lanche 1</p>
            <p className="text-lg font-bold text-gray-900">{plano.distribuicaoProteina.lanche1}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-600 mb-1">Almoço</p>
            <p className="text-lg font-bold text-gray-900">{plano.distribuicaoProteina.almoco}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-600 mb-1">Lanche 2</p>
            <p className="text-lg font-bold text-gray-900">{plano.distribuicaoProteina.lanche2}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-600 mb-1">Jantar</p>
            <p className="text-lg font-bold text-gray-900">{plano.distribuicaoProteina.jantar}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Modelo de Dia</h3>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-600 mb-1">Café da Manhã</p>
            <p className="text-gray-900">{plano.modeloDia.cafe}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-600 mb-1">Lanche 1</p>
            <p className="text-gray-900">{plano.modeloDia.lanche1}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-600 mb-1">Almoço</p>
            <p className="text-gray-900">{plano.modeloDia.almoco}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-600 mb-1">Lanche 2</p>
            <p className="text-gray-900">{plano.modeloDia.lanche2}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-600 mb-1">Jantar</p>
            <p className="text-gray-900">{plano.modeloDia.jantar}</p>
          </div>
        </div>
      </div>
      
      {plano.evitar.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evitar</h3>
          <div className="flex flex-wrap gap-2">
            {plano.evitar.map((item, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

