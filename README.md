<p align="center">
  <h1 align="center">readme-gen-workspace</h1>
  <p align="center"></p>
</p>

<p align="center">
![license](https://img.shields.io/badge/license-blue?style=flat-square) ![stars](https://img.shields.io/badge/stars-blue?style=flat-square) ![version](https://img.shields.io/badge/version-blue?style=flat-square)
</p>

<p align="center">
[README](README.md)
</p>


## 🧠 Architecture Overview
```bash
User → Web App
        ↓
API (Express.js)
        ↓
MongoDB (Mongoose)
```


# readme-gen-workspace
Automated Readme Generation for Software Projects

## PROJECT CONTEXT
The `readme-gen-workspace` project is a monorepo situated in the industry domain of Software Development and Documentation, specifically addressing the problem space of Automated Readme Generation. The core logic revolves around generating high-quality, informative, and engaging README files for software projects, leveraging natural language processing (NLP) and machine learning (ML) techniques.

## INSTALLATION
To install the project, run the following commands:

```bash
pnpm install
```

For specific services, use `pnpm --filter`:

```bash
# Install dependencies for the web application
pnpm --filter apps/web install

# Install dependencies for the API server
pnpm --filter apps/api install
```

## USAGE
To generate a README file for a project, use the following code snippet:

```typescript
// Import the generate function from the generate.controller.ts file
import { generate } from '../packages/analyzer/src/generate.controller';

// Create a new project configuration
const projectConfig = {
  name: 'My Project',
  description: 'A sample project',
  language: 'JavaScript',
  framework: 'React',
};

// Generate the README file
const readme = generate(projectConfig);

// Print the generated README file
console.log(readme);
```

## FEATURES
The `readme-gen-workspace` project features:

* Automated Readme Generation using NLP and ML techniques
* Support for multiple programming languages and frameworks
* Integration with large language models for advanced content generation
* Customizable project configurations for tailored README files
* Seamless data extraction and processing for accurate project information

## ARCHITECTURE
The project structure is organized into the following services:

* `packages/analyzer`: Contains the logic for analyzing project configurations and generating README files
* `packages/api`: Contains the API server for managing project configurations and generating README files
* `apps/web`: Contains the web application for interacting with the API and generating README files
* `apps/cli`: Contains the command-line interface for interacting with the API and generating README files

The project uses a microservices architecture, with each service responsible for a specific aspect of the project. The services communicate with each other using APIs and message queues.

## DEPENDENCIES
The project depends on the following packages:

* `ignore`
* `ts-morph`
* `@base-ui/react`
* `@dnd-kit/core`
* `@dnd-kit/sortable`
* `@dnd-kit/utilities`
* `@fontsource-variable/geist`
* `@hookform/resolvers`
* `@monaco-editor/react`
* `@tanstack/react-query`
* `class-variance-authority`
* `clsx`
* `diff`
* `framer-motion`
* `lucide-react`
* `next-themes`
* `react`
* `react-dom`
* `react-hook-form`
* `react-markdown`
* `react-router-dom`
* `react-syntax-highlighter`
* `shadcn`
* `sonner`
* `tailwind-merge`
* `tailwindcss-animate`
* `tw-animate-css`
* `zod`
* `axios`
* `chalk`
* `commander`
* `conf`
* `dotenv`
* `glob`
* `inquirer`
* `ora`
* `@readme-gen/analyzer`
* `@langchain/core`
* `@langchain/google-genai`
* `@langchain/groq`
* `@types/bcryptjs`
* `@types/cookie-parser`
* `@types/jsonwebtoken`
* `@types/passport`
* `@types/passport-github2`
* `@types/passport-google-oauth20`
* `@types/passport-jwt`
* `@types/passport-local`
* `bcryptjs`
* `cookie-parser`
* `cors`
* `express`
* `jsonwebtoken`
* `mongoose`
* `passport`
* `passport-github2`
* `passport-google-oauth20`
* `passport-jwt`
* `passport-local`

## SCRIPTS
The project uses the following scripts:

* `dev`: Runs the development server
* `api`: Runs the API server
* `build`: Builds the project
* `lint`: Runs the linter
* `preview`: Runs the preview server
* `packages/analyzer:build`: Builds the analyzer package
* `packages/analyzer:dev`: Runs the analyzer package in development mode
* `apps/web:dev`: Runs the web application in development mode
* `apps/web:build`: Builds the web application
* `apps/web:lint`: Runs the linter for the web application
* `apps/web:preview`: Runs the preview server for the web application
* `apps/cli:build`: Builds the CLI package
* `apps/cli:start`: Starts the CLI package
* `apps/cli:lint`: Runs the linter for the CLI package
* `apps/api:dev`: Runs the API server in development mode
* `apps/api:build`: Builds the API server
* `apps/api:start`: Starts the API server
* `apps/api:lint`: Runs the linter for the API server

## ⚙️ Environment Configuration

Each service has its own `.env` file.

### Web (`apps/web/.env`)

```env

PORT=
FRONTEND_URL=
JWT_SECRET=
MONGODB_URI=
GITHUB_TOKEN=
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

```

## Production-grade semantic README pipeline (local)

This repo includes a **multi-stage README generation pipeline** that **never generates a README directly from raw code**. Instead it:

- Extracts **semantic evidence** (routes, env vars, function/class signatures, real test examples)
- Builds a **semantic understanding JSON layer** via multiple LLM calls
- Generates `README.md` **only from the final semantic JSON**

### CLI usage

The semantic pipeline is exposed via `generate`:

```bash
# Build CLI first (monorepo)
pnpm --filter @readme-gen/cli build

# Run from your target project directory
devcon generate --provider groq --output README.md

# With a hero screenshot + business context (n8n-style)
devcon generate \
  --provider gemini \
  --hero "https://your-domain.com/screenshot.png" \
  --context "Explain what problem this solves and who uses it." \
  --tone professional \
  --mode rewrite
```

### Required keys

- **Groq**: `GROQ_API_KEY`
- **Gemini**: `GOOGLE_GENERATIVE_AI_API_KEY`

You can set these as environment variables, or configure them via the CLI `init/config` flows.

### Cli (`apps/cli/.env`)

```env

PORT=
FRONTEND_URL=
JWT_SECRET=
MONGODB_URI=
GITHUB_TOKEN=
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

```

### Api (`apps/api/.env`)

```env

PORT=
FRONTEND_URL=
JWT_SECRET=
MONGODB_URI=
GITHUB_TOKEN=
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

```
