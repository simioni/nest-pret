export enum EmailVerificationOptions {
  required = 'required',
  delayed = 'delayed',
  off = 'off',
}

export interface ApiConfig {
  emailVerification: EmailVerificationOptions;
  emailVerificationIsOn: () => boolean;
  emailVerificationIsRequired: () => boolean;
  internalUrl: string;
  internalPort: string | number;
  throttleLimit: number;
  throttleLimitAccounts: number;
  throttleTtl: number;
}
