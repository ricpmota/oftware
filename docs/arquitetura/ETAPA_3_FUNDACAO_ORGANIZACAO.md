# Etapa 3 — Fundação: Organização, Equipe e MetaAdminGeral

**Status:** implementado (fundação de código + documentação)  
**Escopo:** arquitetura apenas — sem Firestore, Rules, APIs ou mudança de comportamento clínico.

---

## Modelo mental (Etapa 3)

```
OFTWARE (plataforma)
├── Patrimônio Global (compartilhado por todas as orgs)
└── Organizações
    └── Método Emagrecer (#1)
        ├── Equipe (médicos, nutricionistas, personais)
        ├── Pacientes
        ├── Leads, agenda, produtos, marketing, etc.
        └── Domínio + identidade + landing
```

### Filosofia da Equipe

- O **médico não é dono** do nutricionista nem do personal.
- Todos pertencem à **mesma Organização**.
- O médico **compartilha pacientes** com profissionais da equipe (convite → aceite → compartilhamento → leitura).
- **Comportamento atual preservado**; evolução futura: busca de profissionais **limitada à mesma Organização**.

Código de referência: `lib/organization/organizationTeam.ts`

---

## Patrimônio Global

Conceito oficial: recursos **sem** `organizationId`, administrados pela Oftware.

| Módulo | Código (`GlobalAssetModule`) |
|--------|------------------------------|
| Protocolos | `protocolos` |
| Biblioteca de Protocolos | `biblioteca_protocolos` |
| Prescrições SISTEMA | `prescricoes_sistema` |
| IA | `ia` |
| Bioimpedância (referências) | `bioimpedancia_referencias` |
| Laboratório (referências) | `laboratorio_referencias` |
| Templates globais | `templates_globais` |
| OftPay | `oftpay` |
| Marketplace (futuro) | `marketplace` |
| Conteúdo científico | `conteudo_cientifico` |
| Cursos | `cursos` |
| Mentorias | `mentorias` |

Registry: `lib/organization/globalAssetRegistry.ts`

**Implementação atual alinhada:** protocolos/prescrições SISTEMA usam `medicoId: 'SISTEMA'` no Firestore — patrimônio global de facto.

---

## Código — `lib/organization/`

| Arquivo | Responsabilidade |
|---------|------------------|
| `organizationTypes.ts` | Tipos: `OrganizationDefinition`, `TeamRole`, `ActiveOrganizationContext`, `GlobalAssetModule` |
| `organizationRegistry.ts` | Registry estático; `METODO_ORGANIZATION` |
| `resolveOrganizationFromHost.ts` | Host → organização |
| `organizationUrls.ts` | URLs públicas por organização; compat Etapa 2 |
| `organizationTeam.ts` | Equipe + coleções de referência (sem migração) |
| `globalAssetRegistry.ts` | Patrimônio Global |
| `index.ts` | Barrel export |

Compatibilidade Etapa 2: `lib/tenant/organizacaoPublicOrigin.ts` re-exporta de `organizationUrls`.

---

## MetaAdminGeral — reorganização conceitual (não implementada)

### Oftware (plataforma)

| Seção | Itens atuais no MAG (referência) |
|-------|-----------------------------------|
| Dashboard | `estatisticas` (futuro: KPIs plataforma) |
| Organizações | **Novo hub** — listar Método + futuras |
| Patrimônio Global | Prescrições/protocolos SISTEMA, exames lab, bio, OftPay, templates |
| IA | Anamnese inteligente, toggles globais |
| White Label | Leads WL, cadastro médico WL, Meta Business |
| Configurações | Cores do sistema, e-mails globais |
| Monitoramento | Relatórios técnicos, logs (futuro) |

### Organização ativa: Método Emagrecer

| Seção | Itens atuais no MAG (referência) |
|-------|-----------------------------------|
| Equipe | Médicos, Nutricionistas, Personais |
| Pacientes | `pacientes` |
| Leads | `leads` |
| Agenda | `calendario` |
| Produtos | `tirzepatida` |
| Relatórios | `relatorios`, NPS |
| Financeiro | (futuro / parcial) |
| Marketing | `banners`, e-mails operacionais |
| Domínio | (futuro — hoje env/registry) |
| Landing | (futuro) |
| NPS | `nps` |
| Contratos | `contratos` (org) |

**Nota:** hoje o MAG mistura Oftware + Método num único menu flat (~10k linhas em `app/metaadmingeral/page.tsx`). A tabela acima é o **mapa alvo**, não o menu atual.

---

## Organização Ativa (conceito futuro)

Tipo preparado: `ActiveOrganizationContext` em `organizationTypes.ts`  
Helper: `buildActiveOrganizationContext()` em `organizationRegistry.ts`

Uso previsto no MetaAdminGeral:

```
Organização: [ Método Emagrecer ▼ ]
```

- Estado em React context ou query `?org=metodo`
- Todas as listagens (equipe, pacientes, leads) filtram por `organizationId`
- Patrimônio Global **ignora** org ativa

Etapa 3: **não implementado** — apenas tipos e helper.

---

## Próximas etapas (fora do escopo Etapa 3)

1. `organizationId` opcional em `medicos`, `nutricionistas`, `personal_trainers`, `pacientes_completos`
2. Filtro de busca de profissionais por org (MetaAdmin / MetaNutri / MetaPersonal)
3. Menu MAG em dois eixos (Oftware × Org ativa)
4. Firestore Rules com isolamento real

---

## Histórico

| Data | Evento |
|------|--------|
| 2026-06 | Etapa 3 — fundação `lib/organization/` + este documento |
