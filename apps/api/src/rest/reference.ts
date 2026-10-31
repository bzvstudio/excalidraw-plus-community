import type { OpenAPIHono } from "@hono/zod-openapi";

type OpenAPIObject = ReturnType<OpenAPIHono["getOpenAPI31Document"]>;

type Operation = {
  summary?: string;
  description?: string;
  parameters?: { name: string; in: string; required?: boolean; description?: string; schema?: { type?: string } }[];
  requestBody?: { content?: Record<string, { schema?: { $ref?: string } }> };
  responses?: Record<string, { description?: string }>;
};

const METHODS = ["get", "post", "patch", "put", "delete"] as const;

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function schemaName(ref?: string): string | undefined {
  return ref?.split("/").at(-1);
}

function operationHtml(method: string, path: string, operation: Operation): string {
  const parameters = (operation.parameters ?? [])
    .map(
      (parameter) =>
        `<li><code>${escape(parameter.name)}</code> <span class="muted">${escape(parameter.in)}${parameter.required ? ", required" : ""}</span>${parameter.description ? ` — ${escape(parameter.description)}` : ""}</li>`,
    )
    .join("");
  const body = schemaName(Object.values(operation.requestBody?.content ?? {})[0]?.schema?.$ref);
  const responses = Object.entries(operation.responses ?? {})
    .map(([status, response]) => `<li><code>${escape(status)}</code> ${escape(response.description ?? "")}</li>`)
    .join("");
  return `<section id="${escape(`${method}-${path}`)}">
<h3><span class="method">${method.toUpperCase()}</span> <code>${escape(path)}</code></h3>
${operation.summary ? `<p><strong>${escape(operation.summary)}</strong></p>` : ""}
${operation.description ? `<p>${escape(operation.description)}</p>` : ""}
${parameters ? `<h4>Parameters</h4><ul>${parameters}</ul>` : ""}
${body ? `<h4>Body</h4><p><a href="#schema-${escape(body)}"><code>${escape(body)}</code></a></p>` : ""}
<h4>Responses</h4><ul>${responses}</ul>
</section>`;
}

function schemaHtml(name: string, schema: { properties?: Record<string, { type?: unknown; description?: string }>; description?: string }): string {
  const properties = Object.entries(schema.properties ?? {})
    .map(([property, value]) => `<li><code>${escape(property)}</code>${value.description ? ` — ${escape(value.description)}` : ""}</li>`)
    .join("");
  return `<section id="schema-${escape(name)}"><h3><code>${escape(name)}</code></h3>${schema.description ? `<p>${escape(schema.description)}</p>` : ""}${properties ? `<ul>${properties}</ul>` : ""}</section>`;
}

export function referencePage(document: OpenAPIObject): string {
  const operations = Object.entries(document.paths ?? {}).flatMap(([path, item]) =>
    METHODS.flatMap((method) => {
      const operation = (item as Record<string, Operation | undefined>)[method];
      return operation ? [operationHtml(method, path, operation)] : [];
    }),
  );
  const schemas = Object.entries(document.components?.schemas ?? {}).map(([name, schema]) => schemaHtml(name, schema as never));
  const title = escape(document.info.title);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
body { font: 15px/1.5 system-ui, sans-serif; max-width: 860px; margin: 0 auto; padding: 24px 16px; color: #1b1b1f; background: #fff; }
code { font: 13px ui-monospace, monospace; background: #f1f1f4; padding: 1px 4px; border-radius: 4px; }
section { border-top: 1px solid #e4e4e7; padding: 8px 0; }
.method { font: 600 12px ui-monospace, monospace; background: #1b1b1f; color: #fff; padding: 2px 6px; border-radius: 4px; }
.muted { color: #6b6b74; }
@media (prefers-color-scheme: dark) { body { color: #ececf1; background: #141417; } code { background: #26262b; } section { border-color: #2e2e34; } .method { background: #ececf1; color: #141417; } .muted { color: #9a9aa3; } }
</style>
</head>
<body>
<h1>${title}</h1>
<p>Base URL: <code>${escape(document.servers?.[0]?.url ?? "")}</code>. Every request sends <code>Authorization: Bearer &lt;key&gt;</code>. Errors are <code>application/problem+json</code>. The machine-readable document is <a href="openapi.json">openapi.json</a>.</p>
<h2>Endpoints</h2>
${operations.join("\n")}
<h2>Schemas</h2>
${schemas.join("\n")}
</body>
</html>`;
}
