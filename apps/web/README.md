# web

Frontend application for `readme-gen`.

This app provides the main product UI for importing repositories, generating README files, editing markdown, viewing token usage, and managing account-level generation workflows.

## Responsibilities

- Import repositories from GitHub by URL
- Configure model, tone, template, and README handling mode
- Stream generated README content into the editor and preview
- Support AI-assisted section improvement
- Show generation token usage and billing mode
- Expose dashboard, history, pricing, templates, docs, and models pages

## Main Areas

```text
src/
|- components/   UI building blocks, layout, preview, insights
|- contexts/     auth and workspace state
|- data/         mock data and template definitions
|- hooks/        history, shortcuts, typing effects
|- lib/          markdown analysis, snapshot storage, helpers
|- pages/        generate, dashboard, auth, pricing, docs, templates
```

## Key Features

### Generator UI

The generator page supports:

- repository import and analysis
- model selection
- template selection
- `overwrite`, `rewrite`, and `append` README modes
- nested README generation
- streaming output
- inline markdown editing with Monaco
- AI improve for selected sections

### Dashboard

The dashboard surfaces:

- recent README generations
- token usage
- platform vs BYOK execution details
- saved project history
- billing and API key management shortcuts

### History and snapshots

The web app stores local editor snapshots with metadata such as:

- model ID
- tokens used
- execution mode (`platform` or `byok`)

## Development

From the workspace root:

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web preview
pnpm --filter web exec tsc --noEmit
```

## Environment

Typical frontend configuration:

```env
VITE_API_URL=http://localhost:5000/api
```

## Notes

- The app assumes the backend API is running and reachable through `VITE_API_URL`
- Auth state is stored client-side and logout currently clears local session state
- Recent README activity depends on API persistence through MongoDB
