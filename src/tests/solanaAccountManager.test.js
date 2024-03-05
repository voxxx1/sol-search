// solanaAccountManager.test.js
const fs = require('fs');
const SolanaAccountManager = require('../controllers/solanaAccountManager');
const SolanaAccount = require('../models/solanaAccount');

jest.useFakeTimers();

const accountData = {
  id: 'GzbXUY1JQwRVUf3j3myg2NbDRwD5i4jD4HJpYhVNfiDm',
  parentProgram: 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K',
  parentProgramSubType: 'some-type',
  tokens: 500000,
  data: {
    subtype_field1: true,
    subtype_field2: 999,
  },
  callbackTimeMs: 400,
  version: 123,
};

describe('SolanaAccountManager', () => {
  let manager;

  beforeEach(() => {
    manager = new SolanaAccountManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should add account', () => {
    manager.addOrUpdateAccount(accountData);
    expect(manager.accounts.size).toBe(1);
    expect(manager.accounts.get(accountData.id)).toEqual(
      new SolanaAccount(accountData)
    );
  });

  test('should update account with a newer version', () => {
    manager.addOrUpdateAccount(accountData);
    const updatedAccountData = { ...accountData, tokens: 600000, version: 124 };
    manager.addOrUpdateAccount(updatedAccountData);
    expect(manager.accounts.size).toBe(1);
    expect(manager.accounts.get(accountData.id)).toEqual(
      new SolanaAccount(updatedAccountData)
    );
  });

  test('should ignore old account versions', () => {
    manager.addOrUpdateAccount(accountData);
    const oldAccountData = { ...accountData, tokens: 400000, version: 122 };
    manager.addOrUpdateAccount(oldAccountData);
    expect(manager.accounts.size).toBe(1);
    expect(manager.accounts.get(accountData.id)).toEqual(
      new SolanaAccount(accountData)
    );
  });

  test('should schedule and execute callbacks', () => {
    manager.addOrUpdateAccount(accountData);
    expect(manager.callbacks.size).toBe(1);
    jest.advanceTimersByTime(accountData.callbackTimeMs);
    expect(manager.callbacks.size).toBe(0);
  });

  test('should cancel old callbacks when updating accounts', () => {
    manager.addOrUpdateAccount(accountData);
    const updatedAccountData = { ...accountData, tokens: 600000, version: 124 };
    manager.addOrUpdateAccount(updatedAccountData);
    expect(manager.callbacks.size).toBe(1);
    jest.advanceTimersByTime(accountData.callbackTimeMs);
    expect(manager.callbacks.size).toBe(0);
  });

  test('should get highest token-value accounts by subtype', () => {
    const accountManager = new SolanaAccountManager();

    accountManager.addOrUpdateAccount(
      new SolanaAccount({
        id: 'account1',
        parentProgramSubType: 'subtype1',
        tokens: 300,
        version: 1,
      })
    );

    accountManager.addOrUpdateAccount(
      new SolanaAccount({
        id: 'account1',
        parentProgramSubType: 'subtype1',
        tokens: 100,
        version: 2,
      })
    );

    accountManager.addOrUpdateAccount(
      new SolanaAccount({
        id: 'account1',
        parentProgramSubType: 'subtype1',
        tokens: 400,
        version: 3,
      })
    );

    accountManager.addOrUpdateAccount(
      new SolanaAccount({
        id: 'account2',
        parentProgramSubType: 'subtype2',
        tokens: 400,
        version: 0,
      })
    );

    accountManager.addOrUpdateAccount(
      new SolanaAccount({
        id: 'account2',
        parentProgramSubType: 'subtype2',
        tokens: 200,
        version: 1,
      })
    );

    accountManager.addOrUpdateAccount(
      new SolanaAccount({
        id: 'account3',
        parentProgramSubType: 'subtype2',
        tokens: 300,
        version: 2,
      })
    );

    accountManager.addOrUpdateAccount(
      new SolanaAccount({
        id: 'account3',
        parentProgramSubType: 'subtype1',
        tokens: 300,
        version: 1,
      })
    );

    accountManager.addOrUpdateAccount(
      new SolanaAccount({
        id: 'account5',
        parentProgramSubType: 'subtype2',
        tokens: 50,
        version: 1,
      })
    );

    accountManager.addOrUpdateAccount(
      new SolanaAccount({
        id: 'account6',
        parentProgramSubType: 'subtype1',
        tokens: 10,
        version: 1,
      })
    );

    const highestAccounts =
      accountManager.getHighestTokenValueAccountsBySubtype();

    expect(highestAccounts.length).toBe(2);
    expect(highestAccounts[0].id).toBe('account1');
    expect(highestAccounts[1].id).toBe('account3');
  });

  test('should shutdown gracefully', () => {
    const accountManager = new SolanaAccountManager();

    const callback1 = setTimeout(() => {}, 1000);
    const callback2 = setTimeout(() => {}, 2000);
    const callback3 = setTimeout(() => {}, 3000);

    accountManager.callbacks.set('callback1', callback1);
    accountManager.callbacks.set('callback2', callback2);
    accountManager.callbacks.set('callback3', callback3);

    accountManager.shutdown();

    expect(accountManager.shutdownRequested).toBe(true);
    expect(accountManager.callbacks.size).toBe(0);
  });

  test('should read account updates from file', async () => {
    const mockFileData =
      '[{"id": "account1", "version": 1}, {"id": "account2", "version": 2}]';

    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockFileData);

    jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
      callback();
      return 0;
    });

    await manager.readAccountUpdatesFromFile('mock-file.json');

    expect(manager.accounts.size).toBe(2);
    expect(manager.accounts.get('account1')).toBeDefined();
    expect(manager.accounts.get('account2')).toBeDefined();
  });

  test('should break the reading account updates from file', async () => {
    const mockFileData =
      '[{"id": "account1", "version": 1}, {"id": "account2", "version": 2}]';

    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(mockFileData);

    manager.shutdownRequested = true;

    await manager.readAccountUpdatesFromFile('mock-file.json');

    expect(manager.accounts.size).toBe(0);
    expect(manager.accounts.get('account1')).toBeUndefined();
    expect(manager.accounts.get('account2')).toBeUndefined();
  });

  test('should log error and return early for invalid account data', () => {
    const notifyObserversMock = jest.spyOn(manager, 'notifyObservers');
    const invalidAccountData = null;

    const logObserver = (message) => {
      console.log(message);
    };

    manager.addObserver(logObserver);
    manager.addOrUpdateAccount(invalidAccountData);

    expect(manager.observers.length).toBe(1);
    expect(notifyObserversMock).toHaveBeenCalledTimes(1);
    expect(notifyObserversMock).toHaveBeenCalledWith(
      'Invalid account data:',
      invalidAccountData
    );

    manager.removeObserver(logObserver);
    expect(manager.observers.length).toBe(0);

    notifyObserversMock.mockRestore();
  });

  test('should not execute callback when account is falsy', () => {
    const accountId = 'invalidAccountId';

    manager.callbacks = new Map();
    manager.callbacks.set(
      accountId,
      setTimeout(() => {}, 1000)
    );

    jest.spyOn(manager.callbacks, 'delete');

    manager.executeCallback(accountId);

    expect(manager.callbacks.delete).not.toHaveBeenCalledWith(accountId);
  });

  test('should not cancel callback when account is falsy', () => {
    const accountId = 'invalidAccountId';

    manager.callbacks = new Map();
    manager.callbacks.set(
      accountId,
      setTimeout(() => {}, 1000)
    );

    jest.spyOn(manager.callbacks, 'delete');

    manager.cancelCallback(accountId);

    expect(manager.callbacks.delete).not.toHaveBeenCalledWith(accountId);
  });
});