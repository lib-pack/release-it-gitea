import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		clearMocks: true,
		coverage: {
			enabled: true,
			provider: "v8",
			include: ["src"],
			reporter: ["html", "lcov"],
		},
		exclude: ["lib", "node_modules"],
		setupFiles: ["console-fail-test/setup"],
		testTimeout: 30000, // 30 seconds timeout for tests that install packages
	},
});
