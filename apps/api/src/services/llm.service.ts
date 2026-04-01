import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
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
  persona?: string;
  heroImageUrl?: string;
  readmeTemplate?: { id?: string; body: string };
};

class LLMService {
  constructor() {}

  /**
   * Build a comprehensive grounding context from ProjectSummary.
   * Formats data as copy-paste-ready markdown blocks the LLM can directly include.
   */
  private buildGroundingContext(
    summary: ProjectSummary,
    selectedSections: string[] = [],
  ): string {
    const sections: string[] = [];
    const includeAll = selectedSections.length === 0;
    const includeApi = includeAll || selectedSections.includes("API");
    const includeUsage = includeAll || selectedSections.includes("Usage");

    // --- TECH STACK SUMMARY (one-liner the LLM can copy) ---
    const stackParts: string[] = [];
    if (summary.language) stackParts.push(summary.language);
    if (summary.framework?.name) stackParts.push(summary.framework.name);
    if (summary.isMonorepo) stackParts.push("Monorepo");
    if (summary.hasDocker) stackParts.push("Docker");
    const features = summary.features || [];
    if (features.length > 0) stackParts.push(...features.slice(0, 6));
    sections.push(
      `### TECH STACK (copy this into the README):\n**Built with**: ${stackParts.join(", ")}`,
    );

    // --- DEPENDENCIES (formatted as a list the LLM should reference) ---
    const deps = summary.dependencies || [];
    if (deps.length > 0) {
      const keyDeps = deps.filter((d) => !d.startsWith("@types/")).slice(0, 20);
      sections.push(
        `### KEY DEPENDENCIES (mention these by name in a "Tech Stack" or "Dependencies" section):\n${keyDeps.map((d) => `- **${d}**`).join("\n")}`,
      );
    }

    // --- SCRIPTS (package-manager aware + monorepo paths) ---
    const scriptsMd = buildScriptsMarkdown(summary);
    if (scriptsMd) {
      sections.push(
        `### AVAILABLE COMMANDS (include in Installation/Usage — use this table, do not rewrite as generic npm unless shown):\n${scriptsMd}`,
      );
    }

    // --- ROUTES as a table ---
    const routes = summary.routes || [];
    if (includeApi && routes.length > 0) {
      const header =
        "| Method | Endpoint | Source File |\n|--------|----------|-------------|";
      const rows = routes.map(
        (r) => `| ${r.method.toUpperCase()} | \`${r.path}\` | ${r.file} |`,
      );
      sections.push(
        `### API ENDPOINTS (include this table in the README):\n${header}\n${rows.join("\n")}`,
      );
    }

    // --- ROUTE SNIPPETS (verbatim evidence for examples) ---
    const routeSnippets = (summary.routes || [])
      .filter((r) => Boolean(r.snippet))
      .slice(0, 8);
    if ((includeApi || includeUsage) && routeSnippets.length > 0) {
      sections.push(
        `### ROUTE HANDLER SNIPPETS (use these verbatim for API descriptions/examples):\n` +
          routeSnippets
            .map(
              (r) =>
                `- \`${r.method.toUpperCase()} ${r.path}\` (${r.file})\n\`\`\`ts\n${String(r.snippet).trim().slice(0, 800)}\n\`\`\``,
            )
            .join("\n"),
      );
    }

    // --- ENV VARS as a config block ---
    const envVars = summary.envVars || [];
    if (envVars.length > 0) {
      sections.push(
        `### ENVIRONMENT VARIABLES (include ALL of these in a config section):\n\`\`\`env\n${envVars.map((v) => `${v}=your_value_here`).join("\n")}\n\`\`\``,
      );
    }

    // --- ENTRY POINTS ---
    const entryPoints = summary.entryPoints || [];
    if (entryPoints.length > 0) {
      sections.push(
        `### ENTRY POINTS:\n${entryPoints.map((e) => `- \`${e}\``).join("\n")}`,
      );
    }

    // --- FRAMEWORK ---
    if (summary.framework?.name) {
      sections.push(
        `### Framework: **${summary.framework.name}** (confidence: ${summary.framework.confidence})`,
      );
    }

    // --- MONOREPO STRUCTURE ---
    if (summary.isMonorepo) {
      sections.push(`### Project Structure: **Monorepo**`);
      const keyDirs = summary.keyDirectories || [];
      if (keyDirs.length > 0) {
        sections.push(
          `### Key Directories:\n${keyDirs.map((d) => `- \`${d}/\``).join("\n")}`,
        );
      }
    }

    // --- DB SCHEMAS ---
    const schemas = summary.dbSchemas || [];
    if (schemas.length > 0) {
      sections.push(
        `### Database Models:\n${schemas.map((s) => `- **${s.model}**: ${s.fields.join(", ")} (${s.file})`).join("\n")}`,
      );
    }

    // --- DOCKER ---
    if (summary.hasDocker && summary.devOps?.docker) {
      const d = summary.devOps.docker;
      sections.push(
        `### Docker:\n- Base Image: \`${d.baseImage || "N/A"}\`\n- Ports: ${(d.ports || []).join(", ") || "N/A"}\n- Command: \`${d.command || "N/A"}\``,
      );
    }

    // --- AST FEATURES ---
    const astFeatures = summary.astFeatures || [];
    if (astFeatures.length > 0) {
      sections.push(
        `### Code Patterns (AST-detected):\n${astFeatures.map((f) => `- **${f.name}** found in: ${f.evidence.map((e) => e.file).join(", ")}`).join("\n")}`,
      );
    }

    // --- REAL EXAMPLES (from tests) ---
    const examples = summary.examples || [];
    if (examples.length > 0) {
      const rendered = examples
        .slice(0, 6)
        .map((ex) => {
          const code = (ex.code || "").trim().slice(0, 1200);
          return `- **${ex.description}** (${ex.file})\n\`\`\`ts\n${code}\n\`\`\``;
        })
        .join("\n");
      sections.push(
        `### REAL USAGE EXAMPLES (prefer these in Usage/Quick Start):\n${rendered}`,
      );
    }

    return sections.join("\n\n");
  }

  /**
   * Evidence index for forcing concrete examples (functions/classes/interfaces).
   * This comes from ProjectContext.evidence (DefinitionExtractor) and is stronger than summaries.
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
      return `## MANDATORY SECTIONS:\nInclude standard README sections based on the Grounding Data.`;
    }

    const instructions: string[] = [
      "## MANDATORY SECTIONS TO INCLUDE (AND NO OTHERS):",
    ];

    if (sections.includes("Architecture")) {
      instructions.push(
        `- **Architecture**: Create an elegant \`mermaid\` state or flowchart diagram explaining the domain flow and structure.`,
      );
    }
    if (sections.includes("Installation")) {
      instructions.push(
        `- **Installation**: Provide EXACT setup scripts (e.g. \`npm install\`). If monorepo, emphasize using \`--filter\` or workspace commands.`,
      );
    }
    if (sections.includes("Usage")) {
      instructions.push(
        `- **Usage**: Provide at least 2 concrete examples using real endpoints/routes OR real exported functions/classes from the Code Surface. Prefer examples from "REAL USAGE EXAMPLES" when present.`,
      );
    }
    if (sections.includes("API")) {
      instructions.push(
        `- **API Reference**: Document ALL routes from Grounding Data with method, path, and description.`,
      );
    }
    if (sections.includes("Testing")) {
      instructions.push(
        `- **Testing**: Provide commands from Grounding Data on how to run the test suite and linters.`,
      );
    }
    if (sections.includes("Deployment")) {
      instructions.push(
        `- **Deployment**: Provide build commands or Docker deployment instructions from Grounding Data.`,
      );
    }
    if (sections.includes("Contributing")) {
      instructions.push(
        `- **Contributing**: Briefly outline typical contribution guidelines (PR process, code standards).`,
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
      "sections" | "tone" | "additionalContext" | "persona" | "readmeTemplate"
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
    const groundingContext = this.buildGroundingContext(
      summary,
      options.sections,
    );
    const evidenceIndex = this.buildEvidenceIndex(context);
    const sectionInstructions =
      usesTemplate ?
        `## SECTIONS\nUse **only** the STRUCTURE TEMPLATE for which headings exist and their order. Ignore any conflicting free-form section list.`
      : this.buildSectionPrompt(options.sections);
    const templateBlock =
      usesTemplate ? this.formatReadmeTemplateSpec(tpl!, summary) : "";
    const strictRules =
      usesTemplate ?
        `## STRICT RULES:
- **TEMPLATE STRUCTURE IS LAW**: Mirror TEMPLATE_JSON — heading hierarchy/order/titles (after placeholders), table shapes, fence languages, and section count must match.
- **GROUNDING**: All factual claims from GROUNDING DATA, CODE SURFACE, or ADDITIONAL CONTEXT only.
- **EXAMPLES**: Prefer real commands, routes, and identifiers from CODE SURFACE; do not invent HTTP paths or CLI flags.
- **GAPS**: If a template subsection has no grounded content, one short honest sentence (e.g. not applicable / not detected) — never fabricate.
- **TONE**: ${targetTone}.

README CONTENT (open exactly as the template does — usually a single \`#\` title line):
`
      : `## STRICT RULES:
- **GROUNDING FIRST**: Every claim must come from the Grounding Data or Additional Context above. Do NOT invent features, dependencies, or commands.
- **OMIT UNSELECTED SECTIONS**: If a section is not listed in MANDATORY SECTIONS, do NOT generate it.
- **MENTION DEPENDENCIES**: Reference key dependencies by name when discussing the tech stack.
- **MENTION ALL ROUTES/ENV VARS**: If API/Env sections are requested, list them all.
- **REAL EXAMPLES ONLY**: For Usage/Quick Start/API examples, you MUST use real endpoint paths (e.g. \`/api/...\`) and real function/class names from CODE SURFACE. If you can't ground an example, omit it rather than inventing it.
- **INCORPORATE CONTEXT**: Integrate the 'ADDITIONAL CONTEXT' into the Overview and Architecture sections to explain the "Why" and the business value.
- **NO PLACEHOLDERS**: Every generated section must be populated with real facts. No "Coming soon" or "TODO".
- **TONE**: ${targetTone}.

README CONTENT (START WITH #):
`;

    const prompt = `Generate a comprehensive, enterprise-grade README.md for ${summary.name}.

## PERSONA
${options.persona || "Senior Developer"}: ${personaGuidance}

## INTELLIGENCE (from code analysis)
${projectManifest}

## CODE ARTIFACTS INVENTORY
${technicalTruthMap}

## GROUNDING DATA (YOU MUST USE THESE EXACT FACTS${usesTemplate ? "" : " — DO NOT INVENT"})
${groundingContext}

## CODE SURFACE (YOU MUST QUOTE THESE VERBATIM WHEN WRITING EXAMPLES)
${evidenceIndex}

${templateBlock}${sectionInstructions}

## ADDITIONAL CONTEXT (CRITICAL BUSINESS LOGIC / WHY IT EXISTS)
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
    provider: "groq" | "gemini",
    apiKey?: string,
  ): any {
    if (provider === "gemini") {
      const key = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!key) throw new Error("Gemini API Key is missing.");
      return new ChatGoogleGenerativeAI({
        apiKey: key,
        model: "gemini-2.5-flash",
        maxRetries: 2,
        temperature: 0.1,
      });
    } else {
      const key = apiKey || process.env.GROQ_API_KEY;
      if (!key) throw new Error("Groq API Key is missing.");
      return new ChatGroq({
        apiKey: key,
        model: "openai/gpt-oss-120b",
        temperature: 0.1,
      });
    }
  }

  public async improveContent(
    text: string,
    provider: "groq" | "gemini" = "groq",
    apiKey?: string,
    instruction?: string,
  ): Promise<{ content: string; tokens: number }> {
    const model = this.createModelInstance(provider, apiKey);
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
    provider: "groq" | "gemini" = "groq",
    apiKey?: string,
  ): Promise<{ sections: string[]; tone: string; reason: string }> {
    const summary = analysis.summary || analysis;
    const model = this.createModelInstance(provider, apiKey);
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
    return await this.callLlm(model, evidencePrompt);
  }

  public async generateReadme(
    analysis: ProjectAnalysis,
    provider: "groq" | "gemini" = "groq",
    options: GenerateReadmeOptions = {},
  ): Promise<{ content: string; tokens: number }> {
    const model = this.createModelInstance(provider, options.apiKey);
    const { summary, context } = analysis;
    SemanticRefiner.refine(summary);
    const targetTone = options.tone || "professional";

    const manifestResult = await this.generateProjectManifest(
      model,
      context,
      summary,
    );
    const technicalTruthMapResult = await this.distillProjectEvidence(
      model,
      context.evidence,
      targetTone,
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

    const generationResult = await this.callLlm(model, generationPrompt);
    const finalContent = this.cleanLlmOutput(generationResult.content);
    totalTokens += generationResult.tokens;

    if (usesTemplate) {
      return {
        content: `${finalContent.trim()}\n`,
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
    provider: "groq" | "gemini" = "groq",
    options: GenerateReadmeOptions = {},
  ): AsyncGenerator<string> {
    const model = this.createModelInstance(provider, options.apiKey);
    const { summary, context } = analysis;
    const targetTone = options.tone || "professional";

    const { usesTemplate, prompt: streamPrompt } = this.buildReadmeUserPrompt(
      analysis,
      options,
      (await this.generateProjectManifest(model, context, summary)).content,
      (await this.distillProjectEvidence(model, context.evidence, targetTone))
        .content,
    );

    if (!usesTemplate) {
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
    const stream = await model
      .pipe(new StringOutputParser())
      .stream(streamPrompt);
    for await (let chunk of stream) {
      if (!usesTemplate) {
        chunk = chunk.replace(startRegex, "");
      }
      yield chunk;
    }
    if (!usesTemplate) {
      yield "\n\n" + this.distillEnvVars(summary);
    }
  }

  private getPersonaGuidance(persona: string): string {
    switch (persona.toLowerCase()) {
      case "senior developer":
        return "Emphasize architecture, performance, and maintainability. Use precise technical terms. Focus on data flow and state management.";
      case "startup founder":
        return "Focus on the value proposition, high-level features, and speed of getting started. Keep it polished, visionary, and user-centric.";
      case "educational/beginner":
        return "Explain concepts simply, provide step-by-step guidance, and explain *how* things work under the hood in a clear way.";
      case "open source contributor":
        return "Emphasize community guidelines, contribution flows, testing, and issue reporting. Keep it welcoming but rigorous.";
      default:
        return "Standard technical documentation persona.";
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
    provider: "groq" | "gemini" = "groq",
    options: {
      sections?: string[];
      tone?: string;
      shields?: string[];
      additionalContext?: string;
      apiKey?: string;
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

    const model = this.createModelInstance(provider, options.apiKey);
    const targetTone = options.tone || "professional";

    for (const dir of nestedDirs) {
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
      const dirPrompt = `Generate a dedicated README.md for a sub-project in a monorepo.
Sub-project Directory: ${dir}
Type: ${dirRole}
Root Project Context: ${summary.name}
Package manager (repo): ${pm}
Sub-project Scripts:
${scriptsHuman || "(no scripts parsed for this package — infer from context)"}

TASK:
Write a UNIQUE README for this specific component. Explain its individual role and purpose within the parent project.
Use the exact run commands listed above (${pm}, from repo root or \`cd ${dir}\`).
Include a brief list of its core dependencies if available.
NO PLACEHOLDERS. START WITH # ${dir.split("/").pop()}.
TONE: ${targetTone}

README CONTENT:
`;
      const generationResult = await this.callLlm(model, dirPrompt);
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
  ): Promise<{ content: string; tokens: number }> {
    try {
      const response = await model.invoke(prompt);
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
    return await this.callLlm(model, distillationPrompt);
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
