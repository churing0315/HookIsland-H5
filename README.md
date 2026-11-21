# 《拉钩岛》H5 游戏原型

基于 Phaser + TypeScript + Vite 的纯前端可玩纵向切片。数据只保存在当前浏览器的 `localStorage`，不连接后端或数据库。

## 本地运行

```bash
npm install
npm run dev
```

演示加速模式：在本地地址后添加 `?fast=1`。加速模式把“游戏分钟”映射为真实秒，例如 5 分钟任务约 5 秒完成；2 秒拉钩和 3 秒庆祝保持正常时长。

## 构建与测试

```bash
npm run test
npm run build
npm run preview
```

`dist/` 是可部署到任意静态托管服务的构建目录。Vite 使用相对 `base`，支持部署在子路径。

## 当前架构

- `src/game/state/GameFlow.ts`：P0 页面状态与计时流程；
- `src/game/scenes/PrototypeScene.ts`：Phaser 世界、色盘、岛屿、拖放与放置反馈；
- `src/game/ui/AppUI.ts`：任务卡、按钮、进度与暂停 DOM 界面；
- `src/game/storage.ts`：本地存档、跨日计数重置；
- `src/game/domain/placement.ts`：草地合法性和重叠判断；
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

角色设定图本身不是动画精灵。本原型没有裁切或重绘角色设定图，当前圆形角色仅是明确标记的抽象占位。

## 本地数据

存档键：`lagou-island.prototype.v1`。当前保存每日成功放置次数和已放置物件。浏览器清理站点数据会删除原型进度。

## 浏览器目标

- iOS 15+ Safari；
- 近两年 Android 微信 WebView；
- 当前 Chrome、Edge、Safari；
- 横屏 812×375 为逻辑画布，竖屏手机显示旋转提示。

## 测试范围

当前自动化覆盖草地合法性、重叠检测、本地存档恢复和跨日进度重置。浏览器验收需走通：岛屿→任务→拉钩→计时/暂停→庆祝→拖放→刷新恢复。
