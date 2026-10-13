# Etapa 02 — Fundação da Avaliação para Atividade Física

**Data:** 2026-07-26  
**Escopo:** auditoria e arquitetura apenas. **Nenhum fluxo funcional foi alterado.**  
**Bases:**  
- `docs/metapersonal/AUDITORIA_PLANO_TREINO_META_METAPERSONAL.md`  
- `docs/metapersonal/AUDITORIA_PERSONAL_METAADMIN_MOBILE_DESKTOP.md`  
- `docs/metapersonal/ETAPA_01_ABA_PERSONAL_DESKTOP_METAADMIN.md`

---

## Sumário executivo

| Decisão | Escolha |
| --- | --- |
| Reuso do `/whitelabel` | **Referência / padrões** — não importar `WhiteLabelLeadPageClient` |
| Gate futuro em `/meta/personal` | Após auth + paciente + `medicoResponsavelId`, **somente modo paciente** |
| Nome técnico | `AvaliacaoAtividadeFisica` / `avaliacaoAtividadeFisica` |
| Nome UI paciente | “Vamos criar seu treino personalizado” |
| Nome UI médico/personal | “Avaliação Inicial para Atividade Física” |
| Collection | Documentar agora; **criar na Etapa 03** (`avaliacaoAtividadeFisica/{pacienteId}`) |
| Serviço | Documentar contrato; implementar CRUD mínimo na Etapa 03 |
| Médico | Futuro resumo em `PersonalPacienteSharePanel` (entre vínculo e calendário) |
| Personal | Futuro resumo somente leitura no card do paciente e/ou header do embed |

---

## 1. Auditoria do questionário `/whitelabel`

### 1.1 Arquivos principais

| Caminho | Papel |
| --- | --- |
| `app/whitelabel/page.tsx` | Rota; props de profissão / flow |
| `components/whitelabel/WhiteLabelLeadPageClient.tsx` | UI one-question-at-a-time |
| `lib/whiteLabel/leadWhiteLabelQuestions.ts` | Banco de perguntas + tipos |
| `lib/whiteLabel/leadWhiteLabelNormalize.ts` | Normalização email/WhatsApp/IG |
| `components/whitelabel/WhiteLabelMeetingScheduler.tsx` | Pós-questionário (reunião) |
| `components/whitelabel/WhiteLabelMeetingReview.tsx` | Revisão |
| `components/whitelabel/WhiteLabelMeetingSuccess.tsx` | Tela final |
| `app/api/whitelabel/leads/route.ts` / `submit/route.ts` | Persistência |
| `lib/whiteLabel/leadService.ts` | Gravação Firestore |
| `types/leadWhiteLabel.ts` | Shape do lead |

**Cadastro** (`CadastroMedicoPageClient` + `CadastroMedicoFormUi`) é um wizard multi-campo **separado**, com draft/resume — não é o mesmo motor do lead Q&A.

### 1.2 Comportamento do lead Q&A

| Aspecto | Implementação |
| --- | --- |
| Uma pergunta por vez | `step` indexa `questions`; só a atual renderiza |
| Progresso | `((step + 1) / totalSteps) * 100`; barra sticky animada |
| Navegação | Voltar se `step > 0`; avançar após validação |
| Tela inicial | Não é tela própria — copy no `step === 0` |
| Tela final | Success / Instagram WhatsApp success |
| Seleção única | `type: 'choice'` + `options` |
| Seleção múltipla | **Não existe** no lead |
| Campos livres | `text` / `email` / `tel` (curtos) |
| Condicionais | Labels/opções por `profissao`; limpa choices ao mudar |
| Validação | Required, email regex, WhatsApp ≥10 dígitos |
| Salvamento | Só no submit final |
| Retomada | **Não** (sem localStorage no lead) |
| Estado local | `form: Record<string,string>` + `step` |
| Persistência | `leadsWhiteLabel` (+ timeline) |
| Responsividade | `max-w-lg` / `md:max-w-2xl`, sticky header/footer |
| Animações | Framer Motion `AnimatePresence` slide/fade |
| Design | Tailwind slate + emerald/teal; sem DS package |

### 1.3 Respostas às perguntas-chave

1. **É seguro reutilizar os componentes atuais?**  
   **Não diretamente.** O client acopla CRM, reunião, Instagram e scoring.

2. **Está acoplado ao domínio White Label?**  
   **Sim.**

3. **Reutilizar diretamente ou só referência?**  
   **Referência.** Extrair padrões (progresso, shell de step, botão de escolha).

4. **Existe componente genérico de questionário?**  
   **Não.** Paralelos: 50kgdepois (capítulos texto), cadastro (multi-campo).

5. **O que extrair para evitar duplicação?**  
   - Shell: sticky header + progresso “N de M” + `AnimatePresence`  
   - `ChoiceButton` / estilos de `CadastroMedicoFormUi`  
   - DTO de pergunta: `{ key, label, type, options?, placeholder? }`  
   - Validadores email/tel  
   **Não** extrair: `WhiteLabelLeadPageClient`, banco White Label, meeting flows.

---

## 2. Auditoria do `/meta/personal`

### 2.1 Componente principal

`app/meta/personal/page.tsx` → `PersonalPageContent`

Props relevantes: `embedded`, `pacienteProp`, `fromMetapersonalEmbedded`.

### 2.2 Identidade e carga

| Item | Como |
| --- | --- |
| Auth | Firebase `onAuthStateChanged`; sem user → `/` |
| Paciente (modo paciente) | `PacienteService.getPacienteByEmail(user.email)` |
| Paciente (modo personal) | `?pacienteId=` → `getPacienteById` |
| Sessões | `trainingSessionService` com chave preferencial `paciente.userId` |
| Calendário | Abas internas + calendários locais na página |
| Loading | Spinner global; loading por aba (hoje/histórico) |
| Vazio | Mensagens “sem treino” nas abas |
| Erro | Alerts / banners; soft auth no modo trainer |

### 2.3 Diferenciação paciente vs personal

| Flag | Significado |
| --- | --- |
| `isPersonalTrainerMode` | `searchParams.get('pacienteId')` presente |
| `fromMetapersonal` / `fromMetapersonalEmbedded` | Header “Aluno: nome”; embed no portal personal |
| Gate `medicoResponsavelId` | **Só modo paciente** |

### 2.4 Local recomendado do gate futuro

Ordem atual de early returns:

```txt
loading
→ !user
→ aguardar paciente (modo paciente)
→ authorizationError (trainer)
→ !medicoResponsavelId (paciente)
→ [NOVO] avaliação incompleta (paciente apenas)
→ UI normal do Personal
```

Fluxo desejado (não implementado nesta etapa):

```txt
Sem avaliação concluída → questionário
Avaliação em rascunho → retomar questionário
Avaliação concluída → página Personal normalmente
```

**Importante:** `isPersonalTrainerMode` e embed metapersonal **não** devem bloquear com o questionário.

### 2.5 Riscos de regressão no gate

- Condicionar mal e bloquear `/metapersonal?view=personal&pacienteId=`
- Gate antes do paciente carregado → falso “incompleto”
- Effects acima do early return continuam rodando (tráfego Firestore)
- `patientId` da avaliação vs `userId` das sessões (dois identificadores)
- Arquivo monolítico (~6k linhas) — preferir componente `AvaliacaoAtividadeFisicaGate`

---

## 3. Auditoria da aba Personal no `/metaadmin`

### 3.1 Estado atual (Etapa 01)

- Aba `{ id: 11, nome: 'Personal' }` no Editar Paciente desktop, após Nutrologia.
- Conteúdo: `PersonalPacienteSharePanel` com `paciente={pacienteEditando}`.
- Mobile card: Dumbbell → modal → mesmo painel (`compact`).

### 3.2 Estrutura atual do painel

```txt
Personal responsável (vínculo / busca / pendente / encerrar)
Calendário dos Treinos (CalendarioTreinosPersonal, read-only)
```

### 3.3 Onde inserir a avaliação (futuro)

Estrutura esperada:

```txt
Personal responsável
Avaliação Inicial para Atividade Física   ← slot futuro (resumo + link “ver respostas”)
Calendário dos Treinos
```

**Como evitar misturar com vínculo:**

- Novo subcomponente (ex. `AvaliacaoAtividadeFisicaResumoCard`) **irmão**, não dentro da lógica de share.
- Props: `pacienteId` (+ opcional status pré-carregado).
- `PersonalPacienteSharePanel` permanece só share + calendário; ou recebe `assessmentSlot?: ReactNode` para composição sem acoplamento.

Nesta etapa: **não modificar** o painel.

---

## 4. Auditoria do `/metapersonal`

| Item | Situação |
| --- | --- |
| Abrir paciente/treino | Dumbbell → `/metapersonal?view=personal&pacienteId=` |
| Embed | `<PersonalPageContent fromMetapersonalEmbedded />` |
| Validação de vínculo | Lista via `paciente_personal_trainer` ativo; soft-check no treino |
| Dados do paciente | Card + modal Visualizar (read-only) |
| Treino | `PersonalPageContent` (CRUD de sessões) |
| Onde mostrar avaliação | (1) card expandido — status chip; (2) header “Aluno” no embed — resumo compacto |
| Primeira implementação | **Somente leitura** |
| Acesso sem vínculo | Produto: não listar; rules atuais não garantem ACL forte |

Não modificar `/metapersonal` nesta etapa.

---

## 5. Nomenclatura

| Camada | Nome |
| --- | --- |
| UI paciente | “Vamos criar seu treino personalizado” (alt.: “Construindo seu treino personalizado”) |
| UI médico / personal | “Avaliação Inicial para Atividade Física” |
| Tipo TypeScript | `AvaliacaoAtividadeFisica` |
| Collection / pasta | `avaliacaoAtividadeFisica` |
| Serviço | `avaliacaoAtividadeFisicaService` |
| Alias conceitual | Physical Activity Assessment (docs em inglês, se necessário) |

**Motivo:** alinhado a `bioimpedanciaRegistros`, `dadosClinicos`, `anamnese*`. Evitar colidir com `entrevista` (50kgdepois) e `anamnese` clínica sem qualificativo. `trainingSessions` permanece inglês no domínio de sessões.

---

## 6. Modelo de dados recomendado

Separação conceitual:

```txt
answers          → respostas originais do paciente (imutáveis quanto à autoria)
safety           → flags de atenção derivadas / declaradas
summary          → resumo estruturado (pode incluir campos derivados; NÃO substitui answers)
professionalNotes → futuro (médico / personal) — fora do MVP inicial
metadata         → timestamps, status, version, step
```

### 6.1 Tipo recomendado

```ts
/** Status da avaliação de atividade física */
export type AvaliacaoAtividadeFisicaStatus =
  | 'draft'
  | 'completed'
  | 'needs_review';

export type AvaliacaoAtividadeFisicaSafety = {
  requiresProfessionalAttention: boolean;
  reasons: string[];
};

/**
 * Documento ativo por paciente.
 * patientId = id do documento em pacientes_completos.
 * userId = Auth UID (opcional, para lookup do portal paciente).
 */
export type AvaliacaoAtividadeFisica = {
  id: string;
  patientId: string;
  userId?: string | null;
  organizationId?: string | null;

  status: AvaliacaoAtividadeFisicaStatus;
  version: number;

  currentStep?: string | null;
  progressPercent?: number;

  /** Respostas do paciente — nunca substituir por texto de IA */
  answers: Record<string, unknown>;

  safety: AvaliacaoAtividadeFisicaSafety;

  /** Resumo estruturado para cards médico/personal e contexto de IA */
  summary?: Record<string, unknown> | null;

  /** Observações profissionais — Etapa 07+; vazio no MVP paciente */
  doctorNotes?: string | null;
  personalTrainerNotes?: string | null;

  startedAt: Date | string;
  updatedAt: Date | string;
  completedAt?: Date | string | null;

  createdBy: 'patient';
  lastUpdatedBy: 'patient' | 'doctor' | 'personal_trainer';
};
```

### 6.2 Princípios

- Rascunho + retomada via `status: 'draft'` + `currentStep` + `answers` parciais.
- Conclusão → `completed` + `completedAt`.
- `needs_review` reservado para flags de segurança altas (Etapa 05+).
- Histórico futuro: subcollection `versions` **sem implementar agora**.
- IA (Etapas 08–09) consome `summary` + subset de `answers` + dados conhecidos do paciente — **nunca** sobrescreve `answers`.

---

## 7. Collection recomendada

### 7.1 Existe algo compatível hoje?

**Não.** Não há collection de avaliação de atividade física. Existem apenas sinais embutidos (`estiloVida.atividadeFisica`, `perfilMetabolicoV3.atividadeFisica`) e `trainingSessions` (treinos).

### 7.2 Recomendação

```txt
avaliacaoAtividadeFisica/{patientId}
```

- `patientId` = `pacientes_completos.id` (mesmo id usado por médico/personal).
- Um documento ativo por paciente.
- Campo `userId` denormalizado para o portal `/meta/personal`.
- `organizationId` via padrão shadow já usado em vínculos (`shadowOrganizationFields`), quando gravar.

Histórico futuro (não agora):

```txt
avaliacaoAtividadeFisica/{patientId}/versions/{versionId}
```

### 7.3 Decisão desta etapa

**Apenas documentar.** Não criar collection, tipos nem serviço no código agora.

**Motivo:** sem UI/gate, tipos órfãos geram confusão; a Etapa 03 precisa do contrato + `createDraft`/`saveStep` juntos. Mais seguro criar tipos + service mínimo + primeira escrita no mesmo PR da Etapa 03.

---

## 8. Serviço de persistência (contrato)

Arquivo futuro: `services/avaliacaoAtividadeFisicaService.ts`  
(ou `lib/avaliacaoAtividadeFisica/avaliacaoAtividadeFisicaService.ts` se o time preferir feature-folder).

```ts
getByPatientId(patientId: string): Promise<AvaliacaoAtividadeFisica | null>
getByUserId(userId: string): Promise<AvaliacaoAtividadeFisica | null> // opcional
createDraft(patientId: string, initial?: Partial<...>): Promise<string>
saveStep(patientId: string, stepId: string, partialAnswers: Record<string, unknown>): Promise<void>
updateDraft(patientId: string, data: Partial<...>): Promise<void>
completeAssessment(patientId: string, summary?: Record<string, unknown>): Promise<void>
```

**Médico / personal:** `getByPatientId(paciente.id)` — leitura.

**Paciente:** resolve `paciente.id` após `loadPaciente`; se só tiver `user.uid`, usar `userId` denormalizado ou query.

Evitar abstração excessiva (sem repository genérico nesta fase).

---

## 9. Dados já conhecidos (não perguntar de novo)

| Informação | Fonte | Sempre disponível? | Usar na futura IA? |
| --- | --- | ---: | ---: |
| Nome | `nome` / `dadosIdentificacao.nomeCompleto` | Quase sempre | Só saudação UI; evitar PII no prompt |
| Data nascimento | `dadosIdentificacao.dataNascimento` | Opcional | Preferir idade |
| Idade | Derivada da DOB | Se DOB existir | Sim |
| Sexo | `dadosIdentificacao.sexoBiologico` | Opcional | Sim, se existir |
| Peso | `medidasIniciais.peso` / `evolucaoSeguimento` / bio | Parcial | Sim (preferir atual) |
| Altura | `medidasIniciais.altura` | Parcial | Sim |
| IMC | `medidasIniciais.imc` | Se peso+altura | Sim |
| Bioimpedância / composição | `bioimpedanciaRegistros[]` (runtime) | Não | Resumo (% gordura, massa) se houver |
| Doenças / comorbidades | `dadosClinicos.comorbidades`, diagnóstico | Parcial | Flags mínimas exercício-relevantes |
| Restrições físicas / lesões | **Sem campo estruturado dedicado** | Não | **Perguntar** na avaliação |
| Dor / barreiras movimento | `perfilMetabolicoV3.atividadeFisica.dificuldades` | Só anamnese completa | Confirmar no questionário |
| Nível de atividade | `estiloVida.atividadeFisica` | Opcional | Sim, como baseline |
| Tratamento / plano terapêutico | `planoTerapeutico` | Clínica | **Não** no MVP de treino |
| Medicações | `medicacoesUsoAtual` | Opcional | Evitar no MVP |

---

## 10. Mapa das próximas etapas

### Etapa 03 — Questionário básico

Saudação personalizada; objetivo; complementar; experiência; atividade atual; dias/semana; dias preferidos; duração; horário; local; draft + retomada.  
Criar tipos, collection, service mínimo, UI paciente **sem** ainda bloquear produção se feature-flag desejar — ou gate atrás de flag.

### Etapa 04 — Ambiente, equipamentos e preferências

Estrutura academia/casa; equipamentos; prioridades; modalidade; intensidade; cardio; preferidos/rejeitados; barreiras.

### Etapa 05 — Segurança e limitações

Dores; lesões; cirurgias; limitações; sintomas no esforço; restrições; flags `safety`.

### Etapa 06 — Revisão e conclusão

Resumo; edição; `completed`; liberar Personal; estado sem treino.

### Etapa 07 — Médico e personal

Resumo + respostas completas em `/metaadmin` (slot no painel) e `/metapersonal` (card/header); somente leitura.

### Etapa 08 — Contexto para IA

Função pura de contexto; regras de segurança; contrato JSON; sem chamada automática.

### Etapa 09 — Geração do primeiro treino

Uma chamada IA; preencher sessões no modelo atual; paciente pode gerar sem personal; edição posterior por personal/médico; sem aprovação obrigatória.

**Nenhuma dessas etapas está implementada agora.**

---

## 11. Segurança e permissões

### 11.1 Regras atuais (`firestore.rules`)

```txt
pacientes_completos → auth != null
fallback /{document=**} → auth != null
```

Não há ACL por papel nem por vínculo personal–paciente. **Risco alto já documentado** nas auditorias anteriores: qualquer autenticado pode ler/escrever se conhecer IDs.

### 11.2 Acesso desejado (futuro)

| Ator | Acesso desejado |
| --- | --- |
| Paciente | CRUD só do próprio doc (`patientId` / `userId` = auth) |
| Médico | Read pacientes sob sua responsabilidade |
| Personal | Read se `paciente_personal_trainer` ativo |
| Write de answers | Preferencialmente só paciente |

### 11.3 Regras recomendadas (quando criar a collection)

Matcher dedicado para `avaliacaoAtividadeFisica/{patientId}` com:

- create/update de `answers`/`status` draft→completed: `request.auth.uid` dono;
- read médico: validação via `pacientes_completos.medicoResponsavelId` (se factível nas rules) ou API server-side;
- read personal: existência de vínculo ativo (rules ou API).

**Nesta etapa:** não alterar `firestore.rules`. Documentar que, até rules específicas, a collection herdará o fallback amplo — mitigar na Etapa 03 com writes só pelo cliente autenticado do paciente + reads profissionais via UI que já carrega `paciente.id` (mesma postura atual do restante do Meta).

---

## 12. Riscos técnicos

| Risco | Severidade | Mitigação |
| --- | ---: | --- |
| Firestore ACL ampla | Alta | Rules específicas na criação da collection; não ampliar writes |
| Dual ID (`paciente.id` vs `userId`) | Média | Doc id = `paciente.id`; gravar `userId` |
| Gate no componente compartilhado | Alta | Condicionar `!isPersonalTrainerMode` |
| Duplicar motor White Label | Média | Extrair shell genérico novo; não importar lead client |
| Misturar avaliação com share no metaadmin | Média | Slot/componente irmão |
| Stale resumo médico/personal | Baixa | `updatedAt` + reload ao abrir aba/card |
| Perguntar dados já conhecidos | Baixa | Pré-preencher / omitir na UI |

---

## 13. Arquivos previstos para a Etapa 03

| Arquivo | Ação |
| --- | --- |
| `types/avaliacaoAtividadeFisica.ts` | Criar tipos |
| `features/avaliacaoAtividadeFisica/constants.ts` (opcional) | Nome da collection |
| `services/avaliacaoAtividadeFisicaService.ts` | CRUD draft/step/complete |
| `lib/avaliacaoAtividadeFisica/questionsBasic.ts` | Banco Etapa 03 |
| `components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaQuestionnaire.tsx` | UI one-step |
| `components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaGate.tsx` | Gate / retomada |
| `app/meta/personal/page.tsx` | Inserir gate (paciente only) |
| `components/.../ChoiceStepShell.tsx` (opcional) | Shell reutilizável inspirado no whitelabel |
| `firestore.rules` | Matcher dedicado (recomendado no mesmo PR ou logo após) |
| `docs/metapersonal/ETAPA_03_...md` | Doc da etapa |

**Não alterar na Etapa 03 (salvo composição mínima):** fluxo de compartilhamento, aceite personal, `/whitelabel`, geração IA, criação automática de `trainingSessions`.

---

## 14. Confirmação de não alteração funcional

Nesta Etapa 02:

- nenhum código de produto foi modificado;
- `/meta/personal` continua sem gate;
- `/whitelabel` intacto;
- compartilhamento e aceite do personal intactos;
- aba Personal / `PersonalPacienteSharePanel` intactos;
- nenhuma collection criada;
- `firestore.rules` intactas;
- nenhuma dependência instalada.

Único artefato desta etapa: **este documento**.
