import { makeAutoObservable } from 'mobx';

import { Logger } from '../../services';
import {
  type Permission,
  createAllowedPermission,
  createDenialPermission,
} from '../../entities';
import type { DenialReason, PermissionStrategy, Policy } from '../../types';
import { SystemDenialReason } from '../../enums';

type PrepareData = () => Promise<void>;

type PreparingDataStatus = {
  /**
   * Был ли хоть раз выполнен prepareData
   */
  isIdle: boolean;
  isSuccess: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
};

type CreationPolicyParams =
  | {
      name: string;
      withoutDataPreparation?: false;
      prepareData: PrepareData;
    }
  | {
      name: string;
      withoutDataPreparation: true;
    };

type PolicyMeta = {
  name: string;
  prepareData: PrepareData;
};

type Config = {
  isDebug?: boolean;
};

/**
 * Управляет policies и доступами: создает доступы, контролирует подготовку данных для формирования доступов
 */
export class PolicyManagerStore {
  /**
   * Статус подготовки данных для формирования доступов
   */
  public preparingDataStatus: PreparingDataStatus = {
    isIdle: true,
    isSuccess: false,
    isLoading: false,
    isError: false,
  };

  private policies: PolicyMeta[] = [];

  private readonly logger: Logger;

  constructor({ isDebug }: Config = {}) {
    makeAutoObservable(this, {}, { autoBind: true });
    this.logger = new Logger({ isEnabled: isDebug ?? false });
  }

  private calcPermission = (
    policyLogger: Logger,
    strategy: PermissionStrategy,
  ) => {
    if (!this.preparingDataStatus.isSuccess) {
      if (this.preparingDataStatus.isIdle) {
        policyLogger.warn(
          'Не были получены данные для формирования доступа потому, что prepareData не был вызван',
        );
      } else {
        policyLogger.warn(
          'Не были получены данные для формирования доступа потому, что вызов prepareData завершился с ошибкой',
        );
      }

      return createDenialPermission(SystemDenialReason.MissingData);
    }

    let result: Permission | null = null;

    const allow = () => {
      result = createAllowedPermission();
    };

    const deny = (reason: DenialReason) => {
      policyLogger.info(`Отказано в доступе с причиной ${reason}`);
      result = createDenialPermission(reason);
    };

    strategy(allow, deny);

    if (result === null) {
      result = createDenialPermission(SystemDenialReason.InternalError);
    }

    if (result?.reason === SystemDenialReason.InternalError) {
      policyLogger.error(
        new Error('При вычислении доступа не был вызван ни allow, ни deny'),
      );
    }

    return result;
  };

  private startPreparingData = () => {
    this.preparingDataStatus.isIdle = false;
    this.preparingDataStatus.isLoading = true;
    this.preparingDataStatus.isSuccess = false;
    this.preparingDataStatus.isError = false;
    this.preparingDataStatus.error = undefined;
  };

  private successPreparingData = () => {
    this.preparingDataStatus.isLoading = false;
    this.preparingDataStatus.isSuccess = true;
  };

  private failPreparingData = (err: Error) => {
    this.preparingDataStatus.isLoading = false;
    this.preparingDataStatus.isError = true;
    this.preparingDataStatus.error = err;
  };

  /**
   * Подготавливает данные для формирования доступов всех policy
   */
  public prepareDataSync = () => {
    this.startPreparingData();

    Promise.all(this.policies.map(({ prepareData }) => prepareData()))
      .then(() => {
        this.successPreparingData();
      })
      .catch((err) => {
        this.failPreparingData(err);
      });
  };

  /**
   * Подготавливает данные для формирования доступов всех policy
   */
  public prepareDataAsync = async () => {
    this.startPreparingData();

    try {
      await Promise.all(this.policies.map(({ prepareData }) => prepareData()));
      this.successPreparingData();
    } catch (err) {
      this.failPreparingData(err as Error);

      throw err;
    }
  };

  /**
   * Позволяет централизованно подготавливать данные для всех policy приложения и создавать permission
   * @example managerStore.createPolicy({
   *   name: 'administration',
   *   prepareData: async () => {
   *     await Promise.all([
   *       userRepo.getPersonInfoQuery().async(),
   *       billingRepo.getBillingInfoQuery().async(),
   *     ])
   *   },
   * });
   */
  public createPolicy = (policyMeta: CreationPolicyParams): Policy => {
    this.policies.push({
      prepareData: async () => undefined,
      ...policyMeta,
    });

    const policyLogger = this.logger.createPolicyLogger(policyMeta.name);

    return {
      name: policyMeta.name,
      /**
       * Создает доступ, учитывая статус успешности подготовки данных
       */
      createPermission: (strategy: PermissionStrategy) =>
        this.calcPermission(policyLogger, strategy),
    };
  };
}

export const createPolicyManagerStore = () => new PolicyManagerStore();
