# Nova Organização — Fluxo Técnico

**Tipo:** documento de arquitetura de produto  
**Escopo:** como a plataforma materializa uma Organização — **sem implementar nesta etapa**

> Referência de código: `lib/organization/`, `lib/metaadmingeral/`, `docs/arquitetura/`

---

## Princípio arquitetural

```
Host / Contexto
      ↓
Resolver de Organização
      ↓
organizationId
      ↓
Branding + Dados + Rotas
```

Toda requisição e todo documento relevante devem, em última instância, saber **a qual Organização pertencem**.

---

## organizationId

### O que é
Identificador canônico e imutável de uma Organização.

| Org | organizationId |
|-----|----------------|
| Método Emagrecer | `metodo` |
| (futura) Clínica X | `clinica-x` |

### Onde vive

| Camada | Uso |
|--------|-----|
| **Registry estático** | `lib/organization/organizationRegistry.ts` — definição oficial (id, name, hosts, primaryOrigin) |
| **Firestore** | Campo `organizationId` em documentos de equipe, pacientes, links públicos, etc. |
| **Tipos TypeScript** | `OrganizationId` em `organizationTypes.ts` |
| **MetaAdminGeral** | Estado `activeOrganizationId` + navegação contextual |
| **APIs públicas** | Resolução via token, host ou parâmetro explícito |

### Estado da migração
- Backfill e auditoria existem (`lib/migrations/`, Saúde da Plataforma)
- Cobertura ainda **parcial** — nem 100% dos documentos têm `organizationId`
- **Regra:** nunca sobrescrever `organizationId` existente no backfill

---

## Coleções e ownership

### Plataforma (sem organizationId)

Patrimônio Global — compartilhado por todas as orgs:

- Protocolos / prescrições SISTEMA (`medicoId: 'SISTEMA'`)
- Exames laboratoriais (referências)
- Bioimpedância (referências)
- OftPay (cursos, conteúdo)
- Chat Inicial
- Configurações globais da Oftware

### Organização (com organizationId)

| Domínio | Coleções / entidades (referência) |
|---------|-----------------------------------|
| **Organização** | `organizations/{organizationId}` |
| **Branding** | `organizations/{organizationId}.branding` |
| **Equipe** | `medicos`, `nutricionistas`, `personal_trainers` |
| **Pacientes** | `pacientes` |
| **Leads clínicos** | `leads` |
| **Leads White Label** | leads comerciais B2B (CRM WL) |
| **Links públicos** | tokens de aplicação, conclusão, prescrição |
| **Operação** | aplicações, contratos, banners (org), e-mails |

### Hierarquia de leitura

```
organizations/{id}          ← metadados + branding oficial
medicos.organizationId      ← profissional da org
pacientes.organizationId    ← paciente da org
pacientes.medicoResponsavelId ← médico dentro da mesma org
```

---

## Branding

### Proprietário oficial
`organizations/{organizationId}.branding`

### Campos principais
- Identidade: `publicName`, `legalName`, `slogan`, `defaultDescription`
- Visual: logos, cores, favicon, `ogImageUrl`, watermark
- Páginas públicas: `publicPages` (aplicação, conclusão, prescrição…)
- Domínio: `siteUrl`
- Instagram: `instagramBioDefaults`, `instagramUrl`

### Cadeia de fallback (resolver)

Ordem de prioridade ao **ler** branding:

```
1. organizations/{id}.branding     ← oficial (Firestore)
2. platformSettings/metodoImagens    ← legado plataforma
3. medicos.whiteLabel (ricpmota)     ← legado médico fonte
4. Hardcodes / defaults              ← registry + constants
```

Implementação: `resolveOrganizationBrandingFromSources()` em `organizationBrandingMerge.ts`

### Dual read (transição)
Consumidores server-side leem branding da org **primeiro**, depois mesclam com `whiteLabel` legado do médico para compatibilidade.

- `resolveMedicoWhiteLabelWithMetodo.server.ts`
- `organizationBrandingToWhiteLabel.ts`

**Regra de produto:** `publicName` da org **nunca** deve ser o nome de um médico.

### Edição
- API: `GET/PATCH /api/metaadmingeral/organizations/[organizationId]/branding`
- Upload: `.../branding/upload`
- UI: MetaAdminGeral → Organização → Marca

---

## Domínios e hosts

### Registry
Cada organização declara:

```typescript
{
  id: 'metodo',
  primaryOrigin: 'https://www.ometodoemagrecer.com.br',
  hosts: ['ometodoemagrecer.com.br', 'www.ometodoemagrecer.com.br'],
}
```

### Resolução por host
`resolveOrganizationFromHost(host)` → `OrganizationDefinition | null`

Usado para:
- Metadata OG (`organizationSiteMetadata.server.ts`)
- Layouts públicos (`app/metodo/layout.tsx`, `app/layout.tsx`)
- Futuro middleware de roteamento multi-org

### Regra de domínio
Rotas clínicas (`/meta`, `/aplicacao/[token]`, etc.) devem funcionar no **host da organização**, não no domínio Oftware.

### Infraestrutura (planejado por org)
| Serviço | Responsabilidade |
|---------|------------------|
| **DNS** | Apontar domínio do cliente |
| **Vercel** | Projeto / domínio customizado |
| **Firebase** | Auth, Firestore, Storage (decisão: projeto único vs. multi) |

---

## Middleware e roteamento

### Estado atual
- Host Método mapeado estaticamente
- Registry alinhado com `METODO_SITE_HOSTS`
- Middleware completo multi-org: **planejado**

### Fluxo alvo

```
Request → Host header
              ↓
    resolveOrganizationFromHost()
              ↓
    organizationId no contexto (header/cookie/server)
              ↓
    Branding + rotas + filtros de dados
```

---

## MetaAdminGeral — arquitetura de navegação

### Contextos

| Contexto | Menu | Exemplos |
|----------|------|----------|
| `platform` | Plataforma | Dashboard Oftware, Organizações, Leads WL, OftPay, Patrimônio Global |
| `organization` | Org Ativa | Dashboard org, Marca, Equipe, Pacientes |

Configuração: `lib/metaadmingeral/metaAdminGeralNavUx.ts`

### Organização Ativa
- Estado: `activeOrganizationId` (default: `metodo`)
- Deep link: `?menu=...&org=metodo`
- Inferência de contexto: `inferNavContextFromMenu()`

### Dashboard da Organização
Métricas via props de arrays já carregados + auditoria (`/api/metaadmingeral/audit/platform-health`).

Helper: `buildOrganizationDashboardMetrics.ts`

---

## Fluxos técnicos por superfície

### Página pública do médico (`/dr/[slug]`)
```
Slug → MedicoService → medico.organizationId
                              ↓
              resolveMedicoWhiteLabelWithMetodo(organizationId)
                              ↓
                    Marca org + dados médico
```

### Check-in de aplicação (`/aplicacao/[token]`)
```
Token → API dados → paciente + medico + organizationId
                              ↓
              Dual read branding → UI white label
```

### Portal paciente (`/meta`)
```
Host ou contexto → organizationId
                              ↓
              Branding org + jornada clínica
```

### MetaAdmin (`/metaadmin`)
```
Auth médico → medico.organizationId
                              ↓
              Operação limitada à org (futuro: filtro estrito)
```

---

## Auth e Storage

### Auth (Firebase)
- Usuários existem globalmente
- **Vínculo org** via documento do profissional (`medicos`, etc.)
- Futuro: claims `organizationId` ou validação server-side

### Storage
- Uploads de branding: `organizations/{id}/branding/...`
- Fotos médico/paciente: paths existentes (evolução para prefixo org)

---

## Auditoria e saúde dos dados

### Saúde da Plataforma
API: `/api/metaadmingeral/audit/platform-health`

Retorna:
- Cobertura `organizationId` por coleção
- Documentos sem org / com org errada
- Links públicos
- Integridade pacientes × médicos

Usado no Dashboard da Organização e painel Saúde da Plataforma.

### Backfill
- Dry run e execução em `lib/migrations/`
- UI: OrganizationBackfillPanel (MAG)
- **Somente** preenche docs **sem** `organizationId`

---

## Criação de nova org — fluxo técnico alvo

```
1. POST registry + Firestore organizations/{id}
2. Seed branding (ensureOfficialOrganizationBrandingOwnership)
3. Registrar hosts[] (registry + env Vercel)
4. Configurar DNS → Vercel
5. Criar primeiro médico com organizationId
6. Backfill / auditoria da org
7. Status = active
```

**Nenhum passo acima está completo como fluxo automatizado** — exceto seed/branding para org existente (`metodo`).

---

## O que não fazer (guardrails)

| ❌ | ✅ |
|----|-----|
| Criar org pelo código sem playbook | Seguir checklist + roadmap |
| Usar nome de médico como `publicName` da org | Nome da empresa/programa |
| Filtrar dados por org sem auditoria prévia | Verificar cobertura no MAG |
| Duplicar branding em whiteLabel do médico | Fonte única: `organizations/{id}.branding` |
| Expor Oftware na jornada do paciente | Marca da org em todas as superfícies |

---

## Referências de código

| Módulo | Caminho |
|--------|---------|
| Tipos | `lib/organization/organizationTypes.ts` |
| Registry | `lib/organization/organizationRegistry.ts` |
| Host resolver | `lib/organization/resolveOrganizationFromHost.ts` |
| Branding | `lib/organization/getOrganizationBranding.server.ts` |
| Dual read WL | `lib/whiteLabel/resolveMedicoWhiteLabelWithMetodo.server.ts` |
| Nav MAG | `lib/metaadmingeral/metaAdminGeralNavUx.ts` |
| Dashboard metrics | `lib/metaadmingeral/buildOrganizationDashboardMetrics.ts` |
| Auditoria | `lib/platform-audit/` |
| Migração orgId | `lib/migrations/organizationBackfill*.ts` |

---

## Próximo documento

[03_checklist.md](./03_checklist.md) — checklist operacional de go-live.
