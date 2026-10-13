# Planos alimentares reutilizáveis (MetaNutri) — modelo para o Metapersonal

Documento de briefing: como a nutricionista **salva cardápios padrão** e como, no **cardápio daquele paciente**, ela **puxa** um plano salvo. Objetivo: implantar o mesmo padrão para treinos no `/metapersonal`.

**Fonte de verdade:** código atual.  
**Não é upload de PDF/arquivo.** “Puxar de um Plano” copia um **snapshot JSON** da biblioteca da profissional para a refeição/opção do paciente.

**Data:** 2026-08-16.

---

## Como usar este arquivo

Cole no ChatGPT junto com `docs/personal/ESTRUTURA_MONTAR_TREINO.md` e peça, por exemplo:

- “Quero a mesma biblioteca de planos do MetaNutri, mas para treinos no Metapersonal.”
- “Não misture Treinos Salvos (sessões do aluno) com a biblioteca do personal.”
- “O import deve ser por sessão/treino, equivalente a puxar uma refeição.”

---

## 1. Ideia em uma frase

A nutricionista tem uma **biblioteca pessoal** de cardápios nomeados (ex.: “Endometriose”), **independente do paciente**.  
Quando está montando o **cardápio daquele aluno**, abre o meal builder e clica **Puxar de um Plano**: a refeição daquele horário (café, almoço, …) é **substituída** pelos itens do template. Depois ela **Salvar** grava no plano nutricional do paciente.

Dois bancos, dois papéis:

| Camada | Dono | O que é | Onde vive |
| --- | --- | --- | --- |
| Biblioteca (template) | Nutricionista | Cardápio reutilizável, 5 refeições | `nutricionistas/{uid}/planos_cardapio/{planoId}` |
| Instância do paciente | Paciente | Cardápio daquele aluno (5 refeições × 5 opções) | `pacientes_completos/{pacienteId}/nutricao/plano` |

O template **não é referência viva**. Copiar gera **novos ids** (`imp_cafe_…`). Mudar o template depois **não** atualiza cardápios já puxados.

O paciente em `/meta/nutri` **não** vê a aba Planos nem o botão Puxar. Só a nutricionista (`habilitarPlanosTemplates`).

---

## 2. Onde aparece na UI

Tudo passa por `components/NutriContent.tsx`, com a flag `habilitarPlanosTemplates`.

Ligada em:

- Modal do paciente no `/metanutri` (pasta Nutrologia) — `habilitarPlanosTemplates`
- Rota `/metanutri/nutri/[pacienteId]`
- Modal “ver como paciente” no metanutri

Desligada em `/meta/nutri` (paciente) e no Metapersonal (`somenteVisualizacao`, sem a flag).

### 2.1 Aba **Planos Alimentares** (biblioteca)

Quando a flag está on, entra uma aba extra nas seções do Nutri:

`Plano Nutri · Cardápio · Planos Alimentares · Histórico · ChatNutri`

Conteúdo: `NutriPlanosTemplatesPanel` (`components/nutri/NutriPlanosTemplatesPanel.tsx`).

Texto da própria tela:

> Salve cardápios padrão nomeados (ex.: Endometriose) com café, lanches, almoço e jantar. Depois, no Cardápio do paciente, puxe a refeição pronta ao editar uma opção.

Fluxo da biblioteca:

1. Lista de planos (nome + quantos itens em cada refeição + data).
2. **Novo plano** / editar: nome obrigatório + builder das 5 refeições (Café, Lanche 1, Almoço, Lanche 2, Jantar).
3. Em cada refeição: abas Proteína / Carboidrato / Gordura / Reguladores.
4. **Adicionar alimento:** METANUTRI (padrão) | TACO | MANUAL. Snapshot, não link vivo.
5. **Salvar** → `NutriPlanosTemplateService.salvar(uid, { id?, nome, refeicoes })`.
6. Excluir pede confirm e apaga só o template (não mexe no paciente).

UID = `auth.currentUser.uid` = doc em `nutricionistas/{uid}`.

### 2.2 Cardápio do paciente (instância)

Aba **Cardápio**: 5 refeições, cada uma com **Opção 01–05** (`opcoesSlots`).

Clicar numa opção abre o meal builder fullscreen (`refeicaoEmEdicao` + `activeOpcaoSlot`), portal `document.body`.

Com a flag, no header do builder aparece:

**Puxar de um Plano** (`BookMarked`) → `setShowImportarPlanoModal(true)`.

Isso **não** aplica o cardápio inteiro de uma vez. Importa **só a refeição do horário aberto** (se está no Almoço, só o almoço do template).

---

## 3. “Upload” / Puxar de um Plano (o que implantar)

Componente: `ImportarRefeicaoDePlanoModal` no mesmo arquivo do painel de templates.

```
Meal builder do paciente (refeição X, opção N)
  → botão Puxar de um Plano
  → lista NutriPlanosTemplateService.listar(uid)
  → cada card mostra o trecho daquela refeição no template
      (n itens + macros; disabled se n === 0)
  → clique
      clonarItensComNovosIds(refeicao, `imp_${refeicaoKey}`)
      se a opção já tem seleção → “Substituir itens atuais?”
  → onImportar(refeicaoClonada)
  → ainda em memória; o nutricionista clica Salvar no builder
  → pacientes_completos/{id}/nutricao/plano
```

### 3.1 Clone (obrigatório)

`clonarItensComNovosIds` em `lib/nutri/planosNutricionista.ts`:

- Novo `id` por item: `imp_almoco_{timestamp}_{idx}_{rand}`
- Remapeia `itensSelecionados`
- Recalcula macros

Sem isso, ids do template colidiriam com o catálogo/opções do paciente.

Prefixos de item custom no cardápio: `metanutri_`, `taco_`, `manual_`, `imp_`.

### 3.2 O que `importarRefeicaoDePlanoTemplate` faz no `NutriContent`

Ainda **não** grava Firestore. Só o estado do builder:

1. Pega itens selecionados do template (ou todos, se a lista de selecionados estiver vazia).
2. Converte `ItemPlanoRefeicao` → `ItemRefeicao` (`itemPlanoComoItemRefeicao` / `lib/nutri/itemRefeicaoSnapshot.ts`) — preserva P/C/G/F, porção, origem, `alimentoGlobalId`.
3. **Replace** de `itensCustomizadosPorRefeicao[refeicaoEmEdicao]` (não faz merge).
4. Tira customs antigos de `itensDisponiveis` e coloca os novos.
5. Marca todos os importados como selecionados.
6. Copia `observacao` da refeição do template.
7. Abre a aba da categoria do primeiro item.

### 3.3 Persistência no paciente

`salvarAlteracoesCardapio`:

- Exige `podeEditarNutri` (`modoNutricionista && !somenteVisualizacao`).
- Exige pelo menos uma proteína selecionada.
- Grava **um slot** (`Opção 01–05`) daquela refeição: título, texto, macros, `itensSelecionados`, `itensDetalhe`, observação.
- `setDoc` em `pacientes_completos/{id}/nutricao/plano` (documento único `plano`, merge do objeto inteiro do plano nutricional).

Importar 5 refeições = abrir 5 vezes o builder (ou 5 opções) e puxar + salvar cada uma. Não há “aplicar plano inteiro no dia”.

---

## 4. Modelo de dados da biblioteca

Tipos: `lib/nutri/planosNutricionista.ts`.  
CRUD: `services/nutriPlanosTemplateService.ts`.  
Subcollection: `planos_cardapio`.

```
nutricionistas/{nutricionistaId}/planos_cardapio/{planoId}
  nome: string
  criadoEm, atualizadoEm: Timestamp
  refeicoes: {
    cafe | lanche1 | almoco | lanche2 | jantar: {
      itens: ItemPlanoRefeicao[]
      itensSelecionados: string[]
      proteina_g, calorias_kcal
      carboidrato_g?, gordura_g?, fibra_g?
      titulo, descricao, observacao?
    }
  }
```

`ItemPlanoRefeicao` é snapshot: nome, categoria, macros já escalados + bases de porção (`peso_g`, `quantidade`, `pesoBase_g`), `origemAlimento`, `alimentoGlobalId?`.

Firestore não aceita `undefined` → `omitUndefinedDeep` na serialização.

Listar: `orderBy('atualizadoEm', 'desc')`.  
Salvar: `setDoc(..., { merge: true })`. Sem `id` = doc novo.

Não há `pacienteId` no template. A biblioteca é da profissional, não “plano gravado para aquele paciente”. O que é “para aquele paciente” é só depois do Puxar + Salvar no cardápio dele.

---

## 5. Modelo de dados da instância (cardápio do paciente)

Documento: `pacientes_completos/{pacienteId}/nutricao/plano`.

O relevante para o import:

- `opcoesSlots[refeicao]`: até 5 `OpcaoRefeicao` (Opção 01–05)
- `opcoesSelecionadas[refeicao]`: qual slot é o “Atual” do dia
- `itensCustomizadosPorRefeicao`: lista extra (imports, TACO, METANUTRI, manual)
- `modeloDia`, metas de proteína/água/kcal, etc. (plano nutricional, não o template)

Cada opção guarda `itensSelecionados` + `itensDetalhe` (snapshot dos alimentos daquela opção).

Paciente em `/meta/nutri` **escolhe** entre opções já gravadas e faz check-in. Não monta biblioteca e não puxa template.

---

## 6. Quem pode o quê

| Superfície | Flag | Biblioteca | Puxar no cardápio | Editar cardápio do aluno |
| --- | --- | --- | --- | --- |
| Metanutri (nutri) | `habilitarPlanosTemplates` | Sim | Sim | Sim |
| `/meta/nutri` (paciente) | off | Não | Não | Só escolher opção / check-in |
| Metapersonal (vê nutrologia) | `somenteVisualizacao` | Não | Não | Não |
| Metaadmin | sem a flag no NutriContent típico | Não | Não | Depende do embed |

Auth da busca METANUTRI na biblioteca: Bearer + `requireNutricionistaMetaNutri`.  
CRUD dos templates: cliente Firestore com o uid logado (regras catch-all auth; a UI assume que só o nutri daquele uid lê/escreve a subcollection dele).

---

## 7. O que o Metapersonal tem hoje (não é a mesma coisa)

Ver `docs/personal/ESTRUTURA_MONTAR_TREINO.md`.

| Nutri (este doc) | Personal hoje |
| --- | --- |
| Biblioteca da profissional, sem paciente | **Não existe.** “Treinos Salvos” são `trainingSessions` **daquele aluno** |
| Template nomeado (Endometriose) com 5 refeições | Sessão com título + data + exercícios; recorrência = **cópias** de docs |
| Puxar 1 refeição → opção do cardápio do aluno | Editar série = recriar sessões e apagar as antigas |
| Snapshot de alimentos | Snapshot de exercício ExerciseDB (`exerciseId`, `sets/reps/restSec`, `gifUrl`) |
| 1 doc `nutricao/plano` por paciente | N docs `trainingSessions` por data |

Não dá para “ligar uma flag” no Personal. Precisa de uma **camada nova** equivalente a `planos_cardapio`.

`WorkoutPlanDraft` / motor determinístico também **não** é isso: é proposta gerada pela avaliação, não biblioteca manual nomeada pelo PT.

---

## 8. Mapa sugerido para implantar no Metapersonal

Espelhar o nutri, não o draft do motor.

### 8.1 Biblioteca do personal

```
personal_trainers/{personalTrainerId}/planos_treino/{planoId}
  nome: string                    // ex.: "Superior — academia"
  criadoEm, atualizadoEm
  exercicios: Array<{             // equivalente a 1 "refeição" ou ao treino inteiro
    source: 'exercisedb'
    exerciseId: string
    name, bodyPart, target, equipment
    gifUrl?: string               // /api/exercisedb/image?exerciseId=&resolution=360
    prescription: { sets, reps, restSec }
    order: number
  }>
```

Decisão de produto (o nutri importa **por refeição**, não o dia inteiro):

- **A — mais fiel ao nutri:** template = 1 treino (lista de exercícios). Puxar preenche o rascunho da aba Criar (`selectedExercises`) daquele aluno.
- **B — semana:** template com vários dias (split). Puxar geraria várias sessões. O nutri **não** faz isso; só faria sentido se o PT pedir explicitamente.

Recomendação para v1: **A**. Um plano salvo = um treino. Recorrência continua sendo do Criar (único/recorrente), depois de puxar.

### 8.2 Onde na UI

| Nutri | Personal |
| --- | --- |
| Aba **Planos Alimentares** no `NutriContent` | Nova aba **Planos de treino** (ou seção na aba Criar) no `PersonalPageContent`, só com `fromMetapersonalEmbedded` / modo PT |
| Builder do template (5 refeições + alimentos) | Reusar busca/GIF/steppers da aba Criar, gravando na biblioteca **sem** `patientId` |
| **Puxar de um Plano** no meal builder | Botão no sheet/FAB da aba Criar, **antes** de `handleCreateSession`, listando a biblioteca do PT |
| `clonarItensComNovosIds` | Copiar exercícios com os mesmos `exerciseId` (GIF resolve de novo pelo id); não precisa de id novo de alimento, mas **não** copiar id de doc Firestore de sessão |
| `salvarAlteracoesCardapio` | Fluxo já existente `handleCreateSession` → `trainingSessions` |

Não ligar isso no `/meta/personal` do paciente nem no embed read-only do médico/nutri (`fromMetaadminEmbedded`).

### 8.3 O que não reusar

- `itensCustomizadosPorRefeicao` / categorias proteína-carboidrato — domínio de comida.
- `Opção 01–05` — o Personal não tem 5 slots por dia; tem N sessões por data.
- `NutriPlanosTemplatesPanel` inteiro — copiar a **ideia** (lista + editor + modal de puxar), não o componente.
- Motor `WorkoutPlanDraft` como biblioteca — mistura geração automática com template manual.

### 8.4 Arquivos a criar (espelho)

| Nutri | Personal (sugerido) |
| --- | --- |
| `lib/nutri/planosNutricionista.ts` | `lib/personal/planosTreino.ts` (tipo do template) |
| `services/nutriPlanosTemplateService.ts` | `services/personalPlanosTreinoService.ts` |
| `NutriPlanosTemplatesPanel` | `PersonalPlanosTreinoPanel` |
| `ImportarRefeicaoDePlanoModal` | `ImportarPlanoTreinoModal` (lista templates → preenche `selectedExercises`) |
| Flag `habilitarPlanosTemplates` | Flag `habilitarPlanosTreinoTemplates` (só metapersonal PT) |

Persistência do aluno **já existe**: `trainingSessionService.createSessionWithExercises`. O import só alimenta o rascunho.

### 8.5 GIFs

Ao puxar, gravar `exerciseId` ExerciseDB e resolver `gifUrl` com `resolveExerciseGifUrl` / proxy `/api/exercisedb/image`. Não copiar URL RapidAPI. Ver seção 6 do doc de montar treino.

---

## 9. Fluxo mental (colar no ChatGPT)

```
Nutri (hoje)
  Aba Planos Alimentares
    → nutricionistas/{uid}/planos_cardapio  (biblioteca, sem paciente)
  Aba Cardápio do aluno → abrir opção → Puxar de um Plano
    → clona 1 refeição (novos ids imp_*)
    → replace da opção em memória
    → Salvar → pacientes_completos/{id}/nutricao/plano

Personal (alvo)
  Aba/biblioteca Planos de treino
    → personal_trainers/{uid}/planos_treino  (biblioteca, sem aluno)
  Aba Criar do aluno → Puxar de um Plano
    → copia exercícios (exerciseId + sets/reps/rest) para selectedExercises
    → personal ajusta data/recorrência
    → Salvar → trainingSessions + exercises  (igual hoje)
```

---

## 10. Pegadinhas

1. **Duas camadas.** Biblioteca ≠ cardápio/treino do aluno. “Treinos Salvos” hoje é a segunda camada. Não transformar isso na biblioteca.
2. **Não é arquivo.** Não há Storage/PDF nesse fluxo. É JSON no Firestore.
3. **Import é por fatia.** Nutri = uma refeição. Personal v1 = um treino (lista de exercícios), não a semana.
4. **Replace, não merge.** Puxar troca os itens da opção. Se já havia seleção, confirma.
5. **Clone de ids** no nutri evita colisão. No personal o id que importa é o `exerciseId` da API, não o id do template.
6. **Paciente não puxa.** Só a profissional, no ambiente do aluno.
7. **Snapshot.** Alimento/exercício copiado não atualiza se o template mudar.
8. **`habilitarPlanosTemplates` é a trava de UI.** Sem ela o botão e a aba não existem. O paciente nunca recebe a flag.
9. **Salvar o puxar é explícito.** Import só mexe estado; Firestore do aluno só no Salvar do builder/Criar.
10. **UID da biblioteca = uid da profissional logada**, não `paciente.userId`.

---

## 11. Arquivos (nutri, para o ChatGPT não inventar)

| Arquivo | Papel |
| --- | --- |
| `lib/nutri/planosNutricionista.ts` | Tipos do template + clone + macros + porção |
| `services/nutriPlanosTemplateService.ts` | listar / salvar / excluir `planos_cardapio` |
| `components/nutri/NutriPlanosTemplatesPanel.tsx` | Biblioteca + `ImportarRefeicaoDePlanoModal` |
| `components/NutriContent.tsx` | Flag, aba Planos, meal builder, `importarRefeicaoDePlanoTemplate`, `salvarAlteracoesCardapio` |
| `lib/nutri/itemRefeicaoSnapshot.ts` | Ponte template ↔ cardápio do paciente |
| `app/metanutri/page.v2.tsx` | `habilitarPlanosTemplates` no embed |
| `app/metanutri/nutri/[pacienteId]/page.tsx` | Idem na rota fullscreen |
| `features/metaNutri/metaNutri.constants.ts` | `COL_NUTRICIONISTAS` |
| `features/metaPersonal/metaPersonal.constants.ts` | `COL_PERSONAL_TRAINERS` (alvo da subcollection nova) |

Docs vizinhos: `docs/metanutri/ETAPA_05_METANUTRI_FONTE_PLANOS.md` (alimentos no template), `docs/metanutri/ETAPA_08_METANUTRI_CARDAPIO_PACIENTE.md` (cardápio do aluno + import preserva snapshot).

---

## 12. Prompt sugerido

> Li `docs/personal/PLANOS_ALIMENTARES_NUTRI_MODELO_PARA_TREINO.md` e `docs/personal/ESTRUTURA_MONTAR_TREINO.md`. Quero implantar no Metapersonal uma biblioteca de treinos equivalente aos planos alimentares: subcollection em `personal_trainers/{uid}`, UI só para o PT, botão Puxar no Criar do aluno preenchendo `selectedExercises`, persistência ainda via `trainingSessions`. Não usar WorkoutPlanDraft. Não transformar Treinos Salvos na biblioteca. Não inventar upload de arquivo.
