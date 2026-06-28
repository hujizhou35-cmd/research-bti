import { useCallback, useMemo, useRef, useState } from 'react'
import { questions, funQuestions } from './lib/data'
import { computeResult } from './lib/scoring'
import { submitResponse } from './lib/submitClient'
import type { SelfReport } from './lib/collect'
import type { Answers, Mode, OptionValue, Question, ScoreResult } from './lib/types'
import ConsentModal from './components/ConsentModal'
import EffortCheck from './components/EffortCheck'
import Intro from './components/Intro'
import Quiz from './components/Quiz'
import ResultCard from './components/ResultCard'
import ShareBar from './components/ShareBar'

type View = 'intro' | 'quiz' | 'effort' | 'result'

// 作答缓存结构随 V2.0（value 计分 + 版本）变更，故 key 升到 v2。
const STORAGE_KEY = 'gradbti.session.v2'

// 知情同意：硬门槛（点击开始测试后弹出）。改文案时升版本号即可让所有人重新同意。
const CONSENT_KEY = 'gradbti.consent.v1'
const CONSENT_VERSION = 'v1'

interface ConsentRecord {
  version: string
  at: string
}

/** 每题选项是否整组翻转呈现（block-reverse）；记录用于方法学核查。 */
type Flips = Record<number, boolean>
/** 每题用时(ms)；记录用于防污染（筛速答者）。 */
type Times = Record<number, number>

interface SavedSession {
  mode: Mode
  answers: Answers
  flips?: Flips
  times?: Times
}

/** 待处理的开始动作：等用户同意知情同意后再执行。 */
interface Pending {
  mode: Mode
  resume: boolean
}

function buildFlips(items: Question[]): Flips {
  const m: Flips = {}
  for (const q of items) m[q.id] = Math.random() < 0.5
  return m
}

function loadConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConsentRecord
    return parsed && parsed.version === CONSENT_VERSION && typeof parsed.at === 'string' ? parsed : null
  } catch {
    return null
  }
}

function saveConsent(rec: ConsentRecord) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(rec))
  } catch {
    /* ignore */
  }
}

/** 取某版本的题集 */
export function itemsForMode(mode: Mode) {
  return mode === 'fun' ? funQuestions : questions
}

function isMode(v: unknown): v is Mode {
  return v === 'fun' || v === 'strict'
}

function modeFromUrl(): Mode | null {
  try {
    const v = new URLSearchParams(window.location.search).get('v')
    return isMode(v) ? v : null
  } catch {
    return null
  }
}

function syncUrl(mode: Mode | null) {
  try {
    const url = new URL(window.location.href)
    if (mode) url.searchParams.set('v', mode)
    else url.searchParams.delete('v')
    window.history.replaceState(null, '', url.toString())
  } catch {
    /* ignore */
  }
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedSession
    if (parsed && isMode(parsed.mode) && parsed.answers && typeof parsed.answers === 'object') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function saveSession(s: SavedSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}

function clearSaved() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function answeredCountOf(answers: Answers): number {
  return Object.values(answers).filter((v) => v === 0 || v === 1 || v === 2 || v === 3 || v === 4)
    .length
}

/** 流水号编码版本位：娱乐版 F、严谨版 S */
function makeSerial(code: string, mode: Mode): string {
  const n = Math.floor(1000 + Math.random() * 9000)
  const tag = mode === 'fun' ? 'F' : 'S'
  return `NO. GB-${code}-${tag}${n}`
}

export default function App() {
  const saved = useMemo(loadSession, [])
  const [consent, setConsent] = useState<ConsentRecord | null>(loadConsent)
  const [pending, setPending] = useState<Pending | null>(null)
  const [view, setView] = useState<View>('intro')
  const [mode, setMode] = useState<Mode>(saved?.mode ?? modeFromUrl() ?? 'fun')
  const [answers, setAnswers] = useState<Answers>(saved?.answers ?? {})
  const [flips, setFlips] = useState<Flips>(saved?.flips ?? {})
  const [times, setTimes] = useState<Times>(saved?.times ?? {})
  const [startIndex, setStartIndex] = useState(0)
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [serial, setSerial] = useState('')
  const [exporting, setExporting] = useState(false)
  const captureRef = useRef<HTMLDivElement>(null)
  const submittedRef = useRef(false)

  const savedTotal = saved ? itemsForMode(saved.mode).length : 0
  const savedAnswered = saved ? answeredCountOf(saved.answers) : 0
  const hasSaved = !!saved && savedAnswered > 0 && savedAnswered < savedTotal

  const items = itemsForMode(mode)

  const firstUnanswered = useCallback(
    (its = items, ans = answers) => {
      const idx = its.findIndex((q) => !(ans[q.id] >= 0 && ans[q.id] <= 4))
      return idx === -1 ? 0 : idx
    },
    [items, answers],
  )

  function doStart(selected: Mode) {
    const fresh: Answers = {}
    const freshFlips = buildFlips(itemsForMode(selected))
    const freshTimes: Times = {}
    submittedRef.current = false
    setMode(selected)
    setAnswers(fresh)
    setFlips(freshFlips)
    setTimes(freshTimes)
    saveSession({ mode: selected, answers: fresh, flips: freshFlips, times: freshTimes })
    syncUrl(selected)
    setStartIndex(0)
    setView('quiz')
  }

  function doResume() {
    if (!saved) return
    const resumeFlips = saved.flips ?? buildFlips(itemsForMode(saved.mode))
    const resumeTimes = saved.times ?? {}
    submittedRef.current = false
    setMode(saved.mode)
    setAnswers(saved.answers)
    setFlips(resumeFlips)
    setTimes(resumeTimes)
    saveSession({ mode: saved.mode, answers: saved.answers, flips: resumeFlips, times: resumeTimes })
    syncUrl(saved.mode)
    setStartIndex(firstUnanswered(itemsForMode(saved.mode), saved.answers))
    setView('quiz')
  }

  // 点「娱乐版/严谨版」：先过知情同意硬门槛，再开始。
  function requestStart(selected: Mode) {
    if (consent) doStart(selected)
    else setPending({ mode: selected, resume: false })
  }

  function requestResume() {
    if (!saved) return
    if (consent) doResume()
    else setPending({ mode: saved.mode, resume: true })
  }

  function handleAgree() {
    const rec: ConsentRecord = { version: CONSENT_VERSION, at: new Date().toISOString() }
    saveConsent(rec)
    setConsent(rec)
    const p = pending
    setPending(null)
    if (p) {
      if (p.resume) doResume()
      else doStart(p.mode)
    }
  }

  function handleCancelConsent() {
    setPending(null)
  }

  const handleAnswer = useCallback(
    (id: number, value: OptionValue, ms: number) => {
      setTimes((prevTimes) => {
        const nextTimes = { ...prevTimes, [id]: ms }
        setAnswers((prev) => {
          const next = { ...prev, [id]: value }
          saveSession({ mode, answers: next, flips, times: nextTimes })
          return next
        })
        return nextTimes
      })
    },
    [mode, flips],
  )

  // 答完所有题 → 进入「认真度自评」步骤（此时还不计分、不上报）。
  const handleQuizComplete = useCallback(() => {
    setView('effort')
    window.scrollTo(0, 0)
  }, [])

  // 自评提交后 → 计分、上报、出结果。
  const handleEffort = useCallback(
    (selfReport: SelfReport, turnstileToken: string) => {
      try {
        const r = computeResult(items, answers)
        setResult(r)
        setSerial(makeSerial(r.code, mode))
        if (consent && !submittedRef.current) {
          submittedRef.current = true
          submitResponse({
            items,
            answers,
            flips,
            times,
            mode,
            code: r.code,
            dimensions: r.dimensions,
            selfReport,
            turnstileToken,
            consentVersion: consent.version,
            consentAt: consent.at,
          })
        }
        clearSaved()
        setView('result')
        window.scrollTo(0, 0)
      } catch {
        setStartIndex(firstUnanswered())
        setView('quiz')
      }
    },
    [items, answers, mode, flips, times, consent, firstUnanswered],
  )

  function handleRetake() {
    submittedRef.current = false
    setAnswers({})
    setFlips({})
    setTimes({})
    clearSaved()
    syncUrl(null)
    setResult(null)
    setSerial('')
    setView('intro')
  }

  const content = useMemo(() => {
    if (view === 'quiz') {
      return (
        <Quiz
          items={items}
          mode={mode}
          answers={answers}
          flips={flips}
          startIndex={startIndex}
          onAnswer={handleAnswer}
          onComplete={handleQuizComplete}
          onExit={() => {
            syncUrl(null)
            setView('intro')
          }}
        />
      )
    }
    if (view === 'effort') {
      return <EffortCheck onSelect={handleEffort} />
    }
    if (view === 'result' && result) {
      return (
        <div className="flex min-h-screen flex-col items-center px-4 py-6">
          <ResultCard
            ref={captureRef}
            result={result}
            serial={serial}
            mode={mode}
            exporting={exporting}
          />
          <ShareBar
            result={result}
            serial={serial}
            captureRef={captureRef}
            onPrepareExport={setExporting}
            onRetake={handleRetake}
          />
        </div>
      )
    }
    return (
      <Intro
        onStart={requestStart}
        hasSaved={hasSaved}
        savedMode={saved?.mode}
        savedAnswered={savedAnswered}
        savedTotal={savedTotal}
        onResume={requestResume}
      />
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, items, mode, answers, flips, startIndex, result, serial, exporting, hasSaved, consent, pending])

  return (
    <main className="paper-grid min-h-screen">
      {content}
      {pending && !consent && (
        <ConsentModal onAgree={handleAgree} onCancel={handleCancelConsent} />
      )}
    </main>
  )
}
