# Release It! Gitea Plugin

[English](README.en.md) | 中文

一个用于 [release-it](https://github.com/release-it/release-it) 的 Gitea 插件，支持自动创建 Gitea 发布并上传附件。

## 功能特性

- ✅ 自动创建和更新 Gitea 发布
- ✅ 支持模板变量替换（版本号、变更日志等）
- ✅ 支持草稿和预发布版本
- ✅ **支持文件和文件夹附件上传**
- ✅ **支持自动打包文件夹为 ZIP**
- ✅ **支持通配符文件匹配**

## 快速开始

### 1. 安装插件

```bash
npm install --save-dev release-it-gitea
# 或
pnpm add -D release-it-gitea
# 或
yarn add -D release-it-gitea
```

### 2. 设置环境变量

```bash
export GITEA_TOKEN="your-gitea-api-token"
```

### 3. 基础配置

在 `.release-it.json` 中添加：

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

### 4. 运行发布

```bash
npx release-it
```

## 详细配置

### 基本配置选项

| 选项           | 类型    | 默认值                 | 描述                 |
| -------------- | ------- | ---------------------- | -------------------- |
| `host`         | string  | 当前仓库的 host        | Gitea 服务器 URL     |
| `owner`        | string  | 从 git remote 自动检测 | 仓库所有者           |
| `repository`   | string  | 从 git remote 自动检测 | 仓库名称             |
| `release`      | boolean | `true`                 | 是否创建发布         |
| `releaseTitle` | string  | `"v${version}"`        | 发布标题模板         |
| `releaseNotes` | string  | `"${changelog}"`       | 发布说明模板         |
| `prerelease`   | boolean | `false`                | 是否为预发布         |
| `draft`        | boolean | `false`                | 是否为草稿           |
| `tokenRef`     | string  | `"GITEA_TOKEN"`        | API token 环境变量名 |
| `timeout`      | number  | `30000`                | 请求超时时间（毫秒） |
| `assets`       | array   | `[]`                   | 附加的资源文件       |

### 完整配置示例

```json
{
	"plugins": {
		"release-it-gitea": {
			"host": "https://gitea.example.com",
			"owner": "your-username",
			"repository": "your-repo",
			"release": true,
			"releaseTitle": "Release ${version}",
			"releaseNotes": "## 更新内容\n\n${changelog}",
			"prerelease": false,
			"draft": false,
			"tokenRef": "GITEA_TOKEN",
			"timeout": 30000,
			"assets": [
				"dist/app.js",
				"README.md",
				{
					"path": "dist/**/*",
					"name": "distribution-file.zip",
					"type": "zip",
					"label": "Distribution Files"
				}
			]
		}
	}
}
```

## 附件上传功能

### 基本用法

支持多种格式的附件配置：

```json
{
	"assets": [
		"dist/app.js", // 单个文件
		"dist/**/*.min.js", // 通配符匹配
		"*.md" // 多个匹配文件
	]
}
```

### 高级配置

使用对象格式进行更详细的配置：

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
			"name": "source-code-file.zip",
			"type": "zip",
			"label": "Source Code"
		}
	]
}
```

### 附件配置参数

| 属性    | 类型            | 必需 | 描述                                 |
| ------- | --------------- | ---- | ------------------------------------ |
| `path`  | string          | ✅   | 文件或文件夹路径，支持通配符         |
| `name`  | string          | ❌   | 上传后的文件名，不指定则使用原文件名 |
| `type`  | 'file' \| 'zip' | ❌   | 文件类型，默认为 'file'              |
| `label` | string          | ❌   | 文件标签，用于标识文件用途           |

### 文件类型说明

- **`file`**: 直接上传匹配到的文件
- **`zip`**: 将匹配到的文件打包成 ZIP 文件后上传

## 使用场景示例

### 场景 1：上传构建产物

```json
{
	"assets": ["dist/bundle.js", "dist/bundle.css", "dist/assets/**/*"]
}
```

### 场景 2：打包源代码发布

```json
{
	"assets": [
		{
			"path": "src/**/*",
			"name": "source-vfile.zip",
			"type": "zip",
			"label": "Source Code"
		}
	]
}
```

### 场景 3：多种文件类型组合

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

### 场景 4：不同环境的配置

```json
{
	"assets": [
		{
			"path": "dist/prod/**/*",
			"name": "production-build-file.zip",
			"type": "zip",
			"label": "Production Build"
		},
		{
			"path": "dist/dev/**/*",
			"name": "development-build-file.zip",
			"type": "zip",
			"label": "Development Build"
		}
	]
}
```

## 环境变量配置

### 默认 Token 配置

```bash
export GITEA_TOKEN=your_gitea_api_token
```

### 自定义 Token 配置

```json
{
	"tokenRef": "MY_GITEA_TOKEN"
}
```

```bash
export MY_GITEA_TOKEN=your_gitea_api_token
```

## 模板变量

在 `releaseTitle` 和 `releaseNotes` 中可以使用以下变量：

| 变量                 | 描述         | 示例                 |
| -------------------- | ------------ | -------------------- |
| `${version}`         | 当前版本号   | `1.2.3`              |
| `${latestVersion}`   | 上一个版本号 | `1.2.2`              |
| `${changelog}`       | 变更日志     | `- 修复了某个bug`    |
| `${name}`            | 项目名称     | `my-awesome-project` |
| `${repo.owner}`      | 仓库所有者   | `username`           |
| `${repo.repository}` | 仓库名称     | `my-repo`            |
| `${branchName}`      | 分支名称     | `main`               |

### 模板使用示例

```json
{
	"releaseTitle": "🚀 ${name} v${version}",
	"releaseNotes": "## 📋 更新内容\n\n${changelog}\n\n## 📦 下载\n\n请下载对应平台的文件",
	"assets": [
		{
			"path": "dist/**/*",
			"name": "distribution-files.zip",
			"type": "zip",
			"label": "Distribution Files"
		}
	]
}
```

> **注意**: 附件配置中的 `name` 和 `label` 字段不支持模板变量替换，需要使用静态字符串。

## 故障排除

### 常见问题及解决方案

#### 1. 附件上传失败

**问题症状：**

- 附件上传时出现错误
- 文件找不到

**解决方案：**

- 检查文件路径是否正确
- 确保文件存在且可读
- 检查 Gitea API Token 权限是否包含附件上传权限

#### 2. ZIP 文件创建失败

**问题症状：**

- ZIP 文件创建时出错
- 磁盘空间不足错误

**解决方案：**

- 确保有足够的磁盘空间
- 检查临时目录权限
- 验证要打包的文件是否存在

#### 3. 通配符匹配无文件

**问题症状：**

- 通配符模式没有匹配到任何文件
- 附件列表为空

**解决方案：**

- 验证通配符模式是否正确
- 检查当前工作目录
- 使用绝对路径或相对路径进行测试

#### 4. API 请求失败

**问题症状：**

- 401 未授权错误
- 404 仓库不存在错误
- 网络超时

**解决方案：**

- 检查 Gitea 服务器地址是否正确
- 验证 API Token 是否有效且未过期
- 确认仓库所有者和名称正确
- 检查网络连接和防火墙设置

### 调试技巧

#### 启用详细日志

```bash
npx release-it --verbose
```

#### 使用干运行模式

```bash
npx release-it --dry-run
```

#### 检查配置

```bash
npx release-it --config --verbose
```

## 开发指南

### 开发环境搭建

```bash
# 克隆仓库
git clone https://github.com/lib-pack/release-it-gitea.git
cd release-it-gitea

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 格式化代码
pnpm format
```

### 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE.md](LICENSE.md) 文件。

## 致谢

感谢所有为这个项目做出贡献的开发者！

---

如果您觉得这个项目对您有帮助，请给我们一个 ⭐️！
