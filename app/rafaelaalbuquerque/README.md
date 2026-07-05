# Landing Rafaela Albuquerque — extrair para projeto próprio (Vercel)

Este guia descreve como levar o que hoje vive em **`/rafaelaalbuquerque`** neste monorepo (`c:\oftware`) para um **repositório/projeto Next.js separado** (ex.: pasta `c:\rafaelaalbuquerque\` ou o caminho que você preferir) e apontar o deploy **[rafaelaalbuquerque no Vercel](https://vercel.com/ricardos-projects-f0f452df/rafaelaalbuquerque)** com o domínio **www.rafaelaalbuquerque.com**.

No novo projeto, a **home será `/`** (não `/rafaelaalbuquerque`). No monorepo atual, o **`middleware.ts`** só reescreve `/` → `/rafaelaalbuquerque` quando o host é o domínio da Rafaela; em um app dedicado isso deixa de ser necessário.

---

## 1. O que transportar (arquivos e pastas)

### Página e layout específicos

| Origem (neste repo) | Destino sugerido no novo app |
|---------------------|------------------------------|
| `app/rafaelaalbuquerque/page.tsx` | `app/page.tsx` |
| `app/rafaelaalbuquerque/layout.tsx` | Fundamento para `app/layout.tsx` (ver §3) |

### Conteúdo e config da marca

- `rafaela-albuquerque/siteConfig.ts`
- `rafaela-albuquerque/landingCopy.ts`

### Componentes só desta landing

- `components/rafaela-albuquerque/RafaelaAreasCalendarioSection.tsx`
- `components/rafaela-albuquerque/RafaelaIndicadoresSection.tsx`
- `components/rafaela-albuquerque/RafaelaSobreMedia.tsx`
- `components/rafaela-albuquerque/RafaelaViewportConsoleDebug.tsx` (opcional; é só debug de viewport)

### Componentes compartilhados usados pela página

- `components/landing/InitialLoadingSplash.tsx`

### Chat com IA (widget + backend mínimo)

- `components/ChatIA.tsx` — o widget inteiro; para `rafaela_public` ele chama só as rotas abaixo (não precisa das rotas de refeição ChatNutri para esta landing).

**APIs necessárias para o chat funcionar como hoje:**

- `app/api/ia/chat/route.ts`
- `app/api/rafaela/chat-transcript/route.ts`

**Cadeia de libs usada por essas rotas e pelo `ChatIA`:**

- `lib/ia/callLLM.ts`
- `lib/ia/orchestrate.ts`
- `lib/ia/buildSystemPrompt.ts`
- `lib/format/renderInlineBold.ts`
- `lib/email/transporter.ts` (ZeptoMail / nodemailer — usado só pelo envio da transcrição)
- `lib/chatnutri/types.ts` — importado por `ChatIA` para **tipos** (fluxo de refeição não é usado na Rafaela, mas o arquivo entra para compilar)
- `utils/prepareMealImageForUpload.ts` — importado por `ChatIA` (idem: necessário para build)

Se quiser **reduzir** o projeto depois, dá para extrair um `ChatIARafaela` enxuto sem imports de ChatNutri; o caminho rápido é copiar o que está listado acima.

### Assets estáticos

Copie a pasta inteira:

- `public/rafaela-albuquerque/`  
  (ex.: `logonova.png`, `dra-rafaela.jpg`, etc.)

O splash usa o logo via `BRAND.logoPath` (já em `public/rafaela-albuquerque/...`). Não é obrigatório copiar `/simbolo-metodo.png` da Oftware.

### Estilos globais (trecho mínimo)

A página usa classes **`animate-float`**, **`animate-home-loading-logo`** e **`animate-home-loading-text`**. No monorepo elas estão em `app/globals.css`:

- `@keyframes float` + classe `.animate-float`
- `@keyframes home-loading-logo` + `.animate-home-loading-logo`
- `@keyframes home-loading-text` + `.animate-home-loading-text`

Você pode **copiar só esses blocos** para o `globals.css` do novo app (ou importar um CSS pequeno só com isso), junto com o setup do **Tailwind v4** / `@tailwindcss/postcss` como no `package.json` atual.

### Config TypeScript

- No novo app, use o mesmo padrão de alias: `"@/*": ["./*"]` em `tsconfig.json` (como neste repo).

---

## 2. O que **não** precisa levar

- **`middleware.ts`** deste monorepo (reescreve host da Rafaela para `/rafaelaalbuquerque`).
- Restante de `app/` (meta, oftpay, etc.).
- `components/systemColors/SystemColorsCssVarsLoader` e metas PWA da Oftware — a menos que queira replicar; para a landing da advogada costuma bastar um `layout.tsx` enxuto.
- Rotas `app/api/chatnutri/*` — não são usadas com `contextSurface="rafaela_public"`.

---

## 3. Ajustes obrigatórios no código ao virar “site único”

1. **`app/page.tsx` (ex-`rafaelaalbuquerque/page.tsx`)**  
   - Troque `<Link href="/rafaelaalbuquerque">` por `<Link href="/">` no header (e em qualquer outro link interno equivalente).

2. **`app/layout.tsx`**  
   - Una a ideia do layout raiz do Next com o que está em `app/rafaelaalbuquerque/layout.tsx`: **viewport** com `maximumScale: 5` e `metadata` sempre para **`https://www.rafaelaalbuquerque.com`** (pode remover a lógica que compara host com `oftware.com.br` e o path `/rafaelaalbuquerque`).  
   - `metadataBase`, `openGraph.url`, `alternates.canonical` devem apontar para **`/`** no domínio da Rafaela.

3. **`lib/ia/buildSystemPrompt.ts`** (opcional mas recomendado)  
   - O texto do canal ainda menciona **`/rafaelaalbuquerque`**; em site próprio pode atualizar para “home do site” ou similar.

4. **Favicon / ícones**  
   - Substitua referências aos ícones da Oftware por assets do escritório, se desejar consistência de marca só na Rafaela.

---

## 4. Variáveis de ambiente (Vercel)

Copie do projeto Oftware o que já usar para esta landing e ajuste no novo projeto.

### Chat IA (`app/api/ia/chat`)

- `OFTWARE_IA_CHAT_ENABLED` — se `false`, o chat responde 503.
- **OpenAI:** `OPENAI_API_KEY`, opcional `OPENAI_CHAT_MODEL` (default `gpt-4o-mini`).  
  **ou** credenciais **Vertex** conforme `lib/ia/callLLM.ts` (`GOOGLE_VERTEX_CREDENTIALS_JSON` ou `GOOGLE_PROJECT_ID` + `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`).

### Transcrição por e-mail (`app/api/rafaela/chat-transcript`)

- `NEXT_PUBLIC_RAFAELA_EMAIL` — e-mail válido que recebe o resumo (o código valida formato).
- ZeptoMail (ou o que `lib/email/transporter.ts` espera):  
  `ZEPTOMAIL_SMTP_HOST`, `ZEPTOMAIL_SMTP_USER`, `ZEPTOMAIL_SMTP_PASSWORD`, `MAIL_FROM`  
  (e opcionalmente `MAIL_REPLY_TO`).

### Conteúdo / contato (já usados em `siteConfig.ts` e no footer)

- `NEXT_PUBLIC_RAFAELA_WA` — opcional; sobrescreve o WhatsApp padrão.
- `NEXT_PUBLIC_RAFAELA_INSTAGRAM` — permalink ou @ para embed; se vazio, cai no retrato estático.
- `NEXT_PUBLIC_RAFAELA_SCHEDULE_URL`, `NEXT_PUBLIC_RAFAELA_EMAIL` — se usar agenda/mailto no futuro.
- `NEXT_PUBLIC_RAFAELA_OAB_LINE` — linha opcional no rodapé.
- `RAFAELA_SITE_HOSTS` — opcional; lista separada por vírgula de hosts para metadata (default inclui `www.rafaelaalbuquerque.com` e `rafaelaalbuquerque.com`).
- `NEXT_PUBLIC_VIEWPORT_DEBUG` — opcional (`1` liga log de viewport em produção).

---

## 5. Dependências npm mínimas (referência)

Alinhe com o monorepo atual para evitar surpresas, em especial:

- `next`, `react`, `react-dom`
- `framer-motion`, `lucide-react`
- `google-auth-library` (se usar Vertex em `callLLM`)
- `nodemailer` (transcrição)

Use o `package.json` deste repositório como checklist e **remova** o que sobrar sem import após o split.

---

## 6. Vercel e domínio

1. Crie o repositório Git na nova pasta e faça push.
2. No painel **[rafaelaalbuquerque – Vercel](https://vercel.com/ricardos-projects-f0f452df/rafaelaalbuquerque)**, conecte esse repositório (ou atualize o Git conectado se já existir projeto vazio).
3. Configure **Environment Variables** (§4).
4. Confirme que **www.rafaelaalbuquerque.com** (e `rafaelaalbuquerque.com` se aplicável) apontam para este projeto e que o build Next.js passa (`next build`).

---

## 7. Depois do go-live

- No monorepo **Oftware**, você pode **remover ou redirecionar** `/rafaelaalbuquerque` para o domínio novo (301) para não manter duas cópias da mesma landing — quando o site isolado estiver estável.

---

*Documento gerado a partir da estrutura atual do repositório `oftware`; se novos imports forem adicionados à página ou ao `ChatIA`, atualize a lista em §1 antes de migrar.*
