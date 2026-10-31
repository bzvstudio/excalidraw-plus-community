import { loadEnv } from "../config/env.js";
import { createContainer } from "../container.js";
import { RESEAL_BATCH_SIZE } from "../modules/encryption/encryption.const.js";
import { resealAll } from "../modules/encryption/encryption.service.js";

const container = createContainer(loadEnv());

try {
  const { resealed, missing } = await resealAll(container.resealers, RESEAL_BATCH_SIZE);
  for (const [kind, total] of Object.entries(resealed)) console.log(`${kind}: ${total} re-sealed with the current key`);
  for (const [kind, lost] of Object.entries(missing)) {
    console.error(`${kind}: ${lost.length} recorded but missing from storage, left under the old key:\n  ${lost.join("\n  ")}`);
  }
  process.exit(Object.keys(missing).length > 0 ? 2 : 0);
} catch (error) {
  for (const { kind, missing } of container.resealers) {
    const lost = missing?.found() ?? [];
    if (lost.length > 0) console.error(`${kind}: ${lost.length} recorded but missing from storage:\n  ${lost.join("\n  ")}`);
  }
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
