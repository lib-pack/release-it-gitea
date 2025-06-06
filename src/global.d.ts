declare module "release-it" {
	class Plugin {
		static disablePlugin() {}
		static isEnabled() {}
		afterRelease();
		beforeBump() {}
		beforeRelease() {}
		bump() {}
		getIncrement() {}
		getIncrementedVersion() {}
		getIncrementedVersionCI() {}
		getInitialOptions() {}
		getLatestVersion() {}
		getName() {}
		init() {}
		release() {}
	}
}
