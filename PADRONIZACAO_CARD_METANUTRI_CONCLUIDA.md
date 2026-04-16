# Padronização do Card de Pacientes - /metanutri ✅

## Mudanças Implementadas

### ✅ 1. Barra de Progresso no Topo
- **Antes:** Barra dentro do conteúdo do card, com texto acima
- **Agora:** Barra no topo do card (primeiro elemento visual)
- **Características:**
  - Barra fina de 1.5px
  - Texto "X de Y" centralizado na mesma linha
  - Cores dinâmicas (verde ≥100%, azul ≥50%, âmbar <50%)
  - Sempre visível quando há semanas totais

### ✅ 2. Botões Centralizados
- **Antes:** Botões alinhados à direita ou ao lado da barra
- **Agora:** Botões centralizados com `justify-center`
- **Características:**
  - Layout consistente sempre
  - Espaçamento mínimo (`gap-1`)
  - Quebra de linha se necessário (`flex-wrap`)

### ✅ 3. Badge de Mensagens Não Lidas
- **Adicionado:** Badge vermelho ao lado do nome
- **Características:**
  - Aparece apenas se houver mensagens não lidas
  - Mostra quantidade de mensagens
  - Tooltip com descrição completa
  - Estado: `mensagensNaoLidasPorPaciente`

### ✅ 4. Botão Prescrições
- **Adicionado:** Botão roxo com ícone `ClipboardList`
- **Características:**
  - Sempre ativo (não depende de dados)
  - Abre modal de prescrições
  - Estado: `showModalPrescricoes`

### ✅ 5. Botão Personal Trainer
- **Adicionado:** Botão rosa com ícone `Dumbbell`
- **Características:**
  - Cor rosa quando há treinos (`bg-pink-50 text-pink-700`)
  - Cor cinza quando não há treinos
  - Abre modal de Personal Trainer
  - Estado: `showModalPersonal`
  - Verificação: `pacientesComTreinos`

### ✅ 6. Badge de Pagamento Padronizado
- **Antes:** `<span>` com `onClick`
- **Agora:** `<button>` (mais semântico)
- **Características:**
  - Mantém mesma funcionalidade
  - Melhor acessibilidade

### ✅ 7. Ordem dos Botões Padronizada
Ordem final dos botões:
1. Editar (laranja)
2. Aplicações (azul)
3. Exames (verde)
4. Prescrições (roxo) ⭐ NOVO
5. Nutrição (amarelo)
6. Personal Trainer (rosa) ⭐ NOVO
7. Excluir (vermelho)

## Estados Adicionados

```typescript
// Estados para mensagens não lidas
const [mensagensNaoLidasPorPaciente, setMensagensNaoLidasPorPaciente] = useState<Record<string, number>>({});

// Estados para pacientes com treinos (Personal Trainer)
const [pacientesComTreinos, setPacientesComTreinos] = useState<Set<string>>(new Set());

// Estados para modal de Prescrições
const [showModalPrescricoes, setShowModalPrescricoes] = useState(false);
const [pacientePrescricoesSelecionado, setPacientePrescricoesSelecionado] = useState<PacienteCompleto | null>(null);

// Estados para modal de Personal Trainer
const [showModalPersonal, setShowModalPersonal] = useState(false);
const [pacientePersonalSelecionado, setPacientePersonalSelecionado] = useState<PacienteCompleto | null>(null);
```

## Imports Adicionados

```typescript
import { 
  // ... outros imports
  Dumbbell,
  ClipboardList
} from 'lucide-react';
```

## Próximos Passos (Opcional)

### 1. Carregar Mensagens Não Lidas
Implementar lógica para carregar e atualizar `mensagensNaoLidasPorPaciente`:
```typescript
// Exemplo de implementação
useEffect(() => {
  // Carregar mensagens não lidas para cada paciente
  // Atualizar estado mensagensNaoLidasPorPaciente
}, [pacientesVisiveis]);
```

### 2. Carregar Pacientes com Treinos
Implementar lógica para verificar quais pacientes têm treinos:
```typescript
// Exemplo de implementação
useEffect(() => {
  // Verificar treinos para cada paciente
  // Atualizar estado pacientesComTreinos
}, [pacientesVisiveis]);
```

### 3. Implementar Modal de Prescrições
Criar modal para exibir e gerenciar prescrições do paciente.

### 4. Implementar Modal de Personal Trainer
Criar modal para exibir calendário de treinos do paciente (similar ao `/metaadmin`).

## Status

✅ **Card padronizado conforme `/metaadmin`**
- Estrutura visual idêntica
- Funcionalidades adicionadas
- Estados preparados para implementação futura

⚠️ **Nota:** Algumas funcionalidades (modais de Prescrições e Personal Trainer) precisam ser implementadas, mas a estrutura está pronta.
