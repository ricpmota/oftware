# Contexto: Alterações nos Cards do MetaAdmin (Pacientes)

Use este arquivo em outro chat para continuar o trabalho. Copie o conteúdo abaixo e cole no novo chat.

---

## Objetivo das alterações

1. **Card de informações do paciente** – Padronizar o design (desktop e mobile) com layout organizado, ícones e labels completos.
2. **Desktop** – Usar labels completos: Cadastro, Telefone, Cidade, Sexo, Nascimento, Notificações, NPS (sem abreviações).
3. **Mobile** – Usar o mesmo design do card do desktop (rounded-xl, border, bg-gradient, grid com ícones).

## Arquivo principal

`c:/oftware/app/metaadmin/page.tsx` (arquivo muito grande, ~35.000 linhas)

## O que já foi feito

### Desktop (linhas ~7920–7935)
- Labels atualizados: "Tel" → "Telefone", "Nasc." → "Nascimento", "Notif." → "Notificações", "Pend." → "Pendente".
- Card com layout em grid em coluna única, ícones (Calendar, Phone, MapPin, Cake, Star), estilo: `rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/90 px-3 py-2 shadow-sm`.

### Mobile (linhas ~9331–9345)
- Substituição do bloco antigo (divs separados) pelo novo card, seguindo o design do desktop.
- Mesmo padrão: grid, ícones, labels completos.
- Inclusão de Valor Total no mobile (que não está no desktop, pois lá fica no card financeiro).
- Ícones: Calendar, Phone, MapPin, UserIcon, Cake, DollarSign, Star.

### Ordem dos cards na linha de detalhes (desktop)

1. Barra de peso (IMC)  
2. Informações do paciente  
3. Aplicações/Peso (4 linhas)  
4. Informações financeiras (Valor de venda, Pago, Pendente)  
5. Calendário  
6. Card dos eventos do dia  

## Problemas encontrados

1. **Linter** – O arquivo gera centenas de erros de lint, provavelmente por tamanho e complexidade; muitos podem ser cascata de um único problema de estrutura JSX.
2. **Travamentos no Cursor** – O arquivo `page.tsx` pode fazer o editor travar ou ficar lento.
3. **Mobile** – Na substituição do bloco de informações, é possível que tenha sido removido ou quebrado algum `</div>` ou parêntese/chave de fechamento. O erro inicial apontado foi na linha 9345.

## O que verificar/corrigir

1. Conferir se a estrutura JSX do mobile está correta – parênteses, chaves e `</div>` em ordem.
2. Executar `npm run build` ou abrir a aplicação para garantir que o metaadmin funciona sem erros em runtime.
3. Se o mobile tiver um bloco duplicado ou fechamento incorreto, ajustar para que o JSX fique balanceado.

## Estrutura esperada do card no mobile

O card deve estar dentro de `{isExpanded && (` (quando `pacienteCardExpandido === paciente.id`), junto com o conteúdo opcional da barra IMC. Exemplo de estrutura:

```tsx
{isExpanded && (
  <>
    {/* IMC bar - opcional */}
    ...
    <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/90 px-3 py-2 shadow-sm">
      <div className="grid grid-cols-1 gap-y-1.5 text-[11px]">
        {/* Cadastro, Telefone, Cidade, Sexo, Nascimento, Valor Total, Notificações, NPS */}
      </div>
    </div>
  </>
)}
```

## Comando para rodar o projeto

```bash
cd c:/oftware && npm run dev
```
