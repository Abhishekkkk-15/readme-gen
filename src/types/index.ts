export interface User {
  id: string
  email: string
  plan: 'free' | 'pro' | 'enterprise'
  apiKeys: Array<{
    provider: string
    key: string
    lastUsed: string
  }>
  usage: {
    generationsUsed: number
    generationsLimit: number
  }
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
