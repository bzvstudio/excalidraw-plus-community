import { z } from "zod";

export const COLLECTION_NAME_MAX_LENGTH = 60;

export const collectionNameSchema = z
  .string()
  .trim()
  .min(1, "Name the collection")
  .max(COLLECTION_NAME_MAX_LENGTH);
