'use client';

import { useState, useMemo, useEffect } from 'react';
import { BookOpen, Folder, ChevronDown, ChevronRight, ExternalLink, FileText, X, Search, MessageCircle } from 'lucide-react';
import ChatLayout from './ChatLayout';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
}

export interface ApostilaItem {
  id: string;
  name: string;
  subject: string;
  url: string;
  storagePath?: string;
}

interface ApostilaLibraryProps {
  apostilas: ApostilaItem[];
  loading?: boolean;
  error?: string | null;
  debug?: { prefix?: string; bucket?: string; totalInFolder?: number } | null;
  /** courseId para links de apostila no chatbot (ex: oftreview, propedeutics) */
  courseId?: string;
}

export default function ApostilaLibrary({ apostilas, loading = false, error = null, debug = null, courseId = 'oftreview' }: ApostilaLibraryProps) {
  const isMobile = useIsMobile();
  const [selectedPdf, setSelectedPdf] = useState<ApostilaItem | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [collapsedSubjects, setCollapsedSubjects] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [apostilaSubTab, setApostilaSubTab] = useState<'apostilas' | 'chat'>('apostilas');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return apostilas;
    return apostilas.filter(
      (a) =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.subject || '').toLowerCase().includes(q)
    );
  }, [apostilas, searchQuery]);

  const bySubject = useMemo(() => {
    const map = new Map<string, ApostilaItem[]>();
    for (const a of filtered) {
      const sub = a.subject || 'Geral';
      if (!map.has(sub)) map.set(sub, []);
      map.get(sub)!.push(a);
    }
    map.forEach((list) => list.sort((x, y) => (x.name || '').localeCompare(y.name || '', undefined, { numeric: true })));
    return map;
  }, [filtered]);

  const subjectList = useMemo(() => Array.from(bySubject.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })), [bySubject]);

  const toggleSubject = (subject: string) => {
    setCollapsedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject);
      else next.add(subject);
      return next;
    });
  };

  const apostilasContent = loading ? (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent mx-auto mb-3" />
      <p>Carregando apostilas...</p>
    </div>
  ) : error ? (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-800">
      <BookOpen className="w-10 h-10 mx-auto mb-2 text-red-500" />
      <p className="font-medium">Erro ao carregar apostilas</p>
      <p className="text-sm mt-2 break-words">{error}</p>
    </div>
  ) : apostilas.length === 0 ? (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
      <BookOpen className="w-10 h-10 mx-auto mb-2 text-amber-500" />
      <p className="font-medium">Nenhuma apostila encontrada</p>
      <p className="text-sm mt-1">
        Caminho: <code className="bg-amber-100 px-1 rounded">{debug?.prefix ?? '—'}</code> no bucket <code className="bg-amber-100 px-1 rounded">{debug?.bucket ?? '?'}</code>.
        {debug?.totalInFolder != null && (
          <span className="block mt-2 text-xs">Arquivos na pasta: {debug.totalInFolder} (nenhum .pdf).</span>
        )}
      </p>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {/* Sub-abas: Apostilas | Chatbot Oftware */}
      <div className="flex border-b border-gray-200 -mx-1">
        <button
          type="button"
          onClick={() => setApostilaSubTab('apostilas')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            apostilaSubTab === 'apostilas'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Apostilas
        </button>
        <button
          type="button"
          onClick={() => setApostilaSubTab('chat')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            apostilaSubTab === 'chat'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Chatbot Oftware
        </button>
      </div>

      {apostilaSubTab === 'chat' && <ChatLayout courseId={courseId} />}

      {apostilaSubTab === 'apostilas' && (
        <>
          {apostilasContent}
          {apostilasContent === null && (
            <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar PDF por nome ou assunto..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Buscar apostilas"
        />
      </div>
      <p className="text-sm text-gray-500 text-center md:text-left">
        Clique em uma apostila para abrir e ler. Os livros estão organizados por assunto.
      </p>

      {searchQuery.trim() && filtered.length === 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Nenhum PDF encontrado para &quot;{searchQuery.trim()}&quot;. Tente outro termo.
        </p>
      )}

      {/* Lista por assunto (acordeão) */}
      <div className="space-y-2">
        {subjectList.map((subject) => {
          const items = bySubject.get(subject) ?? [];
          const isCollapsed = collapsedSubjects.has(subject);
          return (
            <div key={subject} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <button
                type="button"
                onClick={() => toggleSubject(subject)}
                className="flex items-center gap-2 w-full px-3 py-2.5 bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-800 hover:bg-gray-100 text-left"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                )}
                <Folder className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{subject}</span>
                <span className="text-xs text-gray-400 font-normal ml-1">({items.length})</span>
              </button>
              {!isCollapsed && (
                <ul className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <li key={item.id}>
                      <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 group">
                        <div className="flex-shrink-0 w-10 h-12 rounded border border-gray-200 bg-gradient-to-b from-amber-50 to-amber-100/50 flex items-center justify-center shadow-sm">
                          <FileText className="w-5 h-5 text-amber-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.subject}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPdf(item);
                              setPdfLoading(true);
                            }}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Abrir apostila"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                            title="Abrir em nova aba"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal leitor PDF */}
      {selectedPdf && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
            <span className="truncate flex-1 min-w-0 font-medium text-gray-900">{selectedPdf.name}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={selectedPdf.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Abrir em nova aba
              </a>
              <button
                type="button"
                onClick={() => { setSelectedPdf(null); setPdfLoading(false); }}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-200"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* Mobile: overflow-x-hidden para scroll só vertical; #view=FitH no PDF para encaixar na largura */}
          <div className="flex-1 min-h-0 w-full relative overflow-y-auto overflow-x-hidden md:overflow-hidden max-w-[100vw] touch-pan-y">
            {pdfLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-100 text-gray-600">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-3" />
                <p className="text-sm font-medium">Carregando PDF...</p>
              </div>
            )}
            <iframe
              src={
                isMobile && selectedPdf.url && !selectedPdf.url.includes('#')
                  ? `${selectedPdf.url}#view=FitH`
                  : selectedPdf.url
              }
              title={selectedPdf.name}
              className="w-full min-w-0 max-w-full h-full border-0"
              onLoad={() => setPdfLoading(false)}
            />
          </div>
        </div>
      )}
            </>
          )}
        </>
      )}
    </div>
  );
}
