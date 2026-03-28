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
        temperature: 0.1,
      });
    }

    const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (geminiApiKey) {
      this.geminiModel = new ChatGoogleGenerativeAI({
        apiKey: geminiApiKey,
        model: 'gemini-1.5-flash',
        maxRetries: 2,
        temperature: 0.1,
      });
    }

    if (!groqApiKey && !geminiApiKey) {
      console.warn('⚠️ No LLM API keys found. Generation will fail.');
    }
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

  public async generateReadme(
    analysis: any,
    provider: 'groq' | 'gemini' = 'groq'
  ): Promise<string> {
    
    let model: any;
    if (provider === 'gemini' && this.geminiModel) {
      model = this.geminiModel;
    } else if (this.groqModel) {
      model = this.groqModel;
    } else {
      throw new Error(`LLM Provider ${provider} is not configured or unavailable.`);
    }

    // Model is set to 0.1 in constructor

    // Step 1: Fact Normalization
    const factNormalizationPrompt = `Extract ONLY verifiable facts from the provided analysis JSON.
Return JSON with this structure:
{
  "techStack": [],
  "features": [],
  "commands": [],
  "endpoints": [],
  "envVars": []
}
RULES:
- DO NOT infer anything.
- Only include items with direct evidence in the JSON.
- Features MUST come from the "astFeatures" or "features" list with snippets.

ANALYSIS JSON:
${JSON.stringify(analysis, null, 2)}
`;
    const facts = await model.pipe(new StringOutputParser()).invoke(factNormalizationPrompt);

    // Step 2: README Plan
    const readmePlanPrompt = `Using ONLY the extracted facts, create a README structure plan.
Return JSON with this structure:
{
  "sections": [
    { "title": "Section Title", "content": ["Fact 1", "Fact 2"] }
  ]
}
RULES:
- Only include sections with actual data.
- Mark missing sections as "Not specified".
- DO NOT create sections without factual backing.

FACTS:
${facts}
`;
    const plan = await model.pipe(new StringOutputParser()).invoke(readmePlanPrompt);

    // Step 3: Generation
    const generationPrompt = `Generate a README.md using ONLY the structured plan.
RULES:
- DO NOT add new information.
- DO NOT expand features.
- Keep it concise and factual.
- Follow the section structure exactly.

PLAN:
${plan}
`;
    const draft = await model.pipe(new StringOutputParser()).invoke(generationPrompt);

    // Step 4: Audit (Strict)
    const auditPrompt = `Audit and clean the following README.md.
REMOVE:
- Assumptions or inferred information.
- Generic marketing words (robust, scalable, powerful, enterprise-grade, etc.).
- Information not present in the original facts JSON.

REPLACE uncertain parts with: "Not specified"

ORIGINAL FACTS:
${facts}

GENERATED README:
${draft}

CLEANED README.md:
`;
    return await model.pipe(new StringOutputParser()).invoke(auditPrompt);
  }
}

export const llmService = new LLMService();
