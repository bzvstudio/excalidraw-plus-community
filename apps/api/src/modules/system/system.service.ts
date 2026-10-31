import { store } from "../../stores/index.js";
import type { AuthService, SignInOption, SignUpMode } from "../auth/auth.type.js";
import type { SystemService } from "./system.type.js";

export type SystemServiceOptions = {
  productName: string;
  signUpMode: SignUpMode;
  emailEnabled: boolean;
  libraryBrowsing: boolean;
  aiEnabled: boolean;
  callsEnabled: boolean;
  aiDailyLimit: number;
  fileMaxBytes: number;
  signInOptions: SignInOption[];
  auth: Pick<AuthService, "isInstanceClaimed">;
};

export function createSystemService({
  productName,
  signUpMode,
  emailEnabled,
  libraryBrowsing,
  aiEnabled,
  callsEnabled,
  aiDailyLimit,
  fileMaxBytes,
  signInOptions,
  auth,
}: SystemServiceOptions): SystemService {
  return {
    getRuntimeConfig: async () => ({
      productName,
      signUpMode,
      setupRequired: !(await auth.isInstanceClaimed()),
      emailEnabled,
      libraryBrowsing,
      aiEnabled,
      callsEnabled,
      aiDailyLimit,
      fileMaxBytes,
      signInOptions,
    }),

    isDatabaseReachable: async () => {
      try {
        await store.ping();
        return true;
      } catch {
        return false;
      }
    },
  };
}
