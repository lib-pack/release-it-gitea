import type { Config, Context } from "release-it";

import { beforeEach, describe, expect, it, vi } from "vitest";

import GiteaPlugin from "./index.js";

// Type for accessing private methods in tests
interface GiteaPluginWithPrivates {
	buildApiUrl: (endpoint: string) => string;
	interpolate: (template: string) => string;
}

// Mock node-fetch
vi.mock("node-fetch", () => ({
	default: vi.fn(),
}));

// Mock release-it Plugin base class
vi.mock("release-it", () => ({
	Plugin: class MockPlugin {
		config: Config;
		context: Context;
		log: {
			error: (message: string) => void;
			exec: (command: string) => void;
			info: (message: string) => void;
			verbose: (message: string) => void;
			warn: (message: string) => void;
		};
		shell: {
			exec: (command: string) => Promise<string>;
		};

		constructor(config: Config) {
			this.config = config;
			// Initialize with default context
			this.context = {
				branchName: "main",
				changelog: "Test changelog",
				latestVersion: "0.9.0",
				name: "test-package",
				repo: {
					host: "gitea.example.com",
					owner: "testowner",
					project: "testrepo",
					protocol: "https",
					remote: "origin",
					repository: "testrepo",
				},
				version: "1.0.0",
			};
			// Initialize with mock log
			this.log = {
				error: vi.fn(),
				exec: vi.fn(),
				info: vi.fn(),
				verbose: vi.fn(),
				warn: vi.fn(),
			};
			// Initialize with mock shell
			this.shell = {
				exec: vi.fn(),
			};
		}

		static isEnabled(): boolean {
			return true;
		}

		async afterRelease(): Promise<void> {
			// Mock implementation
		}
		async init(): Promise<void> {
			// Mock implementation
		}
		async release(): Promise<void> {
			// Mock implementation
		}
	},
}));

describe("GiteaPlugin", () => {
	let plugin: GiteaPlugin;
	let mockConfig: Config;

	beforeEach(() => {
		mockConfig = {
			gitea: {
				host: "https://gitea.example.com",
				owner: "testowner",
				release: true,
				repository: "testrepo",
			},
		};

		plugin = new GiteaPlugin(mockConfig);
	});

	describe("isEnabled", () => {
		it("should return true when gitea.release is true", () => {
			expect(
				GiteaPlugin.isEnabled({
					gitea: {
						host: "test",
						owner: "test",
						release: true,
						repository: "test",
					},
				}),
			).toBe(true);
		});

		it("should return false when gitea.release is false", () => {
			expect(
				GiteaPlugin.isEnabled({
					gitea: {
						host: "test",
						owner: "test",
						release: false,
						repository: "test",
					},
				}),
			).toBe(false);
		});

		it("should return false when gitea config is missing", () => {
			expect(GiteaPlugin.isEnabled({})).toBe(false);
		});
	});

	describe("constructor", () => {
		it("should initialize with valid config", () => {
			expect(plugin).toBeInstanceOf(GiteaPlugin);
		});

		it("should throw error when gitea config is missing", () => {
			expect(() => new GiteaPlugin({})).toThrow("Gitea 配置未找到");
		});

		it("should throw error when host is missing", () => {
			const invalidConfig: Config = {
				gitea: {
					owner: "testowner",
					repository: "testrepo",
					// host is missing intentionally to test error
				} as Config["gitea"],
			};
			expect(() => new GiteaPlugin(invalidConfig)).toThrow(
				"Gitea host 配置是必需的",
			);
		});
	});

	describe("interpolate", () => {
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
			const configWithSlash: Config = {
				gitea: {
					host: "https://gitea.example.com/",
					owner: "testowner",
					repository: "testrepo",
				},
			};
			const pluginWithSlash = new GiteaPlugin(configWithSlash);

			const endpoint = "/test";
			const result = (
				pluginWithSlash as unknown as GiteaPluginWithPrivates
			).buildApiUrl(endpoint);
			expect(result).toBe("https://gitea.example.com/api/v1/test");
		});
	});
});
