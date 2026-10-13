# Localização — Etapa 7

Migração segura da localização já gravada. O apply em `pacientes_completos` foi concluído em 2026-09-29. `pacientes_abandono` permanece fora.

## Estratégia

O script novo é `scripts/migrar-localizacao-pacientes.ts`. A auditoria `scripts/auditar-localizacao-pacientes.ts` permanece somente leitura.

A decisão está em `lib/localizacao/migracaoLocalizacaoPaciente.ts`. Ela chama `classifyPatientLocation`. Não há segunda regra de normalização e não há correção por semelhança.

Na execução, cada documento é lido de novo. A classificação da Etapa 6 não é usada para escrever. Dentro da transaction o documento é lido outra vez. Se deixou de ser B ou C, a escrita daquele documento é pulada.

Coleção desta leva: `pacientes_completos`. `pacientes_abandono` só é contado.

## Categorias

Elegíveis:

- `B_RESOLVIVEL_SEM_CODIGO`
- `C_RESOLVIVEL_NORMALIZACAO`

O patch grava os três valores oficiais devolvidos pela base:

- `dadosIdentificacao.endereco.estado`
- `dadosIdentificacao.endereco.cidade`
- `dadosIdentificacao.endereco.codigoIbge`

Rua, CEP, complemento, bairro, número e o restante do documento ficam fora do patch. O mapa `endereco` não é substituído. `PacienteService` não entra nesse fluxo.

Ignorados: A, D, E, F, G, H e I. Um registro que já está canônico não é regravado.

## Proteções

Sem argumentos, ou com `--dry-run`, o script não escreve no Firestore.

`--apply` sozinho é recusado antes de abrir o Firestore.

A escrita só segue com:

```bash
npx tsx scripts/migrar-localizacao-pacientes.ts --apply --confirm=LOCALIZACAO_ETAPA_7
```

Esse comando foi executado uma vez, em 2026-09-29, com 256 documentos atualizados e 0 falhas. A auditoria seguinte encontrou A = 257, B = 0 e C = 0.

## Dry-run em 2026-09-29

```bash
npx tsx scripts/migrar-localizacao-pacientes.ts --dry-run
```

| Leitura | Quantidade |
| --- | ---: |
| pacientes_completos | 541 |
| B | 248 |
| C | 8 |
| elegíveis | 256 |
| ignorados | 285 |
| A | 1 |
| D | 0 |
| E | 2 |
| F | 0 |
| G | 277 |
| H | 4 |
| I | 1 |

Por UF, só entre os elegíveis: PB 207, PE 45, RJ 1, MA 1, CE 1, AL 1.

Os maiores municípios elegíveis: João Pessoa PB 101, Areia PB 21, Mataraca PB 19, Campina Grande PB 17, Macaparana PE 15. João Pessoa aparece com 101 porque o único registro já canônico fica de fora.

`pacientes_abandono`: 1 lido, 1 elegível, 0 escritas.

Firestore reads: 542. Firestore writes: 0. Firestore deletes: 0.

## Transaction

No `--apply`, cada id elegível da leitura daquela execução entra numa transaction:

1. ler o documento;
2. classificar de novo;
3. confirmar B ou C e uma proposta canônica de 7 dígitos;
4. atualizar só os três paths.

Uma falha em um documento não interrompe os outros. O motivo técnico vai para um arquivo de falhas exclusivo daquela execução, em `reports/localizacao/migrations/`.

## Proteção dos artefatos de rollback

O dry-run grava somente `reports/localizacao/etapa7-dry-run.json`. Ele não cria, altera nem apaga arquivo de rollback.

O apply mantém a pré-imagem em memória durante as transactions. No fim, grava um arquivo novo:

`reports/localizacao/migrations/<timestamp>-<execução>-localizacao-etapa7-rollback.json`

O nome usa data UTC sem dois-pontos, mais um identificador da execução. Se esse nome já existir, o script escolhe outro sufixo e não substitui o arquivo anterior. A gravação usa criação exclusiva.

O `records` desse arquivo traz só documentos em que o update foi enviado. Documento pulado e falha sem write ficam de fora. Cada registro tem `documentId`, `before` e `after` com estado, cidade e `codigoIbge`. Não entram nome, CPF, telefone, e-mail, rua nem CEP.

As falhas da mesma execução vão para `<timestamp>-<execução>-localizacao-etapa7-falhas.json`. Uma lista vazia permanece nesse arquivo quando `failed` é 0. Uma execução seguinte não regrava o arquivo da anterior.

Não há rollback automático.

### Ocorrência técnica

O artefato de rollback da execução original da ETAPA 7 foi sobrescrito por um dry-run posterior. A migração foi validada pela auditoria pós-apply, mas a pré-imagem individual original não está mais disponível nesse arquivo.

Imediatamente depois do apply, `reports/localizacao/etapa7-rollback.json` tinha `aplicado: true` e 256 registros. O `--dry-run` seguinte, ainda na versão antiga do script, regravou esse mesmo caminho com `aplicado: false` e `registros: []`, porque não havia mais elegíveis. A pré-imagem não foi reconstruída e nenhum paciente foi revertido.

## Depois do apply

A auditoria somente leitura, rodada em seguida, encontrou A = 257, B = 0 e C = 0 em `pacientes_completos`. E, F, G, H e I permaneceram iguais. Os 7 casos manuais e os 277 sem localização continuaram intocados.

## Testes

`npx vitest run lib/localizacao/migracaoLocalizacaoPaciente.spec.ts` — 23 testes passaram.

A proteção dos artefatos está em `lib/localizacao/migracaoLocalizacaoArtefatos.spec.ts`.
