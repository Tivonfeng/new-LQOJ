# Changelog

本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

> 首个 LQOJ 版本基线，基于上游 Hydro 5.0.4（请按实际合并的上游版本修正此说明）。

## [v1.0.0] - 2026-08-10

### 新功能

- **plugins**: 补提交 excalidraw-board 与 objective-analysis 插件及 wechat-share cspj 页面 ([943fa8e](https://github.com/Tivonfeng/new-LQOJ/commit/943fa8e43ca6a69c7c63ff3a108ce7ed11f6029b))
- **typing**: 打字大厅赛季Tab融合 + 跑毒机制 + 奖励平衡 ([947501a](https://github.com/Tivonfeng/new-LQOJ/commit/947501ac5c5fa0ac4625c5b8df018e4b34b1c784))
- SOP首页+课程课后反馈SOP，5大体系1152条模板 ([1abd1c6](https://github.com/Tivonfeng/new-LQOJ/commit/1abd1c6802a5ba29fdfbbe1a0d35b8429ae204a9))
- add detailed programming review manual for GESP L3, covering core concepts, problem-solving techniques, and categorized practice questions, enhancing study materials for candidates ([eb195fb](https://github.com/Tivonfeng/new-LQOJ/commit/eb195fb64d4690511e07e2e7e97775b61d1e9bad))
- add comprehensive C++ programming review manual for GESP L2, detailing core concepts, common pitfalls, and structured training plans, enhancing study resources for candidates ([3f9dafd](https://github.com/Tivonfeng/new-LQOJ/commit/3f9dafd30a282dab264082631c0f87f061de12f8))
- add comprehensive C++ review materials, including detailed core concepts, common pitfalls, high-frequency code snippets, and categorized practice questions, enhancing resources for GESP C++一级考生 ([a4a8ba2](https://github.com/Tivonfeng/new-LQOJ/commit/a4a8ba2d7304b3bebdc31482566ddc24d1de2989))
- remove outdated GESP-L3 problem sets and test data files, including problems on attendance checking, password validation, savings management, numeral system identification, and unit conversion, streamlining the repository for better user experience ([cf84026](https://github.com/Tivonfeng/new-LQOJ/commit/cf84026b122de69a06bc21dbbcc1c49a46d2266f))
- add new problem set for GESP-L3 focusing on attendance checking, including problem description, input/output formats, and sample test cases, enhancing the learning resources for users ([c6a8b02](https://github.com/Tivonfeng/new-LQOJ/commit/c6a8b0285d70641cf3d0170f91748e79d5662dd7))
- add new problems and test cases for GESP-L3, including topics on attendance checking, password validation, savings management, and numeral system identification, expanding the problem set for users ([ce3ac3a](https://github.com/Tivonfeng/new-LQOJ/commit/ce3ac3a8868c962c36d55e4cc6bfee38052cab42))
- add enhanced GESP PDF downloader with Selenium and Playwright support, improving functionality for dynamic content retrieval and file management ([cadf4c4](https://github.com/Tivonfeng/new-LQOJ/commit/cadf4c40811510ca7f27f9e6a89f2f09e00ad94f))
- add new problems and test cases for GESP-L2, including topics on prime number counting, Armstrong numbers, and basic arithmetic operations, expanding the problem set for users ([f30e370](https://github.com/Tivonfeng/new-LQOJ/commit/f30e37001ef75191975ce4a486a0b0c2615bf816))
- add multiple new problems and test cases for GESP-L1, including topics on date calculations, area of rectangles, and beautiful numbers, enhancing the problem set for users ([9739cc0](https://github.com/Tivonfeng/new-LQOJ/commit/9739cc0e8cef6bfbd4ac7ac2811ed055623cfbe5))
- implement scheduled task for checking and expiring red envelopes with refund functionality, enhancing automated management of expired envelopes ([7d6bee4](https://github.com/Tivonfeng/new-LQOJ/commit/7d6bee4d0ef42988b020257ef2c641f5368e45a3))
- add blessing message dropdown for quick selection in red envelope hall, enhancing user interaction and experience ([2d32701](https://github.com/Tivonfeng/new-LQOJ/commit/2d32701bb11deb9ba9df7b09bc06c1e2b4d3f28f))
- implement claim modal with sound and confetti effects for red envelope interactions, enhancing user feedback and engagement ([4eebb27](https://github.com/Tivonfeng/new-LQOJ/commit/4eebb27c3b5c80f10caf42ed4c310f30230eeeca))
- add CertificateFloatingBall component and associated styles for displaying user certificate information with enhanced UI interactions ([c91621f](https://github.com/Tivonfeng/new-LQOJ/commit/c91621fe254318d97c6afcbcb17b5d53f096040f))
- implement event weight management for competitions and certifications, including automatic weight recommendations and validation ([3082067](https://github.com/Tivonfeng/new-LQOJ/commit/30820671cff399848aa5382c437f5e2215549548))
- add system setting for maximum daily plays in score system and refactor DailyGameLimitService to utilize dynamic configuration ([c632d7d](https://github.com/Tivonfeng/new-LQOJ/commit/c632d7d8cec2b464d3ccb80423506c74c97b3309))
- implement result overlay for game outcomes with focus management and animations ([7b30d97](https://github.com/Tivonfeng/new-LQOJ/commit/7b30d971ad695cc91da7c1807ed8991a74cb1326))
- 增加预设头像功能 ([474c380](https://github.com/Tivonfeng/new-LQOJ/commit/474c380446bfd337f59804c1134eb7ec8f6a8c6a))
- 增加打字进步分，目标分和超越对手分 ([257dbd3](https://github.com/Tivonfeng/new-LQOJ/commit/257dbd3bc8616c862e2572bdc83f6791235c76d4))
- 游戏增加每日限制10次 ([f5e1785](https://github.com/Tivonfeng/new-LQOJ/commit/f5e1785df2211b13e99cf3f76d6b4ceb57be5345))
- 增加vuepress教程 ([5857586](https://github.com/Tivonfeng/new-LQOJ/commit/5857586a2038f36b14dfb43b8031f42af945b147))
- 一些优化 ([7e051e6](https://github.com/Tivonfeng/new-LQOJ/commit/7e051e6630eb977b60b6c569a72d4418cc05cd8a))
- 增加签到功能 ([ba7c02c](https://github.com/Tivonfeng/new-LQOJ/commit/ba7c02c4b5fcf8e7ff94e860e87294de404da82b))
- 增加积分转账功能 ([ab237fc](https://github.com/Tivonfeng/new-LQOJ/commit/ab237fc12dc35f20ed6485c2810d47e4cf8d37d7))
- 增加wechat功能 ([d01f52b](https://github.com/Tivonfeng/new-LQOJ/commit/d01f52b85b503dd6d0248ef913546d1423f80528))
- 合并功能 ([ab3a03a](https://github.com/Tivonfeng/new-LQOJ/commit/ab3a03aa2f7ccb6efa59f8f220a6f3010d2678cc))
- record增加思考时间 ([5863c60](https://github.com/Tivonfeng/new-LQOJ/commit/5863c60b004315823f9afa5558904bb2b844f8f2))
- 积分管理全域统一账户，增加迁移功能 ([40b3353](https://github.com/Tivonfeng/new-LQOJ/commit/40b335384bafaaa62cac25d96950a18f0dc1e17e))
- 取消抽奖的高级功能 ([26975e8](https://github.com/Tivonfeng/new-LQOJ/commit/26975e821b1f59a2473803a82a96c3963a8c6ac0))
- 增加打字练习大厅 ([63ada22](https://github.com/Tivonfeng/new-LQOJ/commit/63ada2243e86a94432c4730ce432c24a25aacdc9))
- 增加剪刀石头布游戏 ([a7c2b53](https://github.com/Tivonfeng/new-LQOJ/commit/a7c2b53132e7da01f67c6c2f4693353698fbae13))
- 掷骰子增加选择积分功能 ([eb9b882](https://github.com/Tivonfeng/new-LQOJ/commit/eb9b88230e18c68839bd3ff81d504ebf4f4ecfcb))
- 功能拆分&优化中奖概率 ([e96d728](https://github.com/Tivonfeng/new-LQOJ/commit/e96d728328c6901d5accc74c6c139281e8a9a163))
- 增加积分大厅 ([00e6692](https://github.com/Tivonfeng/new-LQOJ/commit/00e669240825c207269f9c71465a3f589074bd60))

### 修复

- **git**: 首次发布允许版本与 package.json 相同（--from 场景） ([5bfa40f](https://github.com/Tivonfeng/new-LQOJ/commit/5bfa40f8b27b503e65133e578d145e11b1088336))
- 修复积分转账插件 & 更新打字速度、记分板插件 ([5f19776](https://github.com/Tivonfeng/new-LQOJ/commit/5f19776b073c2606d046f355263182bb9556a309))
- update solution logic in GESP L2 problem set, correcting variable usage and adjusting output values in test data files to ensure accurate results ([90a5162](https://github.com/Tivonfeng/new-LQOJ/commit/90a5162b8c4fb88312fb93d002a260d506aa72d4))
- update displayed values in red envelope hall to show remaining points instead of claimed amount, improving clarity for users ([7b8207a](https://github.com/Tivonfeng/new-LQOJ/commit/7b8207ac4d85d1de2022e652c86792215500e520))
- update WechatPlugin to disable open platform for OAuth login by default ([6ade906](https://github.com/Tivonfeng/new-LQOJ/commit/6ade906e4871498dadcb5a8bcb94c17b14a269d4))
- update check-in URL in score_hall.html template ([5d88e89](https://github.com/Tivonfeng/new-LQOJ/commit/5d88e89c95da94b9e98c935dafbf508b9f096c96))
- ui优化 ([733c596](https://github.com/Tivonfeng/new-LQOJ/commit/733c596635bee1340cb4f9b0ff647b7126ab8f1a))
- 修复打字大厅一些bug ([b2007bf](https://github.com/Tivonfeng/new-LQOJ/commit/b2007bfbc9d03e05725f726f53f6390c0547c183))
- 优化 ([28a89a0](https://github.com/Tivonfeng/new-LQOJ/commit/28a89a0c48fa9378a14852f8bef8e770c5111e7e))
- 一些优化 ([4b80196](https://github.com/Tivonfeng/new-LQOJ/commit/4b80196daf87d7198d96c76022b80589cd9b91c2))
- 修复弹窗websocket重连机制 ([ac9a3f5](https://github.com/Tivonfeng/new-LQOJ/commit/ac9a3f5d4f3f5de1500dbd8681013b236d09ce35))
- 解决微信跨域问题 ([b38c8c4](https://github.com/Tivonfeng/new-LQOJ/commit/b38c8c44d17c3667914669f3677bdaab6bf1acc0))
- bug ([b66d2f5](https://github.com/Tivonfeng/new-LQOJ/commit/b66d2f59e861eaba6f0c3f6cf9534133ccbf71ec))
- ui ([9024cac](https://github.com/Tivonfeng/new-LQOJ/commit/9024cac86bf269f950f12aa7e8035f64c203c89a))
- 积分管理ui ([8678d3f](https://github.com/Tivonfeng/new-LQOJ/commit/8678d3f1687358cd2fd05e0d324cd81f08beaaf8))
- 修复石头剪刀布游戏记录 ([eaa2f83](https://github.com/Tivonfeng/new-LQOJ/commit/eaa2f8389207cc766be6e38f299887360a83d16e))
- 优化无用代码 ([3a30e55](https://github.com/Tivonfeng/new-LQOJ/commit/3a30e55ccd7ab935daf7799184d523c060b0c1da))
- 修复一些bug ([df3d946](https://github.com/Tivonfeng/new-LQOJ/commit/df3d946314bde82b91317c8a3c610ebf82e0e5c7))
- bug ([edca378](https://github.com/Tivonfeng/new-LQOJ/commit/edca3788c673224a575c63b6228938fb42ab607f))
- prevent update root role in DomainPermissionHandler (#984) ([80a9c6a](https://github.com/Tivonfeng/new-LQOJ/commit/80a9c6a399cad36961716aaeb2b3f67618190564))

### 重构

- migrate from global service access to ctx-based DI pattern ([7979734](https://github.com/Tivonfeng/new-LQOJ/commit/79797345b5abee1b6a6f7f19d1710d43f19d1cf1))
- reorganize and clean up GESP-L2 problem sets, including the addition of new markdown files for exam questions and answers, and removal of outdated test data files ([6f902fc](https://github.com/Tivonfeng/new-LQOJ/commit/6f902fc833a8cb5ac3708e76c83b4e5c242e3cdf))
- remove legacy GESP PDF downloader scripts and requirements, consolidating functionality into the enhanced version with Selenium and Playwright support ([f8b6dd9](https://github.com/Tivonfeng/new-LQOJ/commit/f8b6dd9bc1bb5fd5a0d2a92447c6e5f1dec49e4e))
- remove deprecated confetti-thinking-time page and enhance red envelope hall page with new compact styles and functionality for improved user experience ([5a76679](https://github.com/Tivonfeng/new-LQOJ/commit/5a76679a7b1adf8c07df799d21d7d5503c42d411))
- migrate thinking time functionality from confetti-thinking-time to score-system, removing unused code and integrating new handlers and services ([7e16f74](https://github.com/Tivonfeng/new-LQOJ/commit/7e16f74de1a5cc0a7c4c65b1a5f916f2b068429f))
- standardize state initialization for loading and expanded flags in StudentAnalyticsApp ([f643637](https://github.com/Tivonfeng/new-LQOJ/commit/f6436375acca3952528fcba3e8b9cdb04fe7a364))

