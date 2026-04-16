# Implementação da Aba "Personal" no FAQ Chat

## Data: 01/02/2026

## Resumo
Foi adicionada uma nova aba "Personal" (Personal Trainer) no modal de FAQ da página inicial (www.oftware.com.br), seguindo o mesmo padrão da aba "Nutricionista".

## Arquivos Criados

### 1. `components/FAQpersonal.tsx`
Novo componente contendo todas as perguntas frequentes específicas para Personal Trainers, organizado em 4 categorias:

#### Categorias de FAQ:

1. **Como funciona a plataforma** (18 perguntas)
   - Cor: Amarelo/Âmbar (from-yellow-600 to-amber-600)
   - Ícone: Users
   - Conteúdo adaptado do FAQ do Nutricionista, mas focado em atividade física e treinamento

2. **Vínculos e Relacionamentos** (4 perguntas)
   - Cor: Azul/Índigo (from-blue-600 to-indigo-600)
   - Ícone: UserPlus
   - Como buscar médicos, aprovação de vínculos, desfazer vínculos

3. **Pacientes e Acompanhamento** (6 perguntas)
   - Cor: Roxo/Rosa (from-purple-600 to-pink-600)
   - Ícone: Eye
   - Visualização de dados, gráficos de evolução, check-ins diários, score de aderência

4. **Segurança e Privacidade** (4 perguntas)
   - Cor: Cinza/Slate (from-gray-600 to-slate-600)
   - Ícone: Shield
   - Segurança de dados, confidencialidade, recuperação de conta

**Total: 32 perguntas**

## Arquivos Modificados

### 2. `app/page.tsx`
- Adicionado import do `faqCategoriesPersonal`
- Atualizado o componente FAQChat para incluir a prop `faqCategoriesPersonal`

### 3. `components/FAQChat.tsx`
Modificações extensivas para suportar a nova aba Personal:

#### Interface FAQChatProps
- Adicionado: `faqCategoriesPersonal?: FAQCategory[]`

#### Estados e Tipos
- Atualizado tipo do `activeTab`: `'paciente' | 'medico' | 'nutricionista' | 'personal'`

#### Funções Atualizadas
1. **getCategoryItems()**
   - Adicionado suporte para `activeTab === 'personal'`
   - Carrega `faqCategoriesPersonal` quando aba Personal está ativa

2. **getCategoryTitle()**
   - Retorna título correto para categorias da aba Personal

3. **getCategoryIcon()**
   - Retorna ícone correto para categorias da aba Personal

4. **getCategoryColor()**
   - Retorna cores amarelo/âmbar para aba Personal
   - Padrão: `'from-yellow-600 to-amber-600'`

#### UI - Tabs do Modal
- Adicionada 4ª aba "Personal" com:
  - Cor de destaque: Amarelo (text-yellow-600, border-yellow-600)
  - Padding ajustado para 4 abas: `px-2` (antes era `px-3`)
  - Tamanho de fonte ajustado: `text-[10px]` no mobile (antes era `text-xs`)
  - Botão desabilitado se `faqCategoriesPersonal` não estiver disponível

#### UI - Categorias no Modal
- Adicionado suporte para cores de hover amarelo: `hover:bg-yellow-50`
- Adicionado suporte para cor de ícone amarelo: `text-yellow-600`
- Lógica de seleção de cor expandida para incluir Personal

## Estrutura de Perguntas - Personal

### Principais Diferenças do Nutricionista:

1. **Foco em Atividade Física**: Todas as perguntas foram adaptadas para mencionar planos de atividade física, treinos, e exercícios ao invés de planos nutricionais

2. **Registro Profissional**: Usa CREF ao invés de CRN

3. **Check-ins Específicos**: 
   - Treinos realizados (tipo, duração, intensidade)
   - Atividades físicas do dia
   - Sintomas durante exercícios
   - Motivação para treinar

4. **Score de Aderência Diferenciado**:
   - Aderência ao plano de treinos (35%)
   - Realização de atividades físicas (30%)
   - Intensidade e duração dos treinos (20%)
   - Ausência de sintomas limitantes (10%)
   - Motivação e energia (5%)

5. **Calendário**: Inclui sessões de treino agendadas e realizadas

6. **Dados do Paciente**: Acesso a informações específicas de atividade física e evolução física

## Características Mantidas do Nutricionista

- Plataforma 100% gratuita
- Vínculos com médicos
- Acesso somente leitura aos dados dos pacientes
- Compartilhamento de pacientes pelo médico
- Sistema de solicitações e aprovações
- Visualização de exames laboratoriais
- Módulo financeiro
- Estatísticas e KPIs na Home
- Link de referral

## Integração Visual

A aba Personal segue o padrão visual da plataforma:

- **Cor Primária**: Amarelo/Âmbar (consistente com o botão Personal na home)
- **Ícones**: Dumbbell para o botão principal, outros ícones temáticos para categorias
- **Layout**: Mesmo formato de 4 abas horizontais no topo do modal
- **Responsividade**: Texto menor em telas pequenas para acomodar 4 abas

## Como Testar

1. Acesse www.oftware.com.br
2. Clique no ícone de chat FAQ (canto inferior direito)
3. Clique em "Ver opções de perguntas"
4. Verifique que existem 4 abas: Paciente, Médico, Nutricionista, **Personal**
5. Clique na aba "Personal"
6. Verifique as 4 categorias disponíveis
7. Clique em cada categoria e veja as perguntas específicas
8. Teste a funcionalidade de perguntas e respostas

## Notas Técnicas

- Todos os textos foram adaptados do FAQ do Nutricionista
- Manteve-se a mesma estrutura de dados e interface
- Compatível com o sistema de abas existente
- Não quebra funcionalidade existente
- Build do Next.js em andamento para verificar erros de compilação

## Próximos Passos (Opcional)

1. Revisar conteúdo das perguntas com especialista em Personal Training
2. Adicionar perguntas específicas sobre tipos de treino suportados
3. Considerar adicionar imagens/vídeos demonstrativos nos FAQs
4. Coletar feedback de Personal Trainers reais sobre as perguntas
5. Adicionar analytics para monitorar quais perguntas são mais acessadas
