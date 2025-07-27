# Oftware - Sistema de Gestão Clínica Oftalmológica

## 📋 Visão Geral

O **Oftware** é um sistema completo de gestão clínica oftalmológica desenvolvido com tecnologias modernas para auxiliar médicos oftalmologistas no processo de refração, gestão de pacientes e prescrição oftálmica.

**🌐 Site:** [oftware.com.br](https://oftware.com.br)

### 🎯 Objetivos do Projeto
- **Automatizar** o processo de refração subjetiva
- **Padronizar** a prescrição oftálmica
- **Integrar** dados clínicos em um único sistema
- **Facilitar** o gerenciamento de pacientes
- **Melhorar** a precisão diagnóstica através de IA

### 📊 Status do Projeto
- ✅ **Módulo de Refração** - Implementado e funcional
- ✅ **Sistema de Autenticação** - Implementado
- ✅ **Gestão de Pacientes** - Implementado
- ✅ **Módulos Clínicos Avançados** - Implementados
- ✅ **Módulo de Retina** - Implementado e funcional
- 🔄 **Módulo de Catarata** - Em desenvolvimento
- 🔄 **Módulo de Glaucoma** - Em desenvolvimento

## 🚀 Tecnologias Utilizadas

### Frontend
- **Next.js 15** - Framework React com App Router
- **React 19** - Biblioteca para interfaces de usuário
- **TypeScript** - Tipagem estática para maior segurança
- **Tailwind CSS 4** - Framework CSS utilitário para estilização
- **Context API** - Gerenciamento de estado global

### Backend & Infraestrutura
- **Firebase** - Backend como serviço (Firestore, Authentication)
- **Vercel** - Deploy e hospedagem automática
- **GitHub** - Controle de versão e CI/CD

### Ferramentas de Desenvolvimento
- **ESLint** - Linting de código
- **Turbopack** - Bundler rápido para desenvolvimento
- **PostCSS** - Processamento CSS

## 🏗️ Arquitetura do Sistema

### Estrutura de Pastas
```
oftware/
├── app/                    # App Router do Next.js
│   ├── layout.tsx         # Layout principal
│   ├── page.tsx           # Página inicial
│   └── globals.css        # Estilos globais
├── components/            # Componentes React
│   ├── Refraction.tsx     # Módulo principal de refração
│   ├── ClinicalAnalysis.tsx # Análise clínica
│   ├── FinalPrescription.tsx # Prescrição final
│   ├── Patients.tsx       # Gestão de pacientes
│   ├── Navigation.tsx     # Navegação principal
│   ├── Cataract.tsx       # Módulo de catarata (em dev)
│   ├── Glaucoma.tsx       # Módulo de glaucoma (em dev)
│   ├── Retina.tsx         # Módulo de retina (implementado)
│   ├── RetinaLaudoForm.tsx # Formulário de retinografia
│   ├── OctLaudoForm.tsx   # Formulário de OCT
│   ├── UltrassomLaudoForm.tsx # Formulário de ultrassom
│   ├── RetinopatiaDiabeticaModal.tsx # Modal explicativo RD
│   ├── AchadosAdicionaisModal.tsx # Modal explicativo achados
│   ├── PatologiasBinocularesModal.tsx # Modal explicativo patologias
│   ├── CalculadoraRDModal.tsx # Calculadora de tratamento RD
│   └── ...               # Outros componentes
├── contexts/              # Contextos React
│   └── PatientContext.tsx # Contexto global de pacientes
├── services/              # Serviços de API
│   ├── patientService.ts  # Serviços de pacientes
│   └── doctorService.ts   # Serviços de médicos
├── types/                 # Definições TypeScript
│   ├── clinical.ts        # Tipos clínicos
│   └── doctor.ts          # Tipos de médicos
├── utils/                 # Utilitários e helpers
│   ├── analyzeARData.ts   # Análise de dados AR
│   ├── clinicalAlerts.ts  # Alertas clínicos
│   ├── foggingAssist.ts   # Assistente de fogging
│   ├── cicloplegiaAlert.ts # Alertas de cicloplegia
│   ├── binocularBalance.ts # Balanço binocular
│   ├── refractionModules.ts # Integração dos módulos
│   └── ...               # Outros utilitários
├── lib/                   # Configurações
│   └── firebase.ts        # Configuração Firebase
└── public/                # Arquivos estáticos
    └── icones/           # Ícones do sistema
```

## 🎯 Funcionalidades Principais

### 1. Sistema de Autenticação
- **Login com Google** - Autenticação via Firebase Auth
- **Perfil Médico** - Configuração de dados profissionais
- **Assinatura Digital** - Upload e uso de assinatura digital
- **Sessões Seguras** - Proteção de rotas para usuários autenticados

### 2. Módulo de Refração Assistida

#### **Etapa 1: Dados do Paciente**
- Cadastro completo de informações pessoais
- Histórico médico (sintomas, diagnósticos)
- Medições de AR (Auto Refratômetro) - 3 medições por olho
- Salvamento automático no Firebase

#### **Etapa 2: Análise Clínica**
- **Análise Automática dos Dados AR:**
  - Cálculo de médias e variabilidade
  - Classificação de ametropia
  - Sugestões clínicas baseadas em IA
  - Alertas para casos especiais

- **Prescrição Final:**
  - Grau para longe (OD/OE)
  - Grau para perto (OD/OE)
  - Adição para presbiopia
  - Acuidade visual
  - Tipo de lente sugerida
  - Melhora subjetiva

#### **Etapa 3: Prescrição Final**
- **Resumo Completo do Paciente**
- **Prescrição Detalhada** (longe e perto)
- **Observações Clínicas**
- **Alertas e Recomendações**
- **Botão de Impressão** da prescrição
- **Finalização da Consulta**

### 3. Módulos Clínicos Avançados

#### **Fogging Assist**
- **Objetivo:** Relaxar acomodação em pacientes jovens com hipermetropia
- **Ativação:** Idade < 35 anos + hipermetropia
- **Funcionalidade:** Adição de +1,00D ao esférico inicial

#### **Cicloplegia Alert**
- **Objetivo:** Alertar sobre necessidade de refração sob cicloplegia
- **Ativação:** Idade < 20 anos ou diferença AR-subjetivo > 1,00D
- **Funcionalidade:** Bloqueia prescrição até reavaliação

#### **Binocular Balance**
- **Objetivo:** Equilibrar foco entre os olhos
- **Ativação:** Diferença > 0,50D entre olhos
- **Funcionalidade:** Ajusta equilíbrio esférico

### 4. Gestão de Pacientes

#### **Prontuário Completo**
- Lista de todos os pacientes
- Busca por nome ou telefone
- Visualização detalhada de cada paciente
- Histórico completo de consultas

#### **Dados Salvos por Paciente:**
- **Informações Pessoais:** Nome, idade, gênero, contato
- **Dados Clínicos:** Sintomas, diagnósticos conhecidos
- **Medições AR:** Todas as medições do auto refratômetro
- **Prescrição Final:** Graus, acuidade, tipo de lente
- **Observações Clínicas:** Variabilidade, ametropia, sugestões
- **Status da Consulta:** Concluída ou em andamento

### 5. Módulo de Retina (Implementado)

#### **Modalidades de Exame Disponíveis:**
- **Retinografia** - Fotografia digital do fundo de olho
- **OCT** - Tomografia de Coerência Óptica (mácula e papila)
- **Ultrassom** - Ultrassonografia Ocular (modo B)

#### **Funcionalidades Principais:**
- **Laudos Estruturados** - Geração automática de laudos profissionais
- **Suporte Binocular** - Avaliação separada de OD e OS
- **Modais Explicativos** - Classificações detalhadas e critérios diagnósticos
- **Calculadora de Tratamento RD** - Conduta terapêutica para Retinopatia Diabética
- **Interface Responsiva** - Otimizada para desktop e mobile
- **Proteção contra Tradução** - Termos médicos preservados corretamente

#### **Patologias Cobertas:**
- **Patologias Vasculares:** RD, RH, oclusões vasculares
- **Patologias Degenerativas:** DMRI, retinose pigmentar
- **Patologias Inflamatórias:** Uveíte, coriorretinite
- **Patologias Neoplásicas:** Melanoma, retinoblastoma

### 6. Módulos em Desenvolvimento
- **Catarata** - Avaliação clínica e planejamento cirúrgico
- **Glaucoma** - Avaliação e monitoramento

## 🔄 Fluxo de Trabalho

### Processo Completo de Refração

1. **Login do Médico**
   - Autenticação via Google
   - Carregamento do perfil profissional

2. **Início da Refração**
   - Clique em "Novo Paciente" ou "Abrir Prontuário"
   - Seleção de paciente existente ou criação de novo

3. **Etapa 1: Dados do Paciente**
   - Preenchimento de informações pessoais
   - Adição de sintomas e diagnósticos
   - Inserção de medições AR (3 medições por olho)
   - Salvamento automático no Firebase

4. **Etapa 2: Análise Clínica**
   - **Análise Automática:**
     - Cálculo de médias das medições AR
     - Análise de variabilidade
     - Classificação de ametropia
     - Geração de sugestões clínicas
   
   - **Prescrição Manual:**
     - Ajuste dos graus finais
     - Definição de acuidade visual
     - Seleção de tipo de lente
     - Avaliação de melhora subjetiva

5. **Etapa 3: Prescrição Final**
   - Visualização completa da prescrição
   - Observações clínicas detalhadas
   - Impressão da prescrição
   - Finalização da consulta

6. **Prontuário**
   - Todos os dados salvos automaticamente
   - Acesso completo ao histórico
   - Visualização detalhada de cada consulta

## 💾 Estrutura de Dados

### PatientData (Dados do Paciente)
```typescript
interface PatientData {
  id: string;                    // ID único do paciente
  name: string;                  // Nome completo
  birthDate: string;             // Data de nascimento
  age: number;                   // Idade calculada
  gender: 'male' | 'female' | 'other' | '';
  usesGlasses: boolean;          // Usa óculos atualmente
  phone?: string;                // Telefone
  email?: string;                // Email
  
  // Dados Clínicos
  symptoms: string[];            // Lista de sintomas
  knownDiagnoses: string[];      // Diagnósticos conhecidos
  
  // Medições AR
  arMeasurements: {
    od: Array<{ s: number; c: number; e: number }>; // Olho direito
    oe: Array<{ s: number; c: number; e: number }>; // Olho esquerdo
  };
  
  // Resultados da Consulta
  finalPrescription?: FinalPrescriptionData;  // Prescrição final
  clinicalResult?: ClinicalResult;            // Análise clínica
  
  // Status da Consulta
  consultationCompleted?: boolean;
  consultationCompletedAt?: string;
  
  // Metadados
  createdAt: string;
  updatedAt: string;
}
```

### FinalPrescriptionData (Prescrição Final)
```typescript
interface FinalPrescriptionData {
  // Prescrição para Longe
  finalPrescription: {
    od: { s: number; c: number; e: number; av: string };
    oe: { s: number; c: number; e: number; av: string };
  };
  
  // Prescrição para Perto
  nearPrescription: {
    od: { s: number; c: number; e: number; av: string };
    oe: { s: number; c: number; e: number; av: string };
  };
  
  // Acuidade Visual para Perto
  nearAcuity: {
    od: string;
    oe: string;
  };
  
  // Configurações da Lente
  suggestedLensType: string;     // Monofocal, Bifocal, etc.
  subjectiveImprovement: boolean; // Houve melhora subjetiva?
  addition: number;              // Adição para perto
  prescriptionDate: string;      // Data da prescrição
}
```

### ClinicalResult (Resultado Clínico)
```typescript
interface ClinicalResult {
  // Médias das Medições AR
  averageMeasurements: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  
  // Variabilidade das Medições
  variability: {
    od: { s: number; c: number; e: number };
    oe: { s: number; c: number; e: number };
  };
  
  // Estabilidade das Medições
  stability: {
    od: boolean;
    oe: boolean;
  };
  
  // Classificação da Ametropia
  ametropiaType: {
    od: string;  // Miopia, Hipermetropia, etc.
    oe: string;
  };
  
  // Sugestões Clínicas
  clinicalSuggestions: string[];
  clinicalSteps: string[];
  
  // Caminho Subjetivo
  subjectivePath: {
    od: { start: string; path: string[]; maxAdjustment?: string };
    oe: { start: string; path: string[]; maxAdjustment?: string };
    recommendations: string[];
    specialConsiderations: string[];
  };
}
```

## 🔧 Configuração e Instalação

### Pré-requisitos
- **Node.js 18+** 
- **npm ou yarn**
- **Conta Firebase**
- **Conta Vercel** (para deploy)

### Instalação Local

1. **Clone o repositório**
```bash
git clone https://github.com/ricpmota/oftware.git
cd oftware
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
# Crie um arquivo .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

4. **Execute em desenvolvimento**
```bash
npm run dev
```

### Configuração Firebase

1. **Crie um projeto no Firebase Console**
2. **Ative Authentication** com Google Sign-in
3. **Crie um banco Firestore** com as seguintes coleções:
   - `doctors` - Perfis dos médicos
   - `patients` - Dados dos pacientes
   - `pendingShares` - Compartilhamentos pendentes

4. **Configure as regras de segurança** do Firestore:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Médicos podem acessar seus próprios dados
    match /doctors/{doctorId} {
      allow read, write: if request.auth != null && request.auth.uid == doctorId;
    }
    
    // Pacientes podem ser acessados por médicos autenticados
    match /patients/{patientId} {
      allow read, write: if request.auth != null;
    }
    
    // Compartilhamentos pendentes
    match /pendingShares/{shareId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚀 Deploy

### Deploy Automático (Vercel)
1. Conecte o repositório GitHub ao Vercel
2. Configure as variáveis de ambiente no Vercel
3. O deploy acontece automaticamente a cada push

### Deploy Manual
```bash
npm run build
vercel --prod
```

## 📊 Funcionalidades Avançadas

### Análise Automática de Dados AR
- **Cálculo de Médias:** Média ponderada das 3 medições
- **Análise de Variabilidade:** Identifica medições instáveis
- **Classificação de Ametropia:** Miopia, Hipermetropia, Astigmatismo
- **Sugestões Clínicas:** Baseadas em IA e protocolos médicos

### Sistema de Alertas Clínicos
- **Variabilidade Alta:** Alerta para nova medição
- **Ametropia Extrema:** Sugestões de investigação
- **Presbiopia:** Lembretes de adição para perto
- **Casos Especiais:** Alertas para cicloplegia

### Compartilhamento de Pacientes
- **Solicitação de Compartilhamento:** Entre médicos
- **Aprovação/Rejeição:** Controle de acesso
- **Histórico de Compartilhamentos:** Rastreabilidade

### Módulo de Retina Avançado
- **Laudos Profissionais:** Estrutura médica completa com cabeçalho, achados, impressão diagnóstica e assinatura
- **Calculadora de Tratamento RD:** Lógica clínica baseada em classificações ETDRS, EMD, OCT e comorbidades
- **Modais Educacionais:** Explicações detalhadas de classificações, patologias e critérios diagnósticos
- **Suporte Binocular Completo:** Avaliação independente de OD/OS com patologias binoculares
- **Proteção Terminológica:** Prevenção de tradução automática de termos médicos (OCT, RD, etc.)

## 🔒 Segurança

### Autenticação
- **Firebase Auth** com Google Sign-in
- **Sessões seguras** com tokens JWT
- **Proteção de rotas** para usuários autenticados

### Dados
- **Criptografia em trânsito** (HTTPS)
- **Regras de segurança** no Firestore
- **Validação de dados** no frontend e backend
- **Backup automático** no Firebase

### Privacidade
- **Dados médicos protegidos** por regras de acesso
- **Compartilhamento controlado** entre médicos
- **Logs de auditoria** para ações importantes

## 🧪 Testes e Qualidade

### Scripts Disponíveis
```bash
npm run dev      # Desenvolvimento com Turbopack
npm run build    # Build de produção
npm run start    # Servidor de produção
npm run lint     # Verificação de código
```

### Padrões de Código
- **TypeScript** para tipagem estática
- **ESLint** para qualidade de código
- **Prettier** para formatação (configurado via Tailwind)
- **Componentes funcionais** com hooks

## 🤝 Contribuição

### Como Contribuir
1. **Fork** o repositório
2. **Crie** uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abra** um Pull Request

### Diretrizes de Contribuição
- **Siga** os padrões de código existentes
- **Teste** suas mudanças localmente
- **Documente** novas funcionalidades
- **Mantenha** a compatibilidade com TypeScript

### Áreas para Contribuição
- **Módulos Clínicos:** Catarata, Glaucoma (Retina já implementado)
- **Melhorias de UI/UX**
- **Otimizações de Performance**
- **Novos Recursos de Análise**
- **Testes Automatizados**
- **Expansão do Módulo Retina:** Novas modalidades de exame, patologias adicionais

## 🛠️ Manutenção e Suporte

### Logs e Monitoramento
- **Console logs** detalhados para debug
- **Vercel Analytics** para performance
- **Firebase Console** para dados e erros

### Atualizações
- **Deploy automático** via GitHub
- **Rollback fácil** no Vercel
- **Testes de regressão** antes do deploy

### Backup
- **Firebase Backup** automático
- **GitHub** como backup do código
- **Vercel** com histórico de deploys

## 📚 Documentação Adicional

- **[Módulos Clínicos](CLINICAL_MODULES.md)** - Documentação detalhada dos módulos de refração
- **[Configuração Firebase](FIREBASE_SETUP.md)** - Guia de configuração do Firebase
- **[Regras do Firestore](firestore.rules)** - Regras de segurança do banco
- **[Módulo Retina]** - Sistema completo de laudos retinográficos, OCT e ultrassom

## 📞 Suporte

- **Site:** [oftware.com.br](https://oftware.com.br)
- **Email:** suporte@oftware.com.br
- **Documentação:** Este README
- **Issues:** [GitHub Issues](https://github.com/ricpmota/oftware/issues)

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🙏 Agradecimentos

- **Comunidade oftalmológica** pelo feedback e sugestões
- **Firebase** pela infraestrutura robusta
- **Vercel** pela hospedagem e deploy automático
- **Next.js** pelo framework moderno e performático

## 🆕 Atualizações Recentes

### Módulo de Retina (Julho 2024)
- ✅ **Implementação Completa** do sistema de laudos retinográficos
- ✅ **Três Modalidades:** Retinografia, OCT e Ultrassom
- ✅ **Calculadora de Tratamento RD** com lógica clínica avançada
- ✅ **Modais Educacionais** com classificações detalhadas
- ✅ **Interface Responsiva** otimizada para mobile
- ✅ **Proteção Terminológica** contra tradução automática
- ✅ **Laudos Profissionais** com estrutura médica completa

### Melhorias Técnicas
- ✅ **TypeScript** implementado em todos os componentes
- ✅ **Tailwind CSS** para design responsivo
- ✅ **Deploy Automático** via Vercel
- ✅ **Firebase Integration** para dados persistentes

---

**Desenvolvido com ❤️ para a comunidade oftalmológica**

*Oftware - Transformando a oftalmologia através da tecnologia*