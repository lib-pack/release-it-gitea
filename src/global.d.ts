declare module "release-it" {
	interface Config {
		getContext(): Context;
		getContext(path: string): unknown;
		isDryRun: boolean;
		options: {
			plugins: {
				"release-it-gitea"?: GiteaConfig;
			};
		};
		setContext(path: string, value: unknown): void;
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

		constructor(config: Config);

		static disablePlugin(): void;
		static isEnabled(config?: GiteaConfig): boolean;
		afterRelease(): Promise<void>;
		beforeBump(): Promise<void>;
		beforeRelease(): Promise<void>;
		bump(): Promise<void>;
		getContext(path?: string): unknown;
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

/** 附件配置接口 */
interface GiteaAssetConfig {
	/** 文件或文件夹路径，支持通配符 */
	path: string;

	/** 上传后的文件名，如果不指定则使用原文件名 */
	name?: string;

	/** 文件类型：'file' 表示单个文件，'zip' 表示打包成 zip 文件 */
	type?: "file" | "zip";

	/** 文件标签，用于标识文件用途 */
	label?: string;
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
	releaseTitle?: ((context: Context) => string) | string;

	/** 发布说明的模板字符串，支持变量替换 */
	releaseNotes?: ((context: Context) => string) | string;

	/** 是否标记为预发布版本 */
	prerelease?: boolean;

	/** 是否创建为草稿状态 */
	draft?: boolean;

	/** 存储 API token 的环境变量名称 */
	tokenRef?: string;

	/** API 请求的超时时间，单位为毫秒 */
	timeout?: number;

	/** 要上传的附件列表 */
	assets?: (GiteaAssetConfig | string)[];

	/**
	 * 指定需要从上下文中动态合并的配置项键名列表
	 *
	 * 允许其他插件通过 `this.config.setContext({ "release-it-gitea": { ... } })`
	 * 动态设置配置值，本插件会自动合并这些配置。
	 *
	 * - 对于数组类型（如 assets），会将上下文中的值与配置文件中的值合并
	 * - 对于非数组类型，上下文中的值会覆盖配置文件中的值
	 * @example
	 * ```json
	 * {
	 *   "mergeOptionsKeys": ["assets", "releaseNotes"]
	 * }
	 * ```
	 *
	 * 其他插件可以这样设置：
	 * ```typescript
	 * this.config.setContext({
	 *   "release-it-gitea": {
	 *     assets: ["path/to/file.zip"]
	 *   }
	 * });
	 * ```
	 */
	mergeOptionsKeys?: (keyof GiteaConfig)[];
}
