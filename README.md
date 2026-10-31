# Deploy and Host Excalidraw Plus Community with Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/excalidraw-plus-community?referralCode=1uJ_oA)

> **Community version.** This is an independent, community-built project inspired by Excalidraw+. It is not affiliated with, endorsed by or supported by Excalidraw. If you need a robust, secure product with compliance such as SOC 2, we recommend the official [Excalidraw+](https://plus.excalidraw.com).

Excalidraw Plus Community is a self-hosted team workspace around the open-source Excalidraw editor. Your team gets accounts, shared workspaces, live collaboration, comments, presentations and share links, with drawings stored and encrypted in your own Railway project. An API and an MCP server connect it to scripts and AI agents.

## About Hosting Excalidraw Plus Community

Hosting it means running one app service, a Postgres database and an S3-compatible bucket. The template creates and connects all three, generates the secrets for your deployment, and gives the app a public domain. The app applies its database migrations whenever it starts.

After deploying:

1. Open the app's **Deployments** tab, then the latest deployment's log, and find the line *"This instance has no administrator yet … enter the setup code …"*.
2. Open the app's domain and enter that code to create the administrator account. Until then, nobody can sign up.
3. Create a workspace and invite people from **Settings → Members**.
4. Turn on **backups** for the Postgres service. A template cannot do this for you.

Keep `ENCRYPTION_KEY` safe and never change it directly. It is the only way to read your scenes, comments and images.

## Common Use Cases

- Giving a team a private, shared place for diagrams, wireframes and architecture sketches
- Running workshops and design reviews with live editing, comments and presentations
- Sharing view or edit links with guests, and embedding read-only scenes in internal sites
- Creating and updating diagrams from scripts and AI agents through the REST API and MCP server
- Keeping drawings on infrastructure you control, encrypted at rest

## Dependencies for Excalidraw Plus Community Hosting

- **Postgres**: workspaces, scenes and comments
- **S3-compatible bucket**: images placed in scenes, and scene thumbnails
- **LiveKit** (optional): voice calls and screen sharing
- **An AI provider** (optional): text to diagram and wireframe to code
- **An SMTP server** (optional): invitation and password-reset emails

### Deployment Dependencies

- [Source code](https://github.com/bzvstudio/excalidraw-plus-community)
- [Excalidraw](https://github.com/excalidraw/excalidraw), the open-source editor
- [Railway Storage Buckets](https://docs.railway.com/storage-buckets)
- [LiveKit](https://livekit.io)

### Implementation Details

**Optional features.** Set these in the app's variables, then redeploy. A blank variable counts as not set.

| Feature | Variables |
| :------ | :-------- |
| Email | `EMAIL_PROVIDER=smtp`, `SMTP_URL`, `EMAIL_FROM` |
| Google sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| GitHub sign-in | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| Microsoft sign-in | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` |
| Single sign-on | `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_BUTTON_LABEL` |
| AI | `AI_PROVIDER` (`anthropic`, `openai` or `openai-compatible`), `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`, `AI_VISION_MODEL` |
| Calls | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| Embeds | `EMBED_ALLOWED_ORIGINS`: `*`, or a comma-separated list of origins |

For sign-in providers, register `<your domain>/auth/callback/<google|github|microsoft|oidc>` as the callback URL. Every other variable is listed in [`.env.example`](https://github.com/bzvstudio/excalidraw-plus-community/blob/main/.env.example).

**Running it.**

- **Custom domain**: Set `PUBLIC_BASE_URL` to it as well. The app answers on one address.
- **One replica**: Live collaboration keeps each open scene's room in memory, so do not scale the app beyond one replica.
- **Upgrades**: The service follows the `1` image tag. Use the update button in the service's settings, or turn on auto updates under **Settings → Source**.
- **Rotating the encryption key**: Set the new key as `ENCRYPTION_KEY` and the old one as `ENCRYPTION_KEY_PREVIOUS`, redeploy, run `node reseal.mjs` through `railway ssh`, then remove the previous key.
- **Resetting a password without email**: Run `node reset-password-link.mjs person@example.com` through `railway ssh`.

**Security and license.** Report vulnerabilities privately, as described in [SECURITY.md](https://github.com/bzvstudio/excalidraw-plus-community/blob/main/SECURITY.md). This project is MIT-licensed. The embedded Excalidraw editor is MIT-licensed too, with its notice in [THIRD_PARTY_NOTICES.md](https://github.com/bzvstudio/excalidraw-plus-community/blob/main/THIRD_PARTY_NOTICES.md). The Excalidraw name and logo belong to their owners.

## Why Deploy Excalidraw Plus Community on Railway?

One click gives you the app, its database and its bucket, already connected, with secrets generated and nothing to fill in. Railway handles TLS, the public domain, health checks and restarts, and a redeploy saves open scenes before the old version stops. You pay for what the service uses, and your team's drawings stay in your own project.
