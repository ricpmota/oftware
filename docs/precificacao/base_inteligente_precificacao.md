# Motor de Plano Terapêutico Oftware

**Nome alternativo:** Assistente de Plano Terapêutico e Proposta Comercial

Documento de arquitetura futura e estratégia do módulo analítico da Oftware que apoia o **médico** a montar e vender um **plano terapêutico individualizado** para cada paciente — com estimativas de probabilidade, tempo, consumo de medicação e proposta comercial — **sem dependência de API/IA por paciente**.

> **Escopo deste documento:** especificação técnica e estratégica. Nenhum código, rota, botão, tela ou coleção Firestore de produção deve ser alterado ou criado nesta etapa.

**Documento relacionado:** [base_dados_perda_peso.md](./base_dados_perda_peso.md) — especificação dos campos da exportação anonimizada que alimenta a base histórica.

**Camada analítica subjacente:** a **Base Inteligente de Precificação** continua existindo como motor estatístico interno (dados agregados, modelos pré-computados). O **Motor de Plano Terapêutico** é a camada de produto que consome essa base para gerar propostas **por paciente**, sob responsabilidade do médico.

---

## 1. Visão Geral

Este módulo **não** é uma ferramenta para criar planos comerciais genéricos da Oftware (tabela de preços fixa Bronze/Prata/Ouro aplicável a qualquer pessoa).

É um **suporte ao médico** para vender um **plano terapêutico personalizado** a cada paciente, com base nos dados já cadastrados na plataforma e em estatísticas de pacientes semelhantes da base histórica anonimizada da Oftware.

### O que o módulo entrega ao médico

| Entrega | Descrição |
|---------|-----------|
| **Estimativa clínica** | Probabilidade de atingir a meta cadastrada, tempo esperado, consumo de mg, número de aplicações |
| **Plano terapêutico sugerido** | Duração, medicamento, ritmo de aplicações alinhados ao perfil e à meta do paciente |
| **Proposta comercial** | Valor total estimado do tratamento, com composição de custos e margens |
| **Resumo para apresentação** | Material clínico e comercial para apoiar a conversa com o paciente |

### Dados já disponíveis na plataforma

A Oftware já possui, no cadastro e acompanhamento dos pacientes:

- Peso inicial, peso atual, meta de perda de peso, altura, IMC, idade, sexo
- Cintura abdominal, evolução de peso, histórico de aplicações
- Medicamento em uso, dose em mg
- Exames laboratoriais, bioimpedância (quando disponíveis)
- Status do tratamento, conclusão ou abandono

A proposta é usar esses dados **no contexto do paciente aberto** e cruzá-los com a **base agregada anonimizada**, atualizada por rotina administrativa ou script protegido — consultada pelo sistema **sem consumir API de IA** a cada clique.

---

## 2. Princípio Principal

O cálculo de previsões, probabilidades, plano terapêutico e valor estimado deve ser baseado em **estatística interna e dados agregados**, não em IA generativa por paciente.

```
┌─────────────────────────────────────────────────────────────┐
│  CÁLCULO PRINCIPAL                                          │
│  Estatística + agregação + modelos internos pré-computados  │
│  (sem chamada de API/IA por consulta)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (opcional, futuro)
┌─────────────────────────────────────────────────────────────┐
│  CAMADA DE EXPLICAÇÃO                                       │
│  IA generativa apenas para formatar o resumo em linguagem   │
│  natural para o médico ou paciente                          │
└─────────────────────────────────────────────────────────────┘
```

**Por que não IA por paciente?**

- **Custo** — escala com o número de pacientes e consultas
- **Latência** — estatística pré-calculada responde em milissegundos
- **Reprodutibilidade** — médias e percentis são auditáveis; respostas generativas variam
- **Regulatório** — propostas clínicas e comerciais devem ser rastreáveis até dados concretos

A IA poderá ser usada **futuramente e opcionalmente** para transformar o resultado numérico em texto claro. Ela **não** será necessária para gerar probabilidade, tempo, mg ou valor sugerido.

---

## 3. O Que Este Módulo Não Promete

Este módulo **não promete resultado** de emagrecimento para o paciente individual.

Ele **calcula probabilidades** com base em pacientes semelhantes e dados históricos **agregados** da Oftware. O objetivo é ajudar o médico a montar uma proposta **mais segura, previsível e personalizada** — não substituir o julgamento clínico nem garantir desfecho.

| O módulo faz | O módulo não faz |
|--------------|------------------|
| Estimar probabilidade de atingir a meta | Garantir que o paciente perderá X kg |
| Informar tempo e consumo **médios** de grupos semelhantes | Prever com certeza o futuro deste paciente |
| Sugerir plano e valor com faixa de incerteza | Impor preço ou plano sem revisão médica |
| Apresentar amostra (n) da comparação estatística | Mostrar nomes ou dados de outros pacientes |

Toda saída deve usar termos como **estimativa**, **probabilidade**, **faixa esperada** e **baseado em dados agregados**.

---

## 4. Fluxo do Botão "Gerar Plano Terapêutico"

Futuramente, dentro da área do paciente, existirá um botão (nome provisório: **"Gerar Plano Terapêutico"**). Ao clicar, o sistema executará:

```
1. Ler os dados já existentes do paciente (cadastro + tratamento)
         │
         ▼
2. Identificar a meta de perda de peso cadastrada
         │
         ▼
3. Calcular quantos kg o paciente deseja / precisa perder
         │
         ▼
4. Comparar o paciente com grupos semelhantes da base histórica Oftware
         │
         ▼
5. Estimar:
   • probabilidade de atingir a meta
   • tempo médio esperado
   • consumo médio de medicação (mg)
   • número provável de aplicações
   • faixa de incerteza (percentis)
         │
         ▼
6. Sugerir um plano terapêutico individualizado (ex.: "Plano 15 kg / 6 meses")
         │
         ▼
7. Calcular valor total estimado:
   consumo previsto + custos internos + margens configuradas
         │
         ▼
8. Entregar ao médico um resumo clínico e comercial
   para apoiar a venda do tratamento (editável antes de enviar ao paciente)
```

> **Nesta etapa:** apenas documentação. Nenhum botão, rota ou tela deve ser implementado.

---

## 5. Fluxo da Base Analítica (Backend)

Pipeline que alimenta o motor — independente do clique do médico:

```
Dados brutos dos pacientes (Firestore de produção)
         │
         ▼
Exportação / rotina anonimizada (script protegido)
         │
         ▼
Consolidação estatística (CSV/JSON — ver base_dados_perda_peso.md)
         │
         ▼
Criação de grupos semelhantes (segmentação)
         │
         ▼
Cálculo de médias, medianas, percentis e probabilidades
         │
         ▼
Geração de modelos internos versionados (proposta futura — seção 14)
         │
         ▼
Consulta rápida pelo botão "Gerar Plano Terapêutico"
         │
         ▼
Plano terapêutico + proposta comercial para aquele paciente
```

A rotina de atualização dos modelos será **periódica** (ex.: semanal ou mensal). O botão consulta a **última versão publicada** — não recomputa estatística em tempo real.

---

## 6. Dados Lidos do Paciente

Ao acionar **"Gerar Plano Terapêutico"**, o sistema lerá automaticamente os dados **já cadastrados** na ficha do paciente (sem formulário adicional, salvo campos obrigatórios ausentes):

| Campo | Uso no motor |
|-------|--------------|
| **Peso inicial** | Baseline para meta e comparação com segmentos |
| **Peso atual** | Situação atual; ajuste se tratamento já iniciado |
| **Peso alvo ou meta de perda** | Meta cadastrada pelo médico (kg ou %) |
| **Kg desejados a perder** | Derivado: meta absoluta ou `pesoInicial × meta%` |
| **Percentual de perda desejado** | Derivado da meta em relação ao peso inicial |
| **IMC inicial e atual** | Segmentação e comparação |
| **Idade** | Segmentação |
| **Sexo** | Segmentação |
| **Altura** | Cálculo de IMC |
| **Cintura abdominal** | Refinamento de perfil, quando disponível |
| **Exames laboratoriais disponíveis** | Diabetes, perfil metabólico, comorbidades |
| **Bioimpedância** | Composição corporal, se existir |
| **Medicamento pretendido ou em uso** | Curva de eficiência e custo por mg |
| **Histórico de aplicações** | Se tratamento já iniciou — mg acumulado, dose atual |
| **Evolução de peso** | Ritmo real vs. esperado (paciente em curso) |
| **Adesão** | Refinamento de probabilidade, se existir registro |
| **Status do tratamento** | Pré-tratamento vs. em andamento vs. retomada |

Campos ausentes devem ser sinalizados ao médico ("dado não disponível — estimativa com menor confiança") sem bloquear a geração quando possível.

---

## 7. Fontes de Dados na Plataforma

Mapeamento das origens no Firestore (detalhamento na Etapa 2 de implementação):

| Fonte | Dados úteis |
|-------|-------------|
| Cadastro do paciente | Sexo, idade, altura, peso, IMC, meta |
| Aplicações | Medicamento, dose mg, datas, contagem |
| Evolução de peso / cintura | Séries temporais |
| Bioimpedância | % gordura, massa magra |
| Exames laboratoriais | Glicemia, HbA1c, lipídios, etc. |
| Metas cadastradas | Meta percentual ou absoluta |
| Controle financeiro | Custos, margens, histórico de valores praticados |
| Status e motivo de encerramento | Abandono, conclusão, efeito adverso |
| Agenda de acompanhamento | Frequência de consultas |
| Registros de adesão | Quando existirem |

A base analítica deve documentar **cobertura por campo** (% preenchido) para indicar confiança estatística.

---

## 8. Segmentação dos Pacientes

Para comparar o paciente atual com a base histórica, propõe-se segmentação em **grupos semelhantes**:

| Dimensão | Faixas propostas (ajustáveis após análise) |
|----------|---------------------------------------------|
| Peso inicial | &lt; 80 · 80–100 · 100–120 · &gt; 120 kg |
| IMC inicial | 27–30 · 30–35 · 35–40 · &gt; 40 |
| Sexo | M · F · Outro/Não informado |
| Idade | &lt; 30 · 30–45 · 45–60 · &gt; 60 anos |
| Medicamento | Semaglutida · Tirzepatida · Liraglutida · Outro |
| Dose máxima atingida | Faixas por medicamento |
| Meta desejada (kg ou %) | Faixas alinhadas à meta do paciente |
| Diabetes / pré-diabetes | Sim · Não · Desconhecido |
| Exames metabólicos alterados | Alterado · Normal · Sem exame |
| Perfil de adesão | Alta · Média · Baixa |
| Tempo de tratamento | &lt; 12 · 12–24 · 24–52 · &gt; 52 semanas |

**Regras:** mínimo de **N pacientes** por segmento (ex.: N = 30) antes de exibir estatísticas; segmentos esparsos mesclam com faixa adjacente ou exibem aviso de "dados insuficientes".

---

## 9. Métricas Principais (Base Analítica)

Métricas pré-calculadas **por segmento**, usadas na geração do plano individual:

### Perda de peso

- Perda média em kg e %
- Perda média por semana
- Perda média por mg

### Consumo e tempo por marco de meta

- mg médio e tempo médio para atingir 5%, 10%, 15% e 20%
- mg médio e tempo médio para **meta customizada em kg** (interpolação ou segmento mais próximo)

### Desfecho e qualidade

- Taxa de abandono e conclusão
- Probabilidade de atingir a meta cadastrada (no histórico)
- Diferença entre meta desejada e resultado real (gap médio)
- Margem estimada por perfil de plano

Todas acompanhadas de **mediana, P25, P75, P90 e tamanho da amostra (n)**.

---

## 10. Resultado Esperado para o Médico

Exemplo **conceitual** de saída após **"Gerar Plano Terapêutico"** (sem implementação nesta etapa):

### Contexto do paciente

Paciente com **104 kg**, meta de **perder 15 kg** (~14,4%), medicamento **tirzepatida**, IMC **35**.

### O que o sistema retorna ao médico

| Item | Valor exemplo |
|------|---------------|
| Pacientes semelhantes analisados | 842 |
| Meta desejada | 15 kg |
| Percentual de perda desejado | 14,4% |
| Probabilidade estimada de atingir a meta | 72% |
| Tempo médio esperado | 24 semanas |
| Consumo médio estimado | 88 mg |
| Faixa provável de consumo | 72 a 108 mg (P25–P75) |
| Número estimado de aplicações | 24 |
| Plano terapêutico sugerido | Plano 15 kg / 6 meses |
| Valor total sugerido | R$ XX.XXX,XX |
| Observação | Resultado baseado em dados agregados de 842 pacientes semelhantes — **não constitui garantia individual** |

O médico poderá **editar** duração, valor, itens incluídos e texto antes de apresentar ao paciente. A **decisão final é sempre médica**.

---

## 11. Cálculo Comercial

O **valor total sugerido** do plano terapêutico individualizado poderá considerar, em camadas configuráveis (por clínica ou organização):

| Componente | Descrição |
|------------|-----------|
| **Custo da medicação** | mg estimados × custo por mg / por aplicação |
| **Custo dos kits** | Agulhas, álcool, materiais por aplicação |
| **Custo operacional** | Overhead da clínica rateado por tratamento |
| **Comissão ou margem médica** | Remuneração profissional incluída no pacote |
| **Margem da clínica** | Lucro alvo sobre custos diretos |
| **Duração prevista** | Semanas/meses — impacta consultas e aplicações |
| **Quantidade estimada de aplicações** | Derivada do consumo de mg |
| **Consultas / acompanhamento incluído** | Número de retornos no pacote |
| **Exames incluídos ou não** | Laboratorial, bioimpedância |
| **Desconto máximo permitido** | Piso comercial — alerta se médico reduzir abaixo |
| **Preço mínimo seguro** | Não vender abaixo do custo + margem mínima |

A composição detalhada deve ser **transparente para o médico** (breakdown editável), não apenas um número final opaco.

> Os tiers genéricos Bronze/Prata/Ouro/Platinum podem existir como **referência estatística interna** (metas ~5/10/15/20%), mas o produto entregue ao paciente é sempre um **plano nomeado pela meta individual** (ex.: "Plano 15 kg / 6 meses"), não um catálogo fixo da Oftware.

---

## 12. Uso Sem Consumo de API

| Aspecto | Comportamento |
|---------|---------------|
| **Cálculo principal** | Estatística interna sobre base analítica pré-processada |
| **Modelos** | Gerados por rotina administrativa; versionados e armazenados em ambiente analítico |
| **Botão "Gerar Plano Terapêutico"** | Apenas **consulta** (lookup) nos modelos já calculados + dados do paciente na ficha |
| **IA generativa** | **Não** necessária por clique; **não** chamada para probabilidade, tempo, mg ou preço |
| **IA opcional (futuro)** | Formatar resumo em texto claro para médico ou paciente; explicar incertezas em linguagem natural |

Benefícios: custo previsível, resposta instantânea, auditoria dos números, conformidade com decisão médica rastreável.

---

## 13. Onde Isso Deve Aparecer no Futuro

O botão **"Gerar Plano Terapêutico"** (ou equivalente) poderá ser colocado em:

| Local provável | Justificativa |
|----------------|---------------|
| **Modal / área do paciente no `/metaadmin`** | Contexto natural: médico já analisando ficha |
| **Próximo ao controle financeiro** | Fluxo comercial após definição clínica |
| **Próximo ao plano de tratamento** | Alinhado a medicamento, dose e metas |
| **Aba dedicada "Plano Terapêutico"** | Espaço para histórico de propostas geradas, editadas e enviadas |

A decisão de UI será tomada na Etapa 8 de implementação. **Nenhuma tela existente deve ser alterada nesta etapa.**

---

## 14. Estrutura Futura dos Modelos Internos

> **Proposta arquitetural futura.** Nenhuma coleção ou código deve ser criado agora.

| Coleção proposta | Conteúdo |
|------------------|----------|
| `/analytics/weightLossPricingModels` | Parâmetros de custo, margem e composição comercial |
| `/analytics/weightLossSegments` | Definição de segmentos e contagem (n) |
| `/analytics/weightLossBenchmarks` | Métricas agregadas por segmento e meta |
| `/analytics/weightLossMedicationEfficiency` | kg/mg, curvas por medicamento e dose |

Cada documento: `versionId`, `generatedAt`, `sampleSize`, `validUntil`.

---

## 15. Cuidados Comerciais e Médicos

| Cuidado | Ação |
|---------|------|
| Não apresentar como promessa de emagrecimento garantido | UI e textos com "estimativa", "probabilidade", "faixa esperada" |
| Decisão final é médica | Sistema sugere; médico aprova, edita ou descarta |
| Edição manual permitida | Valor, duração, itens inclusos e texto livres |
| Ajuste de preço antes de enviar ao paciente | Breakdown visível; alerta se abaixo do preço mínimo seguro |
| Nunca expor dados de outros pacientes | Apenas contagem agregada (n); zero identificação |
| Nunca listar pacientes individuais da comparação | Sem "fulano perdeu X kg" |
| Registrar proposta gerada | Auditoria: versão do modelo, inputs usados, edições do médico |
| Comunicação ao paciente | Material deve refletir incerteza, não marketing absoluto |

---

## 16. Segurança e LGPD

Conforme [base_dados_perda_peso.md](./base_dados_perda_peso.md):

- **Não** usar ou exportar nome, CPF, telefone, e-mail ou endereço na base analítica
- **Não** expor dados individuais na consulta ao motor
- Trabalhar com **grupos agregados**; evitar segmentos pequenos que permitam reidentificação
- **Restringir** acesso à rotina que gera/atualiza modelos (perfil administrativo)
- Versionar modelos para auditoria

---

## 17. Etapas Futuras de Implementação

| Etapa | Descrição | Status |
|-------|-----------|--------|
| **1** | Documentação da arquitetura (este documento + base de dados) | Em andamento |
| **2** | Mapeamento das coleções reais do Firestore | Pendente |
| **3** | Script offline de exportação anonimizada | Pendente |
| **4** | Primeira base estatística CSV/JSON | Pendente |
| **5** | Análise manual dos dados | Pendente |
| **6** | Calibragem de modelos de custo, margem e probabilidade por meta | Pendente |
| **7** | Rota administrativa protegida para atualizar modelos | Pendente |
| **8** | Botão "Gerar Plano Terapêutico" e tela de resumo no `/metaadmin` | Pendente |
| **9** | IA opcional para formatar texto do resumo | Pendente |

Etapas 7–9 **não impactam** a plataforma atual até ativação deliberada.

---

## 18. Riscos e Cuidados Técnicos

| Risco | Mitigação |
|-------|-----------|
| Dados incompletos na ficha | Sinalizar ao médico; reduzir confiança da estimativa |
| Paciente sem histórico suficiente na base | Ampliar segmento ou usar benchmarks globais com aviso |
| Variação de adesão | Incluir adesão na segmentação quando existir |
| Troca de medicação | Tratar como novo episódio ou segmento composto |
| Dose inconsistente | Normalizar mg na exportação |
| Exames ausentes | Segmento "sem exame"; não assumir normalidade |
| Promessa comercial exagerada | Probabilidade + faixas; nunca garantia |
| Viés de seleção no histórico | Documentar limitações; pacientes que abandonam cedo |

---

## 19. Decisão Importante

A **Base Inteligente de Precificação** (camada analítica) e o **Motor de Plano Terapêutico Oftware** (camada de produto) formam um **novo módulo analítico** da plataforma:

- **Independente** das telas, rotas e fluxos atuais
- **Focado no médico** vendendo plano terapêutico **individualizado** por paciente
- **Não** uma tabela genérica de preços Oftware aplicável a todos
- **Fundamentado em estatística interna**; IA opcional só para redação
- Implementado **em etapas**, sem impacto na produção até Etapas 7–8

**Nesta etapa:** apenas documentação. Nenhum código, botão, rota, tela ou Firestore de produção deve ser criado ou alterado.

---

## Referências internas

- [base_dados_perda_peso.md](./base_dados_perda_peso.md) — campos da exportação anonimizada
- `docs/conhecimento/regras_negocio.md` — regras de negócio da plataforma
- `docs/conhecimento/jornada_paciente.md` — jornada do paciente
- `utils/expectedCurve.ts` — curvas esperadas de perda por dose (validação cruzada futura)
