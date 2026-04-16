# Sistema Nutri - Documentação Técnica

## 📋 Visão Geral

O Sistema Nutri é um módulo completo de acompanhamento nutricional integrado ao painel do paciente em `/meta`. Ele permite que pacientes em tratamento com Tirzepatida recebam um plano nutricional personalizado, façam check-ins diários e personalizem seu cardápio conforme suas preferências e restrições alimentares.

## 🏗️ Arquitetura

### Localização do Código
- **Componente Principal**: `components/NutriContent.tsx`
- **Integração**: `app/meta/page.tsx` (aba "Nutri")
- **Firestore**: 
  - Plano: `pacientes_completos/{idPaciente}/nutricao/plano`
  - Check-ins: `pacientes_completos/{idPaciente}/nutricao/dados/checkins/{data}`

### Estrutura de Dados

#### PlanoNutricional
```typescript
interface PlanoNutricional {
  estilo: 'digestiva' | 'plant_based' | 'mediterranea' | 'rico_proteina' | 'low_carb_moderada';
  protDia_g: number;                    // Meta de proteína diária em gramas
  aguaDia_ml: number;                    // Meta de água diária em ml
  refeicoes: number;                     // Número de refeições (padrão: 5)
  distribuicaoProteina: {                // Distribuição de proteína por refeição
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  modeloDia: {                           // Descrições das refeições
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  opcoesSelecionadas?: {                 // IDs das opções selecionadas (para personalização)
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  evitar: string[];                      // Lista de alimentos/hábitos a evitar
  criadoEm: Date;
  descricaoEstilo?: string;              // Descrição do estilo alimentar
  hipoteseComportamental?: string;       // Mini parecer Nutro gerado do wizard
  suplementos?: {                        // Recomendações de suplementos
    probiotico: string;
    whey: string;
    creatina: string;
  };
  restricoesPaciente?: string[];          // Restrições do paciente (para filtrar opções)
  preferenciasProteinaPaciente?: string[]; // Preferências de proteína (para ordenar opções)
}
```

#### CheckInDiario
```typescript
interface CheckInDiario {
  // Alimentação/hidratação
  proteinaOk: boolean;
  frutasOk: boolean;
  aguaOk: boolean;
  lixoAlimentar: boolean;
  
  // Suplementos
  probioticoTomou: boolean;
  wheyTomou: boolean;
  creatinaTomou: boolean;
  
  // Sintomas gastrointestinais
  sintomasGI: 'nenhum' | 'leve' | 'moderado' | 'grave';
  nauseas: 'nenhum' | 'leve' | 'moderado' | 'grave';
  constipacao: 'nenhum' | 'leve' | 'moderado' | 'grave';
  diarreia: 'nenhum' | 'leve' | 'moderado' | 'grave';
  
  // Sono, energia e humor
  horasSono: '<6h' | '6-8h' | '>8h';
  humorEnergia: number; // escala 1-5
  
  // Movimento / atividade
  atividadeFisicaHoje: 'nenhuma' | 'leve' | 'moderada' | 'intensa';
  
  // Tirzepatida
  diaAplicacao: 'nao_foi_dia' | 'aplicou_no_horario' | 'aplicou_atrasado' | 'esqueceu';
  localAplicacao?: 'abdome' | 'coxa' | 'braco' | 'outro';
  
  // Metadados
  observacoes?: string;
  aderenciaPlano?: number; // 0-100%
  pesoHoje?: number; // kg (opcional)
  sintomasAumentoDose?: 'nenhum' | 'leve' | 'moderado' | 'intenso';
  score: number; // 0-100 (calculado automaticamente)
  data: string; // formato 'YYYY-MM-DD'
}
```

## 🔄 Fluxo de Funcionamento

### 1. Inicialização
Ao acessar a aba "Nutri", o sistema:
1. Verifica se o paciente possui IMC calculado
2. Se não tiver IMC, solicita peso e altura
3. Verifica se já existe um plano nutricional salvo
4. Se não existir, inicia o wizard de anamnese nutricional

### 2. Wizard de Anamnese (9 Passos)

O wizard coleta informações clínicas detalhadas:

**Step 1: Objetivo Principal**
- Perda de peso, recomposição, controle glicemia, melhora disposição, manutenção

**Step 2: Rotina e Jornada de Trabalho**
- Horário de trabalho (diurno, noturno, turnos)
- Horas sentado por dia (<4h, 4-8h, >8h)

**Step 3: Histórico de Peso e Dietas**
- Dietas nos últimos 12 meses
- Efeito sanfona
- Peso máximo e mínimo dos últimos 2 anos

**Step 4: Padrão de Fome / Saciedade**
- Fome matinal e noturna (escala 0-10)
- Vontade de doce (escala 0-10)
- Pula café da manhã
- Chega com muita fome no jantar

**Step 5: Padrão de Atividade Física**
- Frequência de exercícios (nunca, 1-2x, 3-4x, 5-7x por semana)

**Step 6: Sono e Cronotipo Detalhado**
- Horas de sono (<6h, 6-8h, >8h)
- Horário de dormir
- Acorda descansado

**Step 7: Padrão Alimentar**
- Comportamentos alimentares (pula refeições, come rápido, belisco, etc.)
- Número de refeições por dia
- Fome emocional
- Compulsão noturna

**Step 8: Álcool e Finais de Semana**
- Doses de álcool por semana
- Comportamento nos finais de semana

**Step 9: Preferências e Restrições**
- Restrições: vegetariano, vegano, intolerância lactose, sem glúten, nenhuma
- Preferências de proteína: Carne, Frango, Peixe, Ovos, Laticínios, Leguminosas
- Sintomas gastrointestinais

### 3. Geração Automática do Plano

Após completar o wizard, o sistema gera automaticamente:

#### Cálculo de Proteína Diária
```javascript
if (IMC < 27) → protDia_g = peso * 1.2 g/kg
if (IMC >= 27 && IMC <= 32) → protDia_g = peso * 1.4 g/kg
if (IMC > 32) → protDia_g = peso * 1.5 g/kg
```

#### Cálculo de Água Diária
```javascript
aguaDia_ml = peso(kg) * 35 ml
```

#### Determinação do Estilo Alimentar
1. **Digestiva**: Se sintomas GI moderados ou graves
2. **Plant Based**: Se vegetariano ou vegano
3. **Mediterrânea**: Se sedentário + comportamentos ruins
4. **Rico em Proteína**: Se IMC >= 32 ou objetivo = recomposição
5. **Low Carb Moderada**: Caso padrão

#### Geração de Opções de Cardápio
- Para cada refeição (café, lanche1, almoço, lanche2, jantar), o sistema gera 3 opções:
  - Opção alta proteína
  - Opção equilibrada
  - Opção leve
- As opções são filtradas baseadas em:
  - Restrições do paciente (vegetariano, vegano, lactose, glúten)
  - Preferências de proteína (ordenadas por relevância)

#### Seleção Automática
- O sistema seleciona automaticamente a primeira opção de cada refeição
- Essas seleções são salvas em `opcoesSelecionadas`
- O `modeloDia` é gerado a partir das opções selecionadas

### 4. Exibição do Plano

O plano é exibido em 5 abas:

#### Aba "Plano Nutri"
- Hipótese comportamental (mini parecer Nutro)
- Estilo alimentar com descrição
- Meta de proteína diária
- Meta de água diária
- Recomendações de suplementos
- Botão "Check-in Diário"

#### Aba "Proteínas"
- Distribuição de proteína por refeição
- Gráfico visual da distribuição

#### Aba "Cardápio"
- Cards clicáveis para cada refeição
- Cada card mostra a descrição atual da refeição
- Ícone de edição em cada card
- Ao clicar, abre modal de personalização

#### Aba "Alertas"
- Lista de alimentos e hábitos a evitar
- Exibidos como chips estilizados

#### Aba "Histórico"
- Resumo dos últimos 7 check-ins (média de score, total, melhor dia)
- Timeline de 14 dias com scores
- Badges de aderência (7 dias)
- Lista completa de check-ins com detalhes

### 5. Personalização do Cardápio

#### Modal de Edição
Ao clicar em uma refeição:
1. Abre modal com todas as opções disponíveis para aquela refeição
2. Cada opção mostra:
   - Título
   - Descrição completa
   - Proteína aproximada (g)
   - Calorias aproximadas (kcal)
3. O paciente seleciona uma opção (radio button)
4. O sistema calcula em tempo real:
   - Proteína total do dia com essa escolha
   - Calorias totais estimadas
   - Comparação com a meta mínima (90% da meta)

#### Ajuste Automático de Proteína
Se a escolha do paciente fizer a proteína total ficar abaixo de 90% da meta:
1. O sistema tenta ajustar automaticamente os lanches
2. Prioriza opções com whey protein nos lanches
3. Se necessário, ajusta ambos os lanches
4. Exibe mensagem informativa sobre o ajuste
5. Se mesmo assim não atingir a meta, mostra aviso mas permite salvar

#### Salvamento
- Ao salvar, apenas `opcoesSelecionadas` e `modeloDia` são atualizados
- Outros campos do plano permanecem intactos
- Dados são persistidos no Firestore

### 6. Check-in Diário

#### Seleção de Data
- Campo de data permite selecionar:
  - Hoje
  - Até 3 dias atrás
  - Não permite datas futuras
- Se já existe check-in para a data selecionada:
  - Formulário entra em modo edição
  - Campos são preenchidos com dados existentes
  - Mensagem informativa é exibida

#### Formulário de Check-in
Organizado em cards temáticos:

**Card 1 - Alimentação e Proteína**
- Bati a meta de proteína do dia
- Comi frutas/vegetais conforme o plano
- Evitei lixos alimentares importantes

**Card 2 - Água e Suplementos**
- Bebi pelo menos X ml de água (puxa do plano)
- Tomei probiótico
- Tomei whey protein
- Tomei creatina

**Card 3 - Sintomas Gastrointestinais**
- Náuseas (nenhum, leve, moderado, grave)
- Constipação (nenhum, leve, moderado, grave)
- Diarreia (nenhum, leve, moderado, grave)
- Sintomas GI geral (calculado como o pior)

**Card 4 - Sono, Energia e Humor**
- Horas de sono (<6h, 6-8h, >8h)
- Humor/energia (escala 1-5 com labels)

**Card 5 - Aplicação da Tirzepatida** (condicional)
- Aparece apenas se hoje for dia de aplicação
- Determinação automática baseada em `planoTerapeutico.startDate` e `injectionDayOfWeek`
- Opções: aplicou no horário, aplicou atrasado, esqueceu
- Se aplicou, pergunta local da aplicação

**Card 6 - Movimento / Atividade**
- Atividade física hoje (nenhuma, leve, moderada, intensa)

**Card 7 - Aderência ao Plano**
- Slider 0-100%
- Botões rápidos (25%, 50%, 75%, 100%)

**Card 8 - Peso** (condicional)
- Aparece apenas se último peso tiver mais de 7 dias
- Input numérico para peso em kg

**Card 9 - Sintomas Aumento Dose** (condicional)
- Aparece apenas se for semana de aumento de dose
- Pergunta sobre aumento de sintomas GI

**Card 10 - Observações**
- Textarea para observações livres

#### Cálculo do Score
O score é calculado como um índice global de adesão (0-100):

```
Score = (
  Aderência ao plano (30%) +
  Alimentação (30%) +
  Suplementos (15%) +
  Sintomas GI (15%) +
  Sono e energia (5%) +
  Atividade física (3%) +
  Adesão Tirzepatida (2%)
) / 100 * 100
```

**Detalhamento:**
- **Aderência ao plano (30%)**: Valor direto de `aderenciaPlano` (0-100%)
- **Alimentação (30%)**: 
  - Proteína OK: 25%
  - Frutas OK: 25%
  - Água OK: 25%
  - Sem lixo: 25%
- **Suplementos (15%)**:
  - Probiótico: 33.3%
  - Whey: 33.3%
  - Creatina: 33.3%
- **Sintomas GI (15%)**:
  - Quanto menos sintomas, melhor
  - Penaliza sintomas moderados/graves
- **Sono e energia (5%)**:
  - Horas de sono adequadas (6-8h ideal)
  - Humor/energia (escala 1-5)
- **Atividade física (3%)**:
  - Qualquer atividade é positiva
- **Adesão Tirzepatida (2%)**:
  - Apenas se for dia de aplicação
  - Verifica se aplicou corretamente

#### Salvamento
- Cada check-in é salvo como um documento único por data
- ID do documento = data no formato 'YYYY-MM-DD'
- Permite apenas 1 check-in por data
- Permite edição de check-ins até 3 dias atrás

## 🎯 Regras Nutricionais

### Distribuição de Proteína por Refeição
```
Proteína por refeição = protDia_g / 5

Café da Manhã: protPorRefeicao * 1.3
Almoço: protPorRefeicao * 1.3
Jantar: protPorRefeicao * 1.3
Lanche 1: protPorRefeicao * 0.8
Lanche 2: protPorRefeicao * 0.8
```

### Filtragem de Opções por Restrições

#### Vegetariano
- ❌ Remove: carne, frango, peixe, atum, salmão
- ✅ Permite: ovos, laticínios, leguminosas

#### Vegano
- ❌ Remove: carne, frango, peixe, ovos, queijo, iogurte, whey
- ✅ Permite: apenas opções vegetais

#### Intolerância à Lactose
- ❌ Remove: iogurte, queijo, laticínios (exceto se mencionar "sem lactose" ou "vegetal")
- ✅ Permite: opções sem lactose explicitamente

#### Sem Glúten
- ❌ Remove: pão, trigo, farinha (exceto se mencionar "sem glúten")
- ✅ Permite: opções sem glúten explicitamente

### Ordenação por Preferências
As opções são ordenadas priorizando aquelas que atendem às preferências de proteína do paciente:
- Carne: prioriza opções com carne, patinho, alcatra
- Frango: prioriza opções com frango
- Peixe: prioriza opções com peixe, salmão, atum
- Ovos: prioriza opções com ovos
- Laticínios: prioriza opções com queijo ou iogurte
- Leguminosas: prioriza opções com lentilha, grão-de-bico, feijão, tofu

## 🔐 Integração com Firestore

### Estrutura de Coleções

```
pacientes_completos/
  {idPaciente}/
    nutricao/
      plano/                    # Documento único com o plano nutricional
        - estilo
        - protDia_g
        - aguaDia_ml
        - modeloDia
        - opcoesSelecionadas
        - restricoesPaciente
        - preferenciasProteinaPaciente
        - ...
      dados/                    # Documento intermediário (para número par de segmentos)
        checkins/               # Subcoleção de check-ins
          {data}/               # Documento por data (formato: YYYY-MM-DD)
            - proteinaOk
            - frutasOk
            - aguaOk
            - score
            - data
            - timestamp
            - ...
```

### Regras de Segurança
```javascript
match /pacientes_completos/{pacienteId} {
  match /nutricao/plano {
    allow read: if request.auth != null;
    allow write: if request.auth != null && request.auth.uid == pacienteId;
  }
  
  match /nutricao/dados/checkins/{checkinId} {
    allow read: if request.auth != null;
    allow write: if request.auth != null && request.auth.uid == pacienteId;
  }
}
```

## 🔄 Compatibilidade com Planos Antigos

O sistema é retrocompatível com planos criados antes da implementação de personalização:

1. **Se `opcoesSelecionadas` não existir**:
   - Sistema gera opções baseadas no estilo
   - Seleciona primeira opção de cada refeição como padrão
   - Regenera `modeloDia` a partir das opções
   - Salva `opcoesSelecionadas` no plano

2. **Se `restricoesPaciente` não existir**:
   - Usa arrays vazios para filtragem
   - Não filtra opções (mostra todas)

3. **Check-ins antigos**:
   - Campos novos têm valores padrão seguros
   - Sistema funciona normalmente mesmo com check-ins incompletos

## 📊 Funcionalidades Avançadas

### Hipótese Comportamental
Geração automática de um mini parecer Nutro baseado nas respostas do wizard:
- Rotina e atividade física
- Qualidade do sono
- Padrões de fome e saciedade
- Comportamentos alimentares
- Histórico de dietas

### Suplementos Recomendados
Recomendações automáticas baseadas no estilo:
- **Probiótico**: Para todos os estilos (importante com Tirzepatida)
- **Whey Protein**: Para estilos ricos em proteína ou quando necessário atingir meta
- **Creatina**: Para pacientes com atividade física regular

### Ajuste Automático de Proteína
Quando o paciente personaliza o cardápio e a proteína fica abaixo da meta mínima:
1. Sistema identifica lanches que podem ser ajustados
2. Prioriza opções com whey protein
3. Ajusta automaticamente sem pedir permissão
4. Informa o paciente sobre o ajuste
5. Se não conseguir atingir, permite salvar com aviso

## 🎨 Interface do Usuário

### Design Responsivo
- Layout adaptativo para mobile e desktop
- Navegação por abas no mobile com scroll horizontal
- Cards com gradientes e ícones do Lucide React
- Feedback visual claro (cores, badges, ícones)

### Acessibilidade
- Labels descritivos
- Contraste adequado
- Navegação por teclado
- Mensagens de erro claras

## 🚀 Expansões Futuras (Fase 2)

O código está preparado para:
- Score semanal e mensal
- Conteúdo adaptativo baseado em histórico
- Alertas automáticos mais sofisticados
- Gráficos de evolução
- Integração com outros módulos do sistema
- Relatórios para médicos

## 📝 Notas Técnicas

### Timezone
- Todas as datas são tratadas no formato 'YYYY-MM-DD' (string)
- Formatação usa timezone local do Brasil
- Funções auxiliares evitam problemas de conversão UTC

### Performance
- Check-ins são carregados sob demanda (quando aba Histórico é selecionada)
- Opções de refeições são geradas uma vez e armazenadas em estado
- Filtragem e ordenação são feitas em memória (rápido)

### Validações
- Data do check-in: máximo 3 dias retroativos, não permite futuro
- Proteína mínima: 90% da meta (ajuste automático tenta manter)
- Campos obrigatórios validados antes de salvar

---

**Última atualização**: Dezembro 2024  
**Versão**: 1.0  
**Autor**: Sistema Oftware

