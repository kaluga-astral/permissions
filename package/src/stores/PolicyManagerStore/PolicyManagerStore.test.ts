import { describe, expect, it, vi } from 'vitest';

import { SystemDenialReason } from '../../enums';

import { PolicyManagerStore } from './PolicyManagerStore';

describe('PolicyManagerStore', () => {
  describe('PreparingDataStatus', () => {
    it('Находится в idle состоянии при инициализации', () => {
      const sut = new PolicyManagerStore();

      expect(sut.preparingDataStatus).toEqual({
        isIdle: true,
        isSuccess: false,
        isLoading: false,
        isError: false,
      });
    });

    it('Переходит в loading состояние при вызове prepareData', () => {
      const sut = new PolicyManagerStore();

      sut.prepareDataSync();

      expect(sut.preparingDataStatus).toEqual({
        isIdle: false,
        isSuccess: false,
        isLoading: true,
        isError: false,
      });
    });

    it('Переходит в success состояние после успешного вызова prepareData', async () => {
      const sut = new PolicyManagerStore();

      await sut.prepareDataAsync();

      expect(sut.preparingDataStatus).toEqual({
        isIdle: false,
        isSuccess: true,
        isLoading: false,
        isError: false,
      });
    });

    it('Переходит в error состояние после падения prepareData', async () => {
      const sut = new PolicyManagerStore();

      sut.createPolicy({
        name: 'test',
        prepareData: () => Promise.reject(),
      });

      await sut.prepareDataAsync().catch(() => {});

      expect(sut.preparingDataStatus).toMatchObject({
        isIdle: false,
        isSuccess: false,
        isLoading: false,
        isError: true,
      });
    });

    it('Содержит error, полученный при падении одного из prepareData', async () => {
      const sut = new PolicyManagerStore();

      const errorMock = new Error('test Error');

      sut.createPolicy({
        name: 'test',
        prepareData: () => Promise.reject(errorMock),
      });

      await sut.prepareDataAsync().catch(() => {});
      expect(sut.preparingDataStatus.error).toEqual(errorMock);
    });
  });

  describe('prepareData', () => {
    it('Вызывает все prepareData переданные при вызове createPolicy', () => {
      const prepareData1Spy = vi.fn();
      const prepareData2Spy = vi.fn();

      const sut = new PolicyManagerStore();

      sut.createPolicy({ name: 'test1', prepareData: prepareData1Spy });
      sut.createPolicy({ name: 'test2', prepareData: prepareData2Spy });
      sut.prepareDataSync();
      expect(prepareData1Spy).toBeCalled();
      expect(prepareData2Spy).toBeCalled();
    });
  });

  describe('policy.createPermission', () => {
    it('Разрешает доступ при вызове allow', async () => {
      const manager = new PolicyManagerStore();
      const sut = manager.createPolicy({
        name: 'test',
        prepareData: async () => {},
      });

      await manager.prepareDataAsync();

      const permission = sut.createPermission((allow) => {
        allow();
      });

      expect(permission.isAllowed).toBeTruthy();
    });

    it('Запрещает доступ с переданным reason при вызове deny', async () => {
      const manager = new PolicyManagerStore();
      const sut = manager.createPolicy({
        name: 'test',
        prepareData: async () => {},
      });

      await manager.prepareDataAsync();

      const permission = sut.createPermission((_, deny) => {
        deny('test');
      });

      expect(permission.reason).toBe('test');
    });

    it('Запрещает доступ с причиной MissingData, если на момент вызова не были запрошены данные для формирования доступов', async () => {
      const manager = new PolicyManagerStore();
      const sut = manager.createPolicy({
        name: 'test',
        prepareData: async () => {},
      });

      const permission = sut.createPermission((allow) => {
        allow();
      });

      expect(permission.isAllowed).toBeFalsy();
      expect(permission.reason).toBe(SystemDenialReason.MissingData);
    });

    it('Запрещает доступ с причиной MissingData, если запрос на получение данных для доступ упал с ошибкой', async () => {
      const manager = new PolicyManagerStore();
      const sut = manager.createPolicy({
        name: 'test',
        prepareData: async () => Promise.reject(),
      });

      await manager.prepareDataAsync().catch(() => {});

      const permission = sut.createPermission((allow) => {
        allow();
      });

      expect(permission.isAllowed).toBeFalsy();
      expect(permission.reason).toBe(SystemDenialReason.MissingData);
    });

    it('Запрещает доступ с причиной InternalError, если не был вызван ни allow, ни deny', async () => {
      const manager = new PolicyManagerStore();
      const sut = manager.createPolicy({
        name: 'test',
        prepareData: async () => {},
      });

      await manager.prepareDataAsync();

      const permission = sut.createPermission(() => {});

      expect(permission.isAllowed).toBeFalsy();
      expect(permission.reason).toBe(SystemDenialReason.InternalError);
    });
  });
});
