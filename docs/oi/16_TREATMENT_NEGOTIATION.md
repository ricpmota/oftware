# Mesa de Negociação Terapêutica — TreatmentNegotiation

Documento técnico — primeira versão arquitetural  
Versão: 1.0  
Status: arquitetura preparada; persistência e contraproposta em etapas futuras

**Relacionado:** [08_PLANO_TERAPEUTICO_INTERATIVO.md](./08_PLANO_TERAPEUTICO_INTERATIVO.md) · [11_PLANO_TERAPEUTICO_V2_UI.md](./11_PLANO_TERAPEUTICO_V2_UI.md) · [13_TREATMENT_ENGINE_PREPARATION.md](./13_TREATMENT_ENGINE_PREPARATION.md)

---

## Conceito

A **Mesa de Negociação Terapêutica** é o espaço em que médico e paciente convergem sobre um **Plano Personalizado**.

Os planos **Mensal**, **Trimestral** e **Semestral** continuam sendo:

- Calculados automaticamente pela OI / motor de pacotes existente
- **Somente leitura** — nunca editáveis manualmente
- Referência para criação do plano personalizado

O **Plano Personalizado**:

- Nasce como **cópia completa** de um dos três planos automáticos
- Passa a depender **apenas** das alterações do médico (não da OI)
- Pode ser ajustado em **todos** os parâmetros (prazo, meta, doses, recursos, investimento, etc.)
- Será negociado com o paciente (aceite ou contraproposta — etapa futura)

---

## Fluxo

```
OI / motor automático
        ↓
  Mensal | Trimestral | Semestral  (referência, somente leitura)
        ↓
  [Criar Plano Personalizado]  →  escolher base (Mensal / Trimestral / Semestral)
        ↓
  Duplicação completa dos dados
        ↓
  Médico edita livremente na Mesa (metaadmin)
        ↓
  Recálculo automático: gráfico, cronograma, investimento, resumo, marcos
        ↓
  [Enviar proposta ao paciente]  →  status PROPOSTA_MEDICO
        ↓
  Paciente visualiza (etapa atual: somente leitura)
        ↓
  (Futuro) Aceitar proposta  |  Solicitar alterações
        ↓
  (Futuro) PLANO_FECHADO → CONTRATO_GERADO
```

---

## O que NÃO foi alterado nesta etapa

| Área | Decisão |
|------|---------|
| `TreatmentPlanningEngine` | Intocado |
| OI (`OIService`, `analisar-paciente`) | Intocado |
| Motor dos planos automáticos (`modalidadesPlano` pacotes) | Intocado |
| Firestore / coleções existentes | Sem novos campos |
| APIs existentes (`/api/metaadmin/plano-terapeutico`, `/api/plano-terapeutico/...`) | Intocadas |
| Planos Mensal, Trimestral, Semestral (comportamento) | Idêntico ao anterior |

---

## Módulo `lib/treatment-negotiation/`

| Arquivo | Responsabilidade |
|---------|------------------|
| `types.ts` | Status, parâmetros editáveis, versões, propostas futuras |
| `constants.ts` | Textos do card Plano Personalizado |
| `duplicatePlanoBase.ts` | Duplica plano automático → `ParametrosPlanoPersonalizadoEditavel` |
| `recalcularPlanoNegociado.ts` | Recalcula `PlanoTratamentoUnificado` sem OI |
| `negociacaoState.ts` | Estado em memória, versionamento local |
| `TreatmentNegotiationService.ts` | Stub para persistência, aceite e contraproposta |
| `index.ts` | Exports públicos |

### Diferença OI vs. negociação

| Etapa | Fonte do plano |
|-------|----------------|
| Planos automáticos | OI / benchmarks / `resolvePlanoPorModalidade` (pacote) |
| Criação do personalizado | **Cópia** de um automático via `duplicarPlanoBaseParaPersonalizado` |
| Edição na Mesa | **Somente** `recalcularPlanoNegociado` (parâmetros do médico) |

---

## Status da negociação

```typescript
type StatusNegociacaoTerapeutica =
  | 'RASCUNHO'
  | 'PROPOSTA_MEDICO'
  | 'EM_NEGOCIACAO'
  | 'ACEITA_PACIENTE'
  | 'ACEITA_MEDICO'
  | 'PLANO_FECHADO'
  | 'CONTRATO_GERADO';
```

| Status | Significado |
|--------|-------------|
| `RASCUNHO` | Médico criou/editou; ainda não enviou |
| `PROPOSTA_MEDICO` | Proposta enviada ao paciente |
| `EM_NEGOCIACAO` | Paciente solicitou alterações (futuro) |
| `ACEITA_PACIENTE` | Paciente aceitou (futuro) |
| `ACEITA_MEDICO` | Médico confirmou aceite (futuro) |
| `PLANO_FECHADO` | Valores e condições fechados |
| `CONTRATO_GERADO` | Integração com contrato de tratamento |

---

## Versionamento

Cada alteração relevante do médico gera uma nova versão:

```typescript
type VersaoPlanoPersonalizado = {
  versao: number;           // 1, 2, 3, ...
  criadaEm: string;
  autor: 'medico' | 'paciente';
  parametros: ParametrosPlanoPersonalizadoEditavel;
  planoCalculado: PlanoTratamentoUnificado;
};
```

**Nesta etapa:** versões são mantidas **em memória** no cliente (`negociacaoState.ts`).  
**Futuro:** persistir subcoleção ou documento dedicado sem alterar schema atual de `orcamentosTerapeuticos`.

---

## UI

### Metaadmin

| Componente | Caminho |
|------------|---------|
| Mesa (painel principal) | `components/metaadmin/mesaNegociacao/MesaNegociacaoTerapeuticaPanel.tsx` |
| Planos automáticos (referência) | `PlanosAutomaticosReferencia.tsx` |
| Diálogo “Criar Plano Personalizado” | `CriarPlanoPersonalizadoDialog.tsx` |
| Editor do médico | `PlanoPersonalizadoEditor.tsx` |
| Card do plano personalizado | `PlanoPersonalizadoCard.tsx` |

Entrada: **Orçamento Terapêutico** → botão **Abrir Mesa de Negociação** (após plano gerado).

### Paciente (`/plano/[orcamentoId]`)

| Alteração | Descrição |
|-----------|-----------|
| Card **Plano Personalizado** | Novo subtítulo, badge e descrição |
| `PacienteNegociacaoAcoes` | Botões “Aceitar” / “Solicitar alterações” desabilitados (preparados) |

---

## Recálculo automático

Toda edição na Mesa dispara `recalcularPlanoNegociado`, que reutiliza:

- `calcularComposicaoPlanoInterativo` / `calcularValorTotalPlanoInterativo` — investimento
- `gerarCurvaPesoComManutencao` — curva de peso
- `calcularMarcosClinicosPorRitmo` — marcos
- `montarFasesVisuaisPlano` — fases e consolidação
- `gerarMarcadoresTimeline` — consultas, bio, exames
- `montarDadosGraficoTratamento` — gráfico na UI

Nenhuma função da OI é chamada após a duplicação inicial.

---

## Integração futura com contrato

1. Status `PLANO_FECHADO` dispara geração de snapshot imutável do `PlanoTratamentoUnificado`
2. `CONTRATO_GERADO` vincula ao fluxo existente de contrato de tratamento / Bry EasySign
3. `TreatmentNegotiationService.salvar` persistirá estado sem quebrar documentos atuais em `orcamentosTerapeuticos`

---

## Critérios de aceite (v1)

- [x] Mensal, Trimestral e Semestral intactos
- [x] Plano Personalizado nasce copiando um automático
- [x] Médico pode alterar parâmetros na Mesa (prazo, meta, doses, recursos, desconto, etc.)
- [x] Gráfico e investimento recalculam automaticamente
- [x] Arquitetura preparada para negociação médico ↔ paciente
- [x] Nenhuma API existente alterada
- [x] Nenhum cálculo da OI alterado
- [x] Documentação neste arquivo

---

## Próximos passos sugeridos

1. Persistência Firestore (`negociacaoTerapeutica` ou subcoleção)
2. Sincronizar status com página pública do paciente
3. Habilitar contraproposta e aceite
4. Histórico de versões na UI
5. Vincular `CONTRATO_GERADO` ao módulo de contratos existente
