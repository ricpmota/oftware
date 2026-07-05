'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { estadosCidades, estadosList } from '@/data/cidades-brasil';
import { CidadeCustomizadaService } from '@/services/cidadeCustomizadaService';
import { FieldLabel, selectClassName } from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';
import { calcularSimilaridade } from '@/lib/meta/metaMedicoVerificacao';

export type CidadeAtendimento = { estado: string; cidade: string };

type Props = {
  cidades: CidadeAtendimento[];
  onChange: (cidades: CidadeAtendimento[]) => void;
  userId: string;
};

export default function VerificationCidadesFields({ cidades, onChange, userId }: Props) {
  const [estadoSelecionado, setEstadoSelecionado] = useState('');
  const [cidadeSelecionada, setCidadeSelecionada] = useState('');
  const [cidadesCustomizadas, setCidadesCustomizadas] = useState<CidadeAtendimento[]>([]);
  const [showModalNovaCidade, setShowModalNovaCidade] = useState(false);
  const [novaCidadeEstado, setNovaCidadeEstado] = useState('');
  const [novaCidadeNome, setNovaCidadeNome] = useState('');

  const loadCidadesCustomizadas = useCallback(async () => {
    try {
      const customizadas = await CidadeCustomizadaService.getAllCidadesCustomizadas();
      setCidadesCustomizadas(customizadas.map((c) => ({ estado: c.estado, cidade: c.cidade })));
    } catch (e) {
      console.error('Erro ao carregar cidades customizadas:', e);
    }
  }, []);

  useEffect(() => {
    void loadCidadesCustomizadas();
  }, [loadCidadesCustomizadas]);

  const buscarCidadesSimilares = useCallback(
    (estado: string, nomeCidade: string): { cidade: string; similaridade: number }[] => {
      const todasCidades: string[] = [];
      if (estadosCidades[estado as keyof typeof estadosCidades]) {
        todasCidades.push(...estadosCidades[estado as keyof typeof estadosCidades].cidades);
      }
      cidadesCustomizadas
        .filter((c) => c.estado === estado)
        .forEach((c) => {
          if (!todasCidades.includes(c.cidade)) todasCidades.push(c.cidade);
        });
      return todasCidades
        .map((cidade) => ({ cidade, similaridade: calcularSimilaridade(nomeCidade, cidade) }))
        .filter((item) => item.similaridade > 0.7 && item.similaridade < 1)
        .sort((a, b) => b.similaridade - a.similaridade)
        .slice(0, 3);
    },
    [cidadesCustomizadas]
  );

  const handleAdicionarCidadeDaLista = () => {
    if (!estadoSelecionado || !cidadeSelecionada) {
      alert('Selecione estado e cidade.');
      return;
    }
    const existe = cidades.some((c) => c.estado === estadoSelecionado && c.cidade === cidadeSelecionada);
    if (existe) {
      alert('Esta cidade já está na lista.');
      return;
    }
    onChange([...cidades, { estado: estadoSelecionado, cidade: cidadeSelecionada }]);
    setEstadoSelecionado('');
    setCidadeSelecionada('');
  };

  const handleRemoverCidade = (index: number) => {
    onChange(cidades.filter((_, i) => i !== index));
  };

  const cidadesDoEstado = estadoSelecionado
    ? (() => {
        const cidadesPadrao = estadosCidades[estadoSelecionado as keyof typeof estadosCidades]?.cidades || [];
        const cidadesCustomEstado = cidadesCustomizadas
          .filter((c) => c.estado === estadoSelecionado)
          .map((c) => c.cidade);
        return [...new Set([...cidadesPadrao, ...cidadesCustomEstado])].sort();
      })()
    : [];

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <select
            value={estadoSelecionado}
            onChange={(e) => {
              setEstadoSelecionado(e.target.value);
              setCidadeSelecionada('');
            }}
            className={selectClassName}
          >
            <option value="">Estado</option>
            {estadosList.map((estado) => (
              <option key={estado.sigla} value={estado.sigla}>
                {estado.nome}
              </option>
            ))}
          </select>
          <select
            value={cidadeSelecionada}
            onChange={(e) => setCidadeSelecionada(e.target.value)}
            disabled={!estadoSelecionado}
            className={`${selectClassName} disabled:opacity-50`}
          >
            <option value="">Cidade</option>
            {cidadesDoEstado.map((cidade) => (
              <option key={cidade} value={cidade}>
                {cidade}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdicionarCidadeDaLista}
            disabled={!estadoSelecionado || !cidadeSelecionada}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-4 py-3.5 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            aria-label="Adicionar cidade"
          >
            <Plus size={20} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowModalNovaCidade(true)}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          + Adicionar cidade que não está na lista
        </button>
        {cidades.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {cidades.map((c, i) => {
              const nomeEst = estadosCidades[c.estado as keyof typeof estadosCidades]?.nome || c.estado;
              return (
                <span
                  key={`${c.estado}-${c.cidade}-${i}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs text-emerald-900 ring-1 ring-emerald-200"
                >
                  {nomeEst} — {c.cidade}
                  <button
                    type="button"
                    onClick={() => handleRemoverCidade(i)}
                    className="ml-0.5 rounded p-0.5 hover:bg-emerald-100"
                    aria-label="Remover"
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {showModalNovaCidade && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-lg font-semibold text-slate-900">Adicionar nova cidade</h3>
              <p className="mt-1 text-xs text-slate-500">Mesma regra do Meu Perfil: a cidade passa a constar na lista para todos.</p>
            </div>
            <div className="space-y-4 px-4 py-4">
              <div>
                <FieldLabel>Estado *</FieldLabel>
                <select
                  value={novaCidadeEstado}
                  onChange={(e) => setNovaCidadeEstado(e.target.value)}
                  className={selectClassName}
                >
                  <option value="">Selecione o estado</option>
                  {estadosList.map((estado) => (
                    <option key={estado.sigla} value={estado.sigla}>
                      {estado.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Nome da cidade *</FieldLabel>
                <input
                  type="text"
                  value={novaCidadeNome}
                  onChange={(e) => setNovaCidadeNome(e.target.value)}
                  className={selectClassName}
                  placeholder="Digite o nome da cidade"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setShowModalNovaCidade(false);
                  setNovaCidadeEstado('');
                  setNovaCidadeNome('');
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!novaCidadeEstado || !novaCidadeNome.trim()) {
                    alert('Preencha estado e nome da cidade.');
                    return;
                  }
                  const nomeNorm = novaCidadeNome.trim();
                  const jaExiste = cidades.some(
                    (c) => c.estado === novaCidadeEstado && c.cidade.toLowerCase() === nomeNorm.toLowerCase()
                  );
                  if (jaExiste) {
                    alert('Esta cidade já está na sua lista.');
                    return;
                  }
                  const similares = buscarCidadesSimilares(novaCidadeEstado, nomeNorm);
                  if (similares.length > 0) {
                    const msg = similares
                      .map((s, idx) => `${idx + 1}. ${s.cidade} (${Math.round(s.similaridade * 100)}% parecido)`)
                      .join('\n');
                    const ok = confirm(
                      `Encontramos cidades parecidas:\n\n${msg}\n\nVocê digitou: "${nomeNorm}"\n\nAdicionar mesmo assim?`
                    );
                    if (!ok) return;
                  }
                  const todas: string[] = [];
                  if (estadosCidades[novaCidadeEstado as keyof typeof estadosCidades]) {
                    todas.push(...estadosCidades[novaCidadeEstado as keyof typeof estadosCidades].cidades);
                  }
                  cidadesCustomizadas
                    .filter((c) => c.estado === novaCidadeEstado)
                    .forEach((c) => todas.push(c.cidade));
                  const existeExata = todas.some((c) => c.toLowerCase() === nomeNorm.toLowerCase());
                  if (existeExata) {
                    alert('Esta cidade já existe na lista. Use o seletor acima para adicioná-la.');
                    return;
                  }
                  try {
                    await CidadeCustomizadaService.criarCidadeCustomizada(novaCidadeEstado, nomeNorm, userId);
                    await loadCidadesCustomizadas();
                  } catch (e) {
                    console.error(e);
                    alert('Erro ao registrar a cidade. Tente de novo.');
                    return;
                  }
                  onChange([...cidades, { estado: novaCidadeEstado, cidade: nomeNorm }]);
                  setShowModalNovaCidade(false);
                  setNovaCidadeEstado('');
                  setNovaCidadeNome('');
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
