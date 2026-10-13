/**
 * PDF de impressão da página /relatorio/[token].
 * Cabeçalho do médico, dados do paciente e uma seção: evolução, bio, exames ou financeiro.
 */
import jsPDF from 'jspdf';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente, ParcelaPagamento } from '@/types/pagamento';
import type { Prescricao } from '@/types/prescricao';
import type { SolicitacaoExamesSalva } from '@/utils/solicitacaoExamesPdfDownload';
import type { MedicoPerfilRelatorio } from '@/utils/relatorioPacientePdf';
import {
  LAB_AUSENTE,
  montarLabPdfModel,
  type LabGrupo,
  type LabMarcador,
  type SituacaoLab,
} from '@/utils/relatorioExamesLabPdfModel';
import { buildDepoimentoResultadoFromPaciente } from '@/utils/buildDepoimentoResultadoFromPaciente';
import {
  listarProtocolosTirzepatida,
  protocoloPorIndice,
  totalMgRealizadoProtocolo,
} from '@/utils/tirzepatidaProtocoloDisplay';
import { montarBioPdfModel, type BioHistoricoLinha } from '@/utils/relatorioBioPdfModel';
import { montarFinanceiroPdfModel, FIN_AUSENTE, type ParcelaPdf, type VendaPdf } from '@/utils/relatorioFinanceiroPdfModel';
import { toDatePagamento } from '@/lib/profissional/controleFinanceiroParcelas';
import { loadImageForJsPdf, type LoadedJsPdfImage } from '@/utils/loadImageForJsPdf';
import {
  DEFAULT_DR_PAGE_BACKGROUND,
  DEFAULT_DR_PAGE_TEXT,
} from '@/lib/whiteLabel/publicPagesTheme';
import { DEFAULT_WHITE_LABEL_PRIMARY_COLOR } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import type { TipoExameImagem } from '@/lib/metaadmin/exameImagemExtracao';

export type RelatorioImpressaoSecao = 'evolucao' | 'bio' | 'exames' | 'financeiro';

export type RelatorioImpressaoInput = {
  secao: RelatorioImpressaoSecao;
  paciente: PacienteCompleto;
  medico: MedicoPerfilRelatorio | null;
  pagamento: PagamentoPaciente | null;
  prescricoes: Prescricao[];
  solicitacoesExames: SolicitacaoExamesSalva[];
  protocoloIndice: number;
  logoSrc?: string | null;
  /** Token público da página. Usado para buscar as fotos sem CORS. */
  token?: string;
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const Y_LIMIT = 280;

const SECAO_TITULO: Record<RelatorioImpressaoSecao, string> = {
  evolucao: 'Evolução',
  bio: 'Bioimpedância',
  exames: 'Exames',
  financeiro: 'Financeiro',
};

const TIPO_IMAGEM_LABEL: Record<TipoExameImagem, string> = {
  usg: 'Ultrassonografia (USG)',
  tomografia: 'Tomografia (TC)',
  ressonancia: 'Ressonância magnética (RM)',
  raio_x: 'Raio-X',
  densitometria: 'Densitometria óssea',
  medicina_nuclear: 'Medicina nuclear / PET-CT',
  endoscopia: 'Endoscopia',
  outro: 'Outro exame de imagem',
  desconhecido: 'Não identificado',
};

type Rgb = [number, number, number];

function hexToRgb(hex: string | undefined, fallback: Rgb): Rgb {
  const raw = (hex || '').trim().replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-fA-F]{6}/.test(full)) return fallback;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const t = (v as { toDate?: () => Date })?.toDate?.();
  if (t && !Number.isNaN(t.getTime())) return t;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtDateBr(v: unknown): string {
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m && (v.length === 10 || v.includes('T00:00:00'))) {
      return `${m[3]}/${m[2]}/${m[1]}`;
    }
  }
  const d = toDate(v);
  if (!d) return '-';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtNum(n: number, digits = 1): string {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtMoney(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function idadeAnos(data: unknown): number | null {
  const d = toDate(data);
  if (!d) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  const mes = hoje.getMonth() - d.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < d.getDate())) idade--;
  return idade > 0 ? idade : null;
}

function sexoLabel(s?: string): string {
  if (!s) return '-';
  if (s === 'M') return 'Masculino';
  if (s === 'F') return 'Feminino';
  return s;
}

function statusTratamentoLabel(s?: string): string {
  if (s === 'em_tratamento') return 'Em tratamento';
  if (s === 'concluido') return 'Concluído';
  if (s === 'abandono') return 'Abandono';
  return 'Pendente';
}

function slugNome(nome: string): string {
  return (
    nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'paciente'
  );
}

function resumoProtocolos(paciente: PacienteCompleto) {
  return listarProtocolosTirzepatida(paciente).map((proto) => {
    const d = buildDepoimentoResultadoFromPaciente(paciente, 0, '', {
      protocoloIndice: proto.indice,
    });
    return {
      indice: proto.indice,
      ativo: proto.ativo,
      perdaKg: d.perdaTotalKg,
      perdaCm: d.perdaAbdominalCm,
      totalMg: totalMgRealizadoProtocolo(paciente, proto),
    };
  });
}

function iniciaisNome(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Igual ao CSS brightness(0) invert(1) da página: a marca fica branca.
 * O fundo da logo é a mesma cor do cabeçalho, para o PDF não pintar um retângulo branco.
 */
function rasterizarLogoBranca(dataUrl: string, bg: Rgb): Promise<LoadedJsPdfImage | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) return resolve(null);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, width, height);
      const frame = ctx.getImageData(0, 0, width, height);
      const px = frame.data;
      for (let i = 0; i < px.length; i += 4) {
        const alpha = px[i + 3] / 255;
        px[i] = Math.round(255 * alpha + bg[0] * (1 - alpha));
        px[i + 1] = Math.round(255 * alpha + bg[1] * (1 - alpha));
        px[i + 2] = Math.round(255 * alpha + bg[2] * (1 - alpha));
        px[i + 3] = 255;
      }
      ctx.putImageData(frame, 0, 0);
      resolve({ dataUrl: canvas.toDataURL('image/png'), format: 'PNG', width, height });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function fillRgb(ctx: CanvasRenderingContext2D, rgb: Rgb) {
  ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/** Foto circular com anel, fundo opaco na cor do cabeçalho ou da página. */
function rasterizarFotoCircular(
  dataUrl: string,
  options: { backdrop: Rgb; ring: Rgb; border: Rgb }
): Promise<LoadedJsPdfImage | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 360;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      fillRgb(ctx, options.backdrop);
      ctx.fillRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 - 2, 0, Math.PI * 2);
      fillRgb(ctx, options.ring);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 - 14, 0, Math.PI * 2);
      fillRgb(ctx, options.border);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 - 20, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const iw = img.naturalWidth || img.width || 1;
      const ih = img.naturalHeight || img.height || 1;
      const scale = Math.max(size / iw, size / ih);
      const w = iw * scale;
      const h = ih * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      ctx.restore();
      resolve({ dataUrl: canvas.toDataURL('image/png'), format: 'PNG', width: size, height: size });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function carregarFotosDoToken(token: string | undefined): Promise<{
  medico: string | null;
  paciente: string | null;
}> {
  if (!token || typeof window === 'undefined') return { medico: null, paciente: null };
  try {
    const res = await fetch(`/api/relatorio-paciente/${encodeURIComponent(token)}/fotos`);
    if (!res.ok) return { medico: null, paciente: null };
    const body = (await res.json()) as { medicoFotoDataUrl?: unknown; pacienteFotoDataUrl?: unknown };
    return {
      medico: typeof body.medicoFotoDataUrl === 'string' ? body.medicoFotoDataUrl : null,
      paciente: typeof body.pacienteFotoDataUrl === 'string' ? body.pacienteFotoDataUrl : null,
    };
  } catch {
    return { medico: null, paciente: null };
  }
}

function niceAxisStep(span: number, ticks: number): number {
  const rough = Math.max(span, 1) / Math.max(ticks, 1);
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const err = rough / pow;
  const nice = err <= 1.5 ? 1 : err <= 3 ? 2 : err <= 7 ? 5 : 10;
  return nice * pow;
}

function rotulosSemana(semanas: number[]): Set<number> {
  const unicas = [...new Set(semanas)].sort((a, b) => a - b);
  if (unicas.length <= 12) return new Set(unicas);
  const step = unicas.length > 24 ? 4 : 2;
  const primeira = unicas[0];
  const ultima = unicas[unicas.length - 1];
  const escolhidos = new Set<number>([primeira, ultima]);
  for (const semana of unicas) {
    if ((semana - primeira) % step === 0) escolhidos.add(semana);
  }
  const ordenados = [...escolhidos].sort((a, b) => a - b);
  if (ordenados.length >= 2 && ultima - ordenados[ordenados.length - 2] < step / 2) {
    escolhidos.delete(ordenados[ordenados.length - 2]);
  }
  return escolhidos;
}

function fitBox(img: LoadedJsPdfImage, maxW: number, maxH: number): { w: number; h: number } {
  const ratio = img.width > 0 ? img.height / img.width : 1;
  let w = maxW;
  let h = w * ratio;
  if (h > maxH) {
    h = maxH;
    w = ratio > 0 ? h / ratio : maxW;
  }
  return { w, h };
}

class RelatorioImpressaoDoc {
  readonly doc: jsPDF;
  readonly fileName: string;
  private y = 0;
  private readonly bg: Rgb;
  private readonly text: Rgb;
  private readonly accent: Rgb;
  private readonly tituloMedico: string;
  private readonly medicoNome: string;
  private readonly secaoTitulo: string;

  constructor(
    private readonly input: RelatorioImpressaoInput,
    private readonly logo: LoadedJsPdfImage | null,
    private readonly medicoFoto: LoadedJsPdfImage | null,
    private readonly pacienteFoto: LoadedJsPdfImage | null
  ) {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const medico = input.medico;
    this.bg = hexToRgb(medico?.pageBg || DEFAULT_DR_PAGE_BACKGROUND, [10, 31, 68]);
    this.text = hexToRgb(medico?.pageText || DEFAULT_DR_PAGE_TEXT, [232, 237, 237]);
    this.accent = hexToRgb(medico?.primaryColor || DEFAULT_WHITE_LABEL_PRIMARY_COLOR, [47, 143, 163]);
    this.tituloMedico = medico?.genero === 'F' ? 'Dra.' : 'Dr.';
    this.medicoNome = medico?.nome || 'Médico';
    this.secaoTitulo = SECAO_TITULO[input.secao];
    const nome = (input.paciente.dadosIdentificacao?.nomeCompleto || input.paciente.nome || 'paciente').trim();
    this.fileName = `relatorio-${input.secao}-${slugNome(nome)}.pdf`;
    this.doc.setProperties({
      title: `Relatório Médico - ${this.secaoTitulo}`,
      subject: nome,
      creator: 'Oftware',
    });
  }

  render(): void {
    this.drawFirstHeader();
    this.drawPaciente();
    if (this.input.secao === 'evolucao') this.drawEvolucao();
    else if (this.input.secao === 'bio') this.drawBio();
    else if (this.input.secao === 'exames') this.drawExames();
    else this.drawFinanceiro();
    this.drawFooters();
  }

  private setFill(rgb: Rgb) {
    this.doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  }
  private setDraw(rgb: Rgb) {
    this.doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  }
  private setColor(rgb: Rgb) {
    this.doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  }

  private fit(text: string, maxW: number): string {
    const s = (text || '-').replace(/\s+/g, ' ').trim() || '-';
    if (this.doc.getTextWidth(s) <= maxW) return s;
    let t = s;
    while (t.length > 1 && this.doc.getTextWidth(`${t}...`) > maxW) t = t.slice(0, -1);
    return `${t}...`;
  }

  private addImg(img: LoadedJsPdfImage | null, x: number, y: number, w: number, h: number) {
    if (!img) return;
    try {
      this.doc.addImage(img.dataUrl, img.format, x, y, w, h);
    } catch {
      /* imagem indisponível para o PDF */
    }
  }

  private ensure(h: number) {
    if (this.y + h > Y_LIMIT) this.newPage();
  }

  private newPage() {
    this.doc.addPage();
    this.y = this.drawContinuation();
  }

  private drawContinuation(): number {
    this.setFill(this.bg);
    this.doc.rect(0, 0, PAGE_W, 12, 'F');
    this.setFill(this.accent);
    this.doc.rect(0, 12, PAGE_W, 1, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.setColor(this.text);
    const nome = this.fit(`${this.tituloMedico} ${this.medicoNome}`, CONTENT_W - 40);
    this.doc.text(nome, MARGIN, 8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.text(this.secaoTitulo, PAGE_W - MARGIN, 8, { align: 'right' });
    return 18;
  }

  private drawRoundPhoto(
    img: LoadedJsPdfImage | null,
    x: number,
    y: number,
    size: number,
    fallback: () => void
  ) {
    if (!img) {
      fallback();
      return;
    }
    this.addImg(img, x, y, size, size);
  }

  private drawFirstHeader() {
    const photoBox = 32;
    const logoGap = 4;
    let logoBox: { w: number; h: number } | null = null;
    if (this.logo) {
      logoBox = fitBox(this.logo, 46, 11);
    }
    const headerH = 6 + photoBox + 5;
    this.setFill(this.bg);
    this.doc.rect(0, 0, PAGE_W, headerH, 'F');
    this.setFill(this.accent);
    this.doc.rect(0, headerH, PAGE_W, 1.4, 'F');

    const photoX = MARGIN;
    const photoY = 6;
    if (this.logo && logoBox) {
      const logoX = PAGE_W - MARGIN - logoBox.w;
      const logoY = photoY + (photoBox - logoBox.h) / 2;
      this.addImg(this.logo, logoX, logoY, logoBox.w, logoBox.h);
    }

    this.drawRoundPhoto(this.medicoFoto, photoX, photoY, photoBox, () => {
      this.setFill(this.accent);
      this.doc.circle(photoX + photoBox / 2, photoY + photoBox / 2, photoBox / 2, 'F');
      this.doc.setDrawColor(255, 255, 255);
      this.doc.setLineWidth(0.6);
      this.doc.circle(photoX + photoBox / 2, photoY + photoBox / 2, photoBox / 2 - 0.6, 'S');
      this.doc.setLineWidth(0.2);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(12);
      this.doc.setTextColor(10, 31, 68);
      this.doc.text('Dr', photoX + photoBox / 2, photoY + photoBox / 2 + 1.6, { align: 'center' });
    });

    const textX = photoX + photoBox + 5;
    const logoReserve = logoBox ? logoBox.w + logoGap : 0;
    const textMax = PAGE_W - MARGIN - textX - logoReserve;
    const textTop = photoY + 8;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    this.setColor(this.text);
    const nome = this.fit(`${this.tituloMedico} ${this.medicoNome}`, Math.max(40, textMax));
    this.doc.text(nome, textX, textTop);

    this.setFill(this.accent);
    this.doc.roundedRect(textX, textTop + 3, 22, 5.2, 2.4, 2.4, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(10, 31, 68);
    this.doc.text('MÉDICO', textX + 11, textTop + 6.6, { align: 'center' });

    const crm =
      this.input.medico?.crm?.estado && this.input.medico?.crm?.numero
        ? `CRM-${this.input.medico.crm.estado} ${this.input.medico.crm.numero}`
        : 'Médico responsável';
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.setColor(this.text);
    this.doc.text(this.fit(crm, Math.max(40, textMax)), textX, textTop + 13);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.setFill(this.accent);
    this.doc.setTextColor(10, 31, 68);
    const tituloRelatorio = this.fit(`Relatório Médico · ${this.secaoTitulo}`, Math.max(36, textMax - 6));
    const tituloW = Math.min(textMax, this.doc.getTextWidth(tituloRelatorio) + 6);
    const tituloY = textTop + 16.5;
    this.doc.roundedRect(textX, tituloY, tituloW, 5.4, 1.4, 1.4, 'F');
    this.doc.text(tituloRelatorio, textX + 3, tituloY + 3.8);

    this.y = headerH + 4;
  }

  private h2(text: string) {
    this.ensure(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(text, MARGIN, this.y + 5);
    this.setDraw(this.accent);
    this.doc.setLineWidth(0.7);
    const w = Math.min(CONTENT_W, this.doc.getTextWidth(text));
    this.doc.line(MARGIN, this.y + 7.2, MARGIN + w, this.y + 7.2);
    this.doc.setLineWidth(0.2);
    this.y += 12;
  }

  private h3(text: string) {
    this.ensure(8);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text(text, MARGIN, this.y + 4);
    this.y += 7;
  }

  private paragraph(text: string) {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(71, 85, 105);
    const lines = this.doc.splitTextToSize(text, CONTENT_W);
    const h = Math.max(1, lines.length) * 4.2;
    this.ensure(h + 1);
    this.doc.text(lines, MARGIN, this.y + 3.5);
    this.y += h + 2;
  }

  private pairs(items: Array<[string, string]>) {
    const gap = 6;
    const colW = (CONTENT_W - gap) / 2;
    for (let i = 0; i < items.length; i += 2) {
      const left = items[i];
      const right = items[i + 1];
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);
      const leftLines = this.doc.splitTextToSize(left[1] || '-', colW);
      const rightLines = right ? this.doc.splitTextToSize(right[1] || '-', colW) : [];
      const n = Math.max(leftLines.length, rightLines.length, 1);
      const h = 4 + n * 4.2;
      this.ensure(h + 1);
      const paint = (x: number, pair: [string, string], lines: string[]) => {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(7);
        this.doc.setTextColor(100, 116, 139);
        this.doc.text(pair[0], x, this.y + 3);
        this.doc.setFontSize(9);
        this.doc.setTextColor(30, 41, 59);
        this.doc.text(lines, x, this.y + 7.2);
      };
      paint(MARGIN, left, leftLines);
      if (right) paint(MARGIN + colW + gap, right, rightLines);
      this.y += h + 1.2;
    }
  }

  private pairsInline(items: Array<[string, string]>) {
    const gap = 6;
    const colW = (CONTENT_W - gap) / 2;
    const rowH = 5.2;
    for (let i = 0; i < items.length; i += 2) {
      const left = items[i];
      const right = items[i + 1];
      this.ensure(rowH);
      const paint = (x: number, pair: [string, string]) => {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(7);
        this.doc.setTextColor(100, 116, 139);
        this.doc.text(pair[0], x, this.y + 3.4);
        const labelW = this.doc.getTextWidth(pair[0]) + 1.8;
        this.doc.setFontSize(8);
        this.doc.setTextColor(30, 41, 59);
        this.doc.text(this.fit(pair[1] || '-', Math.max(10, colW - labelW)), x + labelW, this.y + 3.4);
      };
      paint(MARGIN, left);
      if (right) paint(MARGIN + colW + gap, right);
      this.y += rowH;
    }
  }

  private table(headers: string[], rows: string[][], widths: number[]) {
    if (rows.length === 0) return;
    const headH = 7;
    const rowH = 6.2;
    const paintHead = () => {
      this.doc.setFillColor(241, 245, 249);
      this.doc.rect(MARGIN, this.y, CONTENT_W, headH, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(71, 85, 105);
      let x = MARGIN;
      headers.forEach((header, i) => {
        this.doc.text(this.fit(header, widths[i] - 2.4), x + 1.2, this.y + 4.6);
        x += widths[i];
      });
      this.y += headH;
    };
    if (this.y + headH + rowH > Y_LIMIT) this.newPage();
    paintHead();
    rows.forEach((row, ri) => {
      if (this.y + rowH > Y_LIMIT) {
        this.newPage();
        paintHead();
      }
      if (ri % 2 === 0) {
        this.doc.setFillColor(248, 250, 252);
        this.doc.rect(MARGIN, this.y, CONTENT_W, rowH, 'F');
      }
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(30, 41, 59);
      let x = MARGIN;
      row.forEach((cell, i) => {
        this.doc.text(this.fit(cell || '-', widths[i] - 2.4), x + 1.2, this.y + 4.2);
        x += widths[i];
      });
      this.y += rowH;
    });
    this.y += 3;
  }

  private drawPaciente() {
    const p = this.input.paciente;
    const nome = (p.dadosIdentificacao?.nomeCompleto || p.nome || 'Paciente').trim() || 'Paciente';
    const idade = idadeAnos(p.dadosIdentificacao?.dataNascimento);
    const status = statusTratamentoLabel(p.statusTratamento);
    const photoBox = 18;
    this.ensure(photoBox + 2);
    const photoTop = this.y;
    this.drawRoundPhoto(this.pacienteFoto, MARGIN, photoTop, photoBox, () => {
      this.doc.setFillColor(209, 250, 229);
      this.doc.circle(MARGIN + photoBox / 2, photoTop + photoBox / 2, photoBox / 2, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(9);
      this.doc.setTextColor(6, 95, 70);
      this.doc.text(iniciaisNome(nome), MARGIN + photoBox / 2, photoTop + photoBox / 2 + 1.3, {
        align: 'center',
      });
    });
    const textX = MARGIN + photoBox + 4;
    const textW = CONTENT_W - photoBox - 4;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(13);
    this.doc.setTextColor(15, 23, 42);
    const nomeLines = this.doc.splitTextToSize(nome, textW);
    this.doc.text(nomeLines, textX, photoTop + 6);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(71, 85, 105);
    const idadeTxt = idade != null ? `${idade} ${idade === 1 ? 'ano' : 'anos'}` : 'Idade não informada';
    const idadeY = photoTop + 6 + nomeLines.length * 5.2 + 1.5;
    this.doc.text(`${idadeTxt}  ·  ${status}`, textX, idadeY);
    this.y = Math.max(photoTop + photoBox, idadeY + 1) + 1.2;

    this.pairsInline([
      ['E-mail', (p.dadosIdentificacao?.email || p.email || '').trim() || '-'],
      ['Telefone', (p.dadosIdentificacao?.telefone || '').trim() || '-'],
      ['CPF', (p.dadosIdentificacao?.cpf || '').trim() || '-'],
      ['Nascimento', fmtDateBr(p.dadosIdentificacao?.dataNascimento)],
      ['Sexo', sexoLabel(p.dadosIdentificacao?.sexoBiologico)],
      [
        'Cidade / UF',
        [p.dadosIdentificacao?.endereco?.cidade, p.dadosIdentificacao?.endereco?.estado]
          .map((s) => (s || '').trim())
          .filter(Boolean)
          .join(' / ') || '-',
      ],
    ]);

    const protocolos = resumoProtocolos(p);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(15, 23, 42);
    this.doc.text('Tratamento', MARGIN, this.y + 3.2);
    this.y += 4.6;
    if (protocolos.length === 0) {
      this.paragraph('Sem protocolo cadastrado.');
      return;
    }
    this.table(
      ['Protocolo', 'Perda (kg)', 'Perda (cm)', 'Dose (mg)'],
      protocolos.map((t) => [
        `Protocolo ${t.indice}${t.ativo ? ' (atual)' : ''}`,
        t.perdaKg != null ? fmtNum(t.perdaKg) : '-',
        t.perdaCm != null ? fmtNum(t.perdaCm) : '-',
        t.totalMg > 0 ? fmtNum(t.totalMg) : '-',
      ]),
      [70, 38, 38, 36]
    );
  }

  private drawEvolucao() {
    const p = this.input.paciente;
    const proto = protocoloPorIndice(p, this.input.protocoloIndice);
    const d = buildDepoimentoResultadoFromPaciente(p, 0, '', {
      protocoloIndice: proto.indice,
    });
    const pontos = d.evolucao.filter((item) => item.isConclusao !== true).map((item) => ({
      semana: item.weekIndex,
      peso: item.peso != null && item.peso > 0 ? item.peso : null,
      doseMg: item.doseMg > 0 ? item.doseMg : 0,
      foiAplicado: item.foiAplicado === true && item.doseMg > 0,
    }));
    const registrados = pontos.filter((item) => item.peso != null || item.foiAplicado);
    const primeira = registrados[0]?.semana ?? null;
    const ultima = registrados.length ? registrados[registrados.length - 1].semana : null;

    const alturaCm = p.dadosClinicos?.medidasIniciais?.altura;
    const alturaM = alturaCm != null && Number(alturaCm) > 0 ? Number(alturaCm) / 100 : null;
    const imcDe = (peso: number | null) => (peso != null && alturaM ? peso / (alturaM * alturaM) : null);
    const imcInicialMedida = p.dadosClinicos?.medidasIniciais?.imc;
    const imcInicial =
      imcInicialMedida != null && imcInicialMedida > 0 ? imcInicialMedida : imcDe(d.pesoInicialKg);
    const imcFinal = imcDe(d.pesoAtualKg);
    const deltaTxt = (atual: number | null, inicial: number | null, unit: string) => {
      if (atual == null || inicial == null) return '-';
      const diff = atual - inicial;
      const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
      return `${sign}${fmtNum(Math.abs(diff))} ${unit}`;
    };
    const metaTxt = (n: number | null | undefined, unit: string) =>
      n != null && n > 0 ? `-${fmtNum(n)} ${unit}` : '-';
    const perdaTxt = (n: number | null) => {
      if (n == null) return '-';
      const sign = n > 0 ? '-' : n < 0 ? '+' : '';
      return `${sign}${fmtNum(Math.abs(n))}%`;
    };

    const temGrafico = primeira != null && ultima != null;
    const bloco = temGrafico ? 158 : 22;
    if (this.y + bloco > Y_LIMIT) this.newPage();

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(13);
    this.doc.setTextColor(10, 31, 68);
    this.doc.text('Evolução do tratamento', MARGIN, this.y + 4);
    this.setDraw(this.accent);
    this.doc.setLineWidth(0.8);
    this.doc.line(MARGIN, this.y + 5.8, MARGIN + 58, this.y + 5.8);
    this.doc.setLineWidth(0.2);
    this.y += 8;

    if (!temGrafico || primeira == null || ultima == null) {
      this.paragraph('Sem evolução registrada neste protocolo.');
      return;
    }

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(100, 116, 139);
    const subtitulo = `Protocolo ${proto.indice} · ${registrados.length} registros disponíveis entre S${primeira} e S${ultima}`;
    const subLinhas = this.doc.splitTextToSize(subtitulo, CONTENT_W);
    this.doc.text(subLinhas, MARGIN, this.y + 3);
    this.y += subLinhas.length * 3.8 + 1.5;

    const serie = pontos.filter((item) => item.semana >= 1 && item.semana <= ultima);
    const totalDose = serie.reduce((soma, item) => soma + (item.foiAplicado ? item.doseMg : 0), 0);
    this.drawEvolucaoGrafico(serie);
    this.drawDoseCapsule(totalDose);

    const peso = (n: number | null) => (n != null ? `${fmtNum(n)} kg` : '-');
    const circ = (n: number | null) => (n != null ? `${fmtNum(n)} cm` : '-');
    this.drawEvolucaoCartoes([
      {
        label: 'Peso inicial',
        value: peso(d.pesoInicialKg),
        sideLabel: 'Meta',
        sideValue: metaTxt(d.metaPesoKgLoss, 'kg'),
        icon: 'peso',
      },
      {
        label: 'Peso final',
        value: peso(d.pesoAtualKg),
        sideLabel: 'Diferença',
        sideValue: deltaTxt(d.pesoAtualKg, d.pesoInicialKg, 'kg'),
        icon: 'peso',
      },
      {
        label: 'Circunferência inicial',
        value: circ(d.comprimentoAbdominalInicialCm),
        sideLabel: 'Meta',
        sideValue: metaTxt(d.metaAbdominalCmLoss, 'cm'),
        icon: 'circ',
      },
      {
        label: 'Circunferência final',
        value: circ(d.comprimentoAbdominalAtualCm),
        sideLabel: 'Diferença',
        sideValue: deltaTxt(d.comprimentoAbdominalAtualCm, d.comprimentoAbdominalInicialCm, 'cm'),
        icon: 'circ',
      },
      { label: 'IMC inicial', value: imcInicial != null ? fmtNum(imcInicial) : '-', icon: 'imc' },
      { label: 'IMC final', value: imcFinal != null ? fmtNum(imcFinal) : '-', icon: 'imc' },
      { label: 'Perda percentual de peso', value: perdaTxt(d.perdaPercentual), icon: 'pct' },
      { label: 'Perda percentual de circunferência', value: perdaTxt(d.perdaPercentualAbdominal), icon: 'pct' },
    ]);
  }

  private drawEvolucaoGrafico(
    serie: Array<{ semana: number; peso: number | null; doseMg: number; foiAplicado: boolean }>
  ) {
    const cardH = 58;
    const top = this.y;
    this.doc.setFillColor(255, 255, 255);
    this.doc.setDrawColor(186, 210, 224);
    this.doc.setLineWidth(0.35);
    this.doc.roundedRect(MARGIN, top, CONTENT_W, cardH, 2.2, 2.2, 'FD');
    this.doc.setLineWidth(0.2);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(10, 31, 68);
    this.doc.text('PESO E DOSE POR SEMANA', MARGIN + 4, top + 6);

    const legY = top + 11;
    this.doc.setDrawColor(16, 185, 129);
    this.doc.setLineWidth(0.7);
    this.doc.line(MARGIN + 4, legY, MARGIN + 11, legY);
    this.setFill([16, 185, 129]);
    this.doc.circle(MARGIN + 7.5, legY, 0.7, 'F');
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text('Peso (kg)', MARGIN + 13, legY + 1);
    this.doc.setFillColor(252, 231, 243);
    this.doc.setDrawColor(236, 72, 153);
    this.doc.setLineWidth(0.25);
    this.doc.roundedRect(MARGIN + 36, legY - 1.6, 3.2, 3.2, 0.4, 0.4, 'FD');
    this.doc.setTextColor(71, 85, 105);
    this.doc.text('Dose (mg)', MARGIN + 41, legY + 1);
    this.doc.setLineWidth(0.2);

    const plotLeft = MARGIN + 14;
    const plotRight = MARGIN + CONTENT_W - 14;
    const plotTop = top + 16;
    const plotBottom = top + cardH - 8;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;
    const n = Math.max(serie.length, 1);
    const slot = plotW / n;

    const pesos = serie.map((item) => item.peso).filter((v): v is number => v != null);
    let pesoMin = pesos.length ? Math.min(...pesos) : 0;
    let pesoMax = pesos.length ? Math.max(...pesos) : 1;
    if (pesoMax - pesoMin < 1) {
      pesoMin -= 1;
      pesoMax += 1;
    } else {
      const folga = (pesoMax - pesoMin) * 0.12;
      pesoMin -= folga;
      pesoMax += folga;
    }
    const pesoStep = niceAxisStep(pesoMax - pesoMin, 4);
    pesoMin = Math.floor(pesoMin / pesoStep) * pesoStep;
    pesoMax = Math.ceil(pesoMax / pesoStep) * pesoStep;
    if (pesoMax <= pesoMin) pesoMax = pesoMin + pesoStep;

    const doseMaxDado = serie.reduce((m, item) => (item.foiAplicado ? Math.max(m, item.doseMg) : m), 0);
    const doseMax = doseMaxDado > 0 ? Math.min(30, doseMaxDado * 2) : 15;
    const doseTicks = [0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30].filter((v) => v <= doseMax + 0.01);

    const yPeso = (v: number) => plotBottom - ((v - pesoMin) / (pesoMax - pesoMin)) * plotH;
    const yDose = (v: number) => plotBottom - (v / doseMax) * plotH;

    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.15);
    for (let v = pesoMin; v <= pesoMax + pesoStep * 0.01; v += pesoStep) {
      const y = yPeso(v);
      this.doc.line(plotLeft, y, plotRight, y);
    }
    this.doc.setLineWidth(0.2);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(100, 116, 139);
    this.doc.text('kg', plotLeft - 1.5, plotTop - 1.2, { align: 'right' });
    for (let v = pesoMin; v <= pesoMax + pesoStep * 0.01; v += pesoStep) {
      this.doc.text(fmtNum(v, pesoStep < 1 ? 1 : 0), plotLeft - 1.4, yPeso(v) + 1, { align: 'right' });
    }
    this.doc.setTextColor(219, 39, 119);
    this.doc.text('mg', plotRight + 1.5, plotTop - 1.2);
    doseTicks.forEach((v) => {
      this.doc.text(fmtNum(v, v % 1 === 0 ? 0 : 1), plotRight + 1.4, yDose(v) + 1);
    });

    const barW = Math.min(3.4, slot * 0.5);
    serie.forEach((item, index) => {
      if (!item.foiAplicado || item.doseMg <= 0) return;
      const cx = plotLeft + (index + 0.5) * slot;
      const y = yDose(item.doseMg);
      const h = Math.max(0, plotBottom - y);
      if (h < 0.3) return;
      this.doc.setFillColor(252, 231, 243);
      this.doc.setDrawColor(236, 72, 153);
      this.doc.setLineWidth(0.25);
      const radius = Math.min(0.6, h / 2, barW / 2);
      this.doc.roundedRect(cx - barW / 2, y, barW, h, radius, radius, 'FD');
    });
    this.doc.setLineWidth(0.2);

    const pts = serie
      .map((item, index) =>
        item.peso == null
          ? null
          : { x: plotLeft + (index + 0.5) * slot, y: yPeso(item.peso), peso: item.peso }
      )
      .filter((pt): pt is { x: number; y: number; peso: number } => pt != null);
    if (pts.length >= 2) {
      this.doc.setDrawColor(16, 185, 129);
      this.doc.setLineWidth(0.7);
      for (let i = 0; i < pts.length - 1; i++) this.doc.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
      this.doc.setLineWidth(0.2);
    }
    this.setFill([16, 185, 129]);
    pts.forEach((pt) => this.doc.circle(pt.x, pt.y, 0.75, 'F'));
    if (pts.length > 0) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(6, 95, 70);
      const primeiro = pts[0];
      const ultimo = pts[pts.length - 1];
      this.doc.text(fmtNum(primeiro.peso), primeiro.x + 1.2, Math.max(plotTop + 2.4, primeiro.y - 1.6));
      if (pts.length > 1) {
        this.doc.text(fmtNum(ultimo.peso), ultimo.x - 1.2, Math.max(plotTop + 2.4, ultimo.y - 1.6), {
          align: 'right',
        });
      }
    }

    const rotulos = rotulosSemana(serie.map((item) => item.semana));
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.5);
    serie.forEach((item, index) => {
      if (!rotulos.has(item.semana)) return;
      const cx = plotLeft + (index + 0.5) * slot;
      const semRegistro = item.peso == null && !item.foiAplicado;
      this.doc.setTextColor(semRegistro ? 156 : 100, semRegistro ? 163 : 116, semRegistro ? 175 : 139);
      this.doc.text(`S${item.semana}`, cx, plotBottom + 4, { align: 'center' });
    });

    this.y = top + cardH + 2;
  }

  private drawDoseCapsule(totalDose: number) {
    if (!(totalDose > 0)) return;
    const texto = `${fmtNum(totalDose)} mg registrados`;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    const largura = Math.max(40, this.doc.getTextWidth(texto) + 10);
    const altura = 6.5;
    const x = (PAGE_W - largura) / 2;
    this.doc.setFillColor(236, 72, 153);
    this.doc.roundedRect(x, this.y, largura, altura, altura / 2, altura / 2, 'F');
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(texto, PAGE_W / 2, this.y + 4.3, { align: 'center' });
    this.y += altura + 2.5;
  }

  private drawEvolucaoCartoes(
    cartoes: Array<{
      label: string;
      value: string;
      sideLabel?: string;
      sideValue?: string;
      icon: 'peso' | 'circ' | 'imc' | 'pct';
    }>
  ) {
    const gapX = 5;
    const gapY = 2.4;
    const cardW = (CONTENT_W - gapX) / 2;
    const cardH = 16;
    cartoes.forEach((card, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = MARGIN + col * (cardW + gapX);
      const y = this.y + row * (cardH + gapY);
      this.doc.setFillColor(255, 255, 255);
      this.doc.setDrawColor(219, 228, 236);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
      this.doc.setLineWidth(0.2);
      this.drawIconeMetrica(x + 6.2, y + cardH / 2, card.icon);

      const textX = x + 11;
      const textW = cardW - 14;
      if (card.sideLabel && card.sideValue) {
        const colW = (textW - 3) / 2;
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(6.5);
        this.doc.setTextColor(100, 116, 139);
        this.doc.text(this.fit(card.label, colW), textX, y + 6);
        this.doc.text(this.fit(card.sideLabel, colW), textX + colW + 3, y + 6);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(9);
        this.doc.setTextColor(10, 31, 68);
        this.doc.text(this.fit(card.value, colW), textX, y + 11.5);
        this.doc.text(this.fit(card.sideValue, colW), textX + colW + 3, y + 11.5);
        this.doc.setDrawColor(226, 232, 240);
        this.doc.line(textX + colW + 1.2, y + 4.5, textX + colW + 1.2, y + cardH - 4.5);
      } else {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(6.5);
        this.doc.setTextColor(100, 116, 139);
        this.doc.text(this.fit(card.label, textW), textX, y + 7);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(10);
        this.doc.setTextColor(10, 31, 68);
        this.doc.text(this.fit(card.value, textW), textX, y + 12.2);
      }
    });
    const rows = Math.ceil(cartoes.length / 2);
    this.y += rows * cardH + (rows - 1) * gapY;
  }

  private drawIconeMetrica(cx: number, cy: number, kind: 'peso' | 'circ' | 'imc' | 'pct') {
    this.doc.setFillColor(10, 31, 68);
    this.doc.circle(cx, cy, 3.1, 'F');
    this.doc.setDrawColor(255, 255, 255);
    this.doc.setLineWidth(0.35);
    if (kind === 'peso') {
      this.doc.line(cx - 1.8, cy - 0.2, cx + 1.8, cy - 0.2);
      this.doc.line(cx, cy - 0.2, cx, cy + 1.3);
      this.doc.line(cx - 1.1, cy + 1.3, cx + 1.1, cy + 1.3);
      this.doc.line(cx - 1.8, cy - 0.2, cx - 2.2, cy + 0.8);
      this.doc.line(cx + 1.8, cy - 0.2, cx + 2.2, cy + 0.8);
    } else if (kind === 'circ') {
      this.doc.circle(cx, cy, 1.45, 'S');
    } else if (kind === 'imc') {
      this.doc.line(cx - 1.7, cy + 1.1, cx - 0.3, cy - 0.8);
      this.doc.line(cx - 0.3, cy - 0.8, cx + 0.5, cy + 0.3);
      this.doc.line(cx + 0.5, cy + 0.3, cx + 1.8, cy - 1.2);
    } else {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text('%', cx, cy + 1.15, { align: 'center' });
    }
    this.doc.setLineWidth(0.2);
  }

  private drawBio() {
    const registros =
      (this.input.paciente as PacienteCompleto & { bioimpedanciaRegistros?: BioImpedanciaRegistro[] })
        .bioimpedanciaRegistros || [];
    const sexo = this.input.paciente.dadosIdentificacao?.sexoBiologico;
    const model = montarBioPdfModel(registros, sexo);

    if (!model.ultimo) {
      this.ensure(16);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(13);
      this.doc.setTextColor(10, 31, 68);
      this.doc.text('Composição corporal e evolução', MARGIN, this.y + 4);
      this.y += 8;
      this.paragraph('Sem bioimpedância registrada.');
      return;
    }

    if (this.y + 28 > Y_LIMIT) this.newPage();
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(13);
    this.doc.setTextColor(10, 31, 68);
    this.doc.text('Composição corporal e evolução', MARGIN, this.y + 4);
    this.setDraw(this.accent);
    this.doc.setLineWidth(0.8);
    this.doc.line(MARGIN, this.y + 5.8, MARGIN + 72, this.y + 5.8);
    this.doc.setLineWidth(0.2);
    this.y += 8;

    const partes = [`Último exame em ${fmtDateBr(model.dataUltimo)}`];
    if (model.origem) partes.push(model.origem);
    partes.push(
      `${model.quantidade} ${model.quantidade === 1 ? 'avaliação considerada' : 'avaliações consideradas'}`
    );
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(100, 116, 139);
    const sub = this.doc.splitTextToSize(partes.join(' · '), CONTENT_W);
    this.doc.text(sub, MARGIN, this.y + 3);
    this.y += sub.length * 3.8 + 2;

    this.drawBioAtuais(model.atuais);
    this.drawBioEscalas(model.escalas);
    this.drawBioHistorico(model.historico, model.exames.map((exame) => exame.dataRegistro));
    this.drawBioSegmentar(model.segmentar);
  }

  private drawBioAtuais(atuais: Array<{ label: string; texto: string }>) {
    if (atuais.length === 0) return;
    const h = 16;
    this.ensure(h + 2);
    const top = this.y;
    this.doc.setFillColor(255, 255, 255);
    this.doc.setDrawColor(186, 210, 224);
    this.doc.setLineWidth(0.35);
    this.doc.roundedRect(MARGIN, top, CONTENT_W, h, 2, 2, 'FD');
    this.doc.setLineWidth(0.2);
    const colW = CONTENT_W / atuais.length;
    atuais.forEach((item, index) => {
      const x = MARGIN + index * colW;
      if (index > 0) {
        this.doc.setDrawColor(226, 232, 240);
        this.doc.line(x, top + 3, x, top + h - 3);
      }
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(this.fit(item.label, colW - 4), x + 2.4, top + 5.4);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(10);
      this.doc.setTextColor(10, 31, 68);
      this.doc.text(this.fit(item.texto, colW - 4), x + 2.4, top + 11.2);
    });
    this.y = top + h + 3;
  }

  private drawBioEscalas(
    escalas: Array<{
      label: string;
      valorTexto: string;
      classificacao: 'Abaixo' | 'Normal' | 'Acima';
      minTexto: string;
      maxTexto: string;
      marcadorPct: number;
    }>
  ) {
    if (escalas.length === 0) return;
    escalas.forEach((escala) => {
      const h = 13.2;
      this.ensure(h);
      const top = this.y;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8);
      this.doc.setTextColor(10, 31, 68);
      this.doc.text(this.fit(escala.label, 70), MARGIN, top + 3.4);
      this.doc.setFontSize(8);
      const statusCor: Rgb =
        escala.classificacao === 'Normal'
          ? [22, 101, 52]
          : escala.classificacao === 'Abaixo'
            ? [29, 78, 216]
            : [185, 28, 28];
      this.doc.setFont('helvetica', 'bold');
      this.setColor(statusCor);
      const statusW = this.doc.getTextWidth(escala.classificacao);
      this.doc.text(escala.classificacao, MARGIN + CONTENT_W, top + 3.4, { align: 'right' });
      this.doc.setTextColor(10, 31, 68);
      this.doc.text(escala.valorTexto, MARGIN + CONTENT_W - statusW - 3, top + 3.4, { align: 'right' });

      const barX = MARGIN;
      const barY = top + 5;
      const barW = CONTENT_W;
      const barH = 3.6;
      const zonas: Array<{ w: number; fill: Rgb; label: string }> = [
        { w: 0.3, fill: [191, 219, 254], label: 'Abaixo' },
        { w: 0.3, fill: [167, 243, 208], label: 'Referência' },
        { w: 0.4, fill: [254, 205, 211], label: 'Acima' },
      ];
      let zx = barX;
      zonas.forEach((zona, index) => {
        const zw = barW * zona.w;
        this.doc.setFillColor(...zona.fill);
        if (index === 0) this.doc.roundedRect(zx, barY, zw + 0.4, barH, 0.8, 0.8, 'F');
        else if (index === zonas.length - 1) this.doc.roundedRect(zx - 0.4, barY, zw + 0.4, barH, 0.8, 0.8, 'F');
        else this.doc.rect(zx, barY, zw, barH, 'F');
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(5.5);
        this.doc.setTextColor(30, 41, 59);
        this.doc.text(zona.label, zx + zw / 2, barY + 2.45, { align: 'center' });
        zx += zw;
      });
      const markerX = barX + (Math.max(0, Math.min(100, escala.marcadorPct)) / 100) * barW;
      this.doc.setDrawColor(10, 31, 68);
      this.doc.setLineWidth(0.45);
      this.doc.line(markerX, barY - 0.6, markerX, barY + barH + 0.6);
      this.doc.setFillColor(10, 31, 68);
      this.doc.circle(markerX, barY + barH / 2, 0.7, 'F');
      this.doc.setLineWidth(0.2);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(`< ${escala.minTexto}`, barX, top + 12);
      this.doc.text(`${escala.minTexto}–${escala.maxTexto}`, barX + barW / 2, top + 12, { align: 'center' });
      this.doc.text(`> ${escala.maxTexto}`, barX + barW, top + 12, { align: 'right' });
      this.y = top + h;
    });
    this.y += 1.5;
  }

  private drawBioHistorico(linhas: BioHistoricoLinha[], datas: unknown[]) {
    if (linhas.length === 0) return;
    const labelW = 36;
    const minCol = 16;
    const maxCols = Math.max(1, Math.floor((CONTENT_W - labelW) / minCol));
    const total = linhas[0]?.valores.length ?? 0;
    const blocos = Math.max(1, Math.ceil(total / maxCols));
    for (let bloco = 0; bloco < blocos; bloco++) {
      const inicio = bloco * maxCols;
      const fim = Math.min(total, inicio + maxCols);
      const n = Math.max(1, fim - inicio);
      const colW = (CONTENT_W - labelW) / n;
      if (blocos > 1) {
        this.ensure(8);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(7.5);
        this.doc.setTextColor(100, 116, 139);
        this.doc.text(
          `Avaliações ${inicio + 1} a ${fim} de ${total}, da mais antiga para a mais recente.`,
          MARGIN,
          this.y + 3.2
        );
        this.y += 5;
      }
      this.drawBioHistoricoBloco(linhas, datas, inicio, fim, labelW, colW, 7, 11.4);
    }
  }

  private drawBioHistoricoBloco(
    linhas: BioHistoricoLinha[],
    datas: unknown[],
    inicio: number,
    fim: number,
    labelW: number,
    colW: number,
    headH: number,
    rowH: number
  ) {
    const n = fim - inicio;
    const paintHead = () => {
      this.doc.setFillColor(241, 245, 249);
      this.doc.rect(MARGIN, this.y, CONTENT_W, headH, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(71, 85, 105);
      this.doc.text('Indicador', MARGIN + 1.2, this.y + 4.4);
      for (let i = 0; i < n; i++) {
        const bruto = fmtDateBr(datas[inicio + i]);
        const curta = bruto.length >= 10 ? `${bruto.slice(0, 6)}${bruto.slice(8)}` : bruto;
        const x = MARGIN + labelW + i * colW;
        const ultimo = inicio + i === datas.length - 1;
        if (ultimo) this.doc.setTextColor(10, 31, 68);
        this.doc.text(this.fit(curta, colW - 1.2), x + colW / 2, this.y + 4.4, { align: 'center' });
        this.doc.setTextColor(71, 85, 105);
      }
      this.y += headH;
    };
    if (this.y + headH + rowH > Y_LIMIT) this.newPage();
    paintHead();
    linhas.forEach((linha, ri) => {
      if (this.y + rowH > Y_LIMIT) {
        this.newPage();
        paintHead();
      }
      if (ri % 2 === 0) {
        this.doc.setFillColor(248, 250, 252);
        this.doc.rect(MARGIN, this.y, CONTENT_W, rowH, 'F');
      }
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(71, 85, 105);
      const nome = linha.unidade ? `${linha.label} (${linha.unidade})` : linha.label;
      const nomeLinhas = this.doc.splitTextToSize(nome, labelW - 2);
      this.doc.text(nomeLinhas.slice(0, 2), MARGIN + 1.2, this.y + 3.8);
      const plotTop = this.y + 7.4;
      const plotH = 2.6;
      const presentes = linha.valores
        .slice(inicio, fim)
        .filter((v): v is number => v != null);
      const min = presentes.length ? Math.min(...presentes) : 0;
      const max = presentes.length ? Math.max(...presentes) : 1;
      const span = max - min || 1;
      const pontos: Array<{ x: number; y: number } | null> = [];
      for (let i = 0; i < n; i++) {
        const valor = linha.valores[inicio + i];
        const cx = MARGIN + labelW + i * colW + colW / 2;
        const ultimo = inicio + i === datas.length - 1;
        this.doc.setFont('helvetica', ultimo ? 'bold' : 'normal');
        this.doc.setFontSize(7);
        this.doc.setTextColor(ultimo ? 10 : 30, ultimo ? 31 : 41, ultimo ? 68 : 59);
        this.doc.text(this.fit(linha.textos[inicio + i] || '-', colW - 1), cx, this.y + 3.8, { align: 'center' });
        if (valor == null) pontos.push(null);
        else pontos.push({ x: cx, y: plotTop + plotH - ((valor - min) / span) * plotH });
      }
      this.doc.setDrawColor(16, 185, 129);
      this.doc.setLineWidth(0.35);
      for (let i = 0; i < pontos.length - 1; i++) {
        const a = pontos[i];
        const b = pontos[i + 1];
        if (!a || !b) continue;
        this.doc.line(a.x, a.y, b.x, b.y);
      }
      this.doc.setFillColor(16, 185, 129);
      pontos.forEach((p) => {
        if (p) this.doc.circle(p.x, p.y, 0.45, 'F');
      });
      this.doc.setLineWidth(0.2);
      this.y += rowH;
    });
    this.y += 3;
  }

  private drawBioSegmentar(
    linhas: Array<{
      segmento: string;
      massaMagra: string;
      percentualMagra: string;
      gordura: string;
      percentualGordura: string;
    }>
  ) {
    if (linhas.length === 0) return;
    const colunas: Array<{ key: keyof (typeof linhas)[number]; header: string; w: number }> = [
      { key: 'segmento', header: 'Segmento', w: 40 },
    ];
    const tem = (key: 'massaMagra' | 'percentualMagra' | 'gordura' | 'percentualGordura') =>
      linhas.some((linha) => linha[key] !== '-');
    if (tem('massaMagra')) colunas.push({ key: 'massaMagra', header: 'Massa magra', w: 0 });
    if (tem('percentualMagra')) colunas.push({ key: 'percentualMagra', header: '% magra', w: 0 });
    if (tem('gordura')) colunas.push({ key: 'gordura', header: 'Gordura', w: 0 });
    if (tem('percentualGordura')) colunas.push({ key: 'percentualGordura', header: '% gordura', w: 0 });
    const restantes = colunas.filter((c) => c.key !== 'segmento');
    const sobra = CONTENT_W - 40;
    const cada = restantes.length ? sobra / restantes.length : sobra;
    restantes.forEach((c) => {
      c.w = cada;
    });
    this.ensure(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(10, 31, 68);
    this.doc.text('Análise segmentar atual', MARGIN, this.y + 4);
    this.y += 6;
    this.table(
      colunas.map((c) => c.header),
      linhas.map((linha) => colunas.map((c) => linha[c.key])),
      colunas.map((c) => c.w)
    );
  }

  private drawExames() {
    const p = this.input.paciente;
    const model = montarLabPdfModel(p);
    if (model.grupos.length === 0) {
      this.linhaSeCouber('Sem exames laboratoriais registrados.');
    } else {
      this.drawExamesLaboratoriais(model.grupos, model.coletas.map((coleta) => coleta.data));
    }

    const imagens = (p.examesDeImagem || []).slice().sort((a, b) => {
      const da = a.dataExame || a.criadoEm || '';
      const db = b.dataExame || b.criadoEm || '';
      return String(da).localeCompare(String(db));
    });
    const solicitacoes = (this.input.solicitacoesExames || [])
      .slice()
      .sort((a, b) => (toDate(b.criadoEm)?.getTime() || 0) - (toDate(a.criadoEm)?.getTime() || 0));
    const prescricoes = (this.input.prescricoes || [])
      .slice()
      .sort((a, b) => (toDate(b.criadoEm)?.getTime() || 0) - (toDate(a.criadoEm)?.getTime() || 0));

    if (imagens.length === 0 && solicitacoes.length === 0 && prescricoes.length === 0) {
      this.linhaSeCouber('Sem exames de imagem, solicitações ou prescrições.');
      return;
    }

    if (imagens.length > 0) {
      this.h3('Imagem');
      this.table(
        ['Data', 'Tipo', 'Arquivo', 'Região'],
        imagens.map((ex) => [
          fmtDateBr(ex.dataExame || ex.criadoEm),
          TIPO_IMAGEM_LABEL[ex.tipoExame] || ex.tipoExame || '-',
          ex.nomeArquivo || '-',
          (ex.resumoEquipamentoOuRegiao || '').trim() || '-',
        ]),
        [28, 52, 52, 50]
      );
    }

    if (solicitacoes.length > 0) {
      this.h3('Histórico de solicitações');
      solicitacoes.forEach((s, idx) => {
        this.h3(`Solicitação ${idx + 1} · ${fmtDateBr(s.criadoEm)}`);
        this.paragraph((s.exames || []).filter(Boolean).join(', ') || 'Sem exames listados.');
        if ((s.hipoteseDiagnostica || '').trim()) {
          this.paragraph(`Hipótese diagnóstica: ${s.hipoteseDiagnostica.trim()}`);
        }
      });
    }

    if (prescricoes.length === 0) return;
    this.h3('Histórico de prescrições');
    prescricoes.forEach((presc, idx) => {
      const tipo = presc.tipoDocumento === 'recibo_medico' ? 'Recibo' : 'Prescrição';
      const itens = (presc.itens || [])
        .map((item) => {
          const partes = [item.medicamento, item.dosagem, item.frequencia].map((s) => (s || '').trim()).filter(Boolean);
          return partes.join(' · ');
        })
        .filter(Boolean);
      const corpo = itens.length > 0 ? itens.join('; ') : '';
      if (!corpo) return;
      this.h3(`${tipo} ${idx + 1} · ${presc.nome || 'Sem nome'} · ${fmtDateBr(presc.criadoEm)}`);
      this.paragraph(corpo);
    });
  }

  private linhaSeCouber(texto: string) {
    if (this.y + 5 > Y_LIMIT) return;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 116, 139);
    this.doc.text(texto, MARGIN, this.y + 3.4);
    this.y += 5;
  }

  private drawExamesLaboratoriais(grupos: LabGrupo[], datas: unknown[]) {
    if (this.y + 24 > Y_LIMIT) this.newPage();
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(13);
    this.doc.setTextColor(10, 31, 68);
    this.doc.text('Resultados por marcador', MARGIN, this.y + 4);
    this.setDraw(this.accent);
    this.doc.setLineWidth(0.8);
    this.doc.line(MARGIN, this.y + 5.8, MARGIN + 58, this.y + 5.8);
    this.doc.setLineWidth(0.2);
    this.y += 8;

    const primeira = fmtDateBr(datas[0]);
    const ultima = fmtDateBr(datas[datas.length - 1]);
    const intervalo = datas.length <= 1 || primeira === ultima ? primeira : `${primeira} a ${ultima}`;
    const subtitulo = `${datas.length} ${datas.length === 1 ? 'coleta' : 'coletas'} · ${intervalo}`;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(100, 116, 139);
    this.doc.text(subtitulo, MARGIN, this.y + 3);
    this.y += 6;

    const labelW = 46;
    const refW = 34;
    const sitW = 28;
    const minCol = 18;
    const maxCols = Math.max(1, Math.floor((CONTENT_W - labelW - refW - sitW) / minCol));
    const blocos = Math.max(1, Math.ceil(datas.length / maxCols));
    for (let bloco = 0; bloco < blocos; bloco++) {
      const inicio = bloco * maxCols;
      const fim = Math.min(datas.length, inicio + maxCols);
      if (blocos > 1) {
        if (this.y + 5 > Y_LIMIT) this.newPage();
        this.linhaSeCouber(
          `Coletas ${inicio + 1} a ${fim} de ${datas.length}, da mais antiga para a mais recente.`
        );
      }
      this.drawExamesBloco(grupos, datas, inicio, fim, labelW, refW, sitW);
    }
  }

  private drawExamesBloco(
    grupos: LabGrupo[],
    datas: unknown[],
    inicio: number,
    fim: number,
    labelW: number,
    refW: number,
    sitW: number
  ) {
    const n = Math.max(1, fim - inicio);
    const colW = (CONTENT_W - labelW - refW - sitW) / n;
    const headH = 7;
    const grupoH = 5.4;
    const rowH = 6.2;
    const ultimaGlobal = datas.length - 1;
    const paintHead = () => {
      this.doc.setFillColor(10, 31, 68);
      this.doc.rect(MARGIN, this.y, CONTENT_W, headH, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text('Marcador', MARGIN + 1.4, this.y + 4.5);
      for (let i = 0; i < n; i++) {
        const idx = inicio + i;
        const x = MARGIN + labelW + i * colW;
        if (idx === ultimaGlobal) {
          this.doc.setFillColor(16, 185, 129);
          this.doc.rect(x, this.y, colW, headH, 'F');
        }
        this.doc.setTextColor(255, 255, 255);
        this.doc.text(this.fit(fmtDateBr(datas[idx]), colW - 1.4), x + colW / 2, this.y + 4.5, { align: 'center' });
      }
      const refX = MARGIN + labelW + n * colW;
      this.doc.text('Referência', refX + 1.2, this.y + 4.5);
      this.doc.text('Situação', refX + refW + sitW - 1.2, this.y + 4.5, { align: 'right' });
      this.y += headH;
    };
    const paintGrupo = (nome: string) => {
      this.doc.setFillColor(220, 252, 231);
      this.doc.rect(MARGIN, this.y, CONTENT_W, grupoH, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(6, 78, 59);
      this.doc.text(nome, MARGIN + 1.4, this.y + 3.6);
      this.y += grupoH;
    };
    if (this.y + headH + grupoH + rowH > Y_LIMIT) this.newPage();
    paintHead();
    grupos.forEach((grupo) => {
      if (this.y + grupoH + rowH > Y_LIMIT) {
        this.newPage();
        paintHead();
      }
      paintGrupo(grupo.nome);
      grupo.marcadores.forEach((marcador, ri) => {
        if (this.y + rowH > Y_LIMIT) {
          this.newPage();
          paintHead();
          paintGrupo(grupo.nome);
        }
        this.drawExameLinha(marcador, inicio, fim, ri, labelW, colW, refW, sitW, rowH, ultimaGlobal, datas);
      });
    });
    this.y += 2;
  }

  private drawExameLinha(
    marcador: LabMarcador,
    inicio: number,
    fim: number,
    ri: number,
    labelW: number,
    colW: number,
    refW: number,
    sitW: number,
    rowH: number,
    ultimaGlobal: number,
    datas: unknown[]
  ) {
    const n = fim - inicio;
    if (ri % 2 === 1) {
      this.doc.setFillColor(248, 250, 252);
      this.doc.rect(MARGIN, this.y, CONTENT_W, rowH, 'F');
    }
    const verdeX = MARGIN + labelW + (ultimaGlobal - inicio) * colW;
    if (ultimaGlobal >= inicio && ultimaGlobal < fim) {
      this.doc.setFillColor(236, 253, 245);
      this.doc.rect(verdeX, this.y, colW, rowH, 'F');
    }
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(15, 23, 42);
    const nome = marcador.unidade ? `${marcador.nome} (${marcador.unidade})` : marcador.nome;
    this.doc.text(this.fit(nome, labelW - 2), MARGIN + 1.4, this.y + 4);
    for (let i = 0; i < n; i++) {
      const idx = inicio + i;
      const texto = marcador.celulas[idx]?.texto || LAB_AUSENTE;
      const x = MARGIN + labelW + i * colW + colW / 2;
      const ultimo = idx === ultimaGlobal && texto !== LAB_AUSENTE;
      this.doc.setFont('helvetica', ultimo ? 'bold' : 'normal');
      this.doc.setTextColor(texto === LAB_AUSENTE ? 148 : 15, texto === LAB_AUSENTE ? 163 : 23, texto === LAB_AUSENTE ? 184 : 42);
      this.doc.text(this.fit(texto, colW - 1.2), x, this.y + 4, { align: 'center' });
    }
    const refX = MARGIN + labelW + n * colW;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(71, 85, 105);
    this.doc.text(this.fit(marcador.referencia || LAB_AUSENTE, refW - 2), refX + 1.2, this.y + 4);
    const situacao = this.textoSituacao(marcador, inicio, fim, datas);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.5);
    this.setColor(this.corSituacao(marcador.situacao));
    this.doc.text(this.fit(situacao, sitW - 1.6), refX + refW + sitW - 1.2, this.y + 4, { align: 'right' });
    this.y += rowH;
  }

  private textoSituacao(marcador: LabMarcador, inicio: number, fim: number, datas: unknown[]): string {
    if (marcador.situacao === 'Não classificado' || marcador.indiceMedicao == null) return 'Não classificado';
    const visivelComoUltima =
      marcador.indiceMedicao === datas.length - 1 && marcador.indiceMedicao >= inicio && marcador.indiceMedicao < fim;
    if (visivelComoUltima) return marcador.situacao;
    return `${marcador.situacao} · ${fmtDateBr(datas[marcador.indiceMedicao])}`;
  }

  private corSituacao(situacao: SituacaoLab): Rgb {
    if (situacao === 'Dentro') return [22, 101, 52];
    if (situacao === 'Abaixo') return [29, 78, 216];
    if (situacao === 'Acima') return [185, 28, 28];
    return [100, 116, 139];
  }

  private drawFinanceiro() {
    const pagamento = this.input.pagamento;
    const parcelas = (pagamento?.parcelas || []) as ParcelaPagamento[];
    if (!pagamento || (parcelas.length === 0 && !(Number(pagamento.valorTotal) > 0))) {
      this.linhaSeCouber('Sem lançamentos financeiros.');
      return;
    }

    const emissao = new Date();
    const dataFallback =
      toDatePagamento(pagamento.dataVenda) || toDatePagamento(pagamento.dataUltimaAtualizacao) || emissao;
    const model = montarFinanceiroPdfModel(parcelas, dataFallback, emissao);
    const total = parcelas.length ? model.total : Number(pagamento.valorTotal);
    const pago = parcelas.length ? model.pago : Number(pagamento.valorPago);
    const pendente = parcelas.length ? model.pendente : Number(pagamento.valorPendente);

    if (this.y + 36 > Y_LIMIT) this.newPage();
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(13);
    this.doc.setTextColor(10, 31, 68);
    this.doc.text('Resumo das vendas', MARGIN, this.y + 4);
    this.setDraw(this.accent);
    this.doc.setLineWidth(0.8);
    this.doc.line(MARGIN, this.y + 5.8, MARGIN + 46, this.y + 5.8);
    this.doc.setLineWidth(0.2);
    this.y += 8;

    const hora = emissao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const subtitulo = `${model.quantidadeVendas} ${model.quantidadeVendas === 1 ? 'venda' : 'vendas'} · ${model.quantidadeParcelas} ${model.quantidadeParcelas === 1 ? 'parcela' : 'parcelas'} · Emitido em ${fmtDateBr(emissao)} às ${hora}`;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(100, 116, 139);
    const linhasSub = this.doc.splitTextToSize(subtitulo, CONTENT_W);
    this.doc.text(linhasSub, MARGIN, this.y + 3);
    this.y += linhasSub.length * 3.6 + 2;

    this.drawFinanceiroCartoes(total, pago, pendente);
    if (model.vendas.length) this.drawFinanceiroVendas(model.vendas);
    if (model.parcelas.length) this.drawFinanceiroParcelas(model.parcelas);

    const obs = (pagamento.observacoes || '').trim();
    if (obs) {
      this.h3('Observações');
      this.paragraph(obs);
    }
  }

  private drawFinanceiroCartoes(total: number, pago: number, pendente: number) {
    const itens = [
      { label: 'Total das vendas', valor: total, cor: [10, 31, 68] as Rgb },
      { label: 'Pago informado', valor: pago, cor: [22, 101, 52] as Rgb },
      { label: 'Pendente informado', valor: pendente, cor: [15, 23, 42] as Rgb },
    ];
    const h = 16;
    this.ensure(h + 3);
    const top = this.y;
    const colW = (CONTENT_W - 4) / 3;
    itens.forEach((item, index) => {
      const x = MARGIN + index * (colW + 2);
      this.doc.setFillColor(255, 255, 255);
      this.doc.setDrawColor(186, 210, 224);
      this.doc.setLineWidth(0.35);
      this.doc.roundedRect(x, top, colW, h, 1.8, 1.8, 'FD');
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(item.label, x + 2.4, top + 5.2);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(10);
      this.setColor(item.cor);
      this.doc.text(this.fit(fmtMoney(Number.isFinite(item.valor) ? item.valor : 0), colW - 4), x + 2.4, top + 11.2);
    });
    this.doc.setLineWidth(0.2);
    this.y = top + h + 4;
  }

  private drawFinanceiroVendas(vendas: VendaPdf[]) {
    const headers = ['Venda', 'Data', 'Total', 'Pago', 'Pendente'];
    const widths = [46, 28, 36, 36, 36];
    const headH = 7;
    const rowH = 6.4;
    const paintHead = () => {
      this.doc.setFillColor(10, 31, 68);
      this.doc.rect(MARGIN, this.y, CONTENT_W, headH, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(255, 255, 255);
      let x = MARGIN;
      headers.forEach((header, i) => {
        const align = i >= 2 ? 'right' : 'left';
        const tx = align === 'right' ? x + widths[i] - 1.4 : x + 1.4;
        this.doc.text(header, tx, this.y + 4.5, { align });
        x += widths[i];
      });
      this.y += headH;
    };
    if (this.y + headH + rowH > Y_LIMIT) this.newPage();
    paintHead();
    vendas.forEach((venda, ri) => {
      if (this.y + rowH > Y_LIMIT) {
        this.newPage();
        paintHead();
      }
      if (ri % 2 === 1) {
        this.doc.setFillColor(248, 250, 252);
        this.doc.rect(MARGIN, this.y, CONTENT_W, rowH, 'F');
      }
      const celulas = [
        venda.label,
        fmtDateBr(venda.data),
        fmtMoney(venda.total),
        fmtMoney(venda.pago),
        fmtMoney(venda.pendente),
      ];
      let x = MARGIN;
      celulas.forEach((texto, i) => {
        const align = i >= 2 ? 'right' : 'left';
        const tx = align === 'right' ? x + widths[i] - 1.4 : x + 1.4;
        this.doc.setFont('helvetica', i === 3 ? 'bold' : 'normal');
        this.doc.setFontSize(7.5);
        if (i === 3) this.doc.setTextColor(22, 101, 52);
        else this.doc.setTextColor(15, 23, 42);
        this.doc.text(this.fit(texto, widths[i] - 2.4), tx, this.y + 4.2, { align });
        x += widths[i];
      });
      this.y += rowH;
    });
    this.y += 4;
  }

  private drawFinanceiroParcelas(parcelas: ParcelaPdf[]) {
    const headers = ['Venda', 'Parc.', 'Valor', 'Vencimento', 'Pagamento', 'Status', 'Forma'];
    const widths = [32, 14, 26, 24, 36, 24, 26];
    const headH = 7;
    const paintHead = () => {
      this.doc.setFillColor(10, 31, 68);
      this.doc.rect(MARGIN, this.y, CONTENT_W, headH, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(255, 255, 255);
      let x = MARGIN;
      headers.forEach((header, i) => {
        this.doc.text(header, x + 1.2, this.y + 4.5);
        x += widths[i];
      });
      this.y += headH;
    };
    if (this.y + headH + 8 > Y_LIMIT) this.newPage();
    paintHead();
    parcelas.forEach((parcela, ri) => {
      const rowH = parcela.dataAConferir ? 9.2 : 6.4;
      if (this.y + rowH > Y_LIMIT) {
        this.newPage();
        paintHead();
      }
      const atencao = parcela.destaque === 'pendente' || parcela.destaque === 'atrasada' || parcela.destaque === 'atencao';
      if (atencao) {
        this.doc.setFillColor(255, 247, 237);
        this.doc.rect(MARGIN, this.y, CONTENT_W, rowH, 'F');
      } else if (ri % 2 === 1) {
        this.doc.setFillColor(248, 250, 252);
        this.doc.rect(MARGIN, this.y, CONTENT_W, rowH, 'F');
      }
      const pagamento = parcela.pagamento ? fmtDateBr(parcela.pagamento) : FIN_AUSENTE;
      const celulas = [
        parcela.venda,
        parcela.numero,
        parcela.valor == null ? FIN_AUSENTE : fmtMoney(parcela.valor),
        fmtDateBr(parcela.vencimento),
        pagamento,
        parcela.status,
        parcela.forma,
      ];
      let x = MARGIN;
      celulas.forEach((texto, i) => {
        this.doc.setFont('helvetica', i === 5 ? 'bold' : 'normal');
        this.doc.setFontSize(6.5);
        if (i === 5 && parcela.status === 'Paga') this.doc.setTextColor(22, 101, 52);
        else if (i === 5 && parcela.status === 'Atrasada') this.doc.setTextColor(185, 28, 28);
        else if (i === 5 && parcela.status !== FIN_AUSENTE && parcela.destaque !== 'pago') this.doc.setTextColor(180, 83, 9);
        else this.doc.setTextColor(15, 23, 42);
        this.doc.text(this.fit(texto || FIN_AUSENTE, widths[i] - 2), x + 1.2, this.y + 4);
        x += widths[i];
      });
      if (parcela.dataAConferir) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(6);
        this.doc.setTextColor(180, 83, 9);
        const xPag = MARGIN + widths[0] + widths[1] + widths[2] + widths[3];
        this.doc.text('Data a conferir', xPag + 1.2, this.y + 7.4);
      }
      this.y += rowH;
    });
    this.y += 3;
  }

  private drawFooters() {
    const total = this.doc.getNumberOfPages();
    const gerado = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(`Gerado em ${gerado}`, MARGIN, PAGE_H - 8);
      this.doc.text(`Página ${i} de ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
    }
  }
}

export async function buildRelatorioImpressaoPdf(
  input: RelatorioImpressaoInput
): Promise<{ doc: jsPDF; fileName: string }> {
  const [logoBruta, fotos] = await Promise.all([
    input.logoSrc ? loadImageForJsPdf(input.logoSrc).catch(() => null) : Promise.resolve(null),
    carregarFotosDoToken(input.token),
  ]);
  const headerBg = hexToRgb(input.medico?.pageBg || DEFAULT_DR_PAGE_BACKGROUND, [10, 31, 68]);
  const accent = hexToRgb(input.medico?.primaryColor || DEFAULT_WHITE_LABEL_PRIMARY_COLOR, [47, 143, 163]);
  const branco: Rgb = [255, 255, 255];
  const [logo, medicoFoto, pacienteFoto] = await Promise.all([
    logoBruta ? rasterizarLogoBranca(logoBruta.dataUrl, headerBg) : Promise.resolve(null),
    fotos.medico
      ? rasterizarFotoCircular(fotos.medico, { backdrop: headerBg, ring: accent, border: branco })
      : Promise.resolve(null),
    fotos.paciente
      ? rasterizarFotoCircular(fotos.paciente, { backdrop: branco, ring: [203, 213, 225], border: branco })
      : Promise.resolve(null),
  ]);
  const pdf = new RelatorioImpressaoDoc(input, logo, medicoFoto, pacienteFoto);
  pdf.render();
  return { doc: pdf.doc, fileName: pdf.fileName };
}

export async function downloadRelatorioImpressaoPdf(input: RelatorioImpressaoInput): Promise<void> {
  const { doc, fileName } = await buildRelatorioImpressaoPdf(input);
  doc.save(fileName);
}
