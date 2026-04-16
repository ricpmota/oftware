# Correções no /metapersonal - Versão Mobile 📋

## Objetivo

Corrigir 6 problemas identificados no card mobile do `/metapersonal` para alinhar com as funcionalidades do `/metanutri` e `/metaadmin`.

---

## Problemas Identificados

1. ❌ **Botão Editar** não abre o modal igual ao `/metanutri` mobile
2. ❌ **Botão Aplicações** falta o botão "Gráficos do Paciente" no final
3. ❌ **Botão Exames** não abre o modal correto (igual ao `/metanutri` mobile)
4. ❌ **Botão Prescrições** deve ficar bloqueado (não abrir nada)
5. ❌ **Botão Nutri** abre modal errado - deve ser igual ao `/metaadmin` (só visualização, sem compartilhamento)
6. ❌ **Modal de Treinos** foi feito do zero - deve usar o mesmo componente do `/meta/admin`

---

## ETAPA 1: Corrigir Botão Editar (Modal de Visualização)

### 1.1 Verificar Handler Existente

**Arquivo:** `app/metapersonal/page.v2.tsx`

**Tarefas:**
1. Verificar se `handleVisualizarPaciente` existe e está correto
2. Verificar se `showVisualizarPacienteModal` e `pacienteVisualizando` estão definidos
3. Comparar com implementação do `/metanutri` (linha 1552-1556)

### 1.2 Verificar Modal de Visualização

**Tarefas:**
1. Verificar se o modal `showVisualizarPacienteModal` está implementado
2. Copiar modal completo do `/metanutri` se não existir
3. Garantir que tem as mesmas pastas (abas) do `/metanutri`

**Referência:** 
- Handler: `/metanutri` linhas 1552-1556
- Modal: `/metanutri` linhas 7049+ (modal completo com abas)

---

## ETAPA 2: Adicionar Botão "Gráficos do Paciente" nas Aplicações

### 2.1 Adicionar Estados para Gráficos

**Tarefas:**
1. Adicionar estados:
   ```typescript
   const [showGraficosModal, setShowGraficosModal] = useState(false);
   const [pacienteGraficos, setPacienteGraficos] = useState<PacienteCompleto | null>(null);
   const [graficoAtivo, setGraficoAtivo] = useState<'peso' | 'circunferencia' | 'hba1c' | 'imc'>('peso');
   ```

### 2.2 Adicionar Botão no Final da Lista de Aplicações

**Localização:** Após o fechamento da lista de aplicações, antes do `</div>` que fecha a seção

**Tarefas:**
1. Adicionar botão "Gráficos do Paciente" igual ao `/metanutri` (linhas 5433-5445)
2. Botão deve abrir modal de gráficos

### 2.3 Implementar Modal de Gráficos

**Tarefas:**
1. Copiar modal completo de gráficos do `/metanutri` (linhas 7407-7800+)
2. Adaptar para usar estados do `/metapersonal`

**Referência:** 
- Botão: `/metanutri` linhas 5433-5445
- Modal: `/metanutri` linhas 7407+ (modal completo de gráficos)

---

## ETAPA 3: Corrigir Modal de Exames

### 3.1 Verificar Modal de Exames Atual

**Tarefas:**
1. Verificar se o modal de exames está implementado
2. Comparar com o modal do `/metanutri`
3. Identificar diferenças

### 3.2 Copiar Modal Completo do /metanutri

**Tarefas:**
1. Localizar modal de exames no `/metanutri`
2. Copiar estrutura completa
3. Adaptar estados e handlers para `/metapersonal`

**Referência:** Modal de exames do `/metanutri` (buscar por `showModalExames` - deve estar após linha 8000+)

---

## ETAPA 4: Bloquear Botão Prescrições

### 4.1 Desabilitar Botão Prescrições

**Localização:** Botão Prescrições no card mobile

**Tarefas:**
1. Remover `onClick` do botão Prescrições
2. Adicionar `disabled` e estilo de botão desabilitado
3. Adicionar `cursor-not-allowed` e opacidade reduzida
4. Manter ícone e cor roxa, mas com aparência desabilitada

**Código:**
```tsx
<button
  disabled
  className="p-2 rounded-md bg-purple-50 text-purple-700 opacity-50 cursor-not-allowed"
  title="Prescrições (indisponível para Personal Trainer)"
>
  <ClipboardList size={18} />
</button>
```

### 4.2 Remover Modal de Prescrições (Opcional)

**Tarefas:**
1. Manter código do modal (comentado ou não renderizado)
2. Ou remover completamente se não for necessário

---

## ETAPA 5: Corrigir Modal de Nutrição (Igual ao /metaadmin)

### 5.1 Verificar Modal Atual

**Tarefas:**
1. Verificar modal de nutrição atual no `/metapersonal`
2. Comparar com modal do `/metaadmin`
3. Identificar diferenças principais

### 5.2 Adaptar Modal para Visualização Apenas

**Tarefas:**
1. Remover seção de compartilhamento com nutricionista
2. Manter apenas:
   - Tabs: Plano Nutricional, Check-ins, Estatísticas
   - Conteúdo usando `NutriContent` (já está usando)
3. Garantir que é somente leitura (sem edição)
4. Remover qualquer funcionalidade de compartilhamento

**Referência:** 
- Modal de nutrição do `/metaadmin` linhas 28405-29000+
- **IMPORTANTE:** Remover completamente a seção de compartilhamento (linhas 28432-28580 aproximadamente)
- Manter apenas tabs e conteúdo com `NutriContent`

### 5.3 Verificar Componente NutriContent

**Tarefas:**
1. Verificar se `NutriContent` já está sendo usado corretamente
2. Garantir que não permite edição (só visualização)

---

## ETAPA 6: Usar Componente Compartilhado para Modal de Treinos

### 6.1 Verificar se Existe Componente Compartilhado

**Tarefas:**
1. Buscar se existe componente de modal de treinos no `/meta/admin`
2. Verificar se há componente reutilizável em `components/`
3. Se não existir, verificar se podemos extrair do `/meta/personal`

### 6.2 Criar ou Usar Componente Compartilhado

**Opções:**

**Opção A:** Se já existe componente:
1. Importar componente compartilhado
2. Substituir modal atual pelo componente
3. Passar props necessárias (`pacienteId`, `personalTrainerId`, etc.)

**Opção B:** Se não existe, criar componente:
1. Extrair modal de treinos do `/meta/personal` para componente
2. Criar arquivo `components/ModalTreinosPersonal.tsx`
3. Usar no `/meta/personal` e `/metapersonal`
4. Adaptar para aceitar `personalTrainerId` como prop

**Opção C:** Se não for viável criar componente:
1. Manter código atual, mas documentar que deve ser sincronizado manualmente
2. Adicionar comentário indicando que mudanças devem ser replicadas

### 6.3 Implementar Solução Escolhida

**Tarefas:**
1. Implementar a opção escolhida
2. Testar que funciona em ambos os lugares
3. Garantir que props estão corretas

**Referência:** 
- `/meta/personal` - página completa de treinos (linhas 1000-3000+)
- **Nota:** Não existe componente compartilhado ainda. Opções:
  1. Criar componente `components/ModalTreinosPersonal.tsx` extraindo do `/meta/personal`
  2. Ou manter código atual mas documentar necessidade de sincronização manual

---

## Verificação Inicial (Antes de Começar)

### Verificar o que já existe no /metapersonal

**Tarefas:**
1. Verificar se `handleVisualizarPaciente` existe e como está implementado
2. Verificar se `showVisualizarPacienteModal` e modal estão implementados
3. Verificar se estados de gráficos existem
4. Verificar modal de exames atual
5. Verificar modal de nutrição atual
6. Verificar modal de treinos atual

**Objetivo:** Evitar duplicação e entender o que precisa ser corrigido vs. o que precisa ser criado

---

## Ordem de Implementação Recomendada

1. **ETAPA 1:** Botão Editar (mais simples, corrige problema básico)
2. **ETAPA 2:** Gráficos do Paciente (adiciona funcionalidade faltante)
3. **ETAPA 3:** Modal de Exames (corrige funcionalidade quebrada)
4. **ETAPA 4:** Bloquear Prescrições (mudança simples)
5. **ETAPA 5:** Modal de Nutrição (ajuste importante)
6. **ETAPA 6:** Componente Compartilhado de Treinos (mais complexo, pode requerer refatoração)

---

## Checklist de Verificação

- [ ] Botão Editar abre modal igual ao `/metanutri`
- [ ] Botão "Gráficos do Paciente" aparece no final das aplicações
- [ ] Modal de gráficos funciona corretamente
- [ ] Modal de exames igual ao `/metanutri`
- [ ] Botão Prescrições está desabilitado e não abre nada
- [ ] Modal de Nutrição igual ao `/metaadmin` (só visualização, sem compartilhamento)
- [ ] Modal de Treinos usa componente compartilhado ou está sincronizado
- [ ] Todos os modais funcionam corretamente
- [ ] Sem erros de lint
- [ ] Testes manuais realizados

---

## Notas Importantes

1. **Prescrições:** Personal Trainer não tem permissão para prescrever, apenas visualizar (se necessário)
2. **Nutrição:** Personal Trainer só visualiza, não edita. Nutricionista é quem edita.
3. **Treinos:** Ideal usar componente compartilhado para evitar duplicação de código
4. **Gráficos:** Funcionalidade importante para acompanhamento do paciente

---

## Referências de Código

- **Modal Visualização:** `/metanutri` linhas 1552-1556 (handler) e modal completo
- **Botão Gráficos:** `/metanutri` linhas 5433-5445
- **Modal Gráficos:** `/metanutri` linhas 7407-7800+
- **Modal Exames:** `/metanutri` (buscar por `showModalExames`)
- **Modal Nutrição:** `/metaadmin` linhas 28405+ (sem compartilhamento)
- **Modal Treinos:** `/meta/personal` (página completa) ou componente compartilhado
