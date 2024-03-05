class SolanaAccount {
    constructor(accountData) {
      this.id = accountData.id;
      this.parentProgram = accountData.parentProgram;
      this.parentProgramSubType = accountData.parentProgramSubType;
      this.tokens = accountData.tokens;
      this.data = accountData.data;
      this.version = accountData.version;
      this.callbackTimeMs = accountData.callbackTimeMs;
    }
  }
  
  module.exports = SolanaAccount;