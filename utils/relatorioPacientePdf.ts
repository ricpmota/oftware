/**
 * Gera o PDF do relatório de um paciente (para anexar ao e-mail de conclusão).
 * Usado ao clicar em "Confirmar Conclusão" no modal de conclusão do tratamento.
 */
import jsPDF from 'jspdf';
import type { Sex } from '@/types/labRanges';
import { getLabRange, isInRange } from '@/utils/labRangesFromJson';
import type { PacienteCompleto } from '@/types/obesidade';
import { LISTA_EXAMES, EXAME_KEY_TO_LAB, GROUP_ORDER } from '@/utils/relatorioPacienteConstants';

export interface MedicoPerfilRelatorio {
  nome?: string;
  genero?: string;
  crm?: { estado?: string; numero?: string };
  telefone?: string;
  cidades?: Array<{ cidade?: string; estado?: string }>;
  localizacao?: { endereco?: string };
}

function getStatusLabel(s: string): string {
  switch (s) {
    case 'em_tratamento': return 'Em tratamento';
    case 'concluido': return 'Concluído';
    case 'abandono': return 'Abandono';
    default: return 'Pendente';
  }
}
function getSexoLabel(s?: string): string {
  if (!s) return '-';
  if (s === 'M') return 'Masculino';
  if (s === 'F') return 'Feminino';
  return s;
}
function formatDataNasc(data: unknown): string {
  if (!data) return '-';
  try {
    const d = data && typeof (data as { toDate?: () => Date }).toDate === 'function'
      ? (data as { toDate: () => Date }).toDate()
      : new Date(data as Date | string);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '-';
  }
}
function calcPerdaPesoEMg(p: PacienteCompleto): { perdaPesoTotal: number | null; totalMg: number } {
  const medidasIniciais = p.dadosClinicos?.medidasIniciais;
  const evolucao = p.evolucaoSeguimento || [];
  const primeiroRegistro = evolucao.find(e => e.weekIndex === 1);
  const baselineWeight = primeiroRegistro?.peso || medidasIniciais?.peso || 0;
  let ultimoPeso: number | null = null;
  if (evolucao.length > 0) {
    const ordenada = [...evolucao].sort((a, b) => {
      const dataA = a.dataRegistro instanceof Date ? a.dataRegistro.getTime() : new Date(a.dataRegistro).getTime();
      const dataB = b.dataRegistro instanceof Date ? b.dataRegistro.getTime() : new Date(b.dataRegistro).getTime();
      return dataB - dataA;
    });
    const ultimoComPeso = ordenada.find(s => s.peso && s.peso > 0);
    ultimoPeso = ultimoComPeso?.peso ?? null;
  }
  const perdaPesoTotal = ultimoPeso != null && baselineWeight > 0 ? baselineWeight - ultimoPeso : null;
  const totalMg = (p.evolucaoSeguimento || []).reduce((sum, r) => sum + (r.doseAplicada?.quantidade || 0), 0);
  return { perdaPesoTotal, totalMg };
}

type ExameItem = { label: string; value: string; unit: string; inRange: boolean | null };

export async function generateRelatorioPacientePdfBase64(
  paciente: PacienteCompleto,
  medicoPerfil: MedicoPerfilRelatorio | null
): Promise<string | null> {
  try {
    let logoDataUrl: string | null = null;
    if (typeof fetch !== 'undefined' && typeof FileReader !== 'undefined') {
      try {
        const res = await fetch('/logo.png');
        if (res.ok) {
          const blob = await res.blob();
          logoDataUrl = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = reject;
            r.readAsDataURL(blob);
          });
        }
      } catch (_) {}
    } else if (typeof process !== 'undefined' && process.versions?.node) {
      try {
        const fs = require('fs');
        const path = require('path');
        const logoPath = path.join(process.cwd(), 'public', 'logo.png');
        if (fs.existsSync(logoPath)) {
          const buf = fs.readFileSync(logoPath);
          logoDataUrl = 'data:image/png;base64,' + buf.toString('base64');
        }
      } catch (_) {}
    }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const margin = 12;
    const gap = 6;
    const contentW = pageW - margin * 2;
    const colW = (contentW - gap) / 2;
    const lineH = 4;
    const labelW = 28;
    const valueW = colW - labelW - 3;
    const fontTitle = 11;
    const fontNorm = 8;
    const fontLabel = 7;
    const tituloMedico = medicoPerfil?.genero === 'F' ? 'Dra.' : 'Dr.';
    const medicoNome = medicoPerfil?.nome || 'Médico';
    const crm = medicoPerfil?.crm ? `CRM-${medicoPerfil.crm.estado} ${medicoPerfil.crm.numero}` : '';
    const medicoTelefone = medicoPerfil?.telefone || '';
    const primeiraCidade = medicoPerfil?.cidades?.[0] ? `${medicoPerfil.cidades[0].cidade} - ${medicoPerfil.cidades[0].estado}` : '';
    const medicoEndereco = medicoPerfil?.localizacao?.endereco || '';

    const drawHeader = () => {
      doc.setFillColor(241, 245, 249);
      doc.rect(0, 0, pageW, 24, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.line(0, 24, pageW, 24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontTitle);
      doc.setTextColor(15, 23, 42);
      doc.text(`${tituloMedico} ${medicoNome}`, margin, 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(
        [crm, medicoTelefone ? `Tel: ${medicoTelefone}` : '', primeiraCidade || medicoEndereco].filter(Boolean).join('  •  '),
        margin, 16
      );
      if (logoDataUrl) {
        const logoWidth = 20;
        const logoHeight = 20;
        doc.addImage(logoDataUrl, 'PNG', pageW - logoWidth - 10, (24 - logoHeight) / 2, logoWidth, logoHeight);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(16, 185, 129);
        doc.text('OFTWARE', pageW - margin - 20, 12);
      }
    };

    const getIMCBadge = (imc: number) => {
      if (imc < 18.5) return { label: 'Baixo', r: 59, g: 130, b: 246 };
      if (imc < 25) return { label: 'Saudável', r: 34, g: 197, b: 94 };
      if (imc < 30) return { label: 'Alto', r: 234, g: 179, b: 8 };
      return { label: 'Obeso', r: 239, g: 68, b: 68 };
    };

    const drawMiniChart = (x: number, y: number, w: number, h: number, values: number[], title: string): number => {
      if (values.length < 2) return y + h + 4;
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(title, x, y + 2);
      if (title === 'IMC' && values.length > 0) {
        const badge = getIMCBadge(values[values.length - 1]);
        doc.setFontSize(5);
        doc.setFillColor(badge.r, badge.g, badge.b);
        doc.rect(x + doc.getTextWidth(title) + 2, y - 0.5, doc.getTextWidth(badge.label) + 3, 3.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(badge.label, x + doc.getTextWidth(title) + 3.5, y + 2);
        doc.setTextColor(100, 116, 139);
      }
      y += 8;
      const chartH = h - 10;
      const minV = Math.min(...values);
      const maxV = Math.max(...values);
      const range = maxV - minV || 1;
      const pts: [number, number][] = values.map((v, i) => [
        x + (i / (values.length - 1)) * w,
        y + chartH - ((v - minV) / range) * chartH
      ]);
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.4);
      for (let i = 0; i < pts.length - 1; i++) doc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      doc.setLineWidth(0.2);
      doc.setFontSize(5);
      doc.setTextColor(30, 41, 59);
      values.forEach((v, i) => doc.text(v.toFixed(1), pts[i][0], pts[i][1] - 1.2));
      return y + chartH + 3;
    };

    const examesSet = new Set(LISTA_EXAMES.map(e => e.key));
    const buildExamesPorGrupo = (p: PacienteCompleto): Record<string, ExameItem[]> | null => {
      const exames = p.examesLaboratoriais || [];
      const ordenados = exames.slice().sort((a, b) => {
        const da = a.dataColeta instanceof Date ? a.dataColeta.getTime() : new Date(a.dataColeta).getTime();
        const db = b.dataColeta instanceof Date ? b.dataColeta.getTime() : new Date(b.dataColeta).getTime();
        return da - db;
      });
      if (ordenados.length === 0) return null;
      const ultimoExame = ordenados[ordenados.length - 1];
      const pacienteSex = (p.dadosIdentificacao?.sexoBiologico ?? undefined) as Sex | undefined;
      const dataNasc = p.dadosIdentificacao?.dataNascimento;
      const examesPorGrupo: Record<string, ExameItem[]> = {};
      examesSet.forEach((key) => {
        const def = LISTA_EXAMES.find(e => e.key === key);
        if (!def) return;
        let val = '-';
        let numVal: number | null = null;
        let unit = '';
        let inRange: boolean | null = null;
        if (key === 'hemogramaCompleto') {
          const h = (ultimoExame as Record<string, unknown>).hemogramaCompleto as { hemoglobina?: number; hematocrito?: number; leucocitos?: number; plaquetas?: number } | undefined;
          if (h) {
            const partes = [h.hemoglobina != null && `Hb ${h.hemoglobina}`, h.hematocrito != null && `Ht ${h.hematocrito}`, h.leucocitos != null && `Leuc ${h.leucocitos}`, h.plaquetas != null && `Plaq ${h.plaquetas}`].filter(Boolean) as string[];
            if (partes.length > 0) val = partes.join(' | ');
          }
        } else {
          const v = (ultimoExame as Record<string, unknown>)[key];
          if (v != null && typeof v === 'number' && !isNaN(v)) {
            numVal = v;
            val = String(v);
            const labKey = EXAME_KEY_TO_LAB[key];
            if (labKey) {
              const range = getLabRange(labKey, pacienteSex ?? null, dataNasc);
              unit = range?.unit ?? '';
              inRange = isInRange(numVal, range);
            }
          }
        }
        if (!val || val === '-' || val === 'NaN') return;
        const group = def.group || 'Outros';
        if (!examesPorGrupo[group]) examesPorGrupo[group] = [];
        examesPorGrupo[group].push({ label: def.label, value: val, unit, inRange });
      });
      return Object.keys(examesPorGrupo).length > 0 ? examesPorGrupo : null;
    };

    const drawExamsBlock = (x: number, startY: number): number => {
      const examesPorGrupo = buildExamesPorGrupo(paciente);
      if (!examesPorGrupo) return startY;
      const grupos = Object.keys(examesPorGrupo);
      const gruposOrdenados = GROUP_ORDER.filter(g => grupos.includes(g)).concat(grupos.filter(g => !GROUP_ORDER.includes(g)));
      const labelWGroup = 26;
      const colInnerW = colW * 0.48;
      let y = startY;
      doc.setFontSize(fontLabel);
      doc.setTextColor(100, 116, 139);
      doc.text('Exames (última coleta):', x, y + lineH);
      y += lineH + 0.5;
      const drawExameLine = (ax: number, item: ExameItem) => {
        doc.setFontSize(fontLabel);
        doc.setTextColor(100, 116, 139);
        const labelShort = item.label.length > 22 ? item.label.substring(0, 22) + '…' : item.label;
        doc.text(labelShort + ':', ax, y + lineH);
        const valorComUnidade = item.unit ? `${item.value} ${item.unit}` : item.value;
        doc.setFontSize(fontNorm);
        if (item.inRange === true) doc.setTextColor(22, 163, 74);
        else if (item.inRange === false) doc.setTextColor(220, 38, 38);
        else doc.setTextColor(30, 41, 59);
        doc.text(valorComUnidade.substring(0, 14), ax + labelWGroup, y + lineH);
      };
      gruposOrdenados.forEach((grupo) => {
        const itens = examesPorGrupo[grupo];
        if (!itens || itens.length === 0) return;
        doc.setFontSize(fontLabel);
        doc.setTextColor(55, 65, 81);
        doc.text(grupo + ':', x, y + lineH);
        y += lineH + 0.5;
        for (let i = 0; i < itens.length; i += 2) {
          drawExameLine(x, itens[i]);
          if (itens[i + 1]) drawExameLine(x + colInnerW, itens[i + 1]);
          y += lineH + 0.5;
        }
        y += 1;
      });
      y += 2;
      doc.setDrawColor(226, 232, 240);
      doc.line(x, y, x + colW, y);
      return y + 4;
    };

    const { perdaPesoTotal, totalMg } = calcPerdaPesoEMg(paciente);
    const nome = (paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || '').trim();
    const email = (paciente.dadosIdentificacao?.email || paciente.email || '').trim();
    const tel = (paciente.dadosIdentificacao?.telefone || '').trim();
    const cpf = (paciente.dadosIdentificacao?.cpf || '').trim();
    const sexo = getSexoLabel(paciente.dadosIdentificacao?.sexoBiologico);
    const cidade = (paciente.dadosIdentificacao?.endereco?.cidade || '').trim();
    const estado = (paciente.dadosIdentificacao?.endereco?.estado || '').trim();
    const status = getStatusLabel(paciente.statusTratamento || 'pendente');
    const dataNascStr = formatDataNasc(paciente.dadosIdentificacao?.dataNascimento);
    const perdaStr = perdaPesoTotal != null ? `${perdaPesoTotal.toFixed(1)} kg` : '-';
    const mgStr = totalMg > 0 ? `${totalMg} mg` : '-';
    const cidadeEstado = [cidade, estado].filter(Boolean).join(' / ') || '-';

    const xLeft = margin;
    const xRight = margin + colW + gap;
    let rowY = 30;

    drawHeader();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontNorm + 1);
    doc.setTextColor(15, 23, 42);
    const nomeParts = doc.splitTextToSize(nome, valueW);
    doc.text(nomeParts, xLeft, rowY + lineH);
    rowY += lineH * nomeParts.length + 1;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontNorm);

    const writeLine = (label: string, value: string) => {
      doc.setFontSize(fontLabel);
      doc.setTextColor(100, 116, 139);
      doc.text(label, xLeft, rowY + lineH);
      doc.setFontSize(fontNorm);
      doc.setTextColor(30, 41, 59);
      const parts = doc.splitTextToSize(value || '-', valueW);
      doc.text(parts, xLeft + labelW, rowY + lineH);
      rowY += lineH * parts.length + 0.5;
    };
    writeLine('E-mail:', email);
    writeLine('Tel:', tel);
    writeLine('CPF:', cpf);
    writeLine('Nasc.:', dataNascStr);
    writeLine('Sexo:', sexo);
    writeLine('Cid./UF:', cidadeEstado);
    writeLine('Status:', status);
    writeLine('Perda kg:', perdaStr);
    writeLine('Mg:', mgStr);

    const evolucao = (paciente.evolucaoSeguimento || []).slice().sort((a, b) => {
      const da = a.dataRegistro instanceof Date ? a.dataRegistro.getTime() : new Date(a.dataRegistro).getTime();
      const db = b.dataRegistro instanceof Date ? b.dataRegistro.getTime() : new Date(b.dataRegistro).getTime();
      return da - db;
    });
    const pesos = evolucao.filter(r => r.peso != null && r.peso > 0).map(r => r.peso!);
    if (pesos.length >= 2) {
      rowY += 1;
      rowY = drawMiniChart(xLeft, rowY, colW, 16, pesos, 'Peso (kg)');
    }
    const alturaM = (paciente.dadosClinicos?.medidasIniciais?.altura || 0) / 100;
    if (alturaM > 0) {
      const imcs = evolucao.filter(r => r.peso != null && r.peso > 0).map(r => r.peso! / (alturaM * alturaM));
      if (imcs.length >= 2) {
        rowY += 1;
        rowY = drawMiniChart(xLeft, rowY, colW, 16, imcs, 'IMC');
      }
    }

    const yExams = drawExamsBlock(xRight, 30);
    rowY = Math.max(rowY, yExams);

    doc.setDrawColor(226, 232, 240);
    doc.line(xLeft, rowY, xLeft + colW, rowY);
    rowY += 4;

    const base64 = doc.output('dataurlstring').split(',')[1];
    return base64 || null;
  } catch (err) {
    console.warn('Erro ao gerar PDF do relatório do paciente:', err);
    return null;
  }
}
