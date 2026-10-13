# Localização — Etapa 6

Auditoria e dry-run da base. Nenhum paciente foi alterado.

## Como a leitura foi feita

O script reutiliza `getFirestoreAdmin` em `lib/server/firebaseAdminOftware.ts`. A credencial continua só nas variáveis de ambiente (`FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`, ou os nomes `FIREBASE_ADMIN_*`). Não há chave no código.

Comando:

```bash
npx tsx scripts/auditar-localizacao-pacientes.ts
```

O arquivo é somente leitura. Não importa `update`, `set`, `delete`, `batch` nem `bulkWriter`. Argumentos com `apply`, `write`, `migrate` ou `delete` são recusados. Não existe `--apply`.

A classificação está em `lib/localizacao/classifyPatientLocation.ts` e usa apenas `resolveBrazilState`, `findMunicipality` e `findMunicipalityByIbgeCode`. Não há fuzzy matching.

## Categorias

Uma categoria principal por documento:

| Código | Significado |
| --- | --- |
| A_CANONICO | Sigla, nome oficial e `codigoIbge` coerente |
| B_RESOLVIVEL_SEM_CODIGO | Texto já oficial, sem código |
| C_RESOLVIVEL_NORMALIZACAO | UF + cidade resolvem com a normalização segura, mas o texto gravado não é o oficial |
| D_CODIGO_INCONSISTENTE | Há código e ele não fecha com o texto |
| E_ESTADO_AUSENTE | Há cidade e não há estado |
| F_CIDADE_AUSENTE | Há estado e não há cidade |
| G_LOCALIZACAO_AUSENTE | Não há estado, cidade nem código |
| H_NAO_RESOLVIVEL | Estado e cidade preenchidos, sem município único |
| I_ESTADO_INVALIDO | Estado não reconhecido por `resolveBrazilState` |

Campo na raiz `cidade` ou `estado` é só uma flag. Não muda a categoria principal.

Candidato automático da Etapa 7: somente B e C.

## Execução em 2026-09-29

Firestore reads: 542  
Firestore writes: 0  
Firestore deletes: 0

### pacientes_completos — 541

| Categoria | Qtd | % |
| --- | ---: | ---: |
| A_CANONICO | 1 | 0,2 |
| B_RESOLVIVEL_SEM_CODIGO | 248 | 45,8 |
| C_RESOLVIVEL_NORMALIZACAO | 8 | 1,5 |
| D_CODIGO_INCONSISTENTE | 0 | 0 |
| E_ESTADO_AUSENTE | 2 | 0,4 |
| F_CIDADE_AUSENTE | 0 | 0 |
| G_LOCALIZACAO_AUSENTE | 277 | 51,2 |
| H_NAO_RESOLVIVEL | 4 | 0,7 |
| I_ESTADO_INVALIDO | 1 | 0,2 |

Canônicos: 1.  
Correção automática segura (B + C): 256.  
Revisão manual (D, E, F, H, I): 7.  
Sem localização: 277.

`codigoIbge`: presente 1, ausente 540, válido 1, inválido 0, inconsistente 0.

Raiz legada: cidade 0, estado 0, ambos 0.  
Objeto `dadosIdentificacao.endereco` presente em 506 documentos e ausente em 35. Presença do objeto não significa cidade preenchida.

### Variações que mudam o texto (as 8 da categoria C)

| Gravado | Oficial | Qtd |
| --- | --- | ---: |
| Baia da Traição / PB | Baía da Traição / PB | 3 |
| CONDADO / PE | Condado / PE | 1 |
| Joao Pessoa / PB | João Pessoa / PB | 1 |
| JARDIM / CE | Jardim / CE | 1 |
| GOIANA / PE | Goiana / PE | 1 |
| São Vicente Ferrer / PE | São Vicente Férrer / PE | 1 |

As outras variações do ranking são nomes que já estão oficiais e só não têm `codigoIbge` (categoria B). As maiores: João Pessoa / PB 100, Areia / PB 21, Mataraca / PB 19, Campina Grande / PB 17, Macaparana / PE 15.

### Por UF

| UF | Total | Canônicos | Resolvíveis | Não resolvíveis | Sem cidade | Sem código |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| sem UF | 279 | 0 | 0 | 0 | 0 | 279 |
| PB | 212 | 1 | 207 | 4 | 0 | 211 |
| PE | 45 | 0 | 45 | 0 | 0 | 45 |
| RJ | 1 | 0 | 1 | 0 | 0 | 1 |
| MA | 1 | 0 | 1 | 0 | 0 | 1 |
| CE | 1 | 0 | 1 | 0 | 0 | 1 |
| AL | 1 | 0 | 1 | 0 | 0 | 1 |
| estado inválido | 1 | 0 | 0 | 1 | 0 | 1 |

“Sem UF” junta localização ausente (277) e cidade sem estado (2).

### Revisão manual, sem identificador

| Categoria | Texto agregado | Qtd |
| --- | --- | ---: |
| H_NAO_RESOLVIVEL | PB / São José da Mata | 2 |
| H_NAO_RESOLVIVEL | PB / Joao Pesso | 1 |
| H_NAO_RESOLVIVEL | PB / Salema | 1 |
| E_ESTADO_AUSENTE | cidade GOIANA | 1 |
| E_ESTADO_AUSENTE | cidade CONDADO | 1 |
| I_ESTADO_INVALIDO | TX / Houston | 1 |

Para abrir o documento depois, o arquivo local `reports/localizacao/revisao-indice.json` guarda o id do Firestore desses 7 casos. A pasta `reports/localizacao/` está no `.gitignore`. Esse arquivo não deve ser commitado.

### pacientes_abandono — 1

Separado da coleção principal. Categoria B, sem `codigoIbge`, com `endereco`, sem campo na raiz. Candidato automático: 1. Revisão manual: 0.

## Relatórios locais

`reports/localizacao/resumo.json`  
`reports/localizacao/variacoes.json`  
`reports/localizacao/por-estado.json`  
`reports/localizacao/por-municipio.json`  
`reports/localizacao/nao-resolvidos.json`  
`reports/localizacao/resumo-abandono.json`  
`reports/localizacao/revisao-indice.json`

## Quem ainda pode gravar endereco sem codigoIbge

Não foi corrigido nesta etapa.

| Arquivo | Função | Risco | Tipo |
| --- | --- | --- | --- |
| `lib/aplicacao/pacienteResultadoPublico.ts` | `buildPacienteResultadoPublico` | Remonta `endereco` só com cidade e estado | Projeção em memória, não é o save do prontuário |
| `lib/metaadmin/buildNovoPacienteCompleto.ts` | cadastro novo | Grava `endereco: {}` | Criação de paciente novo |

Os saves do `/meta`, `/metaadmin` e `/metaadmingeral` passam `codigoIbge` no spread do endereço. `PacienteService.createOrUpdatePaciente` não foi alterado e ainda não rejeita legado.

## Leitores de cidade/estado

Não foram alterados.

| Superfície | Uso |
| --- | --- |
| `/meta` Meu Perfil | Exibe cidade e estado do `endereco` |
| `/metaadmin` listas e cabeçalhos | Exibem `endereco.cidade` / `endereco.estado` |
| `/metaadmin` financeiro | Agrupa por cidade/UF e, se o `endereco` estiver vazio, cai em `cidade` / `estado` na raiz |
| `/metanutri` e `/metapersonal` | Repassam cidade e estado para exibição |
| `/metapsi` | Sem leitura direta desses campos nos arquivos da rota |
| Contratos | Preenchem `cidadePaciente` e `estadoPaciente` a partir do `endereco` |
| Match | Normaliza cidade com `matchCityKey` para distância e identidade; não usa `codigoIbge` |
| `lib/dr/buildPublicPacienteResultado.ts` | Exibe cidade e estado no resultado público |

Nenhum desses leitores consulta `codigoIbge` hoje. Match, contratos e o gráfico financeiro passariam a agrupar melhor se usassem o código oficial.

## Testes

`npx vitest run lib/localizacao/classifyPatientLocation.spec.ts` — 11 testes passaram.

## Etapa 7

Script novo, separado deste. Só documentos reclassificados na hora como B ou C. Nesta base, o teto visto aqui é 256 em `pacientes_completos` e 1 em `pacientes_abandono`. A escrita seria merge de `endereco.estado`, `endereco.cidade` e `endereco.codigoIbge`, preservando rua, CEP e o restante. Fora desse conjunto, não escrever. Sem apagar campo de raiz nesta leva: a auditoria achou zero.
