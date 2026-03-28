// Section suggestion hints based on keywords in the project name or description
export interface SectionSuggestion {
  label: string
  heading: string
  body: string
}

const SUGGESTIONS: Array<{
  keywords: string[]
  suggestions: SectionSuggestion[]
}> = [
  {
    keywords: ['api', 'rest', 'graphql', 'endpoint', 'webhook', 'sdk', 'saas'],
    suggestions: [
      {
        label: 'Endpoints table',
        heading: 'Endpoints',
        body: `## Endpoints\n\n| Method | Path | Description |\n|--------|------|-------------|\n| GET | /api/resource | List resources |\n| POST | /api/resource | Create resource |\n`,
      },
      {
        label: 'Authentication',
        heading: 'Authentication',
        body: `## Authentication\n\nAll requests require a bearer token in the \`Authorization\` header:\n\n\`\`\`\nAuthorization: Bearer <token>\n\`\`\`\n`,
      },
      {
        label: 'Rate limits',
        heading: 'Rate Limits',
        body: `## Rate Limits\n\n| Tier | Requests/min |\n|------|--------------|\n| Free | 60 |\n| Pro | 600 |\n| Enterprise | Unlimited |\n`,
      },
    ],
  },
  {
    keywords: ['python', 'pip', 'pytorch', 'tensorflow', 'ml', 'model', 'train', 'dataset', 'neural'],
    suggestions: [
      {
        label: 'Training script',
        heading: 'Training',
        body: `## Training\n\n\`\`\`bash\npython train.py --config configs/default.yaml\n\`\`\`\n`,
      },
      {
        label: 'Model evaluation',
        heading: 'Evaluation',
        body: `## Evaluation\n\n\`\`\`bash\npython evaluate.py --checkpoint checkpoints/best.pt\n\`\`\`\n\n| Metric | Score |\n|--------|-------|\n| Accuracy | — |\n| F1 | — |\n`,
      },
      {
        label: 'Dataset download',
        heading: 'Dataset',
        body: `## Dataset\n\nDescribe the dataset source, size, and license.\n\n\`\`\`bash\npython scripts/download_data.py\n\`\`\`\n`,
      },
    ],
  },
  {
    keywords: ['cli', 'command', 'binary', 'terminal', 'shell', 'brew', 'homebrew'],
    suggestions: [
      {
        label: 'Command reference',
        heading: 'Commands',
        body: `## Commands\n\n\`\`\`\nUsage: tool <command> [flags]\n\nCommands:\n  init    Initialize a new project\n  run     Run the workflow\n  help    Show help\n\`\`\`\n`,
      },
      {
        label: 'Shell completions',
        heading: 'Shell Completions',
        body: `## Shell Completions\n\n\`\`\`bash\n# Bash\ntool completion bash >> ~/.bashrc\n\n# Zsh\ntool completion zsh >> ~/.zshrc\n\`\`\`\n`,
      },
    ],
  },
  {
    keywords: ['docker', 'kubernetes', 'k8s', 'helm', 'container', 'microservice', 'devops'],
    suggestions: [
      {
        label: 'Docker setup',
        heading: 'Docker',
        body: `## Docker\n\n\`\`\`bash\ndocker build -t myapp .\ndocker run -p 8080:8080 myapp\n\`\`\`\n`,
      },
      {
        label: 'Kubernetes deploy',
        heading: 'Kubernetes',
        body: `## Kubernetes\n\n\`\`\`bash\nkubectl apply -f deploy/k8s/\nkubectl get pods -n myapp\n\`\`\`\n`,
      },
      {
        label: 'Environment vars',
        heading: 'Environment Variables',
        body: `## Environment Variables\n\n| Variable | Required | Default | Description |\n|----------|----------|---------|-------------|\n| \`PORT\` | No | \`8080\` | HTTP listen port |\n| \`DATABASE_URL\` | Yes | — | Postgres connection string |\n`,
      },
    ],
  },
  {
    keywords: ['react', 'next', 'vue', 'angular', 'frontend', 'web app', 'spa', 'vite', 'svelte'],
    suggestions: [
      {
        label: 'Environment variables',
        heading: 'Environment Variables',
        body: `## Environment Variables\n\nCopy \`.env.example\` to \`.env.local\` and fill in required values:\n\n\`\`\`env\nNEXT_PUBLIC_API_URL=https://api.example.com\n\`\`\`\n`,
      },
      {
        label: 'Deployment',
        heading: 'Deployment',
        body: `## Deployment\n\n### Vercel\n\n\`\`\`bash\nvercel --prod\n\`\`\`\n\n### Docker\n\n\`\`\`bash\ndocker build -t app . && docker run -p 3000:3000 app\n\`\`\`\n`,
      },
    ],
  },
  {
    keywords: ['mobile', 'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin'],
    suggestions: [
      {
        label: 'Platform requirements',
        heading: 'Requirements',
        body: `## Requirements\n\n| Tool | Version |\n|------|---------|\n| Node | 20+ |\n| Xcode | 15+ |\n| Android Studio | Hedgehog+ |\n`,
      },
      {
        label: 'Deep links',
        heading: 'Deep Links',
        body: `## Deep Links\n\nThe app handles the \`app://\` URL scheme:\n\n| URL | Screen |\n|-----|--------|\n| \`app://home\` | Home |\n| \`app://profile/:id\` | Profile |\n`,
      },
    ],
  },
  {
    keywords: ['monorepo', 'turborepo', 'nx', 'workspace', 'lerna', 'rush'],
    suggestions: [
      {
        label: 'Repo structure',
        heading: 'Structure',
        body: `## Structure\n\n\`\`\`\nrepo/\n├── apps/\n│   └── web/\n└── packages/\n    ├── ui/\n    └── utils/\n\`\`\`\n`,
      },
    ],
  },
]

/**
 * Returns smart section suggestions based on project name + description keywords.
 * Returns an empty array if no matches.
 */
export function getSectionSuggestions(
  projectName: string,
  description: string,
): SectionSuggestion[] {
  const text = `${projectName} ${description}`.toLowerCase()
  const seen = new Set<string>()
  const results: SectionSuggestion[] = []

  for (const group of SUGGESTIONS) {
    if (group.keywords.some((kw) => text.includes(kw))) {
      for (const s of group.suggestions) {
        if (!seen.has(s.heading)) {
          seen.add(s.heading)
          results.push(s)
        }
      }
    }
  }

  // cap at 6 so the UI doesn't overflow
  return results.slice(0, 6)
}
