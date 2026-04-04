# 📡 @readme-gen/api

**The high-performance core of the readme-gen platform, built with Node.js, Express, and Mongoose.**

---

## 📖 Overview

The `api` package serves as the central orchestration layer for the entire `readme-gen` ecosystem. It handles repository analysis, LLM communication, streaming generation, authentication, and persistence.

### Key Responsibilities
- **Repository Analysis**: Built on top of the shared `@readme-gen/analyzer`.
- **LLM Orchestration**: Supports OpenAI, Gemini, and Groq models.
- **Streaming Generation**: Efficient real-time README generation via Server-Sent Events (SSE).
- **Project Persistence**: Stores generation history, snapshots, and metadata in MongoDB.
- **Usage Accounting**: Tracks token usage and distinguishes between platform-hosted and BYOK execution.

---

## 🏗️ Architecture

The API follows a clean, controller-service pattern for maximum scalability and maintainability.

```text
src/
├── controllers/    # Express request handlers for all logic
├── services/       # Core business logic: LLM orchestration and Repo analysis
├── routes/         # Express route registration
├── models/         # Mongoose schemas for Users and Projects
├── config/         # Database, Passport, and Environment setup
└── types/          # Shared type definitions for the API
```

---

## 🛣️ API Reference

### 🔍 Repository Analysis
**POST `/api/analyze`**
- Analyzes a GitHub repository by URL and returns a structured project summary.
- **Payload**: `{ "repoUrl": "https://github.com/user/repo" }`

### 🪄 README Generation
**POST `/api/generate/stream`**
- Streams README markdown content via SSE.
- **Payload**:
  ```json
  {
    "repoUrl": "...",
    "modelId": "gemini-2.5-flash",
    "tone": "professional",
    "mode": "rewrite",
    "sections": ["Installation", "Usage"]
  }
  ```

### 📈 Usage & Billing
**GET `/api/usage`**
- Returns the current user's token and generation usage metrics.

### 💾 Projects
**GET `/api/projects`**
- Returns a list of the user's recently generated projects and their associated metadata.

---

## 🛠️ Development Setup

### Installation

From the workspace root:

```bash
pnpm --filter api install
```

### Environment Variables

The API requires a `.env` file in `apps/api/` with the following variables:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret
MONGODB_URI=mongodb://localhost:27017/readme-gen
GITHUB_TOKEN=your_token
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
```

### Running

```bash
# Run in development mode (nodemon)
pnpm --filter api dev

# Build for production
pnpm --filter api build

# Start production server
pnpm --filter api start
```

---

## 📦 Persistence Layer

The API uses **Mongoose** to interact with MongoDB. Key models include:
- **User**: Stores authentication details, API keys, and usage quotas.
- **Project**: Stores repository metadata, generated README snapshots, and token usage history.

---

## 🛡️ Service Security

- **Authentication**: JWT-based authentication via Passport.js strategies.
- **Rate Limiting**: Enforced for platform-hosted generation calls to prevent abuse.
- **BYOK Isolation**: Brings-your-own-key calls bypass platform-level token quotas.

---

<div align="center">
  <sub>Part of the 🚀 <a href="../../README.md">readme-gen</a> ecosystem.</sub>
</div>
