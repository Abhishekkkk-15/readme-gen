import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { config } from 'dotenv';

config();

class LLMService {
  constructor() {}

  private createModelInstance(
    provider: 'groq' | 'gemini',
    apiKey?: string
  ): any {
    if (provider === 'gemini') {
      const key = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!key) throw new Error('Gemini API Key is missing.');
      return new ChatGoogleGenerativeAI({
        apiKey: key,
        model: 'gemini-1.5-flash',
        maxRetries: 2,
        temperature: 0.1,
      });
    } else {
      const key = apiKey || process.env.GROQ_API_KEY;
      if (!key) throw new Error('Groq API Key is missing.');
      return new ChatGroq({
        apiKey: key,
        model: 'llama-3.1-8b-instant',
        temperature: 0.1,
      });
    }
  }

  public async improveContent(
    text: string,
    provider: 'groq' | 'gemini' = 'groq',
    apiKey?: string
  ): Promise<string> {
    const model = this.createModelInstance(provider, apiKey);

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
    provider: 'groq' | 'gemini' = 'groq',
    apiKey?: string
  ): Promise<{ sections: string[]; tone: string; reason: string }> {
    const model = this.createModelInstance(provider, apiKey);

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
    options: { sections?: string[]; tone?: string; shields?: string[]; additionalContext?: string; apiKey?: string } = {}
  ): Promise<string> {
    const model = this.createModelInstance(provider, options.apiKey);

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
    const overview = await this.callLlm(model, strategyPrompt);

    // Step 2: Architecture & Directory Mapping
    const architecturePrompt = `You are a Lead Software Architect. Map the codebase structure to a functional narrative.
    
## FILE TREE
${analysis.tree?.slice(0, 100).join('\n') || 'Not specified'}

## TASK
Explain the project's "Technical Architecture". 
Don't just list folders; explain HOW data flows or HOW components interact based on the directory names.
Return a detailed 2-3 paragraph architecture summary.

ARCHITECTURE SUMMARY:
`;
    const architectureSummary = await this.callLlm(model, architecturePrompt);

    // Step 2.5: Context Distillation (Chunked)
    const distilledEvidence = await this.distillProjectEvidence(model, analysis.evidence, targetTone);

    // Step 3: Enterprise-Grade Generation (The "n8n" Pass)
    const generationPrompt = `You are a Senior Technical Writer. Generate the full body of a professional, "n8n-style" README.md.

## INPUTS
Header Overview: ${overview}
Architecture: ${architectureSummary}
Distilled Technical Logic: ${distilledEvidence}
Tech Stack: ${analysis.dependencies?.join(', ')}
Requested Sections: ${targetSections.join(', ')}
Tone: ${targetTone}
Instructions: ${userContext}

## RULES (COMPENSATIVE MODE)
1. Title should be "# ${analysis.name}".
2. Start with the "Strategic Overview" followed by "Technical Architecture".
3. Use the "Distilled Technical Logic" to write detailed feature walkthroughs.
4. Structure the output clearly with H2 headings.
5. Emphasize Developer Experience (DX).
6. Total depth should be at least 1500 words of technical content.

README CONTENT:
`;
    const draft = await this.callLlm(model, generationPrompt);

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
    const finalContent = await this.callLlm(model, auditPrompt);

    // Combine all pieces
    const header = `# ${analysis.name}\n\n${shieldsMarkdown}\n\n${navbar}\n\n`;
    return `${header}\n${finalContent}`;
  }

  /**
   * Safe wrapper for LLM calls with retry/fallback logic
   */
  private async callLlm(model: any, prompt: string, retryCount = 0): Promise<string> {
    try {
      return await model.pipe(new StringOutputParser()).invoke(prompt);
    } catch (err: any) {
      // 413 = Payload Too Large, 429 = Rate Limit
      if ((err?.status === 413 || err?.status === 429) && retryCount < 2) {
        console.warn(`LLM Overloaded (Status ${err.status}), retrying or falling back...`);
        // If it's a 413, try to use gemini if configured and not already using it
        if (err.status === 413 && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
           const geminiFallback = this.createModelInstance('gemini');
           return this.callLlm(geminiFallback, prompt, retryCount + 1);
        }
        // Otherwise wait a bit and retry
        await new Promise(res => setTimeout(res, 2000 * (retryCount + 1)));
        return this.callLlm(model, prompt, retryCount + 1);
      }
      throw err;
    }
  }

  /**
   * Distills large codebase evidence into high-density technical summaries using chunked parallel processing.
   */
  private async distillProjectEvidence(model: any, evidence: any, tone: string): Promise<string> {
    if (!evidence?.files || evidence.files.length === 0) return 'No codebase evidence found.';

    const MAX_CHARS_PER_CHUNK = 8000; // Aiming for roughly 3000-4000 tokens
    const chunks: any[][] = [];
    let currentChunk: any[] = [];
    let currentCharCount = 0;

    for (const file of evidence.files) {
      const fileContent = JSON.stringify(file);
      if (currentCharCount + fileContent.length > MAX_CHARS_PER_CHUNK && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentCharCount = 0;
      }
      currentChunk.push(file);
      currentCharCount += fileContent.length;
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);

    console.log(`Distilling codebase context in ${chunks.length} parallel batches...`);

    // Process all chunks in parallel
    const distillationPromises = chunks.map(async (batch, index) => {
      const batchPrompt = `Extract the core technical logic and implementation details from these code snippets.
Focused on explaining *HOW* things work for an enterprise README.

## BATCH ${index + 1} ASSETS:
${JSON.stringify(batch, null, 2)}

## TASK
Return a 2-paragraph technical summary of the logic found in this batch.
TONE: ${tone}

TECHNICAL SUMMARY:
`;
      return this.callLlm(model, batchPrompt);
    });

    const summaries = await Promise.all(distillationPromises);
    return summaries.join('\n\n');
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
