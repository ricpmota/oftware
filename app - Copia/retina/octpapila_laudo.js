// 📁 OctPapilaLaudo.tsx

/**
 * Componente de laudo específico para OCT de Papila
 * Inclui análise de escavação, RNFL, GCL+, curva TSNI e correlação clínica
 */

import React, { useState } from 'react';

export default function OctPapilaLaudo() {
  const [dados, setDados] = useState({
    olho: 'OD',
    escavacaoVertical: '',
    escavacaoHorizontal: '',
    assimetria: false,
    rnfl: {
      superior: '',
      inferior: '',
      nasal: '',
      temporal: '',
      mediaGlobal: ''
    },
    camadaGanglionar: '',
    curvaTSNI: '',
    localizacaoPerda: '',
    tamanhoDisco: '',
    mapaCalor: '',
    conduta: ''
  });

  const gerarLaudo = () => {
    return `Laudo de OCT de Papila (${dados.olho}):\n\n` +
      `- Escavação vertical: ${dados.escavacaoVertical || 'não informada'}; horizontal: ${dados.escavacaoHorizontal || 'não informada'}${dados.assimetria ? ' (com assimetria entre os olhos).' : '.'}\n` +
      `- RNFL: Superior ${dados.rnfl.superior}μm, Inferior ${dados.rnfl.inferior}μm, Nasal ${dados.rnfl.nasal}μm, Temporal ${dados.rnfl.temporal}μm. Média global: ${dados.rnfl.mediaGlobal}μm.\n` +
      `- Camada de células ganglionares: ${dados.camadaGanglionar}.\n` +
      `- Curva TSNI: ${dados.curvaTSNI}.\n` +
      `- Localização da perda de fibras: ${dados.localizacaoPerda}.\n` +
      `- Tamanho do disco óptico: ${dados.tamanhoDisco}.\n` +
      `- Mapa de calor: ${dados.mapaCalor}.\n` +
      `${dados.conduta ? 'Conduta sugerida: ' + dados.conduta + '.' : ''}`;
  };

  return (
    <div>
      <h2>Laudo OCT Papilar</h2>

      <label>Olho:</label>
      <select value={dados.olho} onChange={e => setDados({ ...dados, olho: e.target.value })}>
        <option>OD</option>
        <option>OE</option>
      </select>

      <label>Escavação Vertical:</label>
      <input value={dados.escavacaoVertical} onChange={e => setDados({ ...dados, escavacaoVertical: e.target.value })} />

      <label>Escavação Horizontal:</label>
      <input value={dados.escavacaoHorizontal} onChange={e => setDados({ ...dados, escavacaoHorizontal: e.target.value })} />

      <label>
        <input type="checkbox" checked={dados.assimetria} onChange={e => setDados({ ...dados, assimetria: e.target.checked })} />
        Assimetria entre os olhos
      </label>

      <h4>RNFL por Quadrantes (μm)</h4>
      <label>Superior:</label>
      <input value={dados.rnfl.superior} onChange={e => setDados({ ...dados, rnfl: { ...dados.rnfl, superior: e.target.value } })} />

      <label>Inferior:</label>
      <input value={dados.rnfl.inferior} onChange={e => setDados({ ...dados, rnfl: { ...dados.rnfl, inferior: e.target.value } })} />

      <label>Nasal:</label>
      <input value={dados.rnfl.nasal} onChange={e => setDados({ ...dados, rnfl: { ...dados.rnfl, nasal: e.target.value } })} />

      <label>Temporal:</label>
      <input value={dados.rnfl.temporal} onChange={e => setDados({ ...dados, rnfl: { ...dados.rnfl, temporal: e.target.value } })} />

      <label>Média Global:</label>
      <input value={dados.rnfl.mediaGlobal} onChange={e => setDados({ ...dados, rnfl: { ...dados.rnfl, mediaGlobal: e.target.value } })} />

      <label>Camada de células ganglionares (GCL+):</label>
      <input value={dados.camadaGanglionar} onChange={e => setDados({ ...dados, camadaGanglionar: e.target.value })} />

      <label>Curva TSNI:</label>
      <input value={dados.curvaTSNI} onChange={e => setDados({ ...dados, curvaTSNI: e.target.value })} />

      <label>Local da perda de fibras (ex: inferior-temporal):</label>
      <input value={dados.localizacaoPerda} onChange={e => setDados({ ...dados, localizacaoPerda: e.target.value })} />

      <label>Tamanho do disco óptico:</label>
      <input value={dados.tamanhoDisco} onChange={e => setDados({ ...dados, tamanhoDisco: e.target.value })} />

      <label>Mapa de Calor (cores, alterações):</label>
      <input value={dados.mapaCalor} onChange={e => setDados({ ...dados, mapaCalor: e.target.value })} />

      <label>Conduta:</label>
      <input value={dados.conduta} onChange={e => setDados({ ...dados, conduta: e.target.value })} />

      <button onClick={() => alert(gerarLaudo())}>Gerar Laudo</button>
    </div>
  );
}
