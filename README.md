# @astral/permissions

Пакет содержит функционал, необходимый для реализации [единого паттерна разграничения доступов на клиенте](https://kaluga-astral.github.io/guides/docs/category/%D1%80%D0%B0%D0%B7%D0%B3%D1%80%D0%B0%D0%BD%D0%B8%D1%87%D0%B5%D0%BD%D0%B8%D0%B5-%D0%B4%D0%BE%D1%81%D1%82%D1%83%D0%BF%D0%BE%D0%B2-permissions).

Пакет предоставляет функции:
- Создание policies
- Централизованная подготовка данных для формирования доступов
- Создание permissions
  - Обработка разных причин отказа
- Создание rules
- Debug режим для логирования причин отклоненных доступов

## PolicyManagerStore

`PolicyManagerStore` отвечает за:
- Создание policy
- Централизованную подготовку данных для формирования доступов

### Инициализация

`PolicyManagerStore` должен являться singletone и создаваться в единой точке доступа к доступам:

```ts
/**
 * Содержит все доступы приложения
 */
export class PermissionsStore {
  private readonly policyManager: PolicyManagerStore;

  public readonly administration: AdministrationPolicyStore;

  constructor(billingRepo: BillingRepository, userRepo: UserRepository) {
    makeAutoObservable(this, {}, { autoBind: true });
    
    this.policyManager = createPolicyManagerStore();

    this.administration = createAdministrationPolicyStore(
      this.policyManager,
      userRepo,
    );
  }
}
```

## `PolicyManagerStore.createPolicy`

`PolicyManagerStore.createPolicy` предназначен для создания policies.

Пример создания policy:

```ts
import { makeAutoObservable } from 'mobx';

import type { UserRepository } from '@example/data';

import { PermissionDenialReason } from '../../../../enums';

import { PolicyManagerStore, Policy } from '@astral/permissions';

export class AdministrationPolicyStore {
  private readonly policy: Policy;

  constructor(
    private readonly policyManager: PolicyManagerStore,
    private readonly userRepo: UserRepository,
  ) {
    makeAutoObservable(this, {}, { autoBind: true });

    this.policy = this.policyManager.createPolicy({
      name: 'administration',
      // Метод для подготовки данных необходимых для формирования доступов AdministrationPolicy
      prepareData: async (): Promise<void> => {
        await Promise.all([this.userRepo.getRolesQuery().async()]);
      },
    });
  }
}
```

## Создание permissions

Permissions создаются с помощью метода `policy.createPermission`:

```ts
export class AdministrationPolicyStore {
  private readonly policy: Policy;

  constructor(
    private readonly policyManager: PolicyManagerStore,
    private readonly userRepo: UserRepository,
  ) {
    makeAutoObservable(this, {}, { autoBind: true });

    this.policy = this.policyManager.createPolicy({
      name: 'administration',
      prepareData: async (): Promise<void> => {
        await Promise.all([this.userRepo.getRolesQuery().async()]);
      },
    });
  }

  /**
   * Доступ к действиям администратора
   */
  public get administrationActions() {
    return this.policy.createPermission((allow, deny) => {
      if (this.userRepo.getRolesQuery().data?.isAdmin) {
          return allow();
      }

      deny(PermissionDenialReason.NoAdmin);
    });
  }
}
```

`createPermission` принимает функцию-стратегию с двумя аргументами:
- allow - вызов разрешает доступ
- deny - вызов запрещает доступ. Принимает причину отказа в доступе

`createPermission` возвращает объект вида:
```ts
type Permission = {
  isAllowed: boolean;
  /**
   * Причина отказа в доступе
   */
  reason?: string;
  /**
   * @example permission.hasReason(DenialReason.NoAdmin)
   */
  hasReason: (reason: string) => boolean;
};
```

## Причины отказа в доступе

`deny` обязательно принимает причину отказа в доступе.

Причины должны описываться в едином enum, но пакет @astral/permissions содержит системные причины отказа `SystemDenialReason`:
```ts
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
```

Для того чтобы все причины были в одном enum, необходимо объединить продуктовый enum с причинами из пакета:
```ts
import { SystemDenialReason } from '@astral/permissions';

export enum PermissionsDenialReason {
  /**
   * При расчете доступа произошла ошибка
   * **/
  InternalError = SystemDenialReason.InternalError,
  /**
   * Недостаточно данных для формирования доступа
   * **/
  MissingData = SystemDenialReason.MissingData,
  /**
   * Пользователь не является админом
   * **/
  NoAdmin = 'no-admin',
}
```

### Системные причины отказа в доступе
- Если на момент вычисления доступов не были подготовлены данные (не был вызван `prepareData`), то permission будет отказан с reason: `SystemDenialReason.MissingData`.
- Если при вычислении доступов не был вызван ни `allow`, ни `deny`, то permission будет отказан с reason: `SystemDenialReason.InternalError`.

## Обработка причин отказа в доступе

Обрабатывать причины отказа в доступе можно либо через оператор `===`:
```ts
permissions.books.addingToShelf.reason === PermissionsDenialReason.NoAdmin
```

Либо через метод `hasReason`:
```ts
permissions.books.addingToShelf.hasReason(PermissionsDenialReason.NoAdmin)
```

**Пример**:
```ts
export class UIStore {
  public isOpenPayAccount = false;

  constructor(
    private readonly bookId: string,
    private readonly permissions: PermissionsStore,
    private readonly notifyService: Notify,
  ) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  public addToShelf = () => {
      if (this.permissions.books.addingToShelf.isAllowed) {
        this.notifyService.info(`Книга ${this.bookId} добавлена на полку`);

        return;
      }

      if (this.permissions.books.addingToShelf.hasReason(PermissionsDenialReason.NoPay)) {
        this.openPaymentAccount();

        return;
      }

      if (
        this.permissions.books.addingToShelf.hasReason(PermissionsDenialReason.ExceedReadingCount)
      ) {
        this.notifyService.error(
          'Достигнуто максимальное количество книг на полке',
        );

        return;
      }

      this.notifyService.error(
        'Добавить книгу на полку нельзя. Попробуйте перезагрузить страницу',
      );
  };

  public openPayAccount = () => {
    this.isOpenPayAccount = true;
  };

  public closePayAccount = () => {
    this.isOpenPayAccount = false;
  };
}
```

## Подготовка данных для формирования доступов

Каждый policy при создании посредством `PolicyManagerStore.createPolicy` указывает метод `prepareData`, подготавливающий данные для формирования доступов:
```ts
import { makeAutoObservable } from 'mobx';

import type { UserRepository } from '@example/data';

import { PermissionDenialReason } from '../../../../enums';

import { PolicyManagerStore, Policy } from '@astral/permissions';

export class AdministrationPolicyStore {
  private readonly policy: Policy;

  constructor(
    private readonly policyManager: PolicyManagerStore,
    private readonly userRepo: UserRepository,
  ) {
    makeAutoObservable(this, {}, { autoBind: true });

    this.policy = this.policyManager.createPolicy({
      name: 'administration',
      // Метод для подготовки данных необходимых для формирования доступов AdministrationPolicy
      prepareData: async (): Promise<void> => {
        await Promise.all([this.userRepo.getRolesQuery().async()]);
      },
    });
  }
}
```

Далее для централизованной подготовки данных для всех policy, необходимо создать `PermissionsStore`:
```ts
export class PermissionsStore {
  private readonly policyManager: PolicyManagerStore;

  public readonly administration: AdministrationPolicyStore;

  constructor(billingRepo: BillingRepository, userRepo: UserRepository) {
    makeAutoObservable(this, {}, { autoBind: true });
    this.policyManager = createPolicyManagerStore();

    this.administration = createAdministrationPolicyStore(
      this.policyManager,
      userRepo,
    );
  }

  /**
   * Подготавливает данные для формирования доступов
   */
  public prepareData = () => this.policyManager.prepareDataSync();

  public get preparingDataStatus() {
    return this.policyManager.preparingDataStatus;
  }
}
```

`PermissionsStore.prepareData` загрузит все необходимые данные для каждого policy, созданного через `PolicyManagerStore.createPolicy`.

`preparingDataStatus` будет содержать объект:
```ts
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
```

## Создание rules

`createRule` позволяет создавать правила, переиспользуемые между policies:
```ts
import { createRule } from '@astral/permissions';

import { getDateYearDiff } from '@example/shared';

import { PermissionDenialReason } from '../../../../enums';

export const calcAcceptableAge = (
  acceptableAge?: number,
  userBirthday?: string,
) =>
  createRule((allow, deny) => {
    if (!acceptableAge) {
      return deny(PermissionDenialReason.MissingData);
    }

    if (!userBirthday) {
      return deny(PermissionDenialReason.MissingUserAge);
    }

    if (
      Math.abs(getDateYearDiff(new Date(userBirthday), new Date())) <
      acceptableAge
    ) {
      return deny(PermissionDenialReason.NotForYourAge);
    }

    allow();
  });
```

Пример использования:
```ts
export class PaymentPolicyStore {
    
  ...

  /**
   * Возможность оплатить товар
   */
  public calcPayment = (acceptableAge: number) =>
    this.policy.processPermission((allow, deny) => {
      // calcAcceptableAge - правило, полностью реализующее calcPayment permission
      const agePermission = calcAcceptableAge(
        acceptableAge,
        this.userRepo.getPersonInfoQuery().data?.birthday,
      );

      if (!agePermission.isAllowed) {
        return deny(agePermission.reason);
      }

      allow();
    });
}
```

## Debug режим

`PolicyManagerStore` позволяет при включении debug режима показывать логи при отказе в доступе:

```ts
export class PermissionsStore {
  private readonly policyManager: PolicyManagerStore;

  public readonly administration: AdministrationPolicyStore;

  constructor(billingRepo: BillingRepository, userRepo: UserRepository) {
    makeAutoObservable(this, {}, { autoBind: true });
    
    this.policyManager = createPolicyManagerStore({ isDebug: true });

    this.administration = createAdministrationPolicyStore(
      this.policyManager,
      userRepo,
    );
  }
}
```

Пример логов:

```
[@astral/permissions]/Policy:administration: При вычислении доступа не был вызван ни allow, ни deny Error: При вычислении доступа не был вызван ни allow, ни deny
```
