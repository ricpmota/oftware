# Base de Dados para Análise de Perda de Peso e Precificação

Especificação da base de dados anonimizada necessária para estudar resultados de emagrecimento, consumo de medicação em mg e futura criação de modelos de precificação dos planos Oftware.

---

## 1. Contexto

A Oftware possui uma base de pacientes em tratamento de emagrecimento com histórico clínico, aplicações de medicação, registros de peso, cintura e evolução ao longo do tempo.

O objetivo deste documento é organizar **quais dados anonimizados** devem ser consolidados para permitir análises estatísticas e, posteriormente, a definição de planos comerciais baseados em evidência.

Com a base estruturada, queremos estudar:

- **Perda de peso por dose** — relação entre dose prescrita/aplicada e redução de peso observada
- **Perda de peso por mg utilizado** — eficiência do tratamento em termos de miligramas totais consumidas
- **Tempo até metas de 5%, 10%, 15% e 20%** — quanto tempo leva, em média, para atingir cada marco de perda percentual
- **Consumo médio de medicação** — volume total de mg e número de aplicações por paciente e por faixa de resultado
- **Previsibilidade de resultado** — capacidade de estimar evolução com base em perfil inicial (sexo, idade, IMC, peso inicial)
- **Criação futura de planos comerciais** — fundamentar tiers como Bronze, Prata, Ouro e Platinum com dados reais da plataforma

> Este documento define apenas a **especificação da exportação**. Nenhum código do sistema deve ser alterado nesta etapa.

---

## 2. Regras de anonimização

A exportação deve respeitar a **LGPD** e garantir que nenhum dado permita reidentificação do paciente.

### NÃO deve ser exportado

| Categoria | Exemplos |
|-----------|----------|
| Identificação direta | Nome completo, nome social, apelidos |
| Documentos | CPF, RG, CNH, passaporte |
| Contato | E-mail, telefone, WhatsApp |
| Localização | Endereço completo, CEP, bairro, cidade (quando isolados) |
| Identificadores internos expostos | UID Firebase, token de aplicação, link de acesso |
| Outros dados identificáveis | Foto de rosto, data de nascimento exata (preferir idade), combinações raras que permitam dedução |

### Deve ser exportado

- Identificador **anonimizado e irreversível** (`pacienteAnonId`), gerado no momento da exportação (hash ou UUID descorrelacionado do ID real)
- Apenas dados clínicos e de tratamento agregados ou pseudonimizados
- Observações clínicas somente após **remoção ou generalização** de qualquer menção a pessoa, local ou contato

---

## 3. Campos desejados no CSV/JSON consolidado

Um registro por paciente no arquivo principal (`pacientes_tratamento_consolidado.csv` ou `.json`).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `pacienteAnonId` | string | Identificador anonimizado único (não reversível ao ID real) |
| `sexo` | string | `M`, `F` ou `Outro` / `NaoInformado` |
| `idade` | number | Idade em anos na data de início do tratamento |
| `altura` | number | Altura em cm |
| `pesoInicialKg` | number | Peso registrado no início do tratamento (marco zero) |
| `pesoAtualKg` | number | Último peso registrado na base |
| `pesoPerdidoKg` | number | `pesoInicialKg - pesoAtualKg` (pode ser negativo se ganhou peso) |
| `percentualPesoPerdido` | number | `(pesoPerdidoKg / pesoInicialKg) * 100` |
| `imcInicial` | number | IMC calculado com peso e altura iniciais |
| `imcAtual` | number | IMC calculado com peso e altura atuais |
| `cinturaInicialCm` | number \| null | Circunferência abdominal inicial, se disponível |
| `cinturaAtualCm` | number \| null | Última medida de cintura registrada |
| `dataInicioTratamento` | string (ISO 8601) | Data do marco zero / primeira aplicação |
| `dataUltimoRegistro` | string (ISO 8601) | Data do último peso ou aplicação registrada |
| `tempoTratamentoDias` | number | Dias entre início e último registro |
| `tempoTratamentoSemanas` | number | `tempoTratamentoDias / 7` (arredondar conforme regra do script) |
| `medicamento` | string | Nome ou código padronizado do medicamento principal |
| `dosesUtilizadasMg` | number[] \| string | Histórico de doses em mg (ou lista serializada) |
| `doseAtualMg` | number | Dose vigente na última aplicação |
| `doseMaximaMg` | number | Maior dose atingida durante o tratamento |
| `quantidadeTotalMgUtilizada` | number | Soma de todas as mg aplicadas |
| `numeroAplicacoes` | number | Total de aplicações registradas |
| `pesoPerdidoPorMg` | number \| null | `pesoPerdidoKg / quantidadeTotalMgUtilizada` (se mg > 0) |
| `pesoPerdidoPorSemana` | number \| null | `pesoPerdidoKg / tempoTratamentoSemanas` (se semanas > 0) |
| `atingiu5porcento` | boolean | `percentualPesoPerdido >= 5` |
| `atingiu10porcento` | boolean | `percentualPesoPerdido >= 10` |
| `atingiu15porcento` | boolean | `percentualPesoPerdido >= 15` |
| `atingiu20porcento` | boolean | `percentualPesoPerdido >= 20` |
| `tratamentoConcluido` | boolean | Tratamento encerrado formalmente ou em fase de conclusão |
| `motivoEncerramento` | string \| null | Ex.: `meta_atingida`, `abandono`, `efeito_adverso`, `medico_encerrou`, `em_andamento` |

### Exemplo de registro JSON (ilustrativo)

```json
{
  "pacienteAnonId": "anon_a7f3c2e1-4b9d-4e8a-9c1f-2d3e4f5a6b7c",
  "sexo": "F",
  "idade": 42,
  "altura": 165,
  "pesoInicialKg": 92.5,
  "pesoAtualKg": 81.2,
  "pesoPerdidoKg": 11.3,
  "percentualPesoPerdido": 12.22,
  "imcInicial": 33.96,
  "imcAtual": 29.81,
  "cinturaInicialCm": 98,
  "cinturaAtualCm": 88,
  "dataInicioTratamento": "2024-03-15",
  "dataUltimoRegistro": "2025-01-10",
  "tempoTratamentoDias": 301,
  "tempoTratamentoSemanas": 43,
  "medicamento": "semaglutida",
  "doseAtualMg": 2.4,
  "doseMaximaMg": 2.4,
  "quantidadeTotalMgUtilizada": 86.4,
  "numeroAplicacoes": 36,
  "pesoPerdidoPorMg": 0.131,
  "pesoPerdidoPorSemana": 0.263,
  "atingiu5porcento": true,
  "atingiu10porcento": true,
  "atingiu15porcento": false,
  "atingiu20porcento": false,
  "tratamentoConcluido": false,
  "motivoEncerramento": "em_andamento"
}
```

---

## 4. Campos semanais (histórico por aplicação ou por semana)

Se existir histórico granular por aplicação ou por semana na base Firestore, exportar um arquivo complementar (`historico_semanal.csv` ou `.json`), com **um registro por semana/aplicação** por paciente.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `pacienteAnonId` | string | Mesmo ID anonimizado do arquivo consolidado |
| `semana` | number | Número da semana desde o início do tratamento (1-based) |
| `dataRegistro` | string (ISO 8601) | Data do registro ou da aplicação |
| `pesoKg` | number \| null | Peso naquela semana/aplicação |
| `cinturaCm` | number \| null | Cintura naquela semana, se medida |
| `doseMg` | number | Dose aplicada em mg |
| `medicamento` | string | Medicamento naquela aplicação |
| `eventosAdversos` | string \| null | Categorias padronizadas (ex.: `nausea`, `constipacao`) — sem texto livre identificável |
| `adesaoRelatada` | boolean \| null | Paciente reportou adesão conforme registro |
| `observacoesClinicasAnonimizadas` | string \| null | Texto livre **sanitizado** — sem nomes, datas exatas de nascimento ou dados de contato |

### Relacionamento entre arquivos

```
pacientes_tratamento_consolidado  (1 registro por paciente)
        │
        └── historico_semanal     (N registros por paciente, via pacienteAnonId)
```

---

## 5. Métricas que queremos calcular depois

Com os arquivos consolidados, a análise estatística (Python, R, notebook ou ferramenta interna) deve permitir calcular:

### Distribuição de resultados

- Média, mediana e percentis (P25, P50, P75, P90) de **perda de peso** (kg e %)
- Média, mediana e percentis de **perda por mg** (`pesoPerdidoPorMg`)
- Média, mediana e percentis de **perda por semana** (`pesoPerdidoPorSemana`)

### Metas de perda percentual

- **Consumo médio de mg** para atingir 5%, 10%, 15% e 20% de perda
- **Tempo médio** (dias/semanas) para atingir cada meta
- Taxa de pacientes que atingem cada meta (`atingiu5porcento`, etc.)

### Segmentações comparativas

- Comparação entre **faixas de peso inicial** (ex.: &lt; 80 kg, 80–100 kg, &gt; 100 kg)
- Comparação por **sexo**
- Comparação por **IMC inicial** (ex.: 27–30, 30–35, 35–40, &gt; 40)
- Comparação por **medicamento** e faixa de dose

### Modelagem e precificação

- **Previsibilidade de resultado** — modelos de regressão ou classificação para estimar probabilidade de atingir metas com base no perfil inicial
- **Base para planos comerciais** — traduzir consumo médio de mg e tempo até meta em pacotes:
  - **Bronze** — meta conservadora (ex.: 5%)
  - **Prata** — meta intermediária (ex.: 10%)
  - **Ouro** — meta avançada (ex.: 15%)
  - **Platinum** — meta máxima ou tratamento estendido (ex.: 20%+)

> Os valores exatos dos tiers serão definidos após a primeira rodada de análise com dados reais anonimizados.

---

## 6. Próxima etapa técnica

A próxima etapa será **criar um script de exportação anonimizada** a partir do Firestore, que:

1. Leia apenas as coleções e subcoleções necessárias (pacientes, aplicações, evolução de peso/cintura)
2. Gere `pacienteAnonId` de forma **irreversível** no momento da exportação
3. **Exclua** todos os campos listados na seção 2 (nome, CPF, e-mail, telefone, endereço, etc.)
4. Calcule os campos derivados (`imcInicial`, `percentualPesoPerdido`, flags de meta, etc.)
5. Produza os arquivos `pacientes_tratamento_consolidado` e, quando aplicável, `historico_semanal`
6. Respeite a **LGPD** — exportação restrita a ambiente autorizado, sem exposição de dados pessoais em repositórios públicos ou logs

Nenhuma alteração no código de produção da plataforma é necessária nesta fase; apenas a documentação e, em seguida, o script de exportação offline ou via rota administrativa protegida.

---

## Referências internas

- `docs/conhecimento/jornada_paciente.md` — fluxo do paciente na plataforma
- `docs/conhecimento/regras_negocio.md` — regras de negócio gerais
- `utils/expectedCurve.ts` — curvas esperadas de perda por dose (referência para validação cruzada)
