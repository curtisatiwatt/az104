# Azure Path · AZ-104 学习空间

一个面向已有 Azure 实操经验学习者的中英双语备考网站。课程、题库、实验、计划和操作界面都支持中文 / English；切换语言保留已有进度和答题状态。

A bilingual AZ-104 study workspace with complete Chinese and English lessons, questions, explanations, labs, and checklists. Built for learners with Azure experience and roughly 10–12 study hours per week.

**网站：** [curtisatiwatt.github.io/az104](https://curtisatiwatt.github.io/az104/)  
**源码：** [curtisatiwatt/az104](https://github.com/curtisatiwatt/az104)

## 包含什么

- **8 个学习阶段、48 项任务、约 88 小时**。默认每周 11 小时，适合每周有 10–12 小时的学习者；支持更改开始日期和每周时间，自动重算阶段起点与目标日期。
- **20 节中英双语课程**，涵盖身份与治理、存储、计算、虚拟网络、监控与恢复。每节包含原理、易错点、自检、官方参考和学习笔记。
- **100 道原创情境题的完整中英文版本**，五个领域各 20 道，其中 18 道多选。每题提供答案、整体解析、各选项解释和 Microsoft Learn 参考；两个语言版本使用相同题目 ID 与答案。
- **12 个实验**，包含操作步骤、验收方法、交付物和资源清理。实验需在自己的 Azure 环境实际操作；本站不连接 Azure，也不会替你创建云资源。
- **练习与复盘**：10 题日常练习、领域筛选、错题重练、收藏、50 题计时模考、断点继续、历史成绩及领域覆盖度。
- **进度管理**：任务与课程完成记录、实验步骤和清理勾选、笔记、最近学习足迹，以及 JSON 备份导出与导入。
- **加密云同步**：通过一次性设备配对连接自己的电脑和手机，之后自动同步和合并进度。
- 桌面和手机布局、键盘导航、焦点样式及减少动画偏好支持。

## 建议怎样学习

第一次打开时，可用右上角的「中文 / English」选择语言，再在「计划与数据设置 / Plan & data settings」确认开始日期和每周投入。默认节奏是每周 4 次 × 90 分钟学习、1 次 × 3 小时实操、1 次 × 2 小时复盘，另留一天休息。

| 阶段 | 重点 | 预计投入 |
| --- | --- | --- |
| 1 | 身份、RBAC、Policy、成本与治理 | 11 小时 |
| 2 | 存储授权、冗余、数据保护和文件服务 | 11 小时 |
| 3 | VM、ARM/Bicep、容器基础 | 11 小时 |
| 4 | App Service、网络地址与安全边界 | 11 小时 |
| 5 | 网络互连、路由、DNS 与负载均衡 | 11 小时 |
| 6 | 监控、KQL、告警、备份与恢复 | 11 小时 |
| 7 | 综合项目、故障定位与薄弱项复习 | 11 小时 |
| 8 | 计时模考、错题复盘、官方评估与考前检查 | 11 小时 |

每次学习遵循「阅读 → 实际操作 → 验证结果 → 勾选 → 刷题和解释错因」。只在实际完成后勾选实验；资源仍在等待清理时，不要提前勾选清理确认。部分高费用的灾备内容明确是设计练习，不能视为已经完成真实 ASR 切换演练。

网站提供以下准备度目标：

1. 五个领域各答过至少 15 道题，每题最近一次答案的领域正确率达到 80%。
2. 12 个实验的全部步骤和资源清理已确认完成。
3. 连续两次 50 题计时模考达到 80%。

这些是学习目标，不是通过考试的保证。达到后，还应使用陌生的官方练习评估交叉检验，并确认能独立解释和完成实际操作。遇到薄弱项可追加 1–2 周。

## 练习与考试的区别

本站题库为原创教学内容，不是真题回忆或官方考试题库。模考使用 **50 题 / 100 分钟**的本站练习配置；这不代表官方考试固定题数或时长。多选题需完整选中正确集合才计为正确，未答计为未答并在百分比中按不正确计算。

模考从五个领域分别抽取 11、10、12、10、7 题。练习百分比不能换算成官方考试分数；重复题目的记忆会提高成绩，因此不能只靠反复刷熟悉题判断准备度。

内容核对日期：**2026-11-13**。课程与题目均附官方链接；报考前请再次查看 [AZ-104 官方学习指南](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104) 和 [Azure Administrator 认证页](https://learn.microsoft.com/en-us/credentials/certifications/azure-administrator/)。这是独立学习项目，与 Microsoft 无隶属关系。

## 进度与跨设备同步

**云同步已部署并通过真实服务验证。** API 为 `https://az104-progress-sync.pages.dev`，由 Cloudflare Pages advanced mode + D1 提供。已验证两份独立设备记录的并发合并、中英文笔记往返、取消勾选传播、跨域请求和加密存储；前端仍使用原 GitHub Pages 地址。

学习首先保存在当前浏览器的 `localStorage`，主进度键为 `az104-studio-v1`。刷新后可以继续；模考按真实截止时间计时，离开页面不会暂停。语言偏好保存在设备本地的 `az104-language`，不随云进度同步。

跨设备使用方式：

1. 在第一台设备的设置中创建云同步空间。已有本地任务、课程、实验、笔记和答题记录会纳入同步。
2. 保存生成的 `AZ104.…` 配对密钥，在另一台设备输入同一密钥连接。每台设备通常只需配对一次，不需要注册账号。
3. 正常学习即可。在线时修改会自动同步，回到页面或重新联网后会继续检查；离线修改先保存在本机，等待网络恢复。以界面的同步状态确认是否已完成上传。

配对密钥长期代表这份云进度的访问权限，作用相当于密码：持有者可以读取、解密和修改这份进度。请私下保存，不要放进公开仓库、截图或聊天分享。连接的浏览器会保存密钥，以便下次自动连接；没有账号密码找回流程，因此仍建议定期导出备份。

同步如何处理两台设备的修改：

- 不同任务、课程、实验步骤和收藏分别合并；一台设备完成任务 A，另一台完成 B，两项都保留。撤销勾选和取消收藏也会同步。
- 同一项、同一篇笔记或同一个计划字段发生冲突时，保留最后修改的值；同时修改同一篇笔记不会逐段合并。
- 答题和模考历史取去重后的合集。学习足迹保留活跃日期，同一天的操作次数取两侧较大值，属于近似活动统计。
- 当前练习 / 模考会话整体采用最后修改的版本；不要在两台设备同时作答同一场练习，以免其中一份会话状态被替换。
- 在设置中导入备份或清空本机记录，会先断开云同步，保护现有云进度。它们不会删除云端副本；重新连接原密钥时，云端进度会再次参与合并。

数据在浏览器中通过 AES-GCM 加密后上传。配对主密钥和加密密钥不会发送到服务端；认证使用单独派生的密钥。D1 保存密文、认证派生值的哈希索引、版本与更新时间，服务还维护创建频率限制。GitHub 源码及 Pages 构建产物不包含个人笔记、答题记录或配对密钥。

JSON 导出 / 导入始终可用，适合未启用云同步时迁移设备。导入会在确认后替换本机进度。不同浏览器、不同网站来源，以及本地预览与线上网站的本地数据各自独立；清理浏览器数据可能移除本地记录和配对信息。

**English quick start:** Select **English**, set your start date and weekly hours in **Plan & data settings**, and follow the checklist. Create a sync space on your first device and enter its private pairing key on another device. Progress is encrypted before upload and offline changes are queued locally. Keep the pairing key private and export regular JSON backups. Language choice stays local to each device.

实验中的 Azure 资源可能产生费用。各实验提供费用提醒和清理步骤；预算告警本身不会自动停止消费。学习笔记不要保存 Azure 密钥、密码或 SAS。

## 本地开发

需要 **Node.js 22 或更新版本**。前端使用原生 HTML、CSS 和 ES Modules，没有第三方运行或构建依赖，无需运行 `npm install`。Cloudflare 后端需单独部署。

```bash
git clone https://github.com/curtisatiwatt/az104.git
cd az104
npm run dev
```

打开 [http://127.0.0.1:5184](http://127.0.0.1:5184)。请通过 HTTP 服务访问，直接双击 `index.html` 不适合 ES Module 应用。

```bash
# 运行内容、双语一致性、学习逻辑、同步合并与加密测试
npm test

# 生成可部署静态文件
npm run build

# 预览构建输出；运行前关闭占用 5184 的开发服务
node scripts/serve.mjs --dist
```

构建产物在 `dist/`，包括页面、样式、脚本和学习数据。应用采用 hash 路由和相对资源路径，支持 GitHub Pages 的 `/az104/` 项目路径。字体优先使用 Google Fonts，加载不可用时会回退到系统字体。

## 项目结构

```text
index.html                   页面入口与阅读弹窗
styles.css / i18n.css         响应式与双语布局
app.js                       页面、阅读、实验、刷题与交互
core.js                      日期、抽题、评分、统计与数据校验
i18n.js                      界面翻译与本机语言偏好
data/curriculum[.en].js       20 节课程、8 阶段计划与资源
data/questions[.en].js        100 道原创题的中英文内容
data/labs[.en].js             12 个实验的中英文内容
cloud-sync.js                云连接、离线保存、重试与并发同步
sync-model.js                字段合并、删除标记与历史去重
sync-crypto.js               配对密钥、HKDF 与 AES-GCM
sync-config.js               部署后的云服务地址配置
sync-service/worker.js       Cloudflare Worker 进度 API
sync-service/schema.sql      D1 数据表
scripts/serve.mjs            本地静态服务，端口 5184
scripts/build.mjs            生成 GitHub Pages 前端 dist/
scripts/build-sync.mjs       生成云同步后端 dist-sync/
tests/                       内容、语言、应用逻辑和同步测试
.github/workflows/pages.yml  GitHub Pages 自动部署
```

新增或维护内容时，保持数据 ID 稳定；已保存的进度通过 ID 与课程、题目和步骤关联。题目答案使用从 0 开始的选项下标。中英文内容必须保持 ID、答案、任务关联和实验步骤顺序一致；双语测试会检查遗漏翻译与结构差异。修改后运行 `npm test` 和 `npm run build`，并检查实际页面中的阅读和作答流程。

## GitHub Pages 发布

仓库的 **Settings → Pages → Build and deployment → Source** 使用 **GitHub Actions**。

推送到 `main` 后，[Pages 工作流](https://github.com/curtisatiwatt/az104/actions/workflows/pages.yml) 会依次：

1. 使用 Node.js 22 运行测试。
2. 构建 `dist/` 并上传 Pages artifact。
3. 部署到 `github-pages` 环境。

也可以从工作流页面手动运行 `workflow_dispatch`。只有测试与构建成功后才会部署；发布状态与错误信息在仓库 Actions 中查看。


## 云同步后端部署

前端继续由 **GitHub Pages** 托管。云进度 API 通过 **Cloudflare Pages advanced mode** 执行 `sync-service/worker.js`，密文保存在 D1。两个发布流程独立，不能把前端的 `dist/` 当作同步后端上传。

**生产 API 已部署：`https://az104-progress-sync.pages.dev`。** 资源标识和生产配置记录在 `sync-service/deployment.json`；该文件只有公开配置，没有凭据。以下是维护时的重复发布流程。

1. 创建专用 D1 数据库，执行 `sync-service/schema.sql`，建立进度和创建限流数据表。
2. 在仓库根目录生成后端文件：

   ```bash
   node scripts/build-sync.mjs
   ```

   产物为 `dist-sync/`。其中 `_worker.js` 是从 `sync-service/worker.js` 原样复制的实际 API 实现，`_routes.json` 将请求交给 Worker。

3. 在 Cloudflare Pages 创建或选择 Direct Upload 项目 `az104-progress-sync`，上传 `dist-sync` 文件夹。也可上传 ZIP，但解压后的根目录必须直接包含 `_worker.js`、`_routes.json` 和 `index.html`，不能再包一层 `dist-sync/`。Pages 仪表板直接上传支持 advanced mode 的 `_worker.js`。[官方上传说明](https://developers.cloudflare.com/pages/get-started/direct-upload/)
4. 在该 Pages 项目的 **Production** 设置中添加 D1 数据库绑定，变量名必须为 **`DB`**，并选择第一步的数据库。添加生产环境变量 **`ALLOWED_ORIGINS`**，值为允许的精确来源，用逗号分隔。线上来源是 `https://curtisatiwatt.github.io`，不含 `/az104/`；若需本地联调，可配置为 `https://curtisatiwatt.github.io,http://localhost:5184,http://127.0.0.1:5184`。生产设置使用 Fail closed。
5. 保存绑定和环境变量后，**重新部署同一份 `dist-sync/`**，使生产配置生效。以后修改数据库绑定或环境变量，也应重新部署。[D1 绑定说明](https://developers.cloudflare.com/pages/functions/bindings/)
6. 检查 `/health`，然后实际验证创建空间、读取、更新、版本冲突、错误密钥和 CORS。仅有健康响应不能证明 D1 读写正常。API 路径为 `/v1/progress`，使用独立派生的 Bearer 认证值和更新版本号。该域名服务于 API；学习网站入口仍是 GitHub Pages。
7. 全部验证成功后，在 `sync-config.js` 设置公开的基础地址，再运行测试、构建并发布 GitHub Pages：

   ```js
   export const SYNC_ENDPOINT = 'https://az104-progress-sync.pages.dev';
   ```

   地址不带末尾斜杠。配置文件只包含公开服务地址，用户配对密钥始终不放入源码。

后端仍是标准 Module Worker；构建脚本只是将它包装为 Pages advanced mode 的部署目录。[Advanced mode 说明](https://developers.cloudflare.com/pages/functions/advanced-mode/)

Worker 当前限制每个来源 IP 每小时创建 3 个空间，整个个人服务最多 128 个空间，并限制请求大小。这套配置面向个人学习设备同步，不是公开多人平台的账号系统。源码不提供云空间删除 API；断开连接和本机重置不会删除 D1 中的密文。

可运行一次显式的线上烟雾测试（会创建一个独立的合成测试空间，且不输出或保存密钥）：

```bash
node scripts/check-live-sync.mjs https://az104-progress-sync.pages.dev --create-test-space
```

常规 `npm test` 只在本地运行，不创建云端资源。
