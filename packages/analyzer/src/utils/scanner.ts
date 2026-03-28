import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';

export class LocalScanner {
  /**
   * Scans a directory recursively and returns a list of file paths.
   * Respects .gitignore if present in the root.
   */
  public static scan(rootPath: string): { files: string[]; gitignoreContent: string } {
    const gitignorePath = path.join(rootPath, '.gitignore');
    const gitignoreContent = fs.existsSync(gitignorePath) 
      ? fs.readFileSync(gitignorePath, 'utf8') 
      : '';
    
    const ig = ignore().add(gitignoreContent);
    ig.add(['node_modules', '.git', '.turbo', 'dist', 'build', '.next']);

    const allFiles: string[] = [];
    
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');
        
        if (ig.ignores(relativePath)) continue;
        
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          allFiles.push(relativePath);
        }
      }
    };
    
    walk(rootPath);
    return { files: allFiles, gitignoreContent };
  }

  /**
   * Reads the content of a file from the local filesystem.
   */
  public static readFile(rootPath: string, relativePath: string): string {
    return fs.readFileSync(path.join(rootPath, relativePath), 'utf8');
  }
}
