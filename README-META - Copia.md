# 📋 README - Sistema META (Tratamento de Obesidade com Tirzepatida)

## 🎯 Objetivo do Sistema
Sistema para gerenciamento de tratamento de obesidade com Tirzepatida. O sistema conecta médicos e pacientes, permitindo que médicos gerenciem seus pacientes com informações clínicas completas organizadas em 9 pastas.

## 🏗️ Estrutura Atual

### Páginas Principais

#### `/meta` - Área do Paciente
- **Status**: Copiado de `/cenoft`, renomeado para MetaPage
- **Funcionalidade**: Visualização para pacientes (a ser desenvolvida)

#### `/metaadmin` - Área do Médico
- **Status**: Copiado de `/admin`, adaptado para médicos
- **Funcionalidades Implementadas**:
  - ✅ Menu "Meu Perfil Médico" - Cadastro do médico
  - ✅ Menu "Pacientes" - Lista de pacientes do médico
  - ✅ Modal de cadastro básico de paciente
  - ✅ Modal de edição com 9 abas (pastas)

## 👨‍⚕️ Cadastro do Médico

### Campos Obrigatórios
- Nome completo
- Email (Gmail)
- **CRM Número** (ex: 12345)
- **CRM Estado** (select com todos os estados do Brasil)
- **Endereço Completo**
- **Gênero** (Masculino/Feminino) - para exibir Dr./Dra.
- **Cidades de Atendimento** (estado + cidade, múltiplas)

### Funcionalidades
- Salvamento automático no Firestore
- Carregamento automático do perfil ao acessar menu "Meu Perfil"
- Busca por `userId` do Firebase Auth

## 👤 Cadastro de Paciente

### Processo de Cadastro

#### 1. Cadastro Inicial (Modal Simples)
- **Nome Completo** *
- **Email** *
- Telefone
- CPF

#### 2. Edição Completa (Modal com 9 Pastas)
Após cadastro, o paciente pode ser editado com informações completas.

---

## 📁 9 Pastas de Informações do Paciente

### ✅ Pasta 1: Dados de Identificação (COMPLETO)

**Campos Implementados:**
1. Nome Completo
2. E-mail
3. Telefone
4. CPF
5. Data de Nascimento (input type="date")
6. Sexo Biológico (Masculino/Feminino/Outro)
7. **CEP** - Com busca automática via ViaCEP API
   - Busca automática no onBlur
   - Botão "Buscar" manual
   - Preenche automaticamente: Rua, Cidade, Estado
8. Endereço (Rua) - Preenchido automaticamente pelo CEP
9. Cidade - Preenchido automaticamente pelo CEP
10. Estado - Preenchido automaticamente pelo CEP
11. Data de Cadastro (readonly, formato DD/MM/AAAA)
12. Médico Responsável (readonly, exibe Dr. ou Dra. + nome)

### ⏳ Pasta 2: Dados Clínicos da Anamnese (PENDENTE)

**Campos a Implementar:**
- Diagnóstico principal
- IMC inicial
- Circunferência abdominal
- Comorbidades associadas
- Medicações em uso atual
- Alergias conhecidas
- Histórico pancreático
- Gastroparesia diagnosticada
- Histórico familiar de carcinoma medular de tireoide (CMT) ou MEN2
- Histórico de tireoide
- Doença renal prévia / Estágio da DRC
- Gestação ou lactação

### ⏳ Pasta 3: Estilo de Vida (PENDENTE)

**Campos a Implementar:**
- Padrão alimentar
- Nível de atividade física
- Uso de álcool
- Tabagismo
- Horas médias de sono
- Nível de estresse ou ansiedade
- Expectativas do tratamento

### ⏳ Pasta 4: Exames Laboratoriais Basais (PENDENTE)

**Campos a Implementar:**
- Glicemia de jejum
- Hemoglobina glicada (HbA1c)
- Ureia e creatinina
- Taxa de filtração glomerular estimada (TFG)
- TGO (AST), TGP (ALT)
- GGT, Fosfatase alcalina
- Amilase e Lipase
- Colesterol total, HDL, LDL
- Triglicerídeos
- TSH e T4 livre (se aplicável)
- Calcitonina (se risco de CMT)
- Hemograma completo

### ⏳ Pasta 5: Plano Terapêutico (Care Plan) (PENDENTE)

**Campos a Implementar:**
- Data de início do tratamento
- Dose atual de tirzepatida (mg/semana)
- Histórico de doses anteriores
- Próxima revisão médica agendada
- Observações clínicas
- Metas definidas:
  - Peso-alvo
  - HbA1c-alvo
  - IMC desejado
  - Data prevista de reavaliação

### ⏳ Pasta 6: Evolução / Seguimento Semanal (PENDENTE)

**Campos a Implementar:**
- Data do registro
- Peso atual (kg)
- Circunferência abdominal (cm)
- Pressão arterial sistólica / diastólica
- Frequência cardíaca
- Dose aplicada (mg)
- Data e horário da aplicação
- Adesão
- Efeitos colaterais
- Grau dos sintomas
- Observações livres do paciente
- Comentário médico

### ⏳ Pasta 7: Alertas e Eventos Importantes (PENDENTE)

**Alertas Automáticos:**
- Dose semanal não aplicada
- Náusea/vômito grave
- Gestação informada
- TFG < 15 mL/min/1,73m²
- Histórico familiar de MEN2/CMT positivo
- Pancreatite suspeita

### ⏳ Pasta 8: Comunicação e Registro (PENDENTE)

**Funcionalidades:**
- Mensagens entre médico e paciente
- Anexos
- Histórico de todas as doses e ajustes
- Termo de consentimento assinado
- Logs de acesso e alterações

### ⏳ Pasta 9: Dados Derivados / Indicadores (PENDENTE)

**Indicadores:**
- Evolução ponderal
- Tempo em tratamento
- Tendência de HbA1c
- Tendência de TFG e perfil hepático
- Adesão média
- Incidência de efeitos adversos

---

## 🗂️ Estrutura de Dados

### Tipos TypeScript

#### `types/medico.ts`
```typescript
interface Medico {
  id: string;
  userId: string; // Firebase Auth UID
  email: string;
  nome: string;
  genero?: 'M' | 'F'; // Para exibir Dr./Dra.
  crm: {
    numero: string;
    estado: string;
  };
  localizacao: {
    endereco: string;
    lat?: number;
    lng?: number;
  };
  cidades: {
    estado: string;
    cidade: string;
  }[];
  dataCadastro: Date;
  status: 'ativo' | 'inativo';
}
```

#### `types/obesidade.ts`
```typescript
interface PacienteCompleto {
  id: string;
  userId: string;
  email: string;
  nome: string;
  medicoResponsavelId: string;
  
  // Pasta 1: Dados de Identificação
  dadosIdentificacao: DadosIdentificacao;
  
  // Pastas 2-9
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
  statusTratamento: 'pendente' | 'em_tratamento' | 'concluido';
}
```

---

## 🔄 Fluxo de Funcionamento

### 1. Médico se Cadastra
- Login com Gmail (Firebase Auth)
- Acessa menu "Meu Perfil Médico"
- Preenche: CRM, Endereço, Gênero, Cidades
- Dados salvos no Firestore

### 2. Médico Cadastra Paciente
- Clica em "Novo Paciente"
- Preenche: Nome, Email (obrigatórios), Telefone, CPF
- Paciente criado com status "pendente"

### 3. Médico Edita Paciente
- Clica em "Editar" na lista de pacientes
- Modal com 9 abas abre
- Pasta 1 completa: busca CEP, preenche endereço automaticamente
- Pastas 2-9: aguardando implementação

### 4. Status de Tratamento
- **Pendente**: Paciente cadastrado, aguardando preenchimento completo
- **Em Tratamento**: Em acompanhamento ativo
- **Concluído**: Tratamento finalizado

O status só muda para "Em Tratamento" quando o médico editar nas 9 pastas.

---

## 📊 Status da Lista de Pacientes

### Badges Coloridos
- 🟡 **Pendente**: Badge amarelo
- 🟢 **Em Tratamento**: Badge verde
- 🔵 **Concluído**: Badge azul

### Loading States
- Spinner durante carregamento
- Mensagem "Nenhum paciente cadastrado" quando vazia
- Tabela com scroll quando houver muitos

---

## 🎨 Design System

### Cores Principais
- **Verde**: `bg-green-600`, `bg-green-700`, `text-green-700`
- **Azul**: `bg-blue-600`, `bg-blue-700`
- **Amarelo**: `bg-yellow-100`, `text-yellow-800`
- **Cinza**: Vários tons para backgrounds e textos

### Layout do Modal de Edição
- **Tamanho**: `max-w-7xl` (muito largo)
- **Altura**: `h-[90vh]` (fixa, usa toda tela)
- **Tabs**: Lista horizontal com todas as 9 pastas
- **Tab Ativa**: Background verde claro + borda verde
- **Scroll**: Vertical apenas no conteúdo (horizontal removido)

---

## 🔧 Serviços Implementados

### `services/medicoService.ts`
- `createOrUpdateMedico(medico)` - Criar ou atualizar médico
- `getMedicoByUserId(userId)` - Buscar médico por userId
- `getMedicoByEmail(email)` - Buscar médico por email
- `getAllMedicos()` - Todos os médicos
- `getMedicosByCidade(cidade, estado)` - Médicos por cidade

### `services/pacienteService.ts`
- `createOrUpdatePaciente(paciente)` - Criar ou atualizar paciente
- `getPacienteById(id)` - Buscar por ID
- `getPacienteByUserId(userId)` - Buscar por userId
- `getPacientesByMedico(medicoId)` - Pacientes de um médico
- `getAllPacientes()` - Todos os pacientes

**Importante**: Todas as datas do Firestore são convertidas com `.toDate()`:
- `dataCadastro`
- `dadosIdentificacao.dataNascimento`
- `dadosIdentificacao.dataCadastro`

---

## 🗂️ Dados e Configurações

### `data/cidades-brasil.ts`
Lista completa de estados e cidades do Brasil para:
- Cadastro do médico (cidades de atendimento)
- Seleção de localização

### APIs Externas
- **ViaCEP**: `https://viacep.com.br/ws/{cep}/json/`
  - Busca automática de endereço a partir do CEP
  - Retorna: logradouro, localidade, uf

---

## 📝 Próximos Passos

### Prioridade Alta
1. ✅ Cadastro básico de médico (COMPLETO)
2. ✅ Cadastro básico de paciente (COMPLETO)
3. ✅ Pasta 1 completa (COMPLETO)
4. ⏳ Implementar Pasta 2: Dados Clínicos da Anamnese
5. ⏳ Implementar Pasta 3: Estilo de Vida
6. ⏳ Implementar Pasta 4: Exames Laboratoriais

### Prioridade Média
7. ⏳ Implementar Pasta 5: Plano Terapêutico
8. ⏳ Implementar Pasta 6: Evolução/Seguimento
9. ⏳ Implementar sistema de alertas (Pasta 7)

### Prioridade Baixa
10. ⏳ Sistema de comunicação (Pasta 8)
11. ⏳ Dashboard de indicadores (Pasta 9)
12. ⏳ Sistema de solicitação de paciente para médico
13. ⏳ Busca de médico mais próximo por localização

---

## 🐛 Problemas Conhecidos e Soluções

### 1. Data de Cadastro não aparece
**Causa**: Firestore retorna Timestamp que precisa ser convertido
**Solução**: Adicionar `.toDate()` no `pacienteService.ts`

### 2. Data de Nascimento Invalid Date
**Causa**: Conversão de Timestamp do Firestore
**Solução**: Adicionar conversão no `pacienteService.ts` para `dadosIdentificacao.dataNascimento`

### 3. Loading de Pacientes não aparece
**Causa**: `useEffect` com dependências incorretas
**Solução**: Separar em dois `useEffect` - um carrega médico, outro carrega pacientes

### 4. Select Status com texto cinza
**Causa**: Falta classe `text-gray-900` no select
**Solução**: Adicionar classe

### 5. CEP deve vir antes da Rua
**Causa**: Ordem dos campos no HTML
**Solução**: Reordenar campos no JSX

---

## 📚 Arquivos Importantes

### Principais
- `app/metaadmin/page.tsx` - Página principal do médico
- `app/meta/page.tsx` - Página do paciente
- `types/medico.ts` - Tipos do médico
- `types/obesidade.ts` - Tipos do paciente
- `services/medicoService.ts` - Serviços do médico
- `services/pacienteService.ts` - Serviços do paciente
- `data/cidades-brasil.ts` - Lista de estados e cidades

### Firebase
- `lib/firebase.ts` - Configuração do Firebase
- Collections:
  - `medicos` - Dados dos médicos
  - `pacientes_completos` - Dados completos dos pacientes

---

## 🎯 Regras de Negócio Importantes

1. **Status de Tratamento**:
   - Só muda para "Em Tratamento" quando médico editar
   - Default: "Pendente"
   - Último estágio: "Concluído"

2. **Busca de Médico por Proximidade**:
   - Baseado em CEP do paciente
   - Lista de cidades do médico
   - (A ser implementado)

3. **Solicitação de Atendimento**:
   - Paciente escolhe médico
   - Solicitação aparece no painel do médico
   - Médico aprova ou rejeita
   - (A ser implementado)

4. **Alertas Automáticos**:
   - Baseados em condições clínicas
   - Aparecem na Pasta 7
   - (A ser implementado)

---

## 🚀 Deploy

- **Plataforma**: Vercel
- **Repository**: GitHub (main branch)
- **URL**: https://oftware-site-final-*.vercel.app
- **Build**: Automático via Vercel CLI

---

## 📞 Contato e Ajuda

- **Arquitetura**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + Lucide Icons
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication

---

**Última atualização**: Dezembro 2024
**Status**: Em desenvolvimento ativo

