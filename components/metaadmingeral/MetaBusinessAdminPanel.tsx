'use client';

import { useState, type ReactNode } from 'react';
import {
  Activity,
  Bot,
  CheckCircle,
  Clock,
  ExternalLink,
  Info,
  Link,
  MessageSquare,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';

const integrationOverview = {
  appName: 'Oftware',
  appStatus: 'Publicado',
  webhookStatus: 'Ativo',
  instagramConnected: true,
  username: 'ometodoemagrecer.com.br',
  instagramAccountId: '17841469501317994',
  profilePictureUrl: '/icones/metodo-simbolo-17.png',
};

const receivedMessages = [
  {
    senderId: '979050754488483',
    lastMessage: 'Olá!',
    dateTime: '12/05/2026 15:18',
    status: 'Recebida',
  },
  {
    senderId: '882340190112345',
    lastMessage: 'Quero saber mais sobre o acompanhamento.',
    dateTime: '12/05/2026 14:42',
    status: 'Respondida',
  },
  {
    senderId: '731004550987611',
    lastMessage: 'Tem atendimento pelo Instagram?',
    dateTime: '12/05/2026 13:57',
    status: 'Pendente',
  },
] as const;

const webhookLogs = [
  {
    event: 'Instagram message received',
    senderId: '979050754488483',
    recipientId: '17841469501317994',
    messageText: 'Olá!',
    timestamp: '1710000000',
  },
  {
    event: 'Instagram message received',
    senderId: '882340190112345',
    recipientId: '17841469501317994',
    messageText: 'Quero saber mais sobre o acompanhamento.',
    timestamp: '1710000362',
  },
] as const;

const autoReplyText = 'Olá! Recebi sua mensagem. Em instantes vou te ajudar 😊';

type BadgeTone = 'success' | 'warning' | 'neutral' | 'info';

function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: string;
  tone?: BadgeTone;
}) {
  const toneClassName =
    tone === 'success'
      ? 'border-[#4CCB7A]/30 bg-[#4CCB7A]/15 text-[#7DFFAB]'
      : tone === 'warning'
        ? 'border-amber-400/30 bg-amber-400/15 text-amber-200'
        : tone === 'info'
          ? 'border-sky-400/30 bg-sky-400/15 text-sky-200'
          : 'border-white/15 bg-white/10 text-[#E8EDED]/85';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClassName}`}
    >
      {children}
    </span>
  );
}

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="rounded-xl border border-[#4CCB7A]/20 bg-[#4CCB7A]/10 p-2 text-[#4CCB7A]">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#E8EDED]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[#E8EDED]/65">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function MetaBusinessAdminPanel() {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#4CCB7A]">
              Meta Business
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#E8EDED]">Meta Business</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#E8EDED]/72 lg:text-base">
              Gerencie a integração do Oftware com Instagram, Messenger e automações de
              atendimento.
            </p>
          </div>

          <div className="max-w-xl rounded-2xl border border-[#4CCB7A]/20 bg-[#4CCB7A]/10 p-4 text-sm text-[#E8EDED]/90">
            Esta tela demonstra como o Oftware identifica a conta profissional do Instagram
            conectada e associa as mensagens recebidas ao painel administrativo.
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Status da integração"
          description="Resumo visual do vínculo com a conta profissional usada na revisão da Meta."
          icon={<ShieldCheck className="h-5 w-5" />}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#081733] px-4 py-4">
              <img
                src={integrationOverview.profilePictureUrl}
                alt="Perfil do Instagram conectado"
                className="h-16 w-16 rounded-full border border-white/10 bg-white/10 object-cover"
              />
              <div>
                <div className="text-sm text-[#E8EDED]/60">Conta Instagram conectada</div>
                <div className="text-lg font-semibold text-[#E8EDED]">
                  @{integrationOverview.username}
                </div>
                <div className="mt-2">
                  <StatusBadge tone="success">
                    {integrationOverview.instagramConnected ? 'Conectada' : 'Não conectada'}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <div className="text-xs uppercase tracking-wide text-[#E8EDED]/55">App Meta</div>
                <div className="mt-1 text-sm font-medium text-[#E8EDED]">
                  {integrationOverview.appName}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <div className="text-xs uppercase tracking-wide text-[#E8EDED]/55">
                  Status do app
                </div>
                <div className="mt-2">
                  <StatusBadge tone="success">{integrationOverview.appStatus}</StatusBadge>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <div className="text-xs uppercase tracking-wide text-[#E8EDED]/55">Webhook</div>
                <div className="mt-2">
                  <StatusBadge tone="success">{integrationOverview.webhookStatus}</StatusBadge>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <div className="text-xs uppercase tracking-wide text-[#E8EDED]/55">
                  Instagram conectado
                </div>
                <div className="mt-2">
                  <StatusBadge tone="success">
                    {integrationOverview.instagramConnected ? 'Sim' : 'Não'}
                  </StatusBadge>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-4 sm:col-span-2">
                <div className="text-xs uppercase tracking-wide text-[#E8EDED]/55">
                  Instagram Account ID
                </div>
                <div className="mt-1 overflow-x-auto">
                  <div className="w-max whitespace-nowrap font-mono text-sm font-medium text-[#E8EDED]">
                    {integrationOverview.instagramAccountId}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Conectar Instagram"
          description="Ponto de entrada visual para o fluxo oficial de autorização da Meta."
          icon={<Link className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-[#E8EDED]/75">
              Use este botão para iniciar o fluxo oficial de autorização da Meta e conectar uma
              conta profissional do Instagram ao Oftware.
            </p>

            <p className="text-sm leading-6 text-[#E8EDED]/75">
              Após a conexão, o Oftware identifica a conta conectada, exibe as informações
              básicas do perfil profissional e associa as mensagens recebidas ao painel
              administrativo correto.
            </p>

            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4CCB7A] px-4 py-3 text-sm font-semibold text-[#06203E] transition hover:bg-[#67d98e]"
            >
              <ExternalLink className="h-4 w-4" />
              Conectar conta Instagram
            </button>

            <div className="rounded-xl border border-dashed border-white/15 bg-black/10 p-4 text-sm text-[#E8EDED]/68">
              Nenhum token, App Secret ou variável de ambiente é exibido nesta tela.
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Mensagens recebidas"
          description="Exemplos de conversas que o Oftware associará ao canal correto dentro do painel."
          icon={<MessageSquare className="h-5 w-5" />}
        >
          <div className="space-y-3">
            {receivedMessages.map((message) => (
              <div
                key={`${message.senderId}-${message.dateTime}`}
                className="rounded-2xl border border-white/10 bg-black/10 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-[#E8EDED]/55">
                      senderId
                    </div>
                    <div className="font-mono text-sm text-[#E8EDED]">{message.senderId}</div>
                    <div className="text-sm text-[#E8EDED]/80">&quot;{message.lastMessage}&quot;</div>
                  </div>

                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <StatusBadge
                      tone={
                        message.status === 'Respondida'
                          ? 'success'
                          : message.status === 'Recebida'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {message.status}
                    </StatusBadge>
                    <div className="text-xs text-[#E8EDED]/55">{message.dateTime}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Logs do webhook"
          description="Eventos recebidos pelo webhook do Instagram Business."
          icon={<Activity className="h-5 w-5" />}
        >
          <div className="space-y-3">
            {webhookLogs.map((log) => (
              <div
                key={`${log.senderId}-${log.timestamp}`}
                className="rounded-2xl border border-white/10 bg-[#081733] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="info">{log.event}</StatusBadge>
                  <span className="text-xs text-[#E8EDED]/55">timestamp {log.timestamp}</span>
                </div>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[#E8EDED]/55">senderId</dt>
                    <dd className="mt-1 font-mono text-sm text-[#E8EDED]">{log.senderId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[#E8EDED]/55">
                      recipientId
                    </dt>
                    <dd className="mt-1 font-mono text-sm text-[#E8EDED]">{log.recipientId}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-[#E8EDED]/55">
                      messageText
                    </dt>
                    <dd className="mt-1 text-sm text-[#E8EDED]">{log.messageText}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Automação"
          description="Visão do estado atual da automação para atendimento por mensagens."
          icon={<Bot className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <div className="text-xs uppercase tracking-wide text-[#E8EDED]/55">
                  Resposta automática
                </div>
                <div className="mt-2">
                  <StatusBadge tone="success">Ativa</StatusBadge>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <div className="text-xs uppercase tracking-wide text-[#E8EDED]/55">Status</div>
                <div className="mt-2">
                  <StatusBadge tone="info">Ativo em ambiente de desenvolvimento</StatusBadge>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <div className="text-xs uppercase tracking-wide text-[#E8EDED]/55">
                  Provedor IA futuro
                </div>
                <div className="mt-1 text-sm font-medium text-[#E8EDED]">
                  Gemini AI (em integração)
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <div className="text-xs uppercase tracking-wide text-[#E8EDED]/55">
                  Mensagem padrão atual
                </div>
                <div className="mt-1 text-sm text-[#E8EDED]">{autoReplyText}</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Dados exibidos para revisão da Meta"
          description="Bloco resumido para demonstrar claramente qual conta profissional está associada ao Oftware."
          icon={<Info className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#081733] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <img
                  src={integrationOverview.profilePictureUrl}
                  alt="Ícone da conta profissional"
                  className="h-14 w-14 rounded-full border border-white/10 bg-white/10 object-cover"
                />
                <div>
                  <div className="text-xs uppercase tracking-wide text-[#E8EDED]/55">
                    Username da conta Instagram profissional
                  </div>
                  <div className="mt-1 text-lg font-semibold text-[#E8EDED]">
                    @{integrationOverview.username}
                  </div>
                </div>
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <dt className="text-xs uppercase tracking-wide text-[#E8EDED]/55">
                  ID da conta Instagram
                </dt>
                <dd className="mt-1 overflow-x-auto">
                  <span className="inline-block whitespace-nowrap font-mono text-sm text-[#E8EDED]">
                    {integrationOverview.instagramAccountId}
                  </span>
                </dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-4">
                <dt className="text-xs uppercase tracking-wide text-[#E8EDED]/55">
                  Status de conexão
                </dt>
                <dd className="mt-2">
                  <StatusBadge tone="success">Conectada</StatusBadge>
                </dd>
              </div>
            </dl>

            <div className="rounded-xl border border-[#4CCB7A]/20 bg-[#4CCB7A]/10 p-4 text-sm leading-6 text-[#E8EDED]/90">
              Finalidade: associar mensagens recebidas ao canal correto dentro do Oftware.
            </div>
          </div>
        </SectionCard>
      </div>

      {isConnectModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#041126]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0A1F44] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[#E8EDED]">Conectar conta Instagram</h3>
                <p className="mt-2 text-sm text-[#E8EDED]/70">
                  A conexão oficial será feita pelo fluxo de autorização da Meta. Nesta fase,
                  a conta profissional já está conectada manualmente no painel Meta Developers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConnectModalOpen(false)}
                className="rounded-xl border border-white/10 p-2 text-[#E8EDED]/70 transition hover:bg-white/10 hover:text-[#E8EDED]"
                aria-label="Fechar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[#E8EDED]/80">
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-4 w-4 text-[#4CCB7A]" />
                <span>A conta profissional usada na revisão já está associada manualmente.</span>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-4 w-4 text-amber-300" />
                <span>O fluxo completo de autorização será disponibilizado em etapa posterior.</span>
              </div>
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-sky-300" />
                <span>
                  O painel administrativo exibirá a conta conectada e os eventos recebidos sem
                  expor segredos técnicos.
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsConnectModalOpen(false)}
                className="rounded-xl bg-[#4CCB7A] px-4 py-2.5 text-sm font-semibold text-[#06203E] transition hover:bg-[#67d98e]"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
