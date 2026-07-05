# ETAPA 03 - Paginacao e limites progressivos

## 1) Arquivos alterados

- `app/metaadmin/components/paciente-modal/prontuario/prontuarioService.ts`
- `app/metaadmin/components/paciente-modal/prontuario/ProntuarioTab.tsx`
- `app/meta/page.tsx`
- `components/NutriContent.tsx`
- `services/userService.ts`
- `app/metaadmingeral/page.tsx`

---

## 2) Listagens que receberam `limit()`

- **Prontuario / Timeline**
  - `prontuarioService`: listagem inicial de eventos ativos com `limit(30)` (parametrizavel).
  - `ProntuarioTab`: fotos de progresso no modal limitadas para `30`.
  - `ProntuarioTab`: solicitacoes de exames limitadas para `30`.

- **Fotos / progressPhotos**
  - `app/meta/page.tsx`: carregamento inicial de `progressPhotos` com `orderBy('createdAt', 'desc') + limit(30)`.

- **Check-ins / NutriContent**
  - `components/NutriContent.tsx`: carregamento inicial de check-ins com `orderBy('timestamp', 'desc') + limit(60)`.

- **Admin / userService**
  - `getAllResidentes`, `getAllLocais`, `getAllServicos`, `getAllEscalas`, `getAllTrocas`, `getAllFerias` passaram a ter leitura limitada (padrao interno de 200, max 500).
  - `getTrocasPendentes(limitCount)` com `limit`.
  - `getFeriasPendentes(limitCount)` com `limit`.

---

## 3) Listagens que receberam paginacao com cursor

- **Timeline do prontuario**
  - `prontuarioService`:
    - Nova funcao `listarEventosProntuarioPaginado(...)`
    - Usa `where('ativo','==',true) + orderBy('criadoEm','desc') + orderBy(documentId(),'desc') + limit(...)`
    - Cursor por `startAfter(Timestamp, documentId)`
  - `ProntuarioTab`:
    - estado de cursor + `temMaisTimeline`
    - acao de `Carregar mais` na timeline (desktop e mobile)

- **Fotos progressPhotos em /meta**
  - `app/meta/page.tsx`:
    - cursor com `QueryDocumentSnapshot`
    - `startAfter(cursor)` para buscar proximas fotos
    - botao discreto `Carregar mais fotos`

- **Check-ins em NutriContent**
  - `components/NutriContent.tsx`:
    - cursor para check-ins
    - `startAfter(cursor)` para check-ins antigos
    - botao discreto `Carregar check-ins antigos`

---

## 4) Locais com lazy loading aplicado

- **ProntuarioTab**
  - Eventos da timeline continuam carregados na abertura da aba, porem em pagina inicial curta.
  - Historico adicional somente sob demanda (`Carregar mais`).

- **Meta / progressPhotos**
  - Carrega somente primeira pagina de fotos.
  - Historico completo apenas quando o usuario pede mais.

- **NutriContent / Historico**
  - Carrega primeira pagina de check-ins.
  - Check-ins antigos somente sob demanda.

---

## 5) Índices Firestore necessários

1. `pacientes/{pacienteId}/timeline`
   - `ativo ASC, criadoEm DESC, __name__ DESC`
   - Necessario para:
     - `where('ativo','==',true)`
     - `orderBy('criadoEm','desc')`
     - `orderBy(documentId(),'desc')`
     - `startAfter(...)`

2. `pacientes_completos/{pacienteId}/progressPhotos`
   - `createdAt DESC`
   - Necessario para paginação por `createdAt`.

3. `pacientes_completos/{pacienteId}/solicitacoesExames`
   - `criadoEm DESC`
   - Necessario para ordenacao + limite.

4. `pacientes_completos/{pacienteId}/nutricao/dados/checkins`
   - `timestamp DESC`
   - Necessario para ordenacao + cursor.

5. `trocas`
   - `status ASC, createdAt DESC`
   - Necessario para `getTrocasPendentes`.

6. `ferias`
   - `status ASC, createdAt DESC`
   - Necessario para `getFeriasPendentes`.

> Se algum índice faltar em ambiente, manter query otimizada e criar índice; nao retornar a full-scan.

---

## 6) Pontos mantidos sem paginacao (por risco funcional)

- `handleAtualizarCompartilhamentoFotos` em `app/meta/page.tsx` ainda precisa percorrer fotos existentes para aplicar compartilhamento global de forma consistente (comportamento funcional preservado).
- Listagens administrativas em `metaadmingeral` ainda carregam conjunto inicial amplo (agora limitado), sem fluxo completo de "carregar mais" em todas as grades para evitar risco de regressao visual/operacional nesta etapa.
- Alguns services antigos continuam expostos por compatibilidade; a estrategia foi limitar consultas sem quebrar chamadas existentes.

---

## 7) Estimativa qualitativa de economia

- **Reads**
  - Queda alta em abertura de prontuario/timeline de pacientes antigos.
  - Queda alta em historico de fotos e check-ins (antes full load).
  - Queda media/alta em telas admin por limites iniciais.

- **Egress**
  - Queda relevante em modais/telas com historico longo (menos documentos por primeira carga).
  - Queda progressiva com uso de cursores.

- **Latencia**
  - Melhora perceptivel na primeira renderizacao de prontuario, aba aplicacoes e historico nutri.
  - Menos bloqueio de UI por processamento de arrays grandes.

- **Custo por abertura de modal/tela**
  - Prontuario: de potencialmente "todos os eventos/fotos/solicitacoes" para lote inicial controlado.
  - /meta aplicacoes: de todas as fotos para pagina inicial.
  - historico check-ins: de carga completa para carga incremental.

---

## Checklist final (ETAPA 03)

- [x] Nenhum layout foi alterado.
- [x] Nenhum componente visual foi redesenhado.
- [x] Nenhuma rota foi renomeada.
- [x] Nenhuma funcionalidade foi removida.
- [x] Nenhuma regra clinica foi alterada.
- [x] Nenhuma migracao de banco foi feita.
- [x] Apenas paginacao/limites/lazy loading foram adicionados.
