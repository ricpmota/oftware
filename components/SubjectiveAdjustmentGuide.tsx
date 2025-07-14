'use client';

import React from 'react';
import { suggestSubjectivePath, SubjectivePathOutput } from '../utils/suggestSubjectivePath';

interface SubjectiveAdjustmentGuideProps {
  patientData: {
    age: number;
    usesGlasses: boolean;
  };
  clinicalResult: {
    ametropiaType: {
      od: string;
      oe: string;
    };
    stability: {
      od: boolean;
      oe: boolean;
    };
    averageMeasurements: {
      od: { s: number; c: number; e: number };
      oe: { s: number; c: number; e: number };
    };
    clinicalSuggestions: string[];
  };
}

export default function SubjectiveAdjustmentGuide({ patientData, clinicalResult }: SubjectiveAdjustmentGuideProps) {
  // Gerar roteiro usando a nova lógica clínica
  const subjectivePath: SubjectivePathOutput = suggestSubjectivePath({
    age: patientData.age,
    averages: clinicalResult.averageMeasurements,
    ametropiaType: clinicalResult.ametropiaType as { od: "Miopia" | "Hipermetropia" | "Astigmatismo" | "Neutro"; oe: "Miopia" | "Hipermetropia" | "Astigmatismo" | "Neutro" },
    stability: clinicalResult.stability,
    clinicalSuggestions: clinicalResult.clinicalSuggestions,
    usesGlasses: patientData.usesGlasses
  });

  const getAgeGroup = (age: number) => {
    if (age < 10) return 'criança';
    if (age < 40) return 'adulto jovem';
    if (age < 60) return 'adulto';
    return 'idoso';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Roteiro de Ajuste Subjetivo</h2>
      
      <div className="space-y-6">
        {/* Informações Gerais */}
        <div className="bg-black border border-gray-200 rounded p-3">
          <h3 className="text-md font-medium text-white mb-2">Informações Gerais</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-300">Faixa etária:</span>
              <span className="ml-1 font-medium text-white">{getAgeGroup(patientData.age)}</span>
            </div>
            <div>
              <span className="text-gray-300">Usa óculos:</span>
              <span className="ml-1 font-medium text-white">{patientData.usesGlasses ? 'Sim' : 'Não'}</span>
            </div>
            <div>
              <span className="text-gray-300">Estabilidade AR OD:</span>
              <span className={`ml-1 font-medium ${clinicalResult.stability.od ? 'text-green-400' : 'text-red-400'}`}>
                {clinicalResult.stability.od ? 'Estável' : 'Instável'}
              </span>
            </div>
            <div>
              <span className="text-gray-300">Estabilidade AR OE:</span>
              <span className={`ml-1 font-medium ${clinicalResult.stability.oe ? 'text-green-400' : 'text-red-400'}`}>
                {clinicalResult.stability.oe ? 'Estável' : 'Instável'}
              </span>
            </div>
          </div>
        </div>

        {/* Olho Direito */}
        <div className="border border-gray-200 rounded p-3">
          <h3 className="text-md font-medium text-gray-700 mb-3">
            OD - Olho Direito ({clinicalResult.ametropiaType.od})
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-center">
              <table className="text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-gray-600 font-medium">Esférico</th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-600 font-medium">Cilindro</th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-600 font-medium">Eixo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-center font-mono bg-black text-white">
                      {subjectivePath.od.startEsferico}D
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center font-mono bg-black text-white">
                      {subjectivePath.od.cilindro}D
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center font-mono bg-black text-white">
                      {subjectivePath.od.eixo}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div>
              <span className="text-sm font-medium text-gray-600">Etapas de Refração:</span>
              <ol className="mt-1 ml-4 list-decimal text-sm space-y-1">
                {subjectivePath.od.etapas.map((etapa, index) => (
                  <li key={index} className="text-gray-700">{etapa}</li>
                ))}
              </ol>
            </div>
            
            {subjectivePath.od.observacoes.length > 0 && (
              <div>
                <span className="text-sm font-medium text-yellow-600">Observações:</span>
                <ul className="mt-1 ml-4 list-disc text-sm space-y-1">
                  {subjectivePath.od.observacoes.map((observacao, index) => (
                    <li key={index} className="text-yellow-700">{observacao}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Olho Esquerdo */}
        <div className="border border-gray-200 rounded p-3">
          <h3 className="text-md font-medium text-gray-700 mb-3">
            OE - Olho Esquerdo ({clinicalResult.ametropiaType.oe})
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-center">
              <table className="text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-gray-600 font-medium">Esférico</th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-600 font-medium">Cilindro</th>
                    <th className="border border-gray-300 px-3 py-2 text-gray-600 font-medium">Eixo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2 text-center font-mono bg-black text-white">
                      {subjectivePath.oe.startEsferico}D
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center font-mono bg-black text-white">
                      {subjectivePath.oe.cilindro}D
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center font-mono bg-black text-white">
                      {subjectivePath.oe.eixo}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div>
              <span className="text-sm font-medium text-gray-600">Etapas de Refração:</span>
              <ol className="mt-1 ml-4 list-decimal text-sm space-y-1">
                {subjectivePath.oe.etapas.map((etapa, index) => (
                  <li key={index} className="text-gray-700">{etapa}</li>
                ))}
              </ol>
            </div>
            
            {subjectivePath.oe.observacoes.length > 0 && (
              <div>
                <span className="text-sm font-medium text-yellow-600">Observações:</span>
                <ul className="mt-1 ml-4 list-disc text-sm space-y-1">
                  {subjectivePath.oe.observacoes.map((observacao, index) => (
                    <li key={index} className="text-yellow-700">{observacao}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Observações Gerais */}
        {subjectivePath.observacoes.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <h3 className="text-md font-medium text-yellow-800 mb-2">Observações Gerais</h3>
            
            <div className="space-y-2 text-sm">
              {subjectivePath.observacoes.map((observacao, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-yellow-700">{observacao}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alertas Clínicos */}
        {subjectivePath.alertasClinicos.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <h3 className="text-md font-medium text-red-800 mb-2">Alertas Clínicos</h3>
            
            <div className="space-y-2 text-sm">
              {subjectivePath.alertasClinicos.map((alerta, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-red-700 font-medium">{alerta}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recomendações Específicas */}
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <h3 className="text-md font-medium text-green-800 mb-2">Recomendações Específicas</h3>
          
          <div className="space-y-2 text-sm">
            {patientData.age < 10 && (
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-green-700">Criança - considerar cicloplegia para refração precisa</span>
              </div>
            )}
            
            {patientData.age >= 40 && (
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-green-700">Presbíope - testar adição para perto após grau de longe</span>
              </div>
            )}
            
            {!clinicalResult.stability.od || !clinicalResult.stability.oe ? (
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-green-700">AR instável - repetir medição com lágrima artificial</span>
              </div>
            ) : null}
            
            {patientData.usesGlasses && (
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-green-700">Paciente já usa óculos - comparar com prescrição anterior</span>
              </div>
            )}
            
            {!patientData.usesGlasses && (
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="text-green-700">Primeira prescrição - grau inicial conservador</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 