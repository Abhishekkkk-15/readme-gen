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
    options: { tone?: string; shields?: string[]; sections?: string[]; generateNested?: boolean; manualImportantFiles?: string[] } = {}
  ): Promise<{ content: string; readmes?: { path: string, content: string }[] }> {
    const provider = configManager.get('provider');
    const groqKey = configManager.get('groqKey');
    const openaiKey = configManager.get('openaiKey');

    const apiKey = provider === 'groq' ? groqKey : openaiKey;

    if (!apiKey) {
      throw new Error(`API key for ${provider} is not configured. Please run 'readmegen init' or 'config:set-key'.`);
    }

    try {
      const response = await axios.post(`${this.baseUrl}/generate`, {
        title: analysis.summary.name,
        description: analysis.summary.description,
        features: options.sections || analysis.summary.features,
        provider: provider === 'groq' ? 'groq' : 'openai', // Adjust if backend uses different naming
        analysis,
        tone: options.tone || 'professional',
        shields: options.shields || ['license', 'stars'],
        generateNested: options.generateNested,
        manualImportantFiles: options.manualImportantFiles
      }, {
        headers: {
          'x-api-key': apiKey,
          'x-provider': provider
        }
      });

      return { content: response.data.content, readmes: response.data.readmes };
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
