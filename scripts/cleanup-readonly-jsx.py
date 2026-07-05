import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

# Remove button blocks entirely
text = re.sub(r"<button[\s\S]*?</button>", "", text)
# Remove orphaned handler fragments
text = re.sub(r"\n\s*\}\);\s*\n\s*\}\}\s*\n", "\n", text)
text = re.sub(r"\n\s*\}\);\s*\n\s*\}\}\s*", "\n", text)
text = re.sub(r"\n\s*setPacienteEditando[\s\S]*?\}\);\s*\n", "\n", text)
text = re.sub(r"/\* noop \*/ null\([\s\S]*?\}\);\s*\n", "", text)
text = re.sub(r"\n\s*onClick=\{[\s\S]*?\}\s*\n", "\n", text)
# Fix duplicate readOnly
text = re.sub(r"\s+readOnly\s+readOnly", " readOnly", text)
# Normalize input classes for readonly
text = re.sub(
    r'className="([^"]*text-gray-900[^"]*)"',
    lambda m: m.group(0).replace("text-gray-900", "text-gray-600 bg-gray-50")
    if "bg-gray-50" not in m.group(1)
    else m.group(0),
    text,
)
text = re.sub(r"className=\{`([^`]*text-gray-900[^`]*)`\}", lambda m: f'className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-600 bg-gray-50"', text)
text = re.sub(r"medicoPerfil", "medicoResponsavelLabel", text)
text = re.sub(
    r"value=\{\(\(\) => \{\s*const medico = medicoResponsavelLabel;[\s\S]*?\}\)\(\)\}",
    "value={medicoResponsavelLabel || ''}",
    text,
)

text = re.sub(r"\n\s*//[^\n]*\n", "\n", text)
text = re.sub(r"\n\s*\}\}\s*\n", "\n", text)
text = re.sub(r"\n\s+\}\s*\n\s+\}\s*\n", "\n", text)
text = re.sub(r"\n\s+\}\s*\n(?=\s+(className|placeholder)=)", "\n", text)
text = re.sub(r"\n\s+\}\s*\n(?=\s*className=)", "\n", text)
text = re.sub(r"\n\s+\}\);\s*\n", "\n", text)
text = re.sub(r'className="mr-2"\s*/>\s*\n\s*<span className="text-sm text-gray-600 bg-gray-50">', 'className="mr-2" />\n                          <span className="text-sm text-gray-900">', text)
text = re.sub(r"<span className=\"text-sm text-gray-600 bg-gray-50\">", '<span className="text-sm text-gray-900">', text)

path.write_text(text, encoding="utf-8")
print("cleaned", path, "len", len(text))
