import fs from 'fs';
import path from 'path';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // useState<number | ""> -> useState<string | "">
  content = content.replace(/useState<number \| "">/g, 'useState<string | "">');
  content = content.replace(/useState<number \| null>/g, 'useState<string | null>');

  // Number(categoryId) -> categoryId
  content = content.replace(/Number\(categoryId\)/g, 'categoryId');
  content = content.replace(/Number\(templateId\)/g, 'templateId');
  content = content.replace(/Number\(toolId\)/g, 'toolId');

  // onChange={(val) => setCategoryId(val ? Number(val) : "")} -> onChange={(val) => setCategoryId(val ? String(val) : "")}
  content = content.replace(/setCategoryId\(val \? Number\(val\) : ""\)/g, 'setCategoryId(val ? String(val) : "")');
  content = content.replace(/setTemplateId\(val \? Number\(val\) : ""\)/g, 'setTemplateId(val ? String(val) : "")');
  content = content.replace(/setToolId\(val \? Number\(val\) : null\)/g, 'setToolId(val ? String(val) : null)');

  // src/components/ToolCard.tsx:14:17 
  // <ToolCard key={tool.id} tool={tool} onClick={() => navigate(`/tools/${tool.id}`)} />
  // No, that's fine. Wait, `ToolCard.tsx` line 14: Argument of type 'string' is not assignable to parameter of type 'number'.
  // Let's see ToolCard.tsx
  // It probably has `tool: Tool` and does something.

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
console.log('Done');
