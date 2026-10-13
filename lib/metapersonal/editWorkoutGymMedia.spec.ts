import { describe, expect, it } from 'vitest';
import {
  applyGymMediaOverride,
  exerciseDemoGifUrl,
  exerciseLookupKeyFromDraft,
  gymMediaForPatientExercise,
  gymMediaListPresentation,
  gymMediaOverrideKey,
  gymMediaUploadTarget,
  summarizeExerciseGymMedia,
} from '@/lib/metapersonal/editWorkoutGymMedia';
import {
  buildBulkEditViewModel,
  buildPatchFromDraft,
  createAddedDraftExercise,
  createBulkEditDraft,
} from '@/lib/metapersonal/bulkWorkoutEdit';
import type { PlannerCardPatient } from '@/lib/metapersonal/treinosPlannerGroup';
import type { ExerciseGymMedia } from '@/lib/personal/exerciseGymMedia';
import { createDefaultTrainingSeries } from '@/lib/personal/trainingExerciseSeries';

function gymMedia(partial: Partial<ExerciseGymMedia> & Pick<ExerciseGymMedia, 'patientUserId' | 'exerciseId' | 'kind'>): ExerciseGymMedia {
  return {
    id: `${partial.patientUserId}__${partial.exerciseId}`,
    patientDocId: partial.patientDocId ?? 'doc',
    url: partial.url || `https://cdn.example/${partial.kind}.jpg`,
    storagePath: `gym/${partial.patientUserId}/${partial.exerciseId}`,
    contentType: partial.kind === 'video' ? 'video/mp4' : 'image/jpeg',
    createdByUid: 'pt',
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
    ...partial,
  };
}

function patient(input: {
  id: string;
  name: string;
  exerciseId?: string;
  order?: number;
  nameEx?: string;
  gifUrl?: string;
  media?: ExerciseGymMedia | null;
  extraExerciseId?: string;
}): PlannerCardPatient {
  const exerciseId = input.exerciseId ?? '0025';
  return {
    pacienteId: input.id,
    patientUserId: `uid_${input.id}`,
    name: input.name,
    sessionId: `ses_${input.id}`,
    scheduledDate: '2026-09-14',
    status: 'scheduled',
    exercises: [
      {
        id: `doc_${input.id}_squat`,
        exerciseId,
        name: input.nameEx || 'Agachamento',
        order: input.order ?? 0,
        gifUrl: input.gifUrl,
        prescription: { series: createDefaultTrainingSeries() },
      },
      ...(input.extraExerciseId
        ? [
            {
              id: `doc_${input.id}_extra`,
              exerciseId: input.extraExerciseId,
              name: 'Crucifixo',
              order: 1,
              prescription: { series: createDefaultTrainingSeries() },
            },
          ]
        : []),
    ],
    notes: [],
    gymMedia: input.media ? [input.media] : [],
    exerciseCount: input.extraExerciseId ? 2 : 1,
  };
}

describe('editWorkoutGymMedia', () => {
  it('1. GIF + foto: gifUrl próprio e mídia image do paciente', () => {
    const joao = patient({
      id: 'p1',
      name: 'João',
      gifUrl: '/api/exercisedb/image?exerciseId=0025&resolution=360',
      media: gymMedia({
        patientUserId: 'uid_p1',
        exerciseId: '0025',
        kind: 'image',
        url: 'https://cdn/joao.jpg',
      }),
    });
    expect(exerciseDemoGifUrl(joao.exercises[0])).toContain('exerciseId=0025');
    const summary = summarizeExerciseGymMedia([joao], { exerciseId: '0025', order: 0, name: 'Agachamento' });
    expect(summary.rows[0].media?.kind).toBe('image');
    expect(summary.rows[0].media?.url).toBe('https://cdn/joao.jpg');
    expect(gymMediaListPresentation('image')).toBe('lazy-image');
  });

  it('2. GIF + vídeo: preview de lista é ícone, não player', () => {
    const maria = patient({
      id: 'p2',
      name: 'Maria',
      gifUrl: '/gifs/0025.gif',
      media: gymMedia({
        patientUserId: 'uid_p2',
        exerciseId: '0025',
        kind: 'video',
        url: 'https://cdn/maria.mp4',
      }),
    });
    expect(exerciseDemoGifUrl(maria.exercises[0])).toBe('/gifs/0025.gif');
    const summary = summarizeExerciseGymMedia([maria], { exerciseId: '0025' });
    expect(summary.rows[0].media?.kind).toBe('video');
    expect(gymMediaListPresentation('video')).toBe('play-icon');
  });

  it('3. GIF sem gym media', () => {
    const joao = patient({
      id: 'p1',
      name: 'João',
      gifUrl: '/api/exercisedb/image?exerciseId=0025&resolution=360',
    });
    const summary = summarizeExerciseGymMedia([joao], { exerciseId: '0025' });
    expect(exerciseDemoGifUrl(joao.exercises[0])).toBeTruthy();
    expect(summary.withMedia).toBe(0);
    expect(summary.rows[0].media).toBeNull();
  });

  it('4. gym media sem GIF usa fallback do exerciseId', () => {
    const joao = patient({
      id: 'p1',
      name: 'João',
      media: gymMedia({ patientUserId: 'uid_p1', exerciseId: '0025', kind: 'image' }),
    });
    expect(joao.exercises[0].gifUrl).toBeUndefined();
    expect(exerciseDemoGifUrl({ exerciseId: '0025' })).toBe(
      '/api/exercisedb/image?exerciseId=0025&resolution=360'
    );
    expect(exerciseDemoGifUrl({})).toBe('');
    const summary = summarizeExerciseGymMedia([joao], { exerciseId: '0025' });
    expect(summary.withMedia).toBe(1);
  });

  it('5. um paciente: a mídia é João + exerciseId', () => {
    const joao = patient({
      id: 'p1',
      name: 'João',
      media: gymMedia({ patientUserId: 'uid_p1', exerciseId: '0025', kind: 'image' }),
    });
    const summary = summarizeExerciseGymMedia([joao], { exerciseId: '0025' });
    expect(summary.total).toBe(1);
    expect(summary.rows[0].name).toBe('João');
    expect(summary.rows[0].exerciseId).toBe('0025');
    expect(summary.rows[0].patientUserId).toBe('uid_p1');
  });

  it('6. vários pacientes com mídias diferentes não escolhe uma arbitrariamente', () => {
    const patients = [
      patient({
        id: 'p1',
        name: 'João',
        media: gymMedia({
          patientUserId: 'uid_p1',
          exerciseId: '0025',
          kind: 'image',
          url: 'https://cdn/joao.jpg',
        }),
      }),
      patient({
        id: 'p2',
        name: 'Maria',
        media: gymMedia({
          patientUserId: 'uid_p2',
          exerciseId: '0025',
          kind: 'video',
          url: 'https://cdn/maria.mp4',
        }),
      }),
      patient({ id: 'p3', name: 'Carlos' }),
      patient({
        id: 'p4',
        name: 'Ana',
        media: gymMedia({
          patientUserId: 'uid_p4',
          exerciseId: '0025',
          kind: 'image',
          url: 'https://cdn/ana.jpg',
        }),
      }),
    ];
    const summary = summarizeExerciseGymMedia(patients, { exerciseId: '0025', order: 0, name: 'Agachamento' });
    expect(summary.rows.map((row) => row.media?.url || null)).toEqual([
      'https://cdn/joao.jpg',
      'https://cdn/maria.mp4',
      null,
      'https://cdn/ana.jpg',
    ]);
    expect(summary.rows[1].media?.kind).toBe('video');
    expect(summary.rows[2].media).toBeNull();
  });

  it('7. contador 3/4 correto', () => {
    const patients = [
      patient({
        id: 'p1',
        name: 'João',
        media: gymMedia({ patientUserId: 'uid_p1', exerciseId: '0025', kind: 'image' }),
      }),
      patient({
        id: 'p2',
        name: 'Maria',
        media: gymMedia({ patientUserId: 'uid_p2', exerciseId: '0025', kind: 'video' }),
      }),
      patient({ id: 'p3', name: 'Carlos' }),
      patient({
        id: 'p4',
        name: 'Ana',
        media: gymMedia({ patientUserId: 'uid_p4', exerciseId: '0025', kind: 'image' }),
      }),
    ];
    const summary = summarizeExerciseGymMedia(patients, { exerciseId: '0025' });
    expect(summary.withMedia).toBe(3);
    expect(summary.total).toBe(4);
  });

  it('10-11. upload/alterar usa paciente + exerciseId corretos e substitui só aquele', () => {
    const patients = [
      patient({
        id: 'p1',
        name: 'João',
        media: gymMedia({
          patientUserId: 'uid_p1',
          exerciseId: '0025',
          kind: 'image',
          url: 'https://cdn/joao-old.jpg',
        }),
      }),
      patient({
        id: 'p2',
        name: 'Maria',
        media: gymMedia({
          patientUserId: 'uid_p2',
          exerciseId: '0025',
          kind: 'video',
          url: 'https://cdn/maria.mp4',
        }),
      }),
    ];
    const joao = gymMediaUploadTarget({
      pacienteId: 'p1',
      exerciseId: '0025',
    });
    expect(joao).toEqual({ pacienteId: 'p1', exerciseId: '0025' });
    const replacement = gymMedia({
      patientUserId: 'uid_p1',
      exerciseId: '0025',
      kind: 'image',
      url: 'https://cdn/joao-new.jpg',
    });
    const summary = summarizeExerciseGymMedia(patients, { exerciseId: '0025' }, {
      [gymMediaOverrideKey('uid_p1', '0025')]: replacement,
    });
    expect(summary.rows[0].media?.url).toBe('https://cdn/joao-new.jpg');
    expect(summary.rows[1].media?.url).toBe('https://cdn/maria.mp4');
  });

  it('12-14. patch de prescrição não inclui gym media; override não muta o card', () => {
    const joao = patient({
      id: 'p1',
      name: 'João',
      media: gymMedia({ patientUserId: 'uid_p1', exerciseId: '0025', kind: 'image' }),
    });
    const original = joao.gymMedia[0];
    const draft = createBulkEditDraft(buildBulkEditViewModel([joao]));
    draft.exercises[0].series[0].reps = {
      ...draft.exercises[0].series[0].reps,
      value: 15,
      dirty: true,
    };
    const patch = buildPatchFromDraft(draft);
    expect(JSON.stringify(patch)).not.toMatch(/gymMedia|exerciseGymMedia/);
    expect(patch.exercises[0].kind).toBe('keep');

    summarizeExerciseGymMedia([joao], { exerciseId: '0025' }, {
      [gymMediaOverrideKey('uid_p1', '0025')]: null,
    });
    expect(joao.gymMedia[0]).toBe(original);

    const removed = createBulkEditDraft(buildBulkEditViewModel([joao]));
    removed.exercises[0].removed = true;
    const removePatch = buildPatchFromDraft(removed);
    expect(removePatch.exercises[0].kind).toBe('remove');
    expect(JSON.stringify(removePatch)).not.toMatch(/gymMedia|exerciseGymMedia/);
  });

  it('15. outro paciente não recebe mídia no resumo nem no target de upload', () => {
    const joao = patient({
      id: 'p1',
      name: 'João',
      media: gymMedia({ patientUserId: 'uid_p1', exerciseId: '0025', kind: 'image' }),
    });
    const maria = patient({ id: 'p2', name: 'Maria' });
    const summary = summarizeExerciseGymMedia([joao, maria], { exerciseId: '0025' });
    expect(summary.rows[1].media).toBeNull();
    expect(gymMediaUploadTarget(summary.rows[1])).toEqual({
      pacienteId: 'p2',
      exerciseId: '0025',
    });
    expect(gymMediaUploadTarget(summary.rows[1]).pacienteId).not.toBe('p1');
  });

  it('16. usa exerciseId resolvido, não o id do documento nem o nome', () => {
    const maria = patient({
      id: 'p2',
      name: 'Maria',
      exerciseId: '9999',
      nameEx: 'Agachamento',
      media: gymMedia({ patientUserId: 'uid_p2', exerciseId: '9999', kind: 'image', url: 'https://cdn/maria-real.jpg' }),
    });
    maria.gymMedia.push(
      gymMedia({ patientUserId: 'uid_p2', exerciseId: '0025', kind: 'video', url: 'https://cdn/wrong.mp4' })
    );
    const resolved = gymMediaForPatientExercise(maria, {
      exerciseId: '0025',
      order: 0,
      name: 'Agachamento',
    });
    expect(resolved.exerciseId).toBe('9999');
    expect(resolved.media?.url).toBe('https://cdn/maria-real.jpg');
    expect(resolved.media?.exerciseId).not.toBe(maria.exercises[0].id);
  });

  it('escopo parcial: só João e Maria entram no 1/2', () => {
    const all = [
      patient({
        id: 'p1',
        name: 'João',
        media: gymMedia({ patientUserId: 'uid_p1', exerciseId: '0025', kind: 'image' }),
      }),
      patient({ id: 'p2', name: 'Maria' }),
      patient({
        id: 'p3',
        name: 'Carlos',
        media: gymMedia({ patientUserId: 'uid_p3', exerciseId: '0025', kind: 'image' }),
      }),
      patient({
        id: 'p4',
        name: 'Ana',
        media: gymMedia({ patientUserId: 'uid_p4', exerciseId: '0025', kind: 'image' }),
      }),
    ];
    const scoped = all.filter((item) => item.pacienteId === 'p1' || item.pacienteId === 'p2');
    const summary = summarizeExerciseGymMedia(scoped, { exerciseId: '0025' });
    expect(summary.total).toBe(2);
    expect(summary.withMedia).toBe(1);
    expect(summary.rows.map((row) => row.name)).toEqual(['João', 'Maria']);
  });

  it('exercício adicionado usa o exerciseId do catálogo, não o doc de outro paciente', () => {
    const added = createAddedDraftExercise({
      exerciseId: '0405',
      name: 'Crucifixo',
      totalPatients: 2,
    });
    const key = exerciseLookupKeyFromDraft(added);
    expect(key.exerciseId).toBe('0405');
    expect(key.order).toBeUndefined();
    const joao = patient({
      id: 'p1',
      name: 'João',
      extraExerciseId: '0405',
      media: gymMedia({ patientUserId: 'uid_p1', exerciseId: '0405', kind: 'image', url: 'https://cdn/crucifixo.jpg' }),
    });
    joao.gymMedia = [
      gymMedia({ patientUserId: 'uid_p1', exerciseId: '0025', kind: 'video', url: 'https://cdn/squat.mp4' }),
      gymMedia({ patientUserId: 'uid_p1', exerciseId: '0405', kind: 'image', url: 'https://cdn/crucifixo.jpg' }),
    ];
    const summary = summarizeExerciseGymMedia([joao], key);
    expect(summary.rows[0].exerciseId).toBe('0405');
    expect(summary.rows[0].media?.url).toBe('https://cdn/crucifixo.jpg');
  });

  it('override de remoção zera só aquele paciente', () => {
    const patients = [
      patient({
        id: 'p1',
        name: 'João',
        media: gymMedia({ patientUserId: 'uid_p1', exerciseId: '0025', kind: 'image' }),
      }),
      patient({
        id: 'p2',
        name: 'Maria',
        media: gymMedia({ patientUserId: 'uid_p2', exerciseId: '0025', kind: 'video' }),
      }),
    ];
    const summary = summarizeExerciseGymMedia(patients, { exerciseId: '0025' }, {
      [gymMediaOverrideKey('uid_p2', '0025')]: null,
    });
    expect(summary.withMedia).toBe(1);
    expect(summary.rows[1].media).toBeNull();
    expect(applyGymMediaOverride(patients[0].gymMedia[0], 'uid_p1', '0025', {})?.kind).toBe('image');
  });
});
