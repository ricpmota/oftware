/**
 * 
 * Função para gerar relatório completo em PDF do tratamento do paciente
 * 
 * Arquitetura: HTML + CSS (layout premium) → html2canvas → jsPDF
 * Objetivo: Relatório médico premium, profissional, limpo e elegante
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PacienteCompleto } from '@/types/obesidade';
import { Medico } from '@/types/medico';
import { MedicoService } from '@/services/medicoService';
import type { Sex } from '@/types/labRanges';
import { getLabRange } from '@/utils/labRangesFromJson';
import { LISTA_EXAMES, EXAME_KEY_TO_LAB } from '@/utils/relatorioPacienteConstants';

// Cores do projeto
const COLORS = {
  primary: '#22c55e', // green-500
  primaryLight: '#dcfce7', // green-100
  primaryDark: '#15803d', // green-700
  background: '#ffffff', // white
  textPrimary: '#111827', // gray-900
  textSecondary: '#6b7280', // gray-500
  border: '#e5e7eb', // gray-200
  success: '#10b981', // green-600
  error: '#ef4444', // red-500
  info: '#3b82f6', // blue-500
};

/**
 * Formata data para pt-BR, retorna null se inválida
 */
const formatarData = (data: any): string | null => {
  if (!data) return null;
  try {
    const date = data instanceof Date ? data : new Date(data);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  } catch {
    return null;
  }
};

/**
 * Formata data e hora para pt-BR
 */
const formatarDataHora = (data: any): string | null => {
  if (!data) return null;
  try {
    const date = data instanceof Date ? data : new Date(data);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return null;
  }
};

function getExameValorNumerico(exame: Record<string, unknown>, field: string): number | null {
  if (['hemoglobina', 'leucocitos', 'plaquetas'].includes(field)) {
    const hc = exame.hemogramaCompleto as Record<string, unknown> | undefined;
    const v = hc?.[field] ?? exame[field];
    if (v == null || v === '') return null;
    const n = Number(v);
    return !isNaN(n) ? n : null;
  }
  const v = exame[field];
  if (v == null || v === '') return null;
  const n = Number(v);
  return !isNaN(n) ? n : null;
}

/**
 * Itens de exame no HTML do relatório (mesmos campos que LISTA_EXAMES / limites JSON).
 */
function renderExameItensLaboratoriaisHtml(
  exame: Record<string, unknown>,
  pacienteSex: string | undefined,
  dataNascimento?: Date | string | { toDate?: () => Date } | null
): string {
  const sex = (pacienteSex === 'M' || pacienteSex === 'F' ? pacienteSex : 'M') as Sex;
  const dataNasc = dataNascimento;

  type CampoLinha = { labKey: string; field: string; label: string };
  const hemogramaLinhas: CampoLinha[] = [
    { field: 'hemoglobina', labKey: 'hgb', label: 'Hemoglobina' },
    { field: 'leucocitos', labKey: 'wbc', label: 'Leucócitos' },
    { field: 'plaquetas', labKey: 'platelets', label: 'Plaquetas' }
  ];
  const campos: CampoLinha[] = [
    ...hemogramaLinhas,
    ...LISTA_EXAMES.filter((e) => e.key !== 'hemogramaCompleto').flatMap((def) => {
      const labKey = EXAME_KEY_TO_LAB[def.key as string];
      if (!labKey) return [];
      return [{ field: def.key as string, labKey, label: String(def.label) }];
    })
  ];

  return campos
    .map((campo) => {
      const value = getExameValorNumerico(exame, campo.field);
      if (value === null) return '';
      const range = getLabRange(campo.labKey, sex, dataNasc as Date | string | { toDate?: () => Date } | null | undefined);

      if (!range) {
        return `
                        <div class="exame-item">
                          <div class="exame-nome">${campo.label}</div>
                          <div class="exame-valor">${value.toFixed(1)}</div>
                        </div>
                      `;
      }

      const inRangeVal = value >= range.min && value <= range.max;
      const padding = (range.max - range.min) * 0.2;
      const expandedMin = range.min - padding;
      const expandedMax = range.max + padding;
      const expandedRange = expandedMax - expandedMin;
      const valuePos = ((value - expandedMin) / expandedRange) * 100;
      const rangeStart = ((range.min - expandedMin) / expandedRange) * 100;
      const rangeWidth = ((range.max - range.min) / expandedRange) * 100;

      return `
                      <div class="exame-item">
                        <div class="exame-nome">${campo.label}</div>
                        <div class="exame-bar-container">
                          <div class="exame-bar-range" style="left: ${rangeStart}%; width: ${rangeWidth}%;"></div>
                          <div class="exame-bar-marker ${inRangeVal ? '' : 'out-of-range'}" style="left: ${valuePos}%;"></div>
                        </div>
                        <div class="exame-valor ${inRangeVal ? 'in-range' : 'out-of-range'}">
                          ${value.toFixed(1)} ${range.unit} (Referência: ${range.min}-${range.max} ${range.unit})
                        </div>
                      </div>
                    `;
    })
    .join('');
}

/**
 * Cria o HTML do relatório
 */
const criarHTMLRelatorio = (
  paciente: PacienteCompleto,
  medicoPerfil: Medico | null
): string => {
  const nomePaciente = paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || '';
  const cpf = paciente.dadosIdentificacao?.cpf || '';
  const dataNasc = formatarData(paciente.dadosIdentificacao?.dataNascimento);
  const sexo = paciente.dadosIdentificacao?.sexoBiologico === 'M' ? 'Masculino' : 
               paciente.dadosIdentificacao?.sexoBiologico === 'F' ? 'Feminino' : null;
  const telefone = paciente.dadosIdentificacao?.telefone || null;
  const email = paciente.dadosIdentificacao?.email || null;

  // Dados do médico
  const tituloMedico = medicoPerfil?.genero === 'F' ? 'Dra.' : 'Dr.';
  const medicoNome = medicoPerfil?.nome || null;
  const crm = medicoPerfil?.crm ? `CRM-${medicoPerfil.crm.estado} ${medicoPerfil.crm.numero}` : null;
  const medicoTelefone = medicoPerfil?.telefone || null;
  const medicoEndereco = medicoPerfil?.localizacao?.endereco || null;
  const primeiraCidade = medicoPerfil?.cidades && medicoPerfil.cidades.length > 0
    ? `${medicoPerfil.cidades[0].cidade} - ${medicoPerfil.cidades[0].estado}`
    : null;

  // Evolução do tratamento
  const evolucao = paciente.evolucaoSeguimento || [];
  const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
  const pesoInicial = medidasIniciais?.peso || null;
  const ultimoPeso = evolucao.length > 0 ? (evolucao[evolucao.length - 1]?.peso || null) : null;
  const perdaPeso = pesoInicial && ultimoPeso && pesoInicial > 0 && ultimoPeso > 0 
    ? pesoInicial - ultimoPeso 
    : null;
  const percentualPerda = pesoInicial && perdaPeso && pesoInicial > 0
    ? ((perdaPeso / pesoInicial) * 100).toFixed(2)
    : null;

  // Exames laboratoriais
  const exames = paciente.examesLaboratoriais || [];
  const pacienteSex = paciente.dadosIdentificacao?.sexoBiologico || 'M';

  // Plano terapêutico
  const planoTerapeutico = paciente.planoTerapeutico;
  const dataInicio = planoTerapeutico?.startDate ? formatarData(planoTerapeutico.startDate) : null;
  const duracao = planoTerapeutico?.numeroSemanasTratamento || null;

  // Gráfico de evolução do peso
  const pesos = evolucao.filter((r: any) => r.peso && !isNaN(r.peso)).map((r: any) => r.peso);
  const temGraficoPeso = pesos.length > 1;

  // Data de geração
  const dataGeracao = formatarDataHora(new Date());

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Tratamento</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      color: ${COLORS.textPrimary};
      background: ${COLORS.background};
      line-height: 1.6;
      font-size: 14px;
    }

    .relatorio-container {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      background: ${COLORS.background};
      margin: 0 auto;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid ${COLORS.border};
    }

    .header-left {
      flex: 1;
    }

    .medico-nome {
      font-size: 20px;
      font-weight: 700;
      color: ${COLORS.textPrimary};
      margin-bottom: 4px;
    }

    .medico-crm {
      font-size: 12px;
      color: ${COLORS.textSecondary};
      font-weight: 400;
    }

    .logo-container {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${COLORS.primaryLight};
      border-radius: 8px;
    }

    .logo-text {
      font-size: 18px;
      font-weight: 700;
      color: ${COLORS.primary};
    }

    /* Título */
    .titulo {
      text-align: center;
      font-size: 24px;
      font-weight: 700;
      color: ${COLORS.textPrimary};
      margin: 30px 0;
      letter-spacing: -0.5px;
    }

    /* Seção de dados */
    .dados-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }

    .dados-box {
      background: ${COLORS.background};
    }

    .dados-titulo {
      font-size: 14px;
      font-weight: 600;
      color: ${COLORS.textPrimary};
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .dados-item {
      font-size: 13px;
      color: ${COLORS.textPrimary};
      margin-bottom: 8px;
      line-height: 1.8;
    }

    .dados-label {
      font-weight: 500;
      color: ${COLORS.textSecondary};
      display: inline-block;
      width: 100px;
    }

    .dados-value {
      color: ${COLORS.textPrimary};
    }

    /* Cards de estatísticas */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 40px 0;
    }

    .stat-card-wrapper {
      background: linear-gradient(135deg, #8b5cf6, #f97316);
      border-radius: 12px;
      padding: 2px;
    }

    .stat-card {
      background: ${COLORS.background};
      border-radius: 10px;
      padding: 24px;
      text-align: center;
    }

    .stat-label {
      font-size: 12px;
      font-weight: 500;
      color: ${COLORS.textSecondary};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: ${COLORS.textPrimary};
      margin-bottom: 4px;
    }

    .stat-sublabel {
      font-size: 11px;
      color: ${COLORS.textSecondary};
    }

    /* Gráfico */
    .grafico-section {
      margin: 40px 0;
      background: ${COLORS.background};
      border: 1px solid ${COLORS.border};
      border-radius: 12px;
      padding: 24px;
    }

    .grafico-titulo {
      font-size: 16px;
      font-weight: 600;
      color: ${COLORS.textPrimary};
      margin-bottom: 20px;
    }

    .grafico-container {
      height: 200px;
      position: relative;
      border-bottom: 1px solid ${COLORS.border};
      border-left: 1px solid ${COLORS.border};
      padding: 10px;
    }

    .grafico-linha {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 180px;
    }

    /* Tabela */
    .tabela-section {
      margin: 40px 0;
    }

    .tabela-titulo {
      font-size: 16px;
      font-weight: 600;
      color: ${COLORS.textPrimary};
      margin-bottom: 16px;
    }

    .tabela {
      width: 100%;
      border-collapse: collapse;
      background: ${COLORS.background};
      border: 1px solid ${COLORS.border};
      border-radius: 8px;
      overflow: hidden;
    }

    .tabela thead {
      background: ${COLORS.primaryLight};
    }

    .tabela th {
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: ${COLORS.textPrimary};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tabela td {
      padding: 12px 16px;
      font-size: 13px;
      color: ${COLORS.textPrimary};
      border-top: 1px solid ${COLORS.border};
    }

    .tabela tbody tr:nth-child(even) {
      background: #fafafa;
    }

    /* Exames laboratoriais */
    .exames-section {
      margin: 40px 0;
    }

    .exames-titulo {
      font-size: 18px;
      font-weight: 600;
      color: ${COLORS.textPrimary};
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 2px solid ${COLORS.primary};
    }

    .exame-data {
      margin-bottom: 32px;
    }

    .exame-data-header {
      background: #f9fafb;
      padding: 12px 16px;
      border-radius: 8px 8px 0 0;
      border: 1px solid ${COLORS.border};
      border-bottom: none;
    }

    .exame-data-titulo {
      font-size: 13px;
      font-weight: 600;
      color: ${COLORS.textPrimary};
    }

    .exame-itens {
      border: 1px solid ${COLORS.border};
      border-radius: 0 0 8px 8px;
      padding: 16px;
      background: ${COLORS.background};
    }

    .exame-item {
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid ${COLORS.border};
    }

    .exame-item:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .exame-nome {
      font-size: 13px;
      font-weight: 500;
      color: ${COLORS.textPrimary};
      margin-bottom: 8px;
    }

    .exame-bar-container {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      position: relative;
      margin-bottom: 6px;
    }

    .exame-bar-range {
      position: absolute;
      height: 100%;
      background: ${COLORS.primary};
      opacity: 0.3;
      border-radius: 4px;
    }

    .exame-bar-marker {
      position: absolute;
      top: 0;
      width: 2px;
      height: 100%;
      background: ${COLORS.success};
      border-radius: 2px;
    }

    .exame-bar-marker.out-of-range {
      background: ${COLORS.error};
    }

    .exame-valor {
      font-size: 12px;
      color: ${COLORS.textSecondary};
    }

    .exame-valor.in-range {
      color: ${COLORS.success};
    }

    .exame-valor.out-of-range {
      color: ${COLORS.error};
    }

    /* Plano terapêutico */
    .plano-section {
      margin: 40px 0;
      background: ${COLORS.background};
      border: 1px solid ${COLORS.border};
      border-radius: 12px;
      padding: 24px;
    }

    .plano-titulo {
      font-size: 18px;
      font-weight: 600;
      color: ${COLORS.textPrimary};
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid ${COLORS.primary};
    }

    .plano-item {
      font-size: 13px;
      color: ${COLORS.textPrimary};
      margin-bottom: 12px;
      line-height: 1.8;
    }

    .plano-label {
      font-weight: 500;
      color: ${COLORS.textSecondary};
      display: inline-block;
      width: 160px;
    }

    /* Footer */
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid ${COLORS.border};
      text-align: center;
      font-size: 11px;
      color: ${COLORS.textSecondary};
      font-style: italic;
    }

    /* Quebra de página */
    .page-break {
      page-break-before: always;
      break-before: page;
    }

    /* Utilitários */
    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="relatorio-container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        ${medicoNome ? `
          <div class="medico-nome">${tituloMedico} ${medicoNome}</div>
          ${crm ? `<div class="medico-crm">${crm}</div>` : ''}
        ` : ''}
      </div>
      <div class="logo-container">
        <div class="logo-text">Oftware</div>
      </div>
    </div>

    <!-- Título -->
    <h1 class="titulo">Relatório Completo de Tratamento</h1>

    <!-- Dados do Paciente e Médico -->
    <div class="dados-section">
      <div class="dados-box">
        <div class="dados-titulo">Dados do Paciente</div>
        ${nomePaciente ? `<div class="dados-item"><span class="dados-label">Nome:</span><span class="dados-value">${nomePaciente}</span></div>` : ''}
        ${cpf ? `<div class="dados-item"><span class="dados-label">CPF:</span><span class="dados-value">${cpf}</span></div>` : ''}
        ${dataNasc ? `<div class="dados-item"><span class="dados-label">Data Nasc.:</span><span class="dados-value">${dataNasc}</span></div>` : ''}
        ${sexo ? `<div class="dados-item"><span class="dados-label">Sexo:</span><span class="dados-value">${sexo}</span></div>` : ''}
        ${telefone ? `<div class="dados-item"><span class="dados-label">Telefone:</span><span class="dados-value">${telefone}</span></div>` : ''}
        ${email ? `<div class="dados-item"><span class="dados-label">Email:</span><span class="dados-value">${email}</span></div>` : ''}
      </div>
      ${medicoNome ? `
        <div class="dados-box">
          <div class="dados-titulo">Médico Responsável</div>
          ${medicoNome ? `<div class="dados-item"><span class="dados-label">Nome:</span><span class="dados-value">${tituloMedico} ${medicoNome}</span></div>` : ''}
          ${crm ? `<div class="dados-item"><span class="dados-label">CRM:</span><span class="dados-value">${crm}</span></div>` : ''}
          ${medicoTelefone ? `<div class="dados-item"><span class="dados-label">Telefone:</span><span class="dados-value">${medicoTelefone}</span></div>` : ''}
          ${medicoEndereco ? `<div class="dados-item"><span class="dados-label">Endereço:</span><span class="dados-value">${medicoEndereco}</span></div>` : ''}
          ${primeiraCidade ? `<div class="dados-item"><span class="dados-label">Cidade de Atendimento:</span><span class="dados-value">${primeiraCidade}</span></div>` : ''}
        </div>
      ` : ''}
    </div>

    <!-- Cards de Estatísticas -->
    ${(pesoInicial || ultimoPeso || perdaPeso) ? `
      <div class="stats-grid">
        ${pesoInicial ? `
          <div class="stat-card-wrapper">
            <div class="stat-card peso-inicial">
              <div class="stat-label">Peso Inicial</div>
              <div class="stat-value">${pesoInicial.toFixed(1)}</div>
              <div class="stat-sublabel">kg</div>
            </div>
          </div>
        ` : ''}
        ${ultimoPeso ? `
          <div class="stat-card-wrapper">
            <div class="stat-card peso-atual">
              <div class="stat-label">Peso Atual</div>
              <div class="stat-value">${ultimoPeso.toFixed(1)}</div>
              <div class="stat-sublabel">kg</div>
            </div>
          </div>
        ` : ''}
        ${perdaPeso ? `
          <div class="stat-card-wrapper">
            <div class="stat-card perda-total">
              <div class="stat-label">Perda Total</div>
              <div class="stat-value">${perdaPeso.toFixed(1)}</div>
              <div class="stat-sublabel">kg ${percentualPerda ? `(${percentualPerda}%)` : ''}</div>
            </div>
          </div>
        ` : ''}
      </div>
    ` : ''}

    <!-- Gráfico de Evolução do Peso -->
    ${temGraficoPeso ? `
      <div class="grafico-section">
        <div class="grafico-titulo">Evolução do Peso</div>
        <div class="grafico-container">
          <svg class="grafico-linha" viewBox="0 0 100 100" preserveAspectRatio="none" style="width: 100%; height: 100%;">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:${COLORS.primary};stop-opacity:0" />
              </linearGradient>
            </defs>
            ${(() => {
              const min = Math.min(...pesos) * 0.95;
              const max = Math.max(...pesos) * 1.05;
              const range = max - min;
              const points = pesos.map((peso: number, idx: number) => {
                const x = (idx / (pesos.length - 1)) * 100;
                const y = 100 - ((peso - min) / range) * 90;
                return `${x},${y}`;
              }).join(' ');
              const areaPoints = `${points} L100,100 L0,100 Z`;
              return `
                <path d="M${areaPoints}" fill="url(#gradient)" />
                <polyline
                  fill="none"
                  stroke="${COLORS.primary}"
                  stroke-width="2.5"
                  points="${points}"
                />
                ${pesos.map((peso: number, idx: number) => {
                  const x = (idx / (pesos.length - 1)) * 100;
                  const y = 100 - ((peso - min) / range) * 90;
                  return `<circle cx="${x}" cy="${y}" r="3" fill="${COLORS.primary}" stroke="white" stroke-width="1.5"/>`;
                }).join('')}
              `;
            })()}
          </svg>
        </div>
      </div>
    ` : ''}

    <!-- Tabela de Evolução -->
    ${evolucao.length > 0 ? `
      <div class="tabela-section">
        <div class="tabela-titulo">Histórico de Acompanhamento</div>
        <table class="tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Peso (kg)</th>
              <th>Circ. Abdominal (cm)</th>
              <th>HbA1c (%)</th>
            </tr>
          </thead>
          <tbody>
            ${evolucao.slice(-12).map((reg: any) => {
              const dataReg = formatarData(reg.dataAplicacao);
              return `
                <tr>
                  <td>${dataReg || '-'}</td>
                  <td>${reg.peso ? reg.peso.toFixed(1) : '-'}</td>
                  <td>${reg.circunferenciaAbdominal ? reg.circunferenciaAbdominal.toFixed(0) : '-'}</td>
                  <td>${reg.hba1c ? reg.hba1c.toFixed(1) : '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- Exames Laboratoriais -->
    ${exames.length > 0 ? `
      <div class="exames-section page-break">
        <div class="exames-titulo">Exames Laboratoriais</div>
        ${Object.entries(
          exames.reduce((acc: any, exame: any) => {
            const data = formatarData(exame.dataColeta) || 'Sem data';
            if (!acc[data]) acc[data] = [];
            acc[data].push(exame);
            return acc;
          }, {})
        ).sort(([a], [b]) => {
          if (a === 'Sem data') return 1;
          if (b === 'Sem data') return -1;
          return new Date(b.split('/').reverse().join('-')).getTime() - new Date(a.split('/').reverse().join('-')).getTime();
        }).map(([data, examesData]: [string, any]) => `
          <div class="exame-data">
            <div class="exame-data-header">
              <div class="exame-data-titulo">Data de Coleta: ${data}</div>
            </div>
            <div class="exame-itens">
              ${examesData
                .map((exame: Record<string, unknown>) =>
                  renderExameItensLaboratoriaisHtml(
                    exame,
                    pacienteSex,
                    paciente.dadosIdentificacao?.dataNascimento
                  )
                )
                .join('')}
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Plano Terapêutico -->
    ${planoTerapeutico ? `
      <div class="plano-section page-break">
        <div class="plano-titulo">Plano Terapêutico</div>
        ${dataInicio ? `<div class="plano-item"><span class="plano-label">Data de Início:</span><span>${dataInicio}</span></div>` : ''}
        ${duracao ? `<div class="plano-item"><span class="plano-label">Duração:</span><span>${duracao} semanas</span></div>` : ''}
        ${planoTerapeutico.metas?.weightLossTargetValue ? `
          <div class="plano-item">
            <span class="plano-label">Meta de Perda de Peso:</span>
            <span>${planoTerapeutico.metas.weightLossTargetValue} ${planoTerapeutico.metas.weightLossTargetType === 'PERCENTUAL' ? '%' : 'kg'}</span>
          </div>
        ` : ''}
        ${planoTerapeutico.metas?.hba1cTargetType ? `
          <div class="plano-item">
            <span class="plano-label">Meta de HbA1c:</span>
            <span>${planoTerapeutico.metas.hba1cTargetType}</span>
          </div>
        ` : ''}
      </div>
    ` : ''}

    <!-- Footer -->
    ${dataGeracao ? `
      <div class="footer">
        Relatório gerado em ${dataGeracao}
      </div>
    ` : ''}
  </div>
</body>
</html>
  `;
};

/**
 * Função principal para gerar relatório completo em PDF
 */
export const gerarRelatorioCompleto = async (
  paciente: PacienteCompleto,
  medicoResponsavel: Medico | null
) => {
  if (!paciente) {
    alert('Dados do paciente não disponíveis');
    return;
  }

  // Mostrar loading
  const loadingMessage = document.createElement('div');
  loadingMessage.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 24px 32px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 16px;
    color: #111827;
    text-align: center;
  `;
  loadingMessage.textContent = 'Gerando relatório PDF...';
  document.body.appendChild(loadingMessage);

  try {
    // Carregar dados do médico responsável se necessário
    let medicoPerfil = medicoResponsavel;
    if (!medicoPerfil && paciente.medicoResponsavelId) {
      try {
        medicoPerfil = await MedicoService.getMedicoById(paciente.medicoResponsavelId);
      } catch (error) {
        console.error('Erro ao carregar médico:', error);
      }
    }

    // Criar HTML do relatório
    const htmlContent = criarHTMLRelatorio(paciente, medicoPerfil);

    // Criar elemento temporário para renderizar o HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Estilizar o container para renderização correta
    const relatorioContainer = tempDiv.querySelector('.relatorio-container') as HTMLElement;
    if (relatorioContainer) {
      relatorioContainer.style.width = '210mm';
      relatorioContainer.style.minHeight = 'auto';
    }
    
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '210mm';
    tempDiv.style.background = COLORS.background;
    document.body.appendChild(tempDiv);

    // Aguardar renderização completa (imagens, fontes, etc)
    loadingMessage.textContent = 'Preparando conteúdo...';
    await new Promise(resolve => setTimeout(resolve, 300));

    // Converter HTML completo para canvas com timeout
    loadingMessage.textContent = 'Renderizando conteúdo (isso pode levar alguns segundos)...';
    console.log('📄 Iniciando renderização do relatório...');
    
    let canvas: HTMLCanvasElement;
    try {
      const startTime = Date.now();
      const canvasPromise = html2canvas(tempDiv, {
        scale: 1.5, // Reduzir scale para melhor performance
        useCORS: true,
        logging: false,
        backgroundColor: COLORS.background,
        allowTaint: false,
        removeContainer: true,
        imageTimeout: 5000, // Timeout reduzido para imagens
        onclone: (clonedDoc) => {
          // Garantir que o HTML clonado está pronto
          const clonedContainer = clonedDoc.querySelector('.relatorio-container');
          if (clonedContainer) {
            (clonedContainer as HTMLElement).style.width = '210mm';
          }
        },
      });

      // Timeout de segurança (20 segundos)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Timeout: A renderização está demorando muito. Tente novamente.'));
        }, 20000);
      });

      canvas = await Promise.race([canvasPromise, timeoutPromise]) as HTMLCanvasElement;
      const renderTime = Date.now() - startTime;
      console.log(`✅ Renderização concluída em ${(renderTime / 1000).toFixed(2)}s`);
    } catch (error) {
      console.error('❌ Erro na renderização:', error);
      // Remover elemento temporário em caso de erro
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv);
      }
      throw error;
    }

    // Atualizar loading
    loadingMessage.textContent = 'Finalizando PDF...';
    console.log('📦 Criando arquivo PDF...');

    // Remover elemento temporário
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }

    // Criar PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    loadingMessage.textContent = 'Convertendo imagem...';
    const imgData = canvas.toDataURL('image/jpeg', 0.90); // JPEG é mais rápido que PNG
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = 297; // A4 height in mm

    let heightLeft = imgHeight;
    let position = 0;

    // Adicionar primeira página
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Adicionar páginas adicionais se necessário
    let pageNum = 1;
    while (heightLeft > 0) {
      loadingMessage.textContent = `Criando página ${pageNum + 1}...`;
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      pageNum++;
    }

    // Remover loading
    if (document.body.contains(loadingMessage)) {
      document.body.removeChild(loadingMessage);
    }

    // Salvar PDF
    const nomePaciente = paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente';
    const nomeArquivo = `Relatorio_${nomePaciente.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    console.log('💾 Salvando PDF:', nomeArquivo);
    pdf.save(nomeArquivo);
    console.log('✅ Relatório gerado com sucesso!');
  } catch (error) {
    // Remover loading em caso de erro
    if (document.body.contains(loadingMessage)) {
      document.body.removeChild(loadingMessage);
    }
    
    // Remover elemento temporário se ainda existir
    const tempDivRemaining = document.querySelector('div[style*="-9999px"]');
    if (tempDivRemaining && document.body.contains(tempDivRemaining)) {
      document.body.removeChild(tempDivRemaining);
    }
    
    console.error('Erro ao gerar relatório:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Erro desconhecido ao gerar relatório';
    
    alert(`Erro ao gerar relatório: ${errorMessage}\n\nTente novamente. Se o problema persistir, verifique se há muitos dados no relatório.`);
  }
};
