# Release It! Gitea Plugin

English | [中文](README.md)

A [release-it](https://github.com/release-it/release-it) plugin for Gitea that supports automatic Gitea release creation and asset uploads.

## Features

- ✅ Automatically create and update Gitea releases
- ✅ Support template variable substitution (version, changelog, etc.)
- ✅ Support draft and prerelease versions
- ✅ **Support file and folder asset uploads**
- ✅ **Support automatic folder packaging to ZIP**
- ✅ **Support wildcard file matching**

## Quick Start

### 1. Install Plugin

```bash
npm install --save-dev release-it-gitea
# or
pnpm add -D release-it-gitea
# or
yarn add -D release-it-gitea
```

### 2. Set Environment Variables

```bash
export GITEA_TOKEN="your-gitea-api-token"
```

### 3. Basic Configuration

Add to `.release-it.json`:

```json
{
	"plugins": {
		"release-it-gitea": {
			"host": "https://gitea.example.com",
			"owner": "your-username",
			"repository": "your-repo"
		}
	}
}
```

### 4. Run Release

```bash
npx release-it
```

## Detailed Configuration

### Basic Configuration Options

| Option         | Type    | Default                     | Description                    |
| -------------- | ------- | --------------------------- | ------------------------------ |
| `host`         | string  | Current repository host     | Gitea server URL               |
| `owner`        | string  | Auto-detect from git remote | Repository owner               |
| `repository`   | string  | Auto-detect from git remote | Repository name                |
| `release`      | boolean | `true`                      | Whether to create release      |
| `releaseTitle` | string  | `"v${version}"`             | Release title template         |
| `releaseNotes` | string  | `"${changelog}"`            | Release notes template         |
| `prerelease`   | boolean | `false`                     | Whether it's a prerelease      |
| `draft`        | boolean | `false`                     | Whether it's a draft           |
| `tokenRef`     | string  | `"GITEA_TOKEN"`             | API token environment variable |
| `timeout`      | number  | `30000`                     | Request timeout (milliseconds) |
| `assets`       | array   | `[]`                        | Additional asset files         |

### Complete Configuration Example

```json
{
	"plugins": {
		"release-it-gitea": {
			"host": "https://gitea.example.com",
			"owner": "your-username",
			"repository": "your-repo",
			"release": true,
			"releaseTitle": "Release ${version}",
			"releaseNotes": "## What's New\n\n${changelog}",
			"prerelease": false,
			"draft": false,
			"tokenRef": "GITEA_TOKEN",
			"timeout": 30000,
			"assets": [
				"dist/app.js",
				"README.md",
				{
					"path": "dist/**/*",
					"name": "distribution-${version}.zip",
					"type": "zip",
					"label": "Distribution Files"
				}
			]
		}
	}
}
```

## Asset Upload Features

### Basic Usage

Supports multiple asset configuration formats:

```json
{
	"assets": [
		"dist/app.js", // Single file
		"dist/**/*.min.js", // Wildcard matching
		"*.md" // Multiple matching files
	]
}
```

### Advanced Configuration

Use object format for more detailed configuration:

```json
{
	"assets": [
		{
			"path": "dist/**/*",
			"name": "distribution-files.zip",
			"type": "zip",
			"label": "Distribution Files"
		},
		{
			"path": "docs/*.md",
			"type": "file",
			"label": "Documentation"
		},
		{
			"path": "src",
			"name": "source-code-${version}.zip",
			"type": "zip",
			"label": "Source Code"
		}
	]
}
```

### Asset Configuration Parameters

| Property | Type            | Required | Description                                              |
| -------- | --------------- | -------- | -------------------------------------------------------- |
| `path`   | string          | ✅       | File or folder path, supports wildcards                  |
| `name`   | string          | ❌       | Upload filename, uses original filename if not specified |
| `type`   | 'file' \| 'zip' | ❌       | File type, defaults to 'file'                            |
| `label`  | string          | ❌       | File label for identifying file purpose                  |

### File Type Description

- **`file`**: Directly upload matched files
- **`zip`**: Package matched files into ZIP before upload

## Usage Examples

### Example 1: Upload Build Artifacts

```json
{
	"assets": ["dist/bundle.js", "dist/bundle.css", "dist/assets/**/*"]
}
```

### Example 2: Package Source Code Release

```json
{
	"assets": [
		{
			"path": "src/**/*",
			"name": "source-v${version}.zip",
			"type": "zip",
			"label": "Source Code"
		}
	]
}
```

### Example 3: Multiple File Type Combination

```json
{
	"assets": [
		"README.md",
		"CHANGELOG.md",
		{
			"path": "dist",
			"name": "build-output.zip",
			"type": "zip"
		},
		{
			"path": "docs/**/*.pdf",
			"type": "file",
			"label": "Documentation"
		}
	]
}
```

### Example 4: Different Environment Configurations

```json
{
	"assets": [
		{
			"path": "dist/prod/**/*",
			"name": "production-build-${version}.zip",
			"type": "zip",
			"label": "Production Build"
		},
		{
			"path": "dist/dev/**/*",
			"name": "development-build-${version}.zip",
			"type": "zip",
			"label": "Development Build"
		}
	]
}
```

## Environment Variable Configuration

### Default Token Configuration

```bash
export GITEA_TOKEN=your_gitea_api_token
```

### Custom Token Configuration

```json
{
	"tokenRef": "MY_GITEA_TOKEN"
}
```

```bash
export MY_GITEA_TOKEN=your_gitea_api_token
```

## Template Variables

The following variables can be used in `releaseTitle`, `releaseNotes`, and asset `name`:

| Variable             | Description      | Example              |
| -------------------- | ---------------- | -------------------- |
| `${version}`         | Current version  | `1.2.3`              |
| `${latestVersion}`   | Previous version | `1.2.2`              |
| `${changelog}`       | Changelog        | `- Fixed some bug`   |
| `${name}`            | Project name     | `my-awesome-project` |
| `${repo.owner}`      | Repository owner | `username`           |
| `${repo.repository}` | Repository name  | `my-repo`            |
| `${branchName}`      | Branch name      | `main`               |

### Template Usage Example

```json
{
	"releaseTitle": "🚀 ${name} v${version}",
	"releaseNotes": "## 📋 What's New\n\n${changelog}\n\n## 📦 Download\n\nPlease download the appropriate file for your platform",
	"assets": [
		{
			"path": "dist/**/*",
			"name": "${name}-${version}-dist.zip",
			"type": "zip",
			"label": "${name} v${version} Distribution"
		}
	]
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Asset Upload Failed

**Symptoms:**

- Error occurs during asset upload
- File not found

**Solutions:**

- Check if file paths are correct
- Ensure files exist and are readable
- Check if Gitea API Token has asset upload permissions

#### 2. ZIP File Creation Failed

**Symptoms:**

- Error occurs during ZIP file creation
- Insufficient disk space error

**Solutions:**

- Ensure sufficient disk space is available
- Check temporary directory permissions
- Verify that files to be packaged exist

#### 3. Wildcard Matching No Files

**Symptoms:**

- Wildcard pattern matches no files
- Asset list is empty

**Solutions:**

- Verify wildcard pattern is correct
- Check current working directory
- Test with absolute or relative paths

#### 4. API Request Failed

**Symptoms:**

- 401 Unauthorized error
- 404 Repository not found error
- Network timeout

**Solutions:**

- Check if Gitea server address is correct
- Verify API Token is valid and not expired
- Confirm repository owner and name are correct
- Check network connection and firewall settings

### Debugging Tips

#### Enable Verbose Logging

```bash
npx release-it --verbose
```

#### Use Dry Run Mode

```bash
npx release-it --dry-run
```

#### Check Configuration

```bash
npx release-it --config --verbose
```

## Development Guide

### Development Environment Setup

```bash
# Clone repository
git clone https://github.com/lib-pack/release-it-gitea.git
cd release-it-gitea

# Install dependencies
pnpm install

# Build project
pnpm build

# Run tests
pnpm test

# Code linting
pnpm lint

# Format code
pnpm format
```

### Contributing Guide

1. Fork the project
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

Thanks to all developers who have contributed to this project!

---

If you find this project helpful, please give us a ⭐️!
