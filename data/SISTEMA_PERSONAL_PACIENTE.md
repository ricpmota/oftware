# Sistema Personal - Página do Paciente

## 📋 Visão Geral

O sistema Personal permite que pacientes gerenciem seus próprios treinos através da página `/meta/personal`. O paciente pode criar sessões de treino, marcar como feitas/puladas, visualizar histórico e estatísticas de aderência.

---

## 🏗️ Arquitetura

### Estrutura de Arquivos

```
app/meta/personal/
  └── page.tsx                    # Página principal com todas as tabs

services/
  └── trainingSessionService.ts   # Serviço para CRUD de sessões

types/
  └── trainingSession.ts         # Tipos TypeScript

app/api/exercisedb/
  ├── targets/route.ts           # Lista de músculos alvo
  ├── equipments/route.ts        # Lista de equipamentos
  ├── bodyparts/route.ts         # Lista de partes do corpo
  ├── search/route.ts           # Busca por nome
  ├── byTarget/route.ts          # Busca por músculo alvo
  ├── byEquipment/route.ts       # Busca por equipamento
  └── byBodyPart/route.ts        # Busca por parte do corpo
```

---

## 🎯 Funcionalidades por Tab

### 1. Tab "Hoje"

**Localização:** `app/meta/personal/page.tsx` (linhas ~520-620)

**Funcionalidades:**
- Exibe o treino agendado para o dia atual
- Lista todos os exercícios da sessão com:
  - Imagem/GIF (se disponível)
  - Nome do exercício
  - Tags (target, equipment, bodyPart)
  - Prescrição (sets × reps, descanso)
- Permite adicionar observações do paciente
- Botões para marcar como:
  - ✅ **Feito** (status: `done`)
  - ❌ **Pulou** (status: `skipped`)

**Fluxo de Dados:**
1. Ao carregar a página, chama `loadTodaySession()`
2. Busca sessão do dia atual via `trainingSessionService.getTodaySession(patientId)`
3. Se encontrada, busca exercícios via `getSessionExercises(sessionId)`
4. Ao marcar como feito/pulou, chama `markSession(sessionId, status, patientNotes)`

**Estado:**
- `todaySession`: Sessão do dia atual ou `null`
- `todayExercises`: Array de exercícios da sessão
- `patientNotes`: Observações do paciente
- `savingStatus`: Loading ao salvar

---

### 2. Tab "Cronograma"

**Localização:** `app/meta/personal/page.tsx` (linhas ~622-640 + componente `CalendarioComponent`)

**Funcionalidades:**
- Calendário mensal mostrando todas as sessões
- Toggle para mostrar/ocultar treinos no calendário
- Visualização por mês (navegação anterior/próximo)
- Clique no dia mostra sessões daquele dia
- Clique na sessão abre modal com detalhes

**Fluxo de Dados:**
1. Ao entrar na tab, chama `loadCalendarSessions()`
2. Calcula primeiro e último dia do mês visível
3. Busca sessões no intervalo via `getPatientSessions(patientId, { startDate, endDate })`
4. Renderiza calendário com sessões marcadas

**Estado:**
- `mesCalendario`: Data do mês sendo visualizado
- `diaSelecionado`: Dia clicado (se houver)
- `sessoesCalendario`: Array de sessões do mês
- `showTreinosToggle`: Toggle para mostrar/ocultar treinos

**Componente `CalendarioComponent`:**
- Recebe props: `mesCalendario`, `setMesCalendario`, `diaSelecionado`, `setDiaSelecionado`, `sessoes`, `onSessionClick`
- Renderiza grid 7xN (dias da semana × semanas do mês)
- Cada dia mostra número e badges das sessões
- Cores diferentes por status (done=verde, skipped=vermelho, scheduled=cinza)

---

### 3. Tab "Criar Treino"

**Localização:** `app/meta/personal/page.tsx` (linhas ~642-850)

**Funcionalidades:**
- Formulário para criar nova sessão:
  - Título do treino
  - Data (date picker, mínimo = hoje)
- Busca de exercícios:
  - Campo de busca por nome
  - Filtros: BodyPart, Target, Equipment
  - Resultados em grid com cards
- Montagem da sessão:
  - Lista de exercícios selecionados
  - Para cada exercício: sets, reps, restSec (editáveis)
  - Botão para remover exercício
- Botão "Publicar no calendário"

**Fluxo de Dados:**
1. Ao entrar na tab, carrega filtros: `loadFilters()` → busca targets, equipments, bodyParts
2. Ao digitar/filtrar, chama `searchExercises()` (debounce 500ms)
3. Ao clicar "Adicionar", adiciona exercício em `selectedExercises`
4. Ao publicar, chama `handleCreateSession()`:
   - Valida campos obrigatórios
   - Mapeia exercícios para formato do Firestore
   - Chama `createSessionWithExercises()`
   - Limpa formulário e redireciona para Cronograma

**Estado:**
- `searchQuery`: Texto da busca
- `selectedTarget`, `selectedEquipment`, `selectedBodyPart`: Filtros ativos
- `targets`, `equipments`, `bodyParts`: Listas de opções
- `exercisesResults`: Resultados da busca
- `selectedExercises`: Exercícios adicionados à sessão
- `newSessionTitle`, `newSessionDate`: Dados da sessão
- `creatingSession`: Loading ao criar

**Rotas da API utilizadas:**
- `/api/exercisedb/targets` - Lista de targets
- `/api/exercisedb/equipments` - Lista de equipamentos
- `/api/exercisedb/bodyparts` - Lista de body parts
- `/api/exercisedb/search?name=...` - Busca por nome
- `/api/exercisedb/byTarget?target=...&page=1` - Busca por target
- `/api/exercisedb/byEquipment?equipment=...&page=1` - Busca por equipment
- `/api/exercisedb/byBodyPart?bodyPart=...&page=1` - Busca por body part

---

### 4. Tab "Histórico"

**Localização:** `app/meta/personal/page.tsx` (linhas ~852-920)

**Funcionalidades:**
- Lista de sessões dos últimos 30-60 dias
- Agrupadas por data (mais recentes primeiro)
- Mostra: título, data, status, observações
- Clique na sessão abre modal com detalhes completos

**Fluxo de Dados:**
1. Ao entrar na tab, chama `loadHistorico()`
2. Calcula data de 60 dias atrás até hoje
3. Busca sessões via `getPatientSessions(patientId, { startDate, endDate })`
4. Renderiza lista ordenada por data (desc)

**Estado:**
- `historicoSessions`: Array de sessões do histórico
- `loadingHistorico`: Loading ao carregar
- `selectedSessionDetail`: Sessão selecionada para ver detalhes
- `selectedSessionExercises`: Exercícios da sessão selecionada

---

### 5. Tab "Estatísticas"

**Localização:** `app/meta/personal/page.tsx` (linhas ~922-970)

**Funcionalidades:**
- **Aderência 7 dias:** `done / (done + skipped + scheduled)` × 100
- **Aderência 30 dias:** Mesmo cálculo para 30 dias
- **Treinos por semana:** Gráfico de barras das últimas 4 semanas

**Fluxo de Dados:**
1. Ao entrar na tab, chama `loadEstatisticas()`
2. Calcula aderência 7 dias via `calculateAdherence(patientId, startDate7d, endDate)`
3. Calcula aderência 30 dias via `calculateAdherence(patientId, startDate30d, endDate)`
4. Para cada uma das 4 semanas, busca sessões e conta `status === 'done'`

**Estado:**
- `adherence7d`: Percentual de aderência (0-100)
- `adherence30d`: Percentual de aderência (0-100)
- `treinosPorSemana`: Array com 4 números (treinos feitos por semana)

---

### 6. Tab "Lembretes"

**Localização:** `app/meta/personal/page.tsx` (linhas ~972-1050)

**Funcionalidades:**
- Toggle para habilitar/desabilitar lembretes
- Seleção de horário (HH:mm)
- Seleção de dias da semana (múltipla escolha)
- Botão "Salvar preferências"

**Fluxo de Dados:**
1. Ao entrar na tab, chama `loadReminderPrefs()`
2. Busca preferências via `getReminderPrefs(patientId)`
3. Se não existir, mostra botão "Criar preferências"
4. Ao salvar, chama `saveReminderPrefs(patientId, prefs)`

**Estado:**
- `reminderPrefs`: Objeto com `enabled`, `time`, `daysOfWeek`
- `savingReminder`: Loading ao salvar

**Nota:** A implementação de notificações reais ainda não está implementada. Apenas salva as preferências no Firestore.

---

## 💾 Modelo de Dados (Firestore)

### Collection: `trainingSessions`

**Documento:** `trainingSessions/{sessionId}`

```typescript
{
  patientId: string;              // UID do paciente
  createdBy: 'patient' | 'trainer';
  createdById: string;            // UID de quem criou
  scheduledDate: string;            // YYYY-MM-DD
  title: string;                  // Ex: "Treino A - Superior"
  status: 'scheduled' | 'done' | 'skipped';
  patientNotes?: string;          // Observações do paciente
  trainerNotes?: string;          // Observações do personal (só leitura para paciente)
  published: boolean;             // true
  updatedAt: Timestamp;
  createdAt: Timestamp;
  revision?: number;              // Opcional (só leitura para paciente)
}
```

### Subcollection: `trainingSessions/{sessionId}/exercises`

**Documento:** `trainingSessions/{sessionId}/exercises/{exerciseId}`

```typescript
{
  source: 'exercisedb';
  exerciseId: string;             // ID do exercício na ExerciseDB
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl?: string;                // URL do GIF (opcional)
  prescription: {
    sets: number;                 // Ex: 3
    reps: number;                 // Ex: 10
    restSec: number;              // Ex: 60
  };
  order: number;                  // Ordem na sessão (0, 1, 2...)
}
```

### Collection: `trainingReminderPrefs`

**Documento:** `trainingReminderPrefs/{patientId}`

```typescript
{
  enabled: boolean;
  time: string;                   // HH:mm (ex: "08:00")
  daysOfWeek: number[];            // [0,1,2,3,4,5,6] (0=domingo, 6=sábado)
  channel?: string;                // Opcional
  updatedAt: Timestamp;
}
```

---

## 🔧 Serviços

### `trainingSessionService`

**Arquivo:** `services/trainingSessionService.ts`

**Métodos principais:**

1. **`createSession(session)`** - Cria sessão sem exercícios
2. **`createSessionWithExercises(session, exercises)`** - Cria sessão com exercícios
3. **`getSession(sessionId)`** - Busca sessão por ID
4. **`getSessionExercises(sessionId)`** - Busca exercícios de uma sessão
5. **`getPatientSessions(patientId, options?)`** - Busca sessões do paciente (com filtros opcionais)
6. **`getTodaySession(patientId)`** - Busca sessão do dia atual
7. **`updateSession(sessionId, updates)`** - Atualiza sessão
8. **`markSession(sessionId, status, patientNotes?)`** - Marca como feito/pulou
9. **`deleteSession(sessionId)`** - Deleta sessão
10. **`saveReminderPrefs(patientId, prefs)`** - Salva preferências de lembrete
11. **`getReminderPrefs(patientId)`** - Busca preferências de lembrete
12. **`calculateAdherence(patientId, startDate, endDate)`** - Calcula aderência

**Observações:**
- Todos os métodos filtram campos `undefined` antes de salvar (Firestore não aceita)
- Usa `writeBatch` para operações atômicas
- Timestamps são convertidos automaticamente

---

## 🔐 Firestore Rules

**Arquivo:** `firestore.rules`

### Regras para `trainingSessions`:

- **Read:** Paciente dono, personal trainer vinculado (se houver), ou admin
- **Create:** Apenas paciente pode criar suas próprias sessões (`createdBy: 'patient'`)
- **Update:** 
  - Paciente pode atualizar `status` e `patientNotes`
  - Personal trainer pode atualizar `trainerNotes` (se tiver vínculo ativo)
- **Delete:** Apenas paciente dono ou admin

### Regras para `trainingSessions/{sessionId}/exercises`:

- **Read:** Mesma regra da sessão pai
- **Write:** Apenas paciente dono ou admin

### Regras para `trainingReminderPrefs`:

- **Read/Write:** Apenas o próprio paciente ou admin

---

## 🔄 Fluxo Completo: Criar Treino

```
1. Usuário entra na tab "Criar Treino"
   ↓
2. Sistema carrega filtros (targets, equipments, bodyParts)
   ↓
3. Usuário busca/filtra exercícios
   ↓
4. Sistema busca na API /api/exercisedb/*
   ↓
5. Usuário clica "Adicionar" em exercícios
   ↓
6. Exercícios aparecem em "Exercícios do treino"
   ↓
7. Usuário ajusta sets/reps/restSec de cada exercício
   ↓
8. Usuário preenche título e data
   ↓
9. Usuário clica "Publicar no calendário"
   ↓
10. Sistema valida campos obrigatórios
    ↓
11. Sistema mapeia exercícios (remove undefined)
    ↓
12. Sistema chama trainingSessionService.createSessionWithExercises()
    ↓
13. Serviço cria documento em trainingSessions
    ↓
14. Serviço cria documentos em trainingSessions/{id}/exercises
    ↓
15. Sistema limpa formulário e redireciona para "Cronograma"
```

---

## 🐛 Problemas Conhecidos e Melhorias Possíveis

### 1. **Performance**
- ❌ Busca de exercícios não tem paginação (carrega todos os resultados)
- ✅ **Melhoria:** Implementar paginação com botões "Carregar mais"

### 2. **UX - Criar Treino**
- ❌ Não há preview do treino antes de publicar
- ✅ **Melhoria:** Adicionar preview antes de publicar
- ❌ Não há templates de treino pré-definidos
- ✅ **Melhoria:** Permitir salvar treinos como templates

### 3. **UX - Calendário**
- ❌ Não há drag & drop para mover sessões
- ✅ **Melhoria:** Permitir arrastar sessão para outro dia
- ❌ Não há visualização semanal
- ✅ **Melhoria:** Adicionar view semanal além da mensal

### 4. **Estatísticas**
- ❌ Gráficos são muito simples (apenas barras)
- ✅ **Melhoria:** Adicionar gráficos mais detalhados (tendência, comparação)
- ❌ Não há metas personalizadas
- ✅ **Melhoria:** Permitir definir meta de treinos por semana

### 5. **Lembretes**
- ❌ Notificações não estão implementadas (apenas salva preferências)
- ✅ **Melhoria:** Implementar notificações push/web
- ❌ Não há notificação no dia do treino
- ✅ **Melhoria:** Enviar notificação no horário configurado

### 6. **Histórico**
- ❌ Não há filtros (por status, período)
- ✅ **Melhoria:** Adicionar filtros de busca
- ❌ Não há exportação de dados
- ✅ **Melhoria:** Permitir exportar histórico em PDF/CSV

### 7. **Validações**
- ❌ Não valida se data é no passado ao criar treino
- ✅ **Melhoria:** Validar data mínima = hoje
- ❌ Não valida se já existe treino no mesmo dia
- ✅ **Melhoria:** Avisar se já existe treino no dia selecionado

### 8. **Mobile**
- ❌ Layout pode melhorar em telas muito pequenas
- ✅ **Melhoria:** Otimizar cards e formulários para mobile
- ❌ Calendário pode ser difícil de usar no mobile
- ✅ **Melhoria:** Adicionar view de lista para mobile

### 9. **Integração com Personal Trainer**
- ❌ Paciente não vê treinos criados pelo personal trainer
- ✅ **Melhoria:** Mostrar treinos do personal também
- ❌ Personal trainer não pode ver treinos do paciente
- ✅ **Melhoria:** Permitir visualização (já tem regra no Firestore)

### 10. **Busca de Exercícios**
- ❌ Não há favoritos/exercícios recentes
- ✅ **Melhoria:** Salvar exercícios favoritos
- ❌ Não há histórico de exercícios usados
- ✅ **Melhoria:** Mostrar exercícios mais usados primeiro

---

## 📝 Notas Técnicas

### Tratamento de `undefined`
- Firestore não aceita valores `undefined`
- Todos os objetos são filtrados antes de salvar
- `gifUrl` só é incluído se existir

### Debounce na Busca
- Busca de exercícios tem debounce de 500ms
- Evita muitas requisições enquanto usuário digita

### Ordenação
- Exercícios são ordenados por `order` (campo numérico)
- Sessões são ordenadas por `scheduledDate` (desc)

### Estados de Loading
- Cada tab tem seu próprio estado de loading
- Evita bloqueio da UI inteira

### Responsividade
- Tabs usam grid responsivo (3 colunas mobile, 6 desktop)
- Cards de exercícios usam grid responsivo
- Calendário adapta tamanho de células

---

## 🚀 Próximos Passos Sugeridos

1. **Implementar notificações reais** (push/web)
2. **Adicionar templates de treino**
3. **Melhorar gráficos de estatísticas**
4. **Adicionar filtros no histórico**
5. **Implementar drag & drop no calendário**
6. **Adicionar favoritos de exercícios**
7. **Criar view semanal do calendário**
8. **Implementar exportação de dados**
9. **Adicionar validações mais robustas**
10. **Otimizar performance com paginação**

---

## 📚 Referências

- **Especificação original:** `data/oftware_meta_paciente_personal_spec_v1.md`
- **API ExerciseDB:** https://exercisedb.p.rapidapi.com
- **Firestore Rules:** `firestore.rules` (linhas ~450-530)

---

**Última atualização:** Janeiro 2025
