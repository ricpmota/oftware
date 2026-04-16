# Detalhes do Card de Paciente – /metanutri → Pacientes

Este documento descreve **exatamente** como está projetado o card de cada paciente na página **Pacientes** do **/metanutri**, em especial o comportamento da **setinha de detalhes** (ChevronDown) e o conteúdo que aparece ao expandir. Serve como especificação para replicar o mesmo comportamento no **/metapersonal**.

---

## 1. Local e contexto

- **Rota:** `/metanutri`
- **Menu:** aba **Pacientes** (`activeMenu === 'pacientes'`)
- **Onde:** lista de cards na **versão mobile** (`lg:hidden`), dentro de `pacientesOrdenados.map(...)`.

O card também existe em versão **desktop** (tabela); a setinha de detalhes e o bloco expandido referem-se à **versão em cards (mobile)**.

---

## 2. Estados usados no card (setinha + detalhes)

| Estado | Tipo | Uso |
|--------|------|-----|
| `pacienteCardExpandido` | `string \| null` | ID do paciente cujo **detalhes** (setinha) estão abertos. `null` = nenhum expandido. |
| `pacienteDetalhesExpandido` | `string \| null` | ID do paciente cujo bloco **Aplicações** está aberto (botão seringa). Mutuamente exclusivo: ao abrir Aplicações, `pacienteCardExpandido` é fechado. |

- **Setinha de detalhes:** alterna apenas `pacienteCardExpandido` (abre/fecha o bloco “Detalhes expandíveis”).
- **Botão Aplicações (seringa):** alterna `pacienteDetalhesExpandido` e, ao abrir, faz `setPacienteCardExpandido(null)`.

Variáveis derivadas no render do card:

- `isExpanded = pacienteCardExpandido === item.pacienteId`
- `isDetalhesExpandido = pacienteDetalhesExpandido === item.pacienteId`
- `isSelecionado = isExpanded || isDetalhesExpandido` (usado para borda em gradiente no card).

---

## 3. Botão da setinha (ChevronDown)

- **Posição:** no cabeçalho do card, à direita do nome e badges (status, pagamento, perda de peso), dentro de um `flex justify-between`.
- **Aparência:** ícone `ChevronDown` (lucide-react), `size={20}`, cor `text-gray-500`, hover `text-gray-700`.
- **Comportamento:** ao clicar, `setPacienteCardExpandido(isExpanded ? null : item.pacienteId)`.
- **Acessibilidade:** `aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}`.
- **Rotação:** `className` no ícone inclui `transition-transform duration-200` e, quando expandido, `rotate-180`.

---

## 4. Conteúdo dos “Detalhes expandíveis” (`isExpanded && ...`)

O bloco inteiro fica dentro de:

```tsx
{isExpanded && (
  <div className="space-y-2 mb-3 pt-3 border-t border-gray-200">
    {/* ... */}
  </div>
)}
```

Ordem e estrutura dos itens:

### 4.1 Caixa de informações clínicas (condicional)

**Condição:** exibir se existir pelo menos um de: `ultimoPeso`, `paciente.dadosClinicos?.medidasIniciais?.altura`, `paciente.dadosClinicos?.medidasIniciais?.imc`.

- **Container:** `bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 relative overflow-hidden`, com `borderRadius: '12px'`.
- **Conteúdo:**
  - **Efeitos (apenas mobile):** Confetti e Fireworks quando IMC está na faixa saudável (18,5–25) e `showFireworks[item.pacienteId]` é true.
  - **Grid 3 colunas:** Peso Atual (kg), Altura (m), IMC (valor numérico).
  - **Barra de IMC interativa:**
    - Faixas: Baixo peso (&lt;18,5), Saudável (18,5–25), Alto (25–30), Obeso (≥30), com cores (azul, verde, amarelo, vermelho).
    - Marcador com emoji (classificação do IMC) e posição calculada por `calcularPosicaoMarcador(imcAtual)`.
    - No metanutri há suporte a **arrastar** o marcador (mouse/touch), com estados `isDraggingIMC`, `pacienteArrastandoIMC`, `pesoTemporarioIMC`, `imcTemporarioIMC` e ref `barraIMCRef`.
  - **Labels abaixo da barra:** “Baixo”, “Saudável”, “Alto”, “Obeso”.
  - **Grau de obesidade:** texto abaixo da barra, usando `calcularGrauObesidade(imcAtual)` e `getCorGrauObesidade(...)`.

Funções/helpers usados aqui (no metanutri):

- `classificarIMC(imc)` → `{ label, cor, bgGradient, icone }`
- `calcularPosicaoMarcador(imc)` → percentual na barra
- `calcularGrauObesidade(imc)` → string (ex.: "Peso normal", "Obesidade Grau I")
- `getCorGrauObesidade(grau)` → classe de cor (text-green-600, etc.)

### 4.2 Cadastro

- Texto: `Cadastro: [data]`
- Data: `paciente.dataCadastro` formatada em `pt-BR` (suporta `Date` ou objeto com `toDate()`). Se não houver, exibe `-`.

### 4.3 Telefone

- Texto: `Telefone: [valor ou link]`
- Se houver `telefoneWhatsApp`: link para `https://wa.me/55{telefoneWhatsApp}` com ícone `MessageSquare` e número formatado.
- Senão: `-`.

### 4.4 Cidade

- Texto: `Cidade: [paciente.dadosIdentificacao?.endereco?.cidade || '-']`

### 4.5 Sexo

- Condicional: só renderiza se `paciente.dadosIdentificacao?.sexoBiologico` existir.
- Texto: `Sexo: Masculino | Feminino | Outro` conforme o valor.

### 4.6 Data de Nascimento

- Texto: `Data de Nascimento: [data], [idade] ano(s)`
- Data em `pt-BR`; idade calculada a partir de `dadosIdentificacao.dataNascimento` (suporta `Date`, Firestore `toDate()`, ou string/data).
- Se não houver data, exibe `-`.

### 4.7 Valor Total (negociado paciente x nutricionista)

- Texto: `Valor Total: R$ [valor] ([N] parcela(s))` ou `-` se não houver pagamento/valor.
- Usa `pagamento` (do estado `pagamentosPacientes[paciente.id]`): `valorTotal`, `parcelas.length`.

### 4.8 NPS

- Texto fixo: `NPS: Em breve` (itálico, placeholder futuro).

---

## 5. Lista de Aplicações (bloco separado, mesmo card)

- **Condição:** `pacienteDetalhesExpandido === item.pacienteId` (aberto pelo botão da seringa, não pela setinha).
- **Layout:** `mb-3 border-t border-gray-200 pt-3`.
- **Conteúdo:** lista da `evolucaoSeguimento` ordenada por data (mais recente primeiro), com semana, data, peso, dose aplicada e variação de peso em relação à semana anterior.
- Este bloco fica **abaixo** do bloco “Detalhes expandíveis” e é independente da setinha.

---

## 6. Resumo para replicar no /metapersonal

Para o card de paciente em **Pacientes** do **/metapersonal** ter o “mesmo detalhe” ao clicar na setinha:

1. **Manter:** botão ChevronDown que alterna `pacienteCardExpandido` e o wrapper `{isExpanded && (...)}` com `space-y-2 mb-3 pt-3 border-t border-gray-200`.
2. **Incluir na mesma ordem:**
   - Caixa de informações clínicas (grid Peso / Altura / IMC; opcional: barra IMC e grau de obesidade; confetti/drag podem ser omitidos na primeira réplica).
   - Cadastro (data).
   - Telefone (com link WhatsApp se houver).
   - Cidade.
   - Sexo (condicional).
   - Data de Nascimento com idade.
   - Valor Total (pagamento).
   - NPS (“Em breve”).
3. **Manter** o bloco “Lista de Aplicações” condicionado a `pacienteDetalhesExpandido`, abaixo dos detalhes da setinha.

Campos e estilos (labels em `font-medium`, valores em `text-gray-900`, containers e bordas) devem seguir o mesmo padrão visual do metanutri para consistência entre as duas páginas.
