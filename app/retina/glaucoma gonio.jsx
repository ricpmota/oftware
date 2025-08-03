// 📁 glaucomaForm.tsx (com gonioscopia)

import React, { useState } from 'react';

export default function GlaucomaForm() {
  const [form, setForm] = useState({
    idade: '',
    pioMax: '',
    pioMin: '',
    mediaPIO: '',
    gonioscopia: '',
    escavacao: '',
    historicoFamiliar: false,
    fatoresRisco: [],
    tipoGlaucoma: '',
    tratamentoAtual: '',
    respostaAoTratamento: '',
    colirios: [],
    queixasColirio: false,
    desejatroca: false,
    jaUsouOutros: false,
    indicacaoCirurgia: false,
    historicoPIO: [],
    graficoPIO: [],
  });

  const opcoes = {
    gonioscopia: [
      'Grau IV - Ângulo amplo (35°-45°)',
      'Grau III - Ângulo aberto (25°-35°)',
      'Grau II - Ângulo moderadamente estreito (20°)',
      'Grau I - Ângulo muito estreito (10°)',
      'Grau 0 - Ângulo fechado'
    ]
  };

  const interpretarGonioscopia = (valor) => {
    switch (valor) {
      case 'Grau IV - Ângulo amplo (35°-45°)':
        return 'Gonioscopia grau IV (Shaffer): ângulo amplamente aberto, sem risco de fechamento angular.';
      case 'Grau III - Ângulo aberto (25°-35°)':
        return 'Gonioscopia grau III (Shaffer): ângulo aberto, sem risco iminente.';
      case 'Grau II - Ângulo moderadamente estreito (20°)':
        return 'Gonioscopia grau II (Shaffer): ângulo moderadamente estreito, risco de fechamento angular.';
      case 'Grau I - Ângulo muito estreito (10°)':
        return 'Gonioscopia grau I (Shaffer): risco elevado de fechamento angular, considerar iridotomia.';
      case 'Grau 0 - Ângulo fechado':
        return 'Gonioscopia grau 0 (Shaffer): ângulo fechado. Urgência em avaliar tratamento cirúrgico.';
      default:
        return '';
    }
  };

  const gerarResumo = () => {
    const resumoGonio = interpretarGonioscopia(form.gonioscopia);
    // Outras análises omitidas para foco
    return `Resumo clínico:\n${resumoGonio}`;
  };

  return (
    <div>
      <h2>Formulário de Avaliação de Glaucoma</h2>

      <label>Classificação da Gonioscopia:</label>
      <select value={form.gonioscopia} onChange={e => setForm({ ...form, gonioscopia: e.target.value })}>
        {opcoes.gonioscopia.map(op => (
          <option key={op}>{op}</option>
        ))}
      </select>

      {/* ... Outras seções do formulário ... */}

      <button onClick={() => alert(gerarResumo())}>Gerar Resumo</button>
    </div>
  );
}
