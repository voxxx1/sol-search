const fs = require('fs');
const SolanaAccount = require('../models/solanaAccount');
const crypto = require('crypto');

class SolanaAccountManager {
  constructor() {
    this.accounts = new Map();
    this.callbacks = new Map();
    this.observers = [];
  }

  addObserver(observer) {
    this.observers.push(observer);
  }

  removeObserver(observer) {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  notifyObservers(message, object) {
    this.observers.forEach((observer) => observer(message, object));
  }

  addOrUpdateAccount(accountData) {
    if (!accountData || !accountData.id) {
      this.notifyObservers('Invalid account data:', accountData);
      return;
    }

    const existingAccount = this.accounts.get(accountData.id);

    if (existingAccount) {
      if (existingAccount.version < accountData.version) {
        this.notifyObservers(`Updating account: ${accountData.id}`);
        this.accounts.set(accountData.id, new SolanaAccount(accountData));
        this.notifyObservers(
          `Account indexed: ${accountData.id}, parent_program_subtype: ${accountData.parentProgramSubType}, version: ${accountData.version}`
        );
        this.cancelCallback(accountData.id);
        this.scheduleCallback(accountData);
      } else {
        this.notifyObservers(
          `Ignoring old version of account: ${accountData.id}`
        );
      }
    } else {
      this.notifyObservers(
        `Account indexed: ${accountData.id}, parent_program_subtype: ${accountData.parentProgramSubType}, version: ${accountData.version}`
      );
      this.accounts.set(accountData.id, new SolanaAccount(accountData));
      this.scheduleCallback(accountData);
    }
  }

  scheduleCallback(accountData) {
    const accountId = accountData.id;
    const timeout = setTimeout(() => {
      this.executeCallback(accountId);
    }, accountData.callbackTimeMs);
    this.callbacks.set(accountId, timeout);
  }

  executeCallback(accountId) {
    const account = this.accounts.get(accountId);
    if (account) {
      this.notifyObservers(
        `Callback for account ${accountId}: ${JSON.stringify(account.data)}`
      );

      this.callbacks.delete(accountId);
    }
  }

  cancelCallback(accountId) {
    const existingCallback = this.callbacks.get(accountId);
    if (existingCallback) {
      clearTimeout(existingCallback);
      this.notifyObservers(`Canceled old callback for account: ${accountId}`);
      this.callbacks.delete(accountId);
    }
  }

  getHighestTokenValueAccountsBySubtype() {
    const accountsBySubtype = new Map();
    for (const account of this.accounts.values()) {
      const subtype = account.parentProgramSubType;
      const existingAccount = accountsBySubtype.get(subtype);

      if (
        !existingAccount ||
        (existingAccount && existingAccount.tokens < account.tokens)
      ) {
        accountsBySubtype.set(subtype, account);
      }
    }
    return Array.from(accountsBySubtype.values());
  }

  async readAccountUpdatesFromFile(file) {
    const rawData = await fs.promises.readFile(file);
    const accountUpdates = JSON.parse(rawData);

    for (const update of accountUpdates) {
      if (this.shutdownRequested) {
        break;
      }
      this.addOrUpdateAccount(update);
      await new Promise((resolve) =>
        setTimeout(resolve, crypto.randomInt(0, 1000))
      );
    }
  }

  shutdown() {
    this.shutdownRequested = true;
    this.callbacks.forEach((timeout) => clearTimeout(timeout));
    this.callbacks.clear();
    this.notifyObservers(`System gracefully shut down.`);
  }
}

module.exports = SolanaAccountManager;