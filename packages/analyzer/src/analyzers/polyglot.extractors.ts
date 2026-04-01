/** Same shape as RouteExtractor Route */
export interface PolyglotRoute {
  method: string;
  path: string;
  file: string;
  snippet?: string;
}

/** Routes & API surface for Python (FastAPI, Flask, Starlette-style) and Go (net/http, gin, echo, chi, mux, fiber). */
export class PolyglotExtractors {
  public static extractRoutes(files: Record<string, string>): PolyglotRoute[] {
    const routes: PolyglotRoute[] = [];
    for (const [filePath, content] of Object.entries(files)) {
      if (filePath.endsWith(".py")) {
        routes.push(...this.pythonRoutes(filePath, content));
      } else if (filePath.endsWith(".go")) {
        routes.push(...this.goRoutes(filePath, content));
      }
    }
    return routes;
  }

  public static extractDefinitions(
    files: Record<string, string>,
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [filePath, content] of Object.entries(files)) {
      if (filePath.endsWith(".py")) {
        const defs = this.pythonDefinitions(content);
        if (defs.length) result[filePath] = defs;
      } else if (filePath.endsWith(".go")) {
        const defs = this.goDefinitions(content);
        if (defs.length) result[filePath] = defs;
      }
    }
    return result;
  }

  private static pythonRoutes(file: string, content: string): PolyglotRoute[] {
    const out: PolyglotRoute[] = [];
    const lines = content.split("\n");

    // FastAPI / Starlette: @app.get("/path") @router.post(  APIRouter
    const decRe =
      /@(?:app|router|api|route)\.(get|post|put|delete|patch|options|head)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
    let m: RegExpExecArray | null;
    while ((m = decRe.exec(content)) !== null) {
      out.push({
        method: m[1]!.toUpperCase(),
        path: m[2]!,
        file,
        snippet: this.snip(lines, m.index),
      });
    }

    // Flask: @app.route("/x", methods=['GET','POST'])
    const flaskRe = /@\w+\.route\s*\(\s*["'`]([^"'`]+)["'`]/gi;
    while ((m = flaskRe.exec(content)) !== null) {
      const methods = this.flaskMethodsNear(content, m.index);
      for (const method of methods) {
        out.push({
          method,
          path: m[1]!,
          file,
          snippet: this.snip(lines, m.index),
        });
      }
    }

    // Django path() re_path()
    const djangoPath =
      /(?:path|re_path)\s*\(\s*["']([^"']+)["']\s*,/g;
    while ((m = djangoPath.exec(content)) !== null) {
      out.push({
        method: "GET",
        path: m[1]!,
        file,
        snippet: this.snip(lines, m.index),
      });
    }

    return out.slice(0, 200);
  }

  private static flaskMethodsNear(content: string, idx: number): string[] {
    const slice = content.slice(idx, idx + 400);
    const mm = slice.match(/methods\s*=\s*\[([^\]]+)\]/i);
    if (!mm) return ["GET"];
    const raw = mm[1]!;
    const methods: string[] = [];
    const part = raw.matchAll(/['"](GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)['"]/gi);
    for (const x of part) methods.push(x[1]!.toUpperCase());
    return methods.length ? methods : ["GET"];
  }

  private static goRoutes(file: string, content: string): PolyglotRoute[] {
    const out: PolyglotRoute[] = [];
    const lines = content.split("\n");

    // gin/echo/fiber/chi style: .Get("/path" .POST("/path"
    const methodPath =
      /\.(Get|Post|Put|Delete|Patch|Options|Head|Connect|Trace)\s*\(\s*["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = methodPath.exec(content)) !== null) {
      out.push({
        method: m[1]!.toUpperCase(),
        path: m[2]!,
        file,
        snippet: this.snip(lines, m.index),
      });
    }

    // stdlib
    const handleFunc = /HandleFunc\s*\(\s*["']([^"']+)["']/gi;
    while ((m = handleFunc.exec(content)) !== null) {
      out.push({
        method: "GET",
        path: m[1]!,
        file,
        snippet: this.snip(lines, m.index),
      });
    }

    return out.slice(0, 200);
  }

  private static pythonDefinitions(content: string): string[] {
    const defs: string[] = [];
    const lines = content.split("\n");
    for (const line of lines) {
      const t = line.trim();
      if (/^class\s+[A-Za-z_][\w]*/.test(t)) {
        defs.push(`Class: ${t.slice(0, 200)}`);
        continue;
      }
      if (/^(async\s+)?def\s+[A-Za-z_][\w]*\s*\(/.test(t)) {
        defs.push(`Function: ${t.slice(0, 200)}`);
      }
    }
    return defs.slice(0, 80);
  }

  private static goDefinitions(content: string): string[] {
    const defs: string[] = [];
    const funcRe = /^func\s+.+$/gm;
    let m: RegExpExecArray | null;
    while ((m = funcRe.exec(content)) !== null) {
      const line = m[0]!.trim();
      if (line.length > 8) defs.push(`Func: ${line.slice(0, 220)}`);
    }
    const typeRe = /^type\s+\w+\s+(struct|interface)\b.*/gm;
    while ((m = typeRe.exec(content)) !== null) {
      defs.push(`Type: ${m[0]!.trim().slice(0, 200)}`);
    }
    return defs.slice(0, 80);
  }

  private static snip(lines: string[], charIndex: number): string | undefined {
    let pos = 0;
    for (let i = 0; i < lines.length; i++) {
      const next = pos + lines[i]!.length + 1;
      if (charIndex < next) {
        return lines[i]!.trim().slice(0, 200);
      }
      pos = next;
    }
    return undefined;
  }
}
