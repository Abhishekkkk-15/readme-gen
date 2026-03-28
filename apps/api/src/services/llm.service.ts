import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { config } from 'dotenv';

config();

class LLMService {
  private groqModel: ChatGroq | null = null;
  private geminiModel: ChatGoogleGenerativeAI | null = null;

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      this.groqModel = new ChatGroq({
        apiKey: groqApiKey,
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
      });
    }

    const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (geminiApiKey) {
      this.geminiModel = new ChatGoogleGenerativeAI({
        apiKey: geminiApiKey,
        model: 'gemini-1.5-flash',
        maxRetries: 2,
      });
    }

    if (!groqApiKey && !geminiApiKey) {
      console.warn('⚠️ No LLM API keys found. Generation will fail.');
    }
  }

  private buildPrompt(context: any, description: string, features: string[]): string {
    return `You are generating a README for a real codebase. Use ONLY the information provided below. DO NOT hallucinate commands, files, or features.

## ACTUAL PROJECT DATA

**Project:** ${context.projectOverview.name}
**Type:** ${context.projectOverview.type}
**Language:** ${context.projectOverview.language}
**Framework:** ${context.projectOverview.framework}

**Entry Points:**
${context.structure.entryPoints.map((f: string) => `- ${f}`).join('\n')}

**Available Commands (from package.json):**
${Object.entries(context.scripts.actualCommands).map(([cmd, value]) => `- \`${cmd}\`: ${value}`).join('\n')}

**API Endpoints (actual routes in code):**
${context.api.endpoints.map((e: any) => `- ${e.method} ${e.path}`).join('\n') || 'No API endpoints detected'}

**Environment Variables Required:**
${context.configuration.envVars.filter((v: any) => v.required).map((v: any) => `- ${v.name}`).join('\n') || 'None detected'}

**Key Dependencies:**
${context.techStack.core.slice(0, 10).join(', ')}

**Important Files:**
${context.structure.importantFiles.slice(0, 15).map((f: string) => `- ${f}`).join('\n')}

## INSTRUCTIONS
Generate a README.md with:
1. Accurate commands from the actual scripts above
2. Real file paths from the structure
3. Environment variables that actually exist
4. Features inferred from dependencies and structure
5. Installation steps using the detected package manager (${context.projectOverview.packageManager})
6. Usage examples based on entry points and API endpoints

Only include sections that have real data. If something doesn't exist, omit it.
`;
  }

  public async generateReadme(
    projectName: string, 
    description: string, 
    features: string[],
    provider: 'groq' | 'gemini' = 'groq',
    context?: any
  ): Promise<string> {
    
    let model;
    if (provider === 'gemini' && this.geminiModel) {
      model = this.geminiModel;
    } else if (this.groqModel) {
      model = this.groqModel;
    } else {
      throw new Error(`LLM Provider ${provider} is not configured or unavailable.`);
    }

    if (!context) {
      const basicTemplate = `You are generating a README for a project.
Project Name: {projectName}
Description: {description}
Features: {features}

Markdown Output:
`;
      const basicPrompt = PromptTemplate.fromTemplate(basicTemplate);
      const basicChain = basicPrompt.pipe(model).pipe(new StringOutputParser());
      return await basicChain.invoke({ projectName, description, features: features.join(', ') });
    }

    const fullPromptText = this.buildPrompt(context, description, features);
    
    // We can use a simple prompt since we already built the full text with template literals
    const prompt = PromptTemplate.fromTemplate("{fullText}");
    const parser = new StringOutputParser();
    const chain = prompt.pipe(model).pipe(parser);

    return await chain.invoke({
      fullText: fullPromptText,
    });
  }

  public async improveContent(
    text: string,
    provider: 'groq' | 'gemini' = 'groq'
  ): Promise<string> {
    let model;
    if (provider === 'gemini' && this.geminiModel) {
      model = this.geminiModel;
    } else if (this.groqModel) {
      model = this.groqModel;
    } else {
      throw new Error(`LLM Provider ${provider} is not configured or unavailable.`);
    }

    const improvementTemplate = `You are an expert technical writer. Improve the following markdown content by making it more professional, clear, and concise. 
Maintain the original markdown formatting (bold, links, code blocks).
Only return the improved content. DO NOT add any explanations or introductory text.

CONTENT TO IMPROVE:
{text}

IMPROVED OUTPUT:
`;
    const prompt = PromptTemplate.fromTemplate(improvementTemplate);
    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    
    return await chain.invoke({ text });
  }
}

export const llmService = new LLMService();
