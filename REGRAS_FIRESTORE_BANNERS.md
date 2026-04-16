# Regras do Firestore para Banners - Instruções de Aplicação

## ⚠️ IMPORTANTE: As regras precisam ser publicadas no Firebase Console

O arquivo `firestore.rules` local foi atualizado, mas você precisa publicar essas regras no Firebase Console para que tenham efeito.

## 📋 Regras Completas do Firestore

Copie e cole EXATAMENTE este conteúdo no Firebase Console:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para sistema médico existente
    match /doctors/{doctorId} {
      allow read, write: if request.auth != null && request.auth.uid == doctorId;
    }
    
    match /patients/{patientId} {
      allow read, write: if request.auth != null;
    }
    
    // Regras para sistema de escalas
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    
    match /residentes/{residenteId} {
      allow read, write: if request.auth != null;
    }
    
    match /locais/{localId} {
      allow read, write: if request.auth != null;
    }
    
    match /servicos/{servicoId} {
      allow read, write: if request.auth != null;
    }
    
    match /escalas/{escalaId} {
      allow read, write: if request.auth != null;
    }
    
    // Regras para sistema de trocas
    match /trocas/{trocaId} {
      allow read, write: if request.auth != null;
    }
    
    match /notificacoes_troca/{notificacaoId} {
      allow read, write: if request.auth != null;
    }
    
    // Regras para férias
    match /ferias/{feriasId} {
      allow read, write: if request.auth != null;
    }
    
    match /notificacoes_ferias/{notificacaoId} {
      allow read, write: if request.auth != null;
    }
    
    // NOVA: Regras para notificações internas
    match /notificacoes/{notificationId} {
      allow read, write: if request.auth != null;
    }
    
    // Logs de notificações (caso ainda existam)
    match /notification_logs/{logId} {
      allow read, write: if request.auth != null;
    }
    
    // Regras para sistema de mensagens
    match /mensagens/{mensagemId} {
      allow read, write: if request.auth != null;
    }
    
    match /mensagens_residentes/{mensagemResidenteId} {
      allow read, write: if request.auth != null;
    }
    
    // Regras para pacientes_completos e subcoleções (nutricao)
    match /pacientes_completos/{pacienteId} {
      allow read, write: if request.auth != null;
      
      // Subcoleção nutricao
      match /nutricao/{document=**} {
        allow read, write: if request.auth != null;
      }
    }
    
    // ⭐ REGRA PARA BANNERS - DEVE ESTAR ANTES DO FALLBACK ⭐
    // Leitura pública para todos, escrita apenas autenticada
    match /banners/{bannerId} {
      allow read: if true; // Leitura pública para todos
      allow write: if request.auth != null; // Escrita apenas para usuários autenticados
    }
    
    // Fallback para outras collections (DEVE SER A ÚLTIMA REGRA)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚀 Como Publicar as Regras

### Método 1: Firebase Console (Recomendado)

1. Acesse: https://console.firebase.google.com
2. Selecione o projeto: **oftware-9201e**
3. No menu lateral, clique em **Firestore Database**
4. Clique na aba **Rules** (no topo)
5. **DELETE TODO O CONTEÚDO** atual
6. **COLE** o código acima completo
7. Clique em **Publish** (botão azul no topo)
8. Aguarde a confirmação "Rules published successfully"

### Método 2: Firebase CLI

Se você tem Firebase CLI instalado:

```bash
firebase deploy --only firestore:rules
```

## ✅ Verificação

Após publicar, aguarde 10-30 segundos e recarregue a página home (www.oftware.com.br). Os banners devem aparecer.

## 🔍 Troubleshooting

Se ainda não funcionar após publicar:

1. Verifique se a regra de banners está **ANTES** do fallback `match /{document=**}`
2. Verifique se não há erros de sintaxe (o Firebase Console mostra erros em vermelho)
3. Aguarde alguns segundos após publicar (as regras podem levar alguns segundos para propagar)
4. Limpe o cache do navegador (Ctrl+Shift+R ou Cmd+Shift+R)
5. Verifique no console do navegador se ainda aparece erro de permissão
