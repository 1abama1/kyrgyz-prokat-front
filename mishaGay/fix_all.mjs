import fs from 'fs';
import path from 'path';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // common pattern 1: useState<number | "">("")
  content = content.replace(/useState<number \| "">/g, 'useState<string>');
  
  // common pattern 2: useState<number | null>(null)
  content = content.replace(/useState<number \| null>/g, 'useState<string | null>');

  // common pattern 3: (id: number) =>
  content = content.replace(/\(id: number\)/g, '(id: string)');

  // common pattern 4: Number(e.target.value) for ID fields might be risky to just regex replace, but let's check
  // For CreateExcelContractInline, CreateRentalInline, etc. let's just do targeted replacements

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${filePath}`);
  }
}

function traverse(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

traverse('src');
console.log('Done fix_all');
