# Plano: MetaAdmin Geral como base de exames laboratoriais

Objetivo: o **MetaAdmin Geral** ser a fonte operacional para **o que pode ser solicitado**, **limites de referência** e **agrupamento por sistema**, com fallback versionado no repositório quando o Firestore não estiver disponível.

---

## Estado atual (resumo)

| Aspecto | Hoje |
|--------|------|
| **Sistema (agrupamento)** | Firestore `platformSettings/labExames.labOrderBySection` — usado em **metaadmin** e **metanutri**. **`/meta` e metapersonal** ainda usam listas fixas no código. |
| **Limites / overrides** | Firestore `labLimitOverrides` + JSON `data/limites_exames_atual_v2_idade.json`. **metaadmin, metanutri, `/meta`** aplicam overrides; **metapersonal, PDFs, relatório token** ainda só JSON. |
| **Catálogo de chaves** | Validado contra `labOrderBySection` em código (`getExpectedLabExamKeys`) — novos exames exigem deploy ou extensão do modelo. |
| **Solicitação de exames** | Listas/modais no app costumam seguir a **ordem dinâmica** onde já integrado; tipos “solicitáveis” não estão 100% centralizados no Admin Geral. |

---

## Fases propostas

### Fase 1 — Paridade de leitura (curto prazo)

1. **metapersonal** (`page.v2.tsx`): `useLabOrderBySection` + `getLabRange(..., labLimitOverrides)`; opcionalmente montar UI de exames a partir de `labOrderBySecaoConfig` + mapa chave→campo (igual metaadmin).
2. **`/meta`**: trocar `todosOsCampos` estático por iteração em `labOrderBySecaoConfig` + mapa chave→campo compartilhado.
3. **PDFs / relatórios** (`gerarRelatorioPDF`, `relatorioPacientePdf`, `relatorio/[token]`): obter `labLimitOverrides` via `GET /api/lab-exames-config` (server) ou payload injetado na geração, e passar ao `getLabRange`.

**Critério de pronto:** todo lugar que mostra barra de referência laboratorial usa a mesma combinação JSON + Firestore que o Admin Geral edita.

### Fase 2 — Solicitação alinhada ao Admin Geral

1. Definir no Firestore (ou reutilizar `labOrderBySection`) quais chaves entram em **“exames solicitáveis”** por contexto (médico, nutri, personal), se precisar diferenciar.
2. Modais/listas “solicitar exames” passam a derivar opções **apenas** das chaves presentes na config publicada (`lab-exames-config` + validação).
3. Documentar regra: chave fora do catálogo validado → não aparece ou exige deploy para incluir no código/validador.

**Critério de pronto:** não há segunda lista “mágica” de exames para solicitação desconectada do que o Admin Geral ordena.

### Fase 3 — Definições além de override (médio prazo, opcional)

Hoje o **texto institucional** (labels/unidades por faixa) nasce no JSON. Para o Admin Geral **substituir** isso sem deploy:

1. Modelo Firestore estendido (ex.: `labExamDefinitions` por chave) ou evolução de `labLimitOverrides` para campos completos por sexo/faixa.
2. `getLabRange` (ou camada acima) prioriza Firestore quando o documento existir; senão JSON.
3. Migração/ferramenta para exportar JSON → Firestore na primeira carga.

**Critério de pronto:** alterar label/unidade/faixa **só** pelo Admin Geral, sem commit no repo.

### Fase 4 — Governança e segurança

1. Lista de e-mails ou claims autorizados a `PUT /api/metaadmingeral/lab-exames` (variável de ambiente).
2. Auditoria: `updatedBy`, histórico opcional de revisões.
3. Ambiente de **staging** com Firestore separado para testar ordem/limites antes de produção.

---

## Riscos e mitigação

- **Cache / CDN:** `lab-exames-config` já é `force-dynamic`; clientes usam `cache: 'no-store'` no hook — manter após mudanças.
- **Consistência PDF vs app:** Fase 1 deve incluir todos os geradores de PDF que chamam `getLabRange`.
- **Chaves novas:** até a Fase 3, incluir exame novo continua exigindo JSON + `labOrderBySection` no código para validação; documentar no Admin.

---

## Ordem sugerida de implementação

1. metapersonal + overrides (+ ordem dinâmica se desejado).  
2. `/meta` ordem dinâmica.  
3. PDFs e página de relatório por token.  
4. (Opcional) flags de “solicitável” por módulo.  
5. (Opcional) definições completas no Firestore.

Este plano pode ser executado incrementalmente; cada fase entrega valor sem bloquear a seguinte.
