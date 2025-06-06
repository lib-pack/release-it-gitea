import { execSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock node-fetch for E2E tests
const mockFetch = vi.fn();
vi.mock("node-fetch", () => ({
	default: mockFetch,
}));

describe("End-to-End Tests with release-it", () => {
	const testDir = join(process.cwd(), "test-temp");
	const originalCwd = process.cwd();
	const originalEnv = process.env;

	beforeEach(() => {
		// Create test directory
		rmSync(testDir, { recursive: true, force: true });
		mkdirSync(testDir, { recursive: true });
		process.chdir(testDir);

		// Set up environment
		process.env = { ...originalEnv };
		process.env.GITEA_TOKEN = "test-token-123";

		// Reset mocks
		vi.clearAllMocks();

		// Initialize git repository
		execSync("git init", { stdio: "pipe" });
		execSync("git config user.name 'Test User'", { stdio: "pipe" });
		execSync("git config user.email 'test@example.com'", { stdio: "pipe" });

		// Create package.json
		const packageJson = {
			name: "test-package",
			version: "1.0.0",
			description: "Test package for release-it-gitea",
			main: "index.js",
			scripts: {
				release: "release-it",
			},
			devDependencies: {
				"release-it": "^19.0.3",
			},
		};
		writeFileSync("package.json", JSON.stringify(packageJson, null, 2));

		// Create release-it config
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
				"../lib/index.js": {
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					release: true,
					releaseTitle: "Release v${version}",
					releaseNotes: "## Changes\n\n${changelog}",
				},
			},
		};
		writeFileSync(".release-it.json", JSON.stringify(releaseItConfig, null, 2));

		// Add git remote
		execSync(
			"git remote add origin https://gitea.example.com/testowner/testrepo.git",
			{ stdio: "pipe" },
		);

		// Create initial commit
		writeFileSync("README.md", "# Test Package\n\nThis is a test package.");
		execSync("git add .", { stdio: "pipe" });
		execSync("git commit -m 'Initial commit'", { stdio: "pipe" });

		// Create a tag to simulate existing releases
		execSync("git tag v1.0.0", { stdio: "pipe" });

		// Create remote tracking branch reference to avoid upstream errors
		execSync("git update-ref refs/remotes/origin/main HEAD", { stdio: "pipe" });
		execSync("git branch --set-upstream-to=origin/main main", {
			stdio: "pipe",
		});
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(testDir, { recursive: true, force: true });
		process.env = originalEnv;
	});

	it("should work with release-it in dry-run mode", async () => {
		// Mock successful API responses
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ id: 1, name: "testrepo" }),
			})
			.mockRejectedValueOnce(new Error("404")) // Release doesn't exist
			.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						id: 123,
						tag_name: "v1.0.1",
						name: "Release v1.0.1",
						html_url:
							"https://gitea.example.com/testowner/testrepo/releases/tag/v1.0.1",
					}),
			});

		// Run release-it in dry-run mode
		const output = execSync("npx release-it --dry-run --ci", {
			encoding: "utf8",
			stdio: "pipe",
		});

		expect(output).toContain("🚀 Let's release");
		expect(output).toContain("🏁 Done");
		expect(mockFetch).toHaveBeenCalledTimes(0); // No actual API calls in dry-run
	});

	it("should integrate with conventional-changelog", async () => {
		// Install conventional-changelog plugin
		execSync("npm install --no-save @release-it/conventional-changelog", {
			stdio: "pipe",
		});

		// Update config to include conventional-changelog
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
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					release: true,
					releaseTitle: "Release v${version}",
					releaseNotes: "${changelog}",
				},
			},
		};
		writeFileSync(".release-it.json", JSON.stringify(releaseItConfig, null, 2));

		// Add some conventional commits
		writeFileSync("feature.js", "console.log('new feature');");
		execSync("git add .", { stdio: "pipe" });
		execSync("git commit -m 'feat: add new feature'", { stdio: "pipe" });

		writeFileSync("bugfix.js", "console.log('bug fixed');");
		execSync("git add .", { stdio: "pipe" });
		execSync("git commit -m 'fix: resolve critical bug'", { stdio: "pipe" });

		// Mock API responses
		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ id: 1, name: "testrepo" }),
			})
			.mockRejectedValueOnce(new Error("404"))
			.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						id: 123,
						tag_name: "v1.1.0",
						name: "Release v1.1.0",
						html_url:
							"https://gitea.example.com/testowner/testrepo/releases/tag/v1.1.0",
					}),
			});

		// Run release-it in dry-run mode
		const output = execSync("npx release-it --dry-run --ci", {
			encoding: "utf8",
			stdio: "pipe",
		});

		expect(output).toContain("🚀 Let's release");
		expect(output).toContain("🏁 Done");
		expect(output).toContain("Changelog:");
		// In a real scenario, this would generate a changelog with the conventional commits
	});

	it("should handle configuration validation", async () => {
		// Create invalid config (missing host)
		const invalidConfig = {
			plugins: {
				"../lib/index.js": {
					owner: "testowner",
					repository: "testrepo",
					release: true,
				},
			},
		};
		writeFileSync(".release-it.json", JSON.stringify(invalidConfig, null, 2));

		// This should fail due to missing host
		expect(() => {
			execSync("npx release-it --dry-run --ci", {
				encoding: "utf8",
				stdio: "pipe",
			});
		}).toThrow();
	});

	it("should work with custom token environment variable", async () => {
		// Set custom token environment variable
		process.env.CUSTOM_GITEA_TOKEN = "custom-token-456";
		delete process.env.GITEA_TOKEN;

		// Update config to use custom token reference
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
				"../lib/index.js": {
					host: "https://gitea.example.com",
					owner: "testowner",
					repository: "testrepo",
					release: true,
					tokenRef: "CUSTOM_GITEA_TOKEN",
				},
			},
		};
		writeFileSync(".release-it.json", JSON.stringify(releaseItConfig, null, 2));

		// Mock API responses
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ id: 1, name: "testrepo" }),
		});

		// Run release-it in dry-run mode
		const output = execSync("npx release-it --dry-run --ci", {
			encoding: "utf8",
			stdio: "pipe",
		});

		expect(output).toContain("🚀 Let's release");
		expect(output).toContain("🏁 Done");
	});
});
