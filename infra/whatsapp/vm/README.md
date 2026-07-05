# WPPConnect central — Compute Engine VM (Etapa 4.2)

Infraestrutura **recomendada para piloto e produção inicial** do servidor WhatsApp central da Oftware.

| | |
|--|--|
| **Domínio alvo** | `https://whatsapp.oftware.com.br` |
| **Hospedagem** | GCP Compute Engine + Persistent Disk + Docker Compose |
| **Alternativa** | `infra/whatsapp/wppconnect/` (Cloud Run) — mantida, **não** usar no primeiro deploy |

## Por que VM em vez de Cloud Run

O WPPConnect mantém sessões WhatsApp em **dois artefatos em disco**:

1. `userDataDir/{sessionId}/` — perfil Chromium (essencial para não pedir QR após restart)
2. `tokens/` — metadados de token (`tokenStoreType: file`)

No Cloud Run, o filesystem do container é **efêmero** — todo deploy apaga sessões. Na VM, `/data/wppconnect` vive no **Persistent Disk** e sobrevive a restart/deploy do container.

Análise completa: [`docs/whatsapp/ARQUITETURA_WPPCONNECT_PRODUCAO.md`](../../../docs/whatsapp/ARQUITETURA_WPPCONNECT_PRODUCAO.md)

## Arquitetura white label

```
www.org-a.com.br/metaadmin  ──┐
www.org-b.com.br/metaadmin  ──┼──> Vercel (todas as orgs)
                              │         │
                              │         ▼
                              │    Oftware API + Firestore
                              │         │
                              └─────────┼──> WPP_SERVER_URL
                                        ▼
                         whatsapp.oftware.com.br (HTTPS)
                                        │
                         VM Compute Engine + Docker
                         /data/wppconnect/userDataDir
                         sessionId: org_{org}_doctor_{id}
```

- **Um servidor** para todas as organizações  
- **Um WhatsApp por médico** — cada um escaneia o próprio QR  
- **Isolamento** por `sessionId`, não por servidor  

## Escopo Etapa 4.2

- Infra versionada para VM  
- Conectar / QR / status / desconectar (via Oftware já implementado)  
- **Sem** envio de mensagens, CRM, contatos ou sync de conversas  

---

## Pré-requisitos GCP

| Item | Detalhe |
|------|---------|
| Projeto GCP | Com billing ativo |
| API | Compute Engine |
| VM | Ubuntu 22.04 LTS |
| Região | `us-central1` ou `southamerica-east1` (latência BR) |
| Persistent Disk | Montado em `/data` (não usar só boot disk para sessões) |
| Firewall GCP | SSH (22); HTTPS (443) para proxy; **não** expor 21465 publicamente |
| DNS | `whatsapp.oftware.com.br` → IP da VM ou Load Balancer (Etapa posterior) |

### Tamanho sugerido

| Fase | Tipo VM | vCPU | RAM | PD | Sessões simultâneas (est.) |
|------|---------|------|-----|-----|---------------------------|
| **Piloto** | `e2-standard-2` | 2 | 8 GB | **50 GB** | 5–7 |
| **Soft launch** | `e2-standard-4` | 4 | 16 GB | **100 GB** | 10–15 |

~1 GB RAM por sessão Chromium ativa (comunidade WPPConnect).

### Montar Persistent Disk em `/data` (exemplo)

Após criar PD e anexar à VM:

```bash
# Identificar disco (ex.: /dev/sdb)
lsblk

sudo mkfs.ext4 -F /dev/sdb   # apenas na primeira vez
sudo mkdir -p /data
echo '/dev/sdb /data ext4 defaults,nofail 0 2' | sudo tee -a /etc/fstab
sudo mount -a
df -h /data
```

---

## Estrutura de arquivos

```
infra/whatsapp/vm/
├── docker-compose.yml    # usa ../wppconnect/Dockerfile
├── .env.example
├── setup-vm.sh           # prepara Ubuntu + Docker + /data/wppconnect
├── deploy-vm.sh          # build + up + status
├── backup-sessions.sh    # tar.gz local, retenção 7
├── restore-notes.md      # restauração manual
└── README.md             # este arquivo
```

Dados persistentes na VM:

```
/data/wppconnect/
├── userDataDir/     → montado em /app/userDataDir no container
├── tokens/          → montado em /app/tokens no container
├── logs/
└── backups/         → wppconnect-sessions-YYYYMMDD-HHMMSS.tar.gz
```

---

## Deploy na VM (passo a passo)

### 1. Criar VM + PD no GCP Console ou `gcloud`

### 2. SSH na VM e rodar setup

```bash
git clone <repo-oftware> /opt/oftware
cd /opt/oftware/infra/whatsapp/vm
sudo chmod +x setup-vm.sh deploy-vm.sh backup-sessions.sh
sudo ./setup-vm.sh
```

### 3. Configurar secrets

```bash
cp .env.example .env
nano .env   # definir SECRET_KEY forte
```

**Nunca** commitar `.env` ou `SECRET_KEY`.

### 4. Subir WPPConnect

```bash
./deploy-vm.sh
./deploy-vm.sh --status
```

### 5. Verificar Swagger local

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:21465/api-docs
# esperado: 200
```

### 6. Gerar token Bearer

```bash
# Substitua SESSION (ex.: teste) e SECRET_KEY do .env
curl -s -X POST "http://127.0.0.1:21465/api/minha_sessao_teste/SEU_SECRET_KEY/generate-token"
```

Use o campo `full` ou `token` na resposta como `WPP_SERVER_TOKEN` na Vercel.

### 7. HTTPS (recomendado antes de produção)

Expor **443** com Nginx ou Caddy na VM, proxy para `127.0.0.1:21465`:

- Certificado: Let's Encrypt ou Google Managed Certificate + LB  
- `whatsapp.oftware.com.br` → proxy → container  

O `docker-compose.yml` já publica `127.0.0.1:21465` apenas no localhost.

### 8. Configurar Vercel (todas as organizações)

```env
WHATSAPP_MOCK_MODE=false
WPP_SERVER_URL=https://whatsapp.oftware.com.br
WPP_SERVER_TOKEN=<token_central_gerado>
WPP_REQUEST_TIMEOUT_MS=30000
```

Redeploy Oftware após alterar variáveis.

---

## Portas

| Porta | Uso |
|-------|-----|
| **21465** | WPPConnect (container → localhost na VM) |
| **443** | HTTPS público (Nginx/Caddy/LB → 21465) |
| **22** | SSH admin |

Não abrir 21465 na internet sem TLS e autenticação na frente.

---

## Operação

| Comando | Ação |
|---------|------|
| `./deploy-vm.sh` | Build + start |
| `./deploy-vm.sh --restart` | Reinício seguro (down 30s + up) |
| `./deploy-vm.sh --logs` | Logs em tempo real |
| `sudo ./backup-sessions.sh` | Backup com container rodando |
| `sudo ./backup-sessions.sh --stop` | Backup consistente (para container) |

Antes de **deploy com rebuild** em produção: rodar backup ou snapshot do PD.

---

## Segurança

| Item | Prática |
|------|---------|
| `SECRET_KEY` | Apenas em `.env` na VM; nunca em git |
| `.env` | No `.gitignore`; permissão `600` |
| Porta 21465 | Somente localhost; HTTPS na borda |
| Bearer token | Secret na Vercel; rotação periódica |
| Logs | Não logar QR completo, tokens ou telefone integral |
| Firewall | UFW: SSH + 80/443; negar 21465 externo |
| SSH | Chaves; desabilitar senha se possível |
| Updates | `apt upgrade` mensal; reiniciar em janela com backup |

---

## Checklist de teste (Etapa 4.2)

| # | Passo | OK |
|---|-------|-----|
| 1 | VM criada no GCP | ☐ |
| 2 | Persistent Disk montado em `/data` | ☐ |
| 3 | `sudo ./setup-vm.sh` executado | ☐ |
| 4 | `.env` com `SECRET_KEY` forte | ☐ |
| 5 | `./deploy-vm.sh` — container running | ☐ |
| 6 | `http://127.0.0.1:21465/api-docs` responde | ☐ |
| 7 | Token Bearer gerado | ☐ |
| 8 | Vercel com `WPP_SERVER_URL` + `WPP_SERVER_TOKEN` | ☐ |
| 9 | Médico piloto: aba WhatsApp → Conectar | ☐ |
| 10 | QR real → escanear → status **conectado** | ☐ |
| 11 | `./deploy-vm.sh --restart` | ☐ |
| 12 | Abrir aba WhatsApp — **não** pedir QR novamente | ☐ |
| 13 | Desconectar — status desconectado | ☐ |
| 14 | `sudo ./backup-sessions.sh --stop` — arquivo em `/data/wppconnect/backups/` | ☐ |

---

## Relação com Cloud Run

A pasta [`infra/whatsapp/wppconnect/`](../wppconnect/) permanece para uso futuro (ex.: sharding com Filestore). **Etapa 4.2 adota VM** como caminho de piloto/produção inicial.

---

## Referências

- Arquitetura: `docs/whatsapp/ARQUITETURA_WPPCONNECT_PRODUCAO.md`
- Setup geral: `docs/whatsapp/WPPCONNECT_SERVER_SETUP.md`
- Dockerfile: `infra/whatsapp/wppconnect/Dockerfile`
- Código Oftware: `services/whatsappProviderClient.ts`, `lib/server/whatsappMedicoContext.server.ts`

**Etapa 4.2** — infra preparada; deploy manual na VM; sem envio de mensagens.
