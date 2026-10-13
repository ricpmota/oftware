import { describe, expect, it } from 'vitest';
import {
  classifyExerciseGymMedia,
  exerciseGymMediaDocId,
  exerciseGymMediaExt,
  guessMimeFromName,
  gymMediaBelongsToPatient,
} from './exerciseGymMedia';

describe('exerciseGymMedia', () => {
  it('gera id estável por paciente + exercício', () => {
    expect(exerciseGymMediaDocId('uid_abc', '0025')).toBe('uid_abc__0025');
    expect(exerciseGymMediaDocId(' uid_abc ', ' 0025 ')).toBe('uid_abc__0025');
  });

  it('sanitiza exerciseId no documento', () => {
    expect(exerciseGymMediaDocId('uid', 'ex/1')).toBe('uid__ex_1');
  });

  it('classifica foto e vídeo', () => {
    expect(classifyExerciseGymMedia('image/jpeg')).toBe('image');
    expect(classifyExerciseGymMedia('video/mp4')).toBe('video');
    expect(classifyExerciseGymMedia('application/pdf')).toBeNull();
  });

  it('infere mime pelo nome quando o arquivo não traz tipo', () => {
    expect(guessMimeFromName('maquina.HEIC')).toBe('image/heic');
    expect(guessMimeFromName('aparelho.mov')).toBe('video/quicktime');
  });

  it('não aceita vídeo gravado no documento de outro paciente', () => {
    const media = {
      patientUserId: 'cwU1IB6VeaUPSvfP3znRTk3AQnA2',
      patientDocId: 'MbG99xy4NveOdr9Odlax',
    };
    expect(
      gymMediaBelongsToPatient(media, {
        id: 'YZ1G00GUcdYOFAsrUwol',
        userId: 'cwU1IB6VeaUPSvfP3znRTk3AQnA2_1777996848962',
      })
    ).toBe(false);
    expect(
      gymMediaBelongsToPatient(media, {
        id: 'MbG99xy4NveOdr9Odlax',
        userId: 'cwU1IB6VeaUPSvfP3znRTk3AQnA2',
      })
    ).toBe(true);
  });

  it('escolhe extensão pelo mime', () => {
    expect(exerciseGymMediaExt('image/png')).toBe('png');
    expect(exerciseGymMediaExt('video/quicktime')).toBe('mov');
    expect(exerciseGymMediaExt('image/jpeg', 'foto.heic')).toBe('jpg');
  });
});
