# Nova Organização — Fluxo Funcional

**Tipo:** documento de produto / jornada  
**Escopo:** o que acontece, quem faz, em que ordem — sem detalhe de implementação

---

## Visão do fluxo completo

```
Lead White Label (médico interessado)
        ↓
Contrato fechado
        ↓
MetaAdminGeral → Organizações → Nova Organização
        ↓
Cadastro básico (nome, ID, domínio alvo)
        ↓
Marca (branding seed)
        ↓
Primeiro Médico
        ↓
Checklist de go-live
        ↓
Ativação (domínio + rotas públicas)
        ↓
Organização operando
        ↓
Crescimento (equipe, pacientes, marketing)
```

---

## Etapa 1 — Origem comercial

### Entrada
Médico ou clínica manifesta interesse em ter sua própria organização na Oftware.

### Onde vive hoje
MetaAdminGeral → Plataforma → **Organizações → Leads White Label**

### O que acontece
- Lead registrado no CRM White Label
- Qualificação comercial (contato, proposta, contrato)
- Definição preliminar: nome da org, domínio desejado, perfil do cliente

### Saída
Contrato assinado e autorização para criar a Organização na plataforma.

---

## Etapa 2 — Acesso ao MetaAdminGeral

### Quem
Administrador Oftware (perfil MetaAdminGeral).

### Fluxo
```
Login MetaAdminGeral
        ↓
Contexto: Plataforma
        ↓
Menu: Organizações
        ↓
Botão: Nova Organização  ← (planejado)
```

### Estado atual
- Existe listagem de organizações
- Método Emagrecer é selecionável
- **Nova Organização** ainda não tem fluxo de criação no MAG

---

## Etapa 3 — Cadastro da Organização

### Dados mínimos (alvo)

| Campo | Exemplo | Observação |
|-------|---------|------------|
| Nome | Clínica Saúde Total | Nome comercial |
| ID (`organizationId`) | `saude-total` | Slug único, imutável |
| Domínio alvo | www.clinicasaudetotal.com.br | Pode ser configurado depois |
| Tipo | Clínica | Informativo |
| Status | Rascunho → Ativa | Controla go-live |

### Resultado esperado
Organização registrada no **registry da plataforma** e documento base no Firestore.

---

## Etapa 4 — Marca (Branding)

### Fluxo
```
Organização criada
        ↓
MAG → Organização Ativa → Marca → Geral
        ↓
Seed automático de branding (defaults + fallbacks)
        ↓
Edição: nome, logos, cores, OG, favicon, siteUrl
        ↓
Upload de imagens
        ↓
Marca salva em organizations/{id}.branding
```

### Princípios
- Nome público = **nome da organização**, não do médico
- `siteUrl` aponta para o domínio oficial
- Páginas públicas (aplicação, conclusão) herdam cores e logo da org

### Estado atual
✅ Painel de Marca funcional para Método Emagrecer  
⏳ Seed automático ao criar nova org (planejado)

---

## Etapa 5 — Primeiro Médico

### Por que é crítico
Sem médico, não há operação clínica. O primeiro médico é o **fundador da equipe**.

### Fluxo alvo
```
MAG → Organização → Equipe → Médicos → Novo Médico
        ↓
Cadastro (nome, CRM, e-mail, telefone)
        ↓
Vincular organizationId = org ativa
        ↓
Verificação / aprovação
        ↓
Médico acessa MetaAdmin
        ↓
Página pública /dr/[slug] disponível no domínio da org
```

### Regras
- Médico pertence à **Organização**, não é dono dela
- White label do médico **não substitui** a marca da org
- Compartilhamento de pacientes ocorre **dentro da mesma org**

---

## Etapa 6 — Checklist de go-live

Antes de ativar, o administrador percorre o [03_checklist.md](./03_checklist.md):

- Organização criada
- Branding configurado
- Primeiro médico verificado
- Domínio apontando
- Firebase / Auth / Storage validados
- Rotas públicas testadas
- E-mails e cron operacionais

---

## Etapa 7 — Ativação

### O que significa "Ativa"
- Domínio da organização responde com a marca correta
- `/meta` acessível no host da org
- Fluxos por token (aplicação, conclusão) funcionam
- MetaAdmin operacional para o primeiro médico
- Status da org = **Ativa** no MAG

### Comunicação
- Cliente recebe credenciais e guia de onboarding
- Suporte Oftware acompanha primeiros pacientes

---

## Etapa 8 — Operação e crescimento

Após ativação, a organização evolui dentro do MAG (contexto Organização):

| Departamento | Funções |
|--------------|---------|
| **Marca** | Logos, cores, domínio, SEO |
| **Equipe** | Médicos, nutris, personais |
| **Pacientes** | Pacientes, leads clínicos, NPS |
| **Comercial** | Leads White Label (venda de novas orgs — escopo Plataforma) |
| **Marketing** | Banners, landing, Instagram |
| **Operação** | Calendário, contratos, e-mails, relatórios |
| **Financeiro** | Visão econômica (futuro) |
| **Configurações** | Dados da org, integrações |

---

## Fluxos paralelos importantes

### Lead clínico (paciente interessado)
- **Não confundir** com Lead White Label
- Vive em Organização → Pacientes → Leads
- Funil de qualificação de pacientes para médicos da org

### Lead White Label (médico quer comprar org)
- Vive em Plataforma → Organizações → Leads White Label
- Funil B2B de venda da plataforma

### Patrimônio Global
- Vive no contexto **Plataforma** do MAG
- Protocolos SISTEMA, exames lab, Chat Inicial, OftPay
- **Não** pertence a nenhuma organização específica

---

## Personas no fluxo

| Persona | Ação principal |
|---------|----------------|
| Admin Oftware | Cria org, configura, ativa |
| Comercial Oftware | Converte lead WL em contrato |
| Gestor da org (cliente) | Valida marca, indica médicos |
| Médico fundador | Opera MetaAdmin, recebe pacientes |
| Paciente | Acessa `/meta` no domínio da org |

---

## Critérios de sucesso

Uma Nova Organização está **bem nascida** quando:

1. Paciente acessa o domínio da org e **não percebe** a Oftware
2. Marca é consistente em todas as páginas públicas
3. Primeiro médico opera pacientes no MetaAdmin
4. Dados carregam com `organizationId` correto
5. Dashboard da org no MAG exibe métricas reais

---

## Próximo documento

[02_fluxo_tecnico.md](./02_fluxo_tecnico.md) — como a plataforma materializa este fluxo.
