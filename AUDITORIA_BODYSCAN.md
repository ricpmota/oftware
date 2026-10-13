# AUDITORIA — Dados disponíveis para criação do Oftware BodyScan

**Data:** 08/08/2026  
**Escopo:** somente leitura do código e da estrutura atual  
**Status:** nenhuma implementação, endpoint, banco ou interface foi alterado  

**Pergunta central desta auditoria:**

> No momento em que o paciente realiza uma aplicação e envia suas fotos frontal e lateral, quais dados objetivos a Oftware possui sobre aquele paciente e como conseguimos reunir todos esses dados em um único snapshot temporal para futuramente enviar ao Oftware BodyScan?

---

## A. Fluxo atual da aplicação

### Roteamento

| Item | Valor |
|---|---|
| Rota pública | `/aplicacao/[token]` |
| Página | `app/aplicacao/[token]/page.tsx` |
| Router | `components/aplicacao/AplicacaoPageRouter.tsx` |
| Semana 1 | `AplicacaoMarcoZeroPageClient` |
| Semana ≥ 2 | `AplicacaoCheckInPageClient` |
| Origem do token | Collection `aplicacao_links/{token}` |

Campos do link (`ensureAplicacaoPublicLink.ts`):

- `pacienteId`
- `data` (`YYYY-MM-DD` local)
- `semana` (número)
- `dose` (mg)
- `key` = `{pacienteId}_{data}_{semana}`
- `createdAt`

**Não existe** campo `applicationId` / `aplicacaoId` / `applicationKey` gravado no link. Isso afeta o join foto↔medida (seção C).

### Perguntas — Marco Zero (semana 1)

Fonte: `lib/aplicacao/marcoZeroQuestions.ts`  
UI: `components/aplicacao/AplicacaoMarcoZeroPageClient.tsx`  
Salvamento: `POST /api/aplicacao/[token]/atualizar`

| # | Label na UI | Campo | Tipo | Unidade | Obrig. | Destino Firestore |
|---|---|---|---|---|---|---|
| 1 | Qual seu peso atual? | `peso` | decimal (input texto) | kg | **Sim** | `evolucaoSeguimento[].peso` + `marcoZero.pesoInicial` + `dadosClinicos.medidasIniciais.peso` |
| 2 | Qual sua circunferência abdominal atual? | `circunferenciaAbdominal` | decimal | cm | Não | `evolucaoSeguimento[].circunferenciaAbdominal` + `marcoZero.circunferenciaInicial` + `dadosClinicos.medidasIniciais.circunferenciaAbdominal` |
| 3 | O que mais te motivou a iniciar este tratamento? | `motivacaoPrincipal` | choice | — | Sim | `marcoZero.motivacaoPrincipal` |
| 4 | Como você se sente hoje em relação ao seu peso atual? | `satisfacaoAtual` | choice | — | Sim | `marcoZero.satisfacaoAtual` |
| 5 | Qual resultado você gostaria de alcançar nos próximos meses? | `objetivoPaciente` | shorttext | — | Sim | `marcoZero.objetivoPaciente` |
| 6 | Você acredita que conseguirá atingir seu objetivo? | `confiancaNoObjetivo` | choice | — | Sim | `marcoZero.confiancaNoObjetivo` |
| 7 | Registro fotográfico | `fotos` | `marco_fotos` | — | Não | subcoleção `progressPhotos` (endpoint separado) |

### Perguntas — Check-in semanal (semana ≥ 2)

Fonte: `lib/aplicacao/checkInSemanalQuestions.ts`  
UI: `components/aplicacao/AplicacaoCheckInPageClient.tsx`  
Salvamento: mesmo `POST .../atualizar`

| # | Label na UI | Campo | Tipo | Unidade | Obrig. | Destino Firestore |
|---|---|---|---|---|---|---|
| 1 | Qual seu peso atual? | `peso` | decimal (`DigitalMeasurePicker`) | kg | **Sim** | `evolucaoSeguimento[].peso` |
| 2 | Qual sua circunferência abdominal atual? | `circunferenciaAbdominal` | decimal (`DigitalMeasurePicker`) | cm | Não | `evolucaoSeguimento[].circunferenciaAbdominal` |
| 3 | Onde você aplicou nesta semana? | `localAplicacao` | choice → `abdome`/`braco`/`coxa` | — | Sim | `evolucaoSeguimento[].localAplicacao` |
| 4–9 | Fome, período, saciedade, água, proteínas, satisfação | vários | choice | — | Sim | `evolucaoSeguimento[].checkInSemanal.*` |
| 10 | Comentário da semana | `comentarioSemana` | textarea | — | Não | `checkInSemanal.comentarioSemana` |
| 11 | Gostaria de registrar suas fotos da evolução semanal? | `fotos` | `fotos` | — | Não | `progressPhotos` |

### Campos derivados gravados automaticamente

No registro de `evolucaoSeguimento[]`:

- `weekIndex` / `numeroSemana` ← `aplicacao_links.semana`
- `dataRegistro` ← `aplicacao_links.data`
- `doseAplicada.{quantidade,data,horario}` ← dose do link + horário do preenchimento
- `adherence: 'ON_TIME'`
- `checkInSemanalScore` (apenas check-in ≥ 2)
- `marcoZero.possuiFotosIniciais` (semana 1; consulta se existe ≥ 1 foto na subcoleção)

### Campos pedidos na auditoria — presença no dia da aplicação

| Dado | Capturado no dia da aplicação? | Observação |
|---|---|---|
| Peso corporal | **Sim** (obrigatório) | Por semana em `evolucaoSeguimento` |
| Circunferência abdominal | **Sim** (opcional) | Mesmo array |
| Altura | **Não** | Só em `dadosClinicos.medidasIniciais.altura` (cadastro/anamnese) |
| IMC | **Não** no fluxo | Persistido só em `medidasIniciais.imc`; recalculado na semana 1 |
| Foto frontal | **Sim** (opcional) | `progressPhotos`, `tipo: 'frontal'` |
| Foto perfil/lateral | **Sim** (opcional) | `progressPhotos`, `tipo: 'perfil'` |
| Data da aplicação | Só leitura (do link) | `dataRegistro` / `dataAplicacao` |
| Número/semana | Só leitura (do link) | `weekIndex` / `semana` |
| Dose aplicada | Só leitura (do link) | `doseAplicada.quantidade` em mg |
| Medicamento | **Não** no fluxo | Nome do protocolo não chega à página nem ao registro semanal |

---

## B. Dados antropométricos disponíveis

### B.1 Peso corporal

| Aspecto | Detalhe |
|---|---|
| UI (paciente) | "Qual seu peso atual?" |
| Variável | `peso` |
| Tipo | `number` (parse de string com `,` ou `.`) |
| Unidade | kg |
| Obrigatório | Sim |
| Captura MZ | `<input inputMode="decimal">` |
| Captura CI | `DigitalMeasurePicker` (step 0,1; 1 casa decimal) |
| Validação cliente | `parseFloat` → deve ser `> 0` |
| Validação servidor | `peso == null \|\| isNaN(peso) \|\| peso <= 0` → 400 |
| Limites clínicos | **Não** no fluxo público (admin anamnese usa 20–400 kg) |
| Salvamento | `POST /api/aplicacao/[token]/atualizar` |
| Firestore | `pacientes_completos/{pacienteId}.evolucaoSeguimento[i].peso` |
| Baseline semana 1 | Também `dadosClinicos.medidasIniciais.peso` e `marcoZero.pesoInicial` |
| Histórico | Sim — um peso por `weekIndex` no array `evolucaoSeguimento` |
| Correlação com foto do mesmo dia | Indireta, via `semana` / `dataAplicacao` (não há FK cruzada) |

**Associação estrutural já existe no nível “semana”:**

```text
Aplicação semana 5
  dataRegistro (do link)
  peso: 87.4
  fotos com progressPhotos.semana === 5
```

Não existe, hoje, um `applicationId` compartilhado entre o registro de peso e as fotos.

### B.2 Circunferência abdominal

| Aspecto | Detalhe |
|---|---|
| Significado real no sistema | **Circunferência / perímetro abdominal** (não “comprimento” linear) |
| Label paciente | "Qual sua circunferência abdominal atual?" |
| Variável | `circunferenciaAbdominal` |
| Unidade | cm |
| Obrigatório | Não |
| Tipo tipado | `types/obesidade.ts` comenta `// cm (40-200)` |
| Alias Marco Zero | `marcoZero.circunferenciaInicial` |
| Baseline | `dadosClinicos.medidasIniciais.circunferenciaAbdominal` |
| Histórico | Sim, por semana em `evolucaoSeguimento` |
| Orientação de medição | **Inexistente** — nenhum landmark (umbigo, crista ilíaca etc.), nenhuma instrução de fita/respiração/roupa |
| Inconsistência de rótulo | Tela de sucesso do Marco Zero usa **"Cintura inicial"** |

Conclusão semântica: o campo representa circunferência abdominal (perímetro). A palavra “comprimento” não aparece como conceito de dados; se alguém a usar na linguagem informal, no código o significado é circunferência.

### B.3 Altura

| Aspecto | Detalhe |
|---|---|
| Campo | `dadosClinicos.medidasIniciais.altura` |
| Unidade | cm |
| Collection/doc | `pacientes_completos/{pacienteId}` |
| Origem | Anamnese `/meta` (chat) e/ou painel médico (`AnamneseMedidasIniciaisFields`) |
| Normalização | `utils/alturaInput.ts` — valores `< 3` tratados como metros → ×100 |
| Atualizável | Sim (médico/chat); **não** no dia da aplicação |
| Semana 1 | Preserva altura existente; não sobrescreve |
| Histórico | **Não** — valor único, sem `alturaMedidaEm` |
| Acessível na aplicação | Indiretamente (está no documento do paciente no backend), mas **não é lida nem exibida** no formulário de aplicação |

### B.4 IMC

| Aspecto | Detalhe |
|---|---|
| Persistido? | Sim, mas só em `dadosClinicos.medidasIniciais.imc` |
| Por aplicação? | **Não** — não existe `evolucaoSeguimento[].imc` |
| Fórmula | `peso_kg / (altura_cm/100)²` |
| Fonte canônica | `lib/meta/medidasIniciaisImc.ts` → `calcularImcFromPesoAlturaCm` (arredonda 2 casas) |
| Patch semana 1 | `medidasIniciaisSemana1FirestorePatch` (arredonda 1 casa) |
| Semanas ≥ 2 | Patch retorna `{}` — **IMC em `medidasIniciais` fica congelado** na semana 1 |
| Histórico derivado | `utils/metaHomeMetricEvolution.ts` recalcula série on-the-fly com altura fixa × pesos semanais |
| UI do dia da aplicação | IMC **não aparece** |

---

## C. Estrutura das fotos

### Captura

Componente: `components/aplicacao/AplicacaoFotosEvolucaoSection.tsx`

| Capacidade | Situação atual |
|---|---|
| Câmera | Sim — `input type="file" accept="image/*" capture="environment"` |
| Upload/galeria | Sim — inputs sem `capture` |
| Overlay / silhueta / grade | **Não** |
| Validação de pose/corpo inteiro | **Não** (só texto) |
| Padronização de distância/enquadramento | **Não** |
| Orientação textual | Frontal: "Fique de frente, com postura natural e corpo centralizado." / Perfil: "Fique de lado, mantendo o corpo inteiro visível no enquadramento." |
| Compressão/resize/EXIF no cliente | **Não** |

### Identificação

| Tipo UI | Campo `tipo` | Valores aceitos no backend |
|---|---|---|
| Foto frontal | `frontal` | exatamente `'frontal'` |
| Foto de perfil / lateral | `perfil` | exatamente `'perfil'` |

### Armazenamento

| Camada | Detalhe |
|---|---|
| Storage path | `patients/{pacienteId}/progress-photos/{applicationId}/{tipo}-{timestamp}-{random}.{ext}` |
| ACL | `fileRef.makePublic()` → URL pública permanente |
| URL | `https://storage.googleapis.com/{bucket}/{storagePath}` |
| Firestore | `pacientes_completos/{pacienteId}/progressPhotos/{autoId}` |
| Preferências | `.../progressPhotoPreferences/{applicationId}` (fluxo `/aplicacao`) e `.../global` (fluxo `/meta`) |

Campos do documento de foto:

- `id`, `applicationId`, `semana`, `dataAplicacao`
- `tipo` (`frontal` \| `perfil`)
- `url`, `storagePath`
- `compartilharComMedico` (default `true`)
- `visivelParaPaciente` (sempre `true`; **nunca lido** em nenhum ponto)
- `createdAt`, `origem` (`registro_aplicacao` \| `meta_aplicacoes`)

Endpoints:

- `GET/POST/DELETE /api/aplicacao/[token]/fotos`
- `POST /api/aplicacao/[token]/fotos/compartilhamento`
- Alternativo: `POST /api/meta/progress-photos`

Limites: 8 MB; MIME começa com `image/` (rota `/aplicacao`); allowlist mais estrita na rota `/meta`.

### Problema do `applicationId`

Como o link não grava `applicationId`, o fallback da rota `/aplicacao` é:

```text
app-{token.slice(0,12)}-{semana}-{dataAplicacao}
```

Já o fluxo `/meta` usa outro formato (`meta-semana-{semana}-{data}`), e o `checkInSemanalScore.applicationId` usa o **token inteiro**.

Consequência: **join confiável foto↔medida por `applicationId` não existe**. O join viável hoje é por `semana` (e `dataAplicacao` como apoio).

---

## D. Associação entre foto + peso + circunferência + altura + IMC

### O que já dá para montar por semana (sem mudar arquitetura)

```text
patientId          ← aplicacao_links.pacienteId / pacientes_completos.id
semana             ← weekIndex / progressPhotos.semana
date               ← dataRegistro / dataAplicacao (YYYY-MM-DD do link)
weightKg           ← evolucaoSeguimento[semana].peso
abdominalCircumferenceCm ← evolucaoSeguimento[semana].circunferenciaAbdominal?
heightCm           ← dadosClinicos.medidasIniciais.altura?   (não é daquela semana)
bmi                ← calculado: weightKg / (heightCm/100)²   (não persistido por semana)
frontPhotoUrl      ← progressPhotos where tipo=frontal AND semana=N
sidePhotoUrl       ← progressPhotos where tipo=perfil  AND semana=N
```

### O que **não** existe como snapshot nativo

- Documento único “BodyScanSnapshot” / “clinicalMoment”
- `applicationId` compartilhado entre medidas e fotos
- Altura medida naquele dia
- IMC persistido naquele dia
- Garantia de que fotos e medidas foram preenchidas no mesmo instante (fotos podem ser enviadas depois; medidas podem existir sem fotos e vice-versa)
- Nome do medicamento naquele registro

### Resposta direta

**Sim, a associação peso↔foto do mesmo momento clínico existe estruturalmente no nível da semana do tratamento**, desde que ambas tenham sido registradas para aquela semana.  
**Não** existe um `applicationId` único amarrando tudo; a chave prática é `semana` (+ `pacienteId`).

---

## E. Histórico disponível

Já é possível montar, **sem alterar a arquitetura**, uma timeline aproximada:

```text
Paciente X
  Semana 1 (Marco Zero)
    Data, Peso, Circ. abdominal?, Altura (fixada), IMC (derivado),
    Foto frontal?, Foto perfil?
  Semana 4
    ...
  Semana 8
    ...
```

Fontes:

1. `pacientes_completos.evolucaoSeguimento[]` — medidas por `weekIndex`
2. `pacientes_completos/{id}/progressPhotos` — fotos com `semana` / `dataAplicacao`
3. `dadosClinicos.medidasIniciais.altura` — altura única (reutilizada em todas as semanas)
4. IMC por semana — **derivado em runtime**, não lido de campo semanal

Infraestrutura UI já existente:

- Histórico de miniaturas no próprio `AplicacaoFotosEvolucaoSection`
- Carrossel profissional `ProgressPhotosCarouselModal` com filtro por semana
- Série de métricas `utils/metaHomeMetricEvolution.ts` (peso, circunferência, IMC)

Limitações do histórico para BodyScan:

- Semanas sem foto ou sem circunferência são comuns (ambos opcionais)
- Fotos de `/aplicacao` e `/meta` podem coexistir na mesma semana com `applicationId` diferente
- Não há modo nativo “antes × depois” alinhado
- Altura/IMC não têm versão temporal própria

---

## F. Infraestrutura Gemini disponível

### Stack

| Item | Situação |
|---|---|
| SDK `@google/generative-ai` / `@google-cloud/vertexai` | **Não instalado** |
| Integração | REST direto no Vertex AI `:generateContent` |
| Auth | `lib/gcp/googleVertexAuth.ts` (JWT service account, escopo `cloud-platform`) |
| Credenciais | `GOOGLE_VERTEX_CREDENTIALS_JSON` **ou** `GOOGLE_PROJECT_ID` + `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY` |
| Location | `VERTEX_AI_LOCATION` (default `us-central1`) |
| Modelo default | `gemini-2.5-flash` (`lib/gcp/geminiConfig.ts`) |

### Modelos por caso de uso (env)

- `GEMINI_MODEL_ID`
- `GEMINI_EXAME_LAB_MODEL_ID`
- `GEMINI_EXAME_IMAGEM_MODEL_ID`
- `GEMINI_BIO_IMPEDANCIA_MODEL_ID`
- `GEMINI_ANAMNESE_MODEL_ID`
- `GEMINI_LAUDO_OFTALMO_MODEL_ID`

### Serviços multimodais já em produção (imagem/PDF → JSON)

| Serviço | Arquivo | Padrão |
|---|---|---|
| Exame de imagem | `services/exameImagemGeminiService.ts` | `inline_data` base64 + prompt + `responseMimeType: application/json` |
| Bioimpedância | `services/bioImpedanciaGeminiService.ts` | idem (+ schema opcional por flag) |
| Exame laboratorial | `services/exameLaboratorialGeminiService.ts` | idem |
| Laudo oftalmológico | `services/laudoOftalmologicoGeminiService.ts` | idem |
| Chat dúvidas OftPay | `lib/oftpay/chatDuvidasImage.ts` + rota `chat-duvidas` | imagem |

### Capacidade futura para BodyScan

**Sim — a infraestrutura multimodal já existe** e pode, arquiteturalmente, receber:

```text
Foto frontal (inline_data)
+ Foto lateral (inline_data)
+ texto com dados antropométricos
        ↓
Vertex Gemini generateContent
        ↓
JSON estruturado
```

Camada genérica `lib/ia/callLLM.ts` é **somente texto** (e prefere OpenAI se houver chave) — **não** serve sozinha para BodyScan multimodal sem extensão.

Gap operacional: upload de fotos aceita até **8 MB**; serviços de IA tipicamente limitam ~**4,2–5 MB** e **não há resize** no pipeline de progress photos.

---

## G. Privacidade e permissões

### Consentimento existente

Texto na UI:

> "Permitir que minha equipe médica visualize minhas fotos"

| Aspecto | Detalhe |
|---|---|
| Campo | `compartilharComMedico` |
| Default | **true** (opt-out, não opt-in) |
| Persistência | em cada doc de `progressPhotos` + `progressPhotoPreferences` |
| Endpoint | `POST /api/aplicacao/[token]/fotos/compartilhamento` |
| Escopo `/aplicacao` | por `applicationId` |
| Escopo `/meta` | global (todas as fotos) |
| Versionamento de termo | **Não** |
| Auditoria de aceite | **Não** (diferente do padrão de recomendações) |

Texto ao paciente no Marco Zero: fotos “são privadas e servem **apenas** para acompanhar sua evolução”.

### Quem acessa hoje

| Ator | Acesso |
|---|---|
| Paciente (com token do link) | Vê/gerencia suas fotos via API `/aplicacao/.../fotos` |
| Médico (prontuário) | Lê fotos com `where('compartilharComMedico','==',true)` no client |
| Nutri / Personal | Mesmo padrão de mídia profissional onde aplicável; filtro por flag no código de UI, não como ACL forte |
| Qualquer um com a URL pública do GCS | Acesso ao arquivo, **sem auth**, porque `makePublic()` |

### Proteção real de backend

- `firestore.rules`: `progressPhotos` cai no fallback `/{document=**}` → `allow read, write: if request.auth != null` (qualquer autenticado).
- `storage.rules`: bloqueia paths gerais, mas **irrelevante** após `makePublic()` (ACL de objeto pública).
- Revogar consentimento **não** remove a ACL pública do arquivo; só altera o booleano no Firestore.
- Já existe padrão melhor no projeto: URLs assinadas (`app/api/aplicacao/video-signed-url/route.ts`) — **não** usado em progress photos.

### Consentimento para IA

**Não existe** flag/termo/campo para processamento automatizado das fotos por IA.

Avaliação arquitetural (sem implementar): o consentimento atual cobre visualização pela equipe médica; **não** parece abrangente o bastante para justificar envio das imagens ao Vertex/Gemini. Seria prudente, no futuro, um aceite **específico e granular** para análise corporal por IA, com versão de termo e registro de aceite (padrão similar a `consentimentos_recomendacoes`).

---

## H. Dados que já temos para o BodyScan

1. **Peso por semana** (obrigatório no dia da aplicação)
2. **Circunferência abdominal por semana** (quando informada)
3. **Fotos frontal e perfil** (quando enviadas), tipadas e com `semana`/`dataAplicacao`
4. **Altura do paciente** (quando preenchida na anamnese/cadastro)
5. **IMC calculável** a qualquer momento com peso da semana + altura fixa
6. **Data e número da semana** vindos do link de aplicação
7. **Dose (mg)** do dia
8. **Histórico longitudinal** de medidas + fotos agrupáveis por semana
9. **Infraestrutura Gemini multimodal** (Vertex REST, JSON estruturado, auth service account)
10. **Toggle de compartilhamento com equipe médica** (base de privacidade parcial)

---

## I. Dados que estão faltando

1. Snapshot clínico unificado (documento único do “momento BodyScan”)
2. `applicationId` canônico compartilhado entre medidas e fotos
3. Altura capturada/confirmada no dia da aplicação (e histórico de altura)
4. IMC persistido por semana
5. Nome do medicamento/protocolo no registro semanal
6. Padronização fotográfica (overlay, distância, pose, iluminação, vestimenta)
7. Orientação anatômica padronizada para medir a cintura
8. Validação clínica de outliers (peso/cintura)
9. Consentimento específico para análise por IA
10. Storage privado / URL assinada para fotos corporais
11. Garantia de par completo frontal+perfil no mesmo momento (hoje opcional e independente)
12. Resize/compressão alinhado aos limites dos serviços Gemini
13. Metadados de captura (EXIF, device, orientação) úteis para calibração

---

## J. Riscos ou inconsistências encontradas

1. **Join frágil:** formatos divergentes de `applicationId` entre `/aplicacao`, `/meta`, score e edição médica.
2. **Fotos públicas:** `makePublic()` + path com `pacienteId` em claro.
3. **Consentimento frágil:** revogação não remove acesso ao arquivo; rules Firestore permissivas.
4. **IMC congelado** após semana 1 em `medidasIniciais`.
5. **Semântica de cintura sem protocolo de medida** → ruído metodológico na série.
6. **Falsa precisão:** cintura com 2 casas no check-in; IMC com 1 ou 2 casas conforme o caminho.
7. **Marco Zero vs Check-in:** input texto vs `DigitalMeasurePicker` para os mesmos campos.
8. **Fotos e medidas desacopladas no tempo:** podem existir independentemente.
9. **Duplicidade de fotos na mesma semana** via rotas `/aplicacao` e `/meta`.
10. **Promessa de privacidade na UI** incompatível com ACL pública e com uso futuro em IA.
11. **Campo morto:** `visivelParaPaciente` gravado e nunca consumido.
12. **Limite 8 MB upload vs ~5 MB IA** sem pipeline de preparação de imagem.

---

## K. Arquitetura atual que pode ser reaproveitada

| Capacidade | Onde reaproveitar |
|---|---|
| Coleta semanal de peso/cintura | Fluxo `/aplicacao` + `evolucaoSeguimento` |
| Captura frontal/perfil | `AplicacaoFotosEvolucaoSection` + rotas de fotos |
| Agrupamento por semana | `weekIndex` / `progressPhotos.semana` + carrossel filtrado |
| Altura baseline | `dadosClinicos.medidasIniciais.altura` |
| Cálculo de IMC | `lib/meta/medidasIniciaisImc.ts` |
| Série temporal de métricas | `utils/metaHomeMetricEvolution.ts` |
| Chamada multimodal Gemini → JSON | `services/exameImagemGeminiService.ts` / `bioImpedanciaGeminiService.ts` |
| Auth Vertex | `lib/gcp/googleVertexAuth.ts` + `geminiConfig.ts` |
| Preferência de compartilhamento | `compartilharComMedico` + `progressPhotoPreferences` (base, não suficiente para IA) |
| URL assinada (padrão sensível) | `app/api/aplicacao/video-signed-url/route.ts` (referência) |
| Consentimento versionado (padrão) | `lib/meta/recomendacaoConsentConstants.ts` + subcoleção de consentimentos |

**Estratégia de snapshot viável hoje (somente leitura/composição):**

1. Carregar `pacientes_completos/{id}`
2. Selecionar `evolucaoSeguimento` onde `weekIndex === N`
3. Query `progressPhotos` do paciente; filtrar `semana === N`
4. Separar `tipo === 'frontal'` e `tipo === 'perfil'`
5. Ler `medidasIniciais.altura`
6. Calcular IMC com a fórmula canônica
7. Montar objeto temporal em memória para futuro BodyScan

---

## L. Arquivos relevantes encontrados

### Fluxo do paciente / aplicação

| Arquivo | Função |
|---|---|
| `app/aplicacao/[token]/page.tsx` | Página pública do dia da aplicação |
| `app/aplicacao/[token]/layout.tsx` | Layout da rota pública |
| `components/aplicacao/AplicacaoPageRouter.tsx` | Escolhe Marco Zero (semana 1) vs Check-in (≥ 2) |
| `components/aplicacao/AplicacaoMarcoZeroPageClient.tsx` | Formulário semana 1 |
| `components/aplicacao/AplicacaoCheckInPageClient.tsx` | Formulário semanas seguintes |
| `components/aplicacao/DigitalMeasurePicker.tsx` | Seletor digital de peso/circunferência (check-in) |
| `components/aplicacao/AplicacaoFotosEvolucaoSection.tsx` | Captura/histórico de fotos + toggle de compartilhamento |
| `lib/aplicacao/marcoZeroQuestions.ts` | Definição das perguntas do Marco Zero |
| `lib/aplicacao/checkInSemanalQuestions.ts` | Definição das perguntas do check-in |
| `lib/aplicacao/ensureAplicacaoPublicLink.ts` | Cria/reutiliza `aplicacao_links` |
| `lib/aplicacao/checkInSemanalFormUtils.ts` | Prefill/variações de medidas |
| `lib/aplicacao/pacienteComMedidasIniciaisAtualizadasPelaSemana1.ts` | Patch de baseline + IMC na semana 1 |
| `lib/aplicacao/salvarEdicaoAplicacaoMedico.ts` | Edição de aplicação pelo médico |
| `lib/aplicacao/salvarCheckInMedicoNoPaciente.ts` | Check-in preenchido pelo médico |

### APIs

| Arquivo | Função |
|---|---|
| `app/api/aplicacao/[token]/dados/route.ts` | Carrega dados do link/paciente para a UI |
| `app/api/aplicacao/[token]/atualizar/route.ts` | Salva peso, circunferência, check-in/marco zero |
| `app/api/aplicacao/[token]/fotos/route.ts` | GET/POST/DELETE das fotos de progresso |
| `app/api/aplicacao/[token]/fotos/compartilhamento/route.ts` | Atualiza `compartilharComMedico` |
| `app/api/meta/progress-photos/route.ts` | Upload alternativo de fotos via `/meta` |
| `app/api/aplicacao/video-signed-url/route.ts` | Referência de URL assinada (vídeo; não fotos) |

### Tipos / domínio clínico

| Arquivo | Função |
|---|---|
| `types/obesidade.ts` | `DadosClinicos`, `MedidasIniciais`, `SeguimentoSemanal`, `MarcoZero`, etc. |
| `lib/meta/medidasIniciaisImc.ts` | Cálculo canônico de IMC |
| `utils/alturaInput.ts` | Normalização altura m/cm |
| `utils/metaHomeMetricEvolution.ts` | Séries de peso/circunferência/IMC ao longo do tempo |
| `utils/evolucaoAplicacaoHelpers.ts` | Helpers de variação de peso entre registros |

### Fotos / prontuário profissional

| Arquivo | Função |
|---|---|
| `components/progressPhotos/ProgressPhotosCarouselModal.tsx` | Carrossel de fotos com filtro por semana |
| `app/metaadmin/components/paciente-modal/prontuario/prontuarioEventosLoader.ts` | Carrega fotos compartilhadas no prontuário |
| `app/metaadmin/components/paciente-modal/prontuario/ProntuarioTab.tsx` | UI do prontuário com eventos de imagem |
| `components/profissional/pacienteMediaQuickActions.tsx` | Ações rápidas de mídia (filtra por consentimento) |
| `app/meta/page.tsx` | Área do paciente com histórico/paginação de fotos |

### Gemini / Vertex

| Arquivo | Função |
|---|---|
| `lib/gcp/googleVertexAuth.ts` | Credenciais e token OAuth Vertex |
| `lib/gcp/geminiConfig.ts` | Default e resolução de model IDs |
| `services/exameImagemGeminiService.ts` | Multimodal imagem/PDF → JSON (melhor template) |
| `services/bioImpedanciaGeminiService.ts` | Multimodal bioimpedância → JSON |
| `services/exameLaboratorialGeminiService.ts` | Multimodal lab → JSON |
| `services/laudoOftalmologicoGeminiService.ts` | Multimodal laudo → JSON |
| `services/anamneseInteligenciaGeminiService.ts` | Gemini para anamnese (texto) |
| `services/chatNutriGeminiService.ts` | Gemini chat nutri |
| `lib/ia/callLLM.ts` | Camada LLM genérica **texto** (OpenAI/Gemini) |
| `lib/oftpay/extractGeminiJson.ts` | Parsing tolerante de JSON do Gemini |
| `lib/chatnutri/safeParseGeminiJson.ts` | Parsing seguro de JSON |

### Privacidade / regras

| Arquivo | Função |
|---|---|
| `firestore.rules` | Regras Firestore (fallback amplo afeta `progressPhotos`) |
| `storage.rules` | Regras Storage (bypassadas por `makePublic`) |
| `lib/meta/recomendacaoConsentConstants.ts` | Padrão de consentimento versionado (referência para futuro aceite de IA) |

---

## Conclusão executiva

No dia da aplicação, a Oftware **já coleta** peso (obrigatório), circunferência abdominal (opcional) e fotos frontal/perfil (opcionais), amarrados à **semana** e à **data do link**. A altura existe no cadastro/anamnese e permite calcular IMC, mas **não faz parte do formulário da aplicação** e o IMC **não é versionado por semana**.

É possível, **hoje**, reunir programaticamente um snapshot temporal aproximado por `pacienteId + semana`, juntando `evolucaoSeguimento` + `progressPhotos` + altura de `medidasIniciais`.  
O que **não** existe ainda é um snapshot canônico único, um `applicationId` compartilhado, padronização fotográfica/de medida, storage privado e consentimento específico para análise por IA — embora a **infraestrutura Gemini multimodal** para receber imagens + dados e devolver JSON **já esteja disponível** no projeto.

---

*Fim da auditoria. Nenhuma alteração de sistema foi realizada.*
