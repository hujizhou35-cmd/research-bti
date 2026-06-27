# CLAUDE.md · 研究生BTI 课题组牛马人格鉴定所

> Claude Code 常驻上下文。每次会话默认加载。完整设计史见 `docs/项目全景备忘录.md`，本文件只放**当前生效**的操作性事实与已锁定决策。

---

## 0. 项目身份 & 红线
- **名称**：研究生BTI · 课题组牛马人格鉴定所｜**Slogan**：40 道题，照出你在课题组的原形
- **性质**：纯前端静态站，娱乐向自评工具，面向中国大陆研究生传播。
- **产物**：《科研牛马人格鉴定证书》（竖屏 3:4，可导出 PNG 分享）。
- **红线（不可破）**：全站零真实人名；每个结果出口带免责声明；不引导退学/自伤等自毁行为；涉及经济/情感/师生否定等题，消极极只到"回避/拖延"，不得更重。

## 1. 技术栈 & 部署
- Vite + React 18 + TypeScript + Tailwind CSS。数据 JSON import，无后端无数据库。
- 导出：`html-to-image` 的 `toPng`；**雷达图用 SVG，不用 canvas**。
- 字体**全部自托管**于 `public/fonts/`，`@font-face` 本地引用，**禁止任何运行时 CDN**（含 Google Fonts）——国内访问约束。开发走 Clash 代理（7890/7897）。
- **部署：Cloudflare Pages**（`*.pages.dev`）。构建命令 `npm run build`，输出目录 `dist`，push 自动构建。
- **生产地址（拼写修正后）：`https://research-bti.pages.dev/`**（旧 `resarch-bti` 已废弃，见 §7）。

## 2. 四维度（锁定）
| 维度键 | 维度名 | 第一极(firstPole) | 第二极(secondPole) | 中间(value=2)语义 |
|---|---|---|---|---|
| CX | 控制点 | C 内控（向内归因） | X 外控（向外归因） | 辩证：自身/客观各半 |
| OA | 责任倾向 | O 过度负责 | A 逃避推诿 | **健康边界**：做好分内+合理分工 |
| PR | 沟通模式 | P 主动预警 | R 被动滞后 | 视情况：紧急即说 |
| TW | 危机应对 | T 韧性担当 | W 规避退缩 | **健康止损**：评估后求助/调整 |

类型 code 格式 `[C|X][O|A][P|R][T|W]`（第3位仅 P/R，第4位仅 T/W）。16 型定义与形象图见 `data/results.json` + `public/avatars/<code>.svg`，**本次不改**。

## 3. 数据文件 & 题库 schema（V2.0，已切换）
```
data/
├── questionsv5.json   # 当前生效题库：80 题，version "2.1"，scoringModel "polarity-graded-5"（v4 保留作回滚）
├── dimensions.json    # 维度定义（极性五级版，见 §4 末）
└── results.json       # 16 型结果（pros/cons/mentorTips/vibe），不变
```
> `questionsv4.json` 即原 `questions_v2.json`。**旧的 `questions.json`（V1.3 双极迫选）已弃用**，禁止再引用。

**题目结构（每题 5 选项的极性五级量表）：**
```jsonc
{
  "id": 1, "dimension": "CX", "firstPole": "C", "secondPole": "X",
  "theme": "实验挫折", "priority": 1,          // priority=1 进入娱乐版40题
  "text": "……，你会：",
  "options": [                                  // 恒 5 项，value 必为 {0,1,2,3,4} 各一
    {"text": "...", "pole": "C",   "value": 4}, // 强第一极
    {"text": "...", "pole": "C",   "value": 3}, // 偏第一极
    {"text": "...", "pole": "mid", "value": 2}, // 辩证/健康中间
    {"text": "...", "pole": "X",   "value": 1}, // 偏第二极
    {"text": "...", "pole": "X",   "value": 0}  // 强第二极
  ]
}
```
- `value` = 指向**第一极**的分值；`pole` 仅用于诊断/雷达分类，**计分只看 value**。
- 每维 20 题；其中 `priority===1` 各维恰 10 题（娱乐版用）。

## 4. 计分模型：极性五级（polarity-graded-5）—— 已替换 V1.3 计数法
```ts
// 单维度计分；items = 本维度被作答的题；answers[id] = 所选选项的 value(0..4)
function scoreDimension(items, answers, firstPole, secondPole) {
  const n   = items.length;                       // 娱乐版=10, 严谨版=20
  const raw = items.reduce((s, q) => s + answers[q.id], 0);
  const strength = (raw / (4 * n)) * 10;          // 第一极强度 ∈ [0,10]
  const picked   = strength > 5 ? firstPole : secondPole;  // =5 归第二极(保守极)
  const borderline = Math.abs(strength - 5) <= 0.75;
  return {
    raw, strength, picked, borderline,
    poles: { [firstPole]: strength, [secondPole]: 10 - strength } // 同维两极和恒=10
  };
}
```
- **公式对 n=10 与 n=20 通用** → 娱乐版/严谨版共用同一套计分与雷达，无需分叉。
- code = 四维 picked 按 CX→OA→PR→TW 拼接。
- **选项呈现随机化 = 整组方向翻转**（不可乱序，会破坏序数量表）：每题随机决定 5 项按"第一极→第二极"或反向呈现，作答记 value 不记位置。

**dimensions.json 应为：**
```json
{
  "scoringModel": "polarity-graded-5", "borderlineBand": 0.75,
  "dimensions": [
    {"key":"CX","name":"控制点","firstPole":{"key":"C","name":"内控"},"secondPole":{"key":"X","name":"外控"}},
    {"key":"OA","name":"责任倾向","firstPole":{"key":"O","name":"过度负责"},"secondPole":{"key":"A","name":"逃避推诿"},"mid":"健康边界"},
    {"key":"PR","name":"沟通模式","firstPole":{"key":"P","name":"主动预警"},"secondPole":{"key":"R","name":"被动滞后"}},
    {"key":"TW","name":"危机应对","firstPole":{"key":"T","name":"韧性担当"},"secondPole":{"key":"W","name":"规避退缩"},"mid":"健康止损"}
  ]
}
```

## 5. 双版本系统（娱乐版 / 严谨版）
- **起始页两按钮**，用户选其一后进入答题：
  - 🎢 **娱乐版 · 40 题**（约 5 分钟）：`questions.filter(q => q.priority === 1)`，每维 10 题。
  - 🔬 **严谨版 · 80 题**（约 12 分钟）：全部 80 题，每维 20 题。
- 选择存入全局 state（如 `mode: 'fun' | 'strict'`），驱动取题与计分的 n。
- **两版共用同一结果页、同一雷达图、同一 16 型结果**（计分已归一化，n 自动适配）。
- 证书上标注版本徽章（娱乐版/严谨版），流水号编码版本位：`NO. GB-<code>-F0042`（F=娱乐）/`-S0042`（S=严谨）。

## 6. 八向雷达图（两版均有，规格不变）
- 8 轴顺时针：**C → O → P → T → X → A → R → W**；半径 = 对应极强度 0..10；同维两极正对、半径之和=10。
- 底层同心八边形网格（刻度 0/2/4/6/8/10，`--grid`）；数据多边形描边 `--ink`、填充 `--stamp` 22%。
- picked 极轴线加粗、字母加粗。判别性：全 4 分拉向 C/O/P/T 侧，全 2 分≈正八边形，全 0 分拉向 X/A/R/W 侧。
- 雷达数据直接取自 §4 各维 `poles`，**娱乐版与严谨版调用完全相同的组件**。

## 7. 命名拼写修正（resarch → research）—— 已知历史错误
- **代码内**：全仓 `grep -ri "resarch"` 必须 0 命中（package.json name、README、`<title>`/OG/meta、任何硬编码 URL、注释、CI 配置）。
- **GitHub 仓库**：`resarch-bti` → 改名 `research-bti`（Settings→Rename，旧链接自动 301）；本地 `git remote set-url origin <新地址>`。
- **Cloudflare Pages**：`*.pages.dev` 子域**不能改名**（官方已知限制）→ **删除旧 `resarch-bti` 项目，新建 `research-bti` 项目**连到改名后的仓库，得到 `https://research-bti.pages.dev/`。
- 站内任何展示/分享用的 URL、二维码、OG image 链接一并更新为新址。

## 8. 设计系统（锁定）
```css
:root{ --paper:#ECEAE3; --paper-2:#E2DFD5; --ink:#1A1A17; --stamp:#B5322B; --marker:#E2A100; --grid:#C9C6BC; }
```
- vibe 徽章色：高危→`--stamp`，稀有→`--marker`，棘手→#C2701C，常见/少见→`--grid`。
- 字体：抬头=思源黑体 Heavy；正文=系统中文栈；流水号/分数=等宽（JetBrains/DM Mono）。均自托管。
- 证书结构：抬头(所名+流水号+条码+钢印) → 形象图+型名+tagline → 八向雷达 → 鉴定结论 → 优/缺两栏(✓绿/✗红) → 折叠的导师应对 → 免责声明。
- 签名动效：出结果时 `--stamp` 红钢印"啪"地落章，章面 4 字母 code + "QC PASSED"。

## 9. 已锁定决策（勿擅动）
- 计分按**极性 value** 而非选项位置；选项**整组翻转**随机化（非乱序）。
- 中间项(value=2)是健康边界/止损的**正当出口**，结果页 borderline 文案须解释为"倾向辩证、不极端"，而非"被迫落临界"。
- results.json / 16 型 / 形象图 / 证书版式 / 雷达 SVG **本轮不改**，只接新数据与新计分。
