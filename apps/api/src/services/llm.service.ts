import { ChatGroq } from '@langchain/groq';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { config } from 'dotenv';
import { SemanticRefiner, ProjectAnalysis, ProjectContext, ProjectSummary } from '@readme-gen/analyzer';

config();

class LLMService {
  constructor() { }

  private generateArchitectureDiagram(summary: ProjectSummary): string {
    const refined = SemanticRefiner.refine(summary);
    const ascii = [
      "```bash",
      "User → Web App",
      "        ↓",
      `API (${refined.techStack.backend[0] || 'Node.js'})`,
      "        ↓",
      `${refined.techStack.database[0] || 'Database'}`,
      summary.dependencies?.includes('redis') ? "        ↓\nRedis → Workers" : "",
      "```"
    ].filter(Boolean).join('\n');
    return `## 🧠 Architecture Overview\n${ascii}\n\n`;
  }

  private distillEnvVars(summary: ProjectSummary): string {
    if (!summary.isMonorepo) {
      return `### ⚙️ Environment Configuration\n\`\`\`env\n${(summary.envVars || []).map((v: string) => `${v}=`).join('\n')}\n\`\`\``;
    }
    const envSection: string[] = ["## ⚙️ Environment Configuration", "Each service has its own `.env` file."];
    const apps = (summary.tree || []).filter((f: string) => f.startsWith('apps/')).map((f: string) => f.split('/')[1]);
    const uniqueApps = Array.from(new Set(apps));
    if (uniqueApps.length === 0) return `### ⚙️ Environment Configuration\n\`\`\`env\n${(summary.envVars || []).map((v: string) => `${v}=`).join('\n')}\n\`\`\``;
    for (const app of uniqueApps as string[]) {
      envSection.push(`### ${app.charAt(0).toUpperCase() + app.slice(1)} (\`apps/${app}/.env\`)`);
      envSection.push("```env");
      const relevantVars = (summary.envVars || []).filter((v: string) => true);
      envSection.push(relevantVars.map((v: string) => `${v}=`).join('\n'));
      envSection.push("```");
    }
    return envSection.join('\n\n');
  }

  private createModelInstance(provider: 'groq' | 'gemini', apiKey?: string): any {
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

  public async improveContent(text: string, provider: 'groq' | 'gemini' = 'groq', apiKey?: string): Promise<string> {
    const model = this.createModelInstance(provider, apiKey);
    const improvementTemplate = `You are an expert technical writer. Improve the following markdown content:
{text}`;
    const prompt = PromptTemplate.fromTemplate(improvementTemplate);
    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    return await chain.invoke({ text });
  }

  public async getRecommendations(analysis: any, provider: 'groq' | 'gemini' = 'groq', apiKey?: string): Promise<{ sections: string[]; tone: string; reason: string }> {
    const summary = analysis.summary || analysis;
    const model = this.createModelInstance(provider, apiKey);
    const recommendationPrompt = `Suggest README sections for: ${summary.name}. JSON output only.`;
    const response = await model.pipe(new StringOutputParser()).invoke(recommendationPrompt);
    try {
      const start = response.indexOf('{');
      const end = response.lastIndexOf('}');
      return JSON.parse(response.substring(start, end + 1).trim());
    } catch (e) {
      return { sections: ['Installation', 'Usage'], tone: 'professional', reason: 'Basic project documentation' };
    }
  }

  private async generateProjectManifest(model: any, context: ProjectContext, summary: ProjectSummary): Promise<string> {
    if (!context?.evidence?.files || context.evidence.files.length === 0) return "No deep context found.";
    const evidencePrompt = `Understand the project core logic and industry domain:
Summary: ${summary.name} - ${summary.description}
Files: ${JSON.stringify(context.evidence.files.slice(0, 15))}
1. Domain Mapping: What industry/problem space is this in?
2. Core Logic: What is the main business logic?
3. Bottlenecks: What are the main technical hurdles or complexities?
4. Key Flows: List 3 main user flows.

Return 1 detailed paragraph "Intelligence Manifest".`;
    return await this.callLlm(model, evidencePrompt);
  }

  public async generateReadme(
    analysis: ProjectAnalysis,
    provider: 'groq' | 'gemini' = 'groq',
    options: { sections?: string[]; tone?: string; shields?: string[]; additionalContext?: string; apiKey?: string; persona?: string } = {}
  ): Promise<string> {
    const model = this.createModelInstance(provider, options.apiKey);
    const { summary, context } = analysis;
    const refined = SemanticRefiner.refine(summary);
    const targetTone = options.tone || 'professional';
    const personaGuidance = this.getPersonaGuidance(options.persona || 'Senior Developer');

    const projectManifest = await this.generateProjectManifest(model, context, summary);
    const technicalTruthMap = await this.distillProjectEvidence(model, context.evidence, targetTone);

    const generationPrompt = `Generate a comprehensive README.md for ${summary.name}.

## PROJECT CONTEXT
Persona: ${options.persona || 'Senior Developer'}
Guidance: ${personaGuidance}
Intelligence Manifest: ${projectManifest}
Code Artifacts Inventory: ${technicalTruthMap}
Scripts: ${JSON.stringify(summary.scripts || {})}
Dependencies: ${JSON.stringify(summary.dependencies || [])}
Is Monorepo: ${summary.isMonorepo}

## MANDATORY SECTIONS TO INCLUDE:
1. **🚀 Installation**: Provide REAL commands (e.g. \`pnpm install\`). If monorepo, emphasize using \`pnpm --filter\` for specific services.
2. **🛠 Usage**: Provide a concrete code example/snippet based on the Code Artifacts Inventory. DO NOT use generic placeholders.
3. **✨ Features**: Highlight technical features found in the manifest.
4. **🏢 Architecture**: Explain the project structure based on the manifest.

## STRICTOR RULES:
- **NO PLACEHOLDERS**: Every section must be populated with grounded facts. No "Coming soon" or "Placeholder".
- **TRIPLE BACKTICKS**: Use \`\`\` language blocks for all code and commands.
- **TONE**: ${targetTone}.

README CONTENT (START WITH #):
`;

    const draft = await this.callLlm(model, generationPrompt);
    const finalContent = this.cleanLlmOutput(draft);

    const header = this.generateHeader(summary, options.shields || []);
    const diagram = this.generateArchitectureDiagram(summary);
    const envConfig = this.distillEnvVars(summary);

    return `${header}\n${diagram}\n${finalContent}\n\n${envConfig}`;
  }

  public async *generateReadmeStream(
    analysis: ProjectAnalysis,
    provider: 'groq' | 'gemini' = 'groq',
    options: { sections?: string[]; tone?: string; shields?: string[]; additionalContext?: string; apiKey?: string; persona?: string } = {}
  ): AsyncGenerator<string> {
    const model = this.createModelInstance(provider, options.apiKey);
    const { summary, context } = analysis;
    const targetTone = options.tone || 'professional';
    const personaGuidance = this.getPersonaGuidance(options.persona || 'Senior Developer');

    yield this.generateHeader(summary, options.shields || []) + "\n";
    yield this.generateArchitectureDiagram(summary) + "\n";

    const projectManifest = await this.generateProjectManifest(model, context, summary);
    const technicalTruthMap = await this.distillProjectEvidence(model, context.evidence, targetTone);

    const streamPrompt = `Generate a README.md for ${summary.name}.
Persona: ${options.persona || 'Senior Developer'}
Guidance: ${personaGuidance}
Manifest: ${projectManifest}
Inventory: ${technicalTruthMap}
Scripts: ${JSON.stringify(summary.scripts || {})}

## TASK:
Draft a full README. You MUST include REAL 🚀 Installation commands and 🛠 Usage code examples. 
NO PLACEHOLDERS. 
TONE: ${targetTone}`;

    const stream = await model.pipe(new StringOutputParser()).stream(streamPrompt);
    for await (const chunk of stream) { yield chunk; }
    yield "\n\n" + this.distillEnvVars(summary);
  }

  private getPersonaGuidance(persona: string): string {
    switch (persona.toLowerCase()) {
      case 'senior developer':
        return "Emphasize architecture, performance, and maintainability. Use precise technical terms. Focus on data flow and state management.";
      case 'startup founder':
        return "Focus on the value proposition, high-level features, and speed of getting started. Keep it polished, visionary, and user-centric.";
      case 'educational/beginner':
        return "Explain concepts simply, provide step-by-step guidance, and explain *how* things work under the hood in a clear way.";
      case 'open source contributor':
        return "Emphasize community guidelines, contribution flows, testing, and issue reporting. Keep it welcoming but rigorous.";
      default:
        return "Standard technical documentation persona.";
    }
  }

  private generateHeader(summary: ProjectSummary, shields: string[]): string {
    const navbar = this.generateNavbar(summary);
    const shieldsMarkdown = this.generateShields(shields, summary);
    return `<p align="center">\n  <h1 align="center">${summary.name}</h1>\n  <p align="center">${summary.description || ''}</p>\n</p>\n\n<p align="center">\n${shieldsMarkdown}\n</p>\n\n<p align="center">\n${navbar}\n</p>\n\n`;
  }

  public async generateNestedReadmes(
    analysis: ProjectAnalysis,
    provider: 'groq' | 'gemini' = 'groq',
    options: { sections?: string[]; tone?: string; shields?: string[]; additionalContext?: string; apiKey?: string } = {}
  ): Promise<{ path: string, content: string }[]> {
    const readmes: { path: string, content: string }[] = [];
    const { summary } = analysis;
    const tree = summary.tree || [];
    
    // Find directories containing package.json or go.mod
    const nestedDirs = Array.from(new Set(
      tree.filter(f => f.match(/(?:apps|packages)\/[^\/]+\/(?:package\.json|go\.mod)$/))
          .map(f => f.split('/').slice(0, -1).join('/'))
    ));

    if (nestedDirs.length === 0) return readmes;

    const model = this.createModelInstance(provider, options.apiKey);
    const targetTone = options.tone || 'professional';

    for (const dir of nestedDirs) {
      // Filter scripts relevant to this directory
      const dirScripts = Object.entries(summary.scripts || {})
        .filter(([key]) => key.startsWith(`${dir}:`))
        .reduce((acc, [key, val]) => ({ ...acc, [key.split(':').slice(1).join(':')]: val }), {});

      const dirRole = dir.includes('apps/') ? 'Application' : 'Package/Library';
      const dirPrompt = `Generate a dedicated README.md for a sub-project in a monorepo.
Sub-project Directory: ${dir}
Type: ${dirRole}
Root Project Context: ${summary.name}
Sub-project Scripts: ${JSON.stringify(dirScripts)}

TASK:
Write a UNIQUE README for this specific component. Explain its individual role and purpose within the parent project.
Provide REAL installation/run commands like \`cd ${dir} && pnpm run dev\`.
Include a brief list of its core dependencies if available.
NO PLACEHOLDERS. START WITH # ${dir.split('/').pop()}.
TONE: ${targetTone}

README CONTENT:
`;
      const content = await this.callLlm(model, dirPrompt);
      readmes.push({
        path: `${dir}/README.md`,
        content: this.cleanLlmOutput(content)
      });
    }

    return readmes;
  }

  private cleanLlmOutput(text: string): string {
    return text.trim().replace(/^```markdown\n/i, '').replace(/^```\n/i, '').replace(/\n```$/i, '').trim();
  }

  private async callLlm(model: any, prompt: string): Promise<string> {
    try {
      return await model.pipe(new StringOutputParser()).invoke(prompt);
    } catch (err) {
      console.error('[LLMService] Invocation failed:', err);
      return "LLM processing failed.";
    }
  }

  private async distillProjectEvidence(model: any, evidence: any, tone: string): Promise<string> {
    if (!evidence?.files || evidence.files.length === 0) return 'No technical assets found.';
    
    // Create a simplified inventory list instead of generic serialization
    const inventoryList = evidence.files.map((f: any) => {
      const sigs = f.snippets.map((s: any) => `${s.type}: ${s.name}`).join(', ');
      return `- File: ${f.path}\n  Exports: ${sigs}`;
    }).join('\n');

    const distillationPrompt = `Analyze these code artifacts. Capture the specific function names, route paths, and parameters.
Inventory for README generation:
${inventoryList}

TASK:
Return a 1-2 paragraph "Technical Inventory". Clearly explain WHAT functions and endpoints are available so the generator can write real usage examples.
BE SPECIFIC. NO PLACEHOLDERS.
`;
    return await this.callLlm(model, distillationPrompt);
  }

  private generateNavbar(summary: ProjectSummary): string {
    const links = ['[README](README.md)'];
    if ((summary.tree || []).some(f => f.match(/LICENSE/i))) links.push('[License](LICENSE)');
    return links.join(' | ');
  }

  private generateShields(shields: string[], summary: ProjectSummary): string {
    return (shields || []).map(s => `![${s}](https://img.shields.io/badge/${s}-blue?style=flat-square)`).join(' ');
  }
}

export const llmService = new LLMService();
