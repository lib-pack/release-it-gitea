# release-it-gitea

一个用于 [release-it](https://github.com/release-it/release-it) 的 Gitea 插件，可以在生成版本和 changelog 后自动将它们推送到指定的 Gitea 服务器的仓库发布中。

## 功能特性

- ✅ 自动创建 Gitea 发布
- ✅ 支持自定义发布标题和说明
- ✅ 支持预发布和草稿发布
- ✅ 支持模板变量替换
- ✅ 自动检测并更新已存在的发布
- ✅ 完整的错误处理和日志记录
- ✅ TypeScript 支持

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
			"draft": false
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

| 选项           | 类型      | 默认值                 | 描述                 |
| -------------- | --------- | ---------------------- | -------------------- |
| `host`         | `string`  | **必需**               | Gitea 服务器 URL     |
| `owner`        | `string`  | 从 git remote 自动检测 | 仓库所有者           |
| `repository`   | `string`  | 从 git remote 自动检测 | 仓库名称             |
| `release`      | `boolean` | `true`                 | 是否创建发布         |
| `releaseTitle` | `string`  | `"v${version}"`        | 发布标题模板         |
| `releaseNotes` | `string`  | `"${changelog}"`       | 发布说明模板         |
| `prerelease`   | `boolean` | `false`                | 是否为预发布         |
| `draft`        | `boolean` | `false`                | 是否为草稿           |
| `tokenRef`     | `string`  | `"GITEA_TOKEN"`        | API token 环境变量名 |
| `timeout`      | `number`  | `30000`                | 请求超时时间（毫秒） |

## 模板变量

在 `releaseTitle` 和 `releaseNotes` 中可以使用以下模板变量：

- `${version}` - 当前版本号
- `${latestVersion}` - 上一个版本号
- `${changelog}` - 生成的 changelog
- `${name}` - 项目名称
- `${repo.owner}` - 仓库所有者
- `${repo.repository}` - 仓库名称
- `${branchName}` - 当前分支名

## 使用示例

### 基础配置

```json
{
	"plugins": {
		"release-it-gitea": {
			"host": "https://gitea.example.com"
		}
	}
}
```

### 完整配置

```json
{
	"plugins": {
		"release-it-gitea": {
			"host": "https://gitea.example.com",
			"owner": "myorg",
			"repository": "myproject",
			"release": true,
			"releaseTitle": "Release ${version}",
			"releaseNotes": "## 更新内容\n\n${changelog}\n\n---\n\n完整更新日志请查看 [CHANGELOG.md](./CHANGELOG.md)",
			"prerelease": false,
			"draft": false,
			"tokenRef": "GITEA_TOKEN",
			"timeout": 30000
		}
	}
}
```

### 预发布配置

```json
{
	"plugins": {
		"release-it-gitea": {
			"host": "https://gitea.example.com",
			"releaseTitle": "v${version} (预发布)",
			"prerelease": true
		}
	}
}
```

## 工作流程

1. **初始化阶段** - 验证配置和 API 连接
2. **发布阶段** - 创建或更新 Gitea 发布
3. **发布后阶段** - 显示发布链接

## 错误处理

插件包含完整的错误处理：

- 配置验证
- API token 验证
- 网络连接检查
- API 请求错误处理
- 详细的错误日志

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
