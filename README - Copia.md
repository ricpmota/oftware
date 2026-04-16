# 🏥 Oftware - Sistema de Gestão de Tratamento de Obesidade com Tirzepatida

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Área do Paciente (`/meta`)](#área-do-paciente-meta)
4. [Área do Médico (`/metaadmin`)](#área-do-médico-metaadmin)
5. [Área Administrativa Geral (`/metaadmingeral`)](#área-administrativa-geral-metaadmingeral)
6. [Sistema de E-mails Automáticos](#sistema-de-e-mails-automáticos)
7. [Calendário de Aplicações](#calendário-de-aplicações)
8. [Tecnologias Utilizadas](#tecnologias-utilizadas)
9. [Estrutura de Dados](#estrutura-de-dados)
10. [Deploy e Configuração](#deploy-e-configuração)

---

## 🎯 Visão Geral

O **Oftware** é uma plataforma completa para gestão de tratamento de obesidade com Tirzepatida, conectando médicos e pacientes em um sistema integrado que permite:

- **Para Pacientes**: Buscar médicos, solicitar atendimento, acompanhar tratamento, receber lembretes automáticos
- **Para Médicos**: Gerenciar pacientes, acompanhar evolução, configurar planos terapêuticos, receber leads qualificados
- **Para Administradores**: Monitorar métricas globais, gerenciar e-mails automáticos, acompanhar calendário de aplicações

---

## 🏗️ Arquitetura do Sistema

### Páginas Principais

| Rota | Descrição | Acesso |
|------|-----------|--------|
| `/` | Página inicial com login e informações | Público |
| `/meta` | Área do Paciente | Pacientes autenticados |
| `/metaadmin` | Área do Médico | Médicos autenticados |
| `/metaadmingeral` | Área Administrativa Geral | Admin (ricpmota.med@gmail.com) |

### Autenticação

- **Método**: Firebase Authentication com Google (Gmail)
- **Criação Automática**: Novos usuários são automaticamente criados como leads
- **E-mail de Boas-vindas**: Enviado automaticamente ao cadastro

---

## 👤 Área do Paciente (`/meta`)

### Funcionalidades Principais

#### 1. **Estatísticas Pessoais**
- Visualização de evolução do peso
- Gráficos de IMC e circunferência abdominal
- Acompanhamento de metas do tratamento
- Indicadores de adesão e progresso

#### 2. **Buscar Médicos**
- Busca por localização (estado e cidade)
- Visualização de médicos disponíveis com:
  - Nome completo (Dr./Dra.)
  - CRM e estado
  - Cidades de atendimento
  - Endereço completo
- Filtros por proximidade
- Botão de contato direto via WhatsApp

#### 3. **Minhas Solicitações**
- Lista de solicitações enviadas para médicos
- Status de cada solicitação:
  - 🟡 **Pendente**: Aguardando aprovação do médico
  - 🟢 **Aceita**: Médico aceitou o atendimento
  - 🔴 **Rejeitada**: Médico rejeitou
  - ⚫ **Desistiu**: Paciente desistiu
- Histórico completo de interações

#### 4. **Minha Anamnese**
- Visualização completa dos dados cadastrados
- Organizado em 9 pastas de informações:
  1. Dados de Identificação
  2. Dados Clínicos da Anamnese
  3. Estilo de Vida
  4. Exames Laboratoriais
  5. Plano Terapêutico
  6. Evolução / Seguimento Semanal
  7. Alertas e Eventos
  8. Comunicação e Registro
  9. Dados Derivados / Indicadores

#### 5. **Meus Tratamentos**
- Visualização do plano terapêutico configurado pelo médico
- Histórico de aplicações
- Próximas datas de aplicação
- Dose atual e esquema de titulação
- Metas do tratamento

#### 6. **Recomendações**
- Leitura de recomendações do tratamento
- Confirmação de leitura (notifica o médico)
- Acesso a informações importantes sobre o tratamento

#### 7. **Mensagens**
- Comunicação direta com o médico responsável
- Histórico de mensagens enviadas e recebidas
- Notificações de novas mensagens

---

## 👨‍⚕️ Área do Médico (`/metaadmin`)

### Funcionalidades Principais

#### 1. **Estatísticas**
- Dashboard completo com métricas dos pacientes:
  - Total de pacientes (pendentes, em tratamento, concluídos)
  - Distribuição por status
  - Taxa de conversão de leads
  - Gráficos de evolução do tratamento
  - KPIs de adesão e resultados

#### 2. **Meu Perfil Médico**
- Cadastro completo do perfil profissional:
  - **Nome completo**
  - **Email** (Gmail)
  - **CRM Número** (ex: 12345)
  - **CRM Estado** (todos os estados do Brasil)
  - **Endereço Completo**
  - **Telefone**
  - **Gênero** (Masculino/Feminino) - para exibir Dr./Dra.
  - **Cidades de Atendimento** (múltiplas seleções: estado + cidade)
- E-mail de boas-vindas enviado automaticamente ao salvar perfil pela primeira vez

#### 3. **Pacientes**
- **Lista Completa de Pacientes**:
  - Filtros por status (todos, pendentes, em tratamento, concluídos)
  - Filtro por recomendações lidas/não lidas
  - Busca por nome
  - Badges coloridos para status:
    - 🟡 **Pendente**: Amarelo
    - 🟢 **Em Tratamento**: Verde
    - 🔵 **Concluído**: Azul
    - ⚫ **Abandono**: Cinza

- **Cadastro de Novo Paciente**:
  - Nome completo *
  - Email *
  - Telefone
  - CPF
  - Criação automática no sistema

- **Edição Completa do Paciente** (Modal com 9 Pastas):

  **Pasta 1: Dados de Identificação**
  - Nome completo, email, telefone, CPF
  - Data de nascimento
  - Sexo biológico
  - CEP (com busca automática ViaCEP)
  - Endereço completo (preenchido automaticamente)
  - Data de cadastro
  - Médico responsável

  **Pasta 2: Dados Clínicos da Anamnese**
  - Medidas iniciais (peso, altura, IMC, circunferência abdominal)
  - Diagnóstico principal (DM2, obesidade, sobrepeso, pré-diabetes, etc.)
  - Comorbidades associadas (hipertensão, dislipidemia, apneia, etc.)
  - Medicações em uso atual
  - Alergias conhecidas
  - Riscos e condições que impactam a tirzepatida
  - História tireoidiana
  - Função renal (eGFR, estágio DRC)
  - Sintomas basais relacionados ao trato GI
  - Objetivos do tratamento

  **Pasta 3: Estilo de Vida**
  - Padrão alimentar
  - Frequência alimentar
  - Ingestão de líquidos
  - Atividade física
  - Uso de álcool
  - Tabagismo
  - Sono (horas médias)
  - Estresse e bem-estar
  - Suporte multiprofissional
  - Expectativas do tratamento
  - Observações clínicas

  **Pasta 4: Exames Laboratoriais**
  - Múltiplos exames com histórico:
    - Glicemia de jejum
    - Hemoglobina glicada (HbA1c)
    - Ureia, creatinina, TFG
    - TGO (AST), TGP (ALT), GGT
    - Amilase, lipase
    - Colesterol total, HDL, LDL, triglicerídeos
    - TSH, T4 livre, calcitonina
    - Ferritina, ferro sérico
    - Vitamina B12, Vitamina D
    - Hemograma completo
  - Gráficos de evolução com faixas de referência
  - Alertas automáticos para valores fora da normalidade

  **Pasta 5: Plano Terapêutico**
  - **Metadados do Plano**:
    - Data de início do tratamento
    - Dia da semana da aplicação (seg, ter, qua, qui, sex, sab, dom)
    - Número de semanas de tratamento (padrão: 18)
    - Consentimento assinado
  - **Dose e Titulação**:
    - Dose atual (2.5mg, 5mg, 7.5mg, 10mg, 12.5mg, 15mg)
    - Status de titulação (INICIADO, EM_TITULACAO, MANUTENCAO, PAUSADO, ENCERRADO)
    - Data da última mudança de dose
    - Próxima data de revisão
    - Histórico de doses aplicadas
    - Notas de titulação
  - **Metas do Tratamento**:
    - Tipo de meta de perda de peso (percentual ou absoluto)
    - Valor da meta
    - Peso-alvo
    - Meta de HbA1c (≤7.0, ≤6.8, ≤6.5)
    - Meta de redução de circunferência abdominal (5cm, 10cm, 15cm)
    - Metas secundárias (remissão pré-diabetes, melhora EHNA, etc.)
  - **Plano Comportamental**:
    - Plano nutricional (hipocalórico, low-carb, mediterrâneo, etc.)
    - Plano de atividade física (iniciante, moderado, vigoroso)
    - Suporte multiprofissional (nutricionista, psicologia, educação física)
  - **Curva Esperada de Evolução**:
    - Gráfico de peso esperado vs. real
    - Previsão de HbA1c e circunferência abdominal
    - Status de variância (GREEN, YELLOW, RED)
  - **Esquema de Titulação Sugerido**:
    - Sugestão automática baseada em adesão e efeitos colaterais
    - Bloqueio de upgrade quando necessário
  - **E-mail automático** enviado ao paciente quando o plano é editado

  **Pasta 6: Evolução / Seguimento Semanal**
  - Registro semanal de evolução:
    - Peso atual (kg)
    - Circunferência abdominal (cm)
    - Pressão arterial (sistólica/diastólica)
    - Frequência cardíaca
    - HbA1c (quando disponível)
    - Dose aplicada (mg)
    - Data e horário da aplicação
    - Local da aplicação (abdome, coxa, braço)
    - Adesão (pontual, atrasada, esquecida)
    - Severidade de sintomas GI (leve, moderado, grave)
    - Efeitos colaterais
    - Observações do paciente
    - Comentário do médico
  - Gráficos de evolução ao longo do tempo
  - Comparação com curva esperada
  - Alertas automáticos para desvios

  **Pasta 7: Alertas e Eventos**
  - Alertas automáticos gerados pelo sistema:
    - Dose semanal não aplicada
    - Náusea/vômito grave
    - Gestação informada
    - TFG < 15 mL/min/1,73m²
    - Histórico familiar de MEN2/CMT positivo
    - Pancreatite suspeita
    - Valores laboratoriais anormais
    - Bloqueio de upgrade de dose
  - Histórico de eventos importantes
  - Ações sugeridas pelo sistema

  **Pasta 8: Comunicação e Registro**
  - Mensagens entre médico e paciente
  - Histórico de todas as doses e ajustes
  - Termo de consentimento assinado
  - Logs de acesso e alterações
  - Anexos de documentos

  **Pasta 9: Dados Derivados / Indicadores**
  - KPIs calculados automaticamente:
    - Evolução ponderal (kg perdidos, % perdido)
    - Tempo em tratamento (semanas)
    - Tendência de HbA1c
    - Tendência de TFG e perfil hepático
    - Adesão média (%)
    - Incidência de efeitos adversos
    - Status de variância (GREEN/YELLOW/RED)
  - Gráficos de indicadores
  - Comparação com metas

#### 4. **Leads**
- Pipeline visual de leads qualificados:
  - Status dos leads:
    - 🟡 **Não Qualificado**: Novo lead, ainda não contatado
    - 🔵 **Enviado Contato**: E-mail de contato enviado
    - 🟠 **Contato Feito**: Contato estabelecido
    - 🟢 **Qualificado**: Lead qualificado e convertido
    - ⚫ **Excluído**: Lead removido
  - Filtros por status
  - Busca por nome ou email
  - Informações de cada lead:
    - Nome, email, telefone
    - Data de criação
    - Status atual
    - Histórico de e-mails enviados
    - Informações sobre solicitação de médico (se houver)
  - Ações:
    - Atualizar status
    - Enviar e-mail manual
    - Ver histórico completo
    - Excluir lead

#### 5. **Tirzepatida**
- Gestão de preços das doses:
  - 2.5mg, 5mg, 7.5mg, 10mg, 12.5mg, 15mg
  - Edição de preços por dose
  - Salvamento automático no Firestore
- **Carrinho de Compras**:
  - Adicionar doses ao carrinho
  - Calcular total automaticamente
  - Gerar prescrição em PDF
  - Enviar prescrição por e-mail

#### 6. **Prescrições**
- Geração de prescrições em PDF
- Histórico de prescrições geradas
- Envio automático por e-mail

#### 7. **Calendário**
- Visualização mensal de aplicações dos pacientes
- Filtros por paciente, data, dose
- Indicadores visuais de status

#### 8. **Mensagens**
- Comunicação com pacientes
- Histórico de mensagens
- Notificações de novas mensagens

---

## 🛠️ Área Administrativa Geral (`/metaadmingeral`)

Acesso exclusivo para o administrador geral (ricpmota.med@gmail.com).

### Funcionalidades Principais

#### 1. **Estatísticas**
- Dashboard global do sistema:
  - Total de médicos cadastrados
  - Total de pacientes
  - Distribuição de status de tratamento
  - Taxa de conversão de leads
  - Estatísticas de abandono
  - Ranking de motivos de abandono

#### 2. **Médicos**
- Lista completa de todos os médicos cadastrados
- Informações:
  - Nome, CRM, email, telefone
  - Status de verificação
  - Data de cadastro
  - Cidades de atendimento
- Ações:
  - Verificar médico
  - Editar informações
  - Ver pacientes do médico

#### 3. **Pacientes**
- Lista completa de todos os pacientes do sistema
- Filtros:
  - Por médico responsável
  - Por status de tratamento
  - Por recomendações lidas
  - Busca por nome
- Visualização completa de dados
- Ações administrativas

#### 4. **Leads**
- Pipeline completo de leads:
  - Visualização de todos os leads do sistema
  - Filtros por status
  - Estatísticas de conversão
  - Histórico completo de e-mails
  - Acompanhamento de qualificação

#### 5. **Tirzepatida**
- Gestão global de preços
- Configurações gerais

#### 6. **E-mails**
- **Gestão Completa de E-mails Automáticos**:
  
  **Módulos de E-mail Disponíveis**:
  
  1. **Leads** (5 e-mails sequenciais):
     - Email 1: Imediato (10 minutos após cadastro)
     - Email 2: 24 horas
     - Email 3: 72 horas (3 dias)
     - Email 4: 7 dias
     - Email 5: 14 dias
  
  2. **Solicitado Médico**:
     - Boas-vindas: Enviado quando paciente escolhe médico e é aceito
  
  3. **Em Tratamento**:
     - Plano Editado: Enviado quando médico edita plano terapêutico
  
  4. **Novo Lead Médico**:
     - Novo Lead: Avisa médico sobre nova solicitação de paciente
  
  5. **Aplicação**:
     - Aplicação Antes: Enviado 1 dia antes da aplicação
     - Aplicação Dia: Enviado no dia da aplicação
  
  6. **Lead Avulso**:
     - Novo Lead: Avisa admin sobre novo cadastro no sistema
  
  7. **Check Recomendações**:
     - Recomendações Lidas: Avisa médico quando paciente lê recomendações
  
  8. **Bem-vindo**:
     - Bem-vindo Geral: Enviado automaticamente a novos clientes
     - Bem-vindo Médico: Enviado quando médico salva perfil pela primeira vez
  
  9. **Novidades**:
     - Envio em massa para pacientes ou médicos
     - Opção de envio específico para pessoas selecionadas

  **Funcionalidades**:
  - Editor de e-mails com preview
  - Variáveis dinâmicas disponíveis:
    - `{nome}`: Nome da pessoa
    - `{medico}`: Nome do médico responsável
    - `{inicio}`: Data de início do tratamento
    - `{numero}`: Número da aplicação
    - `{semanas}`: Duração do tratamento em semanas
  - Configuração de assunto e corpo HTML
  - Teste de envio
  - Histórico completo de envios (Caixa de Saída)
  - Organização por módulo e título
  - Filtros e busca

#### 7. **Calendário**
- **Calendário de Aplicações**:
  - Visualização de todas as aplicações agendadas
  - Filtros:
    - Por data (início e fim)
    - Por paciente
    - Por dose (mg)
    - Por status de e-mail
  - Colunas da tabela:
    - Data da aplicação
    - Nome do paciente
    - Médico responsável
    - Dose prevista (mg)
    - Número da aplicação
    - Status E-mail Antes (enviado/pendente/não enviado)
    - Status E-mail Dia (enviado/pendente/não enviado)
  - Indicadores visuais de status
  - Botão para testar envio de e-mails

- **Dashboard de Evolução**:
  - Métricas globais:
    - Total de pacientes em tratamento
    - Total de aplicações realizadas
    - Total de mg aplicadas (somatório)
    - Média de mg por paciente
    - Distribuição dos ciclos (1ª, 2ª, 3ª aplicação...)
    - Progresso mensal da plataforma
  - Gráficos:
    - Linha: Total de mg aplicadas ao longo do tempo
    - Barras: Número de pacientes começando tratamento por mês
    - Pizza: Distribuição por ciclo de tratamento

---

## 📧 Sistema de E-mails Automáticos

### Configuração

- **Provedor**: Zoho Mail (SMTP)
- **E-mail Remetente**: suporte@oftware.com.br
- **Autenticação**: App Password do Zoho

### Módulos e Triggers

| Módulo | Tipo de E-mail | Quando é Enviado |
|--------|----------------|------------------|
| **Bem-vindo Geral** | Automático | Novo cliente se cadastra no sistema |
| **Bem-vindo Médico** | Automático | Médico salva perfil pela primeira vez |
| **Lead Avulso** | Automático | Novo lead detectado (admin) |
| **Novo Lead Médico** | Automático | Paciente escolhe médico e cria solicitação |
| **Solicitado Médico** | Automático | Médico aceita solicitação do paciente |
| **Plano Editado** | Automático | Médico edita plano terapêutico |
| **Aplicação Antes** | Automático | 1 dia antes da aplicação (cron job) |
| **Aplicação Dia** | Automático | No dia da aplicação (cron job) |
| **Check Recomendações** | Automático | Paciente lê recomendações |
| **Leads** (5 e-mails) | Automático | Sequência automática baseada em tempo |
| **Novidades** | Manual | Envio em massa ou específico |

### Variáveis Disponíveis

Todas as variáveis funcionam em todos os módulos:

- `{nome}`: Nome da pessoa (paciente ou médico)
- `{medico}`: Nome do médico responsável (formato: Dr./Dra. Nome)
- `{inicio}`: Data de início do tratamento
- `{numero}`: Número da aplicação (1ª, 2ª, 3ª...)
- `{semanas}`: Duração do tratamento em semanas

### Cron Jobs

Configurados no `vercel.json`:

- **E-mails de Aplicação**: `0 8 * * *` (todos os dias às 8h)
- **E-mails Automáticos**: `*/5 * * * *` (a cada 5 minutos)
- **Atualização de Conversão**: `*/10 * * * *` (a cada 10 minutos)

### Monitoramento

- **Caixa de Saída**: Histórico completo de todos os e-mails enviados
- **Organização**: Por módulo → Título → Quantidade
- **Status**: Enviado, Pendente, Falhou
- **Detalhes**: Data/hora, destinatário, assunto, erro (se houver)

---

## 📅 Calendário de Aplicações

### Funcionalidades

#### Cálculo Automático de Aplicações
- Baseado no plano terapêutico do paciente:
  - Data de início do tratamento
  - Dia da semana da aplicação
  - Número de semanas de tratamento
- Considera histórico de doses aplicadas
- Calcula corretamente o número da aplicação (1ª, 2ª, 3ª...)
- Calcula dose prevista baseada no esquema de titulação padrão

#### Lógica de Envio de E-mails
- **E-mail Antes**: Enviado 1 dia antes da aplicação (amanhã)
- **E-mail Dia**: Enviado no dia da aplicação (hoje)
- **Regras**:
  - Nunca envia e-mails sobre datas passadas
  - Processamento automático via cron job (8h diariamente)
  - Verificação de duplicidade antes de enviar

#### Filtros Disponíveis
- **Data**: Início e fim (padrão: mês atual)
- **Paciente**: Seleção específica
- **Dose**: Filtro por dose em mg
- **Status de E-mail**: Enviado, Pendente, Não enviado

#### Indicadores Visuais
- 🟢 **Enviado**: Badge verde com ícone de check
- 🟡 **Pendente**: Badge amarelo com ícone de relógio
- ⚫ **Não enviado**: Badge cinza com ícone de X

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Next.js 15.4.8** (App Router)
- **React 19.1.2**
- **TypeScript 5**
- **Tailwind CSS 4**
- **Lucide React** (ícones)
- **Recharts** (gráficos)

### Backend
- **Next.js API Routes**
- **Firebase Firestore** (banco de dados)
- **Firebase Authentication** (autenticação)
- **Firebase Admin SDK** (operações server-side)

### E-mail
- **Nodemailer** (envio de e-mails)
- **Zoho Mail SMTP** (provedor)
- **IMAP** (leitura de e-mails recebidos)

### Deploy
- **Vercel** (hospedagem e CI/CD)
- **Vercel Cron Jobs** (tarefas agendadas)

### Outras Bibliotecas
- **jsPDF** (geração de PDFs)
- **date-fns** (manipulação de datas)

---

## 📊 Estrutura de Dados

### Collections do Firestore

#### `medicos`
```typescript
{
  id: string;
  userId: string; // Firebase Auth UID
  email: string;
  nome: string;
  genero?: 'M' | 'F';
  telefone?: string;
  crm: {
    numero: string;
    estado: string;
  };
  localizacao: {
    endereco: string;
    cep?: string;
    pontoReferencia?: string;
    lat?: number;
    lng?: number;
  };
  cidades: Array<{
    estado: string;
    cidade: string;
  }>;
  dataCadastro: Date;
  status: 'ativo' | 'inativo';
  isVerificado?: boolean;
}
```

#### `pacientes_completos`
```typescript
{
  id: string;
  userId: string;
  email: string;
  nome: string;
  medicoResponsavelId: string | null;
  
  // 9 Pastas de Informações
  dadosIdentificacao: DadosIdentificacao;
  dadosClinicos: DadosClinicos;
  estiloVida: EstiloVida;
  examesLaboratoriais: ExamesLaboratoriais[];
  planoTerapeutico: PlanoTerapeutico;
  evolucaoSeguimento: SeguimentoSemanal[];
  alertas: Alerta[];
  comunicacao: Comunicacao;
  indicadores: Indicadores;
  
  dataCadastro: Date;
  status: 'ativo' | 'inativo' | 'arquivado';
  statusTratamento: 'pendente' | 'em_tratamento' | 'concluido' | 'abandono';
  motivoAbandono?: string;
  dataAbandono?: Date;
  recomendacoesLidas?: boolean;
  dataLeituraRecomendacoes?: Date;
}
```

#### `solicitacoes_medico`
```typescript
{
  id: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteEmail: string;
  medicoId: string;
  status: 'pendente' | 'aceita' | 'rejeitada' | 'desistiu';
  criadoEm: Date;
  aceitoEm?: Date;
  rejeitadoEm?: Date;
  motivoRejeicao?: string;
  motivoDesistencia?: string;
}
```

#### `leads`
```typescript
{
  id: string;
  uid: string; // Firebase Auth UID
  email: string;
  name: string;
  createdAt: Date;
  lastSignInTime?: Date;
  emailVerified: boolean;
  status: 'nao_qualificado' | 'enviado_contato' | 'contato_feito' | 'qualificado' | 'excluido';
  dataStatus: Date;
}
```

#### `email_envios`
```typescript
{
  id: string;
  leadId: string;
  leadEmail: string;
  leadNome: string;
  emailTipo: string; // Tipo do e-mail (ex: 'aplicacao_aplicacao_antes')
  assunto: string;
  enviadoEm: Date;
  status: 'enviado' | 'falhou' | 'pendente';
  erro?: string;
  tentativas: number;
  tipo: 'automatico' | 'manual';
  solicitacaoId?: string; // Para e-mails de solicitação
}
```

#### `emails` (Templates)
```typescript
{
  id: string; // Ex: 'aplicacao_aplicacao_antes'
  assunto: string;
  corpoHtml: string;
}
```

---

## 🚀 Deploy e Configuração

### Variáveis de Ambiente

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (Server-side)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# Zoho Mail
ZOHO_EMAIL=suporte@oftware.com.br
ZOHO_PASSWORD=... # App Password do Zoho
```

### Comandos de Deploy

```bash
# Desenvolvimento local
npm run dev

# Build de produção
npm run build

# Deploy para Vercel
vercel --prod
```

### Cron Jobs (Vercel)

Configurado em `vercel.json`:
- E-mails de aplicação: Diariamente às 8h
- E-mails automáticos: A cada 5 minutos
- Atualização de conversão: A cada 10 minutos

---

## 📝 Regras de Negócio Importantes

### Status de Tratamento
1. **Pendente**: Paciente cadastrado, aguardando configuração completa
2. **Em Tratamento**: Plano terapêutico configurado, tratamento ativo
3. **Concluído**: Tratamento finalizado
4. **Abandono**: Paciente abandonou o tratamento

### Cálculo de Aplicações
- Baseado na data de início e dia da semana
- Considera histórico de doses aplicadas
- Próxima aplicação = número de aplicações realizadas + 1
- Dose prevista calculada automaticamente pelo esquema de titulação

### E-mails Automáticos
- **Não retroativo**: E-mails só são enviados para hoje e amanhã
- **Deduplicação**: Sistema verifica se e-mail já foi enviado antes de enviar novamente
- **Logs completos**: Todos os envios são registrados em `email_envios`

### Segurança
- Autenticação obrigatória via Firebase Auth
- Acesso administrativo restrito a `ricpmota.med@gmail.com`
- Validação de dados em todas as APIs
- Sanitização de inputs

---

## 🔄 Fluxos Principais

### 1. Cadastro de Novo Paciente
1. Paciente faz login com Gmail
2. Sistema cria lead automaticamente
3. E-mail "Bem-vindo Geral" enviado ao paciente
4. E-mail "Lead Avulso" enviado ao admin
5. Paciente pode buscar médicos e solicitar atendimento

### 2. Paciente Escolhe Médico
1. Paciente busca médicos por localização
2. Seleciona médico e envia solicitação
3. E-mail "Novo Lead Médico" enviado ao médico
4. Médico recebe notificação na área "Pacientes"
5. Médico aceita ou rejeita solicitação
6. Se aceito: E-mail "Solicitado Médico" enviado ao paciente
7. Status muda para "Em Tratamento"

### 3. Médico Configura Tratamento
1. Médico edita paciente e configura Plano Terapêutico
2. Define data de início, dia da semana, número de semanas
3. Sistema calcula automaticamente todas as aplicações futuras
4. E-mail "Plano Editado" enviado ao paciente
5. Aplicações aparecem no Calendário

### 4. Envio Automático de E-mails de Aplicação
1. Cron job roda diariamente às 8h
2. Sistema busca todas as aplicações agendadas
3. Identifica aplicações de hoje e amanhã
4. Verifica se e-mails já foram enviados
5. Envia e-mails pendentes
6. Registra envios em `email_envios`
7. Status atualizado no Calendário

---

## 📚 Arquivos e Estrutura do Projeto

### Principais Diretórios

```
/
├── app/
│   ├── api/                    # API Routes
│   │   ├── cron/               # Cron jobs
│   │   ├── send-email-*/      # APIs de envio de e-mail
│   │   └── email-config/       # Configuração de e-mails
│   ├── meta/                   # Área do Paciente
│   ├── metaadmin/              # Área do Médico
│   └── metaadmingeral/         # Área Administrativa
├── components/                 # Componentes React
│   ├── EmailManagement.tsx     # Gestão de e-mails
│   ├── CalendarioAplicacoes.tsx # Calendário
│   └── DashboardEvolucao.tsx  # Dashboard
├── services/                   # Serviços de negócio
│   ├── pacienteService.ts      # CRUD de pacientes
│   ├── medicoService.ts       # CRUD de médicos
│   ├── aplicacaoService.ts    # Cálculo de aplicações
│   ├── emailAplicacaoService.ts # Envio de e-mails
│   └── ...
├── types/                      # Definições TypeScript
│   ├── obesidade.ts           # Tipos de paciente
│   ├── medico.ts              # Tipos de médico
│   ├── emailConfig.ts         # Tipos de e-mail
│   └── calendario.ts          # Tipos de calendário
└── lib/
    └── firebase.ts            # Configuração Firebase
```

---

## 🎯 Funcionalidades Futuras (Roadmap)

- [ ] Integração com Google Calendar
- [ ] Notificações push
- [ ] App mobile (React Native)
- [ ] Relatórios em PDF
- [ ] Exportação de dados
- [ ] Integração com sistemas de laboratório
- [ ] Telemedicina integrada
- [ ] Sistema de agendamento de consultas

---

## 📞 Suporte e Contato

- **E-mail Admin**: ricpmota.med@gmail.com
- **E-mail Suporte**: suporte@oftware.com.br
- **Plataforma**: https://www.oftware.com.br

---

**Última atualização**: Dezembro 2024  
**Versão**: 1.0.0  
**Status**: Produção
