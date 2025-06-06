import type { Config, Context } from "release-it";
import fetch from "node-fetch";

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
}

// Mock node-fetch
vi.mock("node-fetch", () => ({
	default: vi.fn(),
}));

const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;

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

		getContext(key?: string): any {
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
			getContext: vi.fn((key?: string) => {
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
			mockConfig.getContext = vi.fn().mockReturnValue(null);

			expect(
				() => (plugin as unknown as GiteaPluginWithPrivates).giteaConfig,
			).toThrow("Gitea 配置未找到");
		});

		it("should throw error when host is missing", () => {
			mockConfig.getContext = vi.fn((key?: string) => {
				if (key === "repo") {
					return mockContext.repo;
				}
				return {
					owner: "testowner",
					repository: "testrepo",
				};
			});

			expect(
				() => (plugin as unknown as GiteaPluginWithPrivates).giteaConfig,
			).toThrow("Gitea host 配置是必需的");
		});

		it("should throw error when owner is missing", () => {
			mockConfig.getContext = vi.fn((key?: string) => {
				if (key === "repo") {
					return { repository: "testrepo" };
				}
				return {
					host: "https://gitea.example.com",
					repository: "testrepo",
				};
			});

			expect(
				() => (plugin as unknown as GiteaPluginWithPrivates).giteaConfig,
			).toThrow("Gitea owner 配置是必需的");
		});

		it("should throw error when repository is missing", () => {
			mockConfig.getContext = vi.fn((key?: string) => {
				if (key === "repo") {
					return { owner: "testowner" };
				}
				return {
					host: "https://gitea.example.com",
					owner: "testowner",
				};
			});

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
			mockConfig.getContext = vi.fn((key?: string) => {
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
			mockConfig.getContext = vi.fn((key?: string) => {
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
			mockConfig.getContext = vi.fn((key?: string) => {
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
			mockConfig.getContext = vi.fn((key?: string) => {
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
				getContext: vi.fn((key?: string) => {
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
			// Create a new plugin instance with proper mock for this test
			const testMockConfig = {
				getContext: vi.fn((key?: string) => {
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

			const mockRelease = {
				id: 1,
				html_url:
					"https://gitea.example.com/testowner/testrepo/releases/tag/v1.0.0",
				tag_name: "v1.0.0",
			};

			// Mock releaseExists to return true
			mockFetch
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ id: 1 }),
				} as any)
				// Mock updateRelease
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve(mockRelease),
				} as any);

			await testPlugin.release();

			expect(testPlugin.log.info).toHaveBeenCalledWith(
				"发布 v1.0.0 已存在，正在更新...",
			);
			expect(testPlugin.log.info).toHaveBeenCalledWith(
				"✅ Gitea 发布创建成功: https://gitea.example.com/testowner/testrepo/releases/tag/v1.0.0",
			);
		});

		it("should handle release creation errors", async () => {
			// Create a new plugin instance with proper mock for this test
			const testMockConfig = {
				getContext: vi.fn((key?: string) => {
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
			mockConfig.getContext = vi.fn((key?: string) => {
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
			mockConfig.getContext = vi.fn((key?: string) => {
				if (key === "releaseUrl") {
					return undefined;
				}
				return key ? mockContext[key] : mockContext;
			});

			await plugin.afterRelease();

			expect(plugin.log.info).not.toHaveBeenCalled();
		});
	});
});
