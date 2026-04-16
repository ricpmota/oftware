# Card do Paciente - Versão Mobile (/metaadmin - Página Pacientes)

## Visão Geral

Este documento descreve em detalhes a estrutura, renderização e comportamento do card de paciente na versão mobile da página "Pacientes" em `/metaadmin`. O card foi recentemente atualizado com melhorias na barra de progresso de aplicações, adição do ícone rosa de Personal Trainer e centralização dos ícones de ação.

---

## Localização no Código

**Arquivo:** `app/metaadmin/page.tsx`  
**Linhas:** ~6156-6900 (seção de renderização mobile)  
**Contexto:** Renderizado dentro de `renderContent` quando `activeMenu === 'pacientes'` e a tela é mobile (`lg:hidden`)

---

## Estrutura Geral do Card

### Container Principal

```tsx
<div className="lg:hidden space-y-3">
  {pacientes
    .filter(/* filtros de busca e status */)
    .sort(/* ordenação alfabética */)
    .map((paciente, index) => {
      // Lógica de cálculo e renderização
      return (
        <div key={paciente.id} className={/* classes condicionais */}>
          {/* Conteúdo do card */}
        </div>
      );
    })}
</div>
```

**Características:**
- Visível apenas em telas mobile (`lg:hidden`)
- Espaçamento vertical entre cards (`space-y-3`)
- Filtros aplicados: busca por nome e status de tratamento
- Ordenação alfabética por nome

---

## Componentes do Card

### 1. Borda Superior: Barra de Progresso de Aplicações

**Localização:** Primeiro elemento visual do card  
**Linhas:** ~6269-6293

#### Estrutura Visual

```tsx
<div className="w-full rounded-t-lg relative overflow-hidden bg-gray-100">
  {/* Barra de progresso (1.5px de espessura) */}
  <div
    className={/* classes condicionais baseadas no progresso */}
    style={{
      width: /* porcentagem calculada */,
      height: '1.5px'
    }}
  />
  {/* Texto centralizado "X de Y" */}
  <div className="relative z-10 py-0.5 text-center text-xs font-semibold text-gray-700">
    {totalSemanas > 0 ? `${semanasAplicadas} de ${totalSemanas}` : '–'}
  </div>
</div>
```

#### Cálculo de Semanas Aplicadas

**Fonte de dados:**
- `paciente.planoTerapeutico?.numeroSemanasTratamento` → `totalSemanas`
- `paciente.evolucaoSeguimento` → array de registros de seguimento

**Lógica de contagem:**
```typescript
const semanasAplicadas = evolucao.filter(reg => {
  // Se tem dose aplicada, definitivamente foi aplicada
  if (reg.doseAplicada && reg.doseAplicada.quantidade > 0) return true;
  // Se tem adherence e não é MISSED, foi aplicada
  if (reg.adherence && reg.adherence !== 'MISSED') return true;
  // Se tem adesao e não é 'esquecida', foi aplicada
  if (reg.adesao && reg.adesao !== 'esquecida') return true;
  // Se tem dados de seguimento (peso, circunferência, etc), provavelmente aplicou
  if ((reg.peso && reg.peso > 0) || 
      (reg.circunferenciaAbdominal && reg.circunferenciaAbdominal > 0) ||
      (reg.hba1c && reg.hba1c > 0)) return true;
  return false;
}).length;
```

#### Cores da Barra de Progresso

A cor da barra muda conforme o progresso:
- **Verde (`bg-green-500`)**: Progresso ≥ 100% (completo)
- **Azul (`bg-blue-500`)**: Progresso ≥ 50% e < 100%
- **Âmbar (`bg-amber-500`)**: Progresso < 50%
- **Cinza (`bg-gray-200`)**: Sem semanas totais definidas

**Cálculo da largura:**
```typescript
width: totalSemanas > 0
  ? `${Math.min((semanasAplicadas / totalSemanas) * 100, 100)}%`
  : '100%'
```

#### Texto Exibido

- **Formato:** `"X de Y"` (ex: "1 de 4", "3 de 12")
- **Quando não há total:** Exibe `"–"`
- **Estilo:** Texto centralizado, pequeno (`text-xs`), negrito (`font-semibold`), cor cinza escuro

---

### 2. Cabeçalho do Card

**Localização:** Após a barra de progresso  
**Linhas:** ~6294-6404

#### Estrutura

```tsx
<div className="p-4 pt-3">
  <div className="flex items-center justify-between mb-3">
    {/* Lado esquerdo: Avatar IMC + Nome + Badge de mensagens */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-2">
        {/* Avatar IMC */}
        {/* Nome do paciente */}
        {/* Badge de mensagens não lidas (opcional) */}
      </div>
      {/* Badges de status */}
    </div>
    {/* Lado direito: Botão de expandir/recolher */}
  </div>
</div>
```

#### Avatar IMC (Emoji com Borda Colorida)

**Localização:** Primeiro elemento do cabeçalho  
**Linhas:** ~6299-6307

```tsx
<div 
  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
  style={{ 
    border: `2px solid ${imcData.corBorda}`,
    backgroundColor: 'white'
  }}
>
  <span style={{ fontSize: '18px' }}>{imcData.emoji}</span>
</div>
```

**Cálculo do IMC e determinação do emoji/cor:**

```typescript
const calcularIMC = (): { imc: number | null; emoji: string; corBorda: string } => {
  let imc: number | null = null;
  
  // Tentar usar IMC das medidas iniciais
  if (medidasIniciais?.imc) {
    imc = medidasIniciais.imc;
  } else if (medidasIniciais?.altura && ultimoPeso) {
    const alturaMetros = medidasIniciais.altura / 100;
    imc = ultimoPeso / (alturaMetros * alturaMetros);
  } else if (medidasIniciais?.altura && medidasIniciais?.peso) {
    const alturaMetros = medidasIniciais.altura / 100;
    imc = medidasIniciais.peso / (alturaMetros * alturaMetros);
  }
  
  // Classificação
  if (!imc || imc === 0) {
    return { imc: null, emoji: '🙂', corBorda: '#9ca3af' }; // Cinza padrão
  }
  
  if (imc < 18.5) {
    return { imc, emoji: '😟', corBorda: '#60a5fa' }; // Azul - Baixo
  } else if (imc < 25) {
    return { imc, emoji: '🙂', corBorda: '#34d399' }; // Verde - Saudável
  } else if (imc < 30) {
    return { imc, emoji: '😐', corBorda: '#fbbf24' }; // Amarelo - Alto
  } else {
    return { imc, emoji: '😟', corBorda: '#f87171' }; // Vermelho - Obeso
  }
};
```

**Classificação IMC:**
- **< 18.5**: 😟 Azul (`#60a5fa`) - Baixo peso
- **18.5 - 24.9**: 🙂 Verde (`#34d399`) - Saudável
- **25 - 29.9**: 😐 Amarelo (`#fbbf24`) - Sobrepeso
- **≥ 30**: 😟 Vermelho (`#f87171`) - Obesidade
- **Sem dados**: 🙂 Cinza (`#9ca3af`) - Padrão

#### Nome do Paciente

```tsx
<h3 className="text-base font-semibold text-gray-900 truncate">
  {paciente.nome}
</h3>
```

**Características:**
- Tamanho médio (`text-base`)
- Negrito (`font-semibold`)
- Truncado se muito longo (`truncate`)

#### Badge de Mensagens Não Lidas (Opcional)

**Linhas:** ~6309-6314

```tsx
{mensagensNaoLidasPorPaciente[paciente.id] > 0 && (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex-shrink-0" 
        title={`${mensagensNaoLidasPorPaciente[paciente.id]} mensagem(ns) não lida(s)`}>
    <MessageSquare size={10} className="mr-1" />
    {mensagensNaoLidasPorPaciente[paciente.id]}
  </span>
)}
```

**Características:**
- Aparece apenas se houver mensagens não lidas
- Cor vermelha para destaque
- Mostra quantidade de mensagens
- Tooltip com descrição completa

#### Badges de Status

**Localização:** Abaixo do nome  
**Linhas:** ~6316-6385

**Badges exibidos (em ordem):**

1. **Status do Tratamento**
   ```tsx
   <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
     (paciente.statusTratamento || 'pendente') === 'em_tratamento'
       ? 'bg-green-100 text-green-800'
       : (paciente.statusTratamento || 'pendente') === 'concluido'
       ? 'bg-blue-100 text-blue-800'
       : (paciente.statusTratamento || 'pendente') === 'abandono'
       ? 'bg-red-100 text-red-800'
       : 'bg-yellow-100 text-yellow-800'
   }`}>
     {/* Texto do status */}
   </span>
   ```
   
   **Valores possíveis:**
   - `em_tratamento` → Verde: "Tratamento"
   - `concluido` → Azul: "Concluído"
   - `abandono` → Vermelho: "Abandono"
   - `pendente` (padrão) → Amarelo: "Pendente"

2. **Status do Pagamento** (Botão clicável)
   ```tsx
   <button
     onClick={() => {/* abre modal de pagamento */}}
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
     {/* Texto do status */}
   </button>
   ```
   
   **Valores possíveis:**
   - `pago` → Verde: "Pago"
   - `em_aberto` → Vermelho: "Aberto"
   - `iniciou_pagamento` → Amarelo: "Parcial"
   - `negociacao` (padrão) → Cinza: "Negociação"

3. **Perda de Peso** (Opcional - só aparece se houver dados)
   ```tsx
   {perdaPesoTotal !== null && (
     <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
       perdaPesoTotal < 0
         ? 'bg-green-100 text-green-800'  // Perda (negativo)
         : perdaPesoTotal > 0
         ? 'bg-orange-100 text-orange-800'  // Ganho (positivo)
         : 'bg-gray-100 text-gray-800'  // Sem mudança
     }`}>
       {perdaPesoTotal !== 0 ? (perdaPesoTotal < 0 ? '-' : '+') : ''}{Math.abs(perdaPesoTotal).toFixed(1)} kg
     </span>
   )}
   ```
   
   **Cálculo:**
   ```typescript
   // Baseline: primeiro registro (weekIndex 1) ou peso inicial
   const primeiroRegistro = evolucao.find(e => e.weekIndex === 1);
   const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
   
   // Último peso: último registro com peso válido
   const evolucaoOrdenada = [...evolucao].sort(/* por data, mais recente primeiro */);
   const ultimoRegistroComPeso = evolucaoOrdenada.find(s => s.peso && s.peso > 0);
   const ultimoPeso = ultimoRegistroComPeso?.peso || null;
   
   // Delta = Peso Atual - Peso Inicial
   const perdaPesoTotal = ultimoPeso && baselineWeight > 0 
     ? ultimoPeso - baselineWeight 
     : null;
   ```
   
   **Formato:** `"-X.X kg"` (perda) ou `"+X.X kg"` (ganho)

#### Botão de Expandir/Recolher

**Localização:** Lado direito do cabeçalho  
**Linhas:** ~6387-6403

```tsx
<button
  onClick={() => {
    const novoEstado = isExpanded ? null : paciente.id;
    setPacienteCardExpandido(novoEstado);
    // Fechar detalhes de aplicações se abrir detalhes do card
    if (novoEstado) {
      setPacienteDetalhesExpandido(null);
    }
  }}
  className="flex-shrink-0 ml-2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
  aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
>
  <ChevronDown 
    size={20} 
    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
  />
</button>
```

**Comportamento:**
- Alterna estado de expansão do card
- Ícone rotaciona 180° quando expandido
- Fecha seção de aplicações se abrir detalhes do card

---

### 3. Botões de Ação (Centralizados)

**Localização:** Abaixo do cabeçalho  
**Linhas:** ~6406-6680  
**Layout:** Flexbox centralizado com wrap

```tsx
<div className="mb-3">
  <div className="flex items-center justify-center gap-1 flex-wrap">
    {/* Botões de ação */}
  </div>
</div>
```

**Características:**
- Centralizados (`justify-center`)
- Espaçamento mínimo entre botões (`gap-1`)
- Quebra de linha se necessário (`flex-wrap`)
- Todos os botões têm tamanho consistente (`p-2`) e ícones de 18px

#### Botões Disponíveis (em ordem)

1. **Editar** (Laranja)
   ```tsx
   <button
     onClick={() => {/* abre modal de edição */}}
     className="p-2 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
     title="Editar"
   >
     <Edit size={18} />
   </button>
   ```
   
   **Comportamento especial:**
   - Se paciente está em abandono: abre modal de visualização (ícone `FileText`)
   - Caso contrário: abre modal de edição (ícone `Edit`)

2. **Aplicações** (Azul)
   ```tsx
   <button
     onClick={() => {
       const novoEstado = pacienteDetalhesExpandido === paciente.id ? null : paciente.id;
       setPacienteDetalhesExpandido(novoEstado);
       // Fechar detalhes do card se abrir detalhes de aplicações
       if (novoEstado) {
         setPacienteCardExpandido(null);
       }
     }}
     className={`p-2 rounded-md transition-colors ${
       pacienteDetalhesExpandido === paciente.id
         ? 'bg-blue-600 text-white'  // Ativo
         : temAplicacoes
         ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'  // Com dados
         : 'bg-gray-50 text-gray-400 hover:bg-gray-100'  // Sem dados
     }`}
     title={pacienteDetalhesExpandido === paciente.id ? 'Ocultar Aplicações' : 'Aplicações'}
   >
     <Syringe size={18} />
   </button>
   ```
   
   **Estados visuais:**
   - **Ativo (expandido)**: Fundo azul escuro, texto branco
   - **Com aplicações**: Fundo azul claro, texto azul
   - **Sem aplicações**: Fundo cinza claro, texto cinza (desabilitado visualmente)

3. **Exames** (Verde)
   ```tsx
   <button
     onClick={() => {/* abre modal de exames */}}
     className={`p-2 rounded-md transition-colors ${
       temExames
         ? 'bg-green-50 text-green-700 hover:bg-green-100'
         : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
     }`}
     title="Exames"
   >
     <FlaskConical size={18} />
   </button>
   ```
   
   **Estados:**
   - **Com exames**: Verde claro
   - **Sem exames**: Cinza (desabilitado visualmente)

4. **Prescrições** (Roxo)
   ```tsx
   <button
     onClick={async () => {
       setPacientePrescricoesSelecionado(paciente);
       setShowModalPrescricoes(true);
       setAbaPrescricoesModal('salvas');
       await loadPrescricoesModal(paciente);
     }}
     className="p-2 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
     title="Prescrições"
   >
     <ClipboardList size={18} />
   </button>
   ```
   
   **Sempre ativo** (não depende de dados existentes)

5. **Nutrição** (Amarelo)
   ```tsx
   <button
     onClick={async () => {
       // Carrega dados de nutrição e abre modal
     }}
     className={`p-2 rounded-md transition-colors ${
       temNutricao
         ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
         : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
     }`}
     title="Nutrição"
   >
     <UtensilsCrossed size={18} />
   </button>
   ```
   
   **Verificação de nutrição:**
   ```typescript
   const temNutricao = pacientesComNutricao[paciente.id] || false;
   ```

6. **Personal Trainer** (Rosa) ⭐ **NOVO**
   ```tsx
   <button
     onClick={async () => {
       setPacientePersonalSelecionado(paciente);
       setShowModalPersonal(true);
       if (medicoPerfil?.id) {
         await loadPersonalTrainersElegiveis();
         await loadStatusCompartilhamentoPersonal(paciente.id);
       }
     }}
     className={`p-2 rounded-md transition-colors ${
       temPersonal
         ? 'bg-pink-50 text-pink-700 hover:bg-pink-100'  // Rosa quando há treinos
         : 'bg-gray-50 text-gray-400 hover:bg-gray-100'  // Cinza quando não há
     }`}
     title="Personal Trainer"
   >
     <Dumbbell size={18} />
   </button>
   ```
   
   **Verificação de treinos:**
   ```typescript
   const temPersonal = !!(paciente.userId && pacientesComTreinos.has(paciente.userId)) 
                    || !!(paciente.id && pacientesComTreinos.has(paciente.id));
   ```
   
   **Características:**
   - **Cor rosa** (`bg-pink-50 text-pink-700`) quando há pelo menos 1 treino criado
   - **Cor cinza** quando não há treinos
   - Abre modal com calendário de treinos e opções de compartilhamento

7. **Excluir** (Vermelho)
   ```tsx
   <button
     onClick={async () => {
       if (confirm(`Tem certeza que deseja excluir o paciente "${paciente.nome}"?`)) {
         // Deleta paciente e dados relacionados
       }
     }}
     className="p-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
     title="Excluir"
   >
     <Trash2 size={18} />
   </button>
   ```
   
   **Ação destrutiva** com confirmação

---

## Modal do Personal Trainer

**Localização:** Renderizado condicionalmente quando `showModalPersonal === true`  
**Linhas:** ~30390-30573

### Estrutura do Modal

```tsx
{showModalPersonal && pacientePersonalSelecionado && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Cabeçalho */}
      {/* Seção de compartilhamento */}
      {/* Calendário de treinos */}
    </div>
  </div>
)}
```

### Cabeçalho do Modal

```tsx
<div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
    <Dumbbell size={20} className="text-pink-600" />
    Treinos - {pacientePersonalSelecionado.nome}
  </h3>
  <button
    onClick={() => setShowModalPersonal(false)}
    className="text-gray-400 hover:text-gray-500"
  >
    <X size={24} />
  </button>
</div>
```

### Seção de Compartilhamento

**Localização:** Entre cabeçalho e calendário  
**Linhas:** ~30408-30559

#### Estados Possíveis

1. **Carregando**
   ```tsx
   {loadingSolicitacoesCompartilhamentoPersonal && (
     <div className="text-xs text-gray-500">Carregando informações...</div>
   )}
   ```

2. **Já Compartilhado** (Vínculos Ativos)
   ```tsx
   {vinculosAtivosPacientePersonal.length > 0 && (
     <div className="space-y-3">
       {vinculosAtivosPacientePersonal.map((vinculo) => {
         const personal = personalTrainersElegiveis.find(/* ... */);
         return (
           <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
             {/* Nome do personal e data de compartilhamento */}
             <button onClick={/* encerrar compartilhamento */}>
               Encerrar
             </button>
           </div>
         );
       })}
     </div>
   )}
   ```

3. **Não Compartilhado** (Formulário)
   ```tsx
   <>
     {/* Aviso informativo */}
     <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
       <p className="text-xs text-blue-700">
         Compartilhe este paciente com personal trainers verificados e vinculados a você.
       </p>
     </div>
     
     {/* Botão para buscar personal trainer */}
     <button onClick={() => setShowModalBuscarPersonalTrainer(true)}>
       Buscar Personal Trainer por Localização
     </button>
     
     {/* Lista de solicitações pendentes */}
   </>
   ```

### Calendário de Treinos

**Localização:** Última seção do modal  
**Linhas:** ~30561-30568

```tsx
<div className="border-t border-gray-200 px-6 py-4">
  <CalendarioTreinosPersonal
    patientId={pacientePersonalSelecionado?.userId}
    pacienteId={pacientePersonalSelecionado?.id}
    wideRange
  />
</div>
```

**Componente:** `CalendarioTreinosPersonal` (importado de `@/components/CalendarioTreinosPersonal`)

**Props:**
- `patientId`: ID do usuário do paciente (opcional)
- `pacienteId`: ID do documento do paciente (opcional)
- `wideRange`: Sempre `true` no contexto `/metaadmin` (inclui hoje e tenta ambos os IDs)

---

## Estados e Lógica de Renderização

### Estados Principais

1. **Expansão do Card**
   ```typescript
   const [pacienteCardExpandido, setPacienteCardExpandido] = useState<string | null>(null);
   const isExpanded = pacienteCardExpandido === paciente.id;
   ```

2. **Expansão de Aplicações**
   ```typescript
   const [pacienteDetalhesExpandido, setPacienteDetalhesExpandido] = useState<string | null>(null);
   const isDetalhesExpandido = pacienteDetalhesExpandido === paciente.id;
   ```

3. **Pacientes com Treinos**
   ```typescript
   const [pacientesComTreinos, setPacientesComTreinos] = useState<Set<string>>(new Set());
   ```
   
   **Carregamento:**
   ```typescript
   useEffect(() => {
     if (activeMenu !== 'pacientes' || pacientes.length === 0) return;
     
     let cancelled = false;
     (async () => {
       const ids = new Set<string>();
       // Verifica se cada paciente tem treinos usando trainingSessionService
       // Adiciona userId e id ao Set se houver treinos
       if (!cancelled) setPacientesComTreinos(ids);
     })();
     return () => { cancelled = true; };
   }, [activeMenu, pacientes]);
   ```

4. **Modal do Personal Trainer**
   ```typescript
   const [showModalPersonal, setShowModalPersonal] = useState(false);
   const [pacientePersonalSelecionado, setPacientePersonalSelecionado] = useState<PacienteCompleto | null>(null);
   const [personalTrainersElegiveis, setPersonalTrainersElegiveis] = useState<PersonalTrainerDoc[]>([]);
   const [vinculosAtivosPacientePersonal, setVinculosAtivosPacientePersonal] = useState<any[]>([]);
   ```

### Borda Gradiente Quando Selecionado

**Linhas:** ~6261-6268

```tsx
<div key={paciente.id} className={`shadow rounded-lg transition-all overflow-hidden ${
  isSelecionado 
    ? 'p-[2px] bg-gradient-to-r from-purple-500 to-orange-500' 
    : 'border border-gray-200 bg-white'
}`}>
  <div className={`rounded-lg ${
    isSelecionado ? 'bg-white' : ''
  }`}>
    {/* Conteúdo do card */}
  </div>
</div>
```

**Condição:**
```typescript
const isSelecionado = isExpanded || isDetalhesExpandido;
```

**Efeito visual:**
- Quando selecionado: Borda gradiente roxa→laranja de 2px
- Quando não selecionado: Borda cinza padrão de 1px

---

## Cálculos e Dados Exibidos

### 1. Perda de Peso Total

**Fonte:**
- `paciente.dadosClinicos?.medidasIniciais?.peso`
- `paciente.evolucaoSeguimento` (array ordenado por data)

**Cálculo:**
```typescript
// Baseline: primeiro registro (weekIndex 1) ou peso inicial
const primeiroRegistro = evolucao.find(e => e.weekIndex === 1);
const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;

// Último peso: último registro com peso válido (ordenado por data)
const evolucaoOrdenada = [...evolucao].sort((a, b) => {
  const dataA = a.dataRegistro instanceof Date ? a.dataRegistro.getTime() : new Date(a.dataRegistro).getTime();
  const dataB = b.dataRegistro instanceof Date ? b.dataRegistro.getTime() : new Date(b.dataRegistro).getTime();
  return dataB - dataA; // Mais recente primeiro
});
const ultimoRegistroComPeso = evolucaoOrdenada.find(s => s.peso && s.peso > 0);
const ultimoPeso = ultimoRegistroComPeso?.peso || null;

// Delta
const perdaPesoTotal = ultimoPeso && baselineWeight > 0 
  ? ultimoPeso - baselineWeight 
  : null;
```

### 2. IMC e Classificação

**Fonte:**
- `paciente.dadosClinicos?.medidasIniciais` (altura, peso, IMC)
- Último peso da evolução

**Cálculo:** Ver seção "Avatar IMC" acima

### 3. Semanas Aplicadas vs Total

**Fonte:**
- `paciente.planoTerapeutico?.numeroSemanasTratamento`
- `paciente.evolucaoSeguimento`

**Cálculo:** Ver seção "Barra de Progresso" acima

### 4. Status de Pagamento

**Fonte:**
```typescript
const pagamento = pagamentosPacientes[paciente.id];
```

**Estados:** `pago`, `em_aberto`, `iniciou_pagamento`, `negociacao` (padrão)

---

## Responsividade

### Breakpoint

- **Mobile:** `< lg` (menor que 1024px) → Cards visíveis
- **Desktop:** `≥ lg` (≥ 1024px) → Tabela visível, cards ocultos

### Classes Tailwind Utilizadas

- `lg:hidden`: Oculta em desktop
- `flex-wrap`: Quebra de linha dos botões se necessário
- `truncate`: Trunca texto longo
- `min-w-0`: Permite que flex items encolham abaixo do tamanho mínimo

---

## Acessibilidade

### Elementos Implementados

1. **Labels ARIA:**
   ```tsx
   aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
   ```

2. **Títulos em Botões:**
   - Todos os botões têm atributo `title` com descrição

3. **Contraste:**
   - Cores de texto e fundo seguem padrões de contraste WCAG

---

## Dependências e Imports

### Componentes Externos

```typescript
import CalendarioTreinosPersonal from '@/components/CalendarioTreinosPersonal';
import { trainingSessionService } from '@/services/trainingSessionService';
```

### Ícones (lucide-react)

- `Edit`, `FileText`
- `Syringe`
- `FlaskConical`
- `ClipboardList`
- `UtensilsCrossed`
- `Dumbbell` ⭐ **NOVO**
- `Trash2`
- `ChevronDown`
- `MessageSquare`
- `X`, `XCircle`
- `Search`

### Serviços

- `PacienteService`
- `PagamentoService`
- `PersonalTrainerService`
- `SolicitacaoPersonalTrainerService`
- `trainingSessionService`

---

## Fluxo de Interação

### 1. Visualização Inicial

1. Usuário acessa página "Pacientes" em mobile
2. Cards são renderizados com dados calculados
3. Barra de progresso mostra "X de Y" aplicações
4. Botões de ação aparecem centralizados

### 2. Interação com Personal Trainer

1. Usuário clica no botão rosa (Dumbbell)
2. Modal abre com:
   - Cabeçalho com nome do paciente
   - Seção de compartilhamento (se aplicável)
   - Calendário de treinos
3. Se houver vínculos ativos: mostra personal trainer(s) vinculado(s)
4. Se não houver: permite buscar e compartilhar

### 3. Expansão/Recolhimento

1. Clicar no botão de expandir (ChevronDown)
2. Card expande mostrando detalhes adicionais
3. Borda gradiente aparece
4. Clicar novamente recolhe o card

### 4. Ações dos Botões

- **Editar**: Abre modal de edição
- **Aplicações**: Expande/recolhe seção de aplicações
- **Exames**: Abre modal de exames
- **Prescrições**: Abre modal de prescrições
- **Nutrição**: Abre modal de nutrição
- **Personal**: Abre modal de Personal Trainer ⭐
- **Excluir**: Confirma e exclui paciente

---

## Notas de Implementação

### Mudanças Recentes

1. **Barra de Progresso:**
   - Antes: Formato diferente ou não existia
   - Agora: Barra fina (1.5px) com texto "X de Y" centralizado
   - Cores dinâmicas baseadas no progresso

2. **Ícone Personal Trainer:**
   - Adicionado botão rosa com ícone Dumbbell
   - Cor rosa (`bg-pink-50 text-pink-700`) quando há treinos
   - Cor cinza quando não há treinos
   - Abre modal com calendário de treinos

3. **Centralização dos Ícones:**
   - Botões agora usam `justify-center` em vez de `justify-start`
   - Layout mais equilibrado visualmente

### Considerações para Replicação

Ao replicar este card em outras páginas, considerar:

1. **Dados necessários:**
   - `paciente` (objeto completo)
   - `pagamentosPacientes` (mapa de pagamentos)
   - `mensagensNaoLidasPorPaciente` (mapa de contagens)
   - `pacientesComNutricao` (mapa de booleanos)
   - `pacientesComTreinos` (Set de IDs)

2. **Estados necessários:**
   - Expansão do card
   - Expansão de aplicações
   - Modal do Personal Trainer
   - Estados de loading

3. **Serviços necessários:**
   - `PacienteService`
   - `PagamentoService`
   - `PersonalTrainerService`
   - `trainingSessionService`

4. **Componentes necessários:**
   - `CalendarioTreinosPersonal`

5. **Cálculos:**
   - IMC e classificação
   - Perda de peso total
   - Semanas aplicadas vs total
   - Status de pagamento

---

## Exemplo de Uso Completo

```tsx
// Estrutura simplificada do card
<div className="lg:hidden space-y-3">
  {pacientes.map((paciente) => {
    // Cálculos
    const imcData = calcularIMC();
    const semanasAplicadas = calcularSemanasAplicadas();
    const totalSemanas = paciente.planoTerapeutico?.numeroSemanasTratamento || 0;
    const perdaPesoTotal = calcularPerdaPeso();
    const temPersonal = verificarTreinos();
    
    return (
      <div key={paciente.id} className={/* classes condicionais */}>
        {/* Barra de progresso */}
        <div className="w-full rounded-t-lg relative overflow-hidden bg-gray-100">
          <div className={/* barra de progresso */} />
          <div className="text-center text-xs font-semibold">
            {semanasAplicadas} de {totalSemanas}
          </div>
        </div>
        
        {/* Conteúdo do card */}
        <div className="p-4 pt-3">
          {/* Cabeçalho */}
          {/* Botões de ação centralizados */}
        </div>
      </div>
    );
  })}
</div>
```

---

## Conclusão

O card do paciente na versão mobile de `/metaadmin` é um componente complexo que exibe informações essenciais de forma compacta e interativa. As recentes melhorias na barra de progresso, adição do ícone rosa de Personal Trainer e centralização dos botões tornam a interface mais intuitiva e funcional.

Este documento serve como referência completa para entender, manter e replicar este componente em outras partes do sistema.
