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
		options: GiteaConfig;
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
			// Initialize with mock options (this simulates how release-it passes plugin config)
			this.options = {
				host: "https://gitea.example.com",
				owner: "testowner",
				repository: "testrepo",
				release: true,
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
			getContext: vi.fn().mockReturnValue({
				host: "https://gitea.example.com",
				owner: "testowner",
				repository: "testrepo",
				release: true,
			}),
		} as unknown as Config;

		plugin = new GiteaPlugin(mockConfig);
		// Override options for testing
		(plugin as any).options = {
			host: "https://gitea.example.com",
			owner: "testowner",
			repository: "testrepo",
			release: true,
		};
	});

	describe("isEnabled", () => {
		it("should return true when host is provided", () => {
			expect(
				GiteaPlugin.isEnabled({
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
				}),
			).toBe(true);
		});

		it("should return false when host is missing", () => {
			expect(
				GiteaPlugin.isEnabled({
					owner: "testowner",
					repository: "testrepo",
				} as GiteaConfig),
			).toBe(false);
		});

		it("should return false when config is undefined", () => {
			expect(GiteaPlugin.isEnabled(undefined)).toBe(false);
		});
	});

	describe("constructor", () => {
		it("should initialize with valid config", () => {
			expect(plugin).toBeInstanceOf(GiteaPlugin);
		});

		it("should throw error when gitea config is missing", () => {
			const pluginWithoutOptions = new GiteaPlugin(mockConfig);
			(pluginWithoutOptions as any).options = undefined;

			expect(() => (pluginWithoutOptions as any).getGiteaConfig()).toThrow(
				"Gitea 配置未找到",
			);
		});

		it("should throw error when host is missing", () => {
			const pluginWithMissingHost = new GiteaPlugin(mockConfig);
			(pluginWithMissingHost as any).options = {
				owner: "testowner",
				repository: "testrepo",
			};

			expect(() => (pluginWithMissingHost as any).getGiteaConfig()).toThrow(
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
			const pluginWithSlash = new GiteaPlugin(mockConfig);
			(pluginWithSlash as any).options = {
				host: "https://gitea.example.com/",
				owner: "testowner",
				repository: "testrepo",
			};

			const endpoint = "/test";
			const result = (
				pluginWithSlash as unknown as GiteaPluginWithPrivates
			).buildApiUrl(endpoint);
			expect(result).toBe("https://gitea.example.com/api/v1/test");
		});
	});
});
