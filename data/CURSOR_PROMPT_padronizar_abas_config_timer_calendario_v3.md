# CURSOR PROMPT — /personal/page.tsx (v3)
**Meta:** padronizar o “padrão premium mobile-first” nas outras abas, reduzir redundância do “iniciar treino” no cronograma, trocar a aba **Lembretes** por **Configurações**, e deixar o ícone do treino no calendário mais formal (somente o **peso**).

## Contexto do arquivo (para você localizar rápido)
- Arquivo-alvo: `app/personal/page.tsx` (componente `PersonalPage`)
- Tabs atuais incluem `'lembretes'` no tipo `Tab`. fileciteturn21file8L51-L53
- Já existe ícone `Dumbbell` importado do lucide. fileciteturn21file8L8-L16
- Já existe “overlay modal” de exercício — vamos **apenas melhorar e integrar timers** (sem mexer em Firestore/serviços).

---

## Regras (NÃO QUEBRAR)
1) **Não alterar** regras de negócio, Firestore, services, types, rotas.
2) **Não remover**: marcar feito/pulei/desfazer, notas, seletor de sessões, overlay do exercício.
3) Mobile-first (prioridade total), mas responsivo até desktop.
4) Tailwind + lucide apenas. Sem bibliotecas novas.
5) Evitar re-render pesado (useMemo/useCallback já usados).

---

# ETAPA 1 — Trocar “Lembretes” por “Configurações” (UI + Tab)
**Objetivo:** Em vez de uma aba “Lembretes”, criar “Configurações” e mover para lá:
- Preferências de notificações (o que hoje está em “Lembretes”).
- Configurações do Timer (som, tempo padrão de descanso).
- Preferência visual do calendário (ícones formais).

### 1.1 — Ajuste do tipo Tab + menu
- Trocar no `type Tab = ... | 'lembretes'` para `| 'config'` (ou `'configuracoes'` se preferir, mas use **1 nome só**).
  - Hoje está assim: `type Tab = 'hoje' | 'cronograma' | 'criar' | 'historico' | 'estatisticas' | 'lembretes';` fileciteturn21file8L51-L53
- Onde o menu renderiza as tabs (pills/abas), troque label “Lembretes” → “Configurações”.
- Troque o ícone do botão:
  - Remover `Bell` do botão de tab (pode manter o import se estiver sendo usado em outro lugar).
  - Usar `Shield` (já importado) como ícone de Configurações para não adicionar import novo.

**Aceite:** a navegação muda para “Configurações” e não existe mais “Lembretes”.

### 1.2 — Mover UI existente de lembretes para Configurações
- Copie o bloco `{activeTab === 'lembretes' && (...)}` e cole em `{activeTab === 'config' && (...)}`.
- Ajuste somente textos (título “Configurações”).
- Não mude nada de lógica/handlers.

**Aceite:** tudo que aparecia em “Lembretes” agora aparece em “Configurações” com o mesmo comportamento.

---

# ETAPA 2 — Configurações do Timer (som + descanso padrão) com persistência local
**Objetivo:** O timer deve “contar sozinho” quando iniciado (já existe UI com Play/Pause), tocar som no fim do descanso, ter toggle de som, e permitir definir “descanso padrão” que vira default do overlay.

## 2.1 — Estado global de preferências do timer
Criar (no topo do componente) 3 states:
- `timerSoundEnabled: boolean` (default `true`)
- `restDefaultSec: number` (default `60`)
- `timerAutoStart: boolean` (default `true`)

Persistir via `localStorage` (apenas front):
- Ao montar, ler `localStorage.getItem('oftware_personal_timer_prefs')`.
- Salvar sempre que mudar (useEffect).
- Estrutura sugerida:
```ts
{ soundEnabled: true, restDefaultSec: 60, autoStart: true }
```

**Aceite:** ao recarregar a página, preferências continuam.

## 2.2 — UI dessas preferências dentro da aba “Configurações”
Criar um card “Timer” com:
- Toggle “Som do descanso” (Volume2/VolumeX se já existir no import; se não existir, use texto simples)
- Input numérico “Descanso padrão (s)” (min 10, max 600)
- Toggle “Iniciar descanso automaticamente ao marcar Feito/Pulei” (autoStart)

**Design do card (mobile):**
- `rounded-2xl`, `ring-1`, `bg-white/dark:bg-gray-800`, `p-4`, `space-y-3`
- Inputs com `min-h-[44px]`, bem clicáveis.

**Aceite:** Configurações tem o card Timer e ele altera os states.

## 2.3 — Integrar essas preferências no overlay de exercício (sem mudar regra)
- Quando abrir o overlay de exercício:
  - O “tempo de descanso” que aparece deve usar:
    1) `exercise.prescription.restSec` se existir,
    2) senão `restDefaultSec` (config).
- No overlay, incluir:
  - Botão de som (mute/unmute) refletindo `timerSoundEnabled`.
  - Mostrador grande do timer (mm:ss), com Play/Pause.
  - Quando o timer zerar:
    - se `timerSoundEnabled`, tocar um beep curto (WebAudio ou `<audio>` com data URI bem simples).
    - mostrar “Descanso finalizado ✅” e um micro-haptic visual (pulse/animate) no botão.

- Se `timerAutoStart`:
  - Ao clicar “Feito” ou “Pulei” no overlay, iniciar o timer automaticamente (usando o descanso do exercício).
  - **Sem alterar** a ação de salvar status, apenas encadear no UI.

**Aceite:** descanso toca alerta quando zera e o usuário controla som e padrão.

---

# ETAPA 3 — Cronograma: remover redundância de “iniciar treino” e padronizar lista igual “Hoje”
**Objetivo:** No cronograma, o usuário escolhe o dia e vê a lista dos exercícios do treino daquele dia **no mesmo padrão visual** da lista “Hoje”, e ao tocar no exercício abre o overlay (igual hoje). O “iniciar treino” deve ficar concentrado na aba Hoje.

## 3.1 — Cronograma: ao clicar no dia/treino, mostrar lista (não “call to action” de iniciar)
- Manter o calendário como está.
- Quando selecionar um treino do dia (session selecionada), renderizar abaixo:
  - Card “Treino do dia” com título, X exercícios, % concluído (mesmo cálculo do Hoje).
  - Lista de exercícios em accordion (igual Hoje: compact row + expand inline).
  - Clique na linha abre overlay do exercício (o overlay já existe; reutilize).

**Aceite:** Cronograma vira “seleciona dia → vê lista”.

## 3.2 — Remover/evitar CTA duplicado “Iniciar treino” no cronograma
- Se existir botão “Iniciar treino” no cronograma, substitua por:
  - botão pequeno “Abrir em Hoje” que apenas `setActiveTab('hoje')` e seleciona a sessão (se existir lógica de sessão selecionada).
- Se não for fácil sincronizar sessão, então **não crie botão**: deixe o cronograma só como visualização/lista.

**Aceite:** o usuário não sente que tem 2 lugares para “começar”; Hoje é o principal.

---

# ETAPA 4 — Ícone do treino no calendário: formal e minimalista (apenas “peso”)
**Objetivo:** parar de usar ícone “carinha levantando peso”/emoji ou qualquer ícone “informal”. No calendário, cada dia com treino deve ter **somente** um `Dumbbell`.

### Implementação
- Localize no calendário onde você renderiza o marcador do treino (provavelmente dentro da célula do dia).
- Troque qualquer ícone/emoji atual por:
```jsx
<Dumbbell className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
```
- Se o dia tiver múltiplos treinos:
  - **não** colocar múltiplos ícones. Coloque 1 ícone + badge pequeno “+2”.
- Não usar cores vibrantes no ícone. Só neutro.

**Aceite:** calendário fica “clean” e profissional.

---

# Checklist final
- [ ] Não existe mais aba “Lembretes”; existe “Configurações”.
- [ ] Preferências de timer (som, descanso padrão, auto start) ficam em Configurações e persistem em localStorage.
- [ ] Overlay do exercício mostra timer real (conta), alerta ao zerar, e botões de controle (som/play/pause).
- [ ] Cronograma mostra lista do treino (mesmo padrão do Hoje) e não tem CTA redundante “Iniciar”.
- [ ] Ícone do treino no calendário é **apenas Dumbbell**, pequeno e neutro.
