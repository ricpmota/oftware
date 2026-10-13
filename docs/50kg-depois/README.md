# 50 KG DEPOIS — Entrevista biográfica

Projeto editorial privado para coletar a história real de Antônio (153 kg → 103 kg) como matéria-prima do livro **50 KG DEPOIS**.

## Objetivo desta etapa

- Coletar a narrativa nas palavras do participante
- Salvar respostas estruturadas por capítulo e pergunta
- Permitir retomada com autosave
- Exibir material no MetaAdmin Geral (Patrimônio Global)

**Nesta etapa não há IA**, geração automática de texto, resumos ou interpretação editorial.

## Rota pública (login obrigatório)

- `/50kgdepois` — entrevista (responder e editar)
- `/50kgdepois/respostas` — visualização das respostas

A página usa `robots: noindex, nofollow`. O acesso é por login Firebase (mesmo sistema da plataforma), não por token na URL.

## Acesso

1. Abrir `/50kgdepois` ou `/50kgdepois/respostas`
2. Se não estiver logado, redireciona para `/acessar?next=...`
3. Qualquer usuário autenticado pode responder e visualizar as respostas

O link permanece discreto (conhecido pela redação e pelo entrevistado), mas a proteção é feita pelo login — não por token secreto.

## Patrimônio Global (admin)

MetaAdmin Geral → **Patrimônio Global** → **50 KG DEPOIS**

- Hub: `/metaadmingeral/50kg-depois`
- Participante: `/metaadmingeral/50kg-depois/antonio`

## Documentação complementar

- [ARQUITETURA_ENTREVISTA.md](./ARQUITETURA_ENTREVISTA.md)
- [BANCO_DE_PERGUNTAS.md](./BANCO_DE_PERGUNTAS.md)
- [MODELO_DE_DADOS.md](./MODELO_DE_DADOS.md)
