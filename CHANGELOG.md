# Changelog

# [1.7.0](https://github.com/lib-pack/release-it-gitea/compare/1.6.0...1.7.0) (2025-07-14)

### Features

- 更新 README 文件，增强 releaseTitle 和 releaseNotes 的配置支持，允许使用 NPM 包和函数回调生成动态内容 ([f70fba9](https://github.com/lib-pack/release-it-gitea/commit/f70fba94ebf96a9fef3b723a4355d00a558f5308))

# [1.6.0](https://github.com/lib-pack/release-it-gitea/compare/1.5.0...1.6.0) (2025-07-14)

### Features

- 更新 Gitea 插件的配置，增强 releaseTitle 和 releaseNotes 的支持，允许使用函数作为模板 ([f786853](https://github.com/lib-pack/release-it-gitea/commit/f786853036ecc689a9362f45f8ffc3e115e847df))

# [1.5.0](https://github.com/lib-pack/release-it-gitea/compare/1.4.1...1.5.0) (2025-06-17)

### Features

- 在 Gitea 插件中添加资产上传功能，支持多种文件类型的压缩和上传，更新配置以包含资产信息 ([364f8a2](https://github.com/lib-pack/release-it-gitea/commit/364f8a28a536332b846a9e9620cd9cb2e8c0b69a))

## [1.4.1](https://github.com/lib-pack/release-it-gitea/compare/1.4.0...1.4.1) (2025-06-17)

### Bug Fixes

- 更新 Gitea 插件的配置，确保在未提供资产时使用空数组作为默认值 ([10ccbea](https://github.com/lib-pack/release-it-gitea/commit/10ccbea6b66d6b180639c1d28dd3bbc871f049e7))

# [1.4.0](https://github.com/lib-pack/release-it-gitea/compare/1.3.3...1.4.0) (2025-06-17)

### Features

- 添加附件上传功能到 Gitea 插件，支持文件和文件夹的压缩上传，增强配置选项和示例 ([994c201](https://github.com/lib-pack/release-it-gitea/commit/994c2017ad735a4114112d741e1262419643589b))

## [1.3.3](https://github.com/lib-pack/release-it-gitea/compare/1.3.2...1.3.3) (2025-06-06)

### Bug Fixes

- 更新 Gitea 插件的配置逻辑，修正 host 和 repository 的默认值，确保更准确的上下文获取 ([01161e2](https://github.com/lib-pack/release-it-gitea/commit/01161e2667b721d9a238ba4c4e6444e9acde8f65))

## [1.3.2](https://github.com/lib-pack/release-it-gitea/compare/1.3.1...1.3.2) (2025-06-06)

### Bug Fixes

- 增强 Gitea 插件的日志输出，添加请求参数信息以便于调试 ([81df2d5](https://github.com/lib-pack/release-it-gitea/commit/81df2d5897a6bd128d2aad187d6720860dac2f62))

## [1.3.1](https://github.com/lib-pack/release-it-gitea/compare/1.3.0...1.3.1) (2025-06-06)

### Bug Fixes

- 修复 Gitea 插件中的上下文获取逻辑，将 getContext 方法的调用从 this.getContext 更新为 this.config.getContext ([768b416](https://github.com/lib-pack/release-it-gitea/commit/768b4162ea41edfad1bc35f40b646e6de1e53253))

# [1.3.0](https://github.com/lib-pack/release-it-gitea/compare/1.2.1...1.3.0) (2025-06-06)

### Features

- 更新 Gitea 插件的类型定义，添加 getContext 和 setContext 方法，优化测试用例以支持新的配置逻辑 ([7d8c56c](https://github.com/lib-pack/release-it-gitea/commit/7d8c56c3495c50f8a6072d2793d1305e93ac4649))

## [1.2.1](https://github.com/lib-pack/release-it-gitea/compare/1.2.0...1.2.1) (2025-06-06)

### Bug Fixes

- 更新 Gitea 插件的启用逻辑，确保在配置中 release 选项为 false 时插件被禁用 ([6c17a69](https://github.com/lib-pack/release-it-gitea/commit/6c17a69e0a24d706af05cf913a8368f8be3fa0eb))

# [1.2.0](https://github.com/lib-pack/release-it-gitea/compare/1.1.0...1.2.0) (2025-06-06)

### Features

- 增加测试超时设置，优化端到端测试输出，确保包含发布信息和变更日志 ([3ae4c79](https://github.com/lib-pack/release-it-gitea/commit/3ae4c790531187c585c2bebf06118278008e4272))
- 更新 Gitea 插件的类型定义，优化配置选项，添加测试用例，更新 .gitignore 文件以排除临时测试目录 ([9c18253](https://github.com/lib-pack/release-it-gitea/commit/9c182539e174a1fa22e01a7a759586af8a31909c))
- 添加演示脚本和手动测试脚本，更新 ESLint 配置，新增测试文档和示例配置文件，移除旧的示例配置文件 ([3870a62](https://github.com/lib-pack/release-it-gitea/commit/3870a62cd5ad7e25ab6619f6824a9cd7a80a56d9))

# 1.1.0 (2025-06-06)

### Features

- 更新 Gitea 插件，添加配置选项和 API 请求功能，优化 ESLint 规则，新增测试用例，更新 README 文档以包含使用说明和配置示例 ([029c6a4](https://github.com/lib-pack/release-it-gitea/commit/029c6a4d6635c83a94bfe439deb62a9faabd413b))
- 添加初始项目结构，包括配置文件、文档、CI/CD工作流和Gitea插件实现 ([ffbe5c2](https://github.com/lib-pack/release-it-gitea/commit/ffbe5c237ae1a6c95df934fb3a17144bd9567063))
