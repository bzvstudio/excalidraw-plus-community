import type { SignInOption, SignUpMode } from "../auth/auth.type.js";

export type RuntimeConfig = {
  productName: string;
  signUpMode: SignUpMode;
  setupRequired: boolean;
  emailEnabled: boolean;
  libraryBrowsing: boolean;
  aiEnabled: boolean;
  callsEnabled: boolean;
  aiDailyLimit: number;
  fileMaxBytes: number;
  signInOptions: SignInOption[];
};

export type SystemService = {
  getRuntimeConfig: () => Promise<RuntimeConfig>;
  isDatabaseReachable: () => Promise<boolean>;
};
