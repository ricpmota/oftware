# Localização — Etapa 5

Fecha a gravação administrativa de Estado e Cidade do paciente. Não migra a base e não altera Match, contratos, `/metanutri`, `/metapersonal` nem `/metapsi`.

## /metaadmin

`PacienteIdentificacaoTabEdit` é a Identificação no desktop e no mobile. Os inputs livres de cidade e UF foram substituídos por `PatientLocationFields`.

O `onChange` atualiza o rascunho na tela. O `endereco` do paciente só recebe a localização quando ela fica oficial, ou quando o estado é apagado por completo. Rua, CEP e qualquer outro campo permanecem. Texto ainda não selecionado não substitui a cidade já gravada.

Salvar continua nos fluxos já existentes:

- desktop: `persistirPacienteProntuario` → `sincronizarIdentificacaoPaciente` → `PacienteService.createOrUpdatePaciente`
- mobile: o botão do modal → `PacienteService.createOrUpdatePaciente`

Os dois caminhos recusam localização incompleta (estado sem município oficial, ou texto como "Joao Pesoa"). Localização vazia continua permitida. `sincronizarIdentificacaoPaciente` repassa o `endereco` inteiro, inclusive `codigoIbge`.

## ViaCEP

`lib/localizacao/viaCepLocalizacao.ts` resolve `uf` + `localidade` com `findMunicipality`.

Correspondência oficial grava sigla, nome oficial e `codigoIbge`. Exemplo: PB + João Pessoa → `2507507`.

Sem correspondência, CEP e logradouro são aproveitados, os três campos de localização saem do objeto e a tela mostra "Confirme sua cidade na lista." Não há código inventado. A troca depois disso só acontece pelo `PatientLocationFields`.

## /metaadmingeral

O modal "Editar Dados de Identificação do Paciente" usa `PatientLocationFields` e transporta `codigoIbge` no rascunho.

`montarPacienteIdentificacaoAdmin` monta o save com:

```ts
endereco: {
  ...enderecoExistente,
  rua,
  cep,
  estado,
  cidade,
  codigoIbge,
}
```

O objeto antigo `{ rua, cep, cidade, estado }` deixou de substituir o endereço. Campos extras, como um complemento já gravado, permanecem.

Abrir `PB` + `JOAO PESSOA` sem código resolve na tela. O Firestore só muda quando o administrador salva. `PB` + `Joao Pesoa` continua visível e o Salvar é recusado até uma cidade oficial ser escolhida.

## Preview do chat inicial

`ModalDadosPacienteChat`, usado em `metaadmingeral/chatinicial`, desenha o passo `30`.

Telefone preenchido, sem localização oficial e sem nascimento, abre em "Agora, onde você mora?" com `PatientLocationFields`. Continuar com cidade oficial segue para a data de nascimento (passo 2). Os passos 15 e 16 da busca de médico não mudaram. O preview não grava `pacientes_completos`.

`META_CHAT_STEP_LOCALIZACAO` continua `30`. Os passos 2 a 26 não foram renumerados.

## Testes

- `lib/localizacao/viaCepLocalizacao.spec.ts`
- `lib/metaadmingeral/salvarIdentificacaoPaciente.spec.ts`

## Riscos

- O Salvar do prontuário no `/metaadmin` reescreve o paciente inteiro. Se o endereço já estiver com cidade inválida, esse save para até a localização ser corrigida ou apagada na Identificação. Cidade legada que a base reconhece (`JOAO PESSOA`) não bloqueia.
- O efeito que zera o rascunho ao trocar o `id` do paciente roda antes do campo reportar de novo. Entre os dois instantes, a checagem usa o endereço já gravado.
- Não há validação global em `PacienteService.createOrUpdatePaciente`. Outros saves que ainda montem `endereco` sem `codigoIbge` continuam possíveis. Isso fica para a Etapa 8.
