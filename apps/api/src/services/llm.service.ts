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
      // Find the first '{' and the last '}' to extract only the JSON object
      const start = response.indexOf('{');
      const end = response.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('Could not find JSON object in response.');

      const cleanJson = response.substring(start, end + 1).trim();
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

    // Step 0: Pre-Generation (Navbar & Shields)
    const navbar = this.generateNavbar(analysis);
    const shieldsMarkdown = this.generateShields(options.shields || [], analysis);

    // Step 1: Strategic Technical Overview (Vision Pass)
    const strategyPrompt = `You are a Senior Technical Product Manager. Based on the project analysis, synthesize a high-level strategic overview.
    
## PROJECT ASSETS
Key Directories: ${analysis.keyDirectories?.join(', ') || 'Not specified'}
Framework: ${analysis.framework?.name || 'Unknown'}
Tech Stack: ${analysis.dependencies?.join(', ')}

## USER CONTEXT
${userContext}

## TASK
Synthesize a 2-3 paragraph "Strategic Overview". 
Include: 
1. Vision: What problem does this solve? 
2. Core Mental Model: How should a developer think about this codebase?
Maintain an ${targetTone} tone.

OVERVIEW:
`;
    const overview = await model.pipe(new StringOutputParser()).invoke(strategyPrompt);

    // Step 2: Architecture & Directory Mapping
    const architecturePrompt = `You are a Lead Software Architect. Map the codebase structure to a functional narrative.
    
## FILE TREE
${analysis.tree?.slice(0, 100).join('\n') || 'Not specified'}

## TASK
Explain the project's "Technical Architecture". 
Don't just list folders; explain HOW data flows or HOW components interact based on the directory names (e.g. "The /apps/api directory handles request normalization and passes context to...")
Return a detailed 2-3 paragraph architecture summary.

ARCHITECTURE SUMMARY:
`;
    const architectureSummary = await model.pipe(new StringOutputParser()).invoke(architecturePrompt);

    // Step 3: Enterprise-Grade Generation (The "n8n" Pass)
    const generationPrompt = `You are a Senior Technical Writer. Generate the full body of a professional, "n8n-style" README.md.

## INPUTS
Header Overview: ${overview}
Architecture: ${architectureSummary}
Detected Features & Snippets: ${JSON.stringify(analysis.evidence, null, 2)}
Tech Stack: ${analysis.dependencies?.join(', ')}
Requested Sections: ${targetSections.join(', ')}
Tone: ${targetTone}
Instructions: ${userContext}

## RULES (COMPREHENSIVE MODE)
1. Title should be "# ${analysis.name}".
2. Start with the "Strategic Overview" followed by "Technical Architecture".
3. For every "Feature", provide a technical deep-dive. Use the provided code snippets (evidence) to explain the implementation.
4. Structure the output clearly with H2 headings.
5. Emphasize Developer Experience (DX).
6. Total depth should be at least 1500 words of technical content.

README CONTENT:
`;
    const draft = await model.pipe(new StringOutputParser()).invoke(generationPrompt);

    // Step 4: Technical Integrity Audit
    const auditPrompt = `You are a Senior Technical Editor. Verify and Polish the README.
    
## TASK
1. Ensure the content is strictly accurate to the project context.
2. Ensure the tone is ${targetTone}.
3. Append a "Community & Contributing" section at the end (Standard Enterprise Template).
4. Strictly ensure that unrequested sections are only kept if they add critical technical value.

DRAFT README:
${draft}

FINAL ENTERPRISE README.md:
`;
    const finalContent = await model.pipe(new StringOutputParser()).invoke(auditPrompt);

    // Combine all pieces
    const header = `# ${analysis.name}\n\n${shieldsMarkdown}\n\n${navbar}\n\n`;
    return `${header}\n${finalContent}`;
  }

  private generateNavbar(analysis: any): string {
    const tree = analysis.tree || [];
    const links: string[] = [];
    
    links.push('[README](README.md)');
    
    if (tree.some((f: string) => f.match(/CONTRIBUTING/i))) links.push('[Contributing](CONTRIBUTING.md)');
    if (tree.some((f: string) => f.match(/LICENSE/i))) links.push('[License](LICENSE)');
    if (tree.some((f: string) => f.match(/SECURITY/i))) links.push('[Security](SECURITY.md)');
    if (tree.some((f: string) => f.match(/CODE_OF_CONDUCT/i))) links.push('[Code of Conduct](CODE_OF_CONDUCT.md)');
    
    // Add external links if relevant (e.g. docs folder exists)
    if (tree.some((f: string) => f.startsWith('docs/'))) links.push('[Full Documentation](docs/)');

    return links.join(' | ');
  }

  private generateShields(shields: string[], analysis: any): string {
    if (!shields || shields.length === 0) return '';
    return shields.map(s => {
      const repo = analysis.name?.replace(/\s+/g, '-');
      switch (s) {
        case 'license': return `![License](https://img.shields.io/github/license/user/${repo}?style=flat-square)`;
        case 'stars': return `![Stars](https://img.shields.io/github/stars/user/${repo}?style=flat-square)`;
        case 'version': return `![Version](https://img.shields.io/github/v/release/user/${repo}?style=flat-square)`;
        case 'build': return `![Build](https://img.shields.io/github/actions/workflow/status/user/${repo}/ci.yml?style=flat-square)`;
        default: return '';
      }
    }).filter(Boolean).join(' ');
  }
}

export const llmService = new LLMService();

