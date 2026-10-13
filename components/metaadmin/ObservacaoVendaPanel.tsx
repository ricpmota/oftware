'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Folder, Plus, Trash2 } from 'lucide-react';
import type {
  ObservacaoVenda,
  ObservacaoVendaAplicacaoItem,
  ObservacaoVendaConsultaItem,
  ObservacaoVendaInjetavelItem,
  ObservacaoVendaOutroItem,
  ObservacaoVendaPasta,
} from '@/types/pagamento';
import {
  OBSERVACAO_VENDA_PASTAS,
  alertaDivergenciaObservacaoVenda,
  criarItemAplicacao,
  criarItemConsulta,
  criarItemInjetavel,
  criarItemOutro,
  criarObservacaoVendaVazia,
  formatarMoedaObservacao,
  observacaoVendaTemConteudo,
} from '@/lib/metaadmin/observacaoVenda';

type Props = {
  value: ObservacaoVenda | null | undefined;
  valorVenda: number;
  onChange: (next: ObservacaoVenda) => void;
  /** Muda ao trocar de venda; reseta a pasta ativa. */
  vendaKey?: string;
};

function parseNumeroCampo(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function campoNumero(valor: number): string {
  return valor ? String(valor) : '';
}

function inputClassName() {
  return 'w-full text-sm px-2.5 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400';
}

function labelClassName() {
  return 'block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1';
}

export default function ObservacaoVendaPanel({
  value,
  valorVenda,
  onChange,
  vendaKey,
}: Props) {
  const obs = value ?? criarObservacaoVendaVazia();
  const [pasta, setPasta] = useState<ObservacaoVendaPasta>('aplicacoes');
  const alerta = alertaDivergenciaObservacaoVenda(obs, valorVenda);

  useEffect(() => {
    setPasta('aplicacoes');
  }, [vendaKey]);

  const atualizar = (patch: Partial<ObservacaoVenda>) => {
    onChange({ ...obs, ...patch });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Observações desta venda
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Detalhe aplicações, injetáveis, consulta e outros para o relatório.
        </p>
      </div>

      <div className="flex gap-1 px-2 pt-2 overflow-x-auto">
        {OBSERVACAO_VENDA_PASTAS.map((item) => {
          const ativa = pasta === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPasta(item.id)}
              className={`inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                ativa
                  ? 'bg-white text-emerald-800 border-emerald-500'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Folder className="w-3.5 h-3.5" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="px-4 py-4 border-t border-slate-100 space-y-3">
        {pasta === 'aplicacoes' ? (
          <PastaAplicacoes obs={obs} onChange={atualizar} />
        ) : null}
        {pasta === 'injetaveis' ? (
          <PastaInjetaveis obs={obs} onChange={atualizar} />
        ) : null}
        {pasta === 'consulta' ? (
          <PastaConsulta obs={obs} onChange={atualizar} />
        ) : null}
        {pasta === 'outros' ? (
          <PastaOutros obs={obs} onChange={atualizar} />
        ) : null}
      </div>

      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/70 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <ResumoMini label="Aplicações" valor={alerta.totais.aplicacoes} />
          <ResumoMini label="Injetáveis" valor={alerta.totais.injetaveis} />
          <ResumoMini label="Consulta" valor={alerta.totais.consulta} />
          <ResumoMini label="Outros" valor={alerta.totais.outros} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-600">
            Soma aplicações + injetáveis:{' '}
            <strong>{formatarMoedaObservacao(alerta.totais.aplicacoesInjetaveis)}</strong>
          </span>
          <span className="text-slate-600">
            Composição:{' '}
            <strong>{formatarMoedaObservacao(alerta.totais.composicao)}</strong>
            {' · '}
            Venda: <strong>{formatarMoedaObservacao(alerta.valorVenda)}</strong>
          </span>
        </div>
        {alerta.diverge ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
            <p>
              A soma das observações (aplicações + injetáveis + consulta + outros) está{' '}
              <strong>{formatarMoedaObservacao(Math.abs(alerta.diferenca))}</strong>{' '}
              {alerta.diferenca > 0 ? 'acima' : 'abaixo'} do total da venda.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResumoMini({ label, valor }: { label: string; valor: number }) {
  return (
    <div>
      <p className="text-slate-400 uppercase tracking-wide font-semibold">{label}</p>
      <p className="text-slate-800 font-semibold tabular-nums">{formatarMoedaObservacao(valor)}</p>
    </div>
  );
}

function PastaAplicacoes({
  obs,
  onChange,
}: {
  obs: ObservacaoVenda;
  onChange: (patch: Partial<ObservacaoVenda>) => void;
}) {
  const itens = obs.aplicacoes ?? [];
  const atualizarItem = (idx: number, patch: Partial<ObservacaoVendaAplicacaoItem>) => {
    const next = itens.map((item, i) => (i === idx ? criarItemAplicacao({ ...item, ...patch }) : item));
    onChange({ aplicacoes: next });
  };
  return (
    <div className="space-y-3">
      {itens.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma aplicação nesta venda.</p>
      ) : (
        itens.map((item, idx) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50/40">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">Aplicação {idx + 1}</p>
              <button
                type="button"
                onClick={() => onChange({ aplicacoes: itens.filter((_, i) => i !== idx) })}
                className="p-1 text-slate-400 hover:text-red-600"
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <CampoNumero
                label="Qtd. aplicações"
                value={item.quantidade}
                onChange={(quantidade) => atualizarItem(idx, { quantidade })}
              />
              <CampoNumero
                label="mg cada"
                value={item.mg}
                step="0.01"
                onChange={(mg) => atualizarItem(idx, { mg })}
              />
              <CampoNumero
                label="Valor unitário"
                value={item.valorUnitario}
                step="0.01"
                onChange={(valorUnitario) => atualizarItem(idx, { valorUnitario })}
              />
              <CampoTotal valor={item.valorTotal} />
            </div>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={() => onChange({ aplicacoes: [...itens, criarItemAplicacao({ quantidade: 1 })] })}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
      >
        <Plus className="w-3.5 h-3.5" />
        Adicionar aplicação
      </button>
      <CampoNotas
        value={obs.notasAplicacoes || ''}
        placeholder="Detalhes extras das aplicações..."
        onChange={(notasAplicacoes) => onChange({ notasAplicacoes })}
      />
    </div>
  );
}

function PastaInjetaveis({
  obs,
  onChange,
}: {
  obs: ObservacaoVenda;
  onChange: (patch: Partial<ObservacaoVenda>) => void;
}) {
  const itens = obs.injetaveis ?? [];
  const atualizarItem = (idx: number, patch: Partial<ObservacaoVendaInjetavelItem>) => {
    const next = itens.map((item, i) => (i === idx ? criarItemInjetavel({ ...item, ...patch }) : item));
    onChange({ injetaveis: next });
  };
  return (
    <div className="space-y-3">
      {itens.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum injetável nesta venda.</p>
      ) : (
        itens.map((item, idx) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50/40">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">Injetável {idx + 1}</p>
              <button
                type="button"
                onClick={() => onChange({ injetaveis: itens.filter((_, i) => i !== idx) })}
                className="p-1 text-slate-400 hover:text-red-600"
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <label className={labelClassName()}>Tipo</label>
              <input
                type="text"
                value={item.tipo}
                onChange={(e) => atualizarItem(idx, { tipo: e.target.value })}
                className={inputClassName()}
                placeholder="Ex.: Complexo B, B12, Lipo..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <CampoNumero
                label="Quantidade"
                value={item.quantidade}
                onChange={(quantidade) => atualizarItem(idx, { quantidade })}
              />
              <CampoNumero
                label="Valor unitário"
                value={item.valorUnitario}
                step="0.01"
                onChange={(valorUnitario) => atualizarItem(idx, { valorUnitario })}
              />
              <CampoTotal valor={item.valorTotal} />
            </div>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={() => onChange({ injetaveis: [...itens, criarItemInjetavel({ quantidade: 1 })] })}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
      >
        <Plus className="w-3.5 h-3.5" />
        Adicionar injetável
      </button>
      <CampoNotas
        value={obs.notasInjetaveis || ''}
        placeholder="Detalhes extras dos injetáveis..."
        onChange={(notasInjetaveis) => onChange({ notasInjetaveis })}
      />
    </div>
  );
}

function PastaConsulta({
  obs,
  onChange,
}: {
  obs: ObservacaoVenda;
  onChange: (patch: Partial<ObservacaoVenda>) => void;
}) {
  const itens = obs.consultas ?? [];
  const atualizarItem = (idx: number, patch: Partial<ObservacaoVendaConsultaItem>) => {
    const next = itens.map((item, i) => (i === idx ? criarItemConsulta({ ...item, ...patch }) : item));
    onChange({ consultas: next });
  };
  return (
    <div className="space-y-3">
      {itens.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma consulta nesta venda.</p>
      ) : (
        itens.map((item, idx) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50/40">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">Consulta {idx + 1}</p>
              <button
                type="button"
                onClick={() => onChange({ consultas: itens.filter((_, i) => i !== idx) })}
                className="p-1 text-slate-400 hover:text-red-600"
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <label className={labelClassName()}>Descrição</label>
              <input
                type="text"
                value={item.descricao}
                onChange={(e) => atualizarItem(idx, { descricao: e.target.value })}
                className={inputClassName()}
                placeholder="Ex.: Consulta inicial, retorno..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <CampoNumero
                label="Quantidade"
                value={item.quantidade}
                onChange={(quantidade) => atualizarItem(idx, { quantidade })}
              />
              <CampoNumero
                label="Valor unitário"
                value={item.valorUnitario}
                step="0.01"
                onChange={(valorUnitario) => atualizarItem(idx, { valorUnitario })}
              />
              <CampoTotal valor={item.valorTotal} />
            </div>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={() => onChange({ consultas: [...itens, criarItemConsulta({ quantidade: 1 })] })}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
      >
        <Plus className="w-3.5 h-3.5" />
        Adicionar consulta
      </button>
      <CampoNotas
        value={obs.notasConsulta || ''}
        placeholder="Detalhes extras da consulta..."
        onChange={(notasConsulta) => onChange({ notasConsulta })}
      />
    </div>
  );
}

function PastaOutros({
  obs,
  onChange,
}: {
  obs: ObservacaoVenda;
  onChange: (patch: Partial<ObservacaoVenda>) => void;
}) {
  const itens = obs.outros ?? [];
  const atualizarItem = (idx: number, patch: Partial<ObservacaoVendaOutroItem>) => {
    const next = itens.map((item, i) => (i === idx ? criarItemOutro({ ...item, ...patch }) : item));
    onChange({ outros: next });
  };
  return (
    <div className="space-y-3">
      {itens.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum item extra nesta venda.</p>
      ) : (
        itens.map((item, idx) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50/40">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">Outros {idx + 1}</p>
              <button
                type="button"
                onClick={() => onChange({ outros: itens.filter((_, i) => i !== idx) })}
                className="p-1 text-slate-400 hover:text-red-600"
                title="Remover"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <label className={labelClassName()}>Descrição</label>
              <input
                type="text"
                value={item.descricao}
                onChange={(e) => atualizarItem(idx, { descricao: e.target.value })}
                className={inputClassName()}
                placeholder="Ex.: Bioimpedância, exame, kit..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <CampoNumero
                label="Quantidade"
                value={item.quantidade}
                onChange={(quantidade) => atualizarItem(idx, { quantidade })}
              />
              <CampoNumero
                label="Valor unitário"
                value={item.valorUnitario}
                step="0.01"
                onChange={(valorUnitario) => atualizarItem(idx, { valorUnitario })}
              />
              <CampoTotal valor={item.valorTotal} />
            </div>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={() => onChange({ outros: [...itens, criarItemOutro({ quantidade: 1 })] })}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
      >
        <Plus className="w-3.5 h-3.5" />
        Adicionar item
      </button>
      <CampoNotas
        value={obs.notasOutros || ''}
        placeholder="Outros detalhes desta venda..."
        onChange={(notasOutros) => onChange({ notasOutros })}
      />
    </div>
  );
}

function CampoNumero({
  label,
  value,
  onChange,
  step = '1',
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: string;
}) {
  return (
    <div>
      <label className={labelClassName()}>{label}</label>
      <input
        type="number"
        min="0"
        step={step}
        value={campoNumero(value)}
        onChange={(e) => onChange(parseNumeroCampo(e.target.value))}
        className={inputClassName()}
      />
    </div>
  );
}

function CampoTotal({ valor }: { valor: number }) {
  return (
    <div>
      <label className={labelClassName()}>Valor total</label>
      <div className="w-full text-sm px-2.5 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 font-semibold tabular-nums">
        {formatarMoedaObservacao(valor)}
      </div>
    </div>
  );
}

function CampoNotas({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className={labelClassName()}>Notas</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className={`${inputClassName()} resize-none`}
        placeholder={placeholder}
      />
    </div>
  );
}

export function ObservacaoVendaResumo({
  obs,
  valorVenda,
}: {
  obs: ObservacaoVenda | null | undefined;
  valorVenda?: number;
}) {
  if (!observacaoVendaTemConteudo(obs) || !obs) return null;
  const alerta =
    valorVenda != null ? alertaDivergenciaObservacaoVenda(obs, valorVenda) : null;

  return (
    <div className="space-y-2 text-sm text-slate-700">
      <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Composição da venda</p>
      {obs.aplicacoes?.length ? (
        <div>
          <p className="font-medium">Aplicações</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
            {obs.aplicacoes.map((item) => (
              <li key={item.id}>
                {item.quantidade || 0} aplicação{(item.quantidade || 0) === 1 ? '' : 'ões'} · {item.mg || 0} mg · un.{' '}
                {formatarMoedaObservacao(item.valorUnitario || 0)} · {formatarMoedaObservacao(item.valorTotal || 0)}
              </li>
            ))}
          </ul>
          {obs.notasAplicacoes?.trim() ? (
            <p className="mt-1 text-xs text-slate-500 whitespace-pre-wrap">{obs.notasAplicacoes.trim()}</p>
          ) : null}
        </div>
      ) : obs.notasAplicacoes?.trim() ? (
        <p className="text-xs"><span className="font-medium">Aplicações:</span> {obs.notasAplicacoes.trim()}</p>
      ) : null}

      {obs.injetaveis?.length ? (
        <div>
          <p className="font-medium">Injetáveis</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
            {obs.injetaveis.map((item) => (
              <li key={item.id}>
                {item.tipo?.trim() || 'Injetável'} · qtd {item.quantidade || 0} · un.{' '}
                {formatarMoedaObservacao(item.valorUnitario || 0)} · {formatarMoedaObservacao(item.valorTotal || 0)}
              </li>
            ))}
          </ul>
          {obs.notasInjetaveis?.trim() ? (
            <p className="mt-1 text-xs text-slate-500 whitespace-pre-wrap">{obs.notasInjetaveis.trim()}</p>
          ) : null}
        </div>
      ) : obs.notasInjetaveis?.trim() ? (
        <p className="text-xs"><span className="font-medium">Injetáveis:</span> {obs.notasInjetaveis.trim()}</p>
      ) : null}

      {obs.consultas?.length ? (
        <div>
          <p className="font-medium">Consulta</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
            {obs.consultas.map((item) => (
              <li key={item.id}>
                {item.descricao?.trim() || 'Consulta'} · qtd {item.quantidade || 0} · un.{' '}
                {formatarMoedaObservacao(item.valorUnitario || 0)} · {formatarMoedaObservacao(item.valorTotal || 0)}
              </li>
            ))}
          </ul>
          {obs.notasConsulta?.trim() ? (
            <p className="mt-1 text-xs text-slate-500 whitespace-pre-wrap">{obs.notasConsulta.trim()}</p>
          ) : null}
        </div>
      ) : obs.notasConsulta?.trim() ? (
        <p className="text-xs"><span className="font-medium">Consulta:</span> {obs.notasConsulta.trim()}</p>
      ) : null}

      {obs.outros?.length ? (
        <div>
          <p className="font-medium">Outros</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
            {obs.outros.map((item) => (
              <li key={item.id}>
                {item.descricao?.trim() || 'Outros'} · qtd {item.quantidade || 0} · un.{' '}
                {formatarMoedaObservacao(item.valorUnitario || 0)} · {formatarMoedaObservacao(item.valorTotal || 0)}
              </li>
            ))}
          </ul>
          {obs.notasOutros?.trim() ? (
            <p className="mt-1 text-xs text-slate-500 whitespace-pre-wrap">{obs.notasOutros.trim()}</p>
          ) : null}
        </div>
      ) : obs.notasOutros?.trim() ? (
        <p className="text-xs"><span className="font-medium">Outros:</span> {obs.notasOutros.trim()}</p>
      ) : null}

      {alerta ? (
        <p className="text-xs text-slate-600">
          Soma aplicações + injetáveis: {formatarMoedaObservacao(alerta.totais.aplicacoesInjetaveis)}
          {' · '}Composição: {formatarMoedaObservacao(alerta.totais.composicao)}
          {' · '}Venda: {formatarMoedaObservacao(alerta.valorVenda)}
        </p>
      ) : null}
      {alerta?.diverge ? (
        <p className="text-xs font-medium text-amber-800">
          Atenção: a composição diverge {formatarMoedaObservacao(Math.abs(alerta.diferenca))} do total da venda.
        </p>
      ) : null}
    </div>
  );
}
