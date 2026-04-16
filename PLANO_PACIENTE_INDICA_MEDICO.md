# Plano: Paciente Indica Médico para O Método Emagrecer

## Visão Geral

Implementar fluxo onde o **Paciente em tratamento** pode indicar o **Médico X** para outras pessoas fazerem O Método Emagrecer. Similar ao "Meu Link" do Nutricionista e Personal, mas o indicador é um **paciente** (e não profissional).

---

## Contexto Atual

| Área | O que existe hoje |
|------|-------------------|
| **/meta** | Menu "Encaminhar Paciente" → Encaminhar (médico escolhe) + Minhas Indicações |
| **/metaadmin** | Menu "Encaminhados" → Lista de indicações (de médicos) + Solicitações de Pacientes |
| **/metanutri, /metapersonal** | "Meu Link" → gera link `/dr/[medico]/[nutri-ou-personal]` → paciente solicita tratamento |
| **/aplicacao/[token]** | Página de preenchimento de dados da aplicação → sucesso com resultado + fogos |
| **Calendário metaadmin** | Ao clicar no dia de hoje, card com link WhatsApp para paciente preencher dados |

---

## Fluxo Desejado (resumido)

1. **metaadmin** → Calendário → clicar em **hoje** → card com link WhatsApp para paciente preencher dados
2. Paciente preenche em **/aplicacao/[token]** → vai para página 2 (resultado + fogos)
3. **Página 2** tem link: "Indicar o Médico X" para fazer O Método Emagrecer
4. Link abre página tipo **/dr/[medico]/paciente/[slug-paciente-indicador]** → "Fulano está recomendando fazer O Método Emagrecer com o Médico X" → botão entrar com Google → solicitar tratamento
5. Ao solicitar → chega em **metaadmin** → Solicitações de Pacientes (mostra paciente que solicitou + paciente que indicou)
6. **/meta** → nova página "Encaminhamentos" → lista de pacientes que solicitaram via link do Paciente X, com status (Pendente, Em Tratamento, Concluído, Abandono)
7. **/metaadmin** → "Encaminhados" → incluir pacientes indicados por outros pacientes, com card mostrando nome, quem indicou e status

---

## Plano em Etapas

### Etapa 1: Modelo de dados e backend para indicação paciente→paciente

**Objetivo:** Estender o modelo para suportar "paciente indicador" na solicitação e criar serviço para encaminhamentos do paciente.

**Tarefas:**
- [ ] Estender `solicitacoes_medico` com campos:
  - `pacienteIndicadorId?: string`
  - `pacienteIndicadorNome?: string`
  - `pacienteIndicadorUserId?: string` (email/userId do paciente que indicou)
- [ ] Estender `SolicitacaoMedico` em `types/solicitacaoMedico.ts`
- [ ] Atualizar `SolicitacaoMedicoService.criarSolicitacao` para aceitar `pacienteIndicador`
- [ ] Criar ou estender serviço para listar encaminhamentos do paciente (por `pacienteIndicadorId` / `pacienteIndicadorUserId`)

**Entregável:** Schema e serviços prontos para uso.

---

### Etapa 2: Página de indicação do paciente (tipo dr/nutri)

**Objetivo:** Nova rota `/dr/[medico]/paciente/[slugPaciente]` que mostra "Fulano está recomendando fazer O Método Emagrecer com o Médico X".

**Tarefas:**
- [ ] Criar API `/api/paciente-por-nome?nome=xxx` (ou reutilizar lógica existente) para buscar paciente por slug
- [ ] Criar página `app/dr/[...slug]/page.tsx` para suportar 3 segmentos: `[medico]/paciente/[slugPaciente]`
- [ ] Ou criar rota dedicada `app/dr/[medico]/paciente/[slugPaciente]/page.tsx`
- [ ] Layout similar à página do nutricionista/personal:
  - Banner: "**{nomePacienteIndicador}** está recomendando fazer O Método Emagrecer com **Dr. {nomeMedico}**"
  - Botão "Entrar com Google" / "Solicitar Tratamento"
  - Ao solicitar, passar `pacienteIndicadorId` e `pacienteIndicadorNome` para `SolicitacaoMedicoService`
- [ ] Validar que o paciente indicador existe, está ativo e tem médico responsável = médico da página

**Entregável:** Página funcional onde qualquer pessoa pode solicitar tratamento indicada por um paciente.

---

### Etapa 3: Link "Indicar Médico" na página de sucesso da aplicação

**Objetivo:** Na página de sucesso de `/aplicacao/[token]`, exibir link para indicar o Médico X.

**Tarefas:**
- [ ] API `/api/aplicacao/[token]/dados` deve retornar:
  - `medicoId`, `medicoNome` (do paciente dessa aplicação)
  - `pacienteId`, `pacienteNome` (do paciente que preencheu)
- [ ] Na tela de sucesso (`sucesso === true`), após resultado + fogos:
  - Seção: "Indique seu médico para amigos e familiares"
  - Texto: "Compartilhe este link para que outras pessoas possam solicitar tratamento com Dr. {medicoNome}"
  - Gerar link: `/dr/{slugMedico}/paciente/{slugPaciente}`
  - Botão "Copiar link" e opção "Compartilhar no WhatsApp"

**Entregável:** Paciente vê e pode compartilhar o link de indicação na página de sucesso da aplicação.

---

### Etapa 4: WhatsApp no calendário (metaadmin) para envio do link da aplicação

**Objetivo:** Garantir que, ao clicar no dia de hoje, o card da aplicação tenha o link WhatsApp para o paciente preencher dados.

**Tarefas:**
- [ ] Verificar se o ícone WhatsApp já existe no card de aplicação quando `ehDiaDaAplicacao` (já existe na linha ~15055)
- [ ] Ajustar mensagem do WhatsApp (se necessário) para deixar claro que é para preencher dados
- [ ] Opcional: incluir no corpo da mensagem um convite para, após preencher, compartilhar o link de indicação (ex.: "Após preencher, você poderá indicar seu médico para outras pessoas")

**Entregável:** Fluxo completo: médico clica em hoje → card → WhatsApp → paciente preenche → sucesso → vê link de indicação.

---

### Etapa 5: Solicitações de Pacientes (metaadmin) – mostrar indicador

**Objetivo:** Na seção "Solicitações de Pacientes", exibir quem indicou quando a solicitação veio de paciente.

**Tarefas:**
- [ ] Ao listar `solicitacoesMedico`, incluir `pacienteIndicadorNome` quando existir
- [ ] UI: abaixo do nome do paciente que solicitou, mostrar "Indicado por: {pacienteIndicadorNome}" (quando houver)
- [ ] Manter cards atuais para solicitações diretas e de nutri/personal

**Entregável:** Médico vê claramente quem indicou o paciente em cada solicitação.

---

### Etapa 6: Página "Encaminhamentos" no /meta (paciente)

**Objetivo:** Nova tela em /meta com lista de pacientes que solicitaram tratamento via link do paciente logado.

**Tarefas:**
- [ ] Usar menu existente "Encaminhar Paciente" ou criar submenu "Encaminhamentos"
- [ ] Nova aba ou seção: "Pacientes que solicitaram via meu link"
- [ ] Listar solicitações onde `pacienteIndicadorUserId === user.email` (ou `pacienteIndicadorId` = paciente atual)
- [ ] Cards com:
  - Nome do paciente
  - Status: Pendente | Em Tratamento | Concluído | Abandono
  - Data da solicitação
- [ ] Status: mapear `solicitacoes_medico.status` + `statusTratamento` do paciente (quando aceito) para os 4 estados acima

**Entregável:** Paciente vê lista de pessoas que solicitaram tratamento usando seu link, com status.

---

### Etapa 7: Página "Encaminhados" no /metaadmin – incluir indicações de pacientes

**Objetivo:** Incluir na tela "Encaminhados" os pacientes indicados por outros pacientes (além dos indicados por médicos).

**Tarefas:**
- [ ] Unificar fontes: `IndicacaoService` (médico indica) + solicitações com `pacienteIndicadorId` (paciente indica)
- [ ] Ou criar consulta que busque ambos e apresente em lista única
- [ ] Cards mostrando:
  - Nome do paciente
  - Quem indicou (médico ou paciente)
  - Status: Pendente | Em Tratamento | Concluído | Abandono
- [ ] Filtro ou separação visual por tipo de indicador (médico vs paciente), se desejado

**Entregável:** Médico vê todos os encaminhados (de médicos e de pacientes) em uma única página.

---

### Etapa 8: Refinamentos e testes

**Objetivo:** Garantir consistência, UX e correção de edge cases.

**Tarefas:**
- [ ] Teste E2E: calendário → WhatsApp → aplicação → sucesso → link → nova pessoa solicita → aparece em Solicitações e em Encaminhados
- [x] Teste: status "Em Tratamento", "Concluído", "Abandono" refletidos corretamente em /meta e /metaadmin
- [x] Validações: link de indicação só disponível para paciente com médico responsável; médico da página deve ser o médico do paciente
- [ ] Ajustes de copy e responsividade
- [ ] Índices Firestore, se necessário, para queries por `pacienteIndicadorId` / `pacienteIndicadorUserId`

**Entregável:** Fluxo completo testado e estável.

---

## Ordem Sugerida de Implementação

```
Etapa 1 (Backend)  →  Etapa 2 (Página dr/paciente)  →  Etapa 3 (Link na aplicação)
        ↓
Etapa 4 (Calendário/WhatsApp)  →  Etapa 5 (Solicitações)  →  Etapa 6 (/meta)  →  Etapa 7 (/metaadmin)  →  Etapa 8 (Testes)
```

---

## Resumo de Arquivos Envolvidos

| Área | Arquivos principais |
|------|---------------------|
| Modelo | `types/solicitacaoMedico.ts`, `types/indicacao.ts` (se necessário) |
| Serviços | `services/solicitacaoMedicoService.ts`, `services/indicacaoService.ts`, novo serviço de encaminhamentos do paciente |
| APIs | `api/aplicacao/[token]/dados/route.ts`, `api/aplicacao/link/route.ts`, `api/paciente-por-nome` (novo ou existente) |
| Páginas | `app/dr/[...slug]/page.tsx` ou `app/dr/[medico]/paciente/[slug]/page.tsx`, `app/aplicacao/[token]/page.tsx`, `app/meta/page.tsx`, `app/metaadmin/page.tsx` |

---

## Notas Técnicas

- **Slug do paciente:** Usar `nome-sobrenome` normalizado (como no médico/nutri), ou considerar ID base64 se precisar de mais segurança.
- **Indicacao vs SolicitacaoMedico:** O fluxo médico→paciente usa `Indicacao`. O fluxo paciente→paciente usará `solicitacoes_medico` com `pacienteIndicadorId`. Decisão: manter modelos separados; na UI de "Encaminhados" unificar a exibição.
- **Status "Abandono":** Já existe em `statusTratamento` do paciente; mapear para exibição em "Encaminhados" e "Encaminhamentos".
