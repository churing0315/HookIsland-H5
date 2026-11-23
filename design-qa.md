# 拉钩岛 Demo V2 · 地图与相机 Design QA

- Source visual truth:
  - `docs/v2/references/初始小岛-建筑.png` — 2048×946
  - `docs/v2/references/扩展小岛.png` — 2048×946
  - `docs/v2/references/扩展地图.png` — 2048×946
  - `docs/v2/references/扩展地图-放大.png` — 2048×946
- Browser-rendered implementation captures:
  - `http://127.0.0.1:5173/?fast=1&mapStage=0`
  - `http://127.0.0.1:5173/?fast=1&mapStage=1`
  - `http://127.0.0.1:5173/?fast=1&mapStage=2`
  - 大岛近景由 stage 2 真实点击三次“放大地图”后捕获
- Reproducible side-by-side comparison: `http://127.0.0.1:5173/qa-compare.html`
- Viewport: direct captures 1180×700；comparison capture 1800×720
- Game CSS/logical viewport: 812×375，device scale factor 1；源图按相同比例归一化显示
- State: 岛屿首页；阶段 0、1、2；阶段 2 放大和平移；完成一次真实建造并刷新

## Full-view comparison evidence

- 三阶段均使用同一正交网格坐标系；阶段升级只增加 tile。
- 阶段 2 的左上沙地、中央草地和右下岩地与参考构图的区域关系一致，且每个区域均由可计算 tile 组成。
- 角色、返回键、右上信息卡和右下拉钩按钮在 fit、zoom、pan 后均保持固定尺寸和屏幕位置。
- 参考图中的密集建筑属于下一轮素材库集成，本轮按用户要求没有写死到地图背景。

## Focused-region comparison evidence

- 重点检查了左下角色/云朵、右下拉钩按钮、右上信息卡、左上沙地边界和右下岩地边界。
- 用户提供的四件 UI/角色切片保持原造型与颜色；未用 CSS 或 SVG 重绘。
- 地表 tile、公共地标和圆冠树明确为本轮运行占位；占格与交互是真实代码。

## Required fidelity surfaces

- Fonts and typography: 使用系统中文 fallback；信息层级、按钮可读性和缩放后字重稳定。正式方正粗圆授权仍留待发布阶段。
- Spacing and layout rhythm: HUD 安全区稳定；小岛、中岛、大岛均自动适配且不被屏幕裁切。相机控制位于下方中央。
- Colors and tokens: 保留淡蓝海水、明亮草地、浅黄沙地和柔和褐色岩地；低对比网格线符合儿童低刺激目标。
- Image quality and asset fidelity: 小伴龙、云朵、返回和拉钩按钮使用原始 PNG 切片；未拉伸变形。地图与地标为明确占位，不冒充正式素材。
- Copy and content: 今日 0/3、累计建造、地图阶段和第 4 次勋章文案含义分离。
- Accessibility: 固定 HUD 均为语义化 button/section，含 aria-label；触控目标尺寸合格；竖屏仍显示旋转提示。

## Comparison history

1. First browser pass
   - [P1] 小地图在视口大于世界边界时被 Phaser 内置 bounds 吸附到左侧。
   - Fix: 移除内置 camera bounds，改为按可见世界尺寸计算中心与手工边界夹取。
2. Second browser pass
   - 阶段 0 重新居中；阶段 1/2 自动 fit；放大后拖动仍受边界限制；HUD 不随世界变化。
   - No actionable P0/P1/P2 findings remained.

## Primary interactions tested

- 任务选择 → 2 秒拉钩 → `fast=1` 计时 → 庆祝 → 建造。
- 2×2 圆冠树拖放到合法草地格，完成后返回首页。
- 页面刷新后累计数、今日进度与物件位置保留。
- 大岛按钮缩放、鼠标拖动平移、归位。
- Browser console: 0 warnings, 0 errors.

## Follow-up polish

- [P3] 下一轮用独立正式建筑/树木 PNG 替换公共地标与圆冠树占位。
- [P3] 正式 tile 美术可在不改变 grid 数据的前提下增加柔和岸边转角和少量装饰。

final result: passed
