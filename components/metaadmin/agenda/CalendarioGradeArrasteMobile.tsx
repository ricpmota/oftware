'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  diasNoMesCalendario,
  expandirFatiasCalendario,
  fatiasIniciaisCalendario,
  janelaDasFatiasCalendario,
  type FatiaMesCalendario,
} from '@/components/metaadmin/agenda/calendarioMesArraste';

const MARGEM_PONTA = 120;

function chaveMes(ano: number, mes: number): string {
  return `${ano}-${mes}`;
}

function topoNoScroll(root: HTMLElement, el: HTMLElement): number {
  return el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
}

function alturaAteOMenuInferior(root: HTMLElement): number {
  const menu = document.querySelector<HTMLElement>('[data-metaadmin-mobile-nav]');
  if (!menu) return 0;
  const disponivel = Math.floor(menu.getBoundingClientRect().top - root.getBoundingClientRect().top);
  return disponivel > 0 ? disponivel : 0;
}

function definirAlturaDaGrade(root: HTMLElement, alturaMes: number) {
  const ateOMenu = alturaAteOMenuInferior(root);
  const altura = ateOMenu > 0 ? ateOMenu : alturaMes;
  if (altura > 0) root.style.height = `${altura}px`;
}

function centralizarNoScroll(root: HTMLElement, block: HTMLElement) {
  const top = topoNoScroll(root, block);
  const destino = top - (root.clientHeight - block.offsetHeight) / 2;
  const maximo = Math.max(0, root.scrollHeight - root.clientHeight);
  root.scrollTop = Math.min(maximo, Math.max(0, destino));
}

type RecorteMes = { diaInicio: number; diaFim: number };

type Props = {
  enabled: boolean;
  mes: Date;
  centralizarTick: number;
  onJanelaChange?: (inicio: Date, fim: Date) => void;
  renderMonth: (month: Date, recorte?: RecorteMes) => ReactNode;
};

/**
 * No celular, abre o mês atual com 15 dias de cada lado.
 * O restante do mês entra quando o dedo para na ponta; o mês seguinte, só na rolagem de depois.
 */
export default function CalendarioGradeArrasteMobile({
  enabled,
  mes,
  centralizarTick,
  onJanelaChange,
  renderMonth,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef(false);
  const dragouRef = useRef(false);
  const usuarioRolouRef = useRef(false);
  const startYRef = useRef(0);
  const scrollNoInicioRef = useRef(0);
  const preservarRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const expandindoRef = useRef(false);
  const janelaPublicadaRef = useRef('');
  const tickVistoRef = useRef(0);
  const alinhouInicioRef = useRef(false);
  const pendenteCentralizarRef = useRef<string | null>(null);
  const onJanelaRef = useRef(onJanelaChange);
  onJanelaRef.current = onJanelaChange;

  const [fatias, setFatias] = useState<FatiaMesCalendario[]>(() => fatiasIniciaisCalendario(mes));
  const enabledAntesRef = useRef(enabled);

  useEffect(() => {
    const entrouNoCelular = enabled && !enabledAntesRef.current;
    enabledAntesRef.current = enabled;
    if (!entrouNoCelular) return;
    setFatias(fatiasIniciaisCalendario(mes));
    alinhouInicioRef.current = false;
    janelaPublicadaRef.current = '';
    usuarioRolouRef.current = false;
  }, [enabled, mes]);

  useEffect(() => {
    if (!enabled) return;
    const janela = janelaDasFatiasCalendario(fatias);
    if (!janela) return;
    const chave = `${janela.inicio.getFullYear()}-${janela.inicio.getMonth()}-${janela.inicio.getDate()}|${janela.fim.getFullYear()}-${janela.fim.getMonth()}-${janela.fim.getDate()}`;
    if (janelaPublicadaRef.current === chave) return;
    janelaPublicadaRef.current = chave;
    onJanelaRef.current?.(janela.inicio, janela.fim);
  }, [enabled, fatias]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!enabled) {
      if (root) root.style.height = '';
      alinhouInicioRef.current = false;
      return;
    }
    if (!root || alinhouInicioRef.current || pendenteCentralizarRef.current) return;
    const block = root.querySelector<HTMLElement>(`[data-cal-month="${chaveMes(mes.getFullYear(), mes.getMonth())}"]`);
    if (!block) return;
    alinhouInicioRef.current = true;
    usuarioRolouRef.current = false;
    definirAlturaDaGrade(root, block.offsetHeight);
    root.scrollTop = topoNoScroll(root, block);
  }, [enabled, mes, fatias]);

  useLayoutEffect(() => {
    if (!enabled || centralizarTick === 0 || tickVistoRef.current === centralizarTick) return;
    tickVistoRef.current = centralizarTick;
    pendenteCentralizarRef.current = chaveMes(mes.getFullYear(), mes.getMonth());
    usuarioRolouRef.current = false;
    preservarRef.current = null;
    setFatias(fatiasIniciaisCalendario(mes));
  }, [enabled, centralizarTick, mes]);

  useLayoutEffect(() => {
    if (!enabled || !pendenteCentralizarRef.current) return;
    const esperadas = fatiasIniciaisCalendario(mes)
      .map((fatia) => `${fatia.ano}-${fatia.mes}-${fatia.diaInicio}-${fatia.diaFim}`)
      .join(',');
    const atuais = fatias
      .map((fatia) => `${fatia.ano}-${fatia.mes}-${fatia.diaInicio}-${fatia.diaFim}`)
      .join(',');
    if (atuais !== esperadas) return;
    const root = rootRef.current;
    if (!root) return;
    const block = root.querySelector<HTMLElement>(`[data-cal-month="${pendenteCentralizarRef.current}"]`);
    if (!block) return;
    pendenteCentralizarRef.current = null;
    usuarioRolouRef.current = false;
    definirAlturaDaGrade(root, block.offsetHeight);
    centralizarNoScroll(root, block);
  }, [enabled, fatias, mes]);

  useLayoutEffect(() => {
    if (!enabled || usuarioRolouRef.current || pendenteCentralizarRef.current) return;
    const root = rootRef.current;
    if (!root || root.clientHeight <= 0) return;
    const sobraAbaixo = root.scrollHeight - root.scrollTop - root.clientHeight;
    if (sobraAbaixo > 8) return;
    const ultima = fatias[fatias.length - 1];
    if (!ultima || ultima.diaFim >= diasNoMesCalendario(ultima.ano, ultima.mes)) return;
    setFatias((atual) => expandirFatiasCalendario(atual, 'baixo'));
  }, [enabled, fatias]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) return;
    expandindoRef.current = false;
    if (!preservarRef.current) return;
    const { scrollHeight, scrollTop } = preservarRef.current;
    preservarRef.current = null;
    usuarioRolouRef.current = false;
    root.scrollTop = scrollTop + (root.scrollHeight - scrollHeight);
  }, [enabled, fatias]);

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;
    let timer = 0;

    const aoParar = () => {
      if (pointerRef.current || expandindoRef.current || !usuarioRolouRef.current) return;
      const distanciaFim = root.scrollHeight - root.scrollTop - root.clientHeight;
      if (distanciaFim < MARGEM_PONTA) {
        expandindoRef.current = true;
        setFatias((atual) => expandirFatiasCalendario(atual, 'baixo'));
        return;
      }
      if (root.scrollTop < MARGEM_PONTA) {
        expandindoRef.current = true;
        preservarRef.current = { scrollHeight: root.scrollHeight, scrollTop: root.scrollTop };
        setFatias((atual) => expandirFatiasCalendario(atual, 'cima'));
      }
    };

    const onScroll = () => {
      if (pointerRef.current && Math.abs(root.scrollTop - scrollNoInicioRef.current) > 8) {
        dragouRef.current = true;
        usuarioRolouRef.current = true;
      }
      if (!usuarioRolouRef.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(aoParar, 180);
    };
    const onScrollEnd = () => {
      if (!usuarioRolouRef.current) return;
      window.clearTimeout(timer);
      aoParar();
    };
    const onPointerDown = (event: PointerEvent) => {
      pointerRef.current = true;
      dragouRef.current = false;
      startYRef.current = event.clientY;
      scrollNoInicioRef.current = root.scrollTop;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!pointerRef.current) return;
      if (Math.abs(event.clientY - startYRef.current) > 8) {
        dragouRef.current = true;
        usuarioRolouRef.current = true;
      }
    };
    const onPointerUp = () => {
      pointerRef.current = false;
      if (!usuarioRolouRef.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(aoParar, 180);
    };

    root.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('scrollend', onScrollEnd);
    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointermove', onPointerMove, { passive: true });
    root.addEventListener('pointerup', onPointerUp);
    root.addEventListener('pointercancel', onPointerUp);
    const aoRedimensionar = () => {
      const block = root.querySelector<HTMLElement>('[data-cal-month]');
      definirAlturaDaGrade(root, block?.offsetHeight ?? 0);
    };
    aoRedimensionar();
    window.addEventListener('resize', aoRedimensionar);
    window.visualViewport?.addEventListener('resize', aoRedimensionar);
    let cancelado = false;
    void document.fonts?.ready.then(() => {
      if (!cancelado) aoRedimensionar();
    });
    return () => {
      cancelado = true;
      window.clearTimeout(timer);
      window.removeEventListener('resize', aoRedimensionar);
      window.visualViewport?.removeEventListener('resize', aoRedimensionar);
      root.removeEventListener('scroll', onScroll);
      root.removeEventListener('scrollend', onScrollEnd);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerUp);
    };
  }, [enabled]);

  const bloquearCliqueDepoisDoArraste = (event: ReactMouseEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    const andou = !!root && Math.abs(root.scrollTop - scrollNoInicioRef.current) > 8;
    if (!dragouRef.current && !andou) return;
    dragouRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const lista = enabled
    ? fatias
    : [
        {
          ano: mes.getFullYear(),
          mes: mes.getMonth(),
          diaInicio: 1,
          diaFim: new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate(),
        },
      ];

  return (
    <div
      ref={rootRef}
      className={enabled ? 'w-full touch-pan-y overflow-y-auto overscroll-y-contain' : 'w-full'}
      onClickCapture={enabled ? bloquearCliqueDepoisDoArraste : undefined}
    >
      {lista.map((fatia) => (
        <div key={chaveMes(fatia.ano, fatia.mes)} data-cal-month={chaveMes(fatia.ano, fatia.mes)}>
          {renderMonth(new Date(fatia.ano, fatia.mes, 1), {
            diaInicio: fatia.diaInicio,
            diaFim: fatia.diaFim,
          })}
        </div>
      ))}
    </div>
  );
}
