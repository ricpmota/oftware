# ETAPAS - Implementação do Calendário do /metapersonal

## Objetivo
Implementar a página Calendário do `/metapersonal` igual à do `/metanutri`, adaptada para Personal Trainers. O calendário é específico do Personal Trainer e mostra:
- **Aplicações do médico** (calculadas a partir do planoTerapeutico dos pacientes)
- **Pagamentos do personal-paciente** (parcelas com dataVencimento)
- **Treinos do paciente** (estrutura preparada para implementação futura na página /meta)

---

## ANÁLISE DO ESTADO ATUAL

### O que já existe:
1. ✅ Estrutura básica do `/metapersonal` (page.v2.tsx)
2. ✅ Menu com item "Calendário" (placeholder simples)
3. ✅ Estados básicos de calendário no metanutri (referência)
4. ✅ Função `loadPagamentos` para carregar pagamentos personal-paciente
5. ✅ Função `loadPacientesList` para carregar pacientes visíveis
6. ✅ Estrutura de `pacientesVisiveis` (PacienteVisivelPersonal[])
7. ✅ Estados de pagamento (`pagamentosPacientes`)

### O que falta:
1. ❌ Estados de calendário no metapersonal (`mesCalendario`, `diaSelecionado`, etc.)
2. ❌ Função `calcularAplicacoesPaciente` (adaptada do metanutri)
3. ❌ Função `obterAplicacoesMes` (para filtrar aplicações do mês)
4. ❌ Função `obterPagamentosMes` (para filtrar pagamentos do mês)
5. ❌ Função `renderizarCalendario` (UI completa do calendário)
6. ❌ Carregamento automático de pacientes quando entrar na seção calendário
7. ❌ Estrutura preparada para treinos (placeholder para implementação futura)

---

## ESTRUTURA DE DADOS

### Aplicações do Médico
- **Fonte:** `paciente.planoTerapeutico` (mesma estrutura do metanutri)
- **Campos necessários:**
  - `startDate`: Date (data de início do tratamento)
  - `injectionDayOfWeek`: 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'
  - `currentDoseMg`: number (dose inicial)
  - `numeroSemanasTratamento`: number (padrão: 18)
  - `semanasCanceladas`: number[] (semanas puladas)
  - `esquemaDosesCustomizado`: { [semana: number]: number } (opcional)

### Pagamentos do Personal-Paciente
- **Fonte:** `pagamentosPacientes` (já carregado via `loadPagamentos`)
- **Collection:** `pagamentos_personal_trainer_paciente`
- **Estrutura:** `PagamentoPaciente` com `parcelas: ParcelaPagamento[]`
- **Campo relevante:** `parcela.dataVencimento: Date`

### Treinos do Paciente (FUTURO)
- **Status:** Estrutura preparada para implementação futura
- **Fonte:** Será definida posteriormente na página `/meta`
- **Placeholder:** Preparar estrutura de dados e UI para exibir treinos quando disponível

---

## ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1: Adicionar Estados de Calendário

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Tarefas:**
1. Adicionar estados após os estados de pagamento (linha ~194):
   ```typescript
   // Estados para calendário
   const [mesCalendario, setMesCalendario] = useState(new Date());
   const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(null);
   const [aplicacoesDiaSelecionado, setAplicacoesDiaSelecionado] = useState<Array<{
     paciente: PacienteCompleto;
     semana: number;
     dose: number;
     localAplicacao: string;
   }>>([]);
   const [pagamentosDiaSelecionado, setPagamentosDiaSelecionado] = useState<Array<{
     paciente: PacienteCompleto;
     parcela: ParcelaPagamento;
   }>>([]);
   // Estado preparado para treinos (futuro)
   const [treinosDiaSelecionado, setTreinosDiaSelecionado] = useState<Array<{
     paciente: PacienteCompleto;
     treino: any; // TODO: definir tipo quando implementar
   }>>([]);
   ```

**Referência:** `app/metanutri/page.v2.tsx` linhas 262-274

---

### ETAPA 2: Adicionar useEffect para Carregar Dados do Calendário

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Tarefas:**
1. Adicionar useEffect após o useEffect do financeiro (linha ~704):
   ```typescript
   // Carregar dados quando entrar na seção calendário
   useEffect(() => {
     if (user && personalTrainer && activeMenu === 'calendario') {
       loadPacientesList();
       // Pagamentos já serão carregados automaticamente pelo loadPacientesList
     }
   }, [user, personalTrainer, activeMenu, loadPacientesList]);
   ```

**Referência:** `app/metanutri/page.v2.tsx` - verificar se há useEffect específico para calendário

---

### ETAPA 3: Implementar Função calcularAplicacoesPaciente

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Localização:** Dentro do `case 'calendario':` (antes de `renderizarCalendario`)

**Tarefas:**
1. Copiar função `calcularAplicacoesPaciente` do metanutri
2. Adaptar para usar `pacientesVisiveis` ao invés de `pacientesCalendario`
3. Manter lógica idêntica (cálculo de aplicações baseado em planoTerapeutico)

**Código base:** `app/metanutri/page.v2.tsx` linhas 5351-5514

**Estrutura esperada:**
```typescript
const calcularAplicacoesPaciente = (paciente: PacienteCompleto, mesInicio: Date, mesFim: Date) => {
  // Lógica idêntica ao metanutri
  // Retorna Array<{ data: Date, paciente: PacienteCompleto, semana: number, dose: number, localAplicacao: string }>
};
```

---

### ETAPA 4: Implementar Função obterAplicacoesMes

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Localização:** Dentro do `case 'calendario':` (após `calcularAplicacoesPaciente`)

**Tarefas:**
1. Obter lista de pacientes do personal trainer:
   ```typescript
   const pacientesCalendario = pacientesVisiveis.map(p => p.paciente);
   ```
2. Filtrar apenas pacientes em tratamento (`statusTratamento === 'em_tratamento'`)
3. Iterar sobre pacientes e calcular aplicações para o mês
4. Retornar array de aplicações

**Código base:** `app/metanutri/page.v2.tsx` linhas 5517-5540

**Estrutura esperada:**
```typescript
const obterAplicacoesMes = () => {
  const ano = mesCalendario.getFullYear();
  const mes = mesCalendario.getMonth();
  const mesInicio = new Date(ano, mes, 1);
  const mesFim = new Date(ano, mes + 1, 0);
  mesFim.setHours(23, 59, 59);

  const todasAplicacoes: Array<{
    data: Date;
    paciente: PacienteCompleto;
    semana: number;
    dose: number;
    localAplicacao: string;
  }> = [];

  pacientesCalendario
    .filter(p => p.statusTratamento === 'em_tratamento')
    .forEach(paciente => {
      const aplicacoes = calcularAplicacoesPaciente(paciente, mesInicio, mesFim);
      todasAplicacoes.push(...aplicacoes);
    });

  return todasAplicacoes;
};
```

---

### ETAPA 5: Implementar Função obterPagamentosMes

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Localização:** Dentro do `case 'calendario':` (após `obterAplicacoesMes`)

**Tarefas:**
1. Filtrar pagamentos do mês baseado em `parcela.dataVencimento`
2. Usar `pagamentosPacientes` (já carregado)
3. Mapear para estrutura com `paciente` e `parcela`
4. Retornar array de pagamentos do mês

**Código base:** `app/metanutri/page.v2.tsx` linhas 5542-5581

**Estrutura esperada:**
```typescript
const obterPagamentosMes = () => {
  const ano = mesCalendario.getFullYear();
  const mes = mesCalendario.getMonth();
  const mesInicio = new Date(ano, mes, 1);
  const mesFim = new Date(ano, mes + 1, 0);
  mesFim.setHours(23, 59, 59);

  const pagamentosDoMes: Array<{
    data: Date;
    paciente: PacienteCompleto;
    parcela: ParcelaPagamento;
  }> = [];

  // Iterar sobre todos os pagamentos personal-paciente
  Object.entries(pagamentosPacientes).forEach(([pacienteId, pagamento]) => {
    const paciente = pacientesCalendario.find(p => p.id === pacienteId);
    if (!paciente || !pagamento.parcelas) return;

    // Verificar cada parcela
    pagamento.parcelas.forEach(parcela => {
      if (parcela.dataVencimento) {
        const dataVencimento = parcela.dataVencimento instanceof Date 
          ? new Date(parcela.dataVencimento)
          : new Date(parcela.dataVencimento as any);
        
        // Verificar se está no mês do calendário
        if (dataVencimento >= mesInicio && dataVencimento <= mesFim) {
          pagamentosDoMes.push({
            data: dataVencimento,
            paciente,
            parcela
          });
        }
      }
    });
  });

  return pagamentosDoMes;
};
```

---

### ETAPA 6: Implementar Função obterTreinosMes (PREPARAÇÃO FUTURA)

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Localização:** Dentro do `case 'calendario':` (após `obterPagamentosMes`)

**Tarefas:**
1. Criar função placeholder que retorna array vazio
2. Preparar estrutura de dados para quando treinos forem implementados
3. Adicionar comentário indicando que será implementado futuramente

**Estrutura esperada:**
```typescript
// Função para obter treinos do mês (FUTURO - será implementado quando treinos forem definidos na página /meta)
const obterTreinosMes = () => {
  // TODO: Implementar quando estrutura de treinos estiver disponível
  // Fonte: será definida posteriormente na página /meta
  return [];
};
```

---

### ETAPA 7: Implementar Função renderizarCalendario

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Localização:** Substituir o placeholder do `case 'calendario':` (linha ~2942)

**Tarefas:**
1. Copiar função `renderizarCalendario` completa do metanutri
2. Adaptar para usar funções locais (`obterAplicacoesMes`, `obterPagamentosMes`, `obterTreinosMes`)
3. Manter UI idêntica ao metanutri
4. Adicionar seção preparada para treinos (comentada ou com placeholder)
5. Adaptar cores se necessário (verificar se metapersonal usa cores diferentes)

**Código base:** `app/metanutri/page.v2.tsx` linhas 5583-5914

**Estrutura esperada:**
```typescript
const renderizarCalendario = () => {
  const ano = mesCalendario.getFullYear();
  const mes = mesCalendario.getMonth();
  const aplicacoes = obterAplicacoesMes();
  const pagamentos = obterPagamentosMes();
  const treinos = obterTreinosMes(); // FUTURO

  // Lógica de construção do calendário (grid 7xN)
  // Renderização dos dias
  // Modal de detalhes do dia selecionado
  // Seções: Aplicações, Pagamentos, Treinos (futuro)
};
```

**Componentes visuais:**
- Cabeçalho com navegação de mês (anterior/próximo/hoje)
- Grid de calendário (7 colunas - dias da semana)
- Indicadores visuais:
  - Verde: Aplicações
  - Azul: Pagamentos
  - (Futuro) Cor para Treinos
- Modal de detalhes ao clicar em um dia
- Seções no modal: Aplicações, Pagamentos, Treinos (futuro)

---

### ETAPA 8: Adicionar Imports Necessários

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Tarefas:**
1. Verificar se todos os imports necessários estão presentes:
   - `ChevronLeft`, `ChevronRight` (já devem estar)
   - `X` (já deve estar)
   - `Pill` (para ícone de aplicações)
   - `DollarSign` (para ícone de pagamentos)
   - `Dumbbell` ou `Activity` (para ícone de treinos - futuro)

**Referência:** Verificar imports no topo de `app/metanutri/page.v2.tsx`

---

### ETAPA 9: Testar Funcionalidades

**Tarefas:**
1. Testar navegação do calendário (mês anterior/próximo/hoje)
2. Testar clique em dias com aplicações
3. Testar clique em dias com pagamentos
4. Testar clique em dias sem eventos
5. Verificar carregamento de pacientes ao entrar na seção
6. Verificar carregamento de pagamentos
7. Verificar cálculo correto de aplicações baseado em planoTerapeutico
8. Verificar filtro de pagamentos por data de vencimento
9. Testar responsividade (mobile/desktop)

---

### ETAPA 10: Preparar Estrutura para Treinos (FUTURO)

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Tarefas:**
1. Adicionar comentários indicando onde treinos serão exibidos
2. Preparar estrutura de dados placeholder
3. Adicionar seção no modal de detalhes (comentada ou com mensagem "Em breve")
4. Documentar onde a implementação futura deve ser feita

**Estrutura preparada:**
```typescript
// Seção de Treinos no modal (FUTURO)
{treinosDiaSelecionado.length > 0 && (
  <div className="mb-6">
    <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
      <Dumbbell className="h-5 w-5 text-purple-600" />
      Treinos ({treinosDiaSelecionado.length})
    </h4>
    {/* TODO: Implementar quando treinos forem definidos na página /meta */}
  </div>
)}
```

---

## CHECKLIST DE IMPLEMENTAÇÃO

- [ ] ETAPA 1: Adicionar Estados de Calendário
- [ ] ETAPA 2: Adicionar useEffect para Carregar Dados
- [ ] ETAPA 3: Implementar calcularAplicacoesPaciente
- [ ] ETAPA 4: Implementar obterAplicacoesMes
- [ ] ETAPA 5: Implementar obterPagamentosMes
- [ ] ETAPA 6: Implementar obterTreinosMes (placeholder)
- [ ] ETAPA 7: Implementar renderizarCalendario
- [ ] ETAPA 8: Adicionar Imports Necessários
- [ ] ETAPA 9: Testar Funcionalidades
- [ ] ETAPA 10: Preparar Estrutura para Treinos

---

## OBSERVAÇÕES IMPORTANTES

1. **Aplicações do Médico:** As aplicações são calculadas a partir do `planoTerapeutico` do paciente, que é definido pelo médico. O Personal Trainer apenas visualiza essas aplicações.

2. **Pagamentos do Personal:** Os pagamentos são específicos da relação Personal Trainer-Paciente, diferente dos pagamentos do nutricionista.

3. **Treinos:** A estrutura está preparada, mas a implementação será feita posteriormente quando os treinos forem definidos na página `/meta`.

4. **Cores:** Verificar se o metapersonal usa cores diferentes do metanutri (ex: amarelo ao invés de verde).

5. **Performance:** O calendário carrega pacientes e pagamentos automaticamente quando entra na seção, similar ao metanutri.

---

## REFERÊNCIAS

- **Código base:** `app/metanutri/page.v2.tsx` (linhas 5346-5914)
- **Tipos:** `types/obesidade.ts` (PlanoTerapeutico), `types/pagamento.ts` (ParcelaPagamento)
- **Serviços:** `services/pacientePersonalTrainerService.ts`, `services/pagamentoService.ts`
