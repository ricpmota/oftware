# Etapas de Implementação - Meu Link MetaPersonal

## Visão Geral

Dividimos a implementação em **6 etapas** ordenadas por dependência. Cada etapa pode ser testada individualmente antes de prosseguir.

---

## ETAPA 1: Criar API Route `/api/personal-por-nome`

**Objetivo:** Permitir buscar Personal Trainer pelo slug do nome (ex: `joao-silva`)

**Arquivo a criar:** `app/api/personal-por-nome/route.ts`

**Dependências:** Nenhuma

**O que fazer:**
1. Criar o arquivo de API route
2. Implementar a função GET que:
   - Recebe parâmetro `nome` (slug)
   - Converte slug para nome formatado
   - Busca na collection `personal_trainers`
   - Retorna dados do personal trainer

**Teste:** 
```
GET /api/personal-por-nome?nome=joao-silva
```
Deve retornar JSON com dados do personal trainer.

---

## ETAPA 2: Adicionar Modal "Meu Link" no MetaPersonal

**Objetivo:** Permitir que o personal trainer gere links de referral

**Arquivo a modificar:** `app/metapersonal/page.v2.tsx`

**Dependências:** ETAPA 1 (para testar o link gerado)

**O que fazer:**

### 2.1 Verificar/adicionar estados necessários
```typescript
const [showLinkModal, setShowLinkModal] = useState(false);
const [medicoSelecionadoReferral, setMedicoSelecionadoReferral] = useState('');
const [linkReferralGerado, setLinkReferralGerado] = useState('');
const [linkCopiado, setLinkCopiado] = useState(false);
const [medicosVerificados, setMedicosVerificados] = useState<Medico[]>([]);
const [loadingMedicos, setLoadingMedicos] = useState(false);
```

### 2.2 Adicionar função de carregamento de médicos
```typescript
const loadMedicosVerificados = useCallback(async () => {
  // Busca médicos verificados e ativos
}, [personalTrainer]);
```

### 2.3 Adicionar botão "Meu Link" no dropdown do perfil
- Desktop: No dropdown do perfil
- Mobile: No menu mobile

### 2.4 Adicionar componente do Modal
- Dropdown de seleção de médico vinculado
- Botão "Gerar Link"
- Campo de exibição do link
- Botões "Copiar" e "Abrir"

**Teste:**
1. Login como personal trainer
2. Clicar no dropdown do perfil
3. Clicar em "Meu Link"
4. Selecionar médico
5. Gerar link
6. Verificar formato: `/dr/{medico}/{personal}`

---

## ETAPA 3: Modificar Página de Landing `/dr/[...slug]`

**Objetivo:** A página de landing do paciente deve suportar Personal Trainer além de Nutricionista

**Arquivo a modificar:** `app/dr/[...slug]/page.tsx`

**Dependências:** ETAPA 1 (API de busca)

**O que fazer:**

### 3.1 Adicionar imports
```typescript
import { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { SolicitacaoPersonalTrainerService } from '@/services/solicitacaoPersonalTrainerService';
import { Dumbbell } from 'lucide-react';
```

### 3.2 Adicionar estado para personal trainer
```typescript
const [personalTrainer, setPersonalTrainer] = useState<PersonalTrainerDoc | null>(null);
```

### 3.3 Modificar lógica de busca do profissional secundário
```typescript
// Tentar nutricionista primeiro, depois personal
if (nomeSobrenomeProfissional) {
  const responseNutri = await fetch(`/api/nutricionista-por-nome?nome=...`);
  if (responseNutri.ok) {
    // É nutricionista
  } else {
    const responsePersonal = await fetch(`/api/personal-por-nome?nome=...`);
    if (responsePersonal.ok) {
      // É personal trainer
    }
  }
}
```

### 3.4 Adaptar UI para mostrar Personal Trainer
- Ícone: `Dumbbell` ao invés de `UtensilsCrossed`
- Label: "Personal Trainer" ao invés de "Nutricionista"
- Registro: "CREF" ao invés de "CRN"

**Teste:**
1. Acessar link gerado na ETAPA 2
2. Verificar exibição do médico + personal
3. Verificar validação de vínculo

---

## ETAPA 4: Atualizar SolicitacaoMedicoService

**Objetivo:** Ao criar solicitação do médico, também criar solicitação do personal (se aplicável)

**Arquivo a modificar:** `services/solicitacaoMedicoService.ts`

**Dependências:** ETAPA 3 (para testar via página de landing)

**O que fazer:**

### 4.1 Modificar assinatura do método `criarSolicitacao()`
```typescript
static async criarSolicitacao(
  solicitacao: ...,
  emailIndicador?: string,
  profissionalInfo?: {
    tipo: 'nutricionista' | 'personal';
    profissionalId: string;
    profissionalNome: string;
  }
): Promise<string>
```

### 4.2 Adicionar lógica para Personal Trainer
```typescript
if (profissionalInfo?.tipo === 'personal') {
  // Salvar personalTrainerId e personalTrainerNome na solicitação
  // Criar solicitação em solicitacoes_personal_trainer com status aguardando_medico
  // Salvar solicitacaoPersonalTrainerId no documento do médico
}
```

### 4.3 Atualizar página de landing para usar nova assinatura
```typescript
await SolicitacaoMedicoService.criarSolicitacao(
  { ...solicitacao },
  undefined,
  personalTrainer ? {
    tipo: 'personal',
    profissionalId: personalTrainer.id,
    profissionalNome: personalTrainer.nome
  } : undefined
);
```

**Teste:**
1. Acessar link como paciente
2. Fazer login e solicitar tratamento
3. Verificar em `solicitacoes_medico`: tem `personalTrainerId`?
4. Verificar em `solicitacoes_personal_trainer`: existe doc com `status: aguardando_medico`?

---

## ETAPA 5: Trigger para Mudar Status ao Médico Aceitar

**Objetivo:** Quando médico aceita solicitação, mudar status do personal de `aguardando_medico` para `pendente`

**Arquivo a modificar:** Onde o médico aceita solicitações (provavelmente em `/meta` ou `/metaadmin`)

**Dependências:** ETAPA 4

**O que fazer:**

### 5.1 Localizar função de aceitar solicitação do médico

### 5.2 Adicionar chamada para mudar status do personal
```typescript
// Após aceitar solicitação do médico
if (solicitacao.solicitacaoPersonalTrainerId) {
  await SolicitacaoPersonalTrainerService.mudarStatusParaPendente(
    solicitacao.solicitacaoPersonalTrainerId
  );
}
```

### 5.3 Verificar se `mudarStatusParaPendente` existe no service
O método já existe em `services/solicitacaoPersonalTrainerService.ts` (linhas 287-314).

**Teste:**
1. Como médico, ver solicitação pendente
2. Aceitar solicitação
3. Como personal, verificar se solicitação aparece como "pendente"
4. Aceitar como personal
5. Verificar se paciente aparece na lista

---

## ETAPA 6: Testar Fluxo Completo

**Objetivo:** Garantir que todo o fluxo funciona end-to-end

**Dependências:** Todas as etapas anteriores

**Cenários de teste:**

### 6.1 Fluxo Happy Path
1. ✅ Personal gera link selecionando médico vinculado
2. ✅ Paciente acessa link e vê médico + personal
3. ✅ Paciente faz login com Google
4. ✅ Paciente informa telefone e solicita tratamento
5. ✅ Médico vê solicitação e aceita
6. ✅ Personal vê solicitação (agora pendente) e aceita
7. ✅ Paciente aparece na lista do personal

### 6.2 Validações
- ❌ Link com personal não vinculado ao médico → erro
- ❌ Link com personal não verificado → erro
- ❌ Paciente já tem solicitação para esse médico → redireciona
- ❌ Personal não aceita antes do médico → não pode (aguardando_medico)

### 6.3 UI/UX
- ✅ Modal responsivo (desktop e mobile)
- ✅ Botão "Copiar" funciona
- ✅ Botão "Abrir" abre em nova aba
- ✅ Feedback visual de "Copiado!"
- ✅ Ícone de Dumbbell aparece na página de landing

---

## Ordem de Execução Recomendada

```
ETAPA 1 ──► ETAPA 2 ──► ETAPA 3 ──► ETAPA 4 ──► ETAPA 5 ──► ETAPA 6
   │           │           │           │           │           │
   ▼           ▼           ▼           ▼           ▼           ▼
  API       Modal      Landing     Service     Trigger     Testes
```

**Cada etapa pode ser commitada separadamente:**
- `feat: add API route for personal trainer lookup`
- `feat: add "Meu Link" modal to MetaPersonal`
- `feat: support personal trainer in landing page`
- `feat: create personal trainer request when patient signs up`
- `feat: change personal request status when doctor accepts`
- `test: verify complete flow for personal trainer referral link`

---

## Estimativa de Complexidade

| Etapa | Complexidade | Arquivos Modificados |
|-------|--------------|---------------------|
| 1     | Baixa        | 1 (criar novo)      |
| 2     | Média        | 1                   |
| 3     | Média        | 1                   |
| 4     | Média-Alta   | 2                   |
| 5     | Baixa        | 1-2                 |
| 6     | -            | Testes manuais      |

---

## Pronto para começar?

Quando estiver pronto, podemos começar pela **ETAPA 1: Criar API Route**.
