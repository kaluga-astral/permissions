import type { DenialReason, Rule } from '../../types';
import { SystemDenialReason } from '../../enums';
import {
  type Permission,
  createAllowedPermission,
  createDenialPermission,
} from '../../entities';

/**
 * Создает правило, которые можно переиспользовать между permissions
 * @example
 * const calcAcceptableAge = (
 *   acceptableAge?: number,
 *   userBirthday?: string,
 * ) =>
 *   createRule((allow, deny) => {
 *     if (!acceptableAge) {
 *       return deny(PermissionDenialReason.MissingData);
 *     }
 *
 *     if (!userBirthday) {
 *       return deny(PermissionDenialReason.MissingUserAge);
 *     }
 *
 *     if (
 *       Math.abs(getDateYearDiff(new Date(userBirthday), new Date())) <
 *       acceptableAge
 *     ) {
 *       return deny(PermissionDenialReason.NotForYourAge);
 *     }
 *
 *     allow();
 *   });
 */
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
