# 📋 Guia: Como Copiar Arquivos CENOFT/ADMIN para META/METAADMIN

## 🎯 Objetivo

Copiar os arquivos das páginas `/cenoft` e `/admin` para criar as novas páginas `/meta` e `/metaadmin`.

---

## ✅ Verificação Rápida

**Todos os arquivos necessários JÁ EXISTEM no projeto!**

Você só precisa copiar **2 arquivos**:

1. `app/cenoft/page.tsx` → `app/meta/page.tsx`
2. `app/admin/page.tsx` → `app/metaadmin/page.tsx`

---

## 🚀 Método 1: Usando o Script Automático (Recomendado)

Execute no PowerShell na raiz do projeto:

```powershell
.\copiar-arquivos.ps1
```

O script vai:
- ✅ Criar as pastas necessárias
- ✅ Copiar os arquivos
- ✅ Verificar todas as dependências
- ✅ Mostrar um resumo completo

---

## 🖐️ Método 2: Manual

### Passo 1: Criar Pastas

```powershell
mkdir app\meta
mkdir app\metaadmin
```

### Passo 2: Copiar Arquivos

```powershell
copy app\cenoft\page.tsx app\meta\page.tsx
copy app\admin\page.tsx app\metaadmin\page.tsx
```

### Passo 3: Testar

Abra no navegador:
- `http://localhost:3000/meta`
- `http://localhost:3000/metaadmin`

---

## 📦 Arquivos que Já Existem (Não Precisa Copiar)

### ✅ Componentes
- `components/EditModal.tsx`
- `components/EditResidenteForm.tsx`
- `components/EditLocalForm.tsx`
- `components/EditServicoForm.tsx`
- `components/EditEscalaForm.tsx`
- `components/FeriasCalendar.tsx`

### ✅ Tipos TypeScript
- `types/auth.ts`
- `types/troca.ts`
- `types/ferias.ts`
- `types/mensagem.ts`

### ✅ Serviços
- `services/userService.ts`
- `services/mensagemService.ts`

### ✅ Firebase
- `lib/firebase.ts`

---

## 🔧 Verificações Importantes

### 1. Firebase Configurado?
Verifique se `lib/firebase.ts` existe e está configurado corretamente.

### 2. Variáveis de Ambiente?
Verifique se `.env.local` tem as variáveis do Firebase:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 3. Dependências Instaladas?
Execute:
```bash
npm install
```

### 4. Firestore Rules?
Verifique se `firestore.rules` permite o acesso necessário.

---

## 🎨 Ajustes Opcionais

Após copiar, você pode querer ajustar:

1. **Texto do Sidebar**: Mudar "CENOFT" para "META"
2. **Cores**: Mudar tema/cores se necessário
3. **Permissões**: Ajustar roles/permissões
4. **Rotas**: Modificar URLs/comportamento

---

## 📝 Exemplo de Modificações

### Mudar Nome do Sidebar (app/meta/page.tsx)

**Antes:**
```tsx
<h1 className="text-xl font-bold text-gray-900">CENOFT</h1>
```

**Depois:**
```tsx
<h1 className="text-xl font-bold text-gray-900">META</h1>
```

---

## 🐛 Troubleshooting

### Página não carrega
- ✅ Verifique se o servidor Next.js está rodando (`npm run dev`)
- ✅ Verifique se as pastas foram criadas corretamente
- ✅ Verifique o console do navegador para erros

### Erro de importação
- ✅ Verifique se todos os arquivos de `components/`, `types/`, `services/` existem
- ✅ Verifique se `lib/firebase.ts` existe

### Erro de autenticação
- ✅ Verifique se Firebase está configurado
- ✅ Verifique `.env.local`
- ✅ Verifique `firestore.rules`

---

## 📂 Estrutura Final

Após copiar, você terá:

```
app/
├── cenoft/
│   └── page.tsx          (original)
├── admin/
│   └── page.tsx          (original)
├── meta/                 (NOVA!)
│   └── page.tsx          (copia de cenoft)
└── metaadmin/            (NOVA!)
    └── page.tsx          (copia de admin)
```

---

## ✅ Checklist Final

- [ ] Pastas `app/meta` e `app/metaadmin` criadas
- [ ] Arquivos copiados
- [ ] Firebase configurado
- [ ] `.env.local` configurado
- [ ] `npm install` executado
- [ ] Servidor Next.js rodando (`npm run dev`)
- [ ] Rotas `/meta` e `/metaadmin` testadas no navegador

---

## 🎉 Pronto!

Seu projeto agora tem as páginas `/meta` e `/metaadmin` funcionando!

Qualquer dúvida, consulte o arquivo `modelo.txt` para referência de design e layout.

