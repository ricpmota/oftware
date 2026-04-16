# Diretrizes para ChatGPT - Sistema de Banners

## 📋 Visão Geral

O sistema de banners permite criar banners clicáveis que exibem conteúdo quando clicados. O conteúdo pode ser criado em dois formatos:
- **JSON/TypeScript (Recomendado)**: Formato estruturado e seguro
- **HTML**: Formato legado para compatibilidade

## 🎯 Localização do Código

- **Página de Administração**: `app/metaadmingeral/page.tsx`
- **Página de Visualização**: `app/meta/banner/[id]/page.tsx`
- **Componente de Renderização**: `components/BannerRenderer.tsx`
- **Tipos TypeScript**: `types/banner.ts`
- **Serviço**: `services/bannerService.ts`

## 📊 Estrutura de Dados

### Interface Banner (types/banner.ts)

```typescript
interface Banner {
  id: string;
  titulo: string;
  imagemUrl: string;
  conteudoHtml?: string;        // Para formato HTML (legado)
  conteudoJson?: BannerContent;  // Para formato JSON (recomendado)
  formato: 'html' | 'json';     // Tipo de conteúdo
  ativo: boolean;
  ordem: number;
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor?: string;
}
```

### Interface BannerContent (types/banner.ts)

```typescript
interface BannerContent {
  sections: BannerContentSection[];
  styles?: {
    backgroundColor?: string;
    textColor?: string;
    fontFamily?: string;
    maxWidth?: string;
  };
}
```

### Interface BannerContentSection (types/banner.ts)

```typescript
interface BannerContentSection {
  type: 'text' | 'heading' | 'image' | 'button' | 'list' | 'video' | 'divider';
  content?: string;
  text?: string;
  heading?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;  // Para type: 'heading'
  imageUrl?: string;               // Para type: 'image'
  imageAlt?: string;                // Para type: 'image'
  buttonText?: string;              // Para type: 'button'
  buttonLink?: string;              // Para type: 'button'
  buttonStyle?: 'primary' | 'secondary' | 'outline';  // Para type: 'button'
  items?: string[];                 // Para type: 'list'
  videoUrl?: string;                // Para type: 'video'
  style?: {
    backgroundColor?: string;
    textColor?: string;
    padding?: string;
    margin?: string;
    textAlign?: 'left' | 'center' | 'right';
    fontSize?: string;
  };
}
```

## ✅ Diretrizes para Criar Conteúdo JSON

### 1. Estrutura Básica

SEMPRE comece com um objeto que contém `sections` (array):

```json
{
  "sections": [
    // Seções aqui
  ]
}
```

### 2. Tipos de Seções Disponíveis

#### a) Heading (Títulos)

```json
{
  "type": "heading",
  "heading": "Título Principal",
  "level": 1,
  "style": {
    "textAlign": "center",
    "fontSize": "2rem",
    "textColor": "#000000"
  }
}
```

**Níveis disponíveis**: 1, 2, 3, 4, 5, 6

#### b) Text (Parágrafos)

```json
{
  "type": "text",
  "text": "Este é um parágrafo de texto que será exibido no banner.",
  "style": {
    "textAlign": "left",
    "fontSize": "1rem",
    "padding": "1rem"
  }
}
```

#### c) Image (Imagens)

```json
{
  "type": "image",
  "imageUrl": "https://exemplo.com/imagem.jpg",
  "imageAlt": "Descrição da imagem",
  "style": {
    "textAlign": "center",
    "margin": "1rem 0"
  }
}
```

#### d) Button (Botões)

```json
{
  "type": "button",
  "buttonText": "Clique Aqui",
  "buttonLink": "https://exemplo.com",
  "buttonStyle": "primary",
  "style": {
    "textAlign": "center",
    "margin": "1rem 0"
  }
}
```

**Estilos disponíveis**: `"primary"`, `"secondary"`, `"outline"`

#### e) List (Listas)

```json
{
  "type": "list",
  "items": [
    "Item 1 da lista",
    "Item 2 da lista",
    "Item 3 da lista"
  ],
  "style": {
    "padding": "1rem",
    "margin": "1rem 0"
  }
}
```

#### f) Video (Vídeos)

```json
{
  "type": "video",
  "videoUrl": "https://www.youtube.com/embed/VIDEO_ID",
  "style": {
    "textAlign": "center",
    "margin": "1rem 0"
  }
}
```

#### g) Divider (Separador)

```json
{
  "type": "divider",
  "style": {
    "margin": "2rem 0"
  }
}
```

### 3. Estilos Globais (Opcional)

Você pode definir estilos globais que se aplicam a todo o conteúdo:

```json
{
  "sections": [...],
  "styles": {
    "backgroundColor": "#ffffff",
    "textColor": "#111827",
    "fontFamily": "Arial, sans-serif",
    "maxWidth": "1200px"
  }
}
```

## 📝 Exemplo Completo

```json
{
  "sections": [
    {
      "type": "heading",
      "heading": "Bem-vindo ao Nosso Serviço",
      "level": 1,
      "style": {
        "textAlign": "center",
        "fontSize": "2.5rem",
        "textColor": "#1f2937",
        "margin": "2rem 0"
      }
    },
    {
      "type": "text",
      "text": "Descubra todas as funcionalidades que temos a oferecer para você.",
      "style": {
        "textAlign": "center",
        "fontSize": "1.1rem",
        "padding": "1rem"
      }
    },
    {
      "type": "image",
      "imageUrl": "https://exemplo.com/banner.jpg",
      "imageAlt": "Banner promocional",
      "style": {
        "textAlign": "center",
        "margin": "2rem 0"
      }
    },
    {
      "type": "list",
      "items": [
        "Funcionalidade 1",
        "Funcionalidade 2",
        "Funcionalidade 3"
      ],
      "style": {
        "padding": "1.5rem",
        "margin": "1rem 0"
      }
    },
    {
      "type": "button",
      "buttonText": "Começar Agora",
      "buttonLink": "https://exemplo.com/cadastro",
      "buttonStyle": "primary",
      "style": {
        "textAlign": "center",
        "margin": "2rem 0"
      }
    }
  ],
  "styles": {
    "backgroundColor": "#ffffff",
    "textColor": "#111827",
    "maxWidth": "1200px"
  }
}
```

## ⚠️ Regras Importantes

1. **SEMPRE use `formato: 'json'`** para novos banners (não use HTML a menos que seja necessário para compatibilidade)

2. **SEMPRE valide o JSON** antes de salvar:
   - Deve ser um objeto válido
   - Deve ter a propriedade `sections` (array)
   - `sections` deve ter pelo menos 1 item
   - Cada seção deve ter `type` válido

3. **Campos obrigatórios por tipo**:
   - `heading`: `type`, `heading`, `level`
   - `text`: `type`, `text`
   - `image`: `type`, `imageUrl`
   - `button`: `type`, `buttonText`, `buttonLink`
   - `list`: `type`, `items`
   - `video`: `type`, `videoUrl`
   - `divider`: `type`

4. **Ao editar um banner existente**:
   - Se o banner tem `conteudoJson`, use formato 'json'
   - Se o banner tem `conteudoHtml`, use formato 'html'
   - Se não tem nenhum, padrão é 'json'

5. **Estado no formulário** (`dadosBanner`):
   ```typescript
   {
     titulo: string;
     imagemUrl: string;
     conteudoHtml?: string;
     conteudoJson?: BannerContent;
     formato: 'html' | 'json';
     ativo: boolean;
     ordem: number;
   }
   ```

6. **Ao salvar**:
   - Se `formato === 'json'`: salve apenas `conteudoJson`, deixe `conteudoHtml` como `undefined`
   - Se `formato === 'html'`: salve apenas `conteudoHtml`, deixe `conteudoJson` como `undefined`
   - SEMPRE defina o campo `formato` corretamente

## 🔧 Como o Sistema Funciona

1. **Criação/Edição**: Usuário preenche formulário em `/metaadmingeral`
2. **Upload de Imagem**: Imagem é enviada para Firebase Storage
3. **Conteúdo**: Conteúdo JSON é validado e salvo no Firestore
4. **Visualização**: Banner aparece em `/meta` com link para `/meta/banner/[id]`
5. **Renderização**: `BannerRenderer` renderiza o JSON em componentes React

## 🐛 Troubleshooting

- **JSON inválido**: Verifique sintaxe, vírgulas, chaves, aspas
- **Seção não aparece**: Verifique se `type` está correto e campos obrigatórios estão preenchidos
- **Erro ao salvar**: Verifique se `sections` tem pelo menos 1 item
- **Banner antigo não funciona**: Banners antigos em HTML continuam funcionando, mas novos devem usar JSON

## 📌 Checklist para ChatGPT

Ao criar ou modificar código relacionado a banners:

- [ ] Usar `formato: 'json'` por padrão
- [ ] Validar estrutura JSON antes de salvar
- [ ] Garantir que `sections` é um array com pelo menos 1 item
- [ ] Verificar campos obrigatórios de cada tipo de seção
- [ ] Atualizar estado `dadosBanner` corretamente
- [ ] Salvar apenas o conteúdo do formato selecionado
- [ ] Detectar formato automaticamente ao editar banner existente
- [ ] Resetar `jsonError` ao mudar formato ou fechar modal
- [ ] Inicializar `conteudoJson` com `{ sections: [] }` quando formato for 'json'

## 🎨 Dicas de UX

- Use `textAlign: "center"` para títulos principais
- Use `margin` e `padding` para espaçamento adequado
- Combine diferentes tipos de seções para conteúdo rico
- Use botões com `buttonStyle: "primary"` para ações principais
- Use listas para destacar benefícios ou características
