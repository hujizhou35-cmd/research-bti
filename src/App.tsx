import { useCallback, useMemo, useRef, useState } from 'react'
import { questions } from './lib/data'
import { score } from './lib/scoring'
import type { Answers, Choice, ScoreResult } from './lib/types'
import Intro from './components/Intro'
import Quiz from './components/Quiz'
import ResultCard from './components/ResultCard'
import ShareBar from './components/ShareBar'

type View = 'intro' | 'quiz' | 'result'

const STORAGE_KEY = 'gradbti.answers.v1'

function loadAnswers(): Answers {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Answers
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveAnswers(a: Answers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(a))
  } catch {
    /* localStorage 不可用时静默降级（仍能正常答题，只是不缓存进度） */
  }
}

function clearSaved() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function makeSerial(code: string): string {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `NO. GB-${code}-${n}`
}

export default function App() {
  const [view, setView] = useState<View>('intro')
  const [answers, setAnswers] = useState<Answers>(() => loadAnswers())
  const [startIndex, setStartIndex] = useState(0)
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [serial, setSerial] = useState('')
  const [exporting, setExporting] = useState(false)
  const captureRef = useRef<HTMLDivElement>(null)

  const total = questions.length
  const answeredCount = Object.keys(answers).filter(
    (id) => answers[Number(id)] === 'A' || answers[Number(id)] === 'B',
  ).length
  const hasSaved = answeredCount > 0 && answeredCount < total

  const firstUnanswered = useCallback(() => {
    const idx = questions.findIndex(
      (q) => answers[q.id] !== 'A' && answers[q.id] !== 'B',
    )
    return idx === -1 ? 0 : idx
  }, [answers])

  function handleStart() {
    const fresh: Answers = {}
    setAnswers(fresh)
    saveAnswers(fresh)
    setStartIndex(0)
    setView('quiz')
  }

  function handleResume() {
    setStartIndex(firstUnanswered())
    setView('quiz')
  }

  const handleAnswer = useCallback((id: number, choice: Choice) => {
    setAnswers((prev) => {
      const next = { ...prev, [id]: choice }
      saveAnswers(next)
      return next
    })
  }, [])

  const handleComplete = useCallback(() => {
    try {
      const r = score(answers)
      setResult(r)
      setSerial(makeSerial(r.code))
      clearSaved()
      setView('result')
      window.scrollTo(0, 0)
    } catch {
      // 理论上 Quiz 已保证答满；兜底跳到第一处未答
      setStartIndex(firstUnanswered())
      setView('quiz')
    }
  }, [answers, firstUnanswered])

  function handleRetake() {
    const fresh: Answers = {}
    setAnswers(fresh)
    clearSaved()
    setResult(null)
    setSerial('')
    setView('intro')
  }

  const content = useMemo(() => {
    if (view === 'quiz') {
      return (
        <Quiz
          answers={answers}
          startIndex={startIndex}
          onAnswer={handleAnswer}
          onComplete={handleComplete}
          onExit={() => setView('intro')}
        />
      )
    }
    if (view === 'result' && result) {
      return (
        <div className="flex min-h-screen flex-col items-center px-4 py-6">
          <ResultCard ref={captureRef} result={result} serial={serial} exporting={exporting} />
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
    return <Intro onStart={handleStart} hasSaved={hasSaved} onResume={handleResume} />
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, answers, startIndex, result, serial, exporting, hasSaved])

  return <main className="paper-grid min-h-screen">{content}</main>
}
