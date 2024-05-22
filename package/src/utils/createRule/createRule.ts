import type { DenialReason, Rule } from '../../types';
import { SystemDenialReason } from '../../enums';
import {
  type Permission,
  createAllowedPermission,
  createDenialPermission,
} from '../../entities';

export const createRule = (rule: Rule): Permission => {
  let result: Permission | null = null;

  const allow = () => {
    result = createAllowedPermission();
  };

  const deny = (reason: DenialReason) => {
    result = createDenialPermission(reason);
  };

  rule(allow, deny);

  if (result === null) {
    result = createDenialPermission(SystemDenialReason.InternalError);
  }

  return result;
};
