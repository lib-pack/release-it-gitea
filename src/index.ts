import { Plugin } from "release-it";

class GiteaPlugin extends Plugin {
	static isEnabled(): boolean {
		return true;
	}
}

export default GiteaPlugin;
