# @readme-gen/cli

Command-line interface for `readme-gen`.

The CLI analyzes a local project and generates grounded README files. It supports both the local semantic pipeline and the backend generation flow when template-driven or nested README output is required.

## Commands

```bash
readmegen init
readmegen generate
readmegen preview
readmegen config view
readmegen config set-key <key>
readmegen config set-model <model>
readmegen config reset
```

`devcon` is an alias for the same CLI binary.

## Generation Modes

### Semantic local flow

Used by default when you want local analysis plus semantic README generation.

```bash
readmegen generate \
  --provider groq \
  --model llama-3.3-70b-versatile \
  --mode rewrite
```

### Backend flow

Used when template-driven layout generation or nested README generation is requested.

```bash
readmegen generate \
  --template monorepo \
  --nested
```

## Features

- Local codebase analysis with the shared analyzer package
- Existing README handling: `overwrite`, `rewrite`, `append`
- Model-aware provider selection
- Token reporting after generation
- Config-backed API key and model management

## Development

From the workspace root:

```bash
pnpm --filter @readme-gen/cli build
pnpm --filter @readme-gen/cli start
pnpm --filter @readme-gen/cli exec tsc --noEmit
```

## Environment

The CLI can read provider keys from environment variables or from saved config created by `readmegen init`.

Common variables:

```env
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
```

## Notes

- Semantic local generation reports estimated token usage
- Backend/API generation reports exact token usage when returned by the API
- `append` and `rewrite` are semantic-flow features and are intentionally guarded against incompatible template flows
