import { useCallback, useMemo, useRef, useState } from 'react'
import { questions, funQuestions } from './lib/data'
import { computeResult } from './lib/scoring'
import type { Answers, Mode, OptionValue, ScoreResult } from './lib/types'
import Intro from './components/Intro'
import Quiz from './components/Quiz'
import ResultCard from './components/ResultCard'
import ShareBar from './components/ShareBar'

type View = 'intro' | 'quiz' | 'result'

// 作答缓存结构随 V2.0（value 计分 + 版本）变更，故 key 升到 v2。
const STORAGE_KEY = 'gradbti.session.v2'

interface SavedSession {
  mode: Mode
  answers: Answers
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
  const [view, setView] = useState<View>('intro')
  const [mode, setMode] = useState<Mode>(saved?.mode ?? modeFromUrl() ?? 'fun')
  const [answers, setAnswers] = useState<Answers>(saved?.answers ?? {})
  const [startIndex, setStartIndex] = useState(0)
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [serial, setSerial] = useState('')
  const [exporting, setExporting] = useState(false)
  const captureRef = useRef<HTMLDivElement>(null)

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

  function handleStart(selected: Mode) {
    const fresh: Answers = {}
    setMode(selected)
    setAnswers(fresh)
    saveSession({ mode: selected, answers: fresh })
    syncUrl(selected)
    setStartIndex(0)
    setView('quiz')
  }

  function handleResume() {
    if (!saved) return
    setMode(saved.mode)
    setAnswers(saved.answers)
    syncUrl(saved.mode)
    setStartIndex(firstUnanswered(itemsForMode(saved.mode), saved.answers))
    setView('quiz')
  }

  const handleAnswer = useCallback(
    (id: number, value: OptionValue) => {
      setAnswers((prev) => {
        const next = { ...prev, [id]: value }
        saveSession({ mode, answers: next })
        return next
      })
    },
    [mode],
  )

  const handleComplete = useCallback(() => {
    try {
      const r = computeResult(items, answers)
      setResult(r)
      setSerial(makeSerial(r.code, mode))
      clearSaved()
      setView('result')
      window.scrollTo(0, 0)
    } catch {
      setStartIndex(firstUnanswered())
      setView('quiz')
    }
  }, [items, answers, mode, firstUnanswered])

  function handleRetake() {
    setAnswers({})
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
          startIndex={startIndex}
          onAnswer={handleAnswer}
          onComplete={handleComplete}
          onExit={() => {
            syncUrl(null)
            setView('intro')
          }}
        />
      )
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
        onStart={handleStart}
        hasSaved={hasSaved}
        savedMode={saved?.mode}
        savedAnswered={savedAnswered}
        savedTotal={savedTotal}
        onResume={handleResume}
      />
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, items, mode, answers, startIndex, result, serial, exporting, hasSaved])

  return <main className="paper-grid min-h-screen">{content}</main>
}
