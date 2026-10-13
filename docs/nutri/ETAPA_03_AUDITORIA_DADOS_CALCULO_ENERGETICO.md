# ETAPA 3 — Auditoria dos dados necessários para cálculo energético

**Escopo:** somente documentação. Nenhuma alteração de código, Firestore, wizard, Plano Nutri ou Cardápio.  
**Data:** 2026-07-31  
**Fontes principais:** `types/obesidade.ts`, `components/NutriContent.tsx`, `utils/dataNascimentoLocal.ts`, `utils/labRangesFromJson.ts`, `services/bioImpedanciaService.ts`, `services/avaliacaoAtividadeFisicaService.ts`, `types/bioImpedancia.ts`, `types/avaliacaoAtividadeFisica.ts`, `services/chatNutriServerService.ts`, `app/meta/page.tsx`, `app/metanutri/nutri/[pacienteId]/page.tsx`

---

## 1. Resumo executivo

O paciente Oftware (`PacienteCompleto` em `pacientes_completos/{id}`) já carrega antropometria, sexo biológico, data de nascimento, comorbidades estruturadas, riscos (gestação/lactação), plano de Tirzepatida e evolução de peso. O **Nutri** (`NutriContent`) recebe esse objeto por prop, mas **só utiliza de forma ativa** peso (via `obterPesoAtual`), altura/IMC (gate e fator proteico), anamnese nutricional e `planoTerapeutico.injectionDayOfWeek` (check-in). Sexo, idade, composição corporal, avaliação MetaPersonal e a maior parte das comorbidades **estão no paciente ou em coleções paralelas**, porém **não entram** em `gerarPlanoNutricional`.

**Conclusão prévia à fórmula:** não é seguro calcular TMB “sem inventar dados” para todos os pacientes hoje — faltam garantias de sexo biológico M/F, idade e peso sem fallback 70 kg; IMC do plano costuma ser o das **medidas iniciais**, não recalculado com o peso atual.

---

## 2. Fluxo atual dos dados

```text
Firestore: pacientes_completos/{pacienteId}
        (+ coleções paralelas: avaliacaoAtividadeFisica/{pacienteId}; nutricao/plano; nutricao/dados/checkins)
        ↓
Carregamento do paciente
  /meta → estado paciente na página
  /metanutri/nutri/[pacienteId] → PacienteService / vínculo nutricionista
        ↓
<NutriContent paciente={PacienteCompleto} />
        ↓
loadPlano → nutricao/plano
obterPesoAtual(paciente) + medidasIniciais.imc
wizard → gerarPlanoNutricional → nutricao/plano (+ anamneseNutricional)
```

`NutriContent` **não** busca bioimpedância nem `avaliacaoAtividadeFisica` por conta própria.

Diferenças de entrada:

| Entrada | Prop | Observação |
|---------|------|------------|
| `/meta` paciente | `paciente` | Nutri só com médico vinculado |
| `/meta` nutricionista | `paciente` + `modoNutricionista` (prop não lida no corpo) | Mesmo componente |
| `/metanutri/nutri/[pacienteId]` | `paciente` + `modoNutricionista` | Mesmo `NutriContent` |
| MetaPersonal chat | `onlyChatNutri` | Sem wizard/plano |

---

## 3. Tabela completa de campos

Caminho base Firestore do paciente: `pacientes_completos/{pacienteId}` salvo como campos aninhados no documento (não subcoleção, salvo onde indicado).

| Nome clínico | Campo real | Tipo | Valores | Firestore | Interface | Tela de coleta | Obrig. | Confiabilidade | Usado Nutri | Em NutriContent | Transformação | Observações |
|--------------|------------|------|---------|-----------|-----------|----------------|--------|----------------|-------------|-----------------|---------------|-------------|
| Sexo biológico | `dadosIdentificacao.sexoBiologico` | enum | `M` \| `F` \| `Outro` | `...dadosIdentificacao.sexoBiologico` | `DadosIdentificacao` | Cadastro / anamnese Meta / home Meta | Não | Opcional; `Outro` inadequado para Mifflin | Não (só ChatNutri server) | **Disponível na prop**, não lido | Mapear M/F → masculino/feminino; bloquear `Outro`/ausente | Sem campo `genero` no paciente |
| Gênero (paciente) | — | — | — | — | — | — | — | — | — | Não | — | `genero` existe em **médicos/WL**, não no paciente |
| Data nascimento | `dadosIdentificacao.dataNascimento` | Date / Timestamp / string | formatos variados | `...dadosIdentificacao.dataNascimento` | `DadosIdentificacao` | Cadastro Meta (gate se ausente) | Fortemente incentivado no Meta | Preenchido na maioria dos fluxos novos; legado pode faltar | Não | **Disponível**, não lido | `parseDataNascimentoDiaMesLocal` + `calcularIdade` | Helpers em `utils/dataNascimentoLocal.ts`, `utils/labRangesFromJson.ts` |
| Idade | (derivada) | number \| null | — | não persistida como idade | — | — | — | Derivada | Não | Não calculada no Nutri | nascimento → idadeAnos | Várias cópias locais de `calcularIdade` no monólito |
| Peso inicial | `dadosClinicos.medidasIniciais.peso` | number kg | 20–400 UI | `...dadosClinicos.medidasIniciais.peso` | `DadosClinicos.medidasIniciais` | Anamnese clínica / gate Nutri | Sim no gate Nutri se sem IMC | Preenchido se anamnese ok | Sim (fallback) | Sim | — | Também `marcoZero.pesoInicial` |
| Peso atual | `evolucaoSeguimento[i].peso` | number? kg | — | array no doc | `SeguimentoSemanal` | Check-in aplicação / seguimento | Não por registro | Depende de adesão ao check-in | Sim (`obterPesoAtual`) | Sim | Último índice do array | **Sem ordenar por data** |
| Altura | `dadosClinicos.medidasIniciais.altura` | number cm | 120–230 UI | `...medidasIniciais.altura` | idem | Gate Nutri / anamnese | Sim no gate | Estável se preenchida | Sim (IMC gate) | Sim | cm → m para IMC | Raramente atualizada |
| IMC | `dadosClinicos.medidasIniciais.imc` | number | calculado | `...medidasIniciais.imc` | idem | Calculado no save peso/altura Nutri e anamnese | Derivado | Pode estar **desatualizado** vs peso atual | Sim (prot + estilo) | Sim (valor salvo, não recalcula no gerar) | peso/altura² | Ver §5 |
| Circ. abdominal inicial | `medidasIniciais.circunferenciaAbdominal` | number cm | 40–200 | idem | idem | Anamnese | Pode ser 0 / `circunferenciaNaoInformada` | Variável | Não | Disponível, não usado | — | — |
| Circ. abdominal evolução | `evolucaoSeguimento[].circunferenciaAbdominal` | number? | — | array | `SeguimentoSemanal` | Check-ins | Não | Variável | Não | Disponível | — | — |
| Evolução de peso | `evolucaoSeguimento[]` | array | — | array | `SeguimentoSemanal` | Aplicação / Meta | — | Histórico | Parcial (só último peso) | Sim | — | Ordem = ordem de push, não sort |
| % gordura | `bioimpedanciaRegistros[].analiseObesidade.percentualGordura` / `.percentualGordura` | number | — | **campo no doc paciente** `bioimpedanciaRegistros` | `BioImpedanciaRegistro` | MetaNutri / MetaAdmin bio | Não | Só se exame lançado | Não | **Não tipado** em `PacienteCompleto`; não carregado pelo Nutri | Unificar legado/estendido | Serviço: `bioImpedanciaService` |
| Massa magra / muscular | `analiseMusculoGordura`, segmentar | number | — | idem | idem | idem | Não | Só com bio | Não | Fora do Nutri | — | — |
| Água / visceral | campos bio | number | — | idem | idem | idem | Não | Só com bio | Não | Fora | — | Inclui `metabolismoBasalKcal` no laudo (não usar cegamente) |
| Atividade (Nutri wizard) | `anamneseNutricional.atividadeFisica` / wizard | enum | nunca, 1-2x, 3-4x, 5-7x | `nutricao/plano.anamneseNutricional` | snapshot | Wizard Nutri passo 5 | Soft default | Declarada | Sim (estilo) | Sim | — | Não é duração/intensidade |
| Horas sentado (Nutri) | `anamneseNutricional.horasSentado` | enum | &lt;4h, 4-8h, &gt;8h | snapshot v1+ | snapshot | Wizard passo 2 | Soft | Declarada; **não usada** em decisões | Persistida | Não usada pós-save | — | Grupo D para fórmula até regras |
| Atividade (estilo de vida) | `estiloVida.atividadeFisica` | enum | sedentario…profissional | doc paciente | `EstiloVida` | Anamnese clínica | Não | Declarada clínica | Não Nutri | Na prop, não lida | Escalas **diferentes** do wizard Nutri | + `tipoAtividade` string |
| Atividade (anamnese V3) | `dadosClinicos.perfilMetabolicoV3.atividadeFisica` | nested | rotinaMovimento… | doc | `PerfilMetabolicoV3` | Chat anamnese adaptativa | Não | Declarada | Não | Na prop se carregado | — | — |
| Avaliação AF MetaPersonal | `answers` + status | rich | ver tipo | **`avaliacaoAtividadeFisica/{pacienteId}`** | `AvaliacaoAtividadeFisica` | Fluxo Personal | Não | Planejada / perfil treino | Não | **Coleção separada** | — | Declarada ≠ executada |
| Treino planejado/executado | planos Personal / sessions | — | — | coleções MetaPersonal | training engine | MetaPersonal | — | Planejado vs executado | Não | Fora | — | Não integrar nesta etapa |
| Tirzepatida dose | `planoTerapeutico.currentDoseMg` | enum mg | 1.25…15 | doc | `PlanoTerapeutico` | MetaAdmin / aplicação | Se em tratamento | Estruturado | Só dia da semana no check-in | Prop disponível | — | Produto centrado em Tirzepatida |
| Histórico doses | `historicoDoses`, `esquemaDosesCustomizado` | array/map | — | doc | idem | MetaAdmin | — | Bom se preenchido | Parcial (check-in sintomas) | Disponível | — | Nutri usa último `historicoDoses` só para UI de sintomas |
| Semaglutida atual | — estruturado no plano | — | flags em `medicamentosPrevios` / texto `medicacoesUsoAtual` | parcial | `PerfilMetabolicoV3` / `Medicacao` | Anamnese | Não | Fraco para “medicação atual” | Não | Parcial | Não inferir por texto | Plano terapêutico tipado é Tirzepatida |
| Última aplicação | `evolucaoSeguimento[].doseAplicada` / calendário | nested | — | doc / apps | — | Check-in aplicação | — | Variável | Parcial (check-in dia) | Sim injectionDay | — | — |
| Diagnóstico principal | `dadosClinicos.diagnosticoPrincipal` | enum+outro | dm1, dm2, obesidade… | doc | `DadosClinicos` | Anamnese | Não | Estruturado | Não | Disponível | — | — |
| Comorbidades | `dadosClinicos.comorbidades` | flags boolean | HAS, DRC, hipotireoidismo… | doc | idem | Anamnese | `nenhuma`/`outra` | Estruturado | Não | Disponível | — | Sem EHNA hepática isolada além `esteatoseEHNA` |
| Gestação / lactação | `dadosClinicos.riscos.gestacao` / `lactacao` | enum | sim/nao/desconheco | doc | riscos | Anamnese | Sim no formulário clínico típico | Estruturado | Não | Disponível | Bloqueio futuro | — |
| Função renal | `funcaoRenal.egfr` / `estagioDRC` | number/enum | G1–G5 | doc | idem | Anamnese | Não | Parcial | Não | Disponível | — | — |
| Tireoide | `historiaTireoidiana` | enum | eutireoidismo… | doc | idem | Anamnese | Não | Estruturado | Não | Disponível | — | — |
| Cirurgia bariátrica | — campo dedicado | — | — | **não encontrado** tipado | — | — | — | Ausente / texto livre possível | — | Indisponível estruturado | — | Grupo D |
| Transtorno alimentar | — dedicado | — | comorbidade ansiedade/depressão apenas | parcial | — | — | — | Não determinístico | — | — | Não buscar texto | Grupo D |
| Intensidade desejada | `anamneseNutricional.intensidadeDesejada` | enum | leve/moderada/intensiva | `nutricao/plano` | snapshot v2 | Wizard Nutri | Soft | Declarada adesão | Só UI | Sim | — | **Não** é fator energético ainda |

---

## 4. Auditoria de sexo e idade

### Sexo

- Campo: `dadosIdentificacao.sexoBiologico?: 'M' | 'F' | 'Outro'`.
- **Não** há `genero` no `PacienteCompleto`.
- No chat Meta, o passo pode ser rotulado como “gênero / identificação”, mas o valor gravado é **`sexoBiologico`** (não há campo de gênero separado no paciente).
- Usado em labs/bio UI no `/meta` e no ChatNutri server (`homem`/`mulher`); **não** no wizard Nutri.
- Para Mifflin: apenas `M`/`F` são usáveis; `Outro` e `undefined` = bloqueio.
- Pacientes antigos podem não ter o campo (opcional no tipo).

### Idade / nascimento

- Campo único: `dadosIdentificacao.dataNascimento` (Date tipado; na prática Timestamp/string).
- Helper de dia civil: `parseDataNascimentoDiaMesLocal` (`utils/dataNascimentoLocal.ts`) — trata `YYYY-MM-DD`, `DD/MM/YYYY`, Timestamp UTC midnight, fuso SP.
- Idade: `calcularIdade` em `utils/labRangesFromJson.ts` (mês/dia); **duplicatas** em metanutri/metapersonal/OI/depoimentos — mesmo conceito.
- **NutriContent não calcula idade** hoje.
- Caminho futuro sugerido (não implementado):  
  `idadeAnos = calcularIdade(parseDataNascimentoDiaMesLocal(paciente.dadosIdentificacao?.dataNascimento) ?? paciente.dadosIdentificacao?.dataNascimento)`.

---

## 5. Auditoria de peso, altura e IMC

### `obterPesoAtual` (NutriContent)

Ordem real:

1. `paciente.evolucaoSeguimento` — **último elemento do array** (`length - 1`), se `peso > 0`  
   - **Não ordena por `dataRegistro`.**
2. Senão `dadosClinicos.medidasIniciais.peso` se `> 0`.
3. Senão **`return 70`** + `console.warn`.

Riscos:

- Array fora de ordem cronológica → peso “atual” errado.
- Em outros pontos do Meta/check-in há lógica que **ordena por data**; `obterPesoAtual` **não** ordena — só o último índice.
- Registro final sem peso → cai no peso inicial sem olhar registros anteriores com peso.
- Fallback **70 kg** pode ser tratado como peso real em proteína/água/check-in kcal.
- Existe também `indicadores.evolucaoPonderal.pesoAtual` (derivado) — **não** usado pelo Nutri.

Diferença conceitual:

| Conceito | Fonte |
|----------|--------|
| Peso inicial clínico | `medidasIniciais.peso` / `marcoZero.pesoInicial` |
| Último peso na evolução (Nutri) | último índice com peso |
| Fallback inventado | 70 |

### Altura / IMC

- Altura: `medidasIniciais.altura` (cm); gate Nutri 120–230.
- IMC: salvo em `medidasIniciais.imc`; helpers canônicos em `lib/meta/medidasIniciaisImc.ts` (`calcularImcFromPesoAlturaCm` / `ensureImcOnMedidasIniciais`); Nutri também calcula no `handleSalvarPesoAltura`.
- Em `gerarPlanoNutricional`: usa `medidasIniciais.imc || 0` e **peso de `obterPesoAtual()`** para `protDia_g = peso × fator(IMC)`.
- **Risco:** IMC desatualizado (peso evoluiu, IMC inicial permanece) distorce fator 1.2/1.4/1.5 e estilo `rico_proteina` (IMC ≥ 32).
- A Home do Meta frequentemente **recalcula** IMC na UI a partir do peso atual + altura, sem necessariamente regravar `medidasIniciais.imc`.

---

## 6. Auditoria de atividade física

| Camada | Onde | Natureza |
|--------|------|----------|
| Declarada Nutri | `anamneseNutricional.atividadeFisica` + `horasSentado` | Frequência semanal / sedentarismo ocupacional grosseiro |
| Declarada clínica | `estiloVida.atividadeFisica` + `tipoAtividade` | Escala diferente (sedentario…profissional) |
| Declarada V3 chat | `perfilMetabolicoV3.atividadeFisica` | rotinaMovimento |
| Declarada/planejada Personal | `avaliacaoAtividadeFisica/{id}` | Questionário rico + safety + índice personalização |
| Planejada | Plano de treino MetaPersonal / `activityPlan` no `planoTerapeutico` | Não = execução |
| Executada | Sessões de treino / check-in `atividadeFisicaHoje` | Check-in Nutri é **autodeclaração diária**, não wearable |

**Não há** no Nutri: duração, intensidade MET, passos, wearable.

Confirmado na varredura do repositório: **nenhum** campo/coleção de passos, Fitbit, Garmin, HealthKit ou Health Connect.

Não tratar declarado = planejado = executado.

---

## 7. Auditoria de GLP-1

| Dado | Local | No Nutri |
|------|-------|----------|
| Dose atual Tirzepatida | `planoTerapeutico.currentDoseMg` | Não usado no plano nutricional |
| Dia aplicação | `injectionDayOfWeek` | Check-in Tirzepatida |
| Início | `startDate` / `dataInicioTratamento` | Não |
| Histórico doses | `historicoDoses`, esquema custom, evolução `doseAplicada` | Check-in: `historicoDoses` para janela de sintomas pós-troca de dose; **não** entra no cálculo energético |
| Titulação | `titrationStatus`, `lastDoseChangeAt` | Não |
| Sintomas aumento dose | check-in Nutri `sintomasAumentoDose` | Check-in only |
| Semaglutida **atual** | não tipada no plano; histórico em `medicamentosPrevios` / medicações texto | Não |
| Adesão aplicação | `evolucaoSeguimento.adesao` / check-in `diaAplicacao` | Check-in |

Medicação **não** deve reduzir calorias automaticamente (restrito a etapas futuras).

---

## 8. Auditoria de comorbidades

Estruturado em `dadosClinicos`:

- `diagnosticoPrincipal.tipo` (dm1, dm2, obesidade, RI, SOP, EHNA…)
- `comorbidades.*` (HAS, dislipidemia, DRC, hipotireoidismo, EHNA, CV, SOP, ansiedade/depressão, asma/DPOC…)
- `riscos` (pancreatite, gastroparesia, CMT/MEN2, gestação, lactação)
- `historiaTireoidiana`, `funcaoRenal`

**Não estruturado / ausente:** cirurgia bariátrica dedicada; transtorno alimentar específico; “doença hepática” genérica além EHNA/esteatose.

Risco de busca textual em `observacoesClinicas` / `outraDescricao` — **não** usar para regras determinísticas sem campo tipado.

Tudo isso está na prop `paciente` do Nutri, mas **não** é consumido pelo motor nutricional atual.

---

## 9. Auditoria de composição corporal

| Item | Fonte | Nutri |
|------|-------|-------|
| % gordura, massa gordura/muscular, água, visceral | `pacientes_completos/{id}.bioimpedanciaRegistros[]` | Não carrega |
| Circ. abdominal | medidas iniciais + evolução + bio opcional | Não usa |
| TMB do laudo bio | `metabolismoBasalKcal` opcional | Não usar como verdade clínica cega |
| Tipagem em `PacienteCompleto` | **ausente** (`bioimpedanciaRegistros` só via service) | Integração exigiria fetch explícito |

Confiabilidade: boa **quando** há registro recente MetaNutri/MetaAdmin; muitos pacientes sem bio = indisponível.

---

## 10. Grupos A / B / C / D

### Grupo A — Disponíveis e confiáveis (com ressalvas de preenchimento)

- Altura em `medidasIniciais` (se preenchida)
- Sexo `M`/`F` quando presente
- Data de nascimento quando presente + helpers de idade
- Comorbidades/riscos/diagnóstico tipados no doc
- Dose Tirzepatida e dia de aplicação no plano terapêutico
- Snapshot Nutri `atividadeFisica` / `intensidadeDesejada` (v2) após gerar plano

### Grupo B — Disponíveis, precisam normalização

- Peso “atual” (ordem do array; fallback 70)
- IMC salvo vs peso atual
- `dataNascimento` multi-formato
- Escalas de atividade paralelas (Nutri vs `estiloVida` vs V3)
- `sexoBiologico: Outro`
- Circunferência 0 / não informada

### Grupo C — Existem fora do fluxo Nutri (integração)

- `bioimpedanciaRegistros` (mesmo doc, não tipado/carregado no Nutri)
- `avaliacaoAtividadeFisica/{pacienteId}`
- Planos/sessões MetaPersonal
- ChatNutri já lê sexo/peso no server, Nutri client não

### Grupo D — Ausentes ou não confiáveis para fórmula

- Semaglutida como medicação atual estruturada
- Cirurgia bariátrica tipada
- Wearables / passos
- Duração/intensidade MET do exercício
- Fallback 70 kg como se fosse medido
- Inferência por texto livre de prontuário

---

## 11. Matriz mínima (conceitual — não implementada)

```ts
// Conceito apenas — NÃO criar no código nesta etapa
interface DadosEnergeticosDisponiveis {
  pesoAtualKg: number | null;
  alturaCm: number | null;
  idadeAnos: number | null;
  sexoBiologico: 'masculino' | 'feminino' | null;
  atividadeFisicaDeclarada: 'nunca' | '1-2x' | '3-4x' | '5-7x' | null;
}
```

| Campo | Status hoje |
|-------|-------------|
| `pesoAtualKg` | **Parcialmente** — existe lógica, mas fallback 70 e ordenação fraca |
| `alturaCm` | **Disponível** se medidas iniciais preenchidas; senão indisponível |
| `idadeAnos` | **Parcialmente** — dado no paciente + helpers; Nutri não expõe |
| `sexoBiologico` | **Parcialmente** — M/F ok; Outro/ausente = null |
| `atividadeFisicaDeclarada` | **Parcialmente** — no snapshot pós-wizard; planos antigos sem anamnese = null / só estiloVida diferente |

---

## 12. Bloqueios (respostas explícitas)

1. **TMB sem inventar dados?** Não para todos. Bloquear se faltar sexo M/F, idade, altura ou peso confiável (e eliminar 70 kg silencioso).
2. **Idade com segurança?** Sim **se** nascimento parseável com helpers; não se campo ausente/inválido.
3. **Equação dependente de sexo?** Só com `M`/`F`; não usar `Outro` nem gênero de médico.
4. **Estimar nível de atividade?** Só de forma **grosseira** via frequência Nutri / estiloVida; sem MET real.
5. **Peso atual confiável?** Nem sempre — ver ordenação e fallback 70.
6. **IMC atualizado?** Frequentemente **não** — IMC das medidas iniciais vs peso da evolução.
7. **Pacientes a bloquear?** Gestação/lactação (`riscos`), dados mínimos ausentes, bariátrica não tipada (avaliar manualmente), `Outro` sexo.
8. **Novas perguntas estritamente necessárias?** Idealmente **nenhuma** se cadastro Meta completo; reforçar obrigatoriedade de sexo M/F e nascimento no cadastro, não no Nutri. Evitar reperguntar altura/peso se já existem.
9. **Não perguntar de novo:** altura, peso (usar evolução), sexo se M/F, nascimento, comorbidades já na anamnese clínica, dose Tirzepatida do plano.
10. **Trazer ao Plano Nutri / motor futuro:** sexo, idade, peso confiável + data, altura, IMC recalculado, atividade declarada do snapshot, flags de bloqueio (gestação/lactação/DRC grave), opcionalmente última bio.

---

## 13. Novas perguntas potencialmente necessárias

Só se o cadastro Meta não garantir:

- Sexo biológico M/F quando ausente/`Outro` (com fluxo clínico, não “chute”).
- Confirmação de gestação/lactação se `riscos` desatualizado.
- Cirurgia bariátrica (campo novo estruturado) — hoje ausente.

**Não** criar no Nutri perguntas duplicadas de peso/altura/AF se já no paciente/snapshot.

---

## 14. Dados que já existem e não devem ser perguntados novamente

- `medidasIniciais.altura` / peso / circ.
- `dadosIdentificacao.sexoBiologico` (se M/F)
- `dadosIdentificacao.dataNascimento`
- `dadosClinicos.comorbidades` / `diagnosticoPrincipal` / `riscos`
- `planoTerapeutico.currentDoseMg` e calendário
- `anamneseNutricional.*` após ETAPA 1–2
- Bioimpedância quando já lançada no paciente

---

## 15. Arquivos inspecionados

- `types/obesidade.ts`
- `types/bioImpedancia.ts`
- `types/avaliacaoAtividadeFisica.ts`
- `components/NutriContent.tsx`
- `utils/dataNascimentoLocal.ts`
- `utils/labRangesFromJson.ts` (`calcularIdade`)
- `services/bioImpedanciaService.ts`
- `services/avaliacaoAtividadeFisicaService.ts`
- `services/chatNutriServerService.ts` (`getPatientContextForChat`)
- `app/meta/page.tsx` (sexo/nascimento UI)
- `app/metanutri/nutri/[pacienteId]/page.tsx`
- `lib/meta/medidasIniciaisImc.ts`
- `docs/nutri/AUDITORIA_ANAMNESE_NUTRICIONAL_METANUTRI.md` (contexto)
- `docs/nutri/ETAPA_01_*` / `ETAPA_02_*`

---

*Fim da ETAPA 3 — auditoria apenas. Não iniciar ETAPA 4.*
