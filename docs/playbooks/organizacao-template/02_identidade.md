# Departamento — Identidade

**Departamento oficial:** Identidade  
**Nav MAG atual:** Marca (`org-marca`)

---

## Objetivo

Centralizar **tudo que define quem a Organização é** perante o mundo: nome, marca visual, domínio, SEO e presença pública.

A Identidade é **propriedade da Organização** — nunca do médico individual.

---

## Responsabilidades

- Nome público da organização (não nome de médico)
- Logos, cores, favicon, Open Graph, watermark
- Domínio oficial (`siteUrl`, hosts)
- Aparência de **páginas públicas** (aplicação, conclusão, prescrição, `/dr`)
- SEO e metadados sociais
- Consistência de marca em **toda jornada do paciente**

---

## Submódulos previstos

| Submódulo | Descrição | Status |
|-----------|-----------|--------|
| **Geral** | Nome, slogan, descrição, siteUrl | ✅ `organizacao-metodo-branding` |
| **Logos** | Principal, dark, light, PDF, ícone | 📋 parcial (no Geral hoje) |
| **Cores** | Paleta org + páginas públicas | 📋 parcial |
| **Domínio** | Host, DNS, validação SSL | 📋 coming soon |
| **SEO / Open Graph** | OG image, título, descrição social | 📋 coming soon |
| **Páginas públicas** | Tokens por superfície (aplicação, conclusão…) | ✅ via branding |
| **Powered by Oftware** | Toggle discreto de crédito plataforma | ✅ campo existente |

**Fonte oficial de dados:** `organizations/{organizationId}.branding`

---

## Exemplos de funcionalidades

- Upload de logo e OG image
- Edição de cores primária / secundária / accent
- Preview de como paciente vê check-in de aplicação
- Configuração de domínio customizado
- Validação: domínio apontando corretamente
- Reparo de `publicName` se parecer nome de médico

---

## O que NÃO pertence a Identidade

| Item | Departamento correto |
|------|---------------------|
| Página `/dr/[slug]` do médico (conteúdo clínico) | Equipe + Marketing |
| Banners promocionais rotativos | Marketing |
| Bio Instagram por médico | Marketing |
| Contrato com textos legais | Jornada / Negócio |
| Cores globais da plataforma Oftware | Plataforma → Cores do Sistema |
| Branding de outra organização | — (isolamento por org) |
| whiteLabel legado do médico como fonte principal | *(legado — transição para org)* |

---

## Princípios

1. **Uma marca por org** — dual read apenas durante migração
2. **`publicName` = nome da empresa/programa**
3. **Paciente vê a org** — não a Oftware, não o médico como marca dominante
4. **Domínio da org** — rotas clínicas no host correto

---

## Referência atual

- API: `/api/metaadmingeral/organizations/[id]/branding`
- Painel: `OrganizationBrandingPanel`
- Resolver: `getOrganizationBranding.server.ts`
