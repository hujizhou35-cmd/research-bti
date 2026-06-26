# Claude Code 任务 Prompt —— 题库替换 + 部署 + 测试

> 把这整段粘给 Claude Code，它会按顺序引导你完成。
> 你只需要在"需要你操作"的节点按提示点击或输入，其余由 Claude Code 完成。

---

## 背景

项目是「研究生BTI · 课题组牛马人格鉴定所」——已有一版可运行的软件，
现在要做两件事：① 替换题库，② 部署到互联网，让别人复制链接就能直接打开。

---

## 任务一：替换题库

**目标**：把当前项目的 `data/questions.json` 替换为 `data/questionsv3.json`，
其他所有文件（results.json、dimensions.json、组件、样式、逻辑）**一律不动**。

**执行步骤**：

1. 先确认 `data/questionsv3.json` 存在，读取它的 `version` 字段和题目数量，打印给我看。
2. 确认当前软件里所有读取题库的代码，指向的是 `questions.json` 还是通过变量引用。
3. **方式 A（推荐）**：直接将 `questionsv3.json` 的内容覆盖写入 `questions.json`，
   文件名不变（这样其他代码零改动）。覆盖前备份原文件为 `questions_v1.json`。
4. 如果当前代码里题库路径是硬编码字符串，才做路径替换；否则不动代码。
5. 替换完成后运行 `npm run build`，确认编译通过，打印构建产物大小。

**验收**：
- `questions.json` 的 `version` 字段为 `1.3`，题目数为 40。
- `npm run build` 通过，无报错。
- `questions_v1.json`（备份）存在。

---

## 任务二：部署静态网站

### 为什么不用 Cloudflare Pages

你的用户全在中国大陆。Cloudflare Pages 免费版**没有国内节点**，
国内访问会绕道美国，延迟 200-400ms，首屏 3-5 秒，用户体验极差。

### 推荐方案：腾讯云 EdgeOne Pages 国际站（免费 · 无需备案 · 国内快）

- 地址：**https://edgeone.ai/products/pages**
- 完全免费，永久有效，无需绑信用卡/银行卡/手机号
- 只用邮箱 + GitHub 账号注册
- 支持 GitHub 仓库自动构建（push 后自动更新）
- 使用腾讯云国际 CDN，国内访问速度显著优于 Cloudflare Pages 和 Vercel
- 无需域名备案（国际站节点，含亚太节点）
- 构建命令 `npm run build`，输出目录 `dist`

---

### 部署流程（Claude Code 引导，需要你点击的地方我会高亮提示）

#### 第 0 步：检查本地环境

```bash
# 检查 git 是否安装
git --version

# 检查当前目录是否已是 git 仓库
git status

# 检查 npm run build 是否通过（如果任务一已做过就跳过）
npm run build
```

如果 git 未安装，我会给出安装命令；如果未初始化仓库，继续第 1 步。

---

#### 第 1 步：初始化 Git 仓库并推送到 GitHub

```bash
# 初始化（如已是 git 仓库，跳过）
git init
git add .
git commit -m "init: research-bti v1.3 with new question bank"
```

然后我会提示你：

> 🖱️ **你需要操作**：
> 1. 打开 https://github.com/new
> 2. 仓库名填：`research-bti`（或你喜欢的名字）
> 3. 选 **Private**（防止题库被随意搬运）或 Public 都行
> 4. **不要勾选** "Add a README file"（已有内容，勾了会冲突）
> 5. 点击 **Create repository**
> 6. 把页面上显示的仓库地址（`https://github.com/你的用户名/research-bti.git`）告诉我

我拿到地址后执行：
```bash
git remote add origin <你给的地址>
git branch -M main
git push -u origin main
```

---

#### 第 2 步：在 EdgeOne Pages 创建项目

> 🖱️ **你需要操作**（我会一步步告诉你点哪里）：
>
> 1. 打开 **https://edgeone.ai/products/pages**，点右上角 **Sign Up / 注册**
> 2. 用邮箱注册，或直接点 **Continue with GitHub**（推荐，省一步）
> 3. 注册成功后，你会看到一个 EdgeOne Pages 控制台。
>    **注意**：如果跳转到"14天试用"页面，**直接忽略/跳过**，
>    那是 EdgeOne CDN 服务的试用，跟 Pages 无关，Pages 本身永久免费。
> 4. 点 **Create Project** 或 **New Project**
> 5. 选 **Connect to Git** → **GitHub**，授权 EdgeOne 访问你的 GitHub 仓库
> 6. 找到 `research-bti` 仓库，点 **Select**（或 Import）
> 7. 构建设置填写：
>    - **Build Command**：`npm run build`
>    - **Build Output Directory**：`dist`
>    - **Node.js Version**：选 `20.x`（或最新 LTS，不要选 14/16）
> 8. 点 **Deploy**，等待构建完成（约 1-3 分钟）
> 9. 构建成功后，你会得到一个 `xxxxx.edgeone.app` 的地址——把这个地址告诉我

---

#### 第 3 步（可选，推荐）：换一个更好看的二级域名

EdgeOne 默认给的域名是随机字符串，可以在项目设置里改：

> 🖱️ **你需要操作**：
> - 进入项目 → **Settings** → **Custom Domains** 或 **Project Settings**
> - 找到"改名"或"别名"选项，把域名前缀改成 `research-bti` 或 `gradbti`
> - 最终格式：`research-bti.edgeone.app`（更好记，分享更美观）

---

#### 第 4 步：配置自动部署（push 后自动更新）

EdgeOne Pages 默认已开启：每次 `git push origin main` 后，
它会自动拉取新代码、重新构建、重新部署，无需手动上传。

你以后更新的流程：
```bash
# 改完代码后
git add .
git commit -m "update: 描述本次改了什么"
git push origin main
# → EdgeOne 自动触发重新部署，约 1-3 分钟后线上更新
```

---

## 任务三：测试与检查

部署完成、拿到 `xxxxx.edgeone.app` 地址后，我会执行以下测试：

### 3.1 功能测试（Claude Code 自动做）

```bash
# 用 curl 检查首页是否返回 200
curl -s -o /dev/null -w "%{http_code}" https://xxxxx.edgeone.app

# 检查核心静态资源是否可达
curl -s -o /dev/null -w "%{http_code}" https://xxxxx.edgeone.app/assets/index-xxx.js
```

### 3.2 人工测试清单（你来做，我告诉你看什么）

部署完成后请你在手机浏览器（微信内置浏览器 / Safari / Chrome）打开链接，确认：

- [ ] 首页正常显示（门面名、slogan、开始鉴定按钮）
- [ ] 点击开始后，第 1 题正常展示，A/B 两个选项可点击
- [ ] 进度条显示"1/40"
- [ ] 点"上一题"可以退回
- [ ] 答完 40 题后自动跳出结果页
- [ ] 结果页有：型号形象图 + 型号名 + 雷达图 + 优点/缺点 + 折叠的导师措施
- [ ] "保存图片"按钮能导出 PNG 证书
- [ ] 在不同手机上（或用浏览器缩窄窗口模拟移动端）布局正常
- [ ] 全站无"金舟"等真实人名出现

### 3.3 性能检查

把链接发到 **https://www.itdog.cn/http/** 做国内多点测速，
查看各省延迟是否在可接受范围（< 500ms），截图告诉我结果。

---

## 沟通方式

- 每完成一个任务（题库替换 / 推送 GitHub / EdgeOne 部署完成 / 测试结果），**停下来汇报**，等我确认再继续。
- 每一个需要你去浏览器操作的步骤，我会**明确告诉你点哪里、填什么**，不要自己猜。
- 如果某个步骤报错（构建失败、GitHub push 失败、EdgeOne 构建失败），**把完整错误信息粘给我**，别自己猜着改。
- 遇到网络问题（npm install 慢、push 慢）：你的 Clash 代理端口是 7890/7897，
  可以先执行 `git config --global http.proxy http://127.0.0.1:7890` 再 push。

---

## 一些你可能遇到的问题

| 问题 | 原因 | 解决 |
|---|---|---|
| `git push` 报认证失败 | GitHub 已取消密码登录 | 在 GitHub → Settings → Developer settings → Personal access tokens 生成 token，用 token 替换密码 |
| EdgeOne 构建失败，报 Node 版本问题 | 项目需要 Node 18+ | Settings 里把 Node.js 版本改成 20.x |
| EdgeOne 构建失败，报找不到 dist | 输出目录填错 | Build Output Directory 确认是 `dist`（Vite 默认），不是 `build` |
| 页面打开是空白 | 路由配置问题 | 在 EdgeOne Pages 项目设置里，找 "Not Found" / "404" 处理，设置为返回 `/index.html`（SPA 路由需要） |
| npm install 超时 | 国内拉包慢 | 先在本地跑，或在 EdgeOne 构建设置的环境变量里加 `npm_config_registry=https://registry.npmmirror.com` |

---

**现在从任务一开始。请先读 `CLAUDE.md`，然后告诉我你对整体任务的理解和计划。**
