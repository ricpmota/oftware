# Comparação: Cards de Pacientes Mobile - /metaadmin vs /metanutri

## Objetivo

Este documento compara a implementação dos cards de pacientes na versão mobile entre `/metaadmin` e `/metanutri` para identificar diferenças e padronizar conforme a versão mais recente do `/metaadmin`.

---

## Diferenças Identificadas

### 1. ❌ **Barra de Progresso de Aplicações** - CRÍTICO

#### `/metaadmin` (Versão Atualizada) ✅
- **Localização:** Topo do card (primeiro elemento visual)
- **Estrutura:** 
  ```tsx
  <div className="w-full rounded-t-lg relative overflow-hidden bg-gray-100">
    {/* Barra de progresso (1.5px de espessura) */}
    <div className="absolute left-0 top-0 ..." style={{ height: '1.5px' }} />
    {/* Texto centralizado */}
    <div className="relative z-10 py-0.5 text-center text-xs font-semibold text-gray-700">
      {semanasAplicadas} de {totalSemanas}
    </div>
  </div>
  ```
- **Características:**
  - Barra fina de 1.5px
  - Texto "X de Y" centralizado na mesma linha
  - Cores dinâmicas (verde ≥100%, azul ≥50%, âmbar <50%)
  - Visível sempre que houver `totalSemanas > 0`

#### `/metanutri` (Versão Antiga) ❌
- **Localização:** Dentro do conteúdo do card, abaixo do cabeçalho
- **Estrutura:**
  ```tsx
  <div className="mb-3">
    {totalSemanas > 0 ? (
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1">
          <div className="text-sm font-medium text-gray-900">
            {semanasAplicadas} de {totalSemanas} sem
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            {/* Barra de progresso h-2 */}
          </div>
        </div>
        {/* Botões ao lado */}
      </div>
    ) : (
      {/* Botões sem barra */}
    )}
  </div>
  ```
- **Características:**
  - Barra maior (h-2 = 8px)
  - Texto acima da barra (não na mesma linha)
  - Texto maior (`text-sm` vs `text-xs`)
  - Botões posicionados ao lado da barra
  - Layout diferente quando não há semanas

**Ação Necessária:** Mover barra para o topo do card e ajustar estilo conforme `/metaadmin`.

---

### 2. ❌ **Posicionamento dos Botões de Ação** - CRÍTICO

#### `/metaadmin` (Versão Atualizada) ✅
- **Layout:** Centralizado
- **Estrutura:**
  ```tsx
  <div className="mb-3">
    <div className="flex items-center justify-center gap-1 flex-wrap">
      {/* Todos os botões centralizados */}
    </div>
  </div>
  ```
- **Características:**
  - `justify-center` - botões centralizados
  - `gap-1` - espaçamento mínimo
  - `flex-wrap` - quebra de linha se necessário
  - Sempre visível, independente de ter semanas ou não

#### `/metanutri` (Versão Antiga) ❌
- **Layout:** Alinhado à direita ou ao lado da barra
- **Estrutura:**
  ```tsx
  {totalSemanas > 0 ? (
    <div className="flex items-center gap-2">
      <div className="flex-1 space-y-1">
        {/* Barra de progresso */}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Botões ao lado da barra */}
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-end gap-1">
      {/* Botões alinhados à direita */}
    </div>
  )}
  ```
- **Características:**
  - Botões ao lado da barra quando há semanas
  - Botões alinhados à direita quando não há semanas
  - Layout inconsistente

**Ação Necessária:** Centralizar botões e separá-los da barra de progresso.

---

### 3. ❌ **Ícone Personal Trainer (Rosa)** - FALTANDO

#### `/metaadmin` (Versão Atualizada) ✅
- **Botão presente:**
  ```tsx
  <button
    onClick={async () => {
      setPacientePersonalSelecionado(paciente);
      setShowModalPersonal(true);
      // ...
    }}
    className={`p-2 rounded-md transition-colors ${
      temPersonal
        ? 'bg-pink-50 text-pink-700 hover:bg-pink-100'
        : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
    }`}
    title="Personal Trainer"
  >
    <Dumbbell size={18} />
  </button>
  ```
- **Características:**
  - Ícone: `Dumbbell` (lucide-react)
  - Cor rosa quando há treinos (`bg-pink-50 text-pink-700`)
  - Cor cinza quando não há treinos
  - Abre modal com calendário de treinos

#### `/metanutri` (Versão Antiga) ❌
- **Botão ausente** - não existe

**Ação Necessária:** Adicionar botão Personal Trainer (se aplicável ao contexto de nutricionista) ou remover se não for necessário.

---

### 4. ⚠️ **Badge de Mensagens Não Lidas** - FALTANDO

#### `/metaadmin` (Versão Atualizada) ✅
- **Badge presente:**
  ```tsx
  {mensagensNaoLidasPorPaciente[paciente.id] > 0 && (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
      <MessageSquare size={10} className="mr-1" />
      {mensagensNaoLidasPorPaciente[paciente.id]}
    </span>
  )}
  ```
- **Características:**
  - Aparece ao lado do nome
  - Mostra quantidade de mensagens não lidas
  - Cor vermelha para destaque

#### `/metanutri` (Versão Antiga) ❌
- **Badge ausente** - não existe

**Ação Necessária:** Adicionar badge se nutricionistas precisam ver mensagens não lidas.

---

### 5. ⚠️ **Botão Prescrições** - FALTANDO

#### `/metaadmin` (Versão Atualizada) ✅
- **Botão presente:**
  ```tsx
  <button
    onClick={async () => {
      setPacientePrescricoesSelecionado(paciente);
      setShowModalPrescricoes(true);
      // ...
    }}
    className="p-2 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
    title="Prescrições"
  >
    <ClipboardList size={18} />
  </button>
  ```
- **Características:**
  - Ícone: `ClipboardList` (lucide-react)
  - Cor roxa (`bg-purple-50 text-purple-700`)
  - Sempre ativo (não depende de dados)

#### `/metanutri` (Versão Antiga) ❌
- **Botão ausente** - não existe

**Ação Necessária:** Adicionar botão de prescrições se nutricionistas precisam acessar prescrições.

---

### 6. ⚠️ **Badge de Status de Pagamento** - DIFERENTE

#### `/metaadmin` (Versão Atualizada) ✅
- **Badge clicável:**
  ```tsx
  <button
    onClick={() => {
      setPacientePagamentoSelecionado(paciente);
      setShowModalPagamento(true);
    }}
    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
      pagamento?.statusPagamento === 'pago'
        ? 'bg-green-100 text-green-800'
        : // ... outras cores
    }`}
  >
    {/* Texto do status */}
  </button>
  ```
- **Características:**
  - É um botão (clicável)
  - Abre modal de pagamento

#### `/metanutri` (Versão Antiga) ⚠️
- **Badge presente mas com implementação diferente:**
  ```tsx
  <span 
    onClick={() => {/* abre modal */}}
    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity ${
      // ... cores
    }`}
    title="Clique para gerenciar pagamento"
  >
    {/* Texto do status */}
  </span>
  ```
- **Características:**
  - É um `<span>` com `onClick` (menos semântico)
  - Funcionalidade similar, mas implementação diferente

**Ação Necessária:** Padronizar para usar `<button>` ao invés de `<span>` com `onClick`.

---

### 7. ✅ **Estrutura do Cabeçalho** - SIMILAR

Ambas as versões têm:
- Avatar IMC com emoji e borda colorida
- Nome do paciente
- Badges de status (tratamento, pagamento, perda de peso)
- Botão de expandir/recolher

**Status:** OK, manter estrutura similar.

---

### 8. ✅ **Cálculos (IMC, Perda de Peso, Semanas)** - IDÊNTICOS

Ambas as versões usam a mesma lógica:
- Cálculo de IMC
- Cálculo de perda de peso (baseline vs último peso)
- Cálculo de semanas aplicadas (mesma lógica de filtro)

**Status:** OK, manter cálculos idênticos.

---

### 9. ✅ **Borda Gradiente Quando Selecionado** - SIMILAR

Ambas as versões têm:
- Borda gradiente roxa→laranja quando expandido
- Mesma estrutura de classes

**Status:** OK, manter.

---

### 10. ⚠️ **Ordem dos Botões** - DIFERENTE

#### `/metaadmin` (Versão Atualizada) ✅
Ordem dos botões:
1. Editar (laranja)
2. Aplicações (azul)
3. Exames (verde)
4. Prescrições (roxo)
5. Nutrição (amarelo)
6. Personal Trainer (rosa) ⭐
7. Excluir (vermelho)

#### `/metanutri` (Versão Antiga) ❌
Ordem dos botões:
1. Editar (laranja)
2. Aplicações (azul)
3. Exames (verde)
4. Nutrição (amarelo)
5. Excluir (vermelho)

**Diferenças:**
- Falta: Prescrições
- Falta: Personal Trainer
- Ordem diferente (Nutrição antes de Excluir)

**Ação Necessária:** Padronizar ordem conforme `/metaadmin` (se aplicável ao contexto).

---

## Resumo das Ações Necessárias

### 🔴 **CRÍTICO - Deve ser implementado:**

1. **Mover barra de progresso para o topo do card**
   - Criar seção no topo (antes do conteúdo)
   - Barra fina de 1.5px
   - Texto "X de Y" centralizado na mesma linha
   - Cores dinâmicas

2. **Centralizar botões de ação**
   - Usar `justify-center`
   - Separar da barra de progresso
   - Layout consistente sempre

### 🟡 **IMPORTANTE - Avaliar necessidade:**

3. **Adicionar botão Personal Trainer**
   - Se nutricionistas precisam ver treinos dos pacientes
   - Implementar modal com calendário
   - Verificar se há serviço/disponibilidade

4. **Adicionar badge de mensagens não lidas**
   - Se nutricionistas precisam ver mensagens
   - Implementar estado e carregamento

5. **Adicionar botão Prescrições**
   - Se nutricionistas precisam acessar prescrições
   - Implementar modal de prescrições

### 🟢 **MELHORIAS - Padronizar:**

6. **Padronizar badge de pagamento**
   - Usar `<button>` ao invés de `<span>` com `onClick`
   - Manter funcionalidade

7. **Padronizar ordem dos botões**
   - Seguir ordem do `/metaadmin` (se aplicável)

---

## Estrutura Esperada (Padronizada)

```tsx
<div className="lg:hidden space-y-3">
  {pacientes.map((paciente) => {
    return (
      <div key={paciente.id} className={/* borda condicional */}>
        {/* 1. BARRA DE PROGRESSO NO TOPO */}
        <div className="w-full rounded-t-lg relative overflow-hidden bg-gray-100">
          <div className={/* barra 1.5px */} />
          <div className="text-center text-xs font-semibold">
            {semanasAplicadas} de {totalSemanas}
          </div>
        </div>
        
        {/* 2. CONTEÚDO DO CARD */}
        <div className="p-4 pt-3">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-3">
            {/* Avatar IMC + Nome + Badge mensagens */}
            {/* Badges de status */}
            {/* Botão expandir */}
          </div>
          
          {/* 3. BOTÕES CENTRALIZADOS */}
          <div className="mb-3">
            <div className="flex items-center justify-center gap-1 flex-wrap">
              {/* Editar */}
              {/* Aplicações */}
              {/* Exames */}
              {/* Prescrições (se aplicável) */}
              {/* Nutrição */}
              {/* Personal Trainer (se aplicável) */}
              {/* Excluir */}
            </div>
          </div>
          
          {/* Detalhes expandidos */}
        </div>
      </div>
    );
  })}
</div>
```

---

## Checklist de Implementação

### Fase 1: Estrutura Base
- [ ] Mover barra de progresso para o topo do card
- [ ] Ajustar estilo da barra (1.5px, texto centralizado)
- [ ] Separar botões da barra de progresso
- [ ] Centralizar botões com `justify-center`

### Fase 2: Funcionalidades
- [ ] Avaliar necessidade do botão Personal Trainer
- [ ] Avaliar necessidade do badge de mensagens
- [ ] Avaliar necessidade do botão Prescrições
- [ ] Implementar funcionalidades aprovadas

### Fase 3: Padronização
- [ ] Padronizar badge de pagamento (usar `<button>`)
- [ ] Padronizar ordem dos botões
- [ ] Testar responsividade
- [ ] Validar cálculos e dados

---

## Notas de Contexto

### Diferenças de Permissões

**`/metaadmin` (Médico):**
- Pode editar pacientes
- Pode excluir pacientes
- Pode ver prescrições
- Pode ver treinos (Personal Trainer)
- Gerencia pagamentos

**`/metanutri` (Nutricionista):**
- Pode visualizar pacientes (read-only)
- Pode cancelar compartilhamento (não excluir)
- Pode ver nutrição
- Gerencia pagamentos (entre paciente e nutri)

**Considerações:**
- Algumas funcionalidades podem não ser aplicáveis ao contexto de nutricionista
- Avaliar cada funcionalidade antes de implementar
- Manter consistência visual mesmo com funcionalidades diferentes

---

## Conclusão

O card do `/metanutri` precisa ser atualizado para seguir o padrão do `/metaadmin`, especialmente:

1. **Barra de progresso no topo** (mudança visual significativa)
2. **Botões centralizados** (melhor UX)
3. **Avaliar funcionalidades adicionais** (Personal Trainer, Prescrições, Mensagens)

A padronização melhorará a consistência visual e a experiência do usuário em todas as páginas do sistema.
