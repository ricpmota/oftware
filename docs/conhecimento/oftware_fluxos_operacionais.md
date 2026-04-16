# Fluxos operacionais Oftware (oficial — ChatNutri / suporte)

Use apenas estes caminhos ao explicar “como fazer no sistema”. Não invente nomes de botões que não apareçam aqui. Datas e rótulos podem mudar levemente na UI; o **fluxo lógico** (rota → área → ação) permanece.

---

## SUPERFÍCIE: `/meta`  
**PERFIL:** paciente  
**OBJETIVO:** buscar médico para vínculo  
**FLUXO OFICIAL:**
1. Rota `/meta` — área do paciente após login Google como Paciente.
2. Usar a experiência de **busca / encontrar profissional** disponível no app do paciente (conforme telas atuais após login), aplicar filtros oferecidos pelo sistema e enviar solicitação de vínculo ao profissional escolhido.
3. Acompanhar status em **Minhas solicitações** (ou equivalente na sua versão do layout) até aceite ou recusa.
**CAMPOS:** Dependem do fluxo de busca (o sistema apresenta os filtros da tela).  
**REGRAS:** O médico precisa aceitar o vínculo para começar tratamento na plataforma.  
**ERROS COMUNS:** Achar que não há busca — há busca de profissionais para o paciente; alternativa é também receber **link de convite** do profissional.

---

## SUPERFÍCIE: `/meta`  
**PERFIL:** paciente  
**OBJETIVO:** ver plano / tratamento (informação, não edição)  
**FLUXO OFICIAL:**
1. Rota `/meta`.
2. Acessar área **Meus Tratamentos** (ou nome equivalente no menu do paciente).
3. Visualizar datas, doses, histórico e metas **definidos pelo médico** — paciente não “cadastra” tratamento.
**CAMPOS:** Somente leitura na visão do paciente.  
**REGRAS:** Ajuste de dose, datas e plano terapêutico é responsabilidade do médico no painel dele.  
**ERROS COMUNS:** Perguntar como “cadastrar tratamento” — no app do **paciente** o cadastro do plano terapêutico ativo é feito pelo **médico**; o paciente consulta.

---

## SUPERFÍCIE: `/metaadmin`  
**PERFIL:** médico  
**OBJETIVO:** cadastrar / configurar tratamento do paciente (plano terapêutico)  
**FLUXO OFICIAL:**
1. Rota `/metaadmin` — login Google como médico.
2. Menu **Pacientes** / **Meus pacientes** — abrir o paciente na lista.
3. Abrir **edição do paciente** (modal com **pastas / abas** de informação).
4. Na **Pasta 5 — Plano terapêutico** (ou equivalente): informar dados do plano (ex.: data de início, periodicidade da aplicação, número de semanas, dose inicial, metas conforme o formulário).
5. **Salvar** no modal — o sistema grava o plano, pode disparar e‑mail ao paciente (“plano editado” conforme produto) e atualizar status de tratamento quando aplicável.
**CAMPOS:** Conforme formulário da pasta de plano (não listar campos inventados).  
**REGRAS:** Sem CRM/endereço/cidades no perfil médico, alguns fluxos podem estar bloqueados — completar **Meu perfil médico** antes.  
**ERROS COMUNS:** Paciente em “pendente” sem aceite de vínculo — concluir vínculo antes de plano ativo.

---

## SUPERFÍCIE: `/metaadmin`  
**PERFIL:** médico  
**OBJETIVO:** incluir novo paciente na carteira  
**FLUXO OFICIAL:**
1. `/metaadmin` → **Pacientes**.
2. **Cadastrar novo paciente** (modal simples) com nome, e‑mail e dados básicos solicitados.
3. Opcional: abrir **edição completa** (9 pastas) para anamnese e demais dados.
**CAMPOS:** Nome; e‑mail; telefone; CPF conforme telas.  
**REGRAS:** Paciente precisa existir e estar vinculado para evolução completa no `/meta`.  
**ERROS COMUNS:** Esquecer de preencher pasta de plano após vínculo aceito.

---

## SUPERFÍCIE: `/metanutri`  
**PERFIL:** nutricionista  
**OBJETIVO:** acessar pacientes e plano nutricional  
**FLUXO OFICIAL:**
1. Rota `/metanutri` após login como nutricionista.
2. Menus típicos: `home`, `medicos`, `pacientes`, `financeiro`, `calendario`, `meu-perfil` (IDs conforme app).
3. Para ficha do paciente: fluxo **Pacientes** → selecionar paciente → conteúdo nutricional (plano, check-in, bioimpedância, etc. conforme telas).
**REGRAS:** Persistência de menu pode usar `localStorage` (`metanutri_activeMenu`).  
**ERROS COMUNS:** Menu “travado” — limpar storage de teste.

---

## SUPERFÍCIE: `/meta/nutri`  
**PERFIL:** paciente  
**OBJETIVO:** plano alimentar e check-in nutricional  
**FLUXO OFICIAL:**
1. Rota `/meta/nutri`.
2. Estados: carregamento → **wizard** (questionário) → **plano** → **check-in** diário.
**REGRAS:** Dependência de vínculo com nutricionista conforme produto.

---

## SUPERFÍCIE: `/` (home)  
**PERFIL:** qualquer (pré-login)  
**OBJETIVO:** entrar na área correta  
**FLUXO OFICIAL:**
1. Home escolhe persona (Paciente / Médico / Nutricionista / Personal).
2. Login **Google**.
3. Redirecionamento típico: paciente → `/meta`; médico → `/metaadmin`; nutri → `/metanutri`; personal → `/metapersonal`.
**REGRAS:** Não confundir `/metaadmin` (médico) com `/meta` (paciente).
