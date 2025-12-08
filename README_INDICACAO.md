# 📋 README - Sistema de Indicações

## 🎯 Objetivo do Sistema
Sistema de indicação de pacientes para médicos, permitindo que pacientes indiquem outros pacientes para médicos cadastrados e acompanhem o status das indicações, incluindo comissões.

## 🏗️ Estrutura de Dados

### Coleção: `indicacoes`

```typescript
interface Indicacao {
  id: string;
  indicadoPor: string; // Email do paciente que indicou
  indicadoPorNome?: string; // Nome do paciente que indicou
  indicadoPorTelefone?: string; // Telefone do paciente que indicou
  nomePaciente: string; // Nome do paciente indicado
  telefonePaciente: string; // Telefone do paciente indicado (usado para matching)
  estado: string; // Estado selecionado
  cidade: string; // Cidade selecionada
  medicoId: string; // ID do médico indicado
  medicoNome: string; // Nome do médico
  status: 'pendente' | 'visualizada' | 'venda' | 'paga';
  criadoEm: Date;
  visualizadaEm?: Date;
  virouVendaEm?: Date; // Data quando paciente fez login (matching por telefone)
  pagaEm?: Date;
  pacienteIdVenda?: string; // ID do paciente quando virou venda
}
```

### Plano de Indicação (no documento do Médico)

```typescript
interface PlanoIndicacao {
  tipoValor: 'negociado' | 'fixo';
  tipoComissao: 'por_dose' | 'por_tratamento';
  valorPorDose?: number; // Se tipoComissao for 'por_dose'
  tempoTratamentoMeses?: number; // Se tipoComissao for 'por_tratamento'
  totalMedicamentoMg?: number; // Se tipoComissao for 'por_tratamento'
  valorComissaoTratamento?: number; // Se tipoComissao for 'por_tratamento'
}
```

## 🔄 Fluxo de Funcionamento

### 1. Indicação Manual (Paciente → Médico)

1. **Paciente acessa `/meta` → aba "Indicar"**
2. **Seleciona estado, cidade e médico** da lista de médicos cadastrados
3. **Preenche dados do paciente indicado:**
   - Nome
   - Telefone (validado: DDD + 9 dígitos)
4. **Sistema cria documento** em `indicacoes` com status `'pendente'`
5. **Indicação aparece** em `/metaadmin` na aba "Minhas Indicações" do médico

### 2. Matching Automático (Telefone → Venda)

Quando um novo paciente se cadastra:

1. **Sistema normaliza o telefone** do novo paciente
2. **Busca indicações pendentes** com o mesmo telefone
3. **Se encontrar:**
   - Atualiza status para `'venda'`
   - Define `virouVendaEm` = data atual
   - Linka `pacienteIdVenda` = ID do novo paciente
4. **Paciente que indicou** pode ver o status atualizado em "Minhas Indicações"

### 3. Gestão pelo Médico (`/metaadmin`)

#### Aba "Minhas Indicações"
- **Lista de indicações recebidas** com accordion expandível
- **Estatísticas:**
  - Total de indicações
  - Pendentes
  - Convertidas (venda + paga)
  - Pagas
  - Taxa de conversão
- **Ações:**
  - **Visualizar:** Marca como `'visualizada'` e revela telefone do lead
  - **Marcar como Paga:** Disponível quando status é `'venda'`
- **Detalhes expandidos:**
  - Cliente (quem indicou): nome, email, telefone, WhatsApp
  - Lead (paciente indicado): nome, cidade, estado, telefone (após visualizar)
  - Datas: indicação, visualizada, venda, paga
  - Botões de ação

#### Aba "Plano de Indicação"
- **Ativar/desativar** plano de indicações
- **Configurar comissão:**
  - **Tipo de valor:** Negociado ou Fixo
  - **Tipo de comissão:**
    - **Por dose:** Valor por dose aplicada
    - **Por tratamento:** Valor total do tratamento
      - Duração (meses)
      - Total de medicamento (mg)
      - Valor da comissão
- **Salvar:** Exibe dialog de sucesso

### 4. Acompanhamento pelo Paciente (`/meta`)

#### Aba "Indicar um paciente"
- Formulário de indicação (estado → cidade → médico → dados do paciente)
- Validação de telefone brasileiro
- Lista de médicos mostra se tem plano de indicações

#### Aba "Minhas Indicações"
- **Lista simplificada** com accordion (igual ao médico)
- **Status visual:**
  - 🟡 Pendente
  - 🔵 Visualizada
  - 🟢 Virou Venda
  - 🟣 Paga
- **Detalhes expandidos:**
  - Informações do médico
  - Plano de comissão do médico (se disponível)
  - Status e datas
  - Valor estimado da comissão (se fixo)

## 🔧 Serviços

### `IndicacaoService`

```typescript
// Criar indicação
criarIndicacao(indicacao: Omit<Indicacao, 'id' | 'criadoEm'>): Promise<string>

// Buscar indicações do paciente
getIndicacoesPorPaciente(emailPaciente: string): Promise<Indicacao[]>

// Buscar indicações pendentes do médico
getIndicacoesPendentesPorMedico(medicoId: string): Promise<Indicacao[]>

// Buscar todas as indicações do médico
getIndicacoesPorMedico(medicoId: string): Promise<Indicacao[]>

// Marcar como visualizada
marcarComoVisualizada(indicacaoId: string): Promise<void>

// Marcar como venda
marcarComoVenda(indicacaoId: string, pacienteId: string): Promise<void>

// Marcar como paga
marcarComoPaga(indicacaoId: string): Promise<void>

// Buscar por telefone
getIndicacaoPorTelefone(telefone: string): Promise<Indicacao[]>
```

### `PacienteService`

O método `createOrUpdatePaciente` foi modificado para incluir lógica de matching:

```typescript
// Ao criar/atualizar paciente:
1. Normaliza telefone
2. Busca indicações pendentes com mesmo telefone
3. Se encontrar, atualiza status para 'venda'
```

### `SolicitacaoMedicoService`

O método `criarSolicitacao` foi modificado para criar indicação automática quando há `emailIndicador`:

```typescript
// Se emailIndicador fornecido:
1. Busca dados do médico (cidade/estado)
2. Busca dados do indicador (paciente)
3. Cria indicação automaticamente
```

## 📱 Interface do Usuário

### `/meta` (Paciente)

#### Aba "Indicar"
- Formulário em 2 etapas:
  1. Seleção de médico (estado → cidade → médico)
  2. Dados do paciente indicado (nome + telefone)
- Validação de telefone em tempo real
- Lista de médicos mostra se tem plano de indicações

#### Aba "Minhas Indicações"
- **Resumo estatístico** (total, pendentes, convertidas, pagas, taxa)
- **Lista com accordion:**
  - Cabeçalho compacto: número, nome, status, cidade
  - Expandido: detalhes completos, plano de comissão, datas
- **Ícones de status** coloridos
- **Informações do médico** e plano de comissão

### `/metaadmin` (Médico)

#### Aba "Minhas Indicações"
- **Resumo estatístico** igual ao paciente
- **Lista com accordion** igual ao paciente
- **Ações:**
  - Botão "Visualizar" (status pendente)
  - Botão "Marcar como Paga" (status venda)
  - Links WhatsApp para cliente e lead

#### Aba "Plano de Indicação"
- Formulário de configuração
- Dialog de sucesso ao salvar

## 🔐 Segurança e Validações

- **Telefone:** Validação de formato brasileiro (DDD + 9 dígitos)
- **Matching:** Normalização de telefone para busca (remove formatação)
- **Status:** Transições controladas (pendente → visualizada → venda → paga)
- **Permissões:** Apenas o médico pode marcar como visualizada/paga

## 🚧 Funcionalidades Futuras (Não Implementadas)

1. **Indicação por Link:**
   - Link de indicação foi implementado mas está oculto
   - Funcionalidade será reativada no futuro
   - Lógica já existe em `SolicitacaoMedicoService.criarSolicitacao`

2. **Conversão Automática:**
   - Lógica de 15 dias sem virar "Em tratamento"
   - Notificação ao paciente quando status muda para "Em tratamento"
   - Remoção automática se paciente desistir

3. **Integração com Leads:**
   - Indicações aparecem no pipeline "Não qualificado"
   - Destaque "Indicado por Fulano"

## 📝 Notas Técnicas

- **Firestore Indexes:** Queries sem `orderBy` para evitar necessidade de índices compostos
- **Ordenação:** Manual no cliente após buscar dados
- **localStorage:** Usado para preservar parâmetro `ref` durante login
- **Telefone:** Sempre normalizado (apenas números) antes de salvar/buscar

## 🐛 Problemas Conhecidos

- Link de indicação está oculto (funcionalidade será reativada)
- Conversão automática não implementada (15 dias, desistência)
- Integração com pipeline de leads não implementada

