# Localização — Etapa 4

Integração da localização residencial do paciente só no `/meta`. Não migra pacientes e não altera `/metaadmin`, `/metaadmingeral`, Match, contratos, ViaCEP nem `pacientes_abandono`.

## Cadastro inicial

O wizard de `/meta` (`MetaPacienteWizard`) passa a pedir Estado e Cidade logo depois do telefone.

Ordem na tela:

1. Introdução
2. Telefone
3. Onde você mora (`PatientLocationFields`)
4. Data de nascimento
5. Demais passos da anamnese, sem mudança de ordem
6. Busca de médico, nos mesmos passos de antes

O número interno da localização é `30` (`META_CHAT_STEP_LOCALIZACAO`). Os passos 2 a 18 e o perfil metabólico (19 a 26) não foram renumerados. A barra de progresso trata o passo 30 como a posição entre o telefone e o nascimento. Avaliação completa: 24 passos (16 + 7 do perfil metabólico + 1 da busca de médico).

Texto do passo: "Agora, onde você mora?" Subtexto: "Selecione seu estado e sua cidade."

Continuar só segue com `estado`, `cidade` e `codigoIbge` oficiais. Digitar a cidade sem escolher a sugestão não avança. Trocar o estado limpa a cidade anterior no objeto que será salvo.

O `onChange` do componente só atualiza o estado do wizard. O Firestore continua sendo gravado no fluxo já existente, ao tocar em Continuar: `onSave` → `PacienteService.createOrUpdatePaciente`.

Paciente que já tem data de nascimento não é devolvido a este passo. Quem tem telefone e ainda não tem nascimento retoma na localização se ela não estiver oficial.

Paciente que entra por link de médico continua pulando a busca de médico (`medicoResponsavelId` ou `medicoRecomendadoId` levam ao passo 17). A localização residencial não preenche `medicoUi.selectedEstado` nem `medicoUi.selectedCidade`.

`getNextStepAfter(1)` segue indo para o nascimento. O preview `ModalDadosPacienteChat`, usado em `metaadmingeral/chatinicial`, não foi alterado e não renderiza o passo 30. Os pacientes de sandbox desse preview não param nesse passo.

## Firestore

Caminho:

`pacientes_completos/{id}.dadosIdentificacao.endereco`

Campos acrescentados no save do wizard, junto com rua e CEP se já existirem:

```ts
{
  rua: 'Rua das Flores',
  cep: '58000-000',
  estado: 'PB',
  cidade: 'João Pessoa',
  codigoIbge: '2507507'
}
```

Não há `dadosIdentificacao.cidade`, `dadosIdentificacao.estado` nem cidade/estado na raiz.

`codigoIbge` é opcional no tipo `DadosIdentificacao.endereco`. Pacientes antigos não têm o campo.

## Meu Perfil

`PastaIdentificacao` em `components/meta/perfil/MetaMeuPerfil.tsx` deixou de usar o select e o datalist de `data/cidades-brasil.ts`. Esse arquivo continua no projeto para outras telas.

O formulário usa `PatientLocationFields`. O `onChange` atualiza só o rascunho. Salvar continua em `PastaIdentificacao.salvar` → `onSalvarIdentificacao` → `PacienteService.patchPacienteFields`, agora com:

- `dadosIdentificacao.endereco.estado`
- `dadosIdentificacao.endereco.cidade`
- `dadosIdentificacao.endereco.codigoIbge`

Rua e CEP não entram nesse patch, então permanecem.

No Meu Perfil a localização pode ficar vazia. Estado sem município oficial, ou texto como "Joao Pesoa", bloqueia o salvamento. Apagar o estado grava ausência com `deleteField()` nos três caminhos, o mesmo critério já usado para string vazia.

`PB` + `JOAO PESSOA` sem código é resolvido pelo componente para João Pessoa / `2507507` e, se a pessoa salvar, grava o formato oficial. Não há rotina de migração em segundo plano.

## Testes

- `lib/meta/metaChatInicial/localizacaoPaciente.spec.ts`
- `lib/meta/metaChatInicial/wizardProgress.spec.ts` (totais 24 e 17)
- `lib/meta/metaChatInicial/telefoneAnamnese.spec.ts` (depois do telefone, o passo incompleto é a localização)

## Riscos

- O preview do chat em metaadmingeral não mostra o passo novo. Quem avançar por `getNextStepAfter` continua do telefone para o nascimento. Se um paciente só com telefone, sem nascimento, for aberto nesse preview, `getFirstIncompleteStep` devolve 30 e essa tela não desenha o passo.
- Pacientes que já passaram do nascimento no cadastro antigo não veem a localização no wizard. Eles ajustam em Meu Perfil.
- Um save completo do wizard reescreve o documento. Rua e CEP são mantidos pelo spread de `endereco`. Outro escritor que substitua `endereco` sem `codigoIbge` ainda pode apagar o código. Isso já valia para os campos antigos e não foi mudado fora do `/meta`.
