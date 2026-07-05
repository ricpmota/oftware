import type {
  EyeSide,
  RetinaStructuredFindings,
  RetinaStructuredFindingsByEye,
} from '@/types/oftpay/retinaMap';

export function createEmptyStructuredFindings(): RetinaStructuredFindings {
  return {
    vitreo: {},
    disco: {},
    macula: {},
    vasos: {},
    periferia: {},
    achados_especificos: {},
    conclusao: {},
    conduta: {},
  };
}

export function createEmptyStructuredByEye(): RetinaStructuredFindingsByEye {
  return {
    OD: createEmptyStructuredFindings(),
    OE: createEmptyStructuredFindings(),
  };
}

export function updateStructuredForEye(
  byEye: RetinaStructuredFindingsByEye,
  eye: EyeSide,
  patch: Partial<RetinaStructuredFindings>
): RetinaStructuredFindingsByEye {
  return {
    ...byEye,
    [eye]: {
      ...byEye[eye],
      ...patch,
    },
  };
}
