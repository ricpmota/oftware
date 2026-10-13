import { describe, expect, it } from 'vitest';
import { createAutomationExecutionId, createAutomationRunId } from '@/lib/automation/executionId';

describe('createAutomationExecutionId', () => {
  it('inclui canal, org, recurso, ação e uuid', () => {
    const id = createAutomationExecutionId({
      channel: 'email',
      organizationId: 'metodo',
      resourceId: 'lead123',
      actionType: 'email1',
    });
    expect(id.startsWith('email:metodo:lead123:email1:')).toBe(true);
    expect(id.split(':').length).toBeGreaterThanOrEqual(5);
  });
});

describe('createAutomationRunId', () => {
  it('prefixa run com canal e org', () => {
    const id = createAutomationRunId({ channel: 'email', organizationId: 'metodo' });
    expect(id.startsWith('run:email:metodo:')).toBe(true);
  });
});
