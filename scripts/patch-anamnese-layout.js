const fs = require('fs');
const path = 'c:/oftware/app/metaadmin/page.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "import { PerfilMetabolicoInteligenteSection } from '@/components/metaadmin/PerfilMetabolicoInteligenteSection';\nimport { AnamneseRespostasSection } from '@/components/metaadmin/AnamneseRespostasSection';",
  "import { PerfilMetabolicoCompletoSection } from '@/components/metaadmin/PerfilMetabolicoCompletoSection';\nimport { AnamneseMedidasIniciaisFields } from '@/components/metaadmin/paciente-modal/AnamneseMedidasIniciaisFields';"
);

const perfilReplacement = `<PerfilMetabolicoCompletoSection
                    pacienteId={pacienteEditando.id}
                    paciente={pacienteEditando}
                    dadosClinicos={pacienteEditando.dadosClinicos}
                    anamneseInteligenteAtivo={isAnamneseInteligenteAtivoParaMedico(medicoPerfil)}
                    setPaciente={setPacienteEditando}
                    onAnamneseInteligenteUpdated={(inteligencia) =>
                      setPacienteEditando((p) =>
                        p
                          ? {
                              ...p,
                              dadosClinicos: { ...p.dadosClinicos, anamneseInteligenteV3: inteligencia },
                            }
                          : p
                      )
                    }
                  />`;

let idx = 0;
let perfilCount = 0;
while (true) {
  const s = content.indexOf('<PerfilMetabolicoInteligenteSection', idx);
  if (s === -1) break;
  const e = content.indexOf('</AnamneseRespostasSection>', s);
  if (e === -1) {
    console.error('end not found');
    process.exit(1);
  }
  content = content.slice(0, s) + perfilReplacement + content.slice(e + '</AnamneseRespostasSection>'.length);
  perfilCount++;
  idx = s + perfilReplacement.length;
}

const medidasCardOpen = '<AnamneseSectionCard sectionId="2.1" title="Medidas Iniciais" icon={AnamneseIcons.medidas}>';
const medidasReplacement =
  medidasCardOpen +
  '\n                    <AnamneseMedidasIniciaisFields\n                      paciente={pacienteEditando}\n                      setPaciente={setPacienteEditando}\n                    />\n                  </AnamneseSectionCard>';

idx = 0;
let medidasCount = 0;
while (true) {
  const cardIdx = content.indexOf(medidasCardOpen, idx);
  if (cardIdx === -1) break;
  const closeIdx = content.indexOf('</AnamneseSectionCard>', cardIdx);
  if (closeIdx === -1) break;
  content = content.slice(0, cardIdx) + medidasReplacement + content.slice(closeIdx + '</AnamneseSectionCard>'.length);
  medidasCount++;
  idx = cardIdx + medidasReplacement.length;
}

fs.writeFileSync(path, content);
console.log({ perfilCount, medidasCount });
