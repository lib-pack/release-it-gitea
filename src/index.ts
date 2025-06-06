import fetch from "node-fetch";
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
		return Boolean(config?.release !== false);
	}

	/**
	 * 获取并验证 Gitea 配置信息
	 * @returns 验证后的 Gitea 配置对象
	 * @throws 当配置缺失或无效时抛出错误
	 */
	private get giteaConfig(): GiteaConfig {
		const gitea = this.getContext() as GiteaConfig;

		if (!gitea) {
			throw new Error("Gitea 配置未找到");
		}

		const repo = this.config.getContext("repo") as {
			owner: string;
			repository: string;
		};

		// 设置默认值
		const config: GiteaConfig = {
			draft: gitea.draft ?? false,
			host: gitea.host,
			owner: gitea.owner ?? repo.owner,
			prerelease: gitea.prerelease ?? false,
			release: gitea.release !== false,
			releaseNotes: gitea.releaseNotes ?? "${changelog}",
			releaseTitle: gitea.releaseTitle ?? "v${version}",
			repository: gitea.repository ?? repo.repository,
			timeout: gitea.timeout ?? 30000,
			tokenRef: gitea.tokenRef ?? "GITEA_TOKEN",
		};

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
		const host = this.giteaConfig.host.replace(/\/$/, "");
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
					`Gitea API 请求失败 (${response.status.toString()}): ${errorText}`,
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
		const context = this.config.getContext() as {
			branchName: string;
			changelog: string;
			latestVersion: string;
			name: string;
			repo: {
				owner: string;
				repository: string;
			};
			version: string;
		};
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
	 * 执行发布操作，创建或更新 Gitea 发布.
	 * @throws 当发布创建失败时抛出错误
	 */
	async release(): Promise<void> {
		if (!this.giteaConfig.release) {
			this.log.info("Gitea 发布功能已禁用");
			return;
		}

		const tagName = this.config.getContext("tagName") as string;
		const releaseTitle = this.interpolate(
			this.giteaConfig.releaseTitle ?? "v${version}",
		);
		const releaseNotes = this.interpolate(
			this.giteaConfig.releaseNotes ?? "${changelog}",
		);

		this.log.info(`准备创建 Gitea 发布: ${releaseTitle}`);

		const releaseData: GiteaRelease = {
			body: releaseNotes,
			draft: this.giteaConfig.draft ?? false,
			name: releaseTitle,
			prerelease: this.giteaConfig.prerelease ?? false,
			tag_name: tagName,
		};

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
