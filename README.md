# readme-gen

AI-native README generation platform with a web app, API, CLI, and shared analyzer package.

`readme-gen` analyzes repositories, extracts grounded project evidence, and generates or improves README files using OpenAI, Gemini, or Groq models. It supports GitHub import, semantic README generation, existing README rewrite/append flows, usage tracking, and bring-your-own-key execution without platform quota limits.

## What It Does

- Imports repositories from GitHub and analyzes structure, routes, scripts, env vars, dependencies, and source signatures
- Generates README files from grounded repository context instead of generic prompt-only output
- Supports rewrite, append, and overwrite flows when a repository already has a README
- Provides a web editor with live preview, section suggestions, AI improve, history, and export
- Exposes a CLI for local generation and a shared semantic pipeline for production-style README generation
- Tracks per-generation token usage and distinguishes platform-hosted vs BYOK execution

## Monorepo Structure

```text
.
|- apps/
|  |- api/        Express + Mongoose backend
|  |- cli/        readmegen / devcon command-line interface
|  |- web/        React + Vite frontend
|- packages/
|  |- analyzer/   Shared repository analysis and semantic pipeline logic
```

## Architecture

```text
User / CLI
   |
   v
Web UI or CLI command
   |
   v
API (Express, Passport, Mongoose)
   |
   +--> GitHub repository analysis
   |
   +--> LLM orchestration (OpenAI / Gemini / Groq)
   |
   +--> Usage accounting and project persistence
   |
   v
README output + token metadata
```

## Core Flows

### Web generation

1. User imports a repository URL or provides existing analysis.
2. The API analyzes the repository and extracts summary plus evidence.
3. The selected model generates a README through the API stream endpoint.
4. The frontend streams content into the editor and preview.
5. The result is saved with token metadata and can be versioned locally in snapshot history.

### CLI generation

1. The CLI analyzes the local workspace with the shared analyzer package.
2. `readmegen generate` runs either:
   - the semantic local pipeline, or
   - the backend/API flow when template or nested README generation is required
3. The generated README is written to disk and token usage is reported.

### GitHub import

1. The frontend posts a GitHub repository URL to `/api/analyze`.
2. The backend fetches repo metadata, file structure, root README, manifests, and important source files.
3. The analyzer builds a grounded `summary` and `context` object used for generation.

## Key Features

### Grounded generation

The system does not rely only on a project name and description. It extracts:

- root and nested README content
- package manifests and scripts
- routes and route snippets
- environment variables
- AST-detected patterns
- definitions and source signatures
- real examples from tests

### Existing README handling

The project supports three modes:

- `rewrite`: preserve useful structure and improve stale content
- `append`: add net-new grounded sections without replacing existing content
- `overwrite`: generate from scratch

### Multi-model support

The backend respects the model selected by the user instead of forcing provider defaults. Current flows support OpenAI, Gemini, and Groq-backed models.

### Usage and billing behavior

- Platform-hosted usage can be quota-limited by plan
- BYOK usage is not restricted by platform README/token limits
- Each generation returns token metadata and execution mode (`platform` or `byok`)

## Packages

### `apps/web`

React 19 + Vite application for:

- GitHub import
- model selection
- streaming README generation
- template selection
- AI improve
- snapshot history
- dashboard and billing views

### `apps/api`

Express backend responsible for:

- authentication and Passport setup
- GitHub repository analysis
- README generation and streaming
- recommendation generation
- AI improve endpoint
- usage tracking and persistence

### `apps/cli`

CLI entrypoint providing:

- local analysis
- semantic README generation
- backend generation fallback for templates/nested READMEs
- config management for provider keys and models

Main commands:

```bash
readmegen init
readmegen generate
readmegen config view
readmegen config set-key <key>
readmegen config set-model <model>
```

### `packages/analyzer`

Shared analysis package used by the API and CLI. It contains:

- structure analysis
- package parsing
- route and env extraction
- definition extraction
- semantic evidence building
- semantic README pipeline

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- MongoDB for persistence
- At least one provider API key:
  - `OPENAI_API_KEY`
  - `GOOGLE_GENERATIVE_AI_API_KEY`
  - `GROQ_API_KEY`

### Install

```bash
pnpm install
```

### Run the workspace

```bash
pnpm dev
```

Useful workspace commands:

```bash
pnpm api
pnpm build
pnpm lint
pnpm preview
```

## Service Commands

### API

```bash
pnpm --filter api dev
pnpm --filter api build
pnpm --filter api start
```

### Web

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web preview
```

### CLI

```bash
pnpm --filter @readme-gen/cli build
pnpm --filter @readme-gen/cli start
```

## CLI Examples

### Semantic local generation

```bash
readmegen generate \
  --provider groq \
  --model llama-3.3-70b-versatile \
  --mode rewrite \
  --output README.md
```

### Append to an existing README

```bash
readmegen generate \
  --provider gemini \
  --model gemini-2.5-flash \
  --mode append
```

### Backend/template flow

```bash
readmegen generate \
  --template monorepo \
  --output README.md
```

## Semantic Pipeline

The analyzer package includes a semantic README pipeline for local generation.

It works in stages:

1. Extract repository evidence
2. Infer project intent
3. Extract real features
4. Analyze architecture
5. Merge semantic understanding into canonical JSON
6. Generate README markdown from that semantic JSON

This keeps the final README tied to concrete repository evidence instead of raw-code dumping or generic model guesses.

## Environment Variables

The main backend variables are:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret
MONGODB_URI=mongodb://localhost:27017/readme-gen
GITHUB_TOKEN=your_github_token
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

The web app uses `VITE_API_URL` to point to the API server when needed.

## API Overview

Key routes include:

- `POST /api/analyze`
- `POST /api/recommendations`
- `POST /api/generate`
- `POST /api/generate/stream`
- `POST /api/improve`
- `GET /api/projects`

## Current Product Behavior

- Dashboard surfaces recent README generations and token usage
- Navbar exposes a dashboard shortcut for authenticated users
- Web history snapshots can store generation metadata such as model and tokens used
- Streaming errors are surfaced to the user in the generator UI
- GitHub import currently uses repository URL analysis, not a full GitHub App flow

## Development Notes

- Authentication is JWT-based and logout is currently client-side token removal
- MongoDB persistence is required for recent project history
- Recent README history in the dashboard depends on successful project saves in the API
- Semantic local generation and backend generation have different tradeoffs; the CLI chooses between them based on the requested features

## Contributing

1. Install dependencies with `pnpm install`
2. Configure API keys and local environment variables
3. Run the web and API apps in development
4. Make changes in the relevant app/package
5. Run type-check and lint before opening a PR

Suggested checks:

```bash
pnpm --filter api exec tsc --noEmit
pnpm --filter web exec tsc --noEmit
pnpm --filter @readme-gen/cli exec tsc --noEmit
```

## License

Add the project license here once it is finalized.
