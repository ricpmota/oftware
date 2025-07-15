# Configuração das Regras do Firestore

## Problema Atual
O login não está funcionando porque as regras do Firestore não permitem acesso à coleção `doctors`.

## Solução

### 1. Acesse o Console do Firebase
1. Vá para [https://console.firebase.google.com](https://console.firebase.google.com)
2. Selecione o projeto `oftware-9201e`
3. No menu lateral, clique em **Firestore Database**
4. Clique na aba **Rules**

### 2. Substitua as Regras Atuais
Substitua todo o conteúdo atual pelas seguintes regras:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite que médicos leiam e escrevam seus próprios documentos
    match /doctors/{doctorId} {
      allow read, write: if request.auth != null && request.auth.uid == doctorId;
    }
    
    // Permite que médicos leiam e escrevam dados de pacientes
    match /patients/{patientId} {
      allow read, write: if request.auth != null;
    }
    
    // Permite que médicos leiam e escrevam prescrições
    match /prescriptions/{prescriptionId} {
      allow read, write: if request.auth != null;
    }
    
    // Permite que médicos leiam e escrevam exames clínicos
    match /clinical-exams/{examId} {
      allow read, write: if request.auth != null;
    }
    
    // Permite que médicos leiam e escrevam alertas clínicos
    match /clinical-alerts/{alertId} {
      allow read, write: if request.auth != null;
    }
    
    // Permite acesso às operações do médico
    match /doctors/{doctorId}/operations/{operationId} {
      allow read, write: if request.auth != null && request.auth.uid == doctorId;
    }
    
    // Negar tudo por padrão
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 3. Publique as Regras
1. Clique em **Publish** para salvar as novas regras
2. Aguarde alguns segundos para as regras serem aplicadas

### 4. Teste o Login
1. Volte para o site [https://oftware.com.br](https://oftware.com.br)
2. Tente fazer login com Google
3. O sistema deve permitir o acesso e criar o perfil do médico

## Explicação das Regras

- **`/doctors/{doctorId}`**: Permite que cada médico acesse apenas seu próprio perfil
- **`/patients/{patientId}`**: Permite que médicos autenticados acessem dados de pacientes
- **`/prescriptions/{prescriptionId}`**: Permite acesso às prescrições
- **`/clinical-exams/{examId}`**: Permite acesso aos exames clínicos
- **`/clinical-alerts/{alertId}`**: Permite acesso aos alertas clínicos
- **Regra padrão**: Nega acesso a todas as outras coleções por segurança

## Se Ainda Não Funcionar

1. **Verifique se o Firebase está ativo**: No console do Firebase, vá em **Project Settings** e verifique se o projeto está ativo
2. **Verifique as variáveis de ambiente**: Confirme se as variáveis do Firebase estão configuradas no Vercel
3. **Limpe o cache**: Tente fazer logout e login novamente
4. **Verifique o console do navegador**: Pressione F12 e veja se há erros relacionados ao Firebase

## Comandos para Deploy das Regras (Opcional)

Se você tiver o Firebase CLI instalado, pode usar:

```bash
# Instalar Firebase CLI (se não tiver)
npm install -g firebase-tools

# Fazer login
firebase login

# Inicializar o projeto (se necessário)
firebase init firestore

# Deploy das regras
firebase deploy --only firestore:rules
``` 