# Prontuário × Nutrição — Plano por etapas

## Etapa 01 — Médico vê uso do Nutri pelo paciente (metaadmin)

**Objetivo:** No modal do paciente → aba Prontuário → filtro **Nutrição**, o médico enxerga o que o paciente fez em `/meta` (aba Nutri).

**Fontes Firestore (já usadas pelo `NutriContent`):**

| Recurso | Caminho |
|--------|---------|
| Plano / anamnese | `pacientes_completos/{id}/nutricao/plano` |
| Check-ins | `pacientes_completos/{id}/nutricao/dados/checkins/{YYYY-MM-DD}` |
| ChatNutri (dias) | `pacientes_completos/{id}/chatNutri/{dateKey}` |

**Eventos na timeline (tipo `nutricao`, origem `paciente`):**

1. Anamnese concluída — plano criado (estilo, metas de proteína/água, hipótese comportamental resumida)
2. Cardápio configurado — quando há personalização (`opcoesSelecionadas`, itens/opções customizadas)
3. Check-in diário — um card por dia (score, aderência, resumo alimentação/sintomas)
4. Uso do ChatNutri — um card por dia com atividade no chat

**Entrega:** `nutricaoProntuarioService.ts` + integração em `ProntuarioTab.tsx`.

---

## Etapa 02b — Filtros completos + lembretes no calendário (metanutri) ✅

**Objetivo:** Prontuário nutri com os mesmos filtros do metaadmin (sem consultas médicas/IA) e lembretes nutri-paciente no calendário.

**Filtros:** Todos, Aplicações, Exames, Prescrições, Pagamentos (Nutri×Paciente), Bioimpedância, Observações, Nutrição, Atividade física, Alertas, Aniversário, Lembretes.

**Entrega:** `prontuarioNutriEventosLoader.ts`, `FILTROS_TIMELINE_NUTRI`, `LembreteService.getLembretesPorNutricionista`, calendário metanutri com `ModalNovoLembrete`.

---

## Etapa 02 — Nutricionista escreve no prontuário (metanutri) ✅

**Objetivo:** Em `/metanutri`, no modal do paciente (desktop), nova aba **Prontuário** para o nutricionista registrar consulta/nota.

**Entrega:** `ProntuarioNutriTab`, `ProntuarioNutriForm`, aba 11 no modal metanutri (desktop), persistência em `timeline` com `origem: 'nutri'`.

**Regras de sigilo:**

- Nutricionista **não** vê eventos com origem `medico` nem conteúdo clínico sigiloso do médico.
- Médico **vê** registros do nutricionista (origem `nutri`) no filtro Nutrição ou Consultas, conforme UX definida.
- Paciente pode ter visibilidade limitada (definir na etapa 02).

**Implementação prevista:**

1. Formulário no metanutri (similar ao `ProntuarioForm`, campos nutri)
2. Persistência: subcoleção `timeline` com `origem: 'nutri'` **ou** coleção dedicada `nutricao/consultas` espelhada na timeline
3. Modal paciente metanutri (desktop): aba Prontuário só com eventos `nutri` + formulário
4. Regras Firestore: leitura/escrita por papel (`medico` vs `nutricionista`)
5. Listagem no metaadmin: incluir eventos `origem: 'nutri'` na timeline do médico

---

## Etapa 03 (opcional) — Sincronização automática

- Ao salvar check-in / plano / mensagem ChatNutri, opcionalmente chamar `registrarEventoAutomaticoProntuario` para cópia na `timeline` (auditoria e busca unificada).
- Hoje a Etapa 01 lê direto das coleções Nutri (sem duplicar dados).

---

## Etapa 04 (opcional) — Indicadores resumidos

- Card no topo do filtro Nutrição: “Último check-in”, “Dias com check-in (30d)”, “Dias com ChatNutri (30d)”, “Plano ativo desde…”.
