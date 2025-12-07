# Configuração do Zoho Mail - suporte@oftware.com.br

Este guia explica como configurar o acesso ao e-mail **suporte@oftware.com.br** no Zoho Mail para que o sistema possa enviar e ler e-mails.

## 📋 Pré-requisitos

1. Conta Zoho Mail criada com o e-mail `suporte@oftware.com.br`
2. Acesso ao painel administrativo do Zoho Mail
3. Domínio `oftware.com.br` verificado no Zoho

## 🔐 Passo 1: Criar Senha de Aplicativo (App Password)

Para segurança, o Zoho requer uma **Senha de Aplicativo** específica para acesso via SMTP/IMAP, ao invés da senha normal da conta.

### Como criar:

1. Acesse: https://accounts.zoho.com/home
2. Faça login com sua conta Zoho
3. Vá em **Segurança** → **Senhas de Aplicativo**
4. Clique em **Gerar Nova Senha**
5. Dê um nome descritivo (ex: "Oftware Sistema")
6. **Copie a senha gerada** - você não poderá vê-la novamente!

> ⚠️ **IMPORTANTE**: Guarde essa senha em local seguro. Ela será usada nas variáveis de ambiente.

## 🔧 Passo 2: Configurar Variáveis de Ambiente

Crie ou edite o arquivo `.env.local` na raiz do projeto:

```env
# Configuração Zoho Mail
ZOHO_EMAIL=suporte@oftware.com.br
ZOHO_PASSWORD=sua_senha_de_aplicativo_aqui
```

### Onde colocar:

- **ZOHO_EMAIL**: O e-mail completo `suporte@oftware.com.br`
- **ZOHO_PASSWORD**: A senha de aplicativo gerada no Passo 1 (NÃO use a senha normal da conta)

## 📤 Passo 3: Configurações SMTP (Envio de E-mails)

O sistema já está configurado para usar o SMTP do Zoho. As configurações são:

- **Host**: `smtp.zoho.com`
- **Porta**: `587` (TLS)
- **Segurança**: TLS (não SSL)

### Verificar se está funcionando:

1. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Teste o envio de e-mail através da interface administrativa em `/admin` → "Notificações"

## 📥 Passo 4: Configurações IMAP (Leitura de E-mails)

O sistema está configurado para ler e-mails da caixa de entrada usando IMAP. As configurações são:

- **Host**: `imap.zoho.com`
- **Porta**: `993` (SSL/TLS)
- **Segurança**: TLS

### Como usar a API de leitura:

**Endpoint**: `GET /api/read-emails`

**Parâmetros de query**:
- `limit` (opcional): Número máximo de e-mails a retornar (padrão: 10)
- `unreadOnly` (opcional): Se `true`, retorna apenas e-mails não lidos (padrão: false)

**Exemplos**:
```
GET /api/read-emails
GET /api/read-emails?limit=20
GET /api/read-emails?unreadOnly=true
GET /api/read-emails?limit=50&unreadOnly=true
```

**Resposta**:
```json
{
  "emails": [
    {
      "uid": 123,
      "subject": "Assunto do e-mail",
      "from": "remetente@exemplo.com",
      "to": "suporte@oftware.com.br",
      "date": "2024-01-15T10:30:00.000Z",
      "text": "Conteúdo em texto plano",
      "html": "<p>Conteúdo em HTML</p>",
      "attachments": [
        {
          "filename": "documento.pdf",
          "contentType": "application/pdf",
          "size": 1024
        }
      ]
    }
  ],
  "count": 1
}
```

## 🧪 Passo 5: Testar a Configuração

### Teste de Envio:

1. Acesse `/admin` → "Notificações"
2. Selecione um residente ou digite um e-mail de teste
3. Envie uma notificação de teste
4. Verifique se o e-mail chegou na caixa de entrada

### Teste de Leitura:

Você pode testar a API de leitura diretamente:

```bash
# Via curl
curl http://localhost:3000/api/read-emails

# Ou via navegador
http://localhost:3000/api/read-emails?limit=5
```

## 🔒 Segurança

### Boas Práticas:

1. ✅ **NUNCA** commite o arquivo `.env.local` no Git
2. ✅ Use sempre **Senha de Aplicativo**, nunca a senha da conta
3. ✅ No Vercel/produção, configure as variáveis de ambiente no painel
4. ✅ Revogue senhas de aplicativo antigas que não estão mais em uso

### Configuração no Vercel (Produção):

1. Acesse o painel do Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione:
   - `ZOHO_EMAIL` = `suporte@oftware.com.br`
   - `ZOHO_PASSWORD` = `sua_senha_de_aplicativo`

## 🐛 Solução de Problemas

### Erro: "Authentication failed"

- Verifique se está usando a **Senha de Aplicativo** e não a senha normal
- Confirme que o e-mail está correto: `suporte@oftware.com.br`
- Verifique se a senha de aplicativo foi gerada corretamente

### Erro: "Connection timeout"

- Verifique sua conexão com a internet
- Confirme que as portas 587 (SMTP) e 993 (IMAP) não estão bloqueadas
- Tente usar uma VPN se estiver em rede corporativa

### Erro: "Self-signed certificate"

- O código já está configurado para aceitar certificados do Zoho
- Se ainda houver problemas, verifique a data/hora do servidor

### E-mails não aparecem na leitura

- Verifique se há e-mails na caixa de entrada
- Tente aumentar o `limit` na query string
- Verifique os logs do servidor para erros

## 📚 Referências

- [Documentação SMTP do Zoho](https://www.zoho.com/mail/help/zoho-mail-smtp-configuration.html)
- [Documentação IMAP do Zoho](https://www.zoho.com/mail/help/zoho-mail-imap-access.html)
- [Como criar Senha de Aplicativo no Zoho](https://help.zoho.com/portal/en/kb/accounts/articles/manage-app-passwords)

## ✅ Checklist de Configuração

- [ ] Conta Zoho Mail criada com `suporte@oftware.com.br`
- [ ] Senha de Aplicativo gerada no Zoho
- [ ] Variáveis `ZOHO_EMAIL` e `ZOHO_PASSWORD` configuradas no `.env.local`
- [ ] Teste de envio realizado com sucesso
- [ ] Teste de leitura realizado com sucesso
- [ ] Variáveis configuradas no Vercel (se em produção)

---

**Configuração concluída! 🎉**

O sistema agora pode enviar e ler e-mails através do Zoho Mail.

