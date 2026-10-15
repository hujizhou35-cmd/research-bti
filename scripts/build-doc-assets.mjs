import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'
const base = process.env.BTI_TEST_URL || 'http://127.0.0.1:5173/'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use a local development server')
await fs.mkdir('docs/assets', { recursive: true })
const browser = await chromium.launch({ headless: true, ...(process.env.BTI_BROWSER_CHANNEL ? { channel: process.env.BTI_BROWSER_CHANNEL } : {}) })
const questions = JSON.parse(await fs.readFile('data/questionsv5.json','utf8')).questions.filter(q=>q.priority===1)
const ui = JSON.parse(await fs.readFile('data/locales/ui.json','utf8'))
try {
  for (const lang of ['en','zh-CN','ja']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 })
    await page.goto(base + '?lang=' + lang)
    await page.evaluate(async lang => {
      const { localizeAvatar } = await import('/src/lib/avatar.ts')
      const { localizeResult } = await import('/src/lib/locale.ts')
      const { types } = await fetch('/data/results.json').then(r => r.json())
      const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;')
      const titles = { en: 'Meet the 16 lab archetypes', 'zh-CN': '认识 16 种科研牛马型号', ja: '研究室キャラ16タイプ図鑑' }
      const notes = { en: 'Fictional characters · One shared scoring system · No ranking', 'zh-CN': '虚构角色 · 同一套计分 · 不代表能力或品德排名', ja: '架空のキャラ · 共通の採点方式 · 能力や人柄の順位ではありません' }
      const cards = await Promise.all(types.map(async type => {
        const raw = await fetch('/avatars/' + type.code + '.svg').then(r => r.text())
        return '<article>' + localizeAvatar(raw, type, lang) + '<p>' + esc(localizeResult(type,lang).tagline) + '</p></article>'
      }))
      document.body.innerHTML = '<div id="contact-sheet"><header><b>RESEARCH BTI</b><h1>' + titles[lang] + '</h1><p>' + notes[lang] + '</p></header><div class="types-grid">' + cards.join('') + '</div></div>'
      const style = document.createElement('style')
      style.textContent = 'body{margin:0;background:#ECEAE3;color:#1A1A17}#contact-sheet{padding:40px;font-family:' + (lang==='ja' ? '"Noto Sans JP"' : '"Noto Sans SC"') + ',sans-serif}header{border-bottom:3px solid #1A1A17;padding-bottom:22px;margin-bottom:26px}header b{font:14px "DM Mono",monospace;letter-spacing:4px;color:#B5322B}h1{font-size:38px;margin:8px 0}header p{font-size:17px;margin:0}.types-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px}article{min-width:0}article svg{display:block;width:100%;height:auto}article p{font-size:16px;line-height:1.5;min-height:48px;margin:8px 0 0;padding:0 6px}'
      document.head.append(style)
      await document.fonts.ready
    }, lang)
    await page.waitForFunction(() => document.fonts.status === 'loaded')
    await page.locator('#contact-sheet').screenshot({ path: path.resolve('docs/assets/types-' + lang + '.png') })
    await page.close()
    const certificate = await browser.newPage({ viewport: { width: 1000, height: 1200 }, reducedMotion: 'reduce', deviceScaleFactor: 2 })
    await certificate.addInitScript(({lang,questions}) => {
      const subset = questions.slice(0,-1)
      localStorage.setItem('gradbti.session.v2',JSON.stringify({locale:lang,mode:'fun',answers:Object.fromEntries(subset.map(q=>[q.id,4])),flips:Object.fromEntries(questions.map(q=>[q.id,false])),times:Object.fromEntries(subset.map(q=>[q.id,3000]))}))
      localStorage.setItem('gradbti.consent.v2',JSON.stringify({version:'v2',at:new Date().toISOString()}))
    },{lang,questions})
    await certificate.route('**/api/submit',route=>route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"id":"synthetic-doc-preview"}'}))
    await certificate.goto(base+'?lang='+lang)
    await certificate.getByRole('button',{name:new RegExp(ui[lang].resume)}).click()
    await certificate.locator('[data-option-value="4"]').click()
    await certificate.getByRole('button',{name:ui[lang].serious,exact:true}).click()
    const card=certificate.getByTestId('certificate')
    await card.waitFor()
    await certificate.waitForFunction(()=>document.querySelector('[data-testid="certificate"] [role="img"] svg')&&document.fonts.status==='loaded')
    const box=await card.boundingBox(), firstSection=await card.locator('section').first().boundingBox()
    await certificate.screenshot({path:path.resolve('docs/assets/certificate-'+lang+'.png'),clip:{x:box.x,y:box.y,width:box.width,height:firstSection.y+firstSection.height-box.y}})
    await certificate.close()
  }
} finally { await browser.close() }
