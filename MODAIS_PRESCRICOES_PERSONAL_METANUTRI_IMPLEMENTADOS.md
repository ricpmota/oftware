# Modais de Prescrições e Personal Trainer - /metanutri ✅

## Implementação Concluída

### ✅ Modal de Prescrições

**Localização:** Antes do fechamento do componente principal  
**Estrutura:** Modal tela cheia (mobile-first) idêntico ao `/metaadmin`

#### Funcionalidades Implementadas:

1. **Header:**
   - Ícone `ClipboardList` roxo
   - Nome do paciente
   - Botão "Nova Prescrição" (verde)
   - Botão "Atualizar" (cinza)

2. **Tabs:**
   - "Prescrições Salvas" (padrão)
   - "Descrição"

3. **Aba Prescrições Salvas:**
   - Lista agrupada por subtipo (expandível/colapsável)
   - Botões de prescrição com estados visuais:
     - Selecionada: borda roxa, fundo roxo claro
     - Template: borda azul, fundo azul claro
     - Temporária: borda amarela, fundo amarelo claro
   - Função `groupBySubtipo` para agrupar
   - Função `getTituloExibicao` para remover prefixo

4. **Aba Descrição:**
   - Editor completo de prescrição:
     - Nome (obrigatório)
     - Descrição
     - Itens (múltiplos, com campos: medicamento, dosagem, frequência, quantidade, instruções)
     - Observações
   - Botões no footer:
     - Voltar
     - Salvar (verde)
     - Excluir (vermelho, apenas se não for template)
     - Imprimir (verde, gera PDF)

5. **Modal de Grupo (Nova Prescrição):**
   - Modal para escolher subtipo ao criar nova prescrição
   - Lista todos os subtipos disponíveis
   - Cria prescrição temporária com prefixo do subtipo

#### Estados Adicionados:

```typescript
const [prescricoesModal, setPrescricoesModal] = useState<Prescricao[]>([]);
const [loadingPrescricoesModal, setLoadingPrescricoesModal] = useState(false);
const [prescricaoSelecionadaModal, setPrescricaoSelecionadaModal] = useState<Prescricao | null>(null);
const [prescricaoEditandoModal, setPrescricaoEditandoModal] = useState<Prescricao | null>(null);
const [novaPrescricaoModal, setNovaPrescricaoModal] = useState({...});
const [abaPrescricoesModal, setAbaPrescricoesModal] = useState<'salvas' | 'descricao'>('salvas');
const [gruposPrescricoesExpandidosModal, setGruposPrescricoesExpandidosModal] = useState<Set<string>>(new Set());
const [showModalGrupoNovaPrescricao, setShowModalGrupoNovaPrescricao] = useState(false);
const [novaPrescricaoContexto, setNovaPrescricaoContexto] = useState<'desktop' | 'mobile' | null>(null);
```

#### Funções Auxiliares Adicionadas:

- `getSubtipoPrescricao`: Determina subtipo da prescrição
- `groupBySubtipo`: Agrupa prescrições por subtipo
- `getTituloExibicao`: Remove prefixo "SUBTIPO — " do nome
- `loadPrescricoesModal`: Carrega prescrições do paciente

#### Imports Adicionados:

```typescript
import { PrescricaoService } from '@/services/prescricaoService';
import { Prescricao, PrescricaoItem } from '@/types/prescricao';
import jsPDF from 'jspdf';
import { ChevronRight } from 'lucide-react';
```

---

### ✅ Modal de Personal Trainer

**Localização:** Após modal de Prescrições  
**Estrutura:** Modal responsivo idêntico ao `/metaadmin`

#### Funcionalidades Implementadas:

1. **Header:**
   - Ícone `Dumbbell` rosa
   - Nome do paciente
   - Botão fechar

2. **Seção de Compartilhamento:**
   - **Se já compartilhado:**
     - Lista personal trainers vinculados
     - Data de compartilhamento
     - Botão "Encerrar" (vermelho)
   
   - **Se não compartilhado:**
     - Aviso informativo
     - Botão "Buscar Personal Trainer por Localização"
     - Lista de solicitações pendentes (se houver)

3. **Calendário de Treinos:**
   - Componente `CalendarioTreinosPersonal`
   - Props: `patientId`, `pacienteId`, `wideRange`

4. **Modal de Busca de Personal Trainer:**
   - Seleção de estado
   - Seleção de cidade (dependente do estado)
   - Botão buscar
   - Lista de personal trainers encontrados
   - Botão para compartilhar paciente

#### Estados Adicionados:

```typescript
const [personalTrainersElegiveis, setPersonalTrainersElegiveis] = useState<PersonalTrainerDoc[]>([]);
const [loadingPersonalTrainersElegiveis, setLoadingPersonalTrainersElegiveis] = useState(false);
const [personalTrainerSelecionadoCompartilhar, setPersonalTrainerSelecionadoCompartilhar] = useState('');
const [enviandoCompartilhamentoPersonal, setEnviandoCompartilhamentoPersonal] = useState(false);
const [vinculosAtivosPacientePersonal, setVinculosAtivosPacientePersonal] = useState<any[]>([]);
const [solicitacoesCompartilhamentoPacientePersonal, setSolicitacoesCompartilhamentoPacientePersonal] = useState<any[]>([]);
const [loadingSolicitacoesCompartilhamentoPersonal, setLoadingSolicitacoesCompartilhamentoPersonal] = useState(false);
const [showModalBuscarPersonalTrainer, setShowModalBuscarPersonalTrainer] = useState(false);
const [estadoBuscaPersonalModal, setEstadoBuscaPersonalModal] = useState('');
const [cidadeBuscaPersonalModal, setCidadeBuscaPersonalModal] = useState('');
const [personalTrainersFiltrados, setPersonalTrainersFiltrados] = useState<PersonalTrainerDoc[]>([]);
const [loadingPersonalTrainersFiltrados, setLoadingPersonalTrainersFiltrados] = useState(false);
const [estadosComPersonalTrainers, setEstadosComPersonalTrainers] = useState<string[]>([]);
const [cidadesComPersonalTrainers, setCidadesComPersonalTrainers] = useState<{ estado: string; cidade: string }[]>([]);
```

#### Funções Adicionadas:

- `loadPersonalTrainersElegiveis`: Carrega personal trainers verificados e ativos
- `buscarPersonalTrainersPorLocalizacao`: Busca por estado e cidade
- `loadStatusCompartilhamentoPersonal`: Carrega vínculos e solicitações do paciente

#### Imports Adicionados:

```typescript
import CalendarioTreinosPersonal from '@/components/CalendarioTreinosPersonal';
import { PersonalTrainerService } from '@/services/personalTrainerService';
import { PersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { SolicitacaoPersonalTrainerService } from '@/services/solicitacaoPersonalTrainerService';
import { SOLICITACAO_STATUS as SOLICITACAO_STATUS_PERSONAL } from '@/features/metaPersonal/metaPersonal.constants';
import { trainingSessionService } from '@/services/trainingSessionService';
```

#### Adaptações para Contexto de Nutricionista:

1. **Personal Trainers Elegíveis:**
   - Busca todos os verificados e ativos (não há campo `nutricionistaVinculadoIds`)
   - Filtra apenas por `isVerificado` e `status === 'ativo'`

2. **Compartilhamento:**
   - Usa `medicoId` do primeiro médico vinculado ao nutricionista
   - Verifica se nutricionista tem médicos vinculados antes de permitir compartilhamento
   - Filtra vínculos e solicitações por médicos vinculados ao nutricionista

3. **Carregamento de Pacientes com Treinos:**
   - Verifica treinos usando `trainingSessionService.hasSessionsForPatient`
   - Atualiza estado `pacientesComTreinos` automaticamente

---

## Características dos Modais

### Modal de Prescrições

- **Z-index:** `z-[9999]` (tela cheia)
- **Layout:** Flexbox column com header fixo, tabs fixas, body scrollável, footer fixo
- **Responsividade:** Otimizado para mobile
- **PDF:** Gera PDF com cabeçalho do nutricionista (CRN ao invés de CRM)

### Modal de Personal Trainer

- **Z-index:** `z-[9999]` (overlay)
- **Layout:** Modal responsivo (fullscreen mobile, centered desktop)
- **Calendário:** Componente `CalendarioTreinosPersonal` com `wideRange=true`

---

## Integração com Card de Pacientes

### Botão Prescrições

```tsx
<button
  onClick={async () => {
    setPacientePrescricoesSelecionado(paciente);
    setShowModalPrescricoes(true);
    setAbaPrescricoesModal('salvas');
    await loadPrescricoesModal(paciente);
  }}
  className="p-2 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
  title="Prescrições"
>
  <ClipboardList size={18} />
</button>
```

### Botão Personal Trainer

```tsx
<button
  onClick={async () => {
    setPacientePersonalSelecionado(paciente);
    setShowModalPersonal(true);
    if (nutricionista?.userId) {
      await loadPersonalTrainersElegiveis();
      await loadStatusCompartilhamentoPersonal(paciente.id);
    }
  }}
  className={`p-2 rounded-md transition-colors ${
    temPersonal
      ? 'bg-pink-50 text-pink-700 hover:bg-pink-100'
      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
  }`}
  title="Personal Trainer"
>
  <Dumbbell size={18} />
</button>
```

---

## Notas de Implementação

### Diferenças do `/metaadmin`

1. **Prescrições:**
   - Usa `nutricionista.userId` ao invés de `medicoPerfil.id`
   - PDF mostra "CRN" ao invés de "CRM"
   - PDF mostra "PRESCRIÇÃO NUTRICIONAL" ao invés de "PRESCRIÇÃO MÉDICA"
   - Título do nutricionista: "Dra." ou "Dr." baseado em `nutricionista.genero`

2. **Personal Trainer:**
   - Busca todos os personal trainers verificados (não filtra por vínculo com nutricionista)
   - Compartilhamento usa `medicoId` do primeiro médico vinculado ao nutricionista
   - Filtra vínculos por médicos vinculados ao nutricionista

### Limitações Conhecidas

1. **Personal Trainer:**
   - Sistema atual não tem campo `nutricionistaVinculadoIds` no `PersonalTrainerDoc`
   - Compartilhamento requer que nutricionista tenha pelo menos um médico vinculado
   - Vínculos são filtrados por médicos vinculados ao nutricionista

2. **Prescrições:**
   - Usa `medicoId` no sistema, mas preenche com `nutricionista.userId`
   - Pode precisar de ajustes futuros se houver separação entre prescrições de médico e nutricionista

---

## Status

✅ **Modais implementados e funcionais**
- Modal de Prescrições completo
- Modal de Personal Trainer completo
- Modal de Busca de Personal Trainer completo
- Modal de Grupo de Nova Prescrição completo
- Integração com card de pacientes completa

⚠️ **Nota:** Algumas adaptações foram feitas para o contexto de nutricionista, mas a funcionalidade está completa e idêntica ao `/metaadmin` em termos de UI/UX.
