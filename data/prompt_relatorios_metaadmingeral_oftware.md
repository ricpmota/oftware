# Prompt para o Cursor — Nova Página “Relatórios” (MetaAdminGeral) + Gerador de Card Instagramável (Resultados Tirzepatida)

Você é um engenheiro full-stack senior trabalhando no projeto **Oftware** (Next.js + TypeScript). Crie uma **nova página** no painel **/metaadmingeral** chamada **Relatórios**, contendo uma feature para **gerar e exportar** uma imagem “instagramável” (PNG 1080x1350) com **estatísticas agregadas** de emagrecimento em pacientes acompanhados com **tirzepatida**.

> Objetivo: gerar **um único card** focado em **resultados**, com **dados agregados e anonimizados**, sem qualquer identificação individual, e com trava de amostra mínima (**N >= 30**).  
> Saídas: **PNG 1080×1350** e **PDF técnico (opcional, curto)** com os mesmos números.

---

## 1) Rotas / Arquitetura

### 1.1 Nova página
Criar uma rota/página nova:

- **/metaadmingeral/relatorios**

Ela deve aparecer no menu do MetaAdminGeral como **“Relatórios”**.

### 1.2 Seção do relatório
Dentro dessa página, criar uma seção (card) chamada:

- **“Resultados Metabólicos (Tirzepatida)”**

Com um formulário de filtros + botão **Gerar Card** + pré-visualização + botões de download.

---

## 2) UI/UX (requisitos visuais e fluxo)

### 2.1 Filtros
No topo do card “Resultados Metabólicos (Tirzepatida)”, incluir:

1. **Período**
   - opções rápidas: 30 / 90 / 180 dias (default: 90)
   - e opção “Personalizado” com date picker (início/fim)

2. **Tempo mínimo de acompanhamento**
   - default: **≥ 4 semanas**
   - dropdown: 4, 8, 12 semanas

3. **Status do paciente**
   - default: **Apenas ativos**
   - toggle: ativos / todos

> (Opcional futuro) Filtros amplos como faixa etária, mas só se for em faixas largas.

### 2.2 Botões
- Botão primário: **“Gerar Card”**
- Após gerar:
  - **“Download PNG (1080×1350)”**
  - **“Download PDF técnico”** (opcional; se implementar agora, ótimo)

### 2.3 Travas (anonimização)
Antes de gerar/exportar, validar:
- Se **totalPacientes < 30**, bloquear geração e mostrar alerta:
  - “Amostra insuficiente para anonimização (mínimo 30 pacientes). Ajuste o período ou filtros.”

### 2.4 Pré-visualização
Após gerar, mostrar uma prévia do card renderizado (canvas) dentro da página.

---

## 3) Dados e Cálculos (exatamente o que calcular)

### 3.1 Fonte de dados
Assuma que existe base de pacientes e registros de peso/aplicações em Firestore/Mongo (use o que já existe no projeto).  
Se necessário, crie um “service” que agregue dados a partir das coleções existentes, sem expor registros individuais no frontend.

### 3.2 Definições
- **Peso inicial**: primeiro registro de peso dentro do acompanhamento (ou primeiro dentro do período, conforme regra do projeto).
- **Peso atual**: último registro de peso disponível no período (ou último global até o fim do período, conforme regra do projeto).
- **% perda de peso** por paciente:
  - `((pesoInicial - pesoAtual) / pesoInicial) * 100`

### 3.3 Métricas obrigatórias (agregadas)
Calcular e retornar:

**Amostra**
- `totalPacientes`
- `semanasMedianasAcompanhamento`
- `aplicacoesMediasPorPaciente`

**Resultado principal**
- `medianaPerdaPesoPercent` (ex.: 8.4 para -8,4%)
- `% pacientes ≥ 5%` (percentualPacientesMaior5)
- `% pacientes ≥ 10%` (percentualPacientesMaior10)

**Por marcos de tempo**
- `mediana4SemanasPercent`
- `mediana8SemanasPercent`
- `mediana12SemanasPercent`
> Se não houver dados suficientes para um marco (ex.: poucos pacientes com 12 semanas), manter o marco, mas mostrar “—” e não quebrar o layout.

**Aderência (continuidade)**
- `% pacientes com ≥ 8 semanas`
- `% pacientes com ≥ 12 semanas`

### 3.4 Regras estatísticas
- Usar **mediana**, não média, para perda de peso.
- Percentuais arredondados para **0 casas** (ex.: 41%).
- Medianas de % perda de peso com **1 casa** (ex.: 8,4%).

---

## 4) API / Backend

### 4.1 Endpoint para cálculo do relatório
Criar um endpoint:
- `POST /api/metaadmingeral/relatorios/tirzepatida`

Body:
```json
{
  "dateStart": "YYYY-MM-DD",
  "dateEnd": "YYYY-MM-DD",
  "minWeeks": 4,
  "onlyActive": true
}
```

Response:
```json
{
  "totalPacientes": 184,
  "semanasMedianasAcompanhamento": 14,
  "aplicacoesMediasPorPaciente": 9.2,
  "medianaPerdaPesoPercent": 8.4,
  "percentualPacientesMaior5": 41,
  "percentualPacientesMaior10": 23,
  "mediana4SemanasPercent": 3.1,
  "mediana8SemanasPercent": 6.2,
  "mediana12SemanasPercent": 8.4,
  "percentualPacientes8Semanas": 78,
  "percentualPacientes12Semanas": 64
}
```

> Observação: o card mostrará “–8,4%” (negativo visual), mas os números podem vir positivos e o frontend formata com sinal.

### 4.2 Segurança
- Endpoint só pode ser chamado por usuário com role **metaadmingeral**.
- Não retornar listas de pacientes nem dados individuais.
- Se `totalPacientes < 30`, retornar status 400 com mensagem clara.

---

## 5) Geração da imagem (PNG 1080×1350)

### 5.1 Abordagem sugerida (preferida)
No frontend, renderize o card em HTML e use uma lib tipo:
- `html-to-image` (toPng)
ou
- `html2canvas`

Gerar PNG com:
- **width: 1080**
- **height: 1350**
- alta qualidade (pixelRatio 2 ou 3)

### 5.2 Layout do card (deve ser exatamente assim, em uma única imagem)

**Topo**
- Título: “Resultados do acompanhamento metabólico”
- Subtítulo: “Tirzepatida + suporte médico”
- Período: “Período analisado: DD/MM/AAAA – DD/MM/AAAA”
- Linha pequena: “Dados agregados e anonimizados”

**Bloco Amostra (3 números)**
- “Pacientes: N”
- “Tempo mediano: X semanas”
- “Aplicações médias: X,X”

**Bloco Resultado Principal (destaque, central)**
- Rótulo: “MEDIANA DE PERDA DE PESO”
- Número grande: “–X,X%”
- Abaixo (2 linhas):
  - “≥5%: YY%”
  - “≥10%: ZZ%”

**Bloco Marcos 4/8/12 semanas**
- Linha/barras simples com:
  - “4 semanas: –X,X%”
  - “8 semanas: –X,X%”
  - “12 semanas: –X,X%”
> Se algum marco não existir, usar “—”

**Bloco Aderência**
- “Continuidade ≥8 semanas: YY%”
- “Continuidade ≥12 semanas: ZZ%”

**Rodapé obrigatório (texto pequeno, mas legível)**
- “Resultados variam conforme perfil clínico, adesão, alimentação, atividade física e comorbidades.”
- “Dados apresentados de forma agregada e anonimizados.”
- “Não há garantia de resultados individuais.”
- “Conteúdo informativo e educativo.”

**Assinatura institucional**
- Logo/nome: “Oftware” (sem nome de médico)
- Não inserir CRM/RQE aqui (é institucional).

### 5.3 Nome do arquivo
Baixar como:
- `oftware_resultados_tirzepatida_YYYYMMDD.png`

---

## 6) PDF técnico (opcional, se implementar agora)
Gerar um PDF simples com:
- título, período, métricas e a mesma seção de disclaimers
- sem dados individuais
- nome: `oftware_resultados_tirzepatida_YYYYMMDD.pdf`

Pode ser gerado no frontend usando `jspdf` ou no backend.

---

## 7) Componentização e qualidade

- Criar componentes reutilizáveis:
  - `RelatoriosPage`
  - `TirzepatidaReportCard`
  - `ReportFilters`
  - `ReportPreview`
- TypeScript com tipos para request/response.
- Loading states, empty states e tratamento de erro.
- Testar responsividade da página (desktop primeiro, mas sem quebrar mobile).

---

## 8) Critérios de aceite (DoD)

✅ Nova página /metaadmingeral/relatorios acessível via menu  
✅ Formulário de filtros funcionando  
✅ Endpoint retorna métricas agregadas conforme especificação  
✅ Bloqueio quando N < 30  
✅ Prévia do card renderizada  
✅ Download PNG 1080×1350 funcionando  
✅ (Opcional) Download PDF funcionando  
✅ Sem vazamento de dados individuais  

---

## 9) Observações importantes

- O conteúdo é institucional (Oftware), não “do médico”.  
- Nunca incluir: nomes, fotos, cidades, idade exata, ou qualquer dado que permita reidentificação.  
- Usar sempre agregação e faixas amplas quando necessário.

Implemente agora com o melhor padrão do projeto atual (mesma arquitetura, estilo e componentes já existentes).
