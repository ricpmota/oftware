'use client';

import type {
  EyeSide,
  RetinaAchadosEspecificosFindings,
  RetinaConclusaoFindings,
  RetinaCondutaFindings,
  RetinaDiscoFindings,
  RetinaDmri,
  RetinaMaculaFindings,
  RetinaPeriferiaFindings,
  RetinaRetinopatiaDiabetica,
  RetinaSection,
  RetinaStructuredFindings,
  RetinaVasosFindings,
  RetinaVitreoFindings,
} from '@/types/oftpay/retinaMap';
import {
  RETINA_DMRI_LABELS,
  RETINA_HEMORRAGIA_VITREA_LABELS,
  RETINA_RD_LABELS,
  RETINA_SECTION_LABELS,
} from '@/types/oftpay/retinaMap';
import {
  LocalizedCheckboxField,
  SimpleCheckboxField,
  type LocalizedFieldTogglePayload,
  type PlacementMode,
} from './RetinaLocalizedField';
import { needsMapPlacement } from '@/lib/oftpay/retinaStructuredMapConfig';
import type { RetinaFinding } from '@/types/oftpay/retinaMap';

interface RetinaSectionFormProps {
  eye: EyeSide;
  section: RetinaSection;
  data: RetinaStructuredFindings;
  findings: RetinaFinding[];
  placementMode: PlacementMode | null;
  onChange: (patch: Partial<RetinaStructuredFindings>) => void;
  onLocalizedToggle: (payload: LocalizedFieldTogglePayload) => void;
  onRequestPlacement?: (payload: { section: RetinaSection; fieldKey: string }) => void;
}

function CheckboxField({
  id,
  section,
  fieldKey,
  label,
  checked,
  findings,
  placementMode,
  onSimpleChange,
  onLocalizedToggle,
  onRequestPlacement,
}: {
  id: string;
  section: RetinaSection;
  fieldKey: string;
  label: string;
  checked?: boolean;
  findings: RetinaFinding[];
  placementMode: PlacementMode | null;
  onSimpleChange: (checked: boolean) => void;
  onLocalizedToggle: (payload: LocalizedFieldTogglePayload) => void;
  onRequestPlacement?: (payload: { section: RetinaSection; fieldKey: string }) => void;
}) {
  if (needsMapPlacement(section, fieldKey)) {
    return (
      <LocalizedCheckboxField
        id={id}
        section={section}
        fieldKey={fieldKey}
        label={label}
        checked={checked}
        findings={findings}
        placementMode={placementMode}
        onToggle={onLocalizedToggle}
        onRequestPlacement={onRequestPlacement}
      />
    );
  }
  return (
    <SimpleCheckboxField
      id={id}
      label={label}
      checked={checked}
      onChange={onSimpleChange}
    />
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <textarea
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function patchSection<T extends object>(
  onChange: RetinaSectionFormProps['onChange'],
  key: keyof RetinaStructuredFindings,
  patch: Partial<T>
) {
  onChange({ [key]: patch } as Partial<RetinaStructuredFindings>);
}

function VitreoForm({
  eye,
  data,
  onChange,
}: {
  eye: string;
  data: RetinaVitreoFindings;
  onChange: (v: RetinaVitreoFindings) => void;
}) {
  const set = <K extends keyof RetinaVitreoFindings>(key: K, value: RetinaVitreoFindings[K]) =>
    onChange({ ...data, [key]: value });

  const radioName = `hemorragia-vitrea-${eye}`;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <SimpleCheckboxField id={`${eye}-v-transparente`} label="Transparente" checked={data.transparente} onChange={(v) => set('transparente', v || undefined)} />
        <SimpleCheckboxField id={`${eye}-v-sinereze`} label="Sinérese" checked={data.sinereze} onChange={(v) => set('sinereze', v || undefined)} />
        <SimpleCheckboxField id={`${eye}-v-dpv-parcial`} label="DPV parcial" checked={data.dpv_parcial} onChange={(v) => set('dpv_parcial', v || undefined)} />
        <SimpleCheckboxField id={`${eye}-v-dpv-completo`} label="DPV completo" checked={data.dpv_completo} onChange={(v) => set('dpv_completo', v || undefined)} />
        <SimpleCheckboxField
          id={`${eye}-v-opacidades`}
          label="Opacidades vítreas"
          checked={data.opacidades_vitreas}
          onChange={(v) =>
            onChange({
              ...data,
              opacidades_vitreas: v || undefined,
              hemorragia_vitrea: v ? null : data.hemorragia_vitrea,
            })
          }
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Hemorragia vítrea</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(RETINA_HEMORRAGIA_VITREA_LABELS) as Array<keyof typeof RETINA_HEMORRAGIA_VITREA_LABELS>).map((g) => (
            <label
              key={g}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${
                data.hemorragia_vitrea === g ? 'border-violet-400 bg-violet-50' : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name={radioName}
                className="sr-only"
                checked={data.hemorragia_vitrea === g}
                onChange={() =>
                  onChange({
                    ...data,
                    hemorragia_vitrea: g,
                    opacidades_vitreas: undefined,
                  })
                }
              />
              {RETINA_HEMORRAGIA_VITREA_LABELS[g]}
            </label>
          ))}
          <button
            type="button"
            onClick={() => set('hemorragia_vitrea', null)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
          >
            Limpar
          </button>
        </div>
      </div>
      <TextAreaField id={`${eye}-v-outros`} label="Outros" value={data.outros} onChange={(v) => set('outros', v || undefined)} />
    </div>
  );
}

function DiscoForm({
  data,
  onChange,
  findings,
  placementMode,
  onLocalizedToggle,
  onRequestPlacement,
}: {
  data: RetinaDiscoFindings;
  onChange: (v: RetinaDiscoFindings) => void;
  findings: RetinaFinding[];
  placementMode: PlacementMode | null;
  onLocalizedToggle: (payload: LocalizedFieldTogglePayload) => void;
  onRequestPlacement?: (payload: { section: RetinaSection; fieldKey: string }) => void;
}) {
  const set = <K extends keyof RetinaDiscoFindings>(key: K, value: RetinaDiscoFindings[K]) =>
    onChange({ ...data, [key]: value });

  const cdOptions = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

  const check = (key: keyof RetinaDiscoFindings, label: string) => (
    <CheckboxField
      id={`d-${key}`}
      section="disco"
      fieldKey={key}
      label={label}
      checked={data[key] as boolean | undefined}
      findings={findings}
      placementMode={placementMode}
      onSimpleChange={(v) => set(key, (v || undefined) as RetinaDiscoFindings[typeof key])}
      onLocalizedToggle={onLocalizedToggle}
      onRequestPlacement={onRequestPlacement}
    />
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {check('corado_rosado', 'Corado / rosado')}
        {check('palido', 'Pálido')}
        {check('contornos_nitidos', 'Contornos nítidos')}
        {check('contornos_borrados', 'Contornos borrados')}
        {check('cd_fisiologica', 'Relação C/D fisiológica')}
        {check('cd_aumentada', 'Relação C/D aumentada')}
        {check('atrofia_peripapilar', 'Atrofia peripapilar')}
        {check('crescente_escleral', 'Crescente escleral')}
      </div>
      <div>
        <label htmlFor="d-cd-valor" className="mb-1 block text-sm font-medium text-gray-700">
          Valor C/D
        </label>
        <select
          id="d-cd-valor"
          value={data.cd_valor ?? ''}
          onChange={(e) => set('cd_valor', e.target.value ? Number(e.target.value) : null)}
          className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {cdOptions.map((v) => (
            <option key={v} value={v}>
              {v.toFixed(1)}
            </option>
          ))}
        </select>
      </div>
      <TextAreaField id="d-outros" label="Outros" value={data.outros} onChange={(v) => set('outros', v || undefined)} />
    </div>
  );
}

function MaculaForm({
  data,
  onChange,
  findings,
  placementMode,
  onLocalizedToggle,
  onRequestPlacement,
}: {
  data: RetinaMaculaFindings;
  onChange: (v: RetinaMaculaFindings) => void;
  findings: RetinaFinding[];
  placementMode: PlacementMode | null;
  onLocalizedToggle: (payload: LocalizedFieldTogglePayload) => void;
  onRequestPlacement?: (payload: { section: RetinaSection; fieldKey: string }) => void;
}) {
  const set = <K extends keyof RetinaMaculaFindings>(key: K, value: RetinaMaculaFindings[K]) =>
    onChange({ ...data, [key]: value });

  const fields: Array<{ key: keyof RetinaMaculaFindings; label: string }> = [
    { key: 'reflexo_foveal_presente', label: 'Reflexo foveal presente' },
    { key: 'contornos_preservados', label: 'Contornos preservados' },
    { key: 'alteracoes_pigmentares', label: 'Alterações pigmentares' },
    { key: 'atrofia', label: 'Atrofia' },
    { key: 'drusas', label: 'Drusas' },
    { key: 'edema_intrarretiniano', label: 'Edema intrarretiniano' },
    { key: 'liquido_sub_retiniano', label: 'Líquido sub-retiniano' },
    { key: 'hemorragias', label: 'Hemorragias' },
    { key: 'exsudatos_duros', label: 'Exsudatos duros' },
    { key: 'membrana_epirretiniana', label: 'Membrana epirretiniana' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(({ key, label }) => (
          <CheckboxField
            key={key}
            id={`m-${key}`}
            section="macula"
            fieldKey={key}
            label={label}
            checked={data[key] as boolean | undefined}
            findings={findings}
            placementMode={placementMode}
            onSimpleChange={(v) => set(key, (v || undefined) as RetinaMaculaFindings[typeof key])}
            onLocalizedToggle={onLocalizedToggle}
            onRequestPlacement={onRequestPlacement}
          />
        ))}
      </div>
      <TextAreaField id="m-outros" label="Outros" value={data.outros} onChange={(v) => set('outros', v || undefined)} />
    </div>
  );
}

function VasosForm({
  data,
  onChange,
  findings,
  placementMode,
  onLocalizedToggle,
  onRequestPlacement,
}: {
  data: RetinaVasosFindings;
  onChange: (v: RetinaVasosFindings) => void;
  findings: RetinaFinding[];
  placementMode: PlacementMode | null;
  onLocalizedToggle: (payload: LocalizedFieldTogglePayload) => void;
  onRequestPlacement?: (payload: { section: RetinaSection; fieldKey: string }) => void;
}) {
  const set = <K extends keyof RetinaVasosFindings>(key: K, value: RetinaVasosFindings[K]) =>
    onChange({ ...data, [key]: value });

  const fields: Array<{ key: keyof RetinaVasosFindings; label: string }> = [
    { key: 'relacao_av_preservada', label: 'Relação artério-veia preservada' },
    { key: 'calibre_arterial_preservado', label: 'Calibre arterial preservado' },
    { key: 'calibre_venoso_preservado', label: 'Calibre venoso preservado' },
    { key: 'cruzamentos_av_ausentes', label: 'Cruzamentos AV ausentes' },
    { key: 'cruzamentos_av_presentes', label: 'Cruzamentos AV presentes' },
    { key: 'esclerose_arteriolar', label: 'Esclerose arteriolar' },
    { key: 'estreitamento_arteriolar', label: 'Estreitamento arteriolar' },
    { key: 'tortuosidade_arteriolar', label: 'Tortuosidade arteriolar' },
    { key: 'hemorragias', label: 'Hemorragias' },
    { key: 'exsudatos', label: 'Exsudatos' },
    { key: 'neovascularizacao', label: 'Neovascularização' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(({ key, label }) => (
          <CheckboxField
            key={key}
            id={`vs-${key}`}
            section="vasos"
            fieldKey={key}
            label={label}
            checked={data[key] as boolean | undefined}
            findings={findings}
            placementMode={placementMode}
            onSimpleChange={(v) => set(key, (v || undefined) as RetinaVasosFindings[typeof key])}
            onLocalizedToggle={onLocalizedToggle}
            onRequestPlacement={onRequestPlacement}
          />
        ))}
      </div>
      <TextAreaField id="vs-outros" label="Outros" value={data.outros} onChange={(v) => set('outros', v || undefined)} />
    </div>
  );
}

function PeriferiaForm({
  data,
  onChange,
  findings,
  placementMode,
  onLocalizedToggle,
  onRequestPlacement,
}: {
  data: RetinaPeriferiaFindings;
  onChange: (v: RetinaPeriferiaFindings) => void;
  findings: RetinaFinding[];
  placementMode: PlacementMode | null;
  onLocalizedToggle: (payload: LocalizedFieldTogglePayload) => void;
  onRequestPlacement?: (payload: { section: RetinaSection; fieldKey: string }) => void;
}) {
  const set = <K extends keyof RetinaPeriferiaFindings>(key: K, value: RetinaPeriferiaFindings[K]) =>
    onChange({ ...data, [key]: value });

  const fields: Array<{ key: keyof RetinaPeriferiaFindings; label: string }> = [
    { key: 'retina_aplicada_360', label: 'Retina aplicada 360°' },
    { key: 'degeneracoes_perifericas', label: 'Degenerações periféricas' },
    { key: 'lattice', label: 'Lattice' },
    { key: 'buracos_roturas', label: 'Buracos / roturas' },
    { key: 'descolamento_retina', label: 'Descolamento de retina' },
    { key: 'degeneracao_vitreorretiniana', label: 'Degeneração vitreorretiniana' },
    { key: 'atrofia_periferica', label: 'Atrofia periférica' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(({ key, label }) => (
          <CheckboxField
            key={key}
            id={`p-${key}`}
            section="periferia"
            fieldKey={key}
            label={label}
            checked={data[key] as boolean | undefined}
            findings={findings}
            placementMode={placementMode}
            onSimpleChange={(v) => set(key, (v || undefined) as RetinaPeriferiaFindings[typeof key])}
            onLocalizedToggle={onLocalizedToggle}
            onRequestPlacement={onRequestPlacement}
          />
        ))}
      </div>
      <TextAreaField id="p-outros" label="Outros" value={data.outros} onChange={(v) => set('outros', v || undefined)} />
    </div>
  );
}

function AchadosEspecificosForm({
  data,
  onChange,
}: {
  data: RetinaAchadosEspecificosFindings;
  onChange: (v: RetinaAchadosEspecificosFindings) => void;
}) {
  const set = <K extends keyof RetinaAchadosEspecificosFindings>(key: K, value: RetinaAchadosEspecificosFindings[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">Retinopatia diabética</p>
        <select
          value={data.retinopatia_diabetica ?? ''}
          onChange={(e) =>
            set('retinopatia_diabetica', (e.target.value || null) as RetinaRetinopatiaDiabetica | null)
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {(Object.keys(RETINA_RD_LABELS) as RetinaRetinopatiaDiabetica[]).map((k) => (
            <option key={k} value={k}>
              {RETINA_RD_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">DMRI</p>
        <select
          value={data.dmri ?? ''}
          onChange={(e) => set('dmri', (e.target.value || null) as RetinaDmri | null)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {(Object.keys(RETINA_DMRI_LABELS) as RetinaDmri[]).map((k) => (
            <option key={k} value={k}>
              {RETINA_DMRI_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <TextAreaField
        id="ae-outros"
        label="Outros achados (texto livre)"
        value={data.outros}
        onChange={(v) => set('outros', v || undefined)}
        placeholder="Descreva outros achados específicos"
      />
    </div>
  );
}

function ConclusaoForm({
  data,
  onChange,
}: {
  data: RetinaConclusaoFindings;
  onChange: (v: RetinaConclusaoFindings) => void;
}) {
  const set = <K extends keyof RetinaConclusaoFindings>(key: K, value: RetinaConclusaoFindings[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="space-y-4">
      <SimpleCheckboxField
        id="c-sem-alt"
        label="Exame sem alterações significativas"
        checked={data.sem_alteracoes}
        onChange={(v) => set('sem_alteracoes', v || undefined)}
      />
      <SimpleCheckboxField
        id="c-conforme"
        label="Alterações identificadas conforme descrição acima"
        checked={data.alteracoes_conforme_descricao}
        onChange={(v) => set('alteracoes_conforme_descricao', v || undefined)}
      />
      <TextAreaField
        id="c-comentarios"
        label="Descrição / comentários"
        value={data.comentarios}
        onChange={(v) => set('comentarios', v || undefined)}
        placeholder="Comentários adicionais para a conclusão"
      />
    </div>
  );
}

function CondutaForm({
  data,
  onChange,
}: {
  data: RetinaCondutaFindings;
  onChange: (v: RetinaCondutaFindings) => void;
}) {
  const set = <K extends keyof RetinaCondutaFindings>(key: K, value: RetinaCondutaFindings[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <div className="space-y-4">
      <SimpleCheckboxField
        id="cd-acomp"
        label="Acompanhamento clínico"
        checked={data.acompanhamento_clinico}
        onChange={(v) => set('acompanhamento_clinico', v || undefined)}
      />
      <TextField
        id="cd-exames"
        label="Exames complementares"
        value={data.exames_complementares}
        onChange={(v) => set('exames_complementares', v || undefined)}
        placeholder="Ex.: OCT de mácula, angiografia"
      />
      <TextField
        id="cd-retorno"
        label="Retorno em"
        value={data.retorno_em}
        onChange={(v) => set('retorno_em', v || undefined)}
        placeholder="Ex.: 6 meses"
      />
      <TextField
        id="cd-tratamento"
        label="Tratamento indicado"
        value={data.tratamento_indicado}
        onChange={(v) => set('tratamento_indicado', v || undefined)}
      />
      <TextField
        id="cd-encaminhamento"
        label="Encaminhamento"
        value={data.encaminhamento}
        onChange={(v) => set('encaminhamento', v || undefined)}
      />
      <TextAreaField
        id="cd-outras"
        label="Outras recomendações"
        value={data.outras_recomendacoes}
        onChange={(v) => set('outras_recomendacoes', v || undefined)}
      />
    </div>
  );
}

export default function RetinaSectionForm({
  eye,
  section,
  data,
  findings,
  placementMode,
  onChange,
  onLocalizedToggle,
  onRequestPlacement,
}: RetinaSectionFormProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">{RETINA_SECTION_LABELS[section]}</h2>
      <p className="text-xs text-gray-500">
        Marque os achados abaixo. Quando indicado, clique no mapa à direita para informar a
        localização — o símbolo e o texto do laudo serão gerados automaticamente.
      </p>

      {section === 'vitreo' && (
        <VitreoForm eye={eye} data={data.vitreo} onChange={(v) => patchSection(onChange, 'vitreo', v)} />
      )}
      {section === 'disco' && (
        <DiscoForm
          data={data.disco}
          findings={findings}
          placementMode={placementMode}
          onLocalizedToggle={onLocalizedToggle}
          onRequestPlacement={onRequestPlacement}
          onChange={(v) => patchSection(onChange, 'disco', v)}
        />
      )}
      {section === 'macula' && (
        <MaculaForm
          data={data.macula}
          findings={findings}
          placementMode={placementMode}
          onLocalizedToggle={onLocalizedToggle}
          onRequestPlacement={onRequestPlacement}
          onChange={(v) => patchSection(onChange, 'macula', v)}
        />
      )}
      {section === 'vasos' && (
        <VasosForm
          data={data.vasos}
          findings={findings}
          placementMode={placementMode}
          onLocalizedToggle={onLocalizedToggle}
          onRequestPlacement={onRequestPlacement}
          onChange={(v) => patchSection(onChange, 'vasos', v)}
        />
      )}
      {section === 'periferia' && (
        <PeriferiaForm
          data={data.periferia}
          findings={findings}
          placementMode={placementMode}
          onLocalizedToggle={onLocalizedToggle}
          onRequestPlacement={onRequestPlacement}
          onChange={(v) => patchSection(onChange, 'periferia', v)}
        />
      )}
      {section === 'achados_especificos' && (
        <AchadosEspecificosForm
          data={data.achados_especificos}
          onChange={(v) => patchSection(onChange, 'achados_especificos', v)}
        />
      )}
      {section === 'conclusao' && (
        <ConclusaoForm data={data.conclusao} onChange={(v) => patchSection(onChange, 'conclusao', v)} />
      )}
      {section === 'conduta' && (
        <CondutaForm data={data.conduta} onChange={(v) => patchSection(onChange, 'conduta', v)} />
      )}
    </div>
  );
}
