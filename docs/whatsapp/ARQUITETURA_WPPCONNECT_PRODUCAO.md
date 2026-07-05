# Arquitetura WPPConnect — Análise para Produção (Etapa 4.1)

**Tipo:** documento de arquitetura / decisão técnica  
**Data:** Etapa 4.1 — revisão pré-deploy  
**Escopo:** análise apenas. Nenhuma implementação, deploy ou alteração de código.  
**Objetivo:** decidir a arquitetura correta antes do primeiro deploy do servidor central `https://whatsapp.oftware.com.br`.

---

## Sumário executivo

O WPPConnect Server **não é um serviço stateless**. Cada sessão WhatsApp é um **processo Chromium completo** com perfil em disco (`userDataDir`) e metadados de token. A configuração atual da Oftware (`tokenStoreType: 'file'`, `customUserDataDir: './userDataDir/'`) grava tudo no **filesystem local do container**.

**Conclusão crítica:** fazer o primeiro deploy no Cloud Run **sem volume persistente** (como está preparado hoje) **vai funcionar para conectar e testar**, mas **qualquer deploy, restart ou troca de instância apagará todas as sessões** — médicos precisarão escanear QR novamente.

**Recomendação única (final deste documento):** adotar **Compute Engine (VM) com disco persistente** como hospedagem do WPPConnect central na fase piloto e nos primeiros centenas de médicos, usando o **mesmo Dockerfile** já versionado, com domínio `whatsapp.oftware.com.br` via HTTPS Load Balancer. Reservar Cloud Run para uma fase posterior **somente** se houver NFS (Filestore) + sharding explícito — não como primeiro deploy em produção.

**Etapa 4.2 (implementada):** infra em [`infra/whatsapp/vm/`](../../infra/whatsapp/vm/) — VM + Persistent Disk + **imagem oficial** `wppconnect/wppconnect-server` (sem compilar repo na VM). Ver `config.runtime.js` para config Oftware.

**Revisão Docker (4.2):** abandonado build `git clone + npm ci` (sem lockfile npm, husky, tsc). VM usa `docker compose pull` + mount de config/volumes.

---

## Contexto Oftware (white label)

| Elemento | Comportamento |
|----------|---------------|
| Organizações | Domínio e `/metaadmin` próprios (`www.ometodoemagrecer.com.br`, `www.clinicax.com.br`, etc.) |
| Servidor WhatsApp | **Único e central** — `https://whatsapp.oftware.com.br` |
| Isolamento | `sessionId = org_{organizationId}_doctor_{doctorId}` (fallback: `doctor_{doctorId}`) |
| Oftware (Vercel) | Orquestra conexão; Firestore `whatsappConnections`; não hospeda Chromium |
| Escopo atual | Conectar, QR, status, desconectar — **sem** mensagens, CRM, contatos |

O servidor central **não significa WhatsApp compartilhado**. Cada médico escaneia o **próprio** número. A Oftware hospeda apenas o **motor de sessão**.

---

## 1. Como o WPPConnect armazena sessões

### 1.1 Duas camadas de persistência (oficial)

Analisando o código-fonte do `wppconnect-server` (`createSessionUtil.ts`, `tokenStore/factory.ts`), uma sessão usa **dois mecanismos distintos**:

#### Camada A — Token Store (`tokenStoreType`)

Controlado por `config.tokenStoreType`. Valores oficiais suportados no servidor:

| Valor | Implementação |
|-------|---------------|
| `file` (padrão) | `FileTokenStore` → arquivos em `./tokens/` |
| `mongodb` | `MongodbTokenStore` → coleção MongoDB |
| `redis` | `RedisTokenStore` → chaves Redis |

A interface `TokenStore` da biblioteca `@wppconnect-team/wppconnect` define: `getToken`, `setToken`, `removeToken`, `listTokens`. Armazena **metadados da sessão** (config, webhook, estado serializado) — **não** substitui o perfil completo do Chrome.

#### Camada B — `customUserDataDir` (crítica)

Quando `customUserDataDir` está definido (hoje: `'./userDataDir/'`), o servidor monta:

```
puppeteerOptions.userDataDir = customUserDataDir + sessionName
```

Exemplo Oftware:

```
./userDataDir/org_metodo_doctor_abc123/
```

Esta pasta contém o **perfil Chromium/WhatsApp Web** — cookies, IndexedDB, cache de autenticação Multi-Device. Os mantenedores oficiais confirmam em issues do GitHub ([#342](https://github.com/wppconnect-team/wppconnect-server/issues/342), [wppconnect#1791](https://github.com/wppconnect-team/wppconnect/issues/1791)):

> *"A sessão do WhatsApp teoricamente é recuperada dessa pasta userDataDir."*  
> *"É necessário deixá-la sempre salva, pois é ali que ficam a maior parte dos dados da sessão."*

**Implicação:** mesmo com MongoDB/Redis para tokens, **`customUserDataDir` ainda precisa de disco persistente** para evitar novo QR após restart.

### 1.2 Configuração atual Oftware (`tokenStoreType: 'file'`)

Com a config preparada em `infra/whatsapp/wppconnect/config.ts`:

| Artefato | Localização | Conteúdo |
|----------|-------------|----------|
| Tokens | `./tokens/{sessionSanitized}.data.json` | JSON com config + metadados WPPConnect |
| Perfil Chrome | `./userDataDir/{sessionId}/` | Perfil Puppeteer completo por sessão |
| Estado em RAM | `clientsArray[session]` | Cliente WPPConnect ativo, QR em memória, listeners |

`startAllSession: false` na config Oftware → ao reiniciar o processo, **sessões não reabrem automaticamente**; é preciso chamar `start-session` por sessão ou habilitar `startAllSession: true` (com ressalvas de estabilidade documentadas em issues).

### 1.3 Vantagens do `file`

| Vantagem | Detalhe |
|----------|---------|
| Simplicidade | Zero dependência externa |
| Debug fácil | Arquivos inspecionáveis no disco |
| Padrão upstream | Config default do repositório oficial |
| Latência | Leitura/escrita local, sem rede |

### 1.4 Limitações do `file`

| Limitação | Detalhe |
|-----------|---------|
| Não escala horizontalmente | Cada réplica tem seu próprio disco; sessão na instância A não existe na B |
| Incompatível com filesystem efêmero | Cloud Run/container restart = perda total |
| Backup manual | Requer snapshots ou rsync; arquivos podem estar em uso pelo Chrome |
| Permissões | Container precisa write access consistente no path |
| Concorrência | Dois processos não devem montar o mesmo `userDataDir` simultaneamente |

---

## 2. Cloud Run — análise técnica

### 2.1 Cloud Run é indicado para WPPConnect?

**Resposta curta:** como **primeiro deploy em produção com a config atual (disco local, sem volume), não.**  
**Com ressalvas:** pode ser usado em **piloto controlado** ou em produção **somente** com: volume NFS (Filestore), `min-instances ≥ 1`, `max-instances = 1` (inicialmente), CPU always allocated, e aceitação de limitações de escala.

### 2.2 Como funciona o filesystem no Cloud Run

| Tipo | Comportamento |
|------|---------------|
| **Filesystem do container** | Efêmero — existe apenas enquanto a instância vive |
| **Ephemeral disk** (Gen2) | Maior que `/tmp`, mas **apagado no shutdown da instância** |
| **Cloud Storage volume** | Montagem via FUSE; latência alta; **inadequado** para perfil Chrome ativo |
| **NFS / Filestore** | POSIX compartilhado; **adequado** para `userDataDir` e `tokens/` |

Documentação Google Cloud ([ephemeral disk](https://cloud.google.com/run/docs/configuring/services/ephemeral-disk)):

> *"All data is permanently deleted when the instance shuts down."*

### 2.3 O `userDataDir` sobrevive no Cloud Run?

| Evento | Sem volume persistente | Com NFS/Filestore montado em `/data` |
|--------|------------------------|--------------------------------------|
| Request HTTP normal | Sim (mesma instância) | Sim |
| Restart do container | **Não** | Sim (dados no NFS) |
| Novo deploy (nova revision) | **Não** | Sim, se mount configurado na revision |
| Troca de instância (autoscale) | **Não** — sessão está na outra instância | Parcial — dados no NFS, mas processo Chromium na instância antiga morre |
| `max-instances: 1` | Uma instância; ainda perde em deploy | Melhor cenário Cloud Run |
| `max-instances > 1` | **Quebra** — sessão presa à instância que criou o browser | Requer roteamento por sessão (não nativo no Cloud Run) |

### 2.4 O que acontece em cada cenário

#### Deploy (nova revision)

Cloud Run substitui instâncias gradualmente. O container antigo recebe `SIGTERM` (10s grace). Processos Chromium são encerrados. **Sem NFS: todos os `userDataDir` locais são perdidos.**

#### Reinício do container

Crash, OOM, manutenção GCP → mesma perda.

#### Troca de instância / autoscaling

`clientsArray` é memória local. Mesmo com tokens no NFS, a instância B não tem o browser aberto. É preciso `start-session` + `startAllSession` para reidratar — pode funcionar **se** `userDataDir` no NFS estiver íntegro.

#### Autoscaling com `max-instances > 1`

**Risco alto.** Doctor A cria sessão na instância 1. Próximo `status-session` pode ir para instância 2 → status `disconnected` / QR novamente. Cloud Run **não oferece session affinity** HTTP por `sessionId`.

### 2.5 Risco de perder todas as sessões?

| Cenário | Risco |
|---------|-------|
| Deploy atual (file local, Cloud Run) | **100%** em todo deploy/restart |
| Cloud Run + min-instances=1, sem volume | **Alto** — sobrevive entre requests, morre no deploy |
| Cloud Run + Filestore + max-instances=1 | **Médio** — dados persistem; reidratação após restart requer `startAllSession` ou chamadas API |
| VM + disco persistente | **Baixo** — padrão da indústria para este workload |
| WhatsApp invalida sessão (logout no celular, ban, inatividade) | **Sempre possível** — independente da infra |

---

## 3. Armazenamento alternativo oficial

### 3.1 O que o WPPConnect Server suporta nativamente

Fonte: `src/config.ts` e `src/util/tokenStore/factory.ts` do repositório oficial.

| Store | Suporte | Config |
|-------|---------|--------|
| **file** | ✅ Oficial, maduro | `tokenStoreType: 'file'` |
| **mongodb** | ✅ Oficial | `tokenStoreType: 'mongodb'` + bloco `db.*` |
| **redis** | ✅ Oficial | `tokenStoreType: 'redis'` + bloco `db.*` |
| **PostgreSQL** | ❌ Não nativo | Exigiria `TokenStore` custom |
| **Firestore** | ❌ Não nativo | Exigiria implementação custom na lib |
| **Cloud Storage / S3** | ❌ Para tokens | Existe `aws_s3` apenas para **upload de mídia** em webhooks, não para sessão |
| **TokenStore custom** | ✅ Na lib `@wppconnect-team/wppconnect` | Interface documentada; não no server sem fork |

### 3.2 MongoDB

| Aspecto | Avaliação |
|---------|-----------|
| **O que resolve** | Tokens/metadados centralizados; múltiplas réplicas leem o mesmo token |
| **O que NÃO resolve** | `userDataDir` — Chromium ainda precisa de disco POSIX |
| **Maturidade** | Média — usado em produção por comunidade; menos exemplos que `file` |
| **Vantagens** | Backup, réplicas, listagem de sessões |
| **Desvantagens** | +1 serviço; latência; issues históricas de reconexão ([#2206](https://github.com/wppconnect-team/wppconnect-server/issues/2206)) |

### 3.3 Redis

| Aspecto | Avaliação |
|---------|-----------|
| **O que resolve** | Tokens em memória persistente (AOF/RDB) |
| **O que NÃO resolve** | `userDataDir` |
| **Maturidade** | Média — interface documentada na lib WPPConnect |
| **Vantagens** | Rápido; Memorystore gerenciado no GCP |
| **Desvantagens** | Volátil se mal configurado; mesmo problema de userDataDir |

### 3.4 Conclusão sobre stores

**Trocar `file` por MongoDB/Redis melhora metadados, mas não elimina a necessidade de disco persistente para `userDataDir`.** Para Oftware, a decisão de storage é:

1. **Disco persistente** (obrigatório) — PD em VM, ou Filestore em Cloud Run  
2. **Token store** (secundário) — `file` no mesmo volume é suficiente na fase inicial; Redis/MongoDB quando houver sharding multi-nó

---

## 4. Como operam deployments em escala

### 4.1 Padrão da indústria (APIs WhatsApp não-oficiais)

Empresas com centenas/milhares de sessões (BSPs, CRMs, plataformas de atendimento) **não** usam serverless efêmero. Padrões recorrentes:

| Padrão | Descrição |
|--------|-----------|
| **VM / bare metal + Docker** | 1 processo WPPConnect (ou similar) por host; disco local SSD |
| **Sharding por sessão** | `hash(sessionId) % N` → N servidores dedicados; router na API |
| **Worker dedicado por sessão** | Micro-VM ou container com 1 sessão (caro, máximo isolamento) |
| **Fila + workers** | Mensagens em fila (Etapa futura); sessões em workers stateful |
| **API oficial (Meta Cloud API)** | Alternativa para envio em escala; custo por conversa; sem QR por sessão web |

### 4.2 Recursos por sessão (dados da comunidade WPPConnect)

PR [#2434](https://github.com/wppconnect-team/wppconnect-server/pull/2434) e issues de memória documentam:

| Métrica | Faixa típica |
|---------|--------------|
| RAM por sessão ativa | **400 MB – 1,35 GB** (média ~1 GB) |
| CPU por sessão | ~3–5% em host moderno |
| Processos Chrome | Vários por sessão (main + renderer + GPU) |
| Sessões em 16 GB RAM | ~10–15 (com margem de segurança) |
| Sessões em 32 GB RAM | ~20–30 |

**Centenas de médicos conectados simultaneamente** → dezenas de GB de RAM → **cluster sharded**, não um único container.

### 4.3 O que NÃO fazem em escala

- Serverless com filesystem efêmero  
- Autoscale horizontal sem afinidade de sessão  
- Um único pod Cloud Run com `max-instances: 1` para 200+ sessões (impossível por memória)

---

## 5. Cloud Run — configuração recomendada (se usado)

Se a Oftware optar por Cloud Run **apesar das ressalvas**, configuração mínima viável:

| Parâmetro | Valor | Motivo |
|-----------|-------|--------|
| `min-instances` | `1` | Evitar cold start; manter processo vivo |
| `max-instances` | `1` (inicial) | Evitar sessão em instância errada |
| `cpu-throttling` | `false` (`--no-cpu-throttling`) | Chromium precisa de CPU entre requests |
| Billing | Instance-based | CPU always allocated |
| `memory` | `2Gi` mínimo; `4Gi` para 2–3 sessões de teste | 1 GB/sessão |
| `cpu` | `2` se >1 sessão | Puppeteer é CPU-bound no sync |
| `timeout` | `300s` | Start-session pode demorar |
| `execution-environment` | `gen2` | Ephemeral disk maior; volume mounts |
| **Volume NFS** | Filestore Basic 1TB montado em `/data` | `customUserDataDir: '/data/userDataDir/'`, `tokens: '/data/tokens/'` |
| `startAllSession` | `true` após validação | Reabrir sessões após restart (testar estabilidade) |

**Sem volume NFS, nenhuma outra configuração compensa a perda de sessão no deploy.**

---

## 6. Comparativo de plataformas

### 6.1 Cloud Run

| | |
|--|--|
| **Vantagens** | Gerenciado, HTTPS nativo, integração GCP, deploy do Dockerfile existente |
| **Desvantagens** | Stateful-hostile; NFS obrigatório; `max-instances=1` limita escala; custo com min-instances + Filestore |
| **Custo estimado** | ~US$ 50–120/mês (min-instances 2Gi + Filestore + tráfego) |
| **Escala** | Vertical na mesma instância; horizontal exige sharding de serviços |
| **Operação** | Baixa — mas armadilhas de persistência |

### 6.2 GKE (Kubernetes)

| | |
|--|--|
| **Vantagens** | StatefulSets, PVC, sharding, probes, rolling update controlado |
| **Desvantagens** | Alta complexidade operacional; custo de cluster; overkill para <50 sessões |
| **Custo** | US$ 150+/mês (Autopilot + PVCs) |
| **Escala** | Excelente com design correto |
| **Operação** | Alta — requer equipe K8s |

### 6.3 Compute Engine (VM)

| | |
|--|--|
| **Vantagens** | Disco persistente nativo; CPU sempre on; previsível; simples com Docker Compose; melhor custo/sessão até ~30 médicos |
| **Desvantagens** | Você gerencia SO, patches, failover manual |
| **Custo** | e2-standard-4 + 100GB SSD ≈ US$ 80–110/mês |
| **Escala** | Vertical + múltiplas VMs sharded |
| **Operação** | Média — familiar para maioria das equipes |

### 6.4 VPS (Hetzner, DigitalOcean)

| | |
|--|--|
| **Vantagens** | Menor custo (Hetzner CPX41 ~€20/mês); disco incluído; ótimo para piloto |
| **Desvantagens** | Fora do ecossistema GCP; latência Brasil se região EUA/EU |
| **Custo** | US$ 20–60/mês |
| **Escala** | Igual VM — sharding manual |
| **Operação** | Média |

### 6.5 Railway / Render

| | |
|--|--|
| **Vantagens** | Deploy rápido; bom para POC 1–3 médicos |
| **Desvantagens** | Disco efêmero ou volume limitado; reinícios frequentes; caro em always-on |
| **Custo** | US$ 20–80/mês (always-on) |
| **Escala** | Ruim para centenas |
| **Operação** | Baixa |

### 6.6 Tabela resumo

| Plataforma | Piloto 1–5 médicos | Produção 50+ médicos | Persistência | Recomendação Oftware |
|------------|-------------------|----------------------|--------------|----------------------|
| Cloud Run (sem volume) | ⚠️ Teste apenas | ❌ | ❌ | Não |
| Cloud Run + Filestore | ✅ | ⚠️ Limitado | ✅ | Possível fase 2 |
| VM GCP / VPS | ✅ | ✅ (com sharding) | ✅ | **✅ Fase piloto/produção** |
| GKE | ⚠️ Overkill | ✅ | ✅ | Fase 3+ |
| Railway/Render | ✅ POC | ❌ | ⚠️ | Só validação rápida |

---

## 7. Arquitetura proposta para a Oftware

### 7.1 Princípios

1. **WPPConnect central** — um endpoint `whatsapp.oftware.com.br` para todas as orgs white label  
2. **Isolamento lógico** — `sessionId` com org + médico; Firestore `whatsappConnections` por `doctorId`  
3. **Stateful workers** — Chromium nunca em serverless efêmero  
4. **Sharding progressivo** — começar com 1 nó; escalar horizontalmente por VM  
5. **Oftware API como router** — futuro: escolher shard por `doctorId`  
6. **Sem mensagens até infra estável** — Etapa 4.x só conexão

### 7.2 Arquitetura alvo (recomendada)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ORGANIZAÇÕES WHITE LABEL                              │
│  www.org-a.com.br/metaadmin    www.org-b.com.br/metaadmin    ...             │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     OFTWARE — Vercel (por organização)                       │
│  /api/metaadmin/whatsapp/start-session | status | disconnect                 │
│  Firestore: whatsappConnections/{doctorId}                                   │
│  sessionId: org_{orgId}_doctor_{doctorId}                                    │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ Bearer WPP_SERVER_TOKEN
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              HTTPS Load Balancer — whatsapp.oftware.com.br                   │
│              (Cloud Armor: rate limit, IP allowlist opcional)                  │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
          ┌─────────────────────┴─────────────────────┐
          │  FASE 1: 1 VM (Compute Engine)             │  FASE 3: N VMs sharded
          ▼                                            ▼
┌──────────────────────────────┐          ┌──────────────────────────────┐
│  oftware-wpp-node-01         │          │  oftware-wpp-node-0N         │
│  Docker: wppconnect-server   │   ...    │  Docker: wppconnect-server   │
│  /data/userDataDir/{session} │          │  /data/userDataDir/{session} │
│  /data/tokens/               │          │  /data/tokens/               │
│  Persistent Disk 100–200GB   │          │  PD + snapshot diário        │
└──────────────────────────────┘          └──────────────────────────────┘
          │                                            │
          └────────────────────┬───────────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │  GCS Bucket         │
                    │  backups/ snapshots │  (backup offline, não runtime)
                    └─────────────────────┘
```

### 7.3 Capacidade estimada (fase 1 — 1 VM)

| VM | RAM | Sessões simultâneas (conservador) | Médicos totais na plataforma* |
|----|-----|-----------------------------------|-------------------------------|
| e2-standard-2 | 8 GB | 5–7 | Dezenas (nem todos conectados ao mesmo tempo) |
| e2-standard-4 | 16 GB | 10–15 | ~50–100 |
| e2-standard-8 | 32 GB | 20–30 | ~100–200 |

\*Muitos médicos ficarão `disconnected` no Firestore sem browser ativo. Sessão Chromium só precisa estar ativa para **envio futuro** de mensagens; para **apenas validar conexão**, pode-se fechar browser após conectar (com trade-off na reidratação — avaliar na Etapa 4.3).

### 7.4 Sharding (fase 3 — centenas de médicos ativos)

```
shard = hash(doctorId) % NUM_SHARDS

Firestore whatsappConnections:
  + shardId: "01"
  + wppNodeUrl: "https://whatsapp-01.oftware.com.br"  (futuro)

Oftware provider client:
  WPP_SERVER_URL = resolveShardUrl(doctorId)
```

Cada shard: 1 VM, 10–15 sessões, isolamento de falha.

### 7.5 Por que não Cloud Run como nó principal

| Critério | VM + PD | Cloud Run atual |
|----------|---------|-----------------|
| Persistência `userDataDir` | Nativa | Requer Filestore + mount |
| Deploy sem perder sessões | Snapshot + rolling com `startAllSession` | Revision replace mata Chromium |
| Custo 10 sessões | ~US$ 90/mês | ~US$ 80–120/mês + complexidade |
| Escala horizontal | Sharding explícito (controlado) | Autoscale quebra sessões |
| Puppeteer/Chrome | Padrão de mercado em VM | Possível mas não ideal |
| Equipe Oftware | Opera 1 VM + Docker | Armadilhas serverless |

Cloud Run **não é superior** para este workload; é **conveniente no deploy** mas **hostil ao estado** que o WPPConnect exige.

---

## 8. Backup e continuidade — evitar novo QR

### 8.1 O que precisa ser preservado

| Artefato | Obrigatório para evitar QR |
|----------|---------------------------|
| `userDataDir/{sessionId}/` | **Sim** — principal |
| `tokens/{sessionId}.data.json` | **Sim** — auxilia reidratação |
| Firestore `whatsappConnections` | Não — metadado Oftware; não restaura WhatsApp |
| Estado RAM `clientsArray` | Não — recriado com `start-session` |

### 8.2 Estratégia de backup

| Método | Frequência | Notas |
|--------|------------|-------|
| **Snapshot do Persistent Disk** | Diário + antes de deploy | Melhor opção em VM; restore completo |
| **rsync para GCS** | Diário (madrugada) | Parar sessões ou usar snapshot consistente; Chrome trava arquivos |
| **Export por sessão** | Sob demanda | Antes de migração de shard |

### 8.3 Quando o médico **ainda** precisará escanear QR

Mesmo com backup perfeito:

- Logout manual no celular (Aparelhos conectados)  
- WhatsApp invalida sessão por inatividade prolongada  
- Atualização breaking do WhatsApp Web  
- Corrupção do `userDataDir`  
- Troca de número / dispositivo  
- Ban / restrição Meta  

**Meta realista:** reduzir re-scans por **restart de infra** a quase zero; não eliminar 100% dos casos.

### 8.4 Procedimento de restart seguro (futuro)

1. Parar novas conexões (flag na API Oftware)  
2. Aguardar sessões estáveis  
3. Snapshot do disco  
4. `docker compose restart` / deploy  
5. `startAllSession: true` ou loop `start-session` por sessões ativas no Firestore  
6. Validar `status-session` por médico piloto  
7. Reabrir novas conexões  

---

## 9. Segurança

### 9.1 SECRET_KEY

| Risco | Mitigação |
|-------|-----------|
| Vazamento gera tokens para qualquer sessão | Secret Manager (GCP); nunca em git; rotação trimestral |
| Valor padrão `CHANGE_ME` | Bloquear deploy se detectado (checklist) |

### 9.2 Bearer Token (`WPP_SERVER_TOKEN`)

| Aspecto | Prática Oftware |
|---------|-----------------|
| Modelo oficial | Token por `session` via `generate-token` com SECRET_KEY |
| Modelo Oftware atual | Token central único na Vercel — **aceitável** se WPPConnect aceitar um token multi-sessão (validar no piloto) |
| Armazenamento | Vercel env encrypted; Secret Manager no servidor |
| Rotação | Gerar novo token; atualizar Vercel; zero downtime com janela curta |
| Transmissão | HTTPS only |

### 9.3 Sessões

| Ameaça | Mitigação |
|--------|-----------|
| Acesso cross-médico | `sessionId` com org+doctor; API Oftware valida `doctorId` do token Firebase |
| Enumeração de sessões | Rate limit no LB; não expor listagem publicamente |
| Hijack de sessão no WPP | Bearer obrigatório; Cloud Armor; logs de auditoria |

### 9.4 QR Code

| Risco | Mitigação |
|-------|-----------|
| Interceptação | HTTPS end-to-end; QR expira (~60s); polling curto |
| Log acidental | Nunca logar base64 completo (já praticado no `whatsappProviderClient`) |
| Exposição em webhook | Webhooks desabilitados na config Oftware |

### 9.5 Logs

| Dado | Política |
|------|----------|
| QR Code | ❌ Não logar |
| Token / SECRET_KEY | ❌ Não logar |
| Telefone | Mascarar `***1234` |
| sessionId | Parcial `org_metodo…doctor_abc` |
| Corpo de requests WPPConnect | Apenas status HTTP e códigos de erro |

### 9.6 LGPD

- Não armazenar conteúdo de mensagens (escopo atual)  
- `phone` e `profileName` no Firestore — dado mínimo necessário  
- Contrato com médico: WhatsApp conectado é dele; Oftware é processador de infra  

---

## 10. Roadmap de infraestrutura

### Etapa 4.1 — Análise arquitetural (ATUAL)

- [x] Documento de arquitetura (este arquivo)  
- [ ] Revisão e aprovação da equipe  
- [ ] Decisão: VM vs Cloud Run+Filestore  

**Entrega:** decisão formal. **Sem deploy.**

---

### Etapa 4.2 — Piloto infra (1 médico, 1 organização)

**Status:** infra versionada em `infra/whatsapp/vm/` — pronta para deploy manual na VM.

**Objetivo:** primeiro ambiente real com persistência.

| Item | Ação |
|------|------|
| Hospedagem | 1× Compute Engine `e2-standard-2` (us-central1 ou southamerica-east1) |
| Disco | 50GB SSD persistente montado em `/data` |
| Deploy | `infra/whatsapp/vm/deploy-vm.sh` — **pull** imagem oficial + compose |
| Config | `config.runtime.js` montado em `/usr/src/wpp-server/dist/config.js` |
| Imagem | `wppconnect/wppconnect-server` (Docker Hub) |
| DNS | `whatsapp.oftware.com.br` → IP da VM (ou LB) |
| TLS | Let's Encrypt ou Google Managed Certificate |
| Vercel | `WPP_SERVER_URL`, `WPP_SERVER_TOKEN`, `WHATSAPP_MOCK_MODE=false` |
| Teste | 1 médico conecta, escaneia QR, status `connected`, restart container, validar reidratação |
| Monitoramento | Uptime check + alerta disco >80% + RAM |

**Critério de sucesso:** reconexão após restart **sem QR** em ≥80% dos testes.

Ver checklist completo: [`infra/whatsapp/vm/README.md`](../../infra/whatsapp/vm/README.md)

---

### Etapa 4.3 — Produção soft launch (até ~15 médicos simultâneos)

| Item | Ação |
|------|------|
| VM | Upgrade `e2-standard-4` (16GB) se necessário |
| Backup | Snapshot PD diário; retenção 7 dias |
| `startAllSession` | Habilitar e testar após restart |
| Runbook | Procedimento de deploy sem perda de sessão |
| Observabilidade | Logs estruturados; métricas RAM/sessão |
| Segundo médico em outra org | Validar isolamento `sessionId` |

---

### Etapa 4.4 — Escala (~50–100 médicos)

| Item | Ação |
|------|------|
| Sharding | 2–4 VMs; campo `shardId` no Firestore (planejamento) |
| Router | `whatsappProviderClient` resolve URL por shard |
| Load Balancer | Subdomínios ou path-based routing |
| Redis (opcional) | Tokens se multi-nó precisar listar sessões |
| Capacidade | ~10 sessões/VM; planejar 5 VMs para 50 ativas |

---

### Etapa 4.5 — Alta disponibilidade

| Item | Ação |
|------|------|
| Multi-zona | VMs em zonas diferentes; failover manual documentado |
| Health checks | Endpoint de saúde; auto-restart Docker |
| DR | Restore de snapshot < 1h RTO |
| Avaliar GKE | Se equipe crescer e >100 sessões simultâneas |

---

### Etapa 5 — Envio de mensagens (lembretes de aplicação)

**Pré-requisitos:** Etapas 4.2–4.3 estáveis.

| Item | Ação |
|------|------|
| API | `send-message` no provider (isolado) |
| Fila | Cloud Tasks / Pub/Sub para retry |
| Rate limit | Por médico e por paciente |
| Template | Mensagem de lembrete sem CRM |
| Opt-out | Respeitar desconexão do médico |
| Compliance | Política WhatsApp / LGPD |

---

### Etapa 6 — Operação em escala (centenas de médicos)

| Item | Ação |
|------|------|
| Shard automático | Novo nó quando RAM > 75% |
| Session draining | Migrar sessão entre nós (complexo; evitar na v1) |
| Avaliar Meta Cloud API | Para volume massivo futuro |
| Custos | FinOps por sessão ativa |

---

## 11. Avaliação do que já temos (Etapa 4)

| Artefato Oftware | Status | Observação arquitetural |
|------------------|--------|-------------------------|
| UI WhatsApp | ✅ Pronto | Sem alteração necessária |
| Firestore `whatsappConnections` | ✅ Pronto | Metadado; não substitui userDataDir |
| `sessionId` white label | ✅ Pronto | Correto para sharding futuro |
| `whatsappProviderClient` | ✅ Pronto | Logs seguros; timeout 30s |
| Dockerfile | ✅ Revisado | Overlay `FROM wppconnect/wppconnect-server`; não compila repo |
| `config.runtime.js` | ✅ VM | Montado em `dist/config.js`; lê `SECRET_KEY` em runtime |
| `config.ts` | 📎 Referência | Manter sincronizado com `config.runtime.js` |
| `vm/docker-compose.yml` | ✅ VM | Pull imagem oficial + volumes `/usr/src/wpp-server/*` |
| `cloudbuild.yaml` / `deploy.sh` | 📎 Futuro | Cloud Run; usar overlay + Filestore se necessário |

---

## 12. Recomendação única

### Adotar: **Compute Engine (VM GCP) com Persistent Disk + Docker + HTTPS Load Balancer**

**Domínio:** `https://whatsapp.oftware.com.br`  
**Reutilizar:** `infra/whatsapp/wppconnect/Dockerfile`, `config.ts`, `.env.example`  
**Ajustar na Etapa 4.2 (não agora):** paths absolutos `/data/userDataDir/`, snapshot policy, `--no-cpu-throttling` irrelevante em VM.

### Por que esta arquitetura é superior para a Oftware

1. **Alinhamento com o produto WPPConnect** — O servidor oficial pressupõe processo long-running, Chromium e diretório de perfil persistente. VM com PD é o modelo que a comunidade WPPConnect usa em produção e que os maintainers descrevem nas issues de persistência.

2. **White label sem multiplicar custo** — Um cluster central atende infinitas organizações Vercel com o mesmo `WPP_SERVER_URL`. A VM não precisa ser replicada por organização — apenas por **capacidade de sessões** (sharding), o que é previsível e barato.

3. **Custo-benefício SaaS em estágio inicial** — Uma `e2-standard-4` (~US$ 90/mês) sustenta 10–15 médicos **simultaneamente conectados**, suficiente para dezenas/centenas de médicos cadastrados com uso intermitente. Cloud Run com min-instances + Filestore custa similar com **mais risco operacional**.

4. **Persistência = menos suporte** — Médico que escaneia QR uma vez e perde sessão no primeiro deploy gera ticket de suporte em cada organização white label. VM + snapshot diário minimiza re-scans por causa da Oftware.

5. **Caminho de escala claro** — Quando passar de ~15 sessões ativas: adicionar VM-02, shard por `hash(doctorId)`, campo no Firestore. Não requer reescrever a stack — evolui naturalmente. Cloud Run com `max-instances: 1` é teto duro; com `max-instances > 1` quebra sem redesign.

6. **Segurança operacional** — VM única atrás de HTTPS LB + Bearer + Cloud Armor é mais simples de auditar do que revisões Cloud Run que apagam disco a cada deploy.

7. **O que já foi feito não é desperdiçado** — Dockerfile, config, provider, sessionId, documentação e Cloud Build podem ser reapontados para VM (ou para Cloud Run+Filestore na fase 3 se a equipe GCP preferir 100% gerenciado).

### O que NÃO fazer no primeiro deploy

- ❌ Cloud Run com filesystem local e `tokenStoreType: 'file'`  
- ❌ `max-instances > 1` sem sharding  
- ❌ Confiar só no Firestore para restaurar WhatsApp  
- ❌ Deploy em horário comercial sem snapshot prévio  

### Próximo passo (após aprovação deste documento)

**Etapa 4.2:** provisionar VM, montar `/data`, deploy Docker, testar 1 médico em 1 organização, validar restart sem QR — **sem enviar mensagens**.

---

## Referências

| Recurso | URL |
|---------|-----|
| WPPConnect Server (GitHub) | https://github.com/wppconnect-team/wppconnect-server |
| Config oficial (`config.ts`) | https://github.com/wppconnect-team/wppconnect-server/blob/main/src/config.ts |
| `createSessionUtil` (userDataDir) | https://github.com/wppconnect-team/wppconnect-server/blob/main/src/util/createSessionUtil.ts |
| Token Store Factory | https://github.com/wppconnect-team/wppconnect-server/blob/main/src/util/tokenStore/factory.ts |
| TokenStore interface | https://wppconnect.io/wppconnect/interfaces/tokenStore.TokenStore.html |
| Issue persistência userDataDir | https://github.com/wppconnect-team/wppconnect-server/issues/342 |
| Issue restart sessões | https://github.com/wppconnect-team/wppconnect-server/issues/2206 |
| PR monitoramento RAM/sessão | https://github.com/wppconnect-team/wppconnect-server/pull/2434 |
| Cloud Run ephemeral disk | https://cloud.google.com/run/docs/configuring/services/ephemeral-disk |
| Cloud Run NFS/Filestore mounts | https://cloud.google.com/run/docs/configuring/services/nfs-volume-mounts |
| Cloud Run CPU always allocated | https://cloud.google.com/run/docs/configuring/cpu-allocation |
| Setup Oftware (Etapas 3–4) | `docs/whatsapp/WPPCONNECT_SERVER_SETUP.md` |
| Infra versionada | `infra/whatsapp/wppconnect/` |

---

**Documento:** Etapa 4.1 — análise apenas. Nenhum código alterado. Nenhum deploy realizado.
