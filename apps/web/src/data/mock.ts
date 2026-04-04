import type { Generation, Model, User } from '@/types'

export const mockUser: User = {
  id: 'usr_1',
  email: 'dev@example.com',
  displayName: 'Dev User',
  provider: 'local',
  plan: 'pro',
  apiKeys: [
    { provider: 'OpenAI', key: 'sk-••••••••••••4f21', lastUsed: '2026-03-27T10:00:00.000Z' },
    { provider: 'Gemini', key: 'AIzaSy••••4k9p', lastUsed: '2026-03-26T14:22:00.000Z' },
    { provider: 'Groq', key: 'gsk_••••9z1x', lastUsed: '2026-03-25T09:10:00.000Z' },
  ],
  usage: {
    generationsUsed: 42,
    generationsLimit: -1,
    tokensUsed: 125000,
    tokensLimit: -1,
    lastResetDate: '2026-03-01T00:00:00.000Z',
  },
}

export const mockModels: Model[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    contextLength: 128000,
    pricing: { input: 2.5, output: 10 },
    capabilities: ['Reasoning', 'Code', 'Long context'],
    isAvailable: true,
    performanceScore: 96,
    recommended: true,
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    contextLength: 128000,
    pricing: { input: 10, output: 30 },
    capabilities: ['Code', 'Docs'],
    isAvailable: true,
    performanceScore: 92,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    contextLength: 16385,
    pricing: { input: 0.5, output: 1.5 },
    capabilities: ['Fast', 'Economical'],
    isAvailable: true,
    performanceScore: 78,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Gemini',
    contextLength: 1000000,
    pricing: { input: 0.3, output: 2.5 },
    capabilities: ['Fast', 'Multimodal', 'Long context'],
    isAvailable: true,
    performanceScore: 93,
    recommended: true,
  },
  {
    id: 'gemini-2.0-pro',
    name: 'Gemini 2.0 Pro',
    provider: 'Gemini',
    contextLength: 1000000,
    pricing: { input: 1.25, output: 5 },
    capabilities: ['Multimodal', 'Long context'],
    isAvailable: true,
    performanceScore: 90,
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Gemini',
    contextLength: 2000000,
    pricing: { input: 3.5, output: 10.5 },
    capabilities: ['Advanced reasoning', 'Long context'],
    isAvailable: true,
    performanceScore: 94,
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'Groq',
    contextLength: 131072,
    pricing: { input: 0.59, output: 0.79 },
    capabilities: ['Fast', 'Code', 'Long context'],
    isAvailable: true,
    performanceScore: 90,
    recommended: true,
  },
  {
    id: 'openai-gpt-oss-120b',
    name: 'GPT-OSS 120B',
    provider: 'Groq',
    contextLength: 131072,
    pricing: { input: 0.15, output: 0.75 },
    capabilities: ['Reasoning', 'Large model'],
    isAvailable: true,
    performanceScore: 88,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'Groq',
    contextLength: 131072,
    pricing: { input: 0.05, output: 0.08 },
    capabilities: ['Fast', 'Economical'],
    isAvailable: true,
    performanceScore: 84,
  },
]

export const mockGenerations: Generation[] = [
  {
    id: 'gen_1',
    title: 'readme-gen - AI README platform',
    content: '# readme-gen\n\nAI-powered README generator...',
    modelUsed: 'GPT-4o',
    createdAt: '2026-03-27T09:00:00.000Z',
    repoUrl: 'https://github.com/acme/readme-gen',
  },
  {
    id: 'gen_2',
    title: 'design-system',
    content: '# Design System\n\nComponents and tokens...',
    modelUsed: 'Llama 3.3 70B Versatile',
    createdAt: '2026-03-25T16:30:00.000Z',
    repoUrl: 'https://github.com/acme/design-system',
  },
  {
    id: 'gen_3',
    title: 'internal-api',
    content: '# Internal API\n\nREST endpoints...',
    modelUsed: 'Gemini 2.0 Pro',
    createdAt: '2026-03-20T11:12:00.000Z',
  },
]

export const stats = {
  githubStars: 12847,
  cliDownloads: 892_341,
  testimonials: [
    {
      quote:
        'We ship READMEs for every service in minutes. The GitHub import and section toggles are exactly what our platform team needed.',
      author: 'Jordan Lee',
      role: 'Staff Engineer, Northwind',
    },
    {
      quote:
        'Bring-your-own-key plus hosted models means we can stay compliant and still move fast. Pro tier paid for itself in one sprint.',
      author: 'Priya Shah',
      role: 'Head of DevEx, Helio',
    },
    {
      quote:
        'The CLI fits our CI pipeline; the web UI is where PMs polish tone. Finally one tool for both audiences.',
      author: 'Marcus Chen',
      role: 'Director of Engineering, Atlas Labs',
    },
  ],
}
