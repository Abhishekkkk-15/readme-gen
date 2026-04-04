# 🌐 @readme-gen/web

**The premium, React 19 dashboard for managing, generating, and perfecting your project documentation.**

---

## 📖 Overview

The `web` package provides a unified dashboard for developers to orchestrate their README generation across multiple models and projects. It features real-time streaming, a built-in markdown editor, and historical snapshot management.

### Key Features
- **Project Discovery**: Import any repository from GitHub by URL for immediate analysis.
- **Model Playground**: Test different models (GPT-4o, Gemini 2.5, Llama 3.3) for your generation.
- **Live Preview & Editor**: Monaco-powered editor with side-by-side preview.
- **AI-Assisted Improvement**: Highlight sections for AI-driven refinement.
- **Project History**: Restore previous versions of your generated READMEs.
- **Usage Statistics**: Track platform vs BYOK token consumption.

---

## 🏗️ Architecture

Built on the latest React stack for maximum performance and a premium user experience.

```text
src/
├── components/     # Shadcn UI building blocks and specialized Layouts
├── contexts/       # Auth and Workspace global state management
├── data/           # Mock data and README template definitions
├── hooks/          # Specialized hooks for snapshots and shortcuts
├── lib/            # Markdown analysis and local storage helpers
└── pages/          # Generator UI, Dashboard, Pricing, and Docs
```

---

## 🎨 Design Philosophy

`readme-gen` uses **Vanilla CSS** and **TailwindCSS** for a sleek, modern, and dark-mode first design.

- **Framer Motion**: Smooth micro-animations for transitions and loading states.
- **Lucide Icons**: Consistent, professional iconography.
- **Shadcn UI**: Accessible, modular component architecture.

---

## 🛠️ Generator Workflow

1.  **Repository Import**: Analyze your codebase structure via the API.
2.  **Configuration**: Select your Tone (Professional, Minimal, etc.) and Persona.
3.  **Generation**: Watch as the AI builds your README in real-time via Server-Sent Events.
4.  **Polish**: Use the "AI Improve" feature or manually edit the code.
5.  **Export**: Download the final `.md` file or copy it to your clipboard.

---

## 💾 Snapshot System

The web app intelligently stores your manual edits and AI generations in a local snapshot system.
- Each snapshot includes **Project Metadata** (Model used, Tokens consumed).
- Restore previous stable versions of your README with a single click.

---

## 🛠️ Development

From the workspace root:

```bash
pnpm --filter web dev
```

### Environment

```env
VITE_API_URL=http://localhost:5000/api
```

---

<div align="center">
  <sub>Part of the 🚀 <a href="../../README.md">readme-gen</a> ecosystem.</sub>
</div>
