"""Aplica AnamneseSectionCard nas seções 2.x de PacienteDadosClinicosTabContent e metaadmin page.tsx."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SECTIONS = [
    ("2.1", "Medidas Iniciais", "medidas"),
    ("2.2", "Motivação em relação ao peso", "motivacao"),
    ("2.3", "Diagnóstico Principal", "diagnostico"),
    ("2.4", "Comorbidades Associadas", "comorbidades"),
    ("2.5 Medicações", "Medicações em uso atual", "medicacoes"),
    ("2.5 Alergias", "Alergias", "alergias"),
    ("2.6", "Riscos e condições que impactam a tirzepatida", "riscos"),
    ("2.7", "História tireoidiana", "tireoide"),
    ("2.8", "Função renal (para enquadrar DRC)", "renal"),
    ("2.10", "Sintomas basais relacionados ao trato GI", "sintomasGi"),
    ("2.11", "Objetivos do tratamento", "objetivos"),
]

IMPORT_BLOCK = """import {
  AnamneseIcons,
  AnamneseSectionCard,
  AnamneseTabShell,
} from '@/components/metaadmin/paciente-modal/anamneseSectionUi';
"""


def transform_sections(text: str) -> str:
    for comment_key, title, icon in SECTIONS:
        # Comment line: {/* 2.1 Medidas Iniciais */} or similar
        comment_pat = rf"\s*\{{/\*\s*{re.escape(comment_key)}[^*]*\*/\}}\s*"
        h4_pat = (
            r'<div className="border border-gray-200 rounded-lg p-4">\s*'
            r'<h4 className="font-semibold text-gray-800 mb-4">[^<]*'
            + re.escape(comment_key.split()[0])
            + r"[^<]*</h4>\s*"
        )
        replacement = (
            f'\n                  <AnamneseSectionCard sectionId="{comment_key.split()[0]}" '
            f'title="{title}" icon={{AnamneseIcons.{icon}}}>\n'
        )
        new_text, n = re.subn(comment_pat + h4_pat, replacement, text, count=1)
        if n:
            text = new_text
        else:
            print("warn: no match for", comment_key)

    # Fecha cards: </div> antes do próximo AnamneseSectionCard ou fim do bloco
    text = re.sub(
        r"(</div>\s*\n)(\s*<AnamneseSectionCard)",
        r"</AnamneseSectionCard>\n\2",
        text,
    )
    # Última seção antes de fechar shell
    text = re.sub(
        r"(</div>\s*\n)(\s*</div>\s*\n\s*</AnamneseTabShell>)",
        r"</AnamneseSectionCard>\n\2",
        text,
        count=1,
    )
    text = re.sub(
        r"(</div>\s*\n)(\s*</div>\s*\n\s*\);\s*\n\})",
        r"</AnamneseSectionCard>\n\2",
        text,
        count=1,
    )
    return text


def wrap_shell(text: str, inner_class: str = "space-y-6") -> str:
    text = re.sub(
        rf"return \(\s*<div className=\"{inner_class}\">",
        "return (\n    <AnamneseTabShell>",
        text,
        count=1,
    )
    # Fecha AnamneseTabShell no final do return principal
    if "<AnamneseTabShell>" in text and "</AnamneseTabShell>" not in text:
        text = re.sub(
            r"\n    </div>\n  \);\n\}$",
            "\n    </AnamneseTabShell>\n  );\n}",
            text,
            count=1,
        )
    return text


def add_imports(text: str, after_line: str) -> str:
    if "anamneseSectionUi" in text:
        return text
    idx = text.find(after_line)
    if idx == -1:
        return IMPORT_BLOCK + text
    end = text.find("\n", idx) + 1
    return text[:end] + IMPORT_BLOCK + text[end:]


def process_clinicos():
    path = ROOT / "components/metaadmin/paciente-modal/PacienteDadosClinicosTabContent.tsx"
    text = path.read_text(encoding="utf-8")
    text = add_imports(text, "from '@/components/metaadmin/PerfilMetabolicoInteligenteSection';")
    text = transform_sections(text)
    text = wrap_shell(text)
    path.write_text(text, encoding="utf-8")
    print("updated", path)


def process_metaadmin():
    path = ROOT / "app/metaadmin/page.tsx"
    text = path.read_text(encoding="utf-8")
    if "AnamneseTabShell" not in text:
        text = add_imports(text, "import { PacienteIdentificacaoTabEdit }")
    start = text.index("{pastaAtiva === 2 && (")
    end = text.index("{pastaAtiva === 10 && pacienteEditando", start)
    block = text[start:end]
    new_block = transform_sections(block)
    new_block = re.sub(
        r"\{pastaAtiva === 2 && \(\s*<div className=\"space-y-6\">",
        "{pastaAtiva === 2 && (\n                <AnamneseTabShell>",
        new_block,
        count=1,
    )
    new_block = re.sub(
        r"</div>\s*\)\}\s*$",
        "</AnamneseTabShell>\n              )}",
        new_block,
        count=1,
    )
    text = text[:start] + new_block + text[end:]
    path.write_text(text, encoding="utf-8")
    print("updated metaadmin pasta 2")


def process_metaadmin_mobile():
    path = ROOT / "app/metaadmin/page.tsx"
    text = path.read_text(encoding="utf-8")
    start = text.index("{abaAtivaMobile === 'clinicos' && (")
    end = text.index("{abaAtivaMobile === 'prontuario'", start)
    block = text[start:end]
    block = transform_sections(block)
    block = re.sub(
        r"\{abaAtivaMobile === 'clinicos' && \(\s*<>",
        "{abaAtivaMobile === 'clinicos' && (\n                <AnamneseTabShell>",
        block,
        count=1,
    )
    block = re.sub(r"</>\s*\)\}\s*$", "</AnamneseTabShell>\n              )}", block, count=1)
    # 2.2 manual fix if needed
    block = re.sub(
        r"</div>\s*</div>\s*<div className=\"border border-gray-200 rounded-lg p-4\">\s*"
        r"<h4 className=\"font-semibold text-gray-800 mb-4\">2\.2 Motivação[^<]*</h4>\s*"
        r"<p className=\"text-xs text-gray-600 mb-3\">[^<]*</p>",
        '</AnamneseSectionCard>\n\n                  <AnamneseSectionCard sectionId="2.2" '
        'title="Motivação em relação ao peso" subtitle="(entrevista V2)" icon={AnamneseIcons.motivacao}>\n'
        '                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">'
        'O que mais incomoda hoje em relação ao peso? (pode marcar várias)</p>',
        block,
        count=1,
        flags=re.DOTALL,
    )
    # 2.1 close before 2.2
    block = re.sub(
        r"(</div>\s*</div>\s*)(<AnamneseSectionCard sectionId=\"2\.2\")",
        r"</AnamneseSectionCard>\n\n                  \2",
        block,
        count=1,
    )
    text = text[:start] + block + text[end:]
    path.write_text(text, encoding="utf-8")
    print("updated metaadmin mobile clinico")


if __name__ == "__main__":
    process_clinicos()
    process_metaadmin()
    process_metaadmin_mobile()
