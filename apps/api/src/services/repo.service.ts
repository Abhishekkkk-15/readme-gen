import axios from "axios";
import {
  StructureAnalyzer,
  DependencyAnalyzer,
  RouteExtractor,
  EnvExtractor,
  PackageParser,
  AstFeatureDetector,
  DefinitionExtractor,
  ExampleAnalyzer,
  ProjectAnalysis,
  ProjectSummary,
  ProjectContext,
} from "@readme-gen/analyzer";
import { config } from "dotenv";
config();
export class RepoService {
  private GITHUB_API_URL = "https://api.github.com/repos";

  public async analyzeRepo(
    repoUrl: string,
    manualImportantFiles: string[] = [],
  ): Promise<ProjectAnalysis> {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      const repoData = await this.getRepoInfo(owner, repo);
      const defaultBranch = repoData.default_branch || "main";
      const allFilePaths = await this.getFileStructure(
        owner,
        repo,
        defaultBranch,
      );

      // 1. Fetch metadata files (including nested package.json/go.mod for monorepos)
      const rootMetadata = [
        "package.json",
        "go.mod",
        "requirements.txt",
        "pyproject.toml",
        ".env.example",
        ".env",
        ".gitignore",
        "turbo.json",
        "pnpm-workspace.yaml",
      ];
      const nestedMetadata = allFilePaths
        .filter(
          (f) =>
            (f.includes("package.json") || f.includes("go.mod")) &&
            (f.startsWith("apps/") || f.startsWith("packages/")),
        )
        .slice(0, 10);

      const metadataFiles = [...rootMetadata, ...nestedMetadata];
      const fileContents: Record<string, string> = {};

      for (const file of metadataFiles) {
        if (allFilePaths.includes(file)) {
          try {
            fileContents[file] = await this.getFileContent(owner, repo, file);
          } catch (err) {
            console.warn(`Failed to fetch metadata ${file}:`, err);
          }
        }
      }

      // 2. Structure Analysis
      const structure = await StructureAnalyzer.analyze(
        allFilePaths,
        fileContents[".gitignore"] || "",
      );

      // 3. Package Metadata
      const packageMetadata = await PackageParser.parse(fileContents);

      // 4. Trace Imports from Entry Points
      const tracedFiles = new Set<string>();
      for (const entryPath of structure.entryPoints) {
        if (allFilePaths.includes(entryPath)) {
          const content = await this.getFileContent(owner, repo, entryPath);
          this.traceImports(entryPath, content, allFilePaths).forEach((f) =>
            tracedFiles.add(f),
          );
        }
      }

      // Merge traced files with important files and manual overrides, limit to a set (up to 60 for better context)
      const importantFiles = Array.from(
        new Set([
          ...structure.entryPoints,
          ...tracedFiles,
          ...structure.importantFiles,
          ...manualImportantFiles,
        ]),
      )
        .filter((path) => allFilePaths.includes(path))
        .slice(0, 60);

      const importantContents: Record<string, string> = { ...fileContents };

      for (const filePath of importantFiles) {
        if (!importantContents[filePath]) {
          try {
            importantContents[filePath] = await this.getFileContent(
              owner,
              repo,
              filePath,
            );
          } catch (err) {
            console.warn(`Failed to fetch ${filePath}:`, err);
          }
        }
      }

      // 5. AST-based analysis
      const routes = RouteExtractor.extract(importantContents);
      const envVars = EnvExtractor.extract(importantContents);
      const astFeatures = AstFeatureDetector.detect(importantContents);
      const sourceFiles = importantFiles.filter((f) =>
        f.match(/\.(ts|js|tsx|jsx)$/),
      );
      console.log(
        `[RepoService] Analyzing ${sourceFiles.length} source files for definitions (including ${manualImportantFiles.length} manual files).`,
      );

      const definitionsMap = DefinitionExtractor.extract(importantContents);
      const totalSnippetCount = Object.values(definitionsMap).reduce(
        (acc, val) => acc + val.length,
        0,
      );
      console.log(
        `[RepoService] Extracted ${totalSnippetCount} snippets from ${Object.keys(definitionsMap).length} files.`,
      );

      // 6. Evidence collection
      const evidence = {
        files: importantFiles
          .map((path) => ({
            path,
            snippets: definitionsMap[path] || [],
          }))
          .filter((f) => f.snippets.length > 0),
      };

      // 6.5. Real usage examples from tests (when present)
      const examples = ExampleAnalyzer.analyze(importantContents);

      // 7. Assemble Final Analysis (Split into Summary and Context)
      const summary: ProjectSummary = {
        name: String(packageMetadata?.name || repo),
        description: String(
          packageMetadata?.description || repoData?.description || "",
        ),
        language: this.detectLanguage(allFilePaths),
        features: astFeatures.map((f) => f.name),
        astFeatures,
        framework:
          packageMetadata?.frameworks?.[0] ?
            {
              name: packageMetadata.frameworks[0],
              confidence: 0.9,
              evidence: packageMetadata.frameworks,
            }
          : undefined,
        scripts: packageMetadata?.scripts || {},
        packageManager: packageMetadata?.packageManager,
        dependencies: packageMetadata?.dependencies?.production || [],
        devDependencies: packageMetadata?.dependencies?.development || [],
        entryPoints: structure.entryPoints,
        routes: routes.map((r) => ({
          method: r.method,
          path: r.path,
          file: r.file,
          snippet: r.snippet,
        })),
        envVars,
        examples,
        hasDocker: structure.hasDocker,
        isMonorepo: structure.isMonorepo,
        tree: structure.tree,
        keyDirectories: structure.keyDirectories,
      };

      const context: ProjectContext = {
        evidence,
      };

      return { summary, context };
    } catch (error: any) {
      console.error("Error analyzing repo:", error);
      throw new Error(`Failed to analyze repository: ${error.message}`);
    }
  }

  /**
   * Simple trace of local file imports to find related logic
   */
  private traceImports(
    filePath: string,
    content: string,
    allFiles: string[],
  ): string[] {
    const dir = filePath.split("/").slice(0, -1).join("/");
    const importRegex = /from ['"](\.\.?\/[^'"]+)['"]/g;
    const matches = content.matchAll(importRegex);
    const results: string[] = [];

    for (const match of matches) {
      const relPath = match[1];
      // Try with .ts, .js, .tsx, .jsx extensions
      const possiblePaths = [
        `${dir}/${relPath}.ts`,
        `${dir}/${relPath}.js`,
        `${dir}/${relPath}/index.ts`,
        `${dir}/${relPath}/index.js`,
        `${relPath.replace(/^\./, dir)}.ts`.replace(/^\/\//, "/"), // handle relative paths
      ];

      const found = possiblePaths.find((p) =>
        allFiles.includes(p.replace(/^\.\//, "")),
      );
      if (found) results.push(found.replace(/^\.\//, ""));
    }

    return results;
  }

  private detectLanguage(files: string[]): string {
    const counts: Record<string, number> = {
      TypeScript: files.filter((f) => f.endsWith(".ts")).length,
      JavaScript: files.filter((f) => f.endsWith(".js")).length,
      Python: files.filter((f) => f.endsWith(".py")).length,
      Go: files.filter((f) => f.endsWith(".go")).length,
    };
    return Object.entries(counts).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  }

  private parseRepoUrl(url: string): { owner: string; repo: string } {
    const parts = url.replace("https://github.com/", "").split("/");
    if (parts.length < 2) {
      throw new Error("Invalid GitHub URL");
    }
    return { owner: parts[0], repo: parts[1] };
  }

  private async getRepoInfo(owner: string, repo: string) {
    const response = await axios.get(
      `${this.GITHUB_API_URL}/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      },
    );
    return response.data;
  }

  private async getFileStructure(
    owner: string,
    repo: string,
    defaultBranch: string,
  ): Promise<string[]> {
    const response = await axios.get(
      `${this.GITHUB_API_URL}/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      },
    );
    //blob = file
    // tree = directory
    return response.data.tree
      .filter((item: any) => item.type === "blob")
      .map((item: any) => item.path);
  }

  private async getFileContent(
    owner: string,
    repo: string,
    path: string,
  ): Promise<string> {
    const response = await axios.get(
      `${this.GITHUB_API_URL}/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Accept: "application/vnd.github.v3.raw",
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      },
    );
    return typeof response.data === "object" ?
        JSON.stringify(response.data)
      : String(response.data);
  }
}

export const repoService = new RepoService();
