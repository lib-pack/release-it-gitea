# 测试指南

本文档介绍如何测试 `release-it-gitea` 插件的各种功能。

## 🧪 测试类型

### 1. 单元测试

测试插件的核心功能和逻辑：

```bash
# 运行单元测试
npm run test:unit

# 监听模式
npm run test:unit -- --watch
```

**测试覆盖：**

- ✅ 插件启用/禁用检查
- ✅ 配置验证
- ✅ 模板变量替换
- ✅ API URL 构建
- ✅ 错误处理

### 2. 端到端测试

测试插件与 release-it 的集成：

```bash
# 运行 E2E 测试
npm run test:e2e
```

**测试场景：**

- ✅ 基础 release-it 集成
- ✅ 与 conventional-changelog 结合
- ✅ 配置验证
- ✅ 自定义环境变量

### 3. 手动测试

使用真实的 Gitea 服务器进行测试：

```bash
# 设置环境变量
export GITEA_TOKEN="your-gitea-api-token"
export GITEA_HOST="https://your-gitea-server.com"
export GITEA_OWNER="your-username"
export GITEA_REPO="your-repository"

# 运行手动测试
npm run test:manual
```

## 🔧 测试配置

### 基础配置测试

使用 `test/configs/basic.json`：

```json
{
	"plugins": {
		"release-it-gitea": {
			"host": "https://gitea.example.com",
			"release": true
		}
	}
}
```

### 高级配置测试

使用 `test/configs/advanced.json`：

```json
{
	"plugins": {
		"@release-it/conventional-changelog": {
			"preset": "angular",
			"infile": "CHANGELOG.md"
		},
		"release-it-gitea": {
			"host": "https://gitea.example.com",
			"releaseTitle": "🚀 ${name} v${version}",
			"releaseNotes": "## 📋 更新内容\n\n${changelog}"
		}
	}
}
```

### 预发布配置测试

使用 `test/configs/prerelease.json`：

```json
{
	"plugins": {
		"release-it-gitea": {
			"host": "https://gitea.example.com",
			"prerelease": true,
			"releaseTitle": "🧪 ${name} v${version} (预发布)"
		}
	}
}
```

## 🚀 快速开始

### 1. 查看演示

```bash
npm run demo
```

这会展示插件的所有配置选项和使用方法。

### 2. 运行所有测试

```bash
# 运行单元测试
npm run test:unit

# 构建项目
npm run build

# 检查代码质量
npm run lint
```

### 3. 手动测试流程

1. **设置环境变量**：

   ```bash
   export GITEA_TOKEN="your-token"
   export GITEA_HOST="https://your-gitea.com"
   ```

2. **创建测试项目**：

   ```bash
   mkdir test-project
   cd test-project
   npm init -y
   npm install --save-dev release-it ../path/to/release-it-gitea
   ```

3. **配置 release-it**：

   ```json
   {
   	"plugins": {
   		"release-it-gitea": {
   			"host": "https://your-gitea.com",
   			"release": true
   		}
   	}
   }
   ```

4. **测试 dry-run**：

   ```bash
   npx release-it --dry-run
   ```

5. **执行发布**：
   ```bash
   npx release-it
   ```

## 🐛 故障排除

### 常见问题

1. **API Token 错误**：

   ```
   Error: Gitea API token 未找到
   ```

   **解决方案**：确保设置了正确的环境变量 `GITEA_TOKEN`

2. **网络连接错误**：

   ```
   Error: 无法连接到 Gitea 仓库
   ```

   **解决方案**：检查 `host` 配置和网络连接

3. **权限错误**：
   ```
   Error: Gitea API 请求失败 (403)
   ```
   **解决方案**：确保 API token 有足够的权限

### 调试模式

启用详细日志：

```bash
DEBUG=release-it:* npx release-it --dry-run
```

## 📊 测试覆盖率

当前测试覆盖的功能：

- ✅ 配置验证和默认值
- ✅ API token 管理
- ✅ HTTP 请求处理
- ✅ 发布创建和更新
- ✅ 模板变量替换
- ✅ 错误处理和日志记录
- ✅ 与 release-it 生命周期集成

## 🔄 持续集成

项目包含 GitHub Actions 工作流，会自动运行：

- 单元测试
- 代码质量检查
- 构建验证
- 发布流程

查看 `.github/workflows/` 目录了解详细配置。

## 📝 贡献测试

如果您想为项目贡献测试：

1. 添加单元测试到 `src/*.test.ts`
2. 添加配置示例到 `test/configs/`
3. 更新此文档
4. 确保所有测试通过：`npm test`

## 🎯 测试最佳实践

1. **隔离测试**：每个测试应该独立运行
2. **Mock 外部依赖**：使用 mock 避免真实的 API 调用
3. **测试边界情况**：包括错误情况和边界值
4. **清晰的测试名称**：描述测试的具体行为
5. **适当的断言**：验证预期的行为和输出

---

更多信息请查看 [README.md](./README.md) 和源代码注释。
