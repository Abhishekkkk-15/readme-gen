# readme-gen-workspace

![License](https://img.shields.io/github/license/user/readme-gen-workspace?style=flat-square) ![Stars](https://img.shields.io/github/stars/user/readme-gen-workspace?style=flat-square) ![Version](https://img.shields.io/github/v/release/user/readme-gen-workspace?style=flat-square)

[README](README.md) | [Security](SECURITY.md)


# readme-gen-workspace

## Technical Overview

This codebase is a comprehensive software application built using the React framework. The production dependencies indicate a diverse set of libraries and tools, including UI components, state management, and data fetching utilities.

### Architecture

The project is a monorepo consisting of multiple packages and applications. The architecture is derived from the directory structure and file names.

#### Packages

The packages are located in the `packages` directory. Each package has its own `package.json` file and is a separate npm package.

* **analyzer**: This package contains tools for analyzing code, including scanners, analyzers, and extractors.
* **cli**: This package contains the command-line interface (CLI) for the application.
* **api**: This package contains the API for the application.

#### Applications

The applications are located in the `apps` directory. Each application has its own `package.json` file and is a separate npm package.

* **web**: This is a web application that uses the `analyzer` package to provide code analysis features.
* **api**: This is an API application that uses the `analyzer` package to provide code analysis features.

#### Shared Libraries

The shared libraries are located in the `packages` directory and are shared across multiple packages and applications.

* **types**: This library contains type definitions for the application.
* **utils**: This library contains utility functions for the application.
* **services**: This library contains services that can be used across multiple packages and applications.

## Technical Truth Map

The following table summarizes the technical truth map:

| File/Class | Description |
| --- | --- |
| `apps/api/src/server.ts` | Uses Express.js framework for building the server. |
| `apps/api/src/routes/auth.routes.ts` | Implements authentication using Passport.js. |
| `apps/api/src/routes/api.routes.ts` | Uses Express.js Router for handling API routes. |
| `apps/api/src/controllers/generate.controller.ts` | Calls services to analyze repositories and generate readmes. |
| `apps/api/src/services/repo.service.ts` | Uses Axios for making HTTP requests to GitHub API. |
| `apps/api/src/services/llm.service.ts` | Uses LangChain library for language model interactions. |
| `packages/analyzer/src/analyzers/route.extractor.ts` | Uses ts-morph library for TypeScript code analysis. |
| `apps/api/src/samplers/code.sampler.ts` | Generates code samples from given content. |
| `apps/cli/src/commands/config/index.ts` | Manages configuration using a config manager. |
| `apps/api/src/config/passport.ts` | Configures Passport.js for authentication. |
| `apps/api/src/config/db.ts` | Connects to a MongoDB database using Mongoose. |
| `apps/cli/src/services/api.service.ts` | Generates README files using the Readme-gen analyzer. |
| `apps/cli/src/services/analyzer.service.ts` | Analyzes project structure and code using the Readme-gen analyzer. |
| `apps/web/src/main.tsx` | Initializes a React application using React DOM and React Router. |
| `apps/web/src/App.tsx` | Defines the main application component with routing and layout. |
| `apps/web/src/providers/app-providers.tsx` | Provides global context and services to the application, including authentication and theme management. |
| `apps/web/src/pages/templates.tsx` | Displays a list of available README templates. |
| `apps/api/src/extractors/package.extractor.ts` | Extracts package metadata from project files. |
| `apps/api/src/extractors/config.extractor.ts` | Extracts environment variables and configuration files from project files. |

## Usage

To use the `readme-gen-workspace` application, follow these steps:

1. Clone the repository using `git clone`.
2. Install the dependencies using `npm install`.
3. Start the application using `npm start`.
4. Access the application at `http://localhost:3000`.

## Tech Stack

The following technologies are used in the `readme-gen-workspace` application:

* React
* TypeScript
* Express.js
* Passport.js
* Mongoose
* Axios
* LangChain
* ts-morph
* @base-ui/react
* @dnd-kit/core
* @dnd-kit/sortable
* @dnd-kit/utilities
* @fontsource-variable/geist
* @hookform/resolvers
* @monaco-editor/react
* @tanstack/react-query
* class-variance-authority
* clsx
* diff
* framer-motion
* lucide-react
* next-themes
* react
* react-dom
* react-hook-form
* react-markdown
* react-router-dom
* react-syntax-highlighter
* shadcn
* sonner
* tailwind-merge
* tailwindcss-animate
* tw-animate-css
* zod