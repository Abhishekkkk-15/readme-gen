# 🧬 @readme-gen/analyzer

**The shared repository analysis engine and semantic README pipeline for the readme-gen platform.**

---

## 📖 Overview

The `analyzer` package is the core grounding layer for all `readme-gen` generation. It extracts project evidence and provides a multi-stage semantic pipeline to ensure generated documentation is tied to concrete code data instead of generic model guesses.

### Key Responsibilities
- **Repository Structural Analysis**: Mapping file systems and identifying monorepo boundaries.
- **Evidence Extraction**: Parsing package manifests, API routes, environment variables, and source signatures.
- **Semantic Mapping**: Merging raw extraction data into a canonical, AI-ready JSON structure.
- **Generation Orchestration**: Running the multi-stage LLM pipeline.
- **Quality Evaluation**: Scoring generated READMEs for clarity, completeness, and accuracy.

---

## 🏗️ Semantic Pipeline

The `analyzer` uses a sophisticated 6-stage pipeline to build high-quality documentation:

1.  **🔍 Evidence Extraction**: Gathers raw project facts (Dependencies, Routes, Env Vars, AST Patterns).
2.  **🧠 Intent Inference**: Deduces "why" the project exists and its primary goal.
3.  **✨ Feature Extraction**: Distills user-facing capabilities from extracted signatures.
4.  **🏛️ Architecture Analysis**: Maps internal project structure and flow.
5.  **🧩 Semantic Merge**: Consolidates all discoveries into a unified `ProjectAnalysis` object.
6.  **✍️ Markdown Generation**: Orchestrates the final markdown construction from semantic JSON.

---

## 🛠️ Package Structure

```text
src/
├── analyzers/    # Specialized extractors for Files, Routes, Env, and AST
├── internal/     # Semantic pipeline, Evidence builder, and LLM orchestration
├── utils/        # Shared prompt engineering and markdown rendering helpers
├── types.ts      # Repository-wide project analysis and extraction types
└── constants/    # Persona definitions and prompt templates
```

---

## 📝 Key Features

### Grounded Generation
The analyzer ensures that everything in the final README is backed by code evidence.
- **Rewriting Mode**: Maintains custom sections while updating grounding facts.
- **Appending Mode**: Intelligently adds new sections to existing documentation.

### Multi-Model Compatibility
The analyzer's prompts are optimized for:
- **OpenAI** (GPT-4o / GPT-3.5)
- **Gemini** (Pro 1.5 / Flash)
- **Groq** (Llama 3 / Mixtral)

---

## 🛠️ Development

From the workspace root:

```bash
pnpm --filter @readme-gen/analyzer build
```

### Dependencies
- **ts-morph**: For high-fidelity AST analysis and source signature extraction.
- **ignore**: For respecting `.gitignore` rules during project analysis.

---

<div align="center">
  <sub>Part of the 🚀 <a href="../../README.md">readme-gen</a> ecosystem.</sub>
</div>
