declare module "release-it" {
	/**
	 * release-it 配置接口
	 * 提供获取和设置上下文、访问配置选项等功能
	 */
	interface Config {
		/** 获取完整的上下文对象 */
		getContext(): Context;
		/** 根据路径获取上下文中的特定值 */
		getContext(path: string): unknown;
		/** 是否为模拟运行模式 */
		isDryRun: boolean;
		/** 配置选项 */
		options: {
			/** 插件配置 */
			plugins: {
				"release-it-gitea"?: GiteaConfig;
			};
		};
		/** 设置上下文值，支持对象形式或键值对形式 */
		setContext(path: string, value: unknown): void;
		/** 设置上下文对象 */
		setContext(context: Record<string, unknown>): void;
	}

	/**
	 * release-it 上下文接口
	 * 包含发布过程中的所有运行时信息
	 */
	interface Context {
		/** 当前分支名称 */
		branchName: string;
		/** 生成的变更日志内容 */
		changelog: string;
		/** 上一个版本号 */
		latestVersion: string;
		/** 项目名称 */
		name: string;
		/** 发布 URL（发布完成后可用） */
		releaseUrl?: string;
		/** 仓库相关信息 */
		repo: {
			/** 仓库主机地址 */
			host: string;
			/** 仓库所有者 */
			owner: string;
			/** 项目名称 */
			project: string;
			/** 仓库协议（http/https） */
			protocol: string;
			/** 远程仓库名称 */
			remote: string;
			/** 仓库名称 */
			repository: string;
		};
		/** 当前版本号 */
		version: string;
	}

	/**
	 * release-it 插件基类
	 * 所有插件都应该继承此类
	 */
	class Plugin {
		/** 配置对象 */
		config: Config;
		/** 日志工具 */
		log: {
			/** 输出错误信息 */
			error: (message: string) => void;
			/** 输出命令执行信息 */
			exec: (command: string) => void;
			/** 输出普通信息 */
			info: (message: string) => void;
			/** 输出详细信息 */
			verbose: (message: string) => void;
			/** 输出警告信息 */
			warn: (message: string) => void;
		};
		/** Shell 命令执行工具 */
		shell: {
			/** 执行 shell 命令 */
			exec: (command: string) => Promise<string>;
		};

		constructor(config: Config);

		/** 禁用插件 */
		static disablePlugin(): void;
		/** 判断插件是否启用 */
		static isEnabled(config?: GiteaConfig): boolean;
		/** 发布完成后的钩子 */
		afterRelease(): Promise<void>;
		/** 版本号提升前的钩子 */
		beforeBump(): Promise<void>;
		/** 发布前的钩子 */
		beforeRelease(): Promise<void>;
		/** 提升版本号 */
		bump(): Promise<void>;
		/** 获取上下文值 */
		getContext(path?: string): unknown;
		/** 获取版本增量类型 */
		getIncrement(): string;
		/** 获取增量后的版本号 */
		getIncrementedVersion(): string;
		/** 在 CI 环境中获取增量后的版本号 */
		getIncrementedVersionCI(): string;
		/** 获取初始配置选项 */
		getInitialOptions(): unknown;
		/** 获取最新版本号 */
		getLatestVersion(): string;
		/** 获取项目名称 */
		getName(): string;
		/** 初始化插件 */
		init(): Promise<void>;
		/** 执行发布操作 */
		release(): Promise<void>;
	}
}

/**
 * Gitea 附件配置接口
 * 定义上传到 Gitea 发布的附件配置
 */
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

/**
 * Gitea 插件配置接口
 * 定义 release-it-gitea 插件的所有配置选项
 */
interface GiteaConfig {
	/** Gitea 服务器的完整 URL 地址 */
	host: string;

	/** 仓库所有者的用户名或组织名 */
	owner: string;

	/** 仓库名称 */
	repository: string;

	/** 是否启用发布创建功能 */
	release?: boolean;

	/**
	 * 发布标题的模板字符串或函数
	 * - 字符串：支持变量替换，如 "v${version}"
	 * - 函数：接收 context 参数，返回标题字符串
	 * - npm 包：使用 "npm:package-name" 格式引用外部包
	 */
	releaseTitle?: ((context: Context) => string) | string;

	/**
	 * 发布说明的模板字符串或函数
	 * - 字符串：支持变量替换和 Markdown 格式
	 * - 函数：接收 context 参数，返回发布说明字符串
	 * - npm 包：使用 "npm:package-name" 格式引用外部包
	 */
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
