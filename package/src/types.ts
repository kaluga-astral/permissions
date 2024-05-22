import { type Permission } from './entities';

export type DenialReason = string;

export type Rule = (
  allow: () => void,
  deny: (reason: DenialReason) => void,
) => void;

export type PermissionStrategy = Rule;

export type Policy = {
  name: string;
  createPermission: (strategy: PermissionStrategy) => Permission;
};
