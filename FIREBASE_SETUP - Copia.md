# Configuração do Firebase para Vercel

## Variáveis de Ambiente Necessárias

Configure as seguintes variáveis de ambiente no painel do Vercel:

### Firebase Configuration
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBc9RkAa6htGilUDO-z4XG6bpiZAWLuRhg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=oftware-9201e.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=oftware-9201e
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=oftware-9201e.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=308133539217
NEXT_PUBLIC_FIREBASE_APP_ID=1:308133539217:web:a3e929f2202e20ba1b3e30
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-2V9CYR8TDS
```

## Como Configurar no Vercel

1. Acesse o painel do Vercel
2. Vá em **Settings** > **Environment Variables**
3. Adicione cada variável acima
4. Marque como **Production** e **Preview**
5. Clique em **Save**
6. Faça um novo deploy

## Regras do Firestore

Certifique-se de que as regras do Firestore permitem leitura/escrita:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /doctors/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Problemas Comuns

- **Erro 400**: Verifique se as variáveis de ambiente estão configuradas
- **Erro de autenticação**: Verifique as regras do Firestore
- **Loop infinito**: Verifique se o projeto Firebase está ativo 