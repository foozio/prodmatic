const fs = require('fs');
const path = require('path');

// Find all .tsx files with props interfaces that have params objects
const findFiles = () => {
  const files = [];
  const srcDir = path.join(__dirname, 'src');
  
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('interface ') && content.includes('params: {')) {
          files.push(fullPath);
        }
      }
    }
  };
  
  walk(srcDir);
  return files;
};

// Fix the props interface in a file
const fixFile = (filePath) => {
  console.log(`Fixing ${filePath}`);
  
  // Create backup
  const backupPath = path.join(__dirname, 'backups', path.relative(__dirname, filePath));
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix the interface definition
  content = content.replace(
    /(interface \w+Props\s*{\s*params:\s*){([^}]+)}([^}]*})/g,
    (match, prefix, paramsContent, suffix) => {
      return `${prefix}Promise<{${paramsContent}}>${suffix}`;
    }
  );
  
  // Also fix searchParams if present
  content = content.replace(
    /(interface \w+Props\s*{[^}]*searchParams:\s*){([^}]+)}([^}]*})/g,
    (match, prefix, searchParamsContent, suffix) => {
      return `${prefix}Promise<{${searchParamsContent}}>${suffix}`;
    }
  );
  
  // Fix the component function to await params
  content = content.replace(
    /(export default async function \w+\s*\(\s*{\s*params[^}]*}\s*:\s*\w+Props\s*\))\s*{/,
    (match, funcSignature) => {
      return `${funcSignature} {
  const resolvedParams = await params;`;
    }
  );
  
  // Update references to params to use resolvedParams
  content = content.replace(/\bparams\b/g, 'resolvedParams');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${filePath}`);
};

// Main execution
const files = findFiles();
console.log(`Found ${files.length} files to fix`);

for (const file of files) {
  try {
    fixFile(file);
  } catch (error) {
    console.error(`Error fixing ${file}:`, error);
  }
}

console.log('Done!');