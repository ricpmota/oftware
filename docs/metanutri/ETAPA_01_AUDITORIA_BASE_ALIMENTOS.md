# ETAPA 01 — Auditoria da arquitetura atual de alimentos e planos (`/metanutri`)

**Data:** 2026-08-10  
**Escopo:** somente leitura do código real. Nenhuma implementação, alteração de Firestore, interface ou produção nesta etapa.  
**Critério:** quando algo não puder ser confirmado pelo código, marcar **NÃO CONFIRMADO PELO CÓDIGO**.

---

## 1. Resumo executivo

Hoje o MetaNutri opera com **duas bases de alimentos paralelas** e **dois contextos de plano**:

| Conceito | Onde vive | Persistência |
| --- | --- | --- |
| Página **Alimentos** | catálogo curado em código + cópia por nutricionista | `nutricionistas/{uid}/alimentos` |
| Aba **Planos** (templates) | cardápios-base reutilizáveis | `nutricionistas/{uid}/planos_cardapio` |
| **Cardápio do paciente** | meal builder em `NutriContent` | `pacientes_completos/{pacienteId}/nutricao/plano` |
| **TACO** | API Next.js + JSON externo | **não** persiste alimento na base Alimentos; copia snapshot no item do plano/refeição |
| **Cadastro manual (página Alimentos)** | formulário no painel | salva em `nutricionistas/{uid}/alimentos` |
| **Cadastro manual (modal Planos)** | formulário no builder de template | só entra no template; **não** vai para a página Alimentos |

**Achado crítico:** a página Alimentos/Planos usa `CATALOGO_ALIMENTOS_METANUTRI` (29 itens). O Cardápio do paciente usa `CATALOGO_OPCAO_01_ATUAL` (catálogo Opção 01). São fontes distintas no código.

**Categorias do cardápio (papel):** `proteina` | `carboidrato` | `gordura_boa` | `legumes_salada` | `extra` | `lixo`.  
A UI agrupa as duas últimas sob a aba **Reguladores**.

**Segmento nutricional tipo TACO/IBGE** (ex.: “CEREAIS E DERIVADOS”): **não existe** como modelo próprio da Oftware. A TACO devolve um `categoria` (category) textual, mas ao incluir no plano esse valor é **descartado** e substituído pelo papel da aba ativa.

**Refeições:** hardcoded em union type / arrays — exatamente 5: `cafe`, `lanche1`, `almoco`, `lanche2`, `jantar`.

---

## 2. Arquitetura atual da página Alimentos

### 2.1 Rota e entrada

**ARQUIVO:** `app/metanutri/page.tsx`  
**CAMINHO:** `c:\oftware\app\metanutri\page.tsx`  
**FUNÇÃO/COMPONENTE:** `MetaNutriPage`  
**RESPONSABILIDADE:** wrapper que sempre carrega `page.v2`.

```tsx
import MetaNutriPageV2 from './page.v2';
const USE_METANUTRI_V2 = process.env.NEXT_PUBLIC_METANUTRI_V2 === '1' || true;
export default function MetaNutriPage() {
  return <MetaNutriPageV2 />;
}
```

**ARQUIVO:** `app/metanutri/page.v2.tsx`  
**CAMINHO:** `c:\oftware\app\metanutri\page.v2.tsx`  
**FUNÇÃO/COMPONENTE:** menu lateral `activeMenu === 'alimentos'`  
**RESPONSABILIDADE:** renderiza `NutriAlimentosPanel` (não há `app/metanutri/alimentos/page.tsx` separado).

```tsx
case 'alimentos':
  return (
    <div className="w-full max-w-none">
      <NutriAlimentosPanel />
    </div>
  );
```

Sidebar: `setActiveMenu('alimentos')` com ícone `Apple` e label “Alimentos”.

### 2.2 Componentes / services / types

| Papel | Arquivo |
| --- | --- |
| UI | `components/nutri/NutriAlimentosPanel.tsx` |
| Service Firestore | `services/nutriAlimentosService.ts` |
| Types + helpers | `lib/nutri/alimentosNutricionista.ts` |
| Seed curado (código) | `lib/nutri/catalogoAlimentosMetanutri.ts` |
| Tipos de categoria/refeição compartilhados | `lib/nutri/planosNutricionista.ts` |
| Constante collection nutricionistas | `features/metaNutri/metaNutri.constants.ts` → `COL_NUTRICIONISTAS = 'nutricionistas'` |

**Hooks:** apenas React (`useState`, `useEffect`, `useMemo`, `useCallback`) + `auth.currentUser?.uid`. Sem Context API dedicado a alimentos.

### 2.3 De onde vem a lista

Fluxo:

1. `NutriAlimentosPanel.carregar()` chama `NutriAlimentosService.garantirSeed(uid)`.
2. `garantirSeed`:
   - lista `nutricionistas/{uid}/alimentos`;
   - faz upsert de `seedAlimentosDoCatalogoBase()` (= `CATALOGO_ALIMENTOS_METANUTRI`);
   - **preserva** `favorito` se o item já existir;
   - **sobrescreve** macros/nome/peso/grupos/unidade do catálogo oficial;
   - remove itens com `origemCatalogo: true` que saíram da lista oficial ou estão em `IDS_ALIMENTOS_DEPRECADOS`;
   - mantém itens com `origemCatalogo: false` (criados pela nutri).
3. A UI filtra em memória (busca texto, favoritos, grupo, categoria).

**ARQUIVO:** `services/nutriAlimentosService.ts`  
**FUNÇÃO:** `NutriAlimentosService.garantirSeed`  
**TRECHO:**

```ts
static async garantirSeed(nutricionistaId: string): Promise<AlimentoNutricionista[]> {
  const existentes = await this.listar(nutricionistaId);
  const seed = seedAlimentosDoCatalogoBase();
  // upsert catálogo curado (merge, preserva favorito)
  // remove originCatalogo fora do seed / depreciados
  return this.listar(nutricionistaId);
}
```

### 2.4 Schema atual de um alimento (página Alimentos)

**ARQUIVO:** `lib/nutri/alimentosNutricionista.ts`  
**TYPE:** `AlimentoNutricionista`

```ts
export interface AlimentoNutricionista {
  id: string;
  nome: string;
  categoria: CategoriaItemPlano;
  proteina_g: number;
  calorias_kcal: number;
  descricao?: string;
  peso_g?: number;
  quantidade?: number;
  unidade?: string;
  proteinaBase_g?: number;
  caloriasBase_kcal?: number;
  pesoBase_g?: number;
  favorito: boolean;
  grupos: GrupoAlimentoRefeicao[]; // = RefeicaoPlanoKey[]
  origemCatalogo: boolean; // true = veio do catálogo base Oftware
  criadoEm: Date;
  atualizadoEm: Date;
}
```

**Identificação global vs por nutricionista:**

- Persistência é **sempre por nutricionista** (`nutricionistas/{uid}/alimentos/{id}`).
- Itens do seed usam IDs fixos (`prot_frango_100g`, …) e `origemCatalogo: true`.
- Itens manuais usam `custom_${Date.now()}_…` e `origemCatalogo: false`.
- **Não há** collection global de alimentos Oftware no Firestore hoje (**confirmado:** busca por patrimônio/alimentos global = inexistente no fluxo MetaNutri).
- Texto da UI: “Outras nutricionistas não veem esta lista.”

### 2.5 CRUD

| Operação | Como |
| --- | --- |
| **Busca/filtro** | client-side em `filtrados` (nome, categoria, descrição; favorito; grupo; categoria) |
| **Criação** | botão “Novo alimento” → `draftVazio()` → modal → `NutriAlimentosService.salvar(uid, salvo, { isNew: true })` |
| **Edição** | lápis → `toDraft` → mesmo modal → `salvar` com merge |
| **Exclusão** | `NutriAlimentosService.excluir` (qualquer item, inclusive catálogo — mas `garantirSeed` recria os de catálogo na próxima carga) |
| **Favorito** | toggle rápido `salvar` com `favorito` invertido |

Validações no save: nome obrigatório; pelo menos 1 grupo de refeição.

---

## 3. Arquitetura atual de Planos

### 3.1 Onde aparece “Planos”

Não é menu lateral separado. É aba dentro de `NutriContent` quando `habilitarPlanosTemplates` é true (MetaNutri passa essa prop).

**ARQUIVO:** `components/NutriContent.tsx`  
**TRECHO:**

```ts
...(habilitarPlanosTemplates
  ? [{ id: 'planos' as const, label: 'Planos', ... }]
  : []),
// ...
{activeTab === 'planos' && habilitarPlanosTemplates && (
  <NutriPlanosTemplatesPanel />
)}
```

Entradas MetaNutri:

- `app/metanutri/page.v2.tsx` → `<NutriContent ... modoNutricionista habilitarPlanosTemplates />`
- `app/metanutri/nutri/[pacienteId]/page.tsx` → idem

### 3.2 Estrutura do template de plano

**ARQUIVO:** `lib/nutri/planosNutricionista.ts`

```ts
export interface ItemPlanoRefeicao {
  id: string;
  nome: string;
  categoria: CategoriaItemPlano;
  proteina_g: number;
  calorias_kcal: number;
  descricao?: string;
  peso_g?: number;
  quantidade?: number;
  unidade?: string;
  proteinaBase_g?: number;
  caloriasBase_kcal?: number;
  pesoBase_g?: number;
}

export interface RefeicaoPlanoTemplate {
  itens: ItemPlanoRefeicao[];
  itensSelecionados: string[];
  proteina_g: number;
  calorias_kcal: number;
  titulo?: string;
  descricao?: string;
  observacao?: string;
}

export interface NutriPlanoCardapioTemplate {
  id: string;
  nutricionistaId: string;
  nome: string;
  criadoEm: Date;
  atualizadoEm: Date;
  refeicoes: Record<RefeicaoPlanoKey, RefeicaoPlanoTemplate>;
}
```

### 3.3 Como o alimento é vinculado ao plano

**Cópia embarcada (snapshot), não referência viva.**

- Favoritos da página Alimentos viram `ItemPlanoRefeicao` via `alimentoParaItemPlano` (copia id/nome/categoria/macros/porção).
- TACO/manual geram novo id (`taco_…` / `manual_…`) e embutem macros no item.
- Ao salvar o template, `NutriPlanosTemplateService` serializa os itens **dentro** de `refeicoes.*.itens`.
- Se o alimento for editado depois na página Alimentos, o template **já salvo** não atualiza automaticamente (**confirmado** pela serialização embutida; não há foreign key).

Seleção: `itensSelecionados: string[]` guarda IDs dos itens ativos; macros da refeição somam só os selecionados (`recalcularMacrosRefeicaoPlano`).

### 3.4 Persistência dos templates

**ARQUIVO:** `services/nutriPlanosTemplateService.ts`  
**COLLECTION:** `nutricionistas/{nutricionistaId}/planos_cardapio/{planoId}`

### 3.5 Plano do paciente (distinto dos templates)

**ARQUIVO:** `components/NutriContent.tsx` → `salvarPlanoNutricional`  
**PATH:** `pacientes_completos/{pacienteId}/nutricao/plano`

Guarda `PlanoNutricional` com `opcoesSlots`, `itensCustomizadosPorRefeicao`, macros, anamnese, etc.  
Itens de refeição no builder usam interface local `ItemRefeicao` (espelho de `ItemPlanoRefeicao`).

**Nota:** existe `services/nutriPlanoService.ts` apontando para collection `nutri_planos`, mas **nenhum import/uso** foi encontrado no código ativo → serviço aparentemente órfão.

### 3.6 Importar template → cardápio do paciente

`ImportarRefeicaoDePlanoModal` lista templates e chama `importarRefeicaoDePlanoTemplate`, que:

- clona itens com novos IDs (`imp_…` via `clonarItensComNovosIds`);
- substitui `itensCustomizadosPorRefeicao[refeicao]`;
- mescla no `itensDisponiveis` do builder;
- **copia** dados (não referencia o template).

---

## 4. Estrutura das refeições

**ARQUIVO:** `lib/nutri/planosNutricionista.ts`  
**DEFINIÇÃO:** union type + arrays hardcoded (não Firestore, não config dinâmica).

```ts
export type RefeicaoPlanoKey = 'cafe' | 'lanche1' | 'almoco' | 'lanche2' | 'jantar';

export const REFEICOES_PLANO_ORDEM: RefeicaoPlanoKey[] = [
  'cafe', 'lanche1', 'almoco', 'lanche2', 'jantar',
];

export const ROTULO_REFEICAO_PLANO = {
  cafe: 'Café da Manhã',
  lanche1: 'Lanche da Manhã',
  almoco: 'Almoço',
  lanche2: 'Lanche da Tarde',
  jantar: 'Jantar',
};
```

Mesmas 5 chaves em:

- `NutriContent` (`RefeicaoKey`, `cardapioRefeicoes`);
- `alimentosNutricionista` (`grupos` do alimento);
- `distribuicaoMetasRefeicoes` / `contextoAlimentar` (`RefeicaoNutriKey` / `RefeicaoContextoKey`).

**Outras refeições?** Não há sexta refeição no modelo de plano/cardápio.  
**NÃO CONFIRMADO PELO CÓDIGO:** se algum paciente legado tiver chaves extras no Firestore fora dessas 5 (o parser de templates só lê as 5 keys conhecidas).

---

## 5. Categorias Proteínas / Carboidratos / Gorduras / Reguladores

### 5.1 Papel no cardápio (conceito B do brief)

**Type canônico:**

```ts
export type CategoriaItemPlano =
  | 'proteina'
  | 'carboidrato'
  | 'legumes_salada'
  | 'gordura_boa'
  | 'extra'
  | 'lixo';
```

**Labels na página Alimentos** (`CATEGORIAS_ALIMENTO`):

| id | label UI |
| --- | --- |
| proteina | Proteína |
| carboidrato | Carboidrato |
| gordura_boa | Gordura |
| legumes_salada | Legumes/Salada |
| extra | Extra |
| lixo | Lixo |

**Abas do builder** (Planos + Cardápio paciente):

```ts
type BuilderTab = 'proteina' | 'carboidrato' | 'gordura' | 'reguladores';
const TAB_CATEGORIES = {
  proteina: ['proteina'],
  carboidrato: ['carboidrato'],
  gordura: ['gordura_boa'],
  reguladores: ['legumes_salada', 'extra'],
};
```

“Reguladores” **não** é valor persistido — é agrupamento de UI sobre `legumes_salada` + `extra`.  
`lixo` existe no type/catálogo Opção 01, mas **não** entra na aba Reguladores do builder de templates.

### 5.2 Pertence ao alimento ou ao item do plano?

- No **catálogo / Alimentos**: `categoria` é campo do `AlimentoNutricionista`.
- No **item do plano/refeição**: `categoria` é campo do `ItemPlanoRefeicao` / `ItemRefeicao` (cópia).
- Ao adicionar TACO/manual no builder, a categoria é definida pela **aba ativa**, não pela category TACO.

### 5.3 Mesmo alimento em categorias diferentes?

- Catálogo seed: 1 id → 1 categoria fixa.
- TACO/manual no Planos: o nutricionista pode adicionar o mesmo nome TACO em abas diferentes, gerando **itens distintos** com categorias distintas.
- **Não há** enforcement de unicidade de alimento×categoria.

### 5.4 Segmento nutricional (conceito A do brief)

**Não implementado** como entidade Oftware.  
Aproximação parcial:

- TACO externa: campo `category` → API devolve `categoria: string` (ex. grupo alimentar TACO).
- Opção 01 / contexto: `grupoCompatibilidade`, `gruposCulinarios` (ex.: `frango`, `ovos`) — são grupos culinários do motor automático, **não** segmentos tipo “CEREAIS E DERIVADOS”.

---

## 6. Fluxo completo de adicionar alimento

Há **dois fluxos** principais.

### 6.1 Fluxo A — Página Alimentos (base da nutricionista)

```
Clique "Novo alimento"
  → draftVazio() (origemCatalogo: false, favorito: true, todos os grupos)
  → modal (nome, categoria, peso, prot, kcal, favorito, grupos, obs)
  → salvarDraft()
  → NutriAlimentosService.salvar
  → aparece na lista Alimentos
  → se favorito + grupo marcado, aparece no builder de Planos daquela refeição
```

**Não usa TACO** neste fluxo.

### 6.2 Fluxo B — Aba Planos (template) — “Adicionar item”

**ARQUIVO:** `components/nutri/NutriPlanosTemplatesPanel.tsx`

```
Clique "Adicionar item"
  → setShowAddModal(true), addMode default 'taco'
  → [Tabela TACO | Criar alimento]
        ├─ TACO: debounce 300ms → GET /api/taco-buscar?q=
        │     → seleção → peso → confirmarAddTaco()
        │     → criarItemComPorcao({ id: taco_..., categoria da aba, macros base 100g })
        │     → adicionarItemCustom → entra em refeicoesDraft[refeicao].itens + selecionados
        └─ Manual: nome/peso/prot/kcal → confirmarAddManual()
              → id manual_... → mesmo caminho adicionarItemCustom
  → Salvar plano → NutriPlanosTemplateService.salvar
```

**Importante:** TACO/manual no Planos **não** chamam `NutriAlimentosService` → **não** entram na página Alimentos automaticamente.

Itens da lista do builder também vêm de:

```
NutriAlimentosService.garantirSeed
  → filtrarFavoritosDoGrupo(alimentos, refeicaoAtiva)
  → alimentoParaItemPlano
  → mergeItensDisponiveis com itens já salvos na refeição
```

### 6.3 Fluxo C — Cardápio do paciente (`NutriContent` meal builder)

```
Editar refeição
  → itensDisponiveis = CATALOGO_OPCAO_01_ATUAL (filtrado) + itensCustomizadosPorRefeicao
  → "Adicionar item da tabela TACO" (modal só TACO — sem aba Manual neste modal)
  → adicionarItemTacoNaRefeicao
  → grava em itensCustomizadosPorRefeicao + itensDisponiveis locais
  → Salvar → pacientes_completos/.../nutricao/plano
```

Também: “Importar de Planos” via `ImportarRefeicaoDePlanoModal`.

---

## 7. Integração TACO

### 7.1 Endpoint interno

**ARQUIVO:** `app/api/taco-buscar/route.ts`  
**ROTA:** `GET /api/taco-buscar?q=`

### 7.2 Endpoint externo

```ts
const TACO_JSON_URL =
  'https://raw.githubusercontent.com/marcelosanto/tabela_taco/main/tabela_alimentos.json';
```

### 7.3 Cache / erro

- Cache em memória do processo: `let cachedData: TacoItem[] | null = null`.
- Fetch com `next: { revalidate: 86400 }`.
- Erro → HTTP 500 + `{ error, alimentos: [] }`.
- Clientes (Planos / NutriContent) em catch setam lista vazia (fallback silencioso).

### 7.4 Transformação

Entrada (parcial):

```ts
type TacoItem = {
  id?: number;
  description?: string;
  category?: string;
  energy_kcal?: number | string;
  protein_g?: number | string;
  lipid_g?: number | string;
  carbohydrate_g?: number | string;
};
```

Saída da API:

```ts
{
  id, nome, categoria, // categoria = category TACO (texto)
  calorias, proteinas, carboidratos, gorduras,
  por_100g: true
}
```

Exemplo **derivado do código** (valores ilustrativos da transformação):

```json
{
  "id": 123,
  "nome": "Arroz, branco, cozido",
  "categoria": "Cereais e derivados",
  "calorias": 128,
  "proteinas": 2.5,
  "carboidratos": 28.1,
  "gorduras": 0.3,
  "por_100g": true
}
```

**NÃO CONFIRMADO PELO CÓDIGO:** payload real ao vivo da URL externa nesta auditoria (não houve fetch de rede para amostrar o JSON).

### 7.5 Como vira item utilizável

`criarItemComPorcao` / `normalizarItemComPorcao`:

- macros TACO tratados como **base por 100g**;
- `peso_g` escolhido pelo usuário;
- `fator = (peso/100) * quantidade`;
- `categoria` do **papel** do cardápio = aba builder;
- `descricao`: `Base TACO • {peso}g`;
- novo `id` local `taco_{refeicao}_{timestamp}` — **não** preserva o id numérico TACO como chave estável do plano.

Carboidrato/gordura TACO são mostrados no preview do NutriContent, mas **não** são persistidos como campos no `ItemPlanoRefeicao` (só prot + kcal).

---

## 8. Cadastro manual

### 8.1 Página Alimentos (persiste na base da nutri)

| Campo | Obrigatório |
| --- | --- |
| Nome | sim |
| Categoria (papel) | sim (default proteina) |
| Peso (g) | sim |
| Proteína / Calorias | numéricos ≥ 0 |
| Favorito | default true |
| Grupos (refeições) | ≥ 1 |
| Observação | opcional |

- Escopo: **somente aquele nutricionista**.
- Passa a aparecer na página Alimentos.
- Disponível para **todos os pacientes** daquela nutri via Planos (se favorito + grupo), não globalmente entre nutris.
- Busca: filtro local da lista Alimentos; no Planos entra na grade de favoritos do grupo.

### 8.2 Modal “Criar alimento” nos Planos

Campos: nome, peso, proteínas, kcal.  
Categoria = aba atual.  
Validação: nome; prot e/ou kcal > 0.  
Salva **só** no draft do template (`manual_…`).  
**Não** alimenta a página Alimentos.

### 8.3 Cardápio do paciente

Modal de add = **somente TACO**. Cadastro manual estruturado nesse modal: **não encontrado**.  
Itens podem ainda ser montados selecionando o catálogo Opção 01 ou importando de Planos.

---

## 9. Todas as fontes atuais de alimentos

| Fonte | Arquivo / Service | Onde busca | Onde salva | Utilizada em |
| --- | --- | --- | --- | --- |
| Catálogo curado MetaNutri (código) | `lib/nutri/catalogoAlimentosMetanutri.ts` | array `CATALOGO_ALIMENTOS_METANUTRI` (29 itens) | seed → Firestore subcol `alimentos` | Página Alimentos; favoritos → Planos |
| Alimentos do nutricionista (Firestore) | `NutriAlimentosService` | `nutricionistas/{uid}/alimentos` | mesma subcoleção | Alimentos; Planos |
| Manual (página Alimentos) | `NutriAlimentosPanel.salvarDraft` | — | `alimentos` | Alimentos → Planos (favoritos) |
| Manual (modal Planos) | `NutriPlanosTemplatesPanel.confirmarAddManual` | — | embutido em `planos_cardapio` | Templates Planos |
| TACO (API interna + JSON GitHub) | `app/api/taco-buscar` | GitHub raw tabela_taco | não salva catálogo; snapshot no item | Planos; Cardápio paciente |
| Catálogo Opção 01 (código) | `lib/nutri/catalogoOpcao01.ts` (`CATALOGO_OPCAO_01_ATUAL`) | array em memória | não; opções/itens custom no plano do paciente | Meal builder / geração automática em `NutriContent` |
| Templates de plano salvos | `NutriPlanosTemplateService` | `planos_cardapio` | idem | Aba Planos; import no Cardápio |
| Itens custom do paciente | `itensCustomizadosPorRefeicao` | documento do plano | `pacientes_completos/.../nutricao/plano` | Cardápio paciente |
| Contexto / templates culinários | `contextoAlimentar.ts`, `templatesRefeicao.ts` | maps em código | não | Motor automático Opção 01 (não é UI de busca) |
| Collection `nutri_planos` | `nutriPlanoService.ts` | definido | definido | **Sem uso encontrado** no código ativo |

---

## 10. Schemas / types atuais

### Núcleo Planos / Alimentos

- `CategoriaItemPlano`, `RefeicaoPlanoKey`, `ItemPlanoRefeicao`, `RefeicaoPlanoTemplate`, `NutriPlanoCardapioTemplate` — `lib/nutri/planosNutricionista.ts`
- `AlimentoNutricionista`, `GrupoAlimentoRefeicao` — `lib/nutri/alimentosNutricionista.ts`
- `ItemCatalogoAlimentosMetanutri` — `lib/nutri/catalogoAlimentosMetanutri.ts`

### Cardápio paciente (`NutriContent`)

- `ItemRefeicao`, `ConfiguracaoRefeicao`, `OpcaoRefeicao`, `PlanoNutricional` — interfaces locais no arquivo
- `OrigemOpcaoRefeicao = 'automatica' | 'manual' | 'taco'` — `lib/nutri/montagemPratoPadrao.ts`

### Opção 01 / montagem

- `ItemCatalogoOpcao01`, `ItemCatalogoMontagem`
- `ContextoAlimentarItem`, `TemplateRefeicao`

### TACO

- `TacoItem` (API route) e `TacoSearchItem` (UI) — **não** há type compartilhado único exportado.

Não existem types nomeados `Food`, `Meal`, `Nutrition` canônicos além dos acima.

---

## 11. Coleções Firestore envolvidas

| Path | Conteúdo |
| --- | --- |
| `nutricionistas/{nutricionistaId}` | doc do profissional (`COL_NUTRICIONISTAS`) |
| `nutricionistas/{nutricionistaId}/alimentos/{alimentoId}` | base particular + seed |
| `nutricionistas/{nutricionistaId}/planos_cardapio/{planoId}` | templates nomeados |
| `pacientes_completos/{pacienteId}/nutricao/plano` | plano/cardápio do paciente |
| `pacientes_completos/{pacienteId}/nutricao/dados` | dados auxiliares nutri (check-in etc.; fora do escopo de alimentos, mas mesma árvore) |
| `nutri_planos/{pacienteId}_{nutricionistaId}` | definido em service órfão |

**Não existe** hoje: `metaadmingeral/.../alimentos` global.

Auth: UID Firebase do nutricionista = id usado nas subcoleções (`auth.currentUser.uid`).

---

## 12. Diagrama do fluxo atual

```
Nutricionista (Auth UID)
├── Página Alimentos
│     ← seed CATALOGO_ALIMENTOS_METANUTRI (código)
│     ↔ Firestore nutricionistas/{uid}/alimentos
│           (origemCatalogo true|false, favorito, grupos, categoria-papel)
│
├── Aba Planos (templates)
│     ← favoritos filtrados por refeição (cópia ItemPlanoRefeicao)
│     ← TACO (/api/taco-buscar) → snapshot no item
│     ← Manual modal → snapshot no item
│     ↔ Firestore nutricionistas/{uid}/planos_cardapio
│           Plano
│             └── Refeição (cafe|lanche1|almoco|lanche2|jantar)
│                   └── Item (dados embarcados + categoria-papel + porção)
│
└── Cardápio do paciente (NutriContent)
      ← CATALOGO_OPCAO_01_ATUAL (código)  [fonte DISTINTA]
      ← TACO → itensCustomizadosPorRefeicao
      ← Import de planos_cardapio (cópia com novos ids)
      ↔ Firestore pacientes_completos/{pacienteId}/nutricao/plano
            PlanoNutricional
              └── opcoesSlots / itensCustomizados / modeloDia
                    └── ItemRefeicao (snapshot)
```

**Persistência por entidade:**

| Entidade | Persistida em |
| --- | --- |
| Alimento (base nutri) | `.../alimentos` |
| Plano template | `.../planos_cardapio` |
| Refeição / Item do template | embutidos no doc do template |
| Plano paciente | `.../nutricao/plano` |
| Item TACO/manual no paciente | embutido em `itensCustomizadosPorRefeicao` |

---

## 13. Arquivos que serão impactados futuramente (ETAPA 02+)

Prioridade alta (encaixe METANUTRI / TACO / MANUAL):

1. `components/nutri/NutriPlanosTemplatesPanel.tsx` — modal `addMode` hoje só `'taco' | 'manual'`
2. `components/NutriContent.tsx` — modal add TACO do cardápio paciente
3. `app/api/taco-buscar/route.ts` — manter; eventual orquestrador multi-fonte
4. `services/nutriAlimentosService.ts` — possível ponte com base global
5. `lib/nutri/alimentosNutricionista.ts` / `planosNutricionista.ts` — types de origem
6. `lib/nutri/catalogoAlimentosMetanutri.ts` — relação com futura base global
7. `lib/nutri/catalogoOpcao01.ts` — alinhamento com Cardápio paciente (risco de dualidade)
8. Novos (futuros): service + API da base global MetaNutri; UI `/metaadmingeral` Patrimônio → Alimentos

Secundários (compatibilidade / motor):

- `components/nutri/EditarPorcaoItemModal.tsx`
- `services/nutriPlanosTemplateService.ts`
- `lib/nutri/montagemPratoPadrao.ts`, `contextoAlimentar.ts`, `templatesRefeicao.ts`
- `app/metanutri/page.v2.tsx` (entrada)
- `scripts/gerar-auditoria-alimentos.ts` / artifacts de auditoria

---

## 14. Riscos de regressão

1. **Dualidade de catálogos** (`CATALOGO_ALIMENTOS_METANUTRI` vs `CATALOGO_OPCAO_01_ATUAL`) — IDs parecidos, porções/nomes diferentes; unificar sem cuidado quebra cardápios e seeds.
2. **`garantirSeed` sobrescreve** campos do catálogo a cada carga — customizações de macros em itens `origemCatalogo: true` são perdidas (só favorito é preservado).
3. **Snapshots embutidos** — planos/pacientes não seguem atualizações do alimento fonte; mudar schema de item exige leitura defensiva (já há `normalizarItemComPorcao`).
4. **IDs TACO/manual efêmeros** — sem vínculo estável com tabela externa.
5. **Categoria TACO descartada** — conflita com futuro “segmento nutricional”.
6. **Aba Reguladores ≠ valor persistido** — misturar com segmento quebraria filtros/`TAB_CATEGORIES`.
7. **Exclusão de item de catálogo** é revertida no próximo seed.
8. **Service `nutri_planos` órfão** — risco de alguém “migrar” para path errado.
9. **Compatibilidade de planos antigos** sem `pesoBase_g` / `opcoesSlots` / `itensCustomizadosPorRefeicao` — loaders já fazem migrações; novas fontes não podem quebrar esses fallbacks.
10. **Motor automático Opção 01** depende de IDs/contexto em código — base global nova não entra sozinha na geração automática.

---

## 15. Estratégia sugerida para encaixar METANUTRI como primeira fonte

**Sem implementar agora — apenas encaixe lógico.**

### Onde mudar a UX

1. **Primário:** `NutriPlanosTemplatesPanel` — estado `addMode: 'taco' | 'manual'` → incluir `'metanutri'` (ou equivalente) e default nessa fonte.
2. **Secundário:** `NutriContent` modal “Adicionar item da tabela TACO” — hoje monolítico TACO; mesmo seletor de fonte.
3. **Opcional depois:** busca na página Alimentos (hoje só lista local).

### Services

- Novo service/API de leitura da base global (Firestore admin) **em paralelo** a `taco-buscar`.
- Adaptador único → `ItemPlanoRefeicao` / `ItemRefeicao` via `criarItemComPorcao` (já normaliza TACO/legado).
- **Não** remover TACO: manter endpoint e ramo `addMode === 'taco'`.
- Decidir se seleção METANUTRI também faz upsert em `nutricionistas/{uid}/alimentos` (favoritos) ou só snapshot no plano — impacto de produto.

### Compatibilidade com planos antigos

- Continuar persistindo **snapshot** no item (id/nome/categoria-papel/macros/porção).
- Campo novo opcional sugerido (futuro): `origem?: 'metanutri' | 'taco' | 'manual' | 'catalogo_local'` + `fonteId?` — leitura ignorável por clientes antigos.
- Não renomear `CategoriaItemPlano` nem `RefeicaoPlanoKey`.
- Segmento nutricional (conceito A) = campo **novo e separado**, nunca reutilizar `categoria` do item.

### Viabilidade

Sim: é possível adicionar METANUTRI sem quebrar TACO, desde que seja ramo adicional no modal + normalização para o mesmo `ItemPlanoRefeicao`.

---

## 16. Pontos que ainda precisam ser esclarecidos

1. A futura base global substitui o seed `CATALOGO_ALIMENTOS_METANUTRI`, coexiste, ou alimenta só a busca?
2. O Cardápio do paciente (`CATALOGO_OPCAO_01_ATUAL`) entra no mesmo projeto ou permanece separado do motor Opção 01?
3. Selecionar METANUTRI deve gravar também em `nutricionistas/{uid}/alimentos`?
4. Qual o mapeamento oficial entre segmento nutricional (A) e papel no cardápio (B)? Manual? Regras? IA?
5. Itens TACO já salvos nos planos devem ganhar backfill de `origem`/`fonteId`?
6. Collection `nutri_planos` deve ser removida/documentada como morta ou ainda há dado legado em produção? **NÃO CONFIRMADO PELO CÓDIGO** (sem inspeção de dados Firestore).
7. Escopo MetaAdmin Geral “Patrimônio Global → Alimentos”: rotas/UI atuais? **NÃO CONFIRMADO PELO CÓDIGO** neste fluxo MetaNutri (não há implementação encontrada).
8. Quem pode editar a base global e qual o processo de publicação (draft/publish)?

---

## Checklist das 10 perguntas de conclusão

| # | Pergunta | Resposta curta |
| --- | --- | --- |
| 1 | De onde vêm os alimentos atuais? | Seed código MetaNutri + custom por nutri; Cardápio paciente usa Opção 01; TACO sob demanda; manuais em dois lugares |
| 2 | Como são armazenados? | `nutricionistas/{uid}/alimentos`; snapshots em `planos_cardapio` e `nutricao/plano` |
| 3 | Como chegam ao plano? | Favoritos→cópia; TACO/manual→cópia; import template→cópia |
| 4 | Como funciona TACO? | `/api/taco-buscar` → JSON GitHub → filtro → item com macros/100g |
| 5 | Cadastro manual? | Alimentos: Firestore da nutri. Planos: só no template |
| 6 | Prot/Carb/Gord/Regulador? | Papel `CategoriaItemPlano`; Reguladores = UI sobre legumes+extra |
| 7 | Refeições? | 5 keys hardcoded |
| 8 | Planos existentes? | Itens embarcados com seleção por id |
| 9 | Onde encaixar METANUTRI? | Modal add em Planos + Cardápio; service/API nova; types de origem |
| 10 | Sem quebrar? | Snapshot + campos opcionais; não alterar enums de refeição/papel; não reutilizar `categoria` para segmento |

---

## Apêndice — trechos-âncora por responsabilidade

### Seed / catálogo página Alimentos

**ARQUIVO:** `lib/nutri/catalogoAlimentosMetanutri.ts`  
**FUNÇÃO:** `CATALOGO_ALIMENTOS_METANUTRI`  
**RESPONSABILIDADE:** lista oficial de 29 alimentos (1 porção-base por item).

### Favoritos → Planos

**ARQUIVO:** `lib/nutri/alimentosNutricionista.ts`  
**FUNÇÕES:** `filtrarFavoritosDoGrupo`, `alimentoParaItemPlano`  
**RESPONSABILIDADE:** ponte Alimentos → itens do builder de templates.

### Porção / macros

**ARQUIVO:** `lib/nutri/planosNutricionista.ts`  
**FUNÇÕES:** `aplicarPorcaoItem`, `normalizarItemComPorcao`, `criarItemComPorcao`  
**RESPONSABILIDADE:** `fator = (peso_g / pesoBase_g) * quantidade`.

### Geração automática (contexto paralelo)

**ARQUIVO:** `components/NutriContent.tsx`  
**FUNÇÃO:** `gerarConfiguracaoBuilderPorRefeicao`  
**RESPONSABILIDADE:** monta `itensDisponiveis` a partir de `CATALOGO_OPCAO_01_ATUAL`, **não** da página Alimentos.

---

*Fim da ETAPA 01. Nenhuma alteração de produção foi feita além deste documento de auditoria.*
