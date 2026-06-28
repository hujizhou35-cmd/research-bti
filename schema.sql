-- D1 表结构：每份答卷一行。
-- 应用方式：wrangler d1 execute bti-responses --file schema.sql   （本地加 --local）
-- 或在 Cloudflare 后台 D1 控制台粘贴执行。
CREATE TABLE IF NOT EXISTS responses (
  id                TEXT PRIMARY KEY,   -- uuid
  created_at        TEXT NOT NULL,      -- 服务端写入时间 ISO8601
  questions_version TEXT NOT NULL,      -- 题库版本，如 2.1
  mode              TEXT NOT NULL,      -- fun(娱乐40) | strict(严谨80)
  consent_version   TEXT NOT NULL,      -- 知情同意版本，如 v1
  consent_at        TEXT NOT NULL,      -- 用户点击同意的时间 ISO8601
  code              TEXT NOT NULL,      -- 四字母人格 code
  strength_cx       REAL NOT NULL,      -- 控制点 第一极强度 0..10
  strength_oa       REAL NOT NULL,      -- 责任倾向
  strength_pr       REAL NOT NULL,      -- 沟通模式
  strength_tw       REAL NOT NULL,      -- 危机应对
  duration_ms       INTEGER,            -- 作答总用时(ms)，防污染：筛速答者
  self_report       TEXT,               -- 结尾认真度自评 serious|partial|careless
  answers           TEXT NOT NULL       -- JSON：{题号:{v,pole,flipped,pos,t}}（方法学核查，t=每题用时ms）
);

CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
