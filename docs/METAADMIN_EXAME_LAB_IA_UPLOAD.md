# Metaadmin — leitura de laudo (IA) no modal de exames laboratoriais

## Objetivo

Complementar o fluxo **manual** de adicionar/editar exames em `/metaadmin` com upload opcional de PDF ou imagem. O backend chama o **Gemini (Vertex AI)** para sugerir valores nos **mesmos campos** do formulário. **Nada é salvo automaticamente**; o médico revisa e usa **Salvar Exame** como hoje.

## Onde foi implementado

| Área | Arquivo |
|------|---------|
| Mapa de campos (fonte única) | `lib/metaadmin/exameLaboratorialFormFields.ts` |
| Normalização, merge no estado, mensagem “não inseridos” | `lib/metaadmin/exameLaboratorialExtracao.ts` |
| Auth Vertex (server) | `lib/gcp/googleVertexAuth.ts` |
| Prompt + chamada Gemini | `services/exameLaboratorialGeminiService.ts` |
| API POST multipart | `app/api/metaadmin/exames-laboratoriais-extrair-ia/route.ts` |
| UI do bloco de upload | `components/metaadmin/ExameLaboratorialIaUploadBlock.tsx` |
| Desktop + mobile + handler | `app/metaadmin/page.tsx` |

## Fluxo

1. Médico abre o modal de adicionar/editar exame (desktop ou mobile).
2. Opcionalmente escolhe arquivo (PDF, JPEG, PNG, WebP; máx. 5 MB no servidor).
3. O cliente envia `FormData` para `/api/metaadmin/exames-laboratoriais-extrair-ia`.
4. O servidor envia o arquivo ao Gemini com a lista **fechada** de chaves permitidas.
5. A resposta preenche `novoExameData` / `novoExameDataMobile` (merge).
6. Se houver exames identificados no arquivo sem campo no sistema, abre o modal de mensagem (tipo **Aviso**) com:  
   `Alguns exames não foram inseridos, como: ...`
7. O médico edita à vontade e salva com o botão já existente.

## Regras de negócio (implementadas)

- **Data**: só é aplicada pela IA quando `indiceExameEditando` / `indiceExameEditandoMobile` é `null` (novo registro) e `dataExame` vem como `YYYY-MM-DD` válida. Em edição, a data do exame **não** é alterada pela IA (compatível com data travada no mobile).
- **Números**: só valores finitos **> 0** (alinhado ao formulário que ignora zero/vazio).
- **Sobrescrita**: valores devolvidos pela IA **substituem** o que estiver no campo correspondente; o médico pode corrigir depois.
- **Chaves**: somente as de `EXAME_LABORATORIAL_ALLOWED_INTERNAL_FIELDS`; o restante vai para `examesNaoMapeados` (texto livre vindo do modelo).

## Variáveis de ambiente

Mesmas do restante do projeto Vertex:

- `GOOGLE_VERTEX_CREDENTIALS_JSON` (ou `GOOGLE_PROJECT_ID` + `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`)
- `VERTEX_AI_LOCATION` (padrão `us-central1`)
- `GEMINI_MODEL_ID` (padrão `gemini-2.5-flash`)
- `GEMINI_EXAME_LAB_MODEL_ID` (opcional) — modelo só para este fluxo; pode usar versão mais nova/capaz para OCR (ex.: `gemini-2.5-flash` quando disponível na sua região).
- `EXAME_LAB_IA_TEMPERATURE` (opcional) — padrão `0` (máxima determinismo). Valores entre `0` e `1` se quiser um pouco mais de flexibilidade (geralmente **não** recomendado para números).
- `EXAME_LAB_IA_USE_RESPONSE_SCHEMA=1` — **opt-in**: ativa `responseSchema` no Vertex (uma propriedade numérica por campo). O padrão é **desligado** (só `application/json` + prompt), porque schema muito grande costuma **reduzir** quantos exames o modelo devolve; a API ainda filtra chaves em `normalizarRespostaExameIA`.

## Precisão (o que o código faz)

1. **Prompt** — instruções explícitas para não confundir coluna de **resultado** com **valor de referência**, ignorar valores tipo `&lt;0,5`, ambiguidade entre exames parecidos, etc.
2. **`temperature: 0`** e **`topP: 0.95`** — reduz “criatividade” nos números.
3. **`mediaResolution: HIGH`** — mais detalhe na leitura de PDF/imagem (maior custo em tokens).
4. **`responseSchema`** (opcional, `EXAME_LAB_IA_USE_RESPONSE_SCHEMA=1`) — restrição rígida ao JSON; pode piorar cobertura em painéis grandes.
5. **Pós-processamento** — `lib/metaadmin/exameLaboratorialPlausibility.ts` remove valores fora de faixas amplas (erros grosseiros) e adiciona aviso para o médico preencher manualmente se necessário. Leucócitos/plaquetas: normalização /µL → ×10³/µL em `exameLaboratorialExtracao.ts` (silenciosa, sem mensagem extra no feedback do upload).

## Limitações

- Tamanho máximo **5 MB** por arquivo.
- Qualidade depende do laudo (escaneado, legível, campos com nome e valor explícitos).
- O modelo **não** deve inventar valores; em caso de dúvida, tende a omitir do `camposMapeados`.
- Autenticação da rota: no mesmo padrão de outras rotas internas do app (sem sessão server-side extra nesta versão).

## Estados novos no `page.tsx`

- `exameIaUploadingDesktop`, `exameIaFeedbackDesktop`
- `exameIaUploadingMobile`, `exameIaFeedbackMobile`
- `modalType` estendido com `'info'` para o aviso de exames não mapeados

## Função principal

- `processarArquivoExameLaboratorialIa(file, 'desktop' | 'mobile')`

Helpers em `lib/metaadmin/exameLaboratorialExtracao.ts`: `normalizarRespostaExameIA`, `applyExameExtraidoToForm`, `buildMensagemExamesNaoInseridos`.
