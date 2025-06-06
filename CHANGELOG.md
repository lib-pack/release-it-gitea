# Changelog

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
