# Banco de perguntas — 50 KG DEPOIS

Fonte canônica no código: `lib/50kgdepois/interviewChapters.ts`

## Estrutura

- **20 capítulos** numerados
- Cada capítulo tem `id`, `title`, `introduction` (opcional) e lista de perguntas
- IDs de pergunta: `{chapterId}-q{n}` (ex.: `antes-dos-153kg-q1`)

## Capítulos

| # | ID | Título |
|---|-----|--------|
| 1 | `antes-dos-153kg` | Antes dos 153 kg |
| 2 | `como-cheguei-aos-153kg` | Como cheguei aos 153 kg |
| 3 | `a-vida-foi-ficando-menor` | A vida foi ficando menor |
| 4 | `eu-ja-tinha-tentado` | Eu já tinha tentado |
| 5 | `a-mente-antes-da-mudanca` | A mente antes da mudança |
| 6 | `o-ponto-de-ruptura` | O ponto de ruptura |
| 7 | `pedir-ajuda` | Pedir ajuda |
| 8 | `a-medicacao` | A medicação |
| 9 | `os-primeiros-quilos` | Os primeiros quilos |
| 10 | `mudar-os-habitos` | Mudar os hábitos |
| 11 | `o-corpo-em-movimento` | O corpo em movimento |
| 12 | `os-dias-dificeis` | Os dias difíceis |
| 13 | `quando-os-outros-comecaram-a-ver` | Quando os outros começaram a ver |
| 14 | `quem-eu-estava-me-tornando` | Quem eu estava me tornando |
| 15 | `familia-e-amor` | Família e amor |
| 16 | `fe-espiritualidade-proposito` | Fé, espiritualidade e propósito |
| 17 | `50-kg-depois` | 50 kg depois |
| 18 | `longevidade` | Longevidade |
| 19 | `o-medo-de-voltar` | O medo de voltar |
| 20 | `a-carta` | A carta |

## Seção extra

**Memórias livres** — após o capítulo 20:

- título opcional
- texto
- data aproximada opcional
- fase da vida opcional
- múltiplas memórias com "Adicionar outra memória"

## UX editorial

- Progresso exibido como **Capítulo X de 20** (não "pergunta 37 de 120")
- Progresso local discreto dentro de cada capítulo
- Mensagens de pausa após capítulos emocionalmente densos (3, 4, 6, 12, 15)
- Capítulo 20 com textareas maiores (cartas)

## Total de perguntas estruturadas

209 perguntas nos 20 capítulos + memórias livres ilimitadas.
