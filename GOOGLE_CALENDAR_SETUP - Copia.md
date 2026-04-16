# Configuração do Google Calendar

Para que a integração com Google Calendar funcione, você precisa configurar as seguintes variáveis de ambiente no Vercel:

## Variáveis Necessárias

1. **GOOGLE_CLIENT_ID** - ID do cliente OAuth 2.0 do Google
2. **GOOGLE_CLIENT_SECRET** - Secret do cliente OAuth 2.0 do Google

## Como Obter as Credenciais

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API do Google Calendar:
   - Vá em "APIs & Services" > "Library"
   - Procure por "Google Calendar API"
   - Clique em "Enable"
4. Configure a tela de consentimento OAuth:
   - Vá em "APIs & Services" > "OAuth consent screen"
   - Preencha as informações necessárias
   - Adicione os escopos: `https://www.googleapis.com/auth/calendar` e `https://www.googleapis.com/auth/calendar.events`
5. Crie as credenciais OAuth:
   - Vá em "APIs & Services" > "Credentials"
   - Clique em "Create Credentials" > "OAuth client ID"
   - Tipo: "Web application"
   - **Authorized redirect URIs**: Adicione:
     - `https://www.oftware.com.br/api/google-calendar/callback`
     - `https://oftware.vercel.app/api/google-calendar/callback` (para preview deployments)
   - Copie o **Client ID** e o **Client Secret**

## Como Configurar no Vercel

1. Acesse o painel do Vercel: https://vercel.com
2. Selecione o projeto "oftware"
3. Vá em **Settings** > **Environment Variables**
4. Adicione as seguintes variáveis:
   - **Name**: `GOOGLE_CLIENT_ID`
     **Value**: (cole o Client ID copiado do Google Cloud Console)
   - **Name**: `GOOGLE_CLIENT_SECRET`
     **Value**: (cole o Client Secret copiado do Google Cloud Console)
5. Certifique-se de que as variáveis estão marcadas para **Production**, **Preview** e **Development**
6. Clique em **Save**
7. **IMPORTANTE**: Após adicionar as variáveis, você precisa fazer um novo deploy para que elas sejam aplicadas

## Verificação

Após configurar as variáveis e fazer o deploy:
1. Teste o botão "Autorizar Google Calendar" na página `/meta` (Plano) ou `/metaadmin` (Calendário)
2. O erro "GOOGLE_CLIENT_ID não configurado" não deve mais aparecer
3. Você será redirecionado para a página de autorização do Google

