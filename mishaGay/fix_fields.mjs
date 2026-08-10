import fs from 'fs';
import path from 'path';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Replace t.dailyPrice -> t.dailyRentalPrice (for tool/toolInstance objects)
  content = content.replace(/\.dailyPrice/g, '.dailyRentalPrice');
  content = content.replace(/\.deposit/g, '.depositAmount');

  // Also replace some destructured properties if they exist
  content = content.replace(/\{ deposit, dailyPrice \}/g, '{ depositAmount, dailyRentalPrice }');

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
