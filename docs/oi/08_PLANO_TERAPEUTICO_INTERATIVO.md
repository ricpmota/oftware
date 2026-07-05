# Plano Terapêutico Interativo

## Conceito

O **Plano Terapêutico Interativo** é a evolução compartilhável do orçamento terapêutico interno do MetaAdmin. Em vez de um PDF, o médico gera uma **página web** onde médico e paciente comparam cenários e decidem juntos — sem expor o termo "orçamento" ao paciente.

| Aspecto | Orçamento interno (modal) | Plano para paciente |
|--------|---------------------------|---------------------|
| Público | Médico / equipe | Médico + paciente |
| Nome | Orçamento Terapêutico | Plano Terapêutico Personalizado |
| Edição de dose | Médico (mg no modal) | **Não** — dose derivada pelo motor |
| IA | Não | Não |
| Prescrição | Não altera | Não altera |
| Envio automático | Não | Não (v1: link manual / preview) |

## Fluxo v1

1. Médico abre **Orçamento Terapêutico** no `/metaadmin` (modal existente, inalterado em propósito).
2. Clica em **Gerar Página do Plano**.
3. API autenticada cria rascunho em:
   `pacientes_completos/{pacienteId}/orcamentosTerapeuticos/{orcamentoId}`
- Abre nova aba no domínio da organização: `https://{org}/plano/{orcamentoId}?t={token}` (ex.: `www.ometodoemagrecer.com.br/plano/...`).
5. Paciente (ou médico em consulta) seleciona cenário; valor e gráfico atualizam.

## Cenários

Motor determinístico (`lib/metaadmin/planoTerapeuticoInterativoEngine.ts`), versão `plano-terapeutico-v1`:

| Cenário | Prazo | Mg / aplicações | Perfil |
|---------|-------|-----------------|--------|
| **Equilibrado** | Base (OI se aplicável, senão V2) | Base | Recomendado |
| **Progressivo** | +25–40% (fator 1,32) | Mg ~−3% | Ritmo menor, mais tempo |
| **Intensivo** | −20–30% (fator 0,75) | Mg ~+12% | Prazo menor, mais monitoramento |

Recursos comerciais (consultas, bio, exames) derivam da configuração do médico:
- `consultas = meses × consultasPorMesPadrao`
- `bio = meses × bioimpedanciasPorMesPadrao`
- `exames = examesPorPlanoPadrao`

## Cálculo comercial

Função: `calcularComposicaoPlanoInterativo` em `lib/metaadmin/planoTerapeuticoComercial.ts`.

```
custoMedicacaoBruto = mgEstimado × valorPorMg
descontoMedicacao = bruto × descontoPorVolumeMg%
custoMedicacaoLiquido = bruto − descontoMedicacao
custoKits = aplicacoes × valorPorKitAplicacao
consultas = consultasIncluidas × valorPorConsulta
bio = bioIncluidas × valorPorBioimpedancia
exames = examesIncluidos × valorPorExame
subtotal = soma (medicação líquida + kits + consultas + bio + exames + outros)
margem = subtotal × margemPadraoPercentual / 100
valorTotal = subtotal + margem − descontoManual
```

O orçamento interno continua usando `calcularComposicaoDesdeConfig` **sem** desconto por volume — não quebra o fluxo atual.

## Desconto por volume de mg

Configurável pelo médico (`descontosPorVolumeMg`). Padrão:

| Mín. mg | Desconto % |
|---------|------------|
| 0 | 0 |
| 80 | 5 |
| 120 | 8 |
| 160 | 10 |

Regra: aplica a **maior** faixa em que `mgEstimado >= minMg`.

## Guardrails

- Ritmo automático máximo: **2 kg/semana**.
- Se `metaKg / semanas > 2`, o prazo mínimo é estendido automaticamente.
- Mensagem neutra ao paciente: *"Ajustado para uma faixa de evolução clinicamente prudente."*
- Sem frases do tipo "necessita avaliação médica" na página pública.

## Persistência

Documento em `orcamentosTerapeuticos`:

- `status`: `rascunho` | `compartilhado` | `aceito` | `cancelado`
- `publicAccessToken`: token na URL (`?t=`)
- `cenarios`: snapshot dos 3 cenários calculados
- `cenarioSelecionado`, `valorTotal`, `configuracaoComercialUsada`
- PII mínima: `contextoPaciente.nomeExibicao` = primeiro nome

## Segurança

- Criação: `POST /api/metaadmin/plano-terapeutico` com gate médico + paciente.
- Leitura/atualização de cenário: `GET/PATCH /api/plano-terapeutico/[orcamentoId]?t=token`.
- Token de 48 caracteres hex; ID de orçamento não sequencial simples.
- Lookup de acesso: `plano_terapeutico_links/{orcamentoId}` → `{ pacienteId, publicAccessToken }` (leitura direta, sem collectionGroup).

## Ética e comunicação

- Linguagem de **estimativa**, não promessa.
- Disclaimer padrão na página.
- Botão **Confirmar interesse**: desabilitado ("em breve") na v1.
- Sem WhatsApp/e-mail automático.

## Arquivos principais

| Arquivo | Papel |
|---------|--------|
| `lib/metaadmin/planoTerapeuticoInterativoEngine.ts` | Motor de cenários |
| `lib/metaadmin/planoTerapeuticoComercial.ts` | Cálculo comercial + desconto mg |
| `lib/server/planoTerapeuticoInterativoStore.ts` | Persistência Admin SDK |
| `app/api/metaadmin/plano-terapeutico/route.ts` | Criar rascunho |
| `app/api/plano-terapeutico/[orcamentoId]/route.ts` | Leitura pública |
| `app/plano-terapeutico/[orcamentoId]/page.tsx` | Página do paciente |
| `components/planoTerapeutico/PlanoTerapeuticoInterativoClient.tsx` | UI interativa |

## Próximos passos

- [ ] Compartilhamento com status `compartilhado` + auditoria
- [ ] Confirmar interesse → `aceito` + notificação médico
- [ ] Edição médica dos cenários antes de compartilhar
- [ ] Integração controle financeiro (sem duplicar lançamentos)
- [ ] Índice Firestore e testes E2E do link público
- [ ] Barras de mg por fase (somente leitura)
