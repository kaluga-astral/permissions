import { describe, expect, it } from 'vitest';

import { DenialPermission } from './Permission';

describe('DenialPermission', () => {
  it('hasReason возвращает true, если причина соответствует отказу', () => {
    const denialPermission = new DenialPermission('test');

    expect(denialPermission.hasReason('test')).toBeTruthy();
  });
});
