# Guia Completo: Página /metanutri para Criar /metapersonal

Este documento explica **tudo** sobre a página `/metanutri` para servir como guia completo na criação da página `/metapersonal` para Personal Trainers.

---

## 📋 ÍNDICE

1. [Plano de Implementação](#plano-de-implementação) ⭐ **INÍCIO AQUI**
2. [Visão Geral](#visão-geral)
3. [Ícone na Página Principal](#ícone-na-página-principal)
4. [Estrutura de Arquivos](#estrutura-de-arquivos)
5. [Estrutura de Dados (Firestore)](#estrutura-de-dados-firestore)
6. [Serviços (Services)](#serviços-services)
7. [Tipos TypeScript](#tipos-typescript)
8. [Layout e Navegação](#layout-e-navegação)
9. [Funcionalidades por Seção](#funcionalidades-por-seção)
10. [Fluxos de Trabalho](#fluxos-de-trabalho)
11. [Firestore Rules](#firestore-rules)
12. [Checklist para Criar /metapersonal](#checklist-para-criar-metapersonal)

---

## 🚀 PLANO DE IMPLEMENTAÇÃO

Este é o plano passo a passo para criar a página `/metapersonal`. Cada etapa será implementada e o status será atualizado aqui.

### Status Geral: 🟡 **EM ANDAMENTO**

---

### ETAPA 1: Estrutura Base e Tipos ✅ **CONCLUÍDA**
**Status:** 🟢 Concluída  
**Arquivos criados:**
- [x] `features/metaPersonal/metaPersonal.types.ts` ✅
- [x] `features/metaPersonal/metaPersonal.constants.ts` ✅
- [x] `app/metapersonal/page.tsx` (wrapper) ✅
- [x] `app/metapersonal/page.v2.tsx` (estrutura básica) ✅

**O que foi feito:**
- ✅ Criados tipos TypeScript para Personal Trainer
- ✅ Criadas constantes (status, collections)
- ✅ Criada estrutura básica da página com autenticação
- ✅ Configurado layout idêntico ao /metanutri:
  - Sidebar desktop com logo Oftware
  - Header mobile com ícone Activity, nome do personal trainer e "Personal Trainer"
  - Avatar do Google (user.photoURL) no lugar do ícone UserCircle
  - **SEM botão de menu (3 tracinhos) no mobile**
  - Cores azul/roxo ao invés de verde
  - Bottom navigation mobile
- ✅ Implementada navegação entre seções

**Tempo gasto:** ~45 minutos

---

### ETAPA 2: Serviços Base ✅ **CONCLUÍDA**
**Status:** 🟢 Concluída  
**Arquivos criados:**
- [x] `services/personalTrainerService.ts` ✅
- [x] `services/pacientePersonalTrainerService.ts` ✅

**O que foi feito:**
- ✅ Criado CRUD completo de Personal Trainer:
  - `getPersonalTrainerByUserId()` - Busca por userId
  - `createOrUpdatePersonalTrainer()` - Cria ou atualiza perfil
  - `updatePerfil()` - Atualiza registro e cidades
  - `getPersonalTrainersVinculadosAoMedico()` - Lista por médico
  - `getAllPersonalTrainers()` - Lista todos
  - `verifyPersonalTrainer()` - Marca como verificado
  - `toggleStatus()` - Alterna status ativo/inativo
  - `deletePersonalTrainer()` - Deleta personal trainer
- ✅ Criado serviço de relacionamento paciente-personal trainer:
  - `listActiveVinculosByPersonal()` - Lista vínculos ativos
  - `listPacientesVisiveisByPersonal()` - Lista pacientes com dados completos
  - `hasAccessToPaciente()` - Verifica acesso
  - `getPacienteResumo()` - Busca resumo do paciente
  - `listVinculosByMedicoEPersonal()` - Lista vínculos por médico e personal
  - `countPacientesPorPersonalTrainer()` - Conta pacientes em comum
- ✅ Integrado PersonalTrainerService no page.v2.tsx
- ✅ Removido código mock, agora usa serviço real

**Tempo gasto:** ~45 minutos

---

### ETAPA 3: Serviços de Solicitação ✅ **CONCLUÍDA**
**Status:** 🟢 Concluída  
**Arquivos criados:**
- [x] `services/solicitacaoVinculoPersonalMedicoService.ts` ✅
- [x] `services/solicitacaoPersonalTrainerService.ts` ✅

**O que foi feito:**
- ✅ Criado serviço completo de solicitação de vínculo com médico:
  - `createVinculoRequest()` - Cria solicitação de vínculo
  - `listPendingVinculoRequestsByPersonal()` - Lista solicitações recebidas
  - `listSentVinculoRequestsByPersonal()` - Lista solicitações enviadas
  - `listVinculoRequestsByPersonal()` - Lista todas as solicitações
  - `listPendingVinculoRequestsByMedico()` - Lista solicitações pendentes do médico
  - `approveVinculoRequest()` - Aprova vínculo (atualiza documentos)
  - `rejectVinculoRequest()` - Rejeita solicitação
  - `cancelVinculoRequest()` - Cancela solicitação
  - `getRequestWithExtraData()` - Busca com dados extras
  - `deleteVinculoRequest()` - Deleta solicitação
  - `removeVinculoCompleto()` - Remove vínculo completo
- ✅ Criado serviço completo de solicitação de compartilhamento de paciente:
  - `createPacienteShareRequest()` - Cria solicitação de compartilhamento
  - `listPendingRequestsByPersonal()` - Lista solicitações pendentes
  - `listRequestsByPaciente()` - Lista solicitações de um paciente
  - `approveShareRequest()` - Aprova compartilhamento (cria vínculo)
  - `mudarStatusParaPendente()` - Muda status de aguardando_medico para pendente
  - `rejectShareRequest()` - Rejeita compartilhamento
  - `cancelShareRequest()` - Cancela solicitação
  - `getRequestWithExtraData()` - Busca com dados extras
  - `listActiveVinculosByPersonal()` - Lista vínculos ativos
  - `endCompartilhamento()` - Encerra compartilhamento
  - `getCompartilhamentoStatus()` - Obtém status completo
  - `deleteShareRequest()` - Deleta solicitação
  - `listPendingRequestsByMedico()` - Lista solicitações pendentes do médico

**Tempo gasto:** ~60 minutos

---

### ETAPA 4: Página Personal Trainers no /metaadmingeral ✅ **CONCLUÍDA**
**Status:** 🟢 Concluída  
**Arquivo editado:**
- [x] `app/metaadmingeral/page.tsx` ✅

**O que foi feito:**
- ✅ Adicionada seção/aba "Personal Trainers" dentro do `/metaadmingeral`
- ✅ Implementada listagem de personal trainers com tabela contendo:
  - Nome, Email, Registro (CREF), Cidades (resumo + tooltip), Verificado (badge), Status (badge), Data de cadastro
  - Ordenação: não verificados primeiro, depois por data de cadastro (mais recentes)
- ✅ Implementadas ações do admin:
  - Botão "Ver detalhes" - abre modal com dados completos do personal trainer
  - Botão "Verificar" - aparece apenas se `isVerificado=false`, atualiza para `true`
  - Botão "Ativar/Inativar" - alterna status entre ativo/inativo
  - Botão "Excluir" - deleta personal trainer
- ✅ Criado modal de detalhes com todas as informações do personal trainer
- ✅ Adicionado botão "Personal Trainers" no sidebar (desktop e mobile)
- ✅ Adicionados cards de estatísticas na seção Estatísticas:
  - Total de Personal Trainers
  - Personal Trainers Verificados
  - Personal Trainers não Verificados
- ✅ Implementados toasts de sucesso/erro para feedback das ações

**Tempo gasto:** ~45 minutos

---

### ETAPA 5: Serviço de Planos ⏸️ **ADIADA**
**Status:** ⏸️ Adiada (será implementada depois)  
**Arquivos a criar:**
- [ ] `services/personalPlanoService.ts`

**O que será feito:**
- Criar serviço para gerenciar planos de atividade física
- Implementar CRUD de planos
- Definir estrutura de dados do plano

**Tempo estimado:** 45 minutos

**Nota:** Esta etapa será implementada depois, quando a estrutura de planos de atividade física for definida internamente.

---

### ETAPA 5: Firestore Rules ✅ **CONCLUÍDA**
**Status:** 🟢 Concluída  
**Arquivo editado:**
- [x] `firestore.rules` ✅

**O que foi feito:**
- ✅ Adicionada helper function `isPersonalTrainer()` para verificar se usuário é personal trainer
- ✅ Implementadas regras de segurança para todas as collections:
  - **`personal_trainers`**: 
    - Read: próprio personal, admin, ou personal verificado e ativo (para links públicos)
    - Create: próprio personal ou admin
    - Update: próprio personal pode atualizar apenas perfil (não pode setar `isVerificado`, `medicoVinculadoIds`, `status`), admin pode tudo
    - Delete: apenas admin
  - **`solicitacoes_vinculo_personal_medico`**: 
    - Create: personal pode criar se for dele
    - Read: personal, médico envolvido ou admin
    - Update: médico pode aprovar/rejeitar (status pendente → aceita/rejeitada)
    - Delete: apenas admin
  - **`solicitacoes_personal_trainer`**: 
    - Create: médico pode criar se for médico responsável do paciente
    - Read: médico, personal ou admin
    - Update: médico pode cancelar ou mudar de aguardando_medico para pendente; personal pode aceitar/rejeitar apenas se médico estiver vinculado
    - Delete: apenas admin
  - **`paciente_personal_trainer`**: 
    - Create: personal pode criar ao aceitar (status deve ser 'ativo')
    - Read: personal, médico ou admin
    - Update: médico pode encerrar (status ativo → inativo)
    - Delete: apenas admin
- ✅ Atualizadas regras de `pacientes_completos` para permitir leitura por personal com vínculo ativo (usando ID determinístico)
- ✅ Atualizadas regras de `logs` para incluir Personal Trainers
- ✅ Adicionadas regras para `pagamentos_personal_trainer_paciente` (futuro)

**Tempo gasto:** ~30 minutos

---

### ETAPA 6: Ícone na Página Principal ✅ **CONCLUÍDA**
**Status:** 🟢 Concluída  
**Arquivo editado:**
- [x] `app/page.tsx` ✅

**O que foi feito:**
- ✅ Adicionado import do ícone `Dumbbell` do lucide-react
- ✅ Adicionado estado `showPersonalModal` para controlar modal
- ✅ Criado card do Personal Trainer no grid:
  - Ícone Dumbbell com gradiente azul (from-blue-500 to-blue-700)
  - Título "Personal Trainer"
  - Descrição: "Acompanhe pacientes em tratamento de forma colaborativa"
  - Efeitos hover e animações idênticos aos outros cards
- ✅ Criado modal expandido com:
  - Header com ícone Dumbbell e título "Área do Personal Trainer"
  - Badge "Área Exclusiva" com ícone Shield
  - Descrição explicativa
  - Lista de funcionalidades:
    - Acompanhar pacientes compartilhados por médicos vinculados
    - Visualizar dados clínicos e evolução do tratamento (somente leitura)
    - Colaborar com médicos no acompanhamento de atividade física
  - Botão "Acessar Área do Personal Trainer" com redirecionamento
- ✅ Implementado redirecionamento para `/metapersonal`:
  - Se não estiver logado, faz login com Google primeiro
  - Após login, redireciona para `/metapersonal`
  - Se já estiver logado, redireciona diretamente
- ✅ Integrado com sistema de modais (esconde outros cards quando aberto)
- ✅ Cores azul/roxo consistentes com a página `/metapersonal`

**Tempo gasto:** ~30 minutos

---

### ETAPA 7: Layout e Navegação
**Status:** 🔴 Não iniciada  
**Arquivo a editar:**
- [ ] `app/metapersonal/page.v2.tsx`

**O que será feito:**
- Implementar sidebar com menu
- Implementar header superior
- Implementar bottom navigation (mobile)
- Configurar sistema de rotas internas
- Adicionar persistência no localStorage

**Tempo estimado:** 60 minutos

---

### ETAPA 8: Seção Home (Dashboard)
**Status:** 🔴 Não iniciada  
**Arquivo a editar:**
- [ ] `app/metapersonal/page.v2.tsx` (seção Home)

**O que será feito:**
- Implementar KPIs (pacientes, médicos, receita)
- Criar gráficos de evolução
- Adicionar filtros
- Implementar modais de visualização

**Tempo estimado:** 90 minutos

---

### ETAPA 9: Seção Médicos
**Status:** 🔴 Não iniciada  
**Arquivo a editar:**
- [ ] `app/metapersonal/page.v2.tsx` (seção Médicos)

**O que será feito:**
- Implementar aba "Buscar Médicos"
- Implementar aba "Solicitações" (recebidas/enviadas)
- Implementar aba "Médicos Vinculados"
- Implementar fluxos de aprovação/rejeição

**Tempo estimado:** 90 minutos

---

### ETAPA 10: Seção Pacientes
**Status:** 🔴 Não iniciada  
**Arquivo a editar:**
- [ ] `app/metapersonal/page.v2.tsx` (seção Pacientes)

**O que será feito:**
- Implementar lista de pacientes com cards
- Criar modal de visualização completa
- Implementar gráficos de evolução
- Adicionar filtros e busca

**Tempo estimado:** 120 minutos

---

### ETAPA 11: Seção Financeiro
**Status:** 🔴 Não iniciada  
**Arquivo a editar:**
- [ ] `app/metapersonal/page.v2.tsx` (seção Financeiro)

**O que será feito:**
- Implementar lista de pagamentos
- Adicionar filtros por status
- Criar modal de detalhes
- Implementar visualização de parcelas

**Tempo estimado:** 60 minutos

---

### ETAPA 12: Seção Calendário
**Status:** 🔴 Não iniciada  
**Arquivo a editar:**
- [ ] `app/metapersonal/page.v2.tsx` (seção Calendário)

**O que será feito:**
- Implementar calendário mensal
- Adicionar indicadores de aplicações
- Adicionar indicadores de pagamentos
- Criar modal de detalhes do dia

**Tempo estimado:** 60 minutos

---

### ETAPA 13: Seção Meu Perfil ✅ **CONCLUÍDA**
**Status:** 🟢 Concluída  
**Arquivo editado:**
- [x] `app/metapersonal/page.v2.tsx` ✅

**O que foi feito:**
- ✅ Adicionados imports necessários:
  - `estadosCidades`, `estadosList` de `@/data/cidades-brasil`
  - `MedicoService`, `CidadeCustomizadaService`
  - Ícones: `MapPin`, `Clock`, `Copy`, `ExternalLink`, `Menu`
- ✅ Adicionados estados para perfil:
  - `registroNumero`, `cidadesSelecionadas`, `estadoSelecionado`, `cidadeSelecionada`
  - `isSaving`, `saveMessage`
  - Estados para cidades disponíveis (médicos e customizadas)
  - Estados para link de referral
- ✅ Implementadas funções:
  - `loadMedicosVerificados()` - Carrega médicos e extrai estados/cidades
  - `loadCidadesCustomizadas()` - Carrega cidades customizadas (quando não verificado)
  - `handleAddCidade()` - Adiciona cidade à lista
  - `handleRemoveCidade()` - Remove cidade da lista
  - `handleSavePerfil()` - Salva perfil usando `PersonalTrainerService.updatePerfil()`
- ✅ Implementado modal de edição de perfil completo:
  - Status de verificação (verificado/aguardando)
  - Contador de médicos vinculados
  - Campo de registro (CREF / Número)
  - Seleção de estado e cidade
  - Lista de cidades selecionadas com opção de remover
  - Mensagens de sucesso/erro
  - Botão de salvar com loading
- ✅ Adicionado botão "Meu Perfil" no dropdown (desktop e mobile)
- ✅ Implementada notificação de perfil incompleto:
  - Alerta quando registro ou cidades estão faltando
  - Alerta quando não há vínculo com médico
  - Botões para editar perfil ou vincular médico
- ✅ Carregamento automático de cidades:
  - Se verificado: carrega cidades dos médicos
  - Se não verificado: carrega cidades customizadas
- ✅ Atualização automática do estado quando personal trainer é carregado

**Tempo gasto:** ~60 minutos

---

### ETAPA 14: Planos de Atividade Física ⏸️ **ADIADA**
**Status:** ⏸️ Adiada (será implementada depois)  
**Arquivos a criar/editar:**
- [ ] `services/personalPlanoService.ts`
- [ ] `app/metapersonal/page.v2.tsx` (seção de planos)
- [ ] Componente de criação de plano (se necessário)

**O que será feito:**
- Definir estrutura de dados do plano
- Implementar criação de plano
- Implementar edição de plano
- Implementar visualização de plano

**Tempo estimado:** 90 minutos

**Nota:** Esta etapa será implementada depois, quando a estrutura de planos de atividade física for definida internamente.

---

### ETAPA 15: Integração com /metaadmin
**Status:** 🔴 Não iniciada  
**Arquivo a editar:**
- [ ] `app/metaadmin/page.tsx`

**O que será feito:**
- Adicionar opção para médicos buscarem Personal Trainers
- Adicionar opção para médicos compartilharem pacientes
- Adicionar visualização de Personal Trainers vinculados

**Tempo estimado:** 60 minutos

---

### ETAPA 16: Testes e Ajustes Finais
**Status:** 🔴 Não iniciada

**O que será feito:**
- Testar fluxo completo de cadastro
- Testar fluxo de vinculação
- Testar fluxo de compartilhamento
- Testar criação de planos
- Testar visualização de dados
- Testar responsividade mobile/desktop
- Corrigir bugs encontrados

**Tempo estimado:** 90 minutos

---

### RESUMO DO PROGRESSO

- **Total de Etapas:** 16
- **Etapas Concluídas:** 7 ✅
- **Etapas Adiadas:** 2 ⏸️ (Planos - será depois)
- **Etapas em Andamento:** 0
- **Etapas Pendentes:** 7
- **Progresso:** 43.75%

**Última atualização:** ETAPA 13 concluída - Seção "Meu Perfil" implementada com modal de edição completo, notificação de perfil incompleto e integração com serviços

---

## 📝 NOTAS IMPORTANTES

### Sobre Planos de Atividade Física
- A criação do serviço de planos (ETAPA 4 original) foi **adiada**
- Por enquanto, estamos focando apenas em:
  - ✅ Cadastro e verificação de Personal Trainers
  - ✅ Vinculação com médicos
  - ✅ Compartilhamento de pacientes
  - ✅ Estrutura base da página `/metapersonal`
- Os planos de atividade física serão implementados depois, quando a estrutura for definida internamente

### Próximas Etapas Prioritárias
1. ✅ **ETAPA 5:** Firestore Rules (segurança) - **CONCLUÍDA**
2. ✅ **ETAPA 6:** Ícone na página principal - **CONCLUÍDA**
3. ✅ **ETAPA 13:** Seção Meu Perfil - **CONCLUÍDA**
4. **ETAPA 7:** Layout e navegação (já parcialmente feito)
5. **ETAPA 8-12:** Implementar seções da página (Home, Médicos, Pacientes, Financeiro, Calendário)
6. **ETAPA 15:** Integração com /metaadmin (buscar e compartilhar pacientes)

---

---

## 🎯 VISÃO GERAL

A página `/metanutri` é uma área exclusiva para **nutricionistas** cadastrados na Plataforma META. Ela permite que nutricionistas trabalhem de forma colaborativa com médicos no acompanhamento de pacientes em tratamento de obesidade com Tirzepatida.

**Princípios principais:**
- Nutricionista se vincula com médicos
- Médicos compartilham pacientes com nutricionistas
- Nutricionista tem acesso **somente leitura** aos dados dos pacientes
- Nutricionista pode criar planos nutricionais para pacientes compartilhados
- Sistema de solicitações para vínculos e compartilhamento de pacientes

---

## 🏠 ÍCONE NA PÁGINA PRINCIPAL

### Localização
**Arquivo:** `app/page.tsx`

### Como Funciona

1. **Card Inicial (Fechado)**
   - Ícone: `UtensilsCrossed` (lucide-react)
   - Cor: Gradiente verde (`from-green-500 to-green-700`)
   - Título: "Nutricionista"
   - Descrição: "Acompanhe pacientes em tratamento de forma colaborativa"
   - Ao clicar, abre modal expandido

2. **Modal Expandido (Aberto)**
   - Mostra descrição completa da área
   - Lista funcionalidades:
     - Acompanhar pacientes compartilhados por médicos vinculados
     - Visualizar dados clínicos e evolução do tratamento (somente leitura)
     - Colaborar com médicos no acompanhamento nutricional
   - Botão: "Acessar Área do Nutricionista"
   - Ao clicar no botão:
     - Se não logado: faz login com Google → redireciona para `/metanutri`
     - Se logado: redireciona diretamente para `/metanutri`

### Código de Referência

```typescript
// Estado do modal
const [showNutriModal, setShowNutriModal] = useState(false);

// Card inicial
<button onClick={() => setShowNutriModal(true)}>
  <UtensilsCrossed size={24} className="md:w-12 md:h-12 text-white" />
  <h3>Nutricionista</h3>
  <p>Acompanhe pacientes em tratamento de forma colaborativa</p>
</button>

// Modal expandido
{showNutriModal && (
  <div>
    {/* Conteúdo do modal */}
    <button onClick={() => router.push('/metanutri')}>
      Acessar Área do Nutricionista
    </button>
  </div>
)}
```

### Para /metapersonal
- Criar estado `showPersonalModal`
- Usar ícone `Activity` ou `Dumbbell` (lucide-react)
- Cor: Gradiente azul ou roxo (diferente do nutri)
- Redirecionar para `/metapersonal`

---

## 📁 ESTRUTURA DE ARQUIVOS

### Arquivos Principais

```
app/metanutri/
├── page.tsx                    # Wrapper que escolhe entre v2 e legacy
├── page.v2.tsx                 # Versão atual (v2) - implementação completa
└── page.legacy.tsx             # Versão antiga (não usada mais)

features/metaNutri/
├── metaNutri.types.ts         # Tipos TypeScript
└── metaNutri.constants.ts     # Constantes (status, collections)

services/
├── nutricionistaService.ts                    # CRUD de nutricionistas
├── pacienteNutricionistaService.ts            # Relacionamento paciente-nutri
├── solicitacaoNutricionistaService.ts          # Solicitações de compartilhamento
├── solicitacaoVinculoNutriMedicoService.ts    # Solicitações de vínculo
└── nutriPlanoService.ts                       # Planos nutricionais

components/
└── NutriContent.tsx            # Componente para visualizar dados nutricionais
```

### Estrutura do Arquivo Principal (`page.v2.tsx`)

```typescript
'use client';

// 1. IMPORTS
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
// ... outros imports

// 2. TIPOS
type MenuNutri = 'home' | 'medicos' | 'pacientes' | 'financeiro' | 'calendario' | 'meu-perfil';

// 3. COMPONENTE PRINCIPAL
function MetaNutriPageV2() {
  // 3.1 Estados de navegação e layout
  const [activeMenu, setActiveMenu] = useState<MenuNutri>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // 3.2 Estados de autenticação
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nutricionista, setNutricionista] = useState<NutricionistaDoc | null>(null);
  
  // 3.3 Estados por seção (Home, Médicos, Pacientes, etc.)
  // ... muitos estados específicos
  
  // 4. EFEITOS (useEffect)
  // - Verificação de autenticação
  // - Carregamento de dados
  // - Persistência no localStorage
  
  // 5. FUNÇÕES DE CARREGAMENTO
  // - loadKPIs()
  // - loadMedicosVinculados()
  // - loadPacientesVisiveis()
  // ... etc
  
  // 6. HANDLERS
  // - handleLogout()
  // - handleAprovarVinculo()
  // ... etc
  
  // 7. RENDERIZAÇÃO
  // - renderSidebar()
  // - renderHeader()
  // - renderContent()
  // - renderHome()
  // - renderMedicos()
  // ... etc
  
  // 8. RETURN PRINCIPAL
  return (
    <div>
      {/* Sidebar */}
      {/* Header */}
      {/* Conteúdo principal */}
      {/* Modais */}
    </div>
  );
}

export default MetaNutriPageV2;
```

---

## 🗄️ ESTRUTURA DE DADOS (FIRESTORE)

### Collections Utilizadas

#### 1. `nutricionistas`
**ID do documento:** `userId` (Firebase Auth UID)

```typescript
{
  userId: string;                    // Firebase Auth UID (mesmo que ID do doc)
  email: string;
  nome: string;
  registroNumero: string;             // CRN ou registro profissional
  cidades: Array<{
    estado: string;
    cidade: string;
  }>;
  isVerificado: boolean;              // Verificado pelo admin
  status: 'ativo' | 'inativo';
  medicoVinculadoIds: string[];      // IDs dos médicos vinculados
  dataCadastro: Date;
}
```

#### 2. `solicitacoes_vinculo_nutri_medico`
**ID do documento:** Gerado automaticamente pelo Firestore

```typescript
{
  nutricionistaId: string;
  medicoId: string;
  solicitadoPor: 'medico' | 'nutricionista';  // Quem iniciou
  status: 'pendente' | 'aceita' | 'rejeitada' | 'cancelada';
  criadoEm: Date;
  aceitoEm?: Date;
  rejeitadoEm?: Date;
  canceladoEm?: Date;
  motivoRejeicao?: string;
  motivoCancelamento?: string;
  // Campos extras para exibição
  nutricionistaNome?: string;
  nutricionistaEmail?: string;
  medicoNome?: string;
}
```

#### 3. `solicitacoes_nutricionista`
**ID do documento:** Gerado automaticamente pelo Firestore

```typescript
{
  medicoId: string;
  nutricionistaId: string;
  pacienteId: string;
  status: 'pendente' | 'aceita' | 'rejeitada' | 'cancelada' | 'aguardando_medico';
  criadoEm: Date;
  aceitoEm?: Date;
  rejeitadoEm?: Date;
  canceladoEm?: Date;
  motivoRejeicao?: string;
  motivoCancelamento?: string;
  // Campos extras
  pacienteNome?: string;
  medicoNome?: string;
  nutricionistaNome?: string;
}
```

#### 4. `paciente_nutricionista`
**ID do documento:** Determinístico: `${pacienteId}_${nutricionistaId}`

```typescript
{
  pacienteId: string;
  nutricionistaId: string;
  medicoId: string;                  // Médico que compartilhou
  dataCompartilhamento: Date;
  status: 'ativo' | 'inativo' | 'removido';
  removidoEm?: Date;
  motivoRemocao?: string;
}
```

#### 5. `nutri_planos`
**ID do documento:** Determinístico: `${pacienteId}_${nutricionistaId}`

```typescript
{
  id: string;                         // ${pacienteId}_${nutricionistaId}
  pacienteId: string;
  nutricionistaId: string;
  nutricionistaNome?: string;
  
  // Dados do plano nutricional
  estilo: 'digestiva' | 'plant_based' | 'mediterranea' | 'rico_proteina' | 'low_carb_moderada';
  protDia_g: number;
  aguaDia_ml: number;
  refeicoes: number;
  distribuicaoProteina: {
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  modeloDia: {
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  evitar: string[];
  descricaoEstilo?: string;
  hipoteseComportamental?: string;
  suplementos?: {
    probiotico: string;
    whey: string;
    creatina: string;
  };
  
  // Metadados
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor: string;
  atualizadoPor: string;
}
```

### Para /metapersonal
Criar collections similares:
- `personal_trainers` (similar a `nutricionistas`)
- `solicitacoes_vinculo_personal_medico` (similar a `solicitacoes_vinculo_nutri_medico`)
- `solicitacoes_personal_trainer` (similar a `solicitacoes_nutricionista`)
- `paciente_personal_trainer` (similar a `paciente_nutricionista`)
- `personal_planos` (similar a `nutri_planos`, mas para planos de atividade física)

---

## 🔧 SERVIÇOS (SERVICES)

### 1. NutricionistaService
**Arquivo:** `services/nutricionistaService.ts`

**Métodos principais:**
- `getNutricionistaByUserId(userId: string)`: Busca nutricionista por userId
- `createOrUpdateNutricionista(userId, email, nome)`: Cria ou atualiza perfil
- `updatePerfil(userId, registroNumero, cidades)`: Atualiza registro e cidades
- `verifyNutricionista(userId)`: Marca como verificado (admin)
- `getNutricionistasVinculadosAoMedico(medicoId)`: Lista nutricionistas de um médico
- `getAllNutricionistas()`: Lista todos os nutricionistas
- `toggleStatus(userId, currentStatus)`: Alterna status ativo/inativo
- `deleteNutricionista(userId)`: Deleta nutricionista

**Collection:** `nutricionistas`

### 2. SolicitacaoVinculoNutriMedicoService
**Arquivo:** `services/solicitacaoVinculoNutriMedicoService.ts`

**Métodos principais:**
- `createVinculoRequest(nutricionistaId, medicoId, solicitadoPor, extraData?)`: Cria solicitação de vínculo
- `approveVinculoRequest(requestId, aprovadoPor)`: Aprova vínculo
- `rejectVinculoRequest(requestId, rejeitadoPor, motivoRejeicao?)`: Rejeita vínculo
- `cancelVinculoRequest(requestId, canceladoPor, motivoCancelamento?)`: Cancela solicitação
- `listPendingVinculoRequestsByNutri(nutricionistaId)`: Lista solicitações pendentes recebidas
- `listSentVinculoRequestsByNutri(nutricionistaId)`: Lista solicitações enviadas
- `listPendingVinculoRequestsByMedico(medicoId)`: Lista solicitações pendentes do médico
- `getVinculoStatus(nutricionistaId, medicoId)`: Verifica status do vínculo

**Collection:** `solicitacoes_vinculo_nutri_medico`

**Fluxo:**
1. Médico ou nutricionista cria solicitação
2. Outro lado recebe notificação
3. Outro lado aprova ou rejeita
4. Se aprovado, adiciona `medicoId` em `nutricionista.medicoVinculadoIds[]`

### 3. SolicitacaoNutricionistaService
**Arquivo:** `services/solicitacaoNutricionistaService.ts`

**Métodos principais:**
- `createPacienteShareRequest(medicoId, nutricionistaId, pacienteId)`: Cria solicitação de compartilhamento
- `approveShareRequest(requestId)`: Aprova compartilhamento (cria documento em `paciente_nutricionista`)
- `rejectShareRequest(requestId, motivoRejeicao?)`: Rejeita compartilhamento
- `cancelShareRequest(requestId, motivoCancelamento?)`: Cancela solicitação
- `listPendingRequestsByNutri(nutricionistaId)`: Lista solicitações pendentes recebidas
- `listPendingRequestsByMedico(medicoId)`: Lista solicitações pendentes do médico
- `listAllRequestsByNutri(nutricionistaId)`: Lista todas as solicitações do nutricionista

**Collection:** `solicitacoes_nutricionista`

**Fluxo:**
1. Médico compartilha paciente com nutricionista vinculado
2. Cria solicitação com status `'pendente'` ou `'aguardando_medico'`
3. Nutricionista aprova
4. Cria documento em `paciente_nutricionista` com ID determinístico

### 4. PacienteNutricionistaService
**Arquivo:** `services/pacienteNutricionistaService.ts`

**Métodos principais:**
- `listActiveVinculosByNutri(nutricionistaId)`: Lista vínculos ativos
- `listPacientesVisiveisByNutri(nutricionistaId)`: Lista pacientes com dados completos
- `hasAccessToPaciente(nutricionistaId, pacienteId)`: Verifica acesso
- `getPacienteResumo(pacienteId)`: Busca resumo do paciente
- `listVinculosByMedicoENutri(medicoId, nutricionistaId)`: Lista vínculos por médico e nutri
- `countPacientesPorNutricionista(medicoId, nutricionistaId)`: Conta pacientes em comum

**Collection:** `paciente_nutricionista`

### 5. NutriPlanoService
**Arquivo:** `services/nutriPlanoService.ts`

**Métodos principais:**
- `getPlano(pacienteId, nutricionistaId)`: Busca plano nutricional
- `createOrUpdatePlano(pacienteId, nutricionistaId, nutricionistaNome, planoData)`: Cria ou atualiza plano
- `hasPermission(planoId, nutricionistaId)`: Verifica permissão

**Collection:** `nutri_planos`

**ID Determinístico:** `${pacienteId}_${nutricionistaId}`

### Para /metapersonal
Criar serviços similares:
- `PersonalTrainerService` (similar a `NutricionistaService`)
- `SolicitacaoVinculoPersonalMedicoService` (similar a `SolicitacaoVinculoNutriMedicoService`)
- `SolicitacaoPersonalTrainerService` (similar a `SolicitacaoNutricionistaService`)
- `PacientePersonalTrainerService` (similar a `PacienteNutricionistaService`)
- `PersonalPlanoService` (similar a `NutriPlanoService`, mas para planos de atividade física)

---

## 📝 TIPOS TYPESCRIPT

### Arquivo: `features/metaNutri/metaNutri.types.ts`

```typescript
// Status do nutricionista
export type NutriStatus = 'ativo' | 'inativo';

// Status de solicitações
export type SolicitacaoStatus = 'pendente' | 'aceita' | 'rejeitada' | 'cancelada' | 'aguardando_medico';

// Documento do nutricionista
export interface NutricionistaDoc {
  id: string;
  userId: string;
  email: string;
  nome: string;
  registroNumero: string;
  cidades: { estado: string; cidade: string }[];
  isVerificado: boolean;
  status: NutriStatus;
  medicoVinculadoIds: string[];
  dataCadastro: Date;
}

// Solicitação de vínculo
export interface SolicitacaoVinculoNutriMedicoDoc {
  id: string;
  medicoId: string;
  nutricionistaId: string;
  solicitadoPor: 'medico' | 'nutricionista';
  status: SolicitacaoStatus;
  criadoEm: Date;
  aceitoEm?: Date;
  rejeitadoEm?: Date;
  canceladoEm?: Date;
  motivoRejeicao?: string;
  motivoCancelamento?: string;
  nutricionistaNome?: string;
  nutricionistaEmail?: string;
  medicoNome?: string;
}

// Solicitação de compartilhamento de paciente
export interface SolicitacaoNutricionistaDoc {
  id: string;
  pacienteId: string;
  nutricionistaId: string;
  medicoId: string;
  status: SolicitacaoStatus;
  criadoEm: Date;
  aceitoEm?: Date;
  rejeitadoEm?: Date;
  canceladoEm?: Date;
  motivoRejeicao?: string;
  motivoCancelamento?: string;
  pacienteNome?: string;
  medicoNome?: string;
  nutricionistaNome?: string;
}

// Relacionamento paciente-nutricionista
export interface PacienteNutricionistaDoc {
  id: string;
  pacienteId: string;
  nutricionistaId: string;
  medicoId: string;
  dataCompartilhamento: Date;
  status: 'ativo' | 'inativo' | 'removido';
  removidoEm?: Date;
  motivoRemocao?: string;
}
```

### Arquivo: `features/metaNutri/metaNutri.constants.ts`

```typescript
// Status
export const NUTRI_STATUS = {
  ATIVO: 'ativo',
  INATIVO: 'inativo',
} as const;

export const SOLICITACAO_STATUS = {
  PENDENTE: 'pendente',
  ACEITA: 'aceita',
  REJEITADA: 'rejeitada',
  CANCELADA: 'cancelada',
  AGUARDANDO_MEDICO: 'aguardando_medico',
} as const;

// Collections
export const COL_NUTRICIONISTAS = 'nutricionistas';
export const COL_SOLICITACOES_VINCULO_NUTRI_MEDICO = 'solicitacoes_vinculo_nutri_medico';
export const COL_SOLICITACOES_NUTRICIONISTA = 'solicitacoes_nutricionista';
export const COL_PACIENTE_NUTRICIONISTA = 'paciente_nutricionista';
```

### Para /metapersonal
Criar arquivos similares em `features/metaPersonal/`:
- `metaPersonal.types.ts`
- `metaPersonal.constants.ts`

---

## 🎨 LAYOUT E NAVEGAÇÃO

### Estrutura do Layout

```
┌─────────────────────────────────────────────────┐
│  HEADER (Topo)                                  │
│  [Logo] [Perfil Dropdown] [Meu Link] [Sair]   │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ SIDEBAR  │  CONTEÚDO PRINCIPAL                 │
│ (Menu)   │  (Dinâmico por seção)               │
│          │                                      │
│ - Home   │                                      │
│ - Médicos│                                      │
│ - Pacientes│                                    │
│ - Financeiro│                                   │
│ - Calendário│                                   │
│          │                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘
│  BOTTOM NAV (Mobile)                            │
│  [Home] [Médicos] [Pacientes] [Financeiro] [Calendário]
└─────────────────────────────────────────────────┘
```

### Menu Lateral (Sidebar)

**Itens do menu:**
```typescript
type MenuNutri = 'home' | 'medicos' | 'pacientes' | 'financeiro' | 'calendario' | 'meu-perfil';

const MENU_ITEMS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'medicos', label: 'Médicos', icon: Stethoscope },
  { id: 'pacientes', label: 'Pacientes', icon: Users },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'calendario', label: 'Calendário', icon: Calendar },
];
```

**Características:**
- Colapsável (desktop)
- Responsivo (mobile vira bottom nav)
- Persiste `activeMenu` no localStorage
- Ícones do lucide-react

### Header Superior

**Itens:**
- Logo/Identificação
- Dropdown de perfil:
  - Meu Perfil
  - Meu Link (gerar link de referral)
  - Sair
- Indicador de notificações (solicitações pendentes)

### Bottom Navigation (Mobile)

Aparece apenas em mobile (< 1024px)
- 5 itens principais (sem "Meu Perfil")
- Ícones grandes para fácil toque
- Indicador visual do item ativo

### Para /metapersonal
Manter mesma estrutura, adaptar:
- Ícones apropriados (Activity, Dumbbell, etc.)
- Cores diferentes (azul/roxo ao invés de verde)
- Mesma lógica de navegação

---

## 📊 FUNCIONALIDADES POR SEÇÃO

### 1. HOME (Dashboard)

#### KPIs Principais
- **Total de Pacientes Compartilhados:** Conta vínculos ativos em `paciente_nutricionista`
- **Número de Médicos Vinculados:** Conta IDs em `nutricionista.medicoVinculadoIds[]`
- **Receita Total:** Soma de `valorPago` de todos os pacientes compartilhados
- **Receita do Mês:** Soma de parcelas pagas no mês atual

#### Gráficos e Estatísticas
- **Análise de Perda de Peso:**
  - Filtros: Base (meus pacientes vs. todos do Oftware), Dose, Faixa Etária, Sexo
  - Gráfico de linha mostrando evolução de peso
  - Comparação com dados da plataforma
- **Demografia dos Pacientes:**
  - Gráfico de pizza: distribuição por sexo, faixa etária
  - Comparação com dados do Oftware

#### Modais
- Modal de visualização de paciente (completo)
- Modal de gráficos de evolução

### 2. MÉDICOS

#### Abas
1. **Buscar Médicos**
   - Filtros: Estado, Cidade
   - Lista médicos verificados e ativos
   - Botão "Solicitar Vínculo" em cada médico
   - Busca por nome (opcional)

2. **Solicitações**
   - **Recebidas:** Solicitações que o médico enviou
     - Mostra nome do médico, data, botões Aprovar/Rejeitar
   - **Enviadas:** Solicitações que o nutricionista enviou
     - Mostra status (pendente, aceita, rejeitada)
     - Botão para cancelar (se pendente)

3. **Médicos Vinculados**
   - Lista médicos com vínculo ativo
   - Mostra quantidade de pacientes compartilhados
   - Expandir para ver lista de pacientes
   - Botão para remover vínculo (opcional)

### 3. PACIENTES

#### Lista de Pacientes
- Cards com informações resumidas:
  - Nome, idade, sexo
  - IMC atual (com barra interativa arrastável)
  - Peso inicial vs. atual
  - Médico responsável
  - Status de pagamento
  - Data de compartilhamento
- Filtros:
  - Busca por nome
  - Filtro por médico
  - Filtro por status de pagamento
- Ordenação:
  - Por nome, data de compartilhamento, IMC, etc.

#### Visualização Completa (Modal)
Ao clicar em um paciente, abre modal com abas:
1. **Dados de Identificação**
2. **Dados Clínicos**
3. **Plano Nutricional** (criado pelo sistema ou pelo nutricionista)
4. **Exames Laboratoriais**
5. **Plano Terapêutico** (Tirzepatida)
6. **Evolução e Seguimento**
7. **Alertas e Recomendações**
8. **Comunicação e Registro**
9. **Prescrições**

**Importante:** Todas as visualizações são **somente leitura** (exceto planos criados pelo nutricionista).

#### Gráficos de Evolução
- Peso ao longo do tempo
- IMC ao longo do tempo
- Circunferência abdominal
- HbA1c
- Comparação com curva esperada

### 4. FINANCEIRO

#### Lista de Pagamentos
- Lista todos os pacientes compartilhados com status de pagamento
- Filtros:
  - Busca por nome
  - Status: todos, em negociação, pago, pendente, atrasado
- Informações exibidas:
  - Nome do paciente
  - Valor total
  - Valor pago
  - Valor pendente
  - Status
  - Data da última atualização

#### Modal de Detalhes
Ao clicar em um paciente:
- Visualização completa do pagamento
- Lista de parcelas com:
  - Data de vencimento
  - Valor
  - Status (paga, pendente, atrasada)
  - Data de pagamento (se paga)
- Histórico de pagamentos

**Importante:** Nutricionista **não pode editar** pagamentos, apenas visualizar.

### 5. CALENDÁRIO

#### Visualização Mensal
- Calendário mensal (grid de dias)
- Indicadores visuais:
  - Aplicações de Tirzepatida (ícone de seringa)
  - Pagamentos vencendo (ícone de dinheiro)
- Navegação: mês anterior/próximo

#### Detalhes do Dia
Ao clicar em um dia:
- Lista todas as aplicações agendadas:
  - Nome do paciente
  - Semana do tratamento
  - Dose
  - Local de aplicação
- Lista todos os pagamentos vencendo:
  - Nome do paciente
  - Valor da parcela
  - Status

### 6. MEU PERFIL

#### Informações do Perfil
- **Registro Profissional:** Campo de texto (CRN)
- **Cidades de Atendimento:**
  - Seleção de estado
  - Seleção de cidade (baseado no estado)
  - Lista de cidades selecionadas
  - Botão para remover cidade

#### Link de Referral
- Gerar link personalizado: `oftware.com.br/?ref=nutri_${nutricionistaId}`
- Copiar link
- Compartilhar link
- Quando médico acessa com esse link, pode vincular diretamente

#### Status
- Indicador se está verificado
- Status (ativo/inativo)

---

## 🔄 FLUXOS DE TRABALHO

### Fluxo 1: Cadastro e Verificação

```
1. Nutricionista faz login com Google
   ↓
2. Sistema cria/atualiza perfil em `nutricionistas`
   - userId = Firebase Auth UID
   - email, nome do Google
   - isVerificado = false
   - status = 'inativo'
   ↓
3. Nutricionista completa perfil
   - Registro profissional (CRN)
   - Cidades de atendimento
   ↓
4. Admin verifica nutricionista
   - isVerificado = true
   - status = 'ativo'
   ↓
5. Nutricionista aparece nas buscas de médicos
```

### Fluxo 2: Vinculação com Médico

**Opção A: Médico solicita vínculo**
```
1. Médico busca nutricionista na plataforma
   ↓
2. Médico clica "Solicitar Vínculo"
   ↓
3. Cria documento em `solicitacoes_vinculo_nutri_medico`
   - solicitadoPor = 'medico'
   - status = 'pendente'
   ↓
4. Nutricionista recebe notificação na aba "Solicitações"
   ↓
5. Nutricionista aprova ou rejeita
   ↓
6. Se aprovado:
   - status = 'aceita'
   - Adiciona medicoId em nutricionista.medicoVinculadoIds[]
   - Cria log de auditoria
```

**Opção B: Nutricionista solicita vínculo**
```
1. Nutricionista busca médico na plataforma
   ↓
2. Nutricionista clica "Solicitar Vínculo"
   ↓
3. Cria documento em `solicitacoes_vinculo_nutri_medico`
   - solicitadoPor = 'nutricionista'
   - status = 'pendente'
   ↓
4. Médico recebe notificação
   ↓
5. Médico aprova ou rejeita
   ↓
6. Se aprovado: (mesmo processo acima)
```

### Fluxo 3: Compartilhamento de Paciente

```
1. Médico vinculado compartilha paciente
   ↓
2. Cria documento em `solicitacoes_nutricionista`
   - status = 'pendente' ou 'aguardando_medico'
   ↓
3. Nutricionista recebe notificação na aba "Pacientes" > "Solicitações"
   ↓
4. Nutricionista aprova
   ↓
5. Cria documento em `paciente_nutricionista`
   - ID determinístico: ${pacienteId}_${nutricionistaId}
   - status = 'ativo'
   - dataCompartilhamento = agora
   ↓
6. Paciente aparece na lista de pacientes do nutricionista
```

### Fluxo 4: Criação de Plano Nutricional

```
1. Nutricionista visualiza paciente compartilhado
   ↓
2. Nutricionista acessa aba "Plano Nutricional"
   ↓
3. Nutricionista cria/edita plano
   ↓
4. Salva em `nutri_planos`
   - ID determinístico: ${pacienteId}_${nutricionistaId}
   ↓
5. Plano fica associado ao paciente e ao nutricionista
   ↓
6. Nutricionista pode atualizar o plano a qualquer momento
```

**Importante:** Múltiplos nutricionistas podem ter planos diferentes para o mesmo paciente.

### Para /metapersonal
Adaptar os mesmos fluxos:
- Cadastro de Personal Trainer
- Vinculação com médico
- Compartilhamento de paciente
- Criação de plano de atividade física

---

## 🔒 FIRESTORE RULES

### Regras Principais

```javascript
// Nutricionista pode ler/escrever seu próprio documento
match /nutricionistas/{nutricionistaId} {
  allow read, write: if request.auth != null && request.auth.uid == nutricionistaId;
}

// Solicitações de vínculo
match /solicitacoes_vinculo_nutri_medico/{solicitacaoId} {
  allow read: if request.auth != null && (
    resource.data.nutricionistaId == request.auth.uid ||
    resource.data.medicoId == request.auth.uid
  );
  allow create: if request.auth != null;
  allow update: if request.auth != null && (
    resource.data.nutricionistaId == request.auth.uid ||
    resource.data.medicoId == request.auth.uid
  );
}

// Solicitações de compartilhamento
match /solicitacoes_nutricionista/{solicitacaoId} {
  allow read: if request.auth != null && (
    resource.data.nutricionistaId == request.auth.uid ||
    resource.data.medicoId == request.auth.uid
  );
  allow create: if request.auth != null;
  allow update: if request.auth != null && (
    resource.data.nutricionistaId == request.auth.uid ||
    resource.data.medicoId == request.auth.uid
  );
}

// Relacionamento paciente-nutricionista
match /paciente_nutricionista/{vinculoId} {
  allow read: if request.auth != null && (
    resource.data.nutricionistaId == request.auth.uid ||
    resource.data.medicoId == request.auth.uid
  );
  allow create: if request.auth != null;
  allow update: if request.auth != null && (
    resource.data.nutricionistaId == request.auth.uid ||
    resource.data.medicoId == request.auth.uid
  );
}

// Planos nutricionais
match /nutri_planos/{planoId} {
  allow read: if request.auth != null && (
    resource.data.nutricionistaId == request.auth.uid ||
    resource.data.medicoId == request.auth.uid ||
    // Médico pode ver planos de seus pacientes
    exists(/databases/$(database)/documents/paciente_nutricionista/$(resource.data.pacienteId + '_' + resource.data.nutricionistaId))
  );
  allow write: if request.auth != null && resource.data.nutricionistaId == request.auth.uid;
}
```

### Para /metapersonal
Criar regras similares para:
- `personal_trainers`
- `solicitacoes_vinculo_personal_medico`
- `solicitacoes_personal_trainer`
- `paciente_personal_trainer`
- `personal_planos`

---

## ✅ CHECKLIST PARA CRIAR /metapersonal

### Fase 1: Estrutura Base
- [ ] Criar pasta `app/metapersonal/`
- [ ] Criar `app/metapersonal/page.tsx` (wrapper)
- [ ] Criar `app/metapersonal/page.v2.tsx` (implementação)
- [ ] Criar pasta `features/metaPersonal/`
- [ ] Criar `features/metaPersonal/metaPersonal.types.ts`
- [ ] Criar `features/metaPersonal/metaPersonal.constants.ts`

### Fase 2: Serviços
- [ ] Criar `services/personalTrainerService.ts`
- [ ] Criar `services/solicitacaoVinculoPersonalMedicoService.ts`
- [ ] Criar `services/solicitacaoPersonalTrainerService.ts`
- [ ] Criar `services/pacientePersonalTrainerService.ts`
- [ ] Criar `services/personalPlanoService.ts`

### Fase 3: Firestore
- [ ] Criar collection `personal_trainers` no Firestore
- [ ] Criar collection `solicitacoes_vinculo_personal_medico`
- [ ] Criar collection `solicitacoes_personal_trainer`
- [ ] Criar collection `paciente_personal_trainer`
- [ ] Criar collection `personal_planos`
- [ ] Adicionar regras de segurança no `firestore.rules`

### Fase 4: Ícone na Página Principal
- [ ] Adicionar estado `showPersonalModal` em `app/page.tsx`
- [ ] Criar card inicial com ícone `Activity` ou `Dumbbell`
- [ ] Criar modal expandido com descrição
- [ ] Adicionar botão que redireciona para `/metapersonal`
- [ ] Testar fluxo de login e redirecionamento

### Fase 5: Layout e Navegação
- [ ] Implementar sidebar com menu
- [ ] Implementar header superior
- [ ] Implementar bottom navigation (mobile)
- [ ] Implementar sistema de rotas internas (activeMenu)
- [ ] Adicionar persistência no localStorage

### Fase 6: Seção Home
- [ ] Implementar KPIs (pacientes, médicos, receita)
- [ ] Implementar gráficos de evolução
- [ ] Implementar filtros
- [ ] Implementar modais de visualização

### Fase 7: Seção Médicos
- [ ] Implementar aba "Buscar Médicos"
- [ ] Implementar aba "Solicitações"
- [ ] Implementar aba "Médicos Vinculados"
- [ ] Implementar fluxos de aprovação/rejeição

### Fase 8: Seção Pacientes
- [ ] Implementar lista de pacientes
- [ ] Implementar cards de pacientes
- [ ] Implementar modal de visualização completa
- [ ] Implementar gráficos de evolução
- [ ] Implementar filtros e busca

### Fase 9: Seção Financeiro
- [ ] Implementar lista de pagamentos
- [ ] Implementar filtros por status
- [ ] Implementar modal de detalhes
- [ ] Implementar visualização de parcelas

### Fase 10: Seção Calendário
- [ ] Implementar calendário mensal
- [ ] Implementar indicadores de aplicações
- [ ] Implementar indicadores de pagamentos
- [ ] Implementar modal de detalhes do dia

### Fase 11: Seção Meu Perfil
- [ ] Implementar formulário de perfil
- [ ] Implementar seleção de cidades
- [ ] Implementar geração de link de referral
- [ ] Implementar salvamento de dados

### Fase 12: Planos de Atividade Física
- [ ] Definir estrutura de dados do plano
- [ ] Implementar criação de plano
- [ ] Implementar edição de plano
- [ ] Implementar visualização de plano

### Fase 13: Integração com /metaadmin
- [ ] Adicionar opção para médicos buscarem Personal Trainers
- [ ] Adicionar opção para médicos compartilharem pacientes com Personal Trainers
- [ ] Adicionar visualização de Personal Trainers vinculados

### Fase 14: Testes
- [ ] Testar fluxo completo de cadastro
- [ ] Testar fluxo de vinculação
- [ ] Testar fluxo de compartilhamento
- [ ] Testar criação de planos
- [ ] Testar visualização de dados
- [ ] Testar responsividade mobile/desktop

### Fase 15: Documentação
- [ ] Criar README específico para /metapersonal
- [ ] Documentar APIs dos serviços
- [ ] Documentar estrutura de dados
- [ ] Documentar fluxos de trabalho

---

## 📌 NOTAS IMPORTANTES

1. **ID Determinístico:** Use IDs determinísticos para relacionamentos (ex: `${pacienteId}_${personalTrainerId}`) para facilitar validação nas Firestore Rules.

2. **Somente Leitura:** Personal Trainer terá acesso somente leitura aos dados dos pacientes (exceto planos de atividade física que ele criar).

3. **Verificação:** Personal Trainer precisa ser verificado pelo admin para aparecer nas buscas.

4. **Vínculo Necessário:** É necessário estar vinculado a um médico para receber pacientes.

5. **Múltiplos Planos:** Múltiplos Personal Trainers podem ter planos diferentes para o mesmo paciente.

6. **Gratuito:** A plataforma é 100% gratuita para Personal Trainers (assim como para nutricionistas).

---

## 🎨 DIFERENÇAS VISUAIS PARA /metapersonal

- **Cores:** Usar gradiente azul/roxo ao invés de verde
- **Ícones:** `Activity`, `Dumbbell`, `Target` ao invés de `UtensilsCrossed`
- **Terminologia:** "Plano de Atividade Física" ao invés de "Plano Nutricional"
- **Campos Específicos:** Adaptar campos do plano para atividade física (exercícios, séries, repetições, etc.)

---

## 📚 REFERÊNCIAS

- Arquivo principal: `app/metanutri/page.v2.tsx`
- Tipos: `features/metaNutri/metaNutri.types.ts`
- Constantes: `features/metaNutri/metaNutri.constants.ts`
- Serviços: `services/nutricionistaService.ts`, etc.
- README: `README-METANUTRI.md`
- Documentação de implementação: `METANUTRI_UI_REWORK.md`

---

**Fim do Guia**

Este documento deve ser usado como referência completa para criar a página `/metapersonal` seguindo o mesmo padrão e estrutura do `/metanutri`.
