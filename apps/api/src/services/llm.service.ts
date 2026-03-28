import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { config } from 'dotenv';
config()
class LLMService {
  private groqModel: ChatGroq | null = null;
  private geminiModel: ChatGoogleGenerativeAI | null = null;

  constructor() {
    this.initializeModels();
  }

  private initializeModels() {
    const groqApiKey = process.env.GROQ_API_KEY;
    console.log(groqApiKey);
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
      // Fallback to basic generation if no context is provided
      const basicTemplate = `You are generating a README for a project.
Project Name: {projectName}
Description: {description}
Features: {features}

Markdown Output:
`;
      const basicPrompt = PromptTemplate.fromTemplate(basicTemplate);
      const basicChain = basicPrompt.pipe(model).pipe(new StringOutputParser());
      return await basicChain.invoke({
        projectName,
        description,
        features: features.join(', ')
      });
    }

    const template = `You are generating a README for a real codebase. Use ONLY the information provided below. DO NOT hallucinate commands, files, or features.

## ACTUAL PROJECT DATA

**Project:** {projectName}
**Type:** {projectType}
**Language:** {language}
**Framework:** {framework}

**Entry Points:**
{entryPoints}

**Available Commands (from package.json):**
{commands}

**API Endpoints (actual routes in code):**
{apiEndpoints}

**Environment Variables Required:**
{envVars}

**Key Dependencies:**
{techStack}

**Important Files:**
{importantFiles}

## INSTRUCTIONS
Generate a README.md with:
1. Accurate commands from the actual scripts above
2. Real file paths from the structure
3. Environment variables that actually exist
4. Features inferred from dependencies and structure
5. Installation steps using the detected package manager
6. Usage examples based on entry points and API endpoints

Only include sections that have real data. If something doesn't exist, omit it.
`;

    const prompt = PromptTemplate.fromTemplate(template);
    const parser = new StringOutputParser();

    const chain = prompt.pipe(model).pipe(parser);

    return await chain.invoke({
      projectName: context.projectOverview.name,
      projectType: context.projectOverview.type,
      language: context.projectOverview.language,
      framework: context.projectOverview.frameworks?.join(', ') || 'N/A',
      entryPoints: context.structure.entryPoints.map((f: string) => `- ${f}`).join('\n'),
      commands: Object.entries(context.scripts.actualCommands).map(([cmd, value]) => `- \`${cmd}\`: ${value}`).join('\n'),
      apiEndpoints: context.api.endpoints.map((e: any) => `- ${e.method} ${e.path}`).join('\n') || 'No API endpoints detected',
      envVars: context.configuration.envVars.filter((v: any) => v.required).map((v: any) => `- ${v.name}`).join('\n') || 'None detected',
      techStack: context.techStack.core.slice(0, 10).join(', '),
      importantFiles: context.structure.importantFiles.slice(0, 15).map((f: string) => `- ${f}`).join('\n'),
      description: description,
      features: features.join(', ')
    });
  }
}

export const llmService = new LLMService();
