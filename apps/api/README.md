# api

Backend API for `readme-gen`.

This service handles repository analysis, README generation, streaming generation, AI-assisted improvement, authentication, billing-aware execution, and project persistence.

## Responsibilities

- Analyze GitHub repositories and build grounded `summary` + `context` objects
- Generate README content using OpenAI, Gemini, or Groq models
- Stream README generation to the web app
- Support `overwrite`, `rewrite`, and `append` README modes
- Track token usage and distinguish `platform` vs `byok` execution
- Persist generated projects and usage history in MongoDB

## Main Areas

```text
src/
|- controllers/   Request handlers for generate, improve, billing, auth
|- services/      LLM orchestration and GitHub repo analysis
|- routes/        Express route registration
|- models/        Mongoose models for users and projects
|- config/        Database and Passport setup
```

## Key Endpoints

- `POST /api/analyze`
- `POST /api/recommendations`
- `POST /api/generate`
- `POST /api/generate/stream`
- `POST /api/improve`
- `GET /api/projects`
- `GET /health`

## Development

From the workspace root:

```bash
pnpm --filter api dev
pnpm --filter api build
pnpm --filter api start
```

## Environment

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret
MONGODB_URI=mongodb://localhost:27017/readme-gen
GITHUB_TOKEN=
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

## Notes

- GitHub import is URL-based analysis through `repo.service.ts`
- Usage limits are enforced only for platform-hosted calls
- BYOK users are not blocked by platform README/token quotas
- Model selection is passed through from web and CLI instead of being forced to provider defaults
