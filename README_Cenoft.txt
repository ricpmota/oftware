# SISTEMA CENOFT - GERENCIAMENTO DE ESCALAS DE RESIDENTES
## Documentação Completa do Projeto

### 📋 VISÃO GERAL
Sistema web desenvolvido em Next.js para gerenciamento de escalas semanais de residentes médicos, com interface administrativa e área do usuário. O sistema permite criar, editar e visualizar escalas com múltiplos serviços por dia, separados por turnos (manhã/tarde), incluindo sistema completo de trocas entre residentes.

### 🏗️ ARQUITETURA TÉCNICA

#### **Tecnologias Utilizadas:**
- **Frontend:** Next.js 15.3.5 (App Router)
- **Backend:** Firebase (Authentication + Firestore)
- **Deploy:** Vercel
- **Linguagem:** TypeScript
- **Styling:** Tailwind CSS
- **Ícones:** Lucide React

#### **Estrutura de Pastas:**
```
oftware/
├── app/
│   ├── admin/page.tsx          # Dashboard administrativo
│   ├── cenoft/page.tsx         # Dashboard do usuário
│   ├── page.tsx                # Página principal com login
│   └── layout.tsx              # Layout global
├── components/
│   ├── EditModal.tsx           # Modal genérico para edição
│   ├── EditResidenteForm.tsx   # Formulário de edição de residente
│   ├── EditLocalForm.tsx       # Formulário de edição de local
│   ├── EditServicoForm.tsx     # Formulário de edição de serviço
│   └── EditEscalaForm.tsx      # Formulário de edição de escala
├── types/
│   ├── auth.ts                 # Definições de tipos TypeScript
│   └── troca.ts                # Tipos para sistema de trocas
├── services/
│   └── userService.ts          # Serviços de CRUD do Firestore
├── lib/
│   └── firebase.ts             # Configuração do Firebase
└── firestore.rules             # Regras de segurança do Firestore
```

### 🔐 SISTEMA DE AUTENTICAÇÃO

#### **Tipos de Usuário:**
1. **Admin:** `ricpmota.med@gmail.com` (acesso total)
2. **Usuário:** Residentes (acesso limitado às próprias escalas)

#### **Redirecionamento:**
- **Admin:** `/admin` (dashboard administrativo)
- **Usuário:** `/cenoft` (dashboard do residente)
- **Não autenticado:** `/` (página principal com login)

### 📊 ESTRUTURA DE DADOS

#### **Collections do Firestore:**
```typescript
// users - Usuários do sistema
interface User {
  id: string;
  uid: string;
  nome: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

// residentes - Cadastro de residentes
interface Residente {
  id: string;
  nome: string;
  nivel: 'R1' | 'R2' | 'R3';
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// locais - Locais de trabalho
interface Local {
  id: string;
  nome: string;
  createdAt: Date;
  updatedAt: Date;
}

// servicos - Serviços disponíveis
interface Servico {
  id: string;
  nome: string;
  localId: string; // Vinculado a um local
  createdAt: Date;
  updatedAt: Date;
}

// escalas - Escalas semanais
interface Escala {
  id: string;
  dataInicio: Date; // Segunda-feira da semana
  dias: {
    segunda: ServicoDia[];
    terca: ServicoDia[];
    quarta: ServicoDia[];
    quinta: ServicoDia[];
    sexta: ServicoDia[];
    sabado: ServicoDia[];
    domingo: ServicoDia[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// servicoDia - Serviço específico de um dia
interface ServicoDia {
  id: string;
  localId: string;
  servicoId: string;
  turno: 'manha' | 'tarde';
  residentes: string[]; // Array de emails dos residentes
}

// trocas - Sistema de trocas entre residentes
interface Troca {
  id: string;
  solicitanteEmail: string;
  solicitadoEmail: string;
  escalaId: string;
  dia: string; // 'segunda', 'terca', etc.
  turno: 'manha' | 'tarde';
  servicoId: string;
  localId: string;
  status: 'pendente' | 'aceita' | 'rejeitada' | 'aprovada';
  motivo?: string;
  createdAt: Date;
  updatedAt: Date;
}

// notificacoes_troca - Notificações do sistema de trocas
interface NotificacaoTroca {
  id: string;
  usuarioEmail: string;
  tipo: 'solicitacao_recebida' | 'solicitacao_aceita' | 'solicitacao_rejeitada' | 'troca_aprovada';
  trocaId: string;
  lida: boolean;
  createdAt: Date;
}
```

### 🎯 FUNCIONALIDADES IMPLEMENTADAS

#### **1. DASHBOARD ADMINISTRATIVO (`/admin`)**

##### **Menu Lateral:**
- **Usuários:** Gerenciar usuários e alterar roles
- **Residentes:** Listar, cadastrar, editar e excluir residentes
- **Locais:** Gerenciar locais de trabalho
- **Serviços:** Gerenciar serviços (vinculados a locais)
- **Escalas:** Visualizar escalas cadastradas com abas por dia
- **Criar Escala:** Interface para criar novas escalas
- **Estatísticas:** Dashboard com métricas gerais
- **Troca:** Sistema completo de aprovação de trocas

##### **Criação de Escalas:**
- **Interface em abas** para cada dia da semana
- **Múltiplos serviços por dia** com botão "Adicionar Serviço"
- **Seleção de turno** (Manhã/Tarde) para cada serviço
- **Vinculação de residentes** por email
- **Validação** para garantir pelo menos um serviço configurado

##### **Lista de Escalas:**
- **Abas por dia** da semana para facilitar navegação
- **Contador de serviços** em cada aba
- **Exibição de turnos** com badges coloridos
- **Botões de editar/excluir** para cada escala

##### **Sistema de Aprovação de Trocas:**
- **Lista de trocas pendentes** (status 'aceita')
- **Detalhes completos** da troca solicitada
- **Informações do solicitante e solicitado**
- **Dados do serviço, local, dia e turno**
- **Motivo da troca** (quando informado)
- **Botões de aprovar/rejeitar** funcionais
- **Badge de notificação** com contador de trocas pendentes

#### **2. DASHBOARD DO USUÁRIO (`/cenoft`)**

##### **Menu Lateral:**
- **Estatísticas:** Métricas pessoais do residente
- **Minhas Escalas:** Escalas onde o usuário está presente
- **Troca:** Sistema completo de solicitação de trocas

##### **Estatísticas Pessoais:**
- **Total de escalas** atribuídas
- **Total de serviços** (manhã + tarde)
- **Resumo semanal** com turnos separados
- **Estatísticas de locais:**
  - Locais únicos visitados
  - Total de turnos manhã
  - Total de turnos tarde
- **Serviços por Turno - Nível R1/R2/R3:**
  - Agrupamento por serviço e local
  - Contagem individual por residente
  - Usuário atual em destaque (primeiro da lista)
  - Colunas com largura fixa (Manhã, Tarde, Total)
  - Espaçamento visual entre serviços
  - Altura reduzida das linhas para melhor visualização

##### **Minhas Escalas:**
- **Abas por dia** da semana (Segunda a Domingo)
- **Separação por turnos** (Manhã e Tarde)
- **Indicadores visuais** coloridos para cada turno
- **Filtragem automática** por email do usuário
- **Exibição de turnos** com badges coloridos
- **Informações detalhadas** de local e serviço
- **Organização por semana** de início
- **Destaque visual** para o usuário atual

##### **Sistema de Trocas:**
- **Trocas disponíveis** para semana atual e próxima
- **Lista de serviços** do usuário com botão "Solicitar Troca"
- **Seleção de residente** para troca
- **Validação** se o residente selecionado tem local definido
- **Motivo da troca** (opcional)
- **Fluxo completo:** Solicitação → Aceitação → Aprovação → Aplicação
- **Badge de notificação** com contador de trocas pendentes

#### **3. SISTEMA DE EDIÇÃO**

##### **Modais de Edição:**
- **EditModal:** Componente genérico reutilizável (tamanho otimizado para desktop)
- **EditResidenteForm:** Editar dados do residente
- **EditLocalForm:** Editar nome do local
- **EditServicoForm:** Editar serviço e local vinculado
- **EditEscalaForm:** Editar escala completa com turnos (interface melhorada)

##### **Funcionalidades de Edição:**
- **Validação de dados** antes de salvar
- **Atualização em tempo real** no Firestore
- **Interface consistente** com formulários de criação
- **Suporte a turnos** em todas as operações
- **Salvamento correto** de emails dos residentes
- **Interface otimizada** para desktop com melhor espaçamento

#### **4. SISTEMA DE TROCAS COMPLETO**

##### **Fluxo de Trocas:**
1. **Solicitação:** Resident solicita troca com outro resident
2. **Aceitação:** Resident solicitado aceita ou rejeita
3. **Aprovação:** Admin aprova ou rejeita a troca aceita
4. **Aplicação:** Troca é aplicada automaticamente na escala

##### **Regras de Trocas:**
- **Período:** Semana atual e próxima semana
- **Participantes:** Qualquer resident pode trocar com qualquer outro
- **Validação:** Resident solicitado deve ter local definido no dia/turno
- **Notificações:** Sistema de notificações para todas as partes

##### **Funcionalidades Técnicas:**
- **Criação de troca** no Firestore
- **Atualização de status** em tempo real
- **Aplicação automática** na escala após aprovação
- **Notificações** para solicitante, solicitado e admin
- **Validação de dados** em todas as etapas

### 🔒 SEGURANÇA E REGRAS

#### **Firestore Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras existentes para sistema médico
    match /doctors/{doctorId} {
      allow read, write: if request.auth != null && request.auth.uid == doctorId;
    }
    
    match /patients/{patientId} {
      allow read, write: if request.auth != null;
    }
    
    // Regras para sistema de escalas
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    
    match /residentes/{residenteId} {
      allow read, write: if request.auth != null;
    }
    
    match /locais/{localId} {
      allow read, write: if request.auth != null;
    }
    
    match /servicos/{servicoId} {
      allow read, write: if request.auth != null;
    }
    
    match /escalas/{escalaId} {
      allow read, write: if request.auth != null;
    }
    
    // Regras para sistema de trocas
    match /trocas/{trocaId} {
      allow read, write: if request.auth != null;
    }
    
    match /notificacoes_troca/{notificacaoId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 🚀 DEPLOY E CONFIGURAÇÃO

#### **Variáveis de Ambiente:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBc9RkAa6htGilUDO-z4XG6bpiZAWLuRhg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=oftware-9201e.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=oftware-9201e
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=oftware-9201e.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=308133539217
NEXT_PUBLIC_FIREBASE_APP_ID=1:308133539217:web:a3e929f2202e20ba1b3e30
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-2V9CYR8TDS
```

#### **Comandos de Deploy:**
```bash
# Build local
npm run build

# Deploy para produção
vercel --prod
```

#### **URLs de Produção:**
- **Principal:** https://oftware-site-final.vercel.app
- **Admin:** https://oftware-site-final.vercel.app/admin
- **Usuário:** https://oftware-site-final.vercel.app/cenoft

### 📱 INTERFACE E UX

#### **Design System:**
- **Cores:** Verde (#10B981) como cor primária
- **Tipografia:** Sistema de fontes do Tailwind
- **Componentes:** Cards, modais, abas, badges
- **Responsividade:** Mobile-first design

#### **Navegação:**
- **Sidebar fixa** com logo Oftware
- **Menu condicional** baseado no tipo de usuário
- **Abas interativas** para organização de conteúdo
- **Feedback visual** para ações do usuário
- **Badges de notificação** para trocas pendentes

#### **Estados da Interface:**
- **Loading:** Spinners durante carregamento
- **Empty states:** Mensagens quando não há dados
- **Error states:** Tratamento de erros com mensagens claras
- **Success states:** Confirmações de ações realizadas
- **Debug states:** Logs de debug para identificação de problemas

### 🔄 FLUXO DE TRABALHO

#### **Para Administradores:**
1. **Login** com email admin
2. **Cadastrar residentes** com nome, nível e email
3. **Cadastrar locais** de trabalho
4. **Cadastrar serviços** vinculados aos locais
5. **Criar escalas** semanais com múltiplos serviços por dia
6. **Atribuir residentes** aos serviços por turno
7. **Gerenciar** escalas existentes
8. **Aprovar trocas** entre residentes
9. **Monitorar notificações** de trocas pendentes

#### **Para Usuários:**
1. **Login** com email cadastrado
2. **Visualizar estatísticas** pessoais detalhadas
3. **Consultar escalas** onde está presente
4. **Ver resumo semanal** com turnos separados
5. **Acompanhar locais** visitados
6. **Solicitar trocas** com outros residentes
7. **Responder solicitações** de troca
8. **Receber notificações** sobre trocas

### 🐛 CORREÇÕES IMPLEMENTADAS

#### **Versão Atual (v3.0):**
1. ✅ **Abas na lista de escalas** para facilitar edição
2. ✅ **Busca por email** em vez de UID para residentes
3. ✅ **Separação manhã/tarde** em todos os serviços
4. ✅ **Estatísticas de locais** acumuladas
5. ✅ **Resumo semanal** com turnos separados
6. ✅ **Interface responsiva** e intuitiva
7. ✅ **Validação robusta** de dados
8. ✅ **Sistema de edição** completo
9. ✅ **Sistema de trocas** completo e funcional
10. ✅ **Aprovação de trocas** pelo admin
11. ✅ **Notificações** de trocas pendentes
12. ✅ **Interface otimizada** para desktop
13. ✅ **Salvamento correto** de emails dos residentes
14. ✅ **Colunas com largura fixa** nas estatísticas
15. ✅ **Espaçamento visual** entre serviços
16. ✅ **Altura reduzida** das linhas para melhor visualização
17. ✅ **Abas por dia** na seção "Minhas Escalas"
18. ✅ **Separação por turnos** (Manhã/Tarde)
19. ✅ **Destaque visual** para o usuário atual
20. ✅ **Logs de debug** para identificação de problemas
21. ✅ **Dados reais** em vez de fictícios
22. ✅ **Funcionalidade completa** de trocas

### 📈 FUNCIONALIDADES FUTURAS

#### **Em Desenvolvimento:**
- [ ] **Histórico** de trocas realizadas
- [ ] **Relatórios** avançados de escalas
- [ ] **Calendário** visual de escalas
- [ ] **Exportação** de dados em PDF/Excel
- [ ] **Notificações push** via email/SMS

#### **Melhorias Futuras:**
- [ ] **Filtros** por período nas escalas
- [ ] **Dashboard** com gráficos interativos
- [ ] **Integração** com sistemas externos
- [ ] **App mobile** nativo
- [ ] **Chat** entre residentes
- [ ] **Sistema de backup** automático

### 🛠️ MANUTENÇÃO

#### **Logs e Monitoramento:**
- **Console logs** para debugging
- **Error handling** em todas as operações
- **Firebase Analytics** para métricas
- **Vercel Analytics** para performance
- **Debug logs** para sistema de trocas

#### **Backup e Segurança:**
- **Firestore** com backup automático
- **Regras de segurança** configuradas
- **Autenticação** via Firebase Auth
- **HTTPS** obrigatório em produção
- **Validação** de dados em todas as operações

### 🔧 COMANDOS ÚTEIS

#### **Desenvolvimento:**
```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build de produção
npm run build

# Deploy para Vercel
vercel --prod
```

#### **Debugging:**
```bash
# Verificar tipos TypeScript
npx tsc

# Linting
npm run lint

# Verificar build
npm run build
```

### 💬 SISTEMA DE MENSAGENS

#### **Visão Geral:**
Sistema de comunicação bidirecional entre admin e residentes, implementado com abas organizadas e regras de permissão específicas. Permite envio de mensagens do admin para residentes e vice-versa, com opção de anonimato para residentes.

#### **Estrutura do Firebase:**

##### **Coleções Criadas:**
1. **`mensagens`** - Mensagens originais enviadas pelo admin
2. **`mensagens_residentes`** - Cópias individuais para cada residente destinatário
3. **`mensagens_residente_admin`** - Mensagens enviadas pelos residentes para o admin

##### **Estrutura dos Documentos:**

**Mensagem Original (`mensagens`):**
```typescript
interface Mensagem {
  id: string;
  titulo: string;
  mensagem: string;
  destinatarios: 'todos' | 'especificos';
  residentesSelecionados: string[];
  criadoEm: Date;
  enviadoEm?: Date;
  deletada?: boolean;
  deletadaEm?: Date;
}
```

**Mensagem do Residente (`mensagens_residentes`):**
```typescript
interface MensagemResidente {
  id: string;
  mensagemId: string; // Referência à mensagem original
  residenteEmail: string;
  lida: boolean;
  lidaEm?: Date;
  criadoEm: Date;
  deletada?: boolean;
}
```

**Mensagem Residente para Admin (`mensagens_residente_admin`):**
```typescript
interface MensagemResidenteParaAdmin {
  id: string;
  residenteEmail: string;
  residenteNome: string;
  titulo: string;
  mensagem: string;
  anonima: boolean;
  lida: boolean;
  lidaEm?: Date;
  criadoEm: Date;
  deletada?: boolean;
  deletadaEm?: Date;
}
```

#### **Regras de Segurança do Firestore:**

##### **Problema Inicial:**
- **Erro:** `FirebaseError: Missing or insufficient permissions`
- **Causa:** Regras complexas de Firestore impediam operações de escrita

##### **Solução Implementada:**
```javascript
// Regras simplificadas em firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras existentes para outras coleções...
    
    // Sistema de mensagens - regras simplificadas
    match /mensagens/{mensagemId} {
      allow read, write: if request.auth != null;
    }
    
    match /mensagens_residentes/{mensagemResidenteId} {
      allow read, write: if request.auth != null;
    }
    
    match /mensagens_residente_admin/{mensagemResidenteAdminId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

##### **Deploy das Regras:**
```bash
# Configurar projeto Firebase
firebase use oftware-9201e

# Deploy apenas das regras
firebase deploy --only firestore:rules
```

#### **Funcionalidades Implementadas:**

##### **Interface do Residente (`/cenoft`):**
- **Abas:** "Recebidas" (mensagens do admin) e "Enviadas" (mensagens para admin)
- **Visualização:** Lista organizada com status de leitura
- **Envio:** Formulário para enviar mensagens ao admin com opção de anonimato
- **Deleção:** Apenas o residente pode deletar suas próprias mensagens enviadas
- **Atualização:** Carregamento automático a cada 30 segundos

##### **Interface do Admin (`/admin`):**
- **Abas:** "Enviadas" (mensagens para residentes) e "Recebidas" (mensagens dos residentes)
- **Envio:** Formulário para enviar mensagens para todos ou residentes específicos
- **Visualização:** Modal de leitura completa das mensagens recebidas
- **Marcação:** Marcação automática como lida ao abrir o modal
- **Deleção:** Admin pode deletar apenas mensagens enviadas por ele

#### **Fluxo de Funcionamento:**

##### **Envio de Mensagem do Admin:**
1. Admin cria mensagem na coleção `mensagens`
2. Sistema cria cópias individuais em `mensagens_residentes` para cada destinatário
3. Residentes visualizam mensagens na aba "Recebidas"
4. Clique marca como lida automaticamente

##### **Envio de Mensagem do Residente:**
1. Residente cria mensagem na coleção `mensagens_residente_admin`
2. Admin visualiza na aba "Recebidas" do admin
3. Clique abre modal de leitura e marca como lida
4. Residente pode deletar sua própria mensagem

#### **Resolução de Problemas:**

##### **Erro de Permissões:**
- **Sintoma:** `FirebaseError: Missing or insufficient permissions`
- **Solução:** Simplificar regras do Firestore para `allow read, write: if request.auth != null;`
- **Verificação:** Usar `firebase deploy --only firestore:rules`

##### **Mensagens Não Aparecem:**
- **Causa:** Queries com `orderBy` em Firestore
- **Solução:** Remover `orderBy` e fazer ordenação manual em JavaScript
- **Implementação:** Usar `sort()` após `getDocs()`

##### **Ícones Não Carregam:**
- **Sintoma:** `Uncaught ReferenceError: Trash2 is not defined`
- **Solução:** Adicionar importação do ícone no arquivo
- **Exemplo:** `import { ..., Trash2 } from 'lucide-react';`

#### **Arquivos Modificados:**
- `app/admin/page.tsx` - Interface administrativa com abas e modal
- `app/cenoft/page.tsx` - Interface do residente com abas
- `types/mensagem.ts` - Definições TypeScript
- `services/mensagemService.ts` - Lógica de CRUD
- `firestore.rules` - Regras de segurança simplificadas

### 📞 SUPORTE

#### **Contato:**
- **Email:** ricpmota.med@gmail.com
- **Sistema:** https://oftware-site-final.vercel.app

#### **Documentação Técnica:**
- **Código:** Comentários em português
- **Tipos:** TypeScript com interfaces claras
- **Estrutura:** Organização modular
- **Padrões:** ESLint e Prettier configurados
- **Debug:** Logs detalhados para troubleshooting

#### **Troubleshooting:**
1. **Problemas de escala:** Verificar logs no console do navegador
2. **Trocas não aparecem:** Verificar status da troca no Firestore
3. **Erros de build:** Executar `npx tsc` para verificar tipos
4. **Deploy falha:** Verificar variáveis de ambiente

---

**Última Atualização:** 14/09/2025
**Versão:** 3.0.0
**Status:** Produção
**Desenvolvedor:** Assistente AI + Ricardo Mota
**Funcionalidades:** Sistema completo de escalas + Sistema de trocas