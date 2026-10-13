# Etapa 1 — Aba Personal no Editar Paciente desktop (`/metaadmin`)

**Data:** 2026-07-26  
**Base:** `docs/metapersonal/AUDITORIA_PERSONAL_METAADMIN_MOBILE_DESKTOP.md`

---

## Objetivo

Disponibilizar no modal **Editar Paciente (desktop)** a mesma gestão de compartilhamento com Personal Trainer que já existia no modal aberto pelo botão Dumbbell dos cards mobile — sem edição de treino, sem `PersonalPageContent`, sem mudança de collections/regras.

---

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `components/metaadmin/paciente-modal/PersonalPacienteSharePanel.tsx` | **Novo** — painel compartilhado |
| `app/metaadmin/page.tsx` | Aba Personal (`id: 11`); modal mobile passa a usar o painel; remoção do JSX/estados/loaders duplicados do share |
| `docs/metapersonal/ETAPA_01_ABA_PERSONAL_DESKTOP_METAADMIN.md` | Este documento |

---

## Componente extraído

### `PersonalPacienteSharePanel`

**Props:**

```ts
type PersonalPacienteSharePanelProps = {
  paciente: PacienteCompleto;
  medicoId: string;
  medicoNome?: string;
  showCalendar?: boolean;
  compact?: boolean;      // estilo denso do modal mobile
  onFeedback?: (message: string) => void;
};
```

**Responsabilidades internas (não dependem de `pacientePersonalSelecionado`):**

- carregar personals elegíveis (`isVerificado` + `ativo` + `medicoVinculadoIds`)
- carregar vínculos ativos (`paciente_personal_trainer` status `ativo`, filtrado por `medicoId`)
- carregar solicitações (`listRequestsByPaciente`)
- modal de busca/seleção (`z-[10000]`)
- criar / cancelar solicitação / encerrar vínculo
- loading, mensagens locais + `onFeedback`
- calendário read-only via `CalendarioTreinosPersonal`

**Serviços reutilizados (sem alteração de regras de negócio):**

- `PersonalTrainerService.getAllPersonalTrainers`
- `SolicitacaoPersonalTrainerService.createPacienteShareRequest`
- `SolicitacaoPersonalTrainerService.cancelShareRequest`
- `SolicitacaoPersonalTrainerService.endCompartilhamento`
- `SolicitacaoPersonalTrainerService.listRequestsByPaciente`
- query Firestore em `paciente_personal_trainer` (mesmo padrão do loader antigo do `page.tsx`)

---

## Como o mobile passou a reutilizá-lo

O modal `showModalPersonal` **continua existindo** (mesmo título, z-index, tamanho, fechamento).

Conteúdo interno substituído por:

```tsx
<PersonalPacienteSharePanel
  key={`personal-modal-${pacientePersonalSelecionado.id}`}
  paciente={pacientePersonalSelecionado}
  medicoId={medicoPerfil.id}
  medicoNome={medicoPerfil.nome}
  showCalendar
  compact
  onFeedback={setMessage}
/>
```

O botão Dumbbell do card apenas define `pacientePersonalSelecionado` e abre o modal; o painel carrega os dados sozinho.

---

## Como a aba desktop foi adicionada

### ID escolhido

`{ id: 11, nome: 'Personal' }`

IDs existentes preservados (`1, 2, 10, 3, 4…9`). O `11` não conflita.

### Ordem das abas

```txt
Identificação (1)
Anamnese (2)
Prontuário (10)
Nutrologia (3)
Personal (11)   ← nova
Exames (4)
Plano Terapêutico (5)
Evolução/Seguimento (6)
Bio Impedância (7)
Comunicação (8)
Prescrições (9)
```

### Render

```tsx
{pastaAtiva === 11 && pacienteEditando && medicoPerfil?.id && (
  <div className="space-y-6">
    <PersonalPacienteSharePanel
      key={`personal-tab-${pacienteEditando.id}`}
      paciente={pacienteEditando}
      medicoId={medicoPerfil.id}
      medicoNome={medicoPerfil.nome}
      showCalendar
      onFeedback={setMessage}
    />
  </div>
)}
```

---

## Cuidados com stale state

- `key` inclui `paciente.id` → remount ao trocar paciente.
- `useEffect` no painel limpa vínculos/solicitações/mensagens e recarrega quando `pacienteId` ou `medicoId` mudam.
- Flag `cancelled` evita setState após unmount / troca rápida.
- Fechar o Editar Paciente não limpa o modal Personal mobile (estados separados: `pacienteEditando` vs `pacientePersonalSelecionado`).
- Modal de busca vive **dentro** do painel; fechar a busca não fecha o Editar Paciente (`stopPropagation` + z-index `10000`).

---

## Removido do `page.tsx` (agora no painel)

- Estados: elegíveis, vínculos, solicitações, loaders, `showModalBuscarPersonalTrainer`, filtros de localização não usados na UI final
- Funções: `loadPersonalTrainersElegiveis`, `buscarPersonalTrainersPorLocalizacao`, `loadStatusCompartilhamentoPersonal`
- JSX inline do share + modal de busca

**Mantido no `page.tsx`:** `showModalPersonal`, `pacientePersonalSelecionado`, `pacientesComTreinos` (indicador rosa do Dumbbell), serviços usados em outros fluxos (vínculos médico↔personal, exclusão de paciente).

---

## Limitações desta etapa

- Médico **não** cria/edita/exclui sessões de treino
- Sem `PersonalPageContent`
- Sem anamnese / IA / novas collections / rules
- Modal Dumbbell mobile preservado (não removido)
- Calendário permanece somente leitura

---

## Testes realizados

Validação estática / linter nos arquivos alterados (sem erros reportados).

Checklist manual recomendado:

### Desktop

1. Aba Personal após Nutrologia  
2. Paciente sem vínculo → busca  
3. Só elegíveis  
4. Criar solicitação → pendente  
5. Cancelar  
6. Vínculo ativo + Encerrar  
7. Calendário do paciente correto  
8. Trocar paciente → sem dados do anterior  
9. Fechar/reabrir modal  

### Mobile

1. Dumbbell abre modal  
2. Share / busca / pendente / encerrar / calendário  
3. Sem regressão visual relevante  

---

## Próximos passos (fora desta etapa)

- Opcional: botão Dumbbell também na tabela desktop (atalho)
- Etapas futuras: edição de treino pelo médico (se produto decidir), ACL Firestore, IA de sugestão no `/metapersonal`
