# Integração entre `/metapersonal` e `/meta/personal`

## Visão Geral

Este documento descreve como foi implementada a integração que permite que Personal Trainers acessem a página de treinos do paciente (`/meta/personal`) diretamente a partir do painel de pacientes (`/metapersonal`).

## Arquitetura da Solução

### Opção Escolhida: Redirecionamento com Query String

Foi escolhida a **Opção B**: Redirecionar para `/meta/personal` com query string (`?pacienteId=...`), ao invés de criar um modal separado. Isso garante:
- Reutilização completa do componente existente
- Consistência de UI/UX
- Manutenção simplificada (uma única fonte de verdade)

---

## 1. Modificações em `/metapersonal` (app/metapersonal/page.v2.tsx)

### 1.1 Botão "Personal"

O botão "Personal" no card do paciente foi modificado para redirecionar ao invés de abrir um modal:

```typescript
// Localização aproximada: linha ~3458
onClick={() => {
  // Usar sempre o id do documento Firestore, não o userId
  const patientId = paciente.id || paciente.userId;
  if (patientId) {
    router.push(`/meta/personal?pacienteId=${patientId}`);
  }
}}
```

**Importante**: 
- Prioriza `paciente.id` (ID do documento Firestore) sobre `paciente.userId`
- Isso é necessário porque `PacienteService.getPacienteById()` espera o ID do documento

---

## 2. Modificações em `/meta/personal` (app/meta/personal/page.tsx)

### 2.1 Imports Necessários

```typescript
import { useRouter, useSearchParams, Suspense } from 'next/navigation';
```

### 2.2 Novos Estados

```typescript
const [pacienteIdFromQuery, setPacienteIdFromQuery] = useState<string | null>(null);
const [isPersonalTrainerMode, setIsPersonalTrainerMode] = useState(false);
const [authorizationError, setAuthorizationError] = useState<string | null>(null);
```

### 2.3 Leitura da Query String

```typescript
useEffect(() => {
  const params = searchParams;
  const pacienteId = params.get('pacienteId');
  
  if (pacienteId) {
    console.log('[useEffect] pacienteId da query:', pacienteId);
    setPacienteIdFromQuery(pacienteId);
    setIsPersonalTrainerMode(true);
  }
}, [searchParams]);
```

### 2.4 Autorização Permissiva

A lógica de autorização foi modificada para ser mais permissiva quando acessada via query string:

```typescript
useEffect(() => {
  // Se está em modo Personal Trainer e tem pacienteIdFromQuery, permitir acesso
  if (isPersonalTrainerMode && pacienteIdFromQuery) {
    // Verificar se é Personal Trainer
    // Se sim, permitir acesso (assumindo que se vê em /metapersonal, tem acesso)
    // Logar avisos mas não bloquear
    return;
  }
  
  // Lógica de autorização padrão para pacientes...
}, [isPersonalTrainerMode, pacienteIdFromQuery, user]);
```

**Lógica**: Se o usuário consegue ver o paciente em `/metapersonal`, ele deve ter acesso em `/meta/personal`.

### 2.5 Carregamento do Paciente

A função `loadPaciente` foi adaptada para buscar o paciente de diferentes formas:

```typescript
const loadPaciente = useCallback(async () => {
  const patientId = pacienteIdFromQuery || user?.uid || null;
  if (!patientId) return;
  
  try {
    const { PacienteService } = await import('@/services/pacienteService');
    let pacienteData;
    
    if (isPersonalTrainerMode && pacienteIdFromQuery) {
      // Tentar buscar pelo ID do documento
      pacienteData = await PacienteService.getPacienteById(pacienteIdFromQuery);
      
      // Se não encontrou, buscar na lista de pacientes visíveis
      if (!pacienteData) {
        const pacientesVisiveis = await PacientePersonalTrainerService.listPacientesVisiveisByPersonal(user?.uid || '');
        const pacienteEncontrado = pacientesVisiveis.find(p =>
          p.pacienteId === pacienteIdFromQuery ||
          p.paciente.id === pacienteIdFromQuery ||
          p.paciente.userId === pacienteIdFromQuery
        );
        if (pacienteEncontrado) {
          pacienteData = pacienteEncontrado.paciente;
        }
      }
    } else if (user?.email) {
      // Modo paciente normal: buscar por email
      pacienteData = await PacienteService.getPacienteByEmail(user.email);
    }
    
    if (pacienteData) {
      setPaciente(pacienteData);
    }
  } catch (error) {
    console.error('[loadPaciente] Erro ao carregar paciente:', error);
  }
}, [pacienteIdFromQuery, user, isPersonalTrainerMode]);
```

### 2.6 Busca de Sessões de Treino com Fallback

**Problema Identificado**: O `userId` do paciente pode ter formato `uid_timestamp` (ex: `cwU1IB6VeaUPSvfP3znRTk3AQnA2_1764506993259`), mas as sessões podem ter sido criadas apenas com o UID base (`cwU1IB6VeaUPSvfP3znRTk3AQnA2`).

**Solução**: Implementar fallback para tentar buscar com o UID base se não encontrar com o userId completo.

#### Exemplo: `loadTodaySession`

```typescript
const loadTodaySession = useCallback(async () => {
  let patientId = paciente?.userId || pacienteIdFromQuery || user?.uid || null;
  if (!patientId) return;
  
  // Se userId tem formato "uid_timestamp", extrair UID base
  let patientIdBase = patientId;
  if (patientId.includes('_') && paciente?.userId) {
    const parts = paciente.userId.split('_');
    if (parts.length > 1) {
      patientIdBase = parts[0];
      console.log('[loadTodaySession] userId tem timestamp, tentando também UID base:', patientIdBase);
    }
  }
  
  setLoadingToday(true);
  try {
    console.log('[loadTodaySession] Buscando sessões para patientId:', patientId);
    let sessions = await trainingSessionService.getTodaySessions(patientId);
    console.log('[loadTodaySession] Sessões encontradas com userId completo:', sessions.length);
    
    // Se não encontrou e tem formato com timestamp, tentar com UID base
    if (sessions.length === 0 && patientIdBase !== patientId) {
      console.log('[loadTodaySession] Tentando buscar com UID base:', patientIdBase);
      sessions = await trainingSessionService.getTodaySessions(patientIdBase);
      console.log('[loadTodaySession] Sessões encontradas com UID base:', sessions.length);
    }
    
    // ... resto da lógica
  } catch (error) {
    // ... tratamento de erro
  } finally {
    setLoadingToday(false);
  }
}, [pacienteIdFromQuery, user, paciente]);
```

**Funções que precisam do mesmo tratamento**:
- `loadTodaySession`
- `loadCalendarSessions`
- `loadHistorico`
- `loadEstatisticas`
- Qualquer função que chame `trainingSessionService.getPatientSessions()` ou similar

### 2.7 Recarregamento de Dados quando Paciente é Carregado

Um `useEffect` foi adicionado para recarregar os dados de treino quando o paciente é carregado:

```typescript
useEffect(() => {
  if (!paciente) {
    console.log('[useEffect] Paciente ainda não carregado');
    return;
  }
  
  console.log('[useEffect] Paciente carregado, recarregando treinos:', {
    nome: paciente.nome,
    userId: paciente.userId,
    id: paciente.id,
    pacienteIdFromQuery,
    activeTab
  });
  
  // Recarregar sessão de hoje se estiver na tab "Hoje"
  if (activeTab === 'hoje') {
    loadTodaySession();
  }
  // Recarregar calendário se estiver na tab "Cronograma"
  if (activeTab === 'cronograma') {
    loadCalendarSessions();
  }
  // Recarregar histórico se estiver na tab "Histórico"
  if (activeTab === 'historico') {
    loadHistorico();
  }
  // Recarregar estatísticas se estiver na tab "Estatísticas"
  if (activeTab === 'estatisticas') {
    loadEstatisticas();
  }
}, [paciente, activeTab, loadTodaySession, loadCalendarSessions, loadHistorico, loadEstatisticas, pacienteIdFromQuery]);
```

### 2.8 Modificações de UI

#### Badge "Aluno:"

```typescript
{isPersonalTrainerMode && paciente && (
  <span className="px-3 py-1 text-xs font-medium bg-pink-50 text-pink-700 border border-pink-200 rounded-md shadow-sm">
    Aluno: <span className="font-semibold">{paciente.nome}</span>
  </span>
)}
```

#### Botão Voltar

```typescript
<button
  onClick={() => {
    if (isPersonalTrainerMode) {
      router.push('/metapersonal');
    } else {
      router.push('/meta');
    }
  }}
  className="..."
>
  ← Voltar
</button>
```

### 2.9 Suspense Boundary (Next.js 15)

Como `useSearchParams()` requer um `Suspense` boundary no Next.js 15, o componente foi refatorado:

```typescript
// Componente interno que usa useSearchParams
function PersonalPageContent() {
  const searchParams = useSearchParams();
  // ... resto do código
}

// Componente exportado com Suspense
export default function PersonalPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PersonalPageContent />
    </Suspense>
  );
}
```

---

## 3. Estrutura de Dados

### 3.1 IDs Importantes

- **`paciente.id`**: ID do documento Firestore (ex: `ISu0OEXY1bJX1mzjLtkK`)
- **`paciente.userId`**: Firebase Auth UID ou formato `uid_timestamp` (ex: `cwU1IB6VeaUPSvfP3znRTk3AQnA2_1764506993259`)
- **UID Base**: Parte antes do `_` no `userId` (ex: `cwU1IB6VeaUPSvfP3znRTk3AQnA2`)

### 3.2 Quando Usar Cada ID

- **`PacienteService.getPacienteById()`**: Espera `paciente.id` (documento Firestore)
- **`trainingSessionService.getTodaySessions()`**: Espera `paciente.userId` ou UID base
- **Query String**: Usa `paciente.id` (mais confiável para lookup)

---

## 4. Fluxo de Execução

1. Personal Trainer clica em "Personal" em `/metapersonal`
2. Redireciona para `/meta/personal?pacienteId={paciente.id}`
3. `useEffect` detecta `pacienteId` na query e ativa `isPersonalTrainerMode`
4. `loadPaciente()` busca o paciente usando `PacienteService.getPacienteById(pacienteIdFromQuery)`
5. Quando paciente é carregado, `useEffect` dispara recarregamento das sessões
6. `loadTodaySession()` tenta buscar com `paciente.userId` completo
7. Se não encontrar, tenta com UID base (sem timestamp)
8. Sessões são exibidas na UI

---

## 5. Debugging

### Logs Importantes

Os seguintes logs foram adicionados para facilitar debugging:

- `[useEffect] pacienteId da query: ...`
- `[loadPaciente] Carregando paciente ...`
- `[loadTodaySession] Buscando sessões para patientId: ...`
- `[loadTodaySession] Tentando buscar com UID base: ...`
- `[useEffect] Paciente carregado, recarregando treinos: ...`

### Verificações Comuns

1. **Paciente não carrega**: Verificar se `pacienteId` na query corresponde ao `id` do documento
2. **Sessões não aparecem**: Verificar logs para ver se está tentando buscar com UID base
3. **Acesso negado**: Verificar se `isPersonalTrainerMode` está sendo setado corretamente

---

## 6. Replicação para Outros Módulos

Para replicar essa integração em outros módulos (ex: `/metanutri` → `/meta/nutri`):

### Checklist

1. ✅ Adicionar botão que redireciona com `router.push('/meta/nutri?pacienteId=...')`
2. ✅ Adicionar `useSearchParams` e estados (`pacienteIdFromQuery`, `isNutricionistaMode`)
3. ✅ Modificar `loadPaciente` para buscar por ID quando em modo profissional
4. ✅ Implementar fallback de UID base nas funções de busca de dados
5. ✅ Adicionar `useEffect` para recarregar dados quando paciente é carregado
6. ✅ Modificar autorização para ser permissiva quando acessado via query string
7. ✅ Adicionar badge indicando modo profissional ("Aluno:", "Paciente:", etc.)
8. ✅ Modificar botão voltar para retornar à página correta
9. ✅ Envolver componente em `Suspense` se usar `useSearchParams`
10. ✅ Adicionar logs de debugging

---

## 7. Arquivos Modificados

- `app/metapersonal/page.v2.tsx`: Botão "Personal" redireciona
- `app/meta/personal/page.tsx`: Suporte a modo Personal Trainer via query string

---

## 8. Dependências de Serviços

- `services/pacienteService.ts`: `getPacienteById()`, `getPacienteByEmail()`
- `services/pacientePersonalTrainerService.ts`: `listPacientesVisiveisByPersonal()`
- `services/trainingSessionService.ts`: `getTodaySessions()`, `getPatientSessions()`

---

## 9. Notas Finais

- A solução é **não-invasiva**: não quebra funcionalidade existente para pacientes
- **Reutilização máxima**: aproveita 100% do componente existente
- **Fallback robusto**: tenta múltiplas estratégias para encontrar dados
- **Debugging facilitado**: logs extensivos para diagnóstico

---

**Data de Criação**: 26 de Janeiro de 2026  
**Última Atualização**: 26 de Janeiro de 2026
