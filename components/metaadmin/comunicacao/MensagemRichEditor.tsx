'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Paperclip,
  Image as ImageIcon,
  Video,
  RemoveFormatting,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import type { PacienteMensagemAnexo } from '@/lib/pacienteMensagem/mensagemHtml';
import { htmlToPlainText, sanitizeMensagemHtml } from '@/lib/pacienteMensagem/mensagemHtml';
import {
  ASSINATURA_LOGO_SIZES,
  imgSizeStyle,
  type AssinaturaLogoSize,
} from '@/lib/pacienteMensagem/assinaturaMensagem';

type Props = {
  pacienteId?: string;
  initialHtml?: string;
  onChangeHtml?: (html: string) => void;
  anexos: PacienteMensagemAnexo[];
  onAnexosChange: (anexos: PacienteMensagemAnexo[]) => void;
  disabled?: boolean;
  minHeightClassName?: string;
  /** Endpoint de upload (médico ou paciente). */
  uploadEndpoint?: string;
  /** Exibe lista de anexos abaixo do editor (default true). */
  showAnexosList?: boolean;
};

function ToolbarBtn({
  title,
  onClick,
  children,
  disabled,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export default function MensagemRichEditor({
  pacienteId = '',
  initialHtml = '',
  onChangeHtml,
  anexos = [],
  onAnexosChange,
  disabled,
  minHeightClassName = 'min-h-[180px]',
  uploadEndpoint = '/api/metaadmin/mensagens-anexo-upload',
  showAnexosList = true,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileAccept, setFileAccept] = useState('*/*');
  const anexosSafe = Array.isArray(anexos) ? anexos : [];
  const [imgMenu, setImgMenu] = useState<{
    img: HTMLImageElement;
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== initialHtml) {
      el.innerHTML = initialHtml || '';
    }
    // só no mount / reset externo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!imgMenu) return;
    const close = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (t && (t as HTMLElement).closest?.('[data-img-size-menu]')) return;
      if (t === imgMenu.img) return;
      setImgMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImgMenu(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [imgMenu]);

  const emitHtml = useCallback(() => {
    const raw = editorRef.current?.innerHTML || '';
    onChangeHtml?.(sanitizeMensagemHtml(raw));
  }, [onChangeHtml]);

  const run = (command: string, value?: string) => {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    emitHtml();
  };

  const insertLink = () => {
    const url = window.prompt('URL do link:');
    if (!url?.trim()) return;
    run('createLink', url.trim());
  };

  const applyImgSize = (size: AssinaturaLogoSize) => {
    if (!imgMenu?.img) return;
    const s = imgSizeStyle(size);
    const img = imgMenu.img;
    img.setAttribute('width', String(s.widthAttr));
    img.setAttribute('height', String(s.heightAttr));
    img.setAttribute('data-oftware-img-size', size);
    img.style.height = `${ASSINATURA_LOGO_SIZES[size].height}px`;
    img.style.width = 'auto';
    img.style.maxWidth = `${ASSINATURA_LOGO_SIZES[size].maxWidth}px`;
    img.style.display = 'block';
    img.style.objectFit = 'contain';
    setImgMenu(null);
    emitHtml();
  };

  const onEditorClick = (e: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const target = e.target as HTMLElement | null;
    if (target?.tagName === 'IMG') {
      e.preventDefault();
      const img = target as HTMLImageElement;
      const editor = editorRef.current;
      if (!editor) return;
      const er = editor.getBoundingClientRect();
      const ir = img.getBoundingClientRect();
      setImgMenu({
        img,
        top: ir.bottom - er.top + editor.scrollTop + 6,
        left: Math.max(8, ir.left - er.left),
      });
      return;
    }
    setImgMenu(null);
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length || disabled) return;
    setUploading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Sessão expirada. Faça login novamente.');
        return;
      }
      const token = await user.getIdToken();
      const novos: PacienteMensagemAnexo[] = [];

      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        if (pacienteId) fd.append('pacienteId', pacienteId);

        const res = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          url?: string;
          name?: string;
          mimeType?: string;
          size?: number;
        } | null;

        if (!res.ok || !data?.ok || !data.url) {
          throw new Error(data?.error || 'Falha no upload do anexo.');
        }

        const anexo: PacienteMensagemAnexo = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: data.name || file.name,
          url: data.url,
          mimeType: data.mimeType || file.type || 'application/octet-stream',
          size: data.size ?? file.size,
        };
        novos.push(anexo);

        if (anexo.mimeType.startsWith('image/')) {
          const s = imgSizeStyle('medium');
          const html = `<img src="${anexo.url}" alt="${anexo.name.replace(/"/g, '')}" width="${s.widthAttr}" height="${s.heightAttr}" data-oftware-img-size="medium" style="${s.style}" />`;
          document.execCommand('insertHTML', false, html);
          emitHtml();
        } else if (anexo.mimeType.startsWith('video/')) {
          const html = `<p><a href="${anexo.url}" target="_blank" rel="noopener noreferrer">🎬 ${anexo.name}</a></p>`;
          document.execCommand('insertHTML', false, html);
          emitHtml();
        }
      }
      if (novos.length) onAnexosChange([...anexosSafe, ...novos]);
    } catch (e) {
      console.error('Erro ao anexar arquivo:', e);
      alert(e instanceof Error ? e.message : 'Não foi possível anexar o arquivo. Tente novamente.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const pickFiles = (accept: string) => {
    setFileAccept(accept);
    requestAnimationFrame(() => fileInputRef.current?.click());
  };

  const removeAnexo = (id: string) => {
    onAnexosChange(anexosSafe.filter((a) => a.id !== id));
  };

  const currentSize =
    (imgMenu?.img.getAttribute('data-oftware-img-size') as AssinaturaLogoSize | null) ||
    'medium';

  return (
    <div className="relative rounded-lg border border-gray-300 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-1.5 py-1">
        <ToolbarBtn title="Negrito" onClick={() => run('bold')} disabled={disabled}>
          <Bold size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Itálico" onClick={() => run('italic')} disabled={disabled}>
          <Italic size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Sublinhado" onClick={() => run('underline')} disabled={disabled}>
          <Underline size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Tachado" onClick={() => run('strikeThrough')} disabled={disabled}>
          <Strikethrough size={15} />
        </ToolbarBtn>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <select
          className="h-8 rounded-md border border-gray-200 bg-white px-1.5 text-xs text-gray-700"
          defaultValue=""
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value) run('fontName', e.target.value);
            e.target.value = '';
          }}
          title="Fonte"
        >
          <option value="" disabled>
            Fonte
          </option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times</option>
          <option value="Courier New">Courier</option>
          <option value="Verdana">Verdana</option>
        </select>
        <select
          className="h-8 rounded-md border border-gray-200 bg-white px-1.5 text-xs text-gray-700"
          defaultValue=""
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value) run('fontSize', e.target.value);
            e.target.value = '';
          }}
          title="Tamanho"
        >
          <option value="" disabled>
            Tam.
          </option>
          <option value="2">Pequeno</option>
          <option value="3">Normal</option>
          <option value="4">Médio</option>
          <option value="5">Grande</option>
          <option value="6">Enorme</option>
        </select>
        <input
          type="color"
          title="Cor do texto"
          disabled={disabled}
          className="h-8 w-8 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
          onChange={(e) => run('foreColor', e.target.value)}
        />
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <ToolbarBtn title="Lista" onClick={() => run('insertUnorderedList')} disabled={disabled}>
          <List size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Lista numerada" onClick={() => run('insertOrderedList')} disabled={disabled}>
          <ListOrdered size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Link" onClick={insertLink} disabled={disabled}>
          <LinkIcon size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Alinhar à esquerda" onClick={() => run('justifyLeft')} disabled={disabled}>
          <AlignLeft size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Centralizar" onClick={() => run('justifyCenter')} disabled={disabled}>
          <AlignCenter size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Alinhar à direita" onClick={() => run('justifyRight')} disabled={disabled}>
          <AlignRight size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Limpar formatação" onClick={() => run('removeFormat')} disabled={disabled}>
          <RemoveFormatting size={15} />
        </ToolbarBtn>
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <ToolbarBtn title="Anexar arquivo" onClick={() => pickFiles('*/*')} disabled={disabled || uploading}>
          <Paperclip size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Inserir foto" onClick={() => pickFiles('image/*')} disabled={disabled || uploading}>
          <ImageIcon size={15} />
        </ToolbarBtn>
        <ToolbarBtn title="Inserir vídeo" onClick={() => pickFiles('video/*')} disabled={disabled || uploading}>
          <Video size={15} />
        </ToolbarBtn>
        {uploading ? <span className="ml-2 text-xs text-gray-500">Enviando…</span> : null}
      </div>

      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={emitHtml}
          onBlur={emitHtml}
          onClick={onEditorClick}
          className={`${minHeightClassName} max-h-[360px] overflow-y-auto px-3 py-2 text-sm text-gray-900 outline-none prose prose-sm max-w-none [&_img]:cursor-pointer [&_img]:rounded-md`}
          data-placeholder="Escreva sua mensagem…"
        />

        {imgMenu ? (
          <div
            data-img-size-menu
            className="absolute z-20 flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
            style={{ top: imgMenu.top, left: imgMenu.left }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {(Object.keys(ASSINATURA_LOGO_SIZES) as AssinaturaLogoSize[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyImgSize(key)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  currentSize === key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {ASSINATURA_LOGO_SIZES[key].label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={fileAccept}
        multiple
        onChange={(e) => void uploadFiles(e.target.files)}
      />

      {showAnexosList && anexosSafe.length > 0 ? (
        <ul className="border-t border-gray-200 bg-gray-50 px-3 py-2 space-y-1">
          {anexosSafe.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-xs text-gray-700">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="truncate text-blue-700 hover:underline">
                {a.name}
              </a>
              <button
                type="button"
                className="shrink-0 text-red-600 hover:underline"
                onClick={() => removeAnexo(a.id)}
                disabled={disabled}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function getPlainFromEditorHtml(html: string): string {
  return htmlToPlainText(html);
}
