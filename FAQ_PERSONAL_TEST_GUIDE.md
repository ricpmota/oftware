# Guia de Teste - Aba Personal no FAQ

## Como Testar a Nova Funcionalidade

### 1. Preparação
- Navegue para: **www.oftware.com.br**
- Certifique-se de que a página carregou completamente

### 2. Abrir o FAQ Chat
1. Localize o **ícone de chat** no canto inferior direito da tela (ícone roxo/laranja com gradiente)
2. Clique no ícone para abrir o chat

### 3. Abrir Modal de Perguntas Frequentes
1. Aguarde a mensagem de boas-vindas aparecer
2. Clique no botão **"Ver opções de perguntas"** (botão branco com borda)

### 4. Verificar Abas
O modal deve mostrar **4 abas** na parte superior:
- ✅ **Paciente** (cor laranja)
- ✅ **Médico** (cor roxa)
- ✅ **Nutricionista** (cor verde)
- ✅ **Personal** (cor amarela) ← **NOVA!**

### 5. Testar Aba Personal
1. Clique na aba **"Personal"**
2. Verifique que aparecem **4 categorias**:
   - 📊 Como funciona a plataforma (ícone Users, cor amarela)
   - 🤝 Vínculos e Relacionamentos (ícone UserPlus, cor azul)
   - 👁️ Pacientes e Acompanhamento (ícone Eye, cor roxa)
   - 🛡️ Segurança e Privacidade (ícone Shield, cor cinza)

### 6. Testar Cada Categoria

#### A) Como funciona a plataforma
1. Clique na categoria
2. Deve aparecer um modal com fundo amarelo no header
3. Verifique que existem **18 perguntas**
4. Clique em algumas perguntas aleatórias e verifique que:
   - A pergunta aparece como mensagem do usuário (balão verde)
   - A resposta aparece como mensagem do bot (balão branco)
   - O texto menciona "Personal Trainer", "CREF", "atividade física", "treinos"

**Exemplos de perguntas esperadas:**
- "Como funciona a plataforma?"
- "A plataforma tem algum custo para personal trainers?"
- "Como me cadastrar na plataforma?"
- "Como me vincular a um médico?"

#### B) Vínculos e Relacionamentos
1. Clique na categoria
2. Deve aparecer um modal com fundo azul no header
3. Verifique que existem **4 perguntas**
4. Clique em perguntas e verifique as respostas

**Exemplos de perguntas esperadas:**
- "Como buscar médicos na plataforma?"
- "Como funciona a aprovação de vínculos?"

#### C) Pacientes e Acompanhamento
1. Clique na categoria
2. Deve aparecer um modal com fundo roxo/rosa no header
3. Verifique que existem **6 perguntas**
4. Clique em perguntas e verifique que mencionam:
   - Check-ins de treinos
   - Score de aderência
   - Exames laboratoriais
   - Gráficos de evolução

**Exemplos de perguntas esperadas:**
- "Como visualizar dados completos de um paciente?"
- "O que são os check-ins diários?"
- "Como interpretar o score de aderência?"

#### D) Segurança e Privacidade
1. Clique na categoria
2. Deve aparecer um modal com fundo cinza no header
3. Verifique que existem **4 perguntas**
4. Clique em perguntas sobre segurança de dados

**Exemplos de perguntas esperadas:**
- "Meus dados estão seguros?"
- "Os dados dos pacientes são confidenciais?"

### 7. Testes de Navegação

#### Voltar ao Menu Principal
1. Dentro de qualquer categoria, clique na **seta para esquerda** (←) no header
2. Deve voltar para a lista de 4 categorias da aba Personal

#### Trocar de Aba
1. Clique no **X** para fechar o modal de categoria
2. Clique novamente em "Ver opções de perguntas"
3. Alterne entre as abas: Paciente → Médico → Nutricionista → Personal
4. Verifique que cada aba mostra suas categorias específicas

#### Fechar e Reabrir
1. Clique no **X** no header do modal principal
2. O modal deve fechar
3. Clique novamente em "Ver opções de perguntas"
4. O modal deve reabrir na última aba visualizada

### 8. Testes Visuais

#### Desktop (Tela Grande)
- Texto das abas deve estar legível
- 4 abas devem caber confortavelmente na largura
- Hover sobre categorias deve mudar a cor de fundo
- Cores devem estar consistentes:
  - Personal: Amarelo/Âmbar
  - Nutricionista: Verde
  - Médico: Roxo
  - Paciente: Laranja

#### Mobile (Tela Pequena)
- Texto das abas deve estar menor mas ainda legível (10px)
- 4 abas devem caber sem scroll horizontal
- Modal deve ocupar quase toda a tela
- Navegação deve funcionar bem com toque

### 9. Verificar Conteúdo Específico

Procure por palavras-chave específicas nas respostas da aba Personal:
- ✅ "Personal Trainer" / "personal trainer"
- ✅ "CREF" (não deve aparecer "CRN")
- ✅ "atividade física" / "treinos" / "exercícios"
- ✅ "plano de atividade física" (não "plano nutricional")
- ❌ NÃO deve mencionar "nutricionista" ou "nutrição"
- ❌ NÃO deve mencionar "CRN" ou "cardápio"

### 10. Testes de Comparação

Compare as perguntas do Personal com as do Nutricionista:
1. Abra a aba Nutricionista
2. Navegue pelas categorias
3. Abra a aba Personal
4. Navegue pelas mesmas categorias
5. Verifique que:
   - Estrutura é similar (mesmas 4 categorias)
   - Quantidade de perguntas é a mesma
   - Conteúdo foi adaptado para foco em atividade física

### Checklist de Validação Final

- [ ] Aba "Personal" aparece no modal
- [ ] Cor amarela está aplicada corretamente
- [ ] 4 categorias aparecem ao clicar na aba
- [ ] Total de 32 perguntas distribuídas nas 4 categorias
- [ ] Navegação funciona (voltar, fechar, trocar aba)
- [ ] Mensagens aparecem no chat corretamente
- [ ] Texto menciona Personal Trainer e atividade física
- [ ] Visual responsivo (desktop e mobile)
- [ ] Hover effects funcionam
- [ ] Sem erros no console do navegador

## Problemas Conhecidos / Limitações

- Nenhum problema conhecido no momento
- Build do Next.js em andamento para validação final

## Reportar Problemas

Se encontrar algum problema:
1. Tire screenshot
2. Anote os passos para reproduzir
3. Verifique o console do navegador (F12)
4. Reporte com detalhes
