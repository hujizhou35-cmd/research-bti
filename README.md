# 研究生BTI · 课题组牛马人格鉴定所

> 40 道题，照出你在课题组的原形。

一个 MBTI 式的科研人格趣味自评（纯前端静态站）。答完情境题，你会被盖章鉴定为
16 种「科研牛马型号」之一，并领到一张可截图分享的《科研牛马人格鉴定证书》。

**生产地址：<https://research-bti.pages.dev/>**

---

## 技术栈

- Vite + React 18 + TypeScript + Tailwind CSS
- 数据为 JSON import，**无后端、无数据库**
- 导出证书：`html-to-image` 的 `toPng`；雷达图用 SVG（非 canvas）
- 字体**全部自托管**于 `public/fonts/`，`@font-face` 本地引用，**禁止任何运行时 CDN**（国内访问约束）

## 本地开发

```bash
npm install
npm run dev        # 开发服务器
npm test           # vitest 单测（计分 / 雷达判别性）
npm run build      # tsc 类型检查 + vite 生产构建（输出 dist/）
npm run preview    # 预览 dist/ 产物
```

## 题库与计分（V2.0）

- 题库：`data/questionsv4.json`（**唯一题库源**，80 题，`version 2.0`，`scoringModel polarity-graded-5`）。
  旧的 `data/questions.json`（V1.3 双极迫选）已弃用并重命名为 `data/_deprecated.questions_v1.3.json`，禁止再引用。
- 每题 **5 选项极性五级量表**，选项带 `value ∈ {0,1,2,3,4}`（指向该维第一极 C/O/P/T 的分值）。
- 计分（`src/lib/scoring.ts` 的 `computeResult`）：每维 `strength = raw/(4*n)*10`，
  `picked = strength>5 ? 第一极 : 第二极`，`borderline = |strength-5| <= 0.75`。
  公式对娱乐版（每维 10 题）与严谨版（每维 20 题）**通用**。
- 选项呈现为**整组方向翻转随机化（block-reverse）**：每题随机决定整组按
  「第一极→第二极」或反向呈现，**不打乱相对顺序**，记 `value` 不记屏幕位置。

## 双版本

| 版本 | 题量 | 取题 | 流水号位 |
|---|---|---|---|
| 🎢 娱乐版 | 40 题（每维 10） | `priority === 1` | `NO. GB-<code>-F####` |
| 🔬 严谨版 | 80 题（每维 20） | 全部题 | `NO. GB-<code>-S####` |

两版共用同一结果页、雷达图、16 型结果与证书模板（计分已归一化）。版本通过全局 state +
URL query（`?v=fun` / `?v=strict`）保存，刷新与分享可复现。

---

## 部署 / 迁移（Cloudflare Pages）

部署在 **Cloudflare Pages**：构建命令 `npm run build`，输出目录 `dist`，push 自动构建。

### ⚠ 历史拼写修正：`resarch` → `research`（手动步骤）

仓库与线上子域曾有拼写错误 `resarch`。代码内已全部修正为 `research`；下列**仓库与平台操作需手动执行**：

**1. GitHub 仓库改名**

1. GitHub → 仓库 `resarch-bti` → Settings → Repository name → 改为 `research-bti` → Rename（旧链接自动 301）。
2. 本地更新 remote：
   ```bash
   git remote set-url origin git@github.com:<user>/research-bti.git   # 或 https 形式
   git remote -v                                                       # 确认
   ```

**2. Cloudflare Pages 删旧建新（关键：`*.pages.dev` 子域无法重命名）**

> Cloudflare 官方已知限制：Pages 项目的 `*.pages.dev` 子域**不能改名**，必须删旧建新。

1. Cloudflare Dashboard → Workers & Pages → 删除旧项目 `resarch-bti`。
2. 新建 Pages 项目，**项目名填 `research-bti`**，连接改名后的 GitHub 仓库；
   构建命令 `npm run build`、输出目录 `dist`，保留原构建环境变量与自定义构建配置。
3. 部署完成后访问 <https://research-bti.pages.dev/> 验证。
4. 如有自定义域名，把它指向新项目即可；旧项目删除后旧址自然失效。

---

## 红线（不可破）

- 全站零真实人名；每个结果出口带免责声明。
- 不引导退学/自伤等自毁行为；涉及经济/情感/师生否定等题，消极极只到「回避/拖延」。
- 中间项（`value=2`）是**健康边界 / 健康止损**的正当出口，结果页对 `borderline` 文案解释为
  「倾向辩证、不极端」，而非「被迫落临界」。

仅供娱乐，不构成任何心理学诊断或职业建议。
