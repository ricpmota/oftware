# Guia Completo: Como Adicionar um Novo Exame Laboratorial

Este documento lista **TODOS** os locais onde você precisa adicionar um novo exame para que ele apareça corretamente em `/meta`, `/metaadmin` e `/metanutri`.

---

## 📋 Resumo dos Arquivos e Locais

### 1. **Valores de Referência** (OBRIGATÓRIO)
**Arquivo:** `types/labRanges.ts`

- Adicionar no objeto `labRanges` (linha ~20)
- Adicionar na constante `labOrderBySection` (linha ~116) - se necessário criar nova seção

### 2. **Interface TypeScript** (OBRIGATÓRIO)
**Arquivo:** `types/obesidade.ts`

- Adicionar campo na interface `ExamesLaboratoriais` (linha ~214)

### 3. **Página `/metaadmin`** (OBRIGATÓRIO)
**Arquivo:** `app/metaadmin/page.tsx`

**Locais a modificar:**

#### 3.1. Visualização de Exames (Desktop) - `todosOsCampos`
- **Linha ~16740**: Array `todosOsCampos` - adicionar na seção apropriada
- **Linha ~16710**: Objeto `dadosGrafico` - adicionar campo para gráficos

#### 3.2. Modal Adicionar/Editar Exame (Desktop) - `camposExame`
- **Linha ~20724**: Array `camposExame` - adicionar novo campo

#### 3.3. Modal de Exames Mobile - `todosOsCampos`
- **Linha ~24259**: Array `todosOsCampos` - adicionar na seção apropriada
- **Linha ~24201**: Objeto `exameSelecionado` - adicionar campo
- **Linha ~24227**: Objeto `dadosGrafico` - adicionar campo para gráficos

#### 3.4. Modal Adicionar/Editar Exame Mobile - `camposExame`
- **Linha ~24598**: Array `camposExame` - adicionar novo campo

#### 3.5. Modal Solicitar Exames
- **Usa automaticamente** `labOrderBySection` de `labRanges.ts` - não precisa modificar se já adicionou lá

### 4. **Página `/metanutri`** (OBRIGATÓRIO)
**Arquivo:** `app/metanutri/page.v2.tsx`

**Locais a modificar:**

#### 4.1. Visualização de Exames - `todosOsCampos`
- **Linha ~7751**: Array `todosOsCampos` - adicionar na seção apropriada
- **Linha ~7719**: Objeto `dadosGrafico` - adicionar campo para gráficos
- **Linha ~7693**: Objeto `exameSelecionado` - adicionar campo

#### 4.2. Modal Adicionar/Editar Exame Mobile - `camposExame`
- **Linha ~8017**: Array `camposExame` - adicionar novo campo

### 5. **Página `/meta` (Paciente)** (OBRIGATÓRIO)
**Arquivo:** `app/meta/page.tsx`

**Locais a modificar:**

#### 5.1. Visualização de Exames - `todosOsCampos`
- **Linha ~2819**: Array `todosOsCampos` - adicionar na seção apropriada
- **Linha ~2787**: Objeto `dadosGrafico` - adicionar campo para gráficos
- **Linha ~2761**: Objeto `exameSelecionado` - adicionar campo

**Nota:** `/meta` não tem modal de adicionar/editar exames (apenas visualização)

---

## 📝 Exemplo Prático: Adicionar "Ácido Úrico"

### Passo 1: Adicionar em `types/labRanges.ts`

```typescript
// No objeto labRanges (linha ~20), adicionar:
uricAcid: { label: 'Ácido Úrico', unit: 'mg/dL', min: 3.5, max: 7.0 },

// OU se depender de sexo:
uricAcid: {
  M: { label: 'Ácido Úrico (M)', unit: 'mg/dL', min: 3.5, max: 7.0 },
  F: { label: 'Ácido Úrico (F)', unit: 'mg/dL', min: 2.5, max: 6.0 }
},

// No labOrderBySection (linha ~116), adicionar na seção apropriada:
// Exemplo: se for função renal
renal: ['urea', 'creatinine', 'egfr', 'uricAcid'],
```

### Passo 2: Adicionar em `types/obesidade.ts`

```typescript
// Na interface ExamesLaboratoriais (linha ~214), adicionar:
acidoUrico?: number; // mg/dL
```

### Passo 3: Adicionar em `app/metaadmin/page.tsx`

#### 3.1. Visualização Desktop (linha ~16740):
```typescript
{ section: 'Função Renal', fields: [
  { key: 'urea', label: 'Uréia', field: 'ureia' },
  { key: 'creatinine', label: 'Creatinina', field: 'creatinina' },
  { key: 'egfr', label: 'Taxa de Filtração Glomerular (eGFR)', field: 'taxaFiltracaoGlomerular' },
  { key: 'uricAcid', label: 'Ácido Úrico', field: 'acidoUrico' } // NOVO
]},
```

#### 3.2. Dados para Gráfico (linha ~16710):
```typescript
const dadosGrafico = examesOrdenados.map(exame => {
  return {
    data: dataExame,
    // ... outros campos ...
    acidoUrico: exame.acidoUrico || null // NOVO
  };
});
```

#### 3.3. Modal Adicionar Exame Desktop (linha ~20724):
```typescript
const camposExame = [
  // ... outros campos ...
  { key: 'uricAcid', label: 'Ácido Úrico', field: 'acidoUrico', unit: 'mg/dL' }, // NOVO
];
```

#### 3.4. Modal Mobile - Visualização (linha ~24259):
```typescript
// Mesmo que 3.1 - adicionar em todosOsCampos
// E também em exameSelecionado (linha ~24201) e dadosGrafico (linha ~24227)
```

#### 3.5. Modal Mobile - Adicionar Exame (linha ~24598):
```typescript
// Mesmo que 3.3 - adicionar em camposExame
```

### Passo 4: Adicionar em `app/metanutri/page.v2.tsx`

#### 4.1. Visualização (linha ~7751):
```typescript
// Mesmo que 3.1 - adicionar em todosOsCampos
// E também em exameSelecionado (linha ~7693) e dadosGrafico (linha ~7719)
```

#### 4.2. Modal Adicionar Exame (linha ~8017):
```typescript
// Mesmo que 3.3 - adicionar em camposExame
```

### Passo 5: Adicionar em `app/meta/page.tsx`

#### 5.1. Visualização (linha ~2819):
```typescript
// Mesmo que 3.1 - adicionar em todosOsCampos
// E também em exameSelecionado (linha ~2761) e dadosGrafico (linha ~2787)
```

---

## ✅ Checklist Completo

Ao adicionar um novo exame, verifique se você modificou:

- [ ] `types/labRanges.ts` - objeto `labRanges`
- [ ] `types/labRanges.ts` - `labOrderBySection` (se necessário)
- [ ] `types/obesidade.ts` - interface `ExamesLaboratoriais`
- [ ] `app/metaadmin/page.tsx` - `todosOsCampos` (linha ~16740)
- [ ] `app/metaadmin/page.tsx` - `dadosGrafico` (linha ~16710)
- [ ] `app/metaadmin/page.tsx` - `camposExame` desktop (linha ~20724)
- [ ] `app/metaadmin/page.tsx` - `todosOsCampos` mobile (linha ~24259)
- [ ] `app/metaadmin/page.tsx` - `exameSelecionado` mobile (linha ~24201)
- [ ] `app/metaadmin/page.tsx` - `dadosGrafico` mobile (linha ~24227)
- [ ] `app/metaadmin/page.tsx` - `camposExame` mobile (linha ~24598)
- [ ] `app/metanutri/page.v2.tsx` - `todosOsCampos` (linha ~7751)
- [ ] `app/metanutri/page.v2.tsx` - `exameSelecionado` (linha ~7693)
- [ ] `app/metanutri/page.v2.tsx` - `dadosGrafico` (linha ~7719)
- [ ] `app/metanutri/page.v2.tsx` - `camposExame` mobile (linha ~8017)
- [ ] `app/meta/page.tsx` - `todosOsCampos` (linha ~2819)
- [ ] `app/meta/page.tsx` - `exameSelecionado` (linha ~2761)
- [ ] `app/meta/page.tsx` - `dadosGrafico` (linha ~2787)

---

## 🔍 Notas Importantes

1. **Nomenclatura consistente**: Use a mesma chave (`key`) em todos os lugares (ex: `'uricAcid'`)
2. **Campo na interface**: Use o mesmo nome de campo (`field`) em todos os lugares (ex: `'acidoUrico'`)
3. **Gráficos**: Sempre adicione nos objetos `dadosGrafico` para que apareça nos gráficos de evolução
4. **Modal Solicitar Exames**: Usa automaticamente `labOrderBySection`, então se você adicionou lá, já aparece
5. **Hemograma**: Os campos `hgb`, `wbc`, `platelets` têm tratamento especial - se seu novo exame não for hemograma, não precisa se preocupar com isso

---

## 📌 Resumo Rápido

**Total de locais a modificar: ~17 pontos**

- 2 arquivos de tipos (`labRanges.ts`, `obesidade.ts`)
- 3 arquivos de páginas (`metaadmin`, `metanutri`, `meta`)
- Múltiplos locais dentro de cada página (visualização, modais desktop, modais mobile, gráficos)
