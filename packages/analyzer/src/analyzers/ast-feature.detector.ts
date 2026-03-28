import { Project, SyntaxKind, CallExpression, PropertyAccessExpression } from 'ts-morph';

export interface AstFeature {
  name: string;
  evidence: {
    snippet: string;
    file: string;
  }[];
}

export class AstFeatureDetector {
  public static detect(files: Record<string, string>): AstFeature[] {
    const project = new Project({ useInMemoryFileSystem: true });
    const features: Map<string, AstFeature> = new Map();

    const addEvidence = (featureName: string, snippet: string, file: string) => {
      if (!features.has(featureName)) {
        features.set(featureName, { name: featureName, evidence: [] });
      }
      const feat = features.get(featureName)!;
      if (feat.evidence.length < 5) { // Limit evidence to 5 snippets per feature
        feat.evidence.push({ snippet, file });
      }
    };

    for (const [filePath, content] of Object.entries(files)) {
      if (!filePath.match(/\.(ts|js|tsx|jsx)$/)) continue;

      const sourceFile = project.createSourceFile(filePath, content);
      
      // 1. Scan for Call Expressions (Mainly for app.get, mongoose.connect, etc.)
      const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

      for (const call of callExpressions) {
        const expression = call.getExpression();
        const text = call.getText();
        
        // Pattern: app.get, router.post, etc.
        if (expression.getKind() === SyntaxKind.PropertyAccessExpression) {
          const pae = expression as PropertyAccessExpression;
          const name = pae.getName().toLowerCase();
          const base = pae.getExpression().getText().toLowerCase();

          // API Routes
          if (['get', 'post', 'put', 'delete', 'patch', 'use'].includes(name)) {
            if (['app', 'router', 'server', 'express'].includes(base)) {
              addEvidence('API Endpoints', text.substring(0, 150), filePath);
            }
          }

          // Database Integration (Mongoose, pg, MySQL)
          if (name === 'connect' && (base === 'mongoose' || base === 'db')) {
            addEvidence('Database Integration', text.substring(0, 150), filePath);
          }
          if (name === 'model' && base === 'mongoose') {
            addEvidence('Database Integration', text.substring(0, 150), filePath);
          }
          if (name === 'createconnection' && (base === 'mysql' || base === 'db')) {
            addEvidence('Database Integration', text.substring(0, 150), filePath);
          }

          // Authentication (JWT, bcrypt, passport)
          if (['sign', 'verify'].includes(name) && base === 'jwt') {
            addEvidence('Authentication', text.substring(0, 150), filePath);
          }
          if (['hash', 'compare'].includes(name) && base === 'bcrypt') {
            addEvidence('Authentication', text.substring(0, 150), filePath);
          }
          if (['use', 'authenticate'].includes(name) && base === 'passport') {
            addEvidence('Authentication', text.substring(0, 150), filePath);
          }

          // Environment Configuration
          if (name === 'config' && base === 'dotenv') {
            addEvidence('Environment Configuration', text.substring(0, 150), filePath);
          }
          if (name === 'get' && base === 'config') {
            addEvidence('Environment Configuration', text.substring(0, 150), filePath);
          }

          // CLI Tool (Commander)
          if (['command', 'option', 'parse', 'version'].includes(name) && ['program', 'cmd'].includes(base)) {
            addEvidence('CLI Tool', text.substring(0, 150), filePath);
          }
        }

        // 2. Scan for New Expressions (Prisma, pg Pool)
        const newExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression);
        for (const newExpr of newExpressions) {
          const newText = newExpr.getText().toLowerCase();
          if (newText.includes('prismaclient')) {
            addEvidence('Database Integration', newExpr.getText().substring(0, 150), filePath);
          }
          if (newText.includes('pool') || newText.includes('client')) {
            addEvidence('Database Integration', newExpr.getText().substring(0, 150), filePath);
          }
        }

        // 3. Scan for Property Access (process.env)
        const propAccess = sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression);
        for (const pae of propAccess) {
          if (pae.getText().startsWith('process.env.')) {
            addEvidence('Environment Configuration', pae.getText(), filePath);
          }
        }

        // 4. Scan for Decorators (NestJS)
        const decorators = sourceFile.getDescendantsOfKind(SyntaxKind.Decorator);
        for (const dec of decorators) {
          const decName = dec.getName().toLowerCase();
          if (['get', 'post', 'put', 'delete', 'patch', 'controller'].includes(decName)) {
            addEvidence('API Endpoints', dec.getText(), filePath);
          }
          if (['injectable'].includes(decName)) {
            // Marker for service oriented architecture
          }
        }
      }

      // 5. Direct variable usage for CLI
      if (content.includes('process.argv')) {
        addEvidence('CLI Tool', 'process.argv', filePath);
      }
    }

    return Array.from(features.values());
  }
}
