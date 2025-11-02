# Atualização das Regras do Firestore

## Problema
O sistema de férias está retornando erro de permissões: "Missing or insufficient permissions"

## Solução
Atualizar as regras do Firestore no console do Firebase para permitir acesso total temporariamente.

## Passos para Atualizar

### 1. Acesse o Console do Firebase
1. Vá para [https://console.firebase.google.com](https://console.firebase.google.com)
2. Selecione o projeto `oftware-9201e`
3. No menu lateral, clique em **Firestore Database**
4. Clique na aba **Rules**

### 2. Substitua as Regras Atuais
Substitua todo o conteúdo atual pelas seguintes regras temporárias:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Regras temporárias para debug - permitir acesso total para usuários autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Publique as Regras
1. Clique em **Publish** para salvar as novas regras
2. Aguarde alguns segundos para as regras serem aplicadas

### 4. Teste o Sistema
1. Volte para o site [https://oftware-site-final.vercel.app/cenoft](https://oftware-site-final.vercel.app/cenoft)
2. Faça login com uma conta de residente
3. Vá para a aba "Férias"
4. Tente solicitar uma férias

### 5. Após o Teste (Opcional)
Se o sistema funcionar, você pode restaurar as regras mais restritivas:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para usuários autenticados
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /residentes/{document} {
      allow read, write: if request.auth != null;
    }
    
    match /locais/{document} {
      allow read, write: if request.auth != null;
    }
    
    match /servicos/{document} {
      allow read, write: if request.auth != null;
    }
    
    match /escalas/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Regras específicas para trocas
    match /trocas/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Regras específicas para notificações de troca
    match /notificacoes_troca/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Regras específicas para férias
    match /ferias/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Regras específicas para notificações de férias
    match /notificacoes_ferias/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Status
- ✅ Código atualizado com logs detalhados
- ✅ Regras simplificadas no arquivo local
- ⏳ Aguardando atualização no console do Firebase
- ⏳ Teste do sistema após atualização das regras
