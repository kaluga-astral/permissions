/**
 * Причины отказа в доступе, связанные с проблемами в коде
 */
export enum SystemDenialReason {
  /**
   * При расчете доступа произошла ошибка
   * **/
  InternalError = 'internal-error',
  /**
   * Недостаточно данных для формирования доступа
   * **/
  MissingData = 'missing-data',
}
