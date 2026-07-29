import { Check, RefreshCw, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { apiFetch, jsonBody } from '../api/client'
import type { Message } from '../types'
import { Dialog } from '../components/Dialog'
import { LearningGeneration } from '../components/LearningGeneration'

type Tab = 'overview' | 'plans' | 'notes' | 'quiz' | 'mistakes' | 'reviews'
interface LearningViewProps { username: string; sessionId: string; messages: Message[]; onLogin: () => void; onNotice: (text: string) => void; onClose: () => void }
interface PlanItem { day: number; title: string; task: string; done: boolean }
interface Note { id: string; session_id?: string; title: string; content: string; created_at: string }
interface Attempt { id: number; session_id: string; question: string; answer: string; is_correct: number; mastered: number; created_at: string }
interface Review { id: number; topic: string; round: number; due_at: string; is_due: boolean }
interface QuizItem { id: string; question: string; hint: string; answer: string }
type GenerationKind = '路线' | '笔记' | '练习'

const minimumAnimation = () => new Promise((resolve) => setTimeout(resolve, 650))

export function LearningView({ username, sessionId, messages, onLogin, onNotice, onClose }: LearningViewProps) {
  const [tab, setTab] = useState<Tab>(() => {
    const requested = new URLSearchParams(location.search).get('tab') as Tab | null
    return requested && ['overview', 'plans', 'notes', 'quiz', 'mistakes', 'reviews'].includes(requested) ? requested : 'overview'
  })
  const [overview, setOverview] = useState<{ plans: Array<{ session_id: string; goal: string; plan: PlanItem[] }>; notes: Note[]; attempts: Attempt[] }>({ plans: [], notes: [], attempts: [] })
  const [weekly, setWeekly] = useState<any>(null)
  const [daily, setDaily] = useState<any>(null)
  const [reviews, setReviews] = useState<{ due_count: number; reviews: Review[] }>({ due_count: 0, reviews: [] })
  const [plan, setPlan] = useState<{ goal: string; plan: PlanItem[] }>({ goal: '', plan: [] })
  const [goal, setGoal] = useState('理解当前会话主题并能独立应用')
  const [notes, setNotes] = useState<Note[]>([])
  const [quiz, setQuiz] = useState<QuizItem[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(`learningQuiz:${sessionId}`) || '[]') }
    catch { return [] }
  })
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [feedback, setFeedback] = useState<Record<number, string>>({})
  const [mistakes, setMistakes] = useState<Attempt[]>([])
  const [busy, setBusy] = useState(false)
  const [generating, setGenerating] = useState<GenerationKind | null>(null)
  const [error, setError] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; run: () => Promise<void> } | null>(null)

  const loadAll = async () => {
    if (!username) return
    setBusy(true); setError('')
    try {
      const user = encodeURIComponent(username)
      const [overviewData, reviewData, weeklyData, dailyData, planData, noteData, mistakeData] = await Promise.all([
        apiFetch<any>(`/api/learning/overview/${user}`),
        apiFetch<any>(`/api/learning/reviews/${user}`),
        apiFetch<any>(`/api/learning/weekly/${user}`),
        apiFetch<any>(`/api/learning/daily/${user}`),
        apiFetch<any>(`/api/learning/plan/${user}/${encodeURIComponent(sessionId)}`),
        apiFetch<any>(`/api/learning/notes/${user}/${encodeURIComponent(sessionId)}`),
        apiFetch<any>(`/api/learning/mistakes/${user}/${encodeURIComponent(sessionId)}`),
      ])
      setOverview(overviewData); setReviews(reviewData); setWeekly(weeklyData); setDaily(dailyData); setPlan(planData); setNotes(noteData.notes || []); setMistakes(mistakeData.mistakes || [])
      if (dailyData.goal) setGoal(dailyData.goal)
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '读取学习数据失败') }
    finally { setBusy(false) }
  }
  useEffect(() => {
    try { setQuiz(JSON.parse(sessionStorage.getItem(`learningQuiz:${sessionId}`) || '[]')) }
    catch { setQuiz([]) }
    void loadAll()
  }, [username, sessionId])

  const createPlan = async () => {
    setGenerating('路线'); setError('')
    try { const [data] = await Promise.all([apiFetch<any>('/api/learning/plan', jsonBody({ username, session_id: sessionId, messages })), minimumAnimation()]); setPlan(data); onNotice('已根据本次 AI 回答生成路线'); await loadAll() }
    catch (e) { setError(e instanceof Error ? e.message : '生成失败') } finally { setGenerating(null) }
  }
  const togglePlan = async (day: number) => {
    try { const data = await apiFetch<any>('/api/learning/plan/toggle', jsonBody({ username, session_id: sessionId, day })); setPlan(data); await loadAll() }
    catch (e) { setError(e instanceof Error ? e.message : '更新失败') }
  }
  const createNote = async () => {
    setGenerating('笔记'); setError('')
    try { await Promise.all([apiFetch('/api/learning/note', jsonBody({ username, session_id: sessionId, messages })), minimumAnimation()]); onNotice('学习笔记已生成'); await loadAll(); setTab('notes') }
    catch (e) { setError(e instanceof Error ? e.message : '生成失败') } finally { setGenerating(null) }
  }
  const createQuiz = async () => {
    setGenerating('练习'); setError('')
    try { const [data] = await Promise.all([apiFetch<{ quiz: QuizItem[] }>('/api/learning/quiz', jsonBody({ username, session_id: sessionId, messages })), minimumAnimation()]); setQuiz(data.quiz); sessionStorage.setItem(`learningQuiz:${sessionId}`, JSON.stringify(data.quiz)); setFeedback({}); setTab('quiz'); onNotice('已从本次 AI 回答生成 3 道练习') }
    catch (e) { setError(e instanceof Error ? e.message : '出题失败') } finally { setGenerating(null) }
  }
  const removeQuiz = (index: number) => {
    const next = quiz.filter((_, itemIndex) => itemIndex !== index)
    setQuiz(next); sessionStorage.setItem(`learningQuiz:${sessionId}`, JSON.stringify(next))
    setAnswers({}); setFeedback({})
    onNotice('练习题已删除')
  }
  const submitAnswer = async (index: number) => {
    try { const data = await apiFetch<{ feedback: string }>('/api/learning/attempt', jsonBody({ username, session_id: sessionId, question: quiz[index].question, answer: answers[index] || '' })); setFeedback((value) => ({ ...value, [index]: data.feedback })); await loadAll() }
    catch (e) { setError(e instanceof Error ? e.message : '提交失败') }
  }
  const shareLearning = async () => {
    try {
      const result = await apiFetch<{ share_path: string }>('/api/learning/share', jsonBody({
        username,
        kind: 'summary',
        title: '我的 AI 学习周报',
        content: {
          '本周学习': `学习 ${weekly?.study_days || 0} 天，完成 ${weekly?.queries || 0} 次提问。`,
          '练习情况': weekly?.practice?.total ? `完成 ${weekly.practice.total} 道练习，正确率 ${weekly.practice.accuracy}%。` : '本周还没有练习记录。',
          '继续改进': weekly?.suggestions || [],
        },
      }))
      const url = location.origin + result.share_path
      await navigator.clipboard?.writeText(url)
      onNotice(navigator.clipboard ? '学习成果链接已复制' : url)
    } catch (e) { setError(e instanceof Error ? e.message : '分享失败') }
  }

  if (!username) return <section className="route-view login-required"><button className="route-close login-close" type="button" onClick={onClose} aria-label="关闭学习管理"><X size={18} /></button><h1>学习管理</h1><p>登录后可保存路线、笔记、练习和复习进度。</p><button onClick={onLogin}>登录后继续</button></section>
  const openMistakes = overview.attempts.filter((item) => !item.is_correct && !item.mastered)
  const tabs: Array<[Tab, string, number | null]> = [['overview', '概览', null], ['plans', '路线', overview.plans.length], ['notes', '笔记', overview.notes.length], ['quiz', '练习', overview.attempts.length], ['mistakes', '错题', openMistakes.length], ['reviews', '复习', reviews.due_count]]

  return (
    <section className="route-view learning-view" id="main-content">
      <header className="route-view-head"><div><h1>学习管理</h1><p>路线、沉淀、练习与遗忘曲线复习</p></div><div className="route-actions"><button onClick={shareLearning}>分享周报</button><button onClick={loadAll}><RefreshCw size={16} />刷新</button><button className="route-close" type="button" onClick={onClose} aria-label="关闭学习管理" title="关闭"><X size={18} /></button></div></header>
      <nav className="route-tabs" aria-label="学习管理栏目">{tabs.map(([id, label, count]) => <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}{count !== null && <span>{count}</span>}</button>)}</nav>
      {error && <p className="route-error" role="alert">{error}</p>}
      <div className="learning-page-content" aria-busy={busy || generating !== null}>
        {generating && <LearningGeneration kind={generating} />}
        {tab === 'overview' && <div className="overview-layout">
          <div className="metric-grid"><div><strong>{weekly?.study_days || 0}</strong><span>本周学习天数</span></div><div><strong>{weekly?.queries || 0}</strong><span>本周提问</span></div><div><strong>{weekly?.practice?.accuracy || 0}%</strong><span>练习正确率</span></div><div><strong>{reviews.due_count}</strong><span>到期复习</span></div></div>
          <section className="content-section"><h2>今日概览</h2><div className="daily-goal-row"><input value={goal} onChange={(e) => setGoal(e.target.value)} /><button onClick={async () => { try { await apiFetch('/api/learning/daily/goal', jsonBody({ username, goal, completed: daily?.goal_completed || false })); onNotice('今日目标已保存') } catch (e) { setError(e instanceof Error ? e.message : '保存失败') } }}>保存目标</button></div><p>连续学习 {daily?.streak || 0} 天 · 今日提问 {daily?.today_queries || 0} 次 · 待复习 {daily?.review_count || 0} 项</p></section>
          <section className="content-section"><h2>本周建议</h2><ol>{(weekly?.suggestions || ['完成一次专注问答，并整理一篇笔记。']).map((item: string) => <li key={item}>{item}</li>)}</ol></section>
        </div>}
        {tab === 'plans' && <div className="records-layout"><section className="content-section"><div className="content-section-heading"><h2>当前会话路线</h2>{plan.plan.length > 0 && <button className="danger-icon" title="删除当前路线" aria-label="删除当前路线" onClick={() => setConfirmAction({ title: '删除学习路线', message: '删除后不会影响原始聊天记录，但路线进度无法恢复。', run: async () => { await apiFetch(`/api/learning/plans/${encodeURIComponent(username)}/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }); await loadAll() } })}><Trash2 size={15} /></button>}</div>{plan.plan.length ? plan.plan.map((item) => <label className="plan-page-row" key={item.day}><input type="checkbox" checked={item.done} onChange={() => togglePlan(item.day)} /><span><strong>第 {item.day} 天 · {item.title}</strong><small>{item.task}</small></span></label>) : <button className="primary-inline" disabled={busy || generating !== null || !messages.some((item) => item.role === 'assistant')} onClick={createPlan}>根据本次 AI 回答生成路线</button>}</section>{overview.plans.filter((item) => item.session_id !== sessionId).map((item) => <article className="record-row" key={item.session_id}><div><strong>{item.goal}</strong><small>完成 {item.plan.filter((step) => step.done).length}/{item.plan.length}</small></div><button className="danger-icon" title="删除路线" aria-label={`删除路线 ${item.goal}`} onClick={() => setConfirmAction({ title: '删除学习路线', message: '删除后不会影响原始聊天记录，但路线进度无法恢复。', run: async () => { await apiFetch(`/api/learning/plans/${encodeURIComponent(username)}/${encodeURIComponent(item.session_id)}`, { method: 'DELETE' }); await loadAll() } })}><Trash2 size={15} /></button></article>)}</div>}
        {tab === 'notes' && <div className="records-layout"><button className="primary-inline" onClick={createNote} disabled={busy || generating !== null || !messages.some((item) => item.role === 'assistant')}>整理当前对话为笔记</button>{overview.notes.map((note) => <article className="note-page-card" key={note.id}><div><h2>{note.title}</h2><ReactMarkdown>{note.content}</ReactMarkdown></div><button className="danger-icon" title="删除笔记" aria-label={`删除笔记 ${note.title}`} onClick={() => setConfirmAction({ title: '删除学习笔记', message: '这篇笔记及其复习安排将被永久删除。', run: async () => { await apiFetch(`/api/learning/notes/${encodeURIComponent(username)}/${note.id}`, { method: 'DELETE' }); await loadAll() } })}><Trash2 size={15} /></button></article>)}</div>}
        {tab === 'quiz' && <div className="records-layout"><button className="primary-inline" onClick={createQuiz} disabled={busy || generating !== null || !messages.some((item) => item.role === 'assistant')}>根据本次 AI 回答生成 3 道练习</button>{quiz.map((item, index) => <article className="quiz-page-card" key={item.id}><div className="quiz-card-heading"><h2>{index + 1}. {item.question}</h2><button className="danger-icon" title="删除这道练习" aria-label={`删除练习 ${index + 1}`} onClick={() => setConfirmAction({ title: '删除练习题', message: '删除后，这道尚未提交的练习题将无法恢复。', run: async () => removeQuiz(index) })}><Trash2 size={15} /></button></div><p>{item.hint}</p><textarea value={answers[index] || ''} onChange={(e) => setAnswers((value) => ({ ...value, [index]: e.target.value }))} placeholder="写下你的答案" /><button onClick={() => submitAnswer(index)}>提交回答</button>{feedback[index] && <p className="practice-feedback">{feedback[index]}</p>}</article>)}{overview.attempts.length > 0 && <section className="content-section"><h2>练习记录</h2>{overview.attempts.map((item) => <article className="record-row attempt-row" key={item.id}><div><strong>{item.question}</strong><small>{item.is_correct ? '回答较完整' : '需要补充'} · {new Date(item.created_at).toLocaleDateString('zh-CN')}</small></div><button className="danger-icon" title="删除练习记录" aria-label={`删除练习记录 ${item.question}`} onClick={() => setConfirmAction({ title: '删除练习记录', message: '删除后，这次作答和对应复习安排将无法恢复。', run: async () => { await apiFetch(`/api/learning/attempts/${encodeURIComponent(username)}/${item.id}`, { method: 'DELETE' }); await loadAll() } })}><Trash2 size={15} /></button></article>)}</section>}</div>}
        {tab === 'mistakes' && <div className="records-layout">{openMistakes.length ? openMistakes.map((item) => <article className="record-row" key={item.id}><div><strong>{item.question}</strong><small>你的回答：{item.answer}</small></div><div className="record-actions"><button onClick={async () => { await apiFetch(`/api/learning/attempts/${encodeURIComponent(username)}/${item.id}/mastered`, { method: 'POST' }); onNotice('已标记为掌握'); await loadAll() }}><Check size={15} />已掌握</button><button className="danger-icon" title="删除错题" aria-label={`删除错题 ${item.question}`} onClick={() => setConfirmAction({ title: '删除错题记录', message: '删除后，这次作答和对应复习安排将无法恢复。', run: async () => { await apiFetch(`/api/learning/attempts/${encodeURIComponent(username)}/${item.id}`, { method: 'DELETE' }); await loadAll() } })}><Trash2 size={15} /></button></div></article>) : <p className="muted-empty">暂无待复习错题。</p>}</div>}
        {tab === 'reviews' && <div className="records-layout">{reviews.reviews.map((item) => <article className="record-row" key={item.id}><div><strong>{item.topic}</strong><small>第 {item.round} 轮 · {new Date(item.due_at).toLocaleString('zh-CN')}</small></div><div className="record-actions"><button disabled={!item.is_due} onClick={async () => { const result = await apiFetch<{ message: string }>(`/api/learning/reviews/${encodeURIComponent(username)}/${item.id}/complete`, { method: 'POST' }); onNotice(result.message); await loadAll() }}>完成复习</button><button className="danger-icon" title="删除复习任务" aria-label={`删除复习任务 ${item.topic}`} onClick={() => setConfirmAction({ title: '删除复习任务', message: '删除后，这项复习安排将无法恢复。', run: async () => { await apiFetch(`/api/learning/reviews/${encodeURIComponent(username)}/${item.id}`, { method: 'DELETE' }); await loadAll() } })}><Trash2 size={15} /></button></div></article>)}</div>}
      </div>
      <Dialog open={!!confirmAction} title={confirmAction?.title || '确认操作'} onClose={() => setConfirmAction(null)} footer={<><button onClick={() => setConfirmAction(null)}>取消</button><button className="dialog-danger" onClick={async () => { const action = confirmAction; setConfirmAction(null); if (action) { try { await action.run(); onNotice('已删除') } catch (e) { setError(e instanceof Error ? e.message : '删除失败') } } }}>确认删除</button></>}>{confirmAction?.message}</Dialog>
    </section>
  )
}
