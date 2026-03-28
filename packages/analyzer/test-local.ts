import { LocalScanner } from './src/utils/scanner';
import { StructureAnalyzer } from './src/analyzers/structure.analyzer';

async function test() {
  const root = "../../"; // Workspace root
  console.log("Scanning root:", root);
  const { files, gitignoreContent } = LocalScanner.scan(root);
  console.log("Found files count:", files.length);
  
  const structure = await StructureAnalyzer.analyze(files, gitignoreContent);
  console.log("Entry Points:", structure.entryPoints);
  console.log("Key Directories:", structure.keyDirectories);
  console.log("Tree Preview (top 5):", structure.tree.slice(0, 5));
}

test().catch(console.error);
