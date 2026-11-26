import Phaser from 'phaser';

/**
 * 完整格子地块渲染器（Canvas2D 离屏渲染 → Phaser 贴图）。
 *
 * 与参考演示 island-contour-2d / index.html 逻辑逐像素一致：
 *   边界环游提取闭合轮廓 → Chaikin 圆角 → 法向粗糙扰动 →
 *   海岸嵌套描边（浅滩→泡沫→沙环）→ 每地块各自 ctx.clip 圆角轮廓裁剪棋盘 → 三角碎片。
 *
 * 之所以用离屏 Canvas2D 而不是 Phaser.Graphics：
 *   Phaser WebGL 对同一 Graphics 内多条不同线宽 stroke 的叠加顺序不可靠，
 *   且没有真正的任意多边形裁剪；离屏 Canvas2D 有原生 stroke/clip，能忠实还原参考效果。
 *
 * 产出分层（世界空间）：
 *   1) 海面渐变图 + 底部虚化椭圆（独立贴图，覆盖整个可视范围）
 *   2) 岛屿本体一张透明底 CanvasTexture（海岸 + 地块棋盘 + 碎片）
 */

// ===== 地块类型 =====
export const TileType = {
  WATER: 0,
  LAND: 1,
  HIGH: 2,
  SAND: 3,
} as const;
export type TileType = (typeof TileType)[keyof typeof TileType];

// ===== 色板（与参考演示一致的色值） =====
export const TILE_COLORS = {
  water: 0x56dddf,
  shoal: 0x79e9dd,
  foam: 0xeffceb,
  sand: 0xfeea9d,      // 海岸沙环
  sandFill: 0xfbe17e,  // 沙滩地块（单色平铺）
  grassA: 0xa3d428,
  grassB: 0xaddb38,
  highA: 0xc37d5a,
  highB: 0xca815c,
} as const;

// 噪点纹理：[暗色, 暗alpha, 亮色, 亮alpha]
const NOISE = {
  grass: [0x2f5e14, 0.16, 0xffffff, 0.22],
  sand: [0xc4942a, 0.2, 0xffffff, 0.25],
  high: [0x965a2d, 0.18, 0xffffff, 0.22],
} as const;

export interface IslandRenderOptions {
  /** 格子像素大小，默认 40 */
  cellSize?: number;
  /** Chaikin 平滑轮数，默认 3 */
  smoothIter?: number;
  /** 沙环总线宽（px），可见宽度 = sandWidth/2，默认 18 */
  sandWidth?: number;
  /** 交界圆角粗糙度（px），0 = 完全光滑，默认 1 */
  roughAmp?: number;
  /** 整体透明度（建造预览等场景使用），默认 1 */
  alpha?: number;
  /** 放置页使用固定屏幕海色，低缩放时海面图不会露出边缘 */
  fixedSea?: boolean;
}

const DEFAULTS: Required<IslandRenderOptions> = {
  cellSize: 40,
  smoothIter: 3,
  sandWidth: 18,
  roughAmp: 1,
  alpha: 1,
  fixedSea: false,
};

type Pt = [number, number]; // [格单位x, 格单位y]
type Grid = number[][];

// ===== 颜色工具 =====
function hex(n: number): string {
  return '#' + (n >>> 0).toString(16).padStart(6, '0');
}
function rgba(n: number, a: number): string {
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ===== 核心算法（纯函数，与引擎无关，与参考一致） =====
export function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 边界环游：从格子地图提取闭合轮廓（等效 marching squares 二值格版本） */
export function traceLoops(
  _grid: Grid,
  COLS: number,
  ROWS: number,
  isLand: (x: number, y: number) => boolean,
): Pt[][] {
  const edges = new Map<string, Pt[]>();
  const addEdge = (sx: number, sy: number, ex: number, ey: number) => {
    const k = sx + ',' + sy;
    if (!edges.has(k)) edges.set(k, []);
    edges.get(k)!.push([ex, ey]);
  };
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!isLand(x, y)) continue;
    if (!isLand(x, y - 1)) addEdge(x, y, x + 1, y);
    if (!isLand(x + 1, y)) addEdge(x + 1, y, x + 1, y + 1);
    if (!isLand(x, y + 1)) addEdge(x + 1, y + 1, x, y + 1);
    if (!isLand(x - 1, y)) addEdge(x, y + 1, x, y);
  }
  const loops: Pt[][] = [];
  const DIRS: Record<string, number> = { '1,0': 0, '0,1': 1, '-1,0': 2, '0,-1': 3 };
  const pickNext = (cur: Pt, prevDir: number | null, arr: Pt[]): Pt => {
    if (arr.length === 1) return arr.pop()!;
    const pref = prevDir === null ? [0, 1, 2, 3]
      : [(prevDir + 1) % 4, prevDir, (prevDir + 3) % 4, (prevDir + 2) % 4];
    for (const want of pref) {
      const idx = arr.findIndex(e => DIRS[(e[0] - cur[0]) + ',' + (e[1] - cur[1])] === want);
      if (idx >= 0) return arr.splice(idx, 1)[0];
    }
    return arr.pop()!;
  };
  for (const sk of [...edges.keys()]) {
    while ((edges.get(sk) || []).length) {
      let cur = sk.split(',').map(Number) as Pt;
      const start = cur, loop: Pt[] = [cur];
      let prevDir: number | null = null, guard = 0;
      while (guard++ < 20000) {
        const arr = edges.get(cur[0] + ',' + cur[1]);
        if (!arr || !arr.length) break;
        const nxt = pickNext(cur, prevDir, arr);
        prevDir = DIRS[(nxt[0] - cur[0]) + ',' + (nxt[1] - cur[1])];
        cur = nxt;
        if (cur[0] === start[0] && cur[1] === start[1]) break;
        loop.push(cur);
      }
      if (loop.length >= 4) loops.push(loop);
    }
  }
  return loops;
}

/** Chaikin 闭合切角平滑 */
export function chaikinClosed(pts: Pt[], iters: number): Pt[] {
  let p = pts;
  for (let it = 0; it < iters; it++) {
    const out: Pt[] = [], n = p.length;
    for (let i = 0; i < n; i++) {
      const a = p[i], b = p[(i + 1) % n];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = out;
  }
  return p;
}

/** 法向粗糙扰动（确定性，同位置永远同结果） */
export function roughen(loop: Pt[], ampPx: number, S: number): Pt[] {
  if (ampPx <= 0) return loop;
  const out: Pt[] = [], n = loop.length;
  for (let i = 0; i < n; i++) {
    const p = loop[i], a = loop[(i - 1 + n) % n], b = loop[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const h = hash2(Math.round(p[0] * 4) + 9, Math.round(p[1] * 4) + 27);
    const off = (h - 0.5) * 2 * ampPx / S;
    out.push([p[0] + nx * off, p[1] + ny * off]);
  }
  return out;
}

function terrainLoops(
  grid: Grid, COLS: number, ROWS: number,
  pred: (x: number, y: number) => boolean,
  smoothIter: number, roughAmp: number, S: number,
): Pt[][] {
  return traceLoops(grid, COLS, ROWS, pred).map(l =>
    roughen(chaikinClosed(l, smoothIter), roughAmp, S));
}

// ===== Canvas2D 渲染辅助（与参考 index.html 一致） =====
function loopPath2D(loop: Pt[], S: number): Path2D {
  const path = new Path2D();
  loop.forEach((pt, i) => {
    const x = pt[0] * S, y = pt[1] * S;
    if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
  });
  path.closePath();
  return path;
}

function strokeW(ctx: CanvasRenderingContext2D, path: Path2D, w: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(path);
}

// 直角棋盘瓦片场：在该地块自身的圆角轮廓内 ctx.clip 裁剪，按 (x+y) 奇偶双色满格平铺
function drawTileFieldCanvas(
  ctx: CanvasRenderingContext2D,
  _grid: Grid, COLS: number, ROWS: number, S: number,
  pred: (x: number, y: number) => boolean,
  loops: Pt[][],
  colA: string, colB: string,
  noise?: readonly [number, number, number, number],
): void {
  for (const loop of loops) {
    const path = loopPath2D(loop, S);
    ctx.save();
    ctx.clip(path);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!pred(x, y)) continue;
        ctx.fillStyle = (x + y) % 2 === 0 ? colA : colB;
        ctx.fillRect(x * S, y * S, S, S);
        if (noise) {
          for (let i = 0; i < 2; i++) {
            const h1 = hash2(x * 91 + i * 7, y * 57 + i * 13);
            const h2 = hash2(x * 17 + i * 29, y * 83 + i * 5);
            ctx.fillStyle = h1 < 0.5 ? rgba(noise[0], noise[1]) : rgba(noise[2], noise[3]);
            ctx.beginPath();
            ctx.arc(x * S + 6 + h1 * (S - 12), y * S + 6 + h2 * (S - 12), 1.1 + h2 * 1.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();
  }
}

// 三角形碎片（仅草地，离水一格以内留白）
function triColor(x: number, y: number): number {
  const r = hash2(x * 61 + 3, y * 47 + 13);
  if (r < 0.4) return 0xcdef72;
  if (r < 0.75) return 0x98cc39;
  return 0x7ab22b;
}
function nearWater(grid: Grid, COLS: number, ROWS: number, x: number, y: number): boolean {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => {
    const nx = x + d[0], ny = y + d[1];
    return nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || grid[ny][nx] === TileType.WATER;
  });
}
function drawDecoCanvas(
  ctx: CanvasRenderingContext2D,
  grid: Grid, COLS: number, ROWS: number, S: number,
): void {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (grid[y][x] !== TileType.LAND || nearWater(grid, COLS, ROWS, x, y)) continue;
    const h = hash2(x * 53 + 7, y * 29 + 3);
    if (h >= 0.2) continue;
    const h1 = hash2(x * 13 + 101, y * 19 + 57);
    const h2 = hash2(x * 7 + 41, y * 11 + 23);
    const h3 = hash2(x * 3 + 13, y * 5 + 71);
    const cx = x * S + 10 + h1 * (S - 20);
    const cy = y * S + 10 + h2 * (S - 20);
    const r = 4 + h3 * 3.5, rot = h3 * Math.PI * 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.87, r * 0.5);
    ctx.lineTo(-r * 0.87, r * 0.5);
    ctx.closePath();
    ctx.fillStyle = hex(triColor(x, y));
    ctx.fill();
    ctx.restore();
  }
}

// ===== 海浪（远处海面上的青色小三角：错落渐现渐隐 + 微弱斜向位移，舒缓治愈） =====
const WAVE_COLORS = [0x89fdff, 0x78fffa];
const WAVE_COUNT = 9;
// 海面渐变图的世界尺寸（与 renderIsland 中海面图一致），海浪在整张海面范围撒点
const SEA_W = 1800, SEA_H = 900;

function spawnSeaWaves(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  grid: Grid, COLS: number, ROWS: number, S: number,
): void {
  const W = COLS * S, H = ROWS * S;

  // 远离岛屿：以该点所在格为中心 ±SHORE_GAP 格范围内全是水（网格之外天然是海）
  const SHORE_GAP = 3;
  const isFarFromLand = (wx: number, wy: number): boolean => {
    const gx = Math.floor(wx / S), gy = Math.floor(wy / S);
    for (let dy = -SHORE_GAP; dy <= SHORE_GAP; dy++) {
      for (let dx = -SHORE_GAP; dx <= SHORE_GAP; dx++) {
        const nx = gx + dx, ny = gy + dy;
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && grid[ny][nx] !== TileType.WATER) return false;
      }
    }
    return true;
  };

  // 撒点范围：整张海面渐变图（含网格外的大片海面），四边留边
  const M = 50;
  const x0 = W / 2 - SEA_W / 2 + M, x1 = W / 2 + SEA_W / 2 - M;
  const y0 = H / 2 - SEA_H / 2 + M, y1 = H / 2 + SEA_H / 2 - M;
  const rangeW = x1 - x0, rangeH = y1 - y0;

  // 真随机 + 分层采样：把海面划成 ZCOLS×ZROWS 个区域，随机洗牌后每区至多取一点。
  // 每次生成选区与区内偏移都不同 → 位置真正随机、覆盖更多区域；分区又保证分布均匀、不扎堆。
  const ZCOLS = 4, ZROWS = 3;
  const zones = Array.from({ length: ZCOLS * ZROWS }, (_, z) => z);
  for (let z = zones.length - 1; z > 0; z--) {
    const j = Math.floor(Math.random() * (z + 1));
    [zones[z], zones[j]] = [zones[j], zones[z]];
  }

  let placed = 0;
  for (const zone of zones) {
    if (placed >= WAVE_COUNT) break;
    const zc = zone % ZCOLS, zr = Math.floor(zone / ZCOLS);
    for (let t = 0; t < 12; t++) {
      // 取区域内 15%~85% 核心范围的随机点，避免相邻区域的浪贴边过近
      const cx = x0 + ((zc + 0.15 + Math.random() * 0.7) / ZCOLS) * rangeW;
      const cy = y0 + ((zr + 0.15 + Math.random() * 0.7) / ZROWS) * rangeH;
      if (!isFarFromLand(cx, cy)) continue;

      const rSize = Math.random();
      const bw = S * (0.32 + rSize * 0.26);   // 底边 ≈ 14~26px，小三角
      const bh = bw * (0.5 + rSize * 0.15);   // 高 ≈ 底边一半，像远处浪尖
      const baseAlpha = 0.35 + Math.random() * 0.3; // 峰值透明度 0.35~0.65
      const color = WAVE_COLORS[Math.random() < 0.5 ? 0 : 1];

      // 微弱斜向位移（45° 对角方向随机取一，总距离 ≈ 8~13px）
      const move = 8 + Math.random() * 5;
      const sign = [[1, -1], [-1, -1], [1, 1], [-1, 1]][Math.floor(Math.random() * 4)];
      const dx = sign[0] * move * 0.72;
      const dy = sign[1] * move * 0.72;

      const wave = scene.add.graphics({ x: cx, y: cy }).setAlpha(0);
      wave.fillStyle(color, 1);
      wave.fillTriangle(-bw / 2, bh / 2, bw / 2, bh / 2, 0, -bh / 2);
      container.add(wave);

      // 一个循环（单 tween + yoyo）：渐入+斜移涌上 → 停留 → 渐出+回位退下 → 间歇。
      // 各段时长与初始错峰都随机，形成时差错落、不规则缓动。
      scene.tweens.add({
        targets: wave,
        alpha: { from: 0, to: baseAlpha },
        x: cx + dx,
        y: cy + dy,
        duration: 1000 + Math.random() * 700,   // 渐入/渐出各 ≈ 1.0~1.7s
        delay: Math.random() * 4500,            // 初始错峰 0~4.5s
        hold: 1200 + Math.random() * 1000,      // 峰值停留 ≈ 1.2~2.2s
        yoyo: true,                             // 反向：渐出+回位
        repeat: -1,
        repeatDelay: 1500 + Math.random() * 2500, // 隐没间歇 ≈ 1.5~4s
        ease: 'Sine.easeInOut',
      });

      placed++;
      break;
    }
  }
}

// ===== 主渲染入口 =====
/**
 * 绘制完整格子地块岛屿（轮廓海岸 + 圆角裁剪棋盘 + 三角碎片）。
 *
 * @param scene     Phaser 场景（用于创建贴图与图像）
 * @param container 所有产出对象挂入此容器，由调用方统一管理生命周期
 * @param grid      二维格子地图，grid[y][x] = TileType
 * @param COLS      列数
 * @param ROWS      行数
 * @param opts      渲染参数
 */
export function renderIsland(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  grid: Grid,
  COLS: number,
  ROWS: number,
  opts: IslandRenderOptions = {},
): void {
  const o = { ...DEFAULTS, ...opts };
  const { cellSize: S, smoothIter, sandWidth, roughAmp, alpha } = o;
  const W = COLS * S, H = ROWS * S;

  const landPred = (x: number, y: number) => grid[y][x] !== TileType.WATER;
  const highPred = (x: number, y: number) => grid[y][x] === TileType.HIGH;
  const grassPred = (x: number, y: number) => grid[y][x] === TileType.LAND;
  const sandPred = (x: number, y: number) => grid[y][x] === TileType.SAND;

  const landLoops = terrainLoops(grid, COLS, ROWS, landPred, smoothIter, roughAmp, S);
  const sandLoops = terrainLoops(grid, COLS, ROWS, sandPred, smoothIter, roughAmp, S);
  const grassLoops = terrainLoops(grid, COLS, ROWS, grassPred, smoothIter, roughAmp, S);
  const highLoops = terrainLoops(grid, COLS, ROWS, highPred, smoothIter, roughAmp, S);

  // 1a. 海面渐变：#4bc0f2（顶）→ #74dffb（底）
  //     世界空间一张 SEA_W×SEA_H 渐变图，覆盖相机最低缩放下的整个可视范围，避免边缘露背景。
  const GW = SEA_W, GH = SEA_H;
  if (!scene.textures.exists('island-sea-gradient')) {
    const ct = scene.textures.createCanvas('island-sea-gradient', GW, GH);
    if (ct) {
      const ctx = ct.context;
      const grad = ctx.createLinearGradient(0, 0, 0, GH);
      grad.addColorStop(0, '#4bc0f2');
      grad.addColorStop(1, '#74dffb');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, GW, GH);
      ct.refresh();
    }
  }
  const sea = scene.add.image(W / 2, H / 2, 'island-sea-gradient').setAlpha(alpha).setVisible(!o.fixedSea);
  container.add(sea);

  // 1b. 底部虚化椭圆（feather）：#56dddf 径向渐变，叠加在海面底部增加层次感
  const EW = 1024, EH = 320;
  if (!scene.textures.exists('island-sea-feather')) {
    const ct = scene.textures.createCanvas('island-sea-feather', EW, EH);
    if (ct) {
      const ctx = ct.context;
      const grad = ctx.createRadialGradient(EW / 2, EH / 2, 0, EW / 2, EH / 2, EW / 2);
      grad.addColorStop(0, 'rgba(86,221,223,0.85)');
      grad.addColorStop(0.55, 'rgba(86,221,223,0.30)');
      grad.addColorStop(1, 'rgba(86,221,223,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, EW, EH);
      ct.refresh();
    }
  }
  const feather = scene.add.image(W / 2, H, 'island-sea-feather')
    .setScale((W * 1.4) / EW, (H * 0.55) / EH)
    .setAlpha(alpha)
    .setVisible(!o.fixedSea);
  container.add(feather);

  // 1c. 海浪：开阔海面上的青色三角，缓慢浮动 + 呼吸（在海面之上、岛屿之下，不盖海岸）
  spawnSeaWaves(scene, container, grid, COLS, ROWS, S);

  // 2. 岛屿本体：离屏 Canvas2D 渲染（海岸 + 地块棋盘 + 碎片），透明底叠在海面上。
  //    海岸描边带宽（居中描边，向岛内半边被沙色底/棋盘盖住，向海面露出的半边可见）：
  //      沙环 #feea9d = sandWidth(18) → 可见 9px
  //      泡沫 #effceb = sandWidth+6(24) → 可见 3px 细线
  //      浅滩 #79e9dd(不透明度80%) = 46 → 可见约 11px，6px 高斯模糊羽化
  //    绘制顺序 浅滩→泡沫→沙环（沙环在最上），可见顺序 沙环→泡沫→浅滩→海水。
  // 超采样：离屏画布按 SS 倍分辨率绘制，显示时 setScale(1/SS) 缩回世界尺寸。
  // 相机 maxZoom = 1.6，SS = 2 可在最大放大时仍提供富余像素（贴图被降采样而非放大），
  // 避免 1:1 位图在 zoom > 1 时插值变糊。若日后调大 maxZoom，需同步提高 SS。
  const SS = 2;
  const islandKey = 'island-tiles';
  if (scene.textures.exists(islandKey)) scene.textures.remove(islandKey);
  const ct = scene.textures.createCanvas(islandKey, W * SS, H * SS);
  if (ct) {
    const ctx = ct.context;
    ctx.scale(SS, SS); // 之后所有绘制沿用世界坐标，自动放大 SS 倍（含 lineWidth / clip / 圆角）
    ctx.clearRect(0, 0, W, H);

    // 海岸：嵌套描边（浅滩→泡沫→沙环）+ 沙色底
    for (const loop of landLoops) {
      const path = loopPath2D(loop, S);
      // 浅滩单独加高斯模糊：边缘向海面羽化融入海水（向岛内半边被沙色底/棋盘盖住）。
      // 泡沫、沙环保持锐利。老 Safari 不支持 ctx.filter 时自动降级为实线，不报错。
      ctx.filter = 'blur(6px)';
      strokeW(ctx, path, 46, rgba(TILE_COLORS.shoal, 0.8));
      ctx.filter = 'none';
      strokeW(ctx, path, sandWidth + 6, hex(TILE_COLORS.foam));
      strokeW(ctx, path, sandWidth, hex(TILE_COLORS.sand));
      ctx.fillStyle = hex(TILE_COLORS.sandFill);
      ctx.fill(path);
    }

    // 各地块棋盘（沙→草→台，各自圆角轮廓裁剪）
    drawTileFieldCanvas(ctx, grid, COLS, ROWS, S, sandPred, sandLoops, hex(TILE_COLORS.sandFill), hex(TILE_COLORS.sandFill), NOISE.sand);
    drawTileFieldCanvas(ctx, grid, COLS, ROWS, S, grassPred, grassLoops, hex(TILE_COLORS.grassA), hex(TILE_COLORS.grassB), NOISE.grass);
    drawTileFieldCanvas(ctx, grid, COLS, ROWS, S, highPred, highLoops, hex(TILE_COLORS.highA), hex(TILE_COLORS.highB), NOISE.high);

    // 三角碎片
    drawDecoCanvas(ctx, grid, COLS, ROWS, S);

    ct.refresh();
  }
  const island = scene.add.image(0, 0, islandKey).setOrigin(0, 0).setScale(1 / SS).setAlpha(alpha);
  container.add(island);
}
