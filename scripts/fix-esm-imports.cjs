#!/usr/bin/env node
/**
 * Fix ESM imports in generated API files
 * Adds .js extensions to relative imports for proper ES module resolution
 */

const fs = require('fs');
const path = require('path');

const generatedDir = path.join(__dirname, '../dist/api/generated');

// Files to fix
const files = [
  'api.js',
  'base.js',
  'common.js',
  'configuration.js',
  'index.js',
  'sync-api-extension.js'
];

console.log('Fixing ESM imports in generated API files...');

files.forEach(file => {
  const filePath = path.join(generatedDir, file);

  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  Skipping ${file} (not found)`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Fix relative imports: from './module' -> from './module.js'
  // Skip if already has .js extension
  const beforeCount = (content.match(/from ['"](\.[^'"]+)['"]/g) || []).length;

  content = content.replace(/from ['"](\.[^'"]+?)['"]/g, (match, modulePath) => {
    // If already ends with .js, .cjs, .mjs, or .json, leave it
    if (modulePath.match(/\.(js|cjs|mjs|json)$/)) {
      return match;
    }
    // Add .js extension
    return `from '${modulePath}.js'`;
  });

  const afterCount = (content.match(/from ['"](\.[^'"]+)['"]/g) || []).length;
  const fixedCount = afterCount - beforeCount;

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✓ Fixed ${file}`);
});

console.log('✓ ESM imports fixed successfully');
