# CURSOR PROMPT — Redesign Cronograma (Calendário) + “Iniciar treino” com cronômetro (mobile-first)

Contexto
- Projeto: Oftware Personal (visão do paciente) — rota `/personal`, componente `PersonalPage` em `page.tsx`.
- Objetivo: padronizar o Cronograma com o mesmo padrão visual da aba **Hoje**, e remover o **modal** ao clicar em um treino.
- IMPORTANTE: **não mudar regras de negócio**, Firestore, services, tipos, rotas, nem a estrutura dos dados.
- Manter Tailwind + lucide, dark mode consistente, mobile-first.

Arquivo-alvo
- `page.tsx`
- Seção: `activeTab === 'cronograma'`
- Referências atuais:
  - O calendário chama `onSessionClick={handleViewSessionDetail}` e abre modal com `selectedSessionForDetail`. (ver bloco “Modal de detalhe da sessão do calendário”) fileciteturn5file8L1-L36
  - **Trocar comportamento**: clique em sessão → mostrar **lista/detalhe inline** (igual padrão da aba Hoje), não modal.

---

## ETAPA 0 — Preparação (zero mudança visual)
Objetivo: criar o “estado de seleção” que serve tanto para calendário quanto para a lista/detalhe inline.

1) No mesmo `page.tsx`, mantenha os estados existentes:
- `selectedSessionForDetail`
- `selectedSessionExercisesDetail`

2) Adicione **um ref** e helper para scroll:
- `const sessionDetailRef = useRef<HTMLDivElement | null>(null);`
- `const scrollToSessionDetail = () => sessionDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });`

3) Ajuste `handleViewSessionDetail(session)` para:
- continuar setando `selectedSessionForDetail` e carregando exercícios como hoje
- NO FINAL: chamar `scrollToSessionDetail()`
- **não abrir modal** (vamos remover o modal na etapa 1)

Checklist
- Compila.
- Sem mudança visual.

---

## ETAPA 1 — Remover modal e criar “Detalhe do treino” inline (padrão Hoje)
Objetivo: ao clicar numa sessão do calendário, aparece uma seção **abaixo** do calendário com cards no padrão da aba Hoje.

1) Remova (ou comente) o bloco do modal:
- `{selectedSessionForDetail && ( ... modal ... )}` fileciteturn5file8L34-L36

2) Logo abaixo do calendário (depois de `<CalendarioComponent/>` ou `<CalendarioSemanalComponent/>`) renderize:

- ` <div ref={sessionDetailRef} className="space-y-4"> ... </div> `

Dentro:
A) Se **não** há `selectedSessionForDetail`:
- Mostre um card discreto “Selecione um treino no calendário para ver os detalhes”.

B) Se há `selectedSessionForDetail`:
- Renderize um **Hero Card** (mesmo estilo do Hoje) com:
  - Título: `selectedSessionForDetail.title`
  - Data (pt-BR)
  - Chips: status (Agendado/Feito/Pulou)
  - Meta: `N exercícios • %` (o % calculamos na etapa 2)
  - CTA: **“Iniciar treino”** (vai para fluxo do cronômetro na etapa 3)
  - Botão “Limpar seleção” (X pequeno) que faz:
    - `setSelectedSessionForDetail(null); setSelectedSessionExercisesDetail([]);`

3) Abaixo do Hero:
- Renderize um card “Próximo exercício” usando `selectedSessionExercisesDetail`:
  - Se ainda carregando: skeleton simples (2 linhas + placeholder de gif)
  - Se vazio: “Sem exercícios”
  - Se existe: mesmo layout do Hoje (gif + nome + chips + prescrição + botões Feito/Pulei se fizer sentido aqui)

4) Abaixo:
- Renderize “Ver todos os exercícios” (accordion simples) com a lista completa.

Regras
- Nada de modal.
- Tudo mobile-first com `rounded-2xl`, `shadow-sm`, `border`.
- Sem “template genérico”: evite cards “quadrados” e excesso de cinza. Use espaços (space-y-4/6) e tipografia forte.

Checklist
- Clique no treino no calendário → seção aparece abaixo, com scroll suave.
- Fechar/limpar seleção funciona.
- Dark mode ok.

---

## ETAPA 2 — Progresso e “Próximo exercício” para o treino selecionado
Objetivo: reusar a mesma lógica mental da aba Hoje: progresso e nextExercise para a sessão do calendário.

1) Adicione helpers (useMemo) baseados em `selectedSessionExercisesDetail`:
- `selectedProgress = { doneCount, totalCount, percent }`
- `selectedNextExercise = first exercise com status != done && != skipped`

2) No Hero Card:
- `“{total} exercícios • {percent}%”`
- barra de progresso

3) No card “Próximo exercício”:
- Mostre `selectedNextExercise`
- Se não houver: “Treino concluído 🎉”

Checklist
- Sem re-render pesado: useMemo.
- Progresso consistente com Hoje.

---

## ETAPA 3 — “Iniciar treino” vira modo “Treino em andamento” com cronômetro (sem criar página)
Objetivo: quando usuário toca “Iniciar treino” (no Hero do detalhe ou no Hoje), abrir um modo de execução com cronômetro e controle de descanso — **mobile-first**.

IMPORTANTE
- Não mexer em Firestore/serviços.
- Persistência: use os mesmos handlers “feito/pulei/desfazer” já existentes.

Implementação (mínima, em etapas)
1) Crie estado local:
- `const [isWorkoutRunning, setIsWorkoutRunning] = useState(false);`
- `const [activeRunSession, setActiveRunSession] = useState<TrainingSession | null>(null);`
- `const [activeRunExerciseId, setActiveRunExerciseId] = useState<string | null>(null);`
- `const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);`
- `const [isRestRunning, setIsRestRunning] = useState(false);`

2) Ao clicar “Iniciar treino”:
- `setActiveRunSession(selectedSessionForDetail ?? todaySelectedSession);`
- `setIsWorkoutRunning(true);`
- `setActiveRunExerciseId(selectedNextExercise?.exerciseId ?? firstExerciseId);`
- Scroll suave para o topo do bloco (ou simplesmente abre overlay).

3) UI do modo “Treino em andamento”
- Use **bottom sheet** (não modal full com overlay pesado) fixo no fundo:
  - altura: ~70vh (mobile)
  - rounded-top-3xl
  - (sem arrastar nesta versão)
- Conteúdo do sheet:
  A) Header: nome do treino + botão “Sair”
  B) Card do exercício atual (gif grande, nome, alvo, equipamento, prescrição)
  C) Botões primários:
     - “Feito” (marca done e auto inicia descanso)
     - “Pulei”
     - “Próximo” (muda activeRunExerciseId)
  D) **Cronômetro de descanso** (simples e bonito):
     - quando o usuário toca “Feito”, setar `restSecondsLeft = prescription.restSec` (fallback 60)
     - exibir timer grande (mm:ss), botão Pausar/Continuar, botão “Pular descanso”
     - quando chegar em 0: auto avançar para próximo exercício

4) Timer técnico (sem libs)
- useEffect com setInterval quando `isRestRunning && restSecondsLeft != null`
- decrementar 1s
- quando 0: parar, setIsRestRunning(false), setRestSecondsLeft(null), avançar próximo exercício

Checklist
- “Iniciar treino” abre sheet.
- “Feito” dispara descanso com contagem regressiva.
- Pausar/Continuar/Pular descanso funcionando.
- Nada quebra no desktop.

---

## ETAPA 4 — Padronizar Histórico (sem modal) no mesmo padrão
Objetivo: hoje Histórico também abre modal. Repita o mesmo padrão: clique → detalhe inline.

1) Identificar o modal do histórico `selectedSessionDetail` (já existe). fileciteturn5file5L46-L60
2) Remover modal e renderizar detalhe inline logo abaixo da lista.
3) Usar os mesmos cards: Hero + Próximo exercício + Accordion.

Checklist
- Histórico vira consistente com Hoje/Cronograma.
- Mobile-first.

---

## O que NÃO fazer (para não “pesar”)
- Não criar páginas novas / rotas novas.
- Não refatorar services/Firestore.
- Não introduzir bibliotecas de UI.
- Não reestruturar tipos/dados.

---

## Definição de “padrão moderno” (guia rápido)
- Mobile-first: 1 coluna, cards altos com espaço, thumb-friendly (44px).
- Rounded-2xl/3xl, shadow-sm, border sutil.
- Tipografia: títulos fortes (text-lg/ xl), meta em text-sm.
- Dark mode: nada de bg-gray-50 em dark; usar dark:bg-gray-900/800 e bordas dark:border-gray-700.
- Evitar “template”: reduzir cinzas “genéricos”, priorizar contraste + hierarquia.

Fim.
