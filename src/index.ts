import archiver from "archiver";
import FormData from "form-data";
import { createReadStream, createWriteStream, statSync } from "fs";
import { glob } from "glob";
import fetch from "node-fetch";
import { basename, dirname, join } from "path";
import { Plugin } from "release-it";

interface GiteaRelease {
	body: string;
	draft: boolean;
	name: string;
	prerelease: boolean;
	tag_name: string;
}

interface GiteaReleaseResponse {
	body: string;
	created_at: string;
	draft: boolean;
	html_url: string;
	id: number;
	name: string;
	prerelease: boolean;
	published_at: string;
	tag_name: string;
	url: string;
}

class GiteaPlugin extends Plugin {
	static isEnabled(config?: GiteaConfig): boolean {
		return config?.release !== false;
	}

	/**
	 * 获取并验证 Gitea 配置信息
	 * @returns 验证后的 Gitea 配置对象
	 */
	private get giteaConfig(): GiteaConfig {
		const gitea = this.getContext() as GiteaConfig;

		if (!gitea) {
			throw new Error("Gitea 配置未找到");
		}

		const repo = this.config.getContext("repo") as {
			host: string;
			owner: string;
			project: string;
			repository: string;
		};

		// 设置默认值
		let config: GiteaConfig = {
			assets: gitea.assets ?? [],
			draft: gitea.draft ?? false,
			host: gitea.host ?? repo.host,
			owner: gitea.owner ?? repo.owner,
			prerelease: gitea.prerelease ?? false,
			release: gitea.release !== false,
			releaseNotes: gitea.releaseNotes ?? "${changelog}",
			releaseTitle: gitea.releaseTitle ?? "v${version}",
			repository: gitea.repository ?? repo.project,
			timeout: gitea.timeout ?? 30000,
			tokenRef: gitea.tokenRef ?? "GITEA_TOKEN",
		};

		if (gitea.mergeOptionsKeys?.length) {
			this.log.verbose(
				`开始合并动态配置，mergeOptionsKeys: ${JSON.stringify(gitea.mergeOptionsKeys)}`,
			);
			const dynReleaseItGiteaConfig = (
				this.config.getContext() as unknown as {
					"release-it-gitea": Partial<GiteaConfig>;
				}
			)?.["release-it-gitea"];
			this.log.verbose(
				`从上下文获取到的动态配置: ${JSON.stringify(dynReleaseItGiteaConfig)}`,
			);
			// 从 config.options 动态读取 assets，以支持其他插件动态添加附件
			if (dynReleaseItGiteaConfig) {
				for (const option of gitea.mergeOptionsKeys) {
					if (option in dynReleaseItGiteaConfig) {
						const dynValue = dynReleaseItGiteaConfig[option];
						const currentValue = config[option];
						this.log.verbose(
							`合并配置项 "${option}": 动态值=${JSON.stringify(dynValue)}, 当前值=${JSON.stringify(currentValue)}`,
						);

						if (Array.isArray(dynValue)) {
							// 对于数组类型，合并两个数组
							const mergedArray = Array.isArray(currentValue)
								? [...dynValue, ...currentValue]
								: dynValue;
							config = { ...config, [option]: mergedArray };
							this.log.verbose(
								`数组类型合并完成，最终值: ${JSON.stringify(mergedArray)}`,
							);
						} else if (dynValue !== undefined) {
							// 对于非数组类型，直接覆盖
							config = { ...config, [option]: dynValue };
							this.log.verbose(
								`非数组类型覆盖完成，最终值: ${JSON.stringify(dynValue)}`,
							);
						}
					} else {
						this.log.verbose(`配置项 "${option}" 在动态配置中不存在，跳过`);
					}
				}
			} else {
				this.log.verbose("未从上下文中获取到动态配置");
			}
		}

		// 验证必需的配置
		if (!config.host) {
			throw new Error("Gitea host 配置是必需的");
		}
		if (!config.owner) {
			throw new Error("Gitea owner 配置是必需的");
		}
		if (!config.repository) {
			throw new Error("Gitea repository 配置是必需的");
		}

		return config;
	}

	/**
	 * 从环境变量获取 API token.
	 * @returns API token 字符串
	 * @throws 当 token 不存在时抛出错误
	 */
	private getToken(): string {
		const tokenRef = this.giteaConfig.tokenRef;
		if (!tokenRef) {
			throw new Error("Token 环境变量名未配置");
		}

		const token = process.env[tokenRef];
		if (!token) {
			throw new Error(`Gitea API token 未找到。请设置环境变量 ${tokenRef}`);
		}
		return token;
	}

	/**
	 * 构建完整的 API 请求 URL.
	 * @param endpoint API 端点路径
	 * @returns 完整的 API URL
	 */
	private buildApiUrl(endpoint: string): string {
		let host = this.giteaConfig.host.replace(/\/$/, "");
		if (!host.startsWith("http")) {
			host = `https://${host}`;
		}
		return `${host}/api/v1${endpoint}`;
	}

	/**
	 * 发送 HTTP 请求到 Gitea API.
	 * @param endpoint API 端点路径
	 * @param options 请求选项
	 * @param options.body 请求体数据
	 * @param options.method HTTP 方法
	 * @returns API 响应数据
	 * @throws 当请求失败时抛出错误
	 */
	private async apiRequest(
		endpoint: string,
		options: {
			body?: unknown;
			method?: string;
		} = {},
	): Promise<unknown> {
		const url = this.buildApiUrl(endpoint);
		const token = this.getToken();

		const requestOptions = {
			body: options.body ? JSON.stringify(options.body) : undefined,
			headers: {
				Accept: "application/json",
				Authorization: `token ${token}`,
				"Content-Type": "application/json",
			},
			method: options.method ?? "GET",
			timeout: this.giteaConfig.timeout,
		};

		this.log.verbose(
			`发送 ${requestOptions.method} 请求到: ${url} 参数:${requestOptions.body ?? "none"}`,
		);

		try {
			const response = await fetch(url, requestOptions);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`Gitea API 请求失败 (${String(response.status)}): ${errorText}`,
				);
			}

			const data = await response.json();
			return data;
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Gitea API 请求失败: ${error.message}`);
			}
			throw error;
		}
	}

	/**
	 * 检查指定标签的发布是否已存在.
	 * @param tagName Git 标签名
	 * @returns 发布是否存在
	 * @throws 当 API 请求失败时抛出错误
	 */
	private async releaseExists(tagName: string): Promise<boolean> {
		try {
			const endpoint = `/repos/${this.giteaConfig.owner}/${this.giteaConfig.repository}/releases/tags/${tagName}`;
			await this.apiRequest(endpoint);
			return true;
		} catch (error) {
			// 如果是 404 错误，说明发布不存在
			if (error instanceof Error && error.message.includes("404")) {
				return false;
			}
			throw error;
		}
	}

	/**
	 * 创建新的 Gitea 发布.
	 * @param releaseData 发布数据
	 * @returns 创建的发布信息
	 * @throws 当创建失败时抛出错误
	 */
	private async createRelease(
		releaseData: GiteaRelease,
	): Promise<GiteaReleaseResponse> {
		const endpoint = `/repos/${this.giteaConfig.owner}/${this.giteaConfig.repository}/releases`;
		return (await this.apiRequest(endpoint, {
			body: releaseData,
			method: "POST",
		})) as GiteaReleaseResponse;
	}

	/**
	 * 更新已存在的 Gitea 发布.
	 * @param tagName Git 标签名
	 * @param releaseData 更新的发布数据
	 * @returns 更新后的发布信息
	 * @throws 当更新失败时抛出错误
	 */
	private async updateRelease(
		tagName: string,
		releaseData: Partial<GiteaRelease>,
	): Promise<GiteaReleaseResponse> {
		const endpoint = `/repos/${this.giteaConfig.owner}/${this.giteaConfig.repository}/releases/tags/${tagName}`;
		return (await this.apiRequest(endpoint, {
			body: releaseData,
			method: "PATCH",
		})) as GiteaReleaseResponse;
	}

	/**
	 * 替换模板字符串中的变量占位符.
	 * @param template 包含变量占位符的模板字符串
	 * @returns 替换变量后的字符串
	 */
	private interpolate(template: string): string {
		const context = this.config.getContext();
		return template
			.replace(/\$\{version\}/g, context.version)
			.replace(/\$\{latestVersion\}/g, context.latestVersion)
			.replace(/\$\{changelog\}/g, context.changelog)
			.replace(/\$\{name\}/g, context.name)
			.replace(/\$\{repo\.owner\}/g, context.repo.owner)
			.replace(/\$\{repo\.repository\}/g, context.repo.repository)
			.replace(/\$\{branchName\}/g, context.branchName);
	}

	/**
	 * 解析附件配置，将字符串格式转换为标准配置对象
	 * @param asset 附件配置
	 * @returns 标准化的附件配置对象
	 */
	private normalizeAssetConfig(
		asset: GiteaAssetConfig | string,
	): GiteaAssetConfig {
		if (typeof asset === "string") {
			return {
				path: asset,
				type: "file",
			};
		}
		return {
			type: "file",
			...asset,
		};
	}

	/**
	 * 根据路径模式匹配文件
	 * @param pattern 文件路径模式，支持通配符
	 * @returns 匹配到的文件路径数组
	 */
	private async resolveFiles(pattern: string): Promise<string[]> {
		try {
			const files = await glob(pattern, {
				absolute: true,
				nodir: true,
			});
			return files;
		} catch (error) {
			this.log.warn(`文件匹配失败: ${pattern}, 错误: ${String(error)}`);
			return [];
		}
	}

	/**
	 * 创建 ZIP 压缩包
	 * @param files 要压缩的文件列表
	 * @param outputPath 输出的 ZIP 文件路径
	 * @param basePath 基础路径，用于确定文件在压缩包中的相对路径
	 * @returns Promise&lt;void>
	 */
	private async createZipArchive(
		files: string[],
		outputPath: string,
		basePath?: string,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const output = createWriteStream(outputPath);
			const archive = archiver("zip", {
				zlib: { level: 9 },
			});

			output.on("close", () => {
				this.log.verbose(
					`ZIP 文件创建完成: ${outputPath} (${String(archive.pointer())} bytes)`,
				);
				resolve();
			});

			archive.on("error", (err) => {
				reject(err);
			});

			archive.pipe(output);

			// 添加文件到压缩包
			for (const file of files) {
				const stats = statSync(file);
				if (stats.isFile()) {
					const relativePath = basePath
						? join(basePath, file.split(basePath)[1])
						: basename(file);
					archive.file(file, { name: relativePath });
				}
			}

			void archive.finalize();
		});
	}

	/**
	 * 上传单个附件到 Gitea 发布
	 * @param releaseId 发布 ID
	 * @param filePath 文件路径
	 * @param fileName 上传后的文件名
	 * @param label 文件标签
	 * @returns 上传结果
	 */
	private async uploadAsset(
		releaseId: number,
		filePath: string,
		fileName: string,
		label?: string,
	): Promise<unknown> {
		if (this.config.isDryRun) {
			this.log.info(`[模拟执行] 上传附件: ${fileName}`);
			return { id: 0 };
		}
		const url = this.buildApiUrl(
			`/repos/${this.giteaConfig.owner}/${this.giteaConfig.repository}/releases/${String(releaseId)}/assets`,
		);
		const token = this.getToken();

		const form = new FormData();
		form.append("attachment", createReadStream(filePath), {
			contentType: "application/octet-stream",
			filename: fileName,
		});

		if (label) {
			form.append("name", label);
		}

		const requestOptions = {
			body: form,
			headers: {
				...form.getHeaders(),
				Authorization: `token ${token}`,
			},
			method: "POST",
			timeout: this.giteaConfig.timeout,
		};

		this.log.info(`上传附件: ${fileName} 到发布 ${String(releaseId)}`);

		try {
			const response = await fetch(url, requestOptions);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`附件上传失败 (${String(response.status)}): ${errorText}`,
				);
			}

			const result = await response.json();
			this.log.info(`✅ 附件上传成功: ${fileName}`);
			return result;
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`附件上传失败: ${error.message}`);
			}
			throw error;
		}
	}

	/**
	 * 处理并上传所有配置的附件
	 * @param releaseId 发布 ID
	 */
	private async uploadAssets(releaseId: number): Promise<void> {
		const assets = this.giteaConfig.assets;
		if (!assets || assets.length === 0) {
			this.log.verbose("没有配置附件，跳过上传");
			return;
		}

		this.log.info(`开始上传 ${String(assets.length)} 个附件...`);

		for (const asset of assets) {
			try {
				const config = this.normalizeAssetConfig(asset);
				await this.processAsset(releaseId, config);
			} catch (error) {
				this.log.error(
					`附件处理失败: ${JSON.stringify(asset)}, 错误: ${String(error)}`,
				);
				// 继续处理其他附件，不中断整个流程
			}
		}

		this.log.info("✅ 所有附件处理完成");
	}

	/**
	 * 处理单个附件配置
	 * @param releaseId 发布 ID
	 * @param config 附件配置
	 */
	private async processAsset(
		releaseId: number,
		config: GiteaAssetConfig,
	): Promise<void> {
		const files = await this.resolveFiles(config.path);

		if (files.length === 0) {
			this.log.warn(`没有找到匹配的文件: ${config.path}`);
			return;
		}

		if (config.type === "zip") {
			// 打包成 ZIP 文件
			const zipName = config.name ?? `${basename(config.path)}.zip`;
			const tempZipPath = join(process.cwd(), ".temp", zipName);

			// 确保临时目录存在
			const { mkdirSync } = await import("fs");
			try {
				mkdirSync(dirname(tempZipPath), { recursive: true });
			} catch {
				// 目录可能已存在，忽略错误
			}

			await this.createZipArchive(
				files,
				tempZipPath,
				dirname(config.path).replace(/\*/g, ""),
			);
			await this.uploadAsset(releaseId, tempZipPath, zipName, config.label);

			// 清理临时文件
			const { unlinkSync } = await import("fs");
			try {
				unlinkSync(tempZipPath);
			} catch {
				this.log.warn(`清理临时文件失败: ${tempZipPath}`);
			}
		} else {
			// 上传单个文件
			for (const file of files) {
				const fileName = config.name ?? basename(file);
				await this.uploadAsset(releaseId, file, fileName, config.label);
			}
		}
	}

	/**
	 * 获取发布说明内容
	 * @returns 发布说明字符串
	 */
	private async getReleaseNotes(): Promise<string> {
		const releaseNotes = this.giteaConfig.releaseNotes;
		if (typeof releaseNotes === "string") {
			if (releaseNotes.startsWith("npm:")) {
				const npmPackage = releaseNotes.slice(4);
				try {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const npmHandler = await import(npmPackage);

					if (
						typeof npmHandler !== "function" &&
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						typeof npmHandler.default !== "function"
					) {
						throw new Error(`${npmPackage} not found npm`);
					}
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const handler =
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						typeof npmHandler.default === "function"
							? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
								npmHandler.default
							: npmHandler;
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
					return handler.releaseNotes(this.config.getContext());
				} catch (error) {
					console.error(error);
					throw new Error(`${npmPackage} not found npm`);
				}
			} else {
				return this.interpolate(releaseNotes);
			}
		} else if (typeof releaseNotes === "function") {
			return releaseNotes(this.config.getContext());
		}
		return this.config.getContext("changelog") as string;
	}

	private async getReleaseTitle(): Promise<string> {
		const releaseTitle = this.giteaConfig.releaseTitle;
		if (typeof releaseTitle === "string") {
			if (releaseTitle.startsWith("npm:")) {
				const npmPackage = releaseTitle.slice(4);
				try {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const npmHandler = await import(npmPackage);
					// npmHandler 可能是 CommonJS 模块或 ES 模块，因此需要检查 default 属性
					if (
						typeof npmHandler !== "function" &&
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						typeof npmHandler.default !== "function"
					) {
						throw new Error(`${npmPackage} not found npm`);
					}
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const handler =
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						typeof npmHandler.default === "function"
							? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
								npmHandler.default
							: npmHandler;
					// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
					return handler.releaseTitle(this.config.getContext());
				} catch (error) {
					console.error(error);
					throw new Error(`${npmPackage} not found npm`);
				}
			} else {
				return this.interpolate(releaseTitle);
			}
		} else if (typeof releaseTitle === "function") {
			return releaseTitle(this.config.getContext());
		}
		return this.config.getContext("version") as string;
	}

	/**
	 * 执行发布操作，创建或更新 Gitea 发布.
	 * @throws 当发布创建失败时抛出错误
	 */
	async release(): Promise<void> {
		if (!this.giteaConfig.release) {
			this.log.info("Gitea 发布功能已禁用");
			return;
		}

		const isDryRun = this.config.isDryRun;
		const tagName = this.config.getContext("tagName") as string;
		const releaseTitle = await this.getReleaseTitle();
		const releaseNotes = await this.getReleaseNotes();

		this.log.info(`准备创建 Gitea 发布: ${releaseTitle}`);

		const releaseData: GiteaRelease = {
			body: releaseNotes,
			draft: this.giteaConfig.draft ?? false,
			name: releaseTitle,
			prerelease: this.giteaConfig.prerelease ?? false,
			tag_name: tagName,
		};

		if (isDryRun) {
			this.log.info(`[模拟执行] 正在创建/更新发布 ${tagName}`);
			this.log.verbose(`发布数据: ${JSON.stringify(releaseData)}`);

			if (this.giteaConfig.assets && this.giteaConfig.assets.length > 0) {
				await this.uploadAssets(0);
			}
			return;
		}

		try {
			// 检查发布是否已存在
			const exists = await this.releaseExists(tagName);

			let release: GiteaReleaseResponse;
			if (exists) {
				this.log.info(`发布 ${tagName} 已存在，正在更新...`);
				release = await this.updateRelease(tagName, releaseData);
			} else {
				this.log.info(`正在创建新发布 ${tagName}...`);
				release = await this.createRelease(releaseData);
			}

			this.log.info(`✅ Gitea 发布创建成功: ${release.html_url}`);

			// 上传附件
			if (this.giteaConfig.assets && this.giteaConfig.assets.length > 0) {
				await this.uploadAssets(release.id);
			}

			// 设置发布 URL 到上下文中，供其他插件使用
			this.config.setContext("releaseUrl", release.html_url);
		} catch (error) {
			if (error instanceof Error) {
				this.log.error(`❌ 创建 Gitea 发布失败: ${error.message}`);
			}
			throw error;
		}
	}

	/**
	 * 发布完成后的清理和通知操作
	 */
	async afterRelease(): Promise<void> {
		const releaseUrl = this.config.getContext("releaseUrl") as string;
		if (releaseUrl) {
			this.log.info(`🎉 发布完成! 查看发布: ${releaseUrl}`);
		}
		return Promise.resolve();
	}
}

export default GiteaPlugin;
