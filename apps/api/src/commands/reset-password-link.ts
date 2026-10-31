import { loadEnv } from "../config/env.js";
import { createContainer } from "../container.js";

const email = process.argv[2];

if (!email) {
  console.error("Usage: pnpm --filter @repo/api reset-password-link <email>");
  process.exit(1);
}

const container = createContainer(loadEnv());

try {
  const link = await container.services.auth.createPasswordResetLink(email);
  console.log(`One-time password reset link for ${email}, valid for one hour:\n${link}`);
  process.exit(0);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
