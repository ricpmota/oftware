# Tarefa: Cards de Informações do Paciente - Metaadmin

## Contexto
No arquivo `app/metaadmin/page.tsx`, fizemos alterações no card de informações do paciente (Cadastro, Telefone, Cidade, etc.) nas versões desktop e mobile.

## O que foi feito
1. **Desktop**: Labels completos (Telefone, Nascimento, Notificações, Pendente em vez de Tel, Nasc., Notif., Pend.)
2. **Mobile**: Aplicado o mesmo design do card desktop (rounded-xl, border, bg-gradient, grid com ícones, uma coluna)

## O que verificar/corrigir
1. **Erros de sintaxe**: O linter reportou ~857 erros. Verificar se a substituição do bloco mobile (linhas ~9330-9345) manteve a estrutura JSX correta — o bloco está dentro de `{isExpanded && (` e deve fechar com `)}` antes de `{/* Lista de Aplicações */}`.
2. **Estrutura do mobile**: O card deve estar dentro do Fragment `<>` junto com o bloco IMC. Verificar se não faltou nem sobrou nenhum `</div>` ou `)}`.

## Localização no código
- **Desktop card**: ~linha 7921, dentro de `pacienteDetalhesDesktopExpandido === paciente.id`
- **Mobile card**: ~linha 9331, dentro de `isExpanded && (` (pacienteCardExpandido)

## Arquivo principal
`app/metaadmin/page.tsx`

## Ação sugerida
1. Abra `app/metaadmin/page.tsx`
2. Leia as linhas 9325-9350 para verificar a estrutura do bloco mobile
3. Confira se o JSX está correto (abertura/fechamento de tags, parênteses)
4. Execute o linter e corrija qualquer erro de sintaxe introduzido pela alteração
