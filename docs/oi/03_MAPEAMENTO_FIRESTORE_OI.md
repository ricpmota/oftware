# Etapa 1 OI — Mapeamento Firestore e Fontes de Dados

**Objetivo:** mapear onde estão, no código atual, os dados necessários para a **primeira base estatística da OI** (Oftware Intelligence), **sem alterar** o funcionamento do sistema.

> **Escopo:** apenas investigação e documentação. Nenhum script, rota, coleção nova ou alteração de código funcional nesta etapa.

**Documentos relacionados:**

- [00_VISAO_GERAL_OFTWARE_INTELLIGENCE.md](./00_VISAO_GERAL_OFTWARE_INTELLIGENCE.md)
- [base_dados_perda_peso.md](../precificacao/base_dados_perda_peso.md) — campos desejados na exportação anonimizada

---

## 1. Visão geral da arquitetura de dados

### Coleção principal (paciente clínico)

| Coleção | ID do documento | Modelo |
|---------|-----------------|--------|
| `pacientes_completos` | `{pacienteId}` | **Documento único** com arrays/objetos aninhados (`PacienteCompleto`) |

A maior parte dos dados da OI vive em **um documento por paciente**. Não há subcoleção dedicada para `evolucaoSeguimento`, exames laboratoriais ou plano terapêutico — são **campos do documento raiz**.

### Coleções complementares

| Coleção | ID | Uso para OI |
|---------|-----|-------------|
| `pacientes_abandono` | `{pacienteId}` | Cópia/espelho quando paciente abandona; incluir na exportação para desfechos de abandono |
| `pagamentos_pacientes` | `{pacienteId}` | Financeiro separado; útil para margem/precificação, **não** para estatística clínica principal |
| `medicos/{medicoId}/configuracoes/orcamentoTerapeutico` | fixo | Config comercial do médico; **fora** do escopo da base clínica OI |

### Subcoleções em `pacientes_completos/{id}` (fora do núcleo OI v1)

| Subcoleção / doc | Uso | Relevância OI |
|------------------|-----|---------------|
| `progressPhotos/*` | Fotos de progresso | Baixa — desfecho visual, não peso estruturado |
| `nutricao/plano`, `nutricao/dados` | Plano nutricional | Fase futura (metanutri); não no escopo emagrecimento v1 |

O núcleo estatístico de perda de peso permanece no **documento raiz** (`evolucaoSeguimento`, `planoTerapeutico`, etc.).

### Serviço central de montagem do paciente

| Arquivo | Papel |
|---------|--------|
| `services/pacienteService.ts` | Leitura/escrita de `pacientes_completos`; normalização Firestore → `PacienteCompleto` |
| `types/obesidade.ts` | Tipo `PacienteCompleto` e sub-tipos |
| `services/bioImpedanciaService.ts` | Campo `bioimpedanciaRegistros` no mesmo documento |
| `services/pagamentoService.ts` | Coleção `pagamentos_pacientes` |

**Funções que montam `PacienteCompleto`:**

- `PacienteService.getPacienteById`
- `PacienteService.getPacienteByUserId`
- `PacienteService.getPacienteByEmail`
- `PacienteService.getPacientesByMedico` (lista + merge com abandonos)
- `normalizePacienteFirestoreData()` — corrige legado (`medidasiniciais`, raiz vs `dadosClinicos`)
- Rotas server (`app/api/*`) leem documento bruto e fazem cast parcial

### Risco estrutural global

- Documentos **grandes** (array `evolucaoSeguimento` cresce por semana) → exportação deve ser **por lote**, não full-scan repetido em produção.
- Campos **legados** na raiz do documento (`medidasIniciais`, `dados_clinicos`) → exportador deve reutilizar `normalizePacienteFirestoreData`.
- `bioimpedanciaRegistros` **não está** no type `PacienteCompleto` — existe no Firestore e é acessado via cast `(paciente as any).bioimpedanciaRegistros`.

---

## 2. Tabela de mapeamento — campos OI

| Campo OI | Campo no código | Origem provável | Tipo | Qualidade esperada | Uso na estatística | Observações |
|----------|-----------------|-----------------|------|-------------------|-------------------|-------------|
| **Documento raiz / tipo** | `PacienteCompleto` | `pacientes_completos/{id}` | object | Alta | Chave de join interna; anonimizar na exportação | Tipo em `types/obesidade.ts`; ver `PacienteService` |
| **ID interno (não exportar)** | `id` | doc id | string | Obrigatório | Gerar `pacienteAnonId` na exportação | Nunca exportar UID/ doc id real |
| **Médico responsável** | `medicoResponsavelId` | campo raiz | string \| null | Alta em ativos | Segmentação por rede/médico (agregado) | Legado: `medicoResponsavelID`; null em abandono |
| **Cadastro — identificação** | `dadosIdentificacao.*` | `pacientes_completos` | object | Média–alta | Sexo, idade (derivada), **não** exportar PII | `nomeCompleto`, `cpf`, `email`, `telefone` → **excluir** |
| **Sexo** | `dadosIdentificacao.sexoBiologico` | nested | `'M'\|'F'\|'Outro'` | Opcional | Segmentação OI | Ausente em cadastros incompletos |
| **Idade** | derivada de `dadosIdentificacao.dataNascimento` | nested | Date → number | Opcional | Segmentação | Preferir idade, não data exata na exportação |
| **Data cadastro** | `dataCadastro`, `dadosIdentificacao.dataCadastro` | raiz / nested | Date | Alta | Tempo na plataforma, cohort | Duplicidade de campos |
| **Dados clínicos (anamnese)** | `dadosClinicos` | nested | `DadosClinicos` | Média | Comorbidades, diagnóstico, perfil metabólico | `normalizePacienteFirestoreData` unifica legado |
| **Peso inicial** | `dadosClinicos.medidasIniciais.peso` | nested | number (kg) | Média–alta | Baseline, IMC, % perda | Legado na raiz `medidasIniciais` |
| **Peso inicial (marco zero)** | `marcoZero.pesoInicial` | raiz opcional | number | Média | Baseline alternativo | Também em `evolucaoSeguimento[].marcoZero` |
| **Peso inicial (semana 1)** | `evolucaoSeguimento[weekIndex=1].peso` | array | number | Média | Baseline usado em listas metaadmin | `computeMetricasOrdenacaoListaPacientes`, `orcamentoTerapeuticoUtils` |
| **Peso atual** | último `evolucaoSeguimento[].peso` por `dataRegistro` | array | number | Média–alta | Desfecho, delta kg | Fallback: `medidasIniciais.peso`; ver `indicadores.evolucaoPonderal.pesoAtual` |
| **Altura** | `dadosClinicos.medidasIniciais.altura` | nested | number (cm) | Média | IMC | |
| **IMC inicial** | `dadosClinicos.medidasIniciais.imc` | nested | number | Média–alta | Segmentação | Calculado por `ensureImcOnMedidasIniciais` se ausente |
| **Cintura inicial** | `dadosClinicos.medidasIniciais.circunferenciaAbdominal` | nested | number (cm) | Opcional | Meta cintura, evolução | `circunferenciaNaoInformada` |
| **Cintura atual** | último `evolucaoSeguimento[].circunferenciaAbdominal` | array | number | Opcional | Série temporal | |
| **Meta de perda — tipo** | `planoTerapeutico.metas.weightLossTargetType` | nested | `'PERCENTUAL'\|'PESO_ABSOLUTO'` | Opcional | Meta cadastrada | |
| **Meta de perda — valor** | `planoTerapeutico.metas.weightLossTargetValue` | nested | number | Opcional | kg ou % meta | |
| **Meta peso alvo** | `planoTerapeutico.metas.targetWeightKg` | nested | number | Opcional | Desfecho vs meta | |
| **Meta ativa (switch)** | `planoTerapeutico.metas.metaPerdaPesoAtiva` | nested | boolean | Opcional | Filtrar pacientes com meta válida | Ver `utils/metasTratamentoSwitches.ts` |
| **Kg / % desejados** | derivado (meta + peso inicial) | calculado | number | Média | Benchmarks, orçamento | `lib/metaadmin/orcamentoTerapeuticoUtils.ts`, `MetaadminMetasTratamentoBlock` |
| **Plano terapêutico — início** | `planoTerapeutico.startDate`, `dataInicioTratamento` | nested | Date | Opcional | Duração tratamento | Campo deprecated `dataInicioTratamento` |
| **Semanas plano** | `planoTerapeutico.numeroSemanasTratamento` | nested | number | Opcional | Contexto protocolo | Default UI ~18 |
| **Medicamento (explícito)** | *não há campo dedicado* | — | — | **Baixa / ausente** | Segmentação por fármaco | Plataforma centrada em **tirzepatida**; UI tabs retatrutida/injetáveis sem persistência clara de nome |
| **Medicamento (inferido)** | `resolverMedicamento()` em `orcamentoTerapeuticoUtils.ts` | nested + array | string fixa “Tirzepatida” | Média | Proxy por dose mg | Hardcoded como tirzepatida se `currentDoseMg` ou `doseAplicada` > 0 |
| **Medicações prévias** | `dadosClinicos.perfilMetabolicoV3.medicamentosPrevios` ou anamnese | nested | flags boolean | Opcional | Perfil histórico | Não é medicação atual do plano |
| **Dose atual** | `planoTerapeutico.currentDoseMg` | nested | 1.25–15 mg | Média | Eficiência mg, escalonamento | Enum tirzepatida |
| **Esquema dose/semana** | `planoTerapeutico.esquemaDosesCustomizado` | nested | `{ [semana]: mg }` | Opcional | mg total real vs automático | Sobrescreve titulação |
| **Histórico doses plano** | `planoTerapeutico.historicoDoses[]` | nested array | `HistoricoDose` | Opcional | Auditoria titulação | |
| **Semanas canceladas** | `planoTerapeutico.semanasCanceladas` | nested | number[] | Opcional | Ajustar contagem aplicações | |
| **Status titulação** | `planoTerapeutico.titrationStatus` | nested | enum | Opcional | Fase tratamento | |
| **Histórico aplicações** | `evolucaoSeguimento[]` | array no doc | `SeguimentoSemanal[]` | Média–alta | Série semanal, mg, adesão | **Núcleo da OI** |
| **Dose por aplicação** | `evolucaoSeguimento[].doseAplicada.quantidade` | array item | number (mg) | Média | Soma mg, curva dose-resposta | `doseAplicada.data`, `horario` |
| **Semana índice** | `evolucaoSeguimento[].weekIndex` | array item | number | Média–alta | Timeline, metas temporais | |
| **Data registro semana** | `evolucaoSeguimento[].dataRegistro` | array item | Date | Média–alta | Tempo até meta | Normalizado em `mapEvolucaoSeguimentoSeg` |
| **Adesão aplicação** | `evolucaoSeguimento[].adherence`, `.adesao` | array item | enum | Opcional | Taxa abandono, viés | Dois campos paralelos (legado + novo) |
| **Efeitos adversos** | `evolucaoSeguimento[].efeitosColaterais`, `.giSeverity` | array item | array / enum | Opcional | Segurança agregada | |
| **Check-in semanal** | `evolucaoSeguimento[].checkInSemanal`, `.checkInSemanalScore` | array item | object | Opcional | Proxy adesão comportamental | |
| **HbA1c na evolução** | `evolucaoSeguimento[].hba1c` | array item | number | Opcional | Desfecho metabólico | |
| **Bioimpedância** | `bioimpedanciaRegistros[]` | **campo raiz** (não no type) | `BioImpedanciaRegistro[]` | **Baixa–média** | Composição corporal, % gordura | `services/bioImpedanciaService.ts`; type em `types/bioImpedancia.ts`; lazy load no prontuário |
| **Exames laboratoriais** | `examesLaboratoriais[]` | array no doc | `ExamesLaboratoriais[]` | Média | Diabetes, lipídios, função hepática | `types/obesidade.ts` Pasta 4 |
| **Exames de imagem** | `examesDeImagem[]` | array opcional | metadados PDF | Baixa para OI peso | Fora do escopo inicial OI emagrecimento | |
| **Status tratamento** | `statusTratamento` | raiz | `'pendente'\|'em_tratamento'\|'concluido'\|'abandono'` | Alta | Taxa conclusão/abandono | |
| **Motivo abandono** | `motivoAbandono` | raiz | string | Opcional | Desfecho | Preenchido se `statusTratamento === 'abandono'` |
| **Data abandono** | `dataAbandono` | raiz | Date | Opcional | Tempo até abandono | |
| **Médico anterior (abandono)** | `medicoResponsavelAnteriorId` | raiz | string | Opcional | Atribuição estatística | |
| **Conclusão tratamento** | `planoTerapeutico.conclusaoTratamento` | nested | `Record<string, unknown>` | Opcional | Peso final, depoimento | Usado em `app/api/depoimentos-medico/route.ts` |
| **Histórico conclusões** | `planoTerapeutico.historicoConclusoesTratamento` | nested array | Record[] | Opcional | Re-tratamentos | |
| **Indicadores derivados** | `indicadores.*` | nested | `Indicadores` | **Incerta** | Atalho se atualizado | `adesaoMedia`, `evolucaoPonderal`; pode estar desatualizado vs recalcular |
| **Tempo em tratamento** | `indicadores.tempoEmTratamento` | nested | `{ dias, semanas }` | Incerta | Duração | Validar vs datas reais |
| **Comorbidades / diagnóstico** | `dadosClinicos.comorbidades`, `.diagnosticoPrincipal` | nested | object | Opcional | Segmentação clínica | |
| **Estilo de vida** | `estiloVida` | nested | object | Baixa | Contexto secundário | |
| **Controle financeiro** | `PagamentoPaciente` | `pagamentos_pacientes/{pacienteId}` | object | Média (se preenchido) | Margem, ticket médio OI comercial | **Coleção separada**; `PagamentoService` |
| **Parcelas / valor pago** | `parcelas[]`, `valorTotal`, `valorPago` | pagamentos | arrays/numbers | Opcional | Precificação real vs estimada | Muitos pacientes sem parcelas |
| **Organization shadow** | `organizationId` | raiz (creates novos) | string | Parcial | Multi-tenant futuro | `lib/organization/shadowOrganizationId.ts`; leituras ainda não filtram |

---

## 3. Detalhamento por domínio

### 3.1 `PacienteCompleto` e cadastro

**Type:** `types/obesidade.ts` → `PacienteCompleto`, `DadosIdentificacao`, `DadosClinicos`

**Firestore:** `pacientes_completos/{pacienteId}` — documento monolítico.

**Uso OI:** demografia anonimizada (sexo, idade, IMC inicial), **excluir** PII (`nomeCompleto`, `cpf`, `email`, `telefone`, `endereco`).

**Riscos:**

- Cadastros antigos incompletos (`medidasIniciais` vazio).
- `normalizePacienteFirestoreData` deve ser **obrigatório** no exportador offline.

### 3.2 Peso inicial e peso atual

**Lógica canônica no código (metaadmin / orçamento):**

```text
baselineWeight = evolucaoSeguimento.find(weekIndex === 1)?.peso
              ?? medidasIniciais.peso
              ?? marcoZero.pesoInicial

pesoAtual = último evolucaoSeguimento (por dataRegistro) com peso > 0
         ?? medidasIniciais.peso
```

**Arquivos de referência:**

- `lib/metaadmin/orcamentoTerapeuticoUtils.ts` — `obterPesosPaciente`
- `app/metaadmin/page.tsx` — `computeMetricasOrdenacaoListaPacientes`

**Uso OI:** `pesoInicialKg`, `pesoAtualKg`, `pesoPerdidoKg`, `percentualPesoPerdido`, marcos 5/10/15/20%.

**Riscos:** múltiplos baselines possíveis; exportador deve **documentar regra única** e registrar qual foi usada.

### 3.3 Meta de perda de peso

**Campos:** `planoTerapeutico.metas.*`

**Arquivos:**

- `components/metaadmin/MetaadminMetasTratamentoBlock.tsx`
- `utils/metasTratamentoSwitches.ts`

**Uso OI:** meta cadastrada, probabilidade de atingir meta, segmentação por % desejada.

**Riscos:** meta default 12% quando switches legados; paciente sem `weightLossTargetValue` → excluir ou bucket “sem meta”.

### 3.4 Plano terapêutico, medicamento e dose

**Campos:** `planoTerapeutico` (`types/obesidade.ts` → `PlanoTerapeutico`)

**Medicamento:** não existe string `medicamento` no schema. A plataforma assume **tirzepatida** (`currentDoseMg` com valores 1.25–15; `utils/esquemaDosesSemana.ts`, `lib/tirzepatida/`).

**Uso OI:** mg total, dose máxima, eficiência kg/mg — **desde** `evolucaoSeguimento[].doseAplicada` + `esquemaDosesCustomizado`.

**Riscos:**

- Retatrutida/injetáveis na UI (`app/meta/page.tsx`) **sem** campo persistido claro → estatística por fármaco **não confiável** hoje.
- `doseAtual` deprecated vs `currentDoseMg`.

### 3.5 `evolucaoSeguimento` (aplicações e evolução)

**Type:** `SeguimentoSemanal[]` em `types/obesidade.ts`

**Firestore:** array `evolucaoSeguimento` no documento `pacientes_completos/{id}` — **não** é subcoleção.

**Persistência:** `PacienteService.createOrUpdatePaciente` serializa o array inteiro.

**Uso OI:** histórico semanal (`historico_semanal` em `base_dados_perda_peso.md`), número de aplicações, tempo até metas, adesão.

**Riscos:**

- Documento cresce indefinidamente.
- Registros sem `peso` mas com dose (ou vice-versa).
- `adherence` vs `adesao` — normalizar enum na exportação.

### 3.6 Bioimpedância

**Type:** `types/bioImpedancia.ts` → `BioImpedanciaRegistro`

**Firestore:** campo **`bioimpedanciaRegistros`** em `pacientes_completos/{id}` (array).

**Service:** `services/bioImpedanciaService.ts` — `buscarBioImpedanciaRegistros`, `salvarBioImpedanciaRegistros`

**Uso OI:** % gordura, massa muscular — segmentação avançada; **cobertura esperada baixa** (nem todo paciente tem).

**Riscos:** campo **fora** de `PacienteCompleto`; listagens que não chamam `buscarBioImpedanciaRegistros` podem **omitir** bio na memória (exportador deve ler Firestore direto).

### 3.7 Exames laboratoriais

**Type:** `ExamesLaboratoriais[]` em `pacientes_completos.examesLaboratoriais`

**Uso OI:** flags metabólicas (HbA1c, glicemia, lipídios) para segmentação diabetes/dislipidemia.

**Riscos:** múltiplos exames por paciente — exportador deve usar **mais recente na data de início** ou por data de coleta documentada.

### 3.8 Status, conclusão e abandono

| Desfecho | Campos | Coleção |
|----------|--------|---------|
| Em tratamento | `statusTratamento: 'em_tratamento'` | `pacientes_completos` |
| Concluído | `statusTratamento: 'concluido'`, `conclusaoTratamento` | `pacientes_completos` |
| Abandono | `statusTratamento: 'abandono'`, `motivoAbandono`, `dataAbandono` | `pacientes_completos` e/ou **`pacientes_abandono`** |

**Service:** `PacienteService.getPacientesByMedico` merge abandonos; `moverParaAbandono` (linha ~720+).

**Uso OI:** taxa abandono, taxa conclusão, motivo encerramento agregado.

**Riscos:** duplicidade `pacientes_completos` vs `pacientes_abandono` — deduplicar por `pacienteId` na exportação.

### 3.9 Controle financeiro (relevância OI comercial)

**Type:** `types/pagamento.ts` → `PagamentoPaciente`

**Firestore:** `pagamentos_pacientes/{pacienteId}` (doc id = pacienteId)

**Service:** `services/pagamentoService.ts`

**Uso OI:** validar margem real vs estimada; **opcional** na primeira base clínica; necessário para especialização **Motor Comercial**.

**Riscos:** muitos registros vazios ou só parcelas zeradas; join manual por `pacienteId`.

---

## 4. Serviços, utils e hooks relevantes

| Módulo | Caminho | Relação com OI |
|--------|---------|--------------|
| Paciente CRUD + normalize | `services/pacienteService.ts` | **Fonte primária** leitura paciente |
| Bioimpedância | `services/bioImpedanciaService.ts` | Campo array no doc |
| Pagamentos | `services/pagamentoService.ts` | Join financeiro |
| Types | `types/obesidade.ts`, `types/bioImpedancia.ts`, `types/pagamento.ts` | Contrato exportação |
| Peso/meta orçamento | `lib/metaadmin/orcamentoTerapeuticoUtils.ts` | Regras baseline/meta já codificadas |
| Metas switches | `utils/metasTratamentoSwitches.ts` | Meta ativa/inativa |
| IMC | `lib/meta/medidasIniciaisImc.ts` | `ensureImcOnMedidasIniciais` |
| Esquema doses | `utils/esquemaDosesSemana.ts`, `utils/datasAplicacaoSemanaPlano.ts` | mg por semana |
| Curva esperada | `utils/expectedCurve.ts` | Referência futura validação OI |
| Evolução home | `utils/metaHomeMetricEvolution.ts` | Peso/bio até data |
| Prontuário loader | `app/metaadmin/.../prontuarioEventosLoader.ts` | Agrega eventos incl. bio |
| Estatísticas médico | `app/api/estatisticas-medico/route.ts` | Full-scan parcial — **não** usar como modelo exportação |
| Relatório tirzepatida | `app/api/metaadmingeral/relatorios/tirzepatida/route.ts` | Leitura massiva `pacientes_completos` |

**Hooks dedicados à evolução:** não há hook único; lógica espalhada em pages (`metaadmin`, `meta`) e utils acima.

---

## 5. Alinhamento com `base_dados_perda_peso.md`

| Campo exportação anonimizada | Status no mapeamento |
|------------------------------|----------------------|
| `pacienteAnonId` | Gerar na exportação — não existe hoje |
| sexo, idade, altura, IMC | `dadosIdentificacao`, `medidasIniciais` — OK com normalização |
| peso inicial / atual / meta | OK via regras em §3.2–3.3 |
| evolucaoSeguimento semanal | OK — array principal |
| medicamento / mg | **Inferir** tirzepatida; mg de `doseAplicada` |
| bioimpedância | Campo `bioimpedanciaRegistros` — cobertura parcial |
| exames lab | `examesLaboratoriais[]` — OK |
| status / motivo encerramento | OK + checar `pacientes_abandono` |
| financeiro | Coleção separada — fase 2 comercial |

---

## 6. Conclusão do mapeamento

### Quais dados já temos com boa confiança?

- Estrutura **`PacienteCompleto`** em `pacientes_completos` como fonte única clínica.
- **`evolucaoSeguimento`**: peso, cintura, dose mg, semana, datas, adesão — **núcleo** da base OI.
- **Medidas iniciais** (peso, altura, IMC, cintura) após normalização.
- **Metas** em `planoTerapeutico.metas` (quando preenchidas).
- **`statusTratamento`** e fluxo abandono/conclusão (com ressalva da coleção `pacientes_abandono`).
- **Exames laboratoriais** estruturados em array.
- **Serviço maduro** de leitura: `PacienteService` + `normalizePacienteFirestoreData`.

### Quais dados dependem de padronização?

- **Baseline de peso** — três fontes (marco zero, semana 1, medidas iniciais); fixar uma regra na exportação.
- **Medicamento** — sem campo explícito; padronizar ou inferir “tirzepatida” até haver `medicamentoAtual` no schema.
- **Adesão** — unificar `adherence` vs `adesao`.
- **Peso atual** — preferir recalcular da série, não confiar só em `indicadores.evolucaoPonderal`.
- **Bioimpedância** — incluir no type e garantir leitura no exportador (`bioimpedanciaRegistros`).
- **Motivo encerramento** — `motivoAbandono` texto livre; agregar categorias na exportação.
- **Conclusão** — `conclusaoTratamento` schema solto (`Record`); inspecionar chaves reais em amostra.

### Quais dados talvez não existam ainda?

- Campo **`medicamento`** / protocolo persistido (retatrutida vs tirzepatida).
- **`organizationId`** consistente em todos os documentos (shadow só em creates novos).
- **Indicadores derivados** sempre atualizados (pode exigir recálculo na exportação).
- **Histórico semanal completo** em pacientes antigos ou só com marcos esporádicos.
- **Join financeiro** preenchido para maioria dos pacientes.
- **Campos OI dedicados** (probabilidade, segmento) — serão **gerados**, não lidos.

### O que precisa ser validado antes da exportação?

1. **Amostra real** de N documentos `pacientes_completos` — tamanho médio, % campos preenchidos.
2. **Regra única** peso inicial / peso atual documentada e testada em amostra.
3. **Deduplicação** pacientes ativos vs `pacientes_abandono`.
4. **Cobertura** `bioimpedanciaRegistros`, `examesLaboratoriais`, metas.
5. **Distribuição** `evolucaoSeguimento.length` (mínimo de semanas para incluir paciente na estatística).
6. **LGPD** — lista de exclusão PII alinhada a `base_dados_perda_peso.md`.
7. **Volume/custo** — exportação offline admin, não rotas que fazem full-scan (`indicadores-plataforma`, crons).
8. **Medicamento** — decisão produto: tratar todos como tirzepatida na v1 ou excluir pacientes sem dose registrada.

---

## 7. Próxima etapa (fora deste documento)

- **Etapa 2 OI:** script offline de exportação anonimizada usando `PacienteService` / Admin SDK + `normalizePacienteFirestoreData`.
- Gerar CSV/JSON conforme `docs/precificacao/base_dados_perda_peso.md`.
- Não implementar nesta etapa.

---

## Referências de código (entrada rápida)

| Artefato | Caminho |
|----------|---------|
| Tipo paciente | `types/obesidade.ts` |
| Service paciente | `services/pacienteService.ts` |
| Bioimpedância | `services/bioImpedanciaService.ts`, `types/bioImpedancia.ts` |
| Pagamentos | `services/pagamentoService.ts`, `types/pagamento.ts` |
| Spec exportação | `docs/precificacao/base_dados_perda_peso.md` |
| Utils peso/meta | `lib/metaadmin/orcamentoTerapeuticoUtils.ts` |
