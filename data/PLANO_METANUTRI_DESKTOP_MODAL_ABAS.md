# Plano: Metanutri Desktop — Modal Único com Abas (Padrão MetaAdmin)

## Objetivo

Transformar a experiência de **visualização de paciente** no `/metanutri` desktop para seguir o mesmo padrão do `/metaadmin` desktop: **um único modal grande** com **várias abas**, onde cada aba representa uma função (Dados de Identificação, Dados Clínicos, Exames, Prescrições, etc.). Manter todas as funções que já existem na versão mobile do metanutri, adaptadas para esse modal unificado.

---

## Situação Atual vs. Situação Desejada

### Situação Atual (Metanutri)

| Contexto | Comportamento | Modais |
|----------|---------------|--------|
| **Desktop** | Tabela de pacientes; botão "Visualizar" abre modal com **2 abas** (Identificação, Dados Clínicos). Outras funções (Exames, Prescrições, Personal, Pagamento, Gráficos) **não estão** no modal. | `showVisualizarPacienteModal` (2 abas), `showModalExames`, `showModalPrescricoes`, `showModalPersonal`, `showModalPagamento`, `showGraficosModal` |
| **Mobile** | Cards de pacientes com botões; cada botão abre um modal separado. O botão "Editar" abre `showVisualizarPacienteModal` (2 abas). | Mesmos modais separados |

### Situação Desejada

| Contexto | Comportamento | Modal |
|----------|---------------|-------|
| **Desktop** | Um único modal grande (como metaadmin) com **N abas**. Ao clicar em "Visualizar" ou em qualquer função específica, abre o modal (eventualmente já na aba correspondente). | `showVisualizarPacienteModal` com 8–9 abas |
| **Mobile** | Manter cards com botões, mas os botões passam a **abrir o mesmo modal** na aba correspondente (ou manter modais separados em mobile por UX — ver Etapa 6). | Opção A: Modal único com abas. Opção B: Modais separados (como hoje) |

---

## Referência: MetaAdmin Desktop (9 Pastas)

O metaadmin usa o seguinte layout quando o médico clica em "Editar Paciente":

1. **Modal grande**: `max-w-7xl`, `h-[90vh]`, `overflow-hidden flex flex-col`
2. **Header**: Nome do paciente, status, seletor de status, botão fechar
3. **Tabs horizontais**: 9 pastas clicáveis
4. **Conteúdo**: Scroll vertical no conteúdo da pasta ativa

**Abas do MetaAdmin:**
1. Dados de Identificação  
2. Dados Clínicos  
3. Nutrologia  
4. Exames Laboratoriais  
5. Plano Terapêutico  
6. Evolução/Seguimento  
7. Alertas e Eventos  
8. Comunicação  
9. Prescrições  

---

## Funções Existentes no Metanutri Mobile (a preservar)

Com base em `CARD_PACIENTE_MOBILE_METANUTRI.md` e `app/metanutri/page.v2.tsx`:

| # | Função | Modal/Componente Atual | Descrição |
|---|--------|------------------------|-----------|
| 1 | Visualizar (Editar) | `showVisualizarPacienteModal` | Dados de identificação e dados clínicos (read-only) |
| 2 | Aplicações | Expandível no card (`pacienteDetalhesExpandido`) | Lista de aplicações/semana, botão Gráficos |
| 3 | Exames | `showModalExames` | Lista de exames por data, visualização por seção |
| 4 | Prescrições | `showModalPrescricoes` | Prescrições salvas, agrupadas por subtipo, descrição |
| 5 | Nutrição | Redireciona para `/meta?pacienteId=...&menu=nutri` | Link para página do paciente |
| 6 | Personal Trainer | `showModalPersonal` | Vínculos com personal, calendário de treinos |
| 7 | Pagamento | `showModalPagamento` | Status, parcelas, valores |
| 8 | Gráficos | `showGraficosModal` | Gráficos de peso, circunferência, HbA1c, IMC |

---

## Mapeamento: Funções → Abas do Modal

| Aba | Nome | Conteúdo (origem) | Read-only |
|-----|------|-------------------|-----------|
| 1 | Dados de Identificação | Conteúdo atual da pasta 1 de `showVisualizarPacienteModal` | Sim |
| 2 | Dados Clínicos | Conteúdo atual da pasta 2 de `showVisualizarPacienteModal` | Sim |
| 3 | Exames Laboratoriais | Conteúdo de `showModalExames` | Sim |
| 4 | Evolução/Aplicações | Lista de aplicações + botão Gráficos (ou gráficos inline) | Sim |
| 5 | Prescrições | Conteúdo de `showModalPrescricoes` | Sim |
| 6 | Nutrologia / Nutrição | Link para `/meta?pacienteId=...&menu=nutri` + resumo (opcional) | Sim |
| 7 | Personal Trainer | Conteúdo de `showModalPersonal` | Sim |
| 8 | Pagamento | Conteúdo de `showModalPagamento` | Sim (ou editável conforme regras de negócio) |
| 9 | Gráficos | Conteúdo de `showGraficosModal` | Sim |

---

## Etapas do Plano (Passo a Passo)

### Etapa 1: Preparação e Estado

**Objetivo:** Garantir que o estado e a estrutura suportem múltiplas abas e o modal único.

- [ ] **1.1** Expandir `pastaAtiva` para suportar IDs de 1 a 9 (ou usar enum/union type).
- [ ] **1.2** Adicionar estado opcional `abaInicialAoAbrir?: number` para permitir abrir o modal direto em uma aba específica (ex: clicar em "Exames" → modal abre na aba 3).
- [ ] **1.3** Garantir que `pacienteVisualizando` e todos os dados necessários (exames, prescrições, pagamento, etc.) estejam disponíveis quando o modal abrir. Se algum dado for carregado sob demanda, preparar `useEffect` para carregar ao trocar de aba.
- [ ] **1.4** Documentar quais dados são carregados ao abrir o modal e quais ao trocar de aba (lazy loading).

**Arquivos:** `app/metanutri/page.v2.tsx`

---

### Etapa 2: Estrutura do Modal (Layout)

**Objetivo:** Redesenhar o modal "Visualizar Paciente" para ter o mesmo layout do metaadmin (header + tabs + conteúdo).

- [ ] **2.1** Ajustar classes do container do modal para `max-w-7xl h-[90vh] overflow-hidden flex flex-col` (já pode estar próximo).
- [ ] **2.2** Manter header com:
  - Título "Visualizar Paciente"
  - Nome do paciente
  - Aviso de somente leitura (nutricionista)
  - Status do tratamento
  - Botão fechar
- [ ] **2.3** Trocar as 2 abas atuais por uma lista de abas horizontal (como metaadmin):
  - Dados de Identificação
  - Dados Clínicos
  - Exames Laboratoriais
  - Evolução/Aplicações
  - Prescrições
  - Nutrologia
  - Personal Trainer
  - Pagamento
  - Gráficos
- [ ] **2.4** Estilizar tabs com `border-b-2`, `overflow-x-auto` e cores ativas (ex: `border-green-500 text-green-700 bg-green-50`).
- [ ] **2.5** Área de conteúdo: `flex-1 overflow-y-auto p-6` para scroll vertical.

**Referência:** `app/metaadmin/page.tsx` linhas ~15438–15698.

---

### Etapa 3: Migrar Conteúdo das Abas 1 e 2

**Objetivo:** Garantir que as abas 1 e 2 funcionem exatamente como hoje dentro do novo layout.

- [ ] **3.1** Manter o JSX atual das abas "Dados de Identificação" e "Dados Clínicos" (são read-only).
- [ ] **3.2** Apenas trocar a condição de exibição de `pastaAtiva === 1` e `pastaAtiva === 2` para os novos IDs.
- [ ] **3.3** Testar que não há regressão visual ou de dados.

---

### Etapa 4: Migrar Conteúdo dos Modais para Abas (3 a 9)

**Objetivo:** Integrar o conteúdo de cada modal separado como conteúdo de uma aba.

- [ ] **4.1** Aba 3 – Exames Laboratoriais  
  - Copiar o conteúdo de `showModalExames` para dentro de `pastaAtiva === 3`.
  - Preservar: lista de datas, seções expandidas, exames por data, barra de referência (LabRangeBar).
  - Remover wrapper do modal antigo (overlay, botão fechar do modal específico).
  - Adaptar altura/layout para caber na área de conteúdo do modal.

- [ ] **4.2** Aba 4 – Evolução/Aplicações  
  - Extrair a lista de aplicações que hoje está no card expandido (`pacienteDetalhesExpandido`).
  - Incluir: lista de semanas, peso, dose, variação.
  - Incluir botão "Gráficos" que, ao clicar, pode trocar para a aba Gráficos (`setPastaAtiva(9)`) em vez de abrir modal separado.
  - Ou incorporar os gráficos diretamente nessa aba (avaliar UX).

- [ ] **4.3** Aba 5 – Prescrições  
  - Copiar o conteúdo de `showModalPrescricoes` para `pastaAtiva === 5`.
  - Manter abas internas (Prescrições Salvas / Descrição) se fizer sentido.
  - Adaptar para layout de aba (sem modal sobre modal).

- [ ] **4.4** Aba 6 – Nutrologia  
  - Botão/link "Abrir Plano Nutricional do Paciente" → `router.push(\`/meta?pacienteId=${pacienteId}&menu=nutri\`)`.
  - Opcional: pequeno resumo (último check-in, metas, etc.) se houver dados disponíveis.

- [ ] **4.5** Aba 7 – Personal Trainer  
  - Copiar o conteúdo de `showModalPersonal` para `pastaAtiva === 7`.
  - Manter: vínculos ativos, calendário de treinos, botão buscar personal.

- [ ] **4.6** Aba 8 – Pagamento  
  - Copiar o conteúdo de `showModalPagamento` para `pastaAtiva === 8`.
  - Verificar se nutri pode editar pagamento; se não, manter somente leitura.

- [ ] **4.7** Aba 9 – Gráficos  
  - Copiar o conteúdo de `showGraficosModal` para `pastaAtiva === 9`.
  - Manter seletor de gráfico (peso, circunferência, HbA1c, IMC) e `ResponsiveContainer`.

---

### Etapa 5: Atualizar Pontos de Entrada (Desktop)

**Objetivo:** Fazer com que todos os cliques que hoje abrem modais separados passem a abrir o modal único na aba correta.

- [ ] **5.1** Botão "Visualizar" na tabela desktop: continua abrindo `showVisualizarPacienteModal` com `pastaAtiva = 1`.
- [ ] **5.2** Botão "Exames" na tabela (se existir): passar a abrir o modal com `setPastaAtiva(3)` (ou `abaInicialAoAbrir = 3`).
- [ ] **5.3** Botão "Prescrições": abrir modal com `pastaAtiva = 5`.
- [ ] **5.4** Botão "Personal": abrir modal com `pastaAtiva = 7`.
- [ ] **5.5** Botão "Gerenciar" (pagamento) na seção Financeiro: pode continuar abrindo modal de pagamento isolado OU abrir o modal único na aba 8. Definir conforme UX.
- [ ] **5.6** Remover ou ocultar modais antigos (`showModalExames`, `showModalPrescricoes`, `showModalPersonal`, `showModalPagamento`, `showGraficosModal`) quando o contexto for "dentro do modal de visualização desktop".
- [ ] **5.7** Garantir que, ao abrir o modal com `abaInicialAoAbrir`, o `useEffect` ou lógica de abertura defina `setPastaAtiva(abaInicialAoAbrir)`.

---

### Etapa 6: Comportamento Mobile

**Objetivo:** Decidir e implementar o comportamento em mobile.

**Opção A – Modal único com abas também em mobile**
- [ ] Usar o mesmo modal com abas em mobile.
- [ ] Tabs podem ser scroll horizontal (`overflow-x-auto`).
- [ ] Avaliar se o modal em tela cheia ou `max-h-[90vh]` é melhor.

**Opção B – Manter modais separados em mobile**
- [ ] Em mobile, os botões do card continuam abrindo modais específicos (Exames, Prescrições, etc.).
- [ ] O botão "Editar/Visualizar" abre o modal com 2 abas (Identificação e Dados Clínicos), como hoje, ou um modal reduzido com menos abas.
- [ ] Documentar a diferença entre desktop e mobile.

**Recomendação:** Avaliar com o time; Opção A tende a uniformizar a experiência, Opção B pode ser mais confortável em telas pequenas.

---

### Etapa 7: Carregamento de Dados (Lazy Loading)

**Objetivo:** Evitar carregar todos os dados ao abrir o modal; carregar por aba.

- [ ] **7.1** Ao abrir o modal: carregar apenas dados básicos do paciente (já vêm de `pacienteVisualizando`).
- [ ] **7.2** Aba Exames: carregar `examesLaboratoriais` ao montar ou ao ativar `pastaAtiva === 3` (se não estiver em `pacienteVisualizando`).
- [ ] **7.3** Aba Prescrições: usar `loadPrescricoesModal` quando `pastaAtiva === 5`.
- [ ] **7.4** Aba Personal: carregar vínculos e treinos quando `pastaAtiva === 7`.
- [ ] **7.5** Aba Pagamento: carregar `dadosPagamento` quando `pastaAtiva === 8` (similar ao fluxo atual do modal de pagamento).
- [ ] **7.6** Documentar no código quais abas disparam carregamento e qual função é chamada.

---

### Etapa 8: Subcomponentes e Refatoração (Opcional)

**Objetivo:** Reduzir o tamanho de `page.v2.tsx` e melhorar manutenção.

- [ ] **8.1** Extrair cada conteúdo de aba para um componente, ex:
  - `MetanutriAbaIdentificacao.tsx`
  - `MetanutriAbaDadosClinicos.tsx`
  - `MetanutriAbaExames.tsx`
  - etc.
- [ ] **8.2** Receber `paciente: PacienteCompleto` e callbacks como props.
- [ ] **8.3** Manter a lógica de estado (pastaAtiva, pacienteVisualizando) no `page.v2.tsx`.

---

### Etapa 9: Testes e Validação

- [ ] **9.1** Testar abertura do modal a partir da tabela desktop (botão Visualizar).
- [ ] **9.2** Testar navegação entre todas as abas.
- [ ] **9.3** Testar abertura direta em aba específica (Exames, Prescrições, etc.) a partir dos botões da tabela/card.
- [ ] **9.4** Testar em mobile (conforme decisão da Etapa 6).
- [ ] **9.5** Verificar que não há modais órfãos ou estados inconsistentes ao fechar.
- [ ] **9.6** Verificar performance ao trocar de aba (lazy loading funcionando).
- [ ] **9.7** Garantir que o aviso "Somente visualização" permanece visível para o nutricionista.

---

### Etapa 10: Documentação e Limpeza

- [ ] **10.1** Atualizar `CARD_PACIENTE_MOBILE_METANUTRI.md` se o comportamento mobile mudar.
- [ ] **10.2** Remover ou deprecar componentes/modais não mais utilizados.
- [ ] **10.3** Adicionar comentário no código explicando a estrutura do modal (inspirado no metaadmin).
- [ ] **10.4** Atualizar este documento com o que foi implementado e o que ficou para trás.

---

## Resumo das Abas Finais (Desktop Metanutri)

| # | Aba | Conteúdo |
|---|-----|----------|
| 1 | Dados de Identificação | Nome, email, telefone, CPF, data nascimento, sexo, endereço (read-only) |
| 2 | Dados Clínicos | Medidas iniciais, anamnese (read-only) |
| 3 | Exames Laboratoriais | Lista de exames por data, seções, LabRangeBar |
| 4 | Evolução/Aplicações | Lista de aplicações por semana, botão Gráficos |
| 5 | Prescrições | Prescrições salvas, agrupadas, descrição |
| 6 | Nutrologia | Link para /meta + resumo opcional |
| 7 | Personal Trainer | Vínculos, calendário de treinos |
| 8 | Pagamento | Status, parcelas, valores |
| 9 | Gráficos | Peso, circunferência, HbA1c, IMC |

---

## Considerações Especiais

### Read-only

O nutricionista **não edita** dados do paciente (exceto possivelmente pagamento, conforme regra de negócio). Todas as abas devem ser claramente em modo visualização, com o aviso no header.

### Consistência com MetaAdmin

O layout (modal grande, tabs horizontais, área de conteúdo com scroll) deve ser idêntico ao metaadmin para facilitar o uso por quem já conhece a plataforma.

### Responsividade

Em telas menores, as abas devem ter `overflow-x-auto` para scroll horizontal. O conteúdo de cada aba deve ser responsivo (tabelas com scroll horizontal, grids que quebram linha, etc.).

---

## Conclusão

Este plano permite transformar o metanutri desktop para usar um único modal com abas, alinhado ao metaadmin, mantendo todas as funções da versão mobile e adaptando-as para o novo layout. A execução por etapas reduz riscos e permite validação incremental.
