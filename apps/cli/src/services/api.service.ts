import axios from 'axios';
import { configManager } from '../config/config-manager.js';
import { ProjectAnalysis } from '@readme-gen/analyzer';

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = configManager.get('apiUrl') || 'http://localhost:5000/api';
  }

  public async generateReadme(
    analysis: ProjectAnalysis,
    options: {
      tone?: string;
      persona?: string;
      shields?: string[];
      sections?: string[];
      generateNested?: boolean;
      manualImportantFiles?: string[];
      readmeTemplate?: { id?: string; body: string };
      modelId?: string;
      llmDelayMs?: number;
    } = {},
  ): Promise<{
    content: string;
    readmes?: { path: string; content: string }[];
    meta?: {
      tokensUsed?: number;
      executionMode?: 'platform' | 'byok';
      modelId?: string | null;
    };
  }> {
    const provider = configManager.get('provider');
    const groqKey = configManager.get('groqKey');
    const openaiKey = configManager.get('openaiKey');
    const geminiKey = configManager.get('geminiKey');

    const apiKey =
      provider === 'groq' ? groqKey : provider === 'gemini' ? geminiKey : openaiKey;

    if (!apiKey) {
      throw new Error(`API key for ${provider} is not configured. Please run 'readmegen init' or 'config:set-key'.`);
    }

    const backendProvider = provider === 'groq' ? 'groq' : provider === 'gemini' ? 'gemini' : 'openai';

    try {
      const response = await axios.post(
        `${this.baseUrl}/generate`,
        {
          title: analysis.summary.name,
          description: analysis.summary.description,
          features: options.sections || analysis.summary.features,
          provider: backendProvider,
          modelId: options.modelId,
          analysis,
          tone: options.tone || 'professional',
          persona: options.persona || 'Senior Developer',
          shields: options.shields || ['license', 'stars'],
          generateNested: options.generateNested,
          manualImportantFiles: options.manualImportantFiles,
          readmeTemplate: options.readmeTemplate,
          llmDelayMs: options.llmDelayMs,
        },
        {
          headers: {
            'x-api-key': apiKey,
            'x-provider': backendProvider,
          },
        },
      );

      return {
        content: response.data.content,
        readmes: response.data.readmes,
        meta: response.data.meta,
      };
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message;
      throw new Error(`Backend Error: ${msg}`);
    }
  }

  public async getRecommendations(analysis: ProjectAnalysis): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/recommendations`, {
        analysis,
        provider: configManager.get('provider')
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get recommendations: ${error.message}`);
    }
  }
}

export const apiService = new ApiService();
