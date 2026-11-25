# P4 专注计时页面 V2 · 资源映射与需求变更

更新时间：2026-11-24

## 需求变更

- 新版 P4 明确显示实时数字倒计时 `mm:ss`，覆盖旧 PRD“默认不显示数字倒计时”的规定。
- 2026-11-25 验收修正：黄绿色圆环表示剩余比例，初始为 100% 并随倒计时缩减；深蓝色表示已经流逝的轨道比例。二者直接读取 `GameFlow.focus`，不创建第二套计时器。
- 动效降低开关同时响应系统 `prefers-reduced-motion`，验收时也可使用 `?reducedMotion=1`。

## 正式资源映射

原始文件统一保存在 `assets-source/focus-v2/`；网页运行时副本位于 `public/assets/focus-v2/`。

| 文件 | 尺寸 | 用途 | 加载状态 |
| --- | ---: | --- | --- |
| `focus_img_island.png` | 360×213 | 圆环内浮岛 | 已接入 |
| `focus_xbl_clean.png` | 500×500 | `tidy-toys` 整理玩具 | 已接入 |
| `focus_xbl_english.png` | 500×500 | `english` 学英语 | 已接入 |
| `focus_xbl_homework.png` | 500×500 | `homework` 写作业 | 已接入 |
| `focus_xbl_lego.png` | 500×500 | `blocks` 搭积木 | 已接入 |
| `focus_xbl_listen.png` | 500×500 | `story` 听故事 | 已接入 |
| `focus_xbl_paint.png` | 500×500 | `draw` 画画 | 已接入 |
| `focus_xbl_read.png` | 500×500 | `book` 读绘本 | 已接入 |
| `focus_xbl_sport.png` | 500×500 | `exercise` 做运动 | 已接入 |
| `focus_illust_fish1.png` | 97×38 | 左上/右下鱼群 | 已接入 |
| `focus_illust_fish2.png` | 151×62 | 左上/右下鱼群 | 已接入 |
| `focus_illust_wave1.png` | 699×107 | 左侧海浪 | 已接入 |
| `focus_illust_wave2.png` | 518×89 | 右侧海浪 | 已接入 |
| `focus_illust_seagull.png` | 106×130 | 三只海鸥组合 | 已接入 |
| `focus_illust_cloud_1.png` | 374×258 | 两侧白云 | 已接入 |
| `focus_btn_music.png` | 100×100 | 音乐按钮 | 已接入视觉；因缺少专注 BGM，保持不可用/静音 |
| `focus_btn_end.png` | 100×100 | 中断确认入口 | 已接入 |
| `focus_btn_pause.png` | 100×100 | 暂停/继续 | 已接入 |
| `专注页面.png` | 2338×1080 | 视觉真值 | 仅保存在源文件目录，不进入运行包 |

## 公共资源与缺口

- 左上“消息”图标在本批素材中缺失；公共库只有外观与视觉稿一致的 `/assets/v2/btn-back.png`。当前仅作为视觉元素显示，不绑定虚构功能。
- 未提供专注页 BGM。音乐按钮默认静音并标记不可用，不复用仅批准用于岛屿首页的 `birds-morning.wav`。
