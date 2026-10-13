'use client';

import { LIGHT_EDITOR, type WorkoutEditorAppearance } from '@/components/personal/create/workoutEditorAppearance';

type ExerciseTrainerNoteFieldProps = {
  value?: string;
  readOnly?: boolean;
  appearance?: WorkoutEditorAppearance;
  onChange: (value: string) => void;
};

export function ExerciseTrainerNoteField({
  value = '',
  readOnly = false,
  appearance = 'dark',
  onChange,
}: ExerciseTrainerNoteFieldProps) {
  const light = appearance === 'light';
  return (
    <div className="space-y-1">
      <label
        className={`block text-[10px] uppercase tracking-wide ${light ? LIGHT_EDITOR.faint : 'text-[#E8EDED]/45'}`}
      >
        Orientações para o paciente
      </label>
      {readOnly ? (
        value.trim() ? (
          <p
            className={`text-xs whitespace-pre-wrap leading-relaxed rounded-lg border px-2.5 py-2 ${
              light
                ? 'text-zinc-700 border-zinc-200 bg-white'
                : 'text-[#E8EDED]/80 border-white/10 bg-white/[0.04]'
            }`}
          >
            {value}
          </p>
        ) : (
          <p className={`text-[11px] ${light ? LIGHT_EDITOR.faint : 'text-[#E8EDED]/40'}`}>
            Sem orientação para este exercício.
          </p>
        )
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="Ex.: mantenha o abdômen contraído, controle a descida e evite compensar com a lombar."
          className={`w-full min-h-[4.5rem] max-h-40 px-2.5 py-2 text-xs rounded-lg outline-none focus:ring-2 resize-y ${
            light
              ? LIGHT_EDITOR.input
              : 'border border-white/15 bg-white/10 text-[#E8EDED] placeholder:text-[#E8EDED]/40 focus:ring-[#4CCB7A]/35'
          }`}
        />
      )}
    </div>
  );
}

export default ExerciseTrainerNoteField;
