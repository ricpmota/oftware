# Sistema OftReview - Documentação Completa

## 📋 Visão Geral

O **OftReview** é um sistema completo de biblioteca de vídeos para revisão de estudos médicos. Permite organizar, classificar, assistir e planejar estudos de vídeos educacionais com funcionalidades avançadas de progresso, planejamento e cronograma.

**Rota:** `/oftreview`

## 🏗️ Arquitetura

### Estrutura de Diretórios

```
oftreview/
├── app/oftreview/
│   └── page.tsx                    # Página principal (wrapper)
├── components/oftreview/
│   ├── VideoLibrary.tsx            # Componente principal (orquestrador)
│   ├── LibraryConnector.tsx       # Seleção e conexão de pasta
│   ├── SearchAndFilters.tsx        # Busca e filtros
│   ├── SubjectAccordion.tsx       # Lista de vídeos por assunto
│   ├── VideoPlayer.tsx             # Player de vídeo
│   ├── StudyPlanner.tsx            # Planejador de estudos
│   └── ScheduleCalendar.tsx        # Calendário de cronograma
├── types/
│   └── videoLibrary.ts            # Tipos TypeScript
└── utils/
    ├── videoLibraryUtils.ts       # Utilitários de biblioteca
    ├── videoProgress.ts           # Gerenciamento de progresso
    ├── loadVideoDuration.ts       # Carregamento de durações
    ├── studyPlannerUtils.ts       # Utilitários do planejador
    ├── plannerFirestore.ts        # Persistência no Firestore
    ├── plannerStorage.ts           # Armazenamento local
    ├── scheduleGenerator.ts        # Geração de cronograma
    ├── scheduleStorage.ts          # Armazenamento de cronograma
    └── fnv1aHash.ts                # Hash para IDs estáveis
```

## 🎯 Funcionalidades Principais

### 1. Biblioteca de Vídeos
- **Seleção de Pasta**: Seleciona pasta com vídeos usando input `webkitdirectory`
- **Indexação Automática**: Processa e indexa vídeos automaticamente
- **Classificação por Assunto**: Infere assunto a partir da estrutura de pastas
- **Persistência**: Salva metadados no `localStorage` (sem objetos File)
- **Reconexão**: Permite reconectar pasta para acessar arquivos novamente
- **Formatos Suportados**: mp4, mkv, avi, mov, webm, m4v, ts
- **Priorização**: Prioriza .mp4 quando há versão convertida de .ts

### 2. Sistema de Progresso
- **Rastreamento Automático**: Rastreia posição e tempo assistido
- **Marcação Manual**: Permite marcar vídeos como assistidos
- **Persistência Local**: Salva progresso no `localStorage` com throttle
- **Export/Import**: Exporta e importa progresso em JSON
- **Estatísticas**: Calcula estatísticas de progresso por assunto

### 3. Player de Vídeo
- **Reprodução Local**: Reproduz vídeos diretamente do File System
- **Continuar Assistindo**: Botão para continuar de onde parou
- **Atualização de Progresso**: Atualiza progresso em tempo real
- **Marcação Automática**: Marca como assistido ao chegar ao fim
- **Suporte a Partes**: Suporta iniciar em tempo específico (para partes de vídeo)

### 4. Planejador de Estudos
- **Configuração de Período**: Define data de início e fim
- **Dias da Semana**: Seleciona dias disponíveis para estudo
- **Horas por Dia**: Define horas de estudo por dia da semana
- **Seleção de Assuntos**: Seleciona assuntos a incluir no cronograma
- **Ordem de Estudo**: Define ordem sequencial dos assuntos
- **Cálculo de Estatísticas**: Calcula capacidade vs carga de vídeos
- **Persistência no Firestore**: Salva planejamentos na nuvem (por usuário)
- **Múltiplos Planejamentos**: Suporta múltiplos planejamentos salvos

### 5. Cronograma de Estudo
- **Geração Automática**: Gera cronograma a partir do planejamento
- **Distribuição Balanceada**: Distribui vídeos pelos dias respeitando capacidade
- **Divisão de Vídeos Longos**: Divide vídeos longos em partes quando necessário
- **Intercalação de Assuntos**: Opção de intercalar assuntos (round-robin)
- **Visualização por Semana**: Agrupa dias por semana
- **Filtros**: Filtra por dias futuros e itens não concluídos
- **Progresso Visual**: Mostra progresso de cada dia e item

### 6. Dashboard
- **Estatísticas Gerais**: Total de vídeos, assistidos, horas
- **Progresso por Assunto**: Breakdown detalhado por assunto
- **Filtros**: Visualiza estatísticas totais ou por planejamento
- **Export/Import**: Gerencia progresso com export/import

## 📊 Estrutura de Dados

### VideoFile
```typescript
interface VideoFile {
  name: string;                    // Nome do arquivo
  sizeBytes: number;               // Tamanho em bytes
  webkitRelativePath: string;      // Caminho relativo completo
  folderPath: string;              // Caminho do diretório
  subject: string;                 // Assunto inferido
  videoId: string;                 // ID estável (hash)
  file?: File;                     // Objeto File (não persistido)
  available?: boolean;             // Se arquivo está disponível
}
```

### VideoProgress
```typescript
interface VideoProgress {
  watched: boolean;                // Se foi marcado como assistido
  lastPosition: number;             // Última posição (segundos)
  watchedSeconds: number;           // Maior valor assistido (segundos)
  duration: number | null;          // Duração total (segundos)
  updatedAt: number;               // Timestamp da última atualização
}
```

### PlannerSettings
```typescript
interface PlannerSettings {
  id?: string;                     // ID único (Firestore)
  name?: string;                    // Nome do planejamento
  startDateISO: string;             // Data de início (YYYY-MM-DD)
  endDateISO: string;               // Data de fim (YYYY-MM-DD)
  allowedWeekdays: number[];       // Dias permitidos [0..6]
  hoursPerWeekday: { [weekday: number]: number }; // Horas por dia
  selectedSubjects: string[];      // Assuntos selecionados
  subjectOrder: string[];          // Ordem dos assuntos
  createdAt?: string;              // ISO timestamp
  updatedAt?: string;              // ISO timestamp
}
```

### Schedule
```typescript
interface Schedule {
  plannerId: string;               // ID do planejamento
  planInput: PlanInput;            // Input usado para gerar
  settings: ScheduleSettings;      // Configurações
  days: ScheduleDay[];             // Dias do cronograma
  generatedAt: string;             // ISO timestamp
  version: string;                 // Versão do formato
}
```

## 🔄 Fluxos Principais

### 1. Carregamento Inicial da Biblioteca

1. Usuário seleciona pasta com vídeos
2. `LibraryConnector` processa arquivos usando `processVideoFiles()`
3. Cria objetos `VideoFile` com `createVideoFile()`
4. Infere assunto usando `inferSubject()` (baseado na estrutura de pastas)
5. Gera `videoId` usando hash FNV-1a do caminho + tamanho
6. Salva metadados no `localStorage` (sem objetos File)
7. Carrega durações em background usando `loadVideoDurations()`

### 2. Reconexão de Biblioteca

1. Usuário clica em "Reconectar"
2. Seleciona pasta novamente
3. Sistema cria mapa de `videoId -> File`
4. Atualiza vídeos existentes com novos objetos File
5. Marca vídeos não encontrados como `available: false`
6. Salva estado atualizado no `localStorage`

### 3. Assistir Vídeo

1. Usuário clica em vídeo na lista
2. `VideoLibrary` atualiza `selectedVideo` e `selectedVideoStartTime`
3. `VideoPlayer` cria URL do objeto usando `URL.createObjectURL()`
4. Player carrega vídeo e atualiza progresso via `onTimeUpdate`
5. Progresso é salvo no `localStorage` com throttle (1 segundo)
6. Ao terminar, marca como `watched: true` automaticamente

### 4. Criar Planejamento

1. Usuário preenche dados no `StudyPlanner`:
   - Nome, período, dias da semana, horas por dia
   - Seleciona assuntos e define ordem
2. Sistema calcula estatísticas usando `calculatePlannerStats()`
3. Usuário salva planejamento
4. Sistema salva no Firestore via `savePlannerToFirestore()`
5. Cronograma é gerado automaticamente via `generateSchedule()`
6. Cronograma é salvo no `localStorage` via `saveSchedule()`

### 5. Geração de Cronograma

1. Sistema recebe `PlanInput` com:
   - Dias de estudo (`buildStudyDays()`)
   - Vídeos selecionados
   - Ordem de assuntos
   - Configurações (intercalar, dividir vídeos longos)
2. `generateSchedule()` distribui vídeos pelos dias:
   - Respeita ordem de assuntos
   - Balanceia carga por dia
   - Divide vídeos longos se necessário
   - Intercala assuntos se configurado
3. Retorna `Schedule` com todos os dias e itens
4. Salva no `localStorage`

### 6. Visualização de Cronograma

1. `ScheduleCalendar` carrega `Schedule` do estado
2. Agrupa dias por semana usando `groupDaysByWeek()`
3. Calcula progresso de cada item usando `calculateItemProgress()`
4. Aplica filtros (futuros, não concluídos)
5. Renderiza visualização por semana
6. Permite clicar em item para assistir (com tempo inicial se for parte)

## 💾 Persistência

### localStorage

**Chaves:**
- `videoLibraryIndex`: Metadados da biblioteca (sem objetos File)
- `videoLibraryProgress`: Progresso dos vídeos
- `studyPlannerStats`: Estatísticas do planejamento
- `studyPlannerInput`: Input do planejamento (para geração)
- `studySchedule`: Cronograma gerado

### Firestore

**Coleção:** `users/{userId}/studyPlanners`

**Estrutura:**
- Documentos por planejamento (ID gerado)
- Campos: name, startDateISO, endDateISO, allowedWeekdays, hoursPerWeekday, selectedSubjects, subjectOrder, createdAt, updatedAt

## 🔧 Utilitários Principais

### videoLibraryUtils.ts
- `isVideoFile()`: Verifica se arquivo é vídeo
- `extractFolderPath()`: Extrai caminho do diretório
- `findMp4Version()`: Encontra versão .mp4 de arquivo .ts
- `processVideoFiles()`: Processa arquivos priorizando .mp4
- `inferSubject()`: Infere assunto do caminho
- `createVideoFile()`: Cria objeto VideoFile
- `formatBytes()`: Formata bytes para legível
- `groupVideosBySubject()`: Agrupa vídeos por assunto

### videoProgress.ts
- `loadProgress()`: Carrega progresso do localStorage
- `saveProgress()`: Salva progresso (com throttle)
- `getVideoProgress()`: Obtém ou cria progresso
- `updateVideoProgress()`: Atualiza progresso
- `calculateProgressStats()`: Calcula estatísticas
- `exportProgress()`: Exporta progresso em JSON
- `importProgress()`: Importa progresso de JSON
- `resetProgress()`: Reseta todo o progresso

### studyPlannerUtils.ts
- `estimateDurationSeconds()`: Estima duração por tamanho
- `buildStudyDays()`: Constrói lista de dias de estudo
- `computeCapacity()`: Calcula capacidade total
- `calculatePlannerStats()`: Calcula estatísticas do planejamento
- `generatePlanInput()`: Gera input para cronograma

### scheduleGenerator.ts
- `generateSchedule()`: Gera cronograma completo
- `splitVideoIntoParts()`: Divide vídeo longo em partes
- `generateSequentialSchedule()`: Gera cronograma sequencial
- `generateIntercalatedSchedule()`: Gera cronograma intercalado

### plannerFirestore.ts
- `loadPlannersFromFirestore()`: Carrega lista de planejamentos
- `loadPlannerFromFirestore()`: Carrega planejamento específico
- `savePlannerToFirestore()`: Salva planejamento
- `deletePlannerFromFirestore()`: Deleta planejamento

## 🎨 Componentes Detalhados

### VideoLibrary.tsx
**Responsabilidades:**
- Orquestra todos os subcomponentes
- Gerencia estado global (videos, progressMap, schedule)
- Controla tabs de navegação (Planejador, Dashboard, Vídeos, Cronograma)
- Carrega dados do localStorage ao montar
- Sincroniza com Firestore para planejamentos
- Gera cronograma automaticamente quando planejamento muda

**Props:** Nenhuma (componente raiz)

**Estado Principal:**
- `videos`: Array de VideoFile
- `progressMap`: Mapa de progresso
- `schedule`: Cronograma atual
- `selectedVideo`: Vídeo selecionado para reprodução
- `activeTab`: Aba ativa
- `selectedPlanner`: Planejamento selecionado

### LibraryConnector.tsx
**Responsabilidades:**
- Seleção de pasta (input file com webkitdirectory)
- Processamento inicial de arquivos
- Reconexão de biblioteca (relink de Files)
- Persistência no localStorage
- Limpeza de biblioteca

**Props:**
- `onLibraryLoaded`: Callback quando biblioteca é carregada
- `onLibraryRelinked`: Callback quando biblioteca é relinkada
- `onClearLibrary`: Callback para limpar biblioteca
- `hasLibrary`: Se já existe biblioteca
- `existingVideos`: Vídeos existentes (para relink)

### VideoPlayer.tsx
**Responsabilidades:**
- Reprodução de vídeo usando elemento `<video>`
- Criação de URL do objeto File
- Atualização de progresso em tempo real
- Botão de continuar de onde parou
- Marcação automática como assistido
- Suporte a tempo inicial (para partes de vídeo)

**Props:**
- `video`: VideoFile selecionado
- `progress`: VideoProgress do vídeo
- `onProgressUpdate`: Callback de atualização
- `startTime`: Tempo inicial em segundos (opcional)

### StudyPlanner.tsx
**Responsabilidades:**
- Interface de configuração de planejamento
- Seleção de período, dias, horas, assuntos
- Ordenação de assuntos
- Cálculo e exibição de estatísticas
- Gerenciamento de múltiplos planejamentos
- Persistência no Firestore

**Props:**
- `videos`: Array de VideoFile
- `progressMap`: Mapa de progresso
- `availableSubjects`: Assuntos disponíveis
- `scheduleSettings`: Configurações de cronograma
- `onScheduleSettingsChange`: Callback de mudança
- `selectedPlannerId`: ID do planejamento selecionado
- `onPlannerChange`: Callback de mudança de planejamento

### ScheduleCalendar.tsx
**Responsabilidades:**
- Visualização de cronograma por semana
- Cálculo de progresso de cada dia e item
- Filtros (futuros, não concluídos)
- Clique em item para assistir
- Renderização de status (concluído, em progresso, não iniciado)

**Props:**
- `schedule`: Cronograma a exibir
- `progressMap`: Mapa de progresso
- `onItemClick`: Callback ao clicar em item
- `onlyFuture`: Mostrar apenas dias futuros
- `onlyUncompleted`: Mostrar apenas não concluídos
- `onOnlyFutureChange`: Callback de mudança de filtro
- `onOnlyUncompletedChange`: Callback de mudança de filtro

### SubjectAccordion.tsx
**Responsabilidades:**
- Exibição de vídeos agrupados por assunto
- Accordion expansível/colapsável
- Badges de status (assistido, em progresso, não iniciado)
- Ordenação natural de vídeos
- Ações de marcar/desmarcar como assistido

**Props:**
- `subject`: Assunto do accordion
- `videos`: Array de vídeos do assunto
- `searchQuery`: Query de busca
- `progressMap`: Mapa de progresso
- `selectedVideoId`: ID do vídeo selecionado
- `onVideoClick`: Callback ao clicar em vídeo
- `onMarkWatched`: Callback para marcar como assistido
- `onMarkUnwatched`: Callback para desmarcar

### SearchAndFilters.tsx
**Responsabilidades:**
- Barra de busca por nome
- Filtro por assunto
- Interface simples e limpa

**Props:**
- `searchQuery`: Query de busca
- `onSearchChange`: Callback de mudança
- `selectedSubject`: Assunto selecionado
- `onSubjectChange`: Callback de mudança
- `availableSubjects`: Assuntos disponíveis

## 🔐 Autenticação

O sistema usa Firebase Authentication para:
- Identificar usuário logado
- Salvar planejamentos no Firestore por usuário
- Carregar planejamentos do usuário ao iniciar

**Requisito:** Usuário deve estar autenticado para usar planejamentos (biblioteca funciona sem autenticação)

## 📝 Notas Técnicas

### IDs Estáveis
- `videoId` é gerado usando hash FNV-1a de `webkitRelativePath + tamanho`
- Garante que mesmo vídeo sempre tenha mesmo ID
- Permite reconexão de biblioteca sem perder progresso

### Throttle de Salvamento
- Progresso é salvo com throttle de 1 segundo
- Evita muitas escritas no localStorage
- Melhora performance durante reprodução

### Carregamento de Durações
- Durações são carregadas em background (máx 5 simultâneos)
- Usa `loadVideoDurations()` que cria elementos `<video>` temporários
- Atualiza progresso quando duração é carregada

### Divisão de Vídeos Longos
- Vídeos maiores que capacidade do dia são divididos em partes
- Cada parte é um `ScheduleItem` com `isPart: true`
- Player inicia no `startSec` da parte ao clicar

### Ordenação Natural
- Usa `naturalSortBy()` para ordenar vídeos
- Garante ordem correta: 1, 2, 3, 10 ao invés de 1, 10, 2, 3

## 🚀 Melhorias Futuras

- [ ] Sincronização de progresso no Firestore
- [ ] Suporte a múltiplas bibliotecas
- [ ] Notificações de lembretes de estudo
- [ ] Anotações por vídeo
- [ ] Busca avançada (por assunto, duração, etc)
- [ ] Estatísticas avançadas (gráficos, tendências)
- [ ] Export de relatórios de progresso
- [ ] Compartilhamento de planejamentos
- [ ] Modo offline completo

## 📚 Referências

- **Next.js 15**: App Router
- **React**: Hooks e Context API
- **TypeScript**: Tipagem completa
- **Firebase**: Authentication e Firestore
- **Tailwind CSS**: Estilização
- **Lucide React**: Ícones

---

## 📋 Sessão de Desenvolvimento - Sistema MetaAdmin e MetaAdminGeral

**Data:** 2025-01-27  
**Foco:** Melhorias no sistema de gestão de pacientes (`/metaadmin` e `/metaadmingeral`)

### 🎯 Objetivos da Sessão

1. **Correção de botão na Pasta 6 (Evolução/Seguimento)** - Versão Desktop
2. **Implementação de estatísticas avançadas** no `/metaadmingeral`
3. **Modais de abandono e conclusão** no `/metaadmin`

---

### ✅ Alterações Implementadas

#### 1. Correção do Botão "Editar dados Iniciais" → "Novo Registro" (Desktop)

**Arquivo:** `app/metaadmin/page.tsx`  
**Localização:** Pasta 6 (Evolução/Seguimento) - Timeline Semanal - Versão Desktop  
**Linha:** ~15795-15827

**Problema:**
- O botão "Editar dados Iniciais" estava abrindo o modal de edição de paciente mobile, o que estava incorreto
- O botão deveria abrir o modal para incluir um novo registro de aplicação

**Solução:**
- Substituído o botão "Editar dados Iniciais" por "Novo Registro"
- Alterado o `onClick` para abrir `showAdicionarSeguimentoModal`
- Limpa o estado `seguimentoEditando` para criar novo registro
- Limpa os campos do `novoSeguimento` antes de abrir o modal
- Ícone alterado de `Edit` para `Syringe` para indicar novo registro de aplicação

**Código Implementado:**
```typescript
<button
  onClick={() => {
    // Limpar seguimento editando para criar novo registro
    setSeguimentoEditando(null);
    setNovoSeguimento({
      peso: '',
      circunferenciaAbdominal: '',
      frequenciaCardiaca: '',
      paSistolica: '',
      paDiastolica: '',
      hba1c: '',
      doseAplicada: '',
      adesao: '',
      giSeverity: '',
      localAplicacao: '',
      observacoesPaciente: '',
      comentarioMedico: ''
    });
    setShowAdicionarSeguimentoModal(true);
  }}
  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
>
  <Syringe size={16} />
  Novo Registro
</button>
```

**Observação:** Alteração aplicada apenas na versão desktop, não afeta a versão mobile.

---

#### 2. Estatísticas Avançadas no `/metaadmingeral`

**Arquivo:** `app/metaadmingeral/page.tsx`

**Funcionalidades Adicionadas:**

##### 2.1. Filtro por Médico para Estatísticas

**Estados Adicionados:**
```typescript
const [filtroMedicoEstatisticas, setFiltroMedicoEstatisticas] = useState<string>('total');
const [filtroDosePerdaPeso, setFiltroDosePerdaPeso] = useState<string>('todas');
const [filtroFaixaEtariaPerdaPeso, setFiltroFaixaEtariaPerdaPeso] = useState<string>('todas');
const [filtroSexoPerdaPeso, setFiltroSexoPerdaPeso] = useState<string>('todos');
```

**Funcionalidade:**
- Dropdown para filtrar estatísticas por médico individual ou "Total" (todos os médicos)
- Filtro aplicado a todas as estatísticas: Demografia, Geografia, Perda de Peso, Abandono

**Lógica de Filtro:**
```typescript
const pacientesFiltrados = filtroMedicoEstatisticas === 'total'
  ? pacientes
  : pacientes.filter(p => p.medicoResponsavelId === filtroMedicoEstatisticas);
```

##### 2.2. Demografia dos Pacientes

**Componentes:**
- **Idade Média:** Cálculo da média de idade dos pacientes filtrados
- **Distribuição por Faixa Etária:** Gráfico de barras mostrando distribuição por grupos:
  - 18-30 anos
  - 31-40 anos
  - 41-50 anos
  - 51-60 anos
  - 61-70 anos
  - 71+ anos
- **Distribuição por Gênero:** Gráfico de pizza (PieChart) mostrando:
  - Masculino
  - Feminino
  - Outros

**Biblioteca:** `recharts` (BarChart, PieChart, Pie, Cell)

##### 2.3. Demografia Geográfica

**Funcionalidade:**
- Lista das Top 5 cidades com mais pacientes
- Mostra quantidade e percentual de pacientes por cidade
- Normalização de nomes de cidades (função `normalizarCidadeEstado`)

##### 2.4. Estatística de Perda de Peso

**Funcionalidade:**
- Média de perda de peso por intervalo de semanas
- Filtros adicionais:
  - **Por Dose:** Todas, 2.5mg, 5mg, 7.5mg, 10mg, 12.5mg, 15mg
  - **Por Faixa Etária:** Todas as faixas ou específica
  - **Por Sexo:** Todos, Masculino, Feminino

**Cálculo:**
- Calcula variação de peso entre registros consecutivos
- Agrupa por intervalos de semanas
- Calcula média de perda de peso por intervalo

##### 2.5. Ranking de Motivos por Abandono

**Funcionalidade:**
- Lista os Top 10 motivos de abandono de tratamento
- Mostra quantidade e percentual de cada motivo
- Dados vêm do campo `motivoAbandono` dos pacientes com status "abandono"

**Fonte de Dados:** `MOTIVOS_ABANDONO_TRATAMENTO` do tipo `SolicitacaoMedico`

---

#### 3. Modais de Abandono e Conclusão no `/metaadmin`

**Arquivo:** `app/metaadmin/page.tsx`

##### 3.1. Modal de Abandono

**Funcionalidade:**
- Ao mudar status do paciente para "Abandono" (tanto desktop quanto mobile), abre modal
- Permite ao médico selecionar motivo do abandono
- Salva o motivo junto com a atualização do status

**Estados Adicionados:**
```typescript
const [showModalAbandonoMedico, setShowModalAbandonoMedico] = useState(false);
const [motivoAbandonoMedico, setMotivoAbandonoMedico] = useState<string>('');
const [statusAnteriorAntesAbandono, setStatusAnteriorAntesAbandono] = useState<string>('');
```

**Integração:**
- Modificado `onChange` dos dropdowns de status (desktop e mobile)
- Quando status muda para 'abandono', salva status anterior e abre modal
- Usa `PacienteService.moverParaAbandono()` para salvar motivo

**Opções de Motivo:**
- Lista completa de `MOTIVOS_ABANDONO_TRATAMENTO`
- Inclui opções como: "Efeitos colaterais", "Custo", "Falta de resultados", etc.

##### 3.2. Modal de Conclusão

**Funcionalidade:**
- Ao mudar status do paciente para "Concluído" (tanto desktop quanto mobile), abre modal
- Permite ao médico inserir dados finais:
  - **Peso Final**
  - **Circunferência Abdominal**
  - **HbA1c Final**

**Estados Adicionados:**
```typescript
const [showModalConclusaoMedico, setShowModalConclusaoMedico] = useState(false);
const [dadosConclusao, setDadosConclusao] = useState({
  peso: '',
  circunferenciaAbdominal: '',
  hba1c: ''
});
const [statusAnteriorAntesConclusao, setStatusAnteriorAntesConclusao] = useState<string>('');
```

**Registro de Semana de Conclusão:**
- O peso final é registrado como uma nova entrada em `evolucaoSeguimento`
- A semana é identificada como "Semana de Conclusão"
- Calcula a variação do peso final em relação ao peso inicial
- Exemplo: Se paciente tem 6 semanas, a semana 7 será "Semana de Conclusão"

**Cálculo de Variação:**
```typescript
const pesoInicial = pacienteEditando?.dadosClinicos?.medidasIniciais?.peso || 0;
const pesoFinal = parseFloat(dadosConclusao.peso);
const variacaoPeso = pesoFinal - pesoInicial;
```

**Integração:**
- Modificado `onChange` dos dropdowns de status (desktop e mobile)
- Quando status muda para 'concluido', salva status anterior e abre modal
- Usa `PacienteService.createOrUpdatePaciente()` para salvar dados
- Adiciona novo registro em `evolucaoSeguimento` com:
  - `weekIndex`: Próximo índice disponível
  - `peso`: Peso final
  - `circunferenciaAbdominal`: Circunferência final
  - `hba1c`: HbA1c final
  - `variacaoPeso`: Variação calculada
  - `isConclusao`: true (flag para identificar semana de conclusão)

---

### 🔧 Detalhes Técnicos

#### Bibliotecas Utilizadas

- **recharts:** Para gráficos (BarChart, PieChart, LineChart)
- **lucide-react:** Para ícones (Syringe, UserIcon, etc.)
- **Firebase/Firestore:** Para persistência de dados
- **TypeScript:** Tipagem completa

#### Estrutura de Dados

**Paciente (evolucaoSeguimento):**
```typescript
interface EvolucaoSeguimento {
  weekIndex: number;
  peso?: number;
  circunferenciaAbdominal?: number;
  hba1c?: number;
  variacaoPeso?: number;
  isConclusao?: boolean;
  // ... outros campos
}
```

**Filtros de Estatísticas:**
```typescript
interface FiltrosEstatisticas {
  medico: string; // 'total' ou ID do médico
  dose: string; // 'todas' ou dose específica
  faixaEtaria: string; // 'todas' ou faixa específica
  sexo: string; // 'todos', 'M', 'F'
}
```

#### Funções Utilitárias

- `normalizarCidadeEstado()`: Normaliza nomes de cidades para agrupamento
- `calcularIdade()`: Calcula idade a partir da data de nascimento
- `calcularFaixaEtaria()`: Categoriza idade em faixas
- `calcularPerdaPesoPorIntervalo()`: Calcula média de perda de peso por intervalo

---

### 🐛 Problemas Resolvidos

#### 1. ReferenceError durante SSR

**Problema:**
- Erros `ReferenceError: Cannot access 'rc' before initialization` (e similares)
- Ocorriam durante Server-Side Rendering (SSR) do Next.js

**Solução:**
- Adicionado `export const dynamic = 'force-dynamic'` no topo do arquivo
- Garante renderização dinâmica e evita problemas de build estático

#### 2. Botão Incorreto na Pasta 6

**Problema:**
- Botão "Editar dados Iniciais" abria modal errado
- Deveria abrir modal de novo registro de aplicação

**Solução:**
- Substituído botão e funcionalidade
- Agora abre corretamente o modal de adicionar seguimento

---

### 📝 Notas Importantes

1. **Apenas Desktop:** A correção do botão na Pasta 6 foi aplicada apenas na versão desktop
2. **Filtros Independentes:** Os filtros de estatísticas são independentes e podem ser combinados
3. **Persistência:** Todos os dados são salvos no Firestore via `PacienteService`
4. **Validação:** Modais incluem validação de campos obrigatórios
5. **Feedback Visual:** Modais mostram mensagens de sucesso/erro após salvar

---

### 🚀 Próximos Passos Sugeridos

- [ ] Adicionar exportação de estatísticas em PDF/Excel
- [ ] Adicionar gráficos de tendência temporal
- [ ] Implementar comparação entre médicos
- [ ] Adicionar filtros de data para estatísticas
- [ ] Melhorar visualização de dados geográficos (mapa)

---

**Última atualização:** 2025-01-27
