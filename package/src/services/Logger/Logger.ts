type Config = {
  isEnabled: boolean;
  logPrefix?: string;
};

export class Logger {
  private readonly isEnabled: boolean;

  private readonly logPrefix: string;

  constructor({ isEnabled = false, logPrefix = '' }: Config) {
    this.isEnabled = isEnabled;
    this.logPrefix = logPrefix;
  }

  private formatMessage = (message: string): string =>
    `[@astral/permissions]/${this.logPrefix}: ${message}`;

  public error = (error: Error) => {
    if (this.isEnabled) {
      console.error(this.formatMessage(error.message), error);
    }
  };

  public warn = (message: string) => {
    if (this.isEnabled) {
      console.warn(this.formatMessage(message));
    }
  };

  public info = (message: string) => {
    if (this.isEnabled) {
      console.log(this.formatMessage(message));
    }
  };

  public createPolicyLogger = (policyName: string) =>
    new Logger({
      isEnabled: this.isEnabled,
      logPrefix: `Policy:${policyName}`,
    });
}
