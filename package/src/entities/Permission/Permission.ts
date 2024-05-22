import type { DenialReason } from '../../types';

export class AllowedPermission {
  public isAllowed: true = true;

  // По факту в AllowedPermission причины никогда не будет. Тип нужен для обратной совместимости с DenialPermission
  public reason?: DenialReason;
}

export class DenialPermission {
  public isAllowed: false = false;

  /**
   * Причина отказа в доступе
   */
  public reason: DenialReason;

  constructor(reason: DenialReason) {
    this.reason = reason;
  }

  /**
   * Позволяет определить по какой причине было отказано в доступе
   * @example permission.hasReason(DenialReason.NoAdmin)
   */
  public hasReason = (reason: DenialReason) => reason === this.reason;
}

export type Permission = AllowedPermission | DenialPermission;

export const createAllowedPermission = () => new AllowedPermission();

export const createDenialPermission = (reason: DenialReason) =>
  new DenialPermission(reason);
