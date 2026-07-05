import type { EventoTimelineMock } from '@/app/metaadmin/components/paciente-modal/prontuario/prontuarioTypes';

/** Exemplo estático para a landing — espelha eventos reais do prontuário metaadmin. */
export const PRONTUARIO_DEMO_EVENTOS: EventoTimelineMock[] = [
  {
    id: 'demo-exame-lab',
    tipo: 'exame_resultado',
    titulo: 'Resultado laboratorial',
    descricao: 'Marcadores: Glicemia de jejum, HbA1c, Perfil lipídico, TSH, Creatinina.',
    data: '28/05/2026',
    hora: '08:40',
    origem: 'sistema',
    dados: { exame: 'Laboratorial', status: 'Resultado recebido' },
  },
  {
    id: 'demo-nutricao',
    tipo: 'nutricao',
    titulo: 'Consulta nutricional',
    descricao:
      'Evolução: Paciente mantém rotina alimentar estruturada com boa adesão às refeições principais.\nConduta: Ajuste de distribuição proteica e registro diário no app.\nAdesão: Alta — check-ins completos na semana.',
    data: '22/05/2026',
    hora: '15:30',
    origem: 'nutri',
    destaque: 'Consulta nutricional',
    dados: { status: 'Registro do nutricionista', meta: 'Manter registro alimentar diário' },
  },
  {
    id: 'demo-aplicacao',
    tipo: 'aplicacao',
    titulo: 'Aplicação registrada',
    descricao: 'Semana 8 — dose conforme protocolo · Aplicação confirmada pelo paciente.',
    data: '18/05/2026',
    hora: '20:15',
    origem: 'paciente',
    dados: {
      medicamento: 'Protocolo injetável',
      dose: '5 mg',
      status: 'Aplicação confirmada',
    },
  },
  {
    id: 'demo-consulta',
    tipo: 'consulta',
    titulo: 'Consulta médica',
    descricao:
      'Evolução: Paciente em acompanhamento contínuo, evolução clínica estável e adesão ao plano terapêutico.\nSintomas/efeitos adversos: Náusea leve ocasional, sem sinais de alarme.\nConduta/plano: Manter protocolo atual e reforçar hidratação.\nMeta: Consolidar hábitos alimentares até a próxima consulta.',
    data: '12/05/2026',
    hora: '10:00',
    origem: 'medico',
    destaque: 'Ajuste terapêutico registrado',
    dados: {
      pressao: '122/78 mmHg',
      proximaDose: '18/05/2026',
      meta: 'Manter adesão multidisciplinar',
    },
  },
];
