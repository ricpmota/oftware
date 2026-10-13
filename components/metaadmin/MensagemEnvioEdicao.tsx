'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type Parte = { tipo: 'texto' | 'link'; valor: string };

const LINK_RE = /https?:\/\/[^\s<>"']+/g;

function limparPontuacaoFinal(url: string): { url: string; resto: string } {
  const match = url.match(/[.,;:!?)]+$/);
  if (!match) return { url, resto: '' };
  return { url: url.slice(0, -match[0].length), resto: match[0] };
}

export function partirMensagemComLinks(mensagem: string): Parte[] {
  const partes: Parte[] = [];
  let cursor = 0;
  for (const match of mensagem.matchAll(LINK_RE)) {
    const index = match.index ?? 0;
    const bruto = match[0];
    const { url, resto } = limparPontuacaoFinal(bruto);
    if (!url) continue;
    if (index > cursor) partes.push({ tipo: 'texto', valor: mensagem.slice(cursor, index) });
    partes.push({ tipo: 'link', valor: url });
    if (resto) partes.push({ tipo: 'texto', valor: resto });
    cursor = index + bruto.length;
  }
  if (cursor < mensagem.length) partes.push({ tipo: 'texto', valor: mensagem.slice(cursor) });
  if (partes.length === 0) partes.push({ tipo: 'texto', valor: mensagem });
  if (partes[0]?.tipo === 'link') partes.unshift({ tipo: 'texto', valor: '' });
  if (partes[partes.length - 1]?.tipo === 'link') partes.push({ tipo: 'texto', valor: '' });
  const comEspaco: Parte[] = [];
  for (const parte of partes) {
    if (parte.tipo === 'link' && comEspaco[comEspaco.length - 1]?.tipo === 'link') {
      comEspaco.push({ tipo: 'texto', valor: '' });
    }
    comEspaco.push(parte);
  }
  return comEspaco;
}

type Props = {
  mensagem: string;
  disabled?: boolean;
  onMensagemChange: (mensagem: string) => void;
};

export default function MensagemEnvioEdicao({ mensagem, disabled, onMensagemChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const [partes, setPartes] = useState<Parte[]>([]);
  const temLink = useMemo(() => partes.some((parte) => parte.tipo === 'link'), [partes]);

  const abrir = () => {
    setPartes(partirMensagemComLinks(mensagem));
    setAberto(true);
  };

  const salvar = () => {
    onMensagemChange(partes.map((parte) => parte.valor).join(''));
    setAberto(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={abrir}
        className="rounded-xl border border-slate-200 px-4 py-3 text-left hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="block text-sm font-semibold text-slate-900">Ver mensagem</span>
      </button>
      {aberto
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="mensagem-envio-edicao-titulo"
                className="flex max-h-[min(85dvh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
              >
                <div className="shrink-0 px-5 pb-3 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 id="mensagem-envio-edicao-titulo" className="text-base font-semibold text-slate-900">
                        Mensagem
                      </h2>
                      {temLink ? (
                        <p className="mt-1 text-sm text-slate-500">O link não pode ser alterado.</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAberto(false)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                      aria-label="Fechar"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div data-mensagem-envio-scroll className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-5">
                  {partes.map((parte, index) =>
                    parte.tipo === 'link' ? (
                      <p
                        key={`link-${index}`}
                        className="break-all rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600"
                      >
                        {parte.valor}
                      </p>
                    ) : (
                      <textarea
                        key={`texto-${index}`}
                        value={parte.valor}
                        rows={Math.min(12, Math.max(3, parte.valor.split('\n').length + 1))}
                        onChange={(event) => {
                          const valor = event.target.value;
                          setPartes((atual) => atual.map((item, i) => (i === index ? { ...item, valor } : item)));
                        }}
                        className="max-h-[50dvh] w-full resize-y overflow-y-auto rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                      />
                    ),
                  )}
                </div>
                <div className="mt-4 flex shrink-0 justify-end gap-2 px-5 pb-5">
                  <button
                    type="button"
                    onClick={() => setAberto(false)}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={salvar}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
