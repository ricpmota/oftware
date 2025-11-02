# Sistema de Escalas de Residentes - Oftware

## Visão Geral

Sistema completo para gerenciamento de escalas semanais de residentes em serviços e locais de trabalho, desenvolvido com Next.js 15 (App Router), Firebase Authentication, Firestore e Firestore Security Rules.

## Estrutura Implementada

### 1. Autenticação e Autorização

#### Firestore Security Rules (`firestore.rules`)
- **Roles**: `admin` e `user`
- **Admin**: Acesso total a todas as coleções (read/write)
- **User**: Acesso limitado aos próprios documentos
- **Coleções protegidas**: users, residentes, locais, servicos, escalas, trocas

#### Middleware (`middleware.ts`)
- Proteção de rotas `/admin` (apenas admins)
- Proteção de rotas `/cenoft` (usuários autenticados)
- Redirecionamento automático baseado em roles

#### Contexto de Autenticação (`contexts/AuthContext.tsx`)
- Gerenciamento de estado global do usuário
- Funções de login (email/senha e Google)
- Atualização de roles de usuários
- Criação automática de usuário admin principal: `ricpmota.med@gmail.com`

### 2. Tipos TypeScript (`types/auth.ts`)

```typescript
interface User {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt?: Date;
  updatedAt?: Date;
}

interface Residente {
  id: string;
  nome: string;
  nivel: 'R1' | 'R2' | 'R3';
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Local {
  id: string;
  nome: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Servico {
  id: string;
  nome: string;
  localId: string;
  local?: Local;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. Serviços (`services/userService.ts`)

- **UserService**: Gerenciamento completo de usuários, residentes, locais e serviços
- Operações CRUD para todas as entidades
- Integração com Firestore

### 4. Páginas Implementadas

#### Login (`/login`)
- Interface limpa com logo da Oftware
- Login com email/senha
- Login com Google
- Redirecionamento automático baseado em role

#### Admin (`/admin`)
- **Sidebar com menus**:
  - Usuários: Listar e alterar roles
  - Cadastrar Residente: Formulário completo
  - Cadastrar Local: Formulário simples
  - Cadastrar Serviço: Formulário com seleção de local
  - Estatísticas: Dashboard com métricas
  - Troca: Placeholder para futuras funcionalidades

#### Cenoft (`/cenoft`)
- **Sidebar com menus**:
  - Estatísticas: Dashboard personalizado do usuário
  - Troca: Placeholder para solicitações de troca

### 5. Componentes

#### Sidebar (`components/Sidebar.tsx`)
- Menu responsivo (desktop/mobile)
- Menus condicionais por role
- Logo da Oftware no topo
- Informações do usuário logado
- Botão de logout

## Estrutura do Firestore

### Coleções

1. **users**
   - Documentos por UID do usuário
   - Campos: name, email, role, createdAt, updatedAt

2. **residentes**
   - Documentos com ID automático
   - Campos: nome, nivel (R1/R2/R3), email, createdAt, updatedAt

3. **locais**
   - Documentos com ID automático
   - Campos: nome, createdAt, updatedAt

4. **servicos**
   - Documentos com ID automático
   - Campos: nome, localId, createdAt, updatedAt

5. **escalas** (preparado para futuras implementações)
   - Campos: semana, dia, localId, servicoId, residentes[], createdAt, updatedAt

6. **trocas** (preparado para futuras implementações)
   - Campos: solicitanteId, destinoId, data, status, motivo, createdAt, updatedAt

## Funcionalidades Implementadas

### ✅ Fase 1 - Preparação do Ambiente
- [x] Firestore Security Rules com roles
- [x] Middleware de proteção de rotas
- [x] Páginas iniciais (/login, /admin, /cenoft)
- [x] Layout responsivo com sidebar
- [x] Sistema de autenticação completo

### ✅ Fase 2 - Cadastro e Gerenciamento
- [x] Listagem e alteração de roles de usuários
- [x] Cadastro de residentes (nome, nível, email)
- [x] Cadastro de locais
- [x] Cadastro de serviços com vinculação a locais
- [x] Dashboard de estatísticas

## Próximas Fases (Preparadas)

### Fase 3 - Sistema de Escalas
- Criação de escalas semanais
- Atribuição de residentes a escalas
- Visualização de escalas por período

### Fase 4 - Sistema de Trocas
- Solicitação de trocas entre residentes
- Aprovação/rejeição de trocas
- Notificações de status

## Como Usar

1. **Primeiro acesso**: Use `ricpmota.med@gmail.com` (será automaticamente admin)
2. **Login**: Acesse `/login` ou será redirecionado automaticamente
3. **Admin**: Acesse `/admin` para gerenciar usuários, residentes, locais e serviços
4. **Usuário comum**: Acesse `/cenoft` para visualizar estatísticas pessoais

## Tecnologias Utilizadas

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Firebase Authentication**
- **Cloud Firestore**
- **Lucide React** (ícones)

## Estrutura de Arquivos

```
app/
├── login/page.tsx          # Página de login
├── admin/page.tsx          # Painel administrativo
├── cenoft/page.tsx         # Painel do usuário
├── layout.tsx              # Layout principal com AuthProvider
└── page.tsx                # Página inicial com redirecionamento

components/
└── Sidebar.tsx             # Componente de navegação

contexts/
└── AuthContext.tsx         # Contexto de autenticação

services/
└── userService.ts          # Serviços de gerenciamento

types/
└── auth.ts                 # Tipos TypeScript

middleware.ts               # Middleware de proteção de rotas
firestore.rules            # Regras de segurança do Firestore
```

## Configuração do Firebase

1. Configure as variáveis de ambiente no `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

2. Deploy das regras do Firestore:
```bash
firebase deploy --only firestore:rules
```

## Próximos Passos

O sistema está preparado para as próximas fases de desenvolvimento:
- Implementação do sistema de escalas semanais
- Sistema de trocas entre residentes
- Notificações e alertas
- Relatórios e estatísticas avançadas
- Sistema de aprovação de trocas
