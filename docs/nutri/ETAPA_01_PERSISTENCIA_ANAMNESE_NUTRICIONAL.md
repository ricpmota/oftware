# ETAPA 1 — Persistência da anamnese nutricional

## Problema anterior

O wizard nutricional (`NutriContent`, 9 passos) coletava um objeto `WizardData` completo, mas em `gerarPlanoNutricional()` apenas campos derivados eram gravados em:

```text
pacientes_completos/{pacienteId}/nutricao/plano
```

Exemplos do que era persistido: `estilo`, `protDia_g`, `aguaDia_ml`, `hipoteseComportamental`, `evitar`, `restricoesPaciente`, `preferenciasProteinaPaciente`, slots do cardápio.

Respostas brutas (fome, cronotipo, histórico de dietas, turno de trabalho, etc.) **não** eram salvas. Após reload, o wizard em memória era perdido.

## Solução implementada

Passamos a gravar um snapshot estruturado opcional no **mesmo** documento do plano:

```ts
plano.anamneseNutricional?: AnamneseNutricionalSnapshot
```

- Função pura: `criarSnapshotAnamneseNutricional(wizard)` em `lib/nutri/anamneseNutricional.ts`
- Inclusão no objeto final em `gerarPlanoNutricional()` (ao criar/refazer o plano)
- Sem nova coleção / sem migração automática de planos antigos

## Estrutura do snapshot

| Campo | Tipo | Notas |
|-------|------|--------|
| `versao` | `number` | Atual: `1` |
| `preenchidaEm` | `string` | ISO (`Date.toISOString()`) |
| `objetivoPrincipal` | enum | |
| `horarioTrabalho` | enum | |
| `horasSentado` | enum | |
| `dietaUltimos12Meses` | `sim` \| `nao` | |
| `tipoDieta` | `string` | `''` se ausente |
| `efeitoSanfona` | `sim` \| `nao` | |
| `kgSanfona` | `number \| null` | inválido → `null` |
| `pesoMaximo2Anos` | `number \| null` | |
| `pesoMinimo2Anos` | `number \| null` | |
| `fomeMatinal` / `fomeNoturna` / `vontadeDoce` | `number` | clamp 0–10 |
| `pulaCafeManha` / `chegaComMuitaFomeJantar` | `boolean` | |
| `atividadeFisica` / `sonoHoras` / `horarioDormir` / `acordaDescansado` | enums | |
| `numeroRefeicoesDia` | enum | |
| `comportamentosAlimentares` | `string[]` | cópia nova |
| `fomeEmocional` / `compulsaoNoturna` | `boolean` | |
| `dosesAlcoolSemana` / `finalSemanaSaiDieta` | enums | |
| `restricoes` / `preferenciasProteina` | `string[]` | cópia nova; espelho do wizard |
| `sintomasGI` | enum | |

## Caminho Firestore

Inalterado:

```text
pacientes_completos/{pacienteId}/nutricao/plano
```

Campo novo no documento: `anamneseNutricional`.

## Compatibilidade com planos antigos

- Campo **opcional** em `PlanoNutricional`
- Se `anamneseNutricional === undefined`, o load segue normal
- Sem backfill, sem defaults inventados como “respostas reais”
- Helper `planoTemAnamneseNutricional` apenas para checagem tipada/testes

## Campos antigos mantidos (fonte de verdade do cardápio)

Continua-se usando:

- `restricoesPaciente`
- `preferenciasProteinaPaciente`

O snapshot **também** guarda `restricoes` e `preferenciasProteina`, mas nesta etapa **não** substitui a fonte usada por builder / `montarPratoPadraoRefeicao`.

## Itens deliberadamente não alterados

- Geração / backfill da Opção 01
- `itensSelecionados`, `opcoesSlots`, `macrosPorRefeicao`, `modeloDia`
- Cálculo de proteína e calorias
- UI do wizard (exceto persistência no save)
- Check-ins
- Intensidade calórica, TMB, déficit, IA, score clínico

## Testes executados

Arquivo: `lib/nutri/anamneseNutricional.spec.ts`

Cobertura:

1. Todos os campos preenchidos  
2. Numéricos opcionais vazios → `null`  
3. Arrays sem compartilhar referência  
4. Escala &lt; 0 → 0  
5. Escala &gt; 10 → 10  
6. `preenchidaEm` ISO válido  
7. Wizard original não mutado  
8. Plano antigo sem snapshot compatível  
9. Extra: `NaN` → `null`

Comando: `npx vitest run lib/nutri/anamneseNutricional.spec.ts`

## Arquivos modificados / criados

| Arquivo | Ação |
|---------|------|
| `lib/nutri/anamneseNutricional.ts` | criado — tipos + snapshot |
| `lib/nutri/anamneseNutricional.spec.ts` | criado — testes |
| `components/NutriContent.tsx` | `PlanoNutricional.anamneseNutricional` + save no `gerarPlanoNutricional` |
| `docs/nutri/ETAPA_01_PERSISTENCIA_ANAMNESE_NUTRICIONAL.md` | este documento |

> **Nota (ETAPA 2):** a partir de `docs/nutri/ETAPA_02_INTENSIDADE_DESEJADA_ANAMNESE.md`, novos snapshots passam a usar `versao: 2` com o campo `intensidadeDesejada`. Snapshots `versao: 1` permanecem válidos sem migração automática.
