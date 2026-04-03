import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { config } from "dotenv";
import {
  SemanticRefiner,
  ProjectAnalysis,
  ProjectContext,
  ProjectSummary,
  buildScriptsMarkdown,
  formatWorkspaceScriptsForPrompt,
} from "@readme-gen/analyzer";

config();

export type GenerateReadmeOptions = {
  sections?: string[];
  tone?: string;
  shields?: string[];
  additionalContext?: string;
  apiKey?: string;
  modelId?: string;
  persona?: string;
  heroImageUrl?: string;
  readmeTemplate?: { id?: string; body: string };
  writeMode?: "overwrite" | "rewrite" | "append";
  llmDelayMs?: number;
};

export type LlmProvider = "groq" | "gemini" | "openai";

type LlmCallScheduler = <T>(task: () => Promise<T>) => Promise<T>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class LLMService {
  constructor() {}

  private createScheduler(delayMs?: number): LlmCallScheduler {
    const minDelayMs = Math.max(0, delayMs ?? 0);
    let queue: Promise<void> = Promise.resolve();
    let lastCallAt = 0;

    return async <T>(task: () => Promise<T>) => {
      const scheduled = queue.catch(() => undefined).then(async () => {
        if (minDelayMs > 0) {
          const elapsed = Date.now() - lastCallAt;
          const remaining = minDelayMs - elapsed;
          if (remaining > 0) {
            await sleep(remaining);
          }
        }

        lastCallAt = Date.now();
        return await task();
      });

      queue = scheduled.then(() => undefined, () => undefined);
      return scheduled;
    };
  }

  /**
   * Build a comprehensive grounding context from ProjectSummary.
   * Formats data into structured XML-like blocks for precise LLM parsing.
   */
  private buildGroundingContext(
    summary: ProjectSummary,
    selectedSections: string[] = [],
  ): string {
    const sections: string[] = [];
    const includeAll = selectedSections.length === 0;
    const includeApi = includeAll || selectedSections.includes("API");
    const includeUsage = includeAll || selectedSections.includes("Usage");

    if (summary.existingReadme?.content?.trim()) {
      sections.push(
        `<existing_readme path="${summary.existingReadme.path}">\n${summary.existingReadme.content.trim().slice(0, 12000)}\n</existing_readme>`,
      );
    }

    // --- TECH STACK SUMMARY ---
    const stackParts: string[] = [];
    if (summary.language) stackParts.push(summary.language);
    if (summary.framework?.name) stackParts.push(summary.framework.name);
    if (summary.isMonorepo) stackParts.push("Monorepo");
    if (summary.hasDocker) stackParts.push("Docker");
    const features = summary.features || [];
    if (features.length > 0) stackParts.push(...features.slice(0, 6));

    sections.push(
      `<tech_stack_summary>\nBuilt with: ${stackParts.join(", ")}\n</tech_stack_summary>`,
    );

    // --- DEPENDENCIES ---
    const deps = summary.dependencies || [];
    if (deps.length > 0) {
      const keyDeps = deps.filter((d) => !d.startsWith("@types/")).slice(0, 20);
      sections.push(
        `<key_dependencies>\n${keyDeps.map((d) => `- ${d}`).join("\n")}\n</key_dependencies>`,
      );
    }

    // --- SCRIPTS ---
    const scriptsMd = buildScriptsMarkdown(summary);
    if (scriptsMd) {
      sections.push(
        `<available_commands>\n${scriptsMd}\n</available_commands>`,
      );
    }

    // --- ROUTES as a table ---
    const routes = summary.routes || [];
    if (includeApi && routes.length > 0) {
      const header =
        "| Method | Endpoint | Source File |\n|--------|----------|-------------|";
      const rows = routes.map(
        (r) => `| ${r.method.toUpperCase()} | ${r.path} | ${r.file} |`,
      );
      sections.push(
        `<api_endpoints>\n${header}\n${rows.join("\n")}\n</api_endpoints>`,
      );
    }

    // --- ROUTE SNIPPETS ---
    const routeSnippets = (summary.routes || [])
      .filter((r) => Boolean(r.snippet))
      .slice(0, 8);
    if ((includeApi || includeUsage) && routeSnippets.length > 0) {
      sections.push(
        `<api_route_snippets>\n` +
          routeSnippets
            .map(
              (r) =>
                `- ${r.method.toUpperCase()} ${r.path} (${r.file})\n\`\`\`ts\n${String(r.snippet).trim().slice(0, 800)}\n\`\`\``,
            )
            .join("\n") +
          `\n</api_route_snippets>`,
      );
    }

    // --- ENV VARS ---
    const envVars = summary.envVars || [];
    if (envVars.length > 0) {
      sections.push(
        `<environment_variables>\n\`\`\`env\n${envVars.map((v) => `${v}=your_value_here`).join("\n")}\n\`\`\`\n</environment_variables>`,
      );
    }

    // --- MONOREPO STRUCTURE ---
    if (summary.isMonorepo) {
      const keyDirs = summary.keyDirectories || [];
      sections.push(
        `<project_structure type="Monorepo">\n${keyDirs.length > 0 ? `Key Directories:\n${keyDirs.map((d) => `- ${d}/`).join("\n")}` : "Standard Monorepo structure."}\n</project_structure>`,
      );
    }

    // --- DB SCHEMAS ---
    const schemas = summary.dbSchemas || [];
    if (schemas.length > 0) {
      sections.push(
        `<database_models>\n${schemas.map((s) => `- ${s.model}: ${s.fields.join(", ")} (${s.file})`).join("\n")}\n</database_models>`,
      );
    }

    // --- REAL EXAMPLES ---
    const examples = summary.examples || [];
    if (examples.length > 0) {
      const rendered = examples
        .slice(0, 6)
        .map((ex) => {
          const code = (ex.code || "").trim().slice(0, 1200);
          return `- ${ex.description} (${ex.file})\n\`\`\`ts\n${code}\n\`\`\``;
        })
        .join("\n");
      sections.push(
        `<real_usage_examples>\n${rendered}\n</real_usage_examples>`,
      );
    }

    return sections.join("\n\n");
  }

  /**
   * Evidence index for forcing concrete examples (functions/classes/interfaces).
   */
  private buildEvidenceIndex(context: ProjectContext): string {
    const files = context?.evidence?.files || [];
    if (files.length === 0) return "No evidence index available.";

    const topFiles = files.slice(0, 20);
    const lines: string[] = ["### CODE SURFACE (verbatim signatures by file)"];
    for (const f of topFiles) {
      const snippets = (f.snippets || []).slice(0, 30);
      if (snippets.length === 0) continue;
      lines.push(`- **${f.path}**`);
      lines.push("```text");
      lines.push(...snippets.map((s) => String(s).slice(0, 400)));
      lines.push("```");
    }
    return lines.join("\n");
  }

  /**
   * Dynamically build instructions based on requested sections.
   */
  private buildSectionPrompt(sections: string[] = []): string {
    if (sections.length === 0) {
      return `## MANDATORY SECTIONS:\nInclude standard README sections based on the Grounding Data. Use professional headings and appropriate emojis.`;
    }

    const instructions: string[] = [
      "## MANDATORY SECTIONS TO INCLUDE (AND NO OTHERS):",
    ];

    if (sections.includes("Architecture")) {
      instructions.push(
        `- **Architecture**: Create an elegant \`mermaid\` flowchart explaining the domain flow. Use \`graph LR\` or \`graph TD\`. IMPORTANT: Do NOT use sequence diagram syntax (e.g. \`participant\` or \`->>\`). Use standard flowchart syntax for nodes and edges with labels (e.g., \`A[Frontend] -->|Label| B[Backend]\`). Start the mermaid block with %%{init: {'theme': 'neutral'}}%% for a professional appearance. Explain the high-level architecture before the diagram.`,
      );
    }
    if (sections.includes("Installation")) {
      instructions.push(
        `- **Installation**: Provide EXACT setup scripts (e.g. \`npm install\`). If a monorepo is detected, emphasize using workspace-aware commands. Use code blocks with the correct language identifier.`,
      );
    }
    if (sections.includes("Usage")) {
      instructions.push(
        `- **Usage**: Provide at least 2 "Copy-Paste Ready" examples using data from <api_route_snippets> or <real_usage_examples>. Use realistic parameters. Highlight key lines with comments.`,
      );
    }
    if (sections.includes("API")) {
      instructions.push(
        `- **API Reference**: Document ALL routes from <api_endpoints> in a clean markdown table with columns: Method, Endpoint, Description, and Auth (if detectable).`,
      );
    }
    if (sections.includes("Testing")) {
      instructions.push(
        `- **Testing**: Provide commands for running the test suite and linters. Include a brief section on how to add new tests.`,
      );
    }
    if (sections.includes("Deployment")) {
      instructions.push(
        `- **Deployment**: Provide build commands or Docker deployment instructions from <tech_stack_summary>. Include environment variable requirements.`,
      );
    }
    if (sections.includes("Contributing")) {
      instructions.push(
        `- **Contributing**: Briefly outline the PR process and code standards. Use a welcoming tone.`,
      );
    }
    if (sections.includes("License")) {
      instructions.push(
        `- **License**: Insert a standard open-source license placeholder (e.g. MIT).`,
      );
    }

    return instructions.join("\n");
  }

  private formatReadmeTemplateSpec(
    templateMarkdown: string,
    summary: ProjectSummary,
  ): string {
    const year = new Date().getFullYear();
    const desc = (summary.description || "")
      .replace(/\s+/g, " ")
      .slice(0, 1200);
    return `## STRUCTURE TEMPLATE
TEMPLATE_JSON is a JSON-encoded string of the README markdown skeleton you must reproduce structurally.

**Replace placeholders using grounded facts (literal values for this run):**
- \`{project-name}\` → ${JSON.stringify(summary.name)}
- \`{description}\` → ${JSON.stringify(desc)}
- \`{year}\` → ${JSON.stringify(String(year))}
- \`{author}\` → "Contributors" (or org/repo owner only if explicitly stated in GROUNDING DATA)

**Structural compliance:**
1. Same \`#\` / \`##\` / \`###\` heading sequence and titles as in the template (after substituting placeholders).
2. Same markdown table shapes (column count and header cell text).
3. Same fenced code block languages and ordering where the template shows fences.
4. Do not add or remove \`##\` sections compared to the template.
5. Fill prose and tables only from GROUNDING DATA, CODE SURFACE, and ADDITIONAL CONTEXT.

TEMPLATE_JSON:
${JSON.stringify(templateMarkdown)}
`;
  }

  private buildReadmeUserPrompt(
    analysis: ProjectAnalysis,
    options: Pick<
      GenerateReadmeOptions,
      | "sections"
      | "tone"
      | "additionalContext"
      | "persona"
      | "readmeTemplate"
      | "writeMode"
    >,
    projectManifest: string,
    technicalTruthMap: string,
  ): { usesTemplate: boolean; prompt: string } {
    const { summary, context } = analysis;
    const targetTone = options.tone || "professional";
    const personaGuidance = this.getPersonaGuidance(
      options.persona || "Senior Developer",
    );
    const tpl = options.readmeTemplate?.body?.trim();
    const usesTemplate = Boolean(tpl);
    const writeMode =
      options.writeMode ||
      (summary.existingReadme?.content?.trim() ? "rewrite" : "overwrite");

    const groundingContext = this.buildGroundingContext(
      summary,
      options.sections,
    );
    const evidenceIndex = this.buildEvidenceIndex(context);

    // Styling rules to ensure premium look and feel
    const stylingRules = `## STYLING & FORMATTING RULES:
- **VISUAL HIERARCHY**: Use emojis for section headings (e.g., 🚀 Quick Start, 🛠️ Tech Stack).
- **CALLOUTS**: Use GitHub-flavored markdown callouts for important notes (e.g., \`> [!NOTE]\`, \`> [!TIP]\`, \`> [!IMPORTANT]\`, \`> [!WARNING]\`).
- **TABLES**: Use well-formatted markdown tables for API routes, environment variables, and script lists.
- **MERMAID**: Use Mermaid diagrams for architecture/flow sections.
- **NO Hallucinations**: Do not invent links, images, or features not present in the grounding data.
- **CLEAN PROSE**: Write clean, concise, and professional technical documentation.`;

    const sectionInstructions =
      usesTemplate ?
        `## SECTIONS\nUse **only** the STRUCTURE TEMPLATE for which headings exist and their order. Ignore any conflicting free-form section list.`
      : this.buildSectionPrompt(options.sections);

    const templateBlock =
      usesTemplate ? this.formatReadmeTemplateSpec(tpl!, summary) : "";

    const outputInstruction =
      writeMode === "append" ?
        `README CONTENT (APPEND-ONLY: return ONLY new markdown to append to the existing README. Start with a \`##\` heading and avoid repeating existing sections):`
      : usesTemplate ?
        `README CONTENT (open exactly as the template does - usually a single \`#\` title line):`
      : `README CONTENT (START WITH #):`;

    const strictRules =
      usesTemplate ?
        `## STRICT RULES:
- **TEMPLATE STRUCTURE IS LAW**: Mirror TEMPLATE_JSON - heading hierarchy/order/titles (after placeholders), table shapes, fence languages, and section count must match.
- **GROUNDING**: All factual claims from GROUNDING DATA, CODE SURFACE, or ADDITIONAL CONTEXT only.
- **EXAMPLES**: Prefer real commands, routes, and identifiers from CODE SURFACE; do not invent HTTP paths or CLI flags.
- **GAPS**: If a template subsection has no grounded content, one short honest sentence (e.g. not applicable / not detected) - never fabricate.
- **EXISTING README MODE**: ${writeMode}.
- **TONE**: ${targetTone}.

${outputInstruction}
`
      : `## STRICT RULES:
- **GROUNDING FIRST**: Every claim must come from the Grounding Data or Additional Context above. Do NOT invent features, dependencies, or commands.
- **EXISTING README MODE**: ${writeMode}.
- **EXISTING README HANDLING**: If an EXISTING README is provided and mode is \`rewrite\`, treat this task as a rewrite/update pass. Reuse valuable structure and wording where it is still accurate, but fix stale, weak, or generic sections using the grounded facts.
- **APPEND MODE**: If mode is \`append\`, return ONLY net-new markdown to append. Do not repeat the title, badges, overview, or sections that already exist unless you are extending them with grounded new information.
- **OMIT UNSELECTED SECTIONS**: If a section is not listed in MANDATORY SECTIONS, do NOT generate it.
- **REAL EXAMPLES ONLY**: For Usage/Quick Start/API examples, you MUST use real endpoint paths (e.g. \`/api/...\`) and real function/class names from CODE SURFACE. If you can't ground an example, omit it rather than inventing it.
- **NO PLACEHOLDERS**: Every generated section must be populated with real facts. No "Coming soon" or "TODO".
- **TONE**: ${targetTone}.

${outputInstruction}
`;

    const prompt = `Generate a comprehensive, enterprise-grade README.md for ${summary.name}.

## PERSONA
${options.persona || "Senior Developer"}: ${personaGuidance}

## INTELLIGENCE (Technical context of the project)
${projectManifest}

## CODE ARTIFACTS INVENTORY (Ground truth analysis)
${technicalTruthMap}

## GROUNDING DATA (Context wrapped in XML tags - DO NOT DEVIATE FROM THESE FACTS)
${groundingContext}

## CODE SURFACE (Verbatim code signatures for usage examples)
${evidenceIndex}

${templateBlock}

${sectionInstructions}

${stylingRules}

## ADDITIONAL CONTEXT (Business logic / User intent)
${options.additionalContext || "No additional context provided."}

${strictRules}`;

    return { usesTemplate, prompt };
  }

  private distillEnvVars(summary: ProjectSummary): string {
    if (!summary.isMonorepo) {
      return `### ⚙️ Environment Configuration\n\`\`\`env\n${(summary.envVars || []).map((v: string) => `${v}=`).join("\n")}\n\`\`\``;
    }
    const envSection: string[] = [
      "## ⚙️ Environment Configuration",
      "Each service has its own `.env` file.",
    ];
    const apps = (summary.tree || [])
      .filter((f: string) => f.startsWith("apps/"))
      .map((f: string) => f.split("/")[1]);
    const uniqueApps = Array.from(new Set(apps));
    if (uniqueApps.length === 0)
      return `### ⚙️ Environment Configuration\n\`\`\`env\n${(summary.envVars || []).map((v: string) => `${v}=`).join("\n")}\n\`\`\``;
    for (const app of uniqueApps as string[]) {
      envSection.push(
        `### ${app.charAt(0).toUpperCase() + app.slice(1)} (\`apps/${app}/.env\`)`,
      );
      envSection.push("```env");
      const relevantVars = (summary.envVars || []).filter((v: string) => true);
      envSection.push(relevantVars.map((v: string) => `${v}=`).join("\n"));
      envSection.push("```");
    }
    return envSection.join("\n\n");
  }

  private createModelInstance(
    provider: LlmProvider,
    apiKey?: string,
    modelId?: string,
  ): any {
    if (provider === "gemini") {
      const key = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!key) throw new Error("Gemini API Key is missing.");
      return new ChatGoogleGenerativeAI({
        apiKey: key,
        model: modelId || "gemini-2.5-flash",
        maxRetries: 2,
        temperature: 0.1,
      });
    }

    if (provider === "openai") {
      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) throw new Error("OpenAI API Key is missing.");
      return new ChatOpenAI({
        apiKey: key,
        model: modelId || "gpt-4o-mini",
        maxRetries: 2,
        temperature: 0.1,
      });
    }

    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) throw new Error("Groq API Key is missing.");
    return new ChatGroq({
      apiKey: key,
      model: modelId || "llama-3.3-70b-versatile",
      temperature: 0.1,
    });
  }

  public async improveContent(
    text: string,
    provider: LlmProvider = "groq",
    apiKey?: string,
    instruction?: string,
    modelId?: string,
  ): Promise<{ content: string; tokens: number }> {
    const model = this.createModelInstance(provider, apiKey, modelId);
    const dir =
      instruction?.trim() ?
        `\n\n## User direction (prioritize this)\n${instruction.trim()}`
      : "";
    const promptText = `You are an expert technical writer. Improve the following markdown for clarity, grammar, and technical accuracy.${dir}

Rules:
- Output only the improved markdown for the same scope (no preamble).
- Unless the user direction says otherwise, preserve heading levels and list structure.
- Preserve code fences and their languages.

## Markdown to improve

${text}`;
    return await this.callLlm(model, promptText);
  }

  public async getRecommendations(
    analysis: any,
    provider: LlmProvider = "groq",
    apiKey?: string,
    modelId?: string,
  ): Promise<{ sections: string[]; tone: string; reason: string }> {
    const summary = analysis.summary || analysis;
    const model = this.createModelInstance(provider, apiKey, modelId);
    const recommendationPrompt = `Suggest README sections for: ${summary.name}. JSON output only.`;
    const response = await model
      .pipe(new StringOutputParser())
      .invoke(recommendationPrompt);
    try {
      const start = response.indexOf("{");
      const end = response.lastIndexOf("}");
      return JSON.parse(response.substring(start, end + 1).trim());
    } catch (e) {
      return {
        sections: ["Installation", "Usage"],
        tone: "professional",
        reason: "Basic project documentation",
      };
    }
  }

  private async generateProjectManifest(
    model: any,
    context: ProjectContext,
    summary: ProjectSummary,
    schedule?: LlmCallScheduler,
  ): Promise<{ content: string; tokens: number }> {
    if (!context?.evidence?.files || context.evidence.files.length === 0)
      return { content: "No deep context found.", tokens: 0 };
    const evidencePrompt = `Understand the project core logic and industry domain:
Summary: ${summary.name} - ${summary.description}
Files: ${JSON.stringify(context.evidence.files.slice(0, 15))}
1. Domain Mapping: What industry/problem space is this in?
2. Core Logic: What is the main business logic?
3. Bottlenecks: What are the main technical hurdles or complexities?
4. Key Flows: List 3 main user flows.

Return 1 detailed paragraph "Intelligence Manifest".`;
    return await this.callLlm(model, evidencePrompt, schedule);
  }

  public async generateReadme(
    analysis: ProjectAnalysis,
    provider: LlmProvider = "groq",
    options: GenerateReadmeOptions = {},
  ): Promise<{ content: string; tokens: number }> {
    const model = this.createModelInstance(
      provider,
      options.apiKey,
      options.modelId,
    );
    const { summary, context } = analysis;
    SemanticRefiner.refine(summary);
    const targetTone = options.tone || "professional";
    const schedule = this.createScheduler(options.llmDelayMs);

    const manifestResult = await this.generateProjectManifest(
      model,
      context,
      summary,
      schedule,
    );
    const technicalTruthMapResult = await this.distillProjectEvidence(
      model,
      context.evidence,
      targetTone,
      schedule,
    );

    let totalTokens = manifestResult.tokens + technicalTruthMapResult.tokens;
    const projectManifest = manifestResult.content;
    const technicalTruthMap = technicalTruthMapResult.content;

    const { usesTemplate, prompt: generationPrompt } =
      this.buildReadmeUserPrompt(
        analysis,
        options,
        projectManifest,
        technicalTruthMap,
      );

    const generationResult = await this.callLlm(model, generationPrompt, schedule);
    const finalContent = this.cleanLlmOutput(generationResult.content);
    totalTokens += generationResult.tokens;
    const writeMode =
      options.writeMode ||
      (summary.existingReadme?.content?.trim() ? "rewrite" : "overwrite");

    if (options.readmeTemplate?.body?.trim() && writeMode === "append") {
      throw new Error(
        "Append mode is not supported when a layout template is selected.",
      );
    }

    if (usesTemplate) {
      return {
        content: `${finalContent.trim()}\n`,
        tokens: totalTokens,
      };
    }

    if (writeMode === "append") {
      const existing = summary.existingReadme?.content?.trim();
      return {
        content:
          existing ?
            `${existing}\n\n${finalContent.trim()}\n`
          : `${finalContent.trim()}\n`,
        tokens: totalTokens,
      };
    }

    const header = this.generateHeader(
      summary,
      options.shields || [],
      options.heroImageUrl,
    );
    const envConfig = this.distillEnvVars(summary);

    return {
      content: `${header}\n${finalContent}\n\n${envConfig}`,
      tokens: totalTokens,
    };
  }

  public async *generateReadmeStream(
    analysis: ProjectAnalysis,
    provider: LlmProvider = "groq",
    options: GenerateReadmeOptions = {},
  ): AsyncGenerator<string> {
    const model = this.createModelInstance(
      provider,
      options.apiKey,
      options.modelId,
    );
    const { summary, context } = analysis;
    const targetTone = options.tone || "professional";
    const schedule = this.createScheduler(options.llmDelayMs);
    const writeMode =
      options.writeMode ||
      (summary.existingReadme?.content?.trim() ? "rewrite" : "overwrite");

    const { usesTemplate, prompt: streamPrompt } = this.buildReadmeUserPrompt(
      analysis,
      options,
      (await this.generateProjectManifest(model, context, summary, schedule)).content,
      (await this.distillProjectEvidence(model, context.evidence, targetTone, schedule))
        .content,
    );

    if (usesTemplate && writeMode === "append") {
      throw new Error(
        "Append mode is not supported when a layout template is selected.",
      );
    }

    if (writeMode === "append" && summary.existingReadme?.content?.trim()) {
      yield `${summary.existingReadme.content.trim()}\n\n`;
    }

    if (!usesTemplate && writeMode !== "append") {
      yield this.generateHeader(
        summary,
        options.shields || [],
        options.heroImageUrl,
      ) + "\n";
    }

    // We already yielded the header, prevent LLM from generating it again
    const startRegex = new RegExp(
      `^#\\s*${summary.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n?`,
      "i",
    );
    const stream = await schedule<AsyncIterable<string>>(() =>
      model.pipe(new StringOutputParser()).stream(streamPrompt),
    );
    for await (let chunk of stream) {
      if (!usesTemplate && writeMode !== "append") {
        chunk = chunk.replace(startRegex, "");
      }
      yield chunk;
    }
    if (!usesTemplate && writeMode !== "append") {
      yield "\n\n" + this.distillEnvVars(summary);
    }
  }

  private getPersonaGuidance(persona: string): string {
    switch (persona.toLowerCase()) {
      case "senior developer":
        return "Emphasize architecture, performance, and maintainability. Use precise technical terms. Focus on data flow and state management. Provide deep technical insights and avoid fluff.";
      case "startup founder":
        return "Focus on the value proposition, high-level features, and speed of getting started. Keep it polished, visionary, and user-centric. Use engaging language but stay grounded in facts.";
      case "educational/beginner":
        return "Explain concepts simply, provide step-by-step guidance, and explain *how* things work under the hood. Use analogies where appropriate but keep code examples accurate.";
      case "open source contributor":
        return "Emphasize community guidelines, contribution flows, testing, and issue reporting. Keep it welcoming but rigorous. Ensure the build process is crystal clear.";
      default:
        return "Provide standard professional technical documentation. Focus on clarity and accuracy.";
    }
  }

  private generateHeader(
    summary: ProjectSummary,
    shields: string[],
    heroImageUrl?: string,
  ): string {
    const navbar = this.generateNavbar(summary);
    const shieldsMarkdown = this.generateShields(shields, summary);
    const lines: string[] = [`# ${summary.name}`, ""];
    if (summary.description) {
      lines.push(`> ${summary.description}`, "");
    }
    if (heroImageUrl && heroImageUrl.trim()) {
      // Keep it simple: a banner/hero image near the top, like many senior OSS READMEs.
      lines.push(`![${summary.name} hero](${heroImageUrl.trim()})`, "");
    }
    if (shieldsMarkdown.trim()) {
      lines.push(shieldsMarkdown, "");
    }
    if (navbar.trim()) {
      lines.push(navbar, "");
    }
    return lines.join("\n") + "\n";
  }

  public async generateNestedReadmes(
    analysis: ProjectAnalysis,
    provider: LlmProvider = "groq",
    options: {
      sections?: string[];
      tone?: string;
      shields?: string[];
      additionalContext?: string;
      apiKey?: string;
      modelId?: string;
      llmDelayMs?: number;
    } = {},
  ): Promise<{ path: string; content: string; tokens: number }[]> {
    const readmes: { path: string; content: string; tokens: number }[] = [];
    const { summary } = analysis;
    const tree = summary.tree || [];

    // Find directories containing package.json or go.mod
    const nestedDirs = Array.from(
      new Set(
        tree
          .filter((f) =>
            f.match(/(?:apps|packages)\/[^\/]+\/(?:package\.json|go\.mod)$/),
          )
          .map((f) => f.split("/").slice(0, -1).join("/")),
      ),
    );

    if (nestedDirs.length === 0) return readmes;

    const model = this.createModelInstance(
      provider,
      options.apiKey,
      options.modelId,
    );
    const targetTone = options.tone || "professional";
    const schedule = this.createScheduler(options.llmDelayMs);

    for (const dir of nestedDirs) {
      const existingNestedReadme = (summary.nestedReadmes || []).find(
        (item) =>
          item.path === `${dir}/README.md` ||
          item.path === `${dir}/README.mdx` ||
          item.path === `${dir}/README.txt`,
      );
      const dirScripts = Object.entries(summary.scripts || {})
        .filter(([key]) => key.startsWith(`${dir}:`))
        .reduce<Record<string, string>>((acc, [key, val]) => {
          const scriptName = key.slice(dir.length + 1);
          acc[scriptName] = val;
          return acc;
        }, {});

      const scriptsHuman = formatWorkspaceScriptsForPrompt(
        dirScripts,
        dir,
        summary.packageManager,
      );
      const pm = summary.packageManager || "npm";

      const dirRole = dir.includes("apps/") ? "Application" : "Package/Library";
      const existingReadmeBlock =
        existingNestedReadme?.content?.trim() ?
          `Existing sub-project README (${existingNestedReadme.path}):
\`\`\`md
${existingNestedReadme.content.trim().slice(0, 12000)}
\`\`\`

`
        : "";
      const dirPrompt = `Generate a dedicated README.md for a sub-project in a monorepo.
Sub-project Directory: ${dir}
Type: ${dirRole}
Root Project Context: ${summary.name}
Package manager (repo): ${pm}
Sub-project Scripts:
${scriptsHuman || "(no scripts parsed for this package — infer from context)"}

${existingReadmeBlock}TASK:
Write a UNIQUE README for this specific component. Explain its individual role and purpose within the parent project.
If an existing sub-project README is provided above, treat this as an update/rewrite pass: preserve useful structure and accurate details, but replace stale, thin, or generic content with grounded information.
Use the exact run commands listed above (${pm}, from repo root or \`cd ${dir}\`).
Include a brief list of its core dependencies if available.
NO PLACEHOLDERS. START WITH # ${dir.split("/").pop()}.
TONE: ${targetTone}

README CONTENT:
`;
      const generationResult = await this.callLlm(model, dirPrompt, schedule);
      readmes.push({
        path: `${dir}/README.md`,
        content: this.cleanLlmOutput(generationResult.content),
        tokens: generationResult.tokens,
      });
    }

    return readmes;
  }

  private cleanLlmOutput(text: string): string {
    return text
      .trim()
      .replace(/^```markdown\n/i, "")
      .replace(/^```\n/i, "")
      .replace(/\n```$/i, "")
      .trim();
  }

  private async callLlm(
    model: any,
    prompt: string,
    schedule?: LlmCallScheduler,
  ): Promise<{ content: string; tokens: number }> {
    try {
      const response = schedule
        ? await schedule(() => model.invoke(prompt))
        : await model.invoke(prompt);
      const content =
        typeof response === "string" ? response : (response.content as string);
      const tokens =
        (response as any).additional_kwargs?.usage?.total_tokens ||
        (response as any).usage_metadata?.total_tokens ||
        Math.ceil(content.length / 4);

      return { content, tokens };
    } catch (err) {
      console.error("[LLMService] Invocation failed:", err);
      return { content: "LLM processing failed.", tokens: 0 };
    }
  }

  private async distillProjectEvidence(
    model: any,
    evidence: any,
    tone: string,
    schedule?: LlmCallScheduler,
  ): Promise<{ content: string; tokens: number }> {
    if (!evidence?.files || evidence.files.length === 0)
      return { content: "No technical assets found.", tokens: 0 };

    // Create a simplified inventory list instead of generic serialization
    const inventoryList = evidence.files
      .map((f: any) => {
        const sigs = f.snippets
          .map((s: any) => `${s.type}: ${s.name}`)
          .join(", ");
        return `- File: ${f.path}\n  Exports: ${sigs}`;
      })
      .join("\n");

    const distillationPrompt = `Analyze these code artifacts. Capture the specific function names, route paths, and parameters.
Inventory for README generation:
${inventoryList}

TASK:
Return a 1-2 paragraph "Technical Inventory". Clearly explain WHAT functions and endpoints are available so the generator can write real usage examples.
BE SPECIFIC. NO PLACEHOLDERS.
`;
    return await this.callLlm(model, distillationPrompt, schedule);
  }

  private generateNavbar(summary: ProjectSummary): string {
    const links = ["[README](README.md)"];
    if ((summary.tree || []).some((f) => f.match(/LICENSE/i)))
      links.push("[License](LICENSE)");
    return links.join(" | ");
  }

  private generateShields(shields: string[], summary: ProjectSummary): string {
    return (shields || [])
      .map(
        (s) =>
          `![${s}](https://img.shields.io/badge/${s}-blue?style=flat-square)`,
      )
      .join(" ");
  }
}

export const llmService = new LLMService();
