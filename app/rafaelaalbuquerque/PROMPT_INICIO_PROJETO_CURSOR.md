# Prompt para colar no Cursor (projeto novo — site Rafaela Albuquerque)

Copie o bloco abaixo **inteiro** na primeira mensagem do agente no workspace do novo repositório (ex.: `c:\rafaelaalbuquerque`).

---

```
## Contexto

Estou criando um site Next.js **standalone** para a Dra. Rafaela Albuquerque. A home do site será **`/`** (não `/rafaelaalbuquerque`). O deploy será na Vercel no projeto **rafaelaalbuquerque**, domínio **www.rafaelaalbuquerque.com**.

Tenho o monorepo **Oftware** em `c:\oftware` com a landing já feita. Lá existem:
- `c:\oftware\app\rafaelaalbuquerque\` — página, layout, **README.md** com inventário completo de migração e **PROMPT_INICIO_PROJETO_CURSOR.md**
- `c:\oftware\rafaela-albuquerque\` — `siteConfig.ts`, `landingCopy.ts`
- `c:\oftware\components\rafaela-albuquerque\` — componentes da landing
- `c:\oftware\components\landing\InitialLoadingSplash.tsx`
- `c:\oftware\components\ChatIA.tsx` + APIs e libs listadas no README da pasta acima
- `c:\oftware\public\rafaela-albuquerque\` — imagens/logo

## O que fazer (ordem sugerida)

1. **Leia primeiro** `c:\oftware\app\rafaelaalbuquerque\README.md` e siga a lista de arquivos/pastas a transportar. Se este workspace já tiver cópias desses arquivos, use-as; senão, copie do caminho `c:\oftware\` indicado no README.

2. **Scaffold**: garanta um app **Next.js 15** + **React 19** + **TypeScript** + **Tailwind v4** (`@tailwindcss/postcss`) alinhado ao `package.json` do Oftware para as deps que a landing precisa (`framer-motion`, `lucide-react`, `google-auth-library`, `nodemailer`, etc. — veja README).

3. **Estrutura**:
   - Conteúdo de `app/rafaelaalbuquerque/page.tsx` vira **`app/page.tsx`**.
   - Monte **`app/layout.tsx`** com metadata/viewport adequados ao domínio **www.rafaelaalbuquerque.com** (canonical `/`, sem lógica de host Oftware). Use como base o `layout.tsx` que estava em `rafaelaalbuquerque`.
   - **Ajustes obrigatórios**: trocar `Link href="/rafaelaalbuquerque"` por `href="/"`; paths de assets em `public/rafaela-albuquerque/` mantêm-se.
   - Inclua no `globals.css` apenas o necessário: animações `float`, `home-loading-logo`, `home-loading-text` (trechos indicados no README).

4. **Alias**: `tsconfig.json` com `"paths": { "@/*": ["./*"] }` como no Oftware.

5. **APIs**: copie `app/api/ia/chat` e `app/api/rafaela/chat-transcript` e toda a cadeia de `lib/` / `utils/` que o README lista, até o projeto compilar sem erros.

6. **Chat / LLM**: no Vercel, as mesmas variáveis do Oftware. **Gemini (Vertex)**: `GOOGLE_VERTEX_CREDENTIALS_JSON` ou trio `GOOGLE_PROJECT_ID` + `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`, opcionais `VERTEX_AI_LOCATION`, `GEMINI_MODEL_ID`. Se `OPENAI_API_KEY` existir, o código prefere OpenAI — para só Gemini, não definir OpenAI neste projeto. Transcrição: ZeptoMail + `NEXT_PUBLIC_RAFAELA_EMAIL` conforme README.

7. **Variáveis públicas Rafaela** (opcionais): `NEXT_PUBLIC_RAFAELA_WA`, `NEXT_PUBLIC_RAFAELA_INSTAGRAM`, `NEXT_PUBLIC_RAFAELA_OAB_LINE`, `OFTWARE_IA_CHAT_ENABLED`, etc. — ver README §4.

8. **Não copiar**: `middleware.ts` do monorepo (rewrite de domínio), resto do `app` Oftware, rotas ChatNutri.

9. **Qualidade**: `npm run build` deve passar. Revise `lib/ia/buildSystemPrompt.ts` para texto que ainda cite `/rafaelaalbuquerque` e atualize para “site / home” se fizer sentido.

10. **Firebase**: não é necessário para o chat atual; só configure se eu pedir feature que use Firebase.

## Resultado esperado

Um repositório mínimo que só serve a landing da Rafaela na **`/`**, com chat IA e e-mail de transcrição funcionando com as mesmas credenciais Google Vertex / ZeptoMail que já usamos na Oftware (variáveis duplicadas no projeto Vercel da Rafaela).

Execute lendo o README do monorepo como fonte da verdade para paths e envs.
```

---

*Arquivo gerado para reutilização ao abrir o novo projeto no Cursor.*
