'use client';

import React from 'react';
import {
  X,
  Stethoscope,
  UserCheck,
  UtensilsCrossed,
  Dumbbell,
  Home,
  Users,
  DollarSign,
  Calendar,
  FileText,
  FlaskConical,
  ArrowRight,
  LayoutDashboard,
  Syringe,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Sun,
  Sunset,
  Moon,
  Edit,
  Play,
  Search,
  List,
} from 'lucide-react';

export type PreviewRole = 'medico' | 'paciente' | 'nutricionista' | 'personal';

// --- Prévia Paciente: simulação da home /meta (peso + barra IMC obeso) ---
const PESO_SIMULADO = 92.5; // kg
const ALTURA_SIMULADA_M = 1.7; // m
const IMC_SIMULADO = PESO_SIMULADO / (ALTURA_SIMULADA_M * ALTURA_SIMULADA_M); // ~32 (obeso)

function classificarIMC(imc: number): { label: string; bgGradient: string; icone: string } {
  if (imc < 18.5) return { label: 'Baixo peso', bgGradient: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', icone: '😟' };
  if (imc < 25) return { label: 'Saudável', bgGradient: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', icone: '🙂' };
  if (imc < 30) return { label: 'Alto', bgGradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', icone: '😐' };
  return { label: 'Obeso', bgGradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', icone: '😟' };
}

function calcularPosicaoMarcador(imc: number): number {
  if (imc < 18.5) return (imc / 18.5) * 25;
  if (imc < 25) return 25 + ((imc - 18.5) / (25 - 18.5)) * 25;
  if (imc < 30) return 50 + ((imc - 25) / (30 - 25)) * 25;
  return 75 + Math.min(((imc - 30) / 20) * 25, 25);
}

function PacientePreviewContent() {
  const classificacao = classificarIMC(IMC_SIMULADO);
  const posicaoMarcador = calcularPosicaoMarcador(IMC_SIMULADO);

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden" style={{ borderRadius: '24px' }}>
      <div className="p-4" style={{ padding: '18px' }}>
        {/* Badge pill (Obeso) */}
        <div className="mb-1">
          <div
            className="px-3 py-2 rounded-full inline-flex items-center gap-2 text-sm font-medium text-red-600"
            style={{ height: '30px', background: classificacao.bgGradient }}
          >
            {classificacao.label}
          </div>
        </div>
        {/* Peso em destaque */}
        <div className="mb-2">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-gray-900" style={{ fontSize: '52px' }}>
              {PESO_SIMULADO.toFixed(1)}
            </span>
            <span className="text-gray-600 font-medium" style={{ fontSize: '20px' }}>Kg</span>
          </div>
          <div className="text-gray-400 mt-0.5" style={{ fontSize: '15px' }}>
            Última medição
          </div>
        </div>
        {/* Barra de IMC */}
        <div className="mt-4">
          <div className="relative mb-1 h-4">
            <span className="absolute text-xs text-gray-500" style={{ left: '25%', transform: 'translateX(-50%)' }}>18.5</span>
            <span className="absolute text-xs text-gray-500" style={{ left: '50%', transform: 'translateX(-50%)' }}>25</span>
            <span className="absolute text-xs text-gray-500" style={{ left: '75%', transform: 'translateX(-50%)' }}>30</span>
          </div>
          <div
            className="relative rounded-full overflow-visible bg-gray-100"
            style={{ height: '6px', borderRadius: '999px' }}
          >
            <div className="absolute left-0 top-0 h-full" style={{ width: '25%', backgroundColor: '#60a5fa' }} />
            <div className="absolute left-1/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#34d399' }} />
            <div className="absolute left-2/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#fbbf24' }} />
            <div className="absolute left-3/4 top-0 h-full" style={{ width: '25%', backgroundColor: '#f87171' }} />
            <div
              className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-10 pointer-events-none"
              style={{ left: `${posicaoMarcador}%`, userSelect: 'none' }}
            >
              <div className="flex items-center gap-1">
                <span className="text-gray-600 text-xs font-bold" style={{ fontSize: '12px' }}>&lt;</span>
                <div className="bg-white border-2 border-gray-400 rounded-full shadow-lg flex items-center justify-center" style={{ width: '24px', height: '24px' }}>
                  <span style={{ fontSize: '14px' }}>{classificacao.icone}</span>
                </div>
                <span className="text-gray-600 text-xs font-bold" style={{ fontSize: '12px' }}>&gt;</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-gray-500" style={{ fontSize: '11px' }}>Baixo</span>
            <span className="text-gray-500" style={{ fontSize: '11px' }}>Saudável</span>
            <span className="text-gray-500" style={{ fontSize: '11px' }}>Alto</span>
            <span className="text-gray-500" style={{ fontSize: '11px' }}>Obeso</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Prévia Exames: resultados simulados (para aba Exames do paciente) ---
const EXAMES_PREVIEW: { label: string; value: number; unit: string; min: number; max: number }[] = [
  { label: 'Glicemia de Jejum', value: 98, unit: 'mg/dL', min: 70, max: 99 },
  { label: 'Hemoglobina Glicada (HbA1c)', value: 6.2, unit: '%', min: 4, max: 5.6 },
  { label: 'Colesterol Total', value: 195, unit: 'mg/dL', min: 0, max: 200 },
  { label: 'LDL', value: 118, unit: 'mg/dL', min: 0, max: 130 },
  { label: 'HDL', value: 48, unit: 'mg/dL', min: 40, max: 60 },
  { label: 'Creatinina', value: 1.0, unit: 'mg/dL', min: 0.7, max: 1.2 },
];

function ExamesPreviewContent() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Exames laboratoriais</h2>
        <p className="text-[10px] text-gray-500 mb-3">Última coleta: 15/01/2025 (prévia)</p>
        <div className="space-y-3">
          {EXAMES_PREVIEW.map((ex) => {
            const inRange = ex.value >= ex.min && ex.value <= ex.max;
            const rangeSpan = ex.max - ex.min || 1;
            const padding = rangeSpan * 0.2;
            const expandedMin = ex.min - padding;
            const expandedMax = ex.max + padding;
            const expandedSpan = expandedMax - expandedMin;
            const markerPct = Math.max(0, Math.min(100, ((ex.value - expandedMin) / expandedSpan) * 100));
            const rangeStart = ((ex.min - expandedMin) / expandedSpan) * 100;
            const rangeWidth = (rangeSpan / expandedSpan) * 100;
            return (
              <div key={ex.label} className="border border-gray-200 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-900">{ex.label}</span>
                  <span className={`text-xs font-semibold ${inRange ? 'text-gray-800' : 'text-red-600'}`}>
                    {ex.value} {ex.unit}
                  </span>
                </div>
                <div className="relative h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="absolute top-0 h-full bg-green-500/60 rounded-full"
                    style={{ left: `${rangeStart}%`, width: `${rangeWidth}%` }}
                  />
                  <div
                    className={`absolute top-0 w-1 h-full rounded-full -translate-x-1/2 ${inRange ? 'bg-green-600' : 'bg-red-600'}`}
                    style={{ left: `${markerPct}%` }}
                  />
                </div>
                <p className="text-[9px] text-gray-500 mt-0.5">Ref: {ex.min}–{ex.max} {ex.unit}</p>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          Acompanhe a evolução dos seus exames ao longo do tempo.
        </p>
      </div>
    </div>
  );
}

// --- Prévia Médico: Estatísticas (igual metaadmin home — Idade Média, Faixas Etárias, Perda de Peso) ---
const FAIXAS_PREVIEW = [
  { label: '18 - 24 anos', pct: 12.5, color: 'bg-blue-500' },
  { label: '25 - 40 anos', pct: 33.3, color: 'bg-indigo-500' },
  { label: '41 - 65 anos', pct: 41.7, color: 'bg-purple-500' },
  { label: '> 65 anos', pct: 12.5, color: 'bg-pink-500' },
];
const PERDA_PESO_SEMANAS_PREVIEW = [
  { semana: 2, media: -1.9, quantidade: 24 },
  { semana: 3, media: -2.71, quantidade: 22 },
  { semana: 4, media: -3.69, quantidade: 20 },
  { semana: 5, media: -4.89, quantidade: 18 },
];

function MedicoEstatisticasPreviewContent() {
  return (
    <div className="space-y-4">
      {/* Idade Média — igual metaadmin */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">Idade Média</h4>
          <Users size={18} className="text-blue-600 flex-shrink-0" />
        </div>
        <p className="text-2xl font-bold text-blue-700">
          42,5 <span className="text-base text-gray-600">anos</span>
        </p>
        <p className="text-[10px] text-gray-500 mt-1">
          24 pacientes com data de nascimento
        </p>
      </div>

      {/* Distribuição por Faixas Etárias — igual metaadmin */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Faixas Etárias</h4>
        <div className="space-y-2.5">
          {FAIXAS_PREVIEW.map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-600 flex-shrink-0 w-20">{f.label}</span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-1 max-w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`${f.color} h-1.5 rounded-full transition-all`}
                    style={{ width: `${f.pct}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-gray-900 w-8 text-right">{f.pct.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Média de Perda de Peso por Semana — igual metaadmin */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Média de Perda de Peso por Semana</h4>
        <div className="space-y-2">
          {PERDA_PESO_SEMANAS_PREVIEW.map((item) => (
            <div key={item.semana} className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-600 font-medium w-12">Sem {item.semana}</span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-1 max-w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min((Math.abs(item.media) / 5) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-green-700 whitespace-nowrap">
                  {item.media > 0 ? '' : '−'}{Math.abs(item.media).toFixed(2).replace('.', ',')} kg
                </span>
                <span className="text-[10px] text-gray-500">(n={item.quantidade})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-gray-500 text-center">Prévia — igual à home do metaadmin.</p>
    </div>
  );
}

// --- Prévia Médico: Mapa do Site (todas as funções disponíveis no metaadmin) ---
const MAPA_MEDICO: { secao: string; itens: string[] }[] = [
  {
    secao: 'Home (Estatísticas)',
    itens: [
      'Pipeline de Qualificação (leads: Não qualificado, Enviado contato, Contato feito, Em tratamento, Excluído)',
      'Filtros: Meus Pacientes / Base Oftware, Sexo, Faixa etária',
      'Idade Média e Distribuição por Faixas Etárias',
      'Distribuição por Gênero',
      'Estatística de Perda de Peso (média por semana, gráfico, filtros)',
    ],
  },
  {
    secao: 'Nutricionistas',
    itens: [
      'Buscar nutricionistas (por estado e cidade)',
      'Solicitações de vínculo (pendentes, enviadas)',
      'Nutricionistas vinculados (lista e pacientes compartilhados)',
    ],
  },
  {
    secao: 'Personal',
    itens: [
      'Buscar personais (por estado e cidade)',
      'Solicitações de vínculo (pendentes, enviadas)',
      'Personais vinculados (lista e pacientes compartilhados)',
    ],
  },
  {
    secao: 'Pacientes',
    itens: [
      'Solicitações de Pacientes (Novas, Anteriores)',
      'Cadastrar paciente',
      'Lista de pacientes (busca, filtro por status)',
      'Por paciente: Plano Terapêutico, Prescrições, Solicitar Exames',
      'Por paciente: Editar prontuário, Pagamento, Excluir',
    ],
  },
  {
    secao: 'Financeiro',
    itens: [
      'Totais (Recebido, Em aberto, Previsto)',
      'Pagamentos por paciente',
      'Vendas avulsas',
      'Dados financeiros por mês (detalhado)',
    ],
  },
  {
    secao: 'Calendário',
    itens: [
      'Calendário de aplicações (por dia)',
      'Ao selecionar dia: quem aplicou / quem ainda não preencheu',
    ],
  },
  {
    secao: 'Perfil',
    itens: [
      'Meu Perfil Médico (CRM, dados, locais de atendimento)',
    ],
  },
  {
    secao: 'Menu do Usuário',
    itens: [
      'Meu Link',
      'Minha Proposta',
      'Meu NPS/Depoimentos',
      'Encaminhados',
      'LogOut',
    ],
  },
];

function MedicoMapaPreviewContent() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Mapa do Site — Área do Médico</h2>
        <p className="text-[10px] text-gray-500 mb-3">Todas as funções disponíveis no metaadmin</p>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {MAPA_MEDICO.map((bloco, i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-2.5 py-2 bg-purple-50 border-b border-purple-100">
                <p className="text-xs font-semibold text-purple-900">{bloco.secao}</p>
              </div>
              <ul className="px-2.5 py-2 space-y-1">
                {bloco.itens.map((item, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-[11px] text-gray-700">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          Acesse sua área para usar cada função.
        </p>
      </div>
    </div>
  );
}

// --- Mapa do Site — Área do Paciente (/meta) ---
const MAPA_PACIENTE: { secao: string; itens: string[] }[] = [
  {
    secao: 'Estatísticas',
    itens: [
      'Peso, IMC e classificação (barra visual)',
      'Evolução e gráficos (peso, HbA1c, circunferência)',
      'Layouts: Moderno, Minimalista, Interativo',
      'Plano terapêutico e metas',
    ],
  },
  {
    secao: 'Exames',
    itens: [
      'Exames laboratoriais por data de coleta',
      'Resultados e faixas de referência',
      'Evolução ao longo do tempo',
    ],
  },
  {
    secao: 'Aplicações',
    itens: [
      'Calendário de aplicações (doses)',
      'Registro por semana e dia',
    ],
  },
  {
    secao: 'Médicos',
    itens: [
      'Buscar médico (por estado e cidade)',
      'Minhas solicitações de vínculo',
      'Meu médico (dados do médico responsável)',
    ],
  },
  {
    secao: 'Nutri',
    itens: [
      'Cardápio e plano alimentar',
      'Recomendações do nutricionista',
    ],
  },
  {
    secao: 'Personal',
    itens: [
      'Treinos e cronograma',
      'Conteúdo prescrito pelo personal',
    ],
  },
  {
    secao: 'Encaminhar',
    itens: [
      'Meu link de encaminhamento (compartilhar)',
      'Indicar (formulário: indicar pessoa ao médico)',
      'Minhas indicações (status: pendente, visualizada, venda, paga)',
    ],
  },
  {
    secao: 'Menu do Usuário (Perfil)',
    itens: [
      'Meu Perfil',
      'Meus Exames',
      'Recomendações',
      'Mensagens (com o médico)',
      'Relatório Final (PDF)',
      'Sair',
    ],
  },
];

function PacienteMapaPreviewContent() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Mapa do Site — Área do Paciente</h2>
        <p className="text-[10px] text-gray-500 mb-3">Todas as funções disponíveis em /meta</p>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {MAPA_PACIENTE.map((bloco, i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-2.5 py-2 bg-orange-50 border-b border-orange-100">
                <p className="text-xs font-semibold text-orange-900">{bloco.secao}</p>
              </div>
              <ul className="px-2.5 py-2 space-y-1">
                {bloco.itens.map((item, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-[11px] text-gray-700">
                    <span className="text-orange-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          Acesse sua área para usar cada função.
        </p>
      </div>
    </div>
  );
}

// --- Prévia Médico: Lista de Pacientes (igual metaadmin — cards mobile com barra de semanas, avatar IMC, status, perda peso) ---
const PACIENTES_PREVIEW = [
  { nome: 'Maria S.', status: 'em_tratamento' as const, perdaPeso: -5.2, semanasAplicadas: 5, totalSemanas: 12, emoji: '😟', corBorda: '#f87171' },
  { nome: 'João P.', status: 'em_tratamento' as const, perdaPeso: -7.1, semanasAplicadas: 8, totalSemanas: 12, emoji: '🙂', corBorda: '#34d399' },
  { nome: 'Ana L.', status: 'em_tratamento' as const, perdaPeso: -3.8, semanasAplicadas: 3, totalSemanas: 12, emoji: '😐', corBorda: '#fbbf24' },
  { nome: 'Carlos M.', status: 'pendente' as const, perdaPeso: null, semanasAplicadas: 0, totalSemanas: 12, emoji: '🙂', corBorda: '#9ca3af' },
];

function MedicoPacientesPreviewContent() {
  return (
    <div className="space-y-3">
      {/* Busca + filtro (placeholder igual metaadmin) */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar paciente por nome..."
            readOnly
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
          />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Search size={14} />
          </div>
        </div>
        <select
          readOnly
          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
          value="todos"
        >
          <option value="todos">Todos</option>
          <option value="em_tratamento">Em Tratamento</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>

      {/* Cards — estilo metaadmin mobile */}
      {PACIENTES_PREVIEW.map((p, i) => (
        <div key={i} className="border border-gray-200 bg-white rounded-lg overflow-hidden shadow-sm">
          {/* Barra superior: progresso de semanas */}
          <div className="w-full rounded-t-lg relative overflow-hidden bg-gray-100">
            <div
              className="absolute left-0 top-0 h-0.5 transition-all"
              style={{
                width: p.totalSemanas > 0 ? `${Math.min((p.semanasAplicadas / p.totalSemanas) * 100, 100)}%` : '0%',
                backgroundColor: p.totalSemanas > 0
                  ? (p.semanasAplicadas / p.totalSemanas) >= 1 ? '#22c55e' : (p.semanasAplicadas / p.totalSemanas) >= 0.5 ? '#3b82f6' : '#f59e0b'
                  : '#e5e7eb',
              }}
            />
            <div className="relative z-10 py-0.5 text-center text-[10px] font-semibold text-gray-700">
              {p.totalSemanas > 0 ? `${p.semanasAplicadas} de ${p.totalSemanas}` : '–'}
            </div>
          </div>
          <div className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white border-2"
                  style={{ borderColor: p.corBorda }}
                >
                  <span style={{ fontSize: '14px' }}>{p.emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{p.nome}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                      p.status === 'em_tratamento' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {p.status === 'em_tratamento' ? 'Em Tratamento' : 'Pendente'}
                    </span>
                    {p.perdaPeso !== null && (
                      <span className="text-[10px] text-gray-600">
                        {p.perdaPeso < 0 ? '−' : p.perdaPeso > 0 ? '+' : ''}{Math.abs(p.perdaPeso).toFixed(1)} kg
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
            </div>
          </div>
        </div>
      ))}
      <p className="text-[10px] text-gray-500 text-center">Prévia — igual à página Pacientes do metaadmin.</p>
    </div>
  );
}

// --- Prévia Médico: calendário de aplicações dos pacientes ---
const MESES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Simulação: ~90% dos dias do mês com aplicações (1 a 4 por dia) para o médico ver a gestão
const APLICACOES_POR_DIA: Record<number, number> = {
  1: 2, 2: 1, 3: 3, 4: 2, 5: 1, 6: 2, 7: 4, 8: 3, 9: 2, 10: 1, 11: 2, 12: 3, 13: 1, 14: 2,
  15: 4, 16: 1, 17: 2, 18: 3, 19: 2, 20: 1, 21: 2, 22: 3, 23: 1, 24: 2, 25: 4, 26: 2, 27: 1, 28: 2,
};

// Dia selecionado na prévia (ex.: 8) — lista quem aplicou e quem ainda não preencheu
const DIA_SELECIONADO_PREVIEW = 8;
const APLICARAM_DIA_PREVIEW = ['Maria S.', 'João P.', 'Ana L.'];
const NAO_PREENCHERAM_DIA_PREVIEW = ['Carlos M.', 'Fernanda R.'];

function MedicoCalendarioPreviewContent() {
  const ano = 2025;
  const mes = 1; // Fevereiro (0-indexed)
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diaSemanaPrimeiro = primeiroDia.getDay();
  const diasNoMes = ultimoDia.getDate();

  const dias: (number | null)[] = [];
  for (let i = 0; i < diaSemanaPrimeiro; i++) dias.push(null);
  for (let d = 1; d <= diasNoMes; d++) dias.push(d);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-3">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Calendário de Aplicações</h2>
          <div className="flex items-center justify-between mb-3">
            <button type="button" className="p-1 rounded hover:bg-gray-100" aria-label="Mês anterior">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <span className="text-xs font-semibold text-gray-800">
              {MESES_NOME[mes]} {ano}
            </span>
            <button type="button" className="p-1 rounded hover:bg-gray-100" aria-label="Próximo mês">
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>
          <div className="grid grid-cols-7 border-b border-gray-200">
            {DIAS_SEMANA.map((dia) => (
              <div key={dia} className="p-0.5 text-center text-[10px] font-semibold text-gray-500">
                {dia}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {dias.map((dia, idx) => {
              const isBlank = dia === null;
              const count = dia !== null ? APLICACOES_POR_DIA[dia] ?? 0 : 0;
              const isSelected = dia === DIA_SELECIONADO_PREVIEW;
              return (
                <div
                  key={idx}
                  className={`min-h-[28px] border p-0.5 flex flex-col items-center justify-center ${
                    isBlank ? 'bg-gray-50/50 border-gray-100' : isSelected ? 'bg-purple-100 border-purple-300 ring-1 ring-purple-400' : 'border-gray-100 bg-white'
                  }`}
                >
                  {!isBlank && (
                    <>
                      <span className={`text-[10px] font-semibold ${isSelected ? 'text-purple-900' : 'text-gray-700'}`}>{dia}</span>
                      {count > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-green-600 text-white text-[8px] font-bold mt-0.5">
                          <Syringe className="w-2 h-2" />
                          {count}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dia selecionado (ex.: 8) — quem aplicou e quem ainda não preencheu */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-3">
          <h3 className="text-xs font-bold text-gray-900 mb-2">
            {DIA_SELECIONADO_PREVIEW} de {MESES_NOME[mes]} — gestão do dia
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <span className="inline-flex w-1.5 h-1.5 rounded-full bg-green-500" /> Aplicaram ({APLICARAM_DIA_PREVIEW.length})
              </p>
              <ul className="space-y-1">
                {APLICARAM_DIA_PREVIEW.map((nome, i) => (
                  <li key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-green-50 border border-green-100">
                    <UserCheck size={12} className="text-green-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-900">{nome}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <span className="inline-flex w-1.5 h-1.5 rounded-full bg-amber-500" /> Ainda não preencheu ({NAO_PREENCHERAM_DIA_PREVIEW.length})
              </p>
              <ul className="space-y-1">
                {NAO_PREENCHERAM_DIA_PREVIEW.map((nome, i) => (
                  <li key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-amber-50 border border-amber-100">
                    <UserCheck size={12} className="text-amber-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-900">{nome}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 mt-2 text-center">
            Toque em um dia no calendário para ver quem aplicou e quem falta.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Mapa do Site — Área do Nutricionista (metanutri) ---
const MAPA_NUTRICIONISTA: { secao: string; itens: string[] }[] = [
  {
    secao: 'Home',
    itens: [
      'Estatísticas de pacientes (Total, Pendentes, Tratamento, Concluído, Abandono)',
      'Médicos vinculados (KPI)',
      'Demografia dos pacientes (idade, gênero, etc.)',
    ],
  },
  {
    secao: 'Médicos',
    itens: [
      'Buscar médicos (por estado e cidade)',
      'Solicitações de vínculo (recebidas: aceitar/rejeitar)',
      'Médicos vinculados (lista e pacientes compartilhados)',
    ],
  },
  {
    secao: 'Pacientes',
    itens: [
      'Lista de pacientes (compartilhados pelo médico)',
      'Por paciente: Cardápio, Prescrições, Exames, Dados clínicos',
      'Edição do plano alimentar e recomendações',
    ],
  },
  {
    secao: 'Financeiro',
    itens: [
      'Pagamentos por paciente (valor total, pago, em aberto)',
      'Filtros por status (Pago, Em Aberto, Parcial, Negociação)',
      'Vendas avulsas e gerenciar pagamento',
    ],
  },
  {
    secao: 'Calendário',
    itens: [
      'Calendário de aplicações dos pacientes',
      'Visualização por mês e por paciente',
    ],
  },
  {
    secao: 'Meu Perfil',
    itens: [
      'Dados do nutricionista (nome, registro, telefone, cidades)',
    ],
  },
  {
    secao: 'Menu do Usuário',
    itens: [
      'Meu Perfil',
      'Meu Link',
      'Sair',
    ],
  },
];

function NutricionistaMapaPreviewContent() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Mapa do Site — Área do Nutricionista</h2>
        <p className="text-[10px] text-gray-500 mb-3">Todas as funções disponíveis no metanutri</p>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {MAPA_NUTRICIONISTA.map((bloco, i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-2.5 py-2 bg-emerald-50 border-b border-emerald-100">
                <p className="text-xs font-semibold text-emerald-900">{bloco.secao}</p>
              </div>
              <ul className="px-2.5 py-2 space-y-1">
                {bloco.itens.map((item, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-[11px] text-gray-700">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          Acesse sua área para usar cada função.
        </p>
      </div>
    </div>
  );
}

// --- Mapa do Site — Área do Personal (metapersonal) ---
const MAPA_PERSONAL: { secao: string; itens: string[] }[] = [
  {
    secao: 'Home',
    itens: [
      'Estatísticas de pacientes (Total, Pendentes, Tratamento, Concluído, Abandono)',
      'Médicos vinculados (KPI)',
      'Demografia dos pacientes (idade, gênero, etc.)',
    ],
  },
  {
    secao: 'Médicos',
    itens: [
      'Buscar médicos (por estado e cidade)',
      'Solicitações de vínculo (recebidas: aceitar/rejeitar)',
      'Médicos vinculados (lista e pacientes compartilhados)',
    ],
  },
  {
    secao: 'Pacientes',
    itens: [
      'Lista de pacientes (compartilhados pelo médico)',
      'Por paciente: Treinos, Cronograma, Sessões, Presença',
      'Aba Hoje: treino do dia, iniciar treino, exercícios com GIF',
    ],
  },
  {
    secao: 'Financeiro',
    itens: [
      'Pagamentos por paciente (valor total, pago, em aberto)',
      'Filtros por status (Pago, Em Aberto, Parcial, Negociação)',
      'Vendas avulsas e gerenciar pagamento',
    ],
  },
  {
    secao: 'Calendário',
    itens: [
      'Calendário de treinos e sessões dos pacientes',
      'Visualização por mês e por paciente',
    ],
  },
  {
    secao: 'Meu Perfil',
    itens: [
      'Dados do personal (nome, registro, telefone, cidades)',
    ],
  },
  {
    secao: 'Menu do Usuário',
    itens: [
      'Meu Perfil',
      'Meu Link',
      'Sair',
    ],
  },
];

function PersonalMapaPreviewContent() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Mapa do Site — Área do Personal</h2>
        <p className="text-[10px] text-gray-500 mb-3">Todas as funções disponíveis no metapersonal</p>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {MAPA_PERSONAL.map((bloco, i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-2.5 py-2 bg-blue-50 border-b border-blue-100">
                <p className="text-xs font-semibold text-blue-900">{bloco.secao}</p>
              </div>
              <ul className="px-2.5 py-2 space-y-1">
                {bloco.itens.map((item, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-[11px] text-gray-700">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          Acesse sua área para usar cada função.
        </p>
      </div>
    </div>
  );
}

// --- Prévia Nutricionista: edição do cardápio do paciente ---
const REFEICOES_PREVIEW: { key: string; titulo: string; Icon: React.ComponentType<{ className?: string; size?: number }>; bg: string; border: string; icon: string; exemplo: string }[] = [
  { key: 'cafe', titulo: 'Café da Manhã', Icon: Coffee, bg: 'from-amber-50 to-orange-50', border: 'border-amber-500', icon: 'text-amber-700', exemplo: 'Ovos + pão integral + fruta' },
  { key: 'lanche1', titulo: 'Lanche da Manhã', Icon: Sun, bg: 'from-blue-50 to-cyan-50', border: 'border-blue-500', icon: 'text-blue-700', exemplo: 'Iogurte + castanhas' },
  { key: 'almoco', titulo: 'Almoço', Icon: Sunset, bg: 'from-orange-50 to-red-50', border: 'border-orange-500', icon: 'text-orange-700', exemplo: 'Frango + arroz + salada' },
  { key: 'lanche2', titulo: 'Lanche da Tarde', Icon: Sun, bg: 'from-purple-50 to-pink-50', border: 'border-purple-500', icon: 'text-purple-700', exemplo: 'Vitamina de banana' },
  { key: 'jantar', titulo: 'Jantar', Icon: Moon, bg: 'from-indigo-50 to-blue-50', border: 'border-indigo-500', icon: 'text-indigo-700', exemplo: 'Peixe + legumes' },
];

function NutricionistaPreviewContent({ patientView }: { patientView?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3">
        <h2 className="text-sm font-bold text-gray-900 mb-1">{patientView ? 'Seu cardápio' : 'Edição do cardápio'}</h2>
        <p className="text-[10px] text-gray-500 mb-3">{patientView ? 'Prévia (dados simulados)' : 'Paciente: Maria S. (prévia)'}</p>
        <div className="space-y-2">
          {REFEICOES_PREVIEW.map((r) => {
            const Icon = r.Icon;
            return (
              <div
                key={r.key}
                className={`bg-gradient-to-r ${r.bg} rounded-lg border-l-4 ${r.border} overflow-hidden`}
              >
                <div className="flex items-center justify-between p-2.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${r.icon}`} />
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 text-xs">{r.titulo}</h4>
                      <p className="text-[10px] text-gray-600 truncate">{r.exemplo}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg hover:bg-white/60 transition-colors flex-shrink-0"
                    aria-label="Editar"
                  >
                    <Edit className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-[10px] font-semibold text-gray-700">Resumo do dia</p>
          <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
            <span>Proteína: 95g</span>
            <span>~1.850 kcal</span>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          {patientView ? 'Toque em uma refeição para personalizar.' : 'Toque em uma refeição para editar o cardápio do paciente.'}
        </p>
      </div>
    </div>
  );
}

// --- Prévia Personal: treino de hoje + próximo exercício (com GIF) + Iniciar treino ---
// Busca um exercício real da API para usar o ID correto no GIF (ExerciseDB pode usar formatos diferentes).
function PersonalPreviewContent() {
  const [gifError, setGifError] = React.useState(false);
  const [exerciseGifUrl, setExerciseGifUrl] = React.useState<string | null>(null);
  const [exerciseName, setExerciseName] = React.useState('Supino reto');
  const [exerciseTarget, setExerciseTarget] = React.useState('peitorais');
  const [exerciseEquipment, setExerciseEquipment] = React.useState('barra');

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/exercises?limit=1')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        const ex = data[0];
        const id = ex?.id;
        if (id && typeof id === 'string') {
          setExerciseGifUrl(`/api/exercisedb/image?exerciseId=${encodeURIComponent(id)}&resolution=180`);
          if (ex.name) setExerciseName(ex.name);
          if (ex.target) setExerciseTarget(ex.target);
          if (ex.equipment) setExerciseEquipment(ex.equipment);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const gifUrl = exerciseGifUrl;

  return (
    <div className="space-y-4">
      {/* Card Treino de hoje */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ring-1 ring-black/5">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-600">Treino de hoje</p>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-200/80 text-gray-700">
              Agendado
            </span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Treino A - Superiores</h2>
          <p className="text-xs text-gray-600">4 exercícios • 0% • 0/4</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 w-0" />
            </div>
            <span className="text-xs text-gray-600 tabular-nums">0%</span>
          </div>
          <button
            type="button"
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Play className="w-4 h-4" />
            Iniciar treino
          </button>
        </div>
      </div>
      {/* Próximo exercício com GIF */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Próximo exercício</h3>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="relative aspect-video w-full bg-gray-100 rounded-t-2xl overflow-hidden">
            {gifUrl && !gifError ? (
              <img
                src={gifUrl}
                alt={exerciseName}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setGifError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Dumbbell className="w-12 h-12 text-gray-300" />
              </div>
            )}
            <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
              Próximo
            </span>
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" aria-hidden />
          </div>
          <div className="p-3 space-y-2">
            <h4 className="text-sm font-semibold text-gray-900 capitalize">{exerciseName.replace(/_/g, ' ')}</h4>
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 capitalize">
                {exerciseTarget.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">
                {exerciseEquipment.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-gray-500 text-center">
        Na sua área você monta treinos e acompanha a evolução dos alunos.
      </p>
    </div>
  );
}

const ROLE_CONFIG: Record<
  PreviewRole,
  {
    title: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    accent: string;
    sidebarBg: string;
    sidebarItems: { icon: React.ReactNode; label: string }[];
    cards: { title: string; value: string; sub?: string }[];
  }
> = {
  medico: {
    title: 'Área do Médico',
    Icon: Stethoscope,
    accent: 'purple',
    sidebarBg: 'bg-purple-50 border-purple-100',
    sidebarItems: [
      { icon: <Home size={18} />, label: 'Início' },
      { icon: <Users size={18} />, label: 'Pacientes' },
      { icon: <UtensilsCrossed size={18} />, label: 'Nutricionistas' },
      { icon: <Dumbbell size={18} />, label: 'Personais' },
      { icon: <DollarSign size={18} />, label: 'Financeiro' },
    ],
    cards: [
      { title: 'Pacientes em tratamento', value: '—', sub: 'visão geral' },
      { title: 'Leads', value: '—', sub: 'solicitações de orçamento' },
      { title: 'Vínculos', value: '—', sub: 'nutri e personal' },
    ],
  },
  paciente: {
    title: 'Área do Paciente',
    Icon: UserCheck,
    accent: 'orange',
    sidebarBg: 'bg-orange-50 border-orange-100',
    sidebarItems: [
      { icon: <LayoutDashboard size={18} />, label: 'Estatísticas' },
      { icon: <FileText size={18} />, label: 'Recomendações' },
      { icon: <FlaskConical size={18} />, label: 'Exames' },
      { icon: <UtensilsCrossed size={18} />, label: 'Nutrição' },
      { icon: <Dumbbell size={18} />, label: 'Treinos' },
    ],
    cards: [
      { title: 'Seu médico', value: '—', sub: 'acompanhamento' },
      { title: 'Evolução', value: '—', sub: 'peso e metas' },
      { title: 'Próximas recomendações', value: '—', sub: 'em dia' },
    ],
  },
  nutricionista: {
    title: 'Área do Nutricionista',
    Icon: UtensilsCrossed,
    accent: 'emerald',
    sidebarBg: 'bg-emerald-50 border-emerald-100',
    sidebarItems: [
      { icon: <Home size={18} />, label: 'Home' },
      { icon: <Stethoscope size={18} />, label: 'Médicos' },
      { icon: <Users size={18} />, label: 'Pacientes' },
      { icon: <DollarSign size={18} />, label: 'Financeiro' },
      { icon: <Calendar size={18} />, label: 'Calendário' },
    ],
    cards: [
      { title: 'Pacientes compartilhados', value: '—', sub: 'pelo médico' },
      { title: 'Médicos vinculados', value: '—', sub: 'parcerias' },
      { title: 'Receita', value: '—', sub: 'planos e consultas' },
    ],
  },
  personal: {
    title: 'Área do Personal',
    Icon: Dumbbell,
    accent: 'blue',
    sidebarBg: 'bg-blue-50 border-blue-100',
    sidebarItems: [
      { icon: <Home size={18} />, label: 'Home' },
      { icon: <Stethoscope size={18} />, label: 'Médicos' },
      { icon: <Users size={18} />, label: 'Pacientes' },
      { icon: <DollarSign size={18} />, label: 'Financeiro' },
      { icon: <Calendar size={18} />, label: 'Calendário' },
    ],
    cards: [
      { title: 'Alunos', value: '—', sub: 'em acompanhamento' },
      { title: 'Treinos agendados', value: '—', sub: 'esta semana' },
      { title: 'Receita', value: '—', sub: 'sessões e planos' },
    ],
  },
};

const accentBorder: Record<string, string> = {
  purple: 'border-purple-200',
  orange: 'border-orange-200',
  emerald: 'border-emerald-200',
  blue: 'border-blue-200',
};

const accentBg: Record<string, string> = {
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
};

const accentText: Record<string, string> = {
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  emerald: 'text-emerald-600',
  blue: 'text-blue-600',
};

interface PreviewAreaModalProps {
  role: PreviewRole;
  onClose: () => void;
  onAcessar: () => void;
  acessarLabel: string;
}

type PacienteTab = 'home' | 'exames' | 'nutri' | 'personal' | 'mapa';
type MedicoTab = 'estatisticas' | 'calendario' | 'pacientes' | 'mapa';
type NutricionistaTab = 'pacientes' | 'mapa';
type PersonalTab = 'pacientes' | 'mapa';

export default function PreviewAreaModal({ role, onClose, onAcessar, acessarLabel }: PreviewAreaModalProps) {
  const config = ROLE_CONFIG[role];
  const border = accentBorder[config.accent];
  const iconBg = accentBg[config.accent];
  const textAccent = accentText[config.accent];
  const Icon = config.Icon;
  const isPaciente = role === 'paciente';
  const isMedico = role === 'medico';
  const isNutricionista = role === 'nutricionista';
  const isPersonal = role === 'personal';
  const [pacienteTab, setPacienteTab] = React.useState<PacienteTab>('home');
  const [medicoTab, setMedicoTab] = React.useState<MedicoTab>('estatisticas');
  const [nutricionistaTab, setNutricionistaTab] = React.useState<NutricionistaTab>('pacientes');
  const [personalTab, setPersonalTab] = React.useState<PersonalTab>('pacientes');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/50 backdrop-blur-sm">
      {/* Moldura estilo celular: largura fixa de smartphone */}
      <div
        className="relative w-full max-w-[380px] flex flex-col rounded-[2rem] border-2 border-gray-300 bg-gray-100 shadow-2xl overflow-hidden animate-expand-in"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de status (estilo iOS/Android) */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-1 text-[11px] text-black font-medium">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-2 rounded-sm border border-black" />
            <span className="inline-block w-2 h-3 border border-black rounded-sm" />
          </div>
        </div>

        {/* Cabeçalho do app (Oftware + título da área) */}
        <div className={`flex-shrink-0 flex items-center justify-between px-4 py-2 ${config.sidebarBg} border-b ${border}`}>
          <div className="flex items-center gap-2">
            <img src="/icones/oftware.png" alt="Oftware" className="w-6 h-6" />
            <span className="font-bold text-gray-800 text-sm">{config.title}</span>
            <span className="text-[10px] text-gray-500">(prévia)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/80 transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo: estilo mobile (uma coluna) */}
        <div className="flex-1 overflow-auto bg-gray-50/80 min-h-0">
          {isPaciente ? (
            /* Paciente: 5 abas — Home, Exames, Nutri, Personal, Mapa */
            <div className="flex flex-col h-full">
              <div className="flex-shrink-0 flex border-b border-gray-200 bg-white overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPacienteTab('home')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-w-0 ${
                    pacienteTab === 'home'
                      ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Home size={14} className="flex-shrink-0" />
                  <span className="truncate">Home</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPacienteTab('exames')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-w-0 ${
                    pacienteTab === 'exames'
                      ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <FlaskConical size={14} className="flex-shrink-0" />
                  <span className="truncate">Exames</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPacienteTab('nutri')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-w-0 ${
                    pacienteTab === 'nutri'
                      ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <UtensilsCrossed size={14} className="flex-shrink-0" />
                  <span className="truncate">Nutri</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPacienteTab('personal')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-w-0 ${
                    pacienteTab === 'personal'
                      ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Dumbbell size={14} className="flex-shrink-0" />
                  <span className="truncate">Personal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPacienteTab('mapa')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-w-0 ${
                    pacienteTab === 'mapa'
                      ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <List size={14} className="flex-shrink-0" />
                  <span className="truncate">Mapa</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {pacienteTab === 'home' && (
                  <>
                    <p className="text-xs text-gray-500 mb-2">Prévia da sua evolução (dados simulados)</p>
                    <PacientePreviewContent />
                    <p className="text-[10px] text-gray-400 mt-3 text-center">
                      Na sua área você acompanha peso, IMC e recomendações do médico.
                    </p>
                  </>
                )}
                {pacienteTab === 'exames' && (
                  <>
                    <p className="text-xs text-gray-500 mb-2">Prévia (dados simulados)</p>
                    <ExamesPreviewContent />
                    <p className="text-[10px] text-gray-400 mt-3 text-center">
                      Seus exames e evolução laboratorial em um só lugar.
                    </p>
                  </>
                )}
                {pacienteTab === 'nutri' && (
                  <>
                    <p className="text-xs text-gray-500 mb-2">Prévia (dados simulados)</p>
                    <NutricionistaPreviewContent patientView />
                    <p className="text-[10px] text-gray-400 mt-3 text-center">
                      Seu plano alimentar e cardápio na palma da mão.
                    </p>
                  </>
                )}
                {pacienteTab === 'personal' && (
                  <>
                    <p className="text-xs text-gray-500 mb-2">Prévia (dados simulados)</p>
                    <PersonalPreviewContent />
                    <p className="text-[10px] text-gray-400 mt-3 text-center">
                      Treinos prescritos pelo seu personal, quando e onde quiser.
                    </p>
                  </>
                )}
                {pacienteTab === 'mapa' && (
                  <>
                    <PacienteMapaPreviewContent />
                  </>
                )}
              </div>
            </div>
          ) : isMedico ? (
            /* Médico: 3 abas — Estatísticas, Calendário, Pacientes */
            <div className="flex flex-col h-full">
              <div className="flex-shrink-0 flex border-b border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setMedicoTab('estatisticas')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-w-0 ${
                    medicoTab === 'estatisticas'
                      ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50/50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <LayoutDashboard size={14} className="flex-shrink-0" />
                  <span className="truncate">Estatísticas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMedicoTab('calendario')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-w-0 ${
                    medicoTab === 'calendario'
                      ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50/50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Calendar size={14} className="flex-shrink-0" />
                  <span className="truncate">Calendário</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMedicoTab('pacientes')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-w-0 ${
                    medicoTab === 'pacientes'
                      ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50/50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Users size={14} className="flex-shrink-0" />
                  <span className="truncate">Pacientes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMedicoTab('mapa')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-w-0 ${
                    medicoTab === 'mapa'
                      ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50/50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <List size={14} className="flex-shrink-0" />
                  <span className="truncate">Mapa</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {medicoTab === 'estatisticas' && (
                  <>
                    <p className="text-xs text-gray-500 mb-2">Prévia (dados simulados)</p>
                    <MedicoEstatisticasPreviewContent />
                    <p className="text-[10px] text-gray-400 mt-3 text-center">
                      Idade e perda de peso da sua base em tratamento.
                    </p>
                  </>
                )}
                {medicoTab === 'calendario' && (
                  <>
                    <p className="text-xs text-gray-500 mb-2">Prévia do calendário (dados simulados)</p>
                    <MedicoCalendarioPreviewContent />
                    <p className="text-[10px] text-gray-400 mt-3 text-center">
                      Na sua área você vê todas as aplicações dos pacientes por dia.
                    </p>
                  </>
                )}
                {medicoTab === 'pacientes' && (
                  <>
                    <p className="text-xs text-gray-500 mb-2">Prévia (dados simulados)</p>
                    <MedicoPacientesPreviewContent />
                    <p className="text-[10px] text-gray-400 mt-3 text-center">
                      Acesse o prontuário de cada paciente.
                    </p>
                  </>
                )}
                {medicoTab === 'mapa' && (
                  <>
                    <MedicoMapaPreviewContent />
                  </>
                )}
              </div>
            </div>
          ) : isNutricionista ? (
            /* Nutricionista: abas Pacientes (Atual) e Mapa */
            <div className="flex flex-col h-full">
              <div className="flex-shrink-0 flex border-b border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setNutricionistaTab('pacientes')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-w-0 ${
                    nutricionistaTab === 'pacientes'
                      ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Users size={14} className="flex-shrink-0" />
                  <span className="truncate">Pacientes (Atual)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNutricionistaTab('mapa')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-w-0 ${
                    nutricionistaTab === 'mapa'
                      ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <List size={14} className="flex-shrink-0" />
                  <span className="truncate">Mapa</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {nutricionistaTab === 'pacientes' && (
                  <>
                    <p className="text-xs text-gray-500 mb-2">Prévia (dados simulados)</p>
                    <NutricionistaPreviewContent />
                    <p className="text-[10px] text-gray-400 mt-3 text-center">
                      Na sua área você edita o cardápio e acompanha cada paciente.
                    </p>
                  </>
                )}
                {nutricionistaTab === 'mapa' && (
                  <>
                    <NutricionistaMapaPreviewContent />
                  </>
                )}
              </div>
            </div>
          ) : isPersonal ? (
            /* Personal: abas Pacientes (Atual) e Mapa */
            <div className="flex flex-col h-full">
              <div className="flex-shrink-0 flex border-b border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setPersonalTab('pacientes')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-w-0 ${
                    personalTab === 'pacientes'
                      ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Users size={14} className="flex-shrink-0" />
                  <span className="truncate">Pacientes (Atual)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPersonalTab('mapa')}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors min-w-0 ${
                    personalTab === 'mapa'
                      ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <List size={14} className="flex-shrink-0" />
                  <span className="truncate">Mapa</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {personalTab === 'pacientes' && (
                  <>
                    <p className="text-xs text-gray-500 mb-2">Prévia (dados simulados)</p>
                    <PersonalPreviewContent />
                    <p className="text-[10px] text-gray-400 mt-3 text-center">
                      Treinos prescritos pelo seu personal, quando e onde quiser.
                    </p>
                  </>
                )}
                {personalTab === 'mapa' && (
                  <>
                    <PersonalMapaPreviewContent />
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Rodapé com ações */}
        <div className="flex-shrink-0 flex flex-col gap-2 p-4 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Fechar prévia
          </button>
          <button
            type="button"
            onClick={onAcessar}
            className={`w-full py-2.5 rounded-xl ${iconBg} text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity`}
          >
            <span>{acessarLabel}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
