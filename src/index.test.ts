import type { Config, Context } from "release-it";
import fetch from "node-fetch";
import { glob } from "glob";
import {
	statSync,
	createReadStream,
	createWriteStream,
	mkdirSync,
	unlinkSync,
} from "fs";
import { join, dirname, basename } from "path";
import archiver from "archiver";
import FormData from "form-data";

import { beforeEach, describe, expect, it, vi } from "vitest";

import GiteaPlugin from "./index.js";

// Type for accessing private methods in tests
interface GiteaPluginWithPrivates {
	giteaConfig: GiteaConfig;
	getToken: () => string;
	buildApiUrl: (endpoint: string) => string;
	interpolate: (template: string) => string;
	apiRequest: (
		endpoint: string,
		options?: { body?: unknown; method?: string },
	) => Promise<unknown>;
	releaseExists: (tagName: string) => Promise<boolean>;
	createRelease: (releaseData: any) => Promise<any>;
	updateRelease: (tagName: string, releaseData: any) => Promise<any>;
	uploadAssets: (releaseId: number) => Promise<void>;
	processAsset: (releaseId: number, config: GiteaAssetConfig) => Promise<void>;
	uploadAsset: (
		releaseId: number,
		filePath: string,
		fileName: string,
		label?: string,
	) => Promise<unknown>;
	normalizeAssetConfig: (asset: GiteaAssetConfig | string) => GiteaAssetConfig;
	resolveFiles: (pattern: string) => Promise<string[]>;
}

const {
	mockFormDataAppend,
	mockFormDataGetHeaders,
	mockNodeFetch,
	mockFs,
	mockGlobFn,
	mockArchiverFn,
} = vi.hoisted(() => ({
	mockArchiverFn: vi.fn().mockReturnValue({
		file: vi.fn(),
		finalize: vi.fn().mockResolvedValue(undefined),
		on: vi.fn(),
		pipe: vi.fn(),
		pointer: vi.fn().mockReturnValue(1024),
	}),
	mockFormDataAppend: vi.fn(),
	mockFormDataGetHeaders: vi.fn().mockReturnValue({}),
	mockFs: {
		createReadStream: vi.fn().mockReturnValue({}),
		createWriteStream: vi.fn().mockImplementation(function () {
			return {
				on: vi.fn().mockImplementation(function (
					event: string,
					cb: (...args: any[]) => void,
				) {
					if (event === "close") {
						setTimeout(cb, 0);
					}
				}),
			};
		}),
		mkdirSync: vi.fn().mockReturnValue(undefined),
		statSync: vi.fn().mockReturnValue({ isFile: () => true }),
		unlinkSync: vi.fn().mockReturnValue(undefined),
	},
	mockGlobFn: vi.fn().mockResolvedValue([]),
	mockNodeFetch: vi.fn().mockResolvedValue({
		json: () => Promise.resolve({}),
		ok: true,
	}),
}));

// Mock node-fetch
vi.mock("node-fetch", () => ({
	default: mockNodeFetch,
}));

// Mock fs functions
vi.mock("fs", () => ({
	...mockFs,
}));

// Mock glob
vi.mock("glob", () => ({
	glob: mockGlobFn,
}));

// Mock archiver
vi.mock("archiver", () => ({
	default: mockArchiverFn,
}));

// Mock form-data
vi.mock("form-data", () => ({
	default: vi.fn().mockImplementation(function () {
		return {
			append: mockFormDataAppend,
			getHeaders: mockFormDataGetHeaders,
		};
	}),
}));

const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
const mockFormData = FormData as unknown as ReturnType<typeof vi.fn>;
const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;
const mockStatSync = statSync as unknown as ReturnType<typeof vi.fn>;
const mockCreateReadStream = createReadStream as unknown as ReturnType<
	typeof vi.fn
>;
const mockCreateWriteStream = createWriteStream as unknown as ReturnType<
	typeof vi.fn
>;
const mockMkdirSync = mkdirSync as unknown as ReturnType<typeof vi.fn>;
const mockUnlinkSync = unlinkSync as unknown as ReturnType<typeof vi.fn>;
const mockArchiver = archiver as unknown as ReturnType<typeof vi.fn>;

// Mock release-it Plugin base class
vi.mock("release-it", () => ({
	Plugin: class MockPlugin {
		config: Config;
		log: {
			error: (message: string) => void;
			exec: (command: string) => void;
			info: (message: string) => void;
			verbose: (message: string) => void;
			warn: (message: string) => void;
		};

		constructor(config: Config) {
			this.config = config;
			this.log = {
				error: vi.fn(),
				exec: vi.fn(),
				info: vi.fn(),
				verbose: vi.fn(),
				warn: vi.fn(),
			};
		}

		getContext(key: string): any {
			return this.config.getContext(key);
		}

		static isEnabled(): boolean {
			return true;
		}
	},
}));

describe("GiteaPlugin", () => {
	let plugin: GiteaPlugin;
	let mockConfig: Config;
	let mockContext: any;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Reset environment variables
		delete process.env.GITEA_TOKEN;

		mockContext = {
			version: "1.0.0",
			latestVersion: "0.9.0",
			changelog: "Test changelog",
			name: "test-package",
			branchName: "main",
			tagName: "v1.0.0",
			repo: {
				owner: "testowner",
				repository: "testrepo",
			},
		};

		const giteaConfig = {
			host: "https://gitea.example.com",
			owner: "testowner",
			repository: "testrepo",
			release: true,
			draft: false,
			prerelease: false,
			releaseTitle: "v${version}",
			releaseNotes: "${changelog}",
			timeout: 30000,
			tokenRef: "GITEA_TOKEN",
		};

		mockConfig = {
			isDryRun: false,
			getContext: vi.fn().mockImplementation(function (key?: string) {
				if (key) {
					return mockContext[key];
				}
				// Check if we're being called from giteaConfig getter or interpolate method
				const stack = new Error().stack || "";
				if (stack.includes("interpolate")) {
					// Return full context for interpolate method
					return mockContext;
				}
				// Return gitea config for giteaConfig getter
				return giteaConfig;
			}),
			setContext: vi.fn(),
		} as unknown as Config;

		plugin = new GiteaPlugin(mockConfig);
	});

	describe("isEnabled", () => {
		it("should return true when release is not false", () => {
			expect(
				GiteaPlugin.isEnabled({
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					release: true,
				}),
			).toBe(true);
		});

		it("should return true when release is undefined", () => {
			expect(
				GiteaPlugin.isEnabled({
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
				}),
			).toBe(true);
		});

		it("should return false when release is false", () => {
			expect(
				GiteaPlugin.isEnabled({
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					release: false,
				}),
			).toBe(false);
		});

		it("should return true when config is undefined", () => {
			expect(GiteaPlugin.isEnabled(undefined)).toBe(true);
		});
	});

	describe("giteaConfig", () => {
		it("should return valid config with defaults", () => {
			const config = (plugin as unknown as GiteaPluginWithPrivates).giteaConfig;

			expect(config).toEqual({
				assets: [],
				draft: false,
				host: "https://gitea.example.com",
				owner: "testowner",
				prerelease: false,
				release: true,
				releaseNotes: "${changelog}",
				releaseTitle: "v${version}",
				repository: "testrepo",
				timeout: 30000,
				tokenRef: "GITEA_TOKEN",
			});
		});

		it("should throw error when gitea config is missing", () => {
			mockConfig.getContext = vi.fn().mockReturnValue(null as any);

			expect(
				() => (plugin as unknown as GiteaPluginWithPrivates).giteaConfig,
			).toThrow("Gitea 配置未找到");
		});

		it("should throw error when host is missing", () => {
			mockConfig.getContext = vi.fn().mockImplementation(function (
				key?: string,
			) {
				if (key === "repo") {
					return mockContext.repo;
				}
				return {
					owner: "testowner",
					repository: "testrepo",
				};
			}) as any;

			expect(
				() => (plugin as unknown as GiteaPluginWithPrivates).giteaConfig,
			).toThrow("Gitea host 配置是必需的");
		});

		it("should throw error when owner is missing", () => {
			mockConfig.getContext = vi.fn().mockImplementation(function (
				key?: string,
			) {
				if (key === "repo") {
					return { repository: "testrepo" };
				}
				return {
					host: "https://gitea.example.com",
					repository: "testrepo",
				};
			}) as any;

			expect(
				() => (plugin as unknown as GiteaPluginWithPrivates).giteaConfig,
			).toThrow("Gitea owner 配置是必需的");
		});

		it("should throw error when repository is missing", () => {
			mockConfig.getContext = vi.fn().mockImplementation(function (
				key?: string,
			) {
				if (key === "repo") {
					return { owner: "testowner" };
				}
				return {
					host: "https://gitea.example.com",
					owner: "testowner",
				};
			}) as any;

			expect(
				() => (plugin as unknown as GiteaPluginWithPrivates).giteaConfig,
			).toThrow("Gitea repository 配置是必需的");
		});
	});

	describe("getToken", () => {
		it("should return token from environment variable", () => {
			process.env.GITEA_TOKEN = "test-token";

			const token = (plugin as unknown as GiteaPluginWithPrivates).getToken();
			expect(token).toBe("test-token");
		});

		it("should throw error when token is missing", () => {
			expect(() =>
				(plugin as unknown as GiteaPluginWithPrivates).getToken(),
			).toThrow("Gitea API token 未找到。请设置环境变量 GITEA_TOKEN");
		});

		it("should use custom token reference", () => {
			process.env.CUSTOM_TOKEN = "custom-test-token";
			mockConfig.getContext = vi.fn().mockImplementation(function (
				key?: string,
			) {
				if (key) {
					return mockContext[key];
				}
				return {
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					tokenRef: "CUSTOM_TOKEN",
				};
			});

			const token = (plugin as unknown as GiteaPluginWithPrivates).getToken();
			expect(token).toBe("custom-test-token");
		});
	});

	describe("buildApiUrl", () => {
		it("should build correct API URL", () => {
			const endpoint = "/repos/owner/repo/releases";
			const result = (plugin as unknown as GiteaPluginWithPrivates).buildApiUrl(
				endpoint,
			);
			expect(result).toBe(
				"https://gitea.example.com/api/v1/repos/owner/repo/releases",
			);
		});

		it("should handle trailing slash in host", () => {
			mockConfig.getContext = vi.fn().mockImplementation(function (
				key?: string,
			) {
				if (key) {
					return mockContext[key];
				}
				return {
					host: "https://gitea.example.com/",
					owner: "testowner",
					repository: "testrepo",
				};
			});

			const endpoint = "/test";
			const result = (plugin as unknown as GiteaPluginWithPrivates).buildApiUrl(
				endpoint,
			);
			expect(result).toBe("https://gitea.example.com/api/v1/test");
		});
	});

	describe("interpolate", () => {
		beforeEach(() => {
			// Mock config.getContext() to return the full context for interpolate method
			mockConfig.getContext = vi.fn().mockImplementation(function (
				key?: string,
			) {
				if (key) {
					return mockContext[key];
				}
				// Return full context for interpolate method
				return mockContext;
			});
		});

		it("should replace template variables correctly", () => {
			const template = "Release ${version} for ${name}";
			const result = (plugin as unknown as GiteaPluginWithPrivates).interpolate(
				template,
			);
			expect(result).toBe("Release 1.0.0 for test-package");
		});

		it("should handle multiple variables", () => {
			const template = "${repo.owner}/${repo.repository} v${version}";
			const result = (plugin as unknown as GiteaPluginWithPrivates).interpolate(
				template,
			);
			expect(result).toBe("testowner/testrepo v1.0.0");
		});

		it("should handle all available variables", () => {
			const template =
				"${version}-${latestVersion}-${changelog}-${name}-${repo.owner}-${repo.repository}-${branchName}";
			const result = (plugin as unknown as GiteaPluginWithPrivates).interpolate(
				template,
			);
			expect(result).toBe(
				"1.0.0-0.9.0-Test changelog-test-package-testowner-testrepo-main",
			);
		});
	});

	describe("apiRequest", () => {
		beforeEach(() => {
			process.env.GITEA_TOKEN = "test-token";
		});

		it("should make successful GET request", async () => {
			const mockResponse = { id: 1, name: "test" };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			} as any);

			const result = await (
				plugin as unknown as GiteaPluginWithPrivates
			).apiRequest("/test");

			expect(mockFetch).toHaveBeenCalledWith(
				"https://gitea.example.com/api/v1/test",
				{
					method: "GET",
					headers: {
						Accept: "application/json",
						Authorization: "token test-token",
						"Content-Type": "application/json",
					},
					timeout: 30000,
					body: undefined,
				},
			);
			expect(result).toEqual(mockResponse);
		});

		it("should make successful POST request with body", async () => {
			const mockResponse = { id: 1, name: "created" };
			const requestBody = { name: "test", body: "content" };

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockResponse),
			} as any);

			const result = await (
				plugin as unknown as GiteaPluginWithPrivates
			).apiRequest("/test", {
				method: "POST",
				body: requestBody,
			});

			expect(mockFetch).toHaveBeenCalledWith(
				"https://gitea.example.com/api/v1/test",
				{
					method: "POST",
					headers: {
						Accept: "application/json",
						Authorization: "token test-token",
						"Content-Type": "application/json",
					},
					timeout: 30000,
					body: JSON.stringify(requestBody),
				},
			);
			expect(result).toEqual(mockResponse);
		});

		it("should throw error on failed request", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				text: () => Promise.resolve("Not found"),
			} as any);

			await expect(
				(plugin as unknown as GiteaPluginWithPrivates).apiRequest("/test"),
			).rejects.toThrow("Gitea API 请求失败 (404): Not found");
		});

		it("should throw error on network failure", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Network error"));

			await expect(
				(plugin as unknown as GiteaPluginWithPrivates).apiRequest("/test"),
			).rejects.toThrow("Gitea API 请求失败: Network error");
		});
	});

	describe("releaseExists", () => {
		beforeEach(() => {
			process.env.GITEA_TOKEN = "test-token";
		});

		it("should return true when release exists", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ id: 1 }),
			} as any);

			const result = await (
				plugin as unknown as GiteaPluginWithPrivates
			).releaseExists("v1.0.0");
			expect(result).toBe(true);
		});

		it("should return false when release does not exist (404)", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				text: () => Promise.resolve("Not found"),
			} as any);

			const result = await (
				plugin as unknown as GiteaPluginWithPrivates
			).releaseExists("v1.0.0");
			expect(result).toBe(false);
		});

		it("should throw error on other API failures", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				text: () => Promise.resolve("Server error"),
			} as any);

			await expect(
				(plugin as unknown as GiteaPluginWithPrivates).releaseExists("v1.0.0"),
			).rejects.toThrow("Gitea API 请求失败 (500): Server error");
		});
	});

	describe("release", () => {
		beforeEach(() => {
			process.env.GITEA_TOKEN = "test-token";
		});

		it("should skip release when disabled", async () => {
			mockConfig.getContext = vi.fn().mockImplementation(function (
				key?: string,
			) {
				if (key) {
					return mockContext[key];
				}
				return {
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					release: false,
				};
			});

			await plugin.release();

			expect(plugin.log.info).toHaveBeenCalledWith("Gitea 发布功能已禁用");
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should create new release when it does not exist", async () => {
			// Create a new plugin instance with proper mock for this test
			const testMockConfig = {
				isDryRun: false,
				getContext: vi.fn().mockImplementation(function (key?: string) {
					if (key) {
						return mockContext[key];
					}
					return mockContext;
				}),
				setContext: vi.fn(),
			} as unknown as Config;

			const testPlugin = new GiteaPlugin(testMockConfig);

			// Override giteaConfig getter for this test
			Object.defineProperty(testPlugin, "giteaConfig", {
				get: () => ({
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					release: true,
					draft: false,
					prerelease: false,
					releaseTitle: "v${version}",
					releaseNotes: "${changelog}",
					timeout: 30000,
					tokenRef: "GITEA_TOKEN",
				}),
				configurable: true,
			});

			const mockRelease = {
				id: 1,
				html_url:
					"https://gitea.example.com/testowner/testrepo/releases/tag/v1.0.0",
				tag_name: "v1.0.0",
			};

			// Mock releaseExists to return false
			mockFetch
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
					text: () => Promise.resolve("Not found"),
				} as any)
				// Mock createRelease
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockRelease),
				} as any);

			await testPlugin.release();

			expect(testPlugin.log.info).toHaveBeenCalledWith(
				"准备创建 Gitea 发布: v1.0.0",
			);
			expect(testPlugin.log.info).toHaveBeenCalledWith(
				"正在创建新发布 v1.0.0...",
			);
			expect(testPlugin.log.info).toHaveBeenCalledWith(
				"✅ Gitea 发布创建成功: https://gitea.example.com/testowner/testrepo/releases/tag/v1.0.0",
			);
			expect(testMockConfig.setContext).toHaveBeenCalledWith(
				"releaseUrl",
				mockRelease.html_url,
			);
		});

		it("should update existing release", async () => {
			// ... existing test code ...
		});

		it("should support dry-run mode", async () => {
			const testMockConfig = {
				isDryRun: true,
				getContext: vi.fn().mockImplementation(function (key?: string) {
					if (key) {
						return mockContext[key];
					}
					return mockContext;
				}),
				setContext: vi.fn(),
			} as unknown as Config;

			const testPlugin = new GiteaPlugin(testMockConfig);

			Object.defineProperty(testPlugin, "giteaConfig", {
				get: () => ({
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					release: true,
					assets: ["dist/*.js"],
				}),
				configurable: true,
			});

			// Mock resolveFiles to return something
			vi.spyOn(testPlugin as any, "resolveFiles").mockResolvedValue([
				"dist/app.js",
			]);

			await testPlugin.release();

			expect(testPlugin.log.info).toHaveBeenCalledWith(
				expect.stringContaining("[模拟执行] 正在创建/更新发布"),
			);
			expect(testPlugin.log.info).toHaveBeenCalledWith(
				expect.stringContaining("[模拟执行] 上传附件: app.js"),
			);
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("should handle release creation errors", async () => {
			// Create a new plugin instance with proper mock for this test
			const testMockConfig = {
				isDryRun: false,
				getContext: vi.fn().mockImplementation(function (key?: string) {
					if (key) {
						return mockContext[key];
					}
					// Return full context for interpolate method
					return mockContext;
				}),
				setContext: vi.fn(),
			} as unknown as Config;

			const testPlugin = new GiteaPlugin(testMockConfig);

			// Override giteaConfig getter for this test
			Object.defineProperty(testPlugin, "giteaConfig", {
				get: () => ({
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					release: true,
					draft: false,
					prerelease: false,
					releaseTitle: "v${version}",
					releaseNotes: "${changelog}",
					timeout: 30000,
					tokenRef: "GITEA_TOKEN",
				}),
				configurable: true,
			});

			// Mock releaseExists to return false
			mockFetch
				.mockResolvedValueOnce({
					ok: false,
					status: 404,
					text: () => Promise.resolve("Not found"),
				} as any)
				// Mock createRelease failure
				.mockResolvedValueOnce({
					ok: false,
					status: 500,
					text: () => Promise.resolve("Server error"),
				} as any);

			await expect(testPlugin.release()).rejects.toThrow(
				"Gitea API 请求失败: Gitea API 请求失败 (500): Server error",
			);
			expect(testPlugin.log.error).toHaveBeenCalledWith(
				"❌ 创建 Gitea 发布失败: Gitea API 请求失败: Gitea API 请求失败 (500): Server error",
			);
		});
	});

	describe("afterRelease", () => {
		it("should log release URL when available", async () => {
			mockConfig.getContext = vi.fn().mockImplementation(function (
				key?: string,
			) {
				if (key === "releaseUrl") {
					return "https://gitea.example.com/testowner/testrepo/releases/tag/v1.0.0";
				}
				return key ? mockContext[key] : mockContext;
			});

			await plugin.afterRelease();

			expect(plugin.log.info).toHaveBeenCalledWith(
				"🎉 发布完成! 查看发布: https://gitea.example.com/testowner/testrepo/releases/tag/v1.0.0",
			);
		});

		it("should not log when release URL is not available", async () => {
			mockConfig.getContext = vi.fn().mockImplementation(function (
				key?: string,
			) {
				if (key === "releaseUrl") {
					return undefined;
				}
				return key ? mockContext[key] : mockContext;
			});

			await plugin.afterRelease();

			expect(plugin.log.info).not.toHaveBeenCalled();
		});
	});

	describe("uploadAssets", () => {
		let pluginWithPrivates: GiteaPluginWithPrivates;

		beforeEach(() => {
			pluginWithPrivates = plugin as unknown as GiteaPluginWithPrivates;
			// Reset all mocks
			vi.clearAllMocks();
		});

		it("should skip upload when no assets are configured", async () => {
			// Mock giteaConfig to return empty assets
			Object.defineProperty(pluginWithPrivates, "giteaConfig", {
				get: () => ({
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					assets: [],
				}),
				configurable: true,
			});

			await pluginWithPrivates.uploadAssets(123);

			expect(plugin.log.verbose).toHaveBeenCalledWith("没有配置附件，跳过上传");
		});

		it("should skip upload when assets is undefined", async () => {
			// Mock giteaConfig to return undefined assets
			Object.defineProperty(pluginWithPrivates, "giteaConfig", {
				get: () => ({
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					assets: undefined,
				}),
				configurable: true,
			});

			await pluginWithPrivates.uploadAssets(123);

			expect(plugin.log.verbose).toHaveBeenCalledWith("没有配置附件，跳过上传");
		});

		it("should process single file asset successfully", async () => {
			const mockAssets = [
				{
					path: "dist/app.js",
					name: "application.js",
					type: "file" as const,
					label: "Main App",
				},
			];

			// Mock giteaConfig
			Object.defineProperty(pluginWithPrivates, "giteaConfig", {
				get: () => ({
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					assets: mockAssets,
					tokenRef: "GITEA_TOKEN",
					timeout: 30000,
				}),
				configurable: true,
			});

			// Mock file system
			mockGlob.mockResolvedValue(["dist/app.js"]);
			mockStatSync.mockReturnValue({ isFile: () => true });

			// Mock form data
			mockFormData.mockImplementation(function () {
				return {
					append: vi.fn(),
					getHeaders: vi.fn().mockReturnValue({}),
				};
			});
			mockCreateReadStream.mockReturnValue({});

			// Mock successful upload
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: 1 }),
			});

			// Set environment variable
			process.env.GITEA_TOKEN = "test-token";

			await pluginWithPrivates.uploadAssets(123);

			expect(plugin.log.info).toHaveBeenCalledWith("开始上传 1 个附件...");
			expect(plugin.log.info).toHaveBeenCalledWith("✅ 所有附件处理完成");
		});

		it("should process zip asset with optimized directory structure", async () => {
			const mockAssets = [
				{
					path: "dist/**/*.map",
					name: "sourcemap.zip",
					type: "zip" as const,
				},
			];

			// Mock giteaConfig
			Object.defineProperty(pluginWithPrivates, "giteaConfig", {
				get: () => ({
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					assets: mockAssets,
					tokenRef: "GITEA_TOKEN",
					timeout: 30000,
				}),
				configurable: true,
			});

			// Mock file system
			mockGlob.mockResolvedValue([
				"/xgj/project/dist/js/app.js.map",
				"/xgj/project/dist/css/style.css.map",
			]);
			mockStatSync.mockReturnValue({ isFile: () => true });

			const mockArchive = {
				file: vi.fn(),
				pipe: vi.fn(),
				finalize: vi.fn(),
				pointer: vi.fn().mockReturnValue(1024),
				on: vi.fn().mockImplementation(function (
					event: string,
					callback: (...args: any[]) => void,
				) {
					if (event === "close") {
						// Simulate successful zip creation
						setTimeout(callback, 0);
					}
				}),
			};
			mockArchiver.mockReturnValue(mockArchive);

			// Mock write stream
			const mockWriteStream = {
				on: vi.fn().mockImplementation(function (
					event: string,
					callback: (...args: any[]) => void,
				) {
					if (event === "close") {
						// Simulate successful zip creation
						setTimeout(callback, 0);
					}
				}),
			};
			mockCreateWriteStream.mockReturnValue(mockWriteStream);

			// Mock form data
			mockFormData.mockImplementation(function () {
				return {
					append: vi.fn(),
					getHeaders: vi.fn().mockReturnValue({}),
				};
			});

			// Mock successful upload
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: 1 }),
			});

			// Set environment variable
			process.env.GITEA_TOKEN = "test-token";

			await pluginWithPrivates.uploadAssets(123);

			// Verify archive.file was called with correct paths
			expect(mockArchive.file).toHaveBeenCalledWith(
				"/xgj/project/dist/js/app.js.map",
				{
					name: "dist/js/app.js.map",
				},
			);
			expect(mockArchive.file).toHaveBeenCalledWith(
				"/xgj/project/dist/css/style.css.map",
				{
					name: "dist/css/style.css.map",
				},
			);

			expect(plugin.log.info).toHaveBeenCalledWith("开始上传 1 个附件...");
			expect(plugin.log.info).toHaveBeenCalledWith("✅ 所有附件处理完成");
		});

		it("should continue processing other assets when one fails", async () => {
			const mockAssets = [
				{
					path: "nonexistent/file.txt",
					type: "file" as const,
				},
				{
					path: "dist/app.js",
					type: "file" as const,
				},
			];

			// Mock giteaConfig
			Object.defineProperty(pluginWithPrivates, "giteaConfig", {
				get: () => ({
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					assets: mockAssets,
					tokenRef: "GITEA_TOKEN",
					timeout: 30000,
				}),
				configurable: true,
			});

			// Mock file system - first call fails, second succeeds
			mockGlob
				.mockResolvedValueOnce([]) // No files found for first asset
				.mockResolvedValueOnce(["dist/app.js"]); // File found for second asset

			mockStatSync.mockReturnValue({ isFile: () => true });

			// Mock form data
			mockFormData.mockImplementation(function () {
				return {
					append: vi.fn(),
					getHeaders: vi.fn().mockReturnValue({}),
				};
			});
			mockCreateReadStream.mockReturnValue({});

			// Mock successful upload for second asset
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ id: 1 }),
			});

			// Set environment variable
			process.env.GITEA_TOKEN = "test-token";

			await pluginWithPrivates.uploadAssets(123);

			// Should log warning for first asset
			expect(plugin.log.warn).toHaveBeenCalledWith(
				"没有找到匹配的文件: nonexistent/file.txt",
			);

			// Should continue with second asset
			expect(plugin.log.info).toHaveBeenCalledWith("开始上传 2 个附件...");
			expect(plugin.log.info).toHaveBeenCalledWith("✅ 所有附件处理完成");
		});

		it("should handle upload errors gracefully", async () => {
			const mockAssets = [
				{
					path: "dist/app.js",
					type: "file" as const,
				},
			];

			// Mock giteaConfig
			Object.defineProperty(pluginWithPrivates, "giteaConfig", {
				get: () => ({
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					assets: mockAssets,
					tokenRef: "GITEA_TOKEN",
					timeout: 30000,
				}),
				configurable: true,
			});

			// Mock file system
			mockGlob.mockResolvedValue(["dist/app.js"]);
			mockStatSync.mockReturnValue({ isFile: () => true });

			// Mock form data
			mockFormData.mockImplementation(function () {
				return {
					append: vi.fn(),
					getHeaders: vi.fn().mockReturnValue({}),
				};
			});
			mockCreateReadStream.mockReturnValue({});

			// Mock failed upload
			mockFetch.mockResolvedValue({
				ok: false,
				status: 500,
				text: () => Promise.resolve("Server error"),
			});

			// Set environment variable
			process.env.GITEA_TOKEN = "test-token";

			await pluginWithPrivates.uploadAssets(123);

			// Should log error but continue processing
			expect(plugin.log.error).toHaveBeenCalledWith(
				expect.stringContaining("附件处理失败"),
			);
			expect(plugin.log.info).toHaveBeenCalledWith("✅ 所有附件处理完成");
		});
	});
});
