const fs = require('fs');
const SolanaAccountManager = require('./controllers/solanaAccountManager');
const config = require('./config');

async function main() {
  const accountManager = new SolanaAccountManager();

  if (!config.isProduction) {
    accountManager.addObserver((message) => {
      console.log(message);
    });
  }

  process.on('SIGINT', () => {
    accountManager.shutdown();
  });

  await accountManager.readAccountUpdatesFromFile(
    './data/account_updates.json'
  );

  const highestTokenValueAccounts =
    accountManager.getHighestTokenValueAccountsBySubtype();

  console.log('\nHighest token-value accounts by parent_program_subtype:');

  highestTokenValueAccounts.forEach((account) => {
    console.log(
      `Account ${account.id} has ${account.tokens} with parent_program_subtype ${account.parentProgramSubType}`
    );
  });
}

main();