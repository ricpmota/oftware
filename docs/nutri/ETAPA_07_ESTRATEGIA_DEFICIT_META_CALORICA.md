# ETAPA 7 — Estratégia de déficit e meta calórica diária

## 1. GET × meta

| Conceito | Papel |
|----------|--------|
| **GET estimado** | Manutenção (ETAPA 6) |
| **Meta calórica proposta** | GET × (1 − déficit), com proteções |
| Cardápio | Ainda não alterado |

## 2. Intensidade desejada × aplicada

- **Desejada:** preferência do paciente (`leve` \| `moderada` \| `intensiva`, snapshot V2).
- **Aplicada:** decisão do motor (`manutencao` \| `leve` \| `moderada` \| `intensiva` \| `indisponivel`).

O motor **só mantém ou reduz** — nunca eleva.

## 3. Déficits (`DEFICITS_ENERGETICOS_V1`)

| Aplicada | Déficit |
|----------|--------:|
| Leve | 12% |
| Moderada | 20% |
| Intensiva | 30% |
| Manutenção | 0% |

Leve = flexibilidade; moderada = padrão inicial; intensiva = redução acentuada com revisão — **não** significa “melhor”.

## 4. Regras de redução (só a partir de intensiva)

Compulsão noturna · fome emocional · efeito sanfona · GI grave · recomposição · atividade `5-7x` → aplicada `moderada`, com motivos acumulados sem duplicar.

## 5. Pisos (`PISOS_CALORICOS_PADRAO_V1`)

- Feminino: **1200** kcal  
- Masculino: **1500** kcal  
- Sem piso 1000. Sexo ausente → estratégia indisponível.

## 6. Proteção pela TMB

`metaAplicada = max(piso, tmbEstimativa)` se a meta ficaria abaixo da TMB estimada. Gera revisão. TMB não é piso fisiológico absoluto universal, mas o motor automático não prescriciona abaixo dela sem avaliação.

## 7. Classificação energética

| Faixa (meta calculada) | Classe |
|------------------------|--------|
| ≥ 1200 | padrão |
| 800–1199 | baixa_energia → revisão |
| &lt; 800 | muito_baixa_energia → revisão; valor aplicado respeita piso |

## 8. Bloqueios

`GET_INDISPONIVEL` · `INTENSIDADE_DESEJADA_INDISPONIVEL` · `GESTACAO` · `LACTACAO` · `IDADE_FORA_ESCOPO` · `DADOS_CLINICOS_INSUFICIENTES` · `RESULTADO_INVALIDO`

## 9. Alertas

`INTENSIDADE_INTENSIVA_REQUER_APROVACAO` · baixa/muito baixa energia · `OBJETIVO_MANUTENCAO_COM_INTENSIDADE_DE_PERDA` · `GET_COM_CONFIANCA_BAIXA`

## 10. Status

- `calculada` — proposta automática dentro dos limites  
- `requer_revisao` — matemática possível, precisa nutricionista  
- `indisponivel` — bloqueio  

## 11. Ordem do cálculo

1. Validar GET e entradas  
2. Bloqueios absolutos  
3. Intensidade aplicada  
4. Déficit  
5. Meta matemática  
6. Baixa/muito baixa energia  
7. Piso por sexo  
8. Proteção TMB  
9. Status / revisão  

## 12. Exemplos confirmados

| Caso | Resultado |
|------|-----------|
| GET 2000 leve | meta 1760 |
| GET 2000 moderada | meta 1600 |
| GET 2500 intensiva | meta 1750, requer revisão |
| GET 2500 intensiva + compulsão | aplicada moderada, meta 2000 |
| GET 1450 intensiva ♀ TMB 1180 | math 1015 → aplicada 1200 |
| GET 1500 moderada ♀ TMB 1300 | math 1200 → aplicada 1300 |
| GET 2100 manutenção | meta 2100, déficit 0% |

## 13. Integração

Wizard na geração; `plano.anamneseNutricional` + `obterIntensidadeDesejadaDoSnapshot` no reload. V1 / sem intensidade → indisponível (não inventa moderada).

## 14. Persistência

Não grava estratégia no Firestore.

## 15. Itens não alterados

Proteína, água, kcal fixas por refeição, Opção 01, cardápio, check-in, TMB/GET módulos.

## 16–17. Testes e limitações

Specs em `estrategiaEnergetica.spec.ts` + regressão ETAPAS 1–6. Sem aprovação UI, sem distribuição calórica, sem GLP-1 como multiplicador, sem dieta &lt;800 automática.

## 18. Arquivos

| Arquivo | Ação |
|---------|------|
| `lib/nutri/estrategiaEnergetica.ts` | criado |
| `lib/nutri/estrategiaEnergetica.spec.ts` | criado |
| `components/NutriContent.tsx` | integração + painel |
| `docs/nutri/ETAPA_07_ESTRATEGIA_DEFICIT_META_CALORICA.md` | este doc |
