# Unificação Nutricionistas + Personal em "Vínculos" — Versão Mobile

## Objetivo

Unificar as páginas **Nutricionistas** e **Personal** em uma única página chamada **Vínculos** na versão Mobile, mantendo duas abas internas (Nutricionistas e Personal) com os ícones originais. O ícone do menu Vínculos será um ícone de **Link**.

**Escopo:** Apenas na barra de menu inferior (Mobile Bottom Navigation). O sidebar desktop permanece inalterado com Nutricionistas e Personal separados.

---

## Páginas Afetadas

**Apenas metaadmin.** A página metaadmingeral permanece **inalterada**.

| Página | Rota | Escopo |
|--------|------|--------|
| **metaadmin** | `/metaadmin` | Será modificada — painel do médico (admin) |
| **metaadmingeral** | `/metaadmingeral` | **Não modificar** — manter como está |

---

## Estrutura Atual Preservada

### 1. metaadmin (app/metaadmin/page.tsx)

#### Sidebar Desktop (manter como está)
- Home (estatísticas)
- Nutricionistas — ícone `UtensilsCrossed`
- Personal — ícone `Dumbbell`
- Pacientes
- Financeiro
- Calendário

#### Mobile Bottom Navigation (atual)
```tsx
// Linhas ~23304-23399
<button onClick={() => setActiveMenu('estatisticas')}>  // Home
<button onClick={() => setActiveMenu('nutricionistas')}>  // UtensilsCrossed - Nutricionistas
<button onClick={() => setActiveMenu('personal')}>        // Dumbbell - Personal
<button onClick={() => setActiveMenu('pacientes')}>
<button onClick={() => setActiveMenu('financeiro')}>
```

#### activeMenu values usados
- `'nutricionistas'` — case no renderContent
- `'personal'` — case no renderContent

#### Ícones importados
- `UtensilsCrossed` (Nutricionistas)
- `Dumbbell` (Personal)
- `Link as LinkIcon` (já importado no metaadmin)

---

## Comportamento Esperado — Versão Mobile

### Barra inferior
- **Antes:** Nutricionistas | Personal (2 botões)
- **Depois:** Vínculos (1 botão com ícone Link)

### Ao abrir "Vínculos"
- Tela com **duas abas/pastas** no topo:
  1. **Nutricionistas** — ícone `UtensilsCrossed`
  2. **Personal** — ícone `Dumbbell`
- Conteúdo idêntico ao atual de cada página (sem alteração de lógica)
- Estado interno: qual aba está ativa (ex: `vinculosTab: 'nutricionistas' | 'personal'`)

### Desktop
- Sidebar continua com Nutricionistas e Personal como itens separados
- Sem alteração na experiência desktop

---

## Etapas de Implementação

### Etapa 1: Preparação (metaadmin)

1. **Adicionar estado para aba ativa dentro de Vínculos (apenas Mobile)**
   - `activeVinculosTab: 'nutricionistas' | 'personal'` (default: `'nutricionistas'`)

2. **Criar lógica de "menu efetivo" para renderização do conteúdo**
   - Se `activeMenu === 'vinculos'` → renderizar conteúdo baseado em `activeVinculosTab`
   - Caso contrário → manter lógica atual (`activeMenu === 'nutricionistas'` ou `'personal'`)

### Etapa 2: metaadmin — Mobile Bottom Navigation

1. **Substituir** os dois botões (Nutricionistas e Personal) por um único botão "Vínculos":
   - Ícone: `LinkIcon` (ou `Link` do lucide-react)
   - onClick: `setActiveMenu('vinculos')` e `setActiveVinculosTab('nutricionistas')` (ou manter última aba usada)

2. **No renderContent (ou equivalente):**
   - Adicionar `case 'vinculos':` que renderiza um wrapper com:
     - Duas abas no topo (Nutricionistas | Personal) com ícones
     - Conteúdo de `case 'nutricionistas'` quando aba Nutricionistas ativa
     - Conteúdo de `case 'personal'` quando aba Personal ativa

3. **Usar `isMobile`** para decidir se o case `'vinculos'` existe ou se continua usando `'nutricionistas'` e `'personal'` diretamente.  
   - **Alternativa mais simples:** No mobile, `activeMenu === 'vinculos'` sempre; o conteúdo é determinado por `activeVinculosTab`.

### Etapa 3: Ajustes de useEffect / useCallback

- Nos `useEffect` que carregam dados ao mudar `activeMenu`:
  - Se `activeMenu === 'vinculos'` OU `activeMenu === 'nutricionistas'` → chamar `loadNutricionistas`
  - Se `activeMenu === 'vinculos'` OU `activeMenu === 'personal'` → chamar `loadPersonalTrainers` (ou equivalente)

- **Recomendação:** Ao entrar em `vinculos`, carregar ambas as listas para que a troca de aba seja instantânea.

### Etapa 4: Componente de abas reutilizável (opcional)

- Criar um componente `<VinculosTabs>` com:
  - Duas abas: Nutricionistas (UtensilsCrossed) | Personal (Dumbbell)
  - Props: `activeTab`, `onTabChange`, `childrenNutricionistas`, `childrenPersonal`  
- Ou implementar inline na página metaadmin para evitar over-engineering.

### Etapa 5: Testes e validação

1. Mobile: abas Nutricionistas e Personal funcionando dentro de Vínculos
2. Desktop: sidebar inalterada, Nutricionistas e Personal separados
3. Dados carregando corretamente em ambas as abas
4. Modais e ações (verificar, ativar, excluir, etc.) funcionando em ambas as abas

---

## Resumo de Alterações por Arquivo

### app/metaadmin/page.tsx

| Local | Alteração |
|-------|-----------|
| Estados | Adicionar `activeVinculosTab` |
| Mobile Bottom Nav | Trocar 2 botões por 1 "Vínculos" com ícone Link |
| renderContent / switch | Adicionar `case 'vinculos'` com abas + conteúdo Nutricionistas/Personal |
| useEffect de carregamento | Incluir `activeMenu === 'vinculos'` para load de nutri e personal |

### app/metaadmingeral/page.tsx

**Não modificar** — manter como está.

---

## Ícones — Referência

| Elemento | Ícone lucide-react |
|----------|-------------------|
| Menu Vínculos (mobile) | `Link` ou `Link2` |
| Aba Nutricionistas | `UtensilsCrossed` |
| Aba Personal | `Dumbbell` |

---

## Observações

- **Desktop:** Nenhuma alteração no sidebar; Nutricionistas e Personal continuam itens separados.
- **Mobile:** Um item "Vínculos" substitui Nutricionistas e Personal na barra inferior.
- O conteúdo (tabelas, modais, ações) permanece o mesmo; apenas a navegação mobile muda.
- O estado `activeVinculosTab` pode ser omitido no desktop, pois o sidebar ainda usa `nutricionistas` e `personal` diretamente.
- `activeMenu === 'vinculos'` só é definido pelo botão mobile (lg:hidden), então o desktop nunca terá esse valor.
- A página metaadmin já possui o estado `isMobile` (linha ~463) e o ícone `Link as LinkIcon` importado.
