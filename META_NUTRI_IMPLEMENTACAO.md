# Meta Nutri — Controle de Implementação

## Visão geral

Feature para permitir que nutricionistas acessem pacientes de forma somente leitura, mediante vinculação com médicos e verificação de credenciais.

## Regras do sistema (imutáveis)

- Nutricionista é somente leitura (nunca edita paciente).
- Nutricionista só tem acesso a pacientes se estiver:
  - `isVerificado=true` e
  - vinculado a pelo menos 1 médico (`medicoVinculadoIds.length > 0`) e
  - paciente compartilhado com aceite (etapas futuras).
- `/metaadmingeral` NÃO terá rota nova. Tudo será dentro da página existente.

## Modelo de dados (Firestore)

### Collections

- `nutricionistas` - Perfil do nutricionista
- `solicitacoes_vinculo_nutri_medico` - Solicitações de vínculo entre nutricionista e médico
- `solicitacoes_nutricionista` - Solicitações de acesso do nutricionista a pacientes
- `paciente_nutricionista` - Relacionamento entre paciente e nutricionista (compartilhamento)

## Etapas

### ETAPA 0 — Preparação

✅ **Status:** Concluída

✅ **O que foi feito**

- Criado arquivo de controle `META_NUTRI_IMPLEMENTACAO.md` na raiz do repositório
- Criada estrutura de pastas `features/metaNutri/` para organização da feature
- Criado arquivo de constantes `metaNutri.constants.ts` com:
  - Status do nutricionista (ativo/inativo)
  - Status de solicitações (pendente/aceita/rejeitada/cancelada)
  - Nomes das collections do Firestore como constantes
- Criado arquivo de tipos `metaNutri.types.ts` com interfaces TypeScript:
  - `NutricionistaDoc` - Perfil do nutricionista
  - `SolicitacaoVinculoNutriMedicoDoc` - Solicitações de vínculo nutri-médico
  - `SolicitacaoNutricionistaDoc` - Solicitações de acesso a pacientes
  - `PacienteNutricionistaDoc` - Relacionamento paciente-nutricionista
- Documentadas regras imutáveis do sistema no arquivo de controle

🧩 **Arquivos alterados/criados**

- `META_NUTRI_IMPLEMENTACAO.md` (criado)
- `features/metaNutri/metaNutri.constants.ts` (criado)
- `features/metaNutri/metaNutri.types.ts` (criado)

🧪 **Como testar**

1. Executar `yarn dev` ou `npm run dev` e verificar que não há erros de compilação
2. Verificar que o TypeScript compila sem erros (`tsc --noEmit` ou através do IDE)
3. Confirmar que os arquivos criados estão acessíveis e podem ser importados

🐛 **Pendências / Problemas conhecidos**

Nenhuma pendência nesta etapa.

🔁 **Correções feitas nesta etapa**

Nenhuma nesta etapa.

---

### ETAPA 1 — Home + /metanutri + Perfil Nutricionista (sem pacientes)

✅ **Status:** Concluída

✅ **O que foi feito**

- Adicionado botão "Nutricionista" na página inicial (Home) junto com Médico e Paciente
- Criada rota `/metanutri` com autenticação Google (mesmo padrão das outras áreas)
- Implementado sistema de criação/atualização automática do documento do nutricionista no Firestore ao primeiro login
- Criada tela de perfil do nutricionista com:
  - Campo de registro (CRN / Número) - obrigatório
  - Seletor de cidades atendidas (mesmo padrão usado para médicos/pacientes)
  - Botão de salvar perfil
- Implementados bloqueios de acesso baseados em:
  - `isVerificado=false` → mostra aviso "Aguardando verificação do admin" e bloqueia funcionalidades
  - `isVerificado=true` mas `medicoVinculadoIds` vazio → mostra aviso "Vínculo com médico pendente"
  - Badges de status visuais (verificado, pendente, etc.)
- Criado serviço `NutricionistaService` para gerenciar documentos do nutricionista no Firestore
- Placeholder para lista de pacientes ("Pacientes aparecerão aqui na etapa 5")

🧩 **Arquivos alterados/criados**

- `app/page.tsx` (alterado) - Adicionado card/botão "Nutricionista" na Home
- `app/metanutri/page.tsx` (criado) - Página principal do nutricionista com perfil e bloqueios
- `services/nutricionistaService.ts` (criado) - Serviço para gerenciar documentos do nutricionista

🧪 **Como testar**

1. **Teste na Home:**
   - Acessar a página inicial (`/`)
   - Verificar que existe um terceiro card "Nutricionista" (verde) junto com Médico e Paciente
   - Clicar no card "Nutricionista"
   - Verificar que abre modal explicativo
   - Clicar em "Acessar Área do Nutricionista"

2. **Teste de Login:**
   - Se não estiver logado, deve abrir popup de login Google
   - Após login, deve redirecionar para `/metanutri`
   - Se já estiver logado, deve ir direto para `/metanutri`

3. **Teste de Criação de Documento:**
   - Fazer login pela primeira vez com uma conta Google
   - Verificar no console do Firebase que foi criado documento em `nutricionistas` com:
     - `userId`, `email`, `nome` (do Google)
     - `registroNumero: ""`
     - `cidades: []`
     - `isVerificado: false`
     - `status: "inativo"`
     - `medicoVinculadoIds: []`
     - `dataCadastro` (timestamp)

4. **Teste de Perfil:**
   - Preencher campo "Registro (CRN / Número)" com um valor (ex: "CRN-3 12345")
   - Adicionar cidades:
     - Selecionar estado
     - Selecionar cidade
     - Clicar em "Adicionar"
     - Verificar que cidade aparece na lista
   - Clicar em "Salvar"
   - Verificar mensagem de sucesso
   - Verificar no Firestore que os dados foram salvos

5. **Teste de Bloqueios:**
   - Verificar que aparece badge "Aguardando verificação do admin" (amarelo)
   - Verificar que na seção "Acesso a Pacientes" aparece mensagem explicando que precisa de verificação
   - (Para testar com verificado, seria necessário alterar manualmente no Firestore `isVerificado: true`)

6. **Teste de Validação:**
   - Tentar salvar sem preencher registro
   - Verificar que aparece aviso "Preencha seu registro para completar o perfil"

🐛 **Pendências / Problemas conhecidos**

Nenhuma pendência nesta etapa.

🔁 **Correções feitas nesta etapa**

Nenhuma nesta etapa.

### ETAPA 2 — Nutricionistas dentro do /metaadmingeral (aprovação/admin)

✅ **Status:** Concluída

✅ **O que foi feito**

- Adicionada seção/aba "Nutricionistas" dentro do `/metaadmingeral` (sem criar nova rota)
- Implementada listagem de nutricionistas com tabela contendo:
  - Nome, Email, Registro (CRN), Cidades (resumo + tooltip), Verificado (badge), Status (badge), Data de cadastro
  - Ordenação: não verificados primeiro, depois por data de cadastro (mais recentes)
- Implementadas ações do admin:
  - Botão "Ver detalhes" - abre modal com dados completos do nutricionista
  - Botão "Verificar" - aparece apenas se `isVerificado=false`, atualiza para `true`
  - Botão "Ativar/Inativar" - alterna status entre ativo/inativo (mantém verificação)
- Adicionados métodos no `NutricionistaService`:
  - `getAllNutricionistas()` - lista todos os nutricionistas
  - `verifyNutricionista(userId)` - verifica nutricionista
  - `toggleStatus(userId, currentStatus)` - alterna status ativo/inativo
- Criado modal de detalhes com todas as informações do nutricionista
- Adicionado botão "Nutricionistas" no sidebar (desktop e mobile) seguindo padrão visual existente
- Implementados toasts de sucesso/erro para feedback das ações

🧩 **Arquivos alterados/criados**

- `app/metaadmingeral/page.tsx` (alterado) - Adicionada seção Nutricionistas, estados, funções e modal
- `services/nutricionistaService.ts` (alterado) - Adicionados métodos getAllNutricionistas, verifyNutricionista, toggleStatus

🧪 **Como testar**

1. **Login como admin:**
   - Fazer login com conta de admin no sistema
   - Acessar `/metaadmingeral`

2. **Acessar seção Nutricionistas:**
   - No sidebar (desktop) ou menu inferior (mobile), clicar em "Nutricionistas"
   - Verificar que a seção abre e carrega a lista de nutricionistas

3. **Verificar nutricionista:**
   - Na tabela, encontrar um nutricionista com badge "Não Verificado"
   - Clicar no botão verde "Verificar" (ícone ShieldCheck)
   - Verificar toast de sucesso
   - Verificar que o badge muda para "Verificado" (verde)
   - Verificar no Firestore que `isVerificado` está `true`
   - Verificar em `/metanutri` (com login do nutricionista) que o badge mudou

4. **Ativar/Inativar nutricionista:**
   - Clicar no botão de ativar/inativar (ícone CheckCircle/XCircle)
   - Verificar toast de sucesso
   - Verificar que o badge de status muda
   - Verificar no Firestore que o `status` foi atualizado

5. **Ver detalhes:**
   - Clicar no botão azul "Ver detalhes" (ícone Eye)
   - Verificar que modal abre com todas as informações:
     - Nome, Email, User ID
     - Registro (CRN)
     - Lista de cidades atendidas
     - Status de verificação
     - Status (ativo/inativo)
     - Quantidade de vínculos com médicos
     - Data de cadastro

6. **Verificar ordenação:**
   - Verificar que nutricionistas não verificados aparecem primeiro
   - Verificar que dentro de cada grupo (verificado/não verificado), estão ordenados por data (mais recentes primeiro)

🐛 **Pendências / Problemas conhecidos**

Nenhuma pendência nesta etapa.

🔁 **Correções feitas nesta etapa**

Nenhuma nesta etapa.

### ETAPA 3 — Solicitação de vínculo Nutricionista ↔ Médico (gate do sistema)

✅ **Status:** Concluída

✅ **O que foi feito**

- Criado service `SolicitacaoVinculoNutriMedicoService` com métodos completos:
  - `createVinculoRequest()` - cria solicitação com validação de duplicidade
  - `listVinculoRequestsByNutri()` - lista solicitações do nutricionista
  - `listPendingVinculoRequestsByMedico()` - lista solicitações pendentes do médico
  - `approveVinculoRequest()` - aprova e atualiza `medicoVinculadoIds` no doc do nutricionista
  - `rejectVinculoRequest()` - rejeita solicitação
  - `getRequestWithExtraData()` - busca solicitação com dados extras (nome, email, registro, cidades)
- Implementada UI em `/metanutri` para solicitar vínculo:
  - Seção "Vincular-se a um Médico" quando `isVerificado=true` e `medicoVinculadoIds.length==0`
  - Dropdown com lista de médicos verificados (filtrados por `isVerificado=true` e `status='ativo'`)
  - Botão "Solicitar vínculo" com validação
  - Lista de "Solicitações enviadas" com status (pendente/aceita/rejeitada) e badges visuais
  - Validação de duplicidade (não permite criar se já existe pendente ou aceita)
- Implementada seção no `/metaadmin` para médicos:
  - Seção "Vínculo com Nutricionistas" aparece quando há solicitações pendentes
  - Lista solicitações pendentes com dados do nutricionista (nome, email, registro, cidades)
  - Botões "Aceitar" e "Rejeitar" para cada solicitação
  - Ao aceitar: atualiza `medicoVinculadoIds` no doc do nutricionista (sem duplicar)
  - Toasts de sucesso/erro para feedback
- Atualizados bloqueios/gate no `/metanutri`:
  - Quando `isVerificado=true` e `medicoVinculadoIds.length > 0`:
    - Mostra badge "Vínculo com médico confirmado" (verde)
    - Mostra placeholder "Pacientes aparecerão aqui na etapa 5"
  - Sistema de atualização automática (polling a cada 10s) para detectar vínculos aceitos
- Collection `solicitacoes_vinculo_nutri_medico` criada e utilizada conforme constantes

🧩 **Arquivos alterados/criados**

- `services/solicitacaoVinculoNutriMedicoService.ts` (criado) - Service completo para gerenciar solicitações de vínculo
- `app/metanutri/page.tsx` (alterado) - Adicionada UI de solicitação de vínculo e lista de solicitações
- `app/metaadmin/page.tsx` (alterado) - Adicionada seção de solicitações de vínculo para médicos

🧪 **Como testar**

1. **Preparação:**
   - Criar um nutricionista (fazer login em `/metanutri` com conta Google)
   - Verificar o nutricionista no `/metaadmingeral` (marcar `isVerificado=true`)
   - Ter pelo menos um médico verificado no sistema

2. **Teste do Nutricionista - Solicitar vínculo:**
   - Fazer login como nutricionista verificado em `/metanutri`
   - Verificar que aparece seção "Vincular-se a um Médico"
   - Selecionar um médico no dropdown
   - Clicar em "Solicitar vínculo"
   - Verificar toast de sucesso
   - Verificar que a solicitação aparece na lista "Solicitações enviadas" com status "Pendente"

3. **Teste de Duplicidade:**
   - Tentar solicitar vínculo novamente com o mesmo médico
   - Verificar que aparece erro "Já existe uma solicitação pendente para este médico"
   - (Opcional) Aceitar a solicitação e tentar solicitar novamente
   - Verificar que aparece erro "Você já está vinculado a este médico"

4. **Teste do Médico - Ver e aceitar solicitação:**
   - Fazer login como médico em `/metaadmin`
   - Verificar que aparece seção "Vínculo com Nutricionistas" (se houver solicitação pendente)
   - Verificar que mostra dados do nutricionista (nome, email, registro, cidades)
   - Clicar em "Aceitar"
   - Verificar toast de sucesso
   - Verificar que a solicitação desaparece da lista (foi aceita)

5. **Teste de atualização do documento:**
   - Após aceitar, verificar no Firestore:
     - Documento em `solicitacoes_vinculo_nutri_medico` tem `status='aceita'` e `aceitoEm` preenchido
     - Documento em `nutricionistas` tem o `medicoId` adicionado em `medicoVinculadoIds[]`

6. **Teste de atualização no /metanutri:**
   - Voltar para `/metanutri` (com login do nutricionista)
   - Aguardar até 10 segundos ou recarregar a página
   - Verificar que:
     - Badge muda para "Vínculo com médico confirmado" (verde)
     - Aparece mensagem "Você está vinculado a X médico(s)"
     - Placeholder "Pacientes aparecerão aqui na etapa 5" aparece

7. **Teste de rejeição:**
   - Criar nova solicitação de vínculo
   - Como médico, clicar em "Rejeitar"
   - Verificar toast de sucesso
   - Verificar que solicitação desaparece da lista
   - Verificar no Firestore que `status='rejeitada'` e `rejeitadoEm` preenchido

🐛 **Pendências / Problemas conhecidos**

Nenhuma pendência nesta etapa.

🔁 **Correções feitas nesta etapa**

Nenhuma nesta etapa.

### ETAPA 4 — Compartilhamento de paciente (médico → nutri) + aceite

✅ **Status:** Concluída

✅ **O que foi feito**

- Criado service `SolicitacaoNutricionistaService` com métodos completos para gerenciar solicitações de compartilhamento:
  - `createPacienteShareRequest()` - cria solicitação com validação de duplicidade
  - `listPendingRequestsByNutri()` - lista solicitações pendentes do nutricionista
  - `listRequestsByPaciente()` - lista solicitações de um paciente (para médico)
  - `approveShareRequest()` - aprova solicitação e cria documento em `paciente_nutricionista`
  - `rejectShareRequest()` - rejeita solicitação
  - `cancelShareRequest()` - cancela solicitação (pelo médico)
  - `listActiveVinculosByNutri()` - lista vínculos ativos (pacientes compartilhados)
- Adicionada seção "Compartilhar com Nutricionista" na Pasta 1 do modal de edição de paciente em `/metaadmin`:
  - Dropdown com nutricionistas elegíveis (verificados, ativos e vinculados ao médico)
  - Botão "Compartilhar Paciente" com validações
  - Lista de solicitações já feitas com status e botão "Cancelar" para pendentes
  - Carregamento automático quando abre modal e está na Pasta 1
- Adicionada seção "Solicitações Pendentes de Pacientes" em `/metanutri`:
  - Lista solicitações pendentes com dados do paciente e médico
  - Botões "Aceitar" e "Rejeitar" para cada solicitação
  - Validação de gate: só permite ações se `isVerificado=true` e `medicoVinculadoIds.length > 0`
  - Validação adicional ao aceitar: verifica se médico está em `medicoVinculadoIds`
- Criado placeholder "Vínculos Ativos (Beta)" em `/metanutri`:
  - Lista pacientes aceitos (vindos de `paciente_nutricionista`)
  - Mostra apenas IDs e datas (placeholder para ETAPA 5)
- Implementada validação de duplicidade:
  - Não permite criar solicitação se já existe pendente ou aceita para o mesmo trio (medicoId + nutricionistaId + pacienteId)
- Criação automática de documento em `paciente_nutricionista` ao aceitar solicitação:
  - ID: `${pacienteId}_${nutricionistaId}_${medicoId}`
  - Campos: pacienteId, nutricionistaId, medicoId, status: 'ativo', dataCompartilhamento

🧩 **Arquivos alterados/criados**

- `services/solicitacaoNutricionistaService.ts` (criado) - Service completo para gerenciar solicitações de compartilhamento
- `app/metaadmin/page.tsx` (alterado) - Adicionada seção de compartilhamento na Pasta 1 do modal de paciente
- `app/metanutri/page.tsx` (alterado) - Adicionadas seções de solicitações pendentes e vínculos ativos

🧪 **Como testar**

1. **Preparação:**
   - Ter um nutricionista verificado (`isVerificado=true`) e vinculado a um médico
   - Ter um médico logado no `/metaadmin`
   - Ter um paciente cadastrado para o médico

2. **Teste de Compartilhamento (Médico):**
   - Fazer login como médico em `/metaadmin`
   - Abrir um paciente (clicar em editar)
   - Ir para Pasta 1 (Dados de Identificação)
   - Rolar até a seção "Compartilhar com Nutricionista"
   - Verificar que aparece dropdown com nutricionistas elegíveis
   - Selecionar um nutricionista
   - Clicar em "Compartilhar Paciente"
   - Verificar toast de sucesso
   - Verificar que aparece na lista de solicitações com status "Pendente"

3. **Teste de Solicitação Pendente (Nutricionista):**
   - Fazer login como nutricionista em `/metanutri`
   - Verificar que aparece seção "Solicitações Pendentes de Pacientes"
   - Verificar que aparece a solicitação criada pelo médico
   - Verificar dados: nome do paciente, nome do médico, data

4. **Teste de Aceitar Solicitação:**
   - Na seção de solicitações pendentes, clicar em "Aceitar"
   - Verificar toast de sucesso
   - Verificar que solicitação desaparece da lista de pendentes
   - Verificar no Firestore:
     - Documento em `solicitacoes_nutricionista` com `status=aceita` e `aceitoEm` preenchido
     - Documento criado em `paciente_nutricionista` com status 'ativo'

5. **Teste de Rejeitar Solicitação:**
   - Criar nova solicitação (médico compartilha novamente)
   - No `/metanutri`, clicar em "Rejeitar"
   - Verificar toast de sucesso
   - Verificar no Firestore que `status=rejeitada` e `rejeitadoEm` preenchido

6. **Teste de Cancelar Solicitação (Médico):**
   - Criar nova solicitação pendente
   - No `/metaadmin`, na lista de solicitações do paciente, clicar em "Cancelar"
   - Verificar toast de sucesso
   - Verificar no Firestore que `status=cancelada` e `canceladoEm` preenchido

7. **Teste de Validação de Duplicidade:**
   - Tentar compartilhar o mesmo paciente com o mesmo nutricionista novamente
   - Verificar que aparece erro "Já existe uma solicitação pendente" ou "Este paciente já está compartilhado"

8. **Teste de Vínculos Ativos (Beta):**
   - Após aceitar uma solicitação, verificar que aparece seção "Vínculos Ativos (Beta)"
   - Verificar que lista o paciente aceito (mostra ID e data)

9. **Teste de Gate:**
   - Tentar acessar `/metanutri` com nutricionista não verificado
   - Verificar que não aparece seção de solicitações
   - Tentar com nutricionista verificado mas sem vínculo médico
   - Verificar que não aparece seção de solicitações

🐛 **Pendências / Problemas conhecidos**

- A seção "Vínculos Ativos (Beta)" mostra apenas IDs de pacientes. Na ETAPA 5 será implementada lista completa com dados do paciente.

🔁 **Correções feitas nesta etapa**

Nenhuma nesta etapa.

---

### ETAPA 5 — Lista completa de pacientes no /metanutri + Visualização read-only

✅ **Status:** Concluída

✅ **O que foi feito**

- Criado service `PacienteNutricionistaService` para gerenciar relacionamentos e listar pacientes visíveis:
  - `listActiveVinculosByNutri()` - lista vínculos ativos do nutricionista
  - `listPacientesVisiveisByNutri()` - lista pacientes com dados completos (carrega pacientes e médicos em lote para performance)
  - `hasAccessToPaciente()` - verifica se nutricionista tem acesso a um paciente específico
  - `getPacienteResumo()` - busca resumo de um paciente
- Substituído placeholder "Vínculos Ativos (Beta)" por lista completa de pacientes em `/metanutri`:
  - Tabela com colunas: Paciente (nome), Médico Responsável, Data Compartilhamento, Status, Ação
  - Barra de busca por nome (filtra no frontend)
  - Botão "Atualizar lista" para refresh manual
  - Empty state quando não há pacientes
  - Skeleton/loading durante carregamento
- Implementado modal de visualização read-only do paciente:
  - Alerta fixo no topo: "Somente visualização — alterações apenas pelo médico responsável"
  - Seção "Dados de Identificação" (read-only): Nome, Email, Telefone, CPF, Data de Nascimento, Sexo
  - Seção "Dados Clínicos" (read-only): Diagnóstico Principal, Status do Tratamento
  - Seção "Medidas Iniciais" (read-only): Peso, Altura, Circunferência Abdominal (quando disponível)
  - Todos os inputs desabilitados e sem botões de salvar/editar
  - Validação de acesso antes de abrir (verifica vínculo ativo)
- Integração com solicitações:
  - Após aceitar solicitação, lista de pacientes é atualizada automaticamente
  - Botão de refresh manual disponível
- Performance:
  - Carregamento em lote de pacientes e médicos (Promise.all)
  - Cache em estado React
  - Evita múltiplas queries desnecessárias

🧩 **Arquivos alterados/criados**

- `services/pacienteNutricionistaService.ts` (criado) - Service para gerenciar relacionamentos e listar pacientes visíveis
- `app/metanutri/page.tsx` (alterado) - Substituída seção placeholder por lista completa e adicionado modal read-only

🧪 **Como testar**

1. **Preparação:**
   - Ter um nutricionista verificado e vinculado a um médico
   - Ter um médico que compartilhou um paciente com o nutricionista
   - O nutricionista deve ter aceitado a solicitação de compartilhamento

2. **Teste de Lista de Pacientes:**
   - Fazer login como nutricionista em `/metanutri`
   - Verificar que aparece seção "Meus Pacientes"
   - Verificar que lista mostra:
     - Nome do paciente (não ID)
     - Nome do médico responsável
     - Data de compartilhamento
     - Status (Ativo)
     - Botão "Visualizar"

3. **Teste de Busca:**
   - Na barra de busca, digitar parte do nome de um paciente
   - Verificar que a lista filtra e mostra apenas pacientes que correspondem
   - Limpar busca e verificar que todos os pacientes aparecem novamente

4. **Teste de Visualização Read-Only:**
   - Clicar em "Visualizar" em um paciente
   - Verificar que modal abre com alerta amarelo no topo
   - Verificar que todas as seções estão presentes:
     - Dados de Identificação (read-only)
     - Dados Clínicos (read-only)
     - Medidas Iniciais (read-only, se disponível)
   - Verificar que todos os campos estão desabilitados (bg-gray-100 ou similar)
   - Verificar que NÃO existe botão de "Salvar" ou "Editar"
   - Fechar modal e verificar que funciona

5. **Teste de Atualização Automática:**
   - Como médico, compartilhar um novo paciente com o nutricionista
   - Como nutricionista, aceitar a solicitação
   - Verificar que o paciente aparece automaticamente na lista "Meus Pacientes"
   - (Ou usar botão "Atualizar lista" se necessário)

6. **Teste de Validação de Acesso:**
   - Tentar abrir um paciente que não está compartilhado (se possível via manipulação de estado)
   - Verificar que aparece mensagem "Acesso negado"

7. **Teste de Empty State:**
   - Se não houver pacientes compartilhados, verificar que aparece:
     - Ícone de usuário
     - Mensagem "Nenhum paciente compartilhado ainda."

8. **Teste de Performance:**
   - Com múltiplos pacientes compartilhados, verificar que carregamento é rápido
   - Verificar skeleton/loading durante carregamento

🐛 **Pendências / Problemas conhecidos**

- O modal de visualização mostra apenas as informações principais (Dados de Identificação, Dados Clínicos, Medidas Iniciais). As outras pastas (Nutrologia, Exames Laboratoriais, Plano Terapêutico, Evolução/Seguimento, etc.) podem ser adicionadas em etapas futuras se necessário.
- A busca é feita apenas no frontend. Para muitos pacientes, pode ser necessário implementar busca no backend.

🔁 **Correções feitas nesta etapa**

Nenhuma nesta etapa.

---

### ETAPA 6 — Status e histórico de compartilhamento dentro do paciente + encerrar compartilhamento

✅ **Status:** Concluída

✅ **O que foi feito**

- Adicionados métodos no `SolicitacaoNutricionistaService`:
  - `endCompartilhamento()` - encerra compartilhamento marcando vínculo como inativo
  - `getCompartilhamentoStatus()` - retorna status completo (solicitações + vínculos ativos/inativos)
- Melhorada seção "Compartilhar com Nutricionista" no `/metaadmin` (dentro do paciente):
  - Exibe "Compartilhamentos Ativos" com:
    - Nome do nutricionista
    - Status (Ativo)
    - Data de compartilhamento
    - Data de aceite (se disponível)
    - Botão "Encerrar Compartilhamento"
  - Exibe "Solicitações Pendentes" separadamente
  - Exibe "Histórico" (rejeitadas/canceladas)
  - Empty state quando não há compartilhamentos
  - Aviso quando já existe vínculo ativo (evita duplicidade)
- Adicionada seção "Compartilhamento" no modal read-only do `/metanutri`:
  - Mostra "Compartilhado por" (nome do médico)
  - Mostra "Status" (Ativo)
  - Mostra "Compartilhado em" (data)
  - Aviso quando compartilhamento foi encerrado
- Melhorada inbox de solicitações pendentes no `/metanutri`:
  - Cada solicitação mostra:
    - Nome completo do paciente
    - Nome do médico
    - Diagnóstico principal (se disponível)
    - Data da solicitação
- Integração completa:
  - Ao encerrar compartilhamento, paciente desaparece da lista do nutricionista
  - Status é atualizado em tempo real
  - Permite criar nova solicitação após encerrar compartilhamento anterior

🧩 **Arquivos alterados/criados**

- `services/solicitacaoNutricionistaService.ts` (alterado) - Adicionados métodos endCompartilhamento e getCompartilhamentoStatus
- `app/metaadmin/page.tsx` (alterado) - Melhorada seção de compartilhamento com status completo e encerrar
- `app/metanutri/page.tsx` (alterado) - Adicionada seção de compartilhamento no modal e melhorada inbox

🧪 **Como testar**

1. **Preparação:**
   - Ter um médico que compartilhou um paciente com nutricionista
   - Nutricionista deve ter aceitado a solicitação

2. **Teste de Status no Médico:**
   - Fazer login como médico em `/metaadmin`
   - Abrir paciente compartilhado (editar)
   - Ir para Pasta 1
   - Verificar seção "Compartilhar com Nutricionista"
   - Verificar que aparece "Compartilhamentos Ativos" com:
     - Nome do nutricionista
     - Status "Ativo"
     - Datas (compartilhado em, aceito em)
     - Botão "Encerrar Compartilhamento"

3. **Teste de Encerrar Compartilhamento:**
   - No card de compartilhamento ativo, clicar em "Encerrar Compartilhamento"
   - Confirmar ação
   - Verificar toast de sucesso
   - Verificar que card desaparece ou muda para histórico
   - Verificar no Firestore que `paciente_nutricionista` tem `status='inativo'` e `removidoEm` preenchido

4. **Teste de Paciente Sumir da Lista do Nutri:**
   - Como nutricionista, acessar `/metanutri`
   - Verificar que paciente encerrado não aparece mais em "Meus Pacientes"
   - (Ou atualizar lista se necessário)

5. **Teste de Nova Solicitação Após Encerrar:**
   - Como médico, tentar compartilhar o mesmo paciente novamente
   - Verificar que permite criar nova solicitação
   - Verificar que aparece como "Pendente"

6. **Teste de Status no Nutricionista:**
   - Como nutricionista, abrir um paciente compartilhado (visualizar)
   - Verificar seção "Compartilhamento" no modal
   - Verificar que mostra:
     - Compartilhado por: [Nome do médico]
     - Status: Ativo
     - Compartilhado em: [Data]

7. **Teste de Compartilhamento Encerrado (Nutri):**
   - Após médico encerrar compartilhamento
   - Como nutricionista, tentar abrir paciente (se ainda estiver na lista temporariamente)
   - Verificar que aparece aviso "Compartilhamento encerrado pelo médico"

8. **Teste de Inbox Melhorada:**
   - Como nutricionista, verificar seção "Solicitações Pendentes de Pacientes"
   - Verificar que cada solicitação mostra:
     - Nome completo do paciente
     - Nome do médico
     - Diagnóstico (se disponível)
     - Data da solicitação

9. **Teste de Histórico:**
   - Como médico, verificar seção "Histórico" na área de compartilhamento
   - Verificar que mostra solicitações rejeitadas/canceladas

🐛 **Pendências / Problemas conhecidos**

- O diagnóstico principal na inbox de solicitações só aparece se o paciente já estiver carregado em `pacientesVisiveis`. Para novos pacientes, pode não aparecer até que sejam aceitos.

🔁 **Correções feitas nesta etapa**

- Corrigido erro de sintaxe no `app/metanutri/page.tsx`: removido `</div>` extra e ajustado fechamento do map na seção de solicitações pendentes (linha 868-870). O erro causava falha no build com "Unterminated regexp literal".

---

### ETAPA 7 — Link de indicação do Nutricionista (referral) com médico escolhido

✅ **O que foi feito**

- Criada seção "Link de Indicação" no `/metanutri` para nutricionistas gerarem links de encaminhamento
- Implementada rota pública `/ref/nutri/[nutricionistaId]` que exibe página de referral com informações do nutricionista e médico recomendado
- Adicionada lógica de detecção e processamento de referral no `/meta` quando paciente acessa via link
- Implementado salvamento de referral no perfil do paciente no Firestore
- Adicionado banner destacando médico recomendado na seção de médicos do `/meta`
- Implementado destaque visual do médico recomendado na lista de médicos (badge "Recomendado")
- Pré-selecionado médico recomendado quando paciente vem de link de referral

🧩 **Arquivos alterados/criados**

- `app/metanutri/page.tsx` - Adicionada seção "Link de Indicação" com dropdown de médicos vinculados, geração de link e botões de copiar/abrir
- `app/ref/nutri/[nutricionistaId]/page.tsx` - Criada página pública de referral com validações e login Google
- `app/meta/page.tsx` - Adicionada lógica de processamento de referral, banner de médico recomendado e destaque visual na lista

🧪 **Como testar**

1. **Gerar link de indicação:**
   - Fazer login como nutricionista verificado e vinculado a pelo menos 1 médico em `/metanutri`
   - Ir na seção "Link de Indicação"
   - Selecionar um médico vinculado no dropdown
   - Clicar em "Gerar Link"
   - Copiar o link gerado

2. **Testar página pública de referral:**
   - Abrir o link em aba anônima/incógnito
   - Verificar que mostra nome do nutricionista e médico recomendado
   - Verificar mensagem sobre acompanhamento médico obrigatório
   - Clicar em "Entrar com Google para iniciar"

3. **Testar processamento de referral:**
   - Após login como paciente, verificar redirecionamento para `/meta?ref=nutri&nutriId=...&medicoId=...`
   - Verificar banner "Médico Recomendado por [Nutricionista]" na seção de médicos
   - Verificar que o médico recomendado aparece com badge "Recomendado" na lista
   - Verificar no Firestore que o campo `referral` foi salvo no documento do paciente em `pacientes_completos`
   - Verificar que o campo `medicoRecomendadoId` foi salvo

4. **Testar validações:**
   - Tentar acessar link com nutricionista não verificado → deve mostrar erro
   - Tentar acessar link com médico não vinculado ao nutri → deve mostrar erro
   - Tentar acessar link com médico inativo → deve mostrar erro

🐛 **Pendências / Problemas conhecidos**

- O link de referral não expira automaticamente (pode ser implementado em etapa futura)
- Não há limite de uso do mesmo link (pode ser implementado em etapa futura)
- O banner de referral só aparece na primeira vez que o paciente acessa via link (após salvar, não aparece mais)

🔁 **Correções feitas nesta etapa**

- Corrigido erro de sintaxe no `app/metanutri/page.tsx`: a seção "Link de Indicação" estava sendo adicionada fora do bloco condicional. Movida para dentro do bloco `{nutricionista.isVerificado && nutricionista.medicoVinculadoIds.length > 0 && (`, antes do fechamento. Removida verificação redundante `medicoVinculadoIds.length === 0` que estava dentro do bloco onde já se garante que `length > 0`.
- Corrigido erro de sintaxe adicional: removido `)}` extra na linha 1130 que estava causando erro de compilação "Unexpected token".

---

### ETAPA 8 — Security Rules + Auditoria (hardening final)

✅ **O que foi feito**

- Atualizadas Firestore Security Rules para suportar nutricionistas read-only com segurança
- Implementado padrão de ID determinístico para `paciente_nutricionista`: `${pacienteId}_${nutricionistaId}` (sem medicoId) para permitir validação nas rules
- Criado service de logs de auditoria (`AuditLogService`) com tipos de eventos
- Adicionados logs de auditoria em todas as ações principais:
  - Solicitação de vínculo nutri ↔ médico
  - Aceite/rejeição de vínculo
  - Compartilhamento de paciente
  - Aceite/rejeição de compartilhamento
  - Encerramento de compartilhamento
- Implementadas regras de segurança por collection:
  - `nutricionistas`: nutri pode atualizar apenas perfil (não pode setar isVerificado, medicoVinculadoIds, status)
  - `solicitacoes_vinculo_nutri_medico`: nutri cria, médico aprova/rejeita
  - `solicitacoes_nutricionista`: médico cria, nutri aceita/rejeita (com validação de vínculo)
  - `paciente_nutricionista`: nutri cria ao aceitar, médico pode encerrar
  - `pacientes_completos`: nutri pode ler apenas se houver vínculo ativo (validação por ID determinístico)
  - `logs`: apenas admin pode ler, nutri/médico podem criar logs do próprio ato

🧩 **Arquivos alterados/criados**

- `firestore.rules` - Adicionadas regras completas para nutricionistas e collections relacionadas
- `services/auditLogService.ts` - Criado service de logs de auditoria (novo arquivo)
- `services/solicitacaoVinculoNutriMedicoService.ts` - Adicionados logs de auditoria
- `services/solicitacaoNutricionistaService.ts` - Atualizado padrão de ID e adicionados logs de auditoria
- `services/pacienteNutricionistaService.ts` - Mantido compatível com novo padrão de ID

🧪 **Como testar**

1. **Testar regras de acesso do nutricionista:**
   - Como nutricionista, tentar abrir paciente não compartilhado → acesso negado (Firestore error)
   - Como nutricionista, abrir paciente compartilhado → OK (deve carregar)
   - Como nutricionista, tentar editar paciente → negado (inputs desabilitados no front, mas rules também bloqueiam)

2. **Testar regras de escrita:**
   - Como nutricionista, tentar atualizar `isVerificado` no próprio perfil → negado
   - Como nutricionista, tentar atualizar `medicoVinculadoIds` → negado
   - Como nutricionista, atualizar `registroNumero` e `cidades` → OK

3. **Testar encerramento de compartilhamento:**
   - Como médico, encerrar compartilhamento de paciente
   - Como nutricionista, tentar abrir paciente → acesso negado (vínculo inativo)

4. **Testar logs de auditoria:**
   - Realizar ações (solicitar vínculo, compartilhar paciente, etc.)
   - Como admin, verificar collection `logs` no Firestore
   - Verificar que logs foram criados com tipo, IDs e timestamp corretos

5. **Testar validações de vínculo:**
   - Como nutricionista, tentar aceitar compartilhamento de médico não vinculado → negado (validação no service + rules)

🐛 **Pendências / Problemas conhecidos**

- As regras do Firestore precisam ser publicadas no Firebase Console manualmente (não há deploy automático)
- Migração de vínculos antigos: o código tenta ler formato antigo, mas novos vínculos sempre usam formato novo
- Validação de vínculo nas rules para `solicitacoes_nutricionista` requer leitura do doc do nutri (pode ter impacto de performance, mas aceitável)
- Logs de auditoria não têm interface de visualização (apenas no Firestore Console)

🔁 **Correções feitas nesta etapa**

Nenhuma nesta etapa.

---

### ETAPA 9 — Página "Nutricionistas" no /metaadmin (gestão completa)

✅ **O que foi feito**

- Reestruturada a página "Encaminhados" para se tornar "Nutricionistas" no menu principal
- Movida a página antiga "Encaminhados" para o Menu do médico (dropdown)
- Criada nova página "Nutricionistas" com 3 blocos principais:
  - **Bloco 1 — Solicitações de vínculo pendentes**: Lista solicitações de vínculo de nutricionistas, permite aceitar/rejeitar
  - **Bloco 2 — Nutricionistas vinculados**: Mostra nutricionistas já vinculados ao médico com contador de pacientes em comum
  - **Bloco 3 — Pacientes em comum (modal)**: Modal que mostra pacientes compartilhados com um nutricionista específico, permite encerrar compartilhamento e abrir paciente
- Adicionados helpers no `PacienteNutricionistaService`:
  - `listVinculosByMedicoENutri`: Lista vínculos ativos entre médico e nutricionista
  - `countPacientesPorNutricionista`: Conta pacientes em comum
- Adicionado método no `NutricionistaService`:
  - `getNutricionistasVinculadosAoMedico`: Lista nutricionistas vinculados a um médico específico
- Implementada lógica de carregamento automático quando médico entra na página
- Implementadas ações: aceitar/rejeitar vínculo, ver pacientes, encerrar compartilhamento, abrir paciente

🧩 **Arquivos alterados/criados**

- `app/metaadmin/page.tsx` - Substituído item de navegação, criada nova página Nutricionistas, movida página Encaminhados para menu do médico
- `services/pacienteNutricionistaService.ts` - Adicionados helpers `listVinculosByMedicoENutri` e `countPacientesPorNutricionista`
- `services/nutricionistaService.ts` - Adicionado método `getNutricionistasVinculadosAoMedico`

🧪 **Como testar**

1. **Testar navegação:**
   - Acessar `/metaadmin` como médico
   - Verificar que existe item "Nutricionistas" no menu lateral (substituiu "Encaminhados")
   - Clicar em "Nutricionistas" → deve abrir a nova página
   - Clicar no menu do médico (dropdown) → verificar que existe "Encaminhados" no menu
   - Clicar em "Encaminhados" → deve abrir a página antiga de encaminhamentos

2. **Testar solicitações de vínculo:**
   - Como nutricionista, solicitar vínculo com médico
   - Como médico, acessar "Nutricionistas"
   - Verificar que solicitação aparece no Bloco 1
   - Clicar em "Aceitar" → verificar que vínculo é aceito e nutricionista aparece no Bloco 2
   - Testar "Rejeitar" também

3. **Testar nutricionistas vinculados:**
   - Após aceitar vínculo, verificar que nutricionista aparece no Bloco 2
   - Verificar contador de pacientes (deve ser 0 inicialmente)
   - Compartilhar paciente com nutricionista (via modal do paciente)
   - Verificar que contador aumenta

4. **Testar pacientes em comum:**
   - Clicar em "Ver Pacientes" em um nutricionista vinculado
   - Verificar que modal abre mostrando pacientes compartilhados
   - Testar "Abrir Paciente" → deve abrir modal do paciente
   - Testar "Encerrar" → deve encerrar compartilhamento e atualizar lista

5. **Testar atualização em tempo real:**
   - Aceitar vínculo → verificar que lista atualiza automaticamente
   - Compartilhar paciente → verificar que contador atualiza
   - Encerrar compartilhamento → verificar que paciente some da lista

🐛 **Pendências / Problemas conhecidos**

- Nenhuma pendência conhecida

🔁 **Correções feitas nesta etapa**

- Corrigido carregamento de dados completos do nutricionista nas solicitações de vínculo (busca dados adicionais do doc do nutricionista)
- Ajustado layout responsivo para cards de nutricionistas vinculados
- Adicionado botão "Encaminhados" no menu mobile inferior do `/metaadmin`
- Corrigido erro de método não encontrado: `getNutricionistasVinculadosAoMedico` adicionado ao `NutricionistaService`
- Removido `orderBy` da query de solicitações de vínculo para evitar necessidade de índice composto (ordenação feita client-side)

---

**⚠️ IMPORTANTE: Deploy das Regras**

As regras do Firestore precisam ser publicadas no Firebase Console:

1. Acesse: https://console.firebase.google.com
2. Selecione o projeto: **oftware-9201e**
3. No menu lateral, clique em **Firestore Database**
4. Clique na aba **Rules**
5. **COLE** o conteúdo completo do arquivo `firestore.rules`
6. Clique em **Publish**
7. Aguarde confirmação "Rules published successfully"

**OU via Firebase CLI:**
```bash
firebase deploy --only firestore:rules
```
