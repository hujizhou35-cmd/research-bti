// 字体子集化脚本：把 Noto Sans SC 的简体中文全集子集化到「本应用可能出现的字符」，
// 自托管到 public/fonts/，避免 @fontsource 数百个分片导致 html-to-image 导出卡死。
// 用法：node scripts/subset-fonts.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const NM = resolve(root, 'node_modules/@fontsource')
// 放进 src/assets/fonts，让 Vite 打包+按 base 重写 URL（部署到任意子目录都不掉字）
const OUT = resolve(root, 'src/assets/fonts')
mkdirSync(OUT, { recursive: true })

// 1. 收集字符：数据文件 + 全部源码 + 形象 SVG 文本
function readAll(dir, exts) {
  let text = ''
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, name.name)
    if (name.isDirectory()) text += readAll(p, exts)
    else if (exts.some((e) => name.name.endsWith(e))) text += readFileSync(p, 'utf8')
  }
  return text
}

let corpus = ''
corpus += readAll(resolve(root, 'data'), ['.json'])
corpus += readAll(resolve(root, 'src'), ['.ts', '.tsx', '.css'])
corpus += readAll(resolve(root, 'public/avatars'), ['.svg'])
// 兜底：ASCII 可见字符 + 常用中文标点 + 数字
corpus +=
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'
corpus += '·—…“”‘’《》【】、，。：；？！（）±★→←↑↓§✓✗⚠'

const chars = Array.from(new Set(Array.from(corpus))).join('')
console.log(`收集到唯一字符 ${Array.from(new Set(Array.from(corpus))).length} 个`)

// 2. 子集化 Noto Sans SC 的简体中文全集（CJK 部分）
const notoFiles = resolve(NM, 'noto-sans-sc/files')
for (const w of [500, 700, 900]) {
  const src = readFileSync(resolve(notoFiles, `noto-sans-sc-chinese-simplified-${w}-normal.woff2`))
  const sub = await subsetFont(src, chars, { targetFormat: 'woff2' })
  const dest = resolve(OUT, `noto-sc-cjk-${w}.woff2`)
  writeFileSync(dest, sub)
  console.log(`✓ noto-sc-cjk-${w}.woff2  ${(sub.length / 1024).toFixed(1)} KB`)
  // 拉丁/数字部分体积很小，原样拷贝（与 CJK 子集同族不同 unicode-range）
  copyFileSync(
    resolve(notoFiles, `noto-sans-sc-latin-${w}-normal.woff2`),
    resolve(OUT, `noto-sc-latin-${w}.woff2`),
  )
}

// 3. DM Mono（仅拉丁，本就很小，原样拷贝）
const dmFiles = resolve(NM, 'dm-mono/files')
for (const w of [400, 500]) {
  copyFileSync(resolve(dmFiles, `dm-mono-latin-${w}-normal.woff2`), resolve(OUT, `dm-mono-${w}.woff2`))
}
console.log('字体子集化完成 → public/fonts/')
