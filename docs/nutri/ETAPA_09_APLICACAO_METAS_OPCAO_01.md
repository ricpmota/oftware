# ETAPA 9 — Aplicar as novas metas à Opção 01 automática

## 1. Objetivo

Integrar as metas da ETAPA 8 (`calcularDistribuicaoMetasRefeicoes`) na montagem da **Opção 01** automática, de forma gradual e segura, sem alterar o catálogo nem persistir TMB/GET/estratégia/distribuição separadamente.

## 2. Autonomia da Opção 01

| Slot | Papel |
|------|--------|
| **Opção 01** | Padrão automático da Oftware |
| **Opções 02–05** | Alternativas personalizadas |

O paciente permanece autônomo: a Opção 01 é gerada no wizard / Refazer Plano Nutri; edições no meal builder não são sobrescritas depois.

## 3. Preservação de customizações

Helper puro: `opcaoPodeSerRegeneradaAutomaticamente(opcao)`.

**Pode regenerar:** slot ausente/vazio; origem `automatica`; sem itens manuais.

**Não regenera:** `origem: manual | taco`; item `taco_*` / `custom`; descrição/macros legados sem origem (na dúvida → não regenerar).

## 4. Nova fonte de metas

`obterMetasMontagemRefeicao(refeicao, distribuicaoNova, plano)` → `MetasMontagemRefeicao`.

- Distribuição `status === 'calculada'` → `origem: "distribuicao_nova"`.
- Caso contrário → `origem: "legado"`.

## 5. Fallback legado

Calorias fixas (`CALORIAS_FIXAS_LEGADO_V1`): café 400 · lanche1 250 · almoço 550 · lanche2 200 · jantar 450.

Proteína: média da string `plano.distribuicaoProteina[refeicao]`.

Usado para planos antigos, snapshot V1 sem intensidade, GET/estratégia indisponíveis.

## 6. Função V2

`montarPratoPadraoRefeicaoV2(ContextoMontagemPratoV2)` → `ResultadoMontagemPratoAutomatico`.

Usada quando as metas têm `origem: "distribuicao_nova"`.

`montarPratoPadraoRefeicao` (legado) permanece como fallback.

Orquestração em `NutriContent`: `montarOpcao01ComMotor(...)`.

## 7. Score

`pontuarCombinacaoPrato`:

```text
score = diferencaProteinaPercentual * 2 + diferencaCaloricaPercentual
```

Menor score vence. Proteína tem peso maior.

## 8. Regras de alimentos

Busca limitada: 1 proteína + até 1 complemento + carbo/vegetal/gordura/fruta conforme refeição.

- Lixo alimentar nunca entra.
- Preferências do paciente reordenam famílias.
- Ordem base por refeição (café: ovos/iogurte/whey; lanches: whey/iogurte; almoço: frango/peixe; jantar: peixe/frango).

## 9. Sintomas GI

`estilo === "digestiva"` ou GI moderado/grave: prioriza peixe/frango/ovos, legumes cozidos, arroz branco/mandioca; evita salada grande.

Limitação: o catálogo não tem preparos específicos “digestivos” além dos IDs atuais.

## 10. Tolerâncias

Proteína e calorias: ±10% da meta.

Prioridades: restrições → proteína → calorias → estilo → preferências.

## 11. Alertas

`AlertaMontagemPrato`:

- `META_PROTEICA_NAO_ATINGIDA_PELO_CATALOGO`
- `META_CALORICA_NAO_ATINGIDA_PELO_CATALOGO`
- `META_CALORICA_EXCEDIDA_PARA_ATINGIR_PROTEINA`
- `CATALOGO_LIMITADO_PARA_O_PERFIL`
- `SEM_COMBINACAO_VALIDA`

Ficam em `geracaoAutomatica.alertas` / resultado V2. Painel admin técnico; paciente não vê alarmes.

## 12. Regeneração

Regenera Opção 01 automática em: criação do plano, Refazer Plano Nutri.

**Não** regenera a cada render/reload/mudança silenciosa de peso.

## 13. Reload / backfill

Ao carregar:

1. Se Opção 01 já tem `itensSelecionados` → não reconstruir.
2. Se manual/TACO → não reconstruir.
3. Backfill **somente** se ausente/vazia **e** `opcaoPodeSerRegeneradaAutomaticamente`.
4. Backfill usa distribuição nova se calculável; senão legado.

## 14. Opções 02–05

Não alteradas em conteúdo, macros, nomes, customizações ou TACO. Não recebem cópia automática da Opção 01.

## 15. Builder

`gerarConfiguracaoBuilderPorRefeicao(..., distribuicaoNova?)` expõe:

- `metaProteina_g`
- `metaCalorias_kcal`

Salvar edição marca `origem: "manual"` (ou `"taco"` se houver item TACO/custom). Meta é referência, não bloqueio.

## 16. Persistência

Persiste na estrutura normal do plano: Opção 01 (itens, macros, `origem`, `geracaoAutomatica`).

**Não** persiste TMB, GET, estratégia ou distribuição completa.

## 17. Painel administrativo

Modo nutricionista: tabela meta vs obtido por refeição + alertas técnicos + origem do slot.

## 18. Testes

`lib/nutri/montagemPratoPadrao.spec.ts` + regressão ETAPAS 1–8.

## 19. Limitações

- Catálogo pequeno; combinações limitadas.
- Sem TACO automático, IA ou otimização pesada.
- Planos antigos com Opção 01 texto legado sem origem não migram silenciosamente.
- Café reduzido / compulsão noturna só refletem metas da distribuição (sem calorias extras no prato).

## 20. Arquivos modificados / criados

| Arquivo | Papel |
|---------|--------|
| `lib/nutri/montagemPratoPadrao.ts` | Motor V2 + helpers |
| `lib/nutri/montagemPratoPadrao.spec.ts` | Testes |
| `components/NutriContent.tsx` | Integração geração/reload/builder/painel |
| `docs/nutri/ETAPA_09_APLICACAO_METAS_OPCAO_01.md` | Esta documentação |
