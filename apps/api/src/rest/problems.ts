import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { z } from "zod";
import { refusalStatus } from "../http/refusals.js";

const TITLES: Partial<Record<ContentfulStatusCode, string>> = {
  400: "Bad request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not found",
  409: "Conflict",
  413: "Content too large",
  415: "Unsupported media type",
  422: "Unprocessable content",
  429: "Too many requests",
  503: "Service unavailable",
  500: "Internal server error",
};

export function problem(c: Context, status: ContentfulStatusCode, detail: string) {
  return c.body(JSON.stringify({ type: "about:blank", title: TITLES[status] ?? "Error", status, detail }), status, {
    "content-type": "application/problem+json",
  });
}

export function problemFromError(error: Error, c: Context) {
  if (error instanceof HTTPException) return problem(c, error.status as ContentfulStatusCode, error.message);
  const status = refusalStatus(error);
  if (status) return problem(c, status, error.message);
  console.error(error);
  return problem(c, 500, "Something went wrong");
}

export function problemFromIssues(issues: readonly z.core.$ZodIssue[], c: Context) {
  const detail = issues.map((issue) => `${issue.path.length > 0 ? `${issue.path.join(".")}: ` : ""}${issue.message}`).join("; ");
  return problem(c, 400, detail);
}
