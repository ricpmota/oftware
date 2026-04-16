# Estrutura Completa da Página /metanutri 📋

## Visão Geral

A página `/metanutri` é a interface principal para nutricionistas no sistema Oftware. Ela fornece uma visão completa dos pacientes compartilhados, médicos vinculados, funcionalidades financeiras, calendário de aplicações e muito mais.

**Arquivo:** `app/metanutri/page.v2.tsx`  
**Tipo:** Componente React Client-Side (`'use client'`)  
**Framework:** Next.js 13+ (App Router)

---

## Estrutura de Navegação

### Menu Lateral (Sidebar)

**Tipo:** `MenuNutri = 'home' | 'medicos' | 'pacientes' | 'financeiro' | 'calendario' | 'meu-perfil'`

**Itens do Menu:**
1. **Home** (`home`) - Ícone: `Home`
2. **Médicos** (`medicos`) - Ícone: `Stethoscope`
3. **Pacientes** (`pacientes`) - Ícone: `Users`
4. **Financeiro** (`financeiro`) - Ícone: `DollarSign`
5. **Calendário** (`calendario`) - Ícone: `Calendar`
6. **Meu Perfil** (`meu-perfil`) - Ícone: `UserCircle`

**Estados:**
```typescript
const [activeMenu, setActiveMenu] = useState<MenuNutri>('home');
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
const [isMobile, setIsMobile] = useState(false);
```

---

## Seções da Página

### 1. Home (`case 'home':`)

**Funcionalidades:**
- KPIs principais (cards de métricas)
- Gráficos de perda de peso
- Estatísticas demográficas
- Filtros avançados

#### KPIs Principais

```typescript
const [pacientesCompartilhados, setPacientesCompartilhados] = useState(0);
const [medicosVinculados, setMedicosVinculados] = useState(0);
const [receitaTotal, setReceitaTotal] = useState(0);
const [receitaMes, setReceitaMes] = useState(0);
```

**Cards de KPI:**
1. **Pacientes Compartilhados:** Total de pacientes visíveis
2. **Médicos Vinculados:** Total de médicos vinculados
3. **Receita Total:** Soma de todos os pagamentos recebidos
4. **Receita do Mês:** Receita do mês atual

#### Gráficos

- **Gráfico de Perda de Peso:** Média de perda por semana
- **Gráfico Demográfico:** Distribuição por idade, sexo, etc.
- **Filtros:** Base (meus/oftware), dose, faixa etária, sexo

**Componentes:**
- `LineChart`, `AreaChart`, `PieChart` (Recharts)
- `ProgressPill`
- `LabRangeBar`

---

### 2. Médicos (`case 'medicos':`)

**Funcionalidades:**
- Buscar médicos disponíveis
- Gerenciar solicitações de vínculo
- Visualizar médicos vinculados
- Ver pacientes compartilhados por médico

#### Abas

```typescript
const [abaAtivaMedicos, setAbaAtivaMedicos] = useState<'buscar' | 'solicitacoes' | 'vinculados'>('buscar');
```

1. **Buscar:** Buscar médicos por estado/cidade
2. **Solicitações:** Solicitações de vínculo recebidas/enviadas
3. **Vinculados:** Lista de médicos já vinculados

#### Funcionalidades

- **Busca por Localização:**
  - Seleção de estado
  - Seleção de cidade (dependente do estado)
  - Lista de médicos disponíveis
  - Botão para enviar solicitação de vínculo

- **Solicitações:**
  - Recebidas: Aceitar/Rejeitar
  - Enviadas: Cancelar
  - Status: Pendente, Aceita, Rejeitada, Cancelada

- **Médicos Vinculados:**
  - Lista com contagem de pacientes
  - Expandir para ver pacientes compartilhados
  - Botão para excluir vínculo

**Estados:**
```typescript
const [medicosList, setMedicosList] = useState<Array<{...}>>([]);
const [medicosDisponiveis, setMedicosDisponiveis] = useState<Medico[]>([]);
const [solicitacoesVinculo, setSolicitacoesVinculo] = useState<SolicitacaoVinculoNutriMedicoDoc[]>([]);
const [solicitacoesVinculoRecebidas, setSolicitacoesVinculoRecebidas] = useState<SolicitacaoVinculoNutriMedicoDoc[]>([]);
const [medicoExpandidoId, setMedicoExpandidoId] = useState<string | null>(null);
const [pacientesPorMedico, setPacientesPorMedico] = useState<Map<string, Array<{...}>>>(new Map());
```

---

### 3. Pacientes (`case 'pacientes':`)

**Funcionalidades:**
- Lista de pacientes compartilhados
- Cards mobile e tabela desktop
- Filtros e busca
- Ações rápidas por paciente

#### Versão Desktop (Tabela)

- Colunas: Nome, Status, Pagamento, Perda de Peso, Ações
- Ordenação: Por nome, status, etc.
- Ações: Visualizar, Editar, etc.

#### Versão Mobile (Cards)

**Ver documentação completa:** `CARD_PACIENTE_MOBILE_METANUTRI.md`

**Características principais:**
- Barra de progresso de semanas no topo
- Avatar IMC dinâmico
- Badges de status múltiplos
- 7 botões de ação centralizados
- Barra de IMC interativa
- Detalhes expandíveis
- Lista de aplicações expandível

**Estados:**
```typescript
const [pacientesVisiveis, setPacientesVisiveis] = useState<PacienteVisivelNutri[]>([]);
const [loadingPacientesList, setLoadingPacientesList] = useState(false);
const [buscaPaciente, setBuscaPaciente] = useState('');
const [pacienteCardExpandido, setPacienteCardExpandido] = useState<string | null>(null);
const [pacienteDetalhesExpandido, setPacienteDetalhesExpandido] = useState<string | null>(null);
```

**Filtros:**
- Busca por nome
- Filtro por status de tratamento
- Filtro por status de pagamento

---

### 4. Financeiro (`case 'financeiro':`)

**Funcionalidades:**
- Resumo financeiro (cards de totais)
- Tabela de pacientes com pagamentos
- Filtros de busca e status
- Modal de gerenciamento de pagamento

#### Cards de Resumo

1. **Receitas Recebidas:** Total pago
2. **Em Aberto:** Total pendente
3. **Total Previsto:** Total negociado

#### Tabela

**Colunas:**
- Descrição/Cliente
- Valor Total
- Pago
- Em Aberto
- Status
- Ações

**Filtros:**
- Busca por nome do paciente
- Filtro por status de pagamento (todos, pago, em aberto, parcial, negociação)

**Estados:**
```typescript
const [buscaPacienteFinanceiro, setBuscaPacienteFinanceiro] = useState<string>('');
const [filtroStatusPagamentoFinanceiro, setFiltroStatusPagamentoFinanceiro] = useState<string>('todos');
const [showModalPagamento, setShowModalPagamento] = useState(false);
const [pacientePagamentoSelecionado, setPacientePagamentoSelecionado] = useState<PacienteCompleto | null>(null);
const [dadosPagamento, setDadosPagamento] = useState<PagamentoPaciente>({...});
```

#### Modal de Pagamento

**Funcionalidades:**
- Editar status de pagamento
- Definir forma de pagamento
- Gerenciar valores (total, pago, pendente)
- Gerenciar parcelas
- Adicionar observações

---

### 5. Calendário (`case 'calendario':`)

**Funcionalidades:**
- Visualização mensal de aplicações
- Cálculo automático de aplicações baseado no plano terapêutico
- Destaque de dias com aplicações
- Modal de detalhes do dia

#### Cálculo de Aplicações

**Baseado em:**
- `planoTerapeutico.startDate`: Data de início
- `planoTerapeutico.injectionDayOfWeek`: Dia da semana (dom, seg, ter, etc.)
- `planoTerapeutico.numeroSemanasTratamento`: Número de semanas
- `planoTerapeutico.semanasCanceladas`: Semanas canceladas
- `planoTerapeutico.currentDoseMg`: Dose atual

**Lógica:**
- Calcula todas as aplicações previstas
- Considera atrasos de 4+ dias (reinicia ciclo de dose)
- Rotaciona locais de aplicação (abdome, coxa, braço)
- Filtra por mês selecionado

**Estados:**
```typescript
const [mesCalendario, setMesCalendario] = useState(new Date());
const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
const [aplicacoesDiaSelecionado, setAplicacoesDiaSelecionado] = useState<Array<{...}>>([]);
```

---

### 6. Meu Perfil (`case 'meu-perfil':`)

**Funcionalidades:**
- Editar perfil do nutricionista
- Gerenciar registro profissional (CRN)
- Adicionar/remover cidades de atendimento
- Gerar link de referral
- Ver status de verificação

**Estados:**
```typescript
const [showPerfilModal, setShowPerfilModal] = useState(false);
const [registroNumero, setRegistroNumero] = useState('');
const [cidadesSelecionadas, setCidadesSelecionadas] = useState<{ estado: string; cidade: string }[]>([]);
const [estadoSelecionado, setEstadoSelecionado] = useState('');
const [cidadeSelecionada, setCidadeSelecionada] = useState('');
```

**Funcionalidades:**
- Edição de CRN
- Seleção de cidades (estado → cidade)
- Link de referral para médicos
- Status de verificação (verificado/não verificado)

---

## Modais

### 1. Modal de Prescrições

**Trigger:** Botão "Prescrições" (roxo) no card do paciente

**Estrutura:**
- Modal tela cheia (mobile-first)
- Header com nome do paciente
- Tabs: "Prescrições Salvas" e "Descrição"
- Lista agrupada por subtipo
- Editor completo de prescrição
- Geração de PDF

**Estados:**
```typescript
const [showModalPrescricoes, setShowModalPrescricoes] = useState(false);
const [pacientePrescricoesSelecionado, setPacientePrescricoesSelecionado] = useState<PacienteCompleto | null>(null);
const [prescricoesModal, setPrescricoesModal] = useState<Prescricao[]>([]);
const [prescricaoSelecionadaModal, setPrescricaoSelecionadaModal] = useState<Prescricao | null>(null);
const [abaPrescricoesModal, setAbaPrescricoesModal] = useState<'salvas' | 'descricao'>('salvas');
```

**Ver documentação:** `MODAIS_PRESCRICOES_PERSONAL_METANUTRI_IMPLEMENTADOS.md`

---

### 2. Modal de Personal Trainer

**Trigger:** Botão "Personal Trainer" (rosa/cinza) no card do paciente

**Estrutura:**
- Modal responsivo
- Seção de compartilhamento
- Calendário de treinos
- Busca de personal trainers

**Estados:**
```typescript
const [showModalPersonal, setShowModalPersonal] = useState(false);
const [pacientePersonalSelecionado, setPacientePersonalSelecionado] = useState<PacienteCompleto | null>(null);
const [personalTrainersElegiveis, setPersonalTrainersElegiveis] = useState<PersonalTrainerDoc[]>([]);
const [vinculosAtivosPacientePersonal, setVinculosAtivosPacientePersonal] = useState<any[]>([]);
```

**Componente:**
- `CalendarioTreinosPersonal` com props `patientId`, `pacienteId`, `wideRange`

**Ver documentação:** `MODAIS_PRESCRICOES_PERSONAL_METANUTRI_IMPLEMENTADOS.md`

---

### 3. Modal de Exames

**Trigger:** Botão "Exames" (verde) no card do paciente

**Estrutura:**
- Lista de exames por data
- Seleção de data
- Visualização de resultados
- Comparação com valores de referência

**Estados:**
```typescript
const [showModalExames, setShowModalExames] = useState(false);
const [pacienteExamesSelecionado, setPacienteExamesSelecionado] = useState<PacienteCompleto | null>(null);
const [exameDataSelecionada, setExameDataSelecionada] = useState<string>('');
const [secoesExpandidas, setSecoesExpandidas] = useState<Set<string>>(new Set());
```

---

### 4. Modal de Nutrição

**Trigger:** Botão "Nutrição" (amarelo) no card do paciente

**Estrutura:**
- Plano nutricional
- Check-ins
- Estatísticas

**Componente:**
- `NutriContent`

**Estados:**
```typescript
const [showModalNutricao, setShowModalNutricao] = useState(false);
const [pacienteNutricaoSelecionado, setPacienteNutricaoSelecionado] = useState<PacienteCompleto | null>(null);
```

---

### 5. Modal de Visualizar Paciente

**Trigger:** Botão "Editar" (laranja) no card do paciente

**Estrutura:**
- Modal com múltiplas pastas/tabs
- Informações completas do paciente
- Gráficos e evolução
- Edição de dados

**Estados:**
```typescript
const [showVisualizarPacienteModal, setShowVisualizarPacienteModal] = useState(false);
const [pacienteVisualizando, setPacienteVisualizando] = useState<PacienteCompleto | null>(null);
const [pastaAtiva, setPastaAtiva] = useState(1);
```

---

### 6. Modal de Gráficos

**Trigger:** Botão "Gráficos do Paciente" na lista de aplicações

**Estrutura:**
- Gráficos de peso, circunferência, HbA1c, IMC
- Comparação com curva esperada
- Análise de variância

**Estados:**
```typescript
const [showGraficosModal, setShowGraficosModal] = useState(false);
const [pacienteGraficos, setPacienteGraficos] = useState<PacienteCompleto | null>(null);
const [graficoAtivo, setGraficoAtivo] = useState<'peso' | 'circunferencia' | 'hba1c' | 'imc'>('peso');
```

---

### 7. Modal de Pagamento

**Trigger:** Botão de status de pagamento ou "Gerenciar" na tabela financeira

**Estrutura:**
- Formulário de pagamento
- Campos: status, forma, valores, parcelas, observações
- Salvar pagamento

---

## Funções de Carregamento

### 1. loadPacientesList

```typescript
const loadPacientesList = useCallback(async () => {
  // FASE 1: Carregar dados essenciais (rápido)
  const pacientes = await PacienteNutricionistaService.listPacientesVisiveisByNutri(user.uid);
  setPacientesVisiveis(pacientes);
  
  // FASE 2: Carregar dados secundários em background
  loadPagamentos(pacientes.map(p => p.paciente));
}, [user, nutricionista, loadPagamentos]);
```

**Características:**
- Carregamento em duas fases (otimização)
- Renderização imediata dos pacientes
- Pagamentos carregam em background

---

### 2. loadPagamentos

```typescript
const loadPagamentos = useCallback(async (pacientesParaUsar: PacienteCompleto[]) => {
  const pagamentosNutricionista = await PagamentoService.getAllPagamentosNutricionista(user.uid);
  // Filtrar apenas pacientes visíveis
  // ...
}, [nutricionista, user]);
```

**Nota:** Relação nutricionista-paciente (não médico-paciente)

---

### 3. loadMedicosVinculados

```typescript
const loadMedicosVinculados = useCallback(async () => {
  // Buscar vínculos ativos
  // Buscar dados dos médicos
  // Agregar pacientes por médico
  // ...
}, [user, nutricionista]);
```

---

### 4. loadPrescricoesModal

```typescript
const loadPrescricoesModal = useCallback(async (paciente: PacienteCompleto) => {
  await PrescricaoService.criarPrescricoesPadraoGlobais();
  const [templates, prescricoesNutri] = await Promise.all([
    PrescricaoService.getPrescricoesTemplate(),
    PrescricaoService.getPrescricoesByMedico(nutricionista.userId)
  ]);
  // ...
}, [nutricionista]);
```

**Nota:** Usa `nutricionista.userId` como `medicoId`

---

### 5. loadPersonalTrainersElegiveis

```typescript
const loadPersonalTrainersElegiveis = useCallback(async () => {
  const todosPersonais = await PersonalTrainerService.getAllPersonalTrainers();
  // Filtrar: verificados e ativos
  // Extrair estados e cidades
  // ...
}, [nutricionista]);
```

**Nota:** Não filtra por vínculo (não há campo `nutricionistaVinculadoIds`)

---

### 6. Carregamento de Pacientes com Treinos

```typescript
useEffect(() => {
  // Processa em batches de 10
  // Tenta múltiplos IDs: userId, prefixo do userId, id
  // Usa trainingSessionService.getPatientSessions
  // Atualiza pacientesComTreinos Set
}, [activeMenu, pacientesVisiveis]);
```

**Lógica:**
- Tenta `userId` primeiro
- Se `userId` tem formato `uid_timestamp`, tenta prefixo
- Tenta `id` como fallback
- Range de datas: 2020-01-01 a 2030-12-31

---

## Funções Auxiliares

### 1. Funções de Prescrições

```typescript
// Determina subtipo da prescrição
function getSubtipoPrescricao(p: { nome?: string; descricao?: string; observacoes?: string }): PrescricaoSubtipo

// Agrupa prescrições por subtipo
function groupBySubtipo<T>(arr: T[]): Array<{ subtipo: PrescricaoSubtipo; items: T[] }>

// Remove prefixo "SUBTIPO — " do nome
function getTituloExibicao(nome: string): string
```

### 2. Funções de IMC

```typescript
// Calcula grau de obesidade
const calcularGrauObesidade = (imc: number | null | undefined): string | null

// Retorna cor do grau de obesidade
const getCorGrauObesidade = (grau: string | null): string
```

### 3. Handlers

```typescript
// Visualizar paciente
const handleVisualizarPaciente = (paciente: PacienteCompleto) => {
  setPacienteVisualizando(paciente);
  setPastaAtiva(1);
  setShowVisualizarPacienteModal(true);
};

// Cancelar compartilhamento
const handleCancelarCompartilhamento = async (item: PacienteVisivelNutri) => {
  // Confirmação
  // Chamar SolicitacaoNutricionistaService.endCompartilhamento
  // Recarregar lista
};
```

---

## Estados Globais

### Autenticação

```typescript
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);
const [nutricionista, setNutricionista] = useState<NutricionistaDoc | null>(null);
```

### Navegação

```typescript
const [activeMenu, setActiveMenu] = useState<MenuNutri>('home');
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
const [isMobile, setIsMobile] = useState(false);
```

### Dados Principais

```typescript
const [pacientesVisiveis, setPacientesVisiveis] = useState<PacienteVisivelNutri[]>([]);
const [medicosList, setMedicosList] = useState<Array<{...}>>([]);
const [pagamentosPacientes, setPagamentosPacientes] = useState<Record<string, PagamentoPaciente>>({});
```

---

## Serviços Utilizados

```typescript
import { NutricionistaService } from '@/services/nutricionistaService';
import { PacienteNutricionistaService } from '@/services/pacienteNutricionistaService';
import { PagamentoService } from '@/services/pagamentoService';
import { MedicoService } from '@/services/medicoService';
import { PrescricaoService } from '@/services/prescricaoService';
import { PersonalTrainerService } from '@/services/personalTrainerService';
import { SolicitacaoNutricionistaService } from '@/services/solicitacaoNutricionistaService';
import { SolicitacaoVinculoNutriMedicoService } from '@/services/solicitacaoVinculoNutriMedicoService';
import { SolicitacaoPersonalTrainerService } from '@/services/solicitacaoPersonalTrainerService';
import { trainingSessionService } from '@/services/trainingSessionService';
import { PacienteService } from '@/services/pacienteService';
```

---

## Componentes Externos

```typescript
import KpiCard from '@/components/KpiCard';
import ProgressPill from '@/components/ProgressPill';
import LabRangeBar from '@/components/LabRangeBar';
import TrendLine from '@/components/TrendLine';
import NutriContent from '@/components/NutriContent';
import CalendarioTreinosPersonal from '@/components/CalendarioTreinosPersonal';
```

---

## Bibliotecas Externas

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
```

---

## Responsividade

### Breakpoints

- **Mobile:** `< lg` (1024px)
- **Desktop:** `>= lg` (1024px)

### Comportamento

- **Sidebar:** Colapsável em mobile
- **Cards:** Apenas mobile (`lg:hidden`)
- **Tabelas:** Apenas desktop (`hidden lg:block`)
- **Modais:** Adaptados para mobile e desktop

---

## Fluxo de Autenticação

```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      setUser(user);
      const nutri = await NutricionistaService.getNutricionistaByUserId(user.uid);
      setNutricionista(nutri);
    } else {
      router.push('/login');
    }
    setLoading(false);
  });
  return () => unsubscribe();
}, [router]);
```

---

## Carregamento de Dados por Seção

### Home
- `loadKPIs()` → Carrega pacientes, médicos, pagamentos

### Médicos
- `loadMedicosVinculados()` → Carrega médicos vinculados
- `loadEstadosCidadesMedicosDisponiveis()` → Carrega estados/cidades
- `loadSolicitacoesVinculo()` → Carrega solicitações enviadas
- `loadSolicitacoesVinculoRecebidas()` → Carrega solicitações recebidas

### Pacientes
- `loadPacientesList()` → Carrega pacientes visíveis
- `loadPagamentos()` → Carrega pagamentos (background)
- `useEffect` → Carrega pacientes com treinos

### Financeiro
- `loadPacientesList()` → Carrega pacientes
- `loadPagamentos()` → Carrega pagamentos

### Calendário
- `loadPacientesList()` → Carrega pacientes
- Cálculo de aplicações é feito localmente

---

## Notas de Implementação

### Diferenças do `/metaadmin`

1. **Contexto:** Nutricionista vs Médico
2. **Pagamentos:** Relação nutricionista-paciente
3. **Prescrições:** Usa `nutricionista.userId` como `medicoId`
4. **Personal Trainer:** Não filtra por vínculo com nutricionista
5. **Barra de IMC:** Interativa com arraste (única do `/metanutri`)

### Otimizações

1. **Carregamento em duas fases:** Dados essenciais primeiro, secundários em background
2. **Batching:** Processamento em lotes (treinos, pacientes)
3. **Memoização:** `useCallback` para funções de carregamento
4. **Lazy loading:** Modais carregam apenas quando abertos

### Limitações Conhecidas

1. **Personal Trainer:** Sistema atual não tem campo `nutricionistaVinculadoIds`
2. **Prescrições:** Usa `medicoId` no sistema, mas preenche com `nutricionista.userId`
3. **Mensagens não lidas:** Estado existe mas lógica de carregamento não implementada

---

## Estrutura de Arquivos Relacionados

```
app/metanutri/
  └── page.v2.tsx (componente principal)

services/
  ├── nutricionistaService.ts
  ├── pacienteNutricionistaService.ts
  ├── pagamentoService.ts
  ├── prescricaoService.ts
  ├── personalTrainerService.ts
  ├── solicitacaoNutricionistaService.ts
  ├── solicitacaoVinculoNutriMedicoService.ts
  ├── solicitacaoPersonalTrainerService.ts
  └── trainingSessionService.ts

components/
  ├── KpiCard.tsx
  ├── ProgressPill.tsx
  ├── LabRangeBar.tsx
  ├── TrendLine.tsx
  ├── NutriContent.tsx
  └── CalendarioTreinosPersonal.tsx

types/
  ├── obesidade.ts (PacienteCompleto)
  ├── pagamento.ts (PagamentoPaciente)
  └── prescricao.ts (Prescricao)

features/
  ├── metaNutri/
  │   ├── metaNutri.types.ts
  │   └── metaNutri.constants.ts
  └── metaPersonal/
      ├── metaPersonal.types.ts
      └── metaPersonal.constants.ts
```

---

## Conclusão

A página `/metanutri` é uma interface completa e robusta para nutricionistas, com:

- ✅ 6 seções principais (Home, Médicos, Pacientes, Financeiro, Calendário, Perfil)
- ✅ Cards mobile ricos em funcionalidades
- ✅ Múltiplos modais especializados
- ✅ Integração com diversos serviços
- ✅ Gráficos e visualizações
- ✅ Sistema de filtros avançados
- ✅ Responsividade completa

Todas essas funcionalidades trabalham juntas para fornecer uma experiência completa de gerenciamento de pacientes e relacionamento com médicos.
