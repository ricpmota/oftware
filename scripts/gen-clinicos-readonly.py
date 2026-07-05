import re
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "components/metaadmin/paciente-modal/_extract_clinicos.txt"
text = path.read_text(encoding="utf-8")

text = re.sub(r"^[\s\S]*?<h3 className=", '<h3 className=', text, count=1)
text = re.sub(r"<PerfilMetabolicoInteligenteSection[\s\S]*?/>\s*", "", text)
text = text.replace("pacienteEditando", "paciente")
text = re.sub(r"\s+onChange=\{[\s\S]*?\}\n", "\n", text)
text = re.sub(r"\s+onBlur=\{[\s\S]*?\}\n", "\n", text)
text = text.replace("setPacienteEditando", "/* noop */ null")
text = re.sub(r"className=\"w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900\"", 'className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-600 bg-gray-50"', text)

def fix_input(m: re.Match[str]) -> str:
    tag = m.group(0)
    if "readOnly" in tag:
        return tag
    if 'type="checkbox"' in tag or 'type="radio"' in tag:
        return tag.replace("<input", "<input disabled")
    return tag.replace("<input", "<input readOnly disabled")

text = re.sub(r"<input[^>]*>", fix_input, text)
text = re.sub(r"<select([^>]*)>", r"<select\1 disabled>", text)
text = re.sub(
    r'<button\s+type="button"[\s\S]*?>\s*Buscar\s*</button>',
    "",
    text,
)
# Close trailing wrapper divs from extract
text = re.sub(r"\s*</div>\s*</div>\s*$", "\n", text)

out = Path(__file__).resolve().parents[1] / "components/metaadmin/paciente-modal/_generated_clinicos_readonly.txt"
out.write_text(text, encoding="utf-8")
print("written", out, "chars", len(text))
