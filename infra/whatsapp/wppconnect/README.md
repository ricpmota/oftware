# WPPConnect Server central — Oftware

> **Produção / piloto (Etapa 4.2):** use [`infra/whatsapp/vm/`](../vm/) — **Compute Engine VM + Persistent Disk + Docker Compose**.  
> Esta pasta (`wppconnect/`) mantém Dockerfile e config compartilhados; Cloud Run fica para fase futura.

Servidor WhatsApp **único e centralizado** da plataforma Oftware (white label).

Todas as organizações (`www.clinicaexemplo.com.br/metaadmin`, etc.) apontam para o mesmo `WPP_SERVER_URL`. O isolamento entre médicos e organizações é feito pelo `sessionId`:

```
org_{organizationId}_doctor_{doctorId}
```

Fallback sem `organizationId`: `doctor_{doctorId}`.

## Escopo

- Conectar / QR Code / status / desconectar
- **Não** envia mensagens, **não** sincroniza conversas ou contatos, **não** é CRM

## Arquitetura

```
[MetaAdmin org A] ──┐
[MetaAdmin org B] ──┼──> [Oftware API / Vercel] ──> [WPPConnect VM / Cloud Run]
[MetaAdmin org C] ──┘         whatsapp.oftware.com.br
```

Cada médico escaneia **o próprio** WhatsApp. O servidor central apenas hospeda sessões Puppeteer.

## Estratégia Docker (Etapa 4.2 revisada)

O repositório oficial **não usa `package-lock.json`** — usa **Yarn 4** (`yarn.lock`). Compilar com `npm ci` no Dockerfile que clonava o repo causava falhas (husky, tsc, dependências).

| Abordagem | Uso Oftware |
|-----------|-------------|
| **Imagem oficial** `wppconnect/wppconnect-server` | **VM piloto/produção** — `docker compose pull` |
| **docker-compose oficial** | Referência: monta `config.ts` + `tokens` ([upstream](https://github.com/wppconnect-team/wppconnect-server/blob/main/docker-compose.yml)) |
| **Dockerfile oficial** | Multi-stage Alpine + Yarn 4 + Chromium ([upstream](https://github.com/wppconnect-team/wppconnect-server/blob/main/Dockerfile)) |
| **config.runtime.js** | Config Oftware montada em `/usr/src/wpp-server/dist/config.js` |
| **Dockerfile Oftware** | Overlay fino `FROM wppconnect/wppconnect-server` (Cloud Run / build opcional) |

**VM:** ver [`infra/whatsapp/vm/`](../vm/) — não compila o repositório no deploy.

## Pré-requisitos

- Docker (build local)
- `gcloud` CLI (deploy Cloud Run)
- Projeto GCP com APIs: Cloud Run, Cloud Build, Container Registry, Secret Manager

## Variáveis de ambiente (container)

| Variável | Descrição |
|----------|-----------|
| `PORT` | `21465` (padrão) |
| `HOST` | `0.0.0.0` |
| `SECRET_KEY` | Chave mestra WPPConnect — **obrigatória em produção** |

Copie `.env.example` para `.env` apenas para testes locais (não commitar).

## Build local (overlay opcional — Cloud Run)

```bash
cd infra/whatsapp/wppconnect
docker build -t oftware-whatsapp-wppconnect:local .
```

A imagem base é puxada do Docker Hub; o overlay apenas copia `config.runtime.js`.

Teste local:

```bash
docker run --rm -p 127.0.0.1:21465:21465 \
  -e SECRET_KEY=sua_chave_local \
  -e PORT=21465 \
  -v "$(pwd)/config.runtime.js:/usr/src/wpp-server/dist/config.js:ro" \
  -v /tmp/wpp-userDataDir:/usr/src/wpp-server/userDataDir \
  -v /tmp/wpp-tokens:/usr/src/wpp-server/tokens \
  oftware-whatsapp-wppconnect:local
```

Health: `http://localhost:21465/api-docs` (Swagger, se habilitado).

## Gerar token Bearer (Oftware → WPPConnect)

O Oftware envia `Authorization: Bearer ${WPP_SERVER_TOKEN}`.

1. Com o servidor rodando, gere o token para a `SECRET_KEY` (consulte documentação WPPConnect / Postman).
2. Use o **mesmo token central** em todas as instâncias Vercel das organizações (`WPP_SERVER_TOKEN`).

> O token é da **infraestrutura Oftware**, não por organização.

## Deploy Cloud Run (manual)

```bash
# Criar secret (uma vez)
echo -n "SUA_SECRET_KEY_FORTE" | gcloud secrets create oftware-wppconnect-secret-key --data-file=-

# Deploy
chmod +x deploy.sh
PROJECT_ID=seu-projeto-gcp ./deploy.sh
```

### Configuração Cloud Run (padrão)

| Parâmetro | Valor |
|-----------|-------|
| Serviço | `oftware-whatsapp-wppconnect` |
| Região | `us-central1` |
| Porta | `21465` |
| Memória | `2Gi` |
| CPU | `1` |
| min instances | `1` |
| max instances | `1` (inicial) |
| timeout | `300s` |
| Auth IAM | `--allow-unauthenticated` (proteção na camada Bearer do WPPConnect) |

## Deploy via Cloud Build

Na raiz do repositório:

```bash
gcloud builds submit --config infra/whatsapp/wppconnect/cloudbuild.yaml .
```

Ajuste o secret `oftware-wppconnect-secret-key` no Secret Manager antes do primeiro deploy.

## Domínio público

Após o deploy, mapear:

- `whatsapp.oftware.com.br` → URL do Cloud Run (Domain mappings no GCP + DNS CNAME)

Todas as organizações usam:

```env
WPP_SERVER_URL=https://whatsapp.oftware.com.br
WPP_SERVER_TOKEN=<token_central_da_oftware>
WHATSAPP_MOCK_MODE=false
WPP_REQUEST_TIMEOUT_MS=30000
```

## Segurança e logs

- Não logar QR Code completo, tokens ou telefone integral
- Manter `SECRET_KEY` e `WPP_SERVER_TOKEN` apenas em Secret Manager / Vercel env
- HTTPS obrigatório em produção
- `min-instances: 1` evita cold start que derruba sessões WhatsApp

## Checklist pós-deploy

1. [ ] Build Docker local OK
2. [ ] Deploy Cloud Run OK
3. [ ] URL pública acessível
4. [ ] Domínio `whatsapp.oftware.com.br` configurado (futuro)
5. [ ] Vercel das organizações com `WPP_SERVER_URL` central
6. [ ] Teste: 1 médico em 1 organização conecta
7. [ ] Teste: médico em outra organização — `sessionId` diferente, isolamento OK

Documentação completa: `docs/whatsapp/WPPCONNECT_SERVER_SETUP.md`
