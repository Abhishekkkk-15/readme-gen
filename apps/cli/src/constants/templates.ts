export type CliReadmeTemplate = {
  id: string;
  name: string;
  description: string;
  body: string;
};

export const CLI_README_TEMPLATES: CliReadmeTemplate[] = [
  {
    id: 'saas-api',
    name: 'SaaS / REST API',
    description: 'OpenAPI-style sections, auth, rate limits, and SDK docs.',
    body: `# {project-name}

> {description}

![CI](https://img.shields.io/badge/ci-passing-success) ![License](https://img.shields.io/badge/license-MIT-blue) ![Version](https://img.shields.io/badge/version-1.0.0-blue)

## Overview

Brief description of what this API does and the business problem it solves.

## Installation

\`\`\`bash
npm install @your-org/{project-name}-sdk
\`\`\`

Or use the REST API directly - no SDK required.

## Authentication

All requests require a bearer token issued at \`/auth/token\`:

\`\`\`bash
curl -X POST https://api.example.com/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{"client_id": "...", "client_secret": "..."}'
\`\`\`

## Usage

\`\`\`ts
import { Client } from '@your-org/{project-name}-sdk'

const client = new Client({ apiKey: process.env.API_KEY })
const result = await client.resources.list({ limit: 20 })
\`\`\`

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/v1/resources\` | GET | List all resources |
| \`/v1/resources/:id\` | GET | Fetch a single resource |
| \`/v1/resources\` | POST | Create a resource |
| \`/v1/resources/:id\` | DELETE | Delete a resource |

### Rate Limits

- **Free tier**: 100 req/min
- **Pro**: 1,000 req/min
- **Enterprise**: Custom

## Webhooks

Register a webhook endpoint to receive real-time events:

\`\`\`json
{
  "url": "https://your-server.com/hook",
  "events": ["resource.created", "resource.deleted"]
}
\`\`\`

## Contributing

1. Fork the repo
2. Create a feature branch: \`git checkout -b feat/my-feature\`
3. Submit a PR against \`main\`

## License

MIT (c) {year} {author}
`,
  },
  {
    id: 'oss-library',
    name: 'Open-source library',
    description: 'Registry install, usage examples, and a detailed contributing guide.',
    body: `# {project-name}

> {description}

[![npm version](https://img.shields.io/npm/v/{project-name}.svg)](https://www.npmjs.com/package/{project-name})
[![Downloads](https://img.shields.io/npm/dm/{project-name}.svg)](https://www.npmjs.com/package/{project-name})
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Describe key feature 1
- Describe key feature 2
- Describe key feature 3

## Installation

\`\`\`bash
npm install {project-name}
\`\`\`

## Quick start

\`\`\`ts
import { useful } from '{project-name}'

const result = useful({ option: 'value' })
console.log(result)
\`\`\`

## Usage

### Basic example

\`\`\`ts
// Describe the primary use case
\`\`\`

### Advanced options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`option1\` | \`string\` | \`'default'\` | Describe option 1 |
| \`option2\` | \`boolean\` | \`false\` | Describe option 2 |

## API

See the [full API docs](https://your-docs-site.com/{project-name}).

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md).

1. Fork and clone the repository
2. Install dependencies: \`npm install\`
3. Run tests: \`npm test\`
4. Create your feature branch
5. Open a pull request

## License

MIT (c) {year} {author}
`,
  },
  {
    id: 'go-microservice',
    name: 'Go microservice',
    description: 'Go service template with config, health checks, Docker, and operational endpoints.',
    body: `# {project-name}

> {description}

![Go](https://img.shields.io/badge/go-1.22+-00ADD8) ![CI](https://img.shields.io/badge/ci-passing-success) ![License](https://img.shields.io/badge/license-MIT-blue)

## Overview

Describe the service, the problem it solves, and the systems it integrates with.

## Architecture

\`\`\`
Client -> Load balancer -> {project-name} -> Postgres / Redis / external APIs
\`\`\`

## Installation

\`\`\`bash
git clone https://github.com/org/{project-name}.git
cd {project-name}
go mod tidy
go build ./...
\`\`\`

## Configuration

\`\`\`env
PORT=8080
DATABASE_URL=postgres://user:pass@localhost:5432/app
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
\`\`\`

## Usage

\`\`\`bash
go run ./cmd/server
\`\`\`

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| \`/healthz\` | GET | Liveness probe |
| \`/readyz\` | GET | Readiness probe |
| \`/v1/resources\` | GET | List resources |
| \`/v1/resources\` | POST | Create a resource |

## Development

\`\`\`bash
go test ./...
go vet ./...
golangci-lint run
\`\`\`

## Docker

\`\`\`bash
docker build -t {project-name} .
docker run --rm -p 8080:8080 --env-file .env {project-name}
\`\`\`

## Contributing

1. Create a feature branch
2. Run \`go test ./...\` and \`go vet ./...\`
3. Open a pull request with implementation notes

## License

MIT (c) {year} {author}
`,
  },
  {
    id: 'go-library',
    name: 'Go library',
    description: 'Package-focused README with install, examples, exported API overview, and versioning notes.',
    body: `# {project-name}

> {description}

[![Go Reference](https://pkg.go.dev/badge/github.com/org/{project-name}.svg)](https://pkg.go.dev/github.com/org/{project-name})
![Go](https://img.shields.io/badge/go-1.22+-00ADD8)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- Small, composable API surface
- Sensible defaults for common workflows
- Test coverage for core package behavior

## Installation

\`\`\`bash
go get github.com/org/{project-name}
\`\`\`

## Quick start

\`\`\`go
package main

import (
  "fmt"

  lib "github.com/org/{project-name}"
)

func main() {
  result := lib.New()
  fmt.Println(result)
}
\`\`\`

## Usage

### Basic example

\`\`\`go
client := lib.New()
err := client.Run()
if err != nil {
  panic(err)
}
\`\`\`

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| \`Timeout\` | \`time.Duration\` | \`5s\` | Request timeout |
| \`Logger\` | \`interface\` | \`nil\` | Structured logger |
| \`RetryCount\` | \`int\` | \`3\` | Retry attempts for transient failures |

## API

Document the most important exported types and functions:

- \`New(...Option) *Client\`
- \`(*Client).Run() error\`
- \`WithTimeout(time.Duration) Option\`

## Versioning

This project follows semantic versioning. Breaking API changes are released in a new major version.

## Contributing

1. Fork the repository
2. Run \`go test ./...\`
3. Keep public API changes documented in this README and package docs

## License

MIT (c) {year} {author}
`,
  },
  {
    id: 'go-cli',
    name: 'Go CLI tool',
    description: 'Single-binary Go CLI template with install methods, command examples, and release flow.',
    body: `# {project-name}

> {description}

![Go](https://img.shields.io/badge/go-1.22+-00ADD8) ![Release](https://img.shields.io/github/v/release/org/{project-name}) ![License](https://img.shields.io/badge/license-MIT-blue)

## Installation

### Go install

\`\`\`bash
go install github.com/org/{project-name}/cmd/{project-name}@latest
\`\`\`

### Binary release

Download a platform build from [GitHub Releases](https://github.com/org/{project-name}/releases).

\`\`\`bash
curl -LO https://github.com/org/{project-name}/releases/latest/download/{project-name}_windows_amd64.zip
\`\`\`

## Usage

\`\`\`
{project-name} [command] [flags]

Available Commands:
  init        Create starter configuration
  run         Execute the main workflow
  doctor      Validate local environment
  version     Print build version
\`\`\`

### Quick start

\`\`\`bash
{project-name} init
{project-name} run --config ./{project-name}.yaml
\`\`\`

## Configuration

\`\`\`yaml
log_level: info
output: ./dist
color: true
\`\`\`

## Commands

| Command | Description |
|---------|-------------|
| \`init\` | Bootstrap a local config file |
| \`run\` | Execute the primary command |
| \`doctor\` | Check dependencies and environment |
| \`completion\` | Generate shell completions |

## Development

\`\`\`bash
go test ./...
go build ./cmd/{project-name}
\`\`\`

## Release process

\`\`\`bash
git tag v1.2.0
git push origin v1.2.0
\`\`\`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Run \`go test ./...\` before submitting changes.

## License

MIT (c) {year} {author}
`,
  },
  {
    id: 'frontend-app',
    name: 'Frontend web app',
    description: 'React/Next.js/Vite app with env setup, routing, and deployment.',
    body: `# {project-name}

> {description}

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/org/{project-name}) ![CI](https://img.shields.io/github/actions/workflow/status/org/{project-name}/ci.yml)

## Tech stack

- **Framework**: React 18 / Next.js 14
- **Styling**: Tailwind CSS
- **State**: Zustand / TanStack Query
- **Testing**: Vitest + Testing Library

## Installation

\`\`\`bash
git clone https://github.com/org/{project-name}.git
cd {project-name}
npm install
cp .env.example .env.local
npm run dev
\`\`\`

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| \`NEXT_PUBLIC_API_URL\` | Yes | Backend API base URL |
| \`NEXT_PUBLIC_GA_ID\` | No | Google Analytics measurement ID |

## Scripts

| Command | Description |
|---------|-------------|
| \`npm run dev\` | Start dev server |
| \`npm run build\` | Production build |
| \`npm run test\` | Run unit tests |
| \`npm run lint\` | Lint code |

## Deployment

### Vercel (recommended)

\`\`\`bash
vercel --prod
\`\`\`

### Docker

\`\`\`bash
docker build -t {project-name} .
docker run -p 3000:3000 {project-name}
\`\`\`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Please run \`npm run lint && npm test\` before submitting PRs.

## License

MIT (c) {year} {author}
`,
  },
  {
    id: 'cli-tool',
    name: 'CLI tool',
    description: 'Installation via Homebrew/npm/binary, command reference, and shell completions.',
    body: `# {project-name}

> {description}

![CI](https://img.shields.io/github/actions/workflow/status/org/{project-name}/ci.yml) ![GitHub release](https://img.shields.io/github/v/release/org/{project-name}) ![License](https://img.shields.io/badge/license-MIT-blue)

## Installation

### Homebrew (macOS / Linux)

\`\`\`bash
brew install org/{project-name}
\`\`\`

### npm

\`\`\`bash
npm install -g {project-name}
\`\`\`

### Binary releases

Download the latest binary for your OS from [GitHub Releases](https://github.com/org/{project-name}/releases).

## Usage

\`\`\`
Usage: {project-name} <command> [flags]

Commands:
  init       Scaffold a new project
  run        Execute the main workflow
  config     Manage configuration
  help       Show help for a command
\`\`\`

### Quick start

\`\`\`bash
{project-name} init my-project
{project-name} run --verbose
\`\`\`

## Configuration

\`\`\`yaml
version: 1
output: dist/
verbose: false
\`\`\`

## Shell completions

\`\`\`bash
{project-name} completion bash >> ~/.bashrc
\`\`\`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Run tests with \`make test\`.

## License

MIT (c) {year} {author}
`,
  },
  {
    id: 'monorepo',
    name: 'Monorepo',
    description: 'Workspace README with apps, packages, and shared configs.',
    body: `# {project-name}

> {description}

Built with [Turborepo](https://turbo.build/repo).

## Structure

\`\`\`
{project-name}/
|- apps/
|  |- web/       # frontend
|  |- api/       # backend
|- packages/
|  |- ui/
|  |- utils/
\`\`\`

## Installation

\`\`\`bash
git clone https://github.com/org/{project-name}.git
cd {project-name}
npm install
\`\`\`

## Usage

\`\`\`bash
npm run dev
npm run build
npm run test
npm run lint
\`\`\`

## Apps

| App | Description | Port |
|-----|-------------|------|
| \`apps/web\` | Customer-facing frontend | 3000 |
| \`apps/api\` | Backend API server | 4000 |

## Packages

| Package | Description |
|---------|-------------|
| \`packages/ui\` | Shared React component library |
| \`packages/utils\` | Shared utility functions |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT (c) {year} {author}
`,
  },
  {
    id: 'professional-template',
    name: 'Professional template',
    description: 'Polished product README for full-stack platforms with architecture, monorepo setup, and deployment details.',
    body: `# CollabFlow

**Collabflow** is a modern collaborative workspace platform designed for teams to manage workspaces, projects, tasks, and real-time collaboration efficiently.  
It focuses on scalability, real-time updates, and clean architecture using modern web technologies.

<p align="center">
<img src="https://res.cloudinary.com/dha7ofrer/image/upload/v1767956502/icon_zue5em.svg" alt="logo" width="400">
</p>

## Demo

https://collabflow.abhishekkkk.in

## Features

- Workspace management for creating and organizing multiple workspaces
- Project management with user assignment inside each workspace
- Task management with CRUD operations, activity tracking, and workflow states
- Real-time processing powered by BullMQ and Redis queues
- Authentication and authorization with workspace and project level access control
- Scalable architecture with workers separated from the API layer

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- ShadCN UI
- TanStack Query

### Backend

- NestJS
- Prisma
- PostgreSQL (NeonDB)
- Redis

### Background Jobs

- BullMQ
- Dedicated worker services

### DevOps & Deployment

- Render (API and workers)
- Vercel (Frontend)

## Architecture Overview

\`\`\`bash
User -> Next.js Web App
        ->
API (NestJS)
        ->
PostgreSQL (NeonDB)
        ->
Redis Queue (BullMQ)
        ->
Background Workers
        ->
Emails / Async Jobs
\`\`\`

### Key Principles

- API is stateless and horizontally scalable
- Workers run as independent services
- Redis is shared between API and workers
- Background jobs are handled via BullMQ
- Prisma is centralized via \`@collabflow/db\`

## Monorepo Setup & Installation

Collabflow uses a monorepo workspace architecture to manage frontend, backend, and worker services in a single repository.

### Requirements

- Node.js >= 20
- pnpm >= 8
- PostgreSQL
- Redis
- Docker (optional, for local DB and Redis)

## Repository Structure

\`\`\`bash
.
├── apps/
│   ├── api/        # Backend API (Nest server)
│   ├── web/        # Frontend web application (Next.js)
│   └── workers/    # Background workers (BullMQ / Redis)
├── packages/
│   ├── db/         # Database layer (Prisma / ORM / schema)
│   └── types/      # Shared TypeScript types
\`\`\`

## Environment Configuration

Each service has its own \`.env\` file.

### Backend (\`apps/api/.env\`)

\`\`\`env
NEXT_PUBLIC_API_URL=
NEXTAUTH_SECRET=
NODE_ENV=
PORT=
REDIS_URL=
RESEND_API_KEY=
\`\`\`

### Frontend (\`apps/web/.env\`)

\`\`\`env
NEXT_PUBLIC_API_URL=
AUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_ID=
GITHUB_SECRET=
NEXTAUTH_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
DATABASE_URL=
NEXT_PUBLIC_BACKEND_URL=
NEXT_PUBLIC_WORKER_URL=
\`\`\`

## Installation

\`\`\`bash
git clone https://github.com/abhishekkkk.in/collabflow.git
cd collabflow
pnpm install
\`\`\`

## Usage

\`\`\`bash
pnpm dev
\`\`\`

## Contributing

Use feature branches, keep service boundaries clean, and validate database and worker changes before opening a pull request.

## Authors

- [@abhishekkkk-15](https://www.github.com/abhishekkkk-15)
- Abhishek Jangid

## License

[MIT](https://choosealicense.com/licenses/mit/)
`,
  },
];

export function findCliTemplate(id?: string | null): CliReadmeTemplate | undefined {
  if (!id) return undefined;
  return CLI_README_TEMPLATES.find((template) => template.id === id.trim());
}
