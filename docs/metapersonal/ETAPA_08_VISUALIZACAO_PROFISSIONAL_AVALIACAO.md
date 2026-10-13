# Etapa 08 — Visualização profissional da avaliação de atividade física

**Data:** 2026-07-26  
**Base:** Etapas 03–07

---

## Objetivo

Permitir que médico e personal trainer **visualizem** (somente leitura) a Avaliação Inicial concluída pelo paciente.

```text
A Etapa 08 é somente leitura profissional.
Ela não permite editar a avaliação, liberar clinicamente o paciente, alterar status ou gerar treino.
```

---

## Arquivos criados

| Arquivo | Papel |
| --- | --- |
| `components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaSummarySections.tsx` | Seções compartilhadas (paciente + profissional) |
| `components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaStatusBadge.tsx` | Badge de status |
| `components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaProfessionalView.tsx` | Visualização profissional + lazy load |
| `docs/metapersonal/ETAPA_08_VISUALIZACAO_PROFISSIONAL_AVALIACAO.md` | Este doc |

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `AvaliacaoAtividadeFisicaReview.tsx` | Usa `SummarySections` (sem mudar fluxo do paciente) |
| `PersonalPacienteSharePanel.tsx` | Card entre vínculo e calendário (`viewerRole: doctor`) |
| `app/meta/personal/page.tsx` | Card no embed/modo personal (`viewerRole: personal_trainer`) |

**Não alterados:** Firestore Rules, feature flag, service (só reuso de `getByPatientId`), IA, treinos, calendário, compartilhamento, whitelabel, status.

---

## Componente compartilhado

`AvaliacaoAtividadeFisicaProfessionalView`:

- lazy `getByPatientId(patientId)` quando `patientId` é passado;
- estados: loading / erro / inexistente / draft / needs_review / completed;
- completed: summary + fallback em memória se `summary` ausente;
- atenção profissional neutra via `SAFETY_REASON_LABELS`;
- intro levemente diferente para médico vs personal.

`SummarySections` com `mode: 'patient_review' | 'professional_readonly'`.

---

## Fonte de dados

Preferência: `assessment.summary`.  
Fallback: `buildPhysicalActivityAssessmentSummary(answers, safety)` **somente em memória** (não grava no Firestore).

Consulta: documento `avaliacaoAtividadeFisica/{patientId}` — **sem full scan**.

---

## Autorização

- **Médico:** painel Personal só abre para paciente já selecionado no `/metaadmin`.
- **Personal:** embed/lista só com compartilhamento existente; gate do paciente é pulado.
- Não amplia ACL; `patientId` isolado não concede acesso novo.

---

## Integrações

### `/metaadmin`
`PersonalPacienteSharePanel` (aba Personal desktop + modal mobile Dumbbell).

### `/metapersonal` + embed
`PersonalPageContent` quando `isPersonalTrainerMode || fromMetapersonal`, acima das abas de treino.

---

## Estados

| Status | UI |
| --- | --- |
| sem doc | Ainda não iniciada |
| draft | Em preenchimento (+ % / etapa / updatedAt); **sem** respostas parciais |
| needs_review | Sinalização; sem ações |
| completed | Resumo completo + quick indicators |

---

## Segurança / privacidade

Sem logs de conteúdo clínico. Erro de load: mensagem genérica.

---

## Limitações / próximos passos

- Sem PDF/export/impressão.
- Sem edição/aprovação/comentários/histórico.
- Chip de status na lista expandida do metapersonal (opcional futuro).
- Fluxo completo `needs_review`.

## Fora de escopo (confirmado)

IA · geração de treino · edição · alteração de status · rules · calendário · sessões.
