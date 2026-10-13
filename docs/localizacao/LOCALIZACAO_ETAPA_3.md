# Localização — Etapa 3

Componente compartilhado de Estado e Cidade do paciente. Não está ligado a `/meta`, `/metaadmin` nem `/metaadmingeral`. Não grava Firestore e não altera pacientes.

## Componente

`components/localizacao/PatientLocationFields.tsx`

A regra de seleção fica em `lib/localizacao/patientLocationField.ts` e usa só os helpers da Etapa 2. O componente não chama API, não conhece `patientId` e não usa `PacienteService`.

## Props

```ts
type PatientLocationValue = {
  estado: string
  cidade: string
  codigoIbge: string
}

type PatientLocationFieldsProps = {
  value?: { estado?: string | null; cidade?: string | null; codigoIbge?: string | null } | null
  onChange: (value: PatientLocationValue | null) => void
  onInterpretationChange?: (interpretation: PatientLocationInterpretation) => void
  disabled?: boolean
  required?: boolean
  estadoLabel?: string
  cidadeLabel?: string
  id?: string
  className?: string
}
```

`onChange` recebe a localização oficial completa, ou `null` quando ela deixa de ser válida. `null` não é um pedido para apagar o texto que a pessoa ainda está digitando: o rascunho fica no componente. Quem integrar deve guardar o último `PatientLocationValue | null` e só persistir no botão Salvar da página.

O código IBGE não aparece na tela.

## Estado

Select nativo, opções de `getBrazilStates()`, no formato `Paraíba (PB)`. O valor interno é a sigla `PB`.

Sem estado reconhecido, a cidade fica desabilitada. Placeholder: "Selecione primeiro o estado".

## Cidade

Autocomplete. A busca é `searchMunicipalities`, limitada a 8 linhas. A ordem continua a da Etapa 2: começa com o texto, depois contém. `joao` em PB encontra `João Pessoa`. `sao` em SP encontra `São Paulo`. Cidade de outro estado não entra na lista.

O nome oficial que começa com "João" na Paraíba e aparece nessa busca é `São João do Tigre`, não "João do Tigre".

Digitar não seleciona. A localização só existe depois do clique, do toque ou do Enter numa opção. Aí o valor é:

```ts
{ estado: 'PB', cidade: 'João Pessoa', codigoIbge: '2507507' }
```

Se a pessoa muda o texto depois da seleção, inclusive acento ou espaço, a seleção e o código são invalidados. `onChange(null)`. O código antigo não permanece.

## Troca de estado

Mudar de PB para PE limpa cidade, código, texto e seleção. João Pessoa não fica associada a Pernambuco.

## Dados legados

Sem `codigoIbge`, `findMunicipality` resolve só o match exato da Etapa 2.

| Entrada | Resultado |
|---|---|
| `PB` + `JOAO PESSOA` | vira João Pessoa / `2507507` no estado do componente e no `onChange` |
| `PB` + `Joao Pesoa` | o texto continua visível, mensagem pede uma cidade da lista, sem código |
| código, UF e nome coerentes | carrega normal |
| código de outra cidade | não corrige sozinho; mostra o texto recebido e pede nova seleção |

`required={false}` aceita os dois campos vazios. Não aceita texto livre, estado sem cidade nem código conflitante. `required={true}` exige a localização oficial completa.

## Acessibilidade

O campo de cidade é `role="combobox"` com `aria-expanded`, `aria-controls`, `aria-autocomplete="list"` e `aria-activedescendant`. A lista é `role="listbox"` e cada cidade é `role="option"`.

Seta para baixo e para cima movem a sugestão. Enter seleciona a sugestão ativa e não submete o formulário. Escape fecha a lista.

## Mobile

Largura total, altura mínima de toque de 44px, lista com scroll interno e altura máxima de 40% da viewport. O toque na sugestão usa `onPointerDown` com `preventDefault` para a seleção ocorrer antes do blur fechar a lista. Não há modal separado.

## Testes

Não há React Testing Library nem Storybook no projeto. Nenhuma das duas bibliotecas foi instalada, e não foi criada rota de demonstração.

A cobertura está em `lib/localizacao/patientLocationField.spec.ts`: estado, busca, seleção oficial, invalidação do texto, troca de UF, legado sem código, typo, código conflitante, `required` e teclado.

```bash
npx vitest run lib/localizacao/patientLocationField.spec.ts
```

## Integração futura

Na etapa 4, o primeiro encaixe é o Meu Perfil do `/meta` (`PastaIdentificacao`), que já edita cidade e estado. Passar `value` a partir de `dadosIdentificacao.endereco` e receber `onChange`. Gravar `estado`, `cidade` e `codigoIbge` só no Salvar que já existe. Não persistir dentro do `onChange`.
