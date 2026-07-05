# Anamnese Adaptativa V3 — Oftware / Meta

## Objetivo

Transformar a anamnese inicial do paciente no /meta em uma entrevista clínica inteligente, humana e adaptativa, mantendo compatibilidade com o fluxo V2 atual.

## Princípios

- Não parecer formulário
- Não aumentar abandono
- Dar escolha ao paciente
- Manter perguntas obrigatórias de segurança
- Usar Gemini para humanizar, resumir e gerar highlights
- Exibir no Metaadmin um resumo moderno em formato de conversa + cards inteligentes

## Modos de entrevista

### Avaliação Essencial
Tempo estimado: 2 minutos.

Coleta:
- telefone
- nascimento
- gênero
- CPF
- peso
- altura
- circunferência se souber
- diagnóstico principal
- comorbidades principais
- riscos obrigatórios
- objetivos principais
- busca de médico

### Perfil Metabólico Completo
Tempo estimado: 5 a 7 minutos.

Inclui tudo da avaliação essencial +:
- sono
- atividade física
- alimentação
- comportamento alimentar
- energia
- histórico de tentativas anteriores
- uso prévio de medicamentos
- efeito sanfona
- barreiras de adesão
- expectativa de perda de peso
- motivação emocional

## Tela inicial de escolha

Texto principal:

"Quanto mais entendermos sua rotina, mais personalizado e seguro poderá ser seu plano terapêutico."

Opções:

1. Avaliação Essencial
"Responda apenas as informações principais para iniciar seu acompanhamento."

2. Perfil Metabólico Completo — Recomendado
"Ajude seu médico a entender sono, alimentação, energia, rotina e dificuldades para emagrecer. Isso permite uma conduta mais personalizada."

## Blocos adicionais da avaliação completa

### Sono
Perguntas:
- Como você avalia seu sono?
- Quantas horas dorme em média?
- Você acorda cansado?
- Você ronca?
- Acorda durante a noite?

Highlights possíveis:
- sono fragmentado
- possível apneia
- baixa recuperação
- fadiga diurna

### Atividade física
Perguntas:
- Como está sua rotina de movimento?
- O que mais dificulta praticar atividade física?
- Você sente dor, falta de tempo ou desânimo?

Highlights:
- sedentário
- baixa adesão
- limitação física
- rotina corrida

### Alimentação
Perguntas:
- Qual momento do dia é mais difícil para sua alimentação?
- Você sente vontade frequente de doces?
- Você belisca entre refeições?
- Come por ansiedade ou estresse?
- Sente perda de controle alimentar?

Highlights:
- alimentação emocional
- compulsão provável
- beliscos noturnos
- fome exagerada
- rotina alimentar desorganizada

### Histórico de emagrecimento
Perguntas:
- Já tentou emagrecer antes?
- Já recuperou peso depois de emagrecer?
- Já usou medicações como semaglutida, tirzepatida, sibutramina ou orlistate?
- Teve efeitos colaterais?

Highlights:
- efeito sanfona
- uso prévio de GLP-1
- intolerância medicamentosa
- expectativa frustrada

### Energia e rotina
Perguntas:
- Como está sua energia no dia a dia?
- O que mais atrapalha sua rotina saudável?
- Falta tempo, motivação, planejamento ou apoio?

Highlights:
- baixa energia
- rotina incompatível
- risco de baixa adesão
- necessidade de plano simples

## Gemini

O Gemini NÃO deve substituir o fluxo clínico obrigatório.

Ele deve:
- humanizar respostas
- gerar microcomentários empáticos
- extrair highlights
- gerar resumo médico
- sugerir perguntas adaptativas opcionais
- classificar perfil comportamental

Retorno esperado:

{
  "resumoMedico": "",
  "highlights": [],
  "perfilMetabolico": "",
  "perfilComportamental": "",
  "riscosDetectados": [],
  "barreirasAdesao": [],
  "pontosParaMedicoInvestigar": [],
  "nivelConfianca": "baixo | moderado | alto"
}

## Metaadmin

Criar visual novo na Pasta 2:

### Bloco 1 — Resumo Inteligente
Resumo gerado pelo Gemini.

### Bloco 2 — Highlights
Cards:
- Sono
- Alimentação
- Atividade física
- Riscos
- Motivação
- Adesão

### Bloco 3 — Timeline Conversacional
Exibir perguntas e respostas em formato de bate-papo.

### Bloco 4 — Dados estruturados
Manter campos atuais editáveis para compatibilidade.

## Etapas de implementação

### Etapa 1
Criar documentação, tipos e estrutura de dados.

### Etapa 2
Adicionar tela inicial com escolha entre Avaliação Essencial e Perfil Metabólico Completo.

### Etapa 3
Adicionar blocos extras somente no modo completo.

### Etapa 4
Salvar mensagens do chat em formato timeline.

### Etapa 5
Criar endpoint Gemini para gerar resumo e highlights.

### Etapa 6
Criar novo visual no Metaadmin.

### Etapa 7
Refinar UX, chips, alertas e responsividade.