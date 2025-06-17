# Release It! Gitea Plugin

一个用于 [release-it](https://github.com/release-it/release-it) 的 Gitea 插件，支持自动创建 Gitea 发布并上传附件。

## 功能特性

- ✅ 自动创建和更新 Gitea 发布
- ✅ 支持模板变量替换（版本号、变更日志等）
- ✅ 支持草稿和预发布版本
- ✅ **新功能：支持文件和文件夹附件上传**
- ✅ **新功能：支持自动打包文件夹为 ZIP**
- ✅ **新功能：支持通配符文件匹配**

## 安装

```bash
npm install --save-dev release-it-gitea
# 或
pnpm add -D release-it-gitea
# 或
yarn add -D release-it-gitea
```

## 配置

### 1. 设置环境变量

首先，你需要设置 Gitea API token：

```bash
export GITEA_TOKEN="your-gitea-api-token"
```

### 2. 配置 release-it

在你的 `.release-it.json` 文件中添加插件配置：

```json
{
	"plugins": {
		"release-it-gitea": {
			"host": "https://gitea.example.com",
			"owner": "your-username",
			"repository": "your-repo",
			"release": true,
			"releaseTitle": "v${version}",
			"releaseNotes": "${changelog}",
			"prerelease": false,
			"draft": false,
			"tokenRef": "GITEA_TOKEN"
		}
	}
}
```

或者在 `package.json` 中：

```json
{
	"release-it": {
		"plugins": {
			"release-it-gitea": {
				"host": "https://gitea.example.com",
				"owner": "your-username",
				"repository": "your-repo",
				"release": true
			}
		}
	}
}
```

## 配置选项

| 选项           | 类型                   | 默认值                 | 描述                 |
| -------------- | ---------------------- | ---------------------- | -------------------- |
| `host`         | `string`               | 当前仓库的 host        | Gitea 服务器 URL     |
| `owner`        | `string`               | 从 git remote 自动检测 | 仓库所有者           |
| `repository`   | `string`               | 从 git remote 自动检测 | 仓库名称             |
| `release`      | `boolean`              | `true`                 | 是否创建发布         |
| `releaseTitle` | `string`               | `"v${version}"`        | 发布标题模板         |
| `releaseNotes` | `string`               | `"${changelog}"`       | 发布说明模板         |
| `prerelease`   | `boolean`              | `false`                | 是否为预发布         |
| `draft`        | `boolean`              | `false`                | 是否为草稿           |
| `tokenRef`     | `string`               | `"GITEA_TOKEN"`        | API token 环境变量名 |
| `timeout`      | `number`               | `30000`                | 请求超时时间（毫秒） |
| `assets`       | `(string \| object)[]` | ``                     | 附加的资源文件       |

## 附件上传配置

### 基本附件配置

```json
{
	"plugins": {
		"release-it-gitea": {
			"host": "https://gitea.example.com",
			"owner": "your-username",
			"repository": "your-repo",
			"assets": ["dist/app.js", "README.md", "dist/**/*.min.js"]
		}
	}
}
```

### 高级附件配置

```json
{
	"plugins": {
		"release-it-gitea": {
			"host": "https://gitea.example.com",
			"owner": "your-username",
			"repository": "your-repo",
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
					"name": "source-code.zip",
					"type": "zip",
					"label": "Source Code"
				}
			]
		}
	}
}
```

## 附件配置选项

### 字符串格式

直接指定文件路径，支持通配符：

```json
"assets": [
	"dist/app.js",
	"build/**/*.min.js",
	"*.md"
]
```

### 对象格式

更详细的配置选项：

| 属性    | 类型            | 必需 | 描述                                 |
| ------- | --------------- | ---- | ------------------------------------ |
| `path`  | string          | ✅   | 文件或文件夹路径，支持通配符         |
| `name`  | string          | ❌   | 上传后的文件名，不指定则使用原文件名 |
| `type`  | 'file' \| 'zip' | ❌   | 文件类型，默认为 'file'              |
| `label` | string          | ❌   | 文件标签，用于标识文件用途           |

### 文件类型说明

- **`file`**: 直接上传匹配到的文件
- **`zip`**: 将匹配到的文件打包成 ZIP 文件后上传

## 使用示例

### 示例 1：上传构建产物

```json
{
	"assets": ["dist/bundle.js", "dist/bundle.css", "dist/assets/**/*"]
}
```

### 示例 2：打包源代码

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

### 示例 3：多种文件类型

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

## 完整配置选项

| 选项           | 类型    | 默认值           | 描述                 |
| -------------- | ------- | ---------------- | -------------------- |
| `host`         | string  | -                | Gitea 服务器地址     |
| `owner`        | string  | -                | 仓库所有者           |
| `repository`   | string  | -                | 仓库名称             |
| `release`      | boolean | `true`           | 是否启用发布功能     |
| `releaseTitle` | string  | `"v${version}"`  | 发布标题模板         |
| `releaseNotes` | string  | `"${changelog}"` | 发布说明模板         |
| `prerelease`   | boolean | `false`          | 是否为预发布版本     |
| `draft`        | boolean | `false`          | 是否创建为草稿       |
| `tokenRef`     | string  | `"GITEA_TOKEN"`  | API Token 环境变量名 |
| `timeout`      | number  | `30000`          | 请求超时时间（毫秒） |
| `assets`       | array   | `[]`             | 附件配置列表         |

## 环境变量

设置 Gitea API Token：

```bash
export GITEA_TOKEN=your_gitea_api_token
```

或者使用自定义环境变量名：

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

- `${version}`: 当前版本号
- `${latestVersion}`: 上一个版本号
- `${changelog}`: 变更日志
- `${name}`: 项目名称
- `${repo.owner}`: 仓库所有者
- `${repo.repository}`: 仓库名称
- `${branchName}`: 分支名称

## 故障排除

### 常见问题

1. **附件上传失败**

   - 检查文件路径是否正确
   - 确保文件存在且可读
   - 检查 Gitea API Token 权限

2. **ZIP 文件创建失败**

   - 确保有足够的磁盘空间
   - 检查临时目录权限

3. **通配符匹配无文件**

   - 验证通配符模式是否正确
   - 检查当前工作目录

4. **API 请求失败**
   - 检查 Gitea 服务器地址是否正确
   - 验证 API Token 是否有效
   - 确认仓库所有者和名称正确

### 调试模式

使用 `--verbose` 参数查看详细日志：

```bash
npx release-it --verbose
```

## 开发

```bash
# 克隆仓库
git clone https://github.com/lib-pack/release-it-gitea.git
cd release-it-gitea

# 安装依赖
pnpm install

# 构建
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint
```

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
