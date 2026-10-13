# Layout moderno — Dose e Titulação / Esquema de Doses

**Data:** 2026-09-21  
**Escopo:** modernização visual da área de planejamento semanal de Tirzepatida no MetaAdmin.  
**Tipo de mudança:** layout / UX. Sem alteração funcional.

---

## Objetivo

Transformar a área de Dose e Titulação em um painel clínico de planejamento terapêutico:

- leitura imediata da dose inicial, total de mg, duração e média
- timeline horizontal de semanas (cards), em vez de faixa `w-24`
- mobile com scroll-snap touch-friendly
- mesmas regras, mesmos dados, mesmos handlers

---

## Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `components/metaadmin/MetaadminPlanoTerapeuticoEditSections.tsx` | `DoseTitulacaoBlock` redesenhado; metadados compactos integrados; Status da Titulação e Observação deixam de ser renderizados; barra do header do protocolo harmonizada |
| `components/metaadmin/EsquemaDosesPorSemanaEditor.tsx` | resumo derivado, cards semanais, scroll-snap, progresso a partir das flags já calculadas |
| `components/metaadmin/EsquemaDoseSemanaDateInput.tsx` | prop opcional `appearance="timeline"` só no texto visível; overlay `type="date"` intacto |

Arquivos **não** alterados: utils de cálculo, types, services, Firestore, WhatsApp, e-mail, Canal Chat, `/meta`, `/aplicacao`, calendários, Metas, Injetáveis, Retratutida.

---

## Antes / depois estrutural

### Antes

```
Metadados do Plano (formulário 3 colunas)
Dose e Titulação
  - Dose inicial
  - Status da Titulação
  - Observação
Esquema de Doses por Semana
  - Total mg (caixa azul)
  - Resetar
  - faixa overflow w-24
```

### Depois

```
Dose e Titulação
  subtítulo
  Dose inicial (stepper existente)
  Início | Duração | Dia  (mesmos handlers de metadados)
Esquema de Doses por Semana
  Resetar para Automático (secundário)
  Resumo: Total | Duração | Média semanal
  Timeline de cards (138px mobile / 160px desktop)
  Barra: N de M aplicações realizadas
```

---

## Decisões responsivas

- Mobile first.
- Cards: `w-[138px]` no mobile, `sm:w-[160px]` no desktop.
- Timeline: `overflow-x-auto` + `snap-x snap-mandatory` + `pr-10` para o próximo card aparecer parcialmente.
- Sem biblioteca de carousel. Sem setas obrigatórias.
- Scroll horizontal só na timeline (`min-w-0` no card do protocolo).
- Desktop: dose inicial à esquerda, metadados à direita (`md:grid`).
- Mobile: dose inicial em largura total; metadados em 3 chips abaixo.
- Subtítulo do esquema visível só a partir de `sm`.

---

## Valores apenas derivados (não persistidos)

Tudo calculado no render a partir de `buildSemanasEsquemaDoses` e do plano já carregado:

| Exibição | Origem |
|---|---|
| Total no tratamento | `totalMiligramas` (já existia) |
| Duração (resumo) | `planoTerapeutico.numeroSemanasTratamento` |
| Média semanal | `totalMiligramas / semanas ativas` (não canceladas, não conclusão) |
| Progresso da timeline | `temDoseAplicada` nas semanas ativas do mesmo array |
| “Próxima aplicação” | primeira semana `!temDoseAplicada && !isCancelada && !isConclusao` |
| Badge “Ajustada” | `doseCustomizada != null` |

Nenhum campo novo no Firestore. Nenhum estado local copiando o array de semanas.

---

## Elementos ocultos (não apagados)

Deixaram de ser renderizados nesta interface:

- Status da Titulação (`titrationStatus`)
- Observação (`titrationNotes`)

Os campos permanecem no type `PlanoTerapeutico` e nos documentos existentes. Paciente 360 continua podendo ler `titrationStatus`. Sem migration.

---

## Garantia de preservação da lógica

Handlers preservados bit a bit:

- dose inicial → `currentDoseMg` + `lastDoseChangeAt` + `nextReviewDate` + `doseAtual`
- dose da semana → `pacienteComDoseMgSemanaAtualizada`
- data da semana → `datasAplicacaoIndividuais` + `window.confirm` + `dataAplicacaoFocoRef`
- `onRemoveOverride` continua passado e não usado (comportamento pré-existente)
- cancelar → push em `semanasCanceladas` (checkbox `checked={false}`)
- reativar → filter de `semanasCanceladas`
- resetar → `esquemaDosesCustomizado: undefined`
- data de início → `mesclarPlanoComDatasReconstruidas`
- duração → `NumeroSemanasTratamentoField` / `pacienteComNumeroSemanasAtualizado`
- `readOnly` continua bloqueando stepper, datas, cancelar, reativar e resetar

Motor intocado: `buildSemanasEsquemaDoses`, titulação automática, WhatsApp, save.

Ações **não** criadas (eram só mock conceitual): “Aplicar dose em todas”, “Limpar tudo”.

---

## Superfícies cobertas

O editor é compartilhado:

1. Desktop — MetaAdmin → Paciente → Plano Terapêutico → Tirzepatida → Protocolo
2. Mobile tratamento — `MetaadminPlanoTerapeuticoEditSections` `mode="plano"`
3. Mobile legado — `EsquemaDosesPorSemanaEditorMobile` reusa o mesmo `EsquemaDosesPorSemanaEditor` (ganha os cards novos; o formulário legado de data/dose do modal permanece acima)

---

## Testes executados

- ESLint (`next lint`) nos 3 arquivos alterados: sem warnings e sem erros.
- Vitest: `lib/metaadmin/esquemaDosesSemana.spec.ts` e specs de `lib/tirzepatida` — 6 testes, todos passando (motor intocado).
- Diagnóstico do editor (ReadLints) nos arquivos tocados: sem erros.
- Typecheck completo do repositório (`tsc --noEmit`) é pesado neste monorepo; a validação pontual foi pelo language service / lint dos arquivos tocados.

---

## Limitações

- O stepper compartilhado `DoseMgTirzepatidaStepperField` continua abrindo o modal global de mg (não foi reescrito para `− / +` inline, para não afetar outras telas).
- O campo nativo de data de **início** do tratamento permanece `type="date"` visível (handler original). Só o date das semanas usa overlay invisível.
- Há duas fontes visuais de progresso: a do header do protocolo (`countAplicacoesDoCiclo`, visível com o card recolhido) e a da timeline (flags do próprio `semanas`, visível com o card expandido). Não foi criado um segundo motor.
- “Próxima aplicação” é puramente visual. Se todas as semanas ativas já tiverem dose, nenhum card recebe esse rótulo.
- Status da Titulação e Observação ficam ineditáveis nesta tela (dados antigos permanecem no documento).
- Verificação visual autenticada no MetaAdmin (desktop + iOS) depende de sessão do médico; não foi possível completar o fluxo end-to-end sem login nesta sessão.
