# REGRAS DE NEGÓCIO - OFTWARE

Motor de decisão em **linguagem de negócio** (não é copy nem jornada emocional, não é código). A IA usa isto para **classificar situações** e **escolher ações permitidas**. Divergência entre este doc e o código **vence o código** até alguém atualizar o doc.

---

## 1. Estados do paciente

Dois eixos convivem: **registro do paciente** (`status`) e **fase terapêutica** (`statusTratamento`). O **vínculo com médico** passa por **solicitação** com `status` próprio.

### 1.1 Registro (conta / prontuário)

| Estado | O que significa | Como entra | Como sai |
|--------|-----------------|------------|----------|
| **Ativo** | Paciente utilizável no fluxo clínico normal. | Cadastro válido; operação padrão. | → **Inativo** ou **Arquivado** (ação administrativa / processo interno). |
| **Inativo** | Cadastro temporariamente fora de uso (sem detalhar operação aqui). | Ação ou regra interna que marca inativo. | → **Ativo** (reativação). |
| **Arquivado** | Registro encerrado para operação corrente (histórico preservado conforme produto). | Processo de encerramento/arquivamento. | Reativação só se regra de negócio permitir (exceção). |

### 1.2 Vínculo com médico (via solicitação)

| Estado (negócio) | O que significa | Como entra | Como sai |
|------------------|-----------------|------------|----------|
| **Sem vínculo aceito** | Não há **médico responsável** no registro **ou** vínculo ainda não consolidado após aceite (transição). | Login como paciente; nunca enviou solicitação aceita; ou só teve rejeição/desistência para todos os fluxos em curso relevantes. | Paciente envia solicitação → **Solicitação pendente**; ou médico aceita e sistema associa **médico responsável** → deixa este bucket. |
| **Solicitação pendente** | Pedido enviado a um médico; aguarda decisão. | Paciente conclui fluxo de solicitação a um `medicoId`. | Médico **aceita** → próxima linha; **rejeita** → **Sem vínculo aceito** com aquele médico; paciente **desiste** → **Desistiu** (ver abaixo). |
| **Solicitação rejeitada** | Médico recusou o vínculo. | Ação do médico na solicitação. | Paciente pode solicitar **outro** médico (novo documento de solicitação); estado de vínculo segue **sem aceite** até novo aceite. |
| **Solicitação desistiu** | Paciente cancelou o pedido antes da resposta ou desistiu conforme fluxo. | Ação explícita de desistência no produto. | Novo pedido possível a outro médico ou novo pedido ao mesmo após regra de produto. |
| **Com vínculo aceito** | Existe vínculo formal: solicitação com status **aceita** e registro com **médico responsável** associado. | Aceite da solicitação pelo médico + persistência do vínculo no paciente. | Troca de médico / novo vínculo / encerramentos (ver §10). |

### 1.3 Fase terapêutica (`statusTratamento`)

| Estado | O que significa | Como entra | Como sai |
|--------|-----------------|------------|----------|
| **Pendente** | Vinculado, mas tratamento **ainda não** considerado “em curso” pelo painel (pré-tratamento / preparação). | Aceite de solicitação com default operacional; ou regra ao salvar paciente. | Médico / processo marca → **Em tratamento**; ou **Abandono** / **Concluído** se fluxo permitir. |
| **Em tratamento** | Acompanhamento ativo no produto. | Ação do médico (ou transição automática definida no sistema ao cumprir critérios). | → **Concluído**, **Abandono**, ou **Pendente** em casos de reclassificação (ex.: retorno pós-abandono). |
| **Concluído** | Tratamento encerrado com conclusão formal no sistema. | Ação do médico (ou fluxo equivalente). | Reabertura só se regra explícita (ex.: voltar a **Em tratamento**). |
| **Abandono** | Paciente deixou o tratamento no sentido operacional do produto. | Registro de abandono com possível motivo pré-definido no sistema. | Pode voltar a **Em tratamento** se médico reativar (comportamento documentado no código em fluxos de aceite). |

**Regra de ouro para a IA:** “Em tratamento” no produto **não** substitui julgamento clínico; é **rótulo operacional** para filtros e telas.

---

## 2. Regras de vínculo com médico

| Regra | Descrição |
|-------|------------|
| **Quem inicia** | O **paciente** inicia a solicitação escolhendo um médico disponível no fluxo de busca/indicação. |
| **Ao enviar** | Cria-se registro de solicitação com status **pendente**; paciente vê status na área de solicitações; médico vê na fila dele. |
| **Ações do médico** | **Aceitar:** vínculo criado/atualizado; dados do paciente associados ao médico responsável; timestamps de aceite. **Rejeitar:** solicitação **rejeitada**; pode existir **motivo** conforme implementação. |
| **Após aceite** | Paciente entra no conjunto “com médico”; `statusTratamento` segue regras do §1.3. |
| **Após rejeição** | Sem vínculo com **esse** médico; paciente pode buscar outro. |
| **Desistência** | Paciente encerra pedido → **desistiu**; não há vínculo por aquela solicitação. |
| **Indicação** | Solicitação pode carregar metadados (ex.: nutricionista/personal/indicação) conforme origem do link — **não** altera a necessidade de aceite do **médico** para vínculo médico–paciente. |

---

## 3. Regras de acesso

Resumo **para decisão da IA** (detalhe técnico em regras de Firestore e papéis de auth). Se o usuário perguntar “quem vê X”, usar esta tabela e **não** inventar exceção.

| Perfil | Pode ver (tipicamente) | Pode editar (tipicamente) | Não acessa (tipicamente) |
|--------|------------------------|---------------------------|----------------------------|
| **Paciente** | **Próprio** prontuário, tratamentos, mensagens com médico vinculado, nutri/treino **liberados** a ele, financeiro **se a UI expuser** ao paciente. | Dados que o produto permite ao próprio paciente (ex.: identificação, certos campos de estilo de vida conforme tela); **não** altera prescrição/plano médico sem médico. | Dados de **outros** pacientes; painéis de médico/nutri/admin. |
| **Médico** | Pacientes **da sua carteira**; solicitações; estatísticas **próprias**; financeiro **da sua visão**; vínculos nutri/personal **sob sua coordenação**. | Ficha clínica de **seus** pacientes; status de solicitação (aceitar/rejeitar); plano e registros clínicos permitidos pelo app; **modo operacional** separado (escalas/residentes) se habilitado — **outro domínio**. | Pacientes de **outro** médico (salvo regras excepcionais não descritas aqui); **admin global** (`/metaadmingeral`). |
| **Nutricionista** | Pacientes **compartilhados** conforme vínculo com médico; KPIs **próprios**. | Planos/check-ins **na extensão que o produto dá ao nutri**; **não** prescreve medicamento nem redefine plano médico. | Pacientes não compartilhados; configuração global da plataforma. |
| **Personal trainer** | Pacientes **vinculados** na extensão do produto; treinos e áreas liberadas. | Treinos/agenda **dentro do escopo** do módulo; **não** camada clínica prescritiva. | Mesma lógica: sem global admin. |
| **Admin geral** | Visão **agregada**: médicos, pacientes, leads, banners, OftPay, relatórios, etc., conforme menus. | Cadastros e configurações **globais**; gestão de leads; conteúdos administrativos. | **Atos clínicos** em nome do médico (não é função primária); não substitui CRM do consultório individual sem processo. |

---

## 4. Regras de comunicação

| Regra | Conteúdo |
|-------|----------|
| **Canais** | Mensagens **dentro do app** entre participantes que o vínculo permite (ex.: paciente ↔ médico responsável). |
| **Quem escreve para quem** | Paciente → médico **vinculado** (ou em contexto de pré-vínculo se o produto bloquear — validar tela). Médico → seus pacientes. Nutri/personal → dentro do escopo de paciente compartilhado. |
| **Momentos** | Sempre que o vínculo existir e o módulo de mensagens estiver ativo; **urgência clínica** não deve depender só do chat assíncrono. |
| **Limitações** | Chat **não** é pronto-socorro; **não** gera prescrição automática; histórico é **documentação** sujeita a políticas de privacidade. |
| **Comportamento esperado** | Conteúdo profissional; paciente usa para dúvidas não urgentes e continuidade; médico responde conforme rotina — IA **não** promete SLA de resposta. |

---

## 5. Regras de tratamento

(Sem farmacologia — só **estados operacionais**.)

| Regra | Definição |
|-------|-----------|
| **“Em tratamento” no sistema** | `statusTratamento === em_tratamento` (rótulo do produto para carteira e filtros). |
| **Início** | Transição de **pendente** (ou equivalente) para **em tratamento** por **ação do médico** ou critério implementado **após** vínculo aceito — não pela IA. |
| **Interrupção** | **Abandono** registrado; ou **inativo/arquivado** no registro; ou **concluído** (fim formal). |
| **Papel do médico** | Define início, pausas conceituais, conclusão e abandono **clínico-operacional** refletidos no sistema. |
| **Papel do sistema** | Armazena, exibe, alerta UI, envia lembretes conforme configuração — **não** decide conduta. |

---

## 6. Regras de nutrição e treino

| Regra | Conteúdo |
|-------|----------|
| **Acesso do paciente** | Subrotas **nutri** e **personal** no app do paciente quando o produto habilita e há **conteúdo/vínculo** válido. |
| **Dependência do médico** | Compartilhamento e vínculos com nutri/personal passam por **aprovação/coordenação do médico** no modelo de dados (solicitações de vínculo). |
| **Limites** | Nutri e personal **complementam**; **não** alteram prescrição médica; conflito de orientação → **médico** prevalece clinicamente. |

---

## 7. Regras de financeiro

| Regra | Conteúdo |
|-------|----------|
| **Quem define valores** | **Médico / clínica** e políticas comerciais **fora** do escopo da IA; o sistema **registra** parcelas e status conforme uso do módulo financeiro. |
| **Visão do paciente** | Somente o que a **interface do paciente** expuser (ex.: totais, pagas, pendentes — conforme implementação). |
| **Visão do médico** | Consolidado **da carteira** e por paciente onde o menu existir. |
| **Admin** | Visão ampla e relatórios; **OftPay** é **produto à parte** (cursos) com **coleção/usuários** próprios — não confundir parcelas clínicas com matrícula de curso sem checar contexto. |

---

## 8. Regras de lead

| Regra | Conteúdo |
|-------|----------|
| **Definição** | Conta **Firebase** (autenticação) que **ainda não** está no funil qualificado como paciente ativo **ou** existe documento em **leads** para qualificação comercial — usuários recém-criados entram como **não qualificado** por padrão operacional. |
| **Status de lead** (CRM) | `nao_qualificado` → `enviado_contato` → `contato_feito` → `qualificado` ou `excluido` (fluxo gestão no **admin geral**). |
| **Quando deixa de ser “só lead”** | Vínculo aceito + paciente operacional na carteira de um médico (paciente de fato no produto clínico). |
| **Fluxo básico** | Auth → possível criação/atualização de lead → uso do app como paciente → solicitação → aceite → paciente com médico. |

---

## 9. Regras de decisão da IA

| Situação | Ação da IA |
|----------|------------|
| **Resposta direta** | Dúvida sobre **navegação** do produto, **significado de status** listado neste documento, **ordem** de passos genéricos (login → área paciente → solicitação). |
| **Perguntar mais** | **Uma** pergunta de desambiguação se faltar: vínculo existe? qual status vê na tela? é sobre pagamento ou sintoma? |
| **Encaminhar ao médico** | Qualquer **sintoma**, **dose**, **efeito adverso**, **interpretação de exame**, **início/fim** de medicamento, **dor torácica, falta de ar, desmaio, pensamentos graves** etc. |
| **Parar e não inventar** | Valores de **contrato**, **SLA**, **garantia de resultado**, **regras legais** não documentadas, ou detalhe que dependa de **instância** (clínica X vs Y). Resposta: **não consta na base** → suporte humano ou médico. |

---

## 10. Situações críticas

| Situação | Como a IA age |
|----------|----------------|
| **Sintomas relatados** | **Não** diagnostica; **não** minimiza. Red flags → **serviço de emergência** + orientar acionar médico assim que possível. Caso não urgente → **mensagem ao médico** pelo app + o que observar até retorno. |
| **Paciente inseguro** | Uma frase de **validação**; **um** próximo passo (pergunta objetiva ao médico pré-redigida); sem terapia substitutiva. |
| **Paciente reclamando** (médico/app) | **Não** culpar nenhuma parte; separar **falha de produto** (encaminhar suporte) de **insatisfação clínica** (médico); não prometer reembolso nem punição. |
| **Paciente perdido** | Classificar estágio (§1): sem vínculo / pendente / com vínculo; dar **só** o próximo passo daquele estágio; mapa mental em `jornada_paciente.md` se precisar de granularidade — **sem** emoção aqui. |

---

**Remissões:** perfil psicológico do paciente (`paciente_mente.md`); jornada narrada (`jornada_paciente.md`); limites éticos globais (`docs/00_mapa_mestre_oftware.md`, Seção 14). Atualizar este arquivo quando **enums** ou transições mudarem no produto.
