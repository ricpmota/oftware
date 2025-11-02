# Guia de Teste - Sistema de Férias

## Funcionalidades Implementadas e Melhoradas

### ✅ O que foi corrigido e melhorado:

1. **Função `solicitarFerias` (UserService)**:
   - ✅ Validações robustas de dados
   - ✅ Validação de datas (não pode ser no passado, fim deve ser após início)
   - ✅ Logs detalhados para debug
   - ✅ Tratamento de erros melhorado
   - ✅ Criação automática de notificações para admins

2. **Função `getFeriasDoUsuario` (UserService)**:
   - ✅ Removido orderBy para evitar erros de índice
   - ✅ Ordenação manual por JavaScript
   - ✅ Tratamento seguro de dados vazios
   - ✅ Logs detalhados para debug

3. **Função `getAllFerias` (UserService)**:
   - ✅ Ordenação manual por JavaScript
   - ✅ Tratamento seguro de dados
   - ✅ Logs detalhados para debug

4. **Interface do Residente (/cenoft)**:
   - ✅ Validações de formulário melhoradas
   - ✅ Campos de data com min/max
   - ✅ Cálculo automático de duração
   - ✅ Avisos para períodos longos (>30 dias)
   - ✅ Botão desabilitado quando dados incompletos
   - ✅ Mensagens de erro específicas
   - ✅ Placeholder mais descritivo

5. **Interface do Admin (/admin)**:
   - ✅ Botão de refresh para recarregar dados
   - ✅ Exibição do nível do residente (R1/R2/R3)
   - ✅ Destaque visual para períodos longos
   - ✅ Melhor organização das informações

6. **Regras do Firestore**:
   - ✅ Regras corretas para coleções 'ferias' e 'notificacoes_ferias'
   - ✅ Permissões adequadas para usuários autenticados

## Como testar o sistema:

### 1. Teste de Solicitação de Férias (/cenoft):

1. Faça login como residente
2. Vá para a seção "Férias"
3. Preencha o formulário:
   - Data de início (futura)
   - Data de fim (posterior ao início)
   - Motivo (opcional)
4. Observe o cálculo automático da duração
5. Clique em "Solicitar Férias"
6. Verifique se aparece na lista "Minhas Solicitações"

### 2. Teste de Aprovação/Rejeição (/admin):

1. Faça login como admin
2. Vá para a seção "Ferias"
3. Verifique se a solicitação aparece na lista de pendentes
4. Teste os botões "Aprovar" e "Rejeitar"
5. Adicione observações quando solicitado
6. Verifique se o status muda corretamente

### 3. Testes de Validação:

**No Cenoft:**
- ❌ Tentar solicitar férias para data passada
- ❌ Tentar solicitar com data fim anterior à início
- ❌ Deixar campos obrigatórios vazios
- ✅ Solicitar período normal (até 30 dias)
- ✅ Solicitar período longo (mais de 30 dias) - deve pedir confirmação

**No Admin:**
- ✅ Ver detalhes completos da solicitação
- ✅ Ver nível do residente
- ✅ Ver duração com destaque para períodos longos
- ✅ Aprovar com e sem observações
- ✅ Rejeitar com e sem observações

### 4. Verificar no Console do Navegador:

Os logs devem mostrar:
- ✅ "=== DEBUG: Iniciando solicitação de férias ==="
- ✅ "✅ Solicitação de férias enviada com sucesso! ID: [ID]"
- ✅ "✅ Notificações para admins criadas"
- ✅ "=== DEBUG: Buscando férias do usuário ==="
- ✅ "✅ Férias carregadas com sucesso: [número]"

### 5. Verificar no Firestore:

As coleções devem conter:
- **ferias**: Documentos com os dados das solicitações
- **notificacoes_ferias**: Notificações para admins e residentes

## Problemas Resolvidos:

1. ✅ **Query orderBy**: Removido para evitar erros de índice
2. ✅ **Tratamento de dados vazios**: Valores padrão adequados
3. ✅ **Validações**: Implementadas tanto no frontend quanto no backend
4. ✅ **Feedback visual**: Indicadores claros de duração e status
5. ✅ **Notificações**: Sistema completo funcionando
6. ✅ **Debug**: Logs detalhados para identificar problemas

## Estrutura de Dados no Firebase:

```typescript
// Documento em /ferias/{id}
{
  residenteEmail: string,
  dataInicio: Date,
  dataFim: Date,
  motivo: string | null,
  status: 'pendente' | 'aprovada' | 'rejeitada',
  aprovadoPor?: string,
  rejeitadoPor?: string,
  observacoes?: string,
  createdAt: Date,
  updatedAt: Date
}

// Documento em /notificacoes_ferias/{id}
{
  usuarioEmail: string,
  tipo: 'solicitacao_ferias' | 'ferias_aprovada' | 'ferias_rejeitada',
  feriasId: string,
  lida: boolean,
  createdAt: Date
}
```

## Comandos Úteis para Debug:

1. **Verificar regras do Firestore**:
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Ver logs do Firebase no console**:
   - Abrir DevTools (F12)
   - Aba Console
   - Filtrar por "DEBUG" ou "Férias"

O sistema agora deve funcionar corretamente com salvamento no Firebase!
