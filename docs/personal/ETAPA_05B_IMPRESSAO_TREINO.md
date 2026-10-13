# ETAPA 05B — Impressão do treino (PDF da prescrição)

**Sistema alterado:** representação imprimível da sessão operacional já salva (`trainingSessions` + `exercises`), no mesmo `PersonalPageContent` usado por paciente (`/meta/personal`), Metapersonal, Metaadmin e Metanutri.  
**Não alterado:** Firestore, execução (`exerciseExecutions` / `actualReps` / `actualLoadKg`), Biblioteca, motor determinístico, GIFs, rascunho não salvo.

**Fonte de verdade:** código atual.  
**Data:** 2026-08-16.

---

## Auditoria: como o MetaNutri imprime o Cardápio

Antes de criar o fluxo do Personal, o código do Nutri foi tratado como fonte de verdade.

### 1. Onde está o botão

`components/NutriContent.tsx` — ação **Imprimir cardápio**. Abre o modal (`setCardapioPrintModalOpen(true)`).

### 2. Handler

`components/CardapioPrintModal.tsx` → botão verde **Imprimir** → `downloadCardapioPdfComoImpressao(contexto)` em `utils/cardapioPdfDownload.ts`.

### 3. Mecanismo técnico

| Hipótese | Nutri |
| --- | --- |
| `window.print()` | **Não** |
| Janela temporária / iframe | **Não** |
| CSS `@media print` da app | **Não** (a app continua escura; o preview é HTML branco no modal) |
| Lib PDF | **Sim — jsPDF**, A4 retrato (`unit: 'mm', format: 'a4'`) |
| Resultado | `doc.save(filename)` — o navegador baixa o PDF. O usuário pode abrir e imprimir. O botão diz **Imprimir**, não “Baixar PDF”. |

### 4. Dados do paciente

Shape dedicado `CardapioPdfContext` (`types/cardapioPrint.ts`), montado por `montarCardapioPdfContext(...)`. Não passa o documento Firestore inteiro para o gerador.

### 5. Conteúdo

Preview HTML no modal (logo `/icones/logotipo-metodo-28.png`, fundo branco, navy `#0A1F44`, acentos verdes). O PDF é desenhado à parte em jsPDF (não é print do DOM).

### 6. Page break

`ensureSpace` / `addPage(continuacao)` por refeição. Não usa `break-inside` CSS no PDF.

### 7. CSS de impressão

Não há `@page` / `@media print` da tela Nutri. Cores e margens vivem no jsPDF e no HTML de preview.

### 8. Nome do arquivo

Controlado: `Cardapio_${safeNome}_${safeData}.pdf`.

### 9. Logo / branding

Logo oficial carregada em runtime (`loadLogoImage`). Opcional se a imagem falhar. **Não** há base64 gigante no componente. Navy + verde da marca só em títulos/faixas, página branca.

### 10. Rodapé

Emitido em + hora, página X de Y, nutricionista quando houver.

### Decisão de reuso

Não extrair um framework genérico `lib/print/` (o fluxo Nutri está acoplado a refeições/macros). Reutilizar o **padrão**: modal + preview branco + jsPDF A4 + logo + cores + `doc.save`. Conteúdo de treino é específico.

O spec pedia honestidade se a ação só abrisse o diálogo nativo. No Nutri o botão **Imprimir** já baixa PDF; o Personal replica isso.

---

## Equivalência de produto

```text
METANUTRI     Cardápio → Imprimir → documento nutricional
METAPERSONAL  Treino   → Imprimir treino → documento de treinamento
```

Documento próprio. Não imprime a UI escura, GIF, FAB, timer, drag handle, nem execução realizada.

---

## Arquivos criados

| Arquivo | Papel |
| --- | --- |
| `lib/personal/workoutPrint.ts` | `WorkoutPrintData`, `buildWorkoutPrintData`, carga `—`, slug de arquivo |
| `lib/personal/workoutPrint.spec.ts` | Tradicional, pirâmide, carga null, trainerNote, ordem, duplicata, legado |
| `utils/workoutPdfDownload.ts` | jsPDF A4, logo, quebra entre exercícios, resumo, rodapé |
| `components/personal/print/WorkoutPrintDocument.tsx` | Preview HTML branco (só prescrição) |
| `components/personal/print/WorkoutPrintModal.tsx` | Portal z-`10050`, preview + Imprimir |
| `docs/personal/ETAPA_05B_IMPRESSAO_TREINO.md` | Este arquivo |

## Arquivos alterados

| Arquivo | Papel |
| --- | --- |
| `app/meta/personal/page.tsx` | Botões + `openWorkoutPrint(session, exercises)` |
| `docs/personal/ETAPA_05_EXECUCAO_SERIE_A_SERIE.md` | Ponte para esta etapa |

---

## Onde o botão aparece

Mesma página (`PersonalPageContent`), portanto paciente, personal e leitura profissional (Metaadmin / Metanutri) veem a ação se já visualizam a sessão. Imprimir não muta dados e não amplia permissões.

1. **Hoje** — abaixo de Iniciar treino / Treino concluído, com a sessão e os exercícios já carregados.
2. **Cronograma** — overlay de detalhe (`z-80`); o modal de print fica acima (`z-10050`).
3. **Treinos Salvos** — ao lado de Editar: `[ Editar ] [ Imprimir treino ]`. Deletar fica na linha de baixo. Recorrência: imprime a primeira sessão do grupo (aquela prescrição), sem reconstruir a série.
4. **Histórico** — no card de detalhe da sessão selecionada.

**Não** no rascunho de Novo Treino não salvo.

---

## Payload

`openWorkoutPrint` recebe **explicitamente** a sessão e, quando já carregados, os exercícios. Se a lista não veio (Treinos Salvos), busca `trainingSessionService.getSessionExercises(session.id)` daquela sessão. Não usa “último paciente aberto” global.

`buildWorkoutPrintData`:

```ts
{
  patientName,          // nome do paciente da tela atual
  trainerName?,         // personalVinculado.nome (app do paciente) ou nome do PT logado (Metapersonal)
  title,
  scheduledDate?,
  scheduledDateLabel?,  // pt-BR; distinta da data de impressão
  printedAt,
          exercises: [{ order, name, meta?, trainerNote?, series: [{ order, reps, loadKg, loadLabel, restSec }] }],
  exerciseCount,
  seriesCount
}
```

- Prescrição: `normalizeTrainingExercisePrescription(exercise.prescription).series[]`
- `trainerNote` via `sanitizeTrainerNote`; vazio → campo omitido (sem bloco vazio)
- `loadKg === null` → `—` (não infere peso corporal)
- Ordem: `exercise.order` (0-based na sessão), fallback pelo array; **não** deduplica `exerciseId`
- Nomes traduzidos com os helpers já usados na UI (`translateExerciseName` / target / equipment)
- Sem instruções longas da ExerciseDB
- Sem GIF
- Sem `actualReps` / `actualLoadKg`
- Sem volume, tonelagem, kcal, RPE, tempo estimado

Arquivo: `treino-{slug-paciente}-{slug-titulo}.pdf`.

---

## PDF / preview

- A4 retrato, fundo branco, texto navy, bordas leves, faixa de resumo navy, orientação em fundo verde claro.
- Logo `/icones/logotipo-metodo-28.png` (mesmo do Nutri), opcional.
- Rodapé: `Plano de treino gerado pela Oftware` · página · `Impresso em {printedAt} · hora`.
- Quebra: se o card do exercício cabe na página seguinte e não cabe na atual, nova página. Se um exercício é maior que a página, as séries podem continuar (sem deixar buraco enorme). Continuação leva título compacto.

---

## Acesso

| Superfície | Comportamento |
| --- | --- |
| Paciente | Imprime o próprio treino já visível. Sem Biblioteca. |
| Personal | Imprime treinos dos pacientes que já visualiza. Sem mutação. |
| Metaadmin / Metanutri | Mesmo botão se já veem a sessão. Sem fetch com UID errado: usa sessão/exercícios da tela. |

---

## Testes manuais sugeridos

1. Personal abre treino salvo → Imprimir treino → preview branco + PDF.
2. Paciente faz o mesmo em Hoje / Cronograma.
3. Pirâmide 15/12/10/8 com cargas e descansos distintos.
4. `trainerNote` no exercício certo; exercício sem nota não mostra seção.
5. `loadKg` null → `—`.
6. 8–12 exercícios: quebra entre cards, sem cortar série no meio quando o card cabe na próxima página.
7. Abrir o PDF e imprimir / salvar.
8. Preto e branco: hierarquia ainda legível.
