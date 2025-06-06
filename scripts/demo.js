#!/usr/bin/env node

/**
 * 演示脚本 - 展示如何使用 release-it-gitea 插件
 *
 * 这个脚本会创建一个示例项目并展示插件的配置和使用方法
 */

import { writeFileSync } from "node:fs";

console.log("🚀 release-it-gitea 插件演示\n");

// 1. 基础配置示例
console.log("📋 1. 基础配置示例:");
const basicConfig = {
	git: {
		commitMessage: "chore: release v${version}",
		requireCommits: true,
	},
	npm: {
		publish: false,
	},
	github: {
		release: false,
	},
	plugins: {
		"release-it-gitea": {
			host: "https://gitea.example.com",
			release: true,
		},
	},
};

console.log(JSON.stringify(basicConfig, null, 2));
console.log("\n" + "=".repeat(50) + "\n");

// 2. 高级配置示例
console.log("📋 2. 高级配置示例 (与 conventional-changelog 结合):");
const advancedConfig = {
	git: {
		commitMessage: "chore: release v${version}",
		requireCommits: true,
	},
	npm: {
		publish: false,
	},
	github: {
		release: false,
	},
	plugins: {
		"@release-it/conventional-changelog": {
			preset: "angular",
			infile: "CHANGELOG.md",
		},
		"release-it-gitea": {
			host: "https://gitea.example.com",
			owner: "myorg",
			repository: "myproject",
			release: true,
			releaseTitle: "🚀 ${name} v${version}",
			releaseNotes:
				"## 📋 更新内容\n\n${changelog}\n\n---\n\n**完整更新日志**: [CHANGELOG.md](./CHANGELOG.md)",
			prerelease: false,
			draft: false,
			tokenRef: "GITEA_TOKEN",
			timeout: 30000,
		},
	},
};

console.log(JSON.stringify(advancedConfig, null, 2));
console.log("\n" + "=".repeat(50) + "\n");

// 3. 环境变量设置
console.log("🔧 3. 环境变量设置:");
console.log("export GITEA_TOKEN='your-gitea-api-token'");
console.log("export GITEA_HOST='https://your-gitea-server.com'  # 可选");
console.log("export GITEA_OWNER='your-username'                # 可选");
console.log("export GITEA_REPO='your-repository'               # 可选");
console.log("\n" + "=".repeat(50) + "\n");

// 4. 使用命令
console.log("⚡ 4. 使用命令:");
console.log("# 安装插件");
console.log("npm install --save-dev release-it-gitea");
console.log("");
console.log("# 运行 dry-run 测试");
console.log("npx release-it --dry-run");
console.log("");
console.log("# 执行发布");
console.log("npx release-it");
console.log("");
console.log("# 发布预发布版本");
console.log("npx release-it --preRelease");
console.log("\n" + "=".repeat(50) + "\n");

// 5. 模板变量
console.log("📝 5. 可用的模板变量:");
const templateVars = [
	"${version}        - 当前版本号",
	"${latestVersion}  - 上一个版本号",
	"${changelog}      - 生成的 changelog",
	"${name}           - 项目名称",
	"${repo.owner}     - 仓库所有者",
	"${repo.repository} - 仓库名称",
	"${branchName}     - 当前分支名",
];

templateVars.forEach((variable) => {
	console.log(variable);
});

console.log("\n" + "=".repeat(50) + "\n");

// 6. 示例发布标题和说明
console.log("💡 6. 示例发布标题和说明模板:");
console.log("releaseTitle: '🚀 ${name} v${version}'");
console.log("releaseNotes: `");
console.log("## 📋 更新内容");
console.log("");
console.log("${changelog}");
console.log("");
console.log("---");
console.log("");
console.log("**完整更新日志**: [CHANGELOG.md](./CHANGELOG.md)");
console.log(
	"**项目主页**: https://gitea.example.com/\${repo.owner}/\${repo.repository}",
);
console.log("`");

console.log("\n🎉 演示完成! 更多信息请查看 README.md");

// 生成示例配置文件
writeFileSync("demo-config.json", JSON.stringify(advancedConfig, null, 2));
console.log("\n📄 已生成示例配置文件: demo-config.json");
