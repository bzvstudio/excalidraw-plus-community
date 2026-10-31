import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AiImageNotPng, AiImageTooLarge, AiKeyRefused, AiLimitReached, AiUnavailable } from "../modules/ai/ai.utils.js";
import { WorkspaceAccessDenied } from "../modules/authorization/authorization.utils.js";
import { CannotDecrypt } from "../modules/encryption/encryption.utils.js";
import { FileTooLarge, FileTypeRefused, UnknownFile } from "../modules/files/files.utils.js";
import { CollabClosing, SceneNotSaved } from "../modules/collab/collab.utils.js";
import { UnknownCollection } from "../modules/collections/collections.utils.js";
import {
  SkeletonChildUnknown,
  SkeletonEndsSame,
  SkeletonEndUnknown,
  SkeletonIdTaken,
  SkeletonLabelAmbiguous,
  SkeletonNeedsPosition,
  SkeletonsTooWide,
} from "../modules/elements/elements.utils.js";
import {
  InvalidSceneCursor,
  SceneDeleteDenied,
  SceneDraftDenied,
  SceneMoveDenied,
  SceneNeedsCollection,
  SceneTooLarge,
  UnknownScene,
} from "../modules/scenes/scenes.utils.js";
import {
  GuestNameRequired,
  ShareLinkExpired,
  ShareLinkRevoked,
  UnknownShareLink,
} from "../modules/sharing/sharing.utils.js";
import { ThumbnailNotPng, ThumbnailTooLarge, UnknownThumbnail } from "../modules/thumbnails/thumbnails.utils.js";
import { AvatarNotAllowed, AvatarTooLarge, UnknownAvatar } from "../modules/avatars/avatars.utils.js";
import { UnknownWorkspace } from "../modules/workspaces/workspaces.utils.js";

const REFUSAL_STATUSES = [
  [WorkspaceAccessDenied, 403],
  [UnknownWorkspace, 404],
  [UnknownScene, 404],
  [UnknownCollection, 404],
  [SceneTooLarge, 413],
  [SceneNeedsCollection, 400],
  [InvalidSceneCursor, 400],
  [SceneDeleteDenied, 403],
  [SceneDraftDenied, 403],
  [SceneMoveDenied, 403],
  [SceneNotSaved, 503],
  [SkeletonEndUnknown, 400],
  [SkeletonNeedsPosition, 400],
  [SkeletonIdTaken, 409],
  [SkeletonLabelAmbiguous, 400],
  [SkeletonEndsSame, 400],
  [SkeletonChildUnknown, 400],
  [SkeletonsTooWide, 400],
  [CollabClosing, 503],
  [UnknownFile, 404],
  [FileTooLarge, 413],
  [FileTypeRefused, 415],
  [UnknownThumbnail, 404],
  [UnknownAvatar, 404],
  [GuestNameRequired, 400],
  [UnknownShareLink, 404],
  [ShareLinkRevoked, 410],
  [ShareLinkExpired, 410],
  [ThumbnailTooLarge, 413],
  [ThumbnailNotPng, 415],
  [AvatarTooLarge, 413],
  [AvatarNotAllowed, 415],
  [CannotDecrypt, 422],
  [AiUnavailable, 503],
  [AiImageTooLarge, 413],
  [AiImageNotPng, 400],
  [AiLimitReached, 429],
  [AiKeyRefused, 400],
] as const;

export function refusalStatus(error: Error): ContentfulStatusCode | undefined {
  return REFUSAL_STATUSES.find(([refusal]) => error instanceof refusal)?.[1];
}

export function answerRefusal(error: Error, c: Context) {
  const status = refusalStatus(error);
  if (status) return c.json({ error: error.message }, status);
  console.error(error);
  return c.json({ error: "Something went wrong" }, 500);
}
