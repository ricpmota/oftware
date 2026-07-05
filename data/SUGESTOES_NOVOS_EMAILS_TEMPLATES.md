v# Sugestões de novos e-mails – variáveis e descrição para HTML

Arquivo de referência para preparar os templates HTML dos novos módulos de e-mail. Cada item traz variáveis disponíveis, gatilho de envio e uma breve descrição do e-mail para guiar o conteúdo.

---

## Variáveis comuns (glossário)

| Variável    | Descrição |
|------------|-----------|
| `{nome}`   | Nome da pessoa (paciente, lead, médico, nutricionista ou personal conforme o contexto). |
| `{medico}` | Nome do médico responsável pelo tratamento do paciente. |
| `{nutricionista}` | Nome do nutricionista (módulos nutri). |
| `{personal}` | Nome do personal trainer (módulos personal). |
| `{inicio}` | Data de início do tratamento/plano (formatada). |
| `{semanas}` | Duração em semanas (ex.: "12 semanas"). |
| `{numero}` | Número da aplicação/sessão/consulta (ex.: 1, 2, 3). |
| `{dataHoje}` | Data de hoje (formatada). |
| `{dataInicio}` / `{dataFim}` | Início e fim do período da agenda (ex.: semana). |
| `{aplicacoesHtml}` | Bloco HTML já montado com lista de aplicações (agenda). |
| `{pagamentosHtml}` | Bloco HTML já montado com lista de pagamentos (agenda). |

Use apenas as variáveis listadas em cada seção abaixo.

---

## 1. Pacientes

### 1.1 Leads Nutricionista (5 e-mails automáticos)

**Chave sugerida:** `leads_nutri` → `email1`, `email2`, `email3`, `email4`, `email5`  
**Quando:** Automático para quem se cadastrou e ainda não escolheu nutricionista (mesma lógica dos leads médico: 1h, 24h, 72h, 7 dias, 14 dias).  
**Destinatário:** Lead (futuro paciente).

**Variáveis:** `{nome}`

**Descrição para HTML:** E-mail de nutrição/emagrecimento, tom acolhedor. Objetivo: levar o lead a escolher um nutricionista na plataforma. Conteúdo: benefícios de ter acompanhamento nutricional, convite para escolher profissional, CTA para acessar o painel e escolher nutricionista. Evitar foco em medicamento; foco em plano alimentar e estilo de vida.

---

### 1.2 Boas-vindas – vínculo com nutricionista aceito

**Chave sugerida:** `solicitado_nutri` → `boas_vindas`  
**Quando:** Status da solicitação de vínculo com nutricionista = aceita.  
**Destinatário:** Paciente.

**Variáveis:** `{nome}`, `{nutricionista}`, `{inicio}`, `{semanas}` (se houver plano com início/duração).

**Descrição para HTML:** Boas-vindas ao acompanhamento nutricional. Parabenizar pelo vínculo com o(a) nutricionista; informar que o plano já está ativo (e, se aplicável, início e duração); orientar a acessar o painel para ver orientações e próximos passos; assinatura institucional.

---

### 1.3 Plano editado pelo nutricionista

**Chave sugerida:** `em_tratamento_nutri` → `plano_editado`  
**Quando:** Nutricionista edita o plano alimentar/tratamento do paciente.  
**Destinatário:** Paciente.

**Variáveis:** `{nome}`, `{nutricionista}`, `{inicio}`, `{semanas}` (se aplicável).

**Descrição para HTML:** Aviso objetivo de que o(a) nutricionista atualizou seu plano. Pedir que acesse o painel para ver as novas orientações. Tom informativo e seguro; botão/link “Ver meu plano”.

---

### 1.4 Lembretes consultas/retornos – nutricionista

**Chave sugerida:** `consulta_nutri` → `consulta_antes`, `consulta_dia`  
**Quando:** 1 dia antes e no dia da consulta/retorno agendado com o nutricionista.  
**Destinatário:** Paciente.

**Variáveis:** `{nome}`, `{nutricionista}`, `{numero}` (ex.: retorno 1, 2, 3), `{dataHoje}` ou data da consulta se houver variável específica.

**Descrição para HTML:** Lembrete breve e amigável: data/hora da consulta (ou “amanhã” / “hoje”), nome do nutricionista, convite a preparar dúvidas ou anotações. CTA: “Ver detalhes” ou “Acessar painel”.

---

### 1.5 Leads Personal (5 e-mails automáticos)

**Chave sugerida:** `leads_personal` → `email1` a `email5`  
**Quando:** Automático para quem se cadastrou e ainda não escolheu personal (1h, 24h, 72h, 7 dias, 14 dias).  
**Destinatário:** Lead.

**Variáveis:** `{nome}`

**Descrição para HTML:** E-mail de treino/condicionamento, tom motivacional. Objetivo: levar o lead a escolher um personal na plataforma. Conteúdo: benefícios do acompanhamento personalizado, convite para escolher profissional, CTA para acessar o painel e escolher personal.

---

### 1.6 Boas-vindas – vínculo com personal aceito

**Chave sugerida:** `solicitado_personal` → `boas_vindas`  
**Quando:** Status da solicitação de vínculo com personal = aceita.  
**Destinatário:** Paciente/aluno.

**Variáveis:** `{nome}`, `{personal}`, `{inicio}`, `{semanas}` (se houver).

**Descrição para HTML:** Boas-vindas ao acompanhamento com personal. Parabenizar pelo vínculo; informar que o plano de treinos já está ativo (e início/duração, se aplicável); orientar a acessar o painel para ver treinos e orientações; assinatura institucional.

---

### 1.7 Plano de treino editado pelo personal

**Chave sugerida:** `em_tratamento_personal` → `plano_editado`  
**Quando:** Personal edita o plano de treino do aluno.  
**Destinatário:** Paciente/aluno.

**Variáveis:** `{nome}`, `{personal}`, `{inicio}`, `{semanas}` (se aplicável).

**Descrição para HTML:** Aviso de que o personal atualizou seu plano de treinos. Pedir que acesse o painel para ver os novos treinos. Tom motivacional e objetivo; CTA “Ver meus treinos”.

---

### 1.8 Lembretes treinos/sessões – personal

**Chave sugerida:** `treino_personal` → `treino_antes`, `treino_dia`  
**Quando:** 1 dia antes e no dia do treino/sessão agendada.  
**Destinatário:** Paciente/aluno.

**Variáveis:** `{nome}`, `{personal}`, `{numero}` (ex.: sessão 1, 2, 3), `{dataHoje}` ou data da sessão.

**Descrição para HTML:** Lembrete de treino: “Amanhã você tem treino” / “Hoje é dia de treino”, nome do personal, breve incentivo. CTA para ver detalhes ou confirmar presença no painel.

---

## 2. Médicos

### 2.1 Nutricionista pediu vínculo

**Chave sugerida:** `nutri_pediu_vinculo` → `aviso_medico`  
**Quando:** Um nutricionista solicita vínculo (com o paciente ou com a equipe do médico).  
**Destinatário:** Médico responsável.

**Variáveis:** `{medico}`, `{nome}` (paciente ou nome do lead), `{nutricionista}`

**Descrição para HTML:** Aviso ao médico: o(a) nutricionista X solicitou vínculo relacionado ao paciente Y (ou ao seu perfil). Resumo objetivo; pedir que acesse o painel para aceitar ou gerenciar a solicitação. Tom profissional e informativo.

---

### 2.2 Personal pediu vínculo

**Chave sugerida:** `personal_pediu_vinculo` → `aviso_medico`  
**Quando:** Um personal solicita vínculo (com o paciente ou com a equipe do médico).  
**Destinatário:** Médico responsável.

**Variáveis:** `{medico}`, `{nome}` (paciente ou lead), `{personal}`

**Descrição para HTML:** Aviso ao médico: o personal X solicitou vínculo relacionado ao paciente Y (ou ao seu perfil). Resumo objetivo; pedir que acesse o painel para aceitar ou gerenciar. Tom profissional e informativo.

---

## 3. Nutricionistas

### 3.1 Novo lead/paciente

**Chave sugerida:** `novo_lead_nutri` → `novo_lead`  
**Quando:** Nova solicitação de vínculo com o nutricionista (lead ou paciente escolheu esse nutricionista).  
**Destinatário:** Nutricionista.

**Variáveis:** `{nutricionista}`, `{nome}` (lead/paciente)

**Descrição para HTML:** Aviso de que um novo lead/paciente solicitou acompanhamento com você. Nome do lead/paciente; CTA para acessar o painel e aceitar ou visualizar a solicitação. Tom profissional e acolhedor.

---

### 3.2 Paciente leu recomendações

**Chave sugerida:** `check_recomendacoes_nutri` → `recomendacoes_lidas`  
**Quando:** Paciente visualizou/leu as recomendações ou orientações do nutricionista no painel.  
**Destinatário:** Nutricionista.

**Variáveis:** `{nutricionista}`, `{nome}` (paciente)

**Descrição para HTML:** Notificação breve: o paciente X leu suas recomendações no painel. Objetivo: dar feedback de engajamento; sem necessidade de ação obrigatória. Tom neutro e informativo.

---

### 3.3 Agenda do nutricionista

**Chave sugerida:** `agenda_nutri` → `agenda_semanal`, `agenda_diario`  
**Quando:** Envio semanal e diário com a relação de consultas/retornos (e eventos, se houver).  
**Destinatário:** Nutricionista.

**Variáveis:** `{nutricionista}`, `{dataInicio}`, `{dataFim}` (semanal), `{dataHoje}` (diário), `{agendaHtml}` ou blocos pré-montados equivalentes a `{aplicacoesHtml}` / `{pagamentosHtml}` (lista de consultas do período).

**Descrição para HTML:** E-mail de agenda: “Sua semana” / “Seu dia” com lista de consultas/retornos. Tabela ou lista simples: data, hora, nome do paciente, tipo (ex.: primeira consulta, retorno). Tom organizacional; assinatura padrão da plataforma.

---

## 4. Personal

### 4.1 Novo lead/aluno

**Chave sugerida:** `novo_lead_personal` → `novo_lead`  
**Quando:** Nova solicitação de vínculo com o personal (lead ou paciente escolheu esse personal).  
**Destinatário:** Personal.

**Variáveis:** `{personal}`, `{nome}` (lead/aluno)

**Descrição para HTML:** Aviso de que um novo lead/aluno solicitou acompanhamento com você. Nome do lead/aluno; CTA para acessar o painel e aceitar ou visualizar a solicitação. Tom profissional e motivacional.

---

### 4.2 Aluno confirmou presença / leu orientações

**Chave sugerida:** `check_presenca_personal` → `presenca_confirmada` ou `orientacoes_lidas`  
**Quando:** Aluno confirmou presença no treino ou leu as orientações do personal no painel.  
**Destinatário:** Personal.

**Variáveis:** `{personal}`, `{nome}` (aluno), opcional `{numero}` ou data da sessão.

**Descrição para HTML:** Notificação breve: o aluno X confirmou presença (ou leu as orientações). Feedback de engajamento; tom neutro e informativo.

---

### 4.3 Agenda do personal

**Chave sugerida:** `agenda_personal` → `agenda_semanal`, `agenda_diario`  
**Quando:** Envio semanal e diário com a relação de treinos/sessões agendadas.  
**Destinatário:** Personal.

**Variáveis:** `{personal}`, `{dataInicio}`, `{dataFim}` (semanal), `{dataHoje}` (diário), `{agendaHtml}` (lista de treinos/sessões do período).

**Descrição para HTML:** E-mail de agenda: “Sua semana de treinos” / “Seu dia de treinos” com lista de sessões. Tabela ou lista: data, hora, aluno, tipo (ex.: avaliação, treino). Tom organizacional; assinatura padrão da plataforma.

---

## 5. Geral

### 5.1 Lead avulso – nutricionista

**Chave sugerida:** `lead_avulso_nutri` → `novo_lead`  
**Quando:** Novo lead cadastrado que ainda não escolheu nutricionista (aviso ao gestor admin).  
**Destinatário:** Admin/gestor geral.

**Variáveis:** `{nome}` (lead)

**Descrição para HTML:** Aviso interno: novo lead cadastrado na plataforma (foco nutri). Nome do lead; objetivo é visibilidade para o gestor; tom neutro e informativo.

---

### 5.2 Lead avulso – personal

**Chave sugerida:** `lead_avulso_personal` → `novo_lead`  
**Quando:** Novo lead cadastrado que ainda não escolheu personal (aviso ao gestor).  
**Destinatário:** Admin/gestor geral.

**Variáveis:** `{nome}` (lead)

**Descrição para HTML:** Aviso interno: novo lead cadastrado (foco personal). Nome do lead; tom neutro e informativo.

---

### 5.3 Bem-vindo Nutricionista

**Chave sugerida:** `bem_vindo_nutri` → `bem_vindo_nutricionista`  
**Quando:** Nutricionista completa cadastro/salva o perfil pela primeira vez.  
**Destinatário:** Nutricionista.

**Variáveis:** `{nome}` (nutricionista)

**Descrição para HTML:** Boas-vindas à plataforma. Agradecer pelo cadastro; explicar em 1–2 frases o que a plataforma oferece (pacientes, agenda, planos); CTA para completar perfil ou acessar o painel; assinatura institucional.

---

### 5.4 Bem-vindo Personal

**Chave sugerida:** `bem_vindo_personal` → `bem_vindo_personal`  
**Quando:** Personal completa cadastro/salva o perfil pela primeira vez.  
**Destinatário:** Personal.

**Variáveis:** `{nome}` (personal)

**Descrição para HTML:** Boas-vindas à plataforma. Agradecer pelo cadastro; explicar em 1–2 frases o que a plataforma oferece (alunos, treinos, agenda); CTA para completar perfil ou acessar o painel; assinatura institucional.

---

### 5.5 Novidades – incluir nutricionistas e personais

**Chave sugerida:** (estender módulo existente `novidades`)  
**Quando:** Envio em massa; opção de incluir também nutricionistas e personais além de pacientes e médicos.  
**Destinatário:** Conforme seleção (pacientes, médicos, nutricionistas, personais).

**Variáveis:** `{nome}` (destinatário)

**Descrição para HTML:** E-mail de novidades/institucional. Conteúdo único por campanha; usar `{nome}` na saudação. Layout neutro e reutilizável (header, corpo, CTA, rodapé).

---

## Resumo por categoria

| Categoria      | Novos módulos (sugestão) |
|----------------|---------------------------|
| **Pacientes**  | Leads Nutri (5), Boas-vindas Nutri, Plano editado Nutri, Lembretes consulta Nutri (2), Leads Personal (5), Boas-vindas Personal, Plano editado Personal, Lembretes treino Personal (2) |
| **Médicos**     | Nutri pediu vínculo, Personal pediu vínculo |
| **Nutricionistas** | Novo lead, Recomendações lidas, Agenda (semanal + diário) |
| **Personal**   | Novo lead, Presença/orientações lidas, Agenda (semanal + diário) |
| **Geral**      | Lead avulso Nutri, Lead avulso Personal, Bem-vindo Nutri, Bem-vindo Personal, Novidades (estender para Nutri e Personal) |

Use este arquivo como base para montar o HTML de cada template; as variáveis devem ser substituídas no backend no momento do envio.
