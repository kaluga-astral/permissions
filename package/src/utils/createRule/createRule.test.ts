import { describe, expect, it } from 'vitest';

import { SystemDenialReason } from '../../enums';

import { createRule } from './createRule';

describe('createRule', () => {
  it('Возвращается AllowPermission при вызове allow', () => {
    const rule = () =>
      createRule((allow) => {
        allow();
      });

    expect(rule().isAllowed).toBeTruthy();
  });

  it('Возвращается DenialPermission с reason при вызове deny', () => {
    const rule = () =>
      createRule((_, deny) => {
        deny('test');
      });

    expect(rule().isAllowed).toBeFalsy();
    expect(rule().reason).toBe('test');
  });

  it('Отказ в доступе, если не был вызван ни deny, ни allow', () => {
    const rule = () => createRule(() => {});

    expect(rule().isAllowed).toBeFalsy();
    expect(rule().reason).toBe(SystemDenialReason.InternalError);
  });
});
