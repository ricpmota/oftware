const fs = require('fs');

const src = fs.readFileSync('c:/oftware/app/metanutri/page.v2.tsx', 'utf8');
const lines = src.split('\n');
let content = lines.slice(7568, 8735).join('\n');

content = content.replace(
  /^\s*\{showVisualizarPacienteModal && pacienteVisualizando && \(\(\) => \{\s*\n\s*const modalPacienteTelaCheia = isMobile \|\| modalVisualizacaoEstiloPersonal;\s*\n\s*return \(\s*\n/,
  ''
);

content = content.replace(/\s*\);\s*\n\s*\}\)\(\)\s*$/, '');
content = content.replace(/\s*\);\s*\n\s*\}\)\(\)\s*\n\s*\)\}/, '\n      )}');

content = content.replace(
  /<div\s*\n\s*className=\{\`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center \$\{\s*\n\s*modalPacienteTelaCheia \? 'z-\[9999\] p-0' : 'z-50 p-4'\s*\n\s*\}\`\}\s*\n\s*>/,
  '<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">'
);

content = content.replace(
  /<div\s*\n\s*className=\{\`bg-white overflow-hidden flex flex-col shadow-xl \$\{\s*\n\s*modalPacienteTelaCheia \? 'w-full h-full' : 'rounded-lg w-full max-w-7xl h-\[90vh\]'\s*\n\s*\}\`\}\s*\n\s*>/,
  '<div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] overflow-hidden flex flex-col shadow-xl">'
);

content = content.replace(
  /<div\s*\n\s*className=\{\`border-b border-gray-200 flex-shrink-0 bg-white \$\{\s*\n\s*modalPacienteTelaCheia\s*\n\s*\? 'px-4 py-3 sticky top-0 z-10'\s*\n\s*: 'px-6 py-4'\s*\n\s*\}\`\}\s*\n\s*>/,
  '<div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 bg-white">'
);

content = content.replace(
  /<h2\s*\n\s*className=\{\`font-bold text-gray-900 \$\{\s*\n\s*modalPacienteTelaCheia \? 'text-xl' : 'text-2xl'\s*\n\s*\}\`\}\s*\n\s*>/,
  '<h2 className="text-2xl font-bold text-gray-900">'
);

content = content.replace(
  /<div\s*\n\s*className=\{\`flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600 \$\{\s*\n\s*modalPacienteTelaCheia \? 'gap-y-1' : 'gap-3'\s*\n\s*\}\`\}\s*\n\s*>/,
  '<div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">'
);

content = content.replace(
  /onClick=\{\(\) => \{\s*\n\s*setShowVisualizarPacienteModal\(false\);\s*\n\s*setPacienteVisualizando\(null\);\s*\n\s*setPacienteVisualizandoInline\(null\);\s*\n\s*setPastaAtiva\(1\);\s*\n\s*setModalVisualizacaoEstiloPersonal\(false\);\s*\n\s*\}\}/,
  'onClick={() => {\n                    setShowVisualizarPacienteModal(false);\n                    setPacienteVisualizando(null);\n                    setPastaAtiva(1);\n                  }}'
);

const tabsReplacement = `{/* Tabs: 11 abas */}
            <div className="flex border-b border-gray-200 flex-shrink-0 bg-white w-full overflow-x-auto">
              {[
                { id: 1, nome: 'Identificação' },
                { id: 2, nome: 'Anamnese' },
                { id: 3, nome: 'Prontuário' },
                { id: 4, nome: 'Exames' },
                { id: 5, nome: 'Bio Impedância' },
                { id: 6, nome: 'Evolução/Aplicações' },
                { id: 7, nome: 'Prescrições' },
                { id: 8, nome: 'Nutrologia' },
                { id: 9, nome: 'Personal Trainer' },
                { id: 10, nome: 'Pagamento' },
                { id: 11, nome: 'Gráficos' },
              ].map((pasta) => (
                <button
                  key={pasta.id}
                  onClick={() => setPastaAtiva(pasta.id)}
                  className={\`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors \${
                    pastaAtiva === pasta.id
                      ? 'border-green-500 text-green-700 bg-green-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }\`}
                >
                  {pasta.nome}
                </button>
              ))}
            </div>`;

content = content.replace(
  /\{\/\* Tabs: 3 abas[\s\S]*?<\/div>\s*\n\s*\{\/\* Conteúdo da Pasta Ativa \*\/\}/,
  tabsReplacement + '\n\n            {/* Conteúdo da Pasta Ativa */}'
);

content = content.replace(
  /<div\s*\n\s*className=\{\`flex-1 overflow-y-auto min-h-0 \$\{\s*\n\s*modalPacienteTelaCheia \? 'p-4' : 'p-6'\s*\n\s*\}\`\}\s*\n\s*>/,
  '<div className="flex-1 overflow-y-auto min-h-0 p-6">'
);

content = content.replace(
  /nutricionistaId=\{nutricionista\?\.userId \|\| nutricionista\?\.id\}/,
  'nutricionistaId={undefined}'
);

content = content.replace(
  /\{pastaAtiva === 7 && pacienteVisualizando && nutricionista && \(/,
  '{pastaAtiva === 7 && pacienteVisualizando && personalTrainer && ('
);

content = content.replace(/medicoId: nutricionista\.userId/g, 'medicoId: personalTrainer.userId');
content = content.replace(
  /PrescricaoService\.getPrescricoesByMedico\(nutricionista\.userId\)/g,
  'PrescricaoService.getPrescricoesByMedico(personalTrainer.userId)'
);
content = content.replace(
  /!novaPrescricaoModal\.itens\?\.length \|\| !nutricionista\)/g,
  '!novaPrescricaoModal.itens?.length || !personalTrainer)'
);

const pdfOld =
  /const doc = new jsPDF\(\); const dark = \[44, 62, 80\]; const titulo = \(nutricionista as any\)\.genero === 'F' \? 'Dra\.' : 'Dr\.'; doc\.setFontSize\(18\); doc\.setFont\('helvetica', 'bold'\); doc\.setTextColor\(\.\.\.dark\); doc\.text\(\`\$\{titulo\} \$\{nutricionista\.nome \|\| 'Nutricionista'\}\`, 20, 15\); doc\.setFontSize\(9\); doc\.setFont\('helvetica', 'normal'\); doc\.text\(\`CRN-\$\{\(nutricionista as any\)\.registroNumero \|\| '00000'\}\`, 20, 22\); doc\.setDrawColor\(200, 200, 200\); doc\.line\(20, 28, 190, 28\); let y = 40; doc\.setFontSize\(16\); doc\.setFont\('helvetica', 'bold'\); doc\.text\('PRESCRIÇÃO NUTRICIONAL', 20, y\)/;

const pdfNew =
  "const doc = new jsPDF(); const dark = [44, 62, 80]; doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark); doc.text(`${personalTrainer.nome || 'Personal Trainer'}`, 20, 15); doc.setFontSize(9); doc.setFont('helvetica', 'normal'); if (personalTrainer.registroNumero) { doc.text(`CREF-${personalTrainer.registroNumero}`, 20, 22); } doc.setDrawColor(200, 200, 200); doc.line(20, 28, 190, 28); let y = 40; doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text('PRESCRIÇÃO PERSONALIZADA', 20, y)";

content = content.replace(pdfOld, pdfNew);
content = content.replace(
  /doc\.text\('MEDICAMENTOS\/SUPLEMENTOS:', 20, y\)/,
  "doc.text('ITENS PRESCRITOS:', 20, y)"
);

content = content.replace(
  /<NutriContent paciente=\{pacienteVisualizando\} setPaciente=\{\(p: PacienteCompleto\) => setPacienteVisualizando\(p\)\} modoNutricionista \/>/,
  '<NutriContent paciente={pacienteVisualizando} setPaciente={(p: PacienteCompleto) => setPacienteVisualizando(p)} modoNutricionista onlyChatNutri />'
);

const personalTabReplacement = `{/* Aba 9: Personal Trainer */}
              {pastaAtiva === 9 && pacienteVisualizando && personalTrainer && (
                <div className="min-h-[400px] -m-4 sm:-m-6 rounded-xl overflow-hidden border border-pink-200/60 bg-gradient-to-b from-pink-50/50 to-white">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                        <Dumbbell size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold">Personal Trainer</h3>
                        <p className="text-xs text-pink-100">Treinos, cronograma e acompanhamento</p>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-white/15 text-sm font-medium">
                      {pacienteVisualizando.nome || pacienteVisualizando.dadosIdentificacao?.nomeCompleto || 'Paciente'}
                    </div>
                  </div>
                  <div className="p-0 sm:p-2 min-h-[480px]">
                    <PersonalPageContent
                      embedded
                      fromMetapersonalEmbedded
                      pacienteProp={pacienteVisualizando}
                    />
                  </div>
                </div>
              )}`;

content = content.replace(
  /\{\/\* Aba 8: Personal Trainer \*\/\s*\n\s*\{pastaAtiva === 9 && pacienteVisualizando && \(\s*\n\s*<div className="space-y-4">[\s\S]*?<\/div>\s*\n\s*\)\}/m,
  personalTabReplacement
);

content = content.replace(
  /PagamentoService\.salvarPagamentoNutricionistaPaciente/,
  'PagamentoService.salvarPagamentoPersonalTrainerPaciente'
);

content = content.trim();
content = content.replace(/^<div className="fixed/, '        <div className="fixed');
content =
  '      {/* Modal Editar Paciente com 11 abas */}\n      {showVisualizarPacienteModal && pacienteVisualizando && (\n' +
  content;

content = content.replace(/\s*\);\s*\n\s*\}\)\(\)\s*$/, '');
content = content.replace(/\s*\);\s*$/, '');
if (!content.trimEnd().endsWith(')}')) {
  content = content.trimEnd() + '\n      )}';
}

const outPath = 'c:/oftware/components/metapersonal/_EditarPacienteModalSnippet.tsx';
fs.mkdirSync('c:/oftware/components/metapersonal', { recursive: true });
fs.writeFileSync(outPath, content + '\n', 'utf8');
console.log('Written', content.split('\n').length, 'lines to', outPath);
