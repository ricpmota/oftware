# Módulos Clínicos de Refração - Documentação

Este documento descreve os três módulos clínicos implementados para expandir a lógica de refração subjetiva do sistema oftalmológico.

## 📋 Visão Geral

Os módulos clínicos foram desenvolvidos para garantir a segurança e precisão da prescrição oftálmica, seguindo orientações teóricas clássicas da oftalmologia.

## 🎯 Módulo 1: Fogging Assist

### Objetivo
Implementar o teste de "fogging" (duplo borramento) para relaxar a acomodação em pacientes jovens e evitar subprescrição de hipermetropia.

### Condição de Ativação
```typescript
if (idade < 35 && tipoAmetropia === "hipermetropia") {
  ativar foggingAssist()
}
```

### Entrada Esperada
- Idade do paciente
- Refração inicial estimada (AR ou estimativa manual)
- AV inicial com correção parcial
- Presença de hipermetropia

### Saída
- Plano de conduta com adição de +1,00D ao esférico inicial
- Teste da AV com lente borradora
- Redução progressiva da lente positiva até melhor AV
- Grau final recomendado
- Observação se há ganho visual com relaxamento

### Exemplo de Uso
```typescript
import { foggingAssist } from './utils/foggingAssist';

const input = {
  age: 25,
  initialRefraction: { od: { s: 2.0, c: -0.5, e: 90 }, oe: { s: 1.75, c: -0.25, e: 85 } },
  initialVA: { od: '20/30', oe: '20/25' },
  hasHyperopia: true,
  currentVA: { od: '20/25', oe: '20/20' }
};

const result = foggingAssist(input);
console.log('Fogging ativo:', result.shouldActivate);
console.log('Ganho visual:', result.finalRecommendation.visualGain);
```

## ⚠️ Módulo 2: Cicloplegia Alert

### Objetivo
Emitir alerta clínico quando houver indicação formal de refração sob cicloplegia, especialmente em pacientes com:
- Idade < 20 anos
- Refração instável
- AV final incompatível com grau estimado

### Condição de Ativação
```typescript
if (idade < 20 || 
    diferença_AR_subjetivo > 1.00D || 
    AV_final_incompatível || 
    refração_instável) {
  ativar cicloplegiaAlert()
}
```

### Entrada Esperada
- Idade
- Diferença entre AR e subjetivo (>1,00D)
- AV final com melhor correção
- Estabilidade da refração

### Saída
- Alerta detalhado com razões clínicas
- Recomendações específicas
- Contraindicações (se aplicável)
- Próximos passos

### Exemplo de Uso
```typescript
import { cicloplegiaAlert } from './utils/cicloplegiaAlert';

const input = {
  age: 18,
  arRefraction: { od: { s: 3.0, c: -0.5, e: 90 }, oe: { s: 2.75, c: -0.25, e: 85 } },
  subjectiveRefraction: { od: { s: 1.5, c: -0.5, e: 90 }, oe: { s: 1.25, c: -0.25, e: 85 } },
  finalVA: { od: '20/40', oe: '20/40' },
  refractionStability: { od: false, oe: false },
  subjectiveImprovement: false
};

const result = cicloplegiaAlert(input);
console.log('Cicloplegia necessária:', result.shouldActivate);
console.log('Severidade:', result.alert?.severity);
```

## ⚖️ Módulo 3: Binocular Balance

### Objetivo
Ajustar a refração final para garantir equilíbrio de foco e esforço acomodativo entre os olhos, prevenindo dominância, fadiga e queixas astenópicas.

### Condição de Ativação
```typescript
if (Math.abs(od.esferico - oe.esferico) > 0.50 || 
    pacienteRelataSintomasBinoculares) {
  ativar binocularBalance()
}
```

### Entrada Esperada
- Grau final OD e OE
- AV de cada olho
- Presença de diferença > 0.50D
- Queixas subjetivas com uso binocular

### Saída
- Sugestão de balanço esférico
- Redução leve no olho dominante
- Orientação para reavaliação
- Recomendação de teste de tolerância

### Exemplo de Uso
```typescript
import { binocularBalance } from './utils/binocularBalance';

const input = {
  finalRefraction: { od: { s: 2.0, c: -0.5, e: 90 }, oe: { s: 1.25, c: -0.25, e: 85 } },
  visualAcuity: { od: '20/20', oe: '20/20' },
  dominantEye: 'od',
  binocularSymptoms: {
    headache: true,
    eyeStrain: false,
    blurredVision: false,
    doubleVision: false,
    fatigue: true
  },
  patientReports: 'Dor de cabeça após 2 horas de uso'
};

const result = binocularBalance(input);
console.log('Equilíbrio necessário:', result.shouldActivate);
console.log('Ajuste recomendado:', result.recommendedAdjustment);
```

## 🔗 Integração dos Módulos

### Arquivo Principal: `refractionModules.ts`

Este arquivo integra os três módulos e fornece uma interface unificada:

```typescript
import { runRefractionModules } from './utils/refractionModules';

const input = {
  age: 25,
  hasHyperopia: true,
  arRefraction: { /* dados AR */ },
  finalRefraction: { /* dados finais */ },
  // ... outros dados
};

const result = runRefractionModules(input);

// Verificar se pode prescrever
if (result.finalRecommendation.canPrescribe) {
  console.log('Prescrição:', result.finalRecommendation.prescription);
} else {
  console.log('Próximos passos:', result.finalRecommendation.nextSteps);
}
```

### Fluxo de Decisão

1. **Fogging**: Se ativo, ajusta grau para hipermetropia latente
2. **Cicloplegia**: Se ativo, bloqueia prescrição até reavaliação
3. **Binocular Balance**: Se ativo, ajusta equilíbrio entre olhos

### Regras de Prioridade

- **Cicloplegia tem prioridade máxima**: Se ativo, nenhuma prescrição é permitida
- **Fogging e Binocular Balance**: Podem ser aplicados simultaneamente
- **Ordem de aplicação**: Fogging → Binocular Balance → Prescrição Final

## 🧪 Testes e Validação

### Teste de Fogging
```typescript
// Paciente jovem com hipermetropia
const testInput = {
  age: 25,
  hasHyperopia: true,
  // ... outros dados
};
// Resultado esperado: fogging ativo, ganho visual detectado
```

### Teste de Cicloplegia
```typescript
// Paciente pediátrico com refração instável
const testInput = {
  age: 15,
  refractionStability: { od: false, oe: false },
  // ... outros dados
};
// Resultado esperado: cicloplegia obrigatória
```

### Teste de Equilíbrio Binocular
```typescript
// Diferença esférica significativa
const testInput = {
  finalRefraction: { od: { s: 2.0 }, oe: { s: 1.0 } },
  // ... outros dados
};
// Resultado esperado: ajuste binocular recomendado
```

## 📊 Monitoramento e Logs

Cada módulo gera logs clínicos detalhados:

```typescript
console.log('Notas clínicas:', result.finalRecommendation.clinicalNotes);
console.log('Próximos passos:', result.finalRecommendation.nextSteps);
console.log('Razão da decisão:', result.finalRecommendation.reason);
```

## 🔧 Customização

### Adicionar Novos Critérios
```typescript
// Em foggingAssist.ts
const shouldActivate = age < 35 && hasHyperopia && additionalCriteria;
```

### Modificar Limites
```typescript
// Em cicloplegiaAlert.ts
const maxSphereDifference = 1.5; // Alterar de 1.0 para 1.5
```

### Ajustar Aplicação
```typescript
// Em binocularBalance.ts
const adjustmentAmount = sphereDifference > 1.5 ? 0.375 : 0.25;
```

## 📚 Referências Clínicas

- **Fogging**: Duane's Clinical Ophthalmology, Vol. 1
- **Cicloplegia**: American Academy of Ophthalmology Guidelines
- **Binocular Balance**: Borish's Clinical Refraction

---

**Desenvolvido para garantir a segurança e precisão da prescrição oftálmica assistida por computador.** 