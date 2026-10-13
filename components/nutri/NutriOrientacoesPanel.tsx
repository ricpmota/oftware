'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookMarked, FolderOpen, Loader2, Mail, Search, Send, Trash2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import MensagemRichEditor from '@/components/metaadmin/comunicacao/MensagemRichEditor';
import MensagemHtmlBody from '@/components/metaadmin/comunicacao/MensagemHtmlBody';
import { htmlToPlainText, sanitizeMensagemHtml } from '@/lib/pacienteMensagem/mensagemHtml';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import { pacienteSyntheticUserId, type ComunicacaoParticipante } from '@/lib/organizacaoMensagem/types';
import { OrganizacaoMensagemService } from '@/services/organizacaoMensagemService';
import {
  createNutriOrientacao,
  listNutriOrientacoes,
  type NutriOrientacao,
} from '@/lib/nutri/nutriOrientacoesStore';
import { notifyPacienteOrientacaoClient } from '@/lib/nutri/orientacoes/notifyPacienteOrientacaoClient';
import {
  deleteNutriOrientacaoTemplate,
  groupNutriOrientacaoTemplatesByTema,
  listNutriOrientacaoTemplates,
  NUTRI_ORIENTACAO_TEMAS,
  saveNutriOrientacaoTemplate,
  type NutriOrientacaoTemplate,
} from '@/lib/nutri/nutriOrientacaoTemplatesStore';

type Props = {
  pacienteId: string;
  pacienteNome?: string;
  pacienteEmail?: string;
  pacienteUserId?: string;
  canCompose?: boolean;
  authorName?: string;
  authorId?: string;
  authorRole?: 'nutritionist' | 'doctor';
};

export default function NutriOrientacoesPanel({
  pacienteId,
  pacienteNome,
  pacienteEmail,
  pacienteUserId,
  canCompose = false,
  authorName,
  authorId,
  authorRole = 'nutritionist',
}: Props) {
  const [itens, setItens] = useState<NutriOrientacao[]>([]);
  const [templates, setTemplates] = useState<NutriOrientacaoTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [tema, setTema] = useState('Geral');
  const [html, setHtml] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [buscaDiretorio, setBuscaDiretorio] = useState('');
  const [guardarNoDiretorio, setGuardarNoDiretorio] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [salvandoDiretorio, setSalvandoDiretorio] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const ownerId = authorId || auth.currentUser?.uid || '';

  const reloadPaciente = useCallback(async () => {
    setItens(await listNutriOrientacoes(pacienteId));
  }, [pacienteId]);

  const reloadDiretorio = useCallback(async () => {
    if (!ownerId) {
      setTemplates([]);
      return;
    }
    setTemplates(await listNutriOrientacaoTemplates(ownerId));
  }, [ownerId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([reloadPaciente(), canCompose ? reloadDiretorio() : Promise.resolve()])
      .catch(() => {
        if (!cancelled) {
          setItens([]);
          setTemplates([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canCompose, reloadDiretorio, reloadPaciente]);

  const temasSelect = useMemo(() => {
    const conhecidos: string[] = [...NUTRI_ORIENTACAO_TEMAS];
    if (tema && !conhecidos.includes(tema)) conhecidos.push(tema);
    return conhecidos;
  }, [tema]);

  const diretorioFiltrado = useMemo(() => {
    const q = buscaDiretorio.trim().toLocaleLowerCase('pt-BR');
    const list = q
      ? templates.filter(
          (item) =>
            item.titulo.toLocaleLowerCase('pt-BR').includes(q) ||
            item.tema.toLocaleLowerCase('pt-BR').includes(q)
        )
      : templates;
    return groupNutriOrientacaoTemplatesByTema(list);
  }, [buscaDiretorio, templates]);

  const aplicarTemplate = (template: NutriOrientacaoTemplate) => {
    setSelectedTemplateId(template.id);
    setTitulo(template.titulo);
    setTema(template.tema || 'Geral');
    setHtml(template.mensagemHtml || template.mensagem);
    setEditorKey((n) => n + 1);
    setErro(null);
    setFeedback(`“${template.titulo}” carregada. Revise e envie para este paciente.`);
  };

  const payloadOrientacao = () => {
    const htmlFinal = sanitizeMensagemHtml(html);
    const texto = htmlToPlainText(htmlFinal).trim();
    const tituloFinal = titulo.trim() || 'Orientação nutricional';
    return { htmlFinal, texto, tituloFinal };
  };

  const handleGuardarDiretorio = async () => {
    const { htmlFinal, texto, tituloFinal } = payloadOrientacao();
    if (!texto) {
      setErro('Escreva a orientação antes de guardar.');
      return;
    }
    if (!titulo.trim()) {
      setErro('Dê um título para guardar no diretório.');
      return;
    }
    if (!ownerId) {
      setErro('Faça login para guardar no diretório.');
      return;
    }
    setSalvandoDiretorio(true);
    setErro(null);
    setFeedback(null);
    try {
      const saved = await saveNutriOrientacaoTemplate({
        id: selectedTemplateId,
        ownerId,
        titulo: tituloFinal,
        tema,
        mensagem: texto,
        mensagemHtml: htmlFinal,
        createdByName: authorName || auth.currentUser?.displayName || 'Nutricionista',
        createdByRole: authorRole,
        existing: templates,
      });
      setSelectedTemplateId(saved.id);
      await reloadDiretorio();
      setFeedback(`“${saved.titulo}” salva no diretório em ${saved.tema}.`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível guardar no diretório.');
    } finally {
      setSalvandoDiretorio(false);
    }
  };

  const handleExcluirTemplate = async (template: NutriOrientacaoTemplate) => {
    if (!window.confirm(`Apagar “${template.titulo}” do diretório? Isso não remove o que já foi enviado aos pacientes.`)) {
      return;
    }
    try {
      await deleteNutriOrientacaoTemplate(template.id);
      if (selectedTemplateId === template.id) setSelectedTemplateId(null);
      await reloadDiretorio();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível apagar do diretório.');
    }
  };

  const handleEnviar = async () => {
    const { htmlFinal, texto, tituloFinal } = payloadOrientacao();
    if (!texto) {
      setErro('Escreva a orientação antes de enviar.');
      return;
    }
    const user = auth.currentUser;
    if (canCompose && !user) {
      setErro('Faça login para enviar.');
      return;
    }
    if (guardarNoDiretorio && !titulo.trim()) {
      setErro('Dê um título para guardar no diretório, ou desmarque “Guardar no diretório”.');
      return;
    }
    setEnviando(true);
    setErro(null);
    setFeedback(null);
    try {
      let inboxMessageId: string | null = null;
      if (user) {
        const from: ComunicacaoParticipante = {
          userId: user.uid,
          role: authorRole === 'doctor' ? 'medico' : 'nutricionista',
          profileId: authorId || user.uid,
          nome: authorName || user.displayName || 'Nutricionista',
          email: user.email || '',
        };
        const to: ComunicacaoParticipante = {
          userId: pacienteUserId || pacienteSyntheticUserId(pacienteId),
          role: 'paciente',
          profileId: pacienteId,
          nome: pacienteNome || 'Paciente',
          email: pacienteEmail || '',
        };
        inboxMessageId = await OrganizacaoMensagemService.criarMensagem({
          organizationId: METODO_ORGANIZATION_ID,
          from,
          to,
          titulo: tituloFinal,
          mensagem: texto,
          mensagemHtml: htmlFinal,
        });
      }
      await createNutriOrientacao(pacienteId, {
        titulo: tituloFinal,
        mensagem: texto,
        mensagemHtml: htmlFinal,
        createdById: authorId || user?.uid,
        createdByName: authorName || user?.displayName || 'Nutricionista',
        createdByRole: authorRole,
        inboxMessageId,
      });
      if (authorRole === 'nutritionist') {
        notifyPacienteOrientacaoClient(pacienteId);
      }
      if (guardarNoDiretorio && ownerId) {
        const saved = await saveNutriOrientacaoTemplate({
          id: selectedTemplateId,
          ownerId,
          titulo: tituloFinal,
          tema,
          mensagem: texto,
          mensagemHtml: htmlFinal,
          createdByName: authorName || user?.displayName || 'Nutricionista',
          createdByRole: authorRole,
          existing: templates,
        });
        setSelectedTemplateId(saved.id);
        await reloadDiretorio();
      }
      setHtml('');
      setTitulo('');
      setTema('Geral');
      setSelectedTemplateId(null);
      setEditorKey((n) => n + 1);
      await reloadPaciente();
      setFeedback(
        guardarNoDiretorio
          ? 'Orientação enviada ao paciente e guardada no diretório.'
          : 'Orientação enviada ao paciente.'
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar a orientação.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Mail className="h-5 w-5 text-emerald-600" />
          Orientações
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {canCompose
            ? 'Escreva com um título e um tema. Guarde no diretório para reutilizar com outros pacientes.'
            : 'Orientações enviadas pelo nutricionista. As mesmas mensagens também aparecem na caixa de entrada.'}
        </p>
      </div>

      {canCompose ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-teal-700" />
              <h3 className="text-sm font-semibold text-gray-900">Diretório</h3>
            </div>
            <p className="mt-1 text-xs text-gray-500">Por tema. Clique para inserir neste paciente.</p>
            <label className="relative mt-3 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={buscaDiretorio}
                onChange={(event) => setBuscaDiretorio(event.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2 pl-8 pr-3 text-sm text-gray-900"
                placeholder="Buscar título ou tema"
              />
            </label>
            <div className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto">
              {diretorioFiltrado.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-xs text-gray-500">
                  Nenhuma orientação no diretório ainda. Salve a primeira com título e tema.
                </p>
              ) : (
                diretorioFiltrado.map((grupo) => (
                  <div key={grupo.tema}>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-teal-800">{grupo.tema}</p>
                    <ul className="space-y-1">
                      {grupo.items.map((template) => {
                        const ativo = selectedTemplateId === template.id;
                        return (
                          <li key={template.id}>
                            <div
                              className={`flex items-stretch gap-1 rounded-xl border ${
                                ativo ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => aplicarTemplate(template)}
                                className="min-w-0 flex-1 px-3 py-2 text-left"
                                title="Inserir nesta orientação"
                              >
                                <span className="block truncate text-sm font-semibold text-gray-900">{template.titulo}</span>
                                <span className="mt-0.5 block truncate text-[11px] text-gray-500">
                                  {template.updatedAt.toLocaleDateString('pt-BR')}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleExcluirTemplate(template)}
                                className="shrink-0 px-2 text-rose-600 hover:text-rose-800"
                                aria-label={`Apagar ${template.titulo}`}
                                title="Apagar do diretório"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Título</span>
                <input
                  value={titulo}
                  onChange={(event) => setTitulo(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900"
                  placeholder="Ex.: Hidratação — 2 litros por dia"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tema</span>
                <select
                  value={tema}
                  onChange={(event) => setTema(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900"
                >
                  {temasSelect.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3">
              <MensagemRichEditor
                key={`orientacao-editor-${editorKey}`}
                pacienteId={pacienteId}
                initialHtml={html}
                onChangeHtml={setHtml}
                anexos={[]}
                onAnexosChange={() => {}}
                showAnexosList={false}
                minHeightClassName="min-h-[180px]"
                uploadEndpoint="/api/comunicacao/mensagens-anexo-upload"
              />
            </div>
            {erro ? (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {erro}
              </p>
            ) : null}
            {feedback ? <p className="mt-2 text-sm text-emerald-800">{feedback}</p> : null}
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={guardarNoDiretorio}
                onChange={(event) => setGuardarNoDiretorio(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600"
              />
              Guardar no diretório para reutilizar com outros pacientes
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleGuardarDiretorio()}
                disabled={salvandoDiretorio || enviando}
                className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-100 disabled:opacity-60"
              >
                {salvandoDiretorio ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookMarked className="h-4 w-4" />}
                Só guardar no diretório
              </button>
              <button
                type="button"
                onClick={() => void handleEnviar()}
                disabled={enviando || salvandoDiretorio}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar orientação
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : itens.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          Nenhuma orientação registrada ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {itens.map((item) => {
            const aberto = abertoId === item.id;
            return (
              <li key={item.id} className="rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => setAbertoId(aberto ? null : item.id)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">{item.titulo}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {item.createdByName ? `${item.createdByName} · ` : ''}
                      {item.createdAt.toLocaleDateString('pt-BR')}
                    </span>
                  </span>
                </button>
                {aberto ? (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <MensagemHtmlBody texto={item.mensagem} html={item.mensagemHtml} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
