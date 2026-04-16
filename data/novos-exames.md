# Painel Laboratorial Padrão – Tratamento com Tirzepatida

Este painel contempla **apenas exames obrigatórios**, para avaliação inicial e seguimento de pacientes em uso de tirzepatida, alinhado a protocolos de emagrecimento, preservação de massa magra e segurança metabólica.

---

## Mapeamento por Sistema (Onde Cada Exame Está Implementado)

| # | Categoria | Exame | Key labRanges | Campo ExamesLaboratoriais | Referência H | Referência M | Unidade | Módulos |
|---|-----------|-------|---------------|---------------------------|--------------|--------------|---------|---------|
| **1. Metabolismo Glicêmico** |
| 1 | metabolismo | Glicemia de jejum | `fastingGlucose` | `glicemiaJejum` | 70-99 | 70-99 | mg/dL | meta, metaadmin, metanutri, metapersonal |
| 2 | metabolismo | Hemoglobina glicada (HbA1c) | `hba1c` | `hemoglobinaGlicada` | <5,7 | <5,7 | % | meta, metaadmin, metanutri, metapersonal |
| 3 | metabolismo | Insulina de jejum | `fastingInsulin` | `insulinaJejum` | 2-25 | 2-25 | µUI/mL | meta, metaadmin, metanutri, metapersonal |
| **2. Perfil Lipídico** |
| 4 | lipideos | Colesterol total | `cholTotal` | `colesterolTotal` | <190 | <190 | mg/dL | meta, metaadmin, metanutri, metapersonal |
| 5 | lipideos | LDL-colesterol | `ldl` | `ldl` | <100 | <100 | mg/dL | meta, metaadmin, metanutri, metapersonal |
| 6 | lipideos | HDL-colesterol | `hdl` | `hdl` | >40 (H) >50 (F) | mg/dL | meta, metaadmin, metanutri, metapersonal |
| 7 | lipideos | Triglicerídeos | `tg` | `triglicerides` | <150 | <150 | mg/dL | meta, metaadmin, metanutri, metapersonal |
| **3. Função Hepática** |
| 8 | hepatobiliar | TGO (AST) | `ast` | `tgo` | <40 | <35 | U/L | meta, metaadmin, metanutri, metapersonal |
| 9 | hepatobiliar | TGP (ALT) | `alt` | `tgp` | <41 | <33 | U/L | meta, metaadmin, metanutri, metapersonal |
| 10 | hepatobiliar | GGT | `ggt` | `ggt` | <55 | <38 | U/L | meta, metaadmin, metanutri, metapersonal |
| **4. Função Renal e Eletrólitos** |
| 11 | renal | Creatinina | `creatinine` | `creatinina` | 0,7-1,3 | 0,6-1,1 | mg/dL | meta, metaadmin, metanutri, metapersonal |
| 12 | renal | Ureia | `urea` | `ureia` | 15-45 | 15-45 | mg/dL | meta, metaadmin, metanutri, metapersonal |
| 13 | renal | Sódio | `sodium` | `sodio` | 135-145 | 135-145 | mEq/L | meta, metaadmin, metanutri, metapersonal |
| 14 | renal | Potássio | `potassium` | `potassio` | 3,5-5,1 | 3,5-5,1 | mEq/L | meta, metaadmin, metanutri, metapersonal |
| **5. Função Tireoidiana** |
| 15 | tireoide | TSH | `tsh` | `tsh` | 0,4-4,5 | 0,4-4,5 | µUI/mL | meta, metaadmin, metanutri, metapersonal |
| 16 | tireoide | T4 Livre | `ft4` | `t4Livre` | 0,8-1,8 | 0,8-1,8 | ng/dL | meta, metaadmin, metanutri, metapersonal |
| **6. Vitaminas e Micronutrientes** |
| 17 | ferroVitaminas | Vitamina D (25-OH) | `vitaminD` | `vitaminaD` | 30-60 | 30-60 | ng/mL | meta, metaadmin, metanutri, metapersonal |
| 18 | ferroVitaminas | Vitamina B12 | `b12` | `vitaminaB12` | 200-900 | 200-900 | pg/mL | meta, metaadmin, metanutri, metapersonal |
| 19 | ferroVitaminas | Ferritina | `ferritin` | `ferritina` | 30-400 | 15-150 | ng/mL | meta, metaadmin, metanutri, metapersonal |
| **7. Estado Nutricional** |
| 20 | estadoNutricional | Albumina | `albumin` | `albumina` | 3,5-5,0 | 3,5-5,0 | g/dL | meta, metaadmin, metanutri, metapersonal |

---

## Estrutura por Arquivo do Sistema

### 1. `types/labRanges.ts`
- **labRanges**: Define faixas min/max e unidades
- **labOrderBySection**: Organiza exames por categoria (metabolismo, renal, hepatobiliar, pancreas, lipideos, tireoide, hemograma, ferroVitaminas, estadoNutricional)

### 2. `types/obesidade.ts`
- **ExamesLaboratoriais**: Interface com todos os campos opcionais

### 3. `app/meta/page.tsx` (Paciente – visualização)
- Página Exames do paciente
- `todosOsCampos`, `exameSelecionado`, `dadosGrafico`

### 4. `app/metaadmin/page.tsx` (Médico – admin)
- Pasta Exames Desktop + ícone Exames Mobile
- Modal Solicitar Exames (Desktop e Mobile)
- Modal Adicionar/Editar Exame (Desktop e Mobile)
- `todosOsCampos`, `camposExame`, `exameSelecionado`, `dadosGrafico`

### 5. `app/metanutri/page.v2.tsx` (Nutricionista)
- Página Pacientes → ícone Exames Mobile
- Modal Adicionar/Editar Exame
- `todosOsCampos`, `camposExame`, `exameSelecionado`, `dadosGrafico`

### 6. `app/metapersonal/page.v2.tsx` (Personal Trainer)
- Página Pacientes → ícone Exames Mobile
- `todosOsCampos`, `exameSelecionado`, `dadosGrafico`

### 7. `utils/gerarRelatorioPDF.ts`
- Exames incluídos em relatórios PDF

---

## Exames Extras no Sistema (não no painel padrão)

| Key | Label | Categoria |
|-----|-------|-----------|
| egfr | eGFR (CKD-EPI 2021) | renal |
| alp | Fosfatase alcalina | hepatobiliar |
| amylase | Amilase | pancreas |
| lipase | Lipase | pancreas |
| calcitonin | Calcitonina | tireoide |
| hgb | Hemoglobina | hemograma |
| wbc | Leucócitos | hemograma |
| platelets | Plaquetas | hemograma |
| iron | Ferro sérico | ferroVitaminas |

---

## Sugestão de Uso Clínico (do painel original)

**Avaliação inicial (baseline):** todos os exames acima.

**Seguimento (3–6 meses):**
- Glicemia de jejum
- HbA1c
- Perfil lipídico
- TGO, TGP, GGT
- Creatinina
- Vitamina D
- Ferritina (especialmente em mulheres)

---

## Status: ✅ Todos os 20 exames do painel já estão implementados

Documento padronizado para uso clínico, protocolos digitais e integração em sistemas de acompanhamento metabólico.
