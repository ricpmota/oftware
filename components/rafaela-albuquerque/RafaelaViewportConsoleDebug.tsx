'use client';

import { useEffect } from 'react';

/**
 * Ajuda a entender por que o layout “parece desktop” no celular.
 * Ativa: dev automaticamente; prod com ?viewportDebug=1 ou NEXT_PUBLIC_VIEWPORT_DEBUG=1
 */
export default function RafaelaViewportConsoleDebug() {
  useEffect(() => {
    const byQuery = new URLSearchParams(window.location.search).get('viewportDebug') === '1';
    const byEnv = process.env.NEXT_PUBLIC_VIEWPORT_DEBUG === '1';
    const byDev = process.env.NODE_ENV === 'development';
    if (!byQuery && !byEnv && !byDev) return;

    const meta = document.querySelector('meta[name="viewport"]');
    const vv = window.visualViewport;
    const inner = window.innerWidth;
    const client = document.documentElement.clientWidth;
    const mqSm = window.matchMedia('(min-width: 640px)').matches;
    const mqMd = window.matchMedia('(min-width: 768px)').matches;
    const mqLg = window.matchMedia('(min-width: 1024px)').matches;

    let hint: string;
    if (!meta) {
      hint =
        'Nenhuma <meta name="viewport"> no DOM — o Next costuma injetar via layout; recarregue e inspecione o HTML. Sem viewport, o mobile costuma simular ~980px e tudo vira “desktop”.';
    } else if (inner >= 768) {
      hint =
        'innerWidth ≥ 768px: classes md: (768+) e lg: (1024+) do Tailwind entram como no desktop. No celular real, causa típica é viewport errado (layout largo), “Solicitar site para computador”, ou zoom reduzido.';
    } else {
      hint =
        'innerWidth < 768px: em princípio o baseline mobile do Tailwind deveria valer. Se ainda parece desktop, pode ser CSS com largura mínima fixa, overflow, ou componente que não usa breakpoints.';
    }

    console.warn('[Rafaela viewport debug]', {
      hint,
      innerWidth: inner,
      outerWidth: window.outerWidth,
      documentElementClientWidth: client,
      visualViewport: vv
        ? { width: vv.width, height: vv.height, scale: vv.scale }
        : null,
      devicePixelRatio: window.devicePixelRatio,
      viewportMetaContent: meta?.getAttribute('content') ?? null,
      tailwindMq: { sm640: mqSm, md768: mqMd, lg1024: mqLg },
    });
  }, []);

  return null;
}
