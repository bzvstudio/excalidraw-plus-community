import { z } from "zod";
import { skeletonsSchema } from "../modules/elements/elements.const.js";
import { sceneTitleSchema } from "../modules/scenes/scenes.const.js";
import { SCENE_PAGE_DEFAULT, SCENE_PAGE_MAX } from "../modules/scenes/scenes.const.js";

export const MCP_TOOLS = {
  list_collections: {
    title: "List collections",
    description:
      "Lists the collections this key can see — the ones open to the whole workspace. Use it to find where to create a scene. Example: call it with no arguments, then pass a collection's id to create_scene.",
    writes: false,
    inputSchema: {},
  },
  list_scenes: {
    title: "List scenes",
    description:
      "Lists scenes, most recently changed first, a page at a time. Filter by collectionId, or find scenes whose title contains query. Pass nextCursor from one page as cursor to get the next. Example: { \"query\": \"login\" }.",
    writes: false,
    inputSchema: {
      collectionId: z.uuid().optional(),
      query: z.string().max(200).optional(),
      cursor: z.string().max(200).optional(),
      limit: z.number().int().min(1).max(SCENE_PAGE_MAX).default(SCENE_PAGE_DEFAULT),
    },
  },
  get_scene: {
    title: "Read a scene",
    description:
      "Describes a scene for reasoning about it: its bounds, its frames, its shapes with their labels and positions, free text, and the arrows between shapes by id. Read it before adding to a scene, to see what is there and where. Set includeElements only when you need the raw Excalidraw elements; they can be large, and at most 1,000 are returned. Example: { \"sceneId\": \"…\" }.",
    writes: false,
    inputSchema: {
      sceneId: z.uuid(),
      includeElements: z.boolean().default(false),
    },
  },
  create_scene: {
    title: "Create a scene",
    description:
      "Creates an empty scene in a collection open to the whole workspace and returns its id and the link people can open. Get a collectionId from list_collections. Then draw in it with add_elements. Example: { \"collectionId\": \"…\", \"title\": \"Login flow\" }.",
    writes: true,
    inputSchema: {
      collectionId: z.uuid(),
      title: sceneTitleSchema,
    },
  },
  rename_scene: {
    title: "Rename a scene",
    description: "Gives a scene a new title. Example: { \"sceneId\": \"…\", \"title\": \"Login flow v2\" }.",
    writes: true,
    inputSchema: {
      sceneId: z.uuid(),
      title: sceneTitleSchema,
    },
  },
  add_elements: {
    title: "Draw in a scene",
    description:
      "Adds shapes described simply, drawn as the editor would draw them; everyone with the scene open sees them at once. Types: rectangle, ellipse, diamond (each with an optional label), text, arrow and line (joining two shapes of the same call by id or by label), and frame (holding children by id). Shapes without x and y are laid out beside what is already there, left to right along their arrows, each frame's children together. Example: { \"sceneId\": \"…\", \"skeletons\": [ { \"type\": \"rectangle\", \"label\": { \"text\": \"Login\" } }, { \"type\": \"rectangle\", \"label\": { \"text\": \"Dashboard\" } }, { \"type\": \"arrow\", \"start\": { \"label\": \"Login\" }, \"end\": { \"label\": \"Dashboard\" } } ] }.",
    writes: true,
    inputSchema: {
      sceneId: z.uuid(),
      skeletons: skeletonsSchema,
    },
  },
} as const;

export type McpToolName = keyof typeof MCP_TOOLS;
