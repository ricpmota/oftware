# Localização — Etapa 2

Base local de estados e municípios brasileiros para a identificação de pacientes.

Esta etapa não altera telas, pacientes, Firestore, ViaCEP, Match, contratos nem `data/cidades-brasil.ts`.

## Fonte

Divisão territorial da API de Localidades do IBGE, consultada só na geração dos arquivos:

- Estados: `https://servicodados.ibge.gov.br/api/v1/localidades/estados`
- Municípios: `https://servicodados.ibge.gov.br/api/v1/localidades/municipios`

A aplicação não chama essa API quando alguém digita uma cidade.

Obtenção: 29/09/2026 (UTC), noite de 28/09/2026 no horário de Brasília. O campo `obtidoEm` em `data/localizacao/fonte.ts` guarda a data UTC da geração.

Grafia oficial preservada, inclusive acento, hífen e apóstrofo. Exemplos reais desta extração: `João Pessoa`, `Xique-Xique`, `Olho d'Água das Flores`.

## Quantidade e tamanho

| Item | Valor |
|---|---|
| UFs | 27 |
| Municípios | 5.571 |
| `municipios-brasil.json` | 334.943 bytes (cerca de 327 KB) |
| Mesmo arquivo gzip | 57.460 bytes (cerca de 56 KB) |
| `estados-brasil.ts` | 27 registros, menos de 1 KB |
| Menor UF | DF, 1 município (Brasília, `5300108`) |
| Maior UF | MG, 853 municípios |

Validação na geração, sem correção silenciosa: 27 UFs, siglas únicas, código IBGE com 7 dígitos e único, nome e UF preenchidos, um único prefixo de código por UF, nenhum nome oficial repetido na mesma UF e nenhum par UF + nome normalizado repetido. A execução não encontrou inconsistência.

## Arquivos

```text
data/localizacao/estados-brasil.ts
data/localizacao/municipios-brasil.json
data/localizacao/fonte.ts
lib/localizacao/brazilLocations.ts
lib/localizacao/brazilLocations.spec.ts
scripts/atualizar-base-localidades-ibge.mjs
```

`data/cidades-brasil.ts`, `cidades_customizadas` e `lib/match/data/brazilCityCoordinates.json` continuam como estão. Não são fonte do município do paciente.

## Formato

Estado:

```ts
{ nome: 'Paraíba', sigla: 'PB' }
```

A tela futura pode mostrar `Paraíba (PB)`. O valor persistido da UF é `PB`.

Município:

```json
{ "nome": "João Pessoa", "uf": "PB", "codigoIbge": "2507507" }
```

`codigoIbge` é string. O identificador do município é o código, ou o par UF + nome. O nome sozinho não identifica, porque o mesmo nome existe em estados diferentes (`Bom Jesus` na PB e no PI, por exemplo).

Caminho futuro do paciente, ainda não gravado:

```text
dadosIdentificacao.endereco.estado       "PB"
dadosIdentificacao.endereco.cidade       "João Pessoa"
dadosIdentificacao.endereco.codigoIbge   "2507507"
```

## Bundle

Um JSON único, não um arquivo por UF.

O arquivo inteiro cabe num pedaço só: 327 KB em disco e 56 KB em gzip. A busca de uma UF percorre no máximo 853 nomes (Minas Gerais), com índice em memória montado uma vez na carga do módulo.

Separar por UF obrigaria o autocomplete a ser assíncrono e ainda assim a resolução por código IBGE precisaria da base completa. O ganho de transferir só a Paraíba não compensa essa divisão para um bloco de 56 KB compactado.

Nenhuma tela importa este módulo. O bundle atual de `/meta`, `/metaadmin` e `/metaadmingeral` não muda. Quando a etapa 3 criar o campo, o JSON entra apenas no chunk que importar `lib/localizacao/brazilLocations.ts`.

## Helpers

Em `lib/localizacao/brazilLocations.ts`:

| Função | Uso |
|---|---|
| `getBrazilStates()` | 27 UFs, ordenadas pelo nome |
| `resolveBrazilState(value)` | `PB`, `pb`, `Paraíba`, `PARAIBA` → `{ nome: 'Paraíba', sigla: 'PB' }` |
| `getMunicipalitiesByState(uf)` | municípios oficiais da UF, em ordem alfabética |
| `searchMunicipalities(uf, query)` | autocomplete só naquela UF |
| `findMunicipality(uf, city)` | um município oficial, ou `null` |
| `findMunicipalityByIbgeCode(codigoIbge)` | lookup pelo código |
| `normalizeLocationSearch(value)` | chave de pesquisa; não é o valor salvo |

`normalizeLocationSearch` faz trim, minúsculas, remove diacríticos e junta espaços. Não aproxima erro de digitação: `Joao Pesoa` não vira `João Pessoa`.

`searchMunicipalities` devolve primeiro os nomes que começam com o texto, depois os que apenas contêm. Dentro de cada grupo, a ordem é a alfabética do nome oficial. Consulta vazia devolve lista vazia. UF desconhecida devolve lista vazia.

Índices montados uma vez:

- municípios por UF
- município por `codigoIbge`
- município por `UF|nome normalizado`

## Exemplos

```ts
import {
  findMunicipality,
  findMunicipalityByIbgeCode,
  resolveBrazilState,
  searchMunicipalities,
} from '@/lib/localizacao/brazilLocations';

resolveBrazilState('PARAIBA');
// { nome: 'Paraíba', sigla: 'PB' }

findMunicipality('PB', 'JOAO PESSOA');
// { nome: 'João Pessoa', uf: 'PB', codigoIbge: '2507507' }

findMunicipalityByIbgeCode('2507507');
// { nome: 'João Pessoa', uf: 'PB', codigoIbge: '2507507' }

searchMunicipalities('PB', 'joao');
// João Pessoa antes de São João do Cariri, São João do Rio do Peixe e São João do Tigre

const viaCep = { localidade: 'João Pessoa', uf: 'PB' };
findMunicipality(viaCep.uf, viaCep.localidade);
// mesmo município oficial, com codigoIbge
```

O retorno de `findMunicipality` é o nome oficial. A chave normalizada não deve ser gravada no paciente.

## Como atualizar

```bash
node scripts/atualizar-base-localidades-ibge.mjs
```

O script baixa a API, valida e só então reescreve `estados-brasil.ts`, `municipios-brasil.json` e `fonte.ts`. Se aparecer UF divergente, código duplicado, nome vazio ou município ambíguo na mesma UF, ele encerra sem gravar. Depois, rode:

```bash
npx vitest run lib/localizacao/brazilLocations.spec.ts
```

## Próxima etapa

A etapa 3 pode criar o componente compartilhado de Estado/Cidade em cima destes helpers, ainda sem ligá-lo às telas de paciente. Esta etapa para aqui.
