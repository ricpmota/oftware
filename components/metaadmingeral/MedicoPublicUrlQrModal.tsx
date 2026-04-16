'use client';

import { useCallback, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { X } from 'lucide-react';
import type { Medico } from '@/types/medico';
import { gerarSlugDrMedico } from '@/utils/medicoDrSlug';

const LOGO_SRC = '/branding/simbolo-emagrecer-18.png';

interface MedicoPublicUrlQrModalProps {
  medico: Medico;
  url: string;
  onClose: () => void;
}

export function MedicoPublicUrlQrModal({ medico, url, onClose }: MedicoPublicUrlQrModalProps) {
  const qrCaptureRef = useRef<HTMLDivElement>(null);
  const [baixandoJpg, setBaixandoJpg] = useState(false);
  const [baixandoPdf, setBaixandoPdf] = useState(false);

  const renderQrCanvas = useCallback(async () => {
    const el = qrCaptureRef.current;
    if (!el) return null;
    return html2canvas(el, {
      backgroundColor: '#ffffff',
      scale: 3,
      useCORS: true,
      logging: false,
    });
  }, []);

  const handleDownloadJpg = useCallback(async () => {
    setBaixandoJpg(true);
    try {
      const canvas = await renderQrCanvas();
      if (!canvas) return;
      const nomeArquivo = `qr-link-dr-${gerarSlugDrMedico(medico.nome)}.jpg`;
      const link = document.createElement('a');
      link.download = nomeArquivo;
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.click();
    } catch {
      // html2canvas pode falhar em alguns ambientes com SVG
    } finally {
      setBaixandoJpg(false);
    }
  }, [medico.nome, renderQrCanvas]);

  const handleDownloadPdf = useCallback(async () => {
    setBaixandoPdf(true);
    try {
      const canvas = await renderQrCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdfW = 210;
      const pdfH = 297;
      const margin = 18;
      const maxW = pdfW - margin * 2;
      const aspect = canvas.height / canvas.width;
      let imgW = maxW;
      let imgH = imgW * aspect;
      const maxImgH = pdfH - margin * 2 - 28;
      if (imgH > maxImgH) {
        imgH = maxImgH;
        imgW = imgH / aspect;
      }
      const x = (pdfW - imgW) / 2;
      const y = margin;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.addImage(imgData, 'JPEG', x, y, imgW, imgH);
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(8.5);
      const urlLines = doc.splitTextToSize(url, maxW);
      doc.text(urlLines, margin, y + imgH + 7);
      doc.save(`qr-link-dr-${gerarSlugDrMedico(medico.nome)}.pdf`);
    } catch {
      // export
    } finally {
      setBaixandoPdf(false);
    }
  }, [medico.nome, renderQrCanvas, url]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="medico-qr-modal-title"
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0A1F44] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 id="medico-qr-modal-title" className="text-lg font-semibold text-[#E8EDED]">
              QR code — página pública
            </h3>
            <p className="mt-1 text-sm text-[#E8EDED]/75">
              {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#E8EDED]/70 hover:bg-white/10 hover:text-[#E8EDED]"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div ref={qrCaptureRef} className="relative inline-flex rounded-xl bg-white p-3">
            <QRCode value={url} size={240} level="H" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
              {/* Logo central (alta correção no QR) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_SRC} alt="" className="h-full w-full object-contain" />
            </div>
          </div>
          <p className="break-all text-center text-xs leading-relaxed text-[#E8EDED]/80">{url}</p>
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadJpg()}
              disabled={baixandoJpg || baixandoPdf}
              className="text-sm font-medium text-[#4CCB7A] hover:underline disabled:cursor-wait disabled:opacity-60"
            >
              {baixandoJpg ? 'Gerando JPG…' : 'Baixar QR code (JPG)'}
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={baixandoJpg || baixandoPdf}
              className="text-sm font-medium text-[#4CCB7A] hover:underline disabled:cursor-wait disabled:opacity-60"
            >
              {baixandoPdf ? 'Gerando PDF…' : 'Baixar QR code (PDF)'}
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(url);
              }}
              className="text-sm font-medium text-[#E8EDED]/80 hover:underline"
            >
              Copiar link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
