# SISTEMA DE NOTIFICAÇÕES - SETUP COMPLETO

## Visão Geral

Sistema completo de notificações via **E-mail** e **WhatsApp** para residentes do CENOFT, integrado ao Firebase e com interface administrativa.

## ✅ O que foi implementado

### 1. **Campo Telefone no Cadastro**
- ✅ Adicionado campo `telefone` na interface `Residente`
- ✅ Atualizado formulário de edição de residentes
- ✅ Atualizado `userService.ts` para salvar telefone
- ✅ Formato esperado: `+5511999999999`

### 2. **Serviço de Notificações**
- ✅ `NotificationService` completo com templates pré-definidos
- ✅ Templates para: Nova Escala, Troca Aprovada, Lembrete, Mensagem Personalizada
- ✅ Suporte a variáveis dinâmicas como `{nome}`, `{data}`, etc.
- ✅ Logs completos de todas as notificações enviadas

### 3. **APIs de Envio**
- ✅ `/api/send-email` - Envio de e-mails
- ✅ `/api/send-whatsapp` - Envio de WhatsApp
- ✅ Suporte a múltiplos provedores (SendGrid, Nodemailer, Twilio, Meta API)

### 4. **Interface Administrativa**
- ✅ Painel completo no `/admin` com aba "Notificações"
- ✅ Seleção de residentes (individual ou todos)
- ✅ Escolha de templates ou mensagem personalizada
- ✅ Histórico completo de notificações enviadas
- ✅ Indicadores visuais de status (enviado, falhou, pendente)

### 5. **🆕 NOTIFICAÇÕES AUTOMÁTICAS DIÁRIAS**
- ✅ Sistema de lembretes automáticos configurado
- ✅ **19:00** - Lembrete para escalas do dia seguinte
- ✅ **06:00** - Lembrete para escalas do dia atual
- ✅ Vercel Cron Jobs configurado (`vercel.json`)
- ✅ API `/api/cron/daily-notifications` para processamento
- ✅ Interface de teste e monitoramento no admin
- ✅ Mensagens personalizadas com todos os serviços do residente

## 🔧 Configuração Necessária

### 1. **Variáveis de Ambiente**

Crie um arquivo `.env.local` na raiz do projeto:

```env
# E-mail Configuration (SendGrid - Recomendado para produção)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# E-mail Configuration (Nodemailer - Para desenvolvimento)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password

# WhatsApp Configuration (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886

# WhatsApp Configuration (Meta Business API)
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
```

### 2. **Dependências NPM**

```bash
# Para SendGrid
npm install @sendgrid/mail

# Para Nodemailer (desenvolvimento)
npm install nodemailer
npm install @types/nodemailer --save-dev

# Para Twilio
npm install twilio
```

### 3. **Configuração dos Provedores**

#### **SendGrid (Recomendado para Produção)**

1. Crie conta em https://sendgrid.com
2. Gere uma API Key em Settings > API Keys
3. Verifique seu domínio em Settings > Sender Authentication
4. Configure o e-mail remetente

#### **Gmail com Nodemailer (Desenvolvimento)**

1. Ative a verificação em 2 etapas na sua conta Google
2. Gere uma "Senha de App" em https://myaccount.google.com/apppasswords
3. Use essa senha no `EMAIL_PASS`

#### **Twilio WhatsApp**

1. Crie conta em https://twilio.com
2. Configure WhatsApp Sandbox em Console > Develop > Messaging > Try it out > Send a WhatsApp message
3. Para produção, solicite aprovação do template WhatsApp

#### **Meta WhatsApp Business API**

1. Configure WhatsApp Business Account
2. Obtenha Access Token e Phone Number ID
3. Configure webhooks se necessário

## 📱 Como Usar

### 1. **Cadastrar Telefones dos Residentes**

1. Vá em `/admin` → "Residentes"
2. Edite cada residente e adicione o telefone no formato `+5511999999999`
3. O sistema validará automaticamente o formato

### 2. **Configurar Notificações Automáticas**

1. Vá em `/admin` → "Notificações" → aba "Automáticas"
2. Use os botões de teste para verificar o funcionamento:
   - **Testar Hoje**: Simula lembretes das 06:00
   - **Testar Amanhã**: Simula lembretes das 19:00
   - **Executar Manual**: Processa baseado no horário atual
3. O sistema enviará automaticamente todos os dias

### 3. **Enviar Notificações Manuais**

1. Vá em `/admin` → "Notificações" → aba "Enviar"
2. Escolha um template ou crie mensagem personalizada
3. Selecione os residentes (individual ou todos)
4. Escolha o tipo: E-mail, WhatsApp ou Ambos
5. Preencha as variáveis necessárias
6. Clique em "Enviar"

### 4. **Acompanhar Histórico**

1. Na aba "Histórico" você verá:
   - Status de cada envio (Enviado, Falhou, Pendente)
   - Detalhes completos da mensagem
   - Logs de erro quando aplicável
   - Notificações automáticas e manuais

## 🎯 Templates Disponíveis

### **1. Nova Escala Criada**
- **Variáveis:** `{nome}`, `{dataInicio}`
- **Uso:** Notificar sobre nova escala semanal

### **2. Troca Aprovada**
- **Variáveis:** `{nome}`, `{servico}`, `{local}`, `{data}`, `{turno}`
- **Uso:** Confirmar aprovação de troca

### **3. Lembrete de Escala**
- **Variáveis:** `{nome}`, `{servico}`, `{local}`, `{data}`, `{turno}`
- **Uso:** Lembrar escala do dia seguinte

### **4. Mensagem Personalizada**
- **Variáveis:** `{subject}`, `{message}`, `{nome}`
- **Uso:** Mensagens livres do administrador

## 🔍 Logs e Monitoramento

O sistema salva logs completos no Firestore:

```typescript
interface NotificationLog {
  residenteId: string;
  residenteNome: string;
  residenteEmail: string;
  residenteTelefone?: string;
  type: 'email' | 'whatsapp' | 'both';
  template: string;
  subject?: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  sentAt?: Date;
  createdAt: Date;
  createdBy: string;
}
```

## 🚨 Modo de Desenvolvimento

Por padrão, o sistema está configurado para **SIMULAÇÃO** em desenvolvimento:

- E-mails: Usa Nodemailer com Gmail
- WhatsApp: Apenas simula o envio (console.log)
- Logs: Salvos normalmente no Firestore

Para ativar envios reais, descomente as seções apropriadas nos arquivos:
- `app/api/send-email/route.ts`
- `app/api/send-whatsapp/route.ts`

## 🔒 Segurança

- ✅ Validação de formato de e-mail e telefone
- ✅ Autenticação obrigatória para envio
- ✅ Logs de auditoria completos
- ✅ Rate limiting recomendado (implementar se necessário)

## 🚀 Próximos Passos

### **Para Produção:**

1. **Configurar SendGrid** com domínio próprio
2. **Aprovar templates WhatsApp** no Twilio/Meta
3. **Implementar rate limiting** se necessário
4. **Configurar monitoramento** de falhas
5. **Backup dos logs** de notificações

### **Melhorias Futuras:**

- [ ] Agendamento de notificações
- [ ] Templates visuais para e-mail (HTML)
- [ ] Notificações push no app
- [ ] Integração com calendário
- [ ] Relatórios de entrega

## 📞 Suporte

Para dúvidas sobre configuração:
- Consulte a documentação dos provedores
- Teste sempre em ambiente de desenvolvimento primeiro
- Use os logs do sistema para debug

---

**Sistema implementado e pronto para configuração! 🎉**
