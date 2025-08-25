# Changelog Management Guide

This document outlines the best practices for maintaining the CHANGELOG.md file in the ProdMatic project.

## Overview

We follow the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html) for version management.

## Semantic Versioning

- **MAJOR** version (X.0.0): Incompatible API changes or breaking changes
- **MINOR** version (X.Y.0): New functionality added in a backward compatible manner
- **PATCH** version (X.Y.Z): Backward compatible bug fixes

## Changelog Categories

### Added
For new features and functionality.

**Examples:**
- Added user authentication system
- Added dark mode support
- Added export functionality

### Changed
For changes in existing functionality.

**Examples:**
- Changed database schema for better performance
- Updated UI component library to v2.0
- Improved search algorithm

### Deprecated
For soon-to-be removed features.

**Examples:**
- Deprecated legacy API endpoints
- Deprecated old authentication method

### Removed
For now removed features.

**Examples:**
- Removed support for IE11
- Removed deprecated API endpoints

### Fixed
For any bug fixes.

**Examples:**
- Fixed login redirect issue
- Fixed memory leak in data processing
- Fixed responsive layout on mobile devices

### Security
For vulnerability fixes.

**Examples:**
- Fixed XSS vulnerability in user input
- Updated dependencies to patch security issues
- Improved password hashing algorithm

## How to Update the Changelog

### Method 1: Using the Script (Recommended)

Use the provided script to automatically update the changelog:

```bash
npm run changelog:add [version] [type] "[description]"
```

**Examples:**
```bash
# Bug fix (patch version)
npm run changelog:add 1.0.1 fixed "Fixed authentication redirect issue"

# New feature (minor version)
npm run changelog:add 1.1.0 added "Added dashboard analytics feature"

# Breaking change (major version)
npm run changelog:add 2.0.0 changed "Redesigned API endpoints (breaking change)"

# Security fix
npm run changelog:add 1.0.2 security "Fixed XSS vulnerability in comments"
```

### Method 2: Manual Update

1. Open `CHANGELOG.md`
2. Add your entry under the appropriate version and category
3. Follow the existing format exactly
4. Use present tense ("Add" not "Added")
5. Be descriptive but concise

### Method 3: Version Bump Scripts

For version management, use these npm scripts:

```bash
# Patch version (bug fixes)
npm run changelog:patch

# Minor version (new features)
npm run changelog:minor

# Major version (breaking changes)
npm run changelog:major
```

These will update the version in `package.json` and remind you to update the changelog.

## Best Practices

### 1. Update with Every PR
- Always update the changelog when making changes that affect users
- Include the changelog update in the same PR as your changes

### 2. Write User-Focused Descriptions
**Good:**
- "Fixed login redirecting to wrong page after authentication"
- "Added ability to export data as CSV"

**Bad:**
- "Fixed bug in AuthService.redirectUser()"
- "Implemented CSVExporter class"

### 3. Group Related Changes
When making multiple related changes, group them under one entry:

```markdown
### Added
- User profile management with avatar upload, bio editing, and privacy settings
```

### 4. Reference Issues/PRs When Relevant
```markdown
### Fixed
- Fixed memory leak in real-time updates (#123)
- Resolved login timeout issue (#145)
```

### 5. Use Consistent Language
- Use imperative mood: "Add", "Fix", "Remove"
- Be consistent with terminology
- Keep descriptions concise but informative

## Automated Checks

### GitHub Actions
Our CI pipeline includes several changelog-related checks:

1. **Format Validation**: Ensures the changelog follows the expected format
2. **Update Requirement**: Requires changelog updates when source code changes
3. **PR Comments**: Automatically comments on PRs that need changelog updates

### Local Validation
Before pushing, you can validate your changelog locally:

```bash
# Check if changelog format is valid
grep -q "## \[Unreleased\]" CHANGELOG.md && echo "✅ Format OK" || echo "❌ Format Error"
```

## Release Process

### 1. Prepare Release
1. Ensure all changes are documented in changelog
2. Update version numbers using npm scripts
3. Move items from "Unreleased" to the new version section

### 2. Version Format
```markdown
## [1.2.0] - 2025-01-25

### Added
- New feature descriptions

### Fixed
- Bug fix descriptions
```

### 3. Release Notes
The changelog serves as the source for release notes. Ensure entries are:
- User-friendly
- Complete
- Well-categorized

## Common Mistakes to Avoid

### 1. Forgetting to Update
Always update the changelog with your changes. The CI will catch this, but it's better to remember.

### 2. Technical Jargon
Write for users, not developers:

**Bad:** "Refactored UserService to use dependency injection"
**Good:** "Improved user management performance and reliability"

### 3. Incomplete Descriptions
Provide enough context for users to understand the impact:

**Bad:** "Fixed bug"
**Good:** "Fixed issue where users couldn't save their profile changes"

### 4. Wrong Categories
- Don't use "Fixed" for new features
- Don't use "Added" for improvements to existing features

## Tools and Resources

### Scripts Available
- `npm run changelog:add` - Add new changelog entry
- `npm run changelog:patch` - Bump patch version
- `npm run changelog:minor` - Bump minor version  
- `npm run changelog:major` - Bump major version

### External Resources
- [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
- [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)

## Need Help?

If you're unsure about how to categorize a change or write a good description:

1. Look at existing entries for examples
2. Ask in the team chat
3. Check the resources linked above
4. When in doubt, be more descriptive rather than less

Remember: The changelog is for our users, not just for us. Write it with them in mind!