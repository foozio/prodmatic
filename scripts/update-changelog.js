#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Utility script to update CHANGELOG.md with new entries
 * Usage: node scripts/update-changelog.js [version] [type] [description]
 * Types: added, changed, deprecated, removed, fixed, security
 */

const args = process.argv.slice(2);
const version = args[0];
const type = args[1];
const description = args[2];

if (!version || !type || !description) {
  console.log('Usage: node scripts/update-changelog.js [version] [type] [description]');
  console.log('Types: added, changed, deprecated, removed, fixed, security');
  console.log('Example: node scripts/update-changelog.js 1.0.1 fixed "Fixed login redirect issue"');
  process.exit(1);
}

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const currentDate = new Date().toISOString().split('T')[0];

try {
  let changelog = fs.readFileSync(changelogPath, 'utf8');
  
  // Check if version already exists
  const versionRegex = new RegExp(`## \\[${version}\\]`);
  const hasVersion = versionRegex.test(changelog);
  
  if (!hasVersion) {
    // Add new version section
    const unreleasedIndex = changelog.indexOf('## [Unreleased]');
    if (unreleasedIndex === -1) {
      throw new Error('Could not find [Unreleased] section in changelog');
    }
    
    const newVersionSection = `\n## [${version}] - ${currentDate}\n\n### ${type.charAt(0).toUpperCase() + type.slice(1)}\n- ${description}\n`;
    
    changelog = changelog.slice(0, unreleasedIndex) + 
                '## [Unreleased]\n' + 
                newVersionSection + 
                changelog.slice(unreleasedIndex + 15);
  } else {
    // Add to existing version
    const versionIndex = changelog.indexOf(`## [${version}]`);
    const nextVersionIndex = changelog.indexOf('\n## [', versionIndex + 1);
    const endIndex = nextVersionIndex === -1 ? changelog.length : nextVersionIndex;
    
    const versionSection = changelog.slice(versionIndex, endIndex);
    const typeRegex = new RegExp(`### ${type.charAt(0).toUpperCase() + type.slice(1)}`);
    
    if (typeRegex.test(versionSection)) {
      // Add to existing type section
      const typeIndex = versionSection.indexOf(`### ${type.charAt(0).toUpperCase() + type.slice(1)}`);
      const nextTypeIndex = versionSection.indexOf('\n### ', typeIndex + 1);
      const typeEndIndex = nextTypeIndex === -1 ? versionSection.length : nextTypeIndex;
      
      const newEntry = `- ${description}\n`;
      const beforeType = changelog.slice(0, versionIndex + typeIndex + (`### ${type.charAt(0).toUpperCase() + type.slice(1)}`).length + 1);
      const afterType = changelog.slice(versionIndex + typeEndIndex);
      
      changelog = beforeType + newEntry + afterType;
    } else {
      // Add new type section
      const newTypeSection = `\n### ${type.charAt(0).toUpperCase() + type.slice(1)}\n- ${description}\n`;
      const insertPoint = versionIndex + (`## [${version}] - ${currentDate}`).length + 1;
      
      changelog = changelog.slice(0, insertPoint) + 
                  newTypeSection + 
                  changelog.slice(insertPoint);
    }
  }
  
  fs.writeFileSync(changelogPath, changelog);
  console.log(`✅ Successfully updated CHANGELOG.md with ${type}: ${description}`);
  console.log(`📅 Version: ${version} (${currentDate})`);
  
} catch (error) {
  console.error('❌ Error updating changelog:', error.message);
  process.exit(1);
}