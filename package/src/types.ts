import { type Permission } from './entities';

export type DenialReason = string;

export type Rule = (
  allow: () => void,
  deny: (reason: DenialReason) => void,
) => void;

export type PermissionStrategy = Rule;

export type Policy = {
  name: string;
  /**
   * Создает доступ
   * @example
   * public get administrationActions() {
   *     return this.policy.createPermission((allow, deny) => {
   *       if (this.userRepo.getRolesQuery().data?.isAdmin) {
   *         return allow();
   *       }
   *
   *       deny(PermissionDenialReason.NoAdmin);
   *     });
   *   }
   */
  createPermission: (strategy: PermissionStrategy) => Permission;
};
