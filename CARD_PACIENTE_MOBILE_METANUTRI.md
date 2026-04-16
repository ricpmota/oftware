# Card de Paciente Mobile - /metanutri 📱

## Visão Geral

Este documento descreve em detalhes o card de paciente na versão mobile da página `/metanutri` (nutricionista). O card é renderizado dentro de um loop que mapeia `pacientesVisiveis` (array de `PacienteVisivelNutri`).

**Localização no código:** `app/metanutri/page.v2.tsx`, linha ~4505 (dentro de `case 'pacientes':`)

---

## Estrutura Geral do Card

### Container Principal

```tsx
<div key={item.pacienteId} className={`shadow rounded-lg transition-all overflow-hidden ${
  isSelecionado 
    ? 'p-[2px] bg-gradient-to-r from-purple-500 to-orange-500' 
    : 'border border-gray-200 bg-white'
}`}>
  <div className={`rounded-lg ${isSelecionado ? 'bg-white' : ''}`}>
    {/* Conteúdo do card */}
  </div>
</div>
```

**Características:**
- **Borda dinâmica:** Quando selecionado (`isSelecionado`), mostra gradiente roxo-laranja de 2px
- **Estado de seleção:** `isSelecionado = isExpanded || isDetalhesExpandido`
- **Sombra:** `shadow rounded-lg`
- **Overflow:** `overflow-hidden` para conter elementos internos

---

## Componentes do Card (de cima para baixo)

### 1. Barra de Progresso Superior (Semanas de Aplicação)

**Localização:** Topo absoluto do card, antes do padding

```tsx
<div className="w-full rounded-t-lg relative overflow-hidden bg-gray-100">
  {/* Barra de progresso (1.5px de espessura) */}
  <div
    className={`absolute left-0 top-0 transition-all duration-300 ${
      totalSemanas > 0
        ? (semanasAplicadas / totalSemanas) >= 1
          ? 'bg-green-500 rounded-full'
          : (semanasAplicadas / totalSemanas) >= 0.5
          ? 'bg-blue-500'
          : 'bg-amber-500'
        : 'bg-gray-200 rounded-full'
    }`}
    style={{
      width: totalSemanas > 0
        ? `${Math.min((semanasAplicadas / totalSemanas) * 100, 100)}%`
        : '100%',
      height: '1.5px'
    }}
  />
  {/* Texto centralizado */}
  <div className="relative z-10 py-0.5 text-center text-xs font-semibold text-gray-700">
    {totalSemanas > 0 ? `${semanasAplicadas} de ${totalSemanas}` : '–'}
  </div>
</div>
```

**Características:**
- **Altura:** 1.5px (barra de progresso)
- **Cores dinâmicas:**
  - Verde: `>= 100%` completo
  - Azul: `>= 50%` e `< 100%`
  - Amarelo: `< 50%`
  - Cinza: sem semanas definidas
- **Texto:** Centralizado, mostra "X de Y" ou "–"
- **Fundo:** `bg-gray-100`
- **Posicionamento:** `absolute` para a barra, `relative z-10` para o texto

**Cálculo de semanas:**
```tsx
const planoTerapeutico = paciente.planoTerapeutico;
const totalSemanas = planoTerapeutico?.numeroSemanasTratamento || 0;
const semanasAplicadas = evolucao.filter(reg => {
  if (reg.doseAplicada && reg.doseAplicada.quantidade > 0) return true;
  if (reg.adherence && reg.adherence !== 'MISSED') return true;
  if (reg.adesao && reg.adesao !== 'esquecida') return true;
  if ((reg.peso && reg.peso > 0) || 
      (reg.circunferenciaAbdominal && reg.circunferenciaAbdominal > 0) ||
      (reg.hba1c && reg.hba1c > 0)) return true;
  return false;
}).length;
```

---

### 2. Cabeçalho do Card

**Estrutura:** Flex horizontal com informações do paciente à esquerda e botão de expandir à direita

```tsx
<div className="flex items-center justify-between mb-3">
  <div className="flex-1 min-w-0">
    {/* Avatar IMC + Nome + Badge Mensagens */}
    <div className="flex items-center gap-2 mb-2">
      {/* Avatar IMC */}
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ 
          border: `2px solid ${imcData.corBorda}`,
          backgroundColor: 'white'
        }}
      >
        <span style={{ fontSize: '18px' }}>{imcData.emoji}</span>
      </div>
      
      {/* Nome */}
      <h3 className="text-base font-semibold text-gray-900 truncate">
        {nomeCompleto}
      </h3>
      
      {/* Badge de mensagens não lidas */}
      {mensagensNaoLidasPorPaciente[paciente.id] > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
          <MessageSquare size={10} className="mr-1" />
          {mensagensNaoLidasPorPaciente[paciente.id]}
        </span>
      )}
    </div>
    
    {/* Badges de Status */}
    <div className="flex items-center gap-2 flex-wrap">
      {/* Status de Tratamento */}
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        statusTratamento === 'em_tratamento'
          ? 'bg-green-100 text-green-800'
          : statusTratamento === 'concluido'
          ? 'bg-blue-100 text-blue-800'
          : statusTratamento === 'abandono'
          ? 'bg-red-100 text-red-800'
          : 'bg-yellow-100 text-yellow-800'
      }`}>
        {statusTratamento === 'em_tratamento'
          ? 'Em Tratamento'
          : statusTratamento === 'concluido'
          ? 'Concluído'
          : statusTratamento === 'abandono'
          ? 'Abandono'
          : 'Pendente'}
      </span>
      
      {/* Status do Pagamento (button) */}
      <button
        onClick={() => {
          setPacientePagamentoSelecionado(paciente);
          if (pagamento) {
            setDadosPagamento(pagamento);
          } else {
            setDadosPagamento({...});
          }
          setShowModalPagamento(true);
        }}
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          pagamento?.statusPagamento === 'pago'
            ? 'bg-green-100 text-green-800'
            : pagamento?.statusPagamento === 'em_aberto'
            ? 'bg-red-100 text-red-800'
            : pagamento?.statusPagamento === 'iniciou_pagamento'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {pagamento?.statusPagamento === 'pago'
          ? 'Pago'
          : pagamento?.statusPagamento === 'em_aberto'
          ? 'Aberto'
          : pagamento?.statusPagamento === 'iniciou_pagamento'
          ? 'Parcial'
          : 'Negociação'}
      </button>
      
      {/* Perda de Peso */}
      {perdaPesoTotal !== null && (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          perdaPesoTotal < 0
            ? 'bg-green-100 text-green-800'
            : perdaPesoTotal > 0
            ? 'bg-orange-100 text-orange-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {perdaPesoTotal !== 0 ? (perdaPesoTotal < 0 ? '-' : '+') : ''}{Math.abs(perdaPesoTotal).toFixed(1)} kg
        </span>
      )}
    </div>
  </div>
  
  {/* Botão Expandir/Recolher */}
  <button
    onClick={() => {
      const novoEstado = isExpanded ? null : item.pacienteId;
      setPacienteCardExpandido(novoEstado);
    }}
    className="flex-shrink-0 ml-2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
  >
    <ChevronDown 
      size={20} 
      className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
    />
  </button>
</div>
```

**Componentes do Cabeçalho:**

#### 2.1. Avatar IMC
- **Tamanho:** 8x8 (32px)
- **Borda:** 2px sólida, cor dinâmica baseada no IMC
- **Emoji:** Dinâmico baseado no IMC:
  - 😟: IMC < 18.5 (azul)
  - 🙂: 18.5 ≤ IMC < 25 (verde)
  - 😐: 25 ≤ IMC < 30 (amarelo)
  - 😟: IMC ≥ 30 (vermelho)

**Cálculo do IMC:**
```tsx
const calcularIMC = (): { imc: number | null; emoji: string; corBorda: string } => {
  let imc: number | null = null;
  if (medidasIniciais?.imc) {
    imc = medidasIniciais.imc;
  } else if (medidasIniciais?.altura && ultimoPeso) {
    const alturaMetros = medidasIniciais.altura / 100;
    imc = ultimoPeso / (alturaMetros * alturaMetros);
  } else if (medidasIniciais?.altura && medidasIniciais?.peso) {
    const alturaMetros = medidasIniciais.altura / 100;
    imc = medidasIniciais.peso / (alturaMetros * alturaMetros);
  }
  
  if (!imc || imc === 0) {
    return { imc: null, emoji: '🙂', corBorda: '#9ca3af' };
  }
  if (imc < 18.5) {
    return { imc, emoji: '😟', corBorda: '#60a5fa' };
  } else if (imc < 25) {
    return { imc, emoji: '🙂', corBorda: '#34d399' };
  } else if (imc < 30) {
    return { imc, emoji: '😐', corBorda: '#fbbf24' };
  } else {
    return { imc, emoji: '😟', corBorda: '#f87171' };
  }
};
```

#### 2.2. Nome do Paciente
- **Fonte:** `text-base font-semibold`
- **Cor:** `text-gray-900`
- **Truncate:** `truncate` para evitar overflow
- **Fonte:** `paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Sem nome'`

#### 2.3. Badge de Mensagens Não Lidas
- **Condição:** `mensagensNaoLidasPorPaciente[paciente.id] > 0`
- **Cor:** `bg-red-100 text-red-800`
- **Ícone:** `MessageSquare` size 10
- **Texto:** Número de mensagens não lidas

#### 2.4. Badges de Status
- **Status de Tratamento:** 4 estados possíveis (Em Tratamento, Concluído, Abandono, Pendente)
- **Status de Pagamento:** Button clicável que abre modal (Pago, Aberto, Parcial, Negociação)
- **Perda de Peso:** Mostrado apenas se `perdaPesoTotal !== null`
  - Verde: perda (negativo)
  - Laranja: ganho (positivo)
  - Cinza: sem mudança

**Cálculo de Perda de Peso:**
```tsx
const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
const evolucao = paciente.evolucaoSeguimento || [];
const primeiroRegistro = evolucao.find(e => e.weekIndex === 1);
const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;

let ultimoPeso: number | null = null;
if (evolucao.length > 0) {
  const evolucaoOrdenada = [...evolucao].sort((a, b) => {
    const dataA = a.dataRegistro instanceof Date ? a.dataRegistro.getTime() : new Date(a.dataRegistro).getTime();
    const dataB = b.dataRegistro instanceof Date ? b.dataRegistro.getTime() : new Date(b.dataRegistro).getTime();
    return dataB - dataA;
  });
  const ultimoRegistroComPeso = evolucaoOrdenada.find(s => s.peso && s.peso > 0);
  ultimoPeso = ultimoRegistroComPeso?.peso || null;
}

const perdaPesoTotal = ultimoPeso && baselineWeight > 0 ? ultimoPeso - baselineWeight : null;
```

---

### 3. Botões de Ação (Centralizados)

**Localização:** Após o cabeçalho, antes dos detalhes expandíveis

```tsx
<div className="mb-3">
  <div className="flex items-center justify-center gap-1 flex-wrap">
    {/* Botões aqui */}
  </div>
</div>
```

**Características:**
- **Layout:** Flex centralizado (`justify-center`)
- **Gap:** `gap-1` (4px)
- **Wrap:** `flex-wrap` para quebrar linha se necessário
- **Tamanho dos botões:** `p-2` (8px padding), ícones `size={18}`

**Botões (ordem):**

1. **Editar** (Laranja)
   - Ícone: `Edit`
   - Cor: `bg-orange-50 text-orange-700 hover:bg-orange-100`
   - Ação: `handleVisualizarPaciente(paciente)`

2. **Aplicações** (Azul)
   - Ícone: `Syringe`
   - Cor dinâmica:
     - Ativo: `bg-blue-600 text-white`
     - Com aplicações: `bg-blue-50 text-blue-700 hover:bg-blue-100`
     - Sem aplicações: `bg-gray-50 text-gray-400 hover:bg-gray-100`
   - Ação: Toggle `pacienteDetalhesExpandido`
   - Fecha `pacienteCardExpandido` quando abre

3. **Exames** (Verde)
   - Ícone: `FlaskConical`
   - Cor dinâmica:
     - Com exames: `bg-green-50 text-green-700 hover:bg-green-100`
     - Sem exames: `bg-gray-50 text-gray-400 hover:bg-gray-100`
   - Ação: Abre modal de exames, inicializa com exame mais recente

4. **Prescrições** (Roxo)
   - Ícone: `ClipboardList`
   - Cor: `bg-purple-50 text-purple-700 hover:bg-purple-100`
   - Ação: Abre modal de prescrições, carrega prescrições do paciente

5. **Nutrição** (Amarelo)
   - Ícone: `UtensilsCrossed`
   - Cor: `bg-yellow-50 text-yellow-700 hover:bg-yellow-100`
   - Ação: Abre modal de nutrição

6. **Personal Trainer** (Rosa/Cinza)
   - Ícone: `Dumbbell`
   - Cor dinâmica:
     - Com treinos: `bg-pink-50 text-pink-700 hover:bg-pink-100`
     - Sem treinos: `bg-gray-50 text-gray-400 hover:bg-gray-100`
   - Verificação: `pacientesComTreinos.has(paciente.userId || paciente.id)`
   - Ação: Abre modal de Personal Trainer

7. **Excluir** (Vermelho)
   - Ícone: `Trash2`
   - Cor: `bg-red-50 text-red-700 hover:bg-red-100`
   - Ação: `handleCancelarCompartilhamento(item)`

---

### 4. Detalhes Expandíveis

**Condição:** `isExpanded && pacienteCardExpandido === item.pacienteId`

**Conteúdo:**

#### 4.1. Caixa de Informações Clínicas (Barra de IMC Interativa)

**Condição:** Mostrado se houver `ultimoPeso`, `altura`, ou `imc`

**Estrutura:**
```tsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 relative overflow-hidden" style={{ borderRadius: '12px' }}>
  {/* Confetti e Fireworks (quando IMC saudável) */}
  {/* Grid com Peso, Altura, IMC */}
  {/* Barra de IMC Interativa */}
</div>
```

**Características:**
- **Fundo:** `bg-blue-50` com borda azul
- **Padding:** `p-3`
- **Border radius:** 12px

**Componentes:**

##### 4.1.1. Confetti e Fireworks
- **Condição:** Apenas mobile (`lg:hidden`), quando IMC está na faixa saudável (18.5-25)
- **Trigger:** `showFireworks[item.pacienteId] && isSaudavel`
- **Animação:** Explosão de confetti e fogos de artifício quando IMC entra na faixa saudável

##### 4.1.2. Grid de Informações (3 colunas)
```tsx
<div className="grid grid-cols-3 gap-2">
  {/* Peso Atual */}
  {/* Altura */}
  {/* IMC */}
</div>
```

##### 4.1.3. Barra de IMC Interativa
- **4 faixas:** Baixo peso (<18.5), Saudável (18.5-25), Alto (25-30), Obeso (≥30)
- **Marcador arrastável:** Emoji smiley redondo, pode ser arrastado para ajustar peso
- **Labels:** Valores 18.5, 25, 30 acima da barra; labels "Baixo", "Saudável", "Alto", "Obeso" abaixo
- **Grau de Obesidade:** Mostrado abaixo da barra

**Handlers de Arrasto:**
```tsx
const handleMouseDown = (e: React.MouseEvent) => {
  e.preventDefault();
  setIsDraggingIMC(true);
  setPacienteArrastandoIMC(item.pacienteId);
};

const handleTouchStart = (e: React.TouchEvent) => {
  setIsDraggingIMC(true);
  setPacienteArrastandoIMC(item.pacienteId);
};
```

#### 4.2. Informações Adicionais

Lista de informações em formato de linha:

1. **Cadastro:** Data de cadastro do paciente
2. **Telefone:** Link para WhatsApp (se disponível)
3. **Cidade:** Cidade do endereço
4. **Sexo:** Sexo biológico (M/F/Outro)
5. **Data de Nascimento:** Data + idade calculada
6. **Valor Total:** Valor negociado + número de parcelas
7. **NPS:** "Em breve" (futuro)

**Formato:**
```tsx
<div className="flex items-center text-sm text-gray-600">
  <span className="font-medium mr-2">Label:</span>
  <span className="text-gray-900">Valor</span>
</div>
```

---

### 5. Lista de Aplicações (Expandível Separadamente)

**Condição:** `pacienteDetalhesExpandido === item.pacienteId`

**Estrutura:**
```tsx
<div className="mb-3 border-t border-gray-200 pt-3">
  {evolucao.length > 0 ? (
    <>
      <h4 className="text-sm font-semibold text-gray-900 mb-2">
        Aplicações ({evolucao.length})
      </h4>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {/* Cards de aplicação */}
      </div>
      {/* Botão de Gráficos */}
    </>
  ) : (
    <div className="text-center py-4 bg-gray-50 border border-gray-200 rounded-lg mb-3">
      <p className="text-sm text-gray-500">Nenhuma aplicação registrada ainda.</p>
    </div>
  )}
</div>
```

**Card de Aplicação:**
- **Semana:** Número da semana (ou "Semana de Conclusão")
- **Data:** Data do registro
- **Peso:** Peso registrado
- **Dose:** Dose aplicada (se houver)
- **Variação:** Variação de peso em relação à semana anterior (verde se negativo, vermelho se positivo)

**Botão de Gráficos:**
- **Cor:** `bg-purple-600 text-white`
- **Ação:** Abre modal de gráficos do paciente

---

## Estados e Variáveis

### Estados Principais

```typescript
// Expansão do card
const [pacienteCardExpandido, setPacienteCardExpandido] = useState<string | null>(null);
const [pacienteDetalhesExpandido, setPacienteDetalhesExpandido] = useState<string | null>(null);

// IMC interativo
const [isDraggingIMC, setIsDraggingIMC] = useState(false);
const [pacienteArrastandoIMC, setPacienteArrastandoIMC] = useState<string | null>(null);
const [pesoTemporarioIMC, setPesoTemporarioIMC] = useState<number | null>(null);
const [imcTemporarioIMC, setImcTemporarioIMC] = useState<number | null>(null);
const barraIMCRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

// Confetti/Fireworks
const [showFireworks, setShowFireworks] = useState<{ [key: string]: boolean }>({});

// Mensagens não lidas
const [mensagensNaoLidasPorPaciente, setMensagensNaoLidasPorPaciente] = useState<Record<string, number>>({});

// Pacientes com treinos (Personal Trainer)
const [pacientesComTreinos, setPacientesComTreinos] = useState<Set<string>>(new Set());

// Pagamentos
const [pagamentosPacientes, setPagamentosPacientes] = useState<Record<string, PagamentoPaciente>>({});
```

### Cálculos Locais (dentro do map)

```typescript
// Nome completo
const nomeCompleto = paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Sem nome';

// Perda de peso
const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
const evolucao = paciente.evolucaoSeguimento || [];
const primeiroRegistro = evolucao.find(e => e.weekIndex === 1);
const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
// ... cálculo de ultimoPeso e perdaPesoTotal

// IMC
const imcData = calcularIMC();

// Status
const statusTratamento = paciente.statusTratamento || 'pendente';

// Semanas
const planoTerapeutico = paciente.planoTerapeutico;
const totalSemanas = planoTerapeutico?.numeroSemanasTratamento || 0;
const semanasAplicadas = evolucao.filter(reg => {
  // ... lógica de filtro
}).length;

// Pagamento
const pagamento = pagamentosPacientes[paciente.id];

// WhatsApp
const telefone = paciente.dadosIdentificacao?.telefone || '';
const telefoneWhatsApp = telefone.replace(/\D/g, '');
const linkWhatsApp = telefoneWhatsApp ? `https://wa.me/55${telefoneWhatsApp}` : '#';

// Estados de expansão
const isExpanded = pacienteCardExpandido === item.pacienteId;
const isDetalhesExpandido = pacienteDetalhesExpandido === item.pacienteId;
const isSelecionado = isExpanded || isDetalhesExpandido;
```

---

## Responsividade

### Breakpoints

- **Mobile:** `< lg` (1024px)
- **Desktop:** `>= lg` (1024px)

### Comportamento Mobile

- Card é renderizado apenas em mobile (`lg:hidden`)
- Barra de IMC interativa com arraste touch
- Confetti e fireworks apenas mobile
- Botões centralizados com wrap

### Comportamento Desktop

- Card não é renderizado (tabela é usada)

---

## Interações e Funcionalidades

### 1. Expansão/Recolhimento do Card

- **Botão:** ChevronDown no canto superior direito
- **Estado:** `pacienteCardExpandido`
- **Ação:** Toggle entre `item.pacienteId` e `null`
- **Efeito:** Mostra/oculta detalhes expandíveis

### 2. Expansão de Aplicações

- **Botão:** Botão "Aplicações" (Syringe)
- **Estado:** `pacienteDetalhesExpandido`
- **Ação:** Toggle entre `item.pacienteId` e `null`
- **Efeito:** Fecha detalhes do card quando abre aplicações

### 3. Arrasto da Barra de IMC

- **Suporte:** Mouse e Touch
- **Estados:** `isDraggingIMC`, `pacienteArrastandoIMC`, `pesoTemporarioIMC`, `imcTemporarioIMC`
- **Ref:** `barraIMCRef` para cada paciente
- **Cálculo:** Posição do marcador baseada no IMC atual

### 4. Confetti/Fireworks

- **Trigger:** Quando IMC entra na faixa saudável (18.5-25)
- **Estado:** `showFireworks[item.pacienteId]`
- **Animação:** CSS keyframes customizados
- **Duração:** ~3 segundos

### 5. Modais

- **Prescrições:** Modal tela cheia
- **Exames:** Modal com lista de exames
- **Nutrição:** Modal de nutrição
- **Personal Trainer:** Modal com calendário de treinos
- **Pagamento:** Modal de gerenciamento de pagamento

---

## Dependências e Serviços

### Serviços Utilizados

```typescript
import { PacienteNutricionistaService } from '@/services/pacienteNutricionistaService';
import { PagamentoService } from '@/services/pagamentoService';
import { PrescricaoService } from '@/services/prescricaoService';
import { trainingSessionService } from '@/services/trainingSessionService';
```

### Funções de Carregamento

```typescript
// Carregar pacientes
const loadPacientesList = useCallback(async () => {
  const pacientes = await PacienteNutricionistaService.listPacientesVisiveisByNutri(user.uid);
  setPacientesVisiveis(pacientes);
  // ...
}, [user, nutricionista, loadPagamentos]);

// Carregar pagamentos
const loadPagamentos = useCallback(async (pacientesParaUsar: PacienteCompleto[]) => {
  const pagamentosNutricionista = await PagamentoService.getAllPagamentosNutricionista(user.uid);
  // ...
}, [nutricionista, user]);

// Carregar pacientes com treinos
useEffect(() => {
  // Usa trainingSessionService.getPatientSessions
  // Tenta múltiplos IDs: userId, prefixo do userId, id
  // Processa em batches de 10
}, [activeMenu, pacientesVisiveis]);
```

---

## Estilos e Classes Tailwind

### Cores Principais

- **Verde:** `bg-green-100 text-green-800` (status positivo, perda de peso)
- **Azul:** `bg-blue-100 text-blue-800` (status concluído, aplicações)
- **Amarelo:** `bg-yellow-100 text-yellow-800` (status pendente, parcial)
- **Vermelho:** `bg-red-100 text-red-800` (status abandono, aberto)
- **Roxo:** `bg-purple-50 text-purple-700` (prescrições)
- **Rosa:** `bg-pink-50 text-pink-700` (Personal Trainer com treinos)
- **Laranja:** `bg-orange-50 text-orange-700` (editar)
- **Cinza:** `bg-gray-50 text-gray-400` (desabilitado, sem dados)

### Espaçamento

- **Padding do card:** `p-4 pt-3` (16px, 12px top)
- **Gap entre elementos:** `gap-2` (8px) ou `gap-1` (4px)
- **Margin bottom:** `mb-3` (12px)

### Tipografia

- **Título do card:** `text-base font-semibold`
- **Badges:** `text-xs font-semibold`
- **Detalhes:** `text-sm`

---

## Notas de Implementação

### Diferenças do `/metaadmin`

1. **Contexto:** Nutricionista vs Médico
2. **Pagamentos:** Relação nutricionista-paciente (não médico-paciente)
3. **Prescrições:** Usa `nutricionista.userId` como `medicoId`
4. **Personal Trainer:** Busca todos verificados (não filtra por vínculo com nutricionista)
5. **Barra de IMC:** Interativa com arraste (feature única do `/metanutri`)

### Melhorias Futuras

- Implementar lógica de mensagens não lidas
- Adicionar NPS quando disponível
- Melhorar performance do carregamento de treinos
- Adicionar animações de transição

---

## Estrutura de Dados

### PacienteVisivelNutri

```typescript
interface PacienteVisivelNutri {
  pacienteId: string;
  paciente: PacienteCompleto;
  medicoId: string;
  medicoNome: string;
  dataCompartilhamento: Date;
}
```

### PacienteCompleto (campos relevantes)

```typescript
interface PacienteCompleto {
  id: string;
  userId: string;
  nome: string;
  dadosIdentificacao?: {
    nomeCompleto?: string;
    telefone?: string;
    endereco?: { cidade?: string };
    sexoBiologico?: 'M' | 'F' | 'Outro';
    dataNascimento?: Date;
  };
  dadosClinicos?: {
    medidasIniciais?: {
      peso?: number;
      altura?: number;
      imc?: number;
    };
  };
  evolucaoSeguimento?: EvolucaoSeguimento[];
  planoTerapeutico?: {
    numeroSemanasTratamento?: number;
    startDate?: Date;
    injectionDayOfWeek?: string;
    currentDoseMg?: number;
    semanasCanceladas?: number[];
  };
  statusTratamento?: 'pendente' | 'em_tratamento' | 'concluido' | 'abandono';
  examesLaboratoriais?: ExameLaboratorial[];
  dataCadastro?: Date;
}
```

---

## Fluxo de Renderização

1. **Carregamento inicial:**
   - `loadPacientesList()` → `setPacientesVisiveis()`
   - `loadPagamentos()` em background
   - `useEffect` para carregar pacientes com treinos

2. **Renderização do card:**
   - Loop `pacientesOrdenados.map()`
   - Cálculos locais (IMC, perda de peso, semanas)
   - Renderização condicional baseada em estados

3. **Interações:**
   - Clique em botões → atualiza estados → re-renderiza
   - Arrasto IMC → atualiza estados temporários → re-renderiza
   - Expansão → mostra/oculta seções

---

## Acessibilidade

- **ARIA labels:** Botões têm `aria-label` quando necessário
- **Semântica HTML:** Uso de `<button>` para ações, `<span>` para badges
- **Contraste:** Cores seguem padrões de contraste WCAG
- **Touch targets:** Botões têm tamanho mínimo de 44x44px (18px ícone + 8px padding = 36px, mas com área de toque maior)

---

## Performance

### Otimizações

1. **Carregamento em background:** Pagamentos carregam sem bloquear renderização
2. **Batching:** Treinos carregam em batches de 10
3. **Memoização:** `useCallback` para funções de carregamento
4. **Lazy loading:** Modais carregam apenas quando abertos

### Pontos de Atenção

- Cálculos de IMC e perda de peso são feitos a cada render
- Lista de aplicações pode ser longa (max-height com scroll)
- Confetti/Fireworks podem impactar performance em muitos cards

---

## Conclusão

O card de paciente mobile no `/metanutri` é um componente complexo e rico em funcionalidades, com:

- ✅ Barra de progresso de semanas
- ✅ Avatar IMC dinâmico
- ✅ Badges de status múltiplos
- ✅ 7 botões de ação centralizados
- ✅ Barra de IMC interativa com arraste
- ✅ Confetti/Fireworks quando IMC saudável
- ✅ Detalhes expandíveis
- ✅ Lista de aplicações expandível
- ✅ Integração com múltiplos modais

Todas essas funcionalidades trabalham juntas para fornecer uma experiência completa de visualização e interação com os dados do paciente.
