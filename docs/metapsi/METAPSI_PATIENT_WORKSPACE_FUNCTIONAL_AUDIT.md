# MetaPsi — Auditoria Funcional do Workspace do Paciente (ETAPA 6.4)

**Tipo:** READ-ONLY — nenhuma implementação  
**Data:** 2026-09-17  
**Portais:** `/metaadmin`, `/metanutri`, `/metapersonal`, `/metapsi`, reflexos em `/meta`  
**Escopo:** modal/workspace do paciente (desktop + mobile) e dependências internas

---

## Resumo executivo

O workspace Psi (`MetaPsiPacienteWorkspaceModal`) **já monta as 10 pastas** com componentes compartilhados, mas o papel `psiquiatra` **não está integrado** aos sistemas transversais de escrita clínica:

| Área | Psi hoje | Classificação |
|------|----------|---------------|
| Identificação | RO via `PacienteIdentificacaoTabContent` | **OK** (RO intencional) |
| Anamnese | RO médica (`allowGerarAnaliseInteligente={false}`) | **OK** / futura Anamnese Psi = **C** |
| Prontuário | `ProntuarioTab readOnly` — **sem** origem/form Psi | **AUSENTE** (T + P1) |
| Exames | RO (`MetaPsiExamesReadonlyTab`) | **OK** RO; solicitação = **AUSENTE** |
| Bioimpedância | RO (`BioImpedanciaDisplay`) | **OK** (N aplicável write) |
| Evolução/Seguimento | RO multidisciplinar | **OK** RO; Evolução Psi = **C** |
| Prescrições | RO lista (`PrescricaoService` por paciente) | **OK** RO; criar = **AUSENTE** (arquitetura médico) |
| Nutrologia | `NutriContent somenteVisualizacao` | **OK** |
| Psiquiatria | `PsiquiatriaContent mode=owner` shell | **PARCIAL** (sem persistência clínica) |
| Personal | `PersonalPageContent professionalReadOnly` | **OK** |

**Lacuna P1 já conhecida:** “Nova consulta” do Prontuário não oferece **Psiquiatria** — `EventoTimelineOrigem` = `medico | paciente | sistema | nutri | personal | admin` (**sem `psiquiatra`**).

---

## 1. Workspaces auditados

| Portal | Desktop | Mobile |
|--------|---------|--------|
| MetaAdmin | Modal paciente monólito + pastas | `PatientDetailsMobileModal` (+ pasta Psiquiatria ETAPA 5.1) |
| MetaNutri | Modal inline `page.v2` + pastas | fullscreen / tabs horizontais |
| MetaPersonal | Modal similar Nutri | similar |
| MetaPsi | `MetaPsiPacienteWorkspaceModal` | mesmo modal `isMobile` / `z-[9999]` |
| Meta (paciente) | telas próprias (prescrições/exames leitura) | — |

---

## 2–3. Desktop × Mobile Psi

`MetaPsiPacienteWorkspaceModal` usa **o mesmo tree de pastas** em desktop e mobile (`modalTelaCheia`).

Diferenças UX (não funcionais de role):

- Desktop: aside `mn-pastas*`; mobile: tabs horizontais.
- Pastas 8/10: header colorido extra só `lg:hidden`.
- `ProntuarioTab mobileMode={modalTelaCheia}` — formulário já oculto por `readOnly`.
- Ações write **não** aparecem em nenhum breakpoint (props RO).

---

## 4. Identificação

| Item | Achado |
|------|--------|
| Componente | `PacienteIdentificacaoTabContent` |
| Edição | Não — campos `readOnly`/`disabled` |
| Psi vê | Sim (dados do `PacienteCompleto` pós-ACL) |
| Psi edita | Não |
| Esperado | RO (**NÃO PROVÁVEL** editar cadastro) |
| Status Psi | **OK** |

---

## 5. Anamnese

| Item | Achado |
|------|--------|
| Componente | `PacienteDadosClinicosTabContent` |
| Natureza | Anamnese / dados clínicos **médicos** existentes |
| Persistência | Documento paciente (fluxo médico) |
| Psi | `allowGerarAnaliseInteligente={false}` — sem path de IA write |
| Botão editar | Não no Psi |
| Status | **OK** (RO) |

### Anamnese × Psiquiatria

- Psi **apenas lê** a anamnese médica.
- **Não** confundir com futura Anamnese Psiquiátrica (ETAPA 7 = **C**).
- Write path indevido: não exposto no modal Psi.

---

## 6–8. Prontuário / Nova Consulta / Psi no Prontuário

### Implementação

| Peça | Local |
|------|-------|
| Tab médica | `ProntuarioTab` + `ProntuarioForm` + `ProntuarioTimeline` |
| Tab nutri/personal | `ProntuarioNutriTab` + `ProntuarioNutriForm` |
| Persistência | `pacientes_completos/{pacienteId}/timeline/{eventoId}` via `prontuarioService` |
| Tipos | `EventoTimelineTipo`, `EventoTimelineOrigem` |

### Tipo de “consulta”

Registro manual na timeline: evolução + sintomas + conduta + métricas opcionais.  
É **nota/registro de prontuário** (não slot de agenda). Nutri/Personal gravam `tipo: nutricao|atividade_fisica` com `origem: nutri|personal`. Médico grava `tipo: consulta` com `origem: medico`.

### Opções reais “Tipo de registro” (Médico — `ProntuarioForm`)

```text
consulta → Consulta médica
retorno → Retorno
teleconsulta → Teleconsulta
intercorrencia → Intercorrência
ajuste_dose → Ajuste de dose
observacao → Observação rápida
```

Nutri/Personal: variantes nutricionais / educador físico — **não** lista “Médico/Nutri/Personal” como dropdown de profissional; a **origem** é implícita pelo portal.

### Checklist Psi no Prontuário

| # | Pergunta | Resposta |
|---|----------|----------|
| A | `psiquiatra` em union origem? | **Não** (`EventoTimelineOrigem`) |
| B | UI Nova Consulta Psi? | **Não** (`readOnly` no Psi) |
| C | Ícone? | **Não** |
| D | Label origem? | **Não** em `LABEL_ORIGEM` |
| E | authorRole? | Usa `origem` + `medicoId`/`nutricionistaId` |
| F | Filtro dedicado? | **Não** |
| G | Badge? | **Não** |
| H | Renderer Psi? | **Não** |
| I | Persistência compatível? | **Parcial** — timeline genérica; falta origem/campos |
| J | Gate write Psi? | **Não** |
| K | Gate edit Psi? | **Não** |
| L | Visualização cross-portal? | N/A (nada escrito) |
| M | `/meta` vê? | N/A |
| N/O | Desktop/Mobile opção? | **Não** |

### Psi atual

`ProntuarioTab` com `readOnly` — timeline agregada **visível** (eventos médicos/nutri/personal/sistema que o loader inclui), sem (+)/form/delete.

Status: **AUSENTE** para escrita; leitura **PARCIAL/OK**.

---

## 9–10. Exames / Solicitação

| Subárea | Psi |
|---------|-----|
| Lab lista | RO de `paciente.examesLaboratoriais` |
| Imagem | `ExamesImagemPacientePanel somenteLeitura` + callbacks no-op |
| Solicitar | **Não** — sem `SolicitarExamesModal` |
| Upload/excluir | **Não** |
| Interpretar/IA | **Não** |

Solicitação atual: infraestrutura MetaAdmin (`SolicitarExamesModal`, PDF, timeline extractors). Papel solicitante tipicamente **médico**. Psi **não** está no modelo de solicitação.

Status: visualização **OK**; solicitação **AUSENTE** (T se generalizar; decisão clínica se Psi solicita).

---

## 11. Bioimpedância

`BioImpedanciaDisplay` com registros do paciente; sem `onSalvo` no Psi.  
Status: **OK** / write **NÃO SE APLICA**.

---

## 12–13. Evolução/Seguimento × Prescrições

**Evolução:** `EvolucaoSeguimentoReadonlyView` — visão multidisciplinar agregada (peso, check-ins, etc.). Sem write Psi. Futura Evolução Psiquiátrica = módulo **C**, não confundir com esta pasta.

**Prescrições:** `MetaPsiPrescricoesReadonlyTab` → `PrescricaoService.getPrescricoesByPaciente`. Tipo `Prescricao.medicoId` obrigatório. Sem botão Nova. PDF/assinatura centrados em médico.

Status: RO **OK**; criar **AUSENTE**.

---

## 14–16. Nutrologia / Personal / Psiquiatria

| Pasta | Write vazando? | Status |
|-------|----------------|--------|
| Nutrologia | `somenteVisualizacao` | **OK** |
| Personal | `professionalReadOnly` (+ viewer `doctor`) | **OK** |
| Psiquiatria | `mode=owner` mas **sem persistência clínica** (ETAPA 5) | **PARCIAL** |

---

## 17–19. Cross-portal

### Prontuário

| Autor | MetaAdmin | MetaNutri | MetaPersonal | Meta | MetaPsi |
|-------|-----------|-----------|--------------|------|---------|
| Médico (`origem:medico`) | vê/escreve | tipicamente filtrado (nutri não vê clínico médico) | similar | depende telas paciente | lê na timeline RO |
| Nutri (`origem:nutri`) | vê | escreve | — | — | lê se loader inclui |
| Personal (`origem:personal`) | vê | — | escreve | — | lê se loader inclui |
| Psi | — | — | — | — | **não escreve** |

### Exames / Prescrições

- Exames: dados no paciente + painéis imagem; paciente `/meta` tem fluxos de leitura.
- Prescrições: `medicoId`; paciente vê lista própria; Psi vê RO as do médico.

---

## 20. Desktop × Mobile (MetaAdmin)

`PatientDetailsMobileModal`: pastas Info / Lembretes / Prontuário / **Psiquiatria** (share + `PsiquiatriaContent` readonly).  
Prontuário mobile do médico usa mesmo domínio de timeline; formulário completo no desktop MetaAdmin.

---

## 21. Botões/actions (Psi workspace)

| Ação | Presente? |
|------|-----------|
| Adicionar/Nova consulta | Não (`readOnly`) |
| Editar/Excluir timeline | Não |
| Solicitar exame / Upload | Não |
| Prescrever | Não |
| Gerar análise IA anamnese | Não |
| Salvar nutri/treino | Não (`somenteVisualizacao` / `professionalReadOnly`) |

---

## 22–25. Unions / switches / labels / filtros

### `EventoTimelineOrigem` (crítico)

```text
'medico' | 'paciente' | 'sistema' | 'nutri' | 'personal' | 'admin'
```

**Sem `psiquiatra`.**

### `LABEL_ORIGEM`

Médico, Paciente, Sistema, Nutrição, Personal, Admin — **sem Psiquiatria**.

### `ProntuarioVisao`

`'medico' | 'nutricionista'` — sem psi.

### Filtros timeline

Sem filtro “Psiquiatria”; consultas médicas sob `consulta` / origem médico.

### Ícones

Sem map de origem Psi; Brain usado na pasta Psiquiatria / shell.

---

## 26. Autoria / assinatura

- Prontuário médico: `medicoId` + `medicoNome`.
- Nutri/Personal: `nutricionistaId` / origem.
- Prescrição: médico + CRM no PDF.
- Psi futuro precisará: nome + CRM/UF (+ RQE opcional) sem hacks locais.

---

## 27. Collections

| Área | Collection / path |
|------|-------------------|
| Prontuário | `pacientes_completos/{id}/timeline` |
| Paciente | `pacientes_completos` |
| Prescrições | coleção de prescricões (via `PrescricaoService`) |
| ACL Psi | `paciente_psiquiatra` |
| Exames imagem | campos no paciente + storage |
| Psiquiatria clínica | **ainda sem** collection clínica dedicada |

---

## 28. APIs (amostra relevante)

| Área | Endpoint / path | Gate | Psi aceito? |
|------|-----------------|------|-------------|
| Prontuário | Client Firestore `criarEventoProntuario*` | portal implícito | **Não** |
| Notify nutri→médico | client notify + WhatsApp | nutri | N/A |
| Agenda (não prontuário) | `/api/metanutri/agenda/*` | nutri | Não |
| Prescrição assinatura | APIs signature/médico | médico | Não |
| Exames imagem Gemini | services metaadmin | médico | Não no Psi |

---

## 29–30. Client writes / Rules

- Prontuário/exames/prescrições writes: predominantemente **CLIENT WRITE** (+ catch-all Firestore `auth != null`).
- Classificação segurança: **S** antes de habilitar write Psi no client.

---

## 31. Matriz master (Psi)

| Área | Médico | Nutri | Personal | Psi | Desktop | Mobile | Status Psi |
|------|--------|-------|----------|-----|---------|--------|------------|
| Identificação | RW* | RO | RO | RO | OK | OK | **OK** |
| Anamnese médica | RW | RO | RO | RO | OK | OK | **OK** |
| Prontuário read | sim | filtrado | filtrado | sim RO | OK | OK | **OK** |
| Prontuário write | sim | nutri form | personal form | **não** | — | — | **AUSENTE** |
| Exames read | sim | sim | sim | RO | OK | OK | **OK** |
| Exames solicitar | sim | ?/limitado | não | **não** | — | — | **AUSENTE** |
| Bioimpedância | RW | RO/RW? | RO | RO | OK | OK | **OK** |
| Evolução pasta | agrega | agrega | agrega | RO | OK | OK | **OK** |
| Prescrições read | sim | RO | RO | RO | OK | OK | **OK** |
| Prescrições write | sim | não | não | **não** | — | — | **AUSENTE** |
| Nutrologia | RO | RW | RO | RO | OK | OK | **OK** |
| Personal | RO | RO | RW | RO | OK | OK | **OK** |
| Psiquiatria | RO shell | RO shell | RO shell | owner shell | OK | OK | **PARCIAL** |

\*RW = conforme produto médico.

---

## 32. Matriz de ações (Psi)

| Área | Ação | Psi atual | Psi esperado? |
|------|------|-----------|---------------|
| Prontuário | visualizar | Sim | SIM PROVÁVEL |
| Prontuário | nova consulta | Não | **SIM PROVÁVEL** (T) |
| Prontuário | editar/excluir próprios | Não | PRECISA DECISÃO |
| Anamnese | visualizar | Sim | SIM |
| Anamnese | editar médica | Não | NÃO PROVÁVEL |
| Anamnese Psi | criar | Não | ETAPA 7 (C) |
| Exames | visualizar | Sim | SIM |
| Exames | solicitar | Não | PRECISA DECISÃO CLÍNICA |
| Exames | upload | Não | PRECISA DECISÃO |
| Prescrição | visualizar | Sim | SIM |
| Prescrição | criar | Não | SIM PROVÁVEL (médio prazo) |
| Bio | escrever | Não | NÃO PROVÁVEL |
| Nutri/Personal | escrever | Não | NÃO |
| Psiquiatria | clínica | Shell | ETAPA 7 |

---

## 33–37. Categorias de lacunas

### T — Transversal

- Incluir `psiquiatra` em `EventoTimelineOrigem` + labels/ícones/filtros.
- Form/tab ou mode write no `ProntuarioTab` com gate ACL.
- Autoria CRM/UF na timeline.
- (Opcional) solicitação de exames se produto decidir.

### C — Clínica Psi nova (ETAPA 7)

- Anamnese Psiquiátrica, exame mental, escalas, plano terapêutico, evoluções estruturadas no módulo Psiquiatria.

### S — Segurança

- Catch-all Firestore; writes client no prontuário — hardening/API antes de write Psi.

### V — Visual

- Indigo residual em tab Exames Psi (não bloqueia função).

### N — Não se aplica

- Editar Identificação; editar Nutrologia/Personal; write Bioimpedância.

---

## 38–40. Prioridades

### P0

- Nenhum write clínico Psi ativo indevido encontrado no workspace (RO consistente).
- Risco residual: catch-all se alguém contornar UI (S).

### P1

- **Registrar consulta Psi no Prontuário** (origem/labels/form/gate) — lacuna funcional reportada.
- Cross-portal visibility rules quando Psi escrever.

### P2

- Solicitar exames; emitir prescrição; filtros dedicados “Psiquiatria”.

### P3

- Chrome Exames indigo; empty copy; polish mobile form RO.

---

## 41. Decisão Prontuário

# Podemos adicionar “Psiquiatria” à Nova Consulta do Prontuário ANTES da ETAPA 7?

```text
SIM
```

**Motivo:** a infraestrutura de timeline já é multiprofissional (`medico` / `nutri` / `personal`). Falta integração **transversal (T)**, não o módulo clínico completo da ETAPA 7.

**Afetados (mínimo estimado):**

| Camada | Itens |
|--------|--------|
| Types | `EventoTimelineOrigem` (+ opcional `psiquiatraId`) |
| Labels/icons | `LABEL_ORIGEM`, badges timeline |
| Service | `criarEventoProntuario…` (espelho nutri/personal) + listagem sem filtrar fora |
| UI | Form Psi ou extensão `ProntuarioTab` com `authorRole=psiquiatra`; **remover/condicionar `readOnly` no MetaPsi** |
| Gate | `hasActivePsiquiatraAccess` antes do write |
| Portais | MetaPsi (write); MetaAdmin/Nutri/Personal/Meta (read conforme regra) |
| Desktop/Mobile | Mesmo `ProntuarioTab` / `mobileMode` |
| Filtros | Incluir origem nas queries/`where` se usadas |
| Notify | Decidir se notifica médico (padrão nutri) |

**Não inclui:** Anamnese Psi, escalas, diagnóstico estruturado (isso continua ETAPA 7).

---

## 42. Decisão Exames

```text
REQUER PEQUENA GENERALIZAÇÃO
```

Visualização já OK. Solicitar/upload exigem generalizar `SolicitarExamesModal` / ownership além de médico + ACL Psi. **Não recomendado** habilitar upload livre sem gate.

---

## 43. Decisão Prescrições

```text
REQUER NOVA ARQUITETURA
```

(ou generalização **alta**): `medicoId`, PDF, assinatura digital e recibo estão acoplados ao médico. Integrar Psi = redesenhar autor profissional + CRM/UF/RQE + assinatura — maior que um union.

---

## 44. Decisão Anamnese

```text
Anamnese atual deve permanecer read-only? → SIM
Anamnese Psiquiátrica deve ser criada separadamente na ETAPA 7? → SIM
```

---

## 45. Decisão Evolução

```text
C — combinação dos dois
```

- Evoluções clínicas Psi vivem em **Psiquiatria** (ETAPA 7).
- Resumo/evento pode **projetar** para timeline do Prontuário (como nutri/personal), se produto quiser cross-portal.

Pasta “Evolução/Seguimento” atual permanece RO multidisciplinar (**N** como home da Evolução Psi).

---

## 46. Sequência recomendada (não executar)

```text
6.4.1 → Integrar Psi ao Prontuário transversal (origem + form + gate + labels + cross-read)
6.4.2 → Hardening write (API/rules) se P0 de segurança for requisito
6.4.3 → (opcional) Exames solicitar — só após decisão clínica
6.4.4 → Fechamento desktop/mobile das ações write
7.1   → Arquitetura clínica Psi (anamnese, evoluções, escalas) usando Prontuário já integrado
```

Prescrições Psi: **após** 7.x ou trilha paralela de alta complexidade — não bloqueia 6.4.1.

---

## 47–49. Artefatos desta etapa

| | |
|--|--|
| Criados | `docs/metapsi/METAPSI_PATIENT_WORKSPACE_FUNCTIONAL_AUDIT.md` |
| Modificados | Nenhum código de produção |
| Implementação funcional | **Nenhuma** |
| Doc visual 6.3 | **Não alterado** |

---

## 50. Status

**ETAPA 6.4 CONCLUÍDA — workspace do paciente auditado funcionalmente em desktop e mobile; nenhuma implementação realizada**
