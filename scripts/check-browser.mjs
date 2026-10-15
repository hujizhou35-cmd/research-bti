import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'

const base = process.env.BTI_TEST_URL || 'http://127.0.0.1:5173/'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Browser tests must use an isolated local site')
const out = path.resolve(process.env.BTI_TEST_OUTPUT || 'test-results/browser')
await fs.mkdir(out, { recursive: true })
const ui = JSON.parse(await fs.readFile('data/locales/ui.json', 'utf8'))
const browser = await chromium.launch({ headless: true, ...(process.env.BTI_BROWSER_CHANNEL ? { channel: process.env.BTI_BROWSER_CHANNEL } : {}) })
const results = []
try {
  const first = await browser.newPage()
  await first.goto(base)
  await first.getByRole('button', { name: 'English', exact: true }).click()
  await first.getByRole('button', { name: /Quick mode.*40/ }).waitFor()
  await first.close()
  for (const lang of ['zh-CN', 'en', 'ja']) {
    for (const mode of ['fun', 'strict']) {
      const context = await browser.newContext({ viewport: mode === 'fun' ? { width: 390, height: 844 } : { width: 1280, height: 960 }, acceptDownloads: true, reducedMotion: 'reduce' })
      const page = await context.newPage()
      const errors = [], submissions = []
      page.on('pageerror', e => errors.push(e.message))
      await page.route('**/api/submit', async route => {
        submissions.push(route.request().postDataJSON())
        // A failed collection request must still lead to a certificate.
        await route.fulfill({ status: mode === 'fun' ? 500 : 200, contentType: 'application/json', body: mode === 'fun' ? '{"ok":false}' : '{"ok":true,"id":"synthetic-local-test"}' })
      })
      await page.goto(base + '?lang=' + lang)
      await page.getByRole('button', { name: new RegExp(ui[lang][mode] + '.*' + (mode === 'fun' ? '40' : '80')) }).click()
      const dialog = page.getByRole('dialog')
      await dialog.waitFor()
      assert.equal(submissions.length, 0)
      // Declining must not begin the quiz or send a response.
      await dialog.getByRole('button', { name: ui[lang].decline, exact: true }).click()
      assert.equal(await page.locator('[data-question-id]').count(), 0)
      await page.getByRole('button', { name: new RegExp(ui[lang][mode] + '.*' + (mode === 'fun' ? '40' : '80')) }).click()
      await page.getByRole('button', { name: ui[lang].agree, exact: true }).click()
      const total = mode === 'fun' ? 40 : 80
      for (let i = 0; i < total; i++) {
        const question = page.locator('[data-question-id]')
        await question.waitFor()
        const id = await question.getAttribute('data-question-id')
        await page.locator('[data-option-value="4"]').click()
        if (i < total - 1) await page.waitForFunction(old => document.querySelector('[data-question-id]')?.getAttribute('data-question-id') !== old, id)
        if (i === 2) {
          await page.getByRole('button', { name: '← ' + ui[lang].previous, exact: true }).click()
          assert.equal(await page.locator('[data-option-value="4"]').getAttribute('aria-pressed'), 'true')
          await page.getByRole('button', { name: ui[lang].next + ' →', exact: true }).click()
        }
        if (i === 4) {
          await page.reload()
          await page.getByRole('button', { name: new RegExp(ui[lang].resume) }).click()
        }
      }
      await page.getByRole('button', { name: ui[lang].serious, exact: true }).click()
      const certificate = page.getByTestId('certificate')
      await certificate.waitFor()
      await page.waitForFunction(() => document.fonts.status === 'loaded')
      await page.waitForFunction(() => document.querySelector('[data-testid="certificate"] [role="img"] svg'))
      assert.equal(submissions.length, 1)
      assert.equal(submissions[0].locale, lang)
      assert.equal(submissions[0].code, 'COPT')
      assert.equal(Object.keys(submissions[0].answers).length, total)
      assert.equal(submissions[0].translationVersion, '2026-10-15.1')
      assert.equal(await page.locator('html').getAttribute('lang'), lang)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: ui[lang].save, exact: true }).click()
      const download = await downloadPromise
      await download.saveAs(path.join(out, 'certificate-' + lang + '-' + mode + '.png'))
      await certificate.screenshot({ path: path.join(out, 'screen-' + lang + '-' + mode + '.png') })
      await page.getByRole('button', { name: ui[lang].copy, exact: true }).click()
      await page.waitForFunction(({good,bad}) => [good,bad].includes(document.querySelector('[aria-live="polite"]')?.textContent), { good: ui[lang].copied, bad: ui[lang].copyFailed })
      // Chromium may deny clipboard in headless mode; the localized status must be visible.
      assert.ok(await page.getByText(ui[lang].copied, { exact: true }).count() || await page.getByText(ui[lang].copyFailed, { exact: true }).count())
      await page.getByRole('button', { name: ui[lang].retake, exact: true }).click()
      await page.getByRole('button', { name: new RegExp(ui[lang].fun + '.*40') }).waitFor()
      assert.equal(errors.length, 0, errors.join('\n'))
      results.push({ lang, mode, questions: total, passed: true })
      console.log('PASS ' + lang + ' ' + mode)
      await context.close()
    }
    const gallery = await browser.newPage({ viewport: { width: 1280, height: 960 } })
    await gallery.goto(base + '?lang=' + lang + '&gallery=1')
    await gallery.locator('article').last().waitFor()
    await gallery.waitForFunction(() => document.querySelectorAll('article [role="img"] svg').length === 16 && document.fonts.status === 'loaded')
    assert.equal(await gallery.locator('article').count(), 16)
    assert.equal(await gallery.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await gallery.screenshot({ path: path.join(out, 'gallery-' + lang + '.png'), fullPage: true })
    await gallery.close()
  }
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(results, null, 2))
} finally { await browser.close() }
