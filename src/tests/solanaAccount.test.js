const SolanaAccount = require('../models/solanaAccount');

describe('SolanaAccount', () => {
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

  test('should create a SolanaAccount with correct properties', () => {
    const account = new SolanaAccount(accountData);

    expect(account).toHaveProperty('id', accountData.id);
    expect(account).toHaveProperty('parentProgram', accountData.parentProgram);
    expect(account).toHaveProperty(
      'parentProgramSubType',
      accountData.parentProgramSubType
    );
    expect(account).toHaveProperty('tokens', accountData.tokens);
    expect(account).toHaveProperty('data', accountData.data);
    expect(account).toHaveProperty(
      'callbackTimeMs',
      accountData.callbackTimeMs
    );
    expect(account).toHaveProperty('version', accountData.version);
  });
});