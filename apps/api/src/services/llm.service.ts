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

  public async getRecommendations(
    analysis: any,
    provider: 'groq' | 'gemini' = 'groq'
  ): Promise<{ sections: string[]; tone: string; reason: string }> {
    let model: any;
    if (provider === 'gemini' && this.geminiModel) {
      model = this.geminiModel;
    } else if (this.groqModel) {
      model = this.groqModel;
    } else {
      throw new Error(`LLM Provider ${provider} is not configured or unavailable.`);
    }

    const recommendationPrompt = `You are a Senior Developer Advocate. Based on the provided project analysis, suggest the ideal README structure and tone.
    
## PROJECT ANALYSIS
Directories: ${analysis.keyDirectories?.join(', ') || 'Not specified'}
Framework: ${analysis.framework?.name || 'Unknown'}
Languages: ${analysis.language}
Features: ${analysis.features?.join(', ')}

## TASK
1. Recommend which of these standard sections should be included: ["Installation", "Usage", "API Reference", "Deployment", "Architecture", "Environment Variables", "Contributing", "License"].
2. Recommend the best Tone: ["professional", "friendly", "minimal", "enterprise"].
3. Provide a brief 1-sentence "Reason" for your choice.

Return ONLY a JSON object:
{
  "sections": ["Section 1", "Section 2"],
  "tone": "recommended-tone",
  "reason": "Why this fits the project"
}

RECOMMENDATION JSON:
`;
    const response = await model.pipe(new StringOutputParser()).invoke(recommendationPrompt);
    try {
      // Clean potential markdown blocks
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse recommendations:', e);
      return { sections: ['Installation', 'Usage'], tone: 'professional', reason: 'Basic project documentation' };
    }
  }

  public async generateReadme(
    analysis: any,
    provider: 'groq' | 'gemini' = 'groq',
    options: { sections?: string[]; tone?: string; shields?: string[]; additionalContext?: string } = {}
  ): Promise<string> {
    
    let model: any;
    if (provider === 'gemini' && this.geminiModel) {
      model = this.geminiModel;
    } else if (this.groqModel) {
      model = this.groqModel;
    } else {
      throw new Error(`LLM Provider ${provider} is not configured or unavailable.`);
    }

    const targetTone = options.tone || 'professional';
    const targetSections = options.sections || ['Installation', 'Usage', 'Features'];
    const userContext = options.additionalContext || 'No additional context provided.';

    // Step 1: Narrative & Mission Synthesis
    const narrativePrompt = `You are a Senior Product Manager. Based on the provided project analysis and user context, determine the project's core mission.
    
## PROJECT ASSETS
Key Directories: ${analysis.keyDirectories?.join(', ') || 'Not specified'}
File Tree: ${analysis.tree?.join('\n') || 'Not specified'}
Tech Stack: ${analysis.dependencies?.join(', ')}

## USER CUSTOM INSTRUCTIONS (PRIORITY)
${userContext}

## TASK
Synthesize a 1-paragraph "Mission Statement" for this project. 
Maintain a ${targetTone} tone.
PRIORITIZE user custom instructions over detected facts if there is a conflict.

ANALYSIS JSON:
${JSON.stringify(analysis, null, 2)}

MISSION STATEMENT:
`;
    const mission = await model.pipe(new StringOutputParser()).invoke(narrativePrompt);

    // Step 2: Fact Normalization (Strict Filter)
    const factNormalizationPrompt = `You are an expert architect. Extract ONLY verifiable facts from the provided analysis.

## GUIDELINES
- Extract ONLY verifiable facts.
- ONLY include facts relevant to these requested sections: ${targetSections.join(', ')}.
- IF A SECTION IS NOT IN THE REQUESTED LIST, DO NOT EXTRACT FACTS FOR IT.
- Include facts from User Context: ${userContext}

Return JSON with this structure:
{
  "techStack": [],
  "features": [],
  "commands": [],
  "endpoints": [],
  "envVars": [],
  "architectureSummary": "Detailed explanation."
}

ANALYSIS JSON:
${JSON.stringify(analysis, null, 2)}
`;
    const facts = await model.pipe(new StringOutputParser()).invoke(factNormalizationPrompt);

    // Step 3: Pro-Writer Generation (Strict Whitelist)
    const generationPrompt = `You are a Senior Technical Writer. Generate a professional README.md.

## INPUTS
Project Mission: ${mission}
Technical Facts: ${facts}
Requested Sections (WHITELIST): ${targetSections.join(', ')}
Target Tone: ${targetTone}
User Custom Instructions: ${userContext}

## STRICT RULES
1. ONLY include the following sections: Title, Description, ${targetSections.join(', ')}.
2. DO NOT include "API Reference" or "Endpoints" unless explicitly in the whitelist.
3. DO NOT include "Environment Variables" unless explicitly in the whitelist.
4. If a section is unrequested, DO NOT even mention it.
5. Prioritize User Custom Instructions for all content.

README.md:
`;
    const draft = await model.pipe(new StringOutputParser()).invoke(generationPrompt);

    // Step 4: Smart Audit
    const auditPrompt = `You are a Technical Editor. Strip any unrequested sections.

## WHITELISTED SECTIONS
${targetSections.join(', ')}

## TASK
1. Remove any section header (## Header) that is NOT in the whitelist.
2. Ensure the tone is strictly ${targetTone}.
3. Fact-check against: ${facts}

ORIGINAL README:
${draft}

FINAL CLEANED README.md:
`;
    const cleanedMarkdown = await model.pipe(new StringOutputParser()).invoke(auditPrompt);

    // Final Step: Prepend Shields
    if (options.shields && options.shields.length > 0) {
      const shieldsMarkdown = options.shields.map(s => {
        const repo = analysis.name?.replace(/\s+/g, '-');
        switch (s) {
          case 'license': return `![License](https://img.shields.io/github/license/user/${repo}?style=flat-square)`;
          case 'stars': return `![Stars](https://img.shields.io/github/stars/user/${repo}?style=flat-square)`;
          case 'version': return `![Version](https://img.shields.io/github/v/release/user/${repo}?style=flat-square)`;
          case 'build': return `![Build](https://img.shields.io/github/actions/workflow/status/user/${repo}/ci.yml?style=flat-square)`;
          default: return '';
        }
      }).filter(Boolean).join(' ');
      
      return `${shieldsMarkdown}\n\n${cleanedMarkdown}`;
    }

    return cleanedMarkdown;
  }
}

export const llmService = new LLMService();

