export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  provider: 'local' | 'google' | 'github'
  plan: 'free' | 'pro'
  apiKeys: {
    provider: string
    key: string
    lastUsed: string
  }[]
  usage: {
    generationsUsed: number
    generationsLimit: number
  }
  createdAt?: string
  updatedAt?: string
}

export interface Model {
  id: string
  name: string
  provider: string
  contextLength: number
  pricing: {
    input: number
    output: number
  }
  capabilities: string[]
  isAvailable: boolean
  performanceScore?: number
  recommended?: boolean
}

export interface Generation {
  id: string
  title: string
  content: string
  modelUsed: string
  createdAt: string
  repoUrl?: string
}

export interface Workspace {
  id: string
  name: string
  defaultTone: string
  glossary: string
  slackWebhookUrl: string
  discordWebhookUrl: string
}

export interface ReadmeSnapshot {
  id: string
  workspaceId: string
  name: string
  content: string
  createdAt: string
  sourcesUsed: string[]
  modelId?: string
}

export interface ReadmeTemplate {
  id: string
  name: string
  description: string
  sections: Record<string, boolean>
  tone: string
  badges: boolean
  sampleIntro: string
}
