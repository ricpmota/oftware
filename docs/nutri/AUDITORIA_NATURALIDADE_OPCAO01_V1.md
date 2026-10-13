# Auditoria de naturalidade da Opção 01 — V1 (ETAPA 10.5)

Gerado em 2026-08-02T08:23:43.902Z · modo **completo** · 49453 ms · catálogo V2.

## Objetivo

Medir o impacto do motor de contexto alimentar sem expandir o catálogo.

## Cobertura nutricional (mesmo motor)

| Métrica | Valor |
|--------:|------:|
| Cenários | 8920 |
| Atendimento | 35.1% |
| Classificação | insuficiente |

## Violações contextuais (devem tender a zero)

| Violação | Ocorrências |
|----------|------------:|
| Arroz no café | 0 |
| Ovo + arroz no café | 0 |
| Arroz em lanches | 0 |
| Whey em almoço/jantar | 0 |
| Proteína de almoço no café | 0 |
| SEM_COMBINACAO_NATURAL_VALIDA | 0 |

## Combinações questionáveis restantes

- `multiplos_complementos_proteicos`: 239

## Padrões frequentes por refeição (aproximação)

- cafe:ovos: 1114
- lanche2:ovos: 767
- jantar:ovos: 621
- lanche2:outro: 575
- lanche1:ovos: 528
- jantar:tofu: 526
- almoco:tofu: 518
- almoco:peixe: 493
- almoco:frango: 487
- cafe:outro: 484
- lanche1:outro: 460
- almoco:ovos: 382
- jantar:peixe: 372
- jantar:frango: 357
- lanche2:iogurte: 328
- lanche1:iogurte: 262
- cafe:iogurte: 232
- lanche2:whey: 210
- lanche1:whey: 150
- cafe:whey: 50

## Conclusão

- Arroz no café: **eliminado**
- Ovo + arroz no café: **eliminado**
- Motor usa templates + adequação ≥3 + afinidade eliminatória antes do score.

## Limitações

- Catálogo não expandido nesta etapa.
- Cobertura nutricional pode cair frente à V2 pré-contexto (trade-off intencional).
- Templates de café reduzido / digestivo priorizados por estilo e ajustes.

Arquivos de cobertura V1/V2 da ETAPA 10/11 **não** foram sobrescritos.
