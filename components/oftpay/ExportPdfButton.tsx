'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import type { ChatMessage } from '@/types/chatConversation';

interface ExportPdfButtonProps {
  title: string;
  date: Date;
  messages: ChatMessage[];
  disabled?: boolean;
  className?: string;
}

function formatDateForPdf(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fileName(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `oftware-chat-${y}${m}${d}-${h}${min}.pdf`;
}

/** Quebra texto em linhas que cabem na largura (aproximado em caracteres). */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split(/\n/);
  for (const p of paragraphs) {
    if (!p.trim()) {
      lines.push('');
      continue;
    }
    let remaining = p;
    while (remaining.length > 0) {
      if (remaining.length <= maxCharsPerLine) {
        lines.push(remaining);
        break;
      }
      const chunk = remaining.slice(0, maxCharsPerLine);
      const lastSpace = chunk.lastIndexOf(' ');
      const breakAt = lastSpace > maxCharsPerLine / 2 ? lastSpace : maxCharsPerLine;
      lines.push(remaining.slice(0, breakAt).trim());
      remaining = remaining.slice(breakAt).trim();
    }
  }
  return lines;
}

export default function ExportPdfButton({ title, date, messages, disabled, className = '' }: ExportPdfButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (messages.length === 0 || exporting) return;
    setExporting(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.getPageWidth();
      const margin = 18;
      const maxW = pageW - margin * 2;
      const lineHeight = 6;
      const maxCharsPerLine = Math.floor(maxW / 2.2); // aproximação 2.2mm por char

      let y = 20;

      // Título
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const titleLines = wrapText(title, 50);
      for (const line of titleLines) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += lineHeight + 2;
      }
      y += 2;

      // Data
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(formatDateForPdf(date), margin, y);
      y += lineHeight + 6;
      doc.setTextColor(0, 0, 0);

      // Mensagens
      doc.setFontSize(10);
      for (const msg of messages) {
        if (y > 270) { doc.addPage(); y = 20; }
        const who = msg.role === 'user' ? 'Usuário' : 'Oftware AI';
        doc.setFont('helvetica', 'bold');
        doc.text(who + ':', margin, y);
        y += lineHeight;

        doc.setFont('helvetica', 'normal');
        const contentLines = wrapText(msg.content, maxCharsPerLine);
        for (const line of contentLines) {
          if (y > 275) { doc.addPage(); y = 20; }
          doc.text(line, margin, y);
          y += lineHeight;
        }
        if (msg.sources && msg.sources.length > 0) {
          y += 2;
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          doc.text('Fontes: ' + msg.sources.map((s) => s.title).join(', '), margin, y);
          y += lineHeight;
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
        }
        y += 8;
      }

      doc.save(fileName(date));
    } catch (e) {
      console.error('Export PDF error:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled || messages.length === 0 || exporting}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      title="Baixar conversa em PDF"
    >
      <FileDown className="w-4 h-4" />
      {exporting ? 'Gerando...' : 'Baixar PDF'}
    </button>
  );
}
