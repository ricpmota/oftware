# README - Seção /metanutri

## Visão Geral

A seção `/metanutri` é uma área exclusiva para nutricionistas cadastrados na Plataforma META. Ela permite que nutricionistas trabalhem de forma colaborativa com médicos no acompanhamento de pacientes em tratamento de obesidade com Tirzepatida.

## Funcionalidades Principais

### 1. Home (Dashboard)
- **KPIs principais:**
  - Total de pacientes compartilhados
  - Número de médicos vinculados
  - Receita total e receita do mês
- **Gráficos e estatísticas:**
  - Análise de perda de peso (com filtros por dose, faixa etária, sexo)
  - Demografia dos pacientes
  - Comparação com dados da plataforma (base Oftware)

### 2. Médicos
Permite gerenciar relacionamentos com médicos:

- **Buscar Médicos:** Busca médicos cadastrados na plataforma por estado e cidade
- **Solicitações de Vínculo:**
  - Receber solicitações de médicos que querem trabalhar com você
  - Enviar solicitações para médicos
  - Aprovar/rejeitar solicitações recebidas
- **Médicos Vinculados:** Lista médicos com quem você está vinculado e pacientes compartilhados

### 3. Pacientes
Visualização de pacientes compartilhados pelos médicos:

- **Lista de Pacientes:** Todos os pacientes compartilhados com você
- **Visualização Completa:** Acesso a todas as informações do paciente (somente leitura):
  - Dados de identificação
  - Dados clínicos
  - Plano nutricional e check-ins diários
  - Exames laboratoriais
  - Plano terapêutico (Tirzepatida)
  - Evolução e seguimento
  - Alertas e recomendações
  - Comunicação e registro
  - Prescrições
- **Gráficos de Evolução:** Visualização de gráficos de peso, IMC, circunferência abdominal, HbA1c

### 4. Financeiro
Gestão financeira dos pacientes:

- **Lista de Pagamentos:** Visualização de status de pagamento dos pacientes
- **Filtros:** Por status (todos, em negociação, pago, pendente, atrasado)
- **Detalhes:** Visualização completa de parcelas e histórico de pagamentos

### 5. Calendário
Visualização de aplicações e pagamentos:

- **Aplicações de Tirzepatida:** Calendário mensal com aplicações agendadas
- **Pagamentos:** Datas de vencimento de parcelas
- **Detalhes do Dia:** Ao clicar em um dia, mostra todas as aplicações e pagamentos daquele dia

### 6. Meu Perfil
Configurações do perfil do nutricionista:

- **Registro Profissional:** Número de registro (CRN)
- **Cidades de Atendimento:** Cadastro de cidades onde atende
- **Link de Referral:** Gerar link personalizado para médicos se vincularem diretamente

## Fluxo de Trabalho

### 1. Cadastro e Verificação
1. Nutricionista faz login com Google
2. Sistema cria automaticamente perfil básico
3. Nutricionista completa perfil (registro, cidades)
4. Admin verifica o nutricionista (isVerificado = true)
5. Nutricionista pode começar a trabalhar

### 2. Vinculação com Médico
Existem duas formas:

**Opção A: Médico solicita vínculo**
1. Médico busca nutricionista na plataforma
2. Médico envia solicitação de vínculo
3. Nutricionista recebe notificação na aba "Solicitações"
4. Nutricionista aprova ou rejeita
5. Se aprovado, vínculo é criado

**Opção B: Nutricionista solicita vínculo**
1. Nutricionista busca médico na plataforma
2. Nutricionista envia solicitação de vínculo
3. Médico recebe notificação
4. Médico aprova ou rejeita
5. Se aprovado, vínculo é criado

### 3. Compartilhamento de Pacientes
1. Médico vinculado compartilha paciente com nutricionista
2. Nutricionista recebe solicitação na aba "Solicitações" (seção Pacientes)
3. Nutricionista aprova a solicitação
4. Paciente aparece na lista de pacientes do nutricionista
5. Nutricionista pode visualizar todos os dados do paciente (somente leitura)

### 4. Acompanhamento do Paciente
- Nutricionista visualiza:
  - Dados clínicos completos
  - Plano nutricional criado pelo sistema
  - Check-ins diários do paciente
  - Exames laboratoriais
  - Evolução (peso, IMC, circunferência, HbA1c)
  - Plano terapêutico (doses de Tirzepatida)
  - Alertas e recomendações do médico
  - Comunicação entre médico e paciente

**Importante:** O nutricionista tem acesso somente leitura aos dados. Ele não pode editar informações do paciente, mas pode visualizar tudo para fornecer suporte nutricional colaborativo.

## Estrutura de Dados

### Coleções Firestore

1. **nutricionistas**
   - userId (ID do documento)
   - email
   - nome
   - registroNumero
   - cidades: [{ estado, cidade }]
   - isVerificado: boolean
   - status: 'ativo' | 'inativo'
   - medicoVinculadoIds: string[]
   - dataCadastro: Date

2. **solicitacoes_vinculo_nutri_medico**
   - nutricionistaId
   - medicoId
   - solicitadoPor: 'medico' | 'nutricionista'
   - status: 'pendente' | 'aceita' | 'rejeitada' | 'cancelada'
   - criadoEm: Date
   - aceitoEm?: Date
   - rejeitadoEm?: Date

3. **solicitacoes_nutricionista**
   - medicoId
   - nutricionistaId
   - pacienteId
   - status: 'pendente' | 'aceita' | 'rejeitada' | 'cancelada' | 'aguardando_medico'
   - criadoEm: Date
   - aceitoEm?: Date

4. **paciente_nutricionista**
   - pacienteId
   - nutricionistaId
   - medicoId
   - status: 'ativo' | 'inativo'
   - dataCompartilhamento: Date
   - removidoEm?: Date
   - motivoRemocao?: string

## Serviços Principais

### NutricionistaService
- `getNutricionistaByUserId()`: Busca nutricionista por userId
- `createOrUpdateNutricionista()`: Cria ou atualiza perfil
- `updatePerfil()`: Atualiza registro e cidades
- `verifyNutricionista()`: Marca como verificado
- `getNutricionistasVinculadosAoMedico()`: Lista nutricionistas de um médico

### SolicitacaoVinculoNutriMedicoService
- `createVinculoRequest()`: Cria solicitação de vínculo
- `approveVinculoRequest()`: Aprova vínculo
- `rejectVinculoRequest()`: Rejeita vínculo
- `listPendingVinculoRequestsByNutri()`: Lista solicitações pendentes recebidas
- `listSentVinculoRequestsByNutri()`: Lista solicitações enviadas

### SolicitacaoNutricionistaService
- `createPacienteShareRequest()`: Cria solicitação de compartilhamento de paciente
- `approveShareRequest()`: Aprova compartilhamento
- `rejectShareRequest()`: Rejeita compartilhamento
- `listPendingRequestsByNutri()`: Lista solicitações pendentes de pacientes

### PacienteNutricionistaService
- `listPacientesVisiveisByNutri()`: Lista pacientes compartilhados
- `hasAccessToPaciente()`: Verifica acesso a paciente
- `listActiveVinculosByNutri()`: Lista vínculos ativos

## Permissões e Segurança

### Firestore Rules
- Nutricionista só pode ler/escrever seu próprio documento
- Nutricionista só pode ver pacientes compartilhados com ele (status = 'ativo')
- Nutricionista não pode editar dados de pacientes (somente leitura)
- Vínculos são validados nas rules

### Acesso aos Dados
- **Leitura:** Nutricionista pode ver todos os dados dos pacientes compartilhados
- **Escrita:** Nutricionista NÃO pode editar dados de pacientes
- **Comunicação:** Nutricionista pode ver mensagens entre médico e paciente, mas não pode enviar

## Interface do Usuário

### Layout
- Sidebar com menu lateral (colapsável)
- Header com perfil do usuário
- Área principal com conteúdo dinâmico
- Design responsivo (mobile e desktop)

### Componentes Principais
- `KpiCard`: Cards de KPIs na home
- `NutriContent`: Componente para visualizar dados nutricionais do paciente
- Gráficos usando Recharts
- Modais para visualização detalhada

## Fluxo de Dados

1. **Login:** Firebase Auth → Verifica usuário → Cria/atualiza perfil
2. **Home:** Carrega KPIs e estatísticas
3. **Médicos:** Busca médicos → Envia/recebe solicitações → Gerencia vínculos
4. **Pacientes:** Lista pacientes compartilhados → Visualiza dados completos
5. **Financeiro:** Lista pagamentos → Visualiza detalhes
6. **Calendário:** Carrega aplicações e pagamentos do mês

## Notas Importantes

1. **Verificação:** Nutricionista precisa ser verificado pelo admin para aparecer nas buscas
2. **Vínculo:** É necessário estar vinculado a um médico para receber pacientes
3. **Somente Leitura:** Nutricionista não pode editar dados de pacientes
4. **Colaboração:** O foco é trabalho colaborativo com médicos, não gestão independente
5. **Gratuito:** A plataforma é 100% gratuita para nutricionistas

## Futuras Melhorias

- Comunicação direta entre nutricionista e médico
- Recomendações nutricionais que o nutricionista pode enviar
- Relatórios personalizados
- Exportação de dados
- Notificações em tempo real
