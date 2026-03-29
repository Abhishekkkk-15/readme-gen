import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { config } from 'dotenv';

config();

class LLMService {
  constructor() { }

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

CONTENT FROM THE REAL CODEBASE:
{text}

IMPROVED OUTPUT (STRICTLY FACTUAL):
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

    const recommendationPrompt = `You are a Senior Developer Advocate. Based on the provided project analysis, suggest the ideal README structure.
    
## PROJECT REALITY (AST DATA)
Directories: ${analysis.keyDirectories?.join(', ') || 'Not specified'}
Framework: ${analysis.framework?.name || 'Unknown'}
Languages: ${analysis.language}
Actual Features Found: ${analysis.features?.join(', ')}

## TASK
1. Recommend which of these standard sections should be included: ["Installation", "Usage", "API Reference", "Deployment", "Architecture", "Environment Variables", "Contributing", "License"]. 
Only recommend sections that can be populated by the actual evidence found.
2. Recommend the best Tone: ["professional", "friendly", "minimal", "enterprise"].

Return ONLY a JSON object:
{
  "sections": ["Section 1", "Section 2"],
  "tone": "recommended-tone",
  "reason": "Why this fits the actual code evidence found"
}

RECOMMENDATION JSON:
`;
    const response = await model.pipe(new StringOutputParser()).invoke(recommendationPrompt);
    try {
      const start = response.indexOf('{');
      const end = response.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('Could not find JSON object in response.');

      const cleanJson = response.substring(start, end + 1).trim();
      const sanitized = this.sanitizeJsonString(cleanJson);
      return JSON.parse(sanitized);
    } catch (e) {
      console.error('Failed to parse recommendations:', e);
      return { sections: ['Installation', 'Usage'], tone: 'professional', reason: 'Basic project documentation' };
    }
  }

  private sanitizeJsonString(json: string): string {
    return json
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
      .replace(/\n/g, "\\n")                         // Escape literal newlines
      .replace(/\r/g, "\\r")                         // Escape carriage returns
      .replace(/\t/g, "\\t");                        // Escape tabs
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

    // Step 1: Technical Capabilities Mapping (Truth Pass)
    const strategyPrompt = `You are a Lead Software Architect. Map the codebase evidence to a reality-based summary.
    
## CODEBASE EVIDENCE:
Framework: ${analysis.framework?.name || 'Unknown'}
Production Dependencies: ${analysis.dependencies?.join(', ')}
Key Directories: ${analysis.keyDirectories?.join(', ') || 'Not specified'}
Database Models: ${JSON.stringify(analysis.dbSchemas || [], null, 2)}
Infrastructure/DevOps: ${JSON.stringify(analysis.devOps || {}, null, 2)}

## STRICTOR GROUNDING RULES (ANTI-HALLUCINATION):
1. Only describe what is explicitly found in the evidence.
2. If there is no "Dockerfile" or "docker" metadata, do not mention Docker.
3. If there is no "tests" folder, do not mention testing.
4. Use the description from package.json if available: "${analysis.description || 'No description'}".

## TASK
Synthesize a 2-paragraph "Technical Overview". 
Focus on explaining *WHAT* this codebase actually is and *HOW* its models and infrastructure are structured.
Maintain an ${targetTone} tone.

OVERVIEW:
`;
    const overview = await this.callLlm(model, strategyPrompt);

    // Step 2: Architecture Integrity Pass
    const architecturePrompt = `You are a Principal Software Engineer. Create a functional architectural summary.
    
## PROJECT TYPE:
Detected as: ${analysis.isMonorepo ? 'Monorepo (Multi-Package)' : 'Single-Package Monolith'}

## FILE SYSTEM TRUTH:
${analysis.tree?.slice(0, 100).join('\n') || 'Not specified'}

## TASK
Explain the project's "Technical Architecture". 
Strictly derive the architecture from the directory names and tree. 
${analysis.isMonorepo ? 'This IS a Monorepo. Emphasize the separation of packages/apps and shared libraries.' : 'This IS NOT a monorepo. It is a Monolith. Focus on the folder-to-module mapping within the single package (e.g., controllers, services, routes). Strictly avoid calling it a monorepo.'}
DO NOT assume the existence of external services (Redis, Kafka, etc.) unless they are in the dependencies.

ARCHITECTURE SUMMARY:
`;
    const architectureSummary = await this.callLlm(model, architecturePrompt);

    // Step 2.5: Fact Distillation (The "Truth Map")
    const technicalTruthMap = await this.distillProjectEvidence(model, analysis.evidence, targetTone);

// Step 3: Fact-Driven Content Generation (The Grounded Pass)
    const generationPrompt = `You are a Senior Technical Writer. Generate a comprehensive README.md.
 
## SOURCE OF TRUTH (STRICTLY USE ONLY THIS):
Summary: ${overview}
Architecture: ${architectureSummary}
Technical Truth Map: ${technicalTruthMap}
Usage Examples (from tests): ${JSON.stringify(analysis.examples || [], null, 2)}
Tech Stack: ${analysis.dependencies?.join(', ')}
 
## RULES (THE "CURSOR" STRATEGY):
1. **STRICT GROUNDING**: Do not mention a single feature or dependency that isn't in the Source of Truth above.
2. **ZERO FILLER**: Avoid generic marketing jargon. Use technical detail from the signatures.
3. **CITATIONS**: When describing a feature, mention the file or class from the truth map where it lives.
4. **USAGE SECTION**: Include a "Usage" section that simplifies the provided "Usage Examples" from the tests.
5. **NO PLACEHOLDERS**: Do not use [Project Name] - use "${analysis.name}".
6. **TONE**: ${targetTone}.
 
README CONTENT:
`;
    const draft = await this.callLlm(model, generationPrompt);

    // Step 4: Final Hallucination Audit (Silent Proofreader)
    const auditPrompt = `You are a Technical Editor. Perform a final Silent Audit on this README.
    
## VERIFIED TECHNICAL TRUTH (DO NOT DELETE THESE):
Dependencies: ${analysis.dependencies?.join(', ')}
Key Folders: ${analysis.keyDirectories?.join(', ')}
Technical Signatures: ${technicalTruthMap}

## AUDIT PROTOCOL:
1. Cross-reference the draft below with the Verified Technical Truth above.
2. If the draft contains a feature (like Kafka, Redis, or a local service) that is in the Technical Signatures, it is REAL. KEEP IT.
3. **If you find a feature that has ZERO evidence in both the signatures and dependencies, DELETE IT.**
4. Remove any conversational intros like "Here is the README".
5. DO NOT provide an audit report. DO NOT include headers like "ISSUES FOUND" or "DRAFT".

## TASK
Return the finalized, cleaned README.md content. 
Your output MUST start with "#" and nothing else.

DRAFT TO AUDIT:
${draft}

FINAL CLEANED README:
`;
    const auditResponse = await this.callLlm(model, auditPrompt);
    const finalContent = this.cleanLlmOutput(auditResponse);

    // Combine all pieces
    const header = `# ${analysis.name}\n\n${shieldsMarkdown}\n\n${navbar}\n\n`;
    return `${header}\n${finalContent}`;
  }

  public async generateNestedReadmes(
    analysis: any,
    provider: 'groq' | 'gemini' = 'groq',
    options: { sections?: string[]; tone?: string; shields?: string[]; additionalContext?: string; apiKey?: string } = {}
  ): Promise<{ path: string, content: string }[]> {
    const readmes: { path: string, content: string }[] = [];
    const tree: string[] = analysis.tree || [];
    
    // Find directories containing package.json or go.mod or similar metadata files
    // This indicates a nested package or app.
    const nestedDirs = Array.from(new Set(
      tree
        .filter(f => {
          const normalized = f.replace(/\\/g, '/');
          return normalized.match(/(?:^|\/)(?:apps|packages)\/[^\/]+\/(?:package\.json|go\.mod)$/);
        })
        .map(f => {
          const normalized = f.replace(/\\/g, '/');
          const match = normalized.match(/(.*)\/(?:package\.json|go\.mod)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean)
    )) as string[];

    if (nestedDirs.length === 0) return readmes;

    const model = this.createModelInstance(provider, options.apiKey);
    const targetTone = options.tone || 'professional';
    const userContext = options.additionalContext || 'No additional context provided.';

    for (const dir of nestedDirs) {
      // Create a targeted summary prompt for this specific directory
      const strategyPrompt = `You are a Lead Software Architect. Generate a concise README for a nested sub-project.
      
## PROJECT CONTEXT
Parent Project Name: ${analysis.name}
Sub-Project Path: ${dir}
Root Tech Stack: ${analysis.dependencies?.join(', ')}

## TASK
Generate a short but complete README for this specific sub-component (${dir}).
Assume it inherits context from the parent project.
Focus on its specific role, any evident files in its directory (if you can infer), and common installation commands like "cd ${dir} && npm install".
Maintain an ${targetTone} tone.
Additional Instructions: ${userContext}

README CONTENT:
`;

      const draft = await this.callLlm(model, strategyPrompt);
      const cleanContent = this.cleanLlmOutput(draft);

      readmes.push({
        path: `${dir}/README.md`,
        content: `# ${dir.split('/').pop()}\n\n${cleanContent}`
      });
    }

    return readmes;
  }

  private cleanLlmOutput(text: string): string {
    let clean = text.trim();
    // Remove triple-backtick markdown blocks ifwrapped by LLM
    clean = clean.replace(/^```markdown\n/i, '').replace(/^```\n/i, '').replace(/\n```$/i, '');
    // Remove "Final Audited README" style prefixes
    clean = clean.replace(/^(Final|Audited|Cleaned)?\s*README(\.md)?:?\s*\n*/i, '');
    // Ensure it starts with #
    const hashIndex = clean.indexOf('#');
    if (hashIndex > -1) {
      clean = clean.substring(hashIndex);
    }
    return clean;
  }

  private async callLlm(model: any, prompt: string, retryCount = 0): Promise<string> {
    try {
      return await model.pipe(new StringOutputParser()).invoke(prompt);
    } catch (err: any) {
      if ((err?.status === 413 || err?.status === 429) && retryCount < 2) {
        console.warn(`LLM Overloaded (Status ${err.status}), retrying or falling back...`);
        if (err.status === 413 && process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
          const geminiFallback = this.createModelInstance('gemini');
          return this.callLlm(geminiFallback, prompt, retryCount + 1);
        }
        await new Promise(res => setTimeout(res, 2000 * (retryCount + 1)));
        return this.callLlm(model, prompt, retryCount + 1);
      }
      throw err;
    }
  }

  private async distillProjectEvidence(model: any, evidence: any, tone: string): Promise<string> {
    if (!evidence?.files || evidence.files.length === 0) return 'No codebase evidence found.';

    const MAX_CHARS_PER_CHUNK = 8000;
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

    console.log(`Distilling technical truth from ${chunks.length} parallel batches...`);

    const distillationPromises = chunks.map(async (batch, index) => {
      const batchPrompt = `Analyze these code signatures and parameters to identify purely technical facts.
DO NOT be creative. Return a compact, bulleted "TECHNICAL FACT LIST" of what these files actually do.

## BATCH ${index + 1} ASSETS:
${JSON.stringify(batch, null, 2)}

## TASK
Return a bulleted list of 5-10 technical facts. For each fact, cite the file name.
Example: "- File X: Implements encryption using Crypto (Key: string) -> string"

TECHNICAL FACT LIST:
`;
      return this.callLlm(model, batchPrompt);
    });

    const summaries = await Promise.all(distillationPromises);
    return summaries.join('\n');
  }

  private generateNavbar(analysis: any): string {
    const tree = analysis.tree || [];
    const links: string[] = [];
    links.push('[README](README.md)');
    if (tree.some((f: string) => f.match(/CONTRIBUTING/i))) links.push('[Contributing](CONTRIBUTING.md)');
    if (tree.some((f: string) => f.match(/LICENSE/i))) links.push('[License](LICENSE)');
    if (tree.some((f: string) => f.match(/SECURITY/i))) links.push('[Security](SECURITY.md)');
    if (tree.some((f: string) => f.match(/CODE_OF_CONDUCT/i))) links.push('[Code of Conduct](CODE_OF_CONDUCT.md)');
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
