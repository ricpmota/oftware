# Como Configurar Firebase Admin SDK no Vercel

## Onde Verificar as Variáveis no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** (Configurações)
4. Clique em **Environment Variables** (Variáveis de Ambiente)
5. Verifique se existem as variáveis:
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

## Como Obter as Credenciais do Firebase Admin SDK

### Passo 1: Acessar Firebase Console
1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **oftware-9201e**

### Passo 2: Gerar Service Account
1. Clique no ícone de **engrenagem** (⚙️) ao lado de "Project Overview"
2. Selecione **Project Settings**
3. Vá para a aba **Service Accounts**
4. Clique em **Generate New Private Key**
5. Uma janela de confirmação aparecerá - clique em **Generate Key**
6. Um arquivo JSON será baixado (ex: `oftware-9201e-firebase-adminsdk-xxxxx.json`)

### Passo 3: Extrair as Credenciais do JSON
Abra o arquivo JSON baixado. Você verá algo assim:

```json
{
  "type": "service_account",
  "project_id": "oftware-9201e",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@oftware-9201e.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

### Passo 4: Configurar no Vercel

1. No Vercel, vá em **Settings** > **Environment Variables**
2. Adicione as seguintes variáveis:

#### Variável 1: `FIREBASE_CLIENT_EMAIL`
- **Value**: Copie o valor de `client_email` do JSON
- Exemplo: `firebase-adminsdk-xxxxx@oftware-9201e.iam.gserviceaccount.com`
- **Environment**: Marque **Production**, **Preview** e **Development**

#### Variável 2: `FIREBASE_PRIVATE_KEY`
- **Value**: Copie o valor de `private_key` do JSON **COMPLETO** (incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`)
- **IMPORTANTE**: 
  - Copie a chave inteira, incluindo as quebras de linha `\n`
  - Ou copie exatamente como está no JSON (com `\n` literais)
- **Environment**: Marque **Production**, **Preview** e **Development**

### Passo 5: Fazer Novo Deploy
Após adicionar as variáveis, faça um novo deploy:
```bash
vercel --prod --yes
```

## Verificação

Após configurar, os logs devem mostrar:
```
✅ FIREBASE_CLIENT_EMAIL: ✅ Configurada
✅ FIREBASE_PRIVATE_KEY: ✅ Configurada
✅ Firebase Admin SDK inicializado com sucesso
```

## Diferença entre as Variáveis

- **`NEXT_PUBLIC_FIREBASE_*`**: Usadas pelo Firebase Client SDK (já configuradas)
  - Funcionam no navegador e no servidor
  - Usadas para acessar Firestore, Auth, etc. do lado do cliente

- **`FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`**: Usadas pelo Firebase Admin SDK
  - Funcionam APENAS no servidor (API routes)
  - Necessárias para listar usuários do Authentication
  - São credenciais de service account (mais poderosas)

## Troubleshooting

### Erro: "Missing or insufficient permissions"
- Verifique se o service account tem permissões no Firebase
- No Firebase Console > IAM & Admin, verifique se o service account tem role de "Firebase Admin" ou "Editor"

### Erro: "Invalid private key"
- Certifique-se de copiar a chave COMPLETA, incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`
- Se a chave tiver `\n` literais, mantenha-os assim (não converta para quebras de linha reais)

### Variáveis não aparecem nos logs
- Verifique se marcou o ambiente correto (Production, Preview, Development)
- Faça um novo deploy após adicionar as variáveis
- Variáveis só ficam disponíveis após o deploy


