import Conf from 'conf';

export type CliProvider = 'groq' | 'openai' | 'gemini';

export interface ConfigSchema {
  provider: CliProvider;
  model: string;
  groqKey?: string;
  openaiKey?: string;
  geminiKey?: string;
  apiUrl: string;
}

const schema: any = {
  provider: {
    type: 'string',
    enum: ['groq', 'openai', 'gemini'],
    default: 'groq',
  },
  model: {
    type: 'string',
    default: 'llama-3.1-8b-instant',
  },
  groqKey: {
    type: 'string',
  },
  openaiKey: {
    type: 'string',
  },
  geminiKey: {
    type: 'string',
  },
  apiUrl: {
    type: 'string',
    default: 'http://localhost:5000/api',
  },
};

export class ConfigManager {
  private conf: Conf<ConfigSchema>;

  constructor() {
    this.conf = new Conf<ConfigSchema>({
      projectName: 'readmegen',
      schema,
    });
  }

  public get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
    return this.conf.get(key);
  }

  public set<K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]): void {
    this.conf.set(key, value);
  }

  public reset(): void {
    this.conf.clear();
  }

  public getAll(): ConfigSchema {
    return this.conf.store;
  }

  public isConfigured(): boolean {
    const provider = this.get('provider');
    if (provider === 'groq') return Boolean(this.get('groqKey'));
    if (provider === 'openai') return Boolean(this.get('openaiKey'));
    if (provider === 'gemini') return Boolean(this.get('geminiKey'));
    return false;
  }
}

export const configManager = new ConfigManager();
