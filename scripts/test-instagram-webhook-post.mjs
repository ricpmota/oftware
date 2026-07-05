#!/usr/bin/env node
/**
 * Teste temporário: POST fake para o webhook em produção/preview.
 * Não inclui tokens. URL via argumento ou WEBHOOK_POST_URL.
 *
 * Uso:
 *   node scripts/test-instagram-webhook-post.mjs https://SEU-DOMINIO/api/instagram/webhook
 *   $env:WEBHOOK_POST_URL="https://..." ; node scripts/test-instagram-webhook-post.mjs
 */

const url =
  process.argv[2]?.trim() ||
  process.env.WEBHOOK_POST_URL?.trim() ||
  '';

const body = {
  entry: [
    {
      id: 'page',
      messaging: [
        {
          sender: { id: 'usuario123' },
          recipient: { id: 'pagina123' },
          message: { text: 'teste instagram via cursor' },
          timestamp: 1710000000,
        },
      ],
    },
  ],
};

async function main() {
  if (!url) {
    console.error(
      'Defina a URL: primeiro argumento ou variável de ambiente WEBHOOK_POST_URL.\n' +
        'Exemplo: node scripts/test-instagram-webhook-post.mjs https://MEU-DOMINIO/api/instagram/webhook',
    );
    process.exit(1);
  }

  let status = 0;
  let responseText = '';
  let networkError = null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    status = res.status;
    responseText = await res.text();
  } catch (err) {
    networkError = err;
  }

  console.log('HTTP status:', status || '(sem resposta)');
  console.log('Resposta da API:', responseText || '(vazio)');
  if (networkError) {
    console.log('Erro de rede:', networkError instanceof Error ? networkError.message : networkError);
  } else {
    console.log('Erro de rede: nenhum');
  }

  if (networkError) process.exit(1);
  if (!status || status < 200 || status >= 300) process.exit(1);
}

main();
