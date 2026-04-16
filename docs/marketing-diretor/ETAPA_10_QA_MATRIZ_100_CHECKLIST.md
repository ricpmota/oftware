# Etapa 10 — QA matriz (checklist próximo de 100%)

**Como usar:** para cada linha, testar nos **3 viewports** (320px, 768px, 1280px). Marcar ✅ ou anotar bug + screenshot.

**Legenda colunas:**

- **C** = Contraste legível (título, corpo, botão)  
- **P** = Primária da marca aplicada corretamente  
- **E** = Estados erro/sucesso/aviso claros  
- **L** = Loading/spinner coerente  
- **M** = Modais/overlays OK (fundo, foco)  

---

## 10.1 Home `/`

| ID | Tela / estado | 320 | 768 | 1280 |
|----|---------------|-----|-----|------|
| H1 | Deslogado — hero + 4 cards | C P L | | |
| H2 | Logado — header nome gradiente | | | |
| H3 | Card “O que é Oftware” — slides | | | |
| H4 | Modal Médico — aberto | M | | |
| H5 | Modal Paciente — aberto | M | | |
| H6 | Modal Nutricionista — aberto | M | | |
| H7 | Modal Personal — aberto | M | | |
| H8 | Loading balança | L | | |
| H9 | FAQ / chat se visível | | | |

---

## 10.2 Meta paciente `/meta`

| ID | Tela / estado | 320 | 768 | 1280 |
|----|---------------|-----|-----|------|
| M1 | Dashboard layout **modern** | | | |
| M2 | Dashboard layout **minimal** | | | |
| M3 | Dashboard layout **interactive** | | | |
| M4 | Menu mobile inferior (se aplicável) | | | |
| M5 | Gráfico peso / evolução | | | |
| M6 | Mensagens | | | |
| M7 | NPS (se disparado) | | | |
| M8 | Bioimpedância / body map | | | |
| M9 | Bloco encaminhamento / ref | | | |
| M10 | FAQ embutido | | | |

---

## 10.3 Sub-meta

| ID | Rota | 320 | 768 | 1280 |
|----|------|-----|-----|------|
| SN1 | `/meta/nutri` wizard | | | |
| SN2 | `/meta/nutri` plano | | | |
| SN3 | `/meta/nutri` check-in | | | |
| SP1 | `/meta/personal` aba Hoje | | | |
| SP2 | `/meta/personal` Cronograma | | | |
| SP3 | `/meta/personal` Criar | | | |
| SP4 | `/meta/personal` Histórico | | | |
| SP5 | `/meta/personal` Estatísticas | | | |
| SP6 | `/meta/personal` Config/lembretes | | | |
| SL1 | `/meta/layout` escolha layout | | | |
| SB1 | `/meta/banner/[id]` com banner válido | | | |
| SB2 | `/meta/banner/[id]` não encontrado | E | | |

---

## 10.4 MetaAdmin `/metaadmin`

| ID | Menu / tela | 320 | 768 | 1280 |
|----|-------------|-----|-----|------|
| A1 | Estatísticas | | | |
| A2 | Nutricionistas | | | |
| A3 | Personal | | | |
| A4 | Vínculos | | | |
| A5 | Pacientes | | | |
| A6 | Meus pacientes | | | |
| A7 | Financeiro | | | |
| A8 | Calendário | | | |
| A9 | Mensagens | | | |
| A10 | Tirzepatida | | | |
| A11 | Encaminhados | | | |
| A12 | Meu perfil | | | |
| A13 | Bottom bar mobile | | | |
| A14 | Admin: Residentes | | | |
| A15 | Admin: Locais | | | |
| A16 | Admin: Serviços | | | |
| A17 | Admin: Escalas | | | |
| A18 | Admin: Troca | | | |
| A19 | Admin: Férias | | | |

---

## 10.5 MetaNutri `/metanutri`

| ID | Menu | 320 | 768 | 1280 |
|----|------|-----|-----|------|
| N1 | Home KPIs | | | |
| N2 | Médicos | | | |
| N3 | Pacientes | | | |
| N4 | Financeiro | | | |
| N5 | Calendário | | | |
| N6 | Meu perfil | | | |
| N7 | Bottom bar mobile | | | |
| N8 | Modal visualizar paciente | M | | |
| N9 | `/metanutri/nutri/[pacienteId]` — sucesso | | | |
| N10 | `/metanutri/nutri/[id]` — acesso negado | E | | |

---

## 10.6 MetaPersonal `/metapersonal`

| ID | Contexto | 320 | 768 | 1280 |
|----|----------|-----|-----|------|
| P1 | Lista / seleção aluno | | | |
| P2 | Personal: Hoje | | | |
| P3 | Personal: Cronograma | | | |
| P4 | Personal: Criar treino | | | |
| P5 | Personal: Histórico | | | |
| P6 | Personal: Estatísticas | | | |
| P7 | Personal: Lembretes | | | |
| P8 | Nutrição aluno: Plano | | | |
| P9 | Nutrição: Check-ins | | | |
| P10 | Nutrição: Estatísticas | | | |
| P11 | Nutrição: Chat nutri | | | |
| P12 | Bottom bar mobile | | | |

---

## 10.7 MetaAdminGeral `/metaadmingeral`

| ID | Menu | 320 | 768 | 1280 |
|----|------|-----|-----|------|
| G1 | Estatísticas | | | |
| G2 | Médicos | | | |
| G3 | Nutricionistas | | | |
| G4 | Personal trainers | | | |
| G5 | Pacientes | | | |
| G6 | Leads | | | |
| G7 | Tirzepatida | | | |
| G8 | Emails | | | |
| G9 | Calendário | | | |
| G10 | NPS | | | |
| G11 | Banners | | | |
| G12 | OftPay | | | |
| G13 | Relatórios | | | |
| G14 | Troca / Férias / Mensagens | | | |
| G15 | Drawer mobile (menu hambúrguer) | | | |
| G16 | `/metaadmingeral/oftpay` → redirect | L | | |

---

## 10.8 Regressões globais

| ID | Verificação | OK |
|----|-------------|-----|
| R1 | Impressão (se usuário imprime prescrição/relatório) | ☐ |
| R2 | PWA / manifest (cor theme) | ☐ |
| R3 | E-mail transacional (se HTML) — fora do app | ☐ |

---

## 10.9 Resumo de bugs (template)

| ID tela | Viewport | Descrição | Severidade |
|---------|----------|-----------|------------|
| | | | |

---

## Próximo passo

Arquivar evidências e atualizar **`ETAPA_11_APENDICE_GLOSSARIO_LINKS.md`** com data do go-live.
