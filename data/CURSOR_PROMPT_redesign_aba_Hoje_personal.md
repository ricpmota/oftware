# Cursor Prompt — Redesign da Aba **Hoje** (/personal) — Oftware Personal (Paciente)

**Objetivo:** modernizar a aba **Hoje** (tab `hoje`) para um layout **mobile-first**, com visual premium (card hero + CTA + “próximo exercício” + lista compacta colapsável), **sem quebrar a lógica atual** (Firestore, services, status done/skipped, notas).

**Arquivo-alvo:** `page.tsx` (componente `PersonalPage`) — seção `activeTab === 'hoje'`.

**Regras do trabalho**
- **Não alterar** regras de negócio, serviços, Firestore, tipos, rotas. Somente **UI/UX e organização de componentes**.
- **Não remover** funcionalidades existentes (marcar feito/pulei/desfazer, notas, seletor de sessões).
- **Mobile-first** e responsivo até desktop.
- Manter Tailwind + lucide icons.
- Evitar re-render pesado: usar `useMemo` para progresso e para “próximo exercício”.
- Manter dark mode consistente (sem fundos “lavados” ou texto baixo contraste).

---

## ETAPA 0 — Base (pré-requisito) (pequena)
**Meta:** criar 3 helpers dentro do mesmo arquivo (por enquanto), sem refactor grande.

1) Criar `const todaySelectedSession = useMemo(...)` usando `selectedTodaySessionId` e `todaySessions`.
2) Criar `const progress = useMemo(calculateDailyProgress, [todayExercises])`.
3) Criar `const nextExercise = useMemo(...)`:
- primeiro exercício cujo `status` não é `done` nem `skipped`;
- se não houver, `null`.

✅ **Critério de aceite:** nada muda visualmente ainda, mas variáveis prontas para o redesign.

---

## ETAPA 1 — Layout novo da aba Hoje (Hero + CTA)
**Meta:** substituir o topo do conteúdo do treino por um **Hero Card** premium.

### O que fazer
1) Dentro do bloco `selectedTodaySessionId && (...)`, trocar o header atual por um Card “Hero”.
2) Hero deve conter:
- saudação simples (ex.: “Treino de hoje”)
- título do treino (session.title)
- linha pequena com: `X exercícios • {progress.percentage}%`
- barra de progresso grossa (div com width proporcional)
- CTA principal:
  - texto: **Iniciar treino**
  - comportamento: **scroll** suave até o bloco “Próximo exercício” (criar `ref` no container).
  - se `nextExercise == null` (treino concluído), CTA vira “Treino concluído ✅” (desabilitado).

✅ **Critério de aceite:** topo fica premium e com CTA; lista de exercícios ainda existe abaixo.

**Observação:** não precisa criar modo “1 exercício por tela” agora. Só CTA + scroll.

---

## ETAPA 2 — Bloco “Próximo exercício” (card horizontal moderno)
**Meta:** antes da lista completa, mostrar um único card com o próximo exercício.

### O que fazer
1) Inserir seção **“Próximo exercício”** logo abaixo do Hero.
2) Se `nextExercise` existir:
- renderizar Card horizontal:
  - gif pequeno (quadrado 72–96px)
  - nome traduzido
  - chips: target + equipamento (se aplicável)
  - prescrição (ex.: `3x10 • 60s descanso`)
  - botões:
    - **Feito** (verde) chama `handleMarkExercise(id,'done')`
    - **Pulei** (vermelho) chama `handleMarkExercise(id,'skipped')`
3) Se `nextExercise` for null:
- mostrar card “Você concluiu o treino de hoje 🎉”.

✅ **Critério de aceite:** a pessoa bate o olho e sabe qual o próximo passo.

---

## ETAPA 3 — Lista completa vira “Ver todos” (colapsável)
**Meta:** reduzir ruído. A lista completa não pode ser o primeiro elemento visual da tela.

### O que fazer
1) Criar estado `showAllExercises` (boolean) default `false`.
2) Criar um botão/accordion:
- título: “Ver todos os exercícios”
- ao abrir, renderiza a lista atual `todayExercises.map(...)`.
3) Ajustar o card do exercício para ficar mais compacto quando dentro do accordion:
- reduzir altura do GIF no mobile (ex.: 120–160px)
- reduzir bordas muito “pesadas”; usar `rounded-2xl`, `shadow-sm`, `border`.

✅ **Critério de aceite:** por padrão, a tela mostra Hero + Próximo exercício + botão “Ver todos”.

---

## ETAPA 4 — Sessões múltiplas (seletor mais moderno)
**Meta:** quando `todaySessions.length > 1`, transformar botões em “pills” com melhor hierarquia.

### O que fazer
1) Manter lógica existente, mas UI:
- container com `overflow-x-auto` no mobile
- pills com destaque suave (emerald) no selecionado
- mostrar mini meta abaixo (ex.: data, status) se disponível.

✅ **Critério de aceite:** no celular, o seletor não quebra linha feio e não “explode” altura.

---

## ETAPA 5 — Notas do treino (card com melhor acabamento)
**Meta:** notas como um “card” limpo e moderno, abaixo do accordion.

### O que fazer
1) Envolver textarea + botão em Card.
2) Melhorar microcopy:
- placeholder curto: “Como foi o treino? (energia, cargas, dor, observações)”
3) Botão salvar:
- manter lógica
- adicionar estado visual “Salvando…” (já existe)
- desabilitar e mostrar spinner pequeno.

✅ **Critério de aceite:** área de notas parece parte do produto premium.

---

## ETAPA 6 — Polimento visual (rápido)
**Meta:** dar cara “top app 2026”.

### Ajustes obrigatórios
- Espaçamento consistente: `space-y-4` / `space-y-6`
- Cards: `rounded-2xl`, `shadow-sm`, `border border-gray-200 dark:border-gray-700`
- Tipografia:
  - Título: `text-xl font-semibold`
  - Sub: `text-sm text-gray-600`
- Botões:
  - CTA principal: `bg-emerald-600 hover:bg-emerald-700 text-white`
  - Secundários: `bg-gray-100 dark:bg-gray-700`
- Dark mode:
  - evitar fundo claro dentro do dark (não usar `bg-gray-50` sem condicional)
  - sempre checar contraste.

✅ **Critério de aceite:** a tela fica “clean”, com foco no CTA, e sem poluição visual.

---

# Entrega final esperada (checklist)
- [ ] Hero Card com progresso + CTA
- [ ] Seção “Próximo exercício”
- [ ] Lista completa em accordion “Ver todos”
- [ ] Seletor de sessões múltiplas responsivo
- [ ] Card de notas premium
- [ ] Dark mode consistente

---

# Observações importantes (não fazer agora)
- NÃO implementar “modo treino 1 exercício por tela” nesta entrega.
- NÃO mexer em calendário, criar treino, histórico, estatísticas, lembretes.
- NÃO alterar `trainingSessionService` nem estrutura de dados.

---

## Se precisar de componentes (opcional, só se ficar fácil)
Se o arquivo ficar muito grande, criar componentes dentro do mesmo diretório:
- `components/personal/TodayHero.tsx`
- `components/personal/NextExerciseCard.tsx`
- `components/personal/ExercisesAccordion.tsx`

Mas só fazer isso **depois** de concluir as etapas 1–3 funcionando.
