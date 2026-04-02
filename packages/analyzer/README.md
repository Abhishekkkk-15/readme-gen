# @readme-gen/analyzer

Shared repository analysis and semantic README pipeline for `readme-gen`.

This package is used by both the API and CLI. It extracts grounded repository evidence and provides the semantic pipeline used to generate README files from structured project understanding instead of raw prompt-only summaries.

## Responsibilities

- Analyze repository structure and important files
- Parse manifests, scripts, dependencies, and package manager hints
- Extract routes, env vars, examples, schemas, and source definitions
- Build semantic evidence blocks for LLM stages
- Run the semantic README pipeline
- Evaluate README quality after generation

## Core Concepts

### Analysis output

The package produces:

- `summary`: high-level project facts
- `context`: deeper evidence and extracted signatures

### Semantic pipeline

The pipeline stages are:

1. gather semantic evidence
2. infer project intent
3. extract user-facing features
4. analyze architecture
5. merge results into canonical semantic JSON
6. generate README markdown from that JSON

## Development

From the workspace root:

```bash
pnpm --filter @readme-gen/analyzer build
pnpm --filter @readme-gen/analyzer dev
```

## Package Layout

```text
src/
|- analyzers/   file, route, env, schema, and AST analyzers
|- internal/    semantic pipeline, evidence builder, and LLM client
|- utils/       shared prompt/render helpers
|- types.ts     shared analysis types
```

## Dependencies

- `ignore`
- `ts-morph`

## Notes

- The analyzer is the main grounding layer for README generation quality
- Existing README content is included as context so rewrite/append flows stay repo-aware
- The semantic pipeline is used directly by the CLI local generation path
