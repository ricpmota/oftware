## Etapa 18 — Migrar componentes base de interação para os tokens globais

### Objetivo
Substituir cores fixas e hardcoded nos componentes base/compartilhados de interação pelo novo padrão baseado em tokens globais (brand/surface/text/border/state), consolidando a “camada central” de UI antes de migrar páginas específicas.

### Escopo (o que foi migrado)
Migração **apenas** de componentes compartilhados/base de interação que têm cores fixas evidentes e são reutilizados em fluxos diferentes:
- `components/LoginModal.tsx`
- `components/SaveConfirmationModal.tsx`
- `components/SelectPatientModal.tsx`
- `components/EditModal.tsx`
- `components/EditModalMeta.tsx`

### Tokens e mapeamento usados
Foram aplicados tokens já expostos no CSS/Tailwind e usados consistentemente nas cores principais e estados:
- `surface`: `bg-surface-card`, `bg-surface-modal`, `bg-surface-background`
- `text`: `text-text-primary`, `text-text-secondary`, `text-text-inverse`
- `border`: `border-border-default`, `focus:border-border-focus`
- `state`: `bg-state-danger/15`, `text-state-danger`, `bg-state-warning/15`, `text-state-warning`, `bg-state-info`, `bg-state-info/90`
- `focus ring`: `focus:ring-2 focus:ring-border-focus focus:border-border-focus`
- ações primárias: `bg-brand-primary` e variação `hover:bg-brand-secondary` onde aplicável

### Quais cores fixas foram substituídas (exemplos)
- `bg-red-50`, `border-red-200`, `text-red-600` -> `bg-state-danger/15`, `border-state-danger/30`, `text-state-danger`
- `focus:ring-blue-500` -> `focus:ring-border-focus` (e `focus:border-border-focus`)
- `bg-gray-*`, `border-gray-*`, `text-gray-*` -> `border-border-default`, `text-text-secondary`, etc.
- `bg-blue-600` (ações/CTA antigas) -> `bg-state-info`/`bg-brand-primary` conforme o papel semântico no fluxo

### Comportamento preservado
- Não houve mudança de props, estado, nem fluxo lógico dos componentes.
- As mudanças ficaram restritas a classes Tailwind relacionadas a **visual/estados** (cores, bordas, focus visible, hover).

### O que ficou de fora e por quê
- Modais grandes/altamente específicos do domínio (ex.: `ModalDadosPacienteChat` e outros modais de fluxos longos) foram **propositalmente** deixados para depois, porque:
  - têm muitas áreas/estilos internos e risco maior de afetar layout e validações visuais em cascata;
  - a Etapa 18 foi focada em “camada central” (base de interação), mantendo o impacto controlado.
- Componentes de formulário (Input/Select/Checkbox/Radio/Tabs) não foram migrados nesta etapa porque não foi encontrado um conjunto claro de componentes base compartilhados com esse nome; onde existem, geralmente estão embutidos em telas/containers específicos (e a migração por página ficaria fora do escopo).

### Riscos e pontos de atenção para QA visual
1. **Botões de OAuth** (`LoginModal`): classes de `hover/estado/fundo` mudaram para tokens, então pode haver leve diferença de tom (especialmente para Facebook).
2. **Modal de confirmação** (`SaveConfirmationModal`): “Sim, salvar” usa token de ação primária (`brand-primary/brand-secondary`), o que pode não ser exatamente a cor anterior.
3. **Focus-visible**: o ring agora depende de `border-focus` via tokens; validar em desktop e teclado (Tab) se o foco aparece com clareza.
4. **Badges/indicadores**: “Compartilhado” no `SelectPatientModal` foi mapeado para `state-success` com opacidade.

### Arquivos alterados
- `C:/oftware/components/LoginModal.tsx`
- `C:/oftware/components/SaveConfirmationModal.tsx`
- `C:/oftware/components/SelectPatientModal.tsx`
- `C:/oftware/components/EditModal.tsx`
- `C:/oftware/components/EditModalMeta.tsx`

