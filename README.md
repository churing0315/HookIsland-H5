# 《拉钩岛》H5 游戏原型

基于 Phaser + TypeScript + Vite 的纯前端可玩纵向切片。数据只保存在当前浏览器的 `localStorage`，不连接后端或数据库。

## 本地运行

```bash
npm install
npm run dev
```

演示加速模式：在本地地址后添加 `?fast=1`。加速模式把“游戏分钟”映射为真实秒，例如 5 分钟任务约 5 秒完成。拉钩仪式和结算转场保持正常时长。

V2 地图只读预览参数仅在 `fast=1` 时生效，不会修改正式存档：

- 初始岛：`?fast=1&mapStage=0`
- 中型岛：`?fast=1&mapStage=1`
- 大型岛：`?fast=1&mapStage=2`
- 大岛近景：`?fast=1&mapStage=2&zoom=1.2`

## 构建与测试

```bash
npm run test
npm run build
npm run preview
```

`dist/` 是可部署到任意静态托管服务的构建目录。Vite 使用相对 `base`，支持部署在子路径。

## 当前架构

- `src/game/state/GameFlow.ts`：P0 页面状态与计时流程；
- `src/game/scenes/PrototypeScene.ts`：Phaser 世界层/HUD 层、P4 动态圆环、拖放与反馈；
- `src/game/focus/FocusEnvironmentController.ts`：鱼群、海浪、海鸥、光斑、泡沫和白云的独立低刺激动效控制器；
- `src/game/focus/focusConfig.ts`：P4 正式资源、8 个任务角色、圆环色值、时间格式与降低动态开关；
- `src/game/ui/AppUI.ts`：任务卡、按钮、进度与暂停 DOM 界面；
- `src/game/task/TaskSelectionExperience.ts`：正式任务页三状态容器与过渡编排；
- `src/game/task/TaskCarousel.ts`：非循环轮播、惯性、吸附与动态倾斜；
- `src/game/task/DurationSelector.ts`：四档时长、选中摆动与确认过渡；
- `src/game/task/ContractConfirm.ts`：1 秒长按路径进度、取消回退与防重复提交；
- `src/game/task/VoiceManager.ts`：任务/时长语音互斥播放和异常降级；
- `src/game/task/taskConfig.ts`：8 项任务、4 档时长、图片和 WAV 的集中映射；
- `src/game/audio/GameAudioManager.ts`：全局点击/不可点击音效、确认完成音效与岛屿循环 BGM；
- `src/game/audio/audioAssets.ts`：全局音频路径与按钮音频优先级策略；
- `src/game/map/mapConfig.ts`：三个稳定坐标阶段的正交 tile 数据；
- `src/game/map/IslandMapRenderer.ts`：草地、沙地、岩地与物件分层渲染；
- `src/game/map/IslandCameraController.ts`：自动适配、滚轮/按钮缩放、鼠标/触控平移与双指缩放；
- `src/game/map/IslandExpansionService.ts`：可配置的累计 3/9 次扩岛阈值；
- `src/game/storage.ts`：V1→V2 存档迁移、跨日计数重置；
- `src/game/domain/placement.ts`：footprint、地形、越界、重叠与公共地标判断；
- `src/game/data/assetCatalog.ts`：36 件后续素材的占格、地形和解锁批次目录；
- `src/game/assets/placeholders.ts`：与正式美术解耦的程序占位纹理；
- `public/assets/asset-manifest.json`：资源替换映射；
- `assets-source/`：未来正式独立源文件目录，不进入网页加载路径。

## 替换正式素材

1. 不修改玩法状态机中的资源 ID；
2. 把独立可编辑源文件保存在 `assets-source/<category>/`；
3. 从源文件导出运行时 PNG/WebP/SVG 到 `public/assets/<category>/`；
4. 更新 `asset-manifest.json` 的 `sourcePath`、`runtimePath`、尺寸、哈希与审核状态；
5. 将占位纹理工厂替换为 Phaser Loader 加载，但继续使用逻辑 ID；
6. 对照 Art Bible 检查角色比例、六色、描边、透视和低刺激动效。

岛屿页已使用用户提供的小伴龙、云朵、返回键和拉钩按钮切片；任务选择三步已使用正式 PNG 与 12 条 WAV；专注页已接入 8 张正式任务角色、浮岛、环境插画和按钮。庆祝角色及岛上建筑仍为程序占位，等待后续正式资源整合。

## P4 专注页 V2

- 数字倒计时和黄绿色剩余时间环直接读取现有 `GameFlow.focus`；黄环初始 100%，随倒计时缩减，没有创建第二套计时器；
- 暂停会冻结倒计时与环境 Tween，继续后从现有时间戳恢复；
- `prefers-reduced-motion` 或 `?reducedMotion=1` 可降低环境和呼吸动效；
- 专注页没有已批准 BGM，音乐按钮默认静音并保持不可用；
- 资源映射、缺口和新版数字倒计时需求变更见 `docs/v2/P4-focus-v2-resource-map.md`。

## 音频策略

- 普通可点击按钮播放 `/assets/audio/click.wav`；
- 已有任务/时长语音或独立音效的控件不叠加默认点击声；
- 所有 `disabled` / `aria-disabled` 控件播放 `/assets/audio/unableclick.wav`；
- 确认页长按满 1 秒时播放 `/assets/audio/confirmbtn.wav`；
- 岛屿首页使用 `/assets/audio/birds-morning.wav` 循环播放，离开岛屿暂停；受浏览器自动播放规则限制，首次进入时会在第一次用户交互后开始；
- `homepinky.wav` 已保留为独立源文件和运行时资源，本轮尚未指定触发点。

所有原始 WAV 保存在 `assets-source/audio/`，运行时文件保存在 `public/assets/audio/`，后续可独立压缩或替换而不改交互代码。

## 本地数据

存档键继续使用 `lagou-island.prototype.v1`。存档保存地图阶段、累计建造数、地块占用、每日计数和待放置建筑。每次专注归零时都会保存一栋对应时长档位的建筑，可在领奖页直接放置，也可从首页「建筑收纳」稍后放置。每日放置上限可通过 `DAILY_PLANT_LIMIT_ENABLED` 启用，当前关闭。旧屏幕坐标保存在 `legacyPosition`。

## 浏览器目标

- iOS 15+ Safari；
- 近两年 Android 微信 WebView；
- 当前 Chrome、Edge、Safari；
- 横屏 812×375 为逻辑画布，竖屏手机显示旋转提示。

## 测试范围

当前自动化覆盖三阶段 tile 单调扩张、沙/岩地形、footprint 合法性、越界/重叠、36 件目录、V1 存档迁移、跨日重置、轮播边界/倾角/吸附、任务页防重复状态切换、按钮音频优先级、8 个专注角色映射、时间格式与进度换算。浏览器验收已走通：岛屿→任务三步→长按确认→专注计时/暂停/结束确认→庆祝→拖放，以及大岛缩放和平移。
