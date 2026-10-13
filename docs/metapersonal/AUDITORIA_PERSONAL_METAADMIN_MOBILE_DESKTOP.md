# Auditoria específica — Personal no Editar Paciente do `/metaadmin`

**Data:** 2026-07-26  
**Escopo:** somente leitura. Nenhuma alteração de código.  
**Arquivo principal analisado:** `app/metaadmin/page.tsx`

---

## Sumário executivo (correção de premissa)

A área **Personal** que “já funciona no mobile” **não está dentro** do modal Editar Paciente mobile.

| Fluxo | O que abre |
| --- | --- |
| Editar Paciente (mobile) | `showEditarPacienteMobileModal` — 3 abas: Identificação, Anamnese, Prontuário |
| Personal (mobile) | Modal **separado** `showModalPersonal`, aberto pelo botão **Dumbbell** no **card** da lista de pacientes (`lg:hidden`) |

No desktop:

- O modal Editar Paciente (`showEditarPacienteModal`) tem abas incluindo **Nutrologia**, mas **não tem aba Personal**.
- A tabela desktop de pacientes (`hidden lg:block`) tem apenas **Editar** e **Excluir** — **não há botão Dumbbell**.

Por isso a funcionalidade é acessível no mobile e ausente como aba no desktop: **falta de ponto de entrada e de pasta no array de tabs**, não porque o modal Personal esteja “escondido” por `isMobile`.

---

## 1. Modal Editar Paciente — identificação

### 1.1 Arquivos e componentes

| Caminho | Papel |
| --- | --- |
| `app/metaadmin/page.tsx` | Quase toda a UI: dois modais de edição + modal Personal + lista pacientes |
| `app/metaadmin/layout.tsx` | Layout do portal |
| `components/metaadmin/paciente-modal/PacienteIdentificacaoTabEdit.tsx` | Aba Identificação (desktop) |
| `app/metaadmin/components/paciente-modal/prontuario/ProntuarioTab.tsx` | Aba Prontuário |
| Vários componentes de anamnese / Nutri / exames | Usados pelas pastas desktop |
| `components/CalendarioTreinosPersonal.tsx` | Calendário read-only no modal Personal |
| `components/NutriContent.tsx` | Conteúdo Nutrologia (não Personal) |

Não há componente dedicado tipo `EditarPacienteModal.tsx`. Desktop e mobile são **dois blocos JSX distintos** no mesmo arquivo.

### 1.2 Desktop vs mobile — são o mesmo componente?

**Não.** São modais diferentes, controlados por estados diferentes:

| Aspecto | Desktop | Mobile |
| --- | --- | --- |
| Estado de abertura | `showEditarPacienteModal` | `showEditarPacienteMobileModal` |
| Paciente | `pacienteEditando` | `pacienteEditando` (mesmo estado de dados) |
| Aba ativa | `pastaAtiva` (number) | `abaAtivaMobile` (`'identificacao' \| 'clinicos' \| 'prontuario'`) |
| Gate de render | `{showEditarPacienteModal && pacienteEditando && …}` (~25477) | `{showEditarPacienteMobileModal && pacienteEditando && …}` (~37360) |
| Como abre | Botão Edit na **tabela** (`hidden lg:block`) | Botão User no **card** (`lg:hidden`) |

### 1.3 Como decide desktop vs mobile

Há **dois mecanismos**:

1. **CSS Tailwind `lg` (1024px)** — lista de pacientes:
   - Tabela: `hidden lg:block` (~11543)
   - Cards: `lg:hidden` (~12607)
2. **Estado JS `isMobile`** — `window.innerWidth < 768` (~1320–1327), usado em alguns fluxos auxiliares (ex.: abrir tratamento/aplicações), **não** para esconder o modal Personal.

O modal Personal **não** é filtrado por `isMobile`. Só não aparece no desktop porque o botão que o abre vive nos cards `lg:hidden`.

### 1.4 Estados comuns do paciente editado

- `pacienteEditando` / `pacienteEditandoOriginal`
- Ao abrir: `setPacienteEditando(paciente)` + cópia profunda em `pacienteEditandoOriginal`
- Fechamento: zera flags do modal correspondente; desktop também reseta `pastaAtiva` em vários caminhos

---

## 2. Estrutura atual — versão desktop (Editar Paciente)

### 2.1 Ordem real das abas

Declaradas inline (~25801–25811):

```txt
1. Identificação          (id: 1)
2. Anamnese               (id: 2)
3. Prontuário             (id: 10)
4. Nutrologia             (id: 3)
5. Exames                 (id: 4)
6. Plano Terapêutico      (id: 5)
7. Evolução/Seguimento    (id: 6)
8. Bio Impedância         (id: 7)
9. Comunicação            (id: 8)
10. Prescrições           (id: 9)
```

Estado controlador: `pastaAtiva` (`useState<number>(1)`).

### 2.2 Detalhe por aba (resumo)

| Nome | id | Conteúdo principal | Condicional |
| --- | ---: | --- | --- |
| Identificação | 1 | `PacienteIdentificacaoTabEdit` | `pastaAtiva === 1` |
| Anamnese | 2 | `AnamneseTabShell` + medidas + perfil metabólico | `pastaAtiva === 2` |
| Prontuário | 10 | `ProntuarioTab` | `pastaAtiva === 10` |
| Nutrologia | 3 | Share nutricionista + `NutriContent` (desktop `hidden lg:block`); sub-abas mobile `lg:hidden` | `pastaAtiva === 3` |
| Exames | 4 | Exames lab/imagem | `pastaAtiva === 4` |
| Plano Terapêutico | 5 | Plano terapêutico | `pastaAtiva === 5` |
| Evolução/Seguimento | 6 | Seguimento | `pastaAtiva === 6` |
| Bio Impedância | 7 | Bioimpedância | `pastaAtiva === 7` |
| Comunicação | 8 | Mensagens | `pastaAtiva === 8` |
| Prescrições | 9 | Prescrições/protocolos | `pastaAtiva === 9` |

**Aba Personal: inexistente** no array e em qualquer `pastaAtiva === …` de Personal.

### 2.3 Aba Nutrologia — referência para futura aba Personal

**Declaração:** item `{ id: 3, nome: 'Nutrologia' }` no array de tabs.  
**Render:** `{pastaAtiva === 3 && pacienteEditando && (` (~25872).

Paciente enviado como `pacienteEditando` / props `paciente={pacienteEditando}`.

Estrutura interna:

| Viewport | Bloco | Conteúdo |
| --- | --- | --- |
| Desktop `lg+` | `hidden lg:block` | Card “Compartilhar com nutricionista” + `NutriContent` |
| Mobile `<lg` | `lg:hidden` | Sub-abas (`pastaNutrologiaInterna`): Compartilhar / Plano Nutri / Cardápio / Histórico / ChatNutri |

Carregamento ao entrar na pasta 3 (~7316–7320):

- `loadNutricionistasElegiveis()`
- `loadStatusCompartilhamento(pacienteEditando.id)`

**Paralelo importante:** Nutrologia **já tem compartilhamento embutido na aba desktop**. Personal **não** tem pasta equivalente; o compartilhamento de personal vive só no modal `showModalPersonal`.

### 2.4 Limitação por perfil / org / tela

- Modal desktop não exige `isMobile === false` para abrir; depende de quem clicou (tabela desktop).
- Conteúdo Nutrologia usa `lg` para dual layout.
- Sem filtro `organizationId` específico nas abas do modal.

---

## 3. Estrutura atual — versão mobile (Editar Paciente)

### 3.1 Como o médico abre o paciente

1. Lista de pacientes em cards (`lg:hidden`).
2. Botão User / Editar (~12994–13005):
   - `setPacienteEditando(paciente)`
   - `setAbaAtivaMobile('identificacao')`
   - `setShowEditarPacienteMobileModal(true)`

### 3.2 Seções do Editar Paciente mobile

Três abas (~37443–37445):

```txt
identificacao → Identificação
clinicos      → Anamnese
prontuario    → Prontuário
```

Não há abas Nutrologia, Exames, Personal, etc. dentro deste modal. Outras áreas abrem por **botões do card** (Aplicações, Nutrição, Personal, Excluir, …).

### 3.3 Onde aparece a área Personal (mobile)

**Fora** do Editar Paciente. No card:

```txt
Botão Dumbbell (title="Personal Trainer")
→ setPacientePersonalSelecionado(paciente)
→ setShowModalPersonal(true)
→ loadPersonalTrainersElegiveis()
→ loadStatusCompartilhamentoPersonal(paciente.id)
```

(~13138–13162)

### 3.4 Modal Personal — UI real

**Título:** `Personal Trainer - {paciente.nome}`  
**Estados:** `showModalPersonal`, `pacientePersonalSelecionado`  
**Render:** ~39392–39580 (+ busca ~39582–39676)

Conteúdo:

1. **Compartilhar com Personal Trainer**
   - Se `vinculosAtivosPacientePersonal.length > 0`:
     - Nome do personal (via `personalTrainersElegiveis`)
     - Data de compartilhamento
     - Botão **Encerrar** → `endCompartilhamento` + confirm
   - Senão:
     - Texto de ajuda
     - Botão **Buscar Personal Trainer** → abre `showModalBuscarPersonalTrainer`
     - Lista **Solicitações Pendentes** com botão **Cancelar**
2. **Calendário dos Treinos** — `CalendarioTreinosPersonal` (somente leitura)

**Modal de busca** (`showModalBuscarPersonalTrainer`):

- Lista `personalTrainersElegiveis` (verificados + ativos + vinculados ao médico)
- Clique → `SolicitacaoPersonalTrainerService.createPacienteShareRequest(...)`
- Fecha busca, mensagem de sucesso, `loadStatusCompartilhamentoPersonal`

> Comentário no código: “Mobile (antes das tabs)” — **não existem tabs** no modal Personal hoje; só bloco de share + calendário.

### 3.5 Fluxo completo da interface mobile (código vivo)

```txt
Médico na lista de pacientes (cards lg:hidden)
→ (opcional) Editar → modal 3 abas (sem Personal)
→ clica Dumbbell no card
→ modal Personal Trainer
→ carrega elegíveis + status
→ se vínculo ativo: vê personal + Encerrar + calendário
→ se não: Buscar / ver pendentes / Cancelar pendente + calendário
→ Buscar → escolhe personal → cria solicitação pendente
→ Personal aceita no /metapersonal (fora deste modal)
→ próximo open mostra vínculo ativo
```

### 3.6 Plano de Treino neste fluxo?

O médico **vê** o calendário de sessões. **Não** cria/edita sessões neste modal (ver seção 7).

---

## 4. Comparação desktop versus mobile

| Recurso | Mobile | Desktop | Mesmo componente? | Arquivo |
| --- | ---: | ---: | ---: | --- |
| Exibir área Personal | Sim (modal via Dumbbell no card) | Não (sem botão na tabela; sem aba) | N/A | `page.tsx` |
| Selecionar personal | Sim (`showModalBuscarPersonalTrainer`) | Não | — | `page.tsx` |
| Ver solicitação pendente | Sim | Não | — | `page.tsx` |
| Cancelar solicitação | Sim | Não | — | `page.tsx` |
| Ver vínculo ativo | Sim | Não | — | `page.tsx` |
| Encerrar compartilhamento | Sim | Não | — | `page.tsx` |
| Abrir Plano de Treino (edição) | Não | Não | — | — |
| Visualizar calendário de treinos | Sim (`CalendarioTreinosPersonal`) | Não neste fluxo | Componente único | `CalendarioTreinosPersonal.tsx` |
| Editar Plano de Treino | Não | Não | — | — |
| Editar Paciente (dados) | Modal 3 abas | Modal 10 pastas | **Componentes/modais diferentes** | `page.tsx` |
| Compartilhar com nutricionista | Subfluxo Nutrologia no desktop modal; no mobile via botão Nutri do card / pasta | Sim (aba Nutrologia) | Lógica similar, UI Nutri ≠ Personal | `page.tsx` |

### 4.1 Por que Personal aparece no mobile e não como aba no desktop?

| Hipótese | Veredito |
| --- | --- |
| Renderização condicional `isMobile` no modal Personal | **Não** — modal não checa `isMobile` |
| Breakpoint escondendo bloco Personal no desktop edit | **Não** — bloco Personal simplesmente **não existe** nas pastas |
| Componentes diferentes de edit | **Sim** — edit mobile ≠ edit desktop |
| Fluxo legado / ponto de entrada só no card mobile | **Sim** — Dumbbell só em `lg:hidden` |
| Ausência no array de tabs desktop | **Sim** — causa direta para “não tem aba” |
| Conteúdo presente mas não renderizado | **Não** |
| Código duplicado Nutrologia vs Personal | Parcial — Nutri já embutido na pasta 3; Personal ficou em modal avulso |
| Modal diferente | **Sim** — `showModalPersonal` ≠ Editar Paciente |

**Motivo principal:** ausência da aba no array de pastas desktop + ausência de botão de entrada na tabela desktop. A implementação útil está no modal avulso ligado aos cards mobile.

---

## 5. Componentes e funções reutilizáveis

Não existe hoje um componente nomeado `PersonalPatientManagement`. Tudo é JSX inline + callbacks no `page.tsx`.

| Item | Arquivo | Reutilizável no desktop? | Exige adaptação? |
| --- | --- | ---: | ---: |
| Bloco JSX compartilhar/encerrar/pendente | `page.tsx` ~39416–39565 | Sim (extrair) | Sim — trocar `pacientePersonalSelecionado` por `pacienteEditando` ou prop |
| Modal busca personal | `page.tsx` ~39582–39676 | Sim | Baixa — já global |
| `CalendarioTreinosPersonal` | `components/CalendarioTreinosPersonal.tsx` | Sim | Baixa — passar `userId`/`id` |
| `loadPersonalTrainersElegiveis` | `page.tsx` ~6500 | Sim | Não |
| `loadStatusCompartilhamentoPersonal` | `page.tsx` ~6603 | Sim | Não |
| `buscarPersonalTrainersPorLocalizacao` | `page.tsx` ~6548 | Parcial | UI de busca atual lista elegíveis; localização parece residual |
| Estados `vinculosAtivosPacientePersonal`, `solicitacoes…`, `personalTrainersElegiveis`, loaders | `page.tsx` | Sim | Cuidar stale ao trocar paciente |
| `SolicitacaoPersonalTrainerService.*` | `services/solicitacaoPersonalTrainerService.ts` | Sim | Não |
| `PersonalTrainerService` | `services/personalTrainerService.ts` | Sim | Não |
| Confirms / `setMessage` / loaders | `page.tsx` | Sim | Não |
| `PersonalPageContent` | `app/meta/personal/page.tsx` | Tecnicamente possível | **Alto** — não usado hoje; papel médico ≠ patient/trainer mode |
| Página Vínculos → Personal (menu) | `page.tsx` ~21835+ | Não para aba paciente | É vínculo médico↔personal, outro fluxo |

**Não duplicar:** serviços e loaders já existentes; só falta um painel compartilhado (ou pasta) consumindo-os.

---

## 6. Fluxo de compartilhamento atual (mobile / modal Personal)

### 6.1 Funções reais

| # | Ação | Função |
| ---: | --- | --- |
| 1 | Carregar personal/vínculo atual | `loadStatusCompartilhamentoPersonal` → query `paciente_personal_trainer` status `ativo` filtrado por `medicoId` |
| 2 | Carregar solicitações | mesmo loader → `listRequestsByPaciente` |
| 3 | Carregar elegíveis | `loadPersonalTrainersElegiveis` (`isVerificado` + `ativo` + `medicoVinculadoIds`) |
| 4 | Selecionar | UI modal busca → click no personal |
| 5 | Criar solicitação | `createPacienteShareRequest(medicoId, personal.userId, pacienteId, extras)` |
| 6 | Cancelar | `cancelShareRequest(solicitacao.id)` |
| 7 | Encerrar | `endCompartilhamento(pacienteId, personalTrainerId, medicoId)` |
| 8 | Atualizar UI | `loadStatusCompartilhamentoPersonal` + `setMessage` |

### 6.2 Fluxo técnico — abertura

```txt
Abertura (Dumbbell)
→ pacientePersonalSelecionado = paciente
→ showModalPersonal = true
→ loadPersonalTrainersElegiveis()
→ loadStatusCompartilhamentoPersonal(paciente.id)
→ se vinculosAtivos.length > 0 → UI Encerrar
→ senão → UI Buscar + pendentes
→ sempre renderiza CalendarioTreinosPersonal
```

### 6.3 Fluxo técnico — criação

```txt
Buscar Personal Trainer
→ (re)load elegíveis
→ médico clica personal
→ createPacienteShareRequest
→ Firestore: solicitacoes_personal_trainer { status: pendente }
→ fecha modal busca
→ loadStatusCompartilhamentoPersonal
→ UI mostra pendente até aceite no /metapersonal
```

### 6.4 Collections / serviços

- `solicitacoes_personal_trainer`
- `paciente_personal_trainer`
- `personal_trainers` (elegibilidade)
- Serviços: `SolicitacaoPersonalTrainerService`, `PersonalTrainerService`
- Sessões (só leitura no calendário): `trainingSessions` via `trainingSessionService`

---

## 7. Plano de Treino no mobile do `/metaadmin`

| Pergunta | Resposta |
| --- | --- |
| Existe botão para abrir o treino (edição completa)? | **Não** |
| Existe calendário? | **Sim** — `CalendarioTreinosPersonal` |
| Existe acesso a `PersonalPageContent`? | **Não** (não importado) |
| Existe redirecionamento para `/meta/personal`? | **Não** neste fluxo |
| Existe modal próprio de treino? | Só o calendário dentro do modal Personal |
| Médico só gerencia vínculo? | **Sim**, + visualização de sessões |
| Médico cria/edita sessões? | **Não** neste fluxo |
| Componente | `CalendarioTreinosPersonal` |
| Papel do médico ao salvar treino | **N/A** — não salva treino aqui |

`CalendarioTreinosPersonal` carrega sessões (`getPatientSessions` / exercícios) e permite abrir detalhe; **não** chama `createSession` / `updateSession` / `deleteSession`.

---

## 8. Relação com `PersonalPageContent`

| Item | Situação |
| --- | --- |
| Importado em `/metaadmin`? | **Não** |
| Versão própria para médico? | **Não** |
| Apenas calendário simplificado? | **Sim** |
| Código antigo/morto? | Comentário “antes das tabs” sugere intenção incompleta; modal de busca por localização tem estados, mas UI atual lista elegíveis vinculados |
| Acesso ao treino por outro componente? | Calendário read-only |
| Seguro reutilizar `PersonalPageContent` no desktop futuramente? | Possível, mas **fora do escopo** desta aba de vínculo; exigiria modo médico (`createdBy`/permissões) e decisão de produto. **Não** é necessário para espelhar o que o mobile já faz (share + calendário). |

---

## 9. Responsividade e breakpoints

| Mecanismo | Valor | Uso relevante |
| --- | --- | --- |
| Tailwind `lg` | 1024px | Tabela vs cards; Nutrologia desktop vs sub-abas |
| `isMobile` JS | `< 768px` | Alguns fluxos auxiliares; **não** gate do Personal |
| Modal Personal | `sm:` classes para dialog desktop-like | Pode abrir em qualquer viewport **se** chamado |

**O que fica oculto no desktop (`lg+`):** cards mobile (inclui Dumbbell Personal).  
**O que fica oculto no mobile (`<lg`):** tabela desktop (Editar/Excluir apenas).

**Área Personal:** não está dentro de um bloco `lg:hidden` do próprio modal; o **gatilho** está no card `lg:hidden`.

**Risco de “copiar o bloco mobile” para aba desktop:** o JSX do modal assume `pacientePersonalSelecionado` e `z-[9999]` fullscreen/overlay. Colar dentro da pasta do Editar Paciente sem extrair gera conflito de scroll, paciente errado e modal-dentro-de-modal.

---

## 10. Riscos de uma futura aba desktop (após Nutrologia)

| Risco | Detalhe |
| --- | --- |
| Duplicação de estados | Manter `pacientePersonalSelecionado` + `pacienteEditando` desincronizados |
| Duplicação de modais | Busca Personal aberta sob Editar Paciente (`z-index` 9999 vs 50/10000) |
| Chamadas repetidas | Load elegíveis no open do card **e** no enter da pasta |
| Conflito mobile/desktop | Card Dumbbell + nova aba ambos mutando mesmos estados |
| Paciente errado / stale | Trocar pasta/paciente sem limpar vínculos/solicitações |
| Double actions | Dois botões Encerrar (card modal + aba) se ambos forem mantidos sem coordenação |
| `page.tsx` monolítico | Já enorme; mais JSX inline piora manutenção |
| Scroll no modal | Pasta já tem `overflow-y-auto`; calendário + share precisam caber |
| Divergência futura | Mobile modal e desktop aba evoluindo separado |

---

## 11. Melhor caminho de reutilização

### Opção A — Reutilizar diretamente o bloco mobile

Renderizar o JSX atual de `showModalPersonal` dentro da nova pasta.

- **Prós:** rápido  
- **Contras:** acoplado a overlay/`pacientePersonalSelecionado`; risco alto de regressão mobile; scroll/z-index  

### Opção B — Extrair componente compartilhado *(recomendado)*

Ex.: `PersonalPacienteSharePanel` (nome ilustrativo) recebendo:

- `paciente: PacienteCompleto`
- `medicoId`
- estados/handlers ou callbacks (`onShare`, `onCancel`, `onEnd`)
- opcional `showCalendar?: boolean`

Usado por:

1. Modal atual do card mobile (preserva UX)
2. Nova aba desktop `Personal` (depois de Nutrologia)

- **Prós:** menor duplicação; preserva mobile; incremental; alinhado ao padrão Nutrologia (share na pasta)  
- **Contras:** exige extração cuidadosa (ainda sem redesign)

### Opção C — Aba desktop separada só com serviços

Nova UI do zero, mesmos services.

- **Prós:** não toca no mobile de imediato  
- **Contras:** duplica UI/estados; maior chance de divergência  

### Veredito

**Opção B** é a mais segura com o código atual:

1. Menor risco de regressão no card mobile  
2. Reusa loaders/serviços já prontos  
3. Espelha o padrão já validado da aba Nutrologia (share embutido)  
4. Permite implementação incremental: (1) extrair painel sem mudar UX → (2) adicionar pasta desktop → (3) opcionalmente fazer o modal mobile consumir o mesmo painel  

**Não** é necessário, nesta fase, embutir `PersonalPageContent` nem dar edição de treino ao médico.

Posição sugerida da aba (pedido futuro): **depois de Nutrologia** no array:

```txt
… Prontuário → Nutrologia → Personal → Exames …
```

---

## 12. Arquivos prováveis da futura alteração

| Arquivo | Alteração provável | Risco |
| --- | --- | --- |
| `app/metaadmin/page.tsx` | Incluir pasta no array; branch `pastaAtiva`; wire loads; opcional usar componente extraído | **Alto** (arquivo enorme) |
| Novo `components/metaadmin/…/PersonalPacienteSharePanel.tsx` (ou similar) | Extrair UI share + pendente + encerrar | Médio |
| `components/CalendarioTreinosPersonal.tsx` | Reuso; talvez props menores | Baixo |
| `services/solicitacaoPersonalTrainerService.ts` | Provavelmente intacto | Baixo |
| `services/personalTrainerService.ts` | Intactos | Baixo |
| `features/metaPersonal/*` | Intactos | Baixo |
| Modal mobile card Dumbbell | Passar a renderizar o painel compartilhado | Médio (regressão UX) |
| `app/meta/personal/page.tsx` | **Permanecer intacto** nesta fase | — |
| Firestore / rules | Sem mudança para só expor a aba | — |

**Devem permanecer intactos nesta entrega futura mínima:** `PersonalPageContent`, fluxo `/metapersonal`, rules, collections.

**Serviços já prontos:** `SolicitacaoPersonalTrainerService`, `PersonalTrainerService`, `loadPersonalTrainersElegiveis`, `loadStatusCompartilhamentoPersonal`.

---

## 13. Mapa mental atual

```txt
/metaadmin pacientes
├── Desktop (lg+)
│   ├── Tabela → Editar → showEditarPacienteModal (pastas 1,2,10,3,4…9)
│   │                         └── Nutrologia tem share nutricionista
│   │                         └── SEM pasta Personal
│   └── Sem botão Dumbbell
│
└── Mobile (<lg cards)
    ├── User → showEditarPacienteMobileModal (3 abas) — SEM Personal
    └── Dumbbell → showModalPersonal
            ├── Share / pendente / encerrar
            ├── Buscar personal (modal filho)
            └── CalendarioTreinosPersonal (read-only)
```

---

## 14. Conclusões para a futura aba desktop

1. O trabalho útil a reutilizar é o do **modal Personal** (share + calendário), não o do **Editar Paciente mobile**.
2. A aba Nutrologia desktop é o **melhor modelo estrutural** (share na pasta + conteúdo abaixo).
3. Extrair um painel compartilhado (Opção B) antes de só “colar” JSX reduz risco.
4. Plano de Treino editável para o médico **não faz parte** do comportamento mobile atual — não deve ser acoplado na primeira versão da aba.

---

*Documento gerado apenas a partir do código existente. Nenhuma alteração foi feita.*
