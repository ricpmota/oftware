# Correção — Preferências proteicas e variedade diária da Opção 01

## 1. Problema observado

Opção 01 gerava **ovo como proteína principal em todas as 5 refeições**, apesar da anamnese declarar frango, peixe, carne e ovos.

## 2. Pergunta real da anamnese

```text
Preferências de proteína (selecione todas que você consome):
Carne | Frango | Peixe | Ovos | Laticínios | Leguminosas
```

Campo: `wizardData.preferenciasProteina: string[]` (checkbox múltiplo, default `[]`).

## 3. Semântica

**Interpretação A** — proteínas que o paciente **consome**.

Tratamento: **universo preferencial permitido** da geração automática (não preferência fraca/decorativa). Fora da lista só em fallback documentado.

## 4. Fluxo

```text
wizardData.preferenciasProteina
→ anamneseNutricional.preferenciasProteina (snapshot)
→ preferenciasProteinaPaciente (plano)
→ montarTodasOpcoes01DoDia / montarOpcao01DiaCompleto
→ distribuirProteinasAoLongoDoDia
→ montarPratoPadraoRefeicaoV2(+ contextoProteico)
```

## 5. Bug / fragilidade

1. Cada refeição era montada **isoladamente**.
2. Preferência era só um bônus de −0,02 no score.
3. Ovos têm adequação alta em café/lanches/jantar → venciam macros.
4. Expansão de práticos para lanches só ocorria se **todas** as prefs fossem carnes (ovos bloqueava a expansão) → lanches só tinham ovos.

## 6–11. Solução

- `gruposProteicos.ts` — normalização + mapa ID→grupo + restrições
- `distribuicaoProteinasDia.ts` — plano diário de grupos
- `montarOpcao01Dia.ts` — monta o dia + até 2 reotimizações
- Motor V2 recebe `contextoProteico` (grupo desejado/alternativos/contagem)
- Limites: max 2/grupo/dia, sem consecutivo, ovos max 2
- Almoço/jantar forçam frango/peixe/carne/tofu/leguminosas quando escolhidos
- Preferências ausentes → padrão + alerta

## 12. Fallback lista vazia

Ordem padrão por refeição + variedade; alerta `PREFERENCIAS_PROTEICAS_AUSENTES`.

## 13–16. Pacientes de teste (automáticos)

| Paciente | Resultado esperado / observado nos specs |
|----------|------------------------------------------|
| A onívoro (ovos+frango+peixe+carne) | ≥3 grupos; almoço/jantar ≠ ovos; ovos ≤2 |
| B vegetariano | sem frango/peixe/carne |
| C vegano | só tofu/leguminosas/proteína vegetal |
| D lactose | ovos/frango/peixe ok; sem iogurte/cottage comuns |

## 17. Regressão “ovos 5×”

Fixture reproduz preferências amplas; novo motor **não** usa ovos em 5 refeições.

## 18. Preservação

Manual/TACO/Opções 02–05 intactos; backfill só slots vazios/regeneráveis; geração nova / Refazer usam o dia completo.

## 19–21. Verificações / limitações

Specs de grupos + distribuição + montagem + etapas anteriores.  
Limitações: whey/laticínios entram como práticos de lanche mesmo se não marcados na UI (necessário para variedade); tofu não é opção da UI (só via estilo/plant-based/leguminosas); sem expansão de catálogo.

## Arquivos

Criados: `gruposProteicos.ts(.spec)`, `distribuicaoProteinasDia.ts(.spec)`, `montarOpcao01Dia.ts`, `papelProteina.ts`, este doc.  
Alterados: `montagemPratoPadrao.ts`, `NutriContent.tsx`.
