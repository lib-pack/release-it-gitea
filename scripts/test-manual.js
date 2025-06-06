#!/usr/bin/env node

/**
 * 手动测试脚本
 * 用于测试 release-it-gitea 插件的实际功能
 *
 * 使用方法:
 * 1. 设置环境变量: export GITEA_TOKEN="your-token"
 * 2. 运行: node scripts/test-manual.js
 */

import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const testDir = join(process.cwd(), "manual-test-temp");

function log(message) {
	console.log(`[TEST] ${message}`);
}

function cleanup() {
	try {
		rmSync(testDir, { recursive: true, force: true });
		log("清理测试目录完成");
	} catch (error) {
		log(`清理失败: ${error.message}`);
	}
}

function setupTestProject() {
	log("设置测试项目...");

	// 创建测试目录
	rmSync(testDir, { recursive: true, force: true });
	mkdirSync(testDir, { recursive: true });
	process.chdir(testDir);

	// 初始化 git 仓库
	execSync("git init", { stdio: "inherit" });
	execSync("git config user.name 'Test User'", { stdio: "inherit" });
	execSync("git config user.email 'test@example.com'", { stdio: "inherit" });

	// 创建 package.json
	const packageJson = {
		name: "test-release-it-gitea",
		version: "0.1.0",
		description: "Test project for release-it-gitea plugin",
		main: "index.js",
		scripts: {
			release: "release-it",
			"release:dry": "release-it --dry-run",
		},
		devDependencies: {
			"release-it": "^19.0.3",
			"@release-it/conventional-changelog": "^10.0.0",
		},
	};
	writeFileSync("package.json", JSON.stringify(packageJson, null, 2));

	// 创建 release-it 配置
	const releaseItConfig = {
		git: {
			commitMessage: "chore: release v${version}",
			requireCommits: false,
			requireCleanWorkingDir: false,
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
			"../lib/index.js": {
				host: process.env.GITEA_HOST || "https://gitea.example.com",
				owner: process.env.GITEA_OWNER || "testowner",
				repository: process.env.GITEA_REPO || "testrepo",
				release: true,
				releaseTitle: "🚀 Release v${version}",
				releaseNotes:
					"## 📋 更新内容\n\n${changelog}\n\n---\n\n**完整更新日志**: [CHANGELOG.md](./CHANGELOG.md)",
				prerelease: false,
				draft: false,
			},
		},
	};
	writeFileSync(".release-it.json", JSON.stringify(releaseItConfig, null, 2));

	// 创建一些示例文件
	writeFileSync("README.md", "# Test Release-it Gitea\n\n这是一个测试项目。");
	writeFileSync("index.js", "console.log('Hello, world!');");

	// 创建初始提交
	execSync("git add .", { stdio: "inherit" });
	execSync("git commit -m 'feat: initial commit'", { stdio: "inherit" });

	// 添加一些功能提交
	writeFileSync("feature.js", "console.log('New feature');");
	execSync("git add .", { stdio: "inherit" });
	execSync("git commit -m 'feat: add new feature'", { stdio: "inherit" });

	writeFileSync("bugfix.js", "console.log('Bug fixed');");
	execSync("git add .", { stdio: "inherit" });
	execSync("git commit -m 'fix: resolve critical bug'", { stdio: "inherit" });

	log("测试项目设置完成");
}

function checkEnvironment() {
	log("检查环境变量...");

	if (!process.env.GITEA_TOKEN) {
		console.error("❌ 错误: 请设置 GITEA_TOKEN 环境变量");
		console.error("   export GITEA_TOKEN='your-gitea-api-token'");
		process.exit(1);
	}

	log("✅ GITEA_TOKEN 已设置");

	// 检查可选的环境变量
	const optionalVars = ["GITEA_HOST", "GITEA_OWNER", "GITEA_REPO"];
	optionalVars.forEach((varName) => {
		if (process.env[varName]) {
			log(`✅ ${varName} = ${process.env[varName]}`);
		} else {
			log(`ℹ️  ${varName} 未设置，将使用默认值`);
		}
	});
}

function runTests() {
	log("开始运行测试...");

	try {
		// 安装依赖
		log("安装依赖...");
		execSync("npm install", { stdio: "inherit" });

		// 运行 dry-run 测试
		log("运行 dry-run 测试...");
		execSync("npm run release:dry", { stdio: "inherit" });

		log("✅ Dry-run 测试成功!");

		// 询问是否运行真实发布
		console.log("\n" + "=".repeat(50));
		console.log("🚨 警告: 下一步将执行真实的发布操作!");
		console.log("这将:");
		console.log("- 创建 git tag");
		console.log("- 推送到远程仓库");
		console.log("- 在 Gitea 上创建发布");
		console.log("=".repeat(50));

		const readline = require("readline");
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		rl.question("是否继续执行真实发布? (y/N): ", (answer) => {
			rl.close();

			if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
				log("执行真实发布...");
				try {
					execSync("npm run release", { stdio: "inherit" });
					log("✅ 发布成功!");
				} catch (error) {
					log(`❌ 发布失败: ${error.message}`);
				}
			} else {
				log("跳过真实发布");
			}

			cleanup();
		});
	} catch (error) {
		log(`❌ 测试失败: ${error.message}`);
		cleanup();
		process.exit(1);
	}
}

function main() {
	const originalCwd = process.cwd();

	// 设置清理处理
	process.on("SIGINT", () => {
		log("收到中断信号，正在清理...");
		process.chdir(originalCwd);
		cleanup();
		process.exit(0);
	});

	process.on("exit", () => {
		process.chdir(originalCwd);
	});

	try {
		checkEnvironment();
		setupTestProject();
		runTests();
	} catch (error) {
		log(`❌ 测试失败: ${error.message}`);
		process.chdir(originalCwd);
		cleanup();
		process.exit(1);
	}
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
