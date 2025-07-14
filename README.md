# Oftalmo - Assistente Clínico Oftalmológico

O módulo **/oftalmo** é um assistente clínico para oftalmologistas e optometristas, desenvolvido para facilitar o fluxo de análise clínica, prescrição de lentes, assinatura digital de laudos e exportação de relatórios em PDF.

## ✨ Funcionalidades Principais

- **Cadastro e Edição de Perfil do Médico**
  - Nome, CRM, especialidade, sexo
  - Assinatura digital (captura via canvas)
- **Entrada de Dados do Paciente**
  - Dados demográficos, sintomas, medições do auto-refrator
- **Análise Clínica Automatizada**
  - Cálculo de médias, variabilidade, estabilidade
  - Sugestão de roteiro subjetivo
- **Módulos Clínicos de Refração**
  - **Fogging Assist**: Duplo borramento para hipermetropia latente
  - **Cicloplegia Alert**: Alerta de cicloplegia obrigatória
  - **Binocular Balance**: Equilíbrio binocular final
- **Prescrição Final**
  - Grau para longe e perto, adição automática
  - Resumo em tabela
- **Assinatura Digital**
  - Captura, visualização e inclusão automática no PDF
- **Exportação de Relatório em PDF**
  - Laudo completo com dados do paciente, prescrição e assinatura do médico
- **Fluxo de Edição e Cancelamento**
  - Permite editar e cancelar alterações no perfil

## 🛠️ Tecnologias Utilizadas

- **Next.js** (App Router)
- **React**
- **Tailwind CSS**
- **Firebase** (Auth, Firestore)
- **jsPDF** e **jspdf-autotable** (geração de PDF)

## 🚀 Como Usar

1. **Acesse o módulo /oftalmo**
2. Faça login e cadastre seu perfil profissional (com assinatura digital)
3. Preencha os dados do paciente e medições
4. Siga o roteiro clínico sugerido
5. Gere e revise a prescrição final
6. Exporte o laudo em PDF (com assinatura digital)

## 📋 Fluxo Principal

1. **Login e Perfil**: O médico faz login e preenche/edita seu perfil, incluindo assinatura digital.
2. **Entrada de Dados**: Preenche dados do paciente e medições do auto-refrator.
3. **Análise Clínica**: O sistema calcula médias, sugere roteiro subjetivo e destaca alertas clínicos.
4. **Prescrição**: O médico revisa e ajusta a prescrição final.
5. **Exportação**: O laudo pode ser exportado em PDF, incluindo a assinatura digital do médico.

## 🖊️ Exemplo de Uso

### Assinatura Digital
```jsx
// Exemplo de inclusão da assinatura digital no PDF (jsPDF)
import jsPDF from 'jspdf';

const doc = new jsPDF();
// ... outros conteúdos
if (doctorProfile.digitalSignature) {
  doc.addImage(doctorProfile.digitalSignature, 'JPEG', 20, 250, 60, 20);
}
doc.save('laudo-oftalmo.pdf');
```

### Módulos Clínicos de Refração
```jsx
// Exemplo de uso dos módulos clínicos
import { runRefractionModules } from './utils/refractionModules';

const input = {
  age: 25,
  hasHyperopia: true,
  arRefraction: { od: { s: 2.0, c: -0.5, e: 90 }, oe: { s: 1.75, c: -0.25, e: 85 } },
  finalRefraction: { od: { s: 1.5, c: -0.5, e: 90 }, oe: { s: 1.25, c: -0.25, e: 85 } },
  // ... outros dados
};

const result = runRefractionModules(input);
console.log('Pode prescrever:', result.finalRecommendation.canPrescribe);
console.log('Próximos passos:', result.finalRecommendation.nextSteps);
```

## ⚙️ Customização

- **Adicionar campos**: Edite os componentes de formulário em `/components`.
- **Alterar lógica clínica**: Ajuste os utilitários em `/utils`.
- **Personalizar PDF**: Edite a função de exportação em `/components/FinalPrescription.tsx`.

## ☁️ Deploy no Vercel

1. Faça login no [Vercel](https://vercel.com/)
2. Conecte o repositório do projeto
3. Configure as variáveis de ambiente (Firebase, etc.)
4. Deploy automático a cada push ou rode `vercel --prod`

## 📂 Estrutura dos Principais Arquivos

- `page.tsx` — fluxo principal e roteamento
- `components/DoctorProfileSetup.tsx` — cadastro/edição do médico
- `components/DigitalSignature.tsx` — captura da assinatura
- `components/ClinicalAnalysis.tsx` — análise clínica
- `components/FinalPrescription.tsx` — prescrição e exportação PDF
- `utils/` — lógica de análise e sugestões
  - `foggingAssist.ts` — duplo borramento para hipermetropia latente
  - `cicloplegiaAlert.ts` — alerta de cicloplegia obrigatória
  - `binocularBalance.ts` — equilíbrio binocular final
  - `refractionModules.ts` — integração dos módulos clínicos

## 👨‍⚕️ Público-Alvo
- Oftalmologistas
- Optometristas
- Clínicas e consultórios

---

**Dúvidas ou sugestões?** Abra uma issue ou entre em contato com o time de desenvolvimento. 