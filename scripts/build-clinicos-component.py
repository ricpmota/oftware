import re
from pathlib import Path


def remove_jsx_prop(text: str, prop: str) -> str:
    """Remove prop={...} with balanced braces (arrow functions, objects, etc.)."""
    needle = f"{prop}={{"
    out: list[str] = []
    i = 0
    while True:
        idx = text.find(needle, i)
        if idx == -1:
            out.append(text[i:])
            break
        out.append(text[i:idx])
        j = idx + len(prop) + 1  # position of opening {
        depth = 0
        while j < len(text):
            c = text[j]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    j += 1
                    break
            j += 1
        while j < len(text) and text[j] in " \t\r\n":
            j += 1
        i = j
    return "".join(out)


def strip_orphan_braces(text: str) -> str:
    """Remove leftover `}` lines from incomplete handler stripping."""
    return re.sub(r"\n\s+\}\s*\n(?=\s*(className|placeholder|/>))", "\n", text)


root = Path(__file__).resolve().parents[1]
src = root / "app/metaadmin/page.tsx"
text = src.read_text(encoding="utf-8")

start = text.index("{pastaAtiva === 2 && (")
end = text.index("{pastaAtiva === 10 && pacienteEditando", start)
block = text[start:end]

block = re.sub(r"^\s*\{pastaAtiva === 2 && \(\s*\n", "", block)
block = re.sub(r"\s*<div className=\"space-y-6\">\s*\n", "", block, count=1)
block = re.sub(r"\s*</div>\s*\)\}\s*$", "", block)

block = re.sub(r"<PerfilMetabolicoInteligenteSection[\s\S]*?/>\s*", "", block)
block = block.replace("pacienteEditando", "paciente")

for prop in ("onChange", "onBlur", "onClick"):
    block = remove_jsx_prop(block, prop)

block = re.sub(r"<button[\s\S]*?</button>\s*", "", block)
block = strip_orphan_braces(block)


def fix_input(m: re.Match[str]) -> str:
    tag = m.group(0)
    if 'type="checkbox"' in tag or 'type="radio"' in tag:
        if "disabled" not in tag:
            return tag.replace("<input", "<input disabled", 1)
        return tag
    if "readOnly" in tag:
        return tag
    tag = tag.replace("<input", "<input readOnly disabled", 1)
    tag = re.sub(
        r'className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900"',
        'className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-600 bg-gray-50"',
        tag,
    )
    tag = re.sub(
        r'className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900"',
        'className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-600 bg-gray-50"',
        tag,
    )
    return tag


block = re.sub(r"<input[^>]*>", fix_input, block)

def fix_select(m: re.Match[str]) -> str:
    attrs = m.group(1)
    attrs = re.sub(r'\s+className="[^"]*"', "", attrs)
    return (
        '<select'
        + attrs
        + ' disabled className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-600 bg-gray-50">'
    )


block = re.sub(r"<select([^>]*)>", fix_select, block)
block = re.sub(
    r'<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">',
    '<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">',
    block,
)

header = """'use client';

import type { PacienteCompleto } from '@/types/obesidade';
import { calcularGrauObesidade, getCorGrauObesidade } from '@/lib/metaadmin/pacienteModalObesidadeDisplay';

export type PacienteDadosClinicosTabContentProps = {
  paciente: PacienteCompleto;
  /** Quando false, oculta análise inteligente (ex.: metanutri). */
  showAnamneseInteligente?: boolean;
};

export function PacienteDadosClinicosTabContent({
  paciente,
}: PacienteDadosClinicosTabContentProps) {
  return (
    <div className="space-y-6">
"""

footer = """
    </div>
  );
}
"""

out = root / "components/metaadmin/paciente-modal/PacienteDadosClinicosTabContent.tsx"
full = header + block + footer
out.write_text(full, encoding="utf-8")
print("wrote", out, "lines", full.count("\n"))
