# Restauração de sessões WPPConnect — backup local

**Etapa 4.2** — procedimento manual. Executar apenas em janela de manutenção.

## O que o backup contém

| Caminho no backup | Função |
|-------------------|--------|
| `userDataDir/` | Perfis Chromium por `sessionId` — **principal** para evitar novo QR |
| `tokens/` | Metadados de token WPPConnect (`*.data.json`) |

O Firestore `whatsappConnections` **não** está no backup — apenas metadado Oftware.

## Pré-requisitos

- Backup válido em `/data/wppconnect/backups/wppconnect-sessions-YYYYMMDD-HHMMSS.tar.gz`
- Acesso root/sudo na VM
- Container parado durante a restauração

## Procedimento

### 1. Parar o serviço

```bash
cd /caminho/para/oftware/infra/whatsapp/vm
docker compose stop
# ou: docker compose down
```

### 2. (Opcional) Backup do estado atual antes de sobrescrever

```bash
sudo ./backup-sessions.sh --stop
```

### 3. Extrair o backup

Substitua `TIMESTAMP` pelo arquivo desejado:

```bash
ARCHIVE="/data/wppconnect/backups/wppconnect-sessions-TIMESTAMP.tar.gz"
sudo mkdir -p /data/wppconnect/restore-tmp
sudo tar -xzf "${ARCHIVE}" -C /data/wppconnect/restore-tmp
ls -la /data/wppconnect/restore-tmp/
```

### 4. Substituir dados de sessão

```bash
sudo rm -rf /data/wppconnect/userDataDir.bak /data/wppconnect/tokens.bak
sudo mv /data/wppconnect/userDataDir /data/wppconnect/userDataDir.bak
sudo mv /data/wppconnect/tokens /data/wppconnect/tokens.bak

sudo mv /data/wppconnect/restore-tmp/userDataDir /data/wppconnect/userDataDir
sudo mv /data/wppconnect/restore-tmp/tokens /data/wppconnect/tokens

sudo chmod -R 755 /data/wppconnect/userDataDir /data/wppconnect/tokens
sudo rm -rf /data/wppconnect/restore-tmp
```

### 5. Subir o container

```bash
./deploy-vm.sh
```

### 6. Reidratar sessões no WPPConnect

Com `startAllSession: false` na config atual, cada sessão precisa ser iniciada via API:

```bash
# Para cada sessionId ativo (exemplo):
curl -X POST "http://127.0.0.1:21465/api/org_ORG_doctor_ID/start-session" \
  -H "Authorization: Bearer SEU_WPP_SERVER_TOKEN" \
  -H "Content-Type: application/json"
```

Ou, temporariamente, habilitar `startAllSession: true` em `config.ts`, rebuild e deploy (avaliar em Etapa 4.3).

### 7. Validar no Oftware

1. Médico piloto abre aba WhatsApp no `/metaadmin`
2. Status deve ir para **conectado** sem novo QR (se `userDataDir` íntegro)
3. Se pedir QR: WhatsApp pode ter invalidado a sessão no celular — reconectar manualmente

## Rollback

Se a restauração falhar:

```bash
docker compose stop
sudo rm -rf /data/wppconnect/userDataDir /data/wppconnect/tokens
sudo mv /data/wppconnect/userDataDir.bak /data/wppconnect/userDataDir
sudo mv /data/wppconnect/tokens.bak /data/wppconnect/tokens
./deploy-vm.sh
```

## Restore via snapshot GCP (alternativa)

Se o backup tar falhar, use snapshot do **Persistent Disk** montado em `/data`:

1. GCP Console → Compute Engine → Snapshots  
2. Criar disco a partir do snapshot  
3. Anexar à VM em modo recovery ou substituir PD (procedimento GCP — documentar runbook interno)

## Limitações

- Backup com container rodando pode gerar arquivos Chromium inconsistentes — prefira `backup-sessions.sh --stop`
- Logout no celular invalida sessão independentemente do backup
- Migração entre VMs: restaurar tar + mesmo `SECRET_KEY` + regenerar token se necessário
