import { WorkspaceAccessDenied } from "../modules/authorization/authorization.utils.js";
import type { CollabRefusal, CollabReply } from "../modules/collab/collab.type.js";
import { CollabClosing, NotInRoom } from "../modules/collab/collab.utils.js";
import { SceneTooLarge, UnknownScene } from "../modules/scenes/scenes.utils.js";
import { ShareLinkExpired, ShareLinkRevoked, UnknownShareLink } from "../modules/sharing/sharing.utils.js";
import { UnknownWorkspace } from "../modules/workspaces/workspaces.utils.js";

const REFUSALS = [
  [UnknownWorkspace, "not_found"],
  [UnknownScene, "not_found"],
  [UnknownShareLink, "not_found"],
  [ShareLinkRevoked, "gone"],
  [ShareLinkExpired, "gone"],
  [WorkspaceAccessDenied, "forbidden"],
  [SceneTooLarge, "too_large"],
  [NotInRoom, "not_joined"],
  [CollabClosing, "unavailable"],
] as const;

export function refused(refusal: CollabRefusal): CollabReply<never> {
  return { ok: false, refusal };
}

function refusalOf(error: unknown): CollabRefusal | undefined {
  const refusal = REFUSALS.find(([kind]) => error instanceof kind)?.[1];
  if (!refusal) console.error(error);
  return refusal;
}

export function unanswered(work: () => void) {
  try {
    work();
  } catch (error) {
    refusalOf(error);
  }
}

export async function answer<Answer extends object>(work: () => Answer | Promise<Answer>): Promise<CollabReply<Answer>> {
  try {
    return { ok: true, ...(await work()) };
  } catch (error) {
    return refused(refusalOf(error) ?? "unavailable");
  }
}
