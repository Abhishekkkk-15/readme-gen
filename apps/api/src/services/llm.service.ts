import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

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

  public async generateReadme(
    projectName: string, 
    description: string, 
    features: string[],
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

    const template = `You are an expert developer and technical writer. 
Generate a professional README.md for the following project.
Include Introduction, Features, Installation, Usage, and License sections. Don't wrap the output in markdown code blocks if the entire response is the README itself.

Project Name: {projectName}
Description: {description}
Key Features: {features}

Markdown Output:
`;

    const prompt = PromptTemplate.fromTemplate(template);
    const parser = new StringOutputParser();

    const chain = prompt.pipe(model).pipe(parser);

    return await chain.invoke({
      projectName,
      description,
      features: features.length > 0 ? features.join(', ') : 'None specified',
    });
  }
}

export const llmService = new LLMService();
