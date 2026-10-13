# ETAPA 11 — Expansão prioritária do catálogo (Lote 01)

## 1. Itens adicionados (17)

Proteínas: tofu 150/200 · proteína vegetal · feijão · lentilha · grão-de-bico · iogurte sem lactose · whey isolado baixo lactose · frango 120 g · peixe 150 g · 1 ovo · 2 claras.

Carboidratos: arroz branco 2/4 col · arroz integral 2/4 col · batata-doce meia unidade.

(Arroz diferenciado branco/integral em vez de IDs genéricos — +2 vs plano original de 15.)

## 2. Itens adiados

Carne 150 g, azeite colher de chá, cuscuz, tapioca, pão sem glúten, ricota, atum, aveia, sopa digestiva, castanhas meia porção.

## 3–4. Fontes e valores

Ver `docs/nutri/VALIDACAO_NUTRICIONAL_CATALOGO_LOTE_01.md` (TACO/NEPA + rótulos genéricos para suplementos).

## 5. Atributos

`vegetariano`, `vegano`, `semLactose`, `semGluten`, `ultraprocessado`, `refeicoesPreferidas` / `refeicoesEvitar`, `prioridadeBase`, `grupoCompatibilidade`.

## 6–7. Filtros e compatibilidade

Filtro por atributos em `filtrarCatalogoOpcao01PorRestricoes`.  
Bloqueios: pó+pó, vegetal+whey, tofu+whey em almoço/jantar, leguminosa+whey.  
Permitidos: tofu+lentilha/grão-de-bico, ovo+claras, iogurte SL+fruta, proteína vegetal+fruta.

## 8. Peito de peru

Marcado `ultraprocessado`; família `peru` no fim da ordem; **0 seleções** na auditoria V2.

## 9. Versionamento

`CATALOGO_OPCAO_01_VERSAO = 2` · V1 congelado · produção = V2 via `CATALOGO_OPCAO_01_ATUAL`.

## 10–11. Resultados V1/V2

Ver `COMPARATIVO_COBERTURA_CATALOGO_V1_V2.md`.  
Geral **47,5% → 50,3%** (+2,8 pp). Lanches e vegano sobem; almoço/jantar caem.

## 12. Itens sem impacto / a observar

Heurísticas de “cenários resolvidos” da auditoria anterior não garantem seleção real. Frequências reais em V2: frango 120, tofu 150/200, whey isolado SL e carbos 2/4 col aparecem; leguminosas ajudam veganismo mas não bastam para metas altas.

## 13. Regressões

Almoço −8,4 pp · Jantar −4,6 pp · plant_based estilo −6,8 pp. Documentado; não se forçou score/tolerância.

## 14. Limitações

- Valores de suplementos são rótulo genérico (não marca específica).
- Grão-de-bico cozido = TACO cru ÷ rendimento 2,5.
- Planos existentes **não** regeneram Opção 01 no reload.
- Metas desejáveis (&gt;60% geral, lanches/vegano &gt;35%) ainda não atingidas.

## 15. Próximos passos

ETAPA 12: atacar densidade proteica almoço/jantar (porções maiores de leguminosas, combinações arroz+feijão explícitas, validar atum/aveia/pão sem glúten) sem inflar o score artificialmente.
