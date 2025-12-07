# ⚠️ Verificação da Senha do Zoho

## Status Atual

O arquivo `.env.local` está configurado com:
- ✅ `ZOHO_EMAIL=suporte@oftware.com.br` (OK)
- ❌ `ZOHO_PASSWORD=` (VAZIO - precisa adicionar a senha)

## Como Adicionar a Senha

1. **Abra o arquivo `.env.local`** na raiz do projeto

2. **Encontre a linha:**
   ```
   ZOHO_PASSWORD=
   ```

3. **Adicione a senha de aplicativo do Zoho após o sinal de igual:**
   ```
   ZOHO_PASSWORD=sua_senha_de_aplicativo_aqui
   ```

   ⚠️ **IMPORTANTE:**
   - Use a **SENHA DE APLICATIVO** do Zoho (não a senha normal da conta)
   - Não deixe espaços antes ou depois do sinal de igual
   - Não use aspas

4. **Salve o arquivo** (Ctrl+S)

5. **REINICIE o servidor Next.js:**
   - Pressione `Ctrl+C` no terminal onde está rodando `npm run dev`
   - Execute `npm run dev` novamente

## Como Obter a Senha de Aplicativo

Se você ainda não criou a senha de aplicativo:

1. Acesse: https://accounts.zoho.com/home
2. Faça login com sua conta Zoho
3. Vá em **Segurança** → **Senhas de Aplicativo**
4. Clique em **Gerar Nova Senha**
5. Dê um nome descritivo (ex: "Oftware Sistema")
6. **Copie a senha gerada** - você não poderá vê-la novamente!

## Depois de Configurar

Após adicionar a senha e reiniciar o servidor, avise para testarmos novamente!

