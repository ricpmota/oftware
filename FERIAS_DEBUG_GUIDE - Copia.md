# Guia de Debug - Férias Aprovadas Não Aparecem

## 🔍 Problema Identificado
As férias aprovadas não estão aparecendo no `/cenoft` para os residentes.

## 🛠️ Melhorias Implementadas para Debug

### 1. **Logs Detalhados no UserService**
- ✅ Logs na função `getFeriasDoUsuario` para mostrar documentos encontrados
- ✅ Logs na função `getAllFerias` para mostrar todas as férias
- ✅ Logs na função `aprovarFerias` para confirmar aprovação
- ✅ Logs detalhados com status das férias

### 2. **Interface de Debug no /cenoft**
- ✅ Seção de debug temporária (apenas em desenvolvimento)
- ✅ Botão "Testar Busca" para teste direto
- ✅ Botão "Atualizar" para recarregar férias
- ✅ Logs na função `loadFerias`

### 3. **Interface de Debug no /admin**
- ✅ Logs na função `loadFeriasPendentes`
- ✅ Logs na função `handleAprovarFerias`
- ✅ Logs detalhados com status das férias

### 4. **Carregamento Automático**
- ✅ useEffect para carregar férias ao entrar na seção
- ✅ Recarregamento automático após aprovação

## 🔍 Como Debuggar o Problema

### Passo 1: Verificar no Console do Navegador

**No /cenoft (Residente):**
1. Abra o DevTools (F12)
2. Vá para a aba Console
3. Clique em "Férias" no menu
4. Procure por logs como:
   ```
   🔄 Carregando férias para usuário: [email]
   === DEBUG: Buscando férias do usuário ===
   📊 Férias carregadas no frontend: [número]
   ```

**No /admin (Administrador):**
1. Aprove uma férias
2. Procure por logs como:
   ```
   🔄 Aprovando férias: [id]
   === DEBUG: Iniciando aprovação de férias ===
   ✅ Férias aprovada com sucesso
   ```

### Passo 2: Verificar no Firebase Console

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Vá para Firestore Database
3. Verifique a coleção `ferias`:
   - Documentos devem ter `status: "aprovada"`
   - Verificar se o `residenteEmail` está correto

### Passo 3: Usar Botões de Debug

**No /cenoft:**
1. Clique em "Testar Busca" para ver logs detalhados
2. Clique em "Atualizar" para recarregar
3. Verifique a seção de debug (se em desenvolvimento)

### Passo 4: Verificar Dados Específicos

**No Console, procure por:**
```javascript
// Logs que devem aparecer
"=== DEBUG: Buscando férias do usuário ==="
"Email do usuário: [email]"
"Documentos encontrados: [número]"
"Status das férias: [{id: '...', status: 'aprovada'}]"
```

## 🐛 Possíveis Causas do Problema

### 1. **Problema de Email**
- Verificar se o email do usuário logado é o mesmo do `residenteEmail`
- Verificar se há diferenças de case (maiúscula/minúscula)

### 2. **Problema de Status**
- Verificar se o status está sendo salvo como "aprovada" (não "aprovado")
- Verificar se há espaços extras no status

### 3. **Problema de Query**
- Verificar se a query está funcionando corretamente
- Verificar se há problemas de índice no Firestore

### 4. **Problema de Cache**
- Verificar se o cache do navegador está interferindo
- Testar em modo incógnito

## 🔧 Soluções Implementadas

### 1. **Logs Detalhados**
```javascript
console.log('Documento encontrado:', doc.id, {
  ...data,
  dataInicio: data.dataInicio?.toDate?.() || data.dataInicio,
  dataFim: data.dataFim?.toDate?.() || data.dataFim,
  status: data.status
});
```

### 2. **Tratamento de Dados**
```javascript
status: data.status || 'pendente'
```

### 3. **Ordenação Manual**
```javascript
feriasData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
```

### 4. **Interface de Debug**
```javascript
{process.env.NODE_ENV === 'development' && (
  <div className="bg-gray-100 p-4 rounded-lg text-xs">
    <h4 className="font-bold mb-2">Debug Info:</h4>
    <p>Total de férias carregadas: {ferias.length}</p>
    // ... mais informações
  </div>
)}
```

## 📋 Checklist de Verificação

- [ ] Verificar logs no console do navegador
- [ ] Verificar dados no Firebase Console
- [ ] Testar botão "Testar Busca"
- [ ] Testar botão "Atualizar"
- [ ] Verificar seção de debug (desenvolvimento)
- [ ] Verificar email do usuário
- [ ] Verificar status das férias
- [ ] Testar em modo incógnito

## 🚀 Próximos Passos

1. **Testar com os logs implementados**
2. **Verificar se os dados estão sendo salvos corretamente**
3. **Identificar onde está o problema específico**
4. **Aplicar correção direcionada**

Os logs implementados devem revelar exatamente onde está o problema!
