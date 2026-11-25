# P4 Focus V2 Design QA

- source visual truth: `assets-source/focus-v2/专注页面.png`
- implementation screenshot: `docs/qa/focus-v2-implementation.jpg`
- full comparison: `docs/qa/focus-v2-side-by-side.jpg`
- focused ring comparison: `docs/qa/focus-v2-ring-comparison.jpg`
- focused controls comparison: `docs/qa/focus-v2-controls-comparison.jpg`
- browser viewport: 828×391 CSS px; game viewport: 812×375 CSS px; device scale factor 1
- source pixels: 2338×1080, normalized to 812×375 for comparison
- implementation pixels: 812×375
- state: source = 读绘本/15 分钟/剩余 03:22；implementation = 做运动/20 分钟/剩余 00:16（任务、文案和进度差异为真实运行状态）

**Full-view comparison evidence**

- 中心轴、圆环垂直位置、倒计时基线、左上图标和右上控件区域与视觉稿一致。
- 海洋渐变、左右白云、海浪、鱼群、海鸥、光斑和泡沫均处于内容层下方，没有遮挡计时器和按钮。
- 2026-11-25 复核中按反馈再次缩小浮岛与角色；海鸥以 100% 透明度从左侧中线入场并斜向顶部三分之一出场，白云执行 0%→100%→0% 的淡入、横移、淡出循环。

**Focused comparison evidence**

- 圆环：深蓝底环、黄绿色剩余时间环、加粗白圈、绿色渐变内圈、正式浮岛/角色及上层发光圈顺序正确。黄环初始满圈并随倒计时缩减；任务差异导致角色姿态不同，属于配置驱动的预期结果。
- 控件：任务标签和三个圆形按钮均在 812px 边界内；按钮中心距、标签宽度与视觉稿接近。音乐按钮因缺少已批准的专注 BGM而保持静音不可用。

**Required fidelity surfaces**

- Fonts and typography: 倒计时使用细字重等宽数字；任务标签使用项目中文 fallback。源稿字体未单独提供，当前差异为可接受 P3。
- Spacing and layout rhythm: 812×375 下无裁切或溢出，中心圆环和时间保持清晰层级。
- Colors and visual tokens: 背景、进度环、内圈和发光圈使用规格色值；透明度保持低刺激。
- Image quality and asset fidelity: 所有可见插画与按钮来自正式 PNG；圆环和内圈改用 3×/2× Canvas 纹理绘制以改善边缘清晰度；未以占位图、emoji 或手绘 SVG 冒充。
- Copy and content: 任务名、分钟数和 `mm:ss` 均读取真实契约状态。

**Browser and interaction verification**

- 真实浏览器完成任务选择 → 长按确认 → 专注页。
- 暂停前后均为 `00:16`，确认真实计时冻结；继续后恢复。
- 结束按钮显示二次确认；取消继续计时，确认返回岛屿且不发放建造奖励。
- `?fast=1` 完成后进入原庆祝/建造链路。
- 控制台错误 0；HTTP 失败 0。

**Open Questions / P3 follow-up**

- 左上正式“消息”图标和功能尚未提供；当前复用外观匹配的公共返回图，仅展示不交互。
- 专注 BGM 尚未提供，音乐按钮保持默认静音不可用。
- 微信 WebView 与 iOS/Android 真机性能仍需实机回归。

**Comparison history**

1. Pass 1: 圆环/浮岛偏大、右上按钮组在 812px 下越界。
2. Fix: 移除桌面最小宽度约束，改为 812×375 容器单位；缩小圆环与浮岛。
3. Pass 2: Phaser 圆形渐变出现扇形色带。
4. Fix: 改为运行时 Canvas 渐变纹理，保留代码绘制要求并提高角色清晰度。
5. Pass 3: 并排及聚焦区域复核，无剩余 P0/P1/P2 视觉问题。
6. Pass 4（2026-11-25）: 反馈指出海鸥与白云透明度、黄环方向、白圈粗细、浮岛/角色比例和圆圈锐度仍需修正。
7. Fix: 海鸥改为全不透明左中线→顶部三分之一斜飞；白云改为完整淡入/横移/淡出；黄环改为剩余时间；白圈加粗至 7px；浮岛/角色缩小；圆环改为 3× 高分辨率 Canvas 纹理。
8. Pass 5: 812×375 浏览器截图与同尺寸视觉稿并排复核，黄环、白圈、中心素材比例和圆圈清晰度无剩余 P0/P1/P2 差异；暂停前后均为 `00:16`。

final result: passed
