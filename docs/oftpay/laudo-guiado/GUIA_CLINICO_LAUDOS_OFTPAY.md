# Guia Clínico — Laudo Guiado OftPay

**Versão:** 0.1 (documento técnico inicial)  
**Status:** Rascunho para revisão médica — **não implementado em código**  
**Data:** 2026-06-28

---

## Propósito deste documento

Este guia define a estrutura clínica do futuro **Laudo Guiado OftPay**: campos selecionáveis, sequência de preenchimento, frases automáticas, combinações inteligentes, condutas sugeridas, alertas de coerência e payload para IA assistiva.

O modelo atual de Laudos em `/oftpay` (upload de PDF/imagem + extração por IA + interpretação com apostilas) **será abandonado** em favor de um fluxo **guiado pelo médico**, com texto montado a partir de achados explicitamente selecionados ou digitados.

### Princípios de segurança (obrigatórios em qualquer implementação)

1. O médico **sempre** revisa, edita e aprova o laudo final.
2. A IA **não inventa achados** — só interpreta o que foi selecionado ou digitado.
3. Condutas e interpretações são **sugestões** para revisão, nunca prescrição automática.
4. Alertas de coerência são avisos de revisão, não bloqueios clínicos rígidos.
5. Dados sensíveis do paciente permanecem sob controle do médico e da organização.

### Fontes analisadas no projeto OftReview/OftPay

| Fonte | Caminho | O que contribui |
|-------|---------|-----------------|
| Formulário legado — Mapeamento de Retina | `components/RetinaLaudoForm.tsx`, `app/retina/retina_laudo_questionario.txt` | Campos, opções, frases e condutas de fundo de olho |
| Formulário legado — OCT | `components/OctLaudoForm.tsx`, `app/retina/oct_laudo_questionario.txt` | OCT mácula e papila |
| Formulário legado — OCT Papila | `app/retina/octpapila_laudo.js` | RNFL quadrantes, GCL+, TSNI |
| Formulário legado — Gonioscopia | `components/GlaucomaForm.tsx` | Escala de Shaffer, frases automáticas |
| Módulo Córnea | `app/Cornea/topoInputs.ts`, `app/Cornea/oftware_cornea_4_arquivos_microscopia_topografia.ts` | Topografia/Galilei: K, elevações, Ferrara, Rabinowitz, Roush |
| Schema atual laudo-exames (referência) | `lib/oftpay/laudoOftalmoExtraction.ts` | Chaves estruturadas por modalidade |
| Correlações clínicas | `lib/oftpay/glaucomaCorrelation.ts`, `retinaCorrelation.ts`, `corneaCorrelation.ts` | Combinações, thresholds, frases |
| Perguntas clínicas de contexto | `lib/oftpay/clinicalFollowUpQuestions.ts` | Contexto para interpretação futura |
| Apostilas OftReview | GCS `OFTREVIEW 2023/APOSTILAS/` + Discovery Engine | Conteúdo pedagógico em runtime (não embutido neste doc) |

### Escopo deste guia — 6 exames

1. Gonioscopia  
2. Mapeamento de Retina  
3. OCT Mácula  
4. OCT Disco  
5. Topografia  
6. Galilei G4  

---

## Gonioscopia

### 1. Objetivo clínico do exame

Avaliar a anatomia do **ângulo iridocorneano** para classificar o risco de glaucoma de ângulo estreito ou fechado, orientar conduta (observação, iridotomia, encaminhamento) e complementar a avaliação estrutural/funcional do nervo óptico.

### 2. Sequência ideal de preenchimento pelo médico

1. Olho examinado (OD / OE / AO)  
2. Qualidade do exame (colaboração, midríase/indicação, lente de gonioscopia)  
3. **Quadrantes** — Superior, Inferior, Nasal, Temporal (grau Shaffer em cada um)  
4. Achados adicionais do ângulo (sinequias, pigmento, neoformação vascular, massa)  
5. Síntese angular (grau mínimo, interpretação global)  
6. Correlação clínica opcional (PIO, sintomas, ametropia, raça de risco)  
7. Impressão diagnóstica sugerida  
8. Conduta / recomendações  
9. Observações livres  

### 3. Campos selecionáveis

#### Metadados
| Campo | Tipo | Observação |
|-------|------|------------|
| `eye` | radio: OD / OE / AO | Obrigatório |
| `examQuality` | radio: adequado / parcial / limitado | |
| `lensType` | select opcional | Ex.: Goldmann, Zeiss, Koeppe |
| `indentationUsed` | checkbox | Compressão realizada |

#### Achados normais
| Campo | Tipo |
|-------|------|
| `shaffer_superior` | radio: IV / III / II / I / 0 |
| `shaffer_inferior` | radio: IV / III / II / I / 0 |
| `shaffer_nasal` | radio: IV / III / II / I / 0 |
| `shaffer_temporal` | radio: IV / III / II / I / 0 |
| `angleOpenAllQuadrants` | checkbox derivado | Auto quando todos ≥ III |

#### Achados alterados
| Campo | Tipo |
|-------|------|
| `narrowAngle` | checkbox derivado | Grau mínimo ≤ II |
| `occludableAngle` | checkbox derivado | Grau mínimo = II |
| `closedAngle` | checkbox derivado | Grau mínimo = 0 em qualquer quadrante |
| `peripheralAnteriorSynechiae` | checkbox + texto livre |
| `anglePigmentation` | radio: leve / moderada / intensa |
| `neovascularizationAngle` | checkbox |
| `plateauIris` | checkbox |

#### Achados de alerta
| Campo | Tipo |
|-------|------|
| `shaffer0_anyQuadrant` | derivado | Ângulo fechado |
| `shaffer1_multipleQuadrants` | derivado | Risco elevado de fechamento |
| `pasExtensive` | checkbox | Sinequias extensas |

#### Achados que exigem complemento textual
| Campo | Tipo |
|-------|------|
| `otherAngleFindings` | texto livre |
| `clinicalContext` | texto livre | Sintomas, PIO, medicações |
| `indentationFindings` | texto livre | Se compressão alterou classificação |

### 4. Frases automáticas sugeridas

Baseadas em `GlaucomaForm.tsx` (Escala de Shaffer):

| Campo | Frase sugerida |
|-------|----------------|
| Shaffer IV em quadrante | "Quadrante [superior/inferior/nasal/temporal] com ângulo amplamente aberto (Shaffer grau IV)." |
| Shaffer III em quadrante | "Quadrante [X] com ângulo aberto (Shaffer grau III)." |
| Shaffer II em quadrante | "Quadrante [X] com ângulo potencialmente ocluível (Shaffer grau II)." |
| Shaffer I em quadrante | "Quadrante [X] com ângulo estreito (Shaffer grau I)." |
| Shaffer 0 em quadrante | "Quadrante [X] com ângulo fechado (Shaffer grau 0)." |
| Síntese — grau mínimo ≥ IV | "Gonioscopia [OD/OE] com grau mínimo de 4 (Escala de Shaffer) nos quadrantes examinados, caracterizando ângulo amplamente aberto." |
| Síntese — grau mínimo III | "Gonioscopia [OD/OE] com grau mínimo de 3, caracterizando ângulo aberto." |
| Síntese — grau mínimo II | "Gonioscopia [OD/OE] com grau mínimo de 2, caracterizando ângulo potencialmente ocluível (estreito)." |
| Síntese — grau mínimo I | "Gonioscopia [OD/OE] com grau mínimo de 1, caracterizando ângulo estreito." |
| Síntese — grau mínimo 0 | "Gonioscopia [OD/OE] com grau mínimo de 0, caracterizando ângulo fechado." |
| Sinequias | "Presença de sinequias anteriores periféricas [descrever extensão se informado]." |
| Pigmento intenso | "Pigmentação trabecular acentuada." |

### 5. Combinações inteligentes

| Combinação | Interpretação sugerida (revisão médica) |
|------------|----------------------------------------|
| Shaffer 0 ou I em ≥ 2 quadrantes | Suspeita de seio camerular estreito / risco de fechamento angular |
| Shaffer II em todos os quadrantes + hipermetropia (contexto) | Ângulo estreito primário — considerar avaliação para iridotomia profilática |
| Shaffer 0 + PIO elevada (contexto) | Glaucoma agudo de ângulo fechado — urgência oftalmológica |
| Shaffer IV + escavação aumentada (exame correlato) | Padrão compatível com glaucoma primário de ângulo aberto (estrutura-função a correlacionar) |
| Neoformação vascular no ângulo | Glaucoma neovascular — investigar causa sistêmica/retínica |
| Sinequias extensas + PIO elevada | Possível glaucoma secundário por fechamento angular |

### 6. Sugestões de conduta

- Acompanhamento clínico periódico com gonioscopia seriada  
- Solicitar **OCT de disco** e **campimetria visual** para correlação estrutura-função  
- Correlacionar com **paquimetria** e PIO em horários padronizados  
- Avaliação para **iridotomia periférica a laser** (YAG)  
- Encaminhamento para glaucoma especializado  
- Evitar midríase até avaliação angular em ângulos estreitos  
- Considerar pilocarpina / hipotensores conforme contexto clínico (sugestão textual apenas)  
- Solicitar ultrassom biomicroscópico (UBM) se dúvida anatômica  

### 7. Alertas de coerência

| Conflito | Alerta |
|----------|--------|
| Todos quadrantes Shaffer IV + "ângulo fechado" marcado manualmente | Incoerência entre quadrantes e classificação global |
| Shaffer 0 em algum quadrante + "ângulo aberto" na impressão | Revisar classificação global |
| Gonioscopia "não realizada" + impressão de tipo angular | Exame insuficiente para conclusão |
| OD Shaffer IV + OE Shaffer 0 sem menção de assimetria (em laudo binocular) | Sugerir destacar assimetria angular |

### 8. Estrutura final do laudo

```
LAUDO DE GONIOSCOPIA — [OD/OE/AO]
Paciente: [nome] | Data: [data] | Médico: [nome/CRM]

TÉCNICA
[Lente utilizada, compressão, qualidade]

ACHADOS POR QUADRANTE — [OD/OE]
Superior: Shaffer grau [X]. [frases]
Inferior: Shaffer grau [X]. [frases]
Nasal: Shaffer grau [X]. [frases]
Temporal: Shaffer grau [X]. [frases]

ACHADOS ADICIONAIS
[sinequias, pigmento, etc.]

IMPRESSÃO
[Interpretação angular — grau mínimo e tipo sugerido]

CONDUTA / RECOMENDAÇÕES
[sugestões selecionadas + texto livre]

OBSERVAÇÕES
[texto livre]
```

### 9. Campos para IA assistiva futura

```json
{
  "examType": "gonioscopia",
  "eye": "OD|OE|AO",
  "selectedFindings": {
    "shaffer": { "superior": 4, "inferior": 3, "nasal": 3, "temporal": 2 },
    "grauMinimo": 2,
    "pas": false,
    "pigmentacao": "moderada",
    "neovascularizacao": false
  },
  "numericValues": {},
  "freeText": { "observacoes": "", "contextoClinico": "PIO 18 mmHg" },
  "generatedReport": "...",
  "patientContextOptional": {
    "pio": null,
    "ametropia": "hipermetropia",
    "sintomas": ["dor ocular", "halos"],
    "medicacoes": []
  }
}
```

**Instrução para IA:** correlacionar grau Shaffer com risco de fechamento; citar apostilas OftReview sobre glaucoma de ângulo; **não** inferir quadrantes não preenchidos.

---

## Mapeamento de Retina

### 1. Objetivo clínico do exame

Documentar achados do **fundoscópio indireto, biomicroscopia com lente de fundo ou retinografia** para rastreamento e acompanhamento de doenças retinianas, vasculares, do disco óptico e periferia — base para encaminhamento, complementação (OCT, angiografia) e conduta.

### 2. Sequência ideal de preenchimento pelo médico

1. Tipo de exame (MRM, RSH, retinografia colorida/filtros)  
2. Olho(s): OD / OE (preenchimento independente por olho)  
3. **Meios ópticos / vítreo**  
4. **Disco óptico** (cor, contornos, escavação, palidez, crescente, inclinação)  
5. **Mácula**  
6. **Vasos**  
7. **Polo posterior** (vascular)  
8. **Periferia**  
9. Achados específicos (retinopatia diabética, edema macular, patologias adicionais)  
10. Impressão / classificação  
11. Conduta  
12. Observações  

### 3. Campos selecionáveis

Fonte principal: `RetinaLaudoForm.tsx`.

#### Metadados
| Campo | Tipo |
|-------|------|
| `tipoExame` | select: Mapeamento de Retina, RSH, MRM, Retinografia Colorida, Filtro Verde/Vermelho/Azul |
| `eye` | tab OD / OE |

#### Achados normais
| Campo | Tipo |
|-------|------|
| `meiosOpticos` | radio: Transparentes |
| `macula` | checkbox: Reflexo foveal preservado |
| `vasos` | checkbox: Vasos normais |
| `poloPosterior` | checkbox: Normal |
| `periferia` | checkbox: Sem alterações periféricas |
| `retinopatiaDiabetica` | radio: Sem sinais de RD |
| `disco.contornos` | radio: Bem definidos |
| `disco.cor` | radio: Rósea |
| `disco.tipoEscavacao` | radio: Fisiológica |

#### Achados alterados
| Campo | Tipo |
|-------|------|
| `meiosOpticos` | opacidades leves/moderadas/densas, hemorragia vítrea, catarata |
| `macula` | drusas, atrofia EPR, DRS, hemorragia sub-retiniana, edema macular, MER, buraco macular |
| `vasos` | tortuosos, ateroescleróticos, finas, vasculite, telangiectasias, sheathing |
| `poloPosterior` | exsudatos duros, hemorragias intrarretinianas, microaneurismas |
| `periferia` | degeneração lattice, buracos atróficos, ruptura, descolamento, hialóide tracionando, retinosquise |
| `disco` | escavação aumentada (0.1–0.9), palidez, atrofia peripapilar, crescente, inclinação |
| `retinopatiaDiabetica` | RDNP leve/moderada/severa, RD proliferativa |
| `edemaMacular` | checkbox |
| `adicionais` | nevo, papiledema, atrofia óptica, CRSC, uveíte, etc. |

#### Achados de alerta
| Campo | Tipo |
|-------|------|
| `periferia` | Descolamento de retina |
| `periferia` | Ruptura de retina |
| `adicionais` | Papiledema |
| `poloPosterior` | Hemorragias + microaneurismas + exsudatos (conjunto) |
| `disco.escavacao` | ≥ 0.7 ou palidez difusa |

#### Achados que exigem complemento textual
| Campo | Tipo |
|-------|------|
| `disco.palidez` | select + texto se "setorial" |
| `adicionais` | Tumores, uveíte — descrição obrigatória |
| `periferia` | Localização horária do DR/ruptura |
| `observacoes` | texto livre |

#### Campos numéricos
| Campo | Tipo |
|-------|------|
| `disco.tamanhoEscavacao` | select 0.1–0.9 |
| `disco.escavacao` | relação E/D (texto ou select) |

### 4. Frases automáticas sugeridas

| Campo | Frase |
|-------|-------|
| Meios transparentes | "Meios ópticos transparentes." |
| Meios com opacidade | "Meios ópticos com [opacidades leves/moderadas/densas]." |
| Disco róseo, contornos definidos | "Disco óptico róseo, de contornos bem definidos." |
| Escavação fisiológica 0.3 | "Escavação fisiológica de tamanho 0.3, relação escavação/disco dentro dos limites esperados." |
| Escavação aumentada | "Disco óptico com relação escavação/disco aumentada ([valor])." |
| Atrofia peripapilar | "Atrofia peripapilar presente." |
| Crescente escleral | "Crescente escleral presente." |
| Reflexo foveal | "Reflexo foveal preservado." |
| Drusas | "Presença de drusas maculares." |
| MER | "Membrana epirretiniana em mácula." |
| Vasos normais | "Árvore vascular com calibre e trajeto preservados." |
| Polo posterior normal | "Polo posterior sem alterações evidentes." |
| Periferia sem alterações | "Periferia retiniana sem alterações evidentes." |
| RDNP leve | "Presença de retinopatia diabética não proliferativa leve, com poucos microaneurismas e exsudatos." |
| RDNP moderada | "RD não proliferativa moderada, com microaneurismas, hemorragias e exsudatos moderados." |
| RDNP severa | "RD não proliferativa severa, com mais de 20 hemorragias em 4 quadrantes e sinais de isquemia." |
| RD proliferativa | "RD proliferativa, com neovasos e possível hemorragia vítrea." |
| Edema macular | "Edema macular presente." |
| Descolamento periférico | "Descolamento de retina em periferia [complementar localização]." |

### 5. Combinações inteligentes

| Combinação | Interpretação sugerida |
|------------|------------------------|
| Microaneurismas + hemorragias + exsudatos duros | Retinopatia diabética — classificar grau (ETDRS simplificado) |
| Drusas + alteração do EPR | Degeneração macular relacionada à idade (forma seca) |
| Hemorragia sub-retiniana + drusas | Suspeita de DMRI exsudativa / membrana neovascular |
| Escavação aumentada + notch/palidez (disco) | Suspeita de glaucoma ou neuropatia óptica — correlacionar OCT disco/campimetria |
| Degeneração lattice + buracos atróficos | Risco de ruptura — orientar sintomas de alerta e acompanhamento |
| Ruptura de retina | Risco de descolamento — urgência / laser de demarcação |
| Papiledema | Investigar causa intracraniana — **não** fechar diagnóstico no laudo automatizado |
| Exsudatos + vasos ateroescleróticos + HAS (contexto) | Retinopatia hipertensiva |

### 6. Sugestões de conduta

- Manter acompanhamento anual  
- Solicitar **OCT de mácula**  
- Solicitar **angiofluoresceinografia**  
- Solicitar **campo visual**  
- Encaminhar para especialista de retina  
- Iniciar fotocoagulação a laser  
- Iniciar tratamento com **anti-VEGF**  
- Solicitar ultrassom ocular  
- Solicitar ERG / genética (doenças hereditárias)  
- Encaminhar para baixa visão  
- Orientar retorno urgente se fotopsias/moscas/sombra periférica  

### 7. Alertas de coerência

| Conflito | Alerta |
|----------|--------|
| "Sem alterações periféricas" + "Descolamento de retina" | Incoerência periférica |
| "Reflexo foveal preservado" + "Edema macular" + "Buraco macular" | Revisar mácula |
| "Sem sinais de RD" + microaneurismas/hemorragias marcados | Classificação diabética ausente ou incoerente |
| Escavação 0.2 + "escavação aumentada" | Revisar terminologia |
| Meios "opacidades densas" + descrição detalhada de periferia distante | Qualidade limitada — cautela na conclusão |

### 8. Estrutura final do laudo

```
LAUDO DE [TIPO DE EXAME] — [DATA]

OD
Meios ópticos: [...]
Disco óptico: [...]
Mácula: [...]
Vasos: [...]
Polo posterior: [...]
Periferia: [...]
[Classificações específicas]

OE
[mesma estrutura]

IMPRESSÃO DIAGNÓSTICA
[síntese por olho ou binocular]

CONDUTA
[recomendações]

OBSERVAÇÕES
[texto livre]
```

### 9. Campos para IA assistiva futura

```json
{
  "examType": "mapeamento_retina",
  "eye": "OD|OE|AO",
  "selectedFindings": {
    "tipoExame": "Mapeamento de Retina",
    "od": { "meiosOpticos": "Transparentes", "macula": ["Drusas"], "periferia": [] },
    "oe": { }
  },
  "numericValues": { "od": { "escavacao": 0.4 }, "oe": {} },
  "freeText": { "observacoes": "" },
  "generatedReport": "...",
  "patientContextOptional": {
    "diabetes": true,
    "hipertensao": false,
    "sintomas": ["metamorfopsia"],
    "tratamentoPrevio": []
  }
}
```

---

## OCT Mácula

### 1. Objetivo clínico do exame

Quantificar e descrever a **morfologia macular** (espessura, fluidos, camadas, tração vítrea) para diagnóstico e seguimento de edema macular, DMRI, buraco macular, MER, trações e outras maculopatias.

### 2. Sequência ideal de preenchimento pelo médico

1. Olho (OD / OE)  
2. Qualidade do exame (sinal, centration, artefatos)  
3. **Medidas numéricas** (espessura central/foveal)  
4. **Fluidos e espessura** (IRF, SRF, cistos)  
5. **Interface vítreo-macular** (MER, TVM, DVP)  
6. **Camadas retinianas** (EPR, ELM/EZ se aplicável)  
7. **Achados adicionais** (drusas, atrofia, PED)  
8. Comparação com exame prévio (opcional)  
9. Impressão  
10. Conduta  
11. Observações  

### 3. Campos selecionáveis

Fontes: `laudoOftalmoExtraction.ts` (`oct_macula`), `OctLaudoForm.tsx`.

#### Achados normais
| Campo | Tipo |
|-------|------|
| `espessuraNormal` | checkbox derivado | CST ~ 250–300 µm (faixa configurável) |
| `semFluido` | checkbox derivado | Sem IRF/SRF/cistos |
| `perfilFovealPreservado` | checkbox |
| `integridadeEPR` | radio: Íntegra |
| `integridadeZEL` | radio: Íntegra |

#### Achados alterados
| Campo | Tipo |
|-------|------|
| `fluido_intrarretiniano` | checkbox / grau leve-moderado-severo |
| `fluido_subrretiniano` | checkbox |
| `cistos` | checkbox |
| `ped` | checkbox (descolamento do EPR) |
| `membrana_epirretiniana` | checkbox |
| `tracao_vitreo_macular` | checkbox |
| `alteracoesMaculares` | edema intra/sub, DRS, hemorragia sub-retiniana, drusas |
| `alteracoesVitreas` | DVP, TVM, MER |
| `sinaisAdicionais` | atrofia central, DMRI, EMD, buraco macular |
| `integridadeEPR` | desorganização / ausente |
| `observacoes_maculares` | texto estruturado |

#### Achados de alerta
| Campo | Tipo |
|-------|------|
| `fluido_subrretiniano` + `drusas` | Suspeita NV/DMRI exsudativa |
| `espessura_central` > 350 µm (configurável) | Espessamento significativo |
| `tracao_vitreo_macular` + `cistos` | Risco de progressão / buraco |
| `descolamento_neurossensorial` | Urgência relativa |

#### Campos numéricos
| Campo | Tipo | Referência (sugestão UI) |
|-------|------|--------------------------|
| `espessura_central` | number (µm) | VN ~ 250–300 µm |
| `espessura_foveal` | number (µm) | |
| `volume_macular` | number (mm³) | opcional |

#### Complemento textual obrigatório
- Localização de fluido (subfoveal, parafoveal)  
- Presença de hiper-refletividade subfoveal  
- Comentário sobre qualidade / motion  

### 4. Frases automáticas sugeridas

| Campo | Frase |
|-------|-------|
| Espessura 285 µm | "Espessura central macular de 285 µm, dentro dos valores de referência." |
| Espessura aumentada | "Espessura central macular aumentada ([valor] µm)." |
| Sem fluido | "Ausência de fluido intrarretiniano ou sub-retiniano." |
| IRF | "Presença de fluido intrarretiniano [leve/moderado/acentuado]." |
| SRF | "Presença de fluido sub-retiniano." |
| Cistos | "Cistos intrarretinianos em mácula." |
| PED | "Descolamento do epitélio pigmentar da retina." |
| MER | "Membrana epirretiniana com tração da interface vítreo-macular." |
| TVM | "Tração vítreo-macular." |
| DVP | "Descolamento do vítreo posterior." |
| EPR íntegra | "Integridade do EPR preservada." |
| DMRI | "Achados compatíveis com degeneração macular relacionada à idade." |
| EMD | "Achados compatíveis com edema macular diabético." |
| Buraco macular | "Alterações compatíveis com buraco macular." |

### 5. Combinações inteligentes

| Combinação | Interpretação sugerida |
|------------|------------------------|
| Líquido sub-retiniano + drusas | DMRI exsudativa / possível membrana neovascular |
| IRF + espessura > 300 µm + diabetes (contexto) | Edema macular diabético |
| TVM + MER + espessamento foveal | Interface vítreo-macular alterada — considerar conduta cirúrgica |
| Cistos + IRF sem diabetes | DME, CRVO, uveíte — correlacionar clínica |
| Atrofia central + drusas | DMRI geográfica / forma seca avançada |
| Espessura normal + MER fina | MER estável — acompanhamento |

### 6. Sugestões de conduta

- Acompanhamento clínico  
- Iniciar / considerar **anti-VEGF**  
- Solicitar **angiofluoresceinografia** ou OCT-A  
- Encaminhar para retina  
- Correlacionar com **mapeamento de retina**  
- Comparação seriada em 4–12 semanas  
- Considerar vitrectomia / membranotomia (encaminhamento)  

### 7. Alertas de coerência

| Conflito | Alerta |
|----------|--------|
| "Perfil foveal preservado" + IRF/SRF marcado | Revisar achados |
| CST normal + edema macular marcado na impressão | Incoerência |
| MER + "interface vítreo-macular normal" | Revisar interface |
| OD com fluido + OE "normal" sem menção de assimetria em laudo AO | Destacar assimetria |

### 8. Estrutura final do laudo

```
LAUDO DE OCT DE MÁCULA — [OD/OE] — [DATA]

QUALIDADE DO EXAME
[adequada / limitada]

MEDIDAS
Espessura central: [X] µm (referência: [faixa])

DESCRIÇÃO ESTRUTURAL
[fluidos, camadas, MER, TVM, EPR]

IMPRESSÃO
[hipótese principal — sugestão]

CONDUTA
[sugestões]

OBSERVAÇÕES
```

### 9. Campos para IA assistiva futura

```json
{
  "examType": "oct_macula",
  "eye": "OD",
  "selectedFindings": {
    "fluido_intrarretiniano": true,
    "fluido_subrretiniano": false,
    "membrana_epirretiniana": false,
    "drusas": true
  },
  "numericValues": { "espessura_central": 312 },
  "freeText": { "observacoes_maculares": "IRF subfoveal" },
  "generatedReport": "...",
  "patientContextOptional": {
    "sintomas": ["metamorfopsia"],
    "diabetes": true,
    "tratamentoAntiVEGFPrevio": false
  }
}
```

---

## OCT Disco

### 1. Objetivo clínico do exame

Avaliar **estrutura do nervo óptico** (RNFL, camada de células ganglionares, escavação) para diagnóstico e seguimento de glaucoma e neuropatias ópticas — correlação com campimetria e clínica.

### 2. Sequência ideal de preenchimento pelo médico

1. Olho (OD / OE)  
2. Qualidade / artefatos (descentração, sinal baixo)  
3. **Escavação** (vertical, horizontal, relação E/D)  
4. **RNFL** — global e quadrantes (S/I/N/T)  
5. **GCL+ / macular ganglion cell** (se disponível)  
6. **Assimetria interocular**  
7. Mapa de desvio / curva TSNI (descrição)  
8. Comparação longitudinal  
9. Impressão  
10. Conduta  
11. Observações  

### 3. Campos selecionáveis

Fontes: `laudoOftalmoExtraction.ts` (`oct_disco`), `octpapila_laudo.js`, `OctLaudoForm.tsx` (papila).

#### Achados normais
| Campo | Tipo |
|-------|------|
| `rnfl_global` | number dentro da faixa verde (µm) |
| `rnfl_quadrantes` | todos "dentro dos limites" |
| `escavacao` | ≤ 0.5–0.6 |
| `camada_ganglionar` | Preservada |
| `assimetria` | ausente |

#### Achados alterados
| Campo | Tipo |
|-------|------|
| `rnfl_global` | reduzido / borderline |
| `rnfl_superior/inferior/nasal/temporal` | number (µm) |
| `rnfl_reduzido_inferior` | checkbox derivado | < 95 µm (threshold projeto) |
| `rnfl_reduzido_superior` | checkbox derivado |
| `escavacao` | 0.3–0.9 |
| `escavacao_vertical` | number/text |
| `escavacao_horizontal` | number/text |
| `assimetria` | checkbox |
| `camada_ganglionar` | reduzida / ausente |
| `localizacao_perda` | texto (ex.: IT, SN) |
| `curva_tsni` | texto: normal / adelgaçada |
| `mapa_calor` | texto |
| `observacoes_estruturais` | texto |

#### Achados de alerta
| Campo | Tipo |
|-------|------|
| RNFL global < 90 µm | Afinamento difuso |
| Escavação ≥ 0.7 | Suspeita glaucoma avançado |
| Assimetria RNFL > 10 µm entre olhos | Assimetria estrutural |
| GCL+ ausente em setor | Perda neuronal focal |

#### Campos numéricos
| Campo | Unidade |
|-------|---------|
| `rnfl_global` | µm |
| `rnfl_superior/inferior/nasal/temporal` | µm |
| `escavacao` | proporção 0.0–1.0 |
| `tamanho_disco` | µm ou small/large |

### 4. Frases automáticas sugeridas

| Campo | Frase |
|-------|-------|
| RNFL preservado | "RNFL com espessuras dentro dos limites da normalidade." |
| RNFL reduzido inferior | "Adelgaçamento do RNFL no setor inferior ([valor] µm)." |
| RNFL global 82 µm | "RNFL médio global de 82 µm, abaixo dos valores esperados." |
| Escavação 0.5 | "Relação escavação/disco de 0.5." |
| Escavação aumentada | "Aumento da relação escavação/disco ([valor])." |
| Assimetria | "Assimetria estrutural entre os olhos." |
| GCL+ reduzida | "Redução da camada de células ganglionares (GCL+)." |
| Curva TSNI adelgaçada | "Curva TSNI com adelgaçamento em [setor]." |
| OCT disco alterado | "OCT de disco com achados estruturais sugestivos, a correlacionar com contexto clínico e campimetria." |

### 5. Combinações inteligentes

| Combinação | Interpretação sugerida |
|------------|------------------------|
| RNFL inferior reduzido + escavação ↑ | Padrão compatível com glaucoma — correlacionar campimetria |
| RNFL normal + escavação grande | Disco grande fisiológico vs glaucoma — ver tamanho do disco |
| Assimetria RNFL + assimetria escavação | Suspeita de glaucoma assimétrico |
| RNFL reduzido + palidez (fundoscopia) | Neuropatia óptica — investigar etiologia |
| Progressão RNFL (longitudinal) | Possível progressão glaucomatosa |
| RNFL borderline + PIO elevada (contexto) | Risco elevado — seguimento estreito |

*Thresholds do projeto (`glaucomaCorrelation.ts`): RNFL global < 90 µm; superior/inferior < 95 µm; escavação ≥ 0.6.*

### 6. Sugestões de conduta

- Solicitar **campimetria visual**  
- Correlacionar com **mapeamento de retina** / escavação clínica  
- Correlacionar com **PIO** e paquimetria  
- Acompanhamento seriado (4–6 meses)  
- Encaminhar para glaucoma  
- Considerar hipotensão ocular  
- Avaliar causa não glaucomatosa se discordância estrutura-função  

### 7. Alertas de coerência

| Conflito | Alerta |
|----------|--------|
| "RNFL preservado" + valores < 90 µm digitados | Incoerência |
| "OCT normal" + edema macular (outro exame) | Domínios diferentes — ok, mas não misturar no laudo de disco |
| Escavação 0.3 + "escavação aumentada" | Revisar terminologia |
| Campimetria normal + RNFL muito reduzido | Discordância estrutura-função — investigar |

### 8. Estrutura final do laudo

```
LAUDO DE OCT DE DISCO / PAPILA — [OD/OE] — [DATA]

QUALIDADE
[adequada / limitada]

ESCAVAÇÃO
Vertical: [X] | Horizontal: [Y] | E/D: [Z]

RNFL (µm)
Global: [ ] | S: [ ] | I: [ ] | N: [ ] | T: [ ]

GCL+ / CÉLULAS GANGLIONARES
[descrição]

ASSIMETRIA / PROGRESSÃO
[se houver]

IMPRESSÃO
[sugestão]

CONDUTA
[sugestões]

OBSERVAÇÕES
```

### 9. Campos para IA assistiva futura

```json
{
  "examType": "oct_disco",
  "eye": "OD",
  "selectedFindings": {
    "rnfl_reduzido_inferior": true,
    "assimetria": true
  },
  "numericValues": {
    "rnfl_global": 88,
    "rnfl_inferior": 82,
    "escavacao": 0.65
  },
  "freeText": { "observacoes_estruturais": "adelgaçamento IT" },
  "generatedReport": "...",
  "patientContextOptional": {
    "pio": 22,
    "historiaGlaucoma": false,
    "campimetriaDisponivel": false
  }
}
```

---

## Topografia

### 1. Objetivo clínico do exame

Mapear a **curvatura anterior da córnea** para diagnóstico de astigmatismo, ectasia (ceratocone), avaliação pré-refrativa e acompanhamento de progressão.

### 2. Sequência ideal de preenchimento pelo médico

1. Olho (OD / OE)  
2. Equipamento / mapa (Pentacam, Orbscan, etc.)  
3. **Curvaturas** (K1, K2, Km/Kmax)  
4. **Astigmatismo** (valor e eixo)  
5. **Padrão de curvatura** (simétrico, assimetria, inferior steep)  
6. **Índices de ectasia** (IS, SRAX, Rabinowitz)  
7. Correlação com paquimetria (se disponível)  
8. Impressão (padrão Ferrara se aplicável)  
9. Conduta  
10. Observações  

### 3. Campos selecionáveis

Fontes: `laudoOftalmoExtraction.ts` (`topografia`), `topoInputs.ts`, módulo córnea.

#### Achados normais
| Campo | Tipo |
|-------|------|
| `km` | 41–46 D (faixa configurável) |
| `astigmatismo` | < 2 D |
| `padrao_curvatura` | simétrico / bowtie regular |
| `sinais_sugestivos_ectasia` | ausente |
| `ferraraPattern` | astigmatic |

#### Achados alterados
| Campo | Tipo |
|-------|------|
| `k1`, `k2`, `km` | number (D) |
| `astigmatismo` | number (D) |
| `eixo` | number (°) |
| `padrao_curvatura` | texto / select: assimetria inferior, irregular, SK |
| `KmaxD` | number |
| `ISvalue` | number (índice I-S) |
| `SRAXdeg` | number |
| `ferraraPattern` | nipple / oval / astigmatic / indefinido |
| `sinais_sugestivos_ectasia` | checkbox + texto |
| `rabinowitzPositive` | derivado |
| `roushDeltaPachy` | number (se paquimetria pareada) |

#### Achados de alerta
| Campo | Tipo |
|-------|------|
| Km ≥ 47 D ou K2 ≥ 47.5 D | Curvatura acentuada (`corneaCorrelation.ts`) |
| IS ≥ 1.4 ou SRAX > 21° | Rabinowitz positivo |
| Padrão nipple/oval + Kmax elevado | Suspeita ceratocone |

#### Campos numéricos
K1, K2, Km, Kmax, astigmatismo, eixo, IS, SRAX — todos em unidades padrão.

### 4. Frases automáticas sugeridas

| Campo | Frase |
|-------|-------|
| K1/K2 normais | "Ceratometria anterior: K1 [X] D a [eixo]° e K2 [Y] D a [eixo]°." |
| Astigmatismo 1.25 D | "Astigmatismo corneano de 1,25 D." |
| Padrão simétrico | "Topografia com padrão de curvatura simétrico, sem sinais sugestivos de ectasia." |
| Padrão irregular | "Topografia com padrão de curvatura irregular." |
| Suspeita ectasia | "Topografia com padrão de curvatura sugestivo de alteração estrutural." |
| Ferrara nipple | "Padrão topográfico (Ferrara): nipple." |
| Ferrara oval | "Padrão topográfico (Ferrara): oval." |
| Rabinowitz + | "Índices topográficos compatíveis com critérios de suspeição (Rabinowitz)." |

### 5. Combinações inteligentes

| Combinação | Interpretação sugerida |
|------------|------------------------|
| K elevado + IS alto + SRAX > 21° | Suspeita de ceratocone |
| Assimetria K OD vs OE > 1.5 D | Astigmatismo irregular / forme fruste — comparar tomografia |
| Padrão inferior steep + jovem + coceira (contexto) | Risco ectasia progressiva |
| Topografia normal + paquimetria fina | Córnea fina — cautela pré-refrativa |
| Cirurgia refrativa prévia (contexto) + irregularidade | Ectasia iatrogênica — tomografia seriada |

### 6. Sugestões de conduta

- Acompanhamento com topografia seriada  
- Solicitar **Galilei / tomografia Scheimpflug**  
- Solicitar **paquimetria**  
- Correlacionar com refração e aberrometria  
- Evitar cirurgia refrativa se ectasia suspeita  
- Encaminhar para córnea / ceratocone  
- Orientar evitar coceira ocular  
- Considerar crosslinking (encaminhamento especializado)  

### 7. Alertas de coerência

| Conflito | Alerta |
|----------|--------|
| "Sem ectasia" + Ferrara nipple + Kmax > 52 D | Revisar conclusão |
| Astigmatismo 0 + K1 ≠ K2 informados | Revisar dados numéricos |
| OD topografia normal + OE ectasia sem nota de assimetria | Destacar assimetria |

### 8. Estrutura final do laudo

```
LAUDO DE TOPOGRAFIA CORNEANA — [OD/OE] — [DATA]

EQUIPAMENTO
[nome]

CURVATURAS
K1: [ ] D @ [ ]° | K2: [ ] D @ [ ]° | Km/Kmax: [ ] D

ASTIGMATISMO
[valor] D a [eixo]°

PADRÃO
[descrição / Ferrara]

ÍNDICES
IS: [ ] | SRAX: [ ]° | [outros]

IMPRESSÃO
[sugestão]

CONDUTA
[sugestões]

OBSERVAÇÕES
```

### 9. Campos para IA assistiva futura

```json
{
  "examType": "topografia",
  "eye": "OD",
  "selectedFindings": {
    "padrao_curvatura": "assimetria inferior",
    "ferraraPattern": "oval",
    "sinais_sugestivos_ectasia": true
  },
  "numericValues": { "k1": 44.2, "k2": 46.8, "km": 45.5, "ISvalue": 1.6, "SRAXdeg": 24 },
  "freeText": { "equipment": "Pentacam" },
  "generatedReport": "...",
  "patientContextOptional": {
    "cirurgiaRefrativaPrevia": false,
    "coceiraOcular": true,
    "idade": 22
  }
}
```

---

## Galilei G4

### 1. Objetivo clínico do exame

Tomografia corneana **Scheimpflug** (dual Scheimpflug — Ziemer Galilei G4) para análise **anterior e posterior** da córnea: curvaturas, espessura, elevações, índices de ectasia — referência em triagem de ceratocone e planejamento refrativo.

### 2. Sequência ideal de preenchimento pelo médico

1. Olho (OD / OE)  
2. Confirmação equipamento: **Galilei G4**  
3. Qualidade do exame (fixação, movimento)  
4. **Curvaturas** (K1, K2, Km)  
5. **Paquimetria** (mínima, apex, mapa pachymétrico)  
6. **Elevações** (anterior e posterior)  
7. **Índices de ectasia** (BAD-D, ARTmax, DSI, OSI, etc. — conforme relatório)  
8. Padrão morfológico (Ferrara / cone)  
9. Comparação interocular e longitudinal  
10. Impressão  
11. Conduta  
12. Observações  

### 3. Campos selecionáveis

Fontes: `laudoOftalmoExtraction.ts` (`galilei`), `topoInputs.ts`, `corneaCorrelation.ts`.

> **Nota de implementação:** o schema atual OftPay usa `galilei` genérico. Este guia expande para nomenclatura **G4** com índices específicos do relatório Ziemer.

#### Achados normais
| Campo | Tipo |
|-------|------|
| `km` | dentro da faixa esperada |
| `paquimetria_minima` | ≥ 500 µm |
| `elevacao_anterior` | baixa / dentro do normal |
| `elevacao_posterior` | < 15–20 µm |
| `indices_ectasia` | dentro do verde |
| `sinais_sugestivos_ectasia` | ausente |
| `ferraraPattern` | astigmatic / normal |

#### Achados alterados
| Campo | Tipo |
|-------|------|
| `k1`, `k2`, `km` | number (D) |
| `paquimetria_minima` | number (µm) |
| `apexLocation` | texto |
| `elevacao_anterior` | number (µm) |
| `elevacao_posterior` | number (µm) |
| `indices_ectasia` | texto estruturado / BAD-D, ARTmax, etc. |
| `epithelialPattern` | warpage / cone-afinamento / normal |
| `ISvalue`, `SRAXdeg` | number |
| `roushDeltaPachyUm` | number |
| `sinais_sugestivos_ectasia` | checkbox |

#### Achados de alerta
| Campo | Tipo |
|-------|------|
| `paquimetria_minima` < 500 µm | Córnea fina (`corneaCorrelation.ts`) |
| `paquimetria_minima` < 480 µm | Alerta alto |
| `elevacao_posterior` > 20 µm | Elevação posterior significativa |
| BAD-D / índices no vermelho | Alto risco ectasia |
| Progressão vs exame anterior | Ectasia progressiva |

#### Campos numéricos
Todas as medidas acima + espessura central se distinta da mínima.

#### Complemento textual
- Descrição do mapa de elevação posterior  
- Localização do ápice  
- Comparação com topografia isolada (se houver)  

### 4. Frases automáticas sugeridas

| Campo | Frase |
|-------|-------|
| Exame G4 | "Tomografia corneana de dupla câmera Scheimpflug (Galilei G4)." |
| Paquimetria mínima 520 µm | "Paquimetria mínima de 520 µm." |
| Paquimetria fina | "Paquimetria corneana reduzida (mínima [X] µm)." |
| Elevação posterior 25 µm | "Elevação posterior de 25 µm no ápice." |
| Índices alterados | "Índices tomográficos de ectasia alterados ([especificar])." |
| Sem ectasia | "Tomografia sem sinais estruturais sugestivos de ectasia." |
| Suspeita ectasia | "Galilei com sinais estruturais que reforçam suspeita corneana." |
| Padrão Ferrara | "Padrão morfológico compatível com [nipple/oval/astigmatic]." |
| Roush positivo | "Diferença paquimétrica (Roush) superior a 100 µm." |

### 5. Combinações inteligentes

| Combinação | Interpretação sugerida |
|------------|------------------------|
| Elevação posterior ↑ + paquimetria mínima ↓ | Padrão tomográfico de ectasia |
| Kmax elevado + BAD-D alterado | Ceratocone / suspeita alta |
| Galilei alterado + topografia normal | Forme frusta — priorizar tomografia |
| Paquimetria fina + índices limítrofes | Cautela pré-refrativa |
| Progressão elevação posterior (longitudinal) | Ectasia progressiva — considerar crosslinking |
| Epitelial warpage + curvatura irregular | Distinguir artefato epitelial vs ectasia verdadeira |

### 6. Sugestões de conduta

- Repetir exame com boa fixação se qualidade limitada  
- Topografia complementar / comparação  
- Acompanhamento tomográfico seriado (6–12 meses)  
- Encaminhar para serviço de córnea  
- Evitar LASIK / considerar PRK com cautela  
- Crosslinking corneano (encaminhamento)  
- Lentes rígidas gasosas — encaminhamento  
- Correlacionar com refração e idade  

### 7. Alertas de coerência

| Conflito | Alerta |
|----------|--------|
| "Tomografia normal" + elevação posterior > 20 µm | Revisar conclusão |
| Paquimetria mínima 450 µm + "paquimetria preservada" | Incoerência |
| OD Galilei alterado + OE normal sem comentário em paciente jovem | Sugerir screening familiar |

### 8. Estrutura final do laudo

```
LAUDO DE TOMOGRAFIA CORNEANA — GALILEI G4 — [OD/OE] — [DATA]

QUALIDADE DO EXAME
[adequada / limitada]

CURVATURAS
K1: [ ] | K2: [ ] | Km: [ ]

PAQUIMETRIA
Mínima: [ ] µm | Ápice: [localização]

ELEVAÇÕES
Anterior: [ ] µm | Posterior: [ ] µm

ÍNDICES DE ECTASIA
[BAD-D, ARTmax, outros conforme relatório]

PADRÃO MORFOLÓGICO
[Ferrara / descrição]

IMPRESSÃO
[sugestão]

CONDUTA
[sugestões]

OBSERVAÇÕES
```

### 9. Campos para IA assistiva futura

```json
{
  "examType": "galilei_g4",
  "eye": "OD",
  "selectedFindings": {
    "sinais_sugestivos_ectasia": true,
    "ferraraPattern": "nipple",
    "epithelialPattern": "cone-afinamento-apical"
  },
  "numericValues": {
    "km": 48.2,
    "paquimetria_minima": 468,
    "elevacao_posterior": 28,
    "elevacao_anterior": 12
  },
  "freeText": {
    "indices_ectasia": "BAD-D borderline",
    "apexLocation": "inferotemporal"
  },
  "generatedReport": "...",
  "patientContextOptional": {
    "cirurgiaRefrativaPrevia": false,
    "exameAnteriorDisponivel": true
  }
}
```

---

## Modelo de dados unificado (referência para implementação)

```typescript
// Proposta — não implementado
type LaudoGuiadoExamType =
  | 'gonioscopia'
  | 'mapeamento_retina'
  | 'oct_macula'
  | 'oct_disco'
  | 'topografia'
  | 'galilei_g4';

interface LaudoGuiadoSession {
  examType: LaudoGuiadoExamType;
  patientId?: string;
  organizationId?: string;
  physicianId: string;
  eyes: {
    od?: ExamEyeFindings;
    oe?: ExamEyeFindings;
  };
  binocularFindings?: Record<string, unknown>;
  impression?: string;
  conduct?: string[];
  observations?: string;
  generatedReport?: string;
  physicianApproved: boolean;
  approvedAt?: string;
}

interface ExamEyeFindings {
  selectedFindings: Record<string, boolean | string | string[]>;
  numericValues: Record<string, number>;
  freeText: Record<string, string>;
}
```

---

## Mapeamento: sistema legado → Laudo Guiado

| Exame | Formulário legado | Schema laudo-exames (abandonado) | Este guia |
|-------|-------------------|----------------------------------|-----------|
| Gonioscopia | `GlaucomaForm.tsx` | ❌ não existia | `gonioscopia` |
| Mapeamento de Retina | `RetinaLaudoForm.tsx` | `retinografia` (parcial) | `mapeamento_retina` |
| OCT Mácula | `OctLaudoForm.tsx` | `oct_macula` | `oct_macula` (expandido) |
| OCT Disco | `octpapila_laudo.js` | `oct_disco` | `oct_disco` (expandido) |
| Topografia | `topoInputs.ts` + Córnea | `topografia` | `topografia` (expandido) |
| Galilei G4 | parcial em Córnea | `galilei` genérico | `galilei_g4` |

---

## Etapa Retina Map Editor (v0.1 — implementado)

**Rota principal:** `/oftpay/curso/laudo-exames`  
**Redirect:** `/oftpay/laudos/retina` → curso oficial  
**Status:** substitui o workspace antigo de upload+IA (`LaudoExamesWorkspace`) no curso laudo-exames. Sem IA, sem Firestore.

### Arquitetura criada

```
app/oftpay/curso/[courseId]/page.tsx  (courseId === laudo-exames)
  └── LaudoGuiadoWorkspace
        └── RetinaGuidedReportBuilder
              ├── RetinaMapSvg → RetinaFindingLayer
              ├── RetinaFindingModal
              └── lib/oftpay/retinaReportGenerator.ts

app/oftpay/laudos/retina/page.tsx → redirect para o curso
```

### Componentes

| Arquivo | Responsabilidade |
|---------|------------------|
| `RetinaGuidedReportBuilder.tsx` | Orquestração: abas OD/OE, lista, preview, copiar, limpar |
| `RetinaMapSvg.tsx` | Retina esquemática (disco, mácula, vasos), hit-test no clique |
| `RetinaFindingLayer.tsx` | Desenho de cada achado no mapa |
| `RetinaFindingModal.tsx` | Formulário pós-clique para registrar achado |

### Tipos (`types/oftpay/retinaMap.ts`)

- `EyeSide`, `RetinaFindingType` (15 tipos), `RetinaFinding`
- `RetinaRegion`: macula, disco, polo_posterior, periferia
- `RetinaQuadrant`: 8 quadrantes + cardinais
- Metadados opcionais: `severity`, `quantity`, `size`, `notes`, `clockHour`
- Posição normalizada `x`/`y` (0–1) no SVG

### Limitações da primeira versão

- Não inclui campos de **meios ópticos**, **disco detalhado** nem **classificação ETDRS** — apenas achados marcados no mapa.
- Geometria de região/quadrante/hora é **heurística** no SVG, não substitui desenho anatômico preciso.
- Impressão e conduta são **templates genéricos** para revisão; não há alertas de coerência ainda.
- **Sem persistência** — “Salvar rascunho” é apenas feedback visual.
- **Sem IA** — nenhuma chamada a Gemini ou Discovery Engine.
- `LaudoExamesWorkspace` (upload PDF + IA) **deixou de ser usado** no curso; código legado mantido no repositório.

### Próximos passos (Mapeamento de Retina)

1. Campos estruturados fora do mapa: meios ópticos, disco (escavação E/D), RD ETDRS.
2. Alertas de coerência (ex.: descolamento + periferia normal).
3. Persistência Firestore + vínculo a paciente.
4. Exportação PDF com cabeçalho da organização.
5. Botão “Sugerir interpretação com OftReview” (fase posterior).
6. Integração opcional no menu OftPay após validação clínica.

---

## Próximas etapas sugeridas

### 1. Criar schema dos exames
- Definir `types/oftpay/laudoGuiado.ts` com enums, campos e frases por `examType`.
- Migrar opções de `RetinaLaudoForm`, `GlaucomaForm`, `OctLaudoForm`, `topoInputs` e `laudoOftalmoExtraction.ts`.
- Versionar schema (`schemaVersion: 1`) para evolução sem quebrar laudos arquivados.

### 2. Criar UI guiada
- Wizard por exame com sequência definida neste guia (accordion por seção, OD/OE em abas).
- Checkboxes/radios/números conforme seção 3 de cada exame.
- Indicador de completude por seção (similar ao checklist de `laudoOftalmoChecklist.ts`).

### 3. Criar preview do laudo em tempo real
- Montagem de texto a partir das frases da seção 4 (template engine simples).
- Painel lateral com laudo editável (médico pode alterar antes de aprovar).

### 4. Criar geração de PDF
- Layout com cabeçalho da organização (branding white-label).
- OD/OE separados; impressão diagnóstica e conduta no final.

### 5. Criar biblioteca de frases por médico
- Frases padrão OftPay + overrides do médico (`physicianPhraseLibrary`).
- Permitir sinônimos e ordem de parágrafos preferida.

### 6. Criar botão “Sugerir interpretação com OftReview”
- Enviar payload da seção 9 para IA com apostilas (Discovery Engine).
- Prompt: *interpretar apenas selectedFindings + numericValues + freeText*; citar fontes `[n]`.
- Exibir como rascunho separado da impressão do médico.

### 7. Criar alertas de coerência
- Regras da seção 7 de cada exame como validação em tempo real (não bloqueante).
- Reaproveitar lógica de `glaucomaCorrelation`, `retinaCorrelation`, `corneaCorrelation` onde aplicável.

### 8. Criar histórico de laudos do paciente
- Firestore: `oftpay_laudo_guiado_cases` (privado por organização).
- Comparativo longitudinal (OCT, topografia) inspirado em `laudoOftalmoTemporal.ts`.
- Exportação e auditoria (quem aprovou, quando).

---

## Checklist de revisão médica (preencher pelo revisor)

- [ ] Sequências de preenchimento estão clinicamente adequadas  
- [ ] Listas de campos não omitiram achados relevantes da prática  
- [ ] Frases automáticas estão em linguagem laudável padrão  
- [ ] Combinações inteligentes não induzem diagnóstico indevido  
- [ ] Condutas sugeridas estão alinhadas ao protocolo do serviço  
- [ ] Alertas de coerência são úteis e não excessivos  
- [ ] Payload de IA está completo e seguro  

---

*Documento gerado a partir da análise do repositório Oftware/OftPay. Conteúdo pedagógico das apostilas OftReview deve ser validado contra o índice Discovery Engine em implementação futura.*
