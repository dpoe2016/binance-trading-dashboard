# Versioning System

This project uses **Semantic Versioning** and automatically increments version numbers based on commit messages.

## Version Format

Versions follow the format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR**: New features (e.g., 0.1.0 → 0.2.0)
- **PATCH**: Bug fixes (e.g., 0.1.0 → 0.1.1)

## Automatic Versioning

The version is **automatically incremented** on every commit based on the commit message prefix:

### Commit Message Prefixes

| Prefix | Version Type | Example |
|--------|-------------|---------|
| `feat:` | MINOR | `feat: add new trading strategy` |
| `fix:` | PATCH | `fix: resolve API connection issue` |
| `perf:` | PATCH | `perf: improve chart rendering` |
| `refactor:` | PATCH | `refactor: simplify data handling` |
| `feat!:` or `BREAKING CHANGE:` | MAJOR | `feat!: redesign API structure` |
| `docs:`, `chore:`, `style:`, `test:` | No increment | `docs: update README` |

### How It Works

1. **Pre-commit hook** (`.husky/pre-commit`) runs before each commit
2. It reads your commit message and determines the version type
3. The `increment-version.js` script updates:
   - `package.json` version
   - `CHANGELOG.md` with new version entry
   - `dashboard.component.ts` version display
4. Changes are automatically staged and included in your commit

## Manual Versioning

You can also manually increment the version:

```bash
# Increment patch version (0.1.0 → 0.1.1)
npm run version:patch

# Increment minor version (0.1.0 → 0.2.0)
npm run version:minor

# Increment major version (0.1.0 → 1.0.0)
npm run version:major
```

## Version Display

The current version is displayed in the dashboard header:
- **Location**: Top-left corner next to the dashboard title
- **Format**: `v0.1.0` (gray badge)

## Changelog

All version changes are tracked in `CHANGELOG.md` following the [Keep a Changelog](https://keepachangelog.com/) format.

### Changelog Sections

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

## Example Workflow

```bash
# Make your changes
git add .

# Commit with conventional prefix
git commit -m "feat: add strategy editing functionality"
# → Version automatically increments from 0.1.0 to 0.2.0

# Update CHANGELOG.md manually with details
# Edit CHANGELOG.md to add your changes under [Unreleased]

# Push changes
git push

# Optionally create a git tag
git tag v0.2.0
git push --tags
```

## Best Practices

1. **Always use conventional commit prefixes** for automatic versioning
2. **Update CHANGELOG.md** with detailed descriptions after versioning
3. **Create git tags** for important releases
4. **Test before committing** to avoid unnecessary version increments
5. **Use `docs:` or `chore:` prefixes** for commits that don't need versioning

## Disabling Auto-versioning

To temporarily disable auto-versioning:

```bash
# Set HUSKY environment variable to 0
HUSKY=0 git commit -m "your message"
```

## Files Modified by Versioning

- `package.json` - Version number
- `CHANGELOG.md` - Version history
- `src/app/components/dashboard/dashboard.component.ts` - UI version display
