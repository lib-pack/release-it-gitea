declare module "release-it" {
	interface Config {
		getContext(path: string): GiteaConfig;
	}

	interface Context {
		branchName: string;
		changelog: string;
		latestVersion: string;
		name: string;
		releaseUrl?: string;
		repo: {
			host: string;
			owner: string;
			project: string;
			protocol: string;
			remote: string;
			repository: string;
		};
		version: string;
	}

	class Plugin {
		config: Config;
		context: Context;
		log: {
			error: (message: string) => void;
			exec: (command: string) => void;
			info: (message: string) => void;
			verbose: (message: string) => void;
			warn: (message: string) => void;
		};
		options: GiteaConfig;
		shell: {
			exec: (command: string) => Promise<string>;
		};

		constructor(config: Config);

		static disablePlugin(): void;
		static isEnabled(config?: GiteaConfig): boolean;
		afterRelease(): Promise<void>;
		beforeBump(): Promise<void>;
		beforeRelease(): Promise<void>;
		bump(): Promise<void>;
		getIncrement(): string;
		getIncrementedVersion(): string;
		getIncrementedVersionCI(): string;
		getInitialOptions(): unknown;
		getLatestVersion(): string;
		getName(): string;
		init(): Promise<void>;
		release(): Promise<void>;
	}
}

interface GiteaConfig {
	/** Gitea 服务器的完整 URL 地址 */
	host: string;

	/** 仓库所有者的用户名或组织名 */
	owner: string;

	/** 仓库名称 */
	repository: string;

	/** 是否启用发布创建功能 */
	release?: boolean;

	/** 发布标题的模板字符串，支持变量替换 */
	releaseTitle?: string;

	/** 发布说明的模板字符串，支持变量替换 */
	releaseNotes?: string;

	/** 是否标记为预发布版本 */
	prerelease?: boolean;

	/** 是否创建为草稿状态 */
	draft?: boolean;

	/** 存储 API token 的环境变量名称 */
	tokenRef?: string;

	/** API 请求的超时时间，单位为毫秒 */
	timeout?: number;
}
