# ETAPA 02 — Fundação da Base Global de Alimentos (Patrimônio Global)

**Data:** 2026-08-10  
**Pré-requisito:** `docs/metanutri/ETAPA_01_AUDITORIA_BASE_ALIMENTOS.md`  
**Escopo:** fundação administrativa independente. Sem PDF/Gemini, sem alteração do MetaNutri/TACO/Opção 01.

---

## 1. Arquitetura criada

```
/metaadmingeral
  → Patrimônio Global (hub + sidebar)
      → Alimentos (menuId: alimentos-globais)
          → AlimentosGlobaisAdmin (UI)
              → GET/POST/PUT/PATCH /api/metaadmingeral/alimentos-globais
                  → requireMetaAdminGeral
                  → GlobalFoodsService (Admin SDK)
                      → Firestore: alimentos_globais/{id}
```

A base é **paralela** a:

- `CATALOGO_ALIMENTOS_METANUTRI`
- `nutricionistas/{uid}/alimentos`
- TACO (`/api/taco-buscar`)
- `CATALOGO_OPCAO_01_ATUAL`

Nenhuma dessas estruturas foi alterada nesta etapa.

---

## 2. Collection / path escolhido

**Path:** `alimentos_globais/{alimentoId}`

**Motivo:** o Patrimônio Global hoje usa:

- `platformSettings/{doc}` para configs singleton (lab, bio);
- collections top-level para catálogos com muitos docs (`prescricoes`, `prescricao_pastas`).

Não existe collection aninhada `patrimonio_global/...` no projeto.  
Para um catálogo crescível (milhares de itens), o padrão top-level como `prescricoes` é o mais compatível.

Documentado o path definitivo: **`alimentos_globais`**.

---

## 3. Schemas / types

Pacote: `lib/metaadmingeral/alimentosGlobais/`

| Arquivo | Conteúdo |
| --- | --- |
| `types.ts` | `AlimentoGlobal` (= `GlobalFood`), `PorcaoAlimentoGlobal`, `NutrienteExtraAlimento`, `FonteAlimentoGlobal` |
| `segmentos.ts` | `SegmentoAlimento` + rótulos UI |
| `constants.ts` | `COL_ALIMENTOS_GLOBAIS`, status, origemCadastro |
| `normalizeNomeAlimento.ts` | helper determinístico |
| `parseAlimentoGlobal.ts` | parse/serialize com null ≠ 0 |

### Separação conceitual (obrigatória)

| Conceito | Campo | Onde |
| --- | --- | --- |
| A — Segmento nutricional | `segmento` | `AlimentoGlobal` |
| B — Papel no cardápio | `categoria` (`proteina`…) | MetaNutri atual — **não** usado aqui |
| C — Refeição | `cafe`… | MetaNutri — **não** usado aqui |

### Status

`draft` | `review` | `published` | `inactive`  
Futuro MetaNutri busca: somente `published` (ainda não conectado).

### Origem (prep. ETAPA 03)

`origemCadastro`: `manual` | `pdf_import`

### Null vs zero

- Campo vazio / ausente → `null`
- Fonte informou zero → `0`
- Nunca promover ausência a zero

---

## 4. Services

**Server:** `services/globalFoodsService.server.ts` → classe `GlobalFoodsService`

Métodos:

- `listar(filters)`
- `buscar(filters)` (alias)
- `obterPorId(id)`
- `criar(input, { uid })`
- `atualizar(id, input, { uid })`
- `alterarStatus(id, status, { uid })`

Usa Firebase Admin SDK — **somente server**.  
Independente de `NutriAlimentosService`.

---

## 5. API

**Rota:** `/api/metaadmingeral/alimentos-globais`  
**Auth:** `requireMetaAdminGeral` (mesmo e-mail MetaAdmin Geral do restante da plataforma)

| Método | Ação |
| --- | --- |
| GET `?q=&segmento=&status=` | listar/filtrar |
| GET `?id=` | obter por id |
| POST | criar |
| PUT `{ id, ... }` | atualizar |
| PATCH `{ id, status }` | alterar status (sem hard delete) |

Nutricionistas **não** escrevem nesta base (sem client SDK write; gate por e-mail admin).

---

## 6. Componentes / navegação

| Arquivo | Papel |
| --- | --- |
| `components/metaadmingeral/AlimentosGlobaisAdmin.tsx` | UI CRUD |
| `components/metaadmingeral/PlatformPatrimonioHubPanel.tsx` | card no hub |
| `lib/metaadmingeral/metaAdminGeralNavUx.ts` | dept. Patrimônio |
| `components/metaadmingeral/metaAdminGeralNavConfig.ts` | nav legado |
| `app/metaadmingeral/page.tsx` | `case 'alimentos-globais'` |

Padrão visual: dark MetaAdminGeral (`#0A1F44` / `#E8EDED` / `#4CCB7A`), tabela + modal — alinhado a outros painéis do patrimônio.

Acesso: `/metaadmingeral?menu=alimentos-globais`

---

## 7. Busca (V1) e evolução

**V1:** carrega a collection (orderBy `nomeNormalizado`) e filtra em memória por:

- nome / nomeNormalizado
- segmento (rótulo e id)
- marca
- código original da fonte
- status

**Evolução (milhares de itens), sem serviço externo nesta etapa:**

1. Filtros Firestore `where('status','==',…)` + `where('segmento','==',…)` com índices compostos.
2. Prefixo em `nomeNormalizado` (`>= q` / `<= q\uf8ff`) para busca textual leve.
3. Mais tarde: Typesense/Algolia **somente se** volume exigir (fora do escopo atual).

---

## 8. Índices Firestore

| Índice | Uso |
| --- | --- |
| Single-field `nomeNormalizado` ASC | listagem ordenada (auto) |
| Futuro composto: `status` + `nomeNormalizado` | listar published |
| Futuro composto: `segmento` + `status` + `nomeNormalizado` | filtros admin |

Nenhum índice composto obrigatório para a V1.

---

## 9. Fluxo CRUD

1. Admin abre Patrimônio Global → Alimentos  
2. **Novo alimento** → modal (nome + segmento obrigatórios)  
3. POST → `alimentos_globais` com `origemCadastro: manual`, status default `draft`  
4. Lista recarrega; macros exibidos como “por 100 g”; ausentes = “—”  
5. **Editar** → PUT merge  
6. **Publicar** / **Desativar** → PATCH status  
7. Sem hard delete

---

## 10. Arquivos novos

- `lib/metaadmingeral/alimentosGlobais/constants.ts`
- `lib/metaadmingeral/alimentosGlobais/segmentos.ts`
- `lib/metaadmingeral/alimentosGlobais/types.ts`
- `lib/metaadmingeral/alimentosGlobais/normalizeNomeAlimento.ts`
- `lib/metaadmingeral/alimentosGlobais/parseAlimentoGlobal.ts`
- `lib/metaadmingeral/alimentosGlobais/index.ts`
- `lib/metaadmingeral/alimentosGlobais/alimentosGlobais.spec.ts`
- `services/globalFoodsService.server.ts`
- `app/api/metaadmingeral/alimentos-globais/route.ts`
- `components/metaadmingeral/AlimentosGlobaisAdmin.tsx`
- `docs/metanutri/ETAPA_02_FUNDACAO_BASE_GLOBAL_ALIMENTOS.md`

## 11. Arquivos modificados

- `app/metaadmingeral/page.tsx`
- `components/metaadmingeral/PlatformPatrimonioHubPanel.tsx`
- `components/metaadmingeral/metaAdminGeralNavConfig.ts`
- `lib/metaadmingeral/metaAdminGeralNavUx.ts`
- `lib/metaadmingeral/metaAdminGeralNavUx.spec.ts`

## 12. Arquivos NÃO tocados (garantia)

- `NutriAlimentosPanel`, `NutriPlanosTemplatesPanel`, `NutriContent`
- `/api/taco-buscar`
- `CATALOGO_ALIMENTOS_METANUTRI`, `CATALOGO_OPCAO_01_ATUAL`
- `nutriAlimentosService`, `nutriPlanosTemplateService`
- planos de paciente / templates existentes

---

## 13. Testes

- Unit: `lib/metaadmingeral/alimentosGlobais/alimentosGlobais.spec.ts` (normalização, null≠0, filtros)
- Nav: `metaAdminGeralNavUx.spec.ts` (contexto platform + department)

**Teste manual sugerido:**

1. Login MetaAdmin Geral  
2. `/metaadmingeral?menu=alimentos-globais`  
3. Cadastrar `Banana, prata, madura` / `FRUTAS_E_DERIVADOS` / kcal etc.  
4. Recarregar → registro permanece  
5. Editar → Publicar → Desativar  

---

## 14. Riscos

| Risco | Mitigação |
| --- | --- |
| Confundir `segmento` com `categoria` | schema sem campo categoria; docs explícitos |
| Client write acidental | só Admin SDK + requireMetaAdminGeral |
| Volume futuro | busca V1 documentada; índices compostos preparados |
| Duplicar banana em bases locais | intencional — sem migração nesta etapa |

---

## 15. Preparação para ETAPA 03

A ETAPA 03 (PDF → Gemini → preview → review → publish) poderá:

1. Criar docs com `origemCadastro: 'pdf_import'`
2. Preencher `fonte` (documento, página, códigoOriginal, licença)
3. Usar `nutrientesExtras` para colunas não mapeadas
4. Entrar como `draft`/`review` antes de `published`
5. Reutilizar o mesmo `AlimentoGlobal` e a mesma collection

Nada disso está implementado agora.

---

## 16. Critério de conclusão — checklist

1. ✅ Página Alimentos no Patrimônio Global  
2. ✅ Collection global independente (`alimentos_globais`)  
3. ✅ Schema extensível com segmento ≠ categoria  
4. ✅ CRUD manual (criar/editar)  
5. ✅ Publicar/desativar (sem hard delete)  
6. ✅ Busca + filtros segmento/status  
7. ✅ Null preservado (não virar zero)  
8. ✅ MetaNutri atual intocado  
9. ✅ Documentação desta etapa  
