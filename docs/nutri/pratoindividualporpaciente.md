# Prato individual por paciente

Brief de conduta para dimensionar a **Opção 01** (prato padrão) de cada refeição de acordo com o perfil do paciente.

Use este arquivo com o ChatGPT/Claude para **refinar regras clínicas e de montagem**. O resultado deve voltar como tabela de regras implementáveis no Oftware (`montarPratoPadraoRefeicao` em `components/NutriContent.tsx`).

---

## 1. Contexto do produto

- Pacientes em acompanhamento de obesidade / Tirzepatida (Oftware → Meta → Nutri → Cardápio).
- Cada refeição tem 5 slots: **Opção 01–05**. A **Opção 01** é o prato padrão do sistema.
- Opções 02–05 começam vazias; o paciente/nutri monta no Editar (meal builder + TACO manual).
- A geração automática **não consulta TACO**. Usa só o catálogo interno do builder.
- **Não recalcular** Opção 01 a cada mudança de peso se o paciente já customizou (tem `itensSelecionados`).

### Refeições (ordem do dia)

| Key       | Nome              | Papel típico                          |
|-----------|-------------------|----------------------------------------|
| `cafe`    | Café da manhã     | Proteína + carb leve + fruta           |
| `lanche1` | Lanche da manhã   | Proteína prática (whey/iogurte/ovos)   |
| `almoco`  | Almoço            | Proteína + carb + salada + gordura boa |
| `lanche2` | Lanche da tarde   | Igual lanche manhã                     |
| `jantar`  | Janta             | Proteína + carb menor + salada         |

---

## 2. Perfil do paciente (inputs disponíveis)

### Antropometria / plano

| Campo | Origem | Uso no prato |
|-------|--------|--------------|
| `peso_kg` | medidas / evolução | Base da proteína do dia |
| `altura_cm`, `imc` | medidas | Estilo / agressividade calórica |
| `protDia_g` | wizard: ~`peso × 1.2–1.5` | Meta diária de proteína |
| `aguaDia_ml` | ~`peso × 35` | Não entra no prato (só plano) |
| `estilo` | wizard | Tipo de montagem (ver §4) |

### Wizard clínico (já coletado)

| Campo | Valores / notas |
|-------|-----------------|
| `objetivoPrincipal` | `perda_peso` \| `recomposicao` \| `controle_glicemia` \| `melhora_disposicao` \| `manutencao` |
| `horarioTrabalho` | `diurno` \| `noturno` \| `turnos` |
| `horasSentado` | `<4h` \| `4-8h` \| `>8h` |
| `atividadeFisica` | `nunca` \| `1-2x` \| `3-4x` \| `5-7x` |
| `sonoHoras` | `<6h` \| `6-8h` \| `>8h` |
| `numeroRefeicoesDia` | `2-3` \| `4-5` \| `>5` |
| `comportamentosAlimentares` | ex.: pulo refeições, belisco, como rápido, álcool frequente |
| `fomeEmocional` | boolean |
| `compulsaoNoturna` | boolean |
| `restricoes` | `vegetariano`, `vegano`, `intolerância lactose`, `sem glúten`, `nada` |
| `preferenciasProteina` | `Carne`, `Frango`, `Peixe`, `Ovos`, `Laticínios`, `Leguminosas` |
| `sintomasGI` | `nenhum` \| `leve` \| `moderado` \| `grave` |
| `dietaUltimos12Meses`, `efeitoSanfona`, `kgSanfona` | histórico |
| `pesoMaximo2Anos`, `pesoMinimo2Anos` | histórico |
| `fomeMatinal`, `fomeNoturna`, `vontadeDoce` | 0–10 |
| `pulaCafeManha`, `chegaComMuitaFomeJantar` | boolean |
| `horarioDormir` | `22-00` \| `00-02` \| `depois_02h` |
| `acordaDescansado` | `sim` \| `nao` \| `as_vezes` |
| `dosesAlcoolSemana` | `0` \| `1-3` \| `4-7` \| `>7` |
| `finalSemanaSaiDieta` | `quase_nunca` \| `as_vezes` \| `sempre` |

### O que o ChatGPT deve considerar além do que já usamos

Hoje o motor usa sobretudo: **peso → protDia**, **estilo**, **restrições**, **preferências de proteína**, **meta por refeição**.

Queremos regras que também usem (quando fizer sentido):

1. Sintomas GI → preparações mais cozidas / menos fibra crua / porções menores no jantar.
2. Compulsão noturna / fome noturna alta → jantar mais saciante em proteína, lanche2 controlado, evitar “buraco” calórico cedo.
3. Pula café → café mais fácil (whey + fruta) ou reforçar lanche1.
4. Chega com muita fome no jantar → almoço e lanche2 com mais proteína/volume (salada).
5. Vontade de doce alta → fruta no café/lanches; não colocar “lixo” no padrão.
6. Trabalho noturno / turnos → redistribuir densidade proteica nas refeições acordadas.
7. Atividade física alta / recomposição → teto proteico e carb no almoço um pouco maiores.
8. Low adherence fim de semana / álcool → prato padrão ainda mais simples e repetível (poucos itens).

---

## 3. Como a meta é calculada hoje (baseline)

### Proteína do dia

- Fator tipicamente entre **1.2 e 1.5 g/kg** (wizard).
- `protDia_g` salvo no plano.

### Distribuição por refeição (string → média)

```
protPorRefeicao = protDia_g / 5
café / almoço / jantar ≈ 1.2–1.4 × protPorRefeicao  (código usa ~1.3 na média)
lanche1 / lanche2     ≈ 0.7–0.9 × protPorRefeicao  (código usa ~0.8)
```

### Calorias sugeridas fixas (hoje — candidatas a melhoria)

| Refeição | kcal sugerida (atual) |
|----------|------------------------|
| café     | 400 |
| lanche1  | 250 |
| almoço   | 550 |
| lanche2  | 200 |
| jantar   | 450 |

**Pedido ao ChatGPT:** propor kcal sugeridas em função de peso, objetivo, sexo (se disponível), atividade e estilo — sem abandonar o foco em proteína.

### Tolerância de montagem

- Acertar proteína da refeição em **±10%** da meta.
- Não estourar kcal sugerida em mais de ~15–30% (hoje o código usa faixas ~1.15–1.3×).

---

## 4. Estilos alimentares do plano

| `estilo` | Quando costuma ser escolhido | Conduta desejada no prato |
|----------|------------------------------|---------------------------|
| `digestiva` | GI moderado/grave | Cozidos, peixe/frango desfiado, legumes cozidos, evitar salada crua grande, carb fácil (arroz branco / batata / pão) |
| `plant_based` | vegetariano/vegano | Tofu, leguminosas (quando houver no catálogo), ovos/laticínios se vegetariano; whey fora se vegano |
| `rico_proteina` | IMC alto / recomposição | Priorizar porção maior de proteína; carb moderado |
| `low_carb_moderada` | default comum | Preferir batata doce/quinoa; menos arroz branco; gordura boa controlada |
| `mediterranea` | baixa atividade + hábitos irregulares | Peixe, azeite, salada, arroz/integral com moderação |

---

## 5. Catálogo atual do builder (IDs reais)

Só estes itens (e custom TACO depois) podem entrar na Opção 01 automática.

### Proteínas

| id | nome | P (g) | kcal |
|----|------|------:|-----:|
| `prot_frango_100g` | Peito de frango grelhado (100g) | 31 | 165 |
| `prot_frango_150g` | Peito de frango grelhado (150g) | 46 | 248 |
| `prot_carne_magra_100g` | Carne magra/patinho (100g) | 26 | 200 |
| `prot_peixe_100g` | Peixe grelhado (100g) | 25 | 150 |
| `prot_ovos_2un` | 2 ovos inteiros | 12 | 140 |
| `prot_ovos_3un` | 3 ovos inteiros | 18 | 210 |
| `prot_claras_4un` | 4 claras de ovo | 14 | 68 |
| `prot_whey_1dose` | Whey protein (1 dose) | 25 | 120 |
| `prot_iogurte_proteico` | Iogurte proteico (170g) | 20 | 150 |
| `prot_queijo_cottage` | Queijo cottage (100g) | 11 | 98 |
| `prot_tofu_100g` | Tofu (100g) | 8 | 76 |
| `prot_peito_peru` | Peito de peru (100g) | 30 | 120 |

### Carboidratos

| id | nome | P | kcal |
|----|------|--:|-----:|
| `carb_arroz_integral_3col` | Arroz integral (3 colheres) | 3 | 150 |
| `carb_arroz_branco_3col` | Arroz branco (3 colheres) | 2 | 140 |
| `carb_batata_doce_1un` | Batata doce (1 unidade média) | 2 | 180 |
| `carb_mandioca_100g` | Mandioca (100g) | 1 | 160 |
| `carb_pao_integral_1fat` | Pão integral (1 fatia) | 3 | 80 |
| `carb_quinoa_3col` | Quinoa (3 colheres) | 4 | 120 |

### Legumes / salada

| id | nome | P | kcal |
|----|------|--:|-----:|
| `leg_salada_grande` | Prato cheio de salada e legumes | 2 | 50 |
| `leg_salada_media` | Meia porção de salada | 1 | 25 |
| `leg_legumes_cozidos` | Legumes cozidos variados | 2 | 60 |

### Gorduras boas / extras

| id | nome | P | kcal |
|----|------|--:|-----:|
| `gord_azeite_1col` | Azeite (1 colher de sopa) | 0 | 120 |
| `gord_castanhas_porcao` | Castanhas (porção pequena) | 3 | 100 |
| `extra_fruta_pequena` | Fruta pequena | 0 | 60 |
| `extra_iogurte_extra` | Iogurte natural extra | 5 | 80 |

### Lixo alimentar

Existe no builder para registro de “deslize”, **nunca** deve entrar na Opção 01 automática.

---

## 6. Regras atuais do motor (o que já existe)

Ordem de preferência de proteína (se o paciente não marcou preferências):

`frango → peixe → ovos → whey → tofu → carne → iogurte`

Com preferências do wizard: priorizar famílias marcadas; depois completar a ordem padrão.

Montagem típica:

1. Escolher 1 proteína (escalar 100g→150g / 2→3 ovos se faltar meta).
2. Se ainda faltar proteína (±10%): complementar com whey / iogurte / claras.
3. Café/almoço/jantar: 1 carb (estilo define qual).
4. Almoço/jantar: salada/legumes.
5. Café/almoço/jantar: azeite se couber na meta calórica.
6. Café/lanches: fruta pequena se couber.
7. Lanches: só proteínas “práticas” do catálogo filtrado (whey, iogurte, ovos) + fruta.

Filtros de restrição já aplicados no catálogo antes da escolha.

---

## 7. Formato de saída desejado do ChatGPT

Peça para o modelo devolver **exatamente** nesta estrutura (para virar código depois):

### A) Fator de proteína (g/kg)

Tabela: objetivo × atividade × GI → fator sugerido (ex.: 1.2 / 1.4 / 1.6).

### B) Distribuição % da `protDia_g` por refeição

Ex.: café 22%, lanche1 12%, almoço 28%, lanche2 12%, jantar 26% — com variantes:

- pulou café
- compulsão noturna
- trabalho noturno
- GI grave

### C) Kcal alvo por refeição

Fórmula ou tabela em função de `peso_kg` e objetivo (não só números fixos).

### D) Matriz de escolha de itens

Para cada `estilo` × `refeicaoKey`:

- proteína preferida (lista ordenada de IDs)
- carb preferido (lista ordenada de IDs)
- legumes (sim/não + ID)
- gordura (sim/não + teto kcal)
- extras (fruta? iogurte extra?)
- proibições extras além das restrições

### E) Regras de escala

Quando subir de `prot_frango_100g` → `150g`, quando empilhar whey, quando preferir claras vs ovos inteiros (GI, lactose, etc.).

### F) Casos especiais (if → then)

Lista curta, determinística, no máximo 15 regras, ex.:

```
SE sintomasGI in (moderado, grave) E refeicao=almoco
ENTÃO legumes=leg_legumes_cozidos; carb preferir arroz_branco ou batata; evitar leg_salada_grande
```

### G) O que NÃO fazer

- Não inventar IDs fora do catálogo.
- Não colocar lixo no padrão.
- Não exigir TACO na geração automática.
- Não sobrescrever Opção 01 já editada (`itensSelecionados` presente).

---

## 8. Prompt pronto para colar no ChatGPT

```
Você é nutricionista clínico especializado em obesidade e análogos de GLP-1 (Tirzepatida),
ajudando a definir regras DETERMINÍSTICAS para um app (Oftware).

Leia o arquivo "pratoindividualporpaciente.md" (condutas + catálogo + baseline).

Objetivo: melhorar o dimensionamento da Opção 01 (prato padrão) por paciente,
usando o perfil do wizard e o catálogo de IDs existentes.

Entregue apenas as seções A–G no formato pedido no arquivo.
Seja específico com IDs do catálogo. Evite texto genérico.
Priorize regras simples, testáveis em código if/else.
Assuma população brasileira adulta em tratamento de obesidade.
```

---

## 9. Depois que o ChatGPT responder

1. Colar a resposta em `docs/nutri/pratoindividualporpaciente-REGRAS.md` (novo arquivo).
2. Revisar clinicamente (você / nutri).
3. Implementar em `montarPratoPadraoRefeicao` (e, se fizer sentido, em `calcularValoresSugeridos` / distribuição do wizard).

---

## 10. Lacunas conhecidas do catálogo (pedir sugestão de IDs novos)

Se o ChatGPT precisar de itens que não existem, listar no final:

- id sugerido
- nome
- categoria
- proteína_g / calorias_kcal por porção
- em quais estilos/refeições entra

Exemplos de lacunas atuais: leguminosas além do tofu, whey sem lactose explícito, pão sem glúten, iogurte sem lactose, porções intermediárias (120g frango), sopa digestiva.
