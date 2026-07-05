'use client';

import { BookOpen, Info, Clock, Zap, AlertTriangle } from 'lucide-react';

type DocRow = { route: string; schedule?: string; quando: string; docs: string; notas: string };
type EventRow = { caso: string; rota: string; gatilho: string; doc: string };

function TableShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description ? <p className="text-xs text-gray-600 mt-1">{description}</p> : null}
      </div>
      <div className="overflow-x-auto max-h-[min(70vh,520px)] overflow-y-auto">{children}</div>
    </div>
  );
}

const CRONS: DocRow[] = [
  {
    route: 'GET /api/cron/send-automatic-emails',
    schedule: '*/5 * * * * (UTC)',
    quando: 'Leads médico email1…email5',
    docs: 'leads_email1 … leads_email5',
    notas: 'config: envioAutomatico.ativo. Usuário sem médico aceito / sem paciente com médico; tempos 1h, 24h, 72h, 7d, 14d.',
  },
  {
    route: 'GET /api/cron/send-automatic-emails-leads-nutri-personal',
    schedule: 'não está no vercel.json — agende se quiser',
    quando: 'Leads Nutri e Personal email1…email5',
    docs: 'leads_nutri_*, leads_personal_*',
    notas: 'config: envioAutomaticoLeadsNutri / envioAutomaticoLeadsPersonal ativos.',
  },
  {
    route: 'GET /api/cron/send-email-aplicacao',
    schedule: '0 8 * * * e 0 12,16 * * * (UTC)',
    quando: 'Aplicação 1 dia antes + no dia',
    docs: 'aplicacao_aplicacao_antes, aplicacao_aplicacao_dia',
    notas: 'Pacientes com plano; dedup em email_envios.',
  },
  {
    route: 'GET /api/cron/send-email-conclusao-lembrete',
    schedule: '15 8 * * * (UTC)',
    quando: 'Lembrete no dia previsto de conclusão',
    docs: 'conclusao_tratamento_lembrete_conclusao',
    notas: 'Sem peso final; sem duplicata no dia.',
  },
  {
    route: 'GET /api/cron/send-email-agenda-diario',
    schedule: '0 7 * * * (UTC)',
    quando: 'Agenda diária médicos',
    docs: 'agenda_agenda_diario',
    notas: 'Aplicações/pagamentos no dia.',
  },
  {
    route: 'GET /api/cron/send-email-agenda-semanal',
    schedule: '0 13 * * 0 domingo (UTC)',
    quando: 'Agenda semanal médicos',
    docs: 'agenda_agenda_semanal',
    notas: 'Semana calculada no código.',
  },
  {
    route: 'GET /api/cron/send-email-aniversariante',
    schedule: 'não está no vercel.json — agende se quiser',
    quando: 'Parabéns aniversariante',
    docs: 'aniversariante_parabenizar',
    notas: 'Dia/mês hoje (Brasil); paciente com médico e e-mail.',
  },
];

const EVENTOS: EventRow[] = [
  { caso: 'Boas-vindas médico (aceite)', rota: 'POST /api/send-email-solicitado-medico', gatilho: 'metaadmin', doc: 'solicitado_medico_boas_vindas' },
  { caso: 'Boas-vindas nutri', rota: 'POST /api/send-email-solicitado-nutri', gatilho: 'metanutri', doc: 'solicitado_nutri_boas_vindas' },
  { caso: 'Boas-vindas personal', rota: 'POST /api/send-email-solicitado-personal', gatilho: 'metapersonal', doc: 'solicitado_personal_boas_vindas' },
  { caso: 'Nutri pediu vínculo', rota: 'POST /api/send-email-nutri-pediu-vinculo', gatilho: 'metanutri', doc: 'nutri_pediu_vinculo_aviso_medico' },
  { caso: 'Personal pediu vínculo', rota: 'POST /api/send-email-personal-pediu-vinculo', gatilho: 'metapersonal', doc: 'personal_pediu_vinculo_aviso_medico' },
  { caso: 'Plano editado (Tirzepatida)', rota: 'POST /api/send-email-plano-editado', gatilho: 'metaadmin', doc: 'em_tratamento_plano_editado' },
  { caso: 'Novo médico solicitando cadastro', rota: 'POST /api/send-email-novo-lead-medico-gestor', gatilho: 'metaadmin (primeiro salvar perfil)', doc: 'novo_lead_medico_novo_lead' },
  { caso: 'Novo lead para médico', rota: 'POST /api/send-email-novo-lead-medico', gatilho: 'solicitacaoMedicoService', doc: 'novo_lead_para_medico_novo_lead' },
  { caso: 'Recomendações lidas (médico)', rota: 'POST /api/send-email-check-recomendacoes', gatilho: 'meta (paciente)', doc: 'check_recomendacoes_recomendacoes_lidas' },
  { caso: 'Conclusão parabéns + relatório', rota: 'POST /api/send-email-conclusao-tratamento', gatilho: 'metaadmin', doc: 'conclusao_tratamento_conclusao_tratamento' },
  { caso: 'Lead avulso', rota: 'POST /api/send-email-lead-avulso', gatilho: 'metaadmingeral / AuthContext', doc: 'lead_avulso_novo_lead' },
  { caso: 'Bem-vindo', rota: 'POST /api/send-email-bem-vindo', gatilho: 'AuthContext / metaadmin', doc: 'bem_vindo_*' },
  { caso: 'Aplicação manual', rota: 'POST /api/send-email-aplicacao', gatilho: 'emailAplicacaoService', doc: 'aplicacao_*' },
  { caso: 'Novidades', rota: 'POST /api/send-email-novidades', gatilho: 'EmailManagement', doc: 'novidades_novidade' },
  { caso: 'Teste lead', rota: 'POST /api/send-email-lead', gatilho: 'painel', doc: 'leads_*' },
  { caso: 'Mentoria', rota: 'POST /api/lead', gatilho: 'landing', doc: 'mentoria_lead' },
  { caso: 'Notificação genérica', rota: 'POST /api/send-email', gatilho: 'notificationService', doc: '(variável)' },
];

const ROTAS_SEM_GATILHO_UI: { rota: string; doc: string }[] = [
  { rota: 'POST /api/send-email-plano-editado-nutri', doc: 'em_tratamento_nutri_plano_editado' },
  { rota: 'POST /api/send-email-plano-editado-personal', doc: 'em_tratamento_personal_plano_editado' },
  { rota: 'POST /api/send-email-novo-lead-nutri', doc: 'novo_lead_nutri_novo_lead' },
  { rota: 'POST /api/send-email-novo-lead-personal', doc: 'novo_lead_personal_novo_lead' },
  { rota: 'POST /api/send-email-recomendacoes-lidas-nutri', doc: 'check_recomendacoes_nutri_recomendacoes_lidas' },
  { rota: 'POST /api/send-email-presenca-confirmada-personal', doc: 'check_presenca_personal_presenca_confirmada' },
  { rota: 'POST /api/send-email-bem-vindo-nutri', doc: 'bem_vindo_nutri_bem_vindo_nutricionista' },
  { rota: 'POST /api/send-email-bem-vindo-personal', doc: 'bem_vindo_personal_bem_vindo_personal' },
];

export default function EmailDocumentationPanel() {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200 text-sm text-gray-800">
        <BookOpen className="text-green-600 shrink-0 mt-0.5" size={22} />
        <div>
          <p className="font-medium text-green-900">Documentação de envios</p>
          <p className="text-xs text-green-900/80 mt-1 leading-relaxed">
            Envios transacionais usam ZeptoMail. Crons respeitam <code className="bg-green-100/80 px-1 rounded text-[11px]">CRON_ZEPTO_MAX_SENDS_PER_RUN</code> e{' '}
            <code className="bg-green-100/80 px-1 rounded text-[11px]">CRON_EMAIL_DELAY_MS</code>. Horários do Vercel Cron são em{' '}
            <strong>UTC</strong> (Brasília = UTC−3).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100">
          <Clock size={14} /> Crons = agendado
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100">
          <Zap size={14} /> POST = evento no app
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
          <AlertTriangle size={14} /> Sem gatilho = só API pronta
        </span>
      </div>

      <TableShell
        title="1. Crons (GET)"
        description="Configurados em vercel.json, exceto onde indicado. Ajuste o arquivo no repositório e faça deploy."
      >
        <table className="min-w-[720px] w-full text-xs">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr className="text-left text-gray-700">
              <th className="p-2.5 font-semibold border-b">Rota</th>
              <th className="p-2.5 font-semibold border-b w-[140px]">Agenda (UTC)</th>
              <th className="p-2.5 font-semibold border-b">O que envia</th>
              <th className="p-2.5 font-semibold border-b">Docs Firestore</th>
              <th className="p-2.5 font-semibold border-b">Notas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {CRONS.map((r) => (
              <tr key={r.route} className="hover:bg-gray-50/80 align-top">
                <td className="p-2.5 font-mono text-[11px] text-gray-900 whitespace-nowrap">{r.route}</td>
                <td className="p-2.5 text-gray-700">{r.schedule}</td>
                <td className="p-2.5 text-gray-800">{r.quando}</td>
                <td className="p-2.5 font-mono text-[11px] text-gray-700">{r.docs}</td>
                <td className="p-2.5 text-gray-600">{r.notas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <TableShell
        title="2. Envio por evento (POST)"
        description="Disparado quando a ação ocorre na interface ou serviço indicado."
      >
        <table className="min-w-[800px] w-full text-xs">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr className="text-left text-gray-700">
              <th className="p-2.5 font-semibold border-b">Caso</th>
              <th className="p-2.5 font-semibold border-b">Rota</th>
              <th className="p-2.5 font-semibold border-b">Onde dispara</th>
              <th className="p-2.5 font-semibold border-b">Doc típico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {EVENTOS.map((e) => (
              <tr key={e.rota + e.caso} className="hover:bg-gray-50/80 align-top">
                <td className="p-2.5 text-gray-900 font-medium">{e.caso}</td>
                <td className="p-2.5 font-mono text-[11px] text-gray-800 whitespace-nowrap">{e.rota}</td>
                <td className="p-2.5 text-gray-600">{e.gatilho}</td>
                <td className="p-2.5 font-mono text-[11px] text-gray-700">{e.doc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <TableShell
        title="3. APIs prontas sem fetch no app (mar/2026)"
        description="Existem rotas POST e templates no Firestore; falta ligar no fluxo ou cron."
      >
        <table className="min-w-[560px] w-full text-xs">
          <thead className="sticky top-0 bg-amber-50 z-10">
            <tr className="text-left text-amber-950">
              <th className="p-2.5 font-semibold border-b border-amber-200">Rota</th>
              <th className="p-2.5 font-semibold border-b border-amber-200">Documento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {ROTAS_SEM_GATILHO_UI.map((x) => (
              <tr key={x.rota} className="hover:bg-amber-50/50 align-top">
                <td className="p-2.5 font-mono text-[11px]">{x.rota}</td>
                <td className="p-2.5 font-mono text-[11px]">{x.doc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">4. Templates sem automação no código</h3>
        <p className="text-xs text-gray-600 mb-3">
          Editáveis no Metaadmin geral, mas sem cron/rota dedicada hoje: consulta nutri (antes/dia), treino personal (antes/dia), agenda nutri/personal,
          lead avulso nutri/personal (o fluxo geral usa <code className="bg-gray-100 px-1 rounded">lead_avulso_novo_lead</code>).
        </p>
        <p className="text-xs text-gray-500 flex items-start gap-2">
          <Info size={16} className="shrink-0 text-gray-400 mt-0.5" />
          Fonte de verdade no código: <code className="bg-gray-100 px-1 rounded">docs/ENVIO_AUTOMATICO_EMAILS_QUANDO_E_ROTAS.md</code> e{' '}
          <code className="bg-gray-100 px-1 rounded">data/emailConfigNovosModulos.ts</code>. Atualize o .md ao mudar crons ou integrações.
        </p>
      </div>

      <p className="text-[11px] text-gray-500 text-center pb-2">
        Outros crons: <code className="bg-gray-100 px-1 rounded">daily-notifications</code> (notificações internas) e{' '}
        <code className="bg-gray-100 px-1 rounded">atualizar-conversao</code> (métricas) não usam estes templates de e-mail.
      </p>
    </div>
  );
}
