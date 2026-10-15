import fs from 'node:fs/promises'
const summary = JSON.parse(await fs.readFile('docs/analysis/summary.json','utf8'))
const ui = JSON.parse(await fs.readFile('data/locales/ui.json','utf8'))
const fun = summary.modes.fun.main, full = summary.modes.strict.main
const cfg = {
  en: {
    filename: 'README.md', tagline: 'Meet your lab alter ego.', description: 'A playful self-assessment of how you work, communicate and cope in a research team. Pick a language, answer 40 or 80 situational questions, and take home a shareable certificate.',
    take: 'Take the test', typesLink: 'Explore the types', source: 'Download source', screenshot: 'Example certificate from demo answers, rendered by the application.',
    experience: 'Choose your pace', modes: ['Quick mode','Full mode'], times: ['About 5 minutes','About 12 minutes'], questions: 'Questions', time: 'Time', output: 'Both modes use the same four dimensions and sixteen fictional archetypes. Results include an eight-pole radar, strengths, quirks and collaboration tips. English, 中文 and 日本語 are available throughout.',
    storyTitle: 'Why I built this', story: 'While leading competition teams, I repeatedly ran into teammates who passed responsibility to others or failed to show up for the defense. It was frustrating, and it left me wondering: could team leaders and supervisors get an earlier sense of how people handle responsibility, communication and pressure?',
    storyEnd: 'Research BTI grew out of that question. Today it is an exploratory self-assessment and conversation starter. It has not demonstrated reliable prediction of team performance and should not determine who gets selected or excluded.',
    typesTitle: 'Sixteen ways to show up in the lab', typesAlt: 'All sixteen illustrated Research BTI archetypes, with type codes and short descriptions', typesText: 'The characters are fictional, deliberately exaggerated and meant for reflection—not a ranking of ability or character.',
    aiTitle: 'How the questions evolved', aiText: 'During development, AI simulated sixteen behavioral profiles over three rounds. Those responses were used to spot ambiguous scenarios, awkward answer gradients and options that made one answer too obviously desirable. The documented revision included 18 rewritten questions, 3 topic changes and 4 softened extreme options, while preserving the scoring framework.',
    aiEnd: 'These simulations were an editing aid, not independent human validation. Later revisions to questions 66, 71 and 77 are tracked separately in the pilot analysis.', methodLink: 'Development notes',
    pilotTitle: 'An initial pilot, with limits', pilotText: 'The production snapshot was extracted on **15 October 2026**; the latest stored response was **1 July 2026**. After one known automated test was removed, 83 responses remained in storage. Quality checks retained the following analysis samples:',
    retained: 'Retained responses', means: 'Mean first-pole strength · CX / OA / PR / TW', pilotNote: 'According to the initiator, early recruitment mainly targeted undergraduates at China Medical University. That background was not verified per response, and the university does not endorse this project. Samples are small and self-selected; CAPTCHA evidence is often absent. Preliminary reliability mainly concerns the older Chinese wording, and the quick mode has an adverse internal-consistency finding. Current revised and translated versions remain unvalidated.', report: 'Read the full findings, exclusions and sensitivity analyses',
    runTitle: 'Run it locally', runText: 'Node.js 22.12+ or 24 LTS. The default local frontend lets you explore the test and export certificates; collection requires a configured local or Cloudflare backend.', devLink: 'Development and deployment',
    privacyTitle: 'Privacy and responsible use', privacyText: 'Completed responses are collected with consent through Cloudflare Pages Functions and stored in D1. No name or student ID is requested. Responses include answers, timings, a random browser identifier and quality signals; new submissions also record language and translation version. Only aggregate findings are public. No automatic deletion period is configured.', privacyLink: 'Privacy details', disclaimer: 'For self-reflection and team communication, not psychological diagnosis or a validated personnel-selection tool.',
    licenseTitle: 'License', licenseText: 'Project-owned code, question text and illustrations are available under the MIT License. Bundled fonts and third-party dependencies retain their own licenses.', licenseLink: 'Third-party notices'
  },
  'zh-CN': {
    filename: 'README.zh-CN.md', tagline: '照出你在课题组的原形。', description: '一个关于科研团队协作方式的趣味自评。选择语言，回答 40 或 80 道情境题，领取一张可以保存和分享的科研牛马人格鉴定证书。',
    take: '开始测试', typesLink: '浏览类型图鉴', source: '下载源码', screenshot: '由应用实际生成的鉴定证书示例，使用演示答案。',
    experience: '选择适合你的节奏', modes: ['娱乐版','严谨版'], times: ['约 5 分钟','约 12 分钟'], questions: '题量', time: '时间', output: '两种模式共用四个维度、16 种虚构型号。结果包含八向雷达、优点、缺点与协作建议；中文、英文、日文贯穿完整流程。',
    storyTitle: '为什么做这个项目', story: '在担任比赛负责人时，我曾多次遇到队友推卸责任、缺席答辩的情况。这让我很郁闷，也开始思考：能否帮助比赛负责人和导师，更早了解团队成员在责任承担、沟通和压力应对上的倾向？',
    storyEnd: '研究生 BTI 由此诞生。目前它是探索性的自评与沟通工具，尚未证明能够可靠预测团队表现，不应据此决定选用或排除某个人。',
    typesTitle: '课题组里的 16 种型号', typesAlt: '16 种研究生 BTI 型号的形象、代码与简短描述', typesText: '角色是虚构且刻意夸张的标签，用于自我觉察，不是能力或品德排名。',
    aiTitle: '题目是怎样修出来的', aiText: '开发过程中，我让 AI 模拟 16 种行为原型，进行三轮作答，用来发现情境歧义、选项梯度不自然，以及「明显正确」答案过于突出的题目。现存优化记录包括 18 题重写、3 题主题调整、4 个极端选项软化，计分框架保持不变。',
    aiEnd: '这些模拟是修题辅助，不是独立真人验证。后续第 66、71、77 题的修改，在样本分析中另行记录。', methodLink: '开发方法说明',
    pilotTitle: '初步样本结果与局限', pilotText: '生产数据库快照提取于 **2026 年 10 月 15 日**，最新存储答卷日期为 **2026 年 7 月 1 日**。精确删除 1 份已知自动化测试答卷后，库中保留 83 份记录；质量检查后用于分析的样本如下：',
    retained: '保留答卷数', means: '第一极强度均值 · CX / OA / PR / TW', pilotNote: '据发起者介绍，早期主要面向中国医科大学本科生招募。学校与学历未逐份核实，本项目不代表校方。样本小且为自愿参与，验证码证据经常缺失；初步信度主要针对旧版中文题文，娱乐版也出现了不利的内部一致性结果。当前修订题文及英日翻译尚未得到验证。', report: '查看完整结果、排除规则与敏感性分析',
    runTitle: '本地运行', runText: '需要 Node.js 22.12+ 或 24 LTS。本地前端可用于体验、答题和导出证书；采集功能需要配置本地或 Cloudflare 后端。', devLink: '开发与部署说明',
    privacyTitle: '隐私与使用边界', privacyText: '完成答题并同意后，答卷经 Cloudflare Pages Functions 写入 D1 数据库。不要求姓名或学号；记录包括答案、用时、随机浏览器标识和质量信号，新答卷还包含语言与翻译版本。公开展示仅使用汇总结果，目前没有自动删除期限。', privacyLink: '完整隐私说明', disclaimer: '用于自我觉察和团队沟通，不是心理诊断或已验证的人员筛选工具。',
    licenseTitle: '许可证', licenseText: '项目自有代码、题目文案和形象采用 MIT 许可证；字体与第三方依赖保留各自许可。', licenseLink: '第三方许可说明'
  },
  ja: {
    filename: 'README.ja.md', tagline: '研究室での、もう一人の自分に会おう。', description: '研究チームでの働き方、伝え方、プレッシャーへの対応を振り返る、お楽しみ自己チェック。言語を選び、40問または80問の場面質問に答えると、保存・共有できる鑑定証を受け取れます。',
    take: 'テストを始める', typesLink: 'タイプ図鑑', source: 'ソースをダウンロード', screenshot: 'デモ回答を使い、アプリで実際に生成した鑑定証の例です。',
    experience: '自分のペースで', modes: ['お手軽版','フル版'], times: ['約5分','約12分'], questions: '質問数', time: '時間', output: 'どちらも共通の4側面と16種類の架空のキャラを使います。結果には8方向レーダー、長所、クセ、協働のヒントが含まれます。中国語・英語・日本語で全工程を利用できます。',
    storyTitle: 'このプロジェクトのきっかけ', story: 'コンテストのチームを率いる中で、責任を他人に回したり、発表審査に来なかったりする仲間に何度も出会いました。つらい経験から、「責任の担い方、情報共有、圧力への反応を、リーダーや指導教員がもっと早く知る方法はないか」と考えるようになりました。',
    storyEnd: 'Research BTIはその問いから生まれました。現在は探索的な自己チェックと対話のきっかけです。チームでの活躍を確実に予測できると示されたわけではなく、人の採否を決める根拠にはすべきではありません。',
    typesTitle: '研究室に現れる16タイプ', typesAlt: 'Research BTIの16種類のイラスト、タイプコード、短い説明', typesText: 'キャラは架空で、意図的に誇張されています。自己理解のためのもので、能力や人柄の順位ではありません。',
    aiTitle: '質問をどう改善したか', aiText: '開発中はAIに16種類の行動パターンを演じてもらい、3回の回答を通じて、場面の曖昧さ、不自然な選択肢の段階、「明らかに正しい」回答への誘導を確認しました。記録には18問の書き直し、3問のテーマ変更、4つの極端な選択肢の緩和があり、採点の枠組みは維持しました。',
    aiEnd: 'AIの模擬回答は編集補助であり、独立した人間による検証ではありません。その後の66・71・77問の変更は、初期データ分析で別に扱います。', methodLink: '開発方法',
    pilotTitle: '初期データと限界', pilotText: '本番データベースのスナップショット取得日は **2026年10月15日**、最後の回答日は **2026年7月1日** です。既知の自動テスト1件を削除した後、83件が保存されています。品質確認後の分析対象は次のとおりです。',
    retained: '分析対象の回答数', means: '第一極強度の平均 · CX / OA / PR / TW', pilotNote: '発起人によると、初期募集は主に中国医科大学の学部生を対象にしていました。学校や学歴は回答ごとに確認しておらず、大学の推薦でもありません。小さな任意参加サンプルで、認証の証拠がない回答も多くあります。初期の信頼性は主に旧中国語版のもので、お手軽版には内部一貫性の問題も見られます。現行の修正版と英日翻訳版は未検証です。', report: '全結果・除外規則・感度分析を読む',
    runTitle: 'ローカルで動かす', runText: 'Node.js 22.12以降または24 LTSが必要です。ローカルのフロントエンドで回答や鑑定証の保存を試せます。データ収集にはローカルまたはCloudflareのバックエンド設定が必要です。', devLink: '開発とデプロイ',
    privacyTitle: 'プライバシーと使い方', privacyText: '回答完了と同意の後、Cloudflare Pages Functionsを通じてD1に保存します。氏名や学籍番号は求めません。回答、時間、ランダムなブラウザー識別子、品質確認の情報を保存し、新しい回答には言語と翻訳の版も記録します。公開するのは集計のみで、自動削除の期限は未設定です。', privacyLink: 'プライバシーの詳細', disclaimer: '自己理解とチーム内の対話の参考用です。心理診断や、妥当性が確認された人の選別ツールではありません。',
    licenseTitle: 'ライセンス', licenseText: 'プロジェクト独自のコード、質問、イラストはMITライセンスです。フォントと第三者の依存関係には、それぞれのライセンスが適用されます。', licenseLink: '第三者ライセンス'
  }
}
for (const [lang,c] of Object.entries(cfg)) {
  const languageLinks = '[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md)'
  const means = d => Object.values(d.dimensions).map(v=>new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v.mean)).join(' / ')
  const md = `# Research BTI\n\n**${c.tagline}**\n\n${languageLinks}\n\n${c.description}\n\n**[${c.take} →](https://research-bti.pages.dev/?lang=${lang})** · [${c.typesLink}](https://research-bti.pages.dev/?lang=${lang}&gallery=1) · [${c.source}](https://github.com/hujizhou35-cmd/research-bti/releases/latest)\n\n<p align="center"><img src="docs/assets/certificate-${lang}.png" width="380" alt="${c.screenshot}"></p>\n\n*${c.screenshot}*\n\n## ${c.experience}\n\n| | ${c.questions} | ${c.time} |\n|---|---:|---|\n| ${c.modes[0]} | 40 | ${c.times[0]} |\n| ${c.modes[1]} | 80 | ${c.times[1]} |\n\n${c.output}\n\n## ${c.storyTitle}\n\n${c.story}\n\n${c.storyEnd}\n\n## ${c.typesTitle}\n\n![${c.typesAlt}](docs/assets/types-${lang}.png)\n\n${c.typesText}\n\n## ${c.aiTitle}\n\n${c.aiText}\n\n${c.aiEnd} [${c.methodLink}](docs/methodology.md).\n\n## ${c.pilotTitle}\n\n${c.pilotText}\n\n| | ${c.retained} | ${c.means} |\n|---|---:|---|\n| ${c.modes[0]} | ${fun.n} | ${means(fun)} |\n| ${c.modes[1]} | ${full.n} | ${means(full)} |\n\n![${lang==='zh-CN'?'类型数量与四维得分（均值±标准差）':lang==='ja'?'タイプ件数と4側面の得点（平均±標準偏差）':'Type counts and dimension scores (mean ± SD)'}](docs/analysis/pilot-summary.png)\n\n${c.pilotNote}\n\n[${c.report}](docs/analysis/README.md).\n\n## ${c.runTitle}\n\n${c.runText}\n\n\x60\x60\x60bash\nnpm ci\nnpm run dev\n\x60\x60\x60\n\n[${c.devLink}](docs/development.md)\n\n## ${c.privacyTitle}\n\n${c.privacyText}\n\n[${c.privacyLink}](docs/privacy.${lang}.md) · ${c.disclaimer}\n\n## ${c.licenseTitle}\n\n${c.licenseText}\n\n[MIT](LICENSE) · [${c.licenseLink}](docs/third-party-notices.md)\n`
  await fs.writeFile(c.filename,md)
  const privacy = `# ${ui[lang].privacy}\n\n[English](privacy.en.md) · [中文](privacy.zh-CN.md) · [日本語](privacy.ja.md)\n\n${['consentIntro','consentData','consentUse','consentService','consentRights','consentDisclaimer'].map(k=>ui[lang][k]).join('\n\n')}\n\n${ui[lang].contact}: [opusdog@163.com](mailto:opusdog@163.com)\n\n[Cloudflare privacy](https://www.cloudflare.com/privacypolicy/) · [GeeTest privacy](https://www.geetest.com/en/Privacy)\n\n2026-10-15 · v2\n`
  await fs.writeFile('docs/privacy.'+lang+'.md',privacy)
}
