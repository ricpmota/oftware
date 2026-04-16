# Módulo de Prescrições — /metaadmin

Documento de referência para o módulo de prescrições dos pacientes no painel do médico (`/metaadmin`). Usar como base para ajustes e refatorações.

---

## 1. Visão geral

O módulo permite ao médico:
- Ver **prescrições salvas** (templates globais + do médico + do paciente).
- **Criar** nova prescrição (nome, descrição, itens, observações).
- **Editar** e **excluir** prescrições próprias (não templates).
- **Imprimir** prescrição em PDF (com recálculo de dosagem por peso, quando for template).

Prescrições são **sempre no contexto de um paciente**: ou na **Pasta 9** (desktop) com o paciente do painel direito, ou no **modal mobile** aberto a partir do card do paciente.

---

## 2. Onde o módulo aparece

### 2.1 Desktop

- **Local:** painel direito ao **selecionar um paciente** na tabela.
- **Acesso:** abas (pastas) no topo → **Pasta 9 – Prescrições**.
- **Layout:** conteúdo inline no painel (sem modal).
- **Condição:** `pastaAtiva === 9` e `pacienteEditando` definido.

### 2.2 Mobile

- **Local:** botão **Prescrições** (ícone `ClipboardList`, roxo) em cada **card de paciente**.
- **Acesso:** lista de cards (`lg:hidden`) → clicar no botão Prescrições do paciente.
- **Layout:** **modal em tela cheia** (`fixed inset-0`, `z-[9999]`).
- **Condição:** `showModalPrescricoes && pacientePrescricoesSelecionado && medicoPerfil`.

O botão Prescrições aparece em **dois pontos** dos cards mobile (versão compacta e expandida do card), ambos abrindo o mesmo modal.

---

## 3. Arquivos e trechos principais

| O que | Onde |
|-------|------|
| **Página** | `app/metaadmin/page.tsx` |
| **Tipos** | `types/prescricao.ts` — `Prescricao`, `PrescricaoItem` |
| **Service** | `services/prescricaoService.ts` — CRUD, templates, PDF |
| **Firestore** | Coleção `prescricoes` |

### 3.1 Estados (page.tsx)

**Desktop (Pasta 9):**
- `prescricoes`, `loadingPrescricoes`
- `prescricaoSelecionada`, `prescricaoEditando`
- `novaPrescricao` — `{ nome, descricao, itens, observacoes }`

**Mobile (modal):**
- `showModalPrescricoes`, `pacientePrescricoesSelecionado`
- `prescricoesModal`, `loadingPrescricoesModal`
- `prescricaoSelecionadaModal`, `prescricaoEditandoModal`
- `novaPrescricaoModal` — mesma estrutura de `novaPrescricao`
- `abaPrescricoesModal`: `'salvas' | 'descricao'`

### 3.2 Carregamento de dados

- **Desktop:** `loadPrescricoes` (useCallback).  
  - Depende de `medicoPerfil` e `pacienteEditando`.  
  - Chamado ao ativar Pasta 9 (`useEffect` quando `pastaAtiva === 9`).
- **Mobile:** `loadPrescricoesModal(paciente)`.  
  - Chamado ao abrir o modal (botão Prescrições no card).

Ambos:
1. Garantem templates globais (`PrescricaoService.criarPrescricoesPadraoGlobais()`).
2. Buscam templates + prescrições do médico.
3. Filtram por paciente: templates + sem `pacienteId` + do paciente atual.
4. Atualizam lista e, se houver itens, selecionam a primeira e preenchem o formulário.

---

## 4. Estrutura da UI

### 4.1 Desktop (Pasta 9) — ~linhas 19686–20435

- **Header:** título “Prescrições” + botões **Nova Prescrição** e **Atualizar**.
- **Layout:** `grid` 3 colunas (`lg:grid-cols-3`).
  - **Col 1:** lista “Prescrições Salvas” (scroll `max-h-[calc(100vh-400px)]`).
  - **Cols 2–3:** editor da prescrição selecionada.

**Editor:**
- Nome *, Descrição, Itens * (medicamento, dosagem, frequência, quantidade, instruções), Observações.
- Botões: **Salvar** (ou “Salvar Alterações”), **Excluir** (só se não for template), **Imprimir**.

**Lista:**
- Cada item é um botão. Tipos:
  - **Template** (`isTemplate`): azul, “Prescrição Padrão”.
  - **Temporária** (`id === 'temp-new'`): amarelo, “Em edição”.
  - **Normal:** borda cinza.
- Ao clicar em template: exige peso do paciente; recalcula dosagem (ex.: Whey 1,6 g/kg, Creatina 3,5 g/dia) antes de abrir no editor.

### 4.2 Mobile (modal) — ~linhas 28427–28850+

- **Overlay:** fundo escuro; clique fecha o modal.
- **Header:** “Prescrições - {nome do paciente}” + **Nova Prescrição**, **Atualizar**, **X**.
- **Abas:**
  - **Prescrições Salvas:** só a lista (mesma lógica de template/temporária/normal).
  - **Descrição:** formulário de edição ou “Nenhuma prescrição selecionada” + botão “Voltar para Prescrições Salvas”.
- **Body:** scrollável; conteúdo depende da aba e da prescrição selecionada.
- **Footer:**  
  - Na aba **Descrição** com prescrição selecionada: **Voltar**, **Salvar**, **Excluir** (se não for template), **Imprimir**.  
  - Caso contrário: só opção de fechar.

**Formulário (aba Descrição):**
- Mesmos campos do desktop (Nome, Descrição, Itens, Observações), em layout mais compacto (grid 1–2 colunas, inputs menores).

---

## 5. Modelo de dados

### 5.1 `Prescricao` (types/prescricao.ts)

- `id`, `medicoId`, `pacienteId?`, `pacienteNome?`
- `nome`, `descricao`, `itens`, `observacoes?`
- `criadoEm`, `atualizadoEm`, `criadoPor`
- `isTemplate`, `pesoPaciente?`

### 5.2 `PrescricaoItem`

- `medicamento`, `dosagem`, `frequencia`, `instrucoes`, `quantidade?`

### 5.3 Firestore

- Coleção: `prescricoes`.
- Templates globais: `isTemplate === true`, `medicoId === 'SISTEMA'`.
- Prescrições do médico: `medicoId === id do médico`; com ou sem `pacienteId`.

---

## 6. Fluxos principais

### 6.1 Nova prescrição

1. Clicar em **Nova Prescrição**.
2. Criar prescrição temporária `id: 'temp-new'`, adicionar no topo da lista e selecionar.
3. Zerar/ajustar `novaPrescricao` / `novaPrescricaoModal`.
4. Usuário preenche nome, itens, etc.
5. **Salvar:** validação (nome, ao menos um item, todos os campos obrigatórios dos itens) → `PrescricaoService.createOrUpdatePrescricao` → remover `temp-new` da lista → recarregar e selecionar a prescrição salva.

### 6.2 Editar prescrição existente

1. Clicar na prescrição na lista.
2. Se for **template**: validar peso do paciente; recalcular itens (Whey, Creatina, etc.) e então abrir no editor.
3. Se não for template: abrir direto.
4. Alterações em `novaPrescricao` / `novaPrescricaoModal`.
5. **Salvar:** `createOrUpdatePrescricao` com dados atuais; atualizar estado local.

### 6.3 Excluir

- Só para prescrições **não template**.
- `confirm` → `PrescricaoService.deletePrescricao` → recarregar lista e limpar seleção/editor.

### 6.4 Imprimir (PDF)

- Usar peso do paciente (medidas iniciais ou última evolução).
- Se for template, recalcular dosagens (Whey, Creatina) antes de montar o PDF.
- jsPDF: cabeçalho (médico, CRM, logo), dados da prescrição, itens, observações.

---

## 7. Templates padrão (PrescricaoService)

Criados por `criarPrescricoesPadraoGlobais()` se não existirem:
- Prescrição Suplementar Padrão (Whey, Creatina, etc.)
- Prescrição de Probióticos
- Vitamina D3
- Hidroximetilbutirato (HMB)

Recálculo por peso aplicado principalmente a **Whey Protein** (1,6 g/kg/dia, 3x/dia) e **Creatina** (3,5 g/dia).

---

## 8. Resumo de linhas (page.tsx)

| Bloco | Linhas aprox. |
|-------|----------------|
| Estados prescrições (desktop) | 973–983 |
| Estados prescrições (modal mobile) | 1619–1632 |
| `loadPrescricoes` | 3904–3945 |
| `loadPrescricoesModal` | 3947–3982 |
| useEffect carga ao ativar Pasta 9 | 3723–3765 |
| Botão Prescrições em cards mobile | 6017–6029, 6268–6280 |
| Pasta 9 (tabs) | 13705 |
| UI Pasta 9 – Prescrições | 19686–20435 |
| Modal Prescrições (mobile) | 28427–28850+ |

---

## 9. Observações para refatoração

- **Duplicação:** há lógica e UI muito similares entre desktop (Pasta 9) e modal mobile (lista, editor, salvar, excluir, imprimir). Candidato a componentes compartilhados ou hooks.
- **Estados separados:** `novaPrescricao` vs `novaPrescricaoModal`, etc. Unificar ou extrair para um único estado/hook pode simplificar manutenção.
- **Recálculo por peso:** trechos repetidos para Whey/Creatina no desktop e no mobile; pode ir para helpers ou para o service.
- **Impressão:** geração de PDF duplicada (desktop vs mobile); extrair para função única.
- **Abas mobile:** só o modal usa `abaPrescricoesModal`; desktop tem lista + editor lado a lado sempre visíveis.

Usar este documento como referência ao planejar e implementar o “ajuste grande” no módulo de prescrições.
