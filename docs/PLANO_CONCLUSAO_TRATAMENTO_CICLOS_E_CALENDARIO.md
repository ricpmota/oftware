# Especificação: ciclos de tratamento, conclusão e calendário (MetaAdmin / pacientes_completos)

**Tipo de documento:** especificação de produto, regras de negócio e direção arquitetural.  
**Escopo:** clarificar o modelo desejado e o comportamento **atual** do sistema **sem** prescrever implementação linha a linha — serve como base para PRs futuros.

**Última revisão conceitual:** alinhamento explícito com decisões de produto (data de conclusão = marco operacional do plano; formulário não “define” data; transição `concluido` → `em_tratamento` = novo ciclo).

---

## 1. Resumo executivo

- **Hoje** a “conclusão” aparece em **vários lugares** no mesmo documento do paciente (`planoTerapeutico.conclusaoTratamento`, linha sintética em `evolucaoSeguimento`, e cálculos no front). O calendário MetaAdmin usa **fórmulas diferentes** em telas distintas (`obterConclusoesMes` + `calcularAplicacoesPaciente` vs. mini calendário com `primeiraDose + numeroSemanasTratamento × 7` vs. timeline com “última semana não cancelada + 7”), o que gera a sensação de **duas conclusões** ou datas incoerentes.
- **Hoje** o backend do link (`POST /api/conclusao/[token]/atualizar`) grava `dataConclusao` a partir do campo `data` **salvo em** `conclusao_links` na geração do link — ou seja, a data efetivamente persistida **não** é recalculada do plano no submit. Isso **contradiz** a decisão de produto atual: *a data de conclusão do ciclo deve ser consequência do plano, não do formulário nem da data escolhida ao gerar o link*.
- **Direção acordada:** tratar o tratamento como **sequência de ciclos**. Cada ciclo tem **plano próprio**, **marco de conclusão** derivado do plano (última aplicação planejada do ciclo + 7 dias, acompanhando alterações, cancelamentos e semanas), e **registro final** (peso final, circunferência, depoimento, etc.) que **não altera** esse marco. Passar de `concluido` para `em_tratamento` **fecha** o ciclo anterior (com histórico preservado) e **abre** obrigatoriamente um **novo** ciclo — deixando de ser modelado como “reabrir o mesmo tratamento”.
- **Recomendação resumida:** (1) extrair **uma única função** de “data de conclusão do ciclo” compartilhada por calendários (e pelo backend ao persistir `conclusaoTratamento` / evolução); (2) introduzir **identidade de ciclo** (mínimo: `cicloAtualId` + snapshot ou arr `ciclos[]` conforme alternativa escolhida); (3) ajustar **`atualizar`** para **recalcular** ou **validar** data contra o plano do ciclo vinculado ao token; (4) migração gradual com compatibilidade para documentos legados.

---

## 2. Decisões de produto consolidadas (normativas)

As frases abaixo são **requisitos de produto** para o desenho alvo. Onde o código **hoje** diverge, isso está indicado na seção [3. Regras atuais do sistema](#3-regras-atuais-do-sistema-verificáveis-no-código) e em [8.2 Contradições confirmadas](#82-contradições-confirmadas-entre-decisão-de-produto-e-código-atual).

1. **Data de conclusão do ciclo**  
   - É um **marco operacional** derivado **apenas** do **plano daquele ciclo**: **7 dias após a última aplicação planejada** daquele ciclo.  
   - Se o plano mudar (semanas, cancelamentos, datas individuais, etc.), **o marco se move**.  
   - Não deve ser interpretado como “dia em que o paciente respondeu ao formulário”.  
   - **Não** haverá, como conceito central de produto, distinção entre “prevista” e “real” para essa data: existe **uma** data de conclusão do ciclo, sempre coerente com o plano vigente daquele ciclo.

2. **Formulário de conclusão (paciente/médico)**  
   - **Não define** a data de conclusão do ciclo.  
   - Registra o **encerramento operacional** do ciclo: peso final, circunferência final, depoimento, estrelas do médico (onde aplicável), etc.  
   - A **data** pertence ao **ciclo**; os **dados preenchidos** pertencem ao **registro final** daquele ciclo.

3. **Novo ciclo**  
   - Transição `concluido` → `em_tratamento` significa **obrigatoriamente** início de **novo** ciclo de tratamento.  
   - Não tratar mais como “reabrir o mesmo tratamento” sem ruptura de ciclo.  
   - Ciclo anterior **encerrado** e **não sobrescrito** no histórico.

4. **Realidade operacional**  
   - Aplicações puladas, atrasos, ajustes no meio do plano e renovações são normais.  
   - **Não** depender de edição manual da data de conclusão como mecanismo central; a data é **consequência do plano** (com as mesmas regras que o calendário de aplicações já usa ou passará a usar de forma unificada).

5. **Simplificação conceitual**  
   - Evitar proliferar conceitos de datas: prevista vs real vs formulário vs link.  
   - Modelo desejado: **uma** data de conclusão do ciclo; **um** registro final opcional/obrigatório conforme regra de negócio; **novo** ciclo quando o tratamento reinicia após conclusão.

---

## 3. Regras atuais do sistema (verificáveis no código)

### 3.1 Backend — gravação de conclusão via link

| Aspecto | Comportamento atual (confirmado) |
|--------|-----------------------------------|
| Rota | `POST /api/conclusao/[token]/atualizar` (`app/api/conclusao/[token]/atualizar/route.ts`) |
| Leitura do token | Documento em coleção `conclusao_links` com `pacienteId`, `data` (string `YYYY-MM-DD`), `medicoId` |
| `dataConclusao` em `planoTerapeutico.conclusaoTratamento` | Instanciada com `new Date(data)` do link, hora fixada em 12:00 (**não** recalculada a partir do plano do paciente no momento do POST) |
| Arquivamento | Se já existia `conclusaoTratamento` e `deveArquivarConclusao` (`utils/conclusaoTratamentoHistorico.ts`), merge em `historicoConclusoesTratamento` via `snapshotConclusaoParaHistorico` + `mergeHistoricoConclusaoNoPlano` |
| `evolucaoSeguimento` | Upsert de linha com `id` prefixo `seguimento-conclusao-`, `comentarioMedico: 'Semana de Conclusão'`, `weekIndex` / `numeroSemana` = `numeroSemanasTratamento + 1`, `dataRegistro` = mesmo `dataConclusao` do link |
| `statusTratamento` | Atualizado para `concluido` no mesmo `update` |
| Outros efeitos | Atualização opcional de lead em `leads_medico`; classificação em `classificacao_profissionais` se estrelas enviadas |

**Geração do link:** `GET /api/conclusao/link` — exige `pacienteId`, `data`, `medicoId`; chave idempotente `conclusao_${pacienteId}_${data}`; persiste `data` no documento do link.

### 3.2 Calendário principal MetaAdmin — lista mensal de conclusões

| Aspecto | Comportamento atual (confirmado) |
|--------|-----------------------------------|
| Função | `obterConclusoesMes` em `app/metaadmin/page.tsx` |
| Pacientes | `statusTratamento` ∈ { `em_tratamento`, `concluido` }, com `planoTerapeutico.startDate`, `injectionDayOfWeek`, `numeroSemanasTratamento > 0` |
| Fórmula | Última data entre aplicações retornadas por `calcularAplicacoesPaciente(paciente, range)`; **conclusão** = essa data **+ 7 dias** |
| Uso de dados persistidos | **Não** usa `conclusaoTratamento.dataConclusao` nem `evolucaoSeguimento` para posicionar o evento |

### 3.3 Mini calendário (card do paciente na lista)

| Aspecto | Comportamento atual (confirmado) |
|--------|-----------------------------------|
| Local | `app/metaadmin/page.tsx` (trecho com `diaConclusao` / `ehConclusao` no card) |
| Fórmula | Alinha `primeiraDose` ao dia da injeção; **`dataConclusao = primeiraDose + numeroSemanasTratamento × 7` (em dias)** |
| Divergência | Difere do calendário principal quando a **última semana efetiva** não é `numeroSemanasTratamento` (ex.: semanas canceladas, datas individuais) ou quando `calcularAplicacoesPaciente` não equivale a progressão linear `N×7` |

### 3.4 Timeline / calendário na edição do paciente (evolução)

| Aspecto | Comportamento atual (confirmado) |
|--------|-----------------------------------|
| Local | `app/metaadmin/page.tsx` (~linha 27771 em revisões recentes) |
| Fórmula | Itera semanas canceladas; obtém **última semana não cancelada**; **data de conclusão** = `dataParaSemana(ultimaSemana) + 7 dias` |
| Consistência | Mais alinhada à ideia “última aplicação do plano + 7” do que o mini calendário, mas **ainda não** é necessariamente idêntica a `calcularAplicacoesPaciente` usada em `obterConclusoesMes` (depende de como `dataParaSemana` e `calcularAplicacoesPaciente` tratam o mesmo paciente) |

**Inferência:** para unificação futura, o critério aceito em produto deve ser **explicitamente** “mesma entrada → mesma data” entre: `obterConclusoesMes`, mini calendário, timeline e backend — idealmente **uma** função pura testável.

### 3.5 Modal / esquema de doses (Semana de Conclusão no planejamento)

| Aspecto | Comportamento atual (confirmado) |
|--------|-----------------------------------|
| Local | `app/metaadmin/page.tsx` (~25990) |
| Fórmula | Última semana não cancelada; data da última aplicação; **conclusão** = **+ 7 dias** — coerente com a narrativa de produto para o **planejamento** |

### 3.6 Transição `concluido` → `em_tratamento` (hoje chamada de “reabrir”)

| Aspecto | Comportamento atual (confirmado) |
|--------|-----------------------------------|
| Local | `handleStatusTratamentoSelectChangeMobile` e fluxos desktop associados em `app/metaadmin/page.tsx`; helper `planoTerapeuticoAoReabrirPosConclusao` |
| Histórico | Se `deveArquivarConclusao`, snapshot vai para `historicoConclusoesTratamento` |
| `conclusaoTratamento` | Removido do plano atual (`null`) |
| `evolucaoSeguimento` | Remove o **último** registro cuja detecção usa prefixo `seguimento-conclusao-` ou `comentarioMedico` contendo “conclusao” (normalizado) |
| Plano (startDate, semanas, etc.) | **Não** é obrigatoriamente resetado pelo fluxo — **inferência:** se o médico não alterar o plano, o calendário continuará mostrando o **mesmo** marco de conclusão **derivado do mesmo plano**, enquanto o estado mental de “novo ciclo” não existe no modelo de dados |

### 3.7 Fontes de verdade “reais” hoje vs. divergências

| Domínio | Fonte de verdade efetiva hoje | Observação |
|--------|--------------------------------|------------|
| Posição do marcador roxo (calendário principal) | Cálculo: última aplicação (`calcularAplicacoesPaciente`) + 7 | Ignora Firestore de conclusão |
| Posição do marcador roxo (mini) | Cálculo simplificado `primeiraDose + N×7` | Pode divergir do principal |
| Data gravada em `conclusaoTratamento.dataConclusao` | Campo `data` do documento `conclusao_links` | **Pode divergir** do cálculo do calendário se quem gerou o link usou outro dia |
| Linha “Semana de Conclusão” em `evolucaoSeguimento` | Espelha `dataConclusao` persistida no `atualizar` | Duplicidade estrutural com `conclusaoTratamento`; útil para UX de semanas |
| Histórico de depoimentos | `historicoConclusoesTratamento` + `conclusaoTratamento` atual | `listDepoimentosSlidesFromPlano` em `conclusaoTratamentoHistorico.ts` |

**Síntese da divergência:** existem **três famílias** de “quando é a conclusão”: (A) cálculos A/B/C no front, (B) data no link, (C) histórico. O produto desejante elimina (B) como **definidor** da data do ciclo — o código **ainda** depende de (B).

---

## 4. Diagnóstico detalhado (preservado e refinado do documento anterior)

### 4.1 Duplicidade de informação (não é só “dois eventos no calendário”)

- **Dupla persistência intencional para o mesmo ato:** ao concluir pelo link, o sistema grava **tanto** `planoTerapeutico.conclusaoTratamento` **quanto** uma entrada em `evolucaoSeguimento` “Semana de Conclusão”.  
- **Problema de UX:** telas que listam evolução podem mostrar a conclusão como “mais um registro semanal”, enquanto o calendário usa **só** planejamento — reforçando ambiguidade.

### 4.2 “Duas conclusões” no calendário

- Causa **principal confirmada:** **fórmulas diferentes** (principal vs. mini) e, secundariamente, possível **desalinhamento** entre data calculada e data persistida via link.  
- **Não** implica dois objetos `conclusaoTratamento` no Firestore.

### 4.3 Efeitos da “reabertura” atual

- Histórico de depoimento/conclusão pode ficar em `historicoConclusoesTratamento`, mas **o plano terapêutico** pode ser **o mesmo** documento lógico — o usuário vê o **mesmo** marco +7 no calendário até o plano mudar.  
- Conceitualmente isso **colide** com a decisão: “novo ciclo” deveria implicar **novo** recorte de plano ou novo objeto de ciclo, não apenas limpar `conclusaoTratamento`.

### 4.4 Risco estrutural: plano atual vs. histórico

- Mistura de **estado mutável único** (`planoTerapeutico` + `evolucaoSeguimento` globais) com **retalhos históricos** (`historicoConclusoesTratamento`) sem vínculo forte com “qual plano gerou aquela conclusão”.  
- **Proposta:** vínculo explícito **ciclo ↔ plano ↔ registro final** (ver seção 6).

---

## 5. Modelo de produto desejado

### 5.1 Conceitos

- **Ciclo de tratamento:** intervalo operacional com início, plano de aplicações, marco de conclusão (fim do ciclo) e opcionalmente registro final preenchido pelo paciente/médico.  
- **Data de conclusão do ciclo:** sempre **f(pano do ciclo)** = data da **última aplicação planejada daquele ciclo** + **7 dias**, recalculada quando o plano do ciclo mudar.  
- **Registro final do ciclo:** medidas e textos finais; **não** altera a data de conclusão do ciclo (a data já estava definida pelo plano).  
- **Novo ciclo:** criado quando o paciente passa de `concluido` para `em_tratamento` (e, se produto exigir, em outros gatilhos futuros a definir). O ciclo anterior permanece **imutável** no histórico para consulta (calendário “passado”, depoimentos, métricas).

### 5.2 Regras de negócio desejadas (alto nível)

- Cada ciclo tem **seu** plano (ou snapshot de plano) e **sua** data de início.  
- Cada ciclo tem **exatamente uma** data de conclusão (marco), derivada do plano.  
- Cada ciclo pode ter **zero ou um** registro final “completo” (definição de “completo”: ex. peso final preenchido — a casar com regras atuais de e-mail e UI).  
- Transição `concluido` → `em_tratamento`: **sempre** materializa **novo** ciclo; **proibido** conceitualmente tratar como “desfazer conclusão sem novo ciclo”.

---

## 6. Modelagem possível (alternativas sem implementação)

### Alternativa A — **Mínima**

**Ideia:** Manter um único `planoTerapeutico` “atual” no documento, mas adicionar `cicloAtualId` (string/UUID) e, ao fechar ciclo, **append** de um snapshot compacto em `historicoCiclos: [...]` com `{ cicloId, dataInicio, planoSnapshot, dataConclusaoCiclo, registroFinal?, encerradoEm }`.  
**Dados:** `evolucaoSeguimento` ou permanece global com tag `cicloId` em cada item **ou** é truncada/arquivada por ciclo (decisão pendente).  
**Vantagens:** pouca superfície de mudança; calendário “atual” continua lendo um plano.  
**Desvantagens:** histórico de evolução semanal misturado se não taguear itens; risco de bugs ao filtrar por ciclo.  
**Migração:** gerar `cicloAtualId` para todos; primeiro item de `historicoCiclos` opcional a partir de `historicoConclusoesTratamento` (imperfeito).  
**Compatibilidade:** alta com telas que só olham plano atual; exige refator dos pontos que assumem uma única timeline infinita.

### Alternativa B — **Intermediáncia (recomendada para equilíbrio)**

**Ideia:** `ciclos: Array<{ id, dataInicio, status, planoTerapeutico, evolucaoSeguimento, conclusaoTratamento? }>` onde **só o último** é “ativo” para edição; documento raiz mantém ponteiros `cicloAtualId` e espelho opcional para leituras rápidas (`planoTerapeuticoAtual` denormalizado).  
**Vantagens:** separação clara; calendário pode renderizar **ciclo atual** por padrão e **ciclos anteriores** por filtro; menos ambiguidade.  
**Desvantagens:** migração mais pesada; todas as leituras/escritas precisam saber o ciclo alvo.  
**Migração:** script: um ciclo sintético = estado atual; histórico anterior em segundo ciclo se já houve reabertura (heurística + revisão manual).  
**Compatibilidade:** mantém conceitos `planoTerapeutico` e `conclusaoTratamento` **dentro** do ciclo; rotas podem continuar recebendo `pacienteId` com resolução “ciclo ativo” no servidor.

### Alternativa C — **Ideal / longo prazo**

**Ideia:** subcoleção Firestore `pacientes_completos/{id}/ciclos/{cicloId}` com documentos normalizados; paciente raiz só com metadados e `cicloAtualId`.  
**Vantagens:** melhor para escala, auditoria e queries por ciclo; permissions futuras.  
**Desvantagens:** maior refactor; mais leituras; migração complexa em produção.  
**Migração:** faseada (dual-write, backfill).  
**Compatibilidade:** baixa no curto prazo; melhor como **fase 2** após B.

---

## 7. Impactos no calendário

### 7.1 Comportamento desejado — ciclo atual

- **Uma** função de domínio (ex.: `getDataConclusaoDoCiclo(planoDoCiclo, opções)`) usada por: `obterConclusoesMes`, mini calendário, timeline do paciente, esquema de doses.  
- Entrada da função: **o plano vigente daquele ciclo** (incl. `startDate`, `injectionDayOfWeek`, `numeroSemanasTratamento`, `semanasCanceladas`, `datasAplicacaoIndividuais` / esquema — **lista exata de campos a fechar com engenharia**).  
- A data exibida como “Conclusão” deve ser **sempre** o resultado dessa função para o **ciclo atual**.

### 7.2 Plano muda no meio do ciclo

- Recalcular automaticamente o marco; notificar/reflow no calendário (UX: sem “data manual”).  
- **Persistência:** se já existir `registro final` incongruente com novo marco (caso raro), definir política (ver decisões pendentes).

### 7.3 Ciclo encerrado (`statusTratamento === concluido`)

- Marco de conclusão do **ciclo que foi encerrado** permanece **histórico** daquele ciclo (não deve “sumir” ao mudar o plano do **próximo** ciclo).  
- Para o **ciclo atual** após novo início, o marcador roxo deve refletir **apenas** o novo plano.

### 7.4 Novo ciclo iniciado

- Calendário “principal” do médico: padrão **só ciclo atual** (recomendação).  
- Opcional de produto: vista “linha do tempo do paciente” com **ciclos anteriores** (eventos fantasma ou segunda trilha) — **decisão pendente**.

### 7.5 Componentes a unificar (confirmado hoje)

| Componente / função | Fórmula atual | Ação desejada |
|---------------------|---------------|---------------|
| `obterConclusoesMes` | `calcularAplicacoesPaciente` → última + 7 | Unificar |
| Mini `diaConclusao` | `primeiraDose + N×7` | Substituir pela função unificada |
| Timeline ~27771 | Última não cancelada + 7 | Unificar com a mesma entrada que `calcularAplicacoesPaciente` |
| Esquema doses ~25990 | Última não cancelada + 7 | Unificar ou delegar à mesma função |

---

## 8. Impactos no formulário e no link de conclusão

### 8.1 Papel no novo modelo

- O formulário é **registro final do ciclo**: captura medidas e depoimento (e nota ao médico, se aplicável).  
- **Não** é fonte da **data de conclusão do ciclo**.

### 8.2 Contradições confirmadas entre decisão de produto e código atualual

| Item | Decisão de produto | Código atual (`atualizar` + `link`) |
|------|-------------------|----------------------------------------|
| Origem de `dataConclusao` | Plano do ciclo (última app + 7) | `data` gravada em `conclusao_links` na geração do link |
| Formulário define data? | Não | Indiretamente sim, via escolha de `data` ao chamar `GET /api/conclusao/link` |

**Proposta de alvo (não implementada):** ao submeter o formulário, o servidor **resolve** `cicloId` (do token enriquecido ou do paciente ativo), **recalcula** `dataConclusao` com a função unificada do plano **daquele ciclo**, e **rejeita** ou **corrige** se o token estiver obsoleto (ver validações).

### 8.3 Dados que o formulário deve preencher

- **Manter:** peso final (obrigatório hoje), circunferência opcional, depoimento opcional, estrelas conforme fluxo.  
- **Campos adicionais futuros:** todos ficam em `registroFinal` / `conclusaoTratamento` **do ciclo**, não no documento raiz sem vínculo.

### 8.4 Vínculo formulário ↔ ciclo

**Proposta:**  
- Estender `conclusao_links` com `cicloId` (e opcionalmente `versaoPlano` ou hash do plano ao gerar o link).  
- Ao `POST atualizar`, validar `cicloId === cicloAtualId` e que o ciclo ainda **aceita** registro final (ex.: não encerrado duas vezes).

### 8.5 Token / link de ciclo anterior

- **Comportamento desejado:** rejeitar com mensagem clara (“Este link refere-se a um ciclo já encerrado”) ou redirecionar para fluxo de novo ciclo.  
- **Hoje:** *inferência* — link antigo ainda pode apontar para mesmo `pacienteId` e `data` antiga; risco de gravar conclusão “no lugar errado” se o modelo de ciclo não for validado.

### 8.6 Validações importantes (proposta)

- Token válido e **ciclo** correspondente ainda é o ciclo **correta** para conclusão (ou o único pendente).  
- `data` no link **não** é mais aceita como fonte primária; no máximo **hint** ou removida.  
- Opcional: idempotência — segundo submit idempotente com mesmos dados.

---

## 9. Riscos, impactos e decisões pendentes

### 9.1 Riscos técnicos

- **Inconsistência durante migração** entre documentos antigos (sem `cicloId`) e novos.  
- Refator grande em `app/metaadmin/page.tsx` (múltiplos trechos duplicados).  
- Serviços paralelos (e-mail de conclusão, relatórios, páginas `/dr`, cron) que assumem `planoTerapeutico.conclusaoTratamento` único.

### 9.2 Riscos de UX

- Médicos acostumados a “reabrir” sem alterar plano: exigir **novo** ciclo pode **forçar** confirmação de `startDate` / duração — pode ser desejável (produto) mas aumenta atrito se mal desenhado.  
- Mostrar ou não **histórico** de conclusões no calendário mensal agregado.

### 9.3 Riscos de migração

- Pacientes já “reabertos” com `historicoConclusoesTratamento` mas uma única evolução contínua: **reconstruir ciclos** automaticamente é **imperfeito** (inferência).  
- Links `conclusao_links` antigos sem `cicloId`.

### 9.4 Dúvidas a fechar antes do primeiro PR

1. **Registro final** pode ocorrer **antes** de `statusTratamento === concluido` ou só depois? (hoje o `atualizar` força `concluido`.)  
2. Ao iniciar novo ciclo, **evolução** e **aplicações**: zerar, copiar medidas iniciais, ou arquivar array completo no ciclo anterior?  
3. **Calendário mensal** mostra só ciclo atual ou marcos de ciclos encerrados no mês?  
4. Se o plano mudar **depois** do registro final já existir, o produto **mantém** o registro e apenas recalcula o marco, ou exige reabertura de fluxo?  
5. **Pendente / abandono** entram no mesmo modelo de ciclo ou ficam fora?

### 9.5 Decisões produto × engenharia

- Escolha entre alternativas **A / B / C** (seção 6).  
- Política exata de validação de token obsoleto.  
- Nomenclatura exibida ao usuário: “Ciclo 2”, datas, ou só “Novo tratamento”.

---

## 10. Recomendação objetiva

### 10.1 Abordagem recomendada

- **Curto prazo:** **Alternativa B** no modelo lógico (ciclos como objetos no documento ou subestrutura clara), **sem** obrigar subcoleção Firestore até estar maduro.  
- **Paralelo:** extrair **função única** de `dataConclusaoDoCiclo` compartilhada entre todas as UIs MetaAdmin listadas na §7.5; alinhar `POST atualizar` para **derivar** data do plano do ciclo vinculado ao token, **não** do campo `data` do link — com período de compatibilidade se necessário.

### 10.2 Ordem de implementação sugerida

| Fase | Entrega | Motivo |
|------|---------|--------|
| **1** | Especificação da função pura + testes (ou fixtures) com casos: canceladas, datas individuais, mudança de N semanas | Remove divergência visual imediata; base para backend |
| **2** | Unificar MetaAdmin (principal, mini, timeline, esquema) consumindo a mesma função | Resolve “duas conclusões” na UI |
| **3** | Introduzir `cicloId` + histórico de ciclos + fluxo obrigatório novo ciclo em `concluido` → `em_tratamento` | Alinha modelo de dados à decisão de produto |
| **4** | Refatorar `conclusao_links` + `atualizar` (vínculo ao ciclo, validações, remoção da dependência de `data` como fonte de verdade) | Alinha backend à decisão §2 |
| **5** | Migração / backfill + revisão de crons, e-mails, `/dr` | Reduz regressões |

### 10.3 O que pode ficar para segunda fase

- Subcoleção física de ciclos (Alternativa C).  
- Vista rica de **múltiplos ciclos** no mesmo calendário mensal.  
- Dashboards analíticos por ciclo.

---

## 11. Apêndice — Referências de código (não exaustivo)

| Artefato | Caminho / nome |
|----------|----------------|
| POST conclusão | `app/api/conclusao/[token]/atualizar/route.ts` |
| GET link | `app/api/conclusao/link/route.ts` |
| Histórico / slides | `utils/conclusaoTratamentoHistorico.ts` — `deveArquivarConclusao`, `snapshotConclusaoParaHistorico`, `mergeHistoricoConclusaoNoPlano`, `listDepoimentosSlidesFromPlano` |
| Reabrir / plano | `app/metaadmin/page.tsx` — `planoTerapeuticoAoReabrirPosConclusao`, `handleStatusTratamentoSelectChangeMobile` |
| Calendário mensal conclusões | `app/metaadmin/page.tsx` — `obterConclusoesMes`, `obterUltimaAplicacaoDoPlano`, `calcularAplicacoesPaciente` |
| Coleção links | `conclusao_links` |

---

## 12. Glossário

| Termo | Significado neste doc |
|-------|------------------------|
| Marco de conclusão | Data fim do ciclo = última aplicação planejada + 7 dias (produto) |
| Registro final | Dados preenchidos no formulário (peso, depoimento, etc.) |
| Ciclo | Período tratado como unidade; novo ao sair de `concluido` para `em_tratamento` |
| Legado | Comportamento atual do código até migração completa |

---

*Documento vivo: atualizar após fechamento das decisões da §9. Nenhuma alteração de código foi feita apenas para produzir este texto.*
