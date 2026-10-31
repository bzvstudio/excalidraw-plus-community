import { API_KEY_CAPABILITIES, ROLE_CAPABILITIES } from "./authorization.const.js";
import type { Actor, ApiKeyActor, Capability, WorkspaceRole } from "./authorization.type.js";

export class WorkspaceAccessDenied extends Error {
  constructor(capability: Capability) {
    super(`Your role in this workspace does not allow that (${capability})`);
  }
}

export function can(role: WorkspaceRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export function isApiKey(actor: Actor): actor is ApiKeyActor {
  return "keyId" in actor;
}

export function actorCan(actor: Actor, capability: Capability): boolean {
  return isApiKey(actor) ? API_KEY_CAPABILITIES[actor.scope].includes(capability) : can(actor.role, capability);
}

export function assertCan(actor: Actor, capability: Capability): void {
  if (!actorCan(actor, capability)) throw new WorkspaceAccessDenied(capability);
}
