import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const base = process.env.BTI_API_TEST_URL || 'http://127.0.0.1:8788'
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local API tests refuse production URLs')
const questions = JSON.parse(await fs.readFile('data/questionsv5.json','utf8')).questions.filter(q=>q.priority===1)
const answers = Object.fromEntries(questions.map(q=>[q.id,{v:4,pole:q.firstPole,flipped:false,pos:'A',t:3000}]))
const payload = { questionsVersion:'2.1',mode:'fun',consentVersion:'v2',consentAt:new Date().toISOString(),code:'COPT',strengths:{CX:10,OA:10,PR:10,TW:10},durationMs:questions.length*3000,selfReport:'serious',answers }
async function submit(extra={},origin=base) {return fetch(base+'/api/submit',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({...payload,clientId:'synthetic-'+crypto.randomUUID(),...extra})})}
for(const extra of [{},{locale:'ja',translationVersion:'2026-10-15.1'}]){
  const r=await submit(extra); assert.equal(r.status,200);assert.equal((await r.json()).ok,true)
}
assert.equal((await submit({locale:'invalid',translationVersion:'x'})).status,400)
assert.equal((await submit({},'https://other.test')).status,403)
assert.equal((await fetch(base+'/api/export')).status,401)
assert.equal((await fetch(base+'/api/export?key=wrong')).status,401)
const r=await fetch(base+'/api/export?key=synthetic-local-key')
assert.equal(r.status,200)
const csv=await r.text(),lines=csv.trim().split('\r\n')
assert.equal(lines.length,3)
assert.ok(lines[0].endsWith('"locale","translation_version"'))
assert.ok(lines.some(l=>l.endsWith(',"ja","2026-10-15.1"')))
assert.ok(lines.some(l=>l.endsWith(',"",""')))
console.log('PASS isolated D1 writes, legacy NULL metadata, Japanese metadata, validation, origin rejection and export authentication')
