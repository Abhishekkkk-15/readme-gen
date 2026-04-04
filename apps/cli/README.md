# 🖥️ @readme-gen/cli

**The local-first AI documentation engine for your terminal.**

---

## 📖 Overview

The `readmegen` CLI (also aliased as `devcon`) is a powerful tool for analyzing your local codebase and generating README files without ever leaving your terminal. It leverages the shared `@readme-gen/analyzer` package to extract project grounding evidence and provide state-of-the-art documentation generation.

---

## ⚙️ Core Commands

### 🚦 Quick Start
```bash
# Initialize your API keys and default provider
readmegen init

# Generate a basic README with default options
readmegen generate

# Preview the last generated README in your terminal
readmegen preview
```

### 🛠️ Config Management
```bash
# View your current CLI configuration
readmegen config view

# Update a specific provider's API key
readmegen config set-key <key> --provider groq

# Set the default model for all generations
readmegen config set-model <model-id>

# Reset all CLI settings to default
readmegen config reset
```

---

## 🏗️ Generation Flows

The CLI intelligently chooses between two distinct generation paths:

### 1. Semantic Local Flow (Default)
The **Semantic Local Flow** uses the analyzer package to build a structured project understanding *locally*. It handles:
- **Rewrite**: Improving an existing README while preserving structure.
- **Append**: Adding new grounded sections derived from code evidence.
- **Dynamic Context**: Injecting extra business context into the generation.

### 2. Backend / Template Flow
The **Backend Flow** delegates generation to the API for more complex tasks:
- **Monorepo Templates**: Using pre-defined layouts for complex projects.
- **Nested READMEs**: Generating and saving multiple README files for sub-directories in a single pass.
- **Model Overrides**: Forcing specific platform-hosted models.

---

## 💡 Advanced Usage

### Skipping Interactive Prompts
If you provide a flag, the CLI is smart enough to skip that specific interactive prompt.

```bash
# This will skip the "tone" Selection and use "minimal" automatically
readmegen generate --tone minimal
```

### Full Automated Generation
For CI/CD or non-interactive environments, use the `--yes` flag:

```bash
readmegen generate \
  --tone professional \
  --persona "Senior Developer" \
  --sections Installation Usage Features \
  --yes
```

### Pacing LLM Requests
If you are working on a large repository and hitting Rate Limits (TPM), use the `--llm-delay-ms` flag:

```bash
readmegen generate --llm-delay-ms 30000
```

---

## 🛠️ Development

From the workspace root:

```bash
pnpm --filter @readme-gen/cli build
pnpm --filter @readme-gen/cli start
```

---

<div align="center">
  <sub>Part of the 🚀 <a href="../../README.md">readme-gen</a> ecosystem.</sub>
</div>
