import type { ReadmeTemplate } from '@/types'

const allOn = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, true])) as Record<string, boolean>

const baseKeys = ['Installation', 'Usage', 'API', 'Contributing', 'License', 'Badges']

export type ReadmeTemplateWithBody = ReadmeTemplate & {
  category: 'backend' | 'frontend' | 'library' | 'ml' | 'cli' | 'mobile' | 'internal'
  body: string
  tags: string[]
}

export const readmeTemplates: ReadmeTemplateWithBody[] = [
  {
    id: 'go-microservice',
    name: 'Go microservice',
    description: 'Go service template with config, health checks, Docker, and operational endpoints.',
    category: 'backend',
    tags: ['Go', 'Microservice', 'Docker', 'Backend'],
    sections: { ...allOn(baseKeys), API: true, Badges: true },
    tone: 'technical',
    badges: true,
    sampleIntro: 'Production-oriented Go service with structured config and observability hooks.',
    body: `# {project-name}

> {description}

![Go](https://img.shields.io/badge/go-1.22+-00ADD8) ![CI](https://img.shields.io/badge/ci-passing-success) ![License](https://img.shields.io/badge/license-MIT-blue)

## Overview

Describe the service, the problem it solves, and the systems it integrates with.

## Architecture

\`\`\`
Client -> Load balancer -> {project-name} -> Postgres / Redis / external APIs
\`\`\`

Document the major request flow and failure boundaries here.

## Installation

\`\`\`bash
git clone https://github.com/org/{project-name}.git
cd {project-name}
go mod tidy
go build ./...
\`\`\`

## Configuration

Create a local environment file or export variables before starting the service:

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

Example health check:

\`\`\`bash
curl http://localhost:8080/healthz
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
    category: 'library',
    tags: ['Go', 'Library', 'Package', 'OSS'],
    sections: { ...allOn(baseKeys), API: true, Contributing: true, License: true },
    tone: 'friendly',
    badges: true,
    sampleIntro: 'Reusable Go package with clear examples and stable public APIs.',
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

Link to [pkg.go.dev](https://pkg.go.dev/github.com/org/{project-name}) for full package documentation.

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
    category: 'cli',
    tags: ['Go', 'CLI', 'Cobra', 'Binary'],
    sections: { ...allOn(baseKeys) },
    tone: 'technical',
    badges: true,
    sampleIntro: 'Fast Go-based CLI distributed as a single binary.',
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

Tag a new version and publish binaries with your release pipeline:

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
    id: 'professional-template',
    name: 'Professional template',
    description: 'Polished product README for full-stack platforms with architecture, monorepo setup, and deployment details.',
    category: 'frontend',
    tags: ['Professional', 'Monorepo', 'Next.js', 'NestJS'],
    sections: { ...allOn(baseKeys), API: false, Badges: false },
    tone: 'technical',
    badges: false,
    sampleIntro: 'Professional product-style README with architecture, environments, and deployment details.',
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
│
├── packages/
│   ├── db/         # Database layer (Prisma / ORM / schema)
│   └── types/      # Shared TypeScript types
│
├── node_modules/
├── .gitignore
├── docker-compose.yml
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── turbo.json
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

### Worker (\`apps/workers/.env\`)

\`\`\`env
REDIS_URL=
RESEND_API_KEY=
NEXT_PUBLIC_API_URL=
PORT=
\`\`\`

### Database (\`packages/db/.env\`)

\`\`\`env
DATABASE_URL=
RESEND_API_KEY=
\`\`\`

## Installation

Clone the repository:

\`\`\`bash
git clone https://github.com/abhishekkkk.in/collabflow.git
cd collabflow
\`\`\`

Install dependencies workspace-wide:

\`\`\`bash
pnpm install
\`\`\`

This installs dependencies for all apps and shared packages.

### Database Setup

\`\`\`bash
pnpm --filter @collabflow/db prisma generate
pnpm --filter @collabflow/db prisma migrate dev
\`\`\`

Optional Prisma Studio:

\`\`\`bash
pnpm --filter @collabflow/db prisma studio
\`\`\`

## Usage

### Start Services (Development)

\`\`\`bash
pnpm dev
\`\`\`

Or start services individually:

\`\`\`bash
# Backend API
pnpm --filter api dev

# Frontend
pnpm --filter web dev

# Workers
pnpm --filter workers dev

# Shared packages
pnpm --filter @collabflow/types build
pnpm --filter @collabflow/db build
\`\`\`

### Background Workers

\`\`\`bash
pnpm --filter workers start
\`\`\`

### Production Build

\`\`\`bash
pnpm build
\`\`\`

## Contributing

Use feature branches, keep service boundaries clean, and validate database and worker changes before opening a pull request.

## Authors

- [@abhishekkkk-15](https://www.github.com/abhishekkkk-15)
- Abhishek Jangid
- Backend-focused Full Stack Developer
- LinkedIn: https://www.linkedin.com/in/abhishek-jangid-3532b1323

## License

[MIT](https://choosealicense.com/licenses/mit/)
`,
  },
  {
    id: 'saas-api',
    name: 'SaaS / REST API',
    description: 'OpenAPI-style sections, auth, rate limits, and SDK docs.',
    category: 'backend',
    tags: ['REST', 'OAuth', 'API', 'Backend'],
    sections: { ...allOn(baseKeys), API: true, Badges: true },
    tone: 'technical',
    badges: true,
    sampleIntro: 'Cloud API with OAuth2, webhooks, and SDKs.',
    body: `# {project-name}

> {description}

![CI](https://img.shields.io/badge/ci-passing-success) ![License](https://img.shields.io/badge/license-MIT-blue) ![Version](https://img.shields.io/badge/version-1.0.0-blue)

## Overview

Brief description of what this API does and the business problem it solves.

## Installation

\`\`\`bash
npm install @your-org/{project-name}-sdk
\`\`\`

Or use the REST API directly — no SDK required.

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

MIT © {year} {author}
`,
  },
  {
    id: 'oss-library',
    name: 'Open-source library',
    description: 'NPM/PyPI install, usage examples, and a detailed contributing guide.',
    category: 'library',
    tags: ['NPM', 'PyPI', 'Open source', 'Library'],
    sections: { ...allOn(baseKeys), Contributing: true, License: true },
    tone: 'friendly',
    badges: true,
    sampleIntro: 'Community-driven package published on the registry of your choice.',
    body: `# {project-name}

> {description}

[![npm version](https://img.shields.io/npm/v/{project-name}.svg)](https://www.npmjs.com/package/{project-name})
[![Downloads](https://img.shields.io/npm/dm/{project-name}.svg)](https://www.npmjs.com/package/{project-name})
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✨ Describe key feature 1
- ⚡ Describe key feature 2
- 🔒 Describe key feature 3

## Installation

\`\`\`bash
# npm
npm install {project-name}

# yarn
yarn add {project-name}

# pnpm
pnpm add {project-name}
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
5. Open a pull request 🎉

## License

MIT © {year} {author}
`,
  },
  {
    id: 'internal-tool',
    name: 'Internal platform tool',
    description: 'Runbooks, ownership, on-call, and SLOs — enterprise tone.',
    category: 'internal',
    tags: ['Internal', 'Runbook', 'Platform', 'Enterprise'],
    sections: {
      Installation: true,
      Usage: true,
      API: false,
      Contributing: false,
      License: false,
      Badges: false,
    },
    tone: 'enterprise',
    badges: false,
    sampleIntro: 'Internal service — see runbook and SLOs in the wiki.',
    body: `# {project-name}

> {description}

**Owned by:** Platform Engineering  
**On-call:** [PagerDuty rotation](https://yourco.pagerduty.com/schedules)  
**Runbook:** [Confluence link](https://yourco.atlassian.net/wiki)  
**SLO:** 99.9% uptime, p99 < 200 ms

---

## Overview

Describe what this service does and why it exists. Include which downstream systems depend on it.

## Architecture

\`\`\`
[Client] → [Load Balancer] → [{project-name}] → [Database / Cache]
\`\`\`

Describe each hop and the data flow briefly.

## Installation

### Prerequisites

- Access to the internal VPC
- Vault credentials for secrets
- Kubernetes context configured

\`\`\`bash
kubectl apply -f deploy/k8s/
\`\`\`

### Local development

\`\`\`bash
cp .env.example .env
docker compose up
\`\`\`

## Usage

### Common operations

\`\`\`bash
# Check service health
curl http://localhost:8080/healthz

# View metrics
open http://localhost:9090
\`\`\`

## Runbook

### Incident: High latency

1. Check Grafana dashboard for DB query times
2. Review slow-query log
3. Escalate to on-call DBA if > 5 min

### Incident: Pod crash loop

1. \`kubectl describe pod <pod>\`
2. Check OOM events
3. Increase memory limits in \`deploy/k8s/deployment.yaml\`

## Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| HighErrorRate | > 1% 5xx for 5 min | Page on-call |
| HighLatency | p99 > 1 s for 10 min | Check DB |
| PodCrashLoop | 3 restarts in 10 min | Check logs |
`,
  },
  {
    id: 'data-ml',
    name: 'Data / ML project',
    description: 'Datasets, model training, evaluation metrics, and reproducibility.',
    category: 'ml',
    tags: ['ML', 'Python', 'Dataset', 'Training'],
    sections: {
      Installation: true,
      Usage: true,
      API: true,
      Contributing: true,
      License: true,
      Badges: true,
    },
    tone: 'technical',
    badges: true,
    sampleIntro: 'Training pipelines, metrics, and how to reproduce experiments.',
    body: `# {project-name}

> {description}

![Python](https://img.shields.io/badge/python-3.10+-blue) ![License](https://img.shields.io/badge/license-Apache2-green)

## Overview

Describe the ML task (classification, generation, etc.), the dataset, and the key results.

| Metric | Value |
|--------|-------|
| Accuracy | 94.2% |
| F1 Score | 0.941 |
| Inference | ~12 ms/sample |

## Installation

\`\`\`bash
git clone https://github.com/org/{project-name}.git
cd {project-name}
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
\`\`\`

## Dataset

Describe the dataset source, size, and license. Provide a download script if applicable:

\`\`\`bash
python scripts/download_data.py --split train
\`\`\`

## Training

\`\`\`bash
python train.py \\
  --config configs/default.yaml \\
  --output checkpoints/run-001
\`\`\`

## Evaluation

\`\`\`bash
python evaluate.py --checkpoint checkpoints/run-001/best.pt
\`\`\`

## Inference

\`\`\`python
from {project_name} import Model

model = Model.from_pretrained("checkpoints/run-001/best.pt")
output = model.predict("Your input text here")
print(output)
\`\`\`

## Reproducing results

\`\`\`bash
./scripts/reproduce.sh  # runs full pipeline with fixed seeds
\`\`\`

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md). Run \`pre-commit install\` before submitting PRs.

## License

Apache 2.0 — see [LICENSE](LICENSE).
`,
  },
  {
    id: 'cli-tool',
    name: 'CLI tool',
    description: 'Installation via Homebrew/npm/binary, command reference, and shell completions.',
    category: 'cli',
    tags: ['CLI', 'Terminal', 'Homebrew', 'Shell'],
    sections: { ...allOn(baseKeys) },
    tone: 'technical',
    badges: true,
    sampleIntro: 'A fast, single-binary CLI for automating developer workflows.',
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

\`\`\`bash
# macOS arm64
curl -LO https://github.com/org/{project-name}/releases/latest/download/{project-name}_darwin_arm64.tar.gz
tar xf {project-name}_darwin_arm64.tar.gz
sudo mv {project-name} /usr/local/bin/
\`\`\`

## Usage

\`\`\`
Usage: {project-name} <command> [flags]

Commands:
  init       Scaffold a new project
  run        Execute the main workflow
  config     Manage configuration
  help       Show help for a command

Flags:
  --config   Path to config file (default: .{project-name}.yaml)
  --verbose  Enable verbose logging
  --version  Print version
\`\`\`

### Quick start

\`\`\`bash
# Initialize
{project-name} init my-project

# Run
{project-name} run --verbose
\`\`\`

## Configuration

Create \`.{project-name}.yaml\` in your project root:

\`\`\`yaml
version: 1
output: dist/
verbose: false
\`\`\`

## Shell completions

\`\`\`bash
# Bash
{project-name} completion bash >> ~/.bashrc

# Zsh
{project-name} completion zsh >> ~/.zshrc

# Fish
{project-name} completion fish > ~/.config/fish/completions/{project-name}.fish
\`\`\`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Run tests with \`make test\`.

## License

MIT © {year} {author}
`,
  },
  {
    id: 'mobile-app',
    name: 'Mobile app (React Native)',
    description: 'Setup for iOS & Android, environment, and deep link handling.',
    category: 'mobile',
    tags: ['React Native', 'iOS', 'Android', 'Mobile'],
    sections: { ...allOn(baseKeys) },
    tone: 'friendly',
    badges: true,
    sampleIntro: 'Cross-platform mobile app built with React Native.',
    body: `# {project-name}

> {description}

![Platform: iOS](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey) ![License](https://img.shields.io/badge/license-MIT-blue)

## Requirements

| Tool | Version |
|------|---------|
| Node | 20+ |
| React Native CLI | 0.73+ |
| Xcode | 15+ |
| Android Studio | Hedgehog+ |

## Installation

\`\`\`bash
git clone https://github.com/org/{project-name}.git
cd {project-name}
npm install
\`\`\`

### iOS

\`\`\`bash
cd ios && pod install && cd ..
npm run ios
\`\`\`

### Android

\`\`\`bash
npm run android
\`\`\`

## Environment variables

Copy \`.env.example\` to \`.env\` and fill in the values:

\`\`\`env
API_BASE_URL=https://api.example.com
SENTRY_DSN=https://...
\`\`\`

## Usage

Describe the main screens and user flows. Add screenshots here.

## Deep links

The app handles the \`{project-name}://\` scheme:

| URL | Screen |
|-----|--------|
| \`{project-name}://home\` | Home tab |
| \`{project-name}://profile/:id\` | User profile |

## Contributing

1. Create a feature branch
2. Run \`npm run lint && npm test\`
3. Open a PR

## License

MIT © {year} {author}
`,
  },
  {
    id: 'frontend-app',
    name: 'Frontend web app',
    description: 'React/Next.js/Vite app with env setup, routing, and deployment.',
    category: 'frontend',
    tags: ['React', 'Next.js', 'Vite', 'Frontend'],
    sections: { ...allOn(baseKeys) },
    tone: 'technical',
    badges: true,
    sampleIntro: 'Modern web application built with React and deployed on Vercel.',
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

Open [http://localhost:3000](http://localhost:3000).

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

Click the **Deploy** button above, or:

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

MIT © {year} {author}
`,
  },
  {
    id: 'monorepo',
    name: 'Monorepo',
    description: 'Turborepo / Nx workspace with apps, packages, and shared configs.',
    category: 'frontend',
    tags: ['Monorepo', 'Turborepo', 'Nx', 'Workspace'],
    sections: { ...allOn(baseKeys) },
    tone: 'technical',
    badges: true,
    sampleIntro: 'Turborepo monorepo housing web app, API, and shared packages.',
    body: `# {project-name}

> {description}

Built with [Turborepo](https://turbo.build/repo).

## Structure

\`\`\`
{project-name}/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express / Fastify backend
└── packages/
    ├── ui/           # Shared component library
    ├── config/       # Shared ESLint, TSConfig
    └── utils/        # Shared utilities
\`\`\`

## Installation

\`\`\`bash
git clone https://github.com/org/{project-name}.git
cd {project-name}
npm install   # installs all workspaces
\`\`\`

## Usage

\`\`\`bash
# Run all apps in dev mode
npm run dev

# Build all packages and apps
npm run build

# Run tests across all workspaces
npm run test

# Lint all packages
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
| \`packages/config\` | Shared config (ESLint, TypeScript) |
| \`packages/utils\` | Shared utility functions |

## Adding a new package

\`\`\`bash
cd packages
mkdir my-package && cd my-package
npm init -y
\`\`\`

Update \`turbo.json\` pipeline if the package has build outputs.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT © {year} {author}
`,
  },
]
