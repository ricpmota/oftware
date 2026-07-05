import { describe, expect, it } from 'vitest';
import type { LearningImpactRecord } from '@/lib/oftpay/laudoCaseArchive';
import {
  buildOftpayLearningInsightsAdminPayload,
  parseOftpayLearningInsightsUrlFilters,
} from '@/lib/oftpay/oftpayLearningInsightsAdmin';

function makeImpactRecord(params: {
  doctorAgreement: 'agree' | 'partial' | 'disagree';
  insightsUsed: LearningImpactRecord['insightsUsed'];
  createdAt?: number;
}): LearningImpactRecord {
  return {
    createdAt: params.createdAt ?? Date.now(),
    doctorAgreement: params.doctorAgreement,
    domainsActive: ['glaucoma'],
    examTypes: ['oct_disco'],
    insightsUsed: params.insightsUsed,
  };
}

const FORBIDDEN_SUBSTRINGS = ['patient', 'caseId', 'comment', 'interpretation', 'nome', 'arquivo'];

function assertNoForbiddenPayloadJson(json: string) {
  const lower = json.toLowerCase();
  for (const s of FORBIDDEN_SUBSTRINGS) {
    expect(lower.includes(s), `payload não deve conter "${s}"`).toBe(false);
  }
}

describe('oftpayLearningInsightsAdmin', () => {
  it('monta resumo e listas a partir de impactos globais anonimizados', () => {
    const records: LearningImpactRecord[] = [
      ...Array.from({ length: 8 }).map(() =>
        makeImpactRecord({
          doctorAgreement: 'agree',
          insightsUsed: [
            {
              type: 'success_pattern',
              relatedDomain: 'glaucoma',
              relatedExamType: 'oct_disco',
              patternId: 'pid1:success_pattern|oct_disco|glaucoma|unclassified',
            },
          ],
        })
      ),
      makeImpactRecord({
        doctorAgreement: 'disagree',
        insightsUsed: [
          {
            type: 'success_pattern',
            relatedDomain: 'glaucoma',
            relatedExamType: 'oct_disco',
            patternId: 'pid1:success_pattern|oct_disco|glaucoma|unclassified',
          },
        ],
      }),
    ];

    const payload = buildOftpayLearningInsightsAdminPayload(records, {
      nowMs: 1_700_000_000_000,
      summaryTopN: 5,
      listLimit: 10,
    });

    expect(payload.impactRecordsLoaded).toBe(9);
    expect(payload.summary.totalInsights).toBeGreaterThanOrEqual(1);
    expect(payload.summary.promisingCount + payload.summary.mixedCount + payload.summary.weakSignalCount + payload.summary.insufficientDataCount).toBe(
      payload.summary.totalInsights
    );
    expect(payload.topPromising.length).toBeGreaterThan(0);
    expect(payload.topPromising[0]?.patternIdOrKey).toContain('pid1:');
    expect(payload.filtersApplied.aggregation).toEqual({});
    expect(payload.filtersApplied.post).toEqual({});

    assertNoForbiddenPayloadJson(JSON.stringify(payload));
  });

  it('filtro de agregação por domínio restringe linhas', () => {
    const records: LearningImpactRecord[] = [
      makeImpactRecord({
        doctorAgreement: 'agree',
        insightsUsed: [{ type: 'error_pattern', relatedDomain: 'retina', relatedExamType: 'oct_macula' }],
      }),
      makeImpactRecord({
        doctorAgreement: 'agree',
        insightsUsed: [{ type: 'error_pattern', relatedDomain: 'glaucoma', relatedExamType: 'oct_disco' }],
      }),
    ];

    const all = buildOftpayLearningInsightsAdminPayload(records, { minVolume: 1 });
    const filtered = buildOftpayLearningInsightsAdminPayload(records, {
      minVolume: 1,
      aggregationFilters: { relatedDomain: 'glaucoma' },
    });

    expect(all.summary.totalInsights).toBe(2);
    expect(filtered.summary.totalInsights).toBe(1);
    expect(filtered.topPromising[0]?.relatedDomain).toBe('glaucoma');
  });

  it('filtro pós-agregação por effectivenessStatus reduz o conjunto', () => {
    const records: LearningImpactRecord[] = [
      ...Array.from({ length: 8 }).map(() =>
        makeImpactRecord({
          doctorAgreement: 'agree',
          insightsUsed: [{ type: 'success_pattern', relatedDomain: 'cornea', patternId: 'pid-promising' }],
        })
      ),
      ...Array.from({ length: 8 }).map(() =>
        makeImpactRecord({
          doctorAgreement: 'disagree',
          insightsUsed: [{ type: 'error_pattern', relatedDomain: 'cornea', patternId: 'pid-weak' }],
        })
      ),
    ];

    const payload = buildOftpayLearningInsightsAdminPayload(records, {
      minVolume: 5,
      postFilters: { effectivenessStatus: 'promising' },
    });
    expect(payload.summary.totalInsights).toBe(1);
    for (const row of [...payload.topPromising, ...payload.weakeningSignals, ...payload.lowDataSignals]) {
      expect(row.effectivenessStatus).toBe('promising');
    }
  });

  it('parse de query string do endpoint aplica filtros esperados', () => {
    const u = new URL('http://local.test/api?relatedDomain=retina&relatedExamType=oct_macula&effectivenessStatus=promising&stabilityStatus=volatile');
    const { aggregation, post } = parseOftpayLearningInsightsUrlFilters(u.searchParams);
    expect(aggregation).toEqual({ relatedDomain: 'retina', relatedExamType: 'oct_macula' });
    expect(post).toEqual({ effectivenessStatus: 'promising', stabilityStatus: 'volatile' });
    const empty = parseOftpayLearningInsightsUrlFilters(new URLSearchParams());
    expect(empty.aggregation).toEqual({});
    expect(empty.post).toEqual({});
  });

  it('linhas serializadas expõem apenas campos técnicos esperados', () => {
    const records: LearningImpactRecord[] = Array.from({ length: 6 }).map(() =>
      makeImpactRecord({
        doctorAgreement: 'agree',
        insightsUsed: [{ type: 'uncertainty_pattern', relatedDomain: 'glaucoma' }],
      })
    );
    const payload = buildOftpayLearningInsightsAdminPayload(records, { minVolume: 1, listLimit: 5 });
    const row = payload.topPromising[0] ?? payload.weakeningSignals[0] ?? payload.lowDataSignals[0];
    expect(row).toBeDefined();
    const keys = Object.keys(row!).sort();
    expect(keys).toEqual(
      [
        'agreeRate',
        'disagreeRate',
        'effectivenessStatus',
        'partialRate',
        'patternIdOrKey',
        'recentAgreeRate',
        'recentUses',
        'relatedDomain',
        'relatedExamType',
        'stabilityStatus',
        'totalUses',
        'type',
      ].sort()
    );
  });
});
